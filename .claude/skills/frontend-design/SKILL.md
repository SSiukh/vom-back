---
name: frontend-design
description: Read the VOM Systems frontend design and page-by-page spec, then design or review the NestJS backend services/controllers/DTOs that correctly serve it. Use when building any client-facing endpoint, controller, DTO, or service for this project, when deciding what an API for a given page should accept/return, or when reviewing whether existing backend code matches the described UI.
metadata:
  source: .claude/artifacts/frontend/VOM_SYSTEMS.md, .claude/artifacts/frontend/VOM_DESIGN_INSTRUCTION.md
---

## Source of truth

Two docs in `.claude/artifacts/frontend/` describe the actual frontend.
Read them before designing any backend service — don't guess at fields:

- `VOM_SYSTEMS.md` — per-page parameter tables: exact field names, types,
  conditional visibility, and the business rule behind each control. This
  is the primary source for DTO shape.
- `VOM_DESIGN_INSTRUCTION.md` — layout/UX per page (steps, list vs form,
  what's grouped together). Read this when it's ambiguous whether
  something should be one endpoint or several (e.g. multi-step wizards,
  list+filter pages).

## What the product is

VOM Systems — internal B2B admin dashboard (not customer-facing) for a
small stickers/keychains business: orders, product inventory, expenses, an
aggregated CRM table, an analytics dashboard, and Nova Poshta shipping
integration (auto-generated waybills/ЕН). Pages: Login, 2FA setup, Orders
(list/create/detail/edit), Products (list/create/detail/edit), Expenses
(list/create/edit), CRM table, Dashboard, Senders (list/create).

## Procedure: turning a page spec into backend services

1. Open `VOM_SYSTEMS.md`, find the page's `### Сторінка ...` section and
   its parameter table.
2. Classify the page: list (→ `GET` with filters + pagination), detail
   (→ `GET /:id`), create/edit form (→ `POST`/`PATCH` with a DTO), or a
   composite/aggregated view (CRM table, dashboard → a dedicated read
   endpoint, not a raw entity list).
3. For every row in the parameter table:
   - "Селект"/"Випадаючий список" backed by a "довідник" → this is an enum
     or a lookup collection, not free text. Check whether the same
     довідник name appears on other pages (e.g. тип товару appears on
     both Замовлення and Товари) — reuse one canonical enum/collection,
     don't redefine it per page.
   - A field whose visibility depends on another field's value ("за умови
     обрання...", "відображається за умови") → keep it optional in the
     DTO and validate the dependency server-side too — don't trust the
     client to only send it when it's supposed to apply.
   - "Автоматично розраховується" fields (e.g. order cost, stock
     quantity) → compute server-side; never accept a client-supplied
     value for these.
4. Cross-check `VOM_DESIGN_INSTRUCTION.md`'s layout section for the page
   to confirm whether UI steps/sections map to one request or several
   (e.g. the two-step order wizard is still a single `Order` creation —
   the frontend splits it into UI steps, not separate API calls, unless
   told otherwise).
5. Place the resulting controller/service/DTO/entity using the
   `nestjs-project-structure` skill's feature-module layout — this skill
   decides *what* the service does, not *where the files live*.

## Gotchas (business rules easy to miss from the tables alone)

- **Stock deduction is transactional and reversible.** Adding a
  Наклейка/Брелок to an order decrements that product's `Кількість на
  складі`; removing it from the order, or deleting the whole order, must
  restore the quantity. Кастомна наклейка has no stock and is exempt.
- **Only one sender can be active at a time.** "Активний" on Відправники
  is effectively a single-select over the whole collection — setting one
  active must unset any other; don't model it as an independent boolean
  per row without that constraint.
- **2FA gates the entire app.** After login, every route except the 2FA
  setup page must be inaccessible until 2FA is configured — this is an
  auth-guard concern, not just a frontend redirect.
- **Order editing is constrained by Nova Poshta's own edit rules**, not by
  this app's business logic — which fields stay editable after an ЕН is
  created depends on Nova Poshta's API (see the link in `VOM_SYSTEMS.md`'s
  "Сторінка редагування замовлення"). Don't assume every order field is
  freely editable post-creation.
- **Sender identity is pulled from Nova Poshta, not entered manually** —
  ПІБ/phone on Відправники are fetched via the sender's API key and are
  informational/read-only in the DTO, not user-editable input fields.
- **CRM table and Dashboard are derived views**, not raw entity CRUD —
  they aggregate/join Orders + Expenses + Nova Poshta shipment status and
  need their own read-model service, not a passthrough of the Order
  repository.
- Довідники (referentials) recurring across pages: тип замовлення, тип
  відправки, тип товару, тип оплати, тип витрати, спосіб доставки, статус
  відправлення. Model each one once; don't let the same concept drift into
  per-page string literals. (Matches the `database-architecture` skill's
  list one-to-one: `order_types`, `shipment_types`, `product_types`,
  `payment_types`, `expense_types`, `delivery_types`, `shipment_statuses`.)

## Reviewing existing code against the design

When asked to check whether a service matches the design: open the page's
parameter table, walk it row by row against the DTO/entity/service, and
flag any field that's missing, wrongly typed (e.g. free text where the
spec says a довідник-backed select), or an auto-computed field that's
accepted as client input.
