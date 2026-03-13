# Connected Micro Pantry (CMP) Platform
# User Manual (PDF Source)

## Cover Page

**Project Title:** Connected Micro Pantry (CMP) Platform — Donation Guide + Pantry Map  
**Version:** 0.1.0  
**Team Members:** (add team member names)  
**Instructor:** (add instructor name)  
**Industrial Sponsor:** (if applicable; otherwise write "N/A")  
**Submission Date:** (add submission date)  

(screent of of project logo / product image)

---

## 1) Product Overview (Non-Technical)

The Connected Micro Pantry (CMP) Platform is a web-based tool that helps communities support local micro-pantries by making it easier to **find pantries**, **understand donation guidelines**, and **share updates**.

- **What it is**: A website with donation guidance and community information, plus a map dashboard that shows pantry locations.
- **The problem it solves**: Donors often want to help but are unsure what items are appropriate and where to donate. Pantry organizers need a simple way to present information and updates.
- **Who it’s designed for**:
  - Community members who want to donate food and supplies
  - Volunteers and pantry organizers who maintain pantry information
  - Partner organizations who share resources and guidelines
- **Primary features**:
  - Donation Guide pages and a searchable donation guide section
  - About Us page describing the initiative and partners
  - Pantry map dashboard with clickable locations and a details side panel
  - Optional backend API for health checks and integration points

---

## 2) System Requirements

### Supported operating systems

- **macOS**: supported (recommended for local dev)
- **Windows**: supported for Next.js; some Next.js native dependencies may require extra setup
- **Linux**: supported

### Hardware requirements

- Any modern laptop/desktop capable of running Node.js
- Recommended: 8 GB RAM or more

### Dependencies

- **Node.js** (v18+ recommended)
- **npm** (included with Node.js)
- **Python 3** (optional; only needed to run the PantryMap static server locally)
- **Azure Functions Core Tools v4** (optional; only needed to run the Azure Functions backend locally)

### Internet requirements

- Internet access is recommended for:
  - Installing dependencies (`npm install`)
  - Loading third-party map tiles (Leaflet/OpenStreetMap or similar), depending on configuration

### Required user accounts

- No user account is required to view the site locally.
- If deploying to Azure Static Web Apps or using Azure resources, an **Azure account** may be required for deployment and configuration.

### Package contents (software-only)

This repository includes:

- Next.js website source code (`app/`, `components/`, `public/`)
- Pantry map dashboard (`PantryMap/frontend/`)
- Optional backend services (`PantryMap/functions-backend/`, `PantryMap/backend/`)
- Documentation, including this manual (`docs/`)

---

## 3) Installation and Setup (Step-by-Step)

These steps assume you have downloaded/cloned the repository onto your computer.

### A. Install and run the Next.js site (Donation Guide + About Us)

1. **Open a terminal** and change into the project folder.
2. **Install dependencies** (first time only):

   ```bash
   npm install
   ```

3. **Start the development server**:

   ```bash
   npm run dev:local
   ```

4. **Open the site in your browser**:
   - Home: `http://127.0.0.1:3000`
   - About Us: `http://127.0.0.1:3000/about-us`
   - Food Donation Guide: `http://127.0.0.1:3000/food-donation-guide`
   - Donation Guide Search: `http://127.0.0.1:3000/food-donation-guide/search`

(screent of of Next.js home page running locally)

### B. (Optional) Run the PantryMap dashboard locally

1. Open a **second terminal** (keep the Next.js server running).
2. Start the static server for the map:

   ```bash
   npm run dev:map
   ```

3. Open the map dashboard:
   - `http://localhost:8080`

(screent of of PantryMap dashboard with markers and side panel)

### C. (Optional) Run the Azure Functions backend locally

Only do this if you need API endpoints locally (for example, `/api/health`).

1. Install Azure Functions Core Tools (if not already installed):

   ```bash
   npm install -g azure-functions-core-tools@4
   ```

2. Start the backend:

   ```bash
   npm run dev:backend
   ```

