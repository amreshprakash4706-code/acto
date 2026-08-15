/* ==========================================================================
   ATCONIZ – Dashboards, Content, Account, Boot
   ========================================================================== */

function switchDashboardTab(tab) {
  document.querySelectorAll(".dashboard-panel").forEach((p) => (p.style.display = "none"));
  const panel = document.getElementById("dashboard-" + tab);
  if (panel) panel.style.display = "block";
  document.querySelectorAll(".dashboard-tab").forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  const tabEl = document.getElementById("tab-" + tab);
  if (tabEl) { tabEl.classList.add("active"); tabEl.setAttribute("aria-selected", "true"); }
  if (tab === "user") {
    updateUserDashboardStats();
    renderRecommendedProperties();
  }
  if (tab === "agent") renderAgentDashboard();
  if (tab === "admin") renderAdminDashboard();
  if (tab === "analytics") renderAnalyticsCharts();
}

function updateUserDashboardStats() {
  const savedEl = document.getElementById("user-saved-count");
  const viewingsEl = document.getElementById("user-viewings");
  const catalogEl = document.getElementById("user-catalog-count");
  if (savedEl) savedEl.textContent = String(Array.isArray(favorites) ? favorites.length : 0);
  if (viewingsEl) viewingsEl.textContent = String(Array.isArray(visitsData) ? visitsData.length : 0);
  if (catalogEl) catalogEl.textContent = String(Array.isArray(properties) ? properties.length : 0);
}

function renderRecommendedProperties() {
  const container = document.getElementById("recommended-grid");
  if (!container) return;
  container.innerHTML = "";
  // Sample recommendations from local catalog only
  const recs = properties.slice().sort((a, b) => b.rating - a.rating).slice(0, 6);
  const frag = document.createDocumentFragment();
  recs.forEach((prop) => frag.appendChild(createPropertyCard(prop)));
  container.appendChild(frag);
}

