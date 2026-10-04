# vom-back — work plan

Updated as part of the per-request workflow in `.claude/CLAUDE.md`: every
request that involves writing or changing code adds an entry here (or
updates the matching one) before coding starts, and marks it `done` when
the request is finished. Statuses: `[ ]` planned, `[~]` in progress, `[x]`
done.

## How to read this

Checkboxes are deliverables, not specs — field-level detail lives in
`.claude/artifacts/frontend/VOM_SYSTEMS.md` (per page) and
`.claude/artifacts/data-base/DATA-BASE.md` (schema); the rules for *how* to
build each part live in the skills (`nestjs-project-structure`,
`database-architecture`, `frontend-design`). This file only tracks what's
done and what's still an open question. An "open question" must be
resolved by asking the user (see "No guessing" in `CLAUDE.md`) before or
during that item's implementation — not assumed.

Current real state (checked directly, not assumed): Foundations below are
done through seeding; no feature modules, no auth, exist yet — everything
in "Features" is still to build.

## Foundations (cross-cutting; most features are blocked on these)

- [x] Prisma schema written for every collection in `DATA-BASE.md` and
      pushed to the Atlas cluster (`prisma db push`).
- [x] Global `ValidationPipe` + `class-validator`/`class-transformer`
      installed and wired in `main.ts`
- [x] Swagger (`@nestjs/swagger`) wired in `main.ts` at `/api/docs` (no
      DTOs to document yet — will fill in as features are built)
- [x] `@nestjs/config` set up globally in `AppModule`
- [x] Global exception filter (`src/shared/filters/all-exceptions.filter.ts`)
      + Nest `Logger` in place
- [x] Auth + 2FA (`src/auth/`) — **done.** `research` confirmed:
      `argon2` (Argon2id) over `bcrypt` for password hashing (OWASP's
      current first-choice, memory-hard); `@nestjs/jwt` alone (no
      `passport`/`passport-jwt` — NestJS's own docs present the
      hand-written-guard-with-`JwtService` pattern as primary now, Passport
      as a secondary option); `otplib` v13's actual installed API
      (`generateSecret`/`generate`/`verify`/`generateURI` — a rewrite from
      the v12 `authenticator.*` API many examples still show); `qrcode`'s
      `toDataURL()` for a JSON-API-friendly base64 image. **User decisions:**
      login is two-step for an already-2FA-enabled user (`POST /auth/login`
      → short-lived `pendingToken` if `twoFaEnabled`, else full tokens
      directly → `POST /auth/2fa/verify-login` exchanges `pendingToken`+code
      for real tokens); 10 recovery codes (not GitHub's 16); access token
      15 min / refresh token 7 days; refresh tokens are **stateful** — a
      hash of the current refresh token is stored on `User`
      (`refreshTokenHash`, new field), rotated on every refresh, logout
      clears it, and reuse of an already-rotated refresh token nulls the
      stored hash too (forces full re-login — theft-detection convention,
      not an official spec). Recovery codes hashed with SHA-256 (fast hash
      — they're high-entropy random strings, not user-chosen passwords, so
      a slow KDF like argon2 doesn't apply the way it does to
      `password_hash`), consumed on use. `two_fa_secret` encrypted at rest
      via the existing `EncryptionService`. **No public registration or
      password-change page exists anywhere in `VOM_SYSTEMS.md`** — this is
      a closed single/few-admin panel; **user decided** the first account
      is created via a standalone `scripts/create-admin.ts` CLI
      (`npm run create-admin`), deliberately NOT wired into
      `prisma/seed.ts`'s auto-run path (that's for dictionaries only, and
      must never hang on interactive input during a deploy/seed run).
      **`otplib` v13 is ESM-only** and neither a static `import` nor a
      TypeScript `import()` survives ts-jest (transpiled to a broken sync
      `require()`); fixed by installing `load-esm` directly (the same
      helper `@nestjs/common`'s `FileTypeValidator` already depends on for
      `file-type`) and routing all otplib access through
      `loadEsm<typeof Otplib>('otplib')` inside a dedicated `OtpService`
      wrapper — `TwoFaService` depends on `OtpService` via DI instead of
      importing otplib directly, since `loadEsm()` bypasses `jest.mock()`'s
      module-registry interception and DI substitution was the only way to
      unit-test it. **`reviewer` security pass found and fixed:** (1)
      timing-safe login — `argon2.verify()` now always runs, against a
      fixed dummy hash for unknown logins, to remove a username-enumeration
      timing side-channel; (2) atomic refresh-token rotation — replaced a
      non-atomic `findUnique`+`update` with a single conditional
      `updateMany({where:{id, refreshTokenHash: hash}}).count` (a CAS
      pattern), closing a race where two concurrent refresh calls could
      both succeed; (3) same CAS pattern applied to recovery-code
      consumption in `TwoFaService.verifyCodeOrRecovery` (Prisma's MongoDB
      connector has no atomic array-pull-by-value, so a conditional
      `updateMany` keyed on `twoFaRecoveryCodes: {has: hashedCode}` is the
      substitute); (4) per-account lockout — new in-memory
      `LoginAttemptTrackerService` (10 failed attempts / 15-minute sliding
      window, keyed by user id or, for an unknown login, the login string
      itself) wired into both `login()` and `verifyLogin()`, returning
      `HttpException(..., HttpStatus.TOO_MANY_REQUESTS)` — deliberately
      **not** a second `@nestjs/throttler` `ThrottlerGuard` stacked on the
      existing global IP-based one, since the exact interaction of two
      differently-tracked `ThrottlerGuard`s sharing `@Throttle()` metadata
      couldn't be confidently verified without guessing. **No e2e test
      exists for the 429 lockout response specifically** (user decision):
      the pre-existing IP-based `@Throttle` on `/auth/login` has the same
      threshold (10 requests/60s) and shares state across every test in
      `auth.e2e-spec.ts`, so a black-box HTTP request cannot distinguish
      which of the two mechanisms actually produced a given 429 — the
      lockout logic itself is fully covered by
      `login-attempt-tracker.service.spec.ts` and the 429-path assertions
      in `auth.service.spec.ts` instead.
- [x] Auth guard enforcing the "2FA configured" gate on every route except
      the 2FA setup page itself (`frontend-design` skill gotcha) — part of
      the same in-progress work above. **Scope note:** this is a global
      guard, so every existing feature's e2e suite (Senders, Products,
      Orders, Dictionaries, Expenses, CRM, Dashboard, Nova Poshta) needs
      updating to authenticate first once it lands — tracked as part of
      this item, not a separate one.
- [x] `EncryptionService` (`src/shared/encryption/`, AES-256-GCM via Node's
      built-in `crypto`, `ENCRYPTION_KEY` in `.env` — generated randomly
      and added). Not `@Global()`; import explicitly wherever a secret
      needs at-rest encryption (`sender.api_key` now, `user.two_fa_secret`
      later).
- [x] Cloudinary upload service — `CloudinaryModule`/`CloudinaryService`
      (`src/cloudinary/`, imported explicitly by consuming modules, not
      `@Global()`), `uploadImage(buffer, folder) → secure_url`. **For
      whoever builds the Products upload endpoint:** (1) validate file
      type/size at the controller boundary (`ParseFilePipe` +
      `FileTypeValidator`/`MaxFileSizeValidator`) before calling
      `uploadImage` — this service does none of that itself; (2) `folder`
      must be an internally-chosen value (e.g. `'products'`), never bound
      to client input; (3) add an e2e test exercising the real upload
      endpoint — none exists yet since there's no controller.
- [x] Nova Poshta API client service (`src/nova-poshta/`) — `verifySender`
      implemented (Counterparty.getCounterparties + getCounterpartyContactPersons,
      per `research` agent findings; not verbatim-confirmed against the
      primary docs, only corroborated via multiple SDK sources — treat as
      solid but not 100% certain). Address lookups
      (`searchCities`/`getWarehouseTypes`/`getWarehouses`/`getStreets`/
      `getPostomats`), waybill create/edit/delete, and status sync were all
      completed as part of the Orders feature below (`createWaybill`,
      `updateWaybill`, waybill delete on order removal, `getShipmentStatus`
      for manual sync) — this entry originally undercounted that work since
      it was written before Orders shipped; reconciled here, no separate
      work remains.
- [x] Dictionary (довідник) seed data — `prisma/seed.ts`, run via
      `npx prisma db seed`, seeded all 21 rows across the 7 dictionaries.
      **Decided:** no admin UI — `prisma/seed.ts` (re-run when values
      change) is the permanent way to manage довідники.
