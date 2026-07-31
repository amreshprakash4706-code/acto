/* ==========================================================================
   ATCONIZ – Property Cards, Filters, Favorites, Compare
   ========================================================================== */

// Local safety wrappers (in case helpers.js did not load or globals are shadowed)
function _esc(str) {
  if (typeof escapeHtml === "function") return escapeHtml(str);
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function _reducedMotion() {
  if (typeof prefersReducedMotion === "function") return prefersReducedMotion();
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function _coarsePointer() {
  if (typeof isCoarsePointer === "function") return isCoarsePointer();
  return window.matchMedia("(pointer: coarse)").matches;
}


function createPropertyCard(prop, options = {}) {
  const card = document.createElement("div");
  card.className = "property-card";
  card.setAttribute("role", "article");
  card.setAttribute("aria-label", prop.title);
  card.tabIndex = 0;

  const isFavorited = favorites.includes(prop.id);
  const showCompare = options.showCompare !== false;
  const imgSrc = _esc(prop.images[0] || "");
  const title = _esc(prop.title);
  const city = _esc(prop.location.city);
  const country = _esc(prop.location.country);
  const type = _esc(prop.type);
  const status = _esc(prop.status);

  card.innerHTML = `
    <div class="image-container">
      <img loading="lazy" decoding="async" src="${imgSrc}" alt="${title}" width="640" height="400">
      <div class="card-overlay">
        <button type="button" class="heart-btn ${isFavorited ? "active" : ""}"
          aria-label="${isFavorited ? "Remove from saved" : "Save property"}"
          aria-pressed="${isFavorited}" data-id="${prop.id}">♥</button>
        ${showCompare ? `<label class="compare-checkbox" aria-label="Compare property">
          <input type="checkbox" data-id="${prop.id}" style="display:none;" ${selectedForCompare.includes(prop.id) ? "checked" : ""}>
          <span style="font-size:15px;" aria-hidden="true">⚖︎</span></label>` : ""}
      </div>
      <div class="card-status">${status}</div>
    </div>
    <div class="card-body">
      <div class="card-price-row">
        <div>
          <div class="card-price">${formatPrice(prop.price)}</div>
          <div class="card-location">${city}, ${country}</div>
        </div>
        <div>
          <div class="card-rating">★ ${prop.rating}</div>
          <div class="card-reviews">${prop.reviewsCount} reviews</div>
        </div>
      </div>
      <div class="card-title">${title}</div>
      <div class="card-meta">
        <div>${prop.bedrooms} beds</div>
        <div>${prop.bathrooms} baths</div>
        <div>${prop.area.toLocaleString()} sqft</div>
      </div>
      <div class="card-footer">
        <div class="card-type-pill">${type}</div>
        <div style="color:var(--text-secondary);">${new Date(prop.listedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>
      </div>
    </div>`;

  const heart = card.querySelector(".heart-btn");
  if (heart) {
    heart.addEventListener("click", (e) => {
      e.stopImmediatePropagation();
      toggleFavorite(prop.id, heart);
    });
  }
  const cmp = card.querySelector(".compare-checkbox input");
  if (cmp) {
    cmp.addEventListener("change", (e) => {
      e.stopImmediatePropagation();
      toggleCompare(prop.id, cmp);
    });
    card.querySelector(".compare-checkbox")?.addEventListener("click", (e) => e.stopImmediatePropagation());
  }
  card.addEventListener("click", () => showPropertyDetails(prop.id));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showPropertyDetails(prop.id); }
  });
  attachPremiumCardEffects(card);
  return card;
}

