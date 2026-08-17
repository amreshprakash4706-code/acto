// =============================================
// ATCONIZ – Data Layer & Global State (v4 production)
// Primary source of truth is the Node.js backend + PostgreSQL.
// Client-side arrays are caches only. No synthetic inventory is claimed as live.
// =============================================

/** @type {Array<Object>} */
let properties = [];
/** @type {Array<Object>} */
let filteredProperties = [];
/** @type {string[]} */
let favorites = [];
let currentTheme = (() => {
  try { return localStorage.getItem("atconiz_theme") || "dark"; } catch { return "dark"; }
})();
/** @type {string[]} */
let selectedForCompare = [];
let currentView = "landing";
/** @type {Record<string, Array>} */
let reviewsData = {};
/** @type {Array} */
let visitsData = [];
/** @type {Array} */
let savedCalculations = [];
let chatContext = { lastProperty: null, lastTopic: null };
let selectedTime = null;
let currentModal = null;
let _modalPreviousFocus = null;
let dataSource = "pending"; // "api" | "empty" | "error" | "pending"
let backendAvailable = false;

if (typeof window !== "undefined") {
  window.currentModal = currentModal;
  window._modalPreviousFocus = _modalPreviousFocus;
  Object.defineProperty(window, "currentModal", {
    get() { return currentModal; },
    set(v) { currentModal = v; },
    configurable: true,
  });
  Object.defineProperty(window, "_modalPreviousFocus", {
    get() { return _modalPreviousFocus; },
    set(v) { _modalPreviousFocus = v; },
    configurable: true,
  });
}

// Reference currency table (static mathematical reference — not live FX)
const currencies = {
  USD: { rate: 1, symbol: "$", name: "US Dollar" },
  EUR: { rate: 0.92, symbol: "€", name: "Euro" },
  GBP: { rate: 0.79, symbol: "£", name: "British Pound" },
  AED: { rate: 3.67, symbol: "د.إ", name: "UAE Dirham" },
  INR: { rate: 83.5, symbol: "₹", name: "Indian Rupee" },
  SGD: { rate: 1.35, symbol: "S$", name: "Singapore Dollar" },
  CHF: { rate: 0.88, symbol: "CHF", name: "Swiss Franc" },
  JPY: { rate: 149, symbol: "¥", name: "Japanese Yen" },
  AUD: { rate: 1.52, symbol: "A$", name: "Australian Dollar" },
  CAD: { rate: 1.36, symbol: "C$", name: "Canadian Dollar" },
};

// Static land reference multipliers (reference data only)
const landReference = {
  baseUsdPerSqft: {
    "United States": 450,
    "United Arab Emirates": 380,
    "United Kingdom": 920,
    India: 85,
    Singapore: 6800,
    France: 1650,
    Australia: 920,
    Canada: 780,
    Switzerland: 3200,
    "Hong Kong": 12500,
    Japan: 1450,
    Germany: 980,
    Italy: 720,
    Spain: 650,
    Brazil: 420,
    "South Africa": 310,
    China: 890,
    Russia: 280,
    Mexico: 380,
    Thailand: 520,
  },
  premiumMultipliers: {
    "United States": { "Beverly Hills": 4.2, Malibu: 3.8, Manhattan: 5.1, default: 1.0 },
    "United Arab Emirates": { Dubai: 2.8, default: 1.0 },
  },
};

/**
 * Map a backend property record into the shape expected by existing UI components.
 */
function mapApiProperty(p) {
  if (!p) return null;
  const primaryImage =
    (p.images && p.images.find((i) => i.isPrimary)) ||
    (p.images && p.images[0]) ||
    null;
  return {
    id: p.id,
    title: p.title,
    price: Number(p.price),
    currency: p.currency || "USD",
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area: p.areaSqft,
    type: p.propertyType,
    location: {
      city: p.city,
      state: p.state,
      country: p.country,
      lat: p.latitude,
      lng: p.longitude,
    },
    description: p.description || "",
    amenities: p.amenities || [],
    images: (p.images || []).map((img) => img.url),
    primaryImage: primaryImage ? primaryImage.url : null,
    rating: null,
    reviewsCount: p._count ? p._count.reviews : 0,
    agent: p.owner
      ? { id: p.owner.id, name: p.owner.name, email: p.owner.email }
      : null,
    yearBuilt: p.yearBuilt,
    status: (p.status || "ACTIVE").toLowerCase(),
    listedDate: p.publishedAt || p.createdAt,
    dataStatus: p.provenance === "SEED_DEVELOPMENT" ? "seed_development" : "backend",
    sourceType: p.provenance || "unknown",
    verificationStatus: p.verificationStatus || "unverified",
    provenance: p.provenance,
  };
}

/**
 * Load properties from the production API.
 * On failure or empty result, leave properties = [] and set truthful dataSource.
 */
async function loadPropertiesFromApi(params = {}) {
  if (typeof AtconizAPI === "undefined") {
    dataSource = "error";
    backendAvailable = false;
    properties = [];
    filteredProperties = [];
    return { ok: false, reason: "api_client_missing" };
  }
  try {
    const res = await AtconizAPI.listProperties({
      limit: 50,
      status: "ACTIVE",
      ...params,
    });
    const items = (res && res.data && res.data.items) || [];
    properties = items.map(mapApiProperty).filter(Boolean);
    filteredProperties = properties.slice();
    dataSource = properties.length ? "api" : "empty";
    backendAvailable = true;
    return { ok: true, count: properties.length };
  } catch (err) {
    console.warn("[Atconiz] Failed to load properties from API:", err.message || err);
    dataSource = "error";
    backendAvailable = false;
    properties = [];
    filteredProperties = [];
    return { ok: false, reason: err.message || "network" };
  }
}

/**
 * Legacy localStorage favorites migration helper.
 * After successful API sync, local cache can be cleared by the caller.
 */
function getLegacyLocalFavorites() {
  try {
    return JSON.parse(localStorage.getItem("atconiz_favorites") || "[]") || [];
  } catch {
    return [];
  }
}

async function syncFavoritesFromApi() {
  if (typeof AtconizAPI === "undefined" || !AtconizAPI.getAccessToken()) {
    favorites = getLegacyLocalFavorites().map(String);
    return;
  }
  try {
    const res = await AtconizAPI.listFavorites();
    const list = (res && res.data && res.data.favorites) || [];
    favorites = list.map((p) => String(p.id));
    // Optionally clear legacy after successful sync
    try {
      localStorage.removeItem("atconiz_favorites");
    } catch { /* ignore */ }
  } catch {
    favorites = getLegacyLocalFavorites().map(String);
  }
}

/**
 * Compatibility shim — old code called generateProperties().
 * Now a no-op; real data comes from loadPropertiesFromApi().
 */
function generateProperties() {
  // Intentionally empty. Sample generation removed.
  // Call loadPropertiesFromApi() during boot instead.
  filteredProperties = properties.slice();
}

// Boot-time load is triggered from js/core.js or dashboards after DOM ready.
if (typeof window !== "undefined") {
  window.loadPropertiesFromApi = loadPropertiesFromApi;
  window.syncFavoritesFromApi = syncFavoritesFromApi;
  window.mapApiProperty = mapApiProperty;
  window.dataSource = dataSource;
}

// Keep currencies / landReference on window for calculators
if (typeof window !== "undefined") {
  window.currencies = currencies;
  window.landReference = landReference;
}
