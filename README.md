# Atconiz — Premium AI Real Estate Intelligence Platform

> The most advanced, luxurious real estate platform powered by Gemini AI.  
> Built with precision by **13-year-old Amresh**.

Atconiz is a production-ready, single-file frontend + serverless backend platform that feels like it was built by a team at OpenAI, Apple, or Linear. It combines ultra-premium design, powerful AI tools, and real estate functionality at the highest level.

---

## ✨ Key Highlights

- **Stunning Luxury UI** — 3D tilt property cards, animated navigation, premium glassmorphism, micro-interactions
- **Gemini-Powered AI** — Full chat assistant using `gemini-2.5-flash` with strong system prompt + safety
- **Advanced Tools** — AI Valuation, 10-year Investment Analysis, Global Land Price Calculator (multi-currency), Mortgage Calculator with amortization
- **100 Curated Properties** — Realistic high-end listings across the world
- **Full Dashboards** — User, Agent, Admin & Analytics views
- **Mobile-First & Accessible** — Excellent touch experience + ARIA support
- **Zero Dependencies** (Frontend) — Single optimized `index.html`

---

## 🚀 Quick Start (Recommended: Vercel)

### 1. Deploy to Vercel

```bash
# Clone or upload the project
vercel
```

### 2. Add Environment Variable

In Vercel Dashboard → Project Settings → Environment Variables:

| Name             | Value                      |
|------------------|----------------------------|
| `GEMINI_API_KEY` | `your_gemini_api_key_here` |

Get a free key at: https://aistudio.google.com/apikey

### 3. Done

The `/api/chat` endpoint automatically connects to Gemini with a professional Atconiz personality.

---

## 🛠 Local Development

```bash
npm install
vercel dev          # Recommended (runs both frontend + API)
```

Or for frontend only:

```bash
# Just open index.html in browser
open index.html
```

---

## 📁 Project Structure

```
.
├── api/
│   └── chat.js              # Gemini backend (Vercel serverless) — improved
├── index.html               # Complete premium single-file frontend
├── package.json
├── package-lock.json
├── vercel.json              # Routing + CORS
├── .env.example             # Template for API key
├── .gitignore
└── README.md
```

---

## 🧠 AI Integration (Improved)

The chat uses the official Google Gemini SDK with:

- Strong system prompt (Atconiz personality)
- Input validation & length limits
- CORS headers
- Safe error messages
- XSS protection on the frontend

```js
// api/chat.js (key parts)
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: message,
  config: {
    systemInstruction: SYSTEM_PROMPT,   // Makes it always act as Atconiz AI
    temperature: 0.7,
    maxOutputTokens: 1024,
  },
});
```

---

## 🔥 Major Features

| Feature                    | Status      | Notes |
|---------------------------|-------------|-------|
| AI Chat (Gemini)          | ✅ Full     | System prompt + safety + CORS |
| Property Cards            | ✅ Premium  | 3D tilt, AI PICK badges, micro-interactions |
| Navigation                | ✅ Premium  | Animated indicator + full mobile menu |
| Global Land Calculator    | ✅ Advanced | 20+ countries, multi-currency, land mode |
| Mortgage + Amortization   | ✅ Complete | Charts + schedule |
| Dashboards                | ✅ 4 Views  | User, Agent, Admin, Analytics |
| Favorites + Compare       | ✅ Full     | Up to 3 properties |
| Reviews & Scheduling      | ✅ Full     | Persistent via localStorage |
| Theme Switcher            | ✅ Smooth   | Dark/Light with persistence |

---

## 🎨 Design Philosophy

Atconiz follows the highest standards of modern luxury interfaces:

- **Inspired by**: OpenAI, Apple, Linear, Arc, Stripe, Tesla
- **Typography**: SF Pro system stack with refined letter-spacing
- **Motion**: Subtle, purposeful animations only (3D tilt, fade, scale, parallax)
- **Glassmorphism + Premium Shadows**
- **Performance-first**: Lazy loading, RAF animations, minimal reflows
- **Accessibility**: ARIA labels, keyboard navigation, focus states, Escape to close

---

## 📱 Mobile Experience

- Full hamburger menu with smooth animations
- Touch-friendly 3D card tilt (disabled on mobile for performance)
- Optimized spacing and tap targets
- Excellent scroll performance

---

## 🛡 Security Improvements (v2.1)

- XSS protection on all chat messages
- Input length validation
- Proper CORS
- No raw innerHTML of untrusted content
- Graceful error handling without leaking secrets

---

## 👨‍💻 Built With

- Pure HTML + CSS + JavaScript (no frameworks)
- Google Gemini 2.5 Flash
- Vercel Serverless Functions
- Unsplash for high-quality imagery

---

## 📄 License

Personal / Portfolio use. Feel free to use as inspiration.

---

**Made with precision and obsession for detail by a 13-year-old.**

If you want even more features (real maps, real AI valuation, payment integration, etc.), just say the word.

---

**Current Version**: Premium v2.1 (July 2026)  
**Status**: Production Ready ✅  
**Builder**: Amresh (13)
