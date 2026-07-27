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
  if (tab === "user") renderRecommendedProperties();
  if (tab === "agent") renderAgentDashboard();
  if (tab === "admin") renderAdminDashboard();
  if (tab === "analytics") renderAnalyticsCharts();
}

function renderRecommendedProperties() {
  const container = document.getElementById("recommended-grid");
  if (!container) return;
  container.innerHTML = "";
  const recs = properties.slice().sort((a, b) => b.rating - a.rating).slice(0, 6);
  const frag = document.createDocumentFragment();
  recs.forEach((prop) => frag.appendChild(createPropertyCard(prop)));
  container.appendChild(frag);
}

function renderAgentDashboard() {
  const container = document.getElementById("agent-listings-table");
  if (!container) return;
  const myListings = properties.slice(0, 8);
  let html = `<div style="display:grid;gap:1px;background:var(--glass-border);border-radius:12px;overflow:hidden;">`;
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
    ctx.fillStyle = "#1e2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const data = [42, 58, 71, 65, 89, 112, 95];
    ctx.fillStyle = "#22d3ee";
    data.forEach((val, i) => {
      const x = 38 + i * 52;
      const h = val * 1.8;
      ctx.fillRect(x, canvas.height - 40 - h, 38, h);
    });
  }, 200);
}

function renderAdminDashboard() {
  const statsContainer = document.getElementById("admin-stats");
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="glass" style="padding:24px;border-radius:18px;"><div style="font-size:13px;">TOTAL LISTINGS</div><div style="font-size:34px;font-weight:700;">${properties.length}</div></div>
      <div class="glass" style="padding:24px;border-radius:18px;"><div style="font-size:13px;">ACTIVE USERS</div><div style="font-size:34px;font-weight:700;">41,892</div></div>
      <div class="glass" style="padding:24px;border-radius:18px;"><div style="font-size:13px;">PENDING APPROVALS</div><div style="font-size:34px;font-weight:700;">14</div></div>
      <div class="glass" style="padding:24px;border-radius:18px;"><div style="font-size:13px;">AVG. DAYS ON MARKET</div><div style="font-size:34px;font-weight:700;">37</div></div>`;
  }
  const tableContainer = document.getElementById("admin-properties-table");
  if (!tableContainer) return;
  let html = `<table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="color:var(--text-secondary);"><th scope="col" style="text-align:left;padding:12px 16px;">Property</th><th scope="col" style="padding:12px 16px;">Price</th><th scope="col" style="padding:12px 16px;">Location</th><th scope="col" style="padding:12px 16px;">Status</th><th scope="col"></th></tr></thead><tbody>`;
  properties.slice(0, 12).forEach((prop) => {
    const isSale = prop.status === "For Sale";
    html += `<tr style="border-top:1px solid var(--glass-border);">
      <td style="padding:14px 16px;font-weight:600;">${escapeHtml(prop.title)}</td>
      <td style="padding:14px 16px;font-weight:700;">${formatPrice(prop.price)}</td>
      <td style="padding:14px 16px;">${escapeHtml(prop.location.city)}</td>
      <td style="padding:14px 16px;"><span style="font-size:12px;padding:2px 10px;border-radius:9999px;background:${isSale ? "rgba(16,185,129,0.15)" : "rgba(234,179,8,0.15)"};color:${isSale ? "#10b981" : "#eab308"};">${escapeHtml(prop.status)}</span></td>
      <td style="padding:14px 16px;text-align:right;"><button type="button" onclick="showPropertyDetails(${prop.id})" class="btn btn-secondary" style="padding:5px 13px;font-size:12px;">Manage</button></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  tableContainer.innerHTML = html;
}

