/* ==========================================================================
   ATCONIZ – Property Details, Reviews, Viewings
   ========================================================================== */

function showPropertyDetails(id) {
  const prop = properties.find((p) => p.id === id);
  if (!prop) return;
  const isFav = favorites.includes(id);
  const propReviews = reviewsData[id] || [];

  const thumbs = prop.images.map((img, idx) => `
    <button type="button" class="gallery-thumb" data-src="${escapeHtml(img)}"
      style="width:64px;height:48px;border-radius:8px;overflow:hidden;border:2px solid white;cursor:pointer;box-shadow:0 4px 12px rgb(0 0 0 / 0.3);padding:0;background:none;"
      aria-label="View image ${idx + 1}">
      <img src="${escapeHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover;" width="64" height="48">
    </button>`).join("");

  const amenities = prop.amenities.map((a) =>
    `<div style="background:var(--glass-bg);padding:7px 17px;border-radius:9999px;font-size:14px;border:1px solid var(--glass-border);">${escapeHtml(a)}</div>`
  ).join("");

  const reviewsHtml = propReviews.length > 0
    ? propReviews.map((r) => `
      <div class="review-card">
        <div style="font-weight:600;">${escapeHtml(r.name)}</div>
        <div style="color:#fbbf24;margin:4px 0;" aria-label="Rating ${r.rating} out of 5">${"★".repeat(r.rating)}</div>
        <div style="color:var(--text-secondary);">${escapeHtml(r.comment)}</div>
      </div>`).join("")
    : '<div style="color:var(--text-secondary);">No reviews yet. Be the first to share your experience.</div>';

  const modalHTML = `
    <div style="max-height:92vh;overflow-y:auto;">
      <div style="position:relative;height:min(460px,50vh);background:#111;">
        <img id="detail-main-image" src="${escapeHtml(prop.images[0])}" alt="${escapeHtml(prop.title)}" style="width:100%;height:100%;object-fit:cover;">
        <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:10;">${thumbs}</div>
        <div style="position:absolute;top:24px;right:24px;display:flex;gap:10px;">
          <button type="button" class="heart-btn ${isFav ? "active" : ""}" style="width:46px;height:46px;font-size:22px;"
            aria-label="${isFav ? "Remove from saved" : "Save property"}" aria-pressed="${isFav}"
            onclick="toggleFavorite(${prop.id}, this)">♥</button>
          <button type="button" onclick="closeCurrentModal()" aria-label="Close"
            style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,0.9);color:#111;border:none;font-size:22px;cursor:pointer;">✕</button>
        </div>
      </div>
      <div style="padding:40px 48px 50px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;">
          <div>
            <div style="font-size:13px;color:var(--accent);font-weight:700;letter-spacing:1.5px;">${escapeHtml(prop.type.toUpperCase())}</div>
            <h2 style="font-size:34px;font-weight:700;line-height:1.1;margin:8px 0 4px;">${escapeHtml(prop.title)}</h2>
            <div style="color:var(--text-secondary);font-size:17px;">${escapeHtml(prop.location.city)}, ${escapeHtml(prop.location.state)} • ${escapeHtml(prop.location.country)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:13px;color:var(--text-secondary);">ASKING PRICE</div>
            <div style="font-size:38px;font-weight:700;color:var(--accent);">${formatPrice(prop.price)}</div>
          </div>
        </div>
        <div style="margin:32px 0;display:flex;gap:40px;flex-wrap:wrap;">
          <div><span style="font-size:13px;color:var(--text-secondary);">BEDROOMS</span><br><span style="font-size:23px;font-weight:700;">${prop.bedrooms}</span></div>
          <div><span style="font-size:13px;color:var(--text-secondary);">BATHROOMS</span><br><span style="font-size:23px;font-weight:700;">${prop.bathrooms}</span></div>
          <div><span style="font-size:13px;color:var(--text-secondary);">LIVING AREA</span><br><span style="font-size:23px;font-weight:700;">${prop.area.toLocaleString()} sqft</span></div>
          <div><span style="font-size:13px;color:var(--text-secondary);">YEAR BUILT</span><br><span style="font-size:23px;font-weight:700;">${prop.yearBuilt}</span></div>
          <div><span style="font-size:13px;color:var(--text-secondary);">RATING</span><br><span style="font-size:23px;font-weight:700;">★ ${prop.rating}</span> <span style="font-size:14px;color:var(--text-secondary);">(${prop.reviewsCount})</span></div>
        </div>
        <div role="tablist" style="display:flex;gap:8px;border-bottom:1px solid var(--glass-border);margin-bottom:24px;">
          <button type="button" role="tab" aria-selected="true" onclick="switchDetailTab(this,'overview')" class="tab-button active">Overview</button>
          <button type="button" role="tab" aria-selected="false" onclick="switchDetailTab(this,'amenities')" class="tab-button">Amenities</button>
          <button type="button" role="tab" aria-selected="false" onclick="switchDetailTab(this,'reviews')" class="tab-button">Reviews (${propReviews.length})</button>
          <button type="button" role="tab" aria-selected="false" onclick="switchDetailTab(this,'agent')" class="tab-button">Agent</button>
        </div>
        <div id="detail-tab-overview" role="tabpanel">
          <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:50px;">
            <div>
              <div style="font-weight:700;font-size:18px;margin-bottom:14px;">About this residence</div>
              <p style="color:var(--text-secondary);line-height:1.75;margin-bottom:32px;">${escapeHtml(prop.description)} This exceptional property represents the pinnacle of modern luxury living with uncompromising attention to detail and the highest quality materials.</p>
            </div>
            <div>
              <div class="glass" style="padding:24px;border-radius:18px;margin-bottom:24px;">
                <div style="font-weight:700;margin-bottom:16px;">Your Dedicated Advisor</div>
                <div style="display:flex;gap:16px;align-items:center;">
                  <img src="${escapeHtml(prop.agent.avatar)}" alt="" width="64" height="64" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--glass-border);">
                  <div>
                    <div style="font-weight:700;font-size:18px;">${escapeHtml(prop.agent.name)}</div>
                    <div style="color:var(--text-secondary);font-size:14px;">Senior Private Client Advisor</div>
                    <div style="margin-top:8px;font-size:14px;">${escapeHtml(prop.agent.phone)}</div>
                    <div style="font-size:14px;color:var(--accent);">${escapeHtml(prop.agent.email)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="detail-tab-amenities" role="tabpanel" style="display:none;">
          <div style="font-weight:700;font-size:18px;margin-bottom:16px;">Signature Amenities</div>
          <div style="display:flex;flex-wrap:wrap;gap:9px;">${amenities}</div>
        </div>
        <div id="detail-tab-reviews" role="tabpanel" style="display:none;">
          <div style="margin-bottom:24px;">
            <button type="button" onclick="showAddReviewModal(${prop.id})" class="btn btn-primary" style="padding:10px 24px;font-size:14px;">Write a Review</button>
          </div>
          <div id="reviews-list">${reviewsHtml}</div>
        </div>
        <div id="detail-tab-agent" role="tabpanel" style="display:none;">
          <div class="glass" style="padding:32px;border-radius:20px;">
            <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
              <img src="${escapeHtml(prop.agent.avatar)}" alt="" width="92" height="92" style="width:92px;height:92px;border-radius:50%;object-fit:cover;">
              <div>
                <div style="font-size:24px;font-weight:700;">${escapeHtml(prop.agent.name)}</div>
                <div style="color:var(--text-secondary);">Senior Private Client Advisor • 14 years experience</div>
                <div style="margin-top:16px;display:flex;gap:12px;">
                  <button type="button" class="btn btn-primary" style="padding:10px 24px;font-size:14px;">Message</button>
                  <button type="button" class="btn btn-secondary" style="padding:10px 24px;font-size:14px;">Schedule Call</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top:42px;display:flex;gap:14px;flex-wrap:wrap;">
          <button type="button" onclick="scheduleViewing(${prop.id})" class="btn btn-primary" style="flex:1;padding:17px;">Schedule Private Viewing</button>
          <button type="button" onclick="runQuickValuation(${prop.id})" class="btn btn-secondary" style="flex:1;padding:17px;">Get AI Valuation</button>
          <button type="button" onclick="addToCompareFromModal(${prop.id})" class="btn btn-secondary" style="padding:17px 26px;">Add to Compare</button>
        </div>
      </div>
    </div>`;

  const modal = createModal(prop.title, modalHTML, { maxWidth: "1080px" });
  modal?.querySelectorAll(".gallery-thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      const main = document.getElementById("detail-main-image");
      if (main && btn.dataset.src) main.src = btn.dataset.src;
    });
  });
}

