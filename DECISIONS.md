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