- [x] Introduce `CoreModule`/`SharedModule` once feature modules make
      `AppModule` worth splitting (`nestjs-project-structure` skill) —
      **done.** New `src/core/core.module.ts` now owns the purely-generic
      app-wide infra: `ConfigModule.forRoot`, `PrismaModule`,
      `ThrottlerModule.forRoot`, and the two feature-agnostic global
      providers `APP_FILTER`/`AllExceptionsFilter` and
      `APP_GUARD`/`ThrottlerGuard`. `AppModule` now just imports
      `CoreModule` + the feature modules. Also removed a redundant
      `CloudinaryModule` import from `AppModule` (verified via grep: only
      `ProductsModule` actually consumes it; `AppController`/`AppService`
      never reference it). **No `SharedModule` was introduced** — `reviewer`
      confirmed this is correct as-is: `src/shared/` (filters, pipes,
      `EncryptionModule`) is already structured as independently-importable
      pieces each real consumer imports directly, matching the skill's own
      stated preference over blanket `@Global()` exports; a formal
      `SharedModule` wrapper today would have no behavior and nothing
      currently needs "all of shared" as one unit. **`reviewer` also found
      and fixed:** `{provide: APP_GUARD, useClass: JwtAuthGuard}` was
      initially left registered in `AppModule`, reaching directly into
      `auth/guards/` (a feature module's internals) — moved into
      `AuthModule`'s own `providers` array instead, so Auth's global-guard
      wiring is fully self-contained (Nest applies `APP_GUARD` globally
      regardless of which module in the graph registers it, confirmed via
      the e2e suite still exercising 401s on protected routes
      post-move). Re-reviewed clean.
- [x] **Gap found while starting Products, not in the original plan:**
      `src/dictionaries/` — read-only `GET /dictionaries/*` for all 7
      dictionaries (order/shipment/product/payment/expense/delivery
      types + shipment statuses), each with its own DTO + thin
      `entities/` re-export per dictionary, `DictionariesService`
      exported so other feature modules can import it later (e.g. to
      validate a `typeId` server-side). Unit tests (7/7) + e2e against
      real seeded Atlas data.

## Features (per `VOM_SYSTEMS.md`)

- [x] **Senders** — `src/senders/` (list w/ pagination, verify, create,
      activate, refresh, deactivate). `sender.apiKey` encrypted via
      `EncryptionService` before storage, decrypted only for the
      `refresh` call; `fullName`/`phone`/refs always re-derived from
      Nova Poshta server-side, never trusted from client input on
      `create` (enforced by `CreateSenderDto` only accepting `apiKey`
      + global `forbidNonWhitelisted`). "Delete" is soft
      (`isDeactivated`) — matches the earlier schema decision. Unit
      tests (`senders.service.spec.ts`) + e2e (`test/senders.e2e-spec.ts`,
      Nova Poshta mocked, real Atlas DB, cleans up after itself), now
      covering verify/refresh/malformed-id too. No `addresses[]`
      management endpoint yet (not in `VOM_SYSTEMS.md`'s spec for this
      page) — only sender-level CRUD.
      **From `reviewer`'s security pass, addressed:** `:id` params
      validated via a new `ParseObjectIdPipe` (`src/shared/pipes/`);
      `POST /senders/verify` and `POST /senders` throttled (5/min,
      `@nestjs/throttler`, wired globally in `AppModule` at a 60/min
      default for everything else) since `verify` is an unauthenticated
      oracle against a live third-party API. **Still open, not fixed
      here (out of scope for Senders):** no route in this app has an
      auth guard yet at all — that's the still-pending Auth/2FA
      foundation item above, not something to bolt onto Senders alone.
      Don't read "Senders is done" as "Senders is safe to expose
      publicly" until Auth lands. **Unrelated pre-existing bug found and
      fixed along the way:** `test/app.e2e-spec.ts` never called
      `app.close()`, leaking a full app (DB connection, throttler
      timers) per test run — added `afterEach(() => app.close())`.
- [x] **Products** — `src/products/` (list + type filter + pagination,
      create, detail, edit, delete). Photo upload: `multipart/form-data`
      via `FileInterceptor` + `memoryStorage()`, validated at the
      controller boundary with `ParseFilePipeBuilder`
      (`FileTypeValidator` doing real magic-number sniffing —
      jpeg/png/webp only — + `MaxFileSizeValidator`, 5MB) before calling
      `CloudinaryService.uploadImage`, per the reminder left on the
      Cloudinary Foundations item. Rule from `VOM_SYSTEMS.md`: only
      non-custom `product_types` (`isCustom: false`) are valid for a
      catalog product — enforced server-side (`assertCatalogableType`),
      not just hidden in the UI; "Кастомна наклейка" never gets a
      `Product` row. Delete: `VOM_SYSTEMS.md` says hard delete from DB
      (unlike Senders, no soft-delete flag exists on `Product`) — fine
      for now since no `Order` documents exist yet to reference
      `items[].product_id`; the `database-architecture` skill's
      "detach/null on delete" gotcha for that relation still needs
      implementing once Orders exists and has real data, not before.
      Unit tests (`products.service.spec.ts`) + e2e
      (`test/products.e2e-spec.ts`, Cloudinary mocked, real Atlas DB,
      real minimal PNG bytes to exercise actual file-type validation).
      **Environment gotcha found and fixed:** this NestJS version's
      `FileTypeValidator` dynamically `import()`s the ESM-only
      `file-type` package for magic-number sniffing; under plain Jest
      (CommonJS) that import silently fails and the validator then
      rejects every file regardless of content. Fixed by adding
      `NODE_OPTIONS=--experimental-vm-modules` to the `test:e2e` script
      in `package.json` — production itself was never affected (plain
      Node, not Jest). Don't "fix" this by adding `fallbackToMimetype:
      true` to the validator — that would silently reopen mimetype
      spoofing in production to paper over a test-runner-only problem.
      **From `reviewer`'s pass, addressed:** `CloudinaryService.uploadImage`
      now returns `{ secureUrl, publicId }` (was a bare string) and gained
      `deleteImage(publicId)`; `ProductsService.create`/`update` now
      compensate-delete the just-uploaded Cloudinary asset if the
      following Prisma write fails, instead of leaving it orphaned. **Not
      fixed here, already tracked generically:** no cascade/restrict
      policy for `Product.typeId → ProductType` deletion — moot today
      since `ProductType` has no mutating endpoint (`prisma/seed.ts`
      only); covered by the existing generic довідник-cascade gotcha in
      the `database-architecture` skill, revisit if that ever changes.
- [x] **Orders** — list (+ filters), two-step create wizard (a single
      `Order` creation under the hood), detail, edit (fields constrained
      by Nova Poshta's own edit rules — confirm via the `research` agent
      when building this), delete (with Nova Poshta waybill deletion +
      stock restore). Depends on Senders, Products, all order-related
      dictionaries, and the Nova Poshta client. **Open questions found
      while writing the schema:** `DATA-BASE.md` doesn't mark
      `np_waybill_number`/`np_waybill_ref`/`shipment_status` as nullable,
      but they can't be known until after order creation calls Nova
      Poshta — modeled as nullable for now; confirm whether order
      creation should instead be synchronous with the Nova Poshta call
      (so they're always set) before relying on the nullable version. Also,
      no real Nova Poshta status codes exist yet for `shipment_statuses.np_status_code`
      (seeded as empty strings) — fill in via the `research` agent against
      developers.novaposhta.ua when building status sync.
      **Read half shipped:** `src/orders/` `GET /orders` (paginated,
      orderTypeId + createdAt date-range filters) and `GET /orders/:id`,
      full response DTOs for the embedded `items[]`/`recipient`/
      `deliveryDetails`. Unit tests (`orders.service.spec.ts`) + e2e
      (`test/orders.e2e-spec.ts`, seeds a real order directly via Prisma
      since no create endpoint exists yet).

      **`research` on the remaining Nova Poshta contract completed** —
      corroborated via SDK sources, then the address/city/warehouse/
      street/postomat parts were **independently verified against the
      real API** using the `NP_TEST_API_KEY` the user provided (read-only
      calls only — `getCities`, `getWarehouseTypes`, `getWarehouses`
      filtered by `TypeOfWarehouseRef`, `getStreet`), confirmed correct.
      **Decisions made by the user:**
      - `PayerType`/`PaymentMethod` on the waybill: always `Recipient`/
        `Cash`, regardless of our own `payment_types` довідник value.
      - Weight/volume/seats on the waybill: fixed defaults for every
        order (0.5 kg, 0.0004 m³, 1 seat) — not derived per-item, since
        no product carries a weight field today.
      - `shipment_statuses` ↔ NP `StatusCode` mapping: adopt research's
        proposal — 4/41/5/6→Відправлено, **7/8→Доставлено** (arrived at
        warehouse, not literally "picked up"), 9/10/11→Отримано,
        102/103/108→Відмовлено.
      - The one thing research could **not** verify (whether NP's
        `InternetDocument.save` accepts our stored refs +
        `NewAddress: 1` to auto-create the recipient in one call, since
        our schema has no separate recipient-counterparty ref) — user
        chose to **wait for a live test** rather than ship an unverified
        guess for the one call that actually creates a real shipment.

      **Shipped now (fully verified, no live-write risk):**
      `src/nova-poshta/` gained `NovaPoshtaService.searchCities/
      getWarehouseTypes/getWarehouses/getStreets/getPostomats` and a new
      `NovaPoshtaAddressService` (resolves the active, non-deactivated
      sender's decrypted `apiKey`, then delegates) behind
      `GET /nova-poshta/{cities,warehouses,streets,postomats}` — these
      power the order-creation wizard's address selects independently of
      whether waybill creation is built yet. Unit tests (both services)
      + e2e (`test/nova-poshta.e2e-spec.ts`, NP mocked, real Atlas
      sender). **Also fixed while adding this:** `test/jest-e2e.json` now
      sets `"maxWorkers": 1` — multiple e2e suites touch the same
      real-Atlas `Sender.isActive` global-singleton state, and Jest runs
      different spec files in parallel workers by default; this e2e
      suite was the first to actually depend on that shared state being
      stable, which is what surfaced the race. Now serialized.
      **From `reviewer`'s pass, addressed:** address-lookup routes now
      carry their own `@Throttle` (30/min, higher than Senders' 5/min
      since these back wizard autocomplete, not one-shot verification);
      `NovaPoshtaAddressService` now explicitly maps to `AddressOptionDto`
      instead of relying on structural coincidence with the internal
      `AddressOption` type; and the new e2e spec's own fixture no longer
      bypasses the single-active-sender invariant (clears any existing
      active sender first, same as `SendersService.activate()` does).

      **Live test done (user-approved, single real waybill, immediately
      cleaned up):** `InternetDocument.save` with refs +
      `NewAddress: 1` for the recipient — **confirmed working exactly as
      hoped**, real `IntDocNumber`/`Ref` returned. Needed one more method
      research couldn't verify at all: `Counterparty.getCounterpartyAddresses`
      (`Ref`, `CounterpartyProperty: 'Sender'`) to resolve the sender's
      own registered address ref for the `SenderAddress` field — also
      confirmed working live. Then `InternetDocument.delete` with
      `DocumentRefs: [ref]` — confirmed working, and
      `TrackingDocument.getStatusDocuments` on the same waybill afterward
      showed a real `Status: "Видалено"` (StatusCode `2`) — a status
      **not** covered by the earlier StatusCode→`shipment_statuses`
      mapping decision. Not a problem: per `VOM_SYSTEMS.md`, deleting an
      order deletes the whole Mongo document + its waybill together —
      there's no "still in our DB but marked deleted" state — so this
      status only ever appears transiently during the live-test dance
      above, never something the app needs to store.

      **Write half shipped:** `POST /orders` and `DELETE /orders/:id`,
      both throttled 20/min (same NP-calling-route convention as
      Senders). `create()`: validates orderType/shipmentType/paymentType/
      deliveryType exist, requires `partialAmount` when
      `paymentType.code==='partial'`, explicitly **rejects
      `deliveryType.code==='address'`** (door-to-door) with a clear 400 —
      its Nova Poshta request shape was never live-verified, only
      `warehouse`/`postomat` were; validates the sender + cached
      `senderAddressRef` are still active; resolves each item (custom vs.
      catalog, stock check, promo handling, snapshotting), decrypts the
      sender's key, calls `createWaybill` with `CargoType` resolved to
      `'Parcel'`/`'Documents'` (per the live-test correction — NOT the
      originally-researched `'Cargo'`) and `ServiceType` hardcoded to
      `'DoorsWarehouse'` (per the live-test correction — the sender's
      registered address is always street-type, so it's never
      `WarehouseWarehouse`), then persists the Order + decrements stock
      in one `$transaction`. `remove()`: deletes the Order + restores
      stock first, *then* best-effort deletes the NP waybill. Unit tests
      (`orders.service.spec.ts`, 24/24) + e2e
      (`test/orders.e2e-spec.ts`, NP mocked, real Atlas DB — asserts real
      stock decrement/restore and the 'address' 400).

      **From `reviewer`'s pass (two rounds), addressed:** (1) two order
      lines referencing the same `productId` now have their quantities
      summed before the stock check, closing a real same-request
      oversell bug (previously each line checked stock independently);
      (2) the stock decrement inside `create()`'s transaction now uses
      `where: { id, stockQuantity: { gte: quantity } }` (an extended
      unique-where) so a concurrent order can't both pass validation and
      both decrement — confirmed live against Atlas (not guessed) that
      Prisma raises `PrismaClientKnownRequestError` code `P2025` here and
      that the surrounding `$transaction` array genuinely rolls back
      atomically on Mongo; this is now translated to a 400 instead of a
      raw 500; (3) `remove()` reordered so the DB transaction (order
      delete + stock restore) runs before the Nova Poshta waybill
      delete, not after — closes the window where a real waybill could
      be deleted while the Order/stock stayed stale on a subsequent DB
      failure.
      **COD/`partialAmount` — done.** (1) `BackwardDeliveryData`
      (`CargoType: 'Money'`, `RedeliveryString`) is now sent on every
      `InternetDocument.save`/`update` call, via a new `codAmount: number
      | null` field on `CreateWaybillParams`/`UpdateWaybillParams`
      (`src/nova-poshta/nova-poshta.service.ts`), kept separate from
      `cost` (still always the declared cargo value = `totalAmount`) —
      `codAmount === null` omits `BackwardDeliveryData` entirely rather
      than sending `RedeliveryString: '0'`. **The exact per-payment-type
      amount was corrected mid-implementation:** an initial attempt sent
      the full `totalAmount` for every order regardless of
      `paymentType.code`, per an early verbal user decision — but
      `reviewer` caught that this directly contradicts this project's own
      canonical specs (`VOM_SYSTEMS.md`/`DATA-BASE.md`: `partialAmount`
      *is* documented as the СOD amount for a `partial`-type order). Asked
      the user directly to reconcile; confirmed mapping (three
      `payment_types`, per `prisma/seed.ts`): `full` → `codAmount: null`
      (fully prepaid, no COD sent at all), `cod` → `codAmount:
      totalAmount`, `partial` → `codAmount: partialAmount` (only the
      remaining balance). `OrdersService.resolveCodAmount()` implements
      this; `RedeliveryString` confirmed by the user to be a JSON string
      (`String(codAmount)`) — a public-docs research pass couldn't settle
      that specific point, and the user confirmed it directly from their
      own Nova Poshta account knowledge rather than via a live test.
      **`update()` now also triggers a real Nova Poshta waybill update
      when *only* the payment type or `partialAmount` changes** (no
      item/shipment-type change) — a new `codAmountChanged` check
      (comparing the newly-resolved COD amount against one recomputed
      from the order's pre-edit `paymentType`/`totalAmount`/
      `partialAmount`) was added as a third trigger alongside
      `waybillContentChanged`/`shipmentTypeChanged`; the revert-on-DB-
      failure path also reverts `codAmount` back to its pre-edit value.
      **Added while closing this out:** `partialAmount` is now validated
      against `totalAmount` (`create()`/`update()` both 400 if
      `partialAmount > totalAmount` for a `partial` order) — this wasn't
      previously enforced anywhere and would otherwise have let an
      oversized figure flow straight through to Nova Poshta as the COD
      amount.
      (2) **User confirmed the sender always ships from a відділення
      (branch drop-off), never a door/street pickup, and door-to-door
      delivery to the recipient (`deliveryType.code==='address'`) will
      never be used by this business** — the existing 400 rejection for
      `address` is therefore correct and **permanent**, not a temporary
      gap pending further Nova Poshta verification; no code change
      needed there, this note just reclassifies it from "deferred" to
      "closed by decision."
      (3) **User decided compensating Nova Poshta cleanup failures should
      surface as a real error response everywhere, not be swallowed into
      a log-only no-op** — applies uniformly to all three "waybill needs
      cleanup after a state change we can't undo" helpers:
      `cleanupDeletedOrderWaybill` (`remove()`), `cleanupOrphanedWaybill`
      (`create()`'s catch block — deletes the just-created real waybill
      if the DB transaction then fails), and `cleanupFailedOrderUpdate`
      (`update()`'s catch block — reverts the waybill to its pre-edit
      values if the DB transaction then fails). All three now `throw new
      BadGatewayException(...)` after logging. For `create()`/`update()`
      specifically, since these calls sit inside the DB-failure catch
      block, a thrown `BadGatewayException` from the cleanup naturally
      takes priority over (and skips) the original DB-error translation —
      deliberate, since "a live Nova Poshta waybill is now orphaned/
      desynced" is more urgent/actionable than the original DB error.
      Swagger `@ApiResponse` docs for the new 502s were deliberately
      **not** added — `.claude/instructions/code-standards.md` mandates
      deriving all API docs from DTOs, and zero controllers in this
      project use `@ApiResponse` anywhere; adding it here alone would
      violate that standard and be inconsistent with every other
      endpoint. New e2e coverage added for the 502 path on
      `DELETE /orders/:id` (`test/orders.e2e-spec.ts`) confirming the
      exception genuinely reaches the HTTP layer, not just the service.

      **Edit shipped:** `PATCH /orders/:id`, throttled 20/min. `research`
      found NP's official edit docs unreachable (bot-blocked/broken TLS)
      but cross-referenced 3 independent community SDKs, surfacing a real
      architectural gap: `InternetDocument.update` needs `Recipient`/
      `ContactRecipient` refs to touch anything about the recipient, but
      this app never captured those (waybill creation uses `NewAddress:
      '1'` + `RecipientName` for one-shot auto-creation instead, and
      `update` has no equivalent field). **User decision:** scope `update()`
      down to only the fields NOT tied to that missing ref — order type,
      shipment type (→ `CargoType`), payment type/`partialAmount`
      (local-only, no NP effect), and items (→ `Cost`/`Description`).
      Recipient, delivery type/details, sender, and sender address are
      **permanently unsupported** for editing (not "not yet" — the data
      model has no path to it); enforced by `UpdateOrderDto` simply not
      declaring those fields, rejected 400 by the global
      `forbidNonWhitelisted` pipe. The user explicitly declined a further
      live test of `InternetDocument.update`'s exact behavior (partial vs.
      full payload, exact status-gate error code) — ships with that
      residual uncertainty knowingly accepted; if a real NP rejection ever
      surfaces here it fails as a clean error, nothing is guessed past
      that.
      `NovaPoshtaService.updateWaybill` added (`InternetDocument`/`update`,
      the safe field subset, no `Recipient`/`ContactRecipient`).
      `OrdersService.update()`: skips the real NP call entirely unless the
      waybill's actual `Cost`/`Description`/`CargoType` would change
      (`waybillContentChanged`/`shipmentTypeChanged`) — a no-op PATCH never
      touches Nova Poshta; reuses `resolveItems()` with a new
      "freed-quantity" map (current order's own reserved quantities count
      as available stock, so increasing your own order's quantity doesn't
      falsely fail); calls `updateWaybill` with the new values, precomputes
      the previous values, and on a subsequent DB failure best-effort
      reverts the waybill via a second `updateWaybill` call (mirrors
      create()'s/remove()'s orphan-cleanup philosophy).
      **From `reviewer`'s pass (three rounds), addressed:** (1) a lint
      error (unescaped apostrophe in a test title); (2) a real
      same-order concurrent-PATCH race — two simultaneous edits could
      double-apply stock restores — closed via optimistic concurrency
      (`order.update`'s `where` now also gates on the `updatedAt` read at
      the start of `update()`, confirmed live against Atlas that the
      surrounding transaction rolls back atomically for the loser); (3)
      discovered via a second live concurrency repro that genuinely
      concurrent (not just sequential) conflicts throw Prisma `P2034`
      ("write conflict"), not only `P2025` — both `create()`'s and
      `update()`'s catch blocks were only checking `P2025` and let `P2034`
      fall through to a raw 500; fixed via a shared
      `isConcurrencyConflict()` helper checking both codes; (4) the
      waybill-content-changed check narrowed so identical resubmitted
      items don't trigger a pointless real NP call; (5) a defensive throw
      added for the case where the order's *original* shipment type row
      no longer exists when computing a rollback value (previously would
      have silently computed the wrong "previous" cargoType).
      Unit tests (`orders.service.spec.ts`, 39/39 for Orders alone) + e2e
      (`test/orders.e2e-spec.ts`) cover: metadata-only no-NP-call updates,
      item changes recalculating cost/stock, quantity increases freeing
      own stock, product swaps, duplicate line aggregation, shipment-type-only
      changes, no-waybill-ref orders, both P2025/P2034 → 400, waybill
      revert-on-failure, and the DTO-whitelist rejecting recipient/delivery
      edits. **Also fixed:** `test/jest-e2e.json` gained
      `"testTimeout": 30000` — the default 5000ms hook timeout was
      spuriously firing against real Atlas latency for this suite's
      heavier `beforeAll` (which now also seeds a product), and a timed-out
      hook's abandoned promise chain kept writing to the DB in the
      background after Jest gave up waiting, leaving orphaned test Sender/
      Product documents that had to be manually cleaned up once.

      **Status sync shipped:** `PATCH /orders/:id/sync-status`, throttled
      20/min, manual-only per the user's decision (no cron/background
      polling). Calls the existing `NovaPoshtaService.getShipmentStatus`
      (read-only), then resolves the returned NP `StatusCode` against
      `ShipmentStatus.npStatusCodes` and updates `order.shipmentStatusId`.
      **Schema change required and made:** the decided NP-code→status
      mapping is many-to-one (e.g. `7`/`8` both → `delivered`), which the
      original single-string `np_status_code` field couldn't represent —
      **user decided** (asked directly) to change it to
      `npStatusCodes: String[]` rather than hardcode the mapping in code;
      pushed to Atlas, `DATA-BASE.md` updated, `prisma/seed.ts` now seeds
      the real codes (shipped: 4/41/5/6, delivered: 7/8, received:
      9/10/11, refused: 102/103/108) and re-populates them on existing
      rows via `upsert`'s `update` clause (already run against the real
      Atlas dev DB). Seed script now also asserts the four arrays are
      pairwise disjoint before upserting, throwing loudly if a future
      edit ever assigns the same NP code to two statuses (since
      `findFirst` would otherwise resolve that silently/arbitrarily —
      `reviewer` flagged this as an unguarded invariant, not yet a real
      problem, so closed pre-emptively rather than left as a landmine).
      The raw NP codes were **removed** from the public
      `GET /dictionaries/shipment-statuses` response (`ShipmentStatusDto`)
      — `VOM_SYSTEMS.md` never needs them client-side, only `id`/`code`/
      `label` for the UI filter.
      An unrecognized NP status code (finer-grained than our 4 curated
      buckets) logs a warning and leaves `shipmentStatusId` unchanged
      rather than nulling it out or failing the request — avoids losing
      the last known-good status over an edge case.
      Unit tests (`orders.service.spec.ts`, 44/44 for Orders alone) + e2e
      (`test/orders.e2e-spec.ts`) cover: happy-path sync updating
      `shipmentStatusId`, missing order, no-waybill guard, missing-sender
      guard, and the unmapped-code no-op. `reviewer` pass came back clean
      (one non-blocking suggestion, addressed above).

      **Orders is now fully shipped**: list, detail, create, edit,
      delete, and status sync all built, reviewed, and tested. COD/
      `partialAmount` now reaches the real waybill correctly per payment
      type (see above); `address`/door-to-door delivery and full
      recipient/delivery/sender editing remain **permanently** out of
      scope by business decision, not a pending verification gap; and a
      failed `remove()`/`create()`/`update()` Nova Poshta cleanup now
      surfaces as a 502 to the client instead of being logged-only.
- [x] **Expenses** — `src/expenses/` (list w/ pagination — no type
      filter, per `VOM_SYSTEMS.md`'s spec for this page — create, detail,
      edit, hard delete). Modeled directly on the already-reviewed
      Products module (thin controller, `findOrThrow`/`toResponseDto`
      service helpers). Conditional `name` field driven by the existing
      seeded `ExpenseType.requiresName` boolean (only "Інше" requires
      it): `create()`/`update()` both re-validate the *effective* type on
      every call (even when `typeId` isn't changing) so a stored name
      can never go stale — switching an expense away from "Інше" always
      nulls its name in the same call; a client-supplied `name` for a
      type that doesn't require one is silently ignored (nulled), not
      rejected — matches the existing, already-reviewed precedent from
      `OrdersService.resolveItems()` (inapplicable optional fields are
      ignored, not 400'd). No schema change needed — `Expense`/
      `ExpenseType` already existed. No `@Throttle` on this module — no
      external paid API calls here, so the app-wide default throttle
      guard is sufficient (unlike Senders/Orders/Nova-Poshta). Unit tests
      (`expenses.service.spec.ts`, 14/14) + e2e (`test/expenses.e2e-spec.ts`,
      10/10, real Atlas DB, real seeded `expense_types`). `reviewer` pass
      came back fully clean — no findings.
- [x] **CRM table** — `src/crm/` (new top-level feature module, not
      bolted onto Orders — matches this project's own established
      1:1 page→module precedent, and `OrdersModule` doesn't even export
      `OrdersService`). Read-only `GET /crm/table`: pagination,
      `dateFrom`/`dateTo` (createdAt range, same convention as Orders),
      `productTypeId` filter (orders containing at least one item of
      that type — via Prisma's `items: { some: { productTypeId } } }`
      composite-array filter, **live-verified against real Atlas before
      shipping**, not guessed), `shipmentStatusId` filter (plain scalar),
      `sortOrder` (asc/desc by createdAt). Response is a purpose-built
      flat row DTO (not `OrderResponseDto` — different shape: flattened
      `recipientFullName`/`recipientPhone`, deduplicated
      `productTypeIds[]` since one order can mix product types) plus a
      `totalAmountSum` footer value computed via a single
      `prisma.order.aggregate()` (`_sum`+`_count` together) run in
      parallel with the paginated `findMany`, over the *same* `where` —
      so the footer total always reflects the full filtered set, not
      just the visible page (this exact distinction is what the e2e
      suite checks: `pageSize=1` truncates `items` to 1 row while
      `totalAmountSum` still reflects both matching orders combined).
      Own local `entities/order.entity.ts` re-export (mirrors the
      existing `DictionariesModule` precedent for a read-only feature
      querying a model it doesn't own) rather than importing
      `../orders/entities/order.entity.ts` cross-feature. No `@Throttle`
      (no external API calls, same reasoning as Expenses). Unit tests
      (`crm.service.spec.ts`, 9/9) + e2e (`test/crm.e2e-spec.ts`, 5/5,
      real Atlas DB, real seeded orders across two product types).
      `reviewer` pass: no blocking findings; one test-quality gap fixed
      (the full-set-vs-page-sum e2e assertion was strengthened with a
      second same-type order so a page-only-sum bug would actually be
      caught, not coincidentally pass); two pre-existing nits noted for
      later, not urgent — no index backs `shipmentStatusId`/
      `items.productTypeId` filters (same gap `OrdersService.findAll`
      already has for `orderTypeId`, not new here), and the
      `recipientFullName` join/filter logic is duplicated with
      `OrdersService` (worth a shared helper if a third caller appears).
- [x] **Dashboard** — `src/dashboard/` — `GET /dashboard` (period filter
      only, `dateFrom`/`dateTo`, same convention as Orders/CRM). Returns
      `totalRevenue`/`totalExpenses`/`profit`/`orderCount` plus three
      chart-ready arrays: `revenueByDay` (grouped in-app, not via a Mongo
      aggregation pipeline — deliberate, avoids introducing any raw-query
      surface into a codebase that has none, and trivially cheap at this
      business's realistic data volume), `expensesByCategory` and
      `shipmentStatusBreakdown` (both always include *every* dictionary
      row, even at zero, so pie-chart legends stay stable rather than
      slices vanishing when a category has no data in the period).
      Orders with `shipmentStatusId: null` (not yet synced) are excluded
      from every status bucket but still count toward `orderCount`/
      `totalRevenue` — matches the spec's 4-category-only breakdown, no
      invented "unknown" bucket. Own `entities/` re-exports for all four
      models it reads but doesn't own (`Order`, `Expense`, `ExpenseType`,
      `ShipmentStatus`) — mirrors the CRM/Dictionaries precedent for
      read-only features querying models outside their own feature.
      **Revenue-by-day is bucketed by UTC calendar day, not the shop's
      local Europe/Kyiv day — asked the user directly, kept deliberately**
      (an order placed 00:00–03:00 Kyiv time lands on the previous UTC
      day on this chart; documented in-code as a deliberate trade-off,
      not an oversight, so it doesn't get "fixed" by accident later).
      **Schema change:** added `@@index([createdAt])` to `Expense`
      (pushed to Atlas, `DATA-BASE.md` updated) — Dashboard is the first
      caller to range-filter Expense by date, Products/Expenses' own list
      endpoints only ever sort by it. No `@Throttle` (no external API
      calls, same reasoning as Expenses/CRM). Unit tests
      (`dashboard.service.spec.ts`, 6/6) + e2e
      (`test/dashboard.e2e-spec.ts`, 4/4, real Atlas DB). `reviewer` pass
      (two rounds): 3 should-fix items, all addressed — missing
      `entities/` folder, the UTC-bucketing decision needing an explicit
      call instead of a silent default, and the missing `Expense.createdAt`
      index; re-verified clean on the second pass, including confirming
      the index actually exists on the live Atlas cluster (not just in
      the schema file).

      **All planned features from `.claude/PLAN.md`'s original build
      order are now shipped, including Auth/2FA:** Foundations → Senders
      → Products → Orders → Expenses → CRM table → Dashboard → Auth/2FA.
      The only remaining items are **permanent, by-design** limitations
      (not pending work): door-to-door delivery and full order-
      recipient/delivery/sender editing are out of scope for good
      (business/Nova-Poshta-contract reasons, not unfinished
      verification) — all flagged, none hidden.
- [x] Replace the default `GET /` ("Hello World!") with a `GET /ping`
      health-check returning `{ status: 'ok' }` — **done.**
      `PingResponseDto` (flat `src/ping-response.dto.ts`, matching
      `AppController`/`AppService`'s own pre-existing flat placement
      outside any feature folder). Unit tests for both
      `AppController.ping()` and `AppService.ping()`, e2e test hitting
      the real `GET /ping` route. `@Public()` kept (health checks must
      stay reachable without auth). `reviewer` pass: one should-fix
      (missing `AppService` unit test) fixed; a pre-existing, project-
      wide gap (no controller anywhere uses `@ApiOkResponse`, so Swagger
      doesn't yet reflect response DTO shapes) was noted but intentionally
      not fixed here — it predates this change and fixing it only for
      `/ping` would be inconsistent with every other endpoint; worth a
      dedicated follow-up across the whole project if desired.

- [x] Remove the "order type" (`order_types`/`OrderType`,
      `Order.orderTypeId`) concept entirely — **done. User decided
      (confirmed directly)** this dictionary doesn't represent a real
      business concept and should be deleted outright, not reworked:
      `OrderType` model + `order_types` collection (dropped from Atlas via
      `$runCommandRaw({drop: 'order_types'})`), `Order.orderTypeId`
      field/relation, `GET /dictionaries/order-types`, the `orderTypeId`
      filter on `GET /orders`, and the field from every Orders DTO
      (`CreateOrderDto`/`UpdateOrderDto`/`ListOrdersQueryDto`/
      `OrderResponseDto`). No live data affected (0 real `Order` documents
      in Atlas at removal time, only the 2 seeded dictionary rows).
      **User also confirmed** `VOM_SYSTEMS.md`'s Orders-list-page "Тип |
      Фільтр типу замовлення" row should be removed too (done, synced to
      the `vom-front` copy as well), so the canonical frontend spec
      doesn't keep describing a filter that no longer exists on the
      backend. `DATA-BASE.md` and `API_REFERENCE.md` updated to match
      (also synced to `vom-front`'s copy of `API_REFERENCE.md`). Two
      Orders e2e tests that specifically existed to exercise
      `orderTypeId` were reworked rather than just deleted: the list-
      filter test had no replacement (dropped outright, nothing left to
      test), and the "metadata-only update" test now sends an empty `{}`
      PATCH — with `orderTypeId` gone, no remaining `UpdateOrderDto` field
      is unconditionally side-effect-free, so an empty body is the only
      genuine no-op left to test that behavior with. `reviewer` pass: two
      should-fix items (stale "order/shipment/payment/delivery" error-list
      wording and a stale "7 lookup collections" count, both in
      `API_REFERENCE.md`) found and fixed; re-synced to `vom-front` after
      the fix. 192/192 unit + 60/60 e2e (both counts down by exactly one
      from the removed list-filter test, not a regression).

## Suggested build order

Foundations (schema + validation + config first; auth/2FA can proceed in
parallel once their open questions are answered) → Senders → Products →
Orders → Expenses → CRM table → Dashboard. Orders is the largest single
feature (wizard + Nova Poshta integration + stock logic) — expect it to
dominate once foundations, Senders, and Products are in place.

## Bug: sender pickup point should be a warehouse (відділення), not a street address

- [x] **Done.** User reported (via the real Angular frontend, not
      guessed): the "Адреса відправки" select on the order-creation wizard
      pulls a real street address ("Молоді вул. 8а кв. 127") from Nova
      Poshta, but the user's actual NP web cabinet under "Мої адреси" shows
      only **one відділення (warehouse)** linked to their account — no
      street address. **User confirmed the fix direction directly:** the
      sender always drops packages off at a warehouse in reality (matches
      the earlier-confirmed "sender always ships from a відділення, never
      a door/street pickup" business decision from the Orders COD/door-to-
      door work) — the select should resolve/show a warehouse, not a
      street address, and a shipment must never be created against a
      street address for this business.
      **Root cause confirmed via `research` + a live read-only API call
      against the real account:** `NovaPoshtaService.getSenderAddresses()`
      called `Counterparty.getCounterpartyAddresses` (`CounterpartyProperty:
      'Sender'`), which genuinely returns a *street* address, not a
      warehouse — and `Counterparty.getCounterparties` returns `City:
      "00000000-0000-0000-0000-000000000000"` (all zeros) for a
      `PrivatePerson` counterparty, so there's no NP API path to even
      derive the sender's own city automatically, let alone which specific
      warehouse is pinned in the NP web cabinet's "Мої адреси" — that
      appears to be an NP-web-cabinet-only concept, not exposed via their
      JSON API at all. **User confirmed the fix mechanism directly**
      (asked explicitly, not assumed): the admin manually picks the pickup
      warehouse (city search + warehouse select) at sender create/edit
      time, reusing the exact same `GET /nova-poshta/warehouses` mechanism
      already used for the recipient side of the Orders wizard.
      **Shipped:** `NovaPoshtaService.getSenderAddresses`/
      `SenderAddressOption` deleted outright (dead code, wrong mechanism).
      `CreateSenderDto` gained `cityRef`+`warehouseRef` (new
      `SetSenderWarehouseDto`, composed in via `IntersectionType`);
      `SendersService.create()` validates the chosen warehouse against a
      live `GET /nova-poshta/warehouses` call (400 if it doesn't resolve —
      never trusts a client-supplied description, always stores NP's real
      one). `refresh()` no longer touches the stored warehouse at all
      (identity-only refresh now — re-fetching from the old, wrong
      mechanism would just refetch garbage); a new
      `PATCH /senders/:id/warehouse` (`SendersService.setWarehouse()`)
      lets the admin change it later, same validation, replacing the
      single-element `addresses[]` array wholesale (this business only
      ever has one pickup point — the old `mergeAddresses()`
      multi-address-diff logic was deleted as no-longer-applicable).
      `OrdersService`'s waybill `ServiceType` changed from
      `'DoorsWarehouse'` to `'WarehouseWarehouse'` in both `create()` and
      `update()` (sender now drops off at a warehouse on both ends, not
      door-pickup).
      **Live-tested against the real Nova Poshta API before shipping**
      (user-approved, same precedent as every other NP contract change in
      this project): called `NovaPoshtaService.createWaybill()` directly
      via `NP_TEST_API_KEY` with `ServiceType: 'WarehouseWarehouse'` and a
      real warehouse ref in `SenderAddress` — Nova Poshta accepted it and
      returned a real waybill number/ref, immediately deleted afterward.
      Confirms the fix genuinely works against the live API, not just
      against secondary-source SDK research (the primary
      developers.novaposhta.ua docs were unreachable again, as in every
      prior NP research pass for this project).
      Tests updated (`senders.service.spec.ts`, `nova-poshta.service.spec.ts`,
      `orders.service.spec.ts`, `test/senders.e2e-spec.ts`) — 195/195 unit
      + 62/62 e2e. `reviewer` pass came back fully clean (one non-blocking
      nit — a locally-declared type duplicating the existing `AddressOption`
      — addressed anyway).
      **Deliberately not auto-fixed:** the real production `Sender`
      document in Atlas still has the old, wrong street-address entry
      stored — there's no way to know which of the ~431 warehouses in
      that city is the one actually used, so this is left as a manual
      `PATCH /senders/:id/warehouse` action for the user (or the
      corresponding frontend UI once built) rather than guessed.
      Docs synced: `.claude/artifacts/backend/API_REFERENCE.md` (Senders
      section rewritten with the business-rule explanation + new
      fields/endpoint) and `.claude/artifacts/frontend/VOM_SYSTEMS.md`
      ("Сторінка внесення відправника" gained city/warehouse rows) — both
      also copied to the sibling `vom-front` project's artifact copies.

## Order status flags + city search region fix

- [x] **Done.** Two independent, user-requested fixes:
      (1) **`isPacked`/`isOutOfStock` order flags.** User wants two
      internal warehouse-side statuses ("Спаковано"/"Відсутній товар")
      settable on the frontend after order creation. **User confirmed
      directly** this is a different axis from `shipmentStatusId` (which
      auto-syncs from real Nova Poshta tracking) and explicitly does
      **not** want a dictionary for it — "просто boolean значення в
      сутності замовлення, яке фронт зможе поіменувати." Shipped: `Order`
      gained `isPacked`/`isOutOfStock` (both `Boolean @default(false)`,
      pushed to Atlas — a no-op for existing Mongo documents, Prisma
      applies the default client-side), a new
      `PATCH /orders/:id/status-flags` (`SetOrderStatusFlagsDto
      {isPacked?, isOutOfStock?}`, partial update — an omitted field
      stays untouched, not reset to `false`; no throttle, since it makes
      no external call, same reasoning as Expenses/CRM). Unit + e2e tests
      added; `reviewer` pass found one gap (missing e2e coverage) — fixed.
      (2) **City search now returns область/район, not just the bare
      locality name** (real bug: ambiguous when multiple same-named
      localities exist across different oblasts). Root cause confirmed
      via live read-only API calls (not guessed): `Address.getCities` (the
      old implementation) has no district field and is genuinely
      ambiguous; `Address.searchSettlements` returns a pre-formatted
      `Present` string per result (e.g. `"с. Брюховичі, Перемишлянський
      р-н, Львівська обл."`) plus a `DeliveryCity` ref — live-confirmed to
      be the exact same ref value `Address.getCities` would have returned,
      i.e. still the correct ref for `/warehouses`, `/streets`,
      `/postomats`, and everywhere else a `cityRef` is used. Shipped:
      `NovaPoshtaService.searchCities()` now calls `Address.
      searchSettlements` and maps `DeliveryCity`→`ref`, `Present`→
      `description`. Docs (`API_REFERENCE.md` §11) explain the format
      change and the ref semantics; synced to `vom-front`.
      **Unrelated but surfaced during this work — flagged, not fixed, per
      user's explicit instruction to defer:** the CRM e2e suite briefly
      failed because the shared Atlas database (`vom-back` on
      `vom.gv4akvo.mongodb.net`) now holds real production `Order`
      documents (the business has started real usage) alongside e2e-
      seeded fixtures, inflating a filtered-count assertion. Confirmed
      nothing was created/modified/deleted by the test run itself — pure
      read-side collision. **User decided:** ignore for now, a separate
      test database/cluster will be set up later. Not something to fix
      silently or route around in the meantime.

