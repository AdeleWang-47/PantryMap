# PantryLink — Community Pantry Map

A modern Next.js web app for locating community fridges and micro-pantries, reporting donations, and viewing real-time stock levels.

## Project structure

```text
app/                         Next.js App Router pages
  map/                         Interactive pantry map (/map)
  food-donation-guide/         Donation guide
  about-us/                    About page
  update/                      Pantry update flow
components/                  React/TypeScript UI components
  Header.tsx                   Site header with responsive nav
  MapView.tsx                  Leaflet map (integrated into Next.js)
  PantryList.tsx               Pantry list with filter chips
  PantryDetail.tsx             Pantry detail panel
  StockGauge.tsx               Semi-circle stock level gauge
lib/
  pantry-api.ts                API client for Azure Functions backend
  pantry-types.ts              Shared TypeScript types
public/                      Static assets (logos, icons, placeholders)
PantryMap/
  functions-backend/           Azure Functions backend (APIs: pantries, donations, messages, telemetry, wishlist)
  legacy/                      Archived legacy code (old static frontend + Express backend)
docs/                        Documentation
```

## Prerequisites

- **Node.js** v18+
- **Azure Functions Core Tools v4** (optional — only needed to run the backend API locally)

## Run locally

### 1. Start the Next.js app

From the repo root:

```bash
npm install
npm run dev:local
```

The dev server starts at **`http://localhost:3000`**.

Pages:
- `/map` — Interactive pantry map
- `/food-donation-guide` — Donation guide
- `/about-us` — About page

### 2. Start the Azure Functions backend (optional, recommended)

```bash
npm run dev:backend
```

API root: **`http://localhost:7071/api`**

Set the environment variable so the frontend points to it:

```bash
NEXT_PUBLIC_PANTRY_API_BASE_URL=http://localhost:7071/api
```

See `NEXTJS_ENVIRONMENT_SETUP.md` and `LOCAL_DEV.md` for full setup details.

## Backend APIs

The Azure Functions backend (`PantryMap/functions-backend/`) provides:

| Endpoint | Description |
|---|---|
| `GET /api/pantries` | List all pantries |
| `GET /api/pantries/{id}` | Single pantry by ID |
| `GET /api/donations` | Recent donations |
| `POST /api/donations` | Report a donation |
| `GET /api/telemetry/latest` | Latest sensor reading (e.g. pantry 4015) |
| `GET /api/wishlist` | Pantry wishlist items |
| `GET /api/messages` | Community messages |
| `POST /api/messages` | Post a message |

## Notes

- The map is fully integrated into Next.js — no separate static server needed.
- Sensor-connected pantries (e.g. pantry 4015) receive live stock updates via `/api/telemetry/latest` when the detail panel is opened.
- User manual PDF: `docs/UserManual.pdf`
