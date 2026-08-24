---
name: database-architecture
description: Design or extend the MongoDB/Prisma schema for this project according to the VOM Systems data-base spec. Use when adding or changing a Prisma model/collection, deciding whether data should be embedded or referenced, adding a new dictionary (довідник) collection, or reviewing whether schema.prisma matches the intended architecture.
metadata:
  source: .claude/artifacts/data-base/DATA-BASE.md
---

## Source of truth

`.claude/artifacts/data-base/DATA-BASE.md` is the canonical schema for this
project: every collection, field, type, and the reasoning behind
embed/reference choices. Read the relevant section before adding or
changing a Prisma model — don't invent field names or shapes.

If you add or change a collection/field that isn't yet in that doc, update
`DATA-BASE.md` in the same change so it stays the single source of truth.

For the actual Prisma-6-with-MongoDB syntax (id fields, `@db.ObjectId`,
generator/datasource setup), use the `prisma-database-setup` /
`prisma-mongodb-upgrade` skills already in this repo — this skill covers
schema *decisions*, not Prisma CLI mechanics.

## Project-wide DB rules

`.claude/instructions/db-conventions.md` is the single source for the
non-negotiable rules below — read it, don't rely on this summary drifting
out of sync:

- every collection has `createdAt`/`updatedAt`,
- image fields store a Cloudinary URL, never binary data,
- every reference relation needs an explicit, implemented cascade
  behavior (cascade / restrict / detach / snapshot) — see the Gotchas
  section below for which relations in this schema still need that
  decision made explicit.

## Universal fields

Every collection has `_id` (ObjectId), `created_at`, `updated_at` — don't
repeat this per model description, just include them on every model:

```prisma
id        String   @id @default(auto()) @map("_id") @db.ObjectId
createdAt DateTime @default(now())      @map("created_at")
updatedAt DateTime @updatedAt           @map("updated_at")
```

## Embed vs. reference — the actual rule from this project

- **Embed** when the data is always read together with its parent and is
  never queried or reused independently outside that context. In this
  schema: an order's `items[]`, `recipient`, and `delivery_details`. Model
  these as Prisma **composite types** (`type Item { ... }`,
  `type Recipient { ... }`), not as separate collections with a relation —
  MongoDB composite types are exactly the tool for this, and a separate
  collection here would be wrong (it would allow querying a recipient or an
  order line item outside its order, which nothing in this app needs and
  the doc's rationale explicitly rules out).
- **Reference** (separate collection + `ObjectId` relation field) for
  entities administrators edit independently or that are pointed at from
  more than one place: `products`, `senders`, and every довідник below.

## Dictionary (довідник) collections

Referentials are their own collections, not embedded enums, so values can
be administered without a code deploy and so multiple collections can hold
a consistent `ObjectId` reference to the same value. Every довідник has at
minimum `code` (unique, stable technical key) and `label` (display name);
add extra discriminator flags only when a business rule actually keys off
them:

- `is_default` (`shipment_types`) — which value pre-selects in a form
- `is_custom` (`product_types`) — marks the type that has no row in
  `products` and takes a manually entered price
- `requires_name` (`expense_types`) — marks the type that needs a free-text
  name field
- `np_status_code` (`shipment_statuses`) — maps this app's status to Nova
  Poshta's own status code for sync

The current довідники: `order_types`, `shipment_types`, `product_types`,
`payment_types`, `expense_types`, `delivery_types`, `shipment_statuses`.
Before adding a new one, check this list — a "type of X" selector backed by
admin-editable values is a довідник; a fixed small set with no admin UI to
manage it (rare in this app) can stay a plain enum.

The `frontend-design` skill lists the same довідники from the UI side
(селекти backed by довідники on each page) — keep the two in sync; a new
lookup collection here should also be reflected as a селект source there.

## Gotchas

- **`senders.is_active`'s "only one true" rule is not a MongoDB
  constraint** — MongoDB has no partial-unique-on-boolean out of the box
  for this shape. Enforce it in the service layer: setting one sender
  active must unset any other in the same write path (transaction), not
  just rely on UI discipline.
- **`_snapshot` fields on order items are deliberate duplication, not
  denormalization to fix later.** `name_snapshot` / `photo_url_snapshot`
  preserve what the product looked like at order time; a later edit to
  `products` must never cascade into historical orders. Don't "clean this
  up" into a live join.
- **Nova Poshta reference data (cities, streets, warehouses, postomats) is
  never cached in a local collection.** Only the chosen `*_ref` string is
  stored on the order/sender. Don't add a `cities` or `warehouses`
  collection — fetch that data from the Nova Poshta API live.
- **`product_types` rows with `is_custom = true` have no corresponding
  `products` row.** An order item with that type carries its own `price`
  and `name_snapshot` directly; don't require a `product_id` for it (it's
  `null` by design).
- **`orders.total_amount` and `items[].subtotal` are computed fields.**
  Never accept them as client input — recompute server-side from `items`
  (this is the same rule the `frontend-design` skill states from the UI
  side; the two must agree).
- **`products.photo_url` / `items[].photo_url_snapshot` must be Cloudinary
  URLs, never a locally-stored file or raw binary.** Uploading to Cloudinary
  is a separate step (via its own service) from saving the document — the
  DB only ever stores the resulting URL.
- **Resolved: sender/sender-address "deletion" is soft-delete, not a
  document removal.** Both `Sender.isDeactivated` and
  `SenderAddress.isDeactivated` (per-entry, inside `addresses[]`) exist
  specifically so the Відправники page's "Видалити" button (`VOM_SYSTEMS.md`)
  can flip a flag instead of removing the document/entry — this keeps
  historical `orders.sender_id` / `orders.sender_address_ref` valid forever,
  no restrict/snapshot logic needed for these two relations. When building
  Senders: list/selection queries must filter `isDeactivated: false`;
  deleting a sender or an address is an update, never a Prisma `delete`;
  and a deactivated sender must never simultaneously have `isActive: true`
  (enforce in the same service-layer transaction that flips
  `isDeactivated`).
- **Cascade behavior is still not decided for these — don't leave it
  implicit when you touch them:**
  - Deleting/editing a довідник row (`order_types`, `product_types`,
    `payment_types`, etc.) that's referenced by existing `orders`,
    `products`, or `expenses`: decide restrict-while-referenced vs.
    allowing edits but not deletes, per довідник.
  - Deleting a `product` referenced by `items[].product_id` on past
    orders: the `_snapshot` fields already make the order display
    independent of the live product, so this is likely safe as detach/null
    on `product_id` — but implement that explicitly rather than leaving a
    dangling `ObjectId`.

## Indexes

Baseline indexes called out in `DATA-BASE.md`: `orders.np_waybill_number`
(unique), `orders.created_at`, `products.type`, `expenses.type`,
`senders.is_active`, `senders.is_deactivated`. When adding a new query path — a new list-page filter,
a new lookup by field — check whether it needs an index added to both
`schema.prisma` (`@@index` / `@unique`) and this list in `DATA-BASE.md`.
