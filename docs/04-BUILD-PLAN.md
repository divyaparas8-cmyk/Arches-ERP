# 04 — Build Plan

Thirteen tickets, in order. Don't skip ahead: later tickets assume earlier ones exist.

Each ticket has a **prompt** you can paste into Claude Code as-is, and **acceptance criteria**. A ticket is done when every box is true, `npm run test && npm run build` pass, and you've clicked the flow in a browser. Update `docs/PROGRESS.md` and move on.

Estimates assume a competent developer working with Claude Code.

---

## Ticket 0 — Project setup (½ day)

**Prompt**
> Set up a new Next.js 15 project with the App Router, TypeScript, Tailwind CSS and Prisma. Add Vitest. Create `docs/` and copy the handoff files into it, including `CLAUDE.md` at the repo root. Configure Tailwind with the exact design tokens in `docs/06-UI-KIT.md` — extend the theme with the six brand colours, the Neue Haas Display font stack and a `2px` default radius. Load the Neue Haas Display fonts from `public/fonts` with `next/font/local`. Set up a `.env.example` with DATABASE_URL, NEXTAUTH_SECRET, XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI, RESEND_API_KEY. Create `docs/PROGRESS.md`.

**Done when**
- [ ] `npm run dev` serves a page using Neue Haas Display
- [ ] `bg-near-black`, `bg-off-white`, `border-warm-grey` etc. resolve in Tailwind
- [ ] `.env.example` committed, `.env` gitignored

---

## Ticket 1 — Schema, seed, Prisma client (1 day)

**Prompt**
> Translate `docs/02-SCHEMA.sql` into `prisma/schema.prisma`, keeping every table, enum, constraint and index. Money fields are `Int` and named `*Pence`. Run the migration against the dev database. Write `prisma/seed.ts` that inserts everything in `docs/03-SEED.sql`, hashing seed user passwords with bcrypt from an env var. Add `npm run db:reset` that drops, migrates and reseeds.

**Done when**
- [ ] `npm run db:reset` produces 6 vendors, 20 colorways, 15 SKUs, 10 embellishments, 8 clients, 5 users, 8 orders, 11 line items
- [ ] Prisma Studio shows an order with its lines, embellishments and Xero record
- [ ] The `client_users_have_a_client` check constraint rejects a client user with no client_id

---

## Ticket 2 — Pricing module + tests (1 day)

Read `docs/01-SPEC.md` §2 carefully. This is the heart of the app.

**Prompt**
> Create `lib/pricing.ts` with pure functions, no DB access, all money in integer pence: `blankSell`, `embSell`, `unitSell`, `lineTotal`, `orderValue`, `deposit`, `balance`, `blankCost`, `embCost`, `unitCost`, `lineCost`, `orderCost`, `grossProfit`, `marginPct`, `costComposition`, `sellFromCost`, and `formatGBP(pence, decimals)`. Follow `docs/01-SPEC.md` §2 exactly — in particular, a line-level sell override replaces the sell build-up but never affects the cost side, and overridden lines are excluded from the cost-composition split. Write Vitest tests covering: a plain line, a line with three embellishments, a line with a sell override, per-line vendor cost overrides, an order mixing all of those, zero-revenue margin, and `sellFromCost` at 55%.

**Done when**
- [ ] Every function is pure and exported with explicit types
- [ ] Tests cover all seven cases and pass
- [ ] Calculating order ARC-1042 from seed data gives the same numbers as the prototype

---

## Ticket 3 — App shell, auth and roles (1 day)

**Prompt**
> Add Auth.js with a credentials provider over the `users` table. Build the app shell from the prototype: 236px fixed sidebar on `#0F0E0C` with the ARCHES™ wordmark, PRODUCTION ERP sub-label, nav items (Dashboard, New Quote, Catalog, Clients, Vendors, Invoices), a bordered "Client portal view" link, and a SIGNED IN AS block showing the logged-in user's name and role. Content area on `#F4F2EE`. Create `lib/auth.ts` with `requireUser()` and `requireRole(roles)` helpers for server actions, and middleware that sends unauthenticated users to `/login` and `role = 'client'` users to `/portal`. Build a login page in the brand style — no illustration, no card shadow.

**Done when**
- [ ] All four internal roles can log in and see their name in the sidebar
- [ ] A client user hitting any internal route is redirected to `/portal`
- [ ] `requireRole(['accounting'])` throws for a sales user

---

## Ticket 4 — Read-only screens: Dashboard, Catalog, Clients, Vendors (2 days)

