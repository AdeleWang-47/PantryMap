(function () {
  'use strict';

  /**
   * PantryAPI
   * - Normalizes backend (Cosmos/Azure Functions) pantry payloads into stable UI-ready models.
   * - Falls back to ./pantries.json only when the backend is unreachable (network/CORS).
   */

  const API = {};
  const API_BASE_URL = 'http://localhost:7071/api';
  const FALLBACK_PANTRIES_URL = './pantries.json';

  // ---------------------------
  // Small utils
  // ---------------------------

  const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
  const trimString = (v) => (typeof v === 'string' ? v.trim() : '');
  const toStringSafe = (v) => (v == null ? '' : String(v).trim());

  function coerceNumber(value) {
    if (value == null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function firstNumber(candidates) {
    for (const value of candidates) {
      const num = coerceNumber(value);
      if (num !== null) return num;
    }
    return null;
  }

  function normalizePantryId(id) {
    if (id == null) return '';
    if (typeof id === 'number') return Number.isFinite(id) ? String(id) : '';
    const trimmed = String(id).trim();
    if (!trimmed) return '';
    if (/^\d+$/.test(trimmed)) return String(Number.parseInt(trimmed, 10));
    const prefixed = trimmed.match(/^(?:pantry|p)[-_]?(\d+)$/i);
    if (prefixed) return String(Number.parseInt(prefixed[1], 10));
    return trimmed;
  }

  function resolvePantryId(id) {
    const raw = id == null ? '' : String(id).trim();
    const normalized = normalizePantryId(raw);
    // backend: prefer raw if present (some backends store alphanumeric ids), else normalized
    const backend = raw || normalized;
    const fallback = normalized || raw;
    return { raw, normalized, backend, fallback };
  }

  function buildQuery(paramsObj = {}) {
    const params = new URLSearchParams();
    Object.entries(paramsObj).forEach(([k, v]) => {
      if (v == null || v === '') return;
      params.append(k, String(v));
    });
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, { cache: 'no-store', ...options });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} for ${url}`);
      err.status = res.status;
      try {
        const text = await res.text();
        try {
          const errorBody = JSON.parse(text);
          err.body = errorBody;
          err.message = errorBody?.error || errorBody?.message || `HTTP ${res.status} for ${url}`;
        } catch (_) {
          err.body = text;
          err.message = text || `HTTP ${res.status} for ${url}`;
        }
      } catch (_) {
        err.message = `HTTP ${res.status} for ${url}`;
      }
      throw err;
    }
    return res.json();
  }

  function isNetworkError(error) {
    return error instanceof TypeError || error?.name === 'TypeError';
  }

  // ---------------------------
  // Extractors (normalize fields)
  // ---------------------------

  function extractLocation(p = {}) {
    const coords = Array.isArray(p.location?.coordinates) ? p.location.coordinates : null;
    const lat = firstNumber([
      p.location?.lat,
      p.location?.latitude,
      p.lat,
      p.latitude,
      p.lat_or,
      p.latOr,
      coords ? coords[1] : null,
    ]);
    const lng = firstNumber([
      p.location?.lng,
      p.location?.lon,
      p.location?.longitude,
      p.lon,
      p.lng,
      p.longitude,
      p.lon_or,
      p.lonOr,
      coords ? coords[0] : null,
    ]);
    return { lat: lat ?? null, lng: lng ?? null };
  }

  /**
   * ✅ Your requirement:
   * pantry.address = address/adress + city/town + state + zip
   */
  function extractAddress(p = {}) {
    const street =
      (isNonEmptyString(p.address) && p.address.trim()) ||
      (isNonEmptyString(p.adress) && p.adress.trim()) ||
      '';

    const city =
      (isNonEmptyString(p.city) && p.city.trim()) ||
      (isNonEmptyString(p.town) && p.town.trim()) ||
      '';

    const state =
      (isNonEmptyString(p.state) && p.state.trim()) ||
      (isNonEmptyString(p.region) && p.region.trim()) ||
      '';

    const zip =
      // zip can be number (98110) in your example
      toStringSafe(p.zip || p.zipcode || p.postalCode);

    return [street, city, state, zip].filter(Boolean).join(', ');
  }

  function extractPhotos(p = {}) {
    function normalizeUrlCandidates(raw) {
      // Return 0..N normalized, browser-loadable URLs for a single raw value.
      // This lets us "attempt" http→https upgrades without breaking compatibility.
      if (!isNonEmptyString(raw)) return [];

      let s = raw.trim();
      if (!s) return [];

      // Remove surrounding quotes defensively (often appears in CSV/JSON exports).
      if (
        (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
        (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
      ) {
        s = s.slice(1, -1).trim();
      }
      if (!s) return [];

      if (/^data:image\//i.test(s)) return [s];

      // Protocol-relative URL (//example.com/img.jpg) → prefer https
      if (s.startsWith('//')) return [`https:${s}`];

      // Sometimes values are URL-encoded. Decode and re-normalize.
      if (/%2F/i.test(s) || /%3A/i.test(s)) {
        try {
          const decoded = decodeURIComponent(s);
          if (decoded && decoded !== s) {
            const normalized = normalizeUrlCandidates(decoded);
            if (normalized.length) return normalized;
          }
        } catch (_) {}
      }

      if (/^https?:\/\//i.test(s)) {
        // Frontend is often served over HTTPS; http images can be blocked as mixed content.
        // We "attempt" an https upgrade but also keep the original http URL to avoid breaking
        // environments where the host does not support HTTPS (or when the app is served over HTTP).
        if (/^http:\/\//i.test(s)) {
          const httpsVersion = `https://${s.slice('http://'.length)}`;
          return [httpsVersion, s];
        }
        return [s];
      }

      // Common shorthand: "www.example.com/..." → assume https
      if (/^www\./i.test(s)) return [`https://${s}`];

      return [];
    }

    const urls = [];

    // Most common: array of strings (or array of objects containing url/src/href).
    if (Array.isArray(p.photos)) {
      p.photos.forEach((entry) => {
        const candidate =
          typeof entry === 'string'
            ? entry
            : (entry && (entry.url || entry.src || entry.href)) || '';
        urls.push(candidate);
      });
    }

    // Alternate arrays.
    if (Array.isArray(p.photoUrls)) urls.push(...p.photoUrls);
    if (Array.isArray(p.imageUrls)) urls.push(...p.imageUrls);
    if (Array.isArray(p.urls)) urls.push(...p.urls);

    // Singular fields.
    urls.push(p.url, p.photoUrl, p.imageUrl, p.image, p.imgUrl, p.imgURL);

    // Backend examples: img_link with multiple URLs separated by spaces (or commas/semicolons).
    if (isNonEmptyString(p.img_link)) {
      urls.push(...p.img_link.split(/[\s,;]+/));
    }

    // Also accept "img_link" variants.
    if (isNonEmptyString(p.imgLink)) {
      urls.push(...p.imgLink.split(/[\s,;]+/));
    }

    // Normalize + de-dupe.
    const normalized = urls
      .flatMap((u) => normalizeUrlCandidates(trimString(u)))
      .filter(Boolean);

    // De-dupe while preserving order (prefer https-upgraded variants first).
    const seen = new Set();
    const out = [];
    normalized.forEach((u) => {
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    });
    return out;
  }

  function derivePantryType(p = {}) {
    const raw = p.refrigerated ?? p.pantryType ?? p.type ?? '';
    const normalizeString = (value) => String(value).trim().toLowerCase();

    if (Array.isArray(raw)) {
      const lowered = raw.map(normalizeString).filter(Boolean);
      const hasFridge = lowered.some((v) => v.includes('fridge') || v.includes('refrigerat'));
      const hasShelf = lowered.some((v) => v.includes('shelf') || v.includes('pantry'));
      if (hasFridge && hasShelf) return 'shelf+fridge';
      if (hasFridge) return 'fridge';
      if (hasShelf) return 'shelf';
    } else if (typeof raw === 'string') {
      const lowered = normalizeString(raw);
      if (!lowered) return 'shelf';
      if (/(both|and|\+|all)/.test(lowered) && lowered.includes('fridge')) return 'shelf+fridge';
      if (lowered.includes('fridge') || lowered.includes('refrigerat') || lowered.includes('cooler')) return 'fridge';
      if (lowered.includes('shelf') || lowered.includes('pantry')) return 'shelf';
    } else if (typeof raw === 'boolean') {
      return raw ? 'fridge' : 'shelf';
    }

    return 'shelf';
  }

  /**
   * ✅ Your requirement:
   * - pantry.contact.owner / pantry.contact.email / pantry.contact.emailAddress → UI does NOT show avatar or name
   * - show as: "Pantry manage contact information: Contact"
   *
   * So we normalize to a UI-friendly structure:
   * pantry.contact = null | { label: "Contact", raw: "<whatever backend gave>", kind: "contact" }
   *
   * UI can render:
   * Title: Pantry manage contact information
   * Button text: pantry.contact.label ("Contact")
   */
  function extractContact(p = {}) {
    // Support common shapes (string or nested objects), but we DO NOT expose name/avatar fields.
    const raw =
      trimString(p.contact) ||
      trimString(p.contactInfo) ||
      trimString(p.email) ||
      trimString(p.emailAddress) ||
      trimString(p.contact?.email) ||
      trimString(p.contact?.emailAddress) ||
      trimString(p.contact?.contact) ||
      '';

    if (!raw) return null;

    return {
      label: 'Contact',
      kind: 'contact',
      raw, // keep raw for possible click behavior (mailto, link, etc.), but UI can ignore it if desired
    };
  }

  // ---------------------------
  // Normalizer (single source of truth)
  // ---------------------------

  function normalizePantry(p = {}) {
    const cosmosId = toStringSafe(p.id);
    const legacyId = toStringSafe(p.pantryId);
    const { normalized: normalizedFallbackId } = resolvePantryId(cosmosId || legacyId || '');
    const id = cosmosId || legacyId || normalizedFallbackId || '';

    const rawStatus = trimString(p.status).toLowerCase();
    const status = rawStatus === 'active' ? 'open' : rawStatus || 'open';

    const detail = trimString(p.detail);
    const description =
      detail ||
      trimString(p.description) ||
      trimString(p.network) ||
      '';

    return {
      id,
      name: isNonEmptyString(p.name) ? p.name.trim() : 'Untitled Pantry',
      status,

      // ✅ requirement: composed address
      address: extractAddress(p),

      pantryType: derivePantryType(p),
      description,

      acceptedFoodTypes: Array.isArray(p.acceptedFoodTypes) ? p.acceptedFoodTypes : [],
      hours: p.hours ?? {},

      photos: extractPhotos(p),
      location: extractLocation(p),

      inventory: p.inventory ?? { categories: [] },

      sensors:
        p.sensors ??
        {
          weightKg: 0,
          lastDoorEvent: '',
          updatedAt: new Date().toISOString(),
          foodCondition: '',
        },

      // ✅ requirement: contact becomes a display model (no avatar/name)
      contact: extractContact(p),

      latestActivity: p.latestActivity ?? null,
      stats:
        p.stats ??
        {
          visitsPerDay: 0,
          visitsPerWeek: 0,
          donationAvgPerDayKg: 0,
          donationAvgPerWeekKg: 0,
          popularTimes: [],
        },

      wishlist: Array.isArray(p.wishlist) ? p.wishlist : [],
      updatedAt: p.updatedAt ?? p.lastUpdated ?? p.modified ?? null,
    };
  }

  // ---------------------------
  // Fallback loaders
  // ---------------------------

  async function loadFallbackPantries() {
    const list = await fetchJson(FALLBACK_PANTRIES_URL);
    return Array.isArray(list) ? list.map(normalizePantry) : [];
  }

  async function loadFallbackPantryById(id) {
    const { backend: backendId, normalized: normalizedId } = resolvePantryId(id);
    const list = await fetchJson(FALLBACK_PANTRIES_URL);

    if (!Array.isArray(list)) return null;

    const targetIds = new Set([backendId, normalizedId].filter(Boolean));

    const match = list.find((p) => {
      const candidate = resolvePantryId(p.id ?? p.pantryId);
      return [candidate.backend, candidate.normalized].some((value) => value && targetIds.has(value));
    });

    return match ? normalizePantry(match) : null;
  }

  // ---------------------------
  // API methods
  // ---------------------------

  API.getPantries = async function getPantries(filters = {}) {
    const query = buildQuery({
      status: filters.status,
      type: filters.type,
      bounds: filters.bounds,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 500,
    });

    const url = `${API_BASE_URL}/pantries${query}`;

    try {
      console.log('Fetching pantries from backend API...', url);
      const list = await fetchJson(url);
      const normalized = Array.isArray(list) ? list.map(normalizePantry) : [];
      console.info('[PantryAPI] Using backend pantries payload', normalized.length);
      return normalized;
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('[PantryAPI] Failed to load pantries from backend', error);
        throw error;
      }
      console.warn('[PantryAPI] Backend unreachable, falling back to static pantries.json');
      const normalized = await loadFallbackPantries();
      console.info('[PantryAPI] Using fallback pantries payload', normalized.length);
      return normalized;
    }
  };

  API.getPantry = async function getPantry(id) {
    const { backend: backendId } = resolvePantryId(id);
    if (!backendId) throw new Error('Pantry id is required');

    const url = `${API_BASE_URL}/pantries/${encodeURIComponent(backendId)}`;

    try {
      const pantry = await fetchJson(url);
      console.info('[PantryAPI] Using backend pantry detail', backendId);
      return normalizePantry(pantry);
    } catch (error) {
      if (!isNetworkError(error)) {
        console.error('[PantryAPI] Failed to load pantry from backend', error);
        throw error;
      }
      console.warn('[PantryAPI] Backend unreachable when fetching pantry, using static fallback.');
      const fallback = await loadFallbackPantryById(backendId);
      if (!fallback) throw error;
      return fallback;
    }
  };

  API.getMessages = async function getMessages(pantryId) {
    const { backend: backendId } = resolvePantryId(pantryId);
    if (!backendId) return [];
    const url = `${API_BASE_URL}/messages${buildQuery({ pantryId: backendId })}`;

    try {
      const data = await fetchJson(url);
      return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  API.postMessage = async function postMessage(pantryId, content, userName, userAvatar, photos = []) {
    const { backend: backendId } = resolvePantryId(pantryId);
    if (!backendId) throw new Error('Pantry id is required');

    const payload = {
      pantryId: backendId,
      content,
      userName,
      userAvatar,
      photos,
    };

    try {
      const data = await fetchJson(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data;
    } catch (error) {
      console.error('Error posting message:', error);
      throw error;
    }
  };

  // Donations
  API.getDonations = async function getDonations(pantryId, page = 1, pageSize = 1) {
    const { backend: backendId } = resolvePantryId(pantryId);
    if (!backendId) return { items: [], page: 1, pageSize: 1, total: 0 };

    const url = `${API_BASE_URL}/donations${buildQuery({ pantryId: backendId, page, pageSize })}`;

    try {
      const data = await fetchJson(url);
      return {
        items: Array.isArray(data?.items) ? data.items : [],
        page: data?.page ?? page,
        pageSize: data?.pageSize ?? pageSize,
        total: coerceNumber(data?.total) ?? 0,
      };
    } catch (e) {
      if (isNetworkError(e)) {
        console.warn('[PantryAPI] /donations unavailable (network/CORS).', e);
      } else {
        console.error('[PantryAPI] getDonations failed', e);
      }
      return { items: [], page, pageSize, total: 0 };
    }
  };

  API.createDonationUploadSas = async function createDonationUploadSas(pantryId, file) {
    const { backend: backendId } = resolvePantryId(pantryId);
    if (!backendId) throw new Error('Pantry id is required');
    if (!file || typeof file.name !== 'string' || typeof file.type !== 'string') {
      throw new Error('A file with name and type is required');
    }

    const payload = {
      pantryId: backendId,
      filename: file.name,
      contentType: file.type,
    };

    const data = await fetchJson(`${API_BASE_URL}/uploads/donations/sas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      uploadUrl: data?.uploadUrl,
      blobUrl: data?.blobUrl,
      expiresOn: data?.expiresOn,
    };
  };

  API.getDonationReadSas = async function getDonationReadSas(blobUrl) {
    if (!blobUrl || typeof blobUrl !== 'string') throw new Error('blobUrl is required');
    const url = `${API_BASE_URL}/uploads/donations/read-sas${buildQuery({ blobUrl })}`;
    const data = await fetchJson(url);
    return {
      readUrl: data?.readUrl,
      expiresOn: data?.expiresOn,
    };
  };

  API.postDonation = async function postDonation(pantryId, payload = {}) {
    const { backend: backendId } = resolvePantryId(pantryId);
    if (!backendId) throw new Error('Pantry id is required');

    const note = trimString(payload.note);
    const donationSize = trimString(payload.donationSize);
    const donationItems = Array.isArray(payload.donationItems) ? payload.donationItems : [];
    const photoUrls = Array.isArray(payload.photoUrls) ? payload.photoUrls : [];
    
    // Only donationSize is required, all other fields are optional
    if (!donationSize) {
      throw new Error('donationSize is required');
    }

    const body = {
      pantryId: backendId,
      donationSize: donationSize,
      ...(note ? { note } : {}),
      ...(donationItems.length > 0 ? { donationItems } : {}),
      ...(photoUrls.length > 0 ? { photoUrls } : {}),
    };

    try {
      console.log('[PantryAPI] Posting donation:', body);
      const data = await fetchJson(`${API_BASE_URL}/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      console.log('[PantryAPI] Donation posted successfully:', data);
      return data;
    } catch (e) {
      console.error('Error posting donation report:', e);
      throw e;
    }
  };

  // Wishlist
  API.getWishlist = async function getWishlist(pantryId) {
    const { backend: backendId } = resolvePantryId(pantryId);
    if (!backendId) return [];

    const url = `${API_BASE_URL}/wishlist${buildQuery({ pantryId: backendId })}`;
    try {
      const data = await fetchJson(url);
      return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    } catch (e) {
      console.error('Error fetching wishlist:', e);
      return [];
    }
  };

  API.addWishlistItem = async function addWishlistItem(pantryId, item, quantity = 1) {
    const { backend: backendId } = resolvePantryId(pantryId);
    const trimmedItem = isNonEmptyString(item) ? item.trim() : String(item || '').trim();
    const parsedQuantity = Number.parseInt(quantity, 10);
    const safeQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

    if (!backendId || !trimmedItem) throw new Error('Missing pantryId or item');

    const payload = { pantryId: backendId, item: trimmedItem, quantity: safeQuantity };

    try {
      const data = await fetchJson(`${API_BASE_URL}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data?.agg ?? data;
    } catch (e) {
      console.error('Error adding wishlist item:', e);
      throw e;
    }
  };

  API.addWishlist = async function addWishlist(pantryId, item, quantity = 1) {
    await API.addWishlistItem(pantryId, item, quantity);
    return API.getWishlist(pantryId);
  };

  // Telemetry
  API.getTelemetryLatest = async function getTelemetryLatest(pantryId) {
    const { backend: backendId } = resolvePantryId(pantryId);
    if (!backendId) return null;
  
    // ✅ new proxy endpoint
    const url = `/api/telemetry/latest${buildQuery({ pantryId: backendId })}`;
  
    try {
      const data = await fetchJson(url);
      // ✅ new shape: telemetry object directly
      return data || null;
    } catch (e) {
      console.error('Error fetching telemetry latest:', e);
      return null;
    }
  };

  // Expose globally
  window.PantryAPI = API;
})();