function switchDetailTab(btn, tab) {
  document.querySelectorAll(".tab-button").forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  btn.classList.add("active");
  btn.setAttribute("aria-selected", "true");
  document.querySelectorAll('[id^="detail-tab-"]').forEach((el) => { el.style.display = "none"; });
  const panel = document.getElementById("detail-tab-" + tab);
  if (panel) panel.style.display = "block";
}

function showAddReviewModal(propId) {
  closeCurrentModal();
  createModal("Write a Review", `
    <div style="padding:30px 40px 50px;">
      <div style="margin-bottom:24px;">
        <label for="review-name">Your Name</label>
        <input type="text" id="review-name" value="Alex Rivera" maxlength="80" autocomplete="name">
      </div>
      <div style="margin-bottom:24px;">
        <label for="review-rating">Rating</label>
        <select id="review-rating" style="width:160px;">
          <option value="5">★★★★★ Excellent</option>
          <option value="4">★★★★ Good</option>
          <option value="3">★★★ Average</option>
          <option value="2">★★ Fair</option>
          <option value="1">★ Poor</option>
        </select>
      </div>
      <div style="margin-bottom:32px;">
        <label for="review-comment">Your Review</label>
        <textarea id="review-comment" rows="5" maxlength="1000" placeholder="Share your experience with this property..."></textarea>
      </div>
      <div style="display:flex;gap:14px;">
        <button type="button" onclick="submitReview(${propId})" class="btn btn-primary" style="flex:1;padding:16px;">Submit Review</button>
        <button type="button" onclick="closeCurrentModal()" class="btn btn-secondary" style="flex:1;padding:16px;">Cancel</button>
      </div>
    </div>`);
}