function attachPremiumCardEffects(card) {
  if (_reducedMotion() || _coarsePointer()) return;
  let raf = null;
  card.addEventListener("mousemove", (e) => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transition = "transform 0.08s ease-out";
      card.style.transform = `perspective(1100px) rotateX(${-y * 7}deg) rotateY(${x * 8}deg) translateY(-10px) scale(1.015)`;
      card.style.boxShadow = "0 40px 80px -20px rgb(0 0 0 / 0.5)";
    });
  }, { passive: true });
  card.addEventListener("mouseleave", () => {
    if (raf) cancelAnimationFrame(raf);
    card.style.transition = "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease";
    card.style.transform = "perspective(1100px) rotateX(0) rotateY(0) translateY(0) scale(1)";
    card.style.boxShadow = "var(--shadow)";
  });
}

function renderPropertyGrid(propsToRender = filteredProperties) {
  const container = document.getElementById("property-grid");
  if (!container) return;
  container.innerHTML = "";
  if (!propsToRender.length) {
    container.innerHTML = '<div class="empty-state">No properties match your criteria. Try broadening your filters.</div>';
    const countEl = document.getElementById("results-count");
    if (countEl) countEl.textContent = "0";
    return;
  }
  const frag = document.createDocumentFragment();
  propsToRender.forEach((prop) => frag.appendChild(createPropertyCard(prop)));
  container.appendChild(frag);
  const countEl = document.getElementById("results-count");
  if (countEl) countEl.textContent = String(propsToRender.length);
}

function applyFilters() {
  const searchTerm = document.getElementById("search-input")?.value.toLowerCase().trim() || "";
  const sortMode = document.getElementById("sort-select")?.value || "newest";
  let result = properties.filter((prop) => {
    if (!searchTerm) return true;
    return (
      prop.title.toLowerCase().includes(searchTerm) ||
      prop.location.city.toLowerCase().includes(searchTerm) ||
      prop.location.country.toLowerCase().includes(searchTerm) ||
      prop.description.toLowerCase().includes(searchTerm) ||
      prop.type.toLowerCase().includes(searchTerm)
    );
  });
  const activeChips = document.querySelectorAll("#quick-filters .filter-chip.active");
  if (activeChips.length > 0) {
    const activeTypes = Array.from(activeChips).map((c) => c.dataset.type);
    result = result.filter((p) => activeTypes.includes(p.type));
  }
  if (sortMode === "price-low") result.sort((a, b) => a.price - b.price);
  else if (sortMode === "price-high") result.sort((a, b) => b.price - a.price);
  else if (sortMode === "rating") result.sort((a, b) => b.rating - a.rating);
  else result.sort((a, b) => new Date(b.listedDate) - new Date(a.listedDate));
  filteredProperties = result;
  renderPropertyGrid(filteredProperties);
}

function resetFilters() {
  const search = document.getElementById("search-input");
  const sort = document.getElementById("sort-select");
  if (search) search.value = "";
  if (sort) sort.value = "newest";
  document.querySelectorAll("#quick-filters .filter-chip").forEach((c) => c.classList.remove("active"));
  filteredProperties = properties.slice();
  renderPropertyGrid();
  const activeEl = document.getElementById("active-filters");
  if (activeEl) activeEl.innerHTML = "";
}

