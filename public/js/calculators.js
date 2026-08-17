/* ==========================================================================
   ATCONIZ – Global Price Calculator & Mortgage Calculator
   Deterministic estimates with transparent assumptions. Not formal appraisals.
   ========================================================================== */

function openGlobalPriceCalculator() {
  const countryOpts = globalData.countries
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join("");
  const currencyOpts = Object.keys(currencies)
    .map(
      (code) =>
        `<option value="${code}">${code} - ${escapeHtml(currencies[code].name)}</option>`
    )
    .join("");

  createModal(
    "Global Property & Land Price Calculator",
    `
    <div style="padding:30px 40px 50px;max-width:980px;margin:0 auto;">
      <div style="margin-bottom:28px;">
        <div style="font-size:15px;color:var(--accent);font-weight:700;">REFERENCE ESTIMATES • MULTI-CURRENCY</div>
        <div style="font-size:26px;font-weight:700;margin-top:8px;">Property &amp; Land Price Estimate</div>
        <div style="color:var(--text-secondary);">Uses published reference land rates and transparent multipliers — not live market feeds.</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;">
        <div>
          <div style="margin-bottom:20px;">
            <label for="calc-country">Country</label>
            <select id="calc-country" onchange="updateCalculationPreview()">${countryOpts}</select>
          </div>
          <div style="margin-bottom:20px;">
            <label for="calc-city">City / Area (optional)</label>
            <input type="text" id="calc-city" placeholder="e.g. Beverly Hills, Dubai Marina" oninput="updateCalculationPreview()" maxlength="80" autocomplete="off">
          </div>
          <div style="margin-bottom:20px;">
            <label for="calc-type">Property Type</label>
            <select id="calc-type" onchange="updateCalculationPreview()">
              <option value="Land">Land Only</option>
              <option value="Luxury Villa">Luxury Villa / House</option>
              <option value="Modern Penthouse">Modern Penthouse / Apartment</option>
              <option value="Historic Mansion">Historic Mansion</option>
              <option value="Commercial">Commercial / Mixed Use</option>
            </select>
          </div>
          <div style="margin-bottom:20px;" id="land-area-section">
            <label for="calc-area">Plot / Land Area</label>
            <div style="display:flex;gap:12px;align-items:center;">
              <input type="number" id="calc-area" value="5000" min="1" max="5000000" oninput="updateCalculationPreview()" style="flex:1;">
              <select id="calc-area-unit" onchange="updateCalculationPreview()" style="width:110px;">
                <option value="sqm">Square Meters</option>
                <option value="sqft">Square Feet</option>
                <option value="acre">Acres</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom:20px;">
            <label for="calc-currency">Currency</label>
            <select id="calc-currency" onchange="updateCalculationPreview()">${currencyOpts}</select>
          </div>
          <div style="margin-bottom:20px;">
            <label for="calc-premium">Location Premium (1–10)</label>
            <input type="range" id="calc-premium" min="1" max="10" step="0.5" value="7" style="width:100%;"
              oninput="document.getElementById('premium-val').textContent=this.value;updateCalculationPreview()">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);">
              <span>Low</span><span id="premium-val" style="font-weight:600;color:var(--accent);">7</span><span>Prime</span>
            </div>
          </div>
        </div>
        <div>
          <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:16px;padding:24px;margin-bottom:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">LIVE PREVIEW (REFERENCE)</div>
            <div id="calc-preview-price" style="font-size:42px;font-weight:700;color:var(--accent);line-height:1;">—</div>
            <div id="calc-preview-currency" style="font-size:15px;color:var(--text-secondary);">USD • Reference estimate</div>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">
            Methodology: country reference land rate (USD/sqm) × area × location premium factor × optional built-property multiplier.
            City keywords apply known premium multipliers when matched.
            Rates are static reference values for illustration — not live feeds or formal appraisals.
          </div>
        </div>
      </div>
      <div style="margin-top:32px;display:flex;gap:14px;">
        <button type="button" onclick="calculateGlobalPrice()" class="btn btn-primary" style="flex:1;padding:18px;font-size:17px;">Calculate Estimate</button>
        <button type="button" onclick="closeCurrentModal()" class="btn btn-secondary" style="flex:1;padding:18px;font-size:17px;">Cancel</button>
      </div>
      <div style="margin-top:20px;text-align:center;font-size:12px;color:var(--text-secondary);">
        Estimates are for reference only. For official appraisals, consult local licensed valuers.
      </div>
    </div>`,
    { maxWidth: "1020px" }
  );

  setTimeout(() => {
    const countrySelect = document.getElementById("calc-country");
    const currencySelect = document.getElementById("calc-currency");
    if (countrySelect) countrySelect.value = "United States";
    if (currencySelect) currencySelect.value = "USD";
    updateCalculationPreview();
  }, 200);
}