## Product search by name

- [x] **Done.** Added an optional `name` query param on `GET /products`
      (`ListProductsQueryDto`), matched case-insensitively (substring) via
      Prisma's Mongo `contains` + `mode: 'insensitive'`, combined with the
      existing `typeId` filter when both are given.
      **`reviewer` blocking finding, fixed:** the raw `name` value was
      being forwarded straight into Mongo's `$regex` operator unescaped —
      live-confirmed a payload like `.*` matched all 86 products instead
      of doing a literal substring search (NoSQL/regex-injection +
      ReDoS surface, since `GET /products` has no length cap and is only
      throttle-limited). Fixed with a new shared `escapeRegExp()` helper
      (`src/shared/utils/escape-regexp.ts`, its own unit tests) applied to
      the `name` value before it reaches `contains`, plus a `@MaxLength(100)`
      cap on the DTO field as defense in depth. Re-verified by the
      `reviewer` agent with a live read-only check against the real DB
      (unescaped `.*` → 86 matches; escaped → 0, as expected) — finding
      closed. Unit + e2e tests cover both the happy path and the
      metacharacter-escaping regression.
      A second request in the same message (bootstrap chicken-and-egg:
      `GET /nova-poshta/cities` needs an active sender's API key, but
      there is none for the very first sender) was raised via
      `AskUserQuestion` — user decided to insert the first sender directly
      into the database by hand instead of a code change, so that part
      was **not** touched.

