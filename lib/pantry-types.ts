export type StockLevel = "low" | "medium" | "high" | "unknown" | "inactive";

export interface StockInfo {
  level: StockLevel;
  lastUpdateIso: string | null;
  lastUpdateSource: "sensor" | "self" | null;
  sensorWeightKg: number | null;
}

export interface PantryLocation {
  lat: number;
  lng: number;
}

export interface Pantry {
  id: string;
  name: string;
  location: PantryLocation;
  address?: string;
  stock?: StockInfo | null;

  // Display fields for list cards and the detail panel
  stockLevelLabel?: string | null;
  stockLevelCls?: string | null;
  stockLevelUpdatedAt?: string | null;
  stockLevelSource?: "sensor" | "self" | null;

  // Coarse item count used as a fallback when no sensor is available
  inventoryTotalItems?: number | null;

  // Photos and type used for list thumbnails and the detail panel
  photos?: string[];
  pantryType?: string | null;
}

