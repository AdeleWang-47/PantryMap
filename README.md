# Connected Micro Pantry (CMP) — Donation Guide + Pantry Map

This repo contains:

- A **Next.js website** (Donation Guide + About Us + Update flow)
- A **PantryMap** web map (Leaflet-based map dashboard + optional backends)
- Supporting docs and a user manual PDF

## User manual (PDF)

- `docs/UserManual.pdf` (generated from `docs/UserManual.md`)
- To regenerate locally: `npm run docs:manual`

## Project structure

High-level layout:

```text
app/                         Next.js App Router pages
components/                  Next.js UI components
public/                      Static assets for the Next.js site
PantryMap/
  frontend/                  Leaflet map dashboard (static web app)
  functions-backend/         Azure Functions backend (recommended local API)
  backend/                   Express backend (legacy; optional)
  legacy/                    Older scripts/data kept for reference
docs/                        Documentation, including the User Manual PDF
```

## Prerequisites

- **Node.js**: v18+ recommended
- **npm**: comes with Node.js
- **Python 3** (optional): used for the static server for `PantryMap/frontend`
- **Azure Functions Core Tools v4** (optional): only if running `PantryMap/functions-backend` locally

## Run the Next.js site (Donation Guide / About Us)

From the repo root:

```bash
npm install
npm run dev:local
```

What to expect:

- The dev server starts at **`http://127.0.0.1:3000`**
- Pages you can open:
  - `/` (home)
  - `/about-us`
  - `/food-donation-guide`
  - `/food-donation-guide/search`

Notes:

- If you see “another instance of next dev running” or port conflicts, stop the other dev server and retry. See `LOCAL_DEV.md`.

## Run the PantryMap (Leaflet map dashboard)

The map dashboard is a separate static frontend under `PantryMap/frontend/`.

```bash
npm run dev:map
```

What to expect:

- A static server starts at **`http://localhost:8080`**
- You should see a map with markers and a side panel when clicking markers

## Run the PantryMap Azure Functions backend (optional, recommended)

This provides APIs such as `/api/health` for local integration.

```bash
npm run dev:backend
```

What to expect:

- API root at **`http://localhost:7071/api`**
- Health check at **`http://localhost:7071/api/health`**

More details: `LOCAL_DEV.md` and `PantryMap/run_local.md`.

## Environment variables (Next.js → PantryMap iframe)

Some pages embed the PantryMap via `NEXT_PUBLIC_PANTRY_MAP_URL`.

- Setup guide: `NEXTJS_ENVIRONMENT_SETUP.md`