3. Verify the health endpoint:
   - `http://localhost:7071/api/health`

(screent of of browser showing /api/health response)

### D. (Optional) Configure PantryMap URL for iframe embedding

Some Next.js pages may embed the PantryMap using an environment variable.

1. Review the setup guide: `NEXTJS_ENVIRONMENT_SETUP.md`
2. Set `NEXT_PUBLIC_PANTRY_MAP_URL` for your environment (local or deployed).

---

## 4) Operating Instructions

### Starting the system (local)

1. Start the Next.js site:
   - `npm run dev:local`
2. (Optional) Start the PantryMap static dashboard:
   - `npm run dev:map`
3. (Optional) Start the Azure Functions backend:
   - `npm run dev:backend`

### Using primary features

- **Donation Guide**:
  - Navigate to `/food-donation-guide`
  - Use the search page `/food-donation-guide/search` to find donation guidance

- **About Us**:
  - Navigate to `/about-us` to learn about CMP and partners

- **Pantry Map Dashboard**:
  - Open `http://localhost:8080`
  - Click markers to open the details side panel

### Proper shutdown (local)

In each terminal window:

1. Press `Ctrl + C` to stop the running server.
2. Confirm the terminal returns to a normal prompt.

---

## 5) Technical Specifications

### Architecture (high-level)

- **Next.js frontend**:
  - Implements the Donation Guide and About Us pages
  - Runs locally as a development server on port 3000

- **PantryMap dashboard (static frontend)**:
  - Leaflet-based map UI
  - Runs locally via a static server on port 8080

- **Backend options**:
  - **Azure Functions backend** (`PantryMap/functions-backend`): recommended local API for integration endpoints
  - **Express backend** (`PantryMap/backend`): legacy backend that may require database setup

### Technologies used

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Leaflet (PantryMap)
- Azure Functions (optional backend)
- Express (legacy backend)

### Database information

- The **Next.js site** does not require a database for local viewing.
- The **Express backend** may use SQLite (see `PantryMap/backend/README.md`) and can migrate pantry data from JSON.

### Integrations

- Optional embedding of PantryMap via `NEXT_PUBLIC_PANTRY_MAP_URL`
- Map tiles may be loaded from external providers depending on PantryMap configuration

---

## 6) Safety / Security / Privacy

This is a **software-only** project.

### Data privacy considerations

- Do not store sensitive personal data in public configuration files.
- If you add user submissions or analytics, ensure you comply with applicable privacy policies and regulations.

### Security warnings

- Do not expose local development servers to the public internet without proper security controls.
- Treat any deployment secrets (API tokens, keys) as confidential and store them in environment variables or secret managers.

### Known operational limitations (security-related)

- Local development servers are intended for development/testing and are not hardened production services by default.

---

## 7) Troubleshooting

### Problem: Port 3000 is already in use / another Next.js dev server is running

- **Symptoms**: Next.js fails to start, or shows a lock/port-in-use message.
- **Fix**:
  - Stop the other server (`Ctrl + C`) and retry `npm run dev:local`
  - See `LOCAL_DEV.md` for additional help

### Problem: The PantryMap page loads but the map tiles do not appear

- Check your internet connection (tile providers often require internet access).
- Confirm no ad-blocker or privacy tool is blocking tile requests.

### Problem: Azure Functions backend won’t start

- Confirm Azure Functions Core Tools is installed: `func --version`
- Reinstall dependencies in `PantryMap/functions-backend`:
  - `cd PantryMap/functions-backend && npm install`

### Problem: `/api/health` returns an error

- Confirm the backend is running on port 7071
- Check terminal output for startup errors

---

## 8) Limitations

- Some parts of the platform may use placeholder/demo data depending on the environment and configuration.
- The map dashboard and the Next.js site may run as separate local servers during development.
- The legacy Express backend may require additional setup (database tooling and native build dependencies).
- UI/UX and integrations may be incomplete depending on the current project milestone.

---

## Appendix: Regenerating the PDF

To regenerate the PDF manual from this markdown source:

```bash
npm run docs:manual
```
