# Atconiz — Premium AI Real Estate Intelligence Platform

> The most advanced, luxurious real estate platform powered by Gemini AI.

Atconiz is a production-ready, single-file frontend + serverless backend platform that feels like it was built by a team at OpenAI, Apple, or Linear. It combines ultra-premium design, powerful AI tools, and real estate functionality at the highest level.

---

## ✨ Key Highlights

- **Stunning Luxury UI** — 3D tilt property cards, animated navigation, premium glassmorphism, micro-interactions
- **Gemini-Powered AI** — Full chat assistant using `gemini-2.5-flash` with suggested prompts
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

| Name              | Value                        |
|-------------------|------------------------------|
| `GEMINI_API_KEY`  | `your_gemini_api_key_here`   |

### 3. Done

The `/api/chat` endpoint automatically connects to Gemini.

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
│   └── chat.js              # Gemini backend (Vercel serverless)
├── index.html               # Complete premium single-file frontend
├── package.json
├── package-lock.json
├── README.md
└── .env.example
```

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

## 🔥 Major Features

| Feature                    | Status      | Notes |
|---------------------------|-------------|-------|
| AI Chat (Gemini)          | ✅ Full     | Streaming-ready + suggested prompts |
| Property Cards            | ✅ Premium  | 3D tilt, AI PICK badges, micro-interactions |
| Navigation                | ✅ Premium  | Animated indicator + full mobile menu |
| Global Land Calculator    | ✅ Advanced | 20+ countries, multi-currency, land mode |
| Mortgage + Amortization   | ✅ Complete | Charts + schedule |
| Dashboards                | ✅ 4 Views  | User, Agent, Admin, Analytics |
| Favorites + Compare       | ✅ Full     | Up to 3 properties |
| Reviews & Scheduling      | ✅ Full     | Persistent via localStorage |
| Theme Switcher            | ✅ Smooth   | Dark/Light with persistence |

---

## 🧠 AI Integration

The chat uses the official Google Gemini SDK:

```js
// api/chat.js
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: message,
});
```

**Suggested prompts** are included in the UI for better UX.

---

## 📱 Mobile Experience

- Full hamburger menu with smooth animations
- Touch-friendly 3D card tilt (disabled on mobile for performance)
- Optimized spacing and tap targets
- Excellent scroll performance

---

## 🏆 What Makes Atconiz Special

- Feels **expensive** and **premium** from the first second
- Every interaction has thoughtful polish
- Real Gemini integration (not simulated)
- Extremely fast (single HTML file)
- Production-ready code quality

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

**Made with precision and obsession for detail.**

If you want even more features (360° viewers, real maps, payment integration, etc.), just say the word.

---

**Current Version**: Premium v2.0 (July 2026)  
**Status**: Production Ready ✅
