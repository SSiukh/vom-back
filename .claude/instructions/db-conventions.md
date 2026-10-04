# Database conventions

Non-negotiable rules for how this project's MongoDB/Prisma schema is built.
`.claude/CLAUDE.md` and the `database-architecture` skill point here instead
of restating these — this file is the single source, edit it in place
rather than forking a copy elsewhere.

- **Every collection has `createdAt` and `updatedAt`.** No exceptions —
  even a collection that feels write-once-read-many still gets both.
- **Images are stored as references, not binary data.** No collection
  stores raw image bytes. Every image field is a URL string pointing to an
  asset hosted on Cloudinary; uploading the file to Cloudinary and getting
  back its URL is a separate step from saving the document that references
  it.
- **Every reference relation has an explicit cascade behavior.** MongoDB
  has no native foreign-key cascade — when a referenced document is
  deleted or edited, every collection that references it must stay
  consistent. For each relation, decide and implement exactly one of the
  following in the service layer, inside a transaction — never leave a
  dangling reference as an unhandled side effect:
  - cascade delete the dependents,
  - restrict the delete/edit while dependents exist,
  - detach/null the reference, or
  - snapshot the referenced data at write time so a later change to the
    original no longer matters (already used for order line items — see
    the `database-architecture` skill's `_snapshot` gotcha).
- **A nullable field used as a "never set" sentinel needs `isSet`, not a
  bare `null` filter.** On MongoDB, `where: { field: null }` matches only
  documents where `field` is explicitly `null` — it does **not** match
  documents where the field is missing entirely, even though reading such
  a document back still surfaces `field: null` in JS, and even though raw
  MongoDB's own `{ field: null }` query matches both cases. When a
  nullable field's absence is meant to carry meaning (e.g. an optional
  `brand` on `Expense` where "not set" means "shared" across older
  documents written before the field existed), any `where` filter meant to
  catch that case must be
  `{ OR: [{ field: null }, { field: { isSet: false } }] }` — confirmed live
  against Atlas (`Expense.brand`, `dashboard.service.ts`'s `sharedExpenses`
  aggregate).
- **A non-nullable Boolean with `@default(...)` added after documents
  already exist is NOT matched by Prisma `where` filters on those
  documents.** Prisma applies the default when *reading* a document that
  lacks the field, so `findMany`/`findUnique` return the default correctly.
  But a `where` on that field (`{ flag: false }`, `{ NOT: { flag: true } }`)
  does not match the legacy documents, and `isSet` is not available on
  scalar Boolean fields. Verified live against Atlas on
  `Order.isSettled`: 303 legacy documents without `is_settled` read as
  `false`, while `where: { isSettled: false }` and
  `where: { NOT: { isSettled: true } }` both returned 0. So if a filter on
  such a flag is ever needed, backfill the field on existing documents
  first (an explicit `updateMany` / Mongo `$set` on the missing ones) and
  get approval before writing to a production collection. Do not add a
  filter that relies on the default alone.