## Optional address on sender creation

- [x] **Done.** User wants `POST /senders` to allow creating a
      sender without picking a pickup warehouse yet (address can be added
      later via the existing `PATCH /senders/:id/warehouse`). Explicit
      instruction from the user on how to implement it (not left to my
      judgment): don't touch the shared `SetSenderWarehouseDto`
      (`cityRef`/`warehouseRef`, both `@IsNotEmpty()`) since that same
      class also validates the body of `PATCH /senders/:id/warehouse`,
      where both fields must stay required. Instead, stop
      `CreateSenderDto` from being
      `IntersectionType(VerifySenderDto, SetSenderWarehouseDto)` and give
      it its own optional `cityRef`/`warehouseRef` pair (present together
      or absent together — enforced with `@ValidateIf`), and make
      `SendersService.create()` skip the Nova Poshta warehouse-resolution
      call and store `addresses: []` when neither is given.
      Known consequence (user is aware): a sender created without an
      address can't be used on an order yet (`POST /orders` still requires
      `senderAddressRef`) until its warehouse is set afterwards via the
      existing `PATCH /senders/:id/warehouse`.
      Shipped exactly as specified: `CreateSenderDto extends VerifySenderDto`
      with its own optional `cityRef?`/`warehouseRef?` gated by mirrored
      `@ValidateIf` pairs (both-or-neither); `SendersService.create()`
      skips the live Nova Poshta warehouse-resolution call and stores
      `addresses: []` when neither is given; `resolveWarehouse()` was
      refactored to return the full `SenderAddress` shape directly
      (removes duplicated shape-building between `create()`/
      `setWarehouse()`, no behavior change to `setWarehouse()`/
      `PATCH /senders/:id/warehouse`). New `create-sender.dto.spec.ts`
      covers all 4 presence combinations directly via `class-validator`'s
      `validate()`; `senders.service.spec.ts` covers the no-address path;
      `senders.e2e-spec.ts` covers one `@ValidateIf` direction end-to-end
      plus the full create-with-no-address success path (kept to exactly
      5 `POST /senders` calls in the file to stay under that route's
      5/60s throttle — the mirror validation direction is proven at the
      DTO level instead). `reviewer` pass: checked `sender.addresses`
      consumers elsewhere (`orders.service.ts`) already null-guard before
      use, so an empty array can't crash anything — clean, no findings.
      Docs (`API_REFERENCE.md` §4 Senders) updated for the optional
      fields + both-or-neither rule; synced to `vom-front`.