**Prompt**
> Build four read-only screens exactly as in the prototype and `docs/01-SPEC.md` §4. Dashboard: KPI row, internal-only margin strip on black, 8-cell order pipeline with click-to-filter, Active / Declined tabs, and the two-line orders table with colorway swatches and stage dots. Catalog: blanks table (with cost and base columns rendered read-only for now), add-ons card, colorways swatch grid. Clients and Vendors tables. Use `lib/pricing.ts` for every figure. Server components, no client JS except the pipeline filter and tabs. Use the measurements in `docs/06-UI-KIT.md`.

**Done when**
- [ ] Dashboard figures match the prototype for the seeded data
- [ ] Clicking a pipeline cell filters the table; "Clear filter" restores it
- [ ] The margin strip is not rendered at all for a `client` role
- [ ] Layout holds down to a 680px content width

---

## Ticket 5 — Catalog editing (½ day)

**Prompt**
> Make the catalog editable. Cost £ and Base £ become number inputs that save on blur via a server action, as do embellishment cost and price. Add the footer bands for adding a style, an add-on and a colorway. Every catalog price change writes an activity-log entry against nothing (a global log) and takes effect immediately in every order whose lines don't override that component. Gate edits to owner and sales.

**Done when**
- [ ] Editing a SKU base price changes the value of every non-overridden order using it
- [ ] Adding a SKU makes it selectable in the quote builder
- [ ] A production user sees the values but cannot edit them

---

## Ticket 6 — Quote builder (2 days)

**Prompt**
> Build `/quotes/new` per `docs/01-SPEC.md` §4.2 and the prototype. Client & Timeline card; Add Line Item card with the inline "+ New SKU" form that writes to the catalog and selects the new SKU; SKU select, colorway select with a live swatch inside the field, qty, and embellishment chips in a 2-up grid that invert to black when selected. Then the expandable cost & margin panel: a black header showing `Cost £x · Sell £y · z%`, opening to per-component rows with vendor select, cost input, sell input and per-component margin, plus a target-margin reprice control. Each edit can be saved to the catalog or to this quote only — default quote-only, which writes a line override. Below, the unit build-up panel, a sell override input, the line estimate and Add line. Right column: sticky quote summary with per-line build-up, cost and margin, subtotal at 28px/900, and `Create quote & open order`, which creates the order at stage 0 with an "Quote draft created" log entry and redirects to it.

**Done when**
- [ ] A quote with two lines, mixed embellishments and one vendor-cost override saves and reopens with identical numbers
- [ ] "Save to catalog" changes the default; "this quote only" does not
- [ ] Order IDs allocate from the `order_seq` sequence with no collisions under concurrent creates

---

## Ticket 7 — Order detail and the stage machine (3 days)

**Prompt**
> Build `/orders/[id]` per `docs/01-SPEC.md` §4.7. Create `lib/stages.ts` with `advance(orderId, userId)` and `revertTo(orderId, stage, reason, userId)` holding all transition side effects: stage 4→5 sets progress 0 and prodStart today; 6→7 logs balance paid and packing; 3→4 triggers a Xero push when auto-push is on; reverting below 5 clears progress and prodStart, below 7 clears tracking, below 3 requeues the Xero record, and always appends the reason to the order thread. Every transition and every amendment writes an activity-log row inside the same `prisma.$transaction`. Then build the screen: lifecycle rail with reopen affordances, the black action card with the per-stage copy from the spec, financials grid, internal margin strip with reprice control, cost composition, Xero card, editable line items (qty, unit, vendor cost block, add/remove line — editable at stages 0–4 only), the comment thread with its reopen row, the 20% milestone list at stage 5, the tracking block at stage 7, the activity log, and the decline/delete row.

**Done when**
- [ ] An order can be walked 0 → 7 and back to any earlier stage
- [ ] Reverting from 6 to 2 clears progress and prodStart and requeues Xero
- [ ] Editing a qty at stage 3 updates financials, margin, composition and the dashboard immediately, and writes an "Order amended" log row
- [ ] Line items are read-only at stage 5+
- [ ] Role gates hold: only accounting can mark the deposit received
- [ ] Every mutation has a corresponding activity row — verify by counting rows before and after

---

## Ticket 8 — Artwork approval per SKU (1½ days)

