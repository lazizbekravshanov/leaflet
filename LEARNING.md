# LEARNING.md

A log of what each feature is supposed to teach. For every feature: the data
structures and system design concepts it touches, where to look in the code,
and one question you should be able to answer after building it. If you can't
answer the question, the feature isn't done — reread the code comments.

---

## 1. The schema (prisma/schema.prisma)

**Concepts**
- B-tree indexes: what they can serve (equality, range, leftmost-prefix of a
  composite, ORDER BY in index order) and what they can't (`ILIKE '%x%'`).
- Composite primary keys on join tables vs surrogate ids.
- Normalization: why `Rating` is its own table, why `Author` isn't a column.
- Foreign keys + `ON DELETE CASCADE` as invariant enforcement; the fact that
  Postgres does NOT auto-index the FK side.
- Partial unique indexes (`shelves_one_system_shelf_per_type`) and CHECK
  constraints — things the ORM can't express, written as raw migration SQL.
- Adjacency list: `Follow` is a directed graph stored as edge rows.

**Question:** The book page runs `WHERE book_id = ? ORDER BY created_at DESC`.
Why does the index `(book_id, created_at DESC)` avoid a sort step, and why
would two separate indexes on `book_id` and `created_at` not?

## 2. Sessions & auth (src/services/auth.service.ts, src/lib/auth.ts, src/lib/csrf.ts)

**Concepts**
- Server-side sessions vs JWTs: revocability is the trade.
- Why session tokens are hashed with SHA-256 but passwords with bcrypt —
  entropy decides which hash you need (fast one-way vs deliberately slow).
- Cookie flags: `httpOnly` (XSS can't read), `secure` (no plaintext wire),
  `SameSite=Lax` (CSRF layer 1), expiry as a hint vs the DB as the authority.
- CSRF: why SameSite alone is almost enough, what the Origin check adds.
- Session fixation → rotation on login.
- User enumeration → one generic error + dummy bcrypt compare for timing.
- TOCTOU: why signup catches the unique-violation instead of SELECT-then-INSERT.

**Question:** An attacker steals a full dump of the `sessions` table (not the
cookies). Can they log in as anyone? Walk through exactly what stops them.

## 3. Search (src/repositories/book.repository.ts, the migration's trgm index)

**Concepts**
- Parameterized queries: why `$queryRaw` tagged templates are injection-safe.
- Trigram (pg_trgm) GIN indexes: substring search as an inverted index over
  3-grams; why B-trees can't do leading wildcards.
- Query planner behavior: seq scan beats index scan on tiny tables; plans
  change as data grows. `EXPLAIN ANALYZE` is the tool, not guesswork.
- Correlated scalar subqueries vs JOIN+GROUP BY — same result, different
  plans, different scaling.
- Type mapping at the driver boundary (bigint → BigInt, numeric → string,
  and the `::int` / `::float8` casts that sidestep it).

**Try it** (after `docker compose up -d` and seeding):
```sql
EXPLAIN ANALYZE SELECT * FROM books WHERE title ILIKE '%dune%';
-- then: DROP INDEX books_title_trgm;  and run it again. Put the index back.
```

**Question:** Why does the planner ignore `books_title_trgm` at 50 rows, and
what (roughly) makes it flip to a bitmap index scan as the table grows?

## 4. Shelves (src/services/shelf.service.ts, src/repositories/shelf.repository.ts)

**Concepts**
- Transactions for cross-row invariants: "a book is on at most one system
  shelf" cannot be a constraint, so it's a delete+upsert in one transaction.
- Idempotency: re-shelving is an upsert keyed on the composite PK, so
  double-clicks and retries are harmless.
- Where invariants live: schema constraint > transaction in code > hope.
- The modeling fork: unified Shelf/ShelfItem (chosen) vs a `status` column on
  a UserBook row — what each makes easy and hard.

**Question:** If two requests race to shelve the same book onto READING and
READ, what are the possible end states, and why is "on both shelves" not one
of them?

## 5. Reviews & ratings (src/services/review.service.ts, src/repositories/review.repository.ts)

**Concepts**
- Upsert as edit semantics under `UNIQUE (user_id, book_id)`.
- Multi-table writes in one transaction (review + rating land together).
- Aggregates on a narrow table: `AVG` over `ratings`, not over review rows.
- Two-query merge in JS (reviews + their authors' ratings via a Map) vs a raw
  SQL join — both are on display; know the cost of each.
- Defense in depth: rating range checked in the service AND by a CHECK
  constraint.

**Question:** The review list does 2 queries and a `Map` merge. At what point
does this become an N+1 problem, and why isn't it one here?

## 6. Auth UI & the layered architecture (src/app, src/components, src/services, src/repositories)

**Concepts**
- Dependency direction: app → services → repositories → Prisma. Services
  never import `next/*` — that's the seam where the API layer could be
  extracted into a standalone service.
- Errors as types: services throw `ConflictError`; exactly one place
  (src/lib/api.ts) turns that into a 409.
- Server components read the session on the server (no auth flash); client
  components exist only where there's interactivity (forms, buttons).
- `router.refresh()` as the cache-invalidation handshake between client
  mutations and server-rendered UI.

**Question:** To expose the exact same signup/login/shelve/review API from a
standalone Express service tomorrow, which files move, which get rewritten,
and which are untouched? (If the answer isn't "routes get rewritten, services
and repositories move, UI is untouched", the layering leaked.)

## 7. Seeding & external data (prisma/fetch-books.ts, prisma/seed.ts)

**Concepts**
- ETL separation: fetch (network, flaky, run once) is a different program
  from load (deterministic, idempotent, run anywhere).
- Idempotent loads via upsert on a natural key (the Open Library id).
- Why the snapshot is committed: deterministic seeds, offline CI.

**Question:** If you run `npm run db:seed` five times, how many rows are in
`books` and `book_authors`, and which schema features guarantee that?
