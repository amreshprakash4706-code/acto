// ============================================
// Atconiz – Pure Utility Helpers
// ============================================

function formatPrice(price, currency = "USD") {
  const curr = currencies[currency] || currencies["USD"];
  const converted = price * curr.rate;

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
  const rate = currencies[toCurrency]?.rate || 1;
  return amountUSD * rate;
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

// Single shared debounced instance (critical fix)
const _debouncedApplyFilters = debounce(() => {
  if (typeof applyFilters === "function") applyFilters();
}, 280);

function debounceSearch() {
  _debouncedApplyFilters();
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.borderLeft = type === "success"
    ? "4px solid var(--success)"
    : "4px solid var(--danger)";

  // Safe text content (no innerHTML for user-facing messages)
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
  closeBtn.style.cssText = "cursor:pointer;padding:4px 6px;opacity:0.6;background:none;border:none;color:inherit;font-size:16px;line-height:1;";
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => toast.remove();

  toast.appendChild(content);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Auto-dismiss
  const timer = setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
      toast.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      setTimeout(() => toast.remove(), 260);
    }
  }, 4800);

  // Allow manual clear of timer if needed
  toast._timer = timer;
}
