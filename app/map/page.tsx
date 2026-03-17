"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PantryList } from "@/components/PantryList";
import { PantryDetail } from "@/components/PantryDetail";
import { MapView } from "@/components/MapView";
import { fetchPantries, fetchLiveTelemetryStock, getDonationBasedStock } from "@/lib/pantry-api";
import type { Pantry, StockInfo } from "@/lib/pantry-types";
import type { MapBounds } from "@/components/MapView";

// ── LocalStorage cache for live stock levels ──────────────────────
const STOCK_CACHE_KEY = "pantrylink_stock_cache_v1";
// Differentiated TTLs: sensor data changes quickly; donation data is slower-moving.
const STOCK_CACHE_TTL_SENSOR_MS   =  5 * 60 * 1000; //  5 min — sensor weight can shift fast
const STOCK_CACHE_TTL_DONATION_MS = 20 * 60 * 1000; // 20 min — donation patterns are slower
const STOCK_CACHE_TTL_UNKNOWN_MS  = 10 * 60 * 1000; // 10 min — recheck emptied pantries

interface StockCacheEntry {
  level: StockInfo["level"];
  lastUpdateIso: string | null;
  lastUpdateSource: StockInfo["lastUpdateSource"];
  sensorWeightKg: number | null;
  cachedAt: number;
}
type StockCache = Record<string, StockCacheEntry>;

function readStockCache(): StockCache {
  try {
    const raw = localStorage.getItem(STOCK_CACHE_KEY);
    return raw ? (JSON.parse(raw) as StockCache) : {};
  } catch {
    return {};
  }
}