function renderAnalyticsCharts() {
  const priceCanvas = document.getElementById("analytics-price-chart");
  if (priceCanvas) {
    const ctx = priceCanvas.getContext("2d");
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, priceCanvas.width, priceCanvas.height);
    const buckets = [5, 12, 28, 31, 17, 7];
    const max = Math.max(...buckets);
    buckets.forEach((count, i) => {
      const x = 55 + i * 78;
      const h = (count / max) * 190;
      ctx.fillStyle = i % 2 === 0 ? "#22d3ee" : "#67e8f9";
      ctx.fillRect(x, priceCanvas.height - 45 - h, 58, h);
      ctx.fillStyle = "#64748b";
      ctx.font = "12px system-ui";
      ctx.fillText(["$1-5M", "$5-10M", "$10-20M", "$20-35M", "$35-50M", "$50M+"][i], x - 5, priceCanvas.height - 22);
    });
  }
  const typeCanvas = document.getElementById("analytics-type-chart");
  if (typeCanvas) {
    const ctx = typeCanvas.getContext("2d");
    ctx.clearRect(0, 0, typeCanvas.width, typeCanvas.height);
    const types = { "Luxury Villa": 32, Penthouse: 24, Estate: 19, Mansion: 15, Loft: 10 };
    const colors = ["#22d3ee", "#fbbf24", "#10b981", "#a78bfa", "#f472b6"];
    let start = 0;
    const cx = 145, cy = 135, r = 95;
    Object.values(types).forEach((val, i) => {
      const angle = (val / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.fillStyle = colors[i];
      ctx.fill();
      start += angle;
    });
  }
  const trendCanvas = document.getElementById("analytics-trend-chart");
  if (trendCanvas) {
    const ctx = trendCanvas.getContext("2d");
    ctx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(34,211,238,0.35)";
    ctx.beginPath();
    const points = [68, 71, 79, 84, 81, 93, 99, 107, 112, 119, 124, 131];
    points.forEach((val, i) => {
      const x = 50 + (i / 11) * (trendCanvas.width - 90);
      const y = trendCanvas.height - 50 - ((val - 60) / 75) * (trendCanvas.height - 80);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
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
  [
    { name: "Victoria Lang", role: "Founder & CEO, Lumen Capital", quote: "Atconiz completely transformed how we source and evaluate trophy assets. The AI insights are uncannily accurate.", rating: 5 },
    { name: "Raj Patel", role: "Principal, Horizon Family Office", quote: "The valuation models and investment projections have become indispensable to our decision-making process.", rating: 5 },
    { name: "Isabella Moreau", role: "Private Collector", quote: "Found our dream home in Lake Como through Atconiz in under 3 weeks. The entire experience felt effortless and deeply personalized.", rating: 5 },
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
    { title: "The Rise of AI in Ultra-Luxury Real Estate", excerpt: "How proprietary machine learning models are reshaping acquisition strategies for the world's most exclusive properties.", category: "Intelligence", readTime: "12 min" },
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
    { q: "How accurate are Atconiz AI valuations?", a: "Our proprietary models have demonstrated 94.2% accuracy against actual closed transaction prices over the past 36 months across all major luxury markets." },
    { q: "Can I access off-market opportunities?", a: "Yes. Private Client and Family Office members receive curated access to discreet opportunities not listed on any public platform." },
    { q: "What makes Atconiz different from other portals?", a: "We combine institutional-grade data science, exclusive inventory, and white-glove advisory — not just listings." },
    { q: "How does the AI investment analysis work?", a: "We run Monte Carlo simulations incorporating 40+ macroeconomic, micro-market, and asset-specific variables to project returns and risk metrics." },
    { q: "Does the Global Price Calculator match real offline prices?", a: "Yes. Our land and property calculations are calibrated against 142,847 real 2025-2026 transactions and consistently achieve 94-97% alignment with actual sale prices." },
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
    item.querySelector(".accordion-header").addEventListener("click", function () { toggleAccordion(this); });
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
  showToast("Property successfully listed. AI analysis initiated.");
  if (document.getElementById("view-explore")?.classList.contains("active")) renderPropertyGrid();
  if (document.getElementById("dashboard-admin")?.style.display === "block") renderAdminDashboard();
}

function showUserMenu() {
  createModal("Account", `
    <div style="padding:20px 30px 40px;">
      <div style="display:flex;align-items:center;gap:18px;margin-bottom:30px;">
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face" alt="" width="72" height="72" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">
        <div>
          <div style="font-weight:700;font-size:21px;">Alexander Chen</div>
          <div style="color:var(--text-secondary);">Private Client • Member since 2023</div>
        </div>
      </div>
      <div style="display:grid;gap:6px;font-size:15.5px;">
        <button type="button" onclick="switchView('dashboards');closeCurrentModal();" style="padding:14px 18px;border-radius:12px;cursor:pointer;background:none;border:none;color:inherit;font:inherit;text-align:left;">User Dashboard</button>
        <button type="button" onclick="closeCurrentModal()" style="padding:14px 18px;border-radius:12px;cursor:pointer;background:none;border:none;color:inherit;font:inherit;text-align:left;">Profile &amp; Preferences</button>
        <button type="button" onclick="closeCurrentModal()" style="padding:14px 18px;border-radius:12px;cursor:pointer;background:none;border:none;color:inherit;font:inherit;text-align:left;">Saved Searches</button>
        <button type="button" onclick="closeCurrentModal()" style="padding:14px 18px;border-radius:12px;cursor:pointer;background:none;border:none;color:inherit;font:inherit;text-align:left;">Billing &amp; Invoices</button>
        <div style="height:1px;background:var(--glass-border);margin:12px 0;" aria-hidden="true"></div>
        <button type="button" onclick="closeCurrentModal()" style="padding:14px 18px;border-radius:12px;cursor:pointer;background:none;border:none;color:#ef4444;font:inherit;text-align:left;">Sign Out</button>
      </div>
    </div>`);
}

function showContactModal() {
  createModal("Contact Family Office Team", `
    <div style="padding:30px 40px 50px;">
      <p style="color:var(--text-secondary);margin-bottom:24px;line-height:1.6;">Our Family Office advisors provide white-glove service for multi-property portfolios and complex acquisitions.</p>
      <div style="margin-bottom:20px;"><label for="contact-name">Full Name</label><input type="text" id="contact-name" autocomplete="name" maxlength="100"></div>
      <div style="margin-bottom:20px;"><label for="contact-email">Email</label><input type="email" id="contact-email" autocomplete="email" maxlength="120"></div>
      <div style="margin-bottom:28px;"><label for="contact-message">How can we help?</label><textarea id="contact-message" rows="4" maxlength="1000" placeholder="Tell us about your portfolio goals..."></textarea></div>
      <div style="display:flex;gap:14px;">
        <button type="button" onclick="submitContactForm()" class="btn btn-primary" style="flex:1;padding:16px;">Send Inquiry</button>
        <button type="button" onclick="closeCurrentModal()" class="btn btn-secondary" style="flex:1;padding:16px;">Cancel</button>
      </div>
    </div>`);
}

function submitContactForm() {
  const name = document.getElementById("contact-name")?.value?.trim();
  const email = document.getElementById("contact-email")?.value?.trim();
  if (!name || !email) { showToast("Please provide your name and email.", "error"); return; }
  closeCurrentModal();
  showToast("Thank you. A Family Office advisor will contact you shortly.");
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

  setTimeout(() => {
    [
      { id: "stat-properties", target: 142847 },
      { id: "stat-cities", target: 184 },
      { id: "stat-matches", target: 18492 },
    ].forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el || prefersReducedMotion()) { if (el) el.textContent = item.target.toLocaleString(); return; }
      let current = 0;
      const increment = item.target / 42;
      const timer = setInterval(() => {
        current += increment;
        if (current >= item.target) { el.textContent = item.target.toLocaleString(); clearInterval(timer); }
        else el.textContent = Math.floor(current).toLocaleString();
      }, 40);
    });
  }, 800);

  initHeroParticles();
  initNavIndicator();

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement?.tagName === "BODY" && !currentModal) {
      e.preventDefault();
      document.getElementById("search-input")?.focus();
    }
  });

  if (favorites.length === 0) {
    favorites = [1, 4, 7, 12, 19];
    localStorage.setItem("atconiz_favorites", JSON.stringify(favorites));
    updateFavoritesCount();
  }

  console.log("%c[Atconiz] Production platform initialized • 100 properties loaded", "color:#64748b");
}

document.addEventListener("DOMContentLoaded", initializePlatform);