function renderAgentDashboard() {
  const container = document.getElementById("agent-listings-table");
  if (!container) return;
  // Demo agent view: first 8 sample listings (local catalog only)
  const myListings = properties.slice(0, 8);
  let html = `<div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary);">Sample catalog view — local seed data only. No live agent backend.</div>`;
  html += `<div style="display:grid;gap:1px;background:var(--glass-border);border-radius:12px;overflow:hidden;">`;
  html += `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;padding:14px 20px;background:var(--bg-secondary);font-size:13px;font-weight:600;color:var(--text-secondary);"><div>PROPERTY</div><div>PRICE</div><div>STATUS</div><div>ACTIONS</div></div>`;
  myListings.forEach((prop) => {
    html += `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;padding:16px 20px;background:var(--bg-secondary);align-items:center;font-size:14.5px;border-top:1px solid var(--glass-border);">
      <div style="font-weight:600;">${escapeHtml(prop.title)}</div>
      <div style="font-weight:700;">${formatPrice(prop.price)}</div>
      <div><span style="padding:2px 9px;border-radius:9999px;font-size:12px;background:rgba(16,185,129,0.15);color:#10b981;">${escapeHtml(prop.status)}</span></div>
      <div><button type="button" onclick="showPropertyDetails(${prop.id})" class="btn btn-secondary" style="padding:6px 14px;font-size:12px;">View</button></div>
    </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
  setTimeout(() => {
    const canvas = document.getElementById("agent-performance-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Derive simple distribution from sample listing prices (local data only)
    const prices = myListings.map((p) => p.price);
    const maxP = Math.max(...prices, 1);
    ctx.fillStyle = "#1e2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#22d3ee";
    prices.forEach((val, i) => {
      const x = 38 + i * 52;
      const h = (val / maxP) * 160;
      ctx.fillRect(x, canvas.height - 40 - h, 38, h);
    });
    ctx.fillStyle = "#64748b";
    ctx.font = "11px system-ui";
    ctx.fillText("Sample listing prices (local)", 38, canvas.height - 12);
  }, 200);
}

function renderAdminDashboard() {
  const forSale = properties.filter((p) => p.status === "For Sale").length;
  const underContract = properties.length - forSale;
  const cities = new Set(properties.map((p) => p.location?.city).filter(Boolean)).size;
  const avgPrice =
    properties.length > 0
      ? Math.round(properties.reduce((s, p) => s + p.price, 0) / properties.length)
      : 0;

  const statsContainer = document.getElementById("admin-stats");
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="glass" style="padding:24px;border-radius:18px;"><div style="font-size:13px;">SAMPLE LISTINGS</div><div style="font-size:34px;font-weight:700;">${properties.length}</div></div>
      <div class="glass" style="padding:24px;border-radius:18px;"><div style="font-size:13px;">FOR SALE</div><div style="font-size:34px;font-weight:700;">${forSale}</div></div>
      <div class="glass" style="padding:24px;border-radius:18px;"><div style="font-size:13px;">UNDER CONTRACT</div><div style="font-size:34px;font-weight:700;">${underContract}</div></div>
      <div class="glass" style="padding:24px;border-radius:18px;"><div style="font-size:13px;">CITIES (SAMPLE)</div><div style="font-size:34px;font-weight:700;">${cities}</div></div>`;
  }
  const tableContainer = document.getElementById("admin-properties-table");
  if (!tableContainer) return;
  let html = `<div style="margin-bottom:10px;font-size:13px;color:var(--text-secondary);">Local seed catalog only. Avg. sample price: ${formatPrice(avgPrice)}. No live admin backend connected.</div>`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="color:var(--text-secondary);"><th scope="col" style="text-align:left;padding:12px 16px;">Property</th><th scope="col" style="padding:12px 16px;">Price</th><th scope="col" style="padding:12px 16px;">Location</th><th scope="col" style="padding:12px 16px;">Status</th><th scope="col"></th></tr></thead><tbody>`;
  properties.slice(0, 12).forEach((prop) => {
    const isSale = prop.status === "For Sale";
    html += `<tr style="border-top:1px solid var(--glass-border);">
      <td style="padding:14px 16px;font-weight:600;">${escapeHtml(prop.title)}</td>
      <td style="padding:14px 16px;font-weight:700;">${formatPrice(prop.price)}</td>
      <td style="padding:14px 16px;">${escapeHtml(prop.location.city)}</td>
      <td style="padding:14px 16px;"><span style="font-size:12px;padding:2px 10px;border-radius:9999px;background:${isSale ? "rgba(16,185,129,0.15)" : "rgba(234,179,8,0.15)"};color:${isSale ? "#10b981" : "#eab308"};">${escapeHtml(prop.status)}</span></td>
      <td style="padding:14px 16px;text-align:right;"><button type="button" onclick="showPropertyDetails(${prop.id})" class="btn btn-secondary" style="padding:5px 13px;font-size:12px;">View</button></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  tableContainer.innerHTML = html;
}

function renderAnalyticsCharts() {
  // All charts derived from the local seed catalog — no fabricated trends
  const priceCanvas = document.getElementById("analytics-price-chart");
  if (priceCanvas && properties.length) {
    const ctx = priceCanvas.getContext("2d");
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, priceCanvas.width, priceCanvas.height);
    const labels = ["<$5M", "$5-10M", "$10-20M", "$20-35M", "$35-50M", "$50M+"];
    const buckets = [0, 0, 0, 0, 0, 0];
    properties.forEach((p) => {
      const pr = p.price;
      if (pr < 5e6) buckets[0]++;
      else if (pr < 10e6) buckets[1]++;
      else if (pr < 20e6) buckets[2]++;
      else if (pr < 35e6) buckets[3]++;
      else if (pr < 50e6) buckets[4]++;
      else buckets[5]++;
    });
    const max = Math.max(...buckets, 1);
    buckets.forEach((count, i) => {
      const x = 55 + i * 78;
      const h = (count / max) * 190;
      ctx.fillStyle = i % 2 === 0 ? "#22d3ee" : "#67e8f9";
      ctx.fillRect(x, priceCanvas.height - 45 - h, 58, h);
      ctx.fillStyle = "#64748b";
      ctx.font = "11px system-ui";
      ctx.fillText(labels[i], x - 2, priceCanvas.height - 22);
    });
  }
  const typeCanvas = document.getElementById("analytics-type-chart");
  if (typeCanvas && properties.length) {
    const ctx = typeCanvas.getContext("2d");
    ctx.clearRect(0, 0, typeCanvas.width, typeCanvas.height);
    const typeCounts = {};
    properties.forEach((p) => {
      const t = p.type || "Other";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const entries = Object.entries(typeCounts);
    const total = properties.length;
    const colors = ["#22d3ee", "#fbbf24", "#10b981", "#a78bfa", "#f472b6", "#94a3b8"];
    let start = 0;
    const cx = 145,
      cy = 135,
      r = 95;
    entries.forEach(([_, count], i) => {
      const angle = (count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      start += angle;
    });
  }
  const trendCanvas = document.getElementById("analytics-trend-chart");
  if (trendCanvas && properties.length) {
    const ctx = trendCanvas.getContext("2d");
    ctx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);
    // Sort sample by listedDate and plot cumulative count (catalog growth illustration)
    const sorted = properties
      .slice()
      .sort((a, b) => new Date(a.listedDate) - new Date(b.listedDate));
    const points = [];
    const step = Math.max(1, Math.floor(sorted.length / 12));
    for (let i = step - 1; i < sorted.length; i += step) {
      points.push(i + 1);
    }
    if (points[points.length - 1] !== sorted.length) points.push(sorted.length);
    if (points.length < 2) {
      ctx.fillStyle = "#64748b";
      ctx.font = "13px system-ui";
      ctx.fillText("Insufficient sample data", 50, trendCanvas.height / 2);
      return;
    }
    const minP = points[0];
    const maxP = points[points.length - 1];
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(34,211,238,0.35)";
    ctx.beginPath();
    points.forEach((val, i) => {
      const x = 50 + (i / (points.length - 1)) * (trendCanvas.width - 90);
      const y =
        trendCanvas.height -
        50 -
        ((val - minP) / Math.max(1, maxP - minP)) * (trendCanvas.height - 80);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = "11px system-ui";
    ctx.fillText("Sample catalog by list date (local)", 50, trendCanvas.height - 18);
  }
}

function renderFeaturedProperties() {
  const container = document.getElementById("featured-grid");
  if (!container) return;
  const featured = properties.slice().sort((a, b) => b.rating - a.rating).slice(0, 6);
  const frag = document.createDocumentFragment();
  featured.forEach((prop) => frag.appendChild(createPropertyCard(prop)));
  container.appendChild(frag);
}

function renderTestimonials() {
  const container = document.getElementById("testimonials-grid");
  if (!container) return;
  // Sample illustrative quotes only — not verified customer reviews
  const note = document.createElement("p");
  note.style.cssText = "font-size:13px;color:var(--text-secondary);margin-bottom:16px;";
  note.textContent = "Sample illustrative quotes for layout. Not verified customer reviews.";
  container.appendChild(note);
  [
    {
      name: "Sample Client A",
      role: "Illustrative role",
      quote: "A polished interface for exploring luxury listings and running transparent reference estimates.",
      rating: 5,
    },
    {
      name: "Sample Client B",
      role: "Illustrative role",
      quote: "Filters, compare, and calculators are useful for early research before speaking with advisors.",
      rating: 5,
    },
    {
      name: "Sample Client C",
      role: "Illustrative role",
      quote: "Clear labeling of sample data and estimates helps set the right expectations.",
      rating: 5,
    },
  ].forEach((t) => {
    const card = document.createElement("div");
    card.className = "glass";
    card.style.cssText = "padding:32px;border-radius:20px;";
    card.innerHTML = `
      <div style="display:flex;gap:4px;margin-bottom:22px;" aria-label="${t.rating} out of 5 stars">${"★".repeat(t.rating)}</div>
      <blockquote style="font-size:17px;line-height:1.55;margin-bottom:28px;">“${escapeHtml(t.quote)}”</blockquote>
      <div style="font-weight:700;">${escapeHtml(t.name)}</div>
      <div style="font-size:13px;color:var(--text-secondary);">${escapeHtml(t.role)}</div>`;
    container.appendChild(card);
  });
}

function renderBlog() {
  const container = document.getElementById("blog-grid");
  if (!container) return;
  [
    { title: "The Rise of AI in Ultra-Luxury Real Estate", excerpt: "How transparent estimation models and careful data labeling are reshaping early-stage research for exclusive properties.", category: "Intelligence", readTime: "12 min" },
    { title: "Monaco & Dubai: A New Axis of Wealth", excerpt: "Analyzing the shifting preferences of global UHNWIs and what it means for portfolio allocation in 2026.", category: "Markets", readTime: "9 min" },
    { title: "Sustainable Estates: The New Status Symbol", excerpt: "Why net-zero and regenerative design are becoming critical factors in both value retention and buyer demand.", category: "Design", readTime: "14 min" },
  ].forEach((post) => {
    const card = document.createElement("article");
    card.className = "glass";
    card.style.cssText = "padding:0;border-radius:20px;overflow:hidden;cursor:pointer;";
    card.tabIndex = 0;
    card.innerHTML = `
      <div style="height:168px;background:linear-gradient(#1e2937,#0f172a);" aria-hidden="true"></div>
      <div style="padding:26px 26px 30px;">
        <div style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:8px;">${escapeHtml(post.category)} • ${escapeHtml(post.readTime)}</div>
        <h3 style="font-weight:700;font-size:19px;line-height:1.3;margin-bottom:12px;">${escapeHtml(post.title)}</h3>
        <p style="font-size:14.5px;color:var(--text-secondary);line-height:1.5;">${escapeHtml(post.excerpt)}</p>
      </div>`;
    const open = () => showBlogModal(post);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    container.appendChild(card);
  });
}

function showBlogModal(post) {
  createModal(post.title, `
    <div style="padding:50px 60px;max-width:780px;margin:0 auto;">
      <div style="font-size:13px;color:var(--accent);font-weight:700;">${escapeHtml(post.category)} • ${escapeHtml(post.readTime)} read</div>
      <div style="margin:22px 0 40px;font-size:15.5px;line-height:1.85;color:var(--text-secondary);">
        ${escapeHtml(post.excerpt)} This is a demonstration article. In a production environment, full editorial content, photography, and interactive data visualizations would be displayed here.
      </div>
      <button type="button" onclick="closeCurrentModal()" class="btn btn-secondary">Close</button>
    </div>`);
}

function renderFAQ() {
  const container = document.getElementById("faq-container");
  if (!container) return;
  [
    {
      q: "How should I treat Atconiz valuation estimates?",
      a: "All valuation outputs are reference estimates from transparent formulas and static rates. They are not formal appraisals, do not constitute professional advice, and should not be used as the sole basis for a transaction. Consult licensed valuers for official work.",
    },
    {
      q: "Is the property catalog live inventory?",
      a: "The default catalog is seeded sample data for demonstration and development. It is clearly local/sample unless you connect a real listings backend. Never treat sample listings as verified live inventory.",
    },
    {
      q: "What makes Atconiz different?",
      a: "Atconiz focuses on a polished luxury-property experience with AI-assisted exploration, transparent calculators, and careful security practices — not invented accuracy percentages or fake market claims.",
    },
    {
      q: "How does investment projection work?",
      a: "Projections use a simple compound-growth formula with a user-supplied appreciation rate and horizon. Results are illustrative only; past performance does not guarantee future results.",
    },
    {
      q: "How does the Global Price Calculator work?",
      a: "It multiplies static country reference land rates (USD/sqm) by area, a location-premium slider, optional city multipliers, and a built-property factor when applicable. Currency conversion uses fixed reference rates. Outputs are estimates, not live market matches.",
    },
  ].forEach((faq) => {
    const item = document.createElement("div");
    item.className = "glass";
    item.style.cssText = "margin-bottom:12px;border-radius:16px;overflow:hidden;";
    item.innerHTML = `
      <button type="button" class="accordion-header" aria-expanded="false">
        <span style="font-weight:600;">${escapeHtml(faq.q)}</span>
        <span style="font-size:22px;color:var(--text-secondary);transition:transform .3s;" aria-hidden="true">+</span>
      </button>
      <div class="accordion-content" role="region"><div style="padding-top:6px;color:var(--text-secondary);line-height:1.7;">${escapeHtml(faq.a)}</div></div>`;
    item.querySelector(".accordion-header").addEventListener("click", function () {
      toggleAccordion(this);
    });
    container.appendChild(item);
  });
}

function toggleAccordion(header) {
  const content = header.nextElementSibling;
  const isOpen = content.classList.contains("open");
  document.querySelectorAll(".accordion-content").forEach((c) => c.classList.remove("open"));
  document.querySelectorAll(".accordion-header").forEach((h) => {
    h.setAttribute("aria-expanded", "false");
    const icon = h.querySelector("span:last-child");
    if (icon) icon.style.transform = "rotate(0deg)";
  });
  if (!isOpen) {
    content.classList.add("open");
    header.setAttribute("aria-expanded", "true");
    const icon = header.querySelector("span:last-child");
    if (icon) icon.style.transform = "rotate(45deg)";
  }
}

function showAddPropertyModal() {
  createModal("List New Property", `
    <div style="padding:30px 40px 50px;">
      <div style="margin-bottom:30px;">
        <div style="display:flex;gap:12px;margin-bottom:24px;">
          <div style="flex:1;text-align:center;padding:8px;background:var(--accent);color:#0a0b12;border-radius:9999px;font-weight:600;">Step 1 of 3</div>
        </div>
        <div style="display:grid;gap:22px;">
          <div><label for="new-title">Property Title</label><input type="text" id="new-title" value="New Contemporary Villa in Beverly Hills" maxlength="120"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
            <div><label for="new-price">Price (USD)</label><input type="number" id="new-price" value="18750000" min="0"></div>
            <div><label for="new-beds">Bedrooms</label><input type="number" id="new-beds" value="5" min="1"></div>
            <div><label for="new-baths">Bathrooms</label><input type="number" id="new-baths" value="6" min="1"></div>
          </div>
          <div><label for="new-location">Location</label><input type="text" id="new-location" value="Beverly Hills, California, United States"></div>
        </div>
      </div>
      <div style="text-align:right;">
        <button type="button" onclick="submitNewProperty()" class="btn btn-primary" style="padding:14px 42px;">Publish Listing</button>
      </div>
    </div>`);
}

function submitNewProperty() {
  const title = (document.getElementById("new-title")?.value || "New Listing").trim().slice(0, 120);
  const price = parseInt(document.getElementById("new-price")?.value, 10) || 1000000;
  const newProp = {
    id: Date.now(), title, price,
    bedrooms: parseInt(document.getElementById("new-beds")?.value, 10) || 5,
    bathrooms: parseInt(document.getElementById("new-baths")?.value, 10) || 6,
    area: 6200, type: "Luxury Villa",
    location: { city: "Beverly Hills", state: "California", country: "United States", lat: 34.07, lng: -118.4 },
    description: "Brand new contemporary masterpiece featuring unparalleled craftsmanship and cutting-edge smart home technology.",
    amenities: ["Infinity Pool", "Smart Home System", "Wine Cellar", "Home Theater"],
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56b06?w=900&q=80"],
    rating: 4.9, reviewsCount: 12, agent: agentPool[0], yearBuilt: 2025, status: "For Sale",
    listedDate: new Date().toISOString().split("T")[0], parking: 4, lotSize: 18500,
  };
  properties.unshift(newProp);
  filteredProperties = properties.slice();
  closeCurrentModal();
  showToast("Sample listing added to the local catalog (browser session only).");
  if (document.getElementById("view-explore")?.classList.contains("active")) renderPropertyGrid();
  if (document.getElementById("dashboard-admin")?.style.display === "block") renderAdminDashboard();
}

function showUserMenu() {
  createModal(
    "Local Session",
    `
    <div style="padding:20px 30px 40px;">
      <div style="margin-bottom:24px;">
        <div style="font-weight:700;font-size:21px;">Guest / Local</div>
        <div style="color:var(--text-secondary);margin-top:6px;">No server authentication is connected. Favorites, reviews, and saved estimates stay in this browser only.</div>
      </div>
      <div style="display:grid;gap:6px;font-size:15.5px;">
        <button type="button" onclick="switchView('dashboards');closeCurrentModal();" style="padding:14px 18px;border-radius:12px;cursor:pointer;background:none;border:none;color:inherit;font:inherit;text-align:left;">User Dashboard</button>
        <button type="button" onclick="showFavoritesModal();" style="padding:14px 18px;border-radius:12px;cursor:pointer;background:none;border:none;color:inherit;font:inherit;text-align:left;">Saved Properties (${favorites.length})</button>
        <div style="height:1px;background:var(--glass-border);margin:12px 0;" aria-hidden="true"></div>
        <button type="button" onclick="closeCurrentModal()" style="padding:14px 18px;border-radius:12px;cursor:pointer;background:none;border:none;color:var(--text-secondary);font:inherit;text-align:left;">Close</button>
      </div>
    </div>`
  );
}

function showContactModal() {
  createModal(
    "Contact",
    `
    <div style="padding:30px 40px 50px;">
      <p style="color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">Share a message for the team. This form is local-only in the current build — nothing is transmitted to a server.</p>
      <div style="margin-bottom:12px;padding:10px 14px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.35);border-radius:10px;font-size:13px;color:var(--text-secondary);">
        Local draft only. Connect a real contact endpoint to enable delivery.
      </div>
      <div style="margin-bottom:20px;"><label for="contact-name">Full Name</label><input type="text" id="contact-name" autocomplete="name" maxlength="100"></div>
      <div style="margin-bottom:20px;"><label for="contact-email">Email</label><input type="email" id="contact-email" autocomplete="email" maxlength="120"></div>
      <div style="margin-bottom:28px;"><label for="contact-message">How can we help?</label><textarea id="contact-message" rows="4" maxlength="1000" placeholder="Your message..."></textarea></div>
      <div style="display:flex;gap:14px;">
        <button type="button" onclick="submitContactForm()" class="btn btn-primary" style="flex:1;padding:16px;">Save Local Draft</button>
        <button type="button" onclick="closeCurrentModal()" class="btn btn-secondary" style="flex:1;padding:16px;">Cancel</button>
      </div>
    </div>`
  );
}

function submitContactForm() {
  const name = document.getElementById("contact-name")?.value?.trim();
  const email = document.getElementById("contact-email")?.value?.trim();
  const message = document.getElementById("contact-message")?.value?.trim() || "";
  if (!name || !email) {
    showToast("Please provide your name and email.", "error");
    return;
  }
  const drafts = safeGetJSON("atconiz_contact_drafts", []);
  drafts.unshift({
    id: Date.now(),
    name: name.slice(0, 100),
    email: email.slice(0, 120),
    message: message.slice(0, 1000),
    date: new Date().toISOString(),
  });
  safeSetJSON("atconiz_contact_drafts", drafts.slice(0, 10));
  closeCurrentModal();
  showToast("Draft saved locally. No message was sent (no contact backend connected).");
}

function initHeroParticles() {
  const canvas = document.getElementById("hero-particles");
  if (!canvas || prefersReducedMotion()) return;
  const ctx = canvas.getContext("2d");
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);
  const particles = [];
  const COUNT = Math.min(68, Math.floor((w * h) / 28000));
  class Particle {
    constructor() {
      this.x = Math.random() * w; this.y = Math.random() * h;
      this.size = Math.random() * 2.2 + 0.6;
      this.speedX = Math.random() * 0.6 - 0.3; this.speedY = Math.random() * 0.6 - 0.3;
      this.opacity = Math.random() * 0.5 + 0.2;
    }
    update() {
      this.x += this.speedX; this.y += this.speedY;
      if (this.x < 0 || this.x > w) this.speedX *= -1;
      if (this.y < 0 || this.y > h) this.speedY *= -1;
    }
    draw() {
      ctx.fillStyle = `rgba(103, 232, 249, ${this.opacity})`;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (let i = 0; i < COUNT; i++) particles.push(new Particle());
  let rafId = null, running = true;
  function animate() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    particles.forEach((p) => { p.update(); p.draw(); });
    rafId = requestAnimationFrame(animate);
  }
  animate();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { running = false; if (rafId) cancelAnimationFrame(rafId); }
    else { running = true; animate(); }
  });
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }, 150);
  });
}