function updateCityOptions() {
  updateCalculationPreview();
}
function toggleLandMode() {
  updateCalculationPreview();
}

/**
 * Core deterministic estimate (no randomness).
 * @returns {{ estimatedUSD: number, areaSqm: number, baseRate: number, cityMultiplier: number, premium: number, type: string, country: string, city: string, currency: string }}
 */
function computeGlobalEstimate() {
  const country = document.getElementById("calc-country")?.value || "United States";
  const city = (document.getElementById("calc-city")?.value || "").trim() || "Prime Area";
  const type = document.getElementById("calc-type")?.value || "Land";
  const area = clamp(toNumber(document.getElementById("calc-area")?.value, 5000), 1, 5_000_000);
  const unit = document.getElementById("calc-area-unit")?.value || "sqm";
  const premium = clamp(toNumber(document.getElementById("calc-premium")?.value, 7), 1, 10);
  const currency = document.getElementById("calc-currency")?.value || "USD";

  let areaSqm = area;
  if (unit === "sqft") areaSqm = area * 0.092903;
  if (unit === "acre") areaSqm = area * 4046.8564224;

  const baseRate = globalData.landRatesUSDPerSqm[country] || 1200;
  let cityMultiplier = 1.0;
  const cityLower = city.toLowerCase();
  if (globalData.premiumMultipliers[country]) {
    for (const key in globalData.premiumMultipliers[country]) {
      if (key === "default") continue;
      if (cityLower.includes(String(key).toLowerCase())) {
        cityMultiplier = globalData.premiumMultipliers[country][key];
        break;
      }
    }
  }

  // Land component
  let estimatedUSD = baseRate * areaSqm * (premium / 5) * cityMultiplier;
  // Built property multiplier (improvements)
  if (type !== "Land") estimatedUSD *= 1.65;

  if (!Number.isFinite(estimatedUSD) || estimatedUSD < 0) estimatedUSD = 0;

  return {
    estimatedUSD,
    areaSqm,
    baseRate,
    cityMultiplier,
    premium,
    type,
    country,
    city,
    currency,
  };
}

function updateCalculationPreview() {
  const previewPrice = document.getElementById("calc-preview-price");
  const previewCurrency = document.getElementById("calc-preview-currency");
  if (!previewPrice || !previewCurrency) return;

  const result = computeGlobalEstimate();
  const converted = convertCurrency(result.estimatedUSD, result.currency);
  const curr = currencies[result.currency] || { symbol: "$" };
  previewPrice.textContent =
    curr.symbol +
    (Number.isFinite(converted) ? converted : 0).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  previewCurrency.textContent = `${result.currency} • Reference estimate (static rates)`;
}

