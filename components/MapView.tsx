"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map, LayerGroup } from "leaflet";
import type { Pantry } from "@/lib/pantry-types";

export type MapBounds = { north: number; south: number; east: number; west: number };

type MapViewProps = {
  pantries: Pantry[];
  selectedPantryId: string | null;
  onSelectPantry: (id: string) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
};

function getMarkerIcon(L: typeof import("leaflet"), pantry: Pantry, isSelected: boolean) {
  const typeLower = String(pantry.pantryType || "").toLowerCase();
  const typeColors: Record<string, string> = {
    shelf: "#f59e0b",
    fridge: "#3b82f6",
    "shelf+fridge": "#3b82f6",
  };
  const typeColorsDark: Record<string, string> = {
    shelf: "#b45309",
    fridge: "#1d4ed8",
    "shelf+fridge": "#1d4ed8",
  };
  const color = typeColors[typeLower] ?? "#f59e0b";
  const colorDark = typeColorsDark[typeLower] ?? "#b45309";
  const pinColor = isSelected ? colorDark : color;
  const shadowOpacity = isSelected ? 0.42 : 0.32;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
  <defs>
    <filter id="ds" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(15,23,42,${shadowOpacity})"/>
    </filter>
  </defs>
  <path filter="url(#ds)" d="M16 41s12-11.1 12-23C28 11.4 22.6 6 16 6S4 11.4 4 18c0 11.9 12 23 12 23z" fill="${pinColor}"/>
  <circle cx="16" cy="18" r="7.5" fill="#ffffff" stroke="${pinColor}" stroke-width="5"/>
</svg>`;

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [32, 42],
    iconAnchor: [16, 41],
    className: isSelected ? "pantry-marker pantry-marker-selected" : "pantry-marker",
  });
}

export function MapView({
  pantries,
  selectedPantryId,
  onSelectPantry,
  onBoundsChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);

  // Initialize map once on mount
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      const L = await import("leaflet");

      // Clear any stale Leaflet id left by StrictMode double-mount
      (containerRef.current as HTMLDivElement & { _leaflet_id?: unknown })._leaflet_id = undefined;

      // Fix default icon asset paths
      delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current).setView([47.6, -122.33], 10);

      map.zoomControl.setPosition("topright");

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        },
      ).addTo(map);

      L.control.scale({ position: "bottomleft", metric: true, imperial: false }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);

      // Legend
      const legend = new L.Control({ position: "bottomright" });
      legend.onAdd = function () {
        const div = document.createElement("div");
        div.className = "map-legend";
        div.innerHTML = `
          <div class="map-legend-title">Legend</div>
          <div class="map-legend-item">
            <span class="map-legend-pin" style="background:#3b82f6"></span>
            Community fridge
          </div>
          <div class="map-legend-item">
            <span class="map-legend-pin" style="background:#f59e0b"></span>
            Shelf-stable micropantry
          </div>
        `;
        return div;
      };
      legend.addTo(map);

      function emitBounds() {
        const b = map.getBounds();
        onBoundsChangeRef.current?.({
          north: b.getNorth(),
          south: b.getSouth(),
          east:  b.getEast(),
          west:  b.getWest(),
        });
      }

      map.on("moveend", emitBounds);
      // Fire once after the initial tile load so the list reflects the starting view
      map.whenReady(() => setTimeout(emitBounds, 100));

      if (!cancelled) {
        mapRef.current = map;
        markersLayerRef.current = markersLayer;
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Render / update markers when pantries or selection changes
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function updateMarkers() {
      const L = await import("leaflet");
      const map = mapRef.current;
      const markersLayer = markersLayerRef.current;
      if (!map || !markersLayer) {
        retryTimer = setTimeout(updateMarkers, 100);
        return;
      }

      markersLayer.clearLayers();

      pantries.forEach((p) => {
        if (!p.location || !p.location.lat || !p.location.lng) return;
        const isActive = p.id === selectedPantryId;
        const icon = getMarkerIcon(L, p, isActive);
        const marker = L.marker([p.location.lat, p.location.lng], { icon });
        marker.on("click", () => onSelectPantry(p.id));
        marker.addTo(markersLayer);
      });
    }

    updateMarkers();
    return () => { if (retryTimer) clearTimeout(retryTimer); };
  }, [pantries, selectedPantryId, onSelectPantry]);

  // Pan to selected pantry
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPantryId) return;
    const p = pantries.find((x) => x.id === selectedPantryId);
    if (!p || !p.location) return;
    map.setView(
      [p.location.lat, p.location.lng],
      Math.max(map.getZoom(), 15),
    );
  }, [selectedPantryId, pantries]);

  return <div ref={containerRef} className="h-full w-full" />;
}
