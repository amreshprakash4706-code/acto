# Atconiz — AI Real Estate Intelligence Platform

Premium, production-ready luxury real-estate intelligence platform powered by Gemini.

**Version 3.2** — Full modular architecture, security hardening, accessibility, and performance upgrades.

## Structure

```
atconiz/
├── index.html              # Semantic SPA markup + SEO
├── styles.css              # Design system (tokens, components, a11y)
├── properties.js           # Seeded data + global state
├── helpers.js              # escapeHtml, formatPrice, debounce, toast
├── js/
│   ├── core.js             # Nav, theme, views, modals
│   ├── cards.js            # Cards, filters, favorites, compare
│   ├── details.js          # Property details, reviews, viewings
│   ├── chat.js             # AI chat, valuation, investment
│   ├── calculators.js      # Global price + mortgage calculators
│   └── dashboards.js       # Dashboards, content, boot
├── api/
│   ├── chat.js             # Gemini AI (rate-limited, injection guards)
│   └── hello.js            # Health check
├── vercel.json             # Security headers + CSP + caching
├── package.json
└── README.md
```

## Key Features

- 100 curated luxury properties with 3D tilt cards (reduced-motion aware)
- Favorites, compare (up to 3), advanced filters
- AI Property Valuation + Investment projections
- Global Land & Property Price Calculator (20+ currencies)
- Full mortgage calculator with amortization
- Multi-role dashboards (User / Agent / Admin / Analytics)
- Atconiz AI chat (Gemini with model fallback + rate limiting)
- Dark / Light theme with system preference awareness
- Fully keyboard accessible modals with focus trap
- XSS-safe rendering for all dynamic content

## Running locally

```bash
npm install
npx vercel dev
# or pure static
npx serve .
```

Set `GEMINI_API_KEY` in `.env` (see `.env.example`) or in the Vercel dashboard.

## Security

- HTML escaping on all dynamic content
- Prompt-injection guards on the AI endpoint
- In-memory rate limiting (20 req/min/IP)
- CSP, HSTS, X-Frame-Options, Permissions-Policy via `vercel.json`
- Input length limits and sanitization

## Accessibility

- Skip link, focus-visible, modal focus trap + return focus
- Proper `<button>` elements and ARIA roles
- Live regions for toasts and chat
- `prefers-reduced-motion` respected (particles, tilt, counters)
- Keyboard navigation throughout

## Deployment

Optimized for Vercel. Security headers are configured in `vercel.json`.

---

Built with precision.