function calculateGlobalPrice() {
  const result = computeGlobalEstimate();
  const converted = convertCurrency(result.estimatedUSD, result.currency);
  const curr = currencies[result.currency] || { symbol: "$", rate: 1 };

  const landShare = result.type === "Land" ? 1 : 0.55;
  const improveShare = result.type === "Land" ? 0 : 0.45;
  const landValue = converted * landShare;
  const improveValue = converted * improveShare;

  closeCurrentModal();
  createModal(
    "Estimate Complete",
    `
    <div style="padding:40px 50px 55px;max-width:820px;">
      <div style="text-align:center;">
        <div style="font-size:14px;color:var(--text-secondary);">REFERENCE ESTIMATE (NOT A FORMAL APPRAISAL)</div>
        <div style="font-size:52px;font-weight:700;margin:12px 0;color:var(--accent);">${curr.symbol}${converted.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
        <div style="font-size:15px;color:var(--text-secondary);">${escapeHtml(result.currency)} • ${escapeHtml(result.country)} • ${escapeHtml(result.city)}</div>
      </div>
      <div style="margin:28px 0;padding:18px 20px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:14px;font-size:13.5px;color:var(--text-secondary);line-height:1.7;">
        <strong style="color:var(--text-primary);">Assumptions used</strong><br>
        Base land rate: $${result.baseRate.toLocaleString()}/sqm (reference)<br>
        Area: ${result.areaSqm.toLocaleString("en-US", { maximumFractionDigits: 1 })} sqm<br>
        Location premium factor: ${(result.premium / 5).toFixed(2)}× (slider ${result.premium}/10)<br>
        City multiplier: ${result.cityMultiplier}×<br>
        Type: ${escapeHtml(result.type)}${result.type !== "Land" ? " (built multiplier 1.65×)" : ""}
      </div>
      <div style="margin:24px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
        <div class="glass" style="padding:20px;border-radius:16px;text-align:center;">
          <div style="font-size:13px;color:var(--text-secondary);">LAND COMPONENT</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;">${curr.symbol}${Math.round(landValue).toLocaleString()}</div>
        </div>
        <div class="glass" style="padding:20px;border-radius:16px;text-align:center;">
          <div style="font-size:13px;color:var(--text-secondary);">IMPROVEMENTS</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;">${curr.symbol}${Math.round(improveValue).toLocaleString()}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:30px;">
        <button type="button" id="btn-save-calculation" class="btn btn-primary" style="flex:1;padding:16px;">Save to My Valuations</button>
        <button type="button" id="btn-close-estimate" class="btn btn-secondary" style="flex:1;padding:16px;">Close</button>
      </div>
    </div>`
  );

  // Safe event binding — never embed user-controlled values in inline JS attributes
  setTimeout(() => {
    const saveBtn = document.getElementById("btn-save-calculation");
    const closeBtn = document.getElementById("btn-close-estimate");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        saveCalculation(
          result.estimatedUSD,
          result.currency,
          result.country,
          result.city,
          result.type
        );
        closeCurrentModal();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", () => closeCurrentModal());
    }
  }, 0);
}

function saveCalculation(usdValue, currency, country, city, type) {
  const calc = {
    id: Date.now(),
    date: new Date().toISOString(),
    usdValue: Number(usdValue) || 0,
    currency: String(currency || "USD").slice(0, 8),
    country: String(country || "").slice(0, 80),
    city: String(city || "").slice(0, 80),
    type: String(type || "").slice(0, 40),
    convertedValue: convertCurrency(usdValue, currency),
    dataStatus: "reference",
  };
  savedCalculations.unshift(calc);
  if (savedCalculations.length > 20) savedCalculations.pop();
  safeSetJSON("atconiz_calculations", savedCalculations);
  showToast("Estimate saved to your local Valuation History.");
}

