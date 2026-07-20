// Utility Functions
function formatPrice(price, currency = "USD") {
  const curr = currencies[currency] || currencies["USD"];
  const converted = price * curr.rate;
  
  if (converted >= 1000000) {
    return curr.symbol + (converted / 1000000).toFixed(1) + 'M';
  } else if (converted >= 1000) {
    return curr.symbol + (converted / 1000).toFixed(0) + 'K';
  }
  return curr.symbol + converted.toFixed(0);
}

function convertCurrency(amountUSD, toCurrency) {
  const rate = currencies[toCurrency]?.rate || 1;
  return amountUSD * rate;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function debounceSearch() {
  const debounced = debounce(() => applyFilters(), 280);
  debounced();
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeft = type === 'success' ? '4px solid #10b981' : '4px solid #ef4444';
  
  toast.innerHTML = `
    <div style="flex:1;">
      <div style="font-weight:600; margin-bottom:2px;">${type === 'success' ? 'Success' : 'Notice'}</div>
      <div style="font-size:14px; color:var(--text-secondary);">${message}</div>
    </div>
    <div onclick="this.parentElement.remove()" style="cursor:pointer; padding:4px; opacity:0.6;">✕</div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 5200);
}

