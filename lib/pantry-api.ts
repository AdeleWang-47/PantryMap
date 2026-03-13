import type { Pantry, StockInfo } from "./pantry-types";

const DEFAULT_API_BASE_URL = "http://localhost:7071/api";

function getApiBaseUrl() {
  if (typeof process !== "undefined") {
    // NEXT_PUBLIC_ prefix is required for client-side access in Next.js
    return (
      process.env.NEXT_PUBLIC_PANTRY_API_BASE_URL || DEFAULT_API_BASE_URL
    );
  }
  return DEFAULT_API_BASE_URL;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

function coerceNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function firstNumber(values: unknown[]): number | null {
  for (const v of values) {
    const n = coerceNumber(v);
    if (n !== null) return n;
  }
  return null;
}

// Weight thresholds matching the legacy frontend
const STOCK_PARAMS = {
  reasonableMin: -2,
  reasonableMax: 150,
  low_weight: 5,
  high_weight: 25, // matches legacy: <=5 low, 5<w<=25 medium, >25 high
};

function isWeightInReasonableRange(weightKg: unknown): boolean {
  const n = coerceNumber(weightKg);
  if (n === null) return false;
  return n > STOCK_PARAMS.reasonableMin && n < STOCK_PARAMS.reasonableMax;
}

function computeStockLevelFromWeight(weightKg: unknown) {
  const n = coerceNumber(weightKg);
  if (n === null || !isWeightInReasonableRange(n)) return null;
  if (n <= STOCK_PARAMS.low_weight)
    return { level: "low", label: "Low Stock", cls: "low" as const };
  if (n <= STOCK_PARAMS.high_weight)
    return { level: "medium", label: "Medium Stock", cls: "medium" as const };
  return { level: "high", label: "High Stock", cls: "high" as const };
}

interface StockResolution {
  stock: StockInfo;
  badgeLabel: string | null;
  badgeCls: string | null;
}

/**
 * Resolve stock level from a Cosmos document by checking sensor weight first,
 * then self-reported donation weight, and returning the badge label and CSS class.
 */
function resolveStockInfo(doc: any): StockResolution {
  const sensors = doc?.sensors ?? {};

  const sensWeight = coerceNumber(
    sensors.weightKg ??
      doc.weightKg ??
      doc.weight ??
      doc.current_weight ??
      doc.loadcell_kg,
  );
  const sensUpdatedAt =
    sensors.updatedAt ??
    doc.updatedAt ??
    doc.timestamp ??
    doc.lastUpdated ??
    null;

  const totReportedWeight = coerceNumber(
    doc.tot_reported_weight ?? doc.totReportedWeight ?? doc.reportedWeightKg,
  );
  const donationDatetime =
    doc.donation_datetime ?? doc.donationDatetime ?? doc.lastDonationAt ?? null;

  // 1) Sensor reading takes priority
  if (sensWeight !== null && isWeightInReasonableRange(sensWeight)) {
    const badge = computeStockLevelFromWeight(sensWeight);
    if (badge) {
      return {
        stock: {
          level: badge.level as StockInfo["level"],
          lastUpdateIso:
            typeof sensUpdatedAt === "string"
              ? sensUpdatedAt
              : sensUpdatedAt
                ? new Date(sensUpdatedAt).toISOString()
                : null,
          lastUpdateSource: "sensor",
          sensorWeightKg: sensWeight,
        },
        badgeLabel: badge.label,
        badgeCls: badge.cls,
      };
    }
  }

  // 2) Fall back to self-reported donation weight
  if (totReportedWeight !== null && isWeightInReasonableRange(totReportedWeight)) {
    const badge = computeStockLevelFromWeight(totReportedWeight);
    if (badge) {
      return {
        stock: {
          level: badge.level as StockInfo["level"],
          lastUpdateIso:
            typeof donationDatetime === "string"
              ? donationDatetime
              : donationDatetime
                ? new Date(donationDatetime).toISOString()
                : null,
          lastUpdateSource: "self",
          sensorWeightKg: null,
        },
        badgeLabel: badge.label,
        badgeCls: badge.cls,
      };
    }
  }

  return {
    stock: {
      level: "unknown",
      lastUpdateIso: null,
      lastUpdateSource: null,
      sensorWeightKg: null,
    },
    badgeLabel: "Unknown",
    badgeCls: "unknown",
  };
}

function extractLocation(doc: any) {
  const coords = Array.isArray(doc.location?.coordinates)
    ? doc.location.coordinates
    : null;
  const lat =
    firstNumber([
      doc.location?.lat,
      doc.location?.latitude,
      doc.lat,
      doc.latitude,
      doc.lat_or,
      doc.latOr,
      coords ? coords[1] : null,
    ]) ?? 0;
  const lng =
    firstNumber([
      doc.location?.lng,
      doc.location?.lon,
      doc.location?.longitude,
      doc.lon,
      doc.lng,
      doc.longitude,
      doc.lon_or,
      doc.lonOr,
      coords ? coords[0] : null,
    ]) ?? 0;
  return { lat, lng };
}

function buildAddress(doc: any): string | undefined {
  const street =
    (typeof doc.address === "string" && doc.address.trim()) ||
    (typeof doc.adress === "string" && doc.adress.trim()) ||
    "";
  const city =
    (typeof doc.city === "string" && doc.city.trim()) ||
    (typeof doc.town === "string" && doc.town.trim()) ||
    "";
  const state =
    (typeof doc.state === "string" && doc.state.trim()) ||
    (typeof doc.region === "string" && doc.region.trim()) ||
    "";
  const zip =
    doc.zip != null || doc.zipcode != null || doc.postalCode != null
      ? String(doc.zip ?? doc.zipcode ?? doc.postalCode).trim()
      : "";

  const parts = [street, city, state, zip].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function trimString(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

function derivePantryType(p: any = {}): string {
  const detail = trimString(p.detail);
  if (detail === "Shared Pantry") return "shelf";
  if (detail === "Pantry + Fridge") return "fridge";

  if (!detail) {
    const r = p.refrigerated;
    if (Array.isArray(r)) {
      const hasFridge = r.some((v) => /fridge/i.test(String(v || "")));
      return hasFridge ? "fridge" : "shelf";
    }
    if (typeof r === "string") {
      return /fridge/i.test(r) ? "fridge" : "shelf";
    }
    if (typeof r === "boolean" || typeof r === "number") {
      return r ? "fridge" : "shelf";
    }
  }

  const raw = p.refrigerated ?? p.pantryType ?? p.type ?? p.pantry_type ?? "";
  const normalize = (v: any) => String(v).trim().toLowerCase();

  if (Array.isArray(raw)) {
    const lowered = raw.map(normalize).filter(Boolean);
    const hasFridge = lowered.some(
      (v) => v.includes("fridge") || v.includes("refrigerat"),
    );
    const hasShelf = lowered.some(
      (v) => v.includes("shelf") || v.includes("pantry"),
    );
    if (hasFridge && hasShelf) return "shelf+fridge";
    if (hasFridge) return "fridge";
    if (hasShelf) return "shelf";
    return "";
  } else if (typeof raw === "string") {
    const lowered = normalize(raw);
    if (!lowered) return "";
    if (/(both|and|\+|all)/.test(lowered) && lowered.includes("fridge")) {
      return "shelf+fridge";
    }
    if (
      lowered.includes("fridge") ||
      lowered.includes("refrigerat") ||
      lowered.includes("cooler")
    ) {
      return "fridge";
    }
    if (lowered.includes("shelf") || lowered.includes("pantry")) return "shelf";
    if (/^(true|yes|1)$/.test(lowered)) return "fridge";
    if (/^(false|no|0)$/.test(lowered)) return "shelf";
    return "";
  } else if (typeof raw === "boolean" || typeof raw === "number") {
    return raw ? "fridge" : "shelf";
  }

  return "";
}

function isNonEmptyString(v: any): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function extractPhotos(p: any = {}): string[] {
  function normalizeUrlCandidates(raw: any): string[] {
    if (!isNonEmptyString(raw)) return [];

    let s = String(raw).trim();
    if (!s) return [];

    if (
      (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
      (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
    ) {
      s = s.slice(1, -1).trim();
    }
    if (!s) return [];

    if (/^data:image\//i.test(s)) return [s];

    if (s.startsWith("//")) return [`https:${s}`];

    if (/%2F/i.test(s) || /%3A/i.test(s)) {
      try {
        const decoded = decodeURIComponent(s);
        if (decoded && decoded !== s) {
          const normalized = normalizeUrlCandidates(decoded);
          if (normalized.length) return normalized;
        }
      } catch {
        // ignore
      }
    }

    if (/^https?:\/\//i.test(s)) {
      if (/^http:\/\//i.test(s)) {
        const httpsVersion = `https://${s.slice("http://".length)}`;
        return [httpsVersion, s];
      }
      return [s];
    }

    if (/^www\./i.test(s)) return [`https://${s}`];

    return [];
  }

  const urls: string[] = [];

  if (Array.isArray(p.photos)) {
    p.photos.forEach((entry: any) => {
      const candidate =
        typeof entry === "string"
          ? entry
          : (entry && (entry.url || entry.src || entry.href)) || "";
      urls.push(candidate);
    });
  }

  if (Array.isArray(p.photoUrls)) urls.push(...p.photoUrls);
  if (Array.isArray(p.imageUrls)) urls.push(...p.imageUrls);
  if (Array.isArray(p.urls)) urls.push(...p.urls);

  urls.push(p.url, p.photoUrl, p.imageUrl, p.image, p.imgUrl, p.imgURL);

  if (isNonEmptyString(p.img_link)) {
    urls.push(...String(p.img_link).split(/[\s,;]+/));
  }
  if (isNonEmptyString(p.imgLink)) {
    urls.push(...String(p.imgLink).split(/[\s,;]+/));
  }

  const normalized = urls
    .flatMap((u) => normalizeUrlCandidates(trimString(u)))
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  normalized.forEach((u) => {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  });
  return out;
}

function computeInventoryTotalItems(doc: any): number | null {
  const cats = doc?.inventory?.categories;
  if (!Array.isArray(cats)) return null;
  const total = cats.reduce(
    (sum: number, c: any) => sum + (coerceNumber(c?.quantity) ?? 0),
    0,
  );
  return Number.isFinite(total) ? total : null;
}

function normalizePantry(doc: any): Pantry {
  const id =
    doc.id ??
    doc.pantryId ??
    doc.device_id ??
    doc.deviceId ??
    doc.slug ??
    String(Math.random()).slice(2);

  const name =
    doc.name ??
    doc.title ??
    doc.displayName ??
    doc.device_name ??
    doc.deviceName ??
    doc.device ??
    doc.slug ??
    `Pantry ${id}`;

  const location = extractLocation(doc);
  const address = buildAddress(doc);
  const stockResolution = resolveStockInfo(doc);
  const stock = stockResolution.stock;
  const inventoryTotalItems = computeInventoryTotalItems(doc);
  const photos = extractPhotos(doc);
  const pantryType = derivePantryType(doc);

  const pantry: Pantry = {
    id: String(id),
    name: String(name),
    location,
  };

  if (address) pantry.address = address;
  if (stock) {
    pantry.stock = stock;
    pantry.stockLevelLabel = stockResolution.badgeLabel;
    pantry.stockLevelCls = stockResolution.badgeCls;
    pantry.stockLevelUpdatedAt = stock.lastUpdateIso;
    pantry.stockLevelSource = stock.lastUpdateSource;
  }
  if (photos.length > 0) {
    pantry.photos = photos;
  }
  if (pantryType) {
    pantry.pantryType = pantryType;
  }
  pantry.inventoryTotalItems = inventoryTotalItems;

  return pantry;
}

export async function fetchPantries(): Promise<Pantry[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, "")}/pantries`;

  try {
    const docs = await fetchJson<any[]>(url);
    if (!Array.isArray(docs)) return [];
    return docs.map(normalizePantry);
  } catch (e) {
    console.error("Failed to fetch pantries from backend:", e);
    return [];
  }
}

// -------- Donor notes (donations) --------

export interface Donation {
  id?: string;
  note?: string;
  donationSize?: string;
  donationItems?: string[];
  photoUrls?: string[];
  createdAt?: string;
  created_at?: string;
  timestamp?: string;
  updatedAt?: string;
}

interface DonationListResponse {
  items?: Donation[];
  page?: number;
  pageSize?: number;
  total?: number;
}

function getDonationTimeMs(d: Donation): number {
  const raw = d.createdAt ?? d.created_at ?? d.timestamp ?? d.updatedAt;
  if (raw == null || raw === "") return Date.now();
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

export async function fetchRecentDonations(
  pantryId: string,
): Promise<Donation[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, "")}/donations?pantryId=${encodeURIComponent(
    pantryId,
  )}&page=1&pageSize=100`;

  try {
    const data = await fetchJson<DonationListResponse>(url);
    const items = Array.isArray(data?.items) ? data.items : [];
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;
    return items
      .filter((d) => getDonationTimeMs(d) >= cutoff)
      .sort((a, b) => getDonationTimeMs(b) - getDonationTimeMs(a));
  } catch (e) {
    console.error("Failed to fetch donations:", e);
    return [];
  }
}

// Donation weight mapping: legacy DONATION_WEIGHT_KG
const DONATION_WEIGHT_KG: Record<string, number> = {
  low_donation: 2,
  medium_donation: 10,
  high_donation: 25,
};
const DONATION_24H_MS = 24 * 60 * 60 * 1000;

/**
 * Compute a live StockInfo from self-reported donations within the last 24 h.
 * Mirrors legacy getDonationBasedStock: 5× Low = 1× Medium, 2× Medium = 1× High.
 * Returns null when there are no recent donations or totals are zero.
 */
export async function getDonationBasedStock(
  pantryId: string,
): Promise<StockInfo | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const normalizedId = String(pantryId).replace(/^p-/i, "");
    const url = `${baseUrl.replace(/\/+$/, "")}/donations?pantryId=${encodeURIComponent(normalizedId)}&page=1&pageSize=100`;
    const data = await fetchJson<DonationListResponse>(url);
    const items: Donation[] = Array.isArray(data?.items) ? data.items : [];

    const now = Date.now();
    const cutoff = now - DONATION_24H_MS;
    const recent = items
      .filter((d) => getDonationTimeMs(d) >= cutoff)
      .sort((a, b) => getDonationTimeMs(b) - getDonationTimeMs(a));

    if (recent.length === 0) return null;

    const countLow = recent.filter((d) => d.donationSize === "low_donation").length;
    const countMedium = recent.filter((d) => d.donationSize === "medium_donation").length;
    const countHigh = recent.filter((d) => d.donationSize === "high_donation").length;
    // 5× Low = 1× Medium (5 units); 2× Medium = 1× High (10 units)
    const totalUnits = countLow * 1 + countMedium * 5 + countHigh * 10;

    let weightKg: number | null = null;
    if (totalUnits >= 10) weightKg = DONATION_WEIGHT_KG.high_donation;
    else if (totalUnits >= 5) weightKg = DONATION_WEIGHT_KG.medium_donation;
    else if (totalUnits >= 1) weightKg = DONATION_WEIGHT_KG.low_donation;

    if (weightKg === null) return null;

    const badge = computeStockLevelFromWeight(weightKg);
    if (!badge) return null;

    const first = recent[0];
    const rawTs = first.createdAt ?? first.created_at ?? first.updatedAt ?? first.timestamp ?? null;
    const lastUpdateIso = rawTs != null ? (typeof rawTs === "string" ? rawTs : new Date(rawTs as number).toISOString()) : new Date().toISOString();

    return {
      level: badge.level as StockInfo["level"],
      lastUpdateIso,
      lastUpdateSource: "self",
      sensorWeightKg: null,
    };
  } catch (e) {
    console.warn("getDonationBasedStock failed", e);
    return null;
  }
}

// -------- Wishlist --------

export interface WishlistItem {
  id?: string;
  itemDisplay: string;
  count: number;
  updatedAt?: string | null;
}

export async function fetchWishlist(
  pantryId: string,
): Promise<WishlistItem[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, "")}/wishlist?pantryId=${encodeURIComponent(
    pantryId,
  )}`;

  try {
    const data = await fetchJson<any>(url);
    const rawItems: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : [];

    return rawItems.map((item) => ({
      id: String(item.id ?? item.key ?? item.itemDisplay ?? ""),
      itemDisplay: String(item.itemDisplay ?? item.item ?? "").trim(),
      count:
        (coerceNumber(item.count) ?? coerceNumber(item.quantity) ?? 1) || 1,
      updatedAt:
        item.updatedAt ??
        item.updated_at ??
        item.timestamp ??
        item.createdAt ??
        null,
    }));
  } catch (e) {
    console.error("Failed to fetch wishlist:", e);
    return [];
  }
}

export async function addWishlistItem(
  pantryId: string,
  itemDisplay: string,
  quantity: number = 1,
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, "")}/wishlist`;

  const trimmedItem = itemDisplay.trim();
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

  if (!trimmedItem) {
    throw new Error("Missing item name");
  }

  const body = {
    pantryId,
    item: trimmedItem,
    quantity: safeQuantity,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to add wishlist item (${res.status})`);
  }
}

// -------- Messages --------

export interface MessageItem {
  id?: string;
  content: string;
  userName?: string;
  userAvatar?: string;
  photos?: string[];
  createdAt?: string;
  created_at?: string;
  timestamp?: string;
  updatedAt?: string;
}

export async function fetchMessages(
  pantryId: string,
): Promise<MessageItem[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, "")}/messages?pantryId=${encodeURIComponent(
    pantryId,
  )}`;

  try {
    const data = await fetchJson<any>(url);
    const rawItems: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : [];

    return rawItems.map((m) => ({
      id: String(m.id ?? m.key ?? ""),
      content: String(m.content ?? "").trim(),
      userName: m.userName ?? m.name ?? "",
      userAvatar: m.userAvatar ?? m.avatar ?? "",
      photos: Array.isArray(m.photos) ? m.photos : [],
      createdAt:
        m.createdAt ??
        m.created_at ??
        m.timestamp ??
        m.updatedAt ??
        undefined,
    }));
  } catch (e) {
    console.error("Failed to fetch messages:", e);
    return [];
  }
}

export async function postMessage(
  pantryId: string,
  content: string,
  userName?: string,
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/+$/, "")}/messages`;

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message content is required");

  const body = {
    pantryId,
    content: trimmed,
    ...(userName ? { userName } : {}),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to post message (${res.status})`);
  }
}

