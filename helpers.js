// ============================================
// Atconiz – Utility Helpers (Production)
// ============================================

// Ensure critical globals exist even if other scripts fail to load
if (typeof window !== "undefined") {
  if (typeof window.currentModal === "undefined") window.currentModal = null;
  if (typeof window._modalPreviousFocus === "undefined") window._modalPreviousFocus = null;
}

/**
 * Escape HTML to prevent XSS when inserting untrusted text into the DOM.
 * Always use this (or textContent) for user-generated or external content.
 */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Convert plain text to safe HTML with line breaks preserved.
 */
function textToSafeHtml(str) {
  return escapeHtml(str).replace(/\n/g, "<br>");
}

/**
 * Format a USD price (or convert via currency rate) for display.
 * Handles NaN, Infinity, and very large values safely.
 */
function formatPrice(price, currency = "USD") {
  const curr = (typeof currencies !== "undefined" && currencies[currency]) || {
    rate: 1,
    symbol: "$",
  };
  const converted = Number(price) * (Number(curr.rate) || 1);

  if (!Number.isFinite(converted) || converted < 0) return curr.symbol + "0";

  if (converted >= 1_000_000_000) {
    return curr.symbol + (converted / 1_000_000_000).toFixed(2) + "B";
  }
  if (converted >= 1_000_000) {
    return curr.symbol + (converted / 1_000_000).toFixed(1) + "M";
  }
  if (converted >= 1_000) {
    return curr.symbol + (converted / 1_000).toFixed(0) + "K";
  }
  return curr.symbol + Math.round(converted).toLocaleString("en-US");
}

/**
 * Format a full currency amount with locale separators (no abbreviation).
 */
function formatFullPrice(amount, currency = "USD") {
  const curr = (typeof currencies !== "undefined" && currencies[currency]) || {
    rate: 1,
    symbol: "$",
  };
  const converted = Number(amount) * (Number(curr.rate) || 1);
  if (!Number.isFinite(converted)) return curr.symbol + "0";
  return (
    curr.symbol +
    Math.round(converted).toLocaleString("en-US", { maximumFractionDigits: 0 })
  );
}

function convertCurrency(amountUSD, toCurrency) {
  const rate =
    (typeof currencies !== "undefined" && currencies[toCurrency]?.rate) || 1;
  const n = Number(amountUSD) * rate;
  return Number.isFinite(n) ? n : 0;
}

function debounce(func, wait = 280) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit = 100) {
  let inThrottle = false;
  let lastArgs = null;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          const a = lastArgs;
          lastArgs = null;
          func.apply(this, a);
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

// Single shared debounced filter instance
const _debouncedApplyFilters = debounce(() => {
  if (typeof applyFilters === "function") applyFilters();
}, 280);

function debounceSearch() {
  _debouncedApplyFilters();
}

/**
 * Accessible toast notifications. Uses textContent only (no innerHTML for messages).
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  // Limit concurrent toasts
  while (container.children.length >= 4) {
    container.firstElementChild?.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.borderLeft =
    type === "success"
      ? "4px solid var(--success)"
      : type === "error"
        ? "4px solid var(--danger)"
        : "4px solid var(--accent)";

  const content = document.createElement("div");
  content.style.flex = "1";
  content.style.minWidth = "0";

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.style.marginBottom = "2px";
  title.textContent =
    type === "success" ? "Success" : type === "error" ? "Notice" : "Atconiz";

  const body = document.createElement("div");
  body.style.fontSize = "14px";
  body.style.color = "var(--text-secondary)";
  body.style.wordBreak = "break-word";
  body.textContent = String(message).slice(0, 280);

  content.appendChild(title);
  content.appendChild(body);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Dismiss notification");
  closeBtn.className = "toast-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => {
    if (toast._timer) clearTimeout(toast._timer);
    toast.remove();
  };

  toast.appendChild(content);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  const timer = setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
      toast.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      setTimeout(() => toast.remove(), 260);
    }
  }, 4800);

  toast._timer = timer;
}

/**
 * Safe localStorage helpers (never throw).
 * Supports optional schema version for future migrations.
 */
const STORAGE_SCHEMA_VERSION = 1;

function safeGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    // Backward compatible: unwrap versioned envelope if present
    if (parsed && typeof parsed === "object" && parsed.__v != null && "data" in parsed) {
      return parsed.data;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function safeSetJSON(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        __v: STORAGE_SCHEMA_VERSION,
        data: value,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* quota / private mode — silently ignore */
  }
}

/**
 * Clamp a number into a range.
 */
function clamp(n, min, max) {
  const num = Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

/**
 * Prefer reduced motion?
 */
function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Coarse pointer (touch) device?
 */
function isCoarsePointer() {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/**
 * Attach a graceful image fallback when src fails to load.
 */
function attachImageFallback(img, fallbackText) {
  if (!img || img.dataset.fallbackBound) return;
  img.dataset.fallbackBound = "1";
  img.addEventListener(
    "error",
    () => {
      img.style.objectFit = "cover";
      img.style.background =
        "linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))";
      img.alt = fallbackText || "Image unavailable";
      img.removeAttribute("src");
      img.style.minHeight = "120px";
    },
    { once: true }
  );
}

/**
 * Safe numeric parse with fallback.
 */
function toNumber(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Query helper that never throws.
 */
function $(selector, root = document) {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function $$(selector, root = document) {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

// Expose helpers on window for cross-script access (classic scripts)
if (typeof window !== "undefined") {
  window.escapeHtml = escapeHtml;
  window.textToSafeHtml = textToSafeHtml;
  window.formatPrice = formatPrice;
  window.formatFullPrice = formatFullPrice;
  window.convertCurrency = convertCurrency;
  window.debounce = debounce;
  window.throttle = throttle;
  window.debounceSearch = debounceSearch;
  window.showToast = showToast;
  window.safeGetJSON = safeGetJSON;
  window.safeSetJSON = safeSetJSON;
  window.clamp = clamp;
  window.prefersReducedMotion = prefersReducedMotion;
  window.isCoarsePointer = isCoarsePointer;
  window.attachImageFallback = attachImageFallback;
  window.toNumber = toNumber;
  window.$ = $;
  window.$$ = $$;
}