function calculateMortgage(e) {
  e.preventDefault();
  const price = toNumber(document.getElementById("mort-price")?.value, 0);
  const downPercent = clamp(toNumber(document.getElementById("mort-down")?.value, 20), 0, 100);
  const annualRate = clamp(toNumber(document.getElementById("mort-rate")?.value, 4.75), 0, 30);
  const rate = annualRate / 100;
  const years = clamp(toNumber(document.getElementById("mort-years")?.value, 30), 1, 50);

  if (price <= 0 || !Number.isFinite(price)) {
    showToast("Please enter a valid property price greater than zero.", "error");
    document.getElementById("mort-price")?.focus();
    return;
  }
  if (price > 500_000_000) {
    showToast("Property price exceeds supported range for this calculator.", "error");
    return;
  }

  const downPayment = price * (downPercent / 100);
  const loanAmount = Math.max(0, price - downPayment);
  const monthlyRate = rate / 12;
  const numPayments = Math.round(years * 12);

  let monthlyPayment = 0;
  if (loanAmount <= 0) {
    monthlyPayment = 0;
  } else if (monthlyRate > 0 && numPayments > 0) {
    // Standard amortization; numerically stable for typical rates
    const factor = Math.pow(1 + monthlyRate, numPayments);
    monthlyPayment = (loanAmount * (monthlyRate * factor)) / (factor - 1);
  } else if (numPayments > 0) {
    // Zero-interest: principal only
    monthlyPayment = loanAmount / numPayments;
  }

  if (!Number.isFinite(monthlyPayment)) {
    showToast("Unable to compute mortgage with the given inputs.", "error");
    return;
  }

  const totalPaid = monthlyPayment * numPayments;
  const totalInterest = Math.max(0, totalPaid - loanAmount);

  const resultsDiv = document.getElementById("mortgage-results");
  if (!resultsDiv) return;
  resultsDiv.style.display = "block";
  resultsDiv.innerHTML = `
    <div class="mortgage-result">
      <div style="font-weight:700;font-size:20px;margin-bottom:20px;">Mortgage Summary</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
        <div>
          <div style="font-size:13px;color:var(--text-secondary);">Monthly Payment</div>
          <div style="font-size:28px;font-weight:700;color:var(--accent);">$${monthlyPayment.toFixed(0)}</div>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);">Total Interest</div>
          <div style="font-size:28px;font-weight:700;">$${totalInterest.toFixed(0)}</div>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);">Loan Amount</div>
          <div style="font-size:28px;font-weight:700;">$${loanAmount.toFixed(0)}</div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">Illustrative only. Actual lender quotes may differ. Zero-interest loans amortize principal evenly.</p>
      <canvas id="mortgage-pie" width="280" height="200" style="margin:0 auto;display:block;" aria-label="Principal vs interest"></canvas>
      <div style="margin-top:24px;">
        <div style="font-weight:600;margin-bottom:12px;">Amortization Schedule (First 12 Months)</div>
        <div style="max-height:220px;overflow-y:auto;">
          <table class="amortization-table">
            <thead><tr><th scope="col">Month</th><th scope="col">Payment</th><th scope="col">Principal</th><th scope="col">Interest</th><th scope="col">Balance</th></tr></thead>
            <tbody id="amortization-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById("mortgage-pie");
    if (!canvas || totalPaid <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const principalPercent = (loanAmount / totalPaid) * 100;
    const interestPercent = (totalInterest / totalPaid) * 100;
    let start = 0;
    [principalPercent, interestPercent].forEach((val, i) => {
      const slice = (val / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(140, 100);
      ctx.arc(140, 100, 80, start, start + slice);
      ctx.fillStyle = i === 0 ? "#22d3ee" : "#fbbf24";
      ctx.fill();
      start += slice;
    });
  }, 50);

  setTimeout(() => {
    const tbody = document.getElementById("amortization-body");
    if (!tbody) return;
    let balance = loanAmount;
    let html = "";
    const monthsToShow = Math.min(12, numPayments);
    for (let month = 1; month <= monthsToShow; month++) {
      const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
      const principal = Math.min(balance, monthlyPayment - interest);
      balance = Math.max(0, balance - principal);
      html += `<tr><td>${month}</td><td>$${monthlyPayment.toFixed(0)}</td><td>$${Math.max(0, principal).toFixed(0)}</td><td>$${Math.max(0, interest).toFixed(0)}</td><td>$${balance.toFixed(0)}</td></tr>`;
    }
    tbody.innerHTML = html;
  }, 80);
}
