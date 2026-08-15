# Atconiz — AI Real Estate Intelligence Platform

Luxury real-estate intelligence platform with a sample property catalog, transparent reference calculators, AI chat (Gemini), and multi-role dashboards.

**Version 3.5** — Production hardening focused on truthful data semantics, API security, deterministic financial estimates, and honest empty/local states.

## Structure

```
atconiz/
├── index.html              # Semantic SPA markup
├── styles.css              # Design system (tokens, components, a11y)
├── properties.js           # Seeded sample catalog + client state
├── helpers.js              # escapeHtml, formatPrice, debounce, toast, etc.
├── js/
│   ├── core.js             # Nav, theme, views, modals
│   ├── cards.js            # Cards, filters, favorites, compare
│   ├── details.js          # Property details, reviews, viewings
│   ├── chat.js             # AI chat panel, valuation estimate, investment
│   ├── calculators.js      # Global price + mortgage calculators
│   └── dashboards.js       # Dashboards, content, boot
├── api/
│   ├── chat.js             # Gemini AI (rate-limited, no secret leakage)
│   └── hello.js            # Health check (status only)
├── scripts/
│   └── validate.js         # Static validation surface
├── vercel.json             # Security headers + CSP + caching
├── package.json
└── README.md
```

## Data semantics (important)

- The default **100 properties** are **seed/sample data** generated deterministically for demonstration.
- They are **not** verified live listings.
- Dashboard metrics and charts are derived from the **local catalog** only (or show “local / not connected”).
- Valuation and global price outputs are **reference estimates** with transparent factors — **not** formal appraisals and **not** claimed “real market matched” percentages.
- Favorites, reviews, viewing requests, contact drafts, and saved estimates persist in **browser localStorage** only unless you connect a real backend.
- Contact form is **local-only** (drafts stored in the browser; nothing is sent).

## Key features

- Sample luxury catalog with filters, search (title, location, type, description, amenities), sort, favorites, compare (up to 3)
- AI chat via `/api/chat` (Gemini cascade, rate limiting, injection guards)
- Deterministic property value estimate and global land/price calculator
- Mortgage calculator with zero-interest handling and amortization preview
- Multi-role dashboard panels using real catalog-derived stats
- Dark / light theme, keyboard-accessible modals with focus trap
- XSS-safe rendering (`escapeHtml` / `textContent`) for dynamic content

## Running locally

```bash
npm install
npx vercel dev
# or static only (AI endpoint unavailable without serverless)
npx serve .
```

Set `GEMINI_API_KEY` in `.env` (see `.env.example`) or in the Vercel project environment variables (Production + Preview).

```bash
npm run check   # static validation (syntax, integrity, API safety)
```

## Security

- HTML escaping on dynamic content
- AI system prompt and API key stay server-side
- GET health endpoints return status only (no key presence, no model list)
- No wildcard CORS on the chat API
- Request size limits, rate limiting (in-memory per instance — see limitations below)
- CSP, HSTS, X-Frame-Options, Permissions-Policy via `vercel.json`
- Prompt-injection pattern checks plus system/user separation in the prompt

### Rate limiting note

The in-memory rate limiter is appropriate for single-instance or light traffic. On multi-instance serverless it is best-effort per instance. For durable distributed limiting, front the API with a shared store (e.g. Redis / Upstash) or edge rate limits.

## Accessibility

- Skip-friendly structure, focus-visible styles, modal focus trap + restore
- Semantic buttons, ARIA where needed, live regions for toasts and chat
- `prefers-reduced-motion` respected (particles, tilt, counters)
- Keyboard navigation for cards, compare, dialogs

## Deployment

Optimized for Vercel. Security headers are configured in `vercel.json`.

Required environment variable:

| Variable         | Required | Description                |
|------------------|----------|----------------------------|
| `GEMINI_API_KEY` | For AI  | Google AI Studio API key   |

Do not commit a real `.env` file.

## Version notes (3.5)

- Fixed DOM-XSS class: removed user-controlled values from inline JS attributes (calculators)
- Gemini AI: current production models (gemini-3.7/3.6/3.5/2.5-flash), proper `systemInstruction` separation
- Per-attempt timeout/AbortController — no reused rejected timeout promises
- Rate limiting: concurrent protection + improved IP extraction for Vercel
- Deterministic catalog: fixed reference epoch (no Date.now in seed generation)
- Explicit `dataStatus: sample` / currency provenance metadata
- Viewing requests use status `Requested` (honest local-only semantics)
- User dashboard stats derived from local favorites/visits (no fake metrics)
- SAMPLE badges on property cards; expanded validation suite (50 checks)

## Version notes (3.4)

- Removed invented production metrics (user counts, accuracy %, “match” badges)
- Calculators and AI valuation are deterministic with explicit assumptions
- Sample data and local-only persistence clearly labeled
- API chat no longer exposes models or key presence on GET; CORS tightened
- Dashboards/charts use catalog-derived data or truthful empty/local states
- Contact form no longer claims messages were delivered
- Account menu reflects guest/local session (no fake auth UX)
- Added `scripts/validate.js` integrity checks

---

Built with precision.
