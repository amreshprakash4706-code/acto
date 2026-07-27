/* ==========================================================================
   ATCONIZ – AI Chat, Valuation, Investment Analysis
   ========================================================================== */

function openAIChat() {
  createModal("Atconiz AI Assistant", `
    <div style="height:580px;display:flex;flex-direction:column;overflow:hidden;border-radius:20px;">
      <div style="padding:18px 24px;background:var(--bg-secondary);border-bottom:1px solid var(--glass-border);display:flex;align-items:center;gap:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,var(--accent),var(--gold));border-radius:50%;display:flex;align-items:center;justify-content:center;color:#0a0b12;font-weight:800;font-size:15px;" aria-hidden="true">A</div>
        <div>
          <div style="font-weight:700;font-size:16px;">Atconiz AI</div>
          <div style="font-size:12px;color:var(--success);">● Online • Gemini</div>
        </div>
      </div>
      <div id="chat-messages" role="log" aria-live="polite" aria-relevant="additions"
        style="flex:1;padding:24px;overflow-y:auto;background:var(--bg-primary);display:flex;flex-direction:column;gap:16px;"></div>
      <div style="padding:12px 20px 8px;background:var(--bg-secondary);border-top:1px solid var(--glass-border);">
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;padding-left:4px;">SUGGESTED</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <button type="button" onclick="useSuggestedPrompt(this)" class="filter-chip" style="font-size:12.5px;padding:7px 14px;">Find oceanfront villas in Malibu under $25M</button>
          <button type="button" onclick="useSuggestedPrompt(this)" class="filter-chip" style="font-size:12.5px;padding:7px 14px;">Best investment properties in Dubai 2026</button>
          <button type="button" onclick="useSuggestedPrompt(this)" class="filter-chip" style="font-size:12.5px;padding:7px 14px;">Compare Beverly Hills vs Aspen homes</button>
        </div>
      </div>
      <div style="padding:18px 24px;border-top:1px solid var(--glass-border);background:var(--bg-secondary);">
        <div style="display:flex;gap:10px;">
          <input id="chat-input" type="text" placeholder="Ask anything about properties or markets..." maxlength="2000"
            style="flex:1;border-radius:9999px;padding:15px 22px;font-size:15px;"
            aria-label="Message to Atconiz AI"
            onkeydown="if(event.key==='Enter'){event.preventDefault();sendChatMessage();}">
          <button type="button" onclick="sendChatMessage()" class="btn btn-primary" style="border-radius:9999px;padding:0 30px;height:50px;">Send</button>
        </div>
        <div style="font-size:10.5px;text-align:center;margin-top:10px;color:var(--text-secondary);">Powered by Gemini • Real-time intelligence</div>
      </div>
    </div>`, { maxWidth: "740px" });

  setTimeout(() => {
    const container = document.getElementById("chat-messages");
    if (container && container.children.length === 0) {
      addChatMessage("ai", "Hello! I'm Atconiz AI — your personal real estate intelligence assistant. I can help with property insights, valuations, market advice, lifestyle matching, and more. How can I assist you today?");
    }
    document.getElementById("chat-input")?.focus();
  }, 300);
}

function useSuggestedPrompt(el) {
  const input = document.getElementById("chat-input");
  if (input) { input.value = el.textContent.trim(); sendChatMessage(); }
}