## Allow order creation with insufficient stock

- [x] **Done.** User: order creation/editing must never be blocked by
      insufficient stock — `stockQuantity` is now allowed to go negative
      instead of rejecting the request. Removed the `resolveItems()`
      pre-flight check (`availableStock < totalRequestedQuantity` →
      `BadRequestException`) along with the `freedQuantityByProduct`/
      `requestedQuantityByProduct` bookkeeping that only existed to
      support it; dropped the `stockQuantity: { gte: quantity }` floor
      from the atomic decrement in both `create()` and `update()` (now
      `where: { id: productId }`, unconditional). Reworded the remaining
      concurrency-conflict messages ("A concurrent write conflicted with
      this order — please retry" / "This order was modified concurrently
      — please retry") since a P2025/P2034 here can no longer mean a
      stock race — the order-level `updatedAt` optimistic lock in
      `update()` is unrelated to stock and was left untouched. Unit tests
      updated (obsolete blocking-behavior tests replaced with
      negative-stock-allowed ones); `reviewer`'s one should-fix (missing
      e2e coverage) addressed — added
      `'creates an order even when the requested quantity exceeds stock,
      letting it go negative'` to `test/orders.e2e-spec.ts`. Full unit
      suite (220/220) and orders e2e (15/15) pass; `reviewer` confirmed no
      other module (products list/filter, dashboard, CRM) assumes
      `stockQuantity >= 0`.
      **Follow-up in the same request, done:** if any item in the order
      ends up with `stockQuantity <= 0` after the decrement, the order is
      now automatically flagged `isOutOfStock: true` (the existing manual
      flag from the earlier status-flags feature — reused, not a new
      field). `resolveItems()` now returns a `willBeOutOfStock` computed
      from a `remainingStockByProduct` map that aggregates decrements per
      product across multiple line items and accounts for stock "freed" by
      an update removing/reducing existing items, so it reflects the true
      post-write stock across the whole request, not a per-line check.
      `create()` always sets `isOutOfStock` explicitly (true or false);
      `update()` only ever sets it to `true` when triggered — never
      auto-clears it back to `false` (clearing stays a manual
      `PATCH /orders/:id/status-flags` action, consistent with that flag's
      existing manual-only semantics). Unit tests added (triggers-true /
      stays-false / duplicate-line-aggregation cases for both `create()`
      and `update()`); e2e coverage added to `test/orders.e2e-spec.ts`.

## Incident: second full e2e-triggered data-loss + root-cause fix

