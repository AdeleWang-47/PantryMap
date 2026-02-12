# Telemetry Frontend Usage Guide

This document explains how the frontend should fetch and use hardware telemetry data for the existing **Stock Level** section.

---

## 1. How to Fetch Telemetry

Use the existing API layer:

```js
const telemetry = await API.getTelemetryLatest(pantryId);

