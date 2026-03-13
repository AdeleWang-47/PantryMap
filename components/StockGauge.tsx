import React from "react";
import type { StockLevel, StockInfo } from "@/lib/pantry-types";

export interface StockGaugeProps {
  stock?: StockInfo | null;
  level?: StockLevel | null;
  lastUpdateIso?: string | null;
  lastUpdateSource?: "sensor" | "self" | null;
  sensorWeightKg?: number | null;
  noUpdateAvailable?: boolean;
}

function stockLabelFromLevel(level: StockLevel | string | null | undefined) {
  const l = String(level || "").toLowerCase().trim();
  if (l === "high") return "High Stock";
  if (l === "medium") return "Medium Stock";
  if (l === "low") return "Low Stock";
  return "Unknown";
}

function stockDescriptionFromLabel(label: string) {
  if (label === "Low" || label === "Low Stock")
    return "Only a few items reported in the pantry.";
  if (label === "Medium" || label === "Medium Stock")
    return "About a bag of items reported in the pantry";
  if (label === "High" || label === "High Stock")
    return "More than a bag of items reported in the pantry.";
  return "No stock level updates reported in the past 48 hours";
}

function formatPoundsFromKg(weightKg: number | null | undefined) {
  const n = Number(weightKg);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 2.2046226218);
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
  if (!isoString) return "No update available";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return formatDateTimeMinutes(isoString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Last update: <1 minute ago";
  if (minutes < 60) return `Last update: ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last update: ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Last update: ${days} day${days === 1 ? "" : "s"} ago`;
}

const COLOR_MAP: Record<string, string> = {
  low: "#ef4444",
  medium: "#f59e0b",
  high: "#52b788",
  unknown: "#94a3b8",
  inactive: "#94a3b8",
};


export const StockGauge: React.FC<StockGaugeProps> = ({
  stock,
  level: levelProp,
  lastUpdateIso,
  lastUpdateSource,
  sensorWeightKg,
  noUpdateAvailable,
}) => {
  const rawLevel = levelProp ?? stock?.level ?? ("unknown" as StockLevel);
  const effectiveLevel: StockLevel =
    rawLevel === "inactive" ? "unknown" : (rawLevel as StockLevel);

  const effectiveLastUpdateIso = lastUpdateIso ?? stock?.lastUpdateIso ?? null;
  const effectiveLastUpdateSource = lastUpdateSource ?? stock?.lastUpdateSource ?? null;
  const effectiveSensorWeightKg = sensorWeightKg ?? stock?.sensorWeightKg ?? null;

  const label = stockLabelFromLevel(effectiveLevel);
  const description = stockDescriptionFromLabel(label);
  const strokeColor = COLOR_MAP[effectiveLevel] || "#52b788";

  // Gauge ratio
  let ratio = 0;
  if (effectiveLevel === "high") ratio = 1;
  else if (effectiveLevel === "medium") ratio = 0.66;
  else if (effectiveLevel === "low") ratio = 0.33;

  const radius = 80;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  // Meta lines
  const lastUpdateLine = formatLastUpdateRelative(
    noUpdateAvailable ? null : effectiveLastUpdateIso,
  );
  const pounds =
    effectiveLastUpdateSource === "sensor" && !noUpdateAvailable
      ? formatPoundsFromKg(effectiveSensorWeightKg)
      : null;

  // Short label for center text
  const shortLabel =
    effectiveLevel === "high" ? "High"
    : effectiveLevel === "medium" ? "Medium"
    : effectiveLevel === "low" ? "Low"
    : "Unknown";

  return (
    <>
      {/* ── Head row ─────────────────────────────────── */}
      <div className="stock-card-head">
        <div className="stock-card-head-text">
          <h2>Stock level</h2>
          <div className="stock-card-desc">{description}</div>
        </div>

        {/* Info button + hover image */}
        <span className="stock-info-wrap">
          <button
            type="button"
            className="stock-info-btn"
            aria-label="Stock level info"
          >
            i
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="stock-info-img"
            src="/info.png"
            alt="Stock level algorithm explanation"
          />
        </span>
      </div>

      {/* ── Semi-circle gauge ─────────────────────────── */}
      <div className="detail-gauge" data-level={effectiveLevel}>
        <svg
          viewBox="0 0 200 120"
          className="detail-gauge-svg"
          role="img"
          aria-label={`Stock level: ${label}`}
        >
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            style={{
              fill: "none",
              stroke: "#e5e7eb",
              strokeWidth: 20,
              strokeLinecap: "round",
            }}
          />
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            style={{
              fill: "none",
              stroke: strokeColor,
              strokeWidth: 20,
              strokeLinecap: "round",
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
              transition: "stroke-dashoffset 300ms ease-out",
            }}
          />
        </svg>
        <div className="detail-gauge-center">
          <div className="detail-gauge-status" style={{ color: strokeColor }}>
            {shortLabel}
          </div>
        </div>
      </div>

      {/* ── Meta ─────────────────────────────────────── */}
      <div className="stock-meta">
        <p className="stock-meta-line">{lastUpdateLine}</p>
        {pounds != null && (
          <p className="stock-meta-line">{pounds} lb of items detected</p>
        )}
      </div>
    </>
  );
};