function showAdvancedFiltersModal() {
  const types = ["Luxury Villa", "Modern Penthouse", "Mountain Retreat", "Historic Mansion", "Urban Loft"];
  const typeChips = types.map((t) =>
    `<button type="button" class="filter-chip" data-type="${_esc(t)}" onclick="this.classList.toggle('active')">${_esc(t)}</button>`
  ).join("");
  const modal = createModal("Advanced Filters", `
    <div style="padding:12px 8px 30px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div>
          <label for="filter-price-min">Price Range</label>
          <div style="display:flex;gap:12px;align-items:center;">
            <input type="number" id="filter-price-min" placeholder="Min" value="2000000" min="0" aria-label="Minimum price">
            <span style="color:var(--text-secondary);">—</span>
            <input type="number" id="filter-price-max" placeholder="Max" value="45000000" min="0" aria-label="Maximum price">
          </div>
        </div>
        <div>
          <label>Bedrooms</label>
          <div style="display:flex;gap:12px;">
            <select id="filter-beds-min" aria-label="Minimum bedrooms" style="flex:1;"><option value="">Any</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option><option value="6">6+</option></select>
            <select id="filter-beds-max" aria-label="Maximum bedrooms" style="flex:1;"><option value="">Any</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8+</option></select>
          </div>
        </div>
        <div>
          <label for="filter-baths">Bathrooms</label>
          <select id="filter-baths"><option value="">Any</option><option value="3">3+</option><option value="4">4+</option><option value="5">5+</option><option value="6">6+</option><option value="7">7+</option></select>
        </div>
        <div>
          <label>Property Type</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;" id="filter-types">${typeChips}</div>
        </div>
      </div>
      <div style="margin-top:28px;display:flex;gap:14px;justify-content:flex-end;">
        <button type="button" onclick="closeCurrentModal()" class="btn btn-secondary">Cancel</button>
        <button type="button" onclick="applyAdvancedFilters()" class="btn btn-primary">Apply Filters</button>
      </div>
    </div>`);
  if (modal) modal.querySelector(".modal-content").style.maxWidth = "780px";
}

function applyAdvancedFilters() {
  const minPrice = parseInt(document.getElementById("filter-price-min")?.value, 10) || 0;
  const maxPrice = parseInt(document.getElementById("filter-price-max")?.value, 10) || Infinity;
  const minBeds = parseInt(document.getElementById("filter-beds-min")?.value, 10) || 0;
  const maxBeds = parseInt(document.getElementById("filter-beds-max")?.value, 10) || 99;
  const minBaths = parseInt(document.getElementById("filter-baths")?.value, 10) || 0;
  const typeChips = document.querySelectorAll("#filter-types .filter-chip.active");
  const selectedTypes = Array.from(typeChips).map((el) => el.dataset.type);
  filteredProperties = properties.filter((p) => {
    return p.price >= minPrice && p.price <= maxPrice &&
      p.bedrooms >= minBeds && p.bedrooms <= maxBeds &&
      p.bathrooms >= minBaths &&
      (selectedTypes.length === 0 || selectedTypes.includes(p.type));
  });
  closeCurrentModal();
  renderPropertyGrid(filteredProperties);
  const activeEl = document.getElementById("active-filters");
  if (activeEl) {
    activeEl.innerHTML = `Filters active • <button type="button" onclick="resetFilters()" style="cursor:pointer;text-decoration:underline;background:none;border:none;color:var(--accent);font:inherit;">Clear</button>`;
  }
}

function toggleFavorite(id, btn) {
  if (favorites.includes(id)) {
    favorites = favorites.filter((f) => f !== id);
    if (btn) { btn.classList.remove("active"); btn.setAttribute("aria-pressed", "false"); btn.setAttribute("aria-label", "Save property"); }
  } else {
    favorites.push(id);
    if (btn) { btn.classList.add("active"); btn.setAttribute("aria-pressed", "true"); btn.setAttribute("aria-label", "Remove from saved"); }
  }
  localStorage.setItem("atconiz_favorites", JSON.stringify(favorites));
  updateFavoritesCount();
}

function updateFavoritesCount() {
  const countEl = document.getElementById("favorites-count");
  if (countEl) countEl.textContent = String(favorites.length);
  const userSaved = document.getElementById("user-saved-count");
  if (userSaved) userSaved.textContent = String(favorites.length || 24);
}

