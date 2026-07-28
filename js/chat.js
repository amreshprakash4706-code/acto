/* ==========================================================================
   ATCONIZ – AI Chat (floating panel), Valuation, Investment Analysis
   Powered by Gemini 3.6 Flash
   ========================================================================== */

let _aiPanelMinimized = false;

function openAIChat() {
  // If panel already exists, restore it
  const existing = document.getElementById("atconiz-ai-panel");
  if (existing) {
    existing.classList.remove("ai-panel-minimized", "ai-panel-hidden");
    _aiPanelMinimized = false;
    document.getElementById("chat-input")?.focus();
    return;
  }

  const panel = document.createElement("div");
  panel.id = "atconiz-ai-panel";
  panel.className = "ai-floating-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Atconiz AI Assistant");
  panel.innerHTML = `
    <div class="ai-panel-titlebar" id="ai-panel-drag">
      <div class="ai-panel-title-left">
        <div class="ai-panel-avatar" aria-hidden="true">A</div>
        <div>
          <div class="ai-panel-name">Atconiz AI</div>
          <div class="ai-panel-status"><span class="ai-status-dot"></span> Online • Gemini 3.6 Flash</div>
        </div>
      </div>
      <div class="ai-panel-controls">
        <button type="button" class="ai-panel-btn" onclick="minimizeAIPanel()" aria-label="Minimize">−</button>
        <button type="button" class="ai-panel-btn" onclick="closeAIPanel()" aria-label="Close">×</button>
      </div>
    </div>
    <div id="chat-messages" class="ai-panel-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
    <div class="ai-panel-suggestions">
      <button type="button" onclick="useSuggestedPrompt(this)" class="ai-suggest-chip">Oceanfront villas in Malibu under $25M</button>
      <button type="button" onclick="useSuggestedPrompt(this)" class="ai-suggest-chip">Best Dubai investments 2026</button>
      <button type="button" onclick="useSuggestedPrompt(this)" class="ai-suggest-chip">Beverly Hills vs Aspen</button>
    </div>
    <div class="ai-panel-input-row">
      <input id="chat-input" type="text" placeholder="Ask anything or give a command..." maxlength="2000"
        aria-label="Message to Atconiz AI"
        onkeydown="if(event.key==='Enter'){event.preventDefault();sendChatMessage();}">
      <button type="button" onclick="sendChatMessage()" class="ai-send-btn" aria-label="Send message">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  // Gentle entrance
  requestAnimationFrame(() => panel.classList.add("ai-panel-visible"));

  // Make title bar draggable
  enableAIPanelDrag(panel);

  setTimeout(() => {
    const container = document.getElementById("chat-messages");
    if (container && container.children.length === 0) {
      addChatMessage(
        "ai",
        "Hello! I'm Atconiz AI — your private real-estate intelligence layer, powered by Gemini 3.6 Flash. I can help with valuations, market insights, lifestyle fit, and investment framing. How can I assist you today?"
      );
    }
    document.getElementById("chat-input")?.focus();
  }, 280);
}

function minimizeAIPanel() {
  const panel = document.getElementById("atconiz-ai-panel");
  if (!panel) return;
  _aiPanelMinimized = !_aiPanelMinimized;
  panel.classList.toggle("ai-panel-minimized", _aiPanelMinimized);
}

function closeAIPanel() {
  const panel = document.getElementById("atconiz-ai-panel");
  if (!panel) return;
  panel.classList.remove("ai-panel-visible");
  panel.classList.add("ai-panel-hidden");
  setTimeout(() => panel.remove(), 220);
  _aiPanelMinimized = false;
}

function enableAIPanelDrag(panel) {
  const bar = panel.querySelector("#ai-panel-drag");
  if (!bar) return;
  let dragging = false;
  let startX = 0, startY = 0, origX = 0, origY = 0;

  bar.addEventListener("mousedown", (e) => {
    if (e.target.closest(".ai-panel-btn")) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    origX = rect.left;
    origY = rect.top;
    panel.style.transition = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = Math.max(8, origX + dx) + "px";
    panel.style.top = Math.max(8, origY + dy) + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = "";
  });
}

function useSuggestedPrompt(el) {
  const input = document.getElementById("chat-input");
  if (input) {
    input.value = el.textContent.trim();
    sendChatMessage();
  }
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
  if (!messagesContainer) {
    input.disabled = false;
    return;
  }

  const typingDiv = document.createElement("div");
  typingDiv.className = "chat-message ai";
  typingDiv.id = "typing-indicator";
  typingDiv.setAttribute("aria-busy", "true");
  typingDiv.style.opacity = "0.85";
  typingDiv.innerHTML =
    '<span class="thinking-dots">Atconiz is thinking<span>.</span><span>.</span><span>.</span></span>';
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
    try {
      data = await response.json();
    } catch {
      addChatMessage(
        "ai",
        "Server returned an invalid response (status " + response.status + "). Please try again."
      );
      return;
    }
    if (data.reply) addChatMessage("ai", data.reply);
    else if (data.error) addChatMessage("ai", data.error);
    else
      addChatMessage(
        "ai",
        "Sorry, I couldn't get a response right now (status " + response.status + ")."
      );
  } catch (error) {
    document.getElementById("typing-indicator")?.remove();
    addChatMessage(
      "ai",
      "Network error: Could not reach Atconiz AI. Please check your connection or try again later."
    );
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
