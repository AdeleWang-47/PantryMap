# PantryMap — Backend & Legacy

## Active backend

`functions-backend/` — Azure Functions backend (TypeScript).
This is the API server used by the current Next.js frontend.

Start locally:

```bash
cd functions-backend
npm install
npm run start
```

API root: `http://localhost:7071/api`

See `run_local.md` for full local development instructions.

---

## Legacy code

`legacy/` contains the original static frontend and Express backend, kept for reference only.
The current frontend has been fully migrated to Next.js (see repo root `app/`).

| Path | Description |
|---|---|
| `legacy/frontend/` | Original Leaflet map (static HTML + JS) |
| `legacy/backend/` | Express.js backend (superseded by `functions-backend/`) |
| `legacy/api.js`, `legacy/app.js` | Older standalone scripts |
