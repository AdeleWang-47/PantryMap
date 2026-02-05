(function () {
  const API = {};

  function normalizePantryId(id) {
    if (id == null) return '';
    const trimmed = String(id).trim();
    if (!trimmed) return '';
    const prefixed = trimmed.match(/^(?:pantry|p)[-_]?(\d+)$/i);
    if (prefixed) {
      const parsed = Number.parseInt(prefixed[1], 10);
      return Number.isFinite(parsed) ? String(parsed) : '';
    }
    const numeric = trimmed.match(/\d+/);
    if (!numeric) return '';
    const parsed = Number.parseInt(numeric[0], 10);
    return Number.isFinite(parsed) ? String(parsed) : '';
  }

  function normalizePantry(p) {
    return {
      id: normalizePantryId(p.id),
      name: p.name ?? "Untitled Pantry",
      status: p.status ?? "open",
      address: p.address ?? "",
      pantryType: p.pantryType ?? "shelf",
      acceptedFoodTypes: Array.isArray(p.acceptedFoodTypes) ? p.acceptedFoodTypes : [],
      hours: p.hours ?? {},
      photos: Array.isArray(p.photos) ? p.photos : [],
      location: {
        lat: Number(p.location?.lat ?? 0),
        lng: Number(p.location?.lng ?? 0),
      },
      inventory: p.inventory ?? { categories: [] },
      sensors: p.sensors ?? { weightKg: 0, lastDoorEvent: "", updatedAt: new Date().toISOString(), foodCondition: "" },
      contact: p.contact ?? { owner: "", phone: "", manager: "", volunteer: "" },
      latestActivity: p.latestActivity ?? null,
      stats: p.stats ?? { visitsPerDay: 0, visitsPerWeek: 0, donationAvgPerDayKg: 0, donationAvgPerWeekKg: 0, popularTimes: [] },
      wishlist: Array.isArray(p.wishlist) ? p.wishlist : [],
    };
  }

  // API base URL - change to your backend URL
  const API_BASE_URL = 'http://localhost:7071/api';

  API.getPantries = async function getPantries(filters = {}) {
    try {
      console.log('Fetching pantries from backend API...');
      
      // Build query string from filters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.bounds) params.append('bounds', filters.bounds);
      // Ensure we fetch enough pantries for the map (backend default is 100)
      params.append('page', String(filters.page ?? 1));
      params.append('pageSize', String(filters.pageSize ?? 500));
      
      const url = `${API_BASE_URL}/pantries${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
    const list = await res.json();
    console.log('Raw data length:', list.length);
    const normalized = Array.isArray(list) ? list.map(normalizePantry) : [];
    console.log('Normalized data length:', normalized.length);
    return normalized;
    } catch (error) {
      console.error('Error fetching pantries:', error);
      // Fallback to static JSON if backend is unavailable
      console.log('Falling back to static pantries.json...');
      const res = await fetch('./pantries.json', { cache: 'no-store' });
      const list = await res.json();
      return Array.isArray(list) ? list.map(normalizePantry) : [];
    }
  };

  API.getPantry = async function getPantry(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/pantries/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const pantry = await res.json();
      return normalizePantry(pantry);
    } catch (error) {
      console.error('Error fetching pantry:', error);
      throw error;
    }
  };

  API.getMessages = async function getMessages(pantryId) {
    const normalizedPantryId = normalizePantryId(pantryId);
    if (!normalizedPantryId) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/messages?pantryId=${encodeURIComponent(normalizedPantryId)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  API.postMessage = async function postMessage(pantryId, content, userName, userAvatar, photos = []) {
    const normalizedPantryId = normalizePantryId(pantryId);
    try {
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pantryId: normalizedPantryId,
          content,
          userName,
          userAvatar,
          photos,
        }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (error) {
      console.error('Error posting message:', error);
      throw error;
    }
  };

  // Donations

  API.getDonations = async function getDonations(pantryId, page = 1, pageSize = 5) {
    const normalizedPantryId = normalizePantryId(pantryId);
    try {
      const res = await fetch(`${API_BASE_URL}/donations?pantryId=${encodeURIComponent(normalizedPantryId)}&page=${page}&pageSize=${pageSize}`, { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 404) {
          return [];
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      console.warn('Donations endpoint unavailable, returning empty list.', e);
      return [];
    }
  };

  API.addWishlist = async function addWishlist(pantryId, item, quantity = 1) {
    const normalizedPantryId = normalizePantryId(pantryId);
    const trimmedItem = typeof item === 'string' ? item.trim() : String(item || '').trim();
    const parsedQuantity = Number.parseInt(quantity, 10);
    const safeQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
    if (!normalizedPantryId || !trimmedItem) throw new Error('Missing pantryId or item');

    const payload = {
      pantryId: normalizedPantryId,
      item: trimmedItem,
      quantity: safeQuantity,
    };

    const url = `${API_BASE_URL}/wishlist`;
    console.log('[Wishlist] Sending request', url, payload);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      console.log('[Wishlist] Received response', data);
      return data?.agg ?? data;
    } catch (e) {
      console.error('Error adding wishlist item:', e);
      throw e;
    }
  };

  // Telemetry latest
  API.getTelemetryLatest = async function getTelemetryLatest(pantryId) {
    const normalizedPantryId = normalizePantryId(pantryId);
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry?pantryId=${encodeURIComponent(normalizedPantryId)}&latest=true`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return data.latest || null;
    } catch (e) {
      console.error('Error fetching telemetry latest:', e);
      return null;
    }
  };

  // Telemetry history
  API.getTelemetryHistory = async function getTelemetryHistory(pantryId, from, to) {
    const normalizedPantryId = normalizePantryId(pantryId);
    try {
      let url = `${API_BASE_URL}/telemetry?pantryId=${encodeURIComponent(normalizedPantryId)}`;
      if (from) url += `&from=${encodeURIComponent(from)}`;
      if (to) url += `&to=${encodeURIComponent(to)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      console.error('Error fetching telemetry history:', e);
      return [];
    }
  };

  // Wishlist
  API.getWishlist = async function getWishlist(pantryId) {
    const normalizedPantryId = normalizePantryId(pantryId);
    if (!normalizedPantryId) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/wishlist?pantryId=${encodeURIComponent(normalizedPantryId)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error('Error fetching wishlist:', e);
      return [];
    }
  };

  // Expose globally
  window.PantryAPI = API;
})();


