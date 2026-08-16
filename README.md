# Atconiz — Production Full-Stack Real-Estate Intelligence Platform

**Version 4.0.0**

Luxury real-estate intelligence platform with a real Node.js backend, PostgreSQL persistence, authentication, RBAC, and a secure Gemini AI gateway.

This is **not** a demo or sample catalog application. The previous client-side seeded inventory and localStorage-only user data layer have been replaced by a modular Express + Prisma + PostgreSQL architecture.

## Architecture

```
Browser (vanilla SPA — existing Atconiz UI preserved)
        │
        ▼
Express Node.js server (server/)
        │
        ├── REST API (/api/*)
        ├── Static SPA delivery
        ├── Auth (JWT + refresh tokens, bcrypt)
        ├── RBAC (USER / AGENT / ADMIN)
        ├── Secure AI gateway (Gemini key stays server-side)
        └── PostgreSQL (Prisma)
```

### Key principles

- **No fake inventory** — Production database starts empty (or contains only records you create). Development seed data is explicitly marked `SEED_DEVELOPMENT` and must never be presented as live market inventory.
- **No localStorage as source of truth** — Favorites, reviews, viewings, calculations, and contact requests are persisted in PostgreSQL for authenticated users.
- **No client-side authorization** — All privileged operations are enforced on the backend.
- **No secret exposure** — `GEMINI_API_KEY`, JWT secrets, and database credentials never leave the server.
- **Truthful empty states** — Missing data returns proper API errors / empty collections, not fabricated metrics.

## Project structure

```
atconiz/
├── index.html, styles.css, helpers.js, properties.js   # Frontend (preserved visual identity)
├── js/
│   ├── api/client.js                                   # Central API client
│   ├── core.js, cards.js, details.js, chat.js, ...
├── server/
│   ├── app.js, server.js
│   ├── config/
│   ├── controllers/, routes/, services/, middleware/
│   ├── validators/, ai/, db/schema.prisma
│   ├── logging/, utils/, tests/
├── docker-compose.yml                                  # Local Postgres
├── .env.example
├── package.json
└── README.md
```

## Requirements

- Node.js ≥ 20
- PostgreSQL 14+ (local or managed)
- Optional: Docker (for local Postgres via docker-compose)

## Quick start (development)

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (example with Docker)
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, SESSION_SECRET, optionally GEMINI_API_KEY

# 4. Generate Prisma client & run migrations
npx prisma generate --schema=server/db/schema.prisma
npx prisma migrate dev --schema=server/db/schema.prisma --name init

# 5. (Optional) Seed development accounts + one marked seed property
npm run db:seed

# 6. Start the server
npm run dev
```

Open http://localhost:3000

### Seed accounts (development only)

| Email                 | Password      | Role  |
|-----------------------|---------------|-------|
| admin@atconiz.local   | Password123!  | ADMIN |
| agent@atconiz.local   | Password123!  | AGENT |
| user@atconiz.local    | Password123!  | USER  |

These are **development helpers**. Do not use them in production.

## API overview

Consistent response envelope:

```json
{ "success": true, "data": { ... } }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

### Auth

- `POST /api/auth/register` — email, password, optional name/role (USER|AGENT)
- `POST /api/auth/login`
- `POST /api/auth/logout` (authenticated)
- `GET  /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/change-password`

### Properties

- `GET    /api/properties` — filter, sort, paginate (public ACTIVE listings)
- `GET    /api/properties/:id`
- `POST   /api/properties` — AGENT/ADMIN
- `PATCH  /api/properties/:id` — owner or ADMIN
- `DELETE /api/properties/:id` — soft-delete, owner or ADMIN

### User data

- `GET/POST/DELETE /api/favorites`
- `GET/POST /api/reviews` (+ admin moderate)
- `GET/POST/PATCH /api/viewings`
- `POST/GET/PATCH /api/contact-requests`

### AI

- `POST /api/ai/chat` — rate-limited, system prompt isolated, optional property context

### Dashboards

- `GET /api/dashboard/user`
- `GET /api/dashboard/agent`
- `GET /api/dashboard/admin`

### Health

- `GET /api/health` — liveness
- `GET /api/ready` — readiness (DB check)

## Environment variables

See `.env.example`. Critical:

| Variable         | Required (prod) | Description                          |
|------------------|-----------------|--------------------------------------|
| DATABASE_URL     | yes             | PostgreSQL connection string         |
| JWT_SECRET       | yes             | Signing key for access tokens        |
| SESSION_SECRET   | yes             | Reserved / cookie hardening          |
| GEMINI_API_KEY   | no              | Enables AI Studio; otherwise 503     |
| CORS_ORIGINS     | recommended     | Comma-separated allowed origins      |

## Data provenance

Properties and related records carry a `provenance` field:

- `AGENT_CREATED` / `ADMIN_CREATED` / `USER_SUBMITTED`
- `EXTERNAL_SOURCE` (when a real provider is wired)
- `SEED_DEVELOPMENT` (local seed only)
- `REFERENCE` / `UNAVAILABLE`

The UI and API must never label seed or reference data as verified live inventory.

## Security

- Helmet, CORS allow-list, rate limiting (auth / AI / contact / global)
- bcrypt password hashing
- JWT access tokens (short-lived) + refresh tokens stored hashed
- Parameterized queries via Prisma
- Zod request validation
- Centralized operational error handling (no stack traces in production responses)
- Audit log for sensitive actions
- Soft-delete for properties

## Testing

```bash
npm test
```

Current suite covers validators and error classes. Integration tests against a real database can be expanded under `server/tests/`.

## Deployment

Recommended:

1. Managed PostgreSQL (RDS, Neon, Supabase, Cloud SQL, …)
2. Node process (Railway, Render, Fly.io, ECS, Kubernetes, VPS)
3. Reverse proxy / TLS termination
4. Set all production secrets via environment
5. Run `npm run db:migrate` on deploy
6. Optional object storage for property media (interface ready; configure when needed)

The previous Vercel serverless-only model is no longer the primary runtime. The Express server serves both the API and the static SPA.

## Frontend notes

- Visual language, layout, theme, calculators, and accessibility improvements are preserved.
- `js/api/client.js` is the single API surface used by new flows.
- Property catalog is loaded from `GET /api/properties`. Empty results show an honest empty state.
- LocalStorage is retained only for theme preference and temporary offline UX; it is not the authority for favorites/reviews/viewings.

## Remaining intentional limitations

- Object storage uploads (S3/R2) are abstracted but not fully wired to a specific provider until credentials are supplied.
- Email / push notifications are designed (Notification model exists) but delivery providers are not configured.
- Distributed rate limiting (Redis) is optional; in-memory limits apply per process by default.
- Full OpenAPI document can be added; the route modules are the source of truth.

These are configuration/integration gaps, not placeholder core features.

## License

ISC