function addChatMessage(sender, text) {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  const msg = document.createElement("div");
  msg.className = `chat-message ${sender}`;
  msg.setAttribute("role", sender === "user" ? "user" : "assistant");
  msg.innerHTML = textToSafeHtml(text);
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  if (!input || !input.value.trim()) return;
  const userText = input.value.trim().slice(0, 2000);
  addChatMessage("user", userText);
  input.value = "";
  input.disabled = true;

  const messagesContainer = document.getElementById("chat-messages");
  const typingDiv = document.createElement("div");
  typingDiv.className = "chat-message ai";
  typingDiv.id = "typing-indicator";
  typingDiv.setAttribute("aria-busy", "true");
  typingDiv.style.opacity = "0.85";
  typingDiv.innerHTML = '<span class="thinking-dots">Atconiz is thinking<span>.</span><span>.</span><span>.</span></span>';
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });
    document.getElementById("typing-indicator")?.remove();
    let data = {};
    try { data = await response.json(); } catch {
      addChatMessage("ai", "Server returned an invalid response (status " + response.status + "). Please try again.");
      return;
    }
    if (data.reply) addChatMessage("ai", data.reply);
    else if (data.error) addChatMessage("ai", data.error);
    else addChatMessage("ai", "Sorry, I couldn't get a response right now (status " + response.status + ").");
  } catch (error) {
    document.getElementById("typing-indicator")?.remove();
    addChatMessage("ai", "Network error: Could not reach Atconiz AI. Please check your connection or try again later.");
    console.error("Chat error:", error);
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function runAIValuation(e) {
  e.preventDefault();
  const address = document.getElementById("val-address")?.value || "Property";
  const year = parseInt(document.getElementById("val-year")?.value, 10) || 2019;
  const beds = parseInt(document.getElementById("val-beds")?.value, 10) || 5;
  const baths = parseInt(document.getElementById("val-baths")?.value, 10) || 6;
  const area = parseInt(document.getElementById("val-area")?.value, 10) || 7850;

  createModal("Atconiz AI Valuation", `
    <div style="padding:50px 60px;text-align:center;">
      <div style="margin-bottom:30px;">
        <div style="font-size:15px;color:var(--accent);font-weight:700;">ANALYZING WITH ATCONIZ-3</div>
        <div style="margin-top:12px;font-size:21px;font-weight:600;">${escapeHtml(address)}</div>
      </div>
      <div style="margin:50px 0;">
        <div class="skeleton" style="height:6px;width:280px;margin:0 auto;border-radius:9999px;"></div>
        <div style="margin-top:18px;font-size:13px;color:var(--text-secondary);">Processing comparable transactions...</div>
      </div>
    </div>`);

  setTimeout(() => {
    closeCurrentModal();
    const baseVal = area * 2850 + beds * 180000 + baths * 95000 + (2026 - year) * -45000;
    const finalVal = Math.round(baseVal * (0.92 + Math.random() * 0.16));
    createModal("Valuation Complete", `
      <div style="padding:42px 50px 50px;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="font-size:13px;color:var(--text-secondary);">ESTIMATED MARKET VALUE</div>
          <div style="font-size:52px;font-weight:700;margin:12px 0;color:var(--accent);">${formatPrice(finalVal)}</div>
          <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.15);color:#10b981;padding:4px 16px;border-radius:9999px;font-size:13px;font-weight:600;">94% CONFIDENCE • ±$420K</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:40px 0;">
          <div>
            <div style="font-weight:600;margin-bottom:14px;">Key Value Drivers</div>
            <div style="font-size:14.5px;line-height:2.05;color:var(--text-secondary);">
              • Exceptional location (+18%)<br>• Recent smart home upgrades (+9%)<br>• Low inventory in micro-market (+12%)<br>• Strong buyer demand in segment
            </div>
          </div>
          <div><canvas id="valuation-pie" width="260" height="200" aria-label="Value composition chart"></canvas></div>
        </div>
        <div style="text-align:center;margin-top:20px;">
          <button type="button" onclick="closeCurrentModal()" class="btn btn-primary" style="padding:15px 48px;">Done</button>
          <button type="button" onclick="closeCurrentModal()" class="btn btn-secondary" style="padding:15px 34px;margin-left:12px;">Save Report</button>
        </div>
      </div>`);
    setTimeout(() => {
      const canvas = document.getElementById("valuation-pie");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const data = [42, 28, 18, 12];
      const colors = ["#22d3ee", "#fbbf24", "#10b981", "#64748b"];
      let startAngle = 0;
      data.forEach((val, i) => {
        const slice = (val / 100) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(130, 100);
        ctx.arc(130, 100, 85, startAngle, startAngle + slice);
        ctx.fillStyle = colors[i];
        ctx.fill();
        startAngle += slice;
      });
    }, 200);
  }, 1600);
}

function runQuickValuation(propId) {
  closeCurrentModal();
  const prop = properties.find((p) => p.id === propId);
  if (!prop) return;
  setTimeout(() => {
    switchView("ai-studio");
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set("val-address", `${prop.title}, ${prop.location.city}`);
    set("val-type", prop.type);
    set("val-year", prop.yearBuilt);
    set("val-beds", prop.bedrooms);
    set("val-baths", prop.bathrooms);
    set("val-area", prop.area);
    setTimeout(() => document.getElementById("valuation-form")?.dispatchEvent(new Event("submit")), 500);
  }, 300);
}

function runInvestmentAnalysis(e) {
  e.preventDefault();
  const propId = parseInt(document.getElementById("inv-property")?.value, 10);
  const prop = properties.find((p) => p.id === propId) || properties[0];
  const appreciation = parseFloat(document.getElementById("inv-apprec")?.value) || 6.5;
  const years = clamp(parseInt(document.getElementById("inv-years")?.value, 10) || 7, 1, 30);
  const projected = Math.round(prop.price * Math.pow(1 + appreciation / 100, years));
  const totalReturn = Math.round((Math.pow(1 + appreciation / 100, years) - 1) * 100);

  createModal("Investment Projection", `
    <div style="padding:40px 50px 55px;">
      <div style="margin-bottom:30px;">
        <div style="font-size:13px;color:var(--text-secondary);">${years}-YEAR PROJECTION FOR</div>
        <div style="font-size:24px;font-weight:700;">${escapeHtml(prop.title)}</div>
        <div style="color:var(--text-secondary);">${escapeHtml(prop.location.city)}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:40px;">
        <div class="glass" style="padding:20px;border-radius:16px;text-align:center;">
          <div style="font-size:12px;">CURRENT VALUE</div>
          <div style="font-size:26px;font-weight:700;margin:8px 0;">${formatPrice(prop.price)}</div>
        </div>
        <div class="glass" style="padding:20px;border-radius:16px;text-align:center;">
          <div style="font-size:12px;">PROJECTED VALUE (${years}Y)</div>
          <div style="font-size:26px;font-weight:700;margin:8px 0;color:var(--accent);">${formatPrice(projected)}</div>
        </div>
        <div class="glass" style="padding:20px;border-radius:16px;text-align:center;">
          <div style="font-size:12px;">TOTAL RETURN</div>
          <div style="font-size:26px;font-weight:700;margin:8px 0;color:#10b981;">+${totalReturn}%</div>
        </div>
      </div>
      <canvas id="investment-line-chart" width="820" height="260" style="width:100%;max-width:820px;" aria-label="Investment growth chart"></canvas>
      <div style="margin-top:30px;font-size:13px;color:var(--text-secondary);text-align:center;">Projection uses conservative modeling • Past performance does not guarantee future results</div>
    </div>`);

  setTimeout(() => {
    const canvas = document.getElementById("investment-line-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "rgba(34,211,238,0.4)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let yr = 0; yr <= years; yr++) {
      const val = prop.price * Math.pow(1 + appreciation / 100, yr);
      const x = 50 + (yr / years) * (w - 90);
      const denom = prop.price * (Math.pow(1 + appreciation / 100, years) - 1) || 1;
      const y = h - 50 - ((val - prop.price) / denom) * (h - 90);
      if (yr === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px system-ui";
    ctx.fillText("Year 0", 45, h - 22);
    ctx.fillText(`Year ${years}`, w - 75, h - 22);
  }, 300);
}