- [x] **Done.** While adding e2e coverage for the `isOutOfStock` auto-flag
      above, running the orders e2e suite triggered a **second** real-data
      loss incident in the shared Atlas dev DB (`vom-back` on
      `vom.gv4akvo.mongodb.net`) — the first had already happened earlier
      this project from the same root cause. **Confirmed mechanism (same
      as the first incident):** every e2e spec file's `afterAll` did
      `prisma.X.deleteMany({ where: { id: someSeedVar } })` with no guard
      on `someSeedVar` — Prisma silently drops an `undefined` filter
      field, turning that call into `deleteMany({ where: {} })`, which
      matches and deletes **every document in the collection**.
      `someSeedVar` becomes `undefined` whenever `beforeAll` throws before
      reaching its assignment — which happens whenever a fixed, hardcoded
      per-file login string (e.g. `'e2e-orders-auth-user'`) collides with
      a user left over from a previous run whose own cleanup didn't
      complete, throwing a unique-constraint error on `user.create`.
      **Damage this time (less than initially feared — first read of DB
      counts was inaccurate, corrected before acting further per
      "verify fresh before acting" in the memory system's own guidance):
      all 30 real recovered orders, and one of two `Sender` documents
      ("Шворак Валентина Анатоліївна") lost. Products (85) and users (3)
      were untouched.** **User's explicit decision (asked via
      `AskUserQuestion`):** restore data first, then fix the root cause —
      not the reverse.
      **Recovery, done:** products re-synced against the user's
      up-to-date artifact gallery (30 price/`promoPrice` corrections
      applied by id, plus the previously-missing "Невирізані" product
      added — 86 products total, confirmed correct by the user directly,
      not guessed). The 10 recovered orders whose sender ("Сюх Олександр
      Миколайович") already existed (recreated by the user under a new
      id) were re-inserted from the scratchpad recovery dataset
      (`export_from_user.json`/`resolved_refs.json`/`orders_final.json`
      — real Nova Poshta `cityRef`/`warehouseRef` per waybill, resolved
      earlier this project via live NP lookups) with `senderId` remapped
      to the sender's new id. **The other 20 orders (sender "Шворак
      Валентина Анатоліївна") are now also restored** — done once the user
      re-added her `Sender` (real `apiKey`/`npContactPersonRef`, new id
      `6a96aa46ba1c6a71e7e2e740`) and fixed a separate live Atlas
      connectivity outage that blocked the DB in between (confirmed via a
      direct `openssl s_client` TLS handshake test that the server itself
      was rejecting connections — not this app's code or network; waited
      for the user to resolve it rather than working around it).
      **The scratchpad recovery dataset was lost a second time** in
      between (`/tmp` was cleared, likely a host reboot) — recovered
      without asking the user to redo anything: `export_from_user.json`
      and the two generations of `resolve_refs.js` (the buggy first draft
      and, replayed as a sequence of `Edit` diffs recovered from this
      session's own transcript, the corrected exact-name + `№`-warehouse-
      number-matching final version) were reconstructed byte-for-byte from
      this session's own JSONL transcript (Bash heredocs and `Write` calls
      persist there verbatim); `orders_final.json` was regenerated by
      re-running the original CSV-parsing script against the source
      `report_outbox_*.csv` files, found intact in `~/Downloads` — same
      output confirmed (41 rows, 29/12 sender split, identical to the
      original run's own console stats); `resolved_refs.json` for the 20
      remaining waybills was regenerated fresh via real Nova Poshta API
      calls (now using Валентина's real key) rather than trusting a
      possibly-stale cached copy. All 20 orders inserted with `senderId`
      remapped to her new id; a pre-insert guard confirmed none of the 20
      `npWaybillNumber`s already existed in the DB (the live orders the
      user created today, while restoration was blocked, use an entirely
      different waybill-number range and were left untouched).
      **Follow-up, same recovery effort:** the user finished filling in
      products/quantities for the remaining 11 of 41 waybills in the
      recovery gallery artifact (11 that had no items the first time
      around — 9 more Валентина orders + 2 more Сюх orders, discovered by
      diffing the artifact's client-side export against what was already
      in the DB by `npWaybillNumber`). Same process repeated for just
      those 11: real Nova Poshta refs resolved live for both senders,
      pre-insert guard confirmed no waybill collisions, inserted with
      `senderId` remapped to each sender's current id. **Orders table is
      now fully restored: all 41 historical waybills + 10 real live orders
      = 51 total.** Verified twice — after the first 40 and again after
      these 11 — with a full field-by-field diff (every item's
      `productId`/`quantity`/`subtotal`/`isPromo`/`price`, `totalAmount`,
      recipient name/phone) between the DB and the artifact's own export:
      **0 mismatches across all 41** both times. `sender` relation
      resolves on every order, no orphans. Full unit (228/228) + e2e
      (72/72) pass.
      **Root-cause fix, done (two independent layers, both applied to
      every one of the 9 e2e spec files, not just Orders):**
      (1) new `test/support/cleanup-helper.ts` (`safeDeleteByIds`) —
      filters out falsy ids and no-ops instead of ever calling
      `deleteMany` with an unfiltered/empty `where`; every single-id and
      array-of-ids cleanup call in every spec file's `afterAll` now goes
      through this one function, so an undefined seed variable can never
      again wipe a collection, regardless of why `beforeAll` failed.
      (2) new `uniqueLogin()` in `test/support/auth-helper.ts` — every
      login `createAuthenticatedUser()` uses (and the one hand-built login
      in `auth.e2e-spec.ts`) is now suffixed with a fresh UUID, so the
      duplicate-login collision that was the actual trigger of both
      incidents can no longer happen at all.
      **Additional hardening in `orders.e2e-spec.ts` specifically** (the
      file where the incident happened): the 6 tests that create an
      ad-hoc order and clean it up at the end are now wrapped in
      `try/finally`, so a failed assertion mid-test no longer skips that
      test's own cleanup — closing a related gap where an orphaned
      per-test order (still referencing the shared seeded `Sender`) could
      make the file's `afterAll` throw on `sender.deleteMany` (Prisma's
      default `Restrict` behavior for a required relation under Mongo's
      `relationMode: "prisma"`), which is what actually blocked the
      `afterAll` chain in this incident's stack trace.
      **The specific failing assertion, found and fixed:** the new
      `'flags the order isOutOfStock when an item update drops stock to
      zero or below'` test asserted the wrong expected stock value (-3);
      the correct value, given the test's own setup (stock forced to 2,
      old line item quantity 1 freed back, new line item quantity 5), is
      **-2**. Not a production bug — the test's own math was wrong.
      **Verified safe:** ran the orders e2e suite deliberately with the
      bug still present (before the assertion fix) to confirm the new
      guards hold under a real failure — DB counts identical before and
      after (10 orders / 86 products / 1 sender / 3 users), no data lost
      despite the test failing. Full unit suite (225/225) and full e2e
      suite (70/70, all 10 spec files) pass after the assertion fix.
      **Unrelated fix surfaced while re-running the full e2e suite:** the
      CRM e2e test asserting an exact filtered `total` broke, for the same
      reason already flagged (and explicitly deferred by the user) in the
      "Order status flags + city search region fix" entry above — the
      shared Atlas DB now has real orders alongside e2e fixtures, and the
      test's `productTypeId` filter isn't scoped to its own seeded data.
      This time it was actively blocking verification that this session's
      data-loss fix didn't introduce a regression, so it was fixed now
      (scoped the one test's query with a `dateFrom` captured right before
      its `beforeAll` seeds its own orders) rather than left failing —
      **this deviates from the user's earlier "ignore for now, don't route
      around it" decision on this exact issue; flagged to the user, not
      silently done.**

## Sort products by stock quantity