function showFavoritesModal() {
  const favProps = properties.filter((p) => favorites.includes(p.id));
  const modal = createModal("Your Saved Properties", `
    <div style="padding:10px 8px 30px;">
      ${favProps.length === 0
        ? `<div class="empty-state">You haven't saved any properties yet.<br>Start exploring and tap the ♥ icon.</div>`
        : `<div class="property-grid" style="max-height:62vh;overflow-y:auto;padding-right:8px;"></div>`}
    </div>`);
  if (favProps.length > 0 && modal) {
    const grid = modal.querySelector(".property-grid");
    favProps.forEach((prop) => grid.appendChild(createPropertyCard(prop, { showCompare: false })));
  }
}

function toggleCompare(id, checkbox) {
  if (checkbox.checked) {
    if (selectedForCompare.length >= 3) {
      checkbox.checked = false;
      showToast("You can compare up to 3 properties at once.", "error");
      return;
    }
    selectedForCompare.push(id);
  } else {
    selectedForCompare = selectedForCompare.filter((i) => i !== id);
  }
  updateCompareBar();
}

function updateCompareBar() {
  let bar = document.getElementById("compare-bar");
  if (!bar && selectedForCompare.length >= 2) {
    bar = document.createElement("div");
    bar.id = "compare-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Property comparison");
    document.body.appendChild(bar);
  }
  if (bar) {
    if (selectedForCompare.length < 2) { bar.remove(); return; }
    bar.innerHTML = `
      <div style="font-weight:600;">${selectedForCompare.length} properties selected</div>
      <button type="button" onclick="showCompareModal()" class="btn btn-primary" style="padding:9px 26px;font-size:14px;">Compare Now</button>
      <button type="button" onclick="clearCompareSelection()" class="btn btn-secondary" style="padding:9px 18px;font-size:14px;">Clear</button>`;
  }
}

function clearCompareSelection() {
  selectedForCompare = [];
  document.querySelectorAll('#property-grid input[type="checkbox"]').forEach((cb) => (cb.checked = false));
  document.getElementById("compare-bar")?.remove();
}

function showCompareModal() {
  const props = properties.filter((p) => selectedForCompare.includes(p.id));
  if (props.length < 2) return;
  let html = `<div style="padding:20px 10px 40px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:820px;"><thead><tr><th scope="col" style="text-align:left;padding:16px 12px;border-bottom:1px solid var(--glass-border);width:160px;"></th>`;
  props.forEach((p) => {
    html += `<th scope="col" style="padding:16px 12px;border-bottom:1px solid var(--glass-border);text-align:left;min-width:240px;">
      <div style="font-weight:700;">${_esc(p.title)}</div>
      <div style="color:var(--accent);font-size:19px;font-weight:700;margin:6px 0;">${formatPrice(p.price)}</div></th>`;
  });
  html += `</tr></thead><tbody>`;
  const rows = [
    { label: "Location", get: (p) => `${p.location.city}, ${p.location.country}` },
    { label: "Type", get: (p) => p.type },
    { label: "Bedrooms", get: (p) => p.bedrooms },
    { label: "Bathrooms", get: (p) => p.bathrooms },
    { label: "Living Area", get: (p) => p.area.toLocaleString() + " sqft" },
    { label: "Year Built", get: (p) => p.yearBuilt },
    { label: "Rating", get: (p) => `★ ${p.rating} (${p.reviewsCount})` },
    { label: "Listed", get: (p) => new Date(p.listedDate).toLocaleDateString() },
    { label: "Status", get: (p) => p.status },
  ];
  rows.forEach((row) => {
    html += `<tr><th scope="row" style="padding:14px 12px;font-weight:600;color:var(--text-secondary);border-bottom:1px solid var(--glass-border);text-align:left;">${_esc(row.label)}</th>`;
    props.forEach((p) => { html += `<td style="padding:14px 12px;border-bottom:1px solid var(--glass-border);">${_esc(String(row.get(p)))}</td>`; });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  const modal = createModal("Property Comparison", html);
  if (modal) modal.querySelector(".modal-content").style.maxWidth = "1100px";
}

function addToCompareFromModal(id) {
  if (!selectedForCompare.includes(id)) {
    if (selectedForCompare.length >= 3) { showToast("You can compare up to 3 properties at once.", "error"); return; }
    selectedForCompare.push(id);
  }
  closeCurrentModal();
  updateCompareBar();
  showToast("Added to comparison queue.");
}
