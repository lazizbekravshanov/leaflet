# 🍃 Leaflet

A Goodreads alternative, built as a deep learning project: data structures,
algorithms, system design, and database design through real implementation —
no shortcuts, no auth libraries, raw SQL where the query plans matter.

- **[LEARNING.md](LEARNING.md)** — what each feature teaches + self-test questions
- **[ROADMAP.md](ROADMAP.md)** — the six phases ahead (counters, feed ranking, FTS, Redis, recommendations)
- **[prisma/schema.prisma](prisma/schema.prisma)** — the data model, with every index and tradeoff explained inline

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind v4 · PostgreSQL ·
Prisma 7 · Docker Compose locally, Vercel + Neon in production.

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
   Click ♥ to like (optimistic), "read more" on long reviews, **Load more**
   for cursor pagination.
2. **Search bar** (navbar) — try `murakami` or `dune`; trigram-indexed raw SQL.
3. **Click a book** — average rating, shelf buttons (Want to Read / Reading /
   Read — moving between them is transactional), reviews with comments
   (💬 expands; post one, delete yours), and the write-a-review form with
   5-star input (resubmitting edits in place).
4. **/people** — follow/unfollow; the feed reshapes instantly.
5. **Click a username** — profile with bio, follower counts, shelves and
   reviews tabs.
6. **/shelves** — your three shelves with covers. Log out via the avatar menu.

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
the point it's made (start in `src/services/auth.service.ts`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `start` | production build / serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | create/apply migrations (dev) |
| `npm run db:deploy` | apply migrations (prod/Neon) |
| `npm run db:seed` | seed books + demo users (idempotent) |
| `npm run db:studio` | browse the database |
| `npm run db:fetch-books` | refresh the Open Library snapshot (network) |

## Deploying

1. Create a Neon database, put its connection string in Vercel as `DATABASE_URL`.
2. `npm run db:deploy && npm run db:seed` against that URL once.
3. `vercel deploy` (or connect the GitHub repo).
