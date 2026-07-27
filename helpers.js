// ============================================
// Atconiz – Utility Helpers (Production)
// ============================================

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
 */
function formatPrice(price, currency = "USD") {
  const curr = (typeof currencies !== "undefined" && currencies[currency]) || {
    rate: 1,
    symbol: "$",
  };
  const converted = Number(price) * curr.rate;

  if (!Number.isFinite(converted)) return curr.symbol + "0";

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

function convertCurrency(amountUSD, toCurrency) {
  const rate =
    (typeof currencies !== "undefined" && currencies[toCurrency]?.rate) || 1;
  return Number(amountUSD) * rate;
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

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.borderLeft =
    type === "success"
      ? "4px solid var(--success)"
      : "4px solid var(--danger)";

  const content = document.createElement("div");
  content.style.flex = "1";

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.style.marginBottom = "2px";
  title.textContent = type === "success" ? "Success" : "Notice";

  const body = document.createElement("div");
  body.style.fontSize = "14px";
  body.style.color = "var(--text-secondary)";
  body.textContent = String(message);

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
 */
function safeGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Clamp a number into a range.
 */
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Prefer reduced motion?
 */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Coarse pointer (touch) device?
 */
function isCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}
