/* ==========================================================================
   ATCONIZ – Core: Nav, Theme, Views, Modals
   ========================================================================== */

function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const btn = document.getElementById("mobile-menu-btn");
  if (!menu || !btn) return;
  const isOpen = menu.style.display === "flex";
  if (isOpen) {
    menu.style.display = "none";
    btn.innerHTML = "☰";
    btn.style.transform = "rotate(0deg)";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open menu");
  } else {
    menu.style.display = "flex";
    btn.innerHTML = "✕";
    btn.style.transform = "rotate(90deg)";
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-label", "Close menu");
  }
}

function updateNavIndicator(activeLink) {
  const indicator = document.getElementById("nav-indicator");
  const nav = document.getElementById("desktop-nav");
  if (!indicator || !nav || !activeLink) return;
  document.querySelectorAll("#desktop-nav .nav-link").forEach((l) => l.classList.remove("active"));
  activeLink.classList.add("active");
  const navRect = nav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  indicator.style.left = `${linkRect.left - navRect.left + 8}px`;
  indicator.style.width = `${linkRect.width - 16}px`;
  indicator.style.opacity = "1";
}

function initNavIndicator() {
  setTimeout(() => {
    const active = document.querySelector("#desktop-nav .nav-link.active");
    if (active) updateNavIndicator(active);
    window.addEventListener("resize", () => {
      const current = document.querySelector("#desktop-nav .nav-link.active");
      if (current) updateNavIndicator(current);
    });
  }, 400);
}

function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.classList.toggle("light", currentTheme === "light");
  localStorage.setItem("atconiz_theme", currentTheme);
  const toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.innerHTML = currentTheme === "dark" ? "☀︎" : "☾";
  const analytics = document.getElementById("dashboard-analytics");
  if (analytics && analytics.style.display !== "none") {
    setTimeout(renderAnalyticsCharts, 300);
  }
}

function initTheme() {
  document.documentElement.classList.toggle("light", currentTheme === "light");
  const toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.innerHTML = currentTheme === "dark" ? "☀︎" : "☾";
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById("view-" + view);
  if (target) target.classList.add("active");
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-view") === view);
  });
  const desktopActive = document.querySelector(`#desktop-nav .nav-link[data-view="${view}"]`);
  if (desktopActive) updateNavIndicator(desktopActive);
  currentView = view;
  if (view === "explore") renderPropertyGrid();
  if (view === "dashboards") switchDashboardTab("user");
  if (view === "resources") {
    const grid = document.getElementById("testimonials-grid");
    if (grid && !grid.hasChildNodes()) {
      renderTestimonials();
      renderBlog();
      renderFAQ();
    }
  }
  const menu = document.getElementById("mobile-menu");
  if (menu && menu.style.display === "flex") toggleMobileMenu();
  // Prefer reduced-motion when available (always go through window to avoid ReferenceError)
  const reduced =
    (typeof window.prefersReducedMotion === "function" && window.prefersReducedMotion()) ||
    (typeof prefersReducedMotion === "function" && prefersReducedMotion()) ||
    false;
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
}

/* Modal system — always use window.currentModal so classic scripts never hit ReferenceError */
function createModal(title, contentHTML, options = {}) {
  if (window.currentModal) closeCurrentModal(true);
  window._modalPreviousFocus = document.activeElement;
  const modal = document.createElement("div");
  modal.className = "modal active";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", title);
  const maxW = options.maxWidth || "920px";
  const safeTitle =
    typeof escapeHtml === "function"
      ? escapeHtml(title)
      : String(title || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
  modal.innerHTML = `
    <div class="modal-content glass" style="max-width:${maxW};width:100%;margin:20px;" role="document">
      <div class="modal-header">
        <h2 class="modal-title">${safeTitle}</h2>
        <button type="button" class="modal-close" onclick="closeCurrentModal()" aria-label="Close dialog">×</button>
      </div>
      <div style="padding:10px 8px 0;">${contentHTML}</div>
    </div>`;
  document.body.appendChild(modal);
  window.currentModal = modal;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    const focusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  });
  modal.onclick = (e) => {
    if (e.target === modal) closeCurrentModal();
  };
  modal._keydownHandler = function (evt) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeCurrentModal();
      return;
    }
    if (evt.key !== "Tab") return;
    const focusables = Array.from(
      modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (evt.shiftKey) {
      if (document.activeElement === first) {
        evt.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      evt.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", modal._keydownHandler);
  return modal;
}

function closeCurrentModal(immediate = false) {
  if (!window.currentModal) return;
  const modal = window.currentModal;
  if (modal._keydownHandler) document.removeEventListener("keydown", modal._keydownHandler);
  modal.classList.remove("active");
  document.body.style.overflow = "";
  const cleanup = () => {
    if (modal.parentNode) modal.parentNode.removeChild(modal);
    if (window.currentModal === modal) window.currentModal = null;
    const prev = window._modalPreviousFocus;
    if (prev && typeof prev.focus === "function") {
      try {
        prev.focus();
      } catch (_) {}
    }
    window._modalPreviousFocus = null;
  };
  if (immediate) cleanup();
  else setTimeout(cleanup, 180);
}