function initializePlatform() {
  generateProperties();
  initTheme();
  renderFeaturedProperties();
  renderPropertyGrid();
  updateFavoritesCount();

  const quickContainer = document.getElementById("quick-filters");
  if (quickContainer) {
    ["Luxury Villa", "Modern Penthouse", "Historic Mansion", "Urban Loft"].forEach((type) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.dataset.type = type;
      chip.textContent = type;
      chip.addEventListener("click", () => { chip.classList.toggle("active"); applyFilters(); });
      quickContainer.appendChild(chip);
    });
  }

  const invSelect = document.getElementById("inv-property");
  if (invSelect) {
    properties.slice(0, 20).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.title} — ${formatPrice(p.price)}`;
      invSelect.appendChild(opt);
    });
  }

  // Hero / stats strip: use real catalog-derived numbers only
  setTimeout(() => {
    const cityCount = new Set(properties.map((p) => p.location?.city).filter(Boolean)).size;
    const typeCount = new Set(properties.map((p) => p.type).filter(Boolean)).size;
    [
      { id: "stat-properties", target: properties.length },
      { id: "stat-cities", target: cityCount },
      { id: "stat-matches", target: typeCount },
    ].forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;
      if (prefersReducedMotion()) {
        el.textContent = item.target.toLocaleString();
        return;
      }
      let current = 0;
      const increment = Math.max(1, item.target / 24);
      const timer = setInterval(() => {
        current += increment;
        if (current >= item.target) {
          el.textContent = item.target.toLocaleString();
          clearInterval(timer);
        } else {
          el.textContent = Math.floor(current).toLocaleString();
        }
      }, 40);
    });
  }, 400);

  initHeroParticles();
  initNavIndicator();

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement?.tagName === "BODY" && !currentModal) {
      e.preventDefault();
      document.getElementById("search-input")?.focus();
    }
  });

  // Do not invent pre-seeded favorites; start empty unless user already saved

  if (typeof console !== "undefined" && console.log) {
    console.log(
      "%c[Atconiz] Platform initialized • " + properties.length + " sample properties loaded",
      "color:#64748b"
    );
  }
}

document.addEventListener("DOMContentLoaded", initializePlatform);
