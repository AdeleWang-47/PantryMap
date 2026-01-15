(function() {
  'use strict';

  // Global state
  let map;
  let markers = new Map();
  let currentPantry = null;
  let allPantries = [];
  let wishlistState = {
    items: [],
    expanded: false,
    pantryId: null,
    root: null
  };
  let wishlistModal = null;
  let telemetryExpanded = false;
  const listControlsState = {
    type: 'all', // all | fridge | shelf
    stock: 'any', // any | high-low | low-high
    restock: 'newest', // newest | oldest
  };

  // Inline SVG placeholders (data URIs) for missing images
  const PLACEHOLDERS = {
    pantry: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="%23f0fdf4"/><stop offset="100%" stop-color="%23dcfce7"/></linearGradient></defs><rect width="1200" height="800" fill="url(%23g)"/><g fill="%2392ceac" opacity="0.45"><circle cx="180" cy="160" r="8"/><circle cx="300" cy="120" r="4"/><circle cx="1080" cy="180" r="6"/><circle cx="980" cy="620" r="8"/></g><g transform="translate(0,10)" fill="none" stroke="%2352b788" stroke-width="22"><circle cx="600" cy="420" r="120"/><circle cx="600" cy="420" r="38" fill="%2352b788"/></g><text x="600" y="720" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,Helvetica,Arial" font-size="36" fill="%232c3e50" opacity="0.7">Pantry photo</text></svg>',
    avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="%23eaf7f0"/><circle cx="40" cy="32" r="16" fill="%2352b788"/><path d="M12 70c6-12 20-18 28-18s22 6 28 18" fill="none" stroke="%2352b788" stroke-width="6" stroke-linecap="round"/></svg>',
    photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" rx="10" fill="%23f1f5f9"/><path d="M20 92l28-32 18 20 22-26 32 38H20z" fill="%2394a3b8"/><circle cx="52" cy="40" r="10" fill="%2394a3b8"/></svg>'
  };

  function pantryPhotoTag(url, alt, extraAttrs = '') {
    const src = url && typeof url === 'string' ? url : PLACEHOLDERS.pantry;
    const safeAlt = alt ? alt.replace(/"/g, '&quot;') : 'Pantry photo';
    return `<img data-role='pantry-photo' src='${src}' alt='${safeAlt}' ${extraAttrs}>`;
  }

  function avatarTag(url, size = 40, alt = 'User avatar') {
    const src = url && typeof url === 'string' ? url : PLACEHOLDERS.avatar;
    const style = `width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover;`;
    const safeAlt = alt.replace(/"/g, '&quot;');
    return `<img data-role='avatar' src='${src}' alt='${safeAlt}' style='${style}'>`;
  }

  function contentPhotoTag(url, size = 60, alt = '') {
    const src = url && typeof url === 'string' ? url : PLACEHOLDERS.photo;
    const style = `width: ${size}px; height: ${size}px; border-radius: 8px; object-fit: cover;`;
    const safeAlt = (alt || 'Photo').replace(/"/g, '&quot;');
    return `<img data-role='content-photo' src='${src}' alt='${safeAlt}' style='${style}'>`;
  }

  function renderStockGauge(currentItems = 0, capacity = 40) {
    const safeCurrent = Number.isFinite(currentItems) ? currentItems : 0;
    const ratio = Math.max(0, Math.min(safeCurrent / capacity, 1));
    const statusLabel = ratio >= 0.75 ? 'Full' : (ratio >= 0.4 ? 'Medium' : 'Low');
    const radius = 80;
    const circumference = Math.PI * radius;
    const dashOffset = circumference * (1 - ratio);
    return `
      <div class="detail-gauge">
        <svg viewBox="0 0 200 120" class="detail-gauge-svg" role="img" aria-label="Stock level">
          <path class="detail-gauge-track" d="M20 100 A80 80 0 0 1 180 100" />
          <path class="detail-gauge-fill" d="M20 100 A80 80 0 0 1 180 100"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${dashOffset}" />
        </svg>
        <div class="detail-gauge-center">
          <div class="detail-gauge-status">${statusLabel}</div>
          <div class="detail-gauge-count">${safeCurrent} Items</div>
        </div>
      </div>
    `;
  }

  function formatDateTimeMinutes(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return 'Unknown';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  function formatWeightDisplay(weight) {
    if (weight === null || weight === undefined || Number.isNaN(Number(weight))) return '--';
    const num = Number(weight);
    return `${num.toFixed(1)} kg`;
  }

  function formatDoorEvent(value) {
    if (!value) return '--';
    const lower = String(value).toLowerCase();
    if (lower === 'open' || lower === 'opened') return 'Opened';
    if (lower === 'closed' || lower === 'close') return 'Closed';
    return value;
  }

  function formatCondition(value) {
    if (!value) return '--';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatRelativeTimestamp(isoString) {
    if (!isoString) return 'No recent uploads';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return formatDateTimeMinutes(isoString);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return formatDateTimeMinutes(isoString);
  }

  function attachImageFallbacks(container) {
    const nodes = container.querySelectorAll('img[data-role]');
    nodes.forEach(img => {
      const role = img.getAttribute('data-role');
      const fallback = role === 'avatar' ? PLACEHOLDERS.avatar : (role === 'pantry-photo' ? PLACEHOLDERS.pantry : PLACEHOLDERS.photo);
      const ensure = () => { if (!img.getAttribute('src')) img.setAttribute('src', fallback); };
      ensure();
      img.addEventListener('error', () => { img.setAttribute('src', fallback); });
    });
  }

  // Initialize the application
  async function init() {
    console.log('Initializing Pantry Map Dashboard...');
    
    // Initialize the map
    initMap();
    
    // Load pantry data and create markers
    await loadPantries();
    // Render list for current view when no selection
    showListForCurrentView();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Dashboard initialized successfully');
  }

  // Initialize Leaflet map
  function initMap() {
    // Create map centered on Seattle area (where most pantries are)
    map = L.map('map').setView([47.6062, -122.3321], 11);
    
    // Add Google-like basemap tiles (CARTO Voyager)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);
    
    // Position zoom control similar to Google Maps (top right)
    map.zoomControl.setPosition('topright');
    
    // Optional scale control
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);
    
    console.log('Map initialized');
    // Update list as user moves/zooms the map, only if no pantry selected
    map.on('moveend', () => {
      if (!currentPantry) showListForCurrentView();
    });
  }

  // Load pantries from API and create markers
  async function loadPantries() {
    try {
      console.log('Loading pantries...');
      const pantries = await window.PantryAPI.getPantries();
      allPantries = pantries;
      console.log(`Loaded ${pantries.length} pantries`);
      
      // Create markers for each pantry
      pantries.forEach(pantry => {
        createPantryMarker(pantry);
      });
      
    } catch (error) {
      console.error('Error loading pantries:', error);
    }
  }

  function showListForCurrentView() {
    if (!map) return;
    const bounds = map.getBounds();
    let inView = allPantries.filter(p => {
      const { lat, lng } = p.location || {};
      return typeof lat === 'number' && typeof lng === 'number' && bounds.contains([lat, lng]);
    }).slice(0, 50);
    // Apply type filter
    if (listControlsState.type !== 'all') {
      inView = inView.filter(p => (p.pantryType || '').toLowerCase() === listControlsState.type);
    }
    // Compute stock level for sorting
    const withStock = inView.map(p => ({
      p,
      stock: (p.inventory && Array.isArray(p.inventory.categories)) ? p.inventory.categories.reduce((s, c) => s + (c.quantity || 0), 0) : 0,
      updated: p.sensors && p.sensors.updatedAt ? new Date(p.sensors.updatedAt).getTime() : 0,
    }));
    // Stock sorting
    if (listControlsState.stock === 'high-low') withStock.sort((a,b)=>b.stock - a.stock);
    if (listControlsState.stock === 'low-high') withStock.sort((a,b)=>a.stock - b.stock);
    // Restock sorting
    if (listControlsState.restock === 'newest') withStock.sort((a,b)=>b.updated - a.updated);
    if (listControlsState.restock === 'oldest') withStock.sort((a,b)=>a.updated - b.updated);
    inView = withStock.map(x=>x.p);

    const detailsPanel = document.getElementById('details');
    const detailsContent = document.getElementById('detailsContent');
    detailsPanel.classList.remove('hidden');
    detailsContent.innerHTML = renderPantryList(inView);
    attachImageFallbacks(detailsContent);
    updateBackButton();
  }

  function renderPantryList(items) {
    if (!items || items.length === 0) {
      return `
        <h2>Pantries in view</h2>
        <div class="empty">No pantries in the current view.</div>
      `;
    }
    return `
      <h2>Pantries in view (${items.length})</h2>
      <div class="list-controls">
        <label>
          <span>Type</span>
          <select id="listType">
            <option value="all" ${listControlsState.type==='all'?'selected':''}>All</option>
            <option value="fridge" ${listControlsState.type==='fridge'?'selected':''}>Fridge</option>
            <option value="shelf" ${listControlsState.type==='shelf'?'selected':''}>Shelf</option>
          </select>
        </label>
        <label>
          <span>Stock Level</span>
          <select id="listStock">
            <option value="any" ${listControlsState.stock==='any'?'selected':''}>Any</option>
            <option value="high-low" ${listControlsState.stock==='high-low'?'selected':''}>High → Low</option>
            <option value="low-high" ${listControlsState.stock==='low-high'?'selected':''}>Low → High</option>
          </select>
        </label>
        <label>
          <span>Last Restock</span>
          <select id="listRestock">
            <option value="newest" ${listControlsState.restock==='newest'?'selected':''}>Newest</option>
            <option value="oldest" ${listControlsState.restock==='oldest'?'selected':''}>Oldest</option>
          </select>
        </label>
      </div>
      <div class="list">
        ${items.map(p => renderListItem(p)).join('')}
      </div>
    `;
  }

  function getTotalStock(pantry) {
    return (pantry.inventory && Array.isArray(pantry.inventory.categories))
      ? pantry.inventory.categories.reduce((s, c) => s + (c.quantity || 0), 0)
      : 0;
  }

  function getStockBadge(total) {
    if (total <= 10) return { label: 'Low Stock', cls: 'low' };
    if (total <= 30) return { label: 'Medium Stock', cls: 'medium' };
    return { label: 'In Stock', cls: 'high' };
  }

  function formatRelativeDays(iso) {
    if (!iso) return 'Unknown';
    const t = new Date(iso).getTime();
    if (!t) return 'Unknown';
    const diff = Math.max(0, Date.now() - t);
    const days = Math.floor(diff / (24*60*60*1000));
    if (days === 0) return 'Restocked within 1 day';
    if (days === 1) return 'Restocked 1 day ago';
    return `Restocked ${days} days ago`;
  }

  function renderListItem(p) {
    const title = p.name || 'Untitled Pantry';
    const addrLine = (p.address || '').trim();
    const distance = '1 mi';
    const photo = (p.photos && p.photos[0]) || null;
    const total = getTotalStock(p);
    const stock = getStockBadge(total);
    const restock = formatRelativeDays(p.sensors && p.sensors.updatedAt);
    return `
      <button class="list-card list-item" data-id="${p.id}">
        <div class="thumb">${contentPhotoTag(photo, 72, title)}</div>
        <div class="list-main">
          <div class="list-row">
            <div class="list-title">${title}</div>
            <div class="list-distance">${distance}</div>
          </div>
          <div class="list-address">${addrLine}</div>
          <div class="list-meta">
            <span class="stock ${stock.cls}">${stock.label}</span>
            <span class="dot">•</span>
            <span class="restock">${restock}</span>
          </div>
        </div>
        <div class="chevron">›</div>
      </button>
    `;
  }

  // Create a marker for a pantry
  function createPantryMarker(pantry) {
    if (!pantry.location || !pantry.location.lat || !pantry.location.lng) {
      console.warn('Pantry missing location data:', pantry.id);
      return;
    }
    
    console.log(`Creating marker for ${pantry.name} at [${pantry.location.lat}, ${pantry.location.lng}]`);

    // Determine marker color based on status
    const statusColors = {
      'open': '#52b788',
      'closed': '#ef4444',
      'low-inventory': '#f59e0b'
    };
    
    const color = statusColors[pantry.status] || statusColors['open'];
    
    // Create custom icon with green marker style
    const icon = L.divIcon({
      className: 'pantry-marker',
      html: `<div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 8px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
        <div style="
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Create marker
    const marker = L.marker([pantry.location.lat, pantry.location.lng], { icon })
      .addTo(map);
    
    // Add click handler
    marker.on('click', () => {
      showPantryDetails(pantry);
    });
    
    // Store marker reference
    markers.set(pantry.id, marker);
  }

  // Show pantry details in side panel
  function showPantryDetails(pantry) {
    currentPantry = pantry;
    
    // Update details content
    const detailsContent = document.getElementById('detailsContent');
    detailsContent.innerHTML = renderPantryDetails(pantry);
    // Ensure images gracefully fallback
    attachImageFallbacks(detailsContent);
    // Initialize carousel if present
    setupCarousel(detailsContent);
    bindWishlistModule(detailsContent, pantry);
    
    // Show details panel
    const detailsPanel = document.getElementById('details');
    detailsPanel.classList.remove('hidden');
    detailsPanel.classList.remove('collapsed');
    updateBackButton();
    
    // Pan/zoom map to marker
    const marker = markers.get(pantry.id);
    if (marker) {
      const target = marker.getLatLng();
      const targetZoom = Math.max(map.getZoom(), 16);
      if (map.flyTo) {
        map.flyTo(target, targetZoom, { animate: true, duration: 0.5 });
      } else {
        map.setView(target, targetZoom);
      }
    } else if (pantry.location && typeof pantry.location.lat === 'number' && typeof pantry.location.lng === 'number') {
      const target = [pantry.location.lat, pantry.location.lng];
      const targetZoom = Math.max(map.getZoom(), 16);
      map.setView(target, targetZoom);
    }
  }

  // Render pantry details HTML
  function renderPantryDetails(pantry) {
    const photosArr = Array.isArray(pantry.photos) ? pantry.photos : [];
    const photoUrl = photosArr.length > 0 ? photosArr[0] : '';
    const secondPhotoUrl = photosArr[1] || photosArr[0] || '';
    const totalItems = pantry.inventory?.categories?.reduce((sum, cat) => sum + (cat.quantity || 0), 0) || 0;
    const contactName = pantry.contact?.owner || 'Jane';
    const contactEmail = pantry.contact?.email || pantry.contact?.emailAddress || 'abcd@gmail.com';
    const distanceText = pantry.distance || '1 mi';
    const addressText = pantry.address || '123 1st St, Bellevue, 98005';
    const description = pantry.description || pantry.summary || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
    const pantryTypeLabel = pantry.pantryType
      ? pantry.pantryType.charAt(0).toUpperCase() + pantry.pantryType.slice(1)
      : 'Pantry';
    const contactLine = contactEmail
      ? `${contactName} (<a href="mailto:${contactEmail}">${contactEmail}</a>)`
      : contactName;
    const sensors = pantry.sensors || {};
    const telemetryMarkup = `
      <section class="detail-section telemetry-section">
        <div class="section-heading-row">
          <h2>Sensor data</h2>
          ${pantry.id ? `<button class="section-link" type="button" data-telemetry-expand data-pantry-id="${encodeURIComponent(pantry.id)}">View Full History&nbsp;→</button>` : ''}
        </div>
        <div class="telemetry-grid">
          <div class="telemetry-card">
            <span class="telemetry-label">Weight</span>
            <span class="telemetry-value">${formatWeightDisplay(sensors.weightKg)}</span>
          </div>
          <div class="telemetry-card">
            <span class="telemetry-label">Last activity</span>
            <span class="telemetry-value">${formatDoorEvent(sensors.lastDoorEvent)}</span>
          </div>
          <div class="telemetry-card">
            <span class="telemetry-label">Updated</span>
            <span class="telemetry-value">${sensors.updatedAt ? formatDateTimeMinutes(sensors.updatedAt) : '--'}</span>
          </div>
          <div class="telemetry-card">
            <span class="telemetry-label">Condition</span>
            <span class="telemetry-pill">${formatCondition(sensors.foodCondition)}</span>
          </div>
        </div>
      </section>
    `;

    return `
      <div class="detail-hero">
        <div class="detail-hero-cover">
          ${pantryPhotoTag(photoUrl, pantry.name || 'Pantry photo', 'class="detail-hero-img"')}
          <span class="detail-hero-badge">${pantryTypeLabel}</span>
        </div>
        <div class="detail-hero-body">
          <h1 class="detail-title">${pantry.name || 'Untitled Pantry'}</h1>
          <div class="detail-subline">${distanceText} · ${addressText}</div>
          <p class="detail-description">${description}</p>
          <div class="detail-contact">
            <span class="detail-contact-icon">👤</span>
            <div class="detail-contact-info"><span>${contactLine}</span></div>
          </div>
        </div>
      </div>

      <section class="detail-section stock-section">
        <div class="stock-card">
          <div class="stock-card-head">
            <h2>Stock level</h2>
          </div>
          ${renderStockGauge(totalItems)}
        </div>
      </section>

      <section class="detail-section wishlist-section" data-wishlist>
        <div class="section-heading-row">
          <h2>Pantry Wishlist</h2>
          <button class="wishlist-add" type="button" aria-label="Add wishlist item" data-wishlist-add>+</button>
        </div>
        <div class="wishlist-grid" data-wishlist-grid>
          <div class="wishlist-empty">Loading wishlist…</div>
        </div>
        <button class="section-link" type="button" data-wishlist-toggle hidden>View All <span aria-hidden="true">⌄</span></button>
      </section>

      ${telemetryMarkup}

      <section class="detail-section telemetry-history-section" data-telemetry-history hidden></section>

      <section class="detail-section support-section">
        <h2>Support us</h2>
        <p>Every contribution makes a difference!</p>
        <div class="support-grid">
          <button class="support-card" type="button">Drop off at<br>the pantry</button>
          <button class="support-card" type="button">
            Ship to<br><span>${addressText}</span>
          </button>
          <button class="support-card" type="button">Amazon Wishlist</button>
        </div>
        <button class="safety-link" type="button">🟢 Safety Guideline</button>
      </section>

      <section class="detail-section message-section">
        <h2>Leave a message</h2>
        <button class="message-cta" type="button">Leave a message to the host and the community</button>
        <div class="message-list">
          <article class="message-card">
            <div class="message-avatar">${avatarTag(null, 40, 'Community member')}</div>
            <div class="message-body">
              <p>Thank you so much for running the pantry with such dedication! Your hard work makes a huge difference in our community!</p>
              <div class="message-media">
                ${contentPhotoTag(null, 60)}
                ${contentPhotoTag(null, 60)}
              </div>
              <time datetime="">1 day ago</time>
            </div>
          </article>
          <article class="message-card">
            <div class="message-avatar">${avatarTag(null, 40, 'Community member')}</div>
            <div class="message-body">
              <p>Appreciate the consistent restocks. The fresh produce has been a lifesaver for our family!</p>
              <time datetime="">2 days ago</time>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  // Set up event listeners
  function setupEventListeners() {
    // Back / close details panel
    const closeBtn = document.getElementById('closeDetails');
    closeBtn.addEventListener('click', () => {
      const detailsPanel = document.getElementById('details');
      // If currently viewing a specific pantry, go back to the list view
      if (currentPantry) {
        currentPantry = null;
        showListForCurrentView();
      } else {
        // If already on the list view, keep sidebar visible (fixed display)
        // Sidebar should always be visible, so do nothing
      }
      detailsPanel.classList.remove('collapsed');
      updateBackButton();
    });
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        filterPantriesByStatus(e.target.value);
      });
    }

    // Delegate clicks on list items to open details
    const detailsContent = document.getElementById('detailsContent');
    if (detailsContent) {
      detailsContent.addEventListener('click', (e) => {
        const expandTelemetry = e.target.closest && e.target.closest('[data-telemetry-expand]');
        if (expandTelemetry) {
          e.preventDefault();
          const pantryId = expandTelemetry.getAttribute('data-pantry-id') || (currentPantry && currentPantry.id);
          if (pantryId && currentPantry) {
            showTelemetryExpanded(currentPantry, pantryId);
          }
          return;
        }

        const collapseTelemetry = e.target.closest && e.target.closest('[data-telemetry-collapse]');
        if (collapseTelemetry) {
          e.preventDefault();
          hideTelemetryExpanded();
          return;
        }

        const target = e.target.closest('.list-item');
        if (target) {
          e.preventDefault();
          const id = target.getAttribute('data-id');
          const p = allPantries.find(x => String(x.id) === String(id));
          if (p) showPantryDetails(p);
        }
      });
      // keyboard support
      detailsContent.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('list-item')) {
          e.preventDefault();
          const id = e.target.getAttribute('data-id');
          const p = allPantries.find(x => String(x.id) === String(id));
          if (p) showPantryDetails(p);
        }
      });
    }

    // Controls change events
    detailsContent.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.id === 'listType') { listControlsState.type = t.value; showListForCurrentView(); }
      if (t && t.id === 'listStock') { listControlsState.stock = t.value; showListForCurrentView(); }
      if (t && t.id === 'listRestock') { listControlsState.restock = t.value; showListForCurrentView(); }
    });

    // Fallback global delegation (in case list re-renders before handlers attach)
    document.addEventListener('click', (e) => {
      const target = e.target && e.target.closest && e.target.closest('.list-item');
      if (target) {
        e.preventDefault();
        const id = target.getAttribute('data-id');
        const p = allPantries.find(x => String(x.id) === String(id));
        if (p) showPantryDetails(p);
      }
    });
  }

  function showTelemetryExpanded(pantry, pantryId) {
    const detailsPanel = document.getElementById('details');
    const container = document.querySelector('[data-telemetry-history]');
    if (!detailsPanel || !container) return;

    telemetryExpanded = true;
    detailsPanel.classList.add('expanded');
    container.hidden = false;
    container.innerHTML = `
      <div class="section-heading-row">
        <h2>Sensor History</h2>
        <button class="section-link" type="button" data-telemetry-collapse>Collapse ▲</button>
      </div>
      <div class="history-split">
        <div class="history-card">
          <div class="history-card-header">
            <h2>Weight Trend</h2>
            <span data-weight-range class="history-meta"></span>
          </div>
          <div class="chart-wrapper">
            <svg data-weight-chart viewBox="0 0 720 320" role="img" aria-label="Weight sensor readings over time"></svg>
          </div>
          <div data-weight-legend class="history-meta"></div>
        </div>
        <div class="history-card">
          <div class="history-card-header">
            <h2>Door Events</h2>
            <span data-door-summary class="history-meta"></span>
          </div>
          <div data-door-timeline class="door-timeline">
            <div class="history-placeholder">Loading door activity…</div>
          </div>
        </div>
      </div>
    `;

    loadTelemetryInto(container, pantryId);
  }

  function hideTelemetryExpanded() {
    telemetryExpanded = false;
    const detailsPanel = document.getElementById('details');
    const container = document.querySelector('[data-telemetry-history]');
    if (detailsPanel) detailsPanel.classList.remove('expanded');
    if (container) {
      container.hidden = true;
      container.innerHTML = '';
    }
  }

  async function loadTelemetryInto(container, pantryId) {
    try {
      const items = await window.PantryAPI.getTelemetryHistory(pantryId);
      const parsed = parseTelemetryHistory(items);
      renderWeightChartInto(container, parsed.weight);
      renderDoorTimelineInto(container, parsed.doors);
    } catch (e) {
      console.error('Error loading telemetry history:', e);
      container.innerHTML = `<div class="history-placeholder">Failed to load telemetry history.</div>`;
    }
  }

  function parseTelemetryHistory(items) {
    if (!Array.isArray(items)) return { weight: [], doors: [] };
    const weight = [];
    const doors = [];
    items.forEach((item) => {
      const ts = item.ts;
      const weightKg = Number(item.metrics?.weightKg ?? item.metrics?.weightkg ?? NaN);
      if (!Number.isNaN(weightKg)) weight.push({ ts, weightKg });
      const door = item.flags?.door;
      if (door) doors.push({ ts, status: door });
    });
    weight.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    doors.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    return { weight, doors };
  }

  function renderWeightChartInto(container, data) {
    const svg = container.querySelector('[data-weight-chart]');
    const legend = container.querySelector('[data-weight-legend]');
    const rangeLabel = container.querySelector('[data-weight-range]');
    if (!svg || !legend || !rangeLabel) return;
    if (!Array.isArray(data) || data.length === 0) {
      svg.innerHTML = '';
      legend.textContent = 'No weight data available.';
      rangeLabel.textContent = '';
      return;
    }
    const width = svg.viewBox.baseVal.width || 720;
    const height = svg.viewBox.baseVal.height || 320;
    const margin = { top: 20, right: 32, bottom: 36, left: 56 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const minWeight = Math.min(...data.map((d) => d.weightKg));
    const maxWeight = Math.max(...data.map((d) => d.weightKg));
    const scaleY = (value) => {
      if (maxWeight === minWeight) return margin.top + plotHeight / 2;
      return margin.top + (maxWeight - value) * (plotHeight / (maxWeight - minWeight));
    };
    const scaleX = (index) => {
      if (data.length === 1) return margin.left + plotWidth / 2;
      return margin.left + (index / (data.length - 1)) * plotWidth;
    };
    const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.weightKg)}`).join(' ');
    const minTs = data[0].ts;
    const maxTs = data[data.length - 1].ts;
    svg.innerHTML = `
      <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="var(--bg)" stroke="var(--border)" stroke-width="1" rx="8"></rect>
      <polyline fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${points}"></polyline>
      ${data.map((d, i) => `
        <circle cx="${scaleX(i)}" cy="${scaleY(d.weightKg)}" r="4" fill="var(--primary)" opacity="0.9">
          <title>${formatDateTimeMinutes(d.ts)} — ${d.weightKg.toFixed(2)} kg</title>
        </circle>
      `).join('')}
    `;
    legend.textContent = `Min ${minWeight.toFixed(2)} kg · Max ${maxWeight.toFixed(2)} kg`;
    rangeLabel.textContent = `${formatDateTimeMinutes(minTs)} → ${formatDateTimeMinutes(maxTs)}`;
  }

  function renderDoorTimelineInto(container, data) {
    const timeline = container.querySelector('[data-door-timeline]');
    const summary = container.querySelector('[data-door-summary]');
    if (!timeline || !summary) return;
    if (!Array.isArray(data) || data.length === 0) {
      timeline.innerHTML = '<div class="history-placeholder">No door events recorded.</div>';
      summary.textContent = '';
      return;
    }
    const totalOpen = data.filter((d) => d.status === 'open').length;
    timeline.innerHTML = `
      <ul class="door-events">
        ${data.slice(-40).reverse().map((d) => `
          <li>
            <span class="door-pill ${d.status}">${d.status}</span>
            <span class="door-ts">${formatDateTimeMinutes(d.ts)}</span>
          </li>
        `).join('')}
      </ul>
    `;
    summary.textContent = `${data.length} events · ${totalOpen} openings`;
  }

  function updateBackButton() {
    const btn = document.getElementById('closeDetails');
    if (!btn) return;
    btn.textContent = '←';
    const label = currentPantry ? 'Back to list' : 'Close sidebar';
    btn.setAttribute('aria-label', label);
  }


  // Wishlist localStorage functions
  function getWishlistStorageKey(pantryId) {
    return `wishlist_${pantryId}`;
  }

  function loadWishlistFromStorage(pantryId) {
    try {
      const key = getWishlistStorageKey(pantryId);
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      const items = JSON.parse(stored);
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.error('Error loading wishlist from storage:', error);
      return [];
    }
  }

  function saveWishlistToStorage(pantryId, items) {
    try {
      const key = getWishlistStorageKey(pantryId);
      localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving wishlist to storage:', error);
    }
  }

  function bindWishlistModule(root, pantry) {
    if (!root || !pantry || !pantry.id) return;
    const grid = root.querySelector('[data-wishlist-grid]');
    const toggleBtn = root.querySelector('[data-wishlist-toggle]');
    const addBtn = root.querySelector('[data-wishlist-add]');
    if (!grid || !addBtn) return;

    const refresh = () => {
      const items = loadWishlistFromStorage(pantry.id);
      renderWishlistItems(grid, toggleBtn, items, pantry.id);
    };

    addBtn.onclick = () => {
      const itemName = prompt('Enter item name:');
      if (itemName && itemName.trim()) {
        const items = loadWishlistFromStorage(pantry.id);
        const newItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          item: itemName.trim(),
          quantity: 1,
          createdAt: new Date().toISOString()
        };
        items.push(newItem);
        saveWishlistToStorage(pantry.id, items);
        refresh();
      }
    };

    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const expanded = toggleBtn.dataset.expanded === 'true';
        const items = loadWishlistFromStorage(pantry.id);
        renderWishlistItems(grid, toggleBtn, items, pantry.id, !expanded);
      };
    }

    refresh();
  }

  function renderWishlistItems(grid, toggleBtn, items, pantryId, expanded = false) {
    grid.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
      grid.innerHTML = `<div class="wishlist-empty">No wishlist items yet. Click + to add items.</div>`;
      if (toggleBtn) toggleBtn.hidden = true;
      return;
    }

    const subset = expanded ? items : items.slice(0, 10);
    subset.forEach(item => {
      const itemCard = document.createElement('div');
      itemCard.className = 'wishlist-item-card';
      itemCard.dataset.itemId = item.id;
      
      const qty = Number.isFinite(item.quantity) ? item.quantity : 1;
      const created = item.createdAt ? formatRelativeTimestamp(item.createdAt) : '';
      
      itemCard.innerHTML = `
        <div class="wishlist-item-content">
          <span class="wishlist-item-name" data-item-name>${escapeHtml(item.item || item.name || 'Item')}</span>
          <span class="wishlist-item-meta">Qty: ${qty}${created ? ` · ${created}` : ''}</span>
        </div>
        <div class="wishlist-item-actions">
          <button class="wishlist-item-edit" type="button" aria-label="Edit item" data-item-edit>✎</button>
          <button class="wishlist-item-delete" type="button" aria-label="Delete item" data-item-delete>×</button>
        </div>
      `;

      // Edit button
      const editBtn = itemCard.querySelector('[data-item-edit]');
      editBtn.onclick = () => {
        const currentName = item.item || item.name || '';
        const newName = prompt('Edit item name:', currentName);
        if (newName !== null && newName.trim() && newName.trim() !== currentName) {
          const allItems = loadWishlistFromStorage(pantryId);
          const itemIndex = allItems.findIndex(i => i.id === item.id);
          if (itemIndex !== -1) {
            allItems[itemIndex].item = newName.trim();
            saveWishlistToStorage(pantryId, allItems);
            renderWishlistItems(grid, toggleBtn, allItems, pantryId, expanded);
          }
        }
      };

      // Delete button
      const deleteBtn = itemCard.querySelector('[data-item-delete]');
      deleteBtn.onclick = () => {
        if (confirm(`Delete "${item.item || item.name}"?`)) {
          const allItems = loadWishlistFromStorage(pantryId);
          const filtered = allItems.filter(i => i.id !== item.id);
          saveWishlistToStorage(pantryId, filtered);
          renderWishlistItems(grid, toggleBtn, filtered, pantryId, expanded);
        }
      };

      grid.appendChild(itemCard);
    });

    if (items.length > 10 && toggleBtn) {
      toggleBtn.hidden = false;
      toggleBtn.dataset.expanded = expanded ? 'true' : 'false';
      toggleBtn.innerHTML = expanded ? 'Show Less ▲' : `View All (${items.length}) <span aria-hidden="true">⌄</span>`;
    } else if (toggleBtn) {
      toggleBtn.hidden = true;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Filter pantries by status
  function filterPantriesByStatus(status) {
    markers.forEach((marker, pantryId) => {
      // This would need to be implemented with actual pantry data
      // For now, just show all markers
      marker.setOpacity(1);
    });
  }

  // Update pantry marker (for real-time updates)
  function updatePantryMarker(pantry) {
    const marker = markers.get(pantry.id);
    if (marker) {
      // Update marker appearance if needed
      // This would be called when sensor data updates
    }
  }

  function setupCarousel(root) {
    const carousel = root.querySelector('[data-role="pantry-carousel"]');
    if (!carousel) return;
    const slides = Array.from(carousel.querySelectorAll('.slide'));
    const dots = Array.from(carousel.querySelectorAll('.dot'));
    if (slides.length <= 1) return;
    let index = 0;
    const update = () => {
      slides.forEach((s, i) => s.classList.toggle('active', i === index));
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
    };
    const prev = carousel.querySelector('.prev');
    const next = carousel.querySelector('.next');
    prev && prev.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; update(); });
    next && next.addEventListener('click', () => { index = (index + 1) % slides.length; update(); });
    dots.forEach((d, i) => d.addEventListener('click', () => { index = i; update(); }));
    update();
  }

  // Expose functions globally for external updates
  window.PantryMap = {
    updatePantryMarker,
    showPantryDetails
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

