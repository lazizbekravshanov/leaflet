# 🍃 Leaflet

A Goodreads alternative, built as a deep learning project: data structures,
algorithms, system design, and database design through real implementation —
no shortcuts, no auth libraries, raw SQL where the query plans matter.

- **[LEARNING.md](LEARNING.md)** — what each feature teaches + self-test questions
- **[ROADMAP.md](ROADMAP.md)** — the six phases ahead (feed ranking, recommendations, Redis, FTS)
- **[prisma/schema.prisma](prisma/schema.prisma)** — the data model, with every index and tradeoff explained inline

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind · PostgreSQL ·
Prisma 7 · deployed on Vercel + Neon.

## Getting started

```bash
npm install
cp .env.example .env        # local default works as-is
docker compose up -d        # local PostgreSQL 17
npm run db:migrate          # apply migrations (+ generates the client)
npm run db:seed             # 50 books from the committed Open Library snapshot
npm run dev
```

Open http://localhost:3000 — sign up, search "dune", shelve it, review it.

## Architecture

```
src/
  app/            # routes: pages (server components) + api/ route handlers
  components/     # UI components (client components only where interactive)
  services/       # business logic — no HTTP, no Next.js imports
  repositories/   # data access — the only layer that touches Prisma
  lib/            # db client, errors, validation, cookies, csrf
prisma/
  schema.prisma   # data model (annotated)
  migrations/     # SQL, including hand-written constraints & trgm indexes
  seed.ts         # idempotent load from seed-data/books.json
  fetch-books.ts  # one-time Open Library fetch that produced the snapshot
```

Dependencies point one way: `app → services → repositories → Prisma`.
Route handlers are thin controllers (parse → service → respond); services
throw typed errors that `src/lib/api.ts` maps to status codes in one place.
That seam is deliberate — the API layer can be extracted into a standalone
service later without touching business logic.

Auth is sessions-from-scratch: bcrypt, a `sessions` table storing SHA-256
token hashes, httpOnly/SameSite=Lax cookies, Origin-header CSRF checks, and
session rotation on login. Every security decision is commented at the point
it's made (start in `src/services/auth.service.ts`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `start` | production build / serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | create/apply migrations (dev) |
| `npm run db:deploy` | apply migrations (prod/Neon) |
| `npm run db:seed` | seed 50 books (idempotent) |
| `npm run db:studio` | browse the database |
| `npm run db:fetch-books` | refresh the Open Library snapshot (network) |

## Deploying

1. Create a Neon database, put its connection string in Vercel as `DATABASE_URL`.
2. `npm run db:deploy && npm run db:seed` against that URL once.
3. `vercel deploy` (or connect the GitHub repo).
