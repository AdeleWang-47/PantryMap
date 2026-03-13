"use client";

import { useEffect, useState } from "react";
import { PantryList } from "@/components/PantryList";
import { PantryDetail } from "@/components/PantryDetail";
import { MapView } from "@/components/MapView";
import { fetchPantries } from "@/lib/pantry-api";
import type { Pantry } from "@/lib/pantry-types";

export default function MapPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [selectedPantryId, setSelectedPantryId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchPantries()
      .then((data) => setPantries(data))
      .catch((err) => {
        console.error("Failed to load pantries", err);
        setPantries([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const selectedPantry = pantries.find((p) => p.id === selectedPantryId) ?? null;

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
          <div className="map-sidebar-content">
            {!isDetailOpen && (
              <PantryList
                pantries={pantries}
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
            // Auto-expand sidebar so detail is visible
            setIsSidebarCollapsed(false);
          }}
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
              pantries={pantries}
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
            <div className="map-drawer-detail-scroll">
              <PantryDetail key={selectedPantry.id} pantry={selectedPantry} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