function writeStockCache(cache: StockCache) {
  try { localStorage.setItem(STOCK_CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

function stockInfoFromCacheEntry(e: StockCacheEntry): StockInfo {
  return { level: e.level, lastUpdateIso: e.lastUpdateIso, lastUpdateSource: e.lastUpdateSource, sensorWeightKg: e.sensorWeightKg };
}

function getCacheTTL(entry: StockCacheEntry): number {
  if (entry.lastUpdateSource === "sensor") return STOCK_CACHE_TTL_SENSOR_MS;
  if (entry.lastUpdateSource === "self")   return STOCK_CACHE_TTL_DONATION_MS;
  return STOCK_CACHE_TTL_UNKNOWN_MS;
}

function stockLabel(level: StockInfo["level"]) {
  if (level === "high") return "High Stock";
  if (level === "medium") return "Medium Stock";
  if (level === "low") return "Low Stock";
  return "Unknown";
}
function stockCls(level: StockInfo["level"]) {
  if (level === "high") return "high";
  if (level === "medium") return "medium";
  if (level === "low") return "low";
  return "unknown";
}
function applyStock(p: Pantry, s: StockInfo): Pantry {
  return { ...p, stock: s, stockLevelLabel: stockLabel(s.level), stockLevelCls: stockCls(s.level), stockLevelUpdatedAt: s.lastUpdateIso, stockLevelSource: s.lastUpdateSource };
}

export default function MapPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [selectedPantryId, setSelectedPantryId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const stockFetchedRef = useRef(false);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const drawerScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchPantries()
      .then((data) => setPantries(data))
      .catch((err) => {
        console.error("Failed to load pantries", err);
        setPantries([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // After pantries load:
  // 1. Immediately apply cached stock as placeholders (instant, no network).
  // 2. Fetch live stock for the first 10 pantries right away (visible rows).
  // 3. Fetch the rest in the background with a small delay.
  // 4. Only update entries whose level actually changed, to minimise re-renders.
  // 5. Persist results to localStorage so the next visit starts with fresh placeholders.
  useEffect(() => {
    if (pantries.length === 0 || stockFetchedRef.current) return;
    stockFetchedRef.current = true;

    const cache = readStockCache();
    const now = Date.now();

    // Apply cached values immediately as placeholders
    setPantries((prev) =>
      prev.map((p) => {
        const entry = cache[p.id];
        if (!entry) return p;
        return applyStock(p, stockInfoFromCacheEntry(entry));
      })
    );

    // Fetch one pantry and update only if the level changed.
    // B1: only call the endpoint that is relevant for this pantry type.
    // B5: if the pantry doc already provided a known donation-based stock, cache it
    //     immediately without making any network request.
    async function fetchAndUpdate(p: Pantry) {
      const isSensorPantry = p.stockLevelSource === "sensor";

      // B5: pantry document already has a valid non-sensor stock level — no fetch needed.
      const docHasStock =
        !isSensorPantry &&
        p.stockLevelCls != null &&
        p.stockLevelCls !== "unknown" &&
        p.stock != null;

      if (docHasStock) {
        // Persist the doc-supplied stock to cache so subsequent visits are instant too.
        const entry: StockCacheEntry = { ...p.stock!, cachedAt: now };
        const fresh = readStockCache();
        fresh[p.id] = entry;
        writeStockCache(fresh);
        return; // nothing to re-render — list already shows the correct value
      }

      // B1: only call the relevant endpoint (sensor OR donation, not both every time).
      const [telRes, donRes] = await Promise.allSettled([
        isSensorPantry ? fetchLiveTelemetryStock(p.id) : Promise.resolve(null),
        isSensorPantry ? Promise.resolve(null)          : getDonationBasedStock(p.id),
      ]);
      const tel = telRes.status === "fulfilled" ? telRes.value : null;
      const don = donRes.status === "fulfilled" ? donRes.value : null;
      const resolved = tel ?? don ?? null;
      if (!resolved) return;

      // Persist to cache using source-appropriate TTL bucket marker
      const newEntry: StockCacheEntry = { ...resolved, cachedAt: now };
      const fresh = readStockCache();
      fresh[p.id] = newEntry;
      writeStockCache(fresh);

      // Only re-render if level changed vs current list state
      setPantries((prev) =>
        prev.map((item) => {
          if (item.id !== p.id) return item;
          if (item.stockLevelCls === stockCls(resolved.level)) return item; // no change
          return applyStock(item, resolved);
        })
      );
    }

    // Split: first 10 immediately, rest deferred by 2 s
    const priority = pantries.slice(0, 10);
    const deferred = pantries.slice(10);

    priority.forEach((p) => {
      const entry = cache[p.id];
      // Use source-specific TTL: sensor data expires sooner than donation data
      if (entry && now - entry.cachedAt < getCacheTTL(entry)) return;
      fetchAndUpdate(p);
    });

    const timer = setTimeout(() => {
      deferred.forEach((p) => {
        const entry = cache[p.id];
        if (entry && now - entry.cachedAt < getCacheTTL(entry)) return;
        fetchAndUpdate(p);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [pantries.length]);

  const selectedPantry = pantries.find((p) => p.id === selectedPantryId) ?? null;

  // Reset scroll to top on both desktop sidebar and mobile drawer when switching pantries
  useEffect(() => {
    if (!selectedPantryId) return;
    if (sidebarScrollRef.current) sidebarScrollRef.current.scrollTop = 0;
    if (drawerScrollRef.current) drawerScrollRef.current.scrollTop = 0;
  }, [selectedPantryId]);

  // Only show pantries within the current map viewport (mirrors legacy showListForCurrentView)
  const visiblePantries = mapBounds
    ? pantries.filter((p) => {
        const { lat, lng } = p.location ?? {};
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        return (
          lat <= mapBounds.north &&
          lat >= mapBounds.south &&
          lng <= mapBounds.east &&
          lng >= mapBounds.west
        );
      })
    : pantries;

  const handleBack = () => {
    setIsDetailOpen(false);
    setSelectedPantryId(null);
  };

  // Single toggle button: collapse ↔ expand on list view; back-to-list on detail view
  const handleToggleBtn = () => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    } else if (isDetailOpen) {
      handleBack();
    } else {
      setIsSidebarCollapsed(true);
    }
  };

  // Patch the in-memory pantry list when the detail page computes a live stock update
  const handleStockUpdate = useCallback((pantryId: string, stock: StockInfo) => {
    setPantries((prev) =>
      prev.map((p) => {
        if (p.id !== pantryId) return p;
        return {
          ...p,
          stock,
          stockLevelLabel: stock.level === "high" ? "High Stock" : stock.level === "medium" ? "Medium Stock" : stock.level === "low" ? "Low Stock" : "Unknown",
          stockLevelCls: stock.level === "high" ? "high" : stock.level === "medium" ? "medium" : stock.level === "low" ? "low" : "unknown",
          stockLevelUpdatedAt: stock.lastUpdateIso,
          stockLevelSource: stock.lastUpdateSource,
        };
      })
    );
  }, []);

  const toggleIcon = isSidebarCollapsed ? "›" : "←";
  const toggleLabel = isSidebarCollapsed
    ? "Expand panel"
    : isDetailOpen
    ? "Back to list"
    : "Collapse panel";

  return (
    <div className="map-page-layout">
      {/* ── Left sidebar (desktop) ─────────────────────────── */}
      <aside
        className={`map-sidebar${isSidebarCollapsed ? " map-sidebar-collapsed" : ""}`}
      >
        {/* Header row: toggle / back button */}
        <div className="map-sidebar-header">
          <button
            type="button"
            className="map-sidebar-toggle"
            onClick={handleToggleBtn}
            aria-label={toggleLabel}
          >
            {toggleIcon}
          </button>
        </div>

        {/* Scrollable content — hidden when collapsed */}
        {!isSidebarCollapsed && (
          <div className="map-sidebar-content" ref={sidebarScrollRef}>
            {!isDetailOpen && (
              <PantryList
                pantries={visiblePantries}
                selectedId={selectedPantryId}
                onSelect={(id) => {
                  setSelectedPantryId(id);
                  setIsDetailOpen(true);
                }}
              />
            )}
            {isDetailOpen && selectedPantry && (
              <PantryDetail
                key={selectedPantry.id}
                pantry={selectedPantry}
                onStockUpdate={handleStockUpdate}
              />
            )}
          </div>
        )}
      </aside>

      {/* ── Map ───────────────────────────────────────────── */}
      <section className="map-section">
        <MapView
          pantries={pantries}
          selectedPantryId={selectedPantry?.id ?? null}
          onSelectPantry={(id) => {
            setSelectedPantryId(id);
            setIsDetailOpen(true);
            setIsSidebarCollapsed(false);
          }}
          onBoundsChange={setMapBounds}
        />
        {isLoading && (
          <div className="map-loading-overlay">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-b-transparent" />
              <p className="text-xs text-slate-600">Loading map…</p>
            </div>
          </div>
        )}
      </section>

      {/* ── Mobile bottom drawer ──────────────────────────── */}
      <section className="map-mobile-drawer">
        {/* List view */}
        {!isDetailOpen && (
          <div className="map-drawer-list-wrap">
            <PantryList
              pantries={visiblePantries}
              selectedId={selectedPantryId}
              onSelect={(id) => {
                setSelectedPantryId(id);
                setIsDetailOpen(true);
              }}
            />
          </div>
        )}

        {/* Detail view — back button + scrollable content */}
        {isDetailOpen && selectedPantry && (
          <div className="map-drawer-detail-wrap">
            <div className="map-drawer-detail-header">
              <button
                type="button"
                className="map-sidebar-toggle"
                onClick={handleBack}
                aria-label="Back to list"
              >
                ←
              </button>
            </div>
            <div className="map-drawer-detail-scroll" ref={drawerScrollRef}>
              <PantryDetail key={selectedPantry.id} pantry={selectedPantry} onStockUpdate={handleStockUpdate} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