**Prompt**
> Build `/orders/[id]/artwork/[lineId]`. Per-SKU artwork record with a version number, file upload (store in S3-compatible storage or Vercel Blob; accept PDF, PNG, AI up to 25MB), approve and request-changes actions, an internal comment thread and a client comment thread, kept separate from the order-level thread. Uploading a new version bumps `ver` and clears `approved`. Stage 2 can only advance when every line's artwork is approved — disable the advance control and say why. Each artwork event writes a log entry naming the style.

**Done when**
- [ ] Two SKUs on one order can be at different artwork versions and approval states
- [ ] Advance from stage 2 is blocked until both are approved
- [ ] Uploading V3 clears approval and logs it

---

## Ticket 9 — Client portal (2 days)

Read the non-negotiable in `README.md` before starting.

**Prompt**
> Build `/portal` for users with `role = 'client'`. Create `lib/portal-queries.ts` as the only data access the portal uses, selecting client-safe fields explicitly: order id, stage, progress, weeks, line items (style name, SKU code, colorway, qty, unit sell, line total), order value, deposit, balance, shipping, tracking, carrier, artwork awaiting approval, and the order comment thread. It must never select vendor, cost, margin or activity-log data — add a Vitest test asserting the returned object has no key matching /cost|margin|vendor|profit/i, recursively. The portal shows the client's orders, an order detail view with stage progress, per-SKU artwork approval with comments, quote approval (stage 0 → 1), and the comment thread. Same visual language as the internal app, without the sidebar nav.

**Done when**
- [ ] The recursive no-cost-keys test passes
- [ ] A client approving artwork updates the internal view and writes a log entry
- [ ] A client cannot reach another client's order by changing the URL — verify with a direct request
- [ ] View source on a portal page: no cost, margin or vendor string anywhere in the payload

---

## Ticket 10 — Xero OAuth in sandbox (2 days)

Follow `docs/05-XERO.md` step by step.

**Prompt**
> Implement the Xero integration per `docs/05-XERO.md` against a Xero demo company. OAuth 2.0 connect and disconnect flows, encrypted token storage in `xero_connection`, automatic refresh before expiry. `pushInvoice(orderId, kind)` creates an ACCREC invoice in Xero from the order, maps the client to a Xero contact (creating it if absent), uses the nominated sales account and 20% VAT, stores the returned invoice id and number, and writes both a log entry and the `xero_records` row in one transaction. A failed push sets status `error` with `last_error` and surfaces in the UI. `Sync now` pushes every queued record and pulls payment status back. Build the Invoices screen: connection panel, auto-push toggle, stat grid, and the two-line invoice table with Push to Xero on unsynced rows.

**Done when**
- [ ] Connecting to a Xero demo org persists tokens and shows the org name
- [ ] Pushing ARC-1049's deposit invoice creates a real invoice in the demo org with the right total and VAT
- [ ] Marking it paid in Xero and hitting Sync now updates the status in the app
- [ ] A deliberately broken push shows an error state, does not lose data, and can be retried
- [ ] Token refresh works after the access token expires

---

## Ticket 11 — Outbound email (1 day)

**Prompt**
> Add Resend and React Email. Build templates for: quote, order confirmation, artwork approval request, the five production milestones, balance invoice, and shipped-with-tracking. Brand voice: precise, understated, declarative, no hype, no emoji. Plain typographic layout matching `docs/06-UI-KIT.md`, tested in Gmail and Apple Mail. Every send writes an `email_log` row and an activity entry. Milestone emails fire automatically from the stage machine when progress crosses each 20% mark, using the fixed copy in `docs/01-SPEC.md` §5.

**Done when**
- [ ] All nine templates render and send in dev
- [ ] Pushing production from 40% to 60% sends exactly one email
- [ ] `email_log` records every send with its provider id

---

## Ticket 12 — Hardening and handover (1 day)

**Prompt**
> Audit every server action for a `requireRole` call and Zod validation. Add a test that walks an order through all eight stages and asserts the activity log has an entry for each mutation. Add error boundaries and empty states in the brand voice — plain sentences, no apology copy. Check every screen at a 680px content width. Write `docs/RUNBOOK.md`: environment variables, how to reset the database, how to reconnect Xero, how to add a user, what to do when a Xero push fails.

**Done when**
- [ ] No server action is reachable without a role check
- [ ] The full-lifecycle test passes
- [ ] `npm run build` is type-clean and `npm run test` is green
- [ ] RUNBOOK covers all five topics

---

## Suggested order of delivery for review

Show the client after Tickets 4, 7 and 10. Those are the three points where the thing becomes visibly real: it looks right, it works, it talks to their accounts.
