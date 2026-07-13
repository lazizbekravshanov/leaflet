# Trusted Discovery Loop

## Purpose

Leaflet will move from a completed systems-learning project toward a useful
product for readers who want recommendations from people they trust. The first
iteration validates one outcome:

> A new user can establish their taste, follow compatible readers, discover an
> explainable recommendation, and save it during one session.

This is a focused product loop, not a general recommendation platform.

## Audience and Product Principle

The initial audience is readers who value recommendations from people with
recognizably compatible taste. Leaflet should answer two questions for every
recommendation:

1. Who recommended this?
2. Why should I trust their taste?

Global popularity is not a fallback recommendation source. When Leaflet lacks
enough social signal, it asks the user to add books or follow readers instead
of presenting an opaque popularity list.

## User Journey

### 1. Choose favorites

After signup, the user searches for and selects at least five books they have
read and genuinely liked. Search covers Leaflet's local catalog and Open
Library. Selected favorites are added to the user's `READ` shelf because the
selection asserts that the user has read them.

Selections persist immediately. Refreshing, navigating backward, or leaving
and returning does not discard progress.

### 2. Meet compatible readers

Leaflet refreshes reader recommendations after taste setup. Candidate cards
explain compatibility with evidence such as:

- number of shared read books;
- specific shared books; and
- mutual follows, when available.

The user follows at least three readers before continuing. Follow writes use
the existing idempotent follow flow. If fewer than three compatible readers
exist, the page asks for more taste selections instead of filling the list with
unrelated popular accounts.

### 3. Discover trusted recommendations

The Discover page aggregates books rated highly by followed readers. It:

- excludes books present on any of the current user's shelves;
- retains the followed readers behind each result;
- shows the strongest human-readable reason;
- uses deterministic tie-breaking; and
- avoids exposing an unexplained numeric score.

Each card identifies the book, recommending readers, and shared-taste evidence.

### 4. Save the next read

The user can add a recommendation to `WANT_TO_READ` directly from its card.
The existing transactional shelf service remains authoritative, so repeated
requests cannot duplicate or split system-shelf state.

### Returning use

After onboarding, Discover is a normal main-navigation destination. Existing
users with insufficient signal receive an optional taste-setup prompt rather
than a forced redirect.

## Scope

### Included

- resumable taste onboarding;
- local-first Open Library search;
- transactional import of a selected Open Library work and authors;
- compatible-reader selection;
- explainable book recommendations from followed readers;
- one-click `WANT_TO_READ`;
- funnel instrumentation;
- unit, integration, and one browser-level happy-path test.

### Excluded

- book clubs or group reading;
- Goodreads or library imports;
- notifications;
- embeddings, machine learning, or collaborative-filtering infrastructure;
- globally popular recommendations;
- editorial curation;
- recommendation emails;
- moderation and unrelated account improvements;
- changes to the existing feed-ranking algorithm.

## Experience Design

### Taste setup

The setup page contains:

- a search field;
- local and Open Library results in one list with source labels;
- a persistent selection count and a minimum of five;
- selected-state controls that are safe to repeat; and
- a clear statement that selections are saved as books read.

Only a selected remote result is imported. Search previews do not populate the
database.

### Reader selection

Reader cards show identity, shared-book evidence, mutual-follow evidence, and a
follow control. The primary action becomes available after three follows.

### Discover

Discover cards show:

- cover, title, and author;
- the recommending followed readers;
- a concise explanation of taste overlap;
- the current shelf state; and
- a `Want to Read` action.

The page defines explicit loading, empty, error, saved, and retry states. An
empty result explains which signal is missing and links to the relevant action.

## Architecture

Leaflet keeps its existing dependency direction:

`app -> services -> repositories -> Prisma`

The implementation adds focused capabilities within those boundaries.

### Catalog adapter

A typed Open Library adapter owns remote request construction, response
normalization, timeouts, and error mapping. No route or component consumes raw
Open Library response shapes.

Catalog search is local-first:

1. query the existing Postgres full-text and trigram search;
2. return local results immediately when they are sufficient;
3. query Open Library when local results are sparse;
4. merge and deduplicate previews by Open Library work ID; and
5. import only when the user selects a remote preview.

Import upserts the work, authors, and ordered authorship rows in one
transaction. The existing unique `books.open_library_id` key makes races and
retries idempotent.

### Onboarding service

The onboarding service coordinates existing shelf, recommendation, and follow
capabilities. It does not bypass their invariants.

Selected favorites become `READ` shelf items. Completing taste selection
triggers one explicit refresh of compatible-reader recommendations so the user
does not wait for the existing six-hour lazy refresh.

A nullable `discoveryOnboardingCompletedAt` field on `User` distinguishes an
unfinished onboarding flow from an intentionally sparse established account.
Individual selections and follows remain persisted in their source tables; no
draft onboarding document is required. The migration backfills this timestamp
for existing users so they receive an optional prompt rather than being forced
through new-user onboarding.

### Discovery service and repository

The discovery repository computes book candidates from followed readers'
ratings. A candidate must:

- have a rating of at least four from one or more followed readers;
- not appear on any system or custom shelf owned by the current user; and
- still exist as a valid book.

The query aggregates recommending readers per book and calculates internal
ordering from:

- count of followed readers rating the book highly;
- their taste overlap with the current user; and
- their rating values.

The score is internal. The response exposes evidence needed to produce a
plain-language reason. Stable book ID ordering breaks equal scores.

The first iteration computes recommendations on read. The expected cohort and
follow set are small, and an online query keeps writes simple and results
current. Precomputation is deferred until measurements show a latency problem.

## Data Changes

### User

Add nullable `discovery_onboarding_completed_at`.

### Product events

Add an append-only `product_events` table:

- `id`;
- required `user_id` with a cascading user foreign key;
- `name`;
- JSON metadata restricted to non-sensitive identifiers and counts; and
- `created_at`.

Index `(name, created_at)` and `(user_id, created_at)`. Initial event names are:

- `taste_setup_started`;
- `favorite_selected`;
- `reader_followed`;
- `discovery_recommendation_shown`; and
- `discovery_recommendation_saved`.

Events are written server-side after the corresponding authoritative action.
Event failures are logged but do not fail the user action. No review text,
email address, search query, or other free-form personal content enters event
metadata.

No taste-profile or materialized book-recommendation table is introduced.

## API and Data Flow

Thin route handlers retain the existing parse, service, respond shape.

Required operations:

- search local and remote books;
- import and select a remote book as a favorite;
- select an existing local book as a favorite;
- complete taste setup and refresh reader matches;
- mark onboarding complete after the follow threshold;
- list discovery recommendations; and
- save a recommendation through the existing shelf endpoint.

Mutation responses return authoritative state. Client components update
optimistically only where rollback is unambiguous.

## Failure Handling

### Open Library

Remote requests have a short timeout and map network, timeout, invalid payload,
and upstream-status failures into typed application errors. Local results remain
usable during remote failure. The UI distinguishes "no books found" from
"Open Library is temporarily unavailable." Remote search requires an
authenticated user, validates and bounds query length, is debounced in the
client, and is rate-limited on the server so Leaflet cannot become an
unrestricted Open Library proxy.

### Import

Normalization validates the work ID and required title before a transaction
begins. Any author or authorship failure rolls back the entire import. A
concurrent unique-key winner is re-read and returned rather than surfaced as an
error.

### Onboarding

Every successful selection and follow persists independently. Completion is
written only after the minimum signal is present. A failed refresh does not
erase choices; it presents a retry action.

### Discovery

Insufficient signal produces a guided empty state. Database failures use the
existing typed-error mapping and retry UI. Saving is reconciled against the
server response.

## Observability and Success Measurement

The primary funnel is:

`setup started -> five favorites -> three follows -> recommendation shown -> recommendation saved`

Initial product review measures:

- completion rate at each step;
- median time from setup start to first save;
- percentage of users who see at least one recommendation; and
- Open Library search/import failure rates.

Technical logging records adapter latency, remote status category, import
outcome, discovery-query latency, and result count. Logs contain no remote
payload bodies or user-entered search text.

The iteration succeeds when a fresh seeded test account can complete the full
loop in one session and the product-event sequence verifies the outcome.

## Testing

### Unit

- Open Library response normalization;
- deduplication and source merging;
- timeout and error mapping;
- recommendation reason selection;
- onboarding threshold validation.

### Postgres integration

- selected local books enter `READ`;
- imported works, authors, and authorship are atomic and idempotent;
- concurrent imports converge on one work;
- completion requires the minimum favorites and follows;
- reader recommendations refresh after taste setup;
- discovery includes only highly rated books from followed readers;
- all current-user shelves are excluded;
- ties are deterministic;
- event writes follow authoritative actions;
- repeated save requests preserve shelf invariants.

### Browser-level

One deterministic happy-path test uses a controlled Open Library response and
seeded compatible readers:

`signup -> select five favorites -> follow three readers -> open Discover ->
save one recommendation`

The test asserts visible explanation text, final shelf state, and funnel events.

## Rollout

Ship behind an application configuration flag. Validate with demo fixtures,
then a small invited cohort. During the cohort:

- inspect funnel drop-off;
- inspect empty-result frequency;
- measure remote and discovery-query latency; and
- collect qualitative feedback on whether explanations feel trustworthy.

Remove the flag only after the full loop is reliable. More sophisticated
ranking is a later decision driven by observed data, not part of this release.

## Acceptance Criteria

1. A new user can select five favorites, including at least one remote catalog
   result, without creating duplicate books.
2. The user can follow three compatible readers with visible taste evidence.
3. Discover returns books highly rated by those followed readers and excludes
   every book already shelved by the user.
4. Every recommendation names its human sources and gives a readable reason.
5. Saving a recommendation places it on `WANT_TO_READ` exactly once.
6. Refreshing or retrying any onboarding step loses no completed work.
7. Open Library failure leaves local search operational and produces a clear
   retry state.
8. The product-event sequence measures the complete first-session loop without
   storing free-form personal content.
9. Unit, integration, browser-level, lint, typecheck, and production build
   verification pass.
