# Vercel deploy checklist (Atconiz v4)

## Fix the "No Output Directory named public" error

1. Open Vercel → your project → **Settings → General → Build & Development Settings**
2. Framework Preset: **Other**
3. Build Command: `npx prisma generate --schema=server/db/schema.prisma`
4. Output Directory: **clear this field completely** (delete `public` if present)
5. Install Command: `npm install`
6. Save → Redeploy

## Required env vars

- DATABASE_URL
- JWT_SECRET
- SESSION_SECRET
- NODE_ENV=production
- CORS_ORIGINS=https://YOUR_APP.vercel.app
- GEMINI_API_KEY (optional)

## Files that make Vercel work

- `api/index.js` — serverless entry (mounts Express)
- `vercel.json` — rewrites `/api/*` to that entry; no `public` output
- Static files (`index.html`, `styles.css`, `js/`, …) served from repo root

## Database

Use Neon (https://neon.tech) free Postgres + connection pooling.
Run migrations from your PC against that DATABASE_URL before first use.