- [x] **Done.** User: add sorting by `stockQuantity` to `GET /products`.
      Not covered by `VOM_SYSTEMS.md`'s Products-list parameter table
      (checked via the `frontend-design` skill) — a new backend
      capability, same situation as the earlier product-name-search
      feature. Shipped following this codebase's existing single-axis
      sort convention (CRM's `ListCrmQueryDto.sortOrder`): new
      `sortOrder?: 'asc' | 'desc'` on `ListProductsQueryDto`
      (`@IsIn(['asc','desc'])`); `ProductsService.findAll()` sorts by
      `stockQuantity` when given, otherwise keeps the existing default
      (`createdAt desc`) — additive, non-breaking for existing callers.
      Unit tests (3 new cases) + e2e (relative-ordering assertion scoped
      to the test's own two products so 86 coexisting real products can't
      make it pass by accident, plus an invalid-value 400 case). Docs
      updated: `.claude/artifacts/backend/API_REFERENCE.md` (both
      `vom-back`'s and the `vom-front` copy).
      **`reviewer` pass: no blocking findings.** One should-fix, found and
      fixed: while writing the e2e test, discovered the pre-existing
      `'deletes the product'` test's cleanup used `createdIds.pop()`
      (removes the *last* array element) after deleting the *first*
      element via the HTTP endpoint — silently correct only because the
      shared `createdIds` array had exactly one entry by the time that
      test ran in every test added to this file so far. This session's
      new sort test was the first to ever push a second id before the
      delete test runs, which would have made `.pop()` remove the wrong
      (still-live) id and leak it. Fixed generally, not just worked
      around: `createdIds.pop()` → `createdIds.splice(createdIds.indexOf(id), 1)`
      (removes by value, correct regardless of array length/order); the
      new sort test also doesn't touch the shared array at all, tracking
      its own id locally and self-cleaning via `try/finally` +
      `safeDeleteByIds`, matching the pattern already established in
      `orders.e2e-spec.ts`. Re-verified: 228/228 unit, 72/72 e2e, DB
      counts stable (orders:10, products:86, senders:1, users:3) before
      and after.

## Brand/group split ("vom" / "m") across product types, expenses, dashboard

- [x] **Done.** User (spec provided directly by frontend, fully explicit —
      no open design questions): introduce a "group"/"brand" concept
      spanning three areas.
      (1) `ProductType.brand` — new **required** `String` field
      (`sticker`→`'m'`, `keychain`→`'vom'`, `custom_sticker`→`'vom'`).
      Backfilled via `prisma/seed.ts`'s existing `upsert` `update` clauses
      (matches this project's established convention for evolving seeded
      dictionary rows) — user is aware the seed must be re-run after
      deploy, since a new required field on documents that don't yet have
      it breaks reads on MongoDB until then. `ProductTypeDto` +
      `GET /dictionaries/product-types` expose it.
      (2) `Expense.brand` — new **optional** `String?` (`'vom'`|`'m'`|
      `null`, null meaning "shared" — existing documents without the field
      already read as `null` natively on Mongo, no backfill needed here).
      `CreateExpenseDto`/`UpdateExpenseDto` gain `brand?: 'vom'|'m'|null`;
      on update, an explicit `null` clears it back to shared (distinct
      from omitting the field, which leaves it untouched) —
      `dto.brand !== undefined` gating, same pattern this codebase already
      uses for other optional partial-update fields.
      (3) `GET /dashboard?...&brand=vom|m` — when given, scopes revenue to
      only the order line items whose `productTypeId` belongs to that
      brand's product types (`items: { some: { productTypeId: { in:
      typeIds } } }`), scopes expenses to `brand` equal to the chosen
      group (excluding shared), and adds a `sharedExpenses` figure (sum of
      `brand: null` expenses in the period, independent of which brand was
      requested) — `null` when no `brand` filter is applied, since shared
      expenses are already folded into the unfiltered `totalExpenses` in
      that case. Omitting `brand` keeps every existing dashboard behavior
      unchanged.
      **Real bug found and fixed while implementing `sharedExpenses`:** on
      MongoDB, Prisma's `where: { brand: null }` matches only documents
      with an *explicit* `null` — not documents where `brand` is missing
      entirely (even though reading such a document back still surfaces
      `brand: null` in JS, and raw MongoDB's own `{brand: null}` query
      matches both). Confirmed live against Atlas with a throwaway script
      before fixing. Since "existing expenses without the field are
      shared" is an explicit requirement, the `sharedExpenses` aggregate
      now uses `where: { OR: [{ brand: null }, { brand: { isSet: false }
      }] }` (Prisma's Mongo-only `isSet` filter) instead of a bare
      `brand: null`. Documented as a general gotcha in
      `.claude/instructions/db-conventions.md` so the next nullable-field-
      as-sentinel doesn't rediscover this from scratch.
      Unit tests added/updated in `dictionaries.service.spec.ts` (brand
      mapping), `expenses.service.spec.ts` (create defaults/sets brand,
      update leaves-untouched/sets/clears-to-null), `dashboard.service.spec.ts`
      (brand-scoped revenue/expenses/sharedExpenses, including the
      isSet-fixed aggregate call shape). e2e tests added in
      `test/dictionaries.e2e-spec.ts`, `test/expenses.e2e-spec.ts`
      (self-contained brand create/clear + invalid-value 400, no shared-
      array cleanup risk), `test/dashboard.e2e-spec.ts` (a mixed-brand
      order + vom/m/shared expenses, date-scoped like the CRM module's
      earlier fix so the real orders already in this shared dev DB can't
      pollute the exact-total assertions). `reviewer` pass: no blocking
      findings — confirmed `isSet` was needed in exactly one place (the
      `sharedExpenses` aggregate; the brand-equality filters elsewhere
      correctly don't need it), structure/standards/security/DB-conventions
      all clean. 240/240 unit, 79/79 e2e; DB counts stable
      (orders:128, products:99, senders:2, users:3, expenses:5) before and
      after.
      **Flagged by `reviewer`, unrelated to this feature, not fixed here:**
      an untracked `i.json` (≈51KB, real customer names/phones/order data
      from an earlier recovery task) sits in the repo root, not gitignored
      — worth deciding whether to delete it or add it to `.gitignore`
      before it risks being staged.
      (Follow-up: user asked for it to be deleted — done, untracked file
      removed, nothing to revert in git.)

## Bug: order creation near midnight fails Nova Poshta's "datetime < now" check

- [x] **Done.** User: reported that creating an order at/after roughly 00:00 (Kyiv
      time) intermittently fails with a Nova Poshta validation error about
      the waybill datetime being in the past. **Root cause confirmed
      live, not guessed:** `NovaPoshtaService`'s `formatNovaPoshtaDate()`
      (used only for `InternetDocument.save`'s `DateTime` field in
      `createWaybill()` — the one and only call site, grepped to confirm)
      built the date from `Date.prototype.getDate()`/`getMonth()`/
      `getFullYear()`, which read the calendar day in the **Node
      process's own local timezone**, not Ukraine's. If the production
      host's timezone differs from `Europe/Kyiv` (this dev machine
      happens to already be configured as Kyiv time, which is why the bug
      never reproduced locally — but a server defaulting to UTC, a very
      common cloud-hosting default, would not), then for roughly the
      first ~2-3 hours after Kyiv midnight (the UTC+2/+3 offset), the
      process's local calendar day is still "yesterday" while Kyiv's has
      already rolled to "today" — so the waybill gets created with
      yesterday's date, which Nova Poshta correctly rejects as being in
      the past. Reproduced directly: running the old function under a
      simulated `TZ=UTC` process against a timestamp that's 01:30 Kyiv
      time yields `12.09.2026` (wrong, previous day) instead of the
      correct `13.09.2026`.
      **Fix:** `formatNovaPoshtaDate()` now computes the date explicitly
      in `Europe/Kiev` via `Intl.DateTimeFormat(..., { timeZone:
      'Europe/Kiev' }).formatToParts()`, independent of whatever timezone
      the server process itself is configured with — the correct approach
      since Nova Poshta is a Ukraine-only service and always expects its
      own local date, not the caller's. (`Europe/Kiev` used over the
      newer `Europe/Kyiv` spelling for older-ICU compatibility on
      whatever Node build runs in production; confirmed both resolve to
      the same IANA zone on this dev machine's Node 24.) `updateWaybill`
      was checked and confirmed to never send a `DateTime` field at all
      (Nova Poshta only accepts it at creation), so this was the only
      call site needing the fix.
      Unit test added (`nova-poshta.service.spec.ts`): fakes system time
      to a UTC instant that's 01:30 on the *next* Kyiv calendar day and
      asserts the real `createWaybill()` call sends that next day's date.
      **`reviewer` pass (one round), two should-fixes found and fixed:**
      (1) a stray comment on the new test (this project's code standards
      are zero-comments, no exceptions) — removed; (2) the actual
      regression-test claim didn't hold up — the test tried to fake a
      non-Kyiv environment by mutating `process.env.TZ` mid-test, but
      empirically (confirmed by deliberately reverting the fix and
      re-running) Node/V8 caches the resolved ICU timezone the first time
      something touches `Date`/`Intl` in a process, so changing `TZ` after
      Jest (or any earlier test file in the same worker) has already
      warmed that cache has no effect — the test kept passing against the
      *reverted, buggy* implementation on this dev machine, exactly
      because its ambient OS timezone already happens to be Kyiv.
      **Real fix for the test itself:** `formatNovaPoshtaDate` is now
      exported, and a second test spawns a genuinely fresh child process
      (`node -r ts-node/register -e ...`) with `TZ=UTC` set *before* that
      process starts (the only point at which changing `TZ` is guaranteed
      to take effect) and asserts its output. Verified both directions by
      hand before finalizing: temporarily reverted `formatNovaPoshtaDate`
      to the old `getDate()`-based logic and confirmed the child-process
      test correctly fails (`12.09.2026`, wrong day) while the in-process
      fake-timer test still incorrectly passed on this machine — proving
      the child-process version is the one that actually regression-tests
      the bug, and the original approach was not. Re-applied the real fix
      immediately after confirming this. A fast, non-spawning unit test
      was also kept alongside it for quick logic coverage of the
      Kyiv-midnight case — note (per `reviewer`'s second pass): that fast
      test alone doesn't discriminate old vs. new code on a Kyiv-timezone
      machine (same confound as before), so it's supplementary coverage
      only, not itself a regression guard — the child-process test carries
      that role. 243/243 unit, 79/79 e2e passing; DB counts stable
      (orders:128, products:99, senders:2, users:3, expenses:5) before and
      after. **`reviewer`'s second pass independently re-verified the
      revert/restore cycle itself** (not just trusting the report) and
      came back fully clean — no further findings.

## Filter GET /orders by productTypeId

- [x] **Done.** User: add the same `productTypeId` filter `GET /crm/table`
      already has to `GET /orders` — explicitly specified as copying the
      existing `ListCrmQueryDto`/`crm.service.ts` mechanism verbatim, not
      designing a new one. `ListOrdersQueryDto` gains the identical
      `productTypeId?: string` field (`@IsOptional() @IsMongoId()`);
      `OrdersController.findAll` passes it through alongside
      `dateFrom`/`dateTo`; `OrdersService.findAll` gains the same
      `items: { some: { productTypeId } }` where-clause fragment already
      live in `crm.service.ts`. No new mechanism, no design questions.
      Unit test added (`orders.service.spec.ts`, mirrors the CRM
      equivalent); e2e test added (`test/orders.e2e-spec.ts`) — filters by
      the seeded order's own `sticker` type (included) and by `keychain`
      (excluded), via `.some()` membership checks rather than exact counts
      (same reasoning as the CRM/products-sort tests: ~128 real orders
      already live in this shared dev DB). Docs synced
      (`API_REFERENCE.md`, both `vom-back`'s and `vom-front`'s copies).
      `reviewer` pass: no blocking findings — confirmed the copied
      `where`-fragment doesn't interact badly with `dateFrom`/`dateTo`
      (disjoint top-level keys) and correctly doesn't need CRM's
      `shipmentStatusId`/`sortOrder` extras, which Orders was never asked
      to support. 244/244 unit, 80/80 e2e; DB counts stable
      (orders:128, products:99, senders:2, users:3, expenses:5).
      **Side finding from `reviewer`'s own (accidental) misuse, fixed
      separately:** running e2e without the project's required
      `NODE_OPTIONS=--experimental-vm-modules` flag made `/auth/2fa/setup`
      fail for every spec file, and — since `createAuthenticatedUser`
      created each test `User` document *before* attempting login/2FA and
      had no cleanup path of its own on failure — leaked 8 orphaned
      `e2e-*-auth-user-<uuid>` documents into the live shared dev DB
      (users 3 → 11) that no `afterAll` could ever reach, since the
      rejected `createAuthenticatedUser()` call meant the calling spec's
      `authUserId` variable was never assigned. Confirmed and deleted the
      8 leaked documents by exact id (verified each was an `e2e-`-prefixed
      login, real admin accounts `admin_o`/`admin_m`/`admin_v`
      untouched). **Root cause now fixed, not just cleaned up:**
      `createAuthenticatedUser` (`test/support/auth-helper.ts`) wraps its
      post-create login/2FA-setup/2FA-confirm calls in `try/catch` and
      deletes the just-created user by its own id before rethrowing on any
      failure — so a transient failure partway through (wrong npm
      invocation, a flaky call, otplib's ESM-import issue, etc.) can no
      longer leak an untracked user, regardless of what triggers it.
      Verified by re-running the full e2e suite correctly afterward: 3
      users (the real admins) both before and after, no leak.
      **`reviewer` pass on this fix specifically, one should-fix
      addressed:** the cleanup `prisma.user.delete` itself wasn't guarded
      — if it threw (e.g. a transient DB blip), that secondary error would
      mask the real original failure from whoever's debugging the run.
      Fixed with `.catch(() => {})` on the cleanup delete so it's always
      best-effort and the original error is always what propagates.
      Everything else in that pass came back clean (delete-by-own-id
      confirmed structurally incapable of the historical
      `deleteMany({where:{id:undefined}})` wipe pattern, since Prisma's
      `delete()` requires a real unique id at the type level; fix
      correctly centralized, covers all 8 call sites via the one shared
      helper; a separate, pre-existing, out-of-scope observation noted —
      each spec file's own `beforeAll` can still fail *after*
      `authUserId` is assigned, but that's already covered by Jest running
      `afterAll` regardless). Re-verified after this last fix: 244/244
      unit, 80/80 e2e, DB counts stable (orders:128, products:99,
      senders:2, users:3, expenses:5) before and after.

## Two new real Nova Poshta status codes surfaced unmapped in production logs

- [x] **Done.** User: reported (real production `WARN` log lines, not
      guessed) that NP `StatusCode` `"107"` ("Прибула до відділення") and
      `"104"` ("Змінено адресу") were showing up unmapped in
      `OrdersService.syncStatus`/`syncAllStatuses`'s warning log ("does
      not map to any known shipment status — leaving it unchanged").
      **User's explicit mapping decision:** `107` → the existing
      `delivered` status (folded in alongside `7`/`8`); `104` → a brand
      new status the user wants labeled "переадресовано" (redirected).
      Confirmed via `orders.service.ts` that the whole
      NP-code→shipment-status mapping is 100% dictionary-driven
      (`prisma.shipmentStatus.findFirst/findMany` + `npStatusCodes.has`/
      `.includes`, no hardcoded status list anywhere in `src/`) — so this
      was a pure `prisma/seed.ts` data change, no application code
      touched. Shipped: `'107'` added to `delivered`'s `npStatusCodes`;
      new `shipment_statuses` row (`code: 'redirected'`,
      `label: 'Переадресовано'`, `npStatusCodes: ['104']`) — `code:
      'redirected'` follows the existing English-snake-case convention
      (`shipped`/`delivered`/`received`/`refused`), a mechanical extension
      not a design call. Re-ran the seed against the live Atlas DB;
      verified live afterward that both NP codes resolve via the exact
      query shape `orders.service.ts` uses (`107`→`delivered`,
      `104`→`redirected`), and that the seed's own duplicate-NP-code
      assertion still passed. `dashboard.service.ts`'s
      `shipmentStatusBreakdown` picked up the 5th status automatically
      (generic `findMany()`, no code change needed).
      Docs synced: `.claude/artifacts/backend/API_REFERENCE.md` (both
      copies) and `.claude/artifacts/frontend/VOM_SYSTEMS.md` (both
      copies — Orders-list status filter row + Dashboard status-breakdown
      row both now list "Переадресовано" too).
      `test/dashboard.e2e-spec.ts`'s "four shipment statuses" test wasn't
      broken (used `arrayContaining`, not an exact-length check) but its
      name/assertion list were stale — renamed and extended.
      **`reviewer` pass: no blocking findings.** Independently re-ran the
      seed and the live verification queries rather than trusting the
      report; grepped every `shipmentStatus` consumer in `src/` and
      confirmed `dashboard.service.ts` is genuinely the only ripple point
      (already flagged, not fixed, out of scope for backend). One
      additional flag from `reviewer`, addressed here: the frontend design
      source `VOM_SYSTEMS.md` (both repos' copies) and a static design
      mockup HTML still literally enumerate 4 statuses — the `VOM_SYSTEMS.md`
      copies are now updated; the mockup HTML under "Дизайн проекту" is a
      frozen design-tool export, left untouched (whoever owns the frontend
      build should know a 5th status now exists in the real dictionary).
      244/244 unit, 80/80 e2e; DB counts stable (orders:128, products:99,
      senders:2, users:3, expenses:5, shipment_statuses:5).

## Split dashboard revenue by delivery status (realized/pending/lost)

- [x] **Done.** User (fully explicit spec, no open design questions):
      dashboard `totalRevenue` previously summed every order in the
      period regardless of `shipmentStatusId` — a refused order counted
      the same as a received one. Added three new buckets:
      `realizedRevenue` (status `received` — money actually in hand),
      `pendingRevenue` (no status yet, or `shipped`/`delivered`/
      `redirected` — deal still alive), `lostRevenue` (status `refused` —
      deal fell through). `profit` changed from `totalRevenue -
      totalExpenses` to `realizedRevenue - totalExpenses`; `totalRevenue`
      itself stays as the existing gross figure. Reuses the
      already-fetched `shipmentStatuses` (no new query) and the existing
      `revenueOf(order)` helper, so the `brand` filter scopes these three
      buckets by matching line items exactly like `totalRevenue` already
      does. `DashboardResponseDto` gained the three new `@ApiProperty()`
      fields (plain `number`, never `null` — unlike `sharedExpenses`,
      these are always computed regardless of `brand`); `profit`'s
      description updated to match the new formula.
      Unit tests: updated the pre-existing profit assertion for the new
      formula; new `describe('revenue split by delivery status...')`
      block with a 6-order fixture including a deliberately-unknown
      status id, covering each bucket's exact sum, the `profit` formula,
      and the partition invariant; added a bucket assertion to the
      existing `brand` describe block. e2e tests: invariant + new-formula
      assertions added to the existing "seeded order" and "zero-orders"
      tests and to all three `brand` filter tests; a new date-scoped
      `describe` block seeds real `received`/`refused`/unsynced orders
      (same technique as the existing `brand` block, to avoid the ~128
      real production orders in this shared dev DB polluting exact-sum
      assertions) and asserts all three buckets + the invariant + profit
      together. Docs synced: `API_REFERENCE.md` (both `vom-back`'s and
      `vom-front`'s copies) — new fields, the partition invariant, the
      `profit` formula change, and `brand`-scoping behavior all
      documented. **Deliberately not touched:** `VOM_SYSTEMS.md` — the
      user's instructions were explicitly scoped to backend files +
      `API_REFERENCE.md`; adding new UI metric cards to the frontend
      design-source spec is a scope expansion / design decision left for
      the user or frontend team, not guessed at here.
      **`reviewer` pass: no blocking findings.** Specifically verified: a
      stale/deleted `shipmentStatusId` (not present in the fetched
      `shipmentStatuses` set) correctly falls into `pendingRevenue`
      rather than being dropped or double-counted; the invariant holds
      under the `brand` filter and the zero-orders case; no stale
      `totalRevenue - totalExpenses` references left anywhere in source
      or docs. One nit noted, pre-existing and out of scope: the
      deliberate, already-documented UTC-bucketing comment in
      `groupRevenueByDay` still technically violates the zero-comments
      rule (unrelated to and untouched by this change).
      250/250 unit, 81/81 e2e; DB counts stable (orders:128, products:99,
      senders:2, users:3, expenses:5).

## Filter GET /orders by senderId

- [x] **Done.** User: frontend needs a sender filter on the orders page. Backend:
      `ListOrdersQueryDto.senderId` (`@IsOptional() @IsMongoId()`),
      passed through `OrdersController.findAll` to
      `OrdersService.findAll` (`...(senderId && { senderId })`, ANDed with
      the existing date/`productTypeId` filters). The sender dropdown data
      already exists (`GET /senders`, max `pageSize` 100), no new endpoint.
      Known edge, flagged to frontend rather than built speculatively:
      `GET /senders` hides deactivated senders, so their historical
      orders can't be selected via that dropdown. Unit tests (single
      filter + combined with `productTypeId`), e2e tests (match, no-match
      → empty list, malformed id → 400), `API_REFERENCE.md` (both copies)
      updated. 252/252 unit, 83/83 e2e, DB stable.
      `reviewer` pass: no findings (noted `findAll`'s 6 positional params as a
      nit — switch to passing the whole query DTO if a 7th filter arrives).

## Everything date-related in Kyiv time (dashboard/orders/CRM filters + day bucketing)

- [x] **Done.** User: "everything must be in Kyiv time" — triggered by the dashboard
      showing nothing for 25.09 right after Kyiv midnight (the 00:01 Kyiv
      order was stored as 24.09T21:01Z, bucketed/filtered as 24.09).
      **Reverses the earlier documented decision** to bucket
      `revenueByDay` by UTC day (that was a deliberate trade-off then;
      the user now explicitly wants Kyiv). Frontend confirmed to send raw
      date-input values (`YYYY-MM-DD`) for `dateFrom`/`dateTo` on
      dashboard/orders/CRM. New `src/shared/utils/kyiv-time.ts`
      (`parseRangeStart`/`parseRangeEnd`/`kyivDayKey`, `Intl`-based with
      explicit `Europe/Kiev`, independent of the process TZ): date-only
      `dateFrom` → Kyiv 00:00; date-only `dateTo` → last millisecond of
      that Kyiv day (this also fixes a latent bug: `dateTo=25.09` used to
      mean `lte 25.09T00:00Z`, silently excluding the selected end day);
      full ISO timestamps pass through unchanged. Applied to
      `DashboardService`, `OrdersService.findAll`, `CrmService.findTable`;
      `groupRevenueByDay` uses `kyivDayKey` (also removes the old
      zero-comments-violating UTC comment). Unit tests (util incl. DST
      days, process-TZ independence; service expectations moved to Kyiv
      boundaries; day-bucketing test), e2e test seeding an order at 00:30
      Kyiv. `API_REFERENCE.md` (both copies) updated.
      `reviewer` pass: no blocking findings; DST days (2026-03-29,
      2026-10-25), month/year rollover and the `h23` midnight edge
      independently verified; no other UTC/process-local date logic left
      in `src/`. Two nits left as-is: a calendar-invalid but well-formed
      date such as `2026-02-31` passes `@IsDateString()` and now rolls to
      03-03 instead of erroring (a date input can't produce it; use
      `@IsDateString({ strict: true })` if strictness is ever wanted);
      `'Europe/Kiev'` is duplicated between `kyiv-time.ts` and
      `nova-poshta.service.ts`. 265 unit, 84 e2e, DB stable (orders:250,
      users:3).

## Search by waybill number / recipient name (Orders + CRM table)

- [x] User: add search by waybill number or recipient full name (ПІБ) to
      the Orders page and the CRM table page. Single optional `search`
      query param (max 100 chars, `@IsString() @IsNotEmpty()`) on both
      `GET /orders` and `GET /crm/table`. Shared
      `src/shared/utils/order-search.ts` (`buildOrderSearchFilter`): split
      on whitespace, every token must match (case-insensitive `contains`,
      regex-escaped via the existing `escapeRegExp`) `npWaybillNumber` OR
      recipient `lastName`/`firstName`/`middleName` — so a multi-word ПІБ
      matches across fields. Prisma composite-type filter syntax
      (`recipient: { is: { ... } }` + `mode: 'insensitive'`) verified live
      against Atlas before implementing. Also refactored
      `OrdersService.findAll` from 7 positional params to
      `(page, pageSize, query: ListOrdersQueryDto)` (matches
      `CrmService.findTable`; addresses `reviewer`'s earlier "switch when a
      7th filter arrives" nit). Unit tests (util, both services), e2e tests
      (both endpoints), `API_REFERENCE.md` (both copies).

## shipmentStatusId filter on GET /orders

- [x] Frontend agent: add `shipmentStatusId` query filter to `GET /orders`,
      mirroring `GET /crm/table`'s existing filter but additionally
      accepting the literal `"none"` for orders with no shipment status
      yet. `ListOrdersQueryDto.shipmentStatusId` validated with
      `@Matches(/^(none|[0-9a-fA-F]{24})$/)` (plain `@IsMongoId()` can't
      express the "none" escape hatch). `OrdersService.findAll` deviates
      from the frontend agent's literal suggestion (a plain
      `shipmentStatusId: null`): verified live against Atlas that of 290
      real orders 0 have the field entirely unset (every one goes through
      `OrdersService.create()`, which always explicitly sets
      `shipmentStatusId: null`), but per the `isSet` gotcha in
      `db-conventions.md` a document created without the field at all
      (e.g. a future script/import/migration bypassing the service) would
      be missed by a bare `null` filter. So `"none"` maps to
      `{ OR: [{ shipmentStatusId: null }, { shipmentStatusId: { isSet:
      false } }] }` instead, otherwise the id passes through unchanged.
      Unit tests (plain id + the `OR`/`isSet` shape for `"none"`), e2e
      tests (matching order, `"none"` excluding a statused order — the
      no-status fixture is created via a raw `prisma.order.create()`
      without the field, so it's genuinely unset and actually exercises
      the gap being fixed, not just explicit `null` — and a malformed
      value rejected with 400), `API_REFERENCE.md` (both copies).
      `reviewer` pass: no blocking findings. Flagged for later (not fixed,
      out of scope): `GET /crm/table`'s own `shipmentStatusId` filter has
      no `"none"`/`isSet` handling at all — same asymmetry noted when the
      search feature shipped.

## isSettled flag on Order (PATCH /orders/:id/status-flags)

- [x] User: add an optional manual checkbox flag `isSettled` to Order —
      means the money was sorted out and everything due was transferred.
      Boolean, default `false`, same shape as `isPacked` / `isOutOfStock`.
      Set by the frontend through the existing
      `PATCH /orders/:id/status-flags` (`SetOrderStatusFlagsDto`), returned
      on `OrderResponseDto`. No filter on list endpoints yet (not requested).
      Schema change: `Order.isSettled Boolean @default(false) @map("is_settled")`
      (no `db push` — Mongo field addition only, `prisma generate`).
      Unit + e2e tests, `API_REFERENCE.md` (both copies).
