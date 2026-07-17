# Atconiz v3.0 — Production-Grade AI Real Estate Intelligence

Luxury real-estate platform powered by Gemini. Single-file frontend + Vercel serverless API.

Built originally by Amresh. Hardened and redesigned for production quality.

## Highlights (v3 improvements)

- Stronger system prompt & multi-model fallback for the AI assistant
- XSS-hardened chat rendering + input length limits + basic injection guard
- SEO: meta description, Open Graph, Twitter cards, theme-color, color-scheme
- Accessibility: skip link, focus-visible, prefers-reduced-motion, aria-live chat, semantic landmarks
- Performance: seeded property generation, particle canvas pauses when tab hidden, lazy images, preconnect
- Security headers via vercel.json
- Cleaner package metadata and routing

## Quick Start

```bash
npm install
# Add GEMINI_API_KEY to .env or Vercel dashboard
vercel dev
```

Deploy:

```bash
vercel --prod
```

Set environment variable:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | from https://aistudio.google.com/apikey |

## Architecture

- `index.html` — complete SPA (HTML + CSS + JS)
- `api/chat.js` — Gemini proxy with personality, validation, fallback models
- `vercel.json` — rewrites + security headers

## Features

- 100 curated luxury properties (deterministic generation)
- AI Chat (Gemini)
- AI Valuation, 10-year Investment Analysis
- Global Land & Property Price Calculator (multi-currency)
- Full Mortgage Calculator + amortization
- User / Agent / Admin / Analytics dashboards
- Favorites, Compare, Reviews, Scheduling (localStorage)
- Dark / Light theme

## License

Personal / portfolio use.