/**
 * Fetch the latest sensor reading for a pantry (e.g. pantry 4015 with hardware sensor)
 * and return a live StockInfo, or null if no valid/fresh reading is available.
 * Mirrors the legacy getTelemetryLatest → hydratePantryStock flow.
 */
export async function fetchLiveTelemetryStock(
  pantryId: string,
): Promise<StockInfo | null> {
  const baseUrl = getApiBaseUrl();
  // Strip the "p-" prefix that some IDs may carry
  const normalizedId = String(pantryId).replace(/^p-/i, "");
  const url = `${baseUrl.replace(/\/+$/, "")}/telemetry/latest?pantryId=${encodeURIComponent(normalizedId)}`;

  try {
    const data = await fetchJson<any>(url);
    // Backend may return flat { weight, timestamp } or wrapped { latest: {...} }
    const raw =
      data != null && data.weight !== undefined ? data : (data?.latest ?? null);
    if (raw == null) return null;

    const weight = coerceNumber(raw.weight ?? raw.weightKg);
    const ts = raw.timestamp ?? raw.updatedAt ?? raw.ts ?? null;
    const tsStr: string | null =
      ts == null
        ? null
        : typeof ts === "string"
          ? ts
          : new Date(ts).toISOString();

    if (weight === null || tsStr === null) return null;
    if (!isWeightInReasonableRange(weight)) return null;

    // Discard readings older than 24 h (sensor offline / disconnected)
    const SENSOR_MAX_AGE_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(tsStr).getTime() > SENSOR_MAX_AGE_MS) return null;

    const badge = computeStockLevelFromWeight(weight);
    if (!badge) return null;

    return {
      level: badge.level as StockInfo["level"],
      lastUpdateIso: tsStr,
      lastUpdateSource: "sensor",
      sensorWeightKg: weight,
    };
  } catch {
    // Sensor endpoint unavailable — caller falls back to pantry.stock
    return null;
  }
}

