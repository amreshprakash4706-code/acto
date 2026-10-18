# Atconiz 5 — architecture

Luxury real-estate intelligence platform rebuilt on TanStack Start.

## Runtime

- TanStack Start + React 19 (preview on port 8080)
- Better Auth (Google, X, email/password)
- Postgres via `@/lib/db` (Neon in production, PGLite in preview)
- xAI `grok-4.5` for Intelligence (server-only, `XAI_API_KEY`)

The previous Express + Prisma + Gemini stack cannot run on this host. Product
behaviour is preserved and expanded: catalog, favorites, reviews, viewings,
contact, calculators, dashboards, AI — plus valuation, CRM, markets, compare,
notifications, audit, and role-aware workspaces.

## Data

Schema: `migrations/0002_atconiz.sql` plus `migrations/0003_desk.sql` (advisor threads, messages, agent tasks). Catalog seed: `src/lib/atconiz/catalog.ts`
inserted on first read, marked `SEED_DEVELOPMENT`. Never presented as live MLS.

`user_id` is TEXT. Per-user queries use `authMiddleware` and `context.userId`.

## Intelligence

`src/lib/fn/ai.ts` — tool loop over catalog search, property fetch, valuation
engine, calculators, market snapshot. Model cannot invent inventory. Daily cap
40 calls per user.

Valuation (`src/lib/atconiz/valuation.ts`) is comparable ppsf + adjustments,
with land-rate fallback. Confidence and assumptions are returned.

## What is not wired (credentials / sandbox)

- Stripe / card checkout
- Transactional email / web push delivery
- Object storage uploads
- Redis / BullMQ (in-request notifications instead)
- pgvector / PostGIS (PGLite has no extensions)

Interfaces and durable state exist so those providers can attach without a rewrite.
