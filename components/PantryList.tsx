import React, { useState } from "react";
import type { Pantry } from "@/lib/pantry-types";

export interface PantryListProps {
  pantries: Pantry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** When true (mobile drawer), hides the heading & filters to maximise list space */
  compact?: boolean;
}

interface StockBadge {
  label: string;
  cls: string;
}

function formatDateTimeMinutes(isoString: string) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function formatLastUpdateRelative(isoString: string | null | undefined) {
  if (!isoString) return "No recent uploads";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return formatDateTimeMinutes(isoString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateTimeMinutes(isoString);
}

function getStockBadge(pantry: Pantry): StockBadge {
  if (pantry.stockLevelLabel && pantry.stockLevelCls) {
    return { label: pantry.stockLevelLabel, cls: pantry.stockLevelCls };
  }

  // Derive badge from stock.level when explicit label fields are absent
  if (pantry.stock) {
    const level = pantry.stock.level;
    if (level === "high") return { label: "High Stock", cls: "high" };
    if (level === "medium") return { label: "Medium Stock", cls: "medium" };
    if (level === "low") return { label: "Low Stock", cls: "low" };
  }

  // Last resort: estimate from total inventory item count
  const total = pantry.inventoryTotalItems ?? 0;
  if (total > 0) {
    if (total <= 10) return { label: "Low Stock", cls: "low" };
    if (total <= 30) return { label: "Medium Stock", cls: "medium" };
    return { label: "High Stock", cls: "high" };
  }

  return { label: "Unknown", cls: "unknown" };
}

const PHOTO_PLACEHOLDER = "/pantry-placeholder.svg";

const LegacyPantryListItem: React.FC<{
  pantry: Pantry;
  isActive: boolean;
  onSelect: () => void;
}> = ({ pantry, isActive, onSelect }) => {
  const title = pantry.name || "Untitled Pantry";
  const addrLine = (pantry.address || "").trim();
  const photo = pantry.photos?.[0] || null;
  const badge = getStockBadge(pantry);

  const lastUpdateIso =
    badge.label !== "Unknown"
      ? pantry.stockLevelUpdatedAt ?? pantry.stock?.lastUpdateIso ?? null
      : null;
  const restock = formatLastUpdateRelative(lastUpdateIso);

  const imgSrc = photo || PHOTO_PLACEHOLDER;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`list-card list-item${isActive ? " ring-1 ring-emerald-500" : ""}`}
    >
      <div className="thumb">
        <img
          src={imgSrc}
          alt={title}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PHOTO_PLACEHOLDER; }}
        />
      </div>
      <div className="list-main">
        <div className="list-row">
          <div className="list-title">{title}</div>
        </div>
        <div className="list-address">{addrLine}</div>
        <div className="list-meta">
          <span className={`stock ${badge.cls || ""}`}>{badge.label || "Unknown"}</span>
          <span className="dot">•</span>
          <span className="restock">{restock}</span>
        </div>
      </div>
      <div className="chevron">›</div>
    </button>
  );
};

type FilterType = "all" | "fridge" | "shelf";
type SortStock = "any" | "high-low" | "low-high";
type SortRestock = "newest" | "oldest";

const STOCK_ORDER: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
  inactive: 0,
};

function getStockOrder(pantry: Pantry): number {
  const level = pantry.stock?.level ?? "unknown";
  return STOCK_ORDER[level] ?? 0;
}

function getRestockTs(pantry: Pantry): number {
  const iso = pantry.stockLevelUpdatedAt ?? pantry.stock?.lastUpdateIso ?? null;
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export const PantryList: React.FC<PantryListProps> = ({
  pantries,
  selectedId,
  onSelect,
  compact = false,
}) => {
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Apply type filter
  let filtered = pantries.filter((p) => {
    if (filterType === "all") return true;
    const t = String(p.pantryType || "").toLowerCase();
    if (filterType === "fridge") return t === "fridge" || t === "shelf+fridge";
    if (filterType === "shelf") return t === "shelf";
    return true;
  });

  // Default sort: newest restock first
  filtered = [...filtered].sort((a, b) => getRestockTs(b) - getRestockTs(a));

  return (
    <div className={compact ? "pantry-list-compact" : undefined}>
      {!compact && (
        <h2 className="list-heading" style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
          Pantries in view
        </h2>
      )}

      {!compact && (
        <div className="list-filters">
          {/* Type */}
          <div className="list-filter-row">
            <span className="list-filter-label">Type</span>
            <div className="list-chip-group">
              {(["all", "fridge", "shelf"] as FilterType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`list-chip${filterType === v ? " list-chip-active" : ""}`}
                  onClick={() => setFilterType(v)}
                >
                  {v === "all" ? "All" : v === "fridge" ? "Fridge" : "Shelf"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">No pantries match the current filter.</div>
      ) : (
        <div className="list">
          {filtered.map((pantry) => (
            <LegacyPantryListItem
              key={pantry.id}
              pantry={pantry}
              isActive={pantry.id === selectedId}
              onSelect={() => onSelect(pantry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

