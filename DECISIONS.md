# Design decisions — UI/UX session

Judgment calls made while executing the redesign, in the order they came up.

1. **`--ink-tertiary` demoted to placeholders only.** At #AEAEB2 on white it
   measures 2.3:1 — fails WCAG AA for text. The spec listed it for
   "placeholders/meta"; meta text and eyebrow labels use `--ink-secondary`
   (#6E6E73: 4.96:1 on white, 4.6:1 on `--bg-subtle`, both AA) instead.

2. **No red anywhere, including errors.** "No more than one accent color" is
   taken literally: validation and error messages render as plain sentences
   in `--ink` (`role="alert"`/`role="status"` carry the semantics). The copy
   does the work ("Avatar URL must start with https://").

3. **One additive API route despite the no-backend rule.** The spec requires
   a working settings page; no profile-update endpoint existed. Shipping a
   dead "Save changes" button was the worse violation, so `PATCH
   /api/profile` (display name, bio, avatar URL) was added through the
   existing layers. No existing backend file was modified beyond one
   repository/service method each.

4. **Feed SQL gained one column.** The spec's feed item shows "book title +
   author"; the feed query didn't select authors. Added the same
   `string_agg` subquery the search query already uses. Read path only.

5. **Star fractions use an SVG hard-stop gradient.** `linearGradient` with
   two stops at the same offset renders a crisp partial fill — it's a fill
   mask, not a visible gradient, so it doesn't violate the gradient ban.

6. **Skeletons live in `<Suspense>` fallbacks, not `loading.tsx`.**
   Segment-level loading files make Next stream a 200 status before
   `notFound()`/`redirect()` resolve. Page-scoped Suspense keeps real HTTP
   semantics (404s are 404s) and still shows instant skeletons.

7. **Profile tabs are client-side toggles, not URL state.** The spec demands
   an animated underline sliding between tabs; URL-driven tabs remount the
   page and kill the transition. Both panels arrive server-rendered as
   props; the toggle hides one. (Deep-linking a tab is lost — acceptable for
   two tabs.)

8. **Nav blur kept despite the glassmorphism ban.** The spec's own nav spec
   says "white with slight blur on scroll" — interpreted the ban as covering
   frosted-glass cards/panels, not the navbar it explicitly describes.

9. **Custom avatars render unoptimized.** The settings page accepts any
   https image URL; Next's image optimizer requires a host allowlist.
   `unoptimized` on user avatars avoids both an open proxy and a broken
   allowlist dance. Covers (one known host) stay optimized.

10. **The feed has no page heading.** The wireframe starts at the first
    item; a "Your feed" headline added chrome without information. The nav
    already says where you are.

11. **Verified, not assumed.** Lighthouse accessibility: landing 100, feed
    100 (after fixing avatar links that wrapped an `aria-hidden` monogram
    with no accessible name). Contrast figures in (1) computed from relative
    luminance. No-emoji/no-exclamation checked by script against rendered
    HTML.

# Design decisions — Phase 2 (denormalized counters)

12. **Scoped to `like_count` and `follower_count`/`following_count`, not every
    count in the app.** The roadmap's Phase 2 lesson is the write-time
    maintenance *pattern*; it's fully demonstrated by these. `comment_count`
    (feed), `review_count` (people page), and `shelf_items` counts are the
    identical mechanism and were deliberately left as read-time aggregates so
    one phase stays one lesson, not a sweep. Consequence: the feed still runs a
    `comment_count` subquery and the people page a `_count: { reviews }`
    aggregate — both flagged in code comments so the partial conversion is
    intentional and visible, never an oversight.

13. **`following_count` shipped alongside `follower_count` despite the roadmap
    naming only the latter.** The profile reads both via one `counts()` call;
    denormalizing one but not the other would leave that call half a column read
    and half a `COUNT(*)`. They're maintained in the same follow/unfollow
    statement anyway (one edge, two counters), so it's one transaction either
    way — the symmetric pair is the natural unit.

14. **Maintenance in a single SQL statement, not a Prisma `$transaction` of two
    calls.** A CTE (`WITH ins AS (INSERT … RETURNING) UPDATE …`) is atomic by
    construction and lets the counter delta BE the rows the write produced
    (`COUNT(*) FROM ins`), so idempotency and the counter agree for free. Two
    app-level calls would need an explicit transaction and a separate
    "did it actually insert?" check, with a window between them.

15. **The UPDATE runs even on a no-op like (delta 0).** Trades one dead tuple
    per duplicate like for a single round-trip that always returns the current
    count. The alternative (gate the UPDATE on `EXISTS`) avoids the write but
    returns no row on a no-op, forcing a fallback `SELECT`. Duplicate likes are
    rare; the always-correct single round-trip is worth the occasional dead
    tuple (autovacuum reclaims it).

16. **`prisma/bench-seed.sql` committed as a dev tool.** "Produce the numbers
    yourself" needs a reproducible dataset at a scale where the planner's
    choices are real. The synthetic rows are namespaced (`bu_`/`br_`) so they
    never collide with the real seed and can be wiped with one `DELETE … WHERE
    id LIKE 'bu_%'`. Not wired into `npm run db:seed` — it's opt-in for
    benchmarking, not part of the demo data.