function submitReview(propId) {
  const name = (document.getElementById("review-name")?.value || "Anonymous").trim().slice(0, 80);
  const rating = clamp(parseInt(document.getElementById("review-rating")?.value, 10) || 5, 1, 5);
  const comment = (document.getElementById("review-comment")?.value || "Wonderful property!").trim().slice(0, 1000);
  if (!reviewsData[propId]) reviewsData[propId] = [];
  reviewsData[propId].push({ name, rating, comment, date: new Date().toISOString() });
  localStorage.setItem("atconiz_reviews", JSON.stringify(reviewsData));
  closeCurrentModal();
  showToast("Thank you! Your review has been published.");
  setTimeout(() => showPropertyDetails(propId), 600);
}

function scheduleViewing(propId) {
  closeCurrentModal();
  const prop = properties.find((p) => p.id === propId);
  if (!prop) return;
  selectedTime = null;
  const defaultDate = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];
  const slots = ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"]
    .map((t) => `<button type="button" onclick="selectTimeSlot(this,'${t}')" class="filter-chip time-slot" style="padding:10px 22px;">${t}</button>`)
    .join("");
  createModal(`Schedule Viewing • ${prop.title}`, `
    <div style="padding:30px 40px 50px;">
      <div style="margin-bottom:28px;">
        <label for="viewing-date">Select Date</label>
        <input type="date" id="viewing-date" value="${defaultDate}" style="max-width:280px;" min="${new Date().toISOString().split("T")[0]}">
      </div>
      <div style="margin-bottom:28px;">
        <div style="font-weight:600;margin-bottom:8px;">Preferred Time</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;" role="group" aria-label="Time slots">${slots}</div>
      </div>
      <div style="margin-bottom:32px;">
        <label for="viewing-notes">Additional Notes</label>
        <textarea id="viewing-notes" placeholder="Any specific requirements or questions for the agent..." rows="3" maxlength="500"></textarea>
      </div>
      <div style="display:flex;gap:14px;">
        <button type="button" onclick="confirmViewing(${propId})" class="btn btn-primary" style="flex:1;padding:16px;">Confirm Viewing</button>
        <button type="button" onclick="closeCurrentModal()" class="btn btn-secondary" style="flex:1;padding:16px;">Cancel</button>
      </div>
    </div>`);
}

function selectTimeSlot(el, time) {
  document.querySelectorAll(".time-slot").forEach((e) => e.classList.remove("active"));
  el.classList.add("active");
  selectedTime = time;
}

function confirmViewing(propId) {
  const date = document.getElementById("viewing-date")?.value;
  if (!date || !selectedTime) {
    showToast("Please select a date and time slot.", "error");
    return;
  }
  closeCurrentModal();
  visitsData.push({ id: Date.now(), propId, date, time: selectedTime, status: "Confirmed" });
  localStorage.setItem("atconiz_visits", JSON.stringify(visitsData));
  showToast("Viewing scheduled successfully. Check your dashboard for details.");
  setTimeout(() => {
    const countEl = document.getElementById("user-viewings");
    if (countEl) countEl.textContent = String(parseInt(countEl.textContent, 10) + 1);
  }, 400);
}
