# 🍃 Leaflet

A Goodreads alternative, built as a deep learning project: data structures,
algorithms, system design, and database design through real implementation —
no shortcuts, no auth libraries, raw SQL where the query plans matter.

- **[LEARNING.md](LEARNING.md)** — what each feature teaches + self-test questions
- **[ROADMAP.md](ROADMAP.md)** — the six-phase plan, now delivered (pagination, counters,
  feed ranking, full-text search, Postgres-backed caching + rate limiting, recommendations)
- **[DECISIONS.md](DECISIONS.md)** — the design-language constraints the UI holds to
- **[prisma/schema.prisma](prisma/schema.prisma)** — the data model, with every index and tradeoff explained inline

## What's built

All six roadmap phases plus a hand-rolled account system, a test suite, and CI:

- **Pagination** — keyset (not OFFSET) cursors on the feed; offset where it's bounded.
- **Denormalized counters** — like / follower / review / comment counts maintained at
  write time in the same statement as the row, so reads skip `COUNT(*)`.
- **Ranked feed** — a Latest / Top toggle; "Top" scores engagement vs. recency over the
  same fan-out activity set, paginated under a frozen clock so decay can't reorder mid-scroll.
- **Full-text search** — Postgres FTS (`tsvector` + `websearch_to_tsquery`, ranked) with a
  pg_trgm trigram fallback for typos; raw SQL.
- **Caching & rate limiting** — rating aggregates materialized as columns, recomputed
  in-transaction on every rating write (synchronous invalidation); a Postgres-backed
  sliding-window limiter guards login before bcrypt runs.
- **Follow recommendations** — friends-of-friends + taste (Jaccard over READ shelves),
  precomputed into a table and lazily refreshed on read; surfaced as "Who to follow".
- **Account lifecycle** — email verification, enumeration-safe password reset, and
  change-password, on single-use SHA-256-hashed expiring tokens. Pluggable mailer
  (Resend, or console when unconfigured). Still no auth library.
- **Tests + CI** — a Vitest unit + integration suite against a throwaway Postgres, run on
  every push by GitHub Actions (migrate → lint → tsc → test → build).

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind v4 · PostgreSQL ·
Prisma 7 · Vitest + GitHub Actions CI · Docker Compose locally, Vercel + Neon
in production.

## Run it

```bash
npm install
cp .env.example .env        # local default works as-is
docker compose up -d        # PostgreSQL 17 on :5432
npm run db:migrate          # apply migrations (+ generates the client)
npm run db:seed             # 50 books + 8 demo users with reviews/follows
npm run dev                 # http://localhost:3000
```

### 60-second tour

Log in as **amelia@leaflet.demo** / **password123** (any demo user works:
ben, chloe, dmitri, elena, felix, grace, hugo — same password, all
`<name>@leaflet.demo`).

1. **/** — your feed: reviews and shelvings from people amelia follows.
   Toggle **Latest / Top** (chronological vs. engagement-ranked), click ♥ to
   like (optimistic), "read more" on long reviews, **Load more** for keyset
   cursor pagination.
2. **Search bar** (navbar) — try `murakami` or `dune`; trigram-indexed raw SQL.
3. **Click a book** — average rating, shelf buttons (Want to Read / Reading /
   Read — moving between them is transactional), reviews with comments
   (💬 expands; post one, delete yours), and the write-a-review form with
   5-star input (resubmitting edits in place).
4. **/people** — follow/unfollow (the feed reshapes instantly) and a
   **Who to follow** panel from friends-of-friends + shared reading taste.
5. **Click a username** — profile with bio, follower counts, shelves and
   reviews tabs.
6. **/shelves** — your three shelves with covers. Log out via the avatar menu.
7. **Accounts** — sign up to get a verification email (logged to the server
   console when no mailer is configured); **/forgot-password** and
   **/settings** cover reset and change-password.

## Architecture

```
src/
  app/            # routes: pages (server components) + api/ route handlers
  components/     # UI components (client components only where interactive)
  services/       # business logic — no HTTP, no Next.js imports
  repositories/   # data access — the only layer that touches Prisma
  lib/            # db client, errors, validation, cookies, csrf
  middleware.ts   # UX-level auth redirects (cookie presence only)
prisma/
  schema.prisma   # data model (annotated)
  migrations/     # SQL, including hand-written constraints & trgm indexes
  seed.ts         # idempotent load: 50-book snapshot + demo content
  fetch-books.ts  # one-time Open Library fetch that produced the snapshot
```

Dependencies point one way: `app → services → repositories → Prisma`.
Route handlers are thin controllers (parse → service → respond); services
throw typed errors that `src/lib/api.ts` maps to status codes in one place.
That seam is deliberate — the API layer can be extracted into a standalone
service later without touching business logic.

The two queries worth studying live in
`src/repositories/feed.repository.ts` (UNION ALL feed with keyset cursor)
and `src/repositories/book.repository.ts` (trigram search) — both raw SQL via
`$queryRaw`, both annotated with the EXPLAIN homework.

Auth is sessions-from-scratch: bcrypt (cost 12), a `sessions` table storing
SHA-256 token hashes, httpOnly/SameSite=Lax cookies, Origin-header CSRF
checks, session rotation on login. Every security decision is commented at
the point it's made (start in `src/services/auth.service.ts`). The account
lifecycle (`auth_tokens` table, `src/lib/mail.ts`) layers verification, reset,
and change-password on top — single-use, expiring, SHA-256-hashed tokens — and
a Postgres sliding-window rate limiter (`src/lib/rate-limit.ts`) fronts login
before bcrypt to close the DoS hole.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `start` | production build / serve |
| `npm run lint` | ESLint |
| `npm test` / `test:watch` | Vitest unit + integration suite |
| `npm run db:migrate` | create/apply migrations (dev) |
| `npm run db:deploy` | apply migrations (prod/Neon) |
| `npm run db:seed` | seed books + demo users (idempotent) |
| `npm run db:studio` | browse the database |
| `npm run db:fetch-books` | refresh the Open Library snapshot (network) |

## Deploying

Push to `main` auto-deploys via the connected GitHub repo. The Vercel build runs
**`prisma generate` only — not `migrate deploy`** — so **applying migrations to
Neon is a deliberate manual step**, done over the DIRECT (non-pooled) connection
*before* the dependent code goes live, never against the live app blind.

1. Create a Neon database, put its connection string in Vercel as `DATABASE_URL`.
2. `npm run db:deploy && npm run db:seed` against that URL once (then re-run
   `db:deploy` for each later migration, before its code reaches `main`).
3. Optional: set `RESEND_API_KEY` + `APP_URL` to send real account emails — see
   `.env.example`. Without them the mailer logs links to the server console.
