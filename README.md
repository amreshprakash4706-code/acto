# Atconiz — AI Real Estate Intelligence Platform

Premium, production-oriented luxury real-estate intelligence platform powered by Gemini.

**Version 3.1** — Design system, accessibility, and performance upgrades applied.

## Structure

```
atconiz/
├── index.html              # Markup + SPA views
├── styles.css              # Full design system (tokens, glass, motion, a11y)
├── properties.js           # Seeded data + global state
├── helpers.js              # formatPrice, debounce, toast
├── app.js                  # All application logic
├── api/
│   ├── chat.js             # Gemini-powered AI assistant
│   └── hello.js            # Health check
├── vercel.json             # Security headers + CSP + caching
├── package.json
└── README.md
```

## Key Features

- 100 curated luxury properties with 3D tilt cards
- Favorites, compare (up to 3), advanced filters
- AI Property Valuation + Investment projections
- Global Land & Property Price Calculator (20+ currencies)
- Full mortgage calculator with amortization
- Multi-role dashboards (User / Agent / Admin / Analytics)
- Atconiz AI chat (Gemini with model fallback)
- Dark / Light theme with system preference awareness
- Fully keyboard accessible modals with focus trap

## Running locally

```bash
npm install
npx vercel dev
# or pure static
npx serve .
```

Set `GEMINI_API_KEY` in `.env` (see `.env.example`) or in the Vercel dashboard.

## Design System

The CSS now uses a proper token system:

- Spacing scale (`--space-*`)
- Radius scale (`--radius-*`)
- Elevation / shadow tokens
- Motion tokens (`--ease-out`, durations)
- Consistent focus rings and reduced-motion support

## Accessibility Highlights

- Skip link
- Focus-visible styles
- Modal focus trap + `aria-modal` + return focus
- Proper `<button>` for primary actions
- Live regions for toasts and chat
- Reduced motion respected

## Deployment

Optimized for Vercel. Security headers (CSP, HSTS, X-Frame-Options, etc.) are configured in `vercel.json`.

---

Built with precision.
