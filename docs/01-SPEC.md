# 01 — Product Spec

The source of truth for behaviour. Where this document and the prototype disagree, open the prototype and follow it.

---

## 1. Domain model

### Order lifecycle — 8 stages, indexed 0–7

| # | Stage | Meaning | Advance action |
|---|---|---|---|
| 0 | Quote | Quote drafted, not yet sent | Generate & send quote |
| 1 | Order Confirmation | Client approved the quote | Send order confirmation |
| 2 | Artwork Approval | Client reviewing artwork, per SKU | Approve artwork / send change notes |
| 3 | Invoice | Deposit invoice (50%) issued | Send deposit invoice |
| 4 | Deposit | Awaiting payment | Mark deposit received |
| 5 | In Production | Production timer running | Push 20% milestone updates |
| 6 | Ready / Balance | Complete, balance due | Send balance & pack |
| 7 | Shipped | Dispatched with tracking | — |

Short labels used in the pipeline strip: Quote, Confirm, Artwork, Invoice, Deposit, Production, Ready, Shipped.

Separately from stage, an order has a **status**: `active` | `declined`. Declined orders leave the live list and appear under a "Declined / closed" tab. They can be reopened to active, or deleted outright (with confirmation).

### Business rules

1. **The production timer starts only when the deposit is marked received** (stage 4 → 5). That transition sets `progress = 0` and `prodStart = today`.
2. **Client updates fire automatically at 20% increments** (20/40/60/80/100). Fixed copy, logged as sent by "System". See §5.
3. **Deposit is 50% of order value.** Balance = order value − deposit + shipping. Shipping is 0 until known and displays as "TBC".
4. **Line items are editable at stages 0–4.** From stage 5 the order locks.
5. **Any completed stage can be reopened.** Reopening logs the reason, resets `progress` and `prodStart` if it drops below stage 5, clears tracking if below 7, and requeues the Xero record if below stage 3.
6. **Declining an order** with a synced Xero record requeues it with the note "Order declined — void invoice in Xero".

### Entities

```
Order
  id             string   "ARC-1042", sequential, prefix ARC-
  clientId       FK → Client
  contact        string   named contact at the client
  stage          int      0–7
  status         enum     active | declined
  declinedReason string?
  weeks          int      delivery lead time
  created        date
  shippingPence  int      0 until known
  progress       int      0–100, production only
  prodStart      date?    set when deposit received
  tracking       string?
  carrier        string?  DHL Express | FedEx | UPS | Royal Mail
  lines          LineItem[]
  log            ActivityEntry[]
  comments       Comment[]      order-level thread

LineItem
  skuCode        FK → Sku
  colorCode      FK → Colorway
  qty            int
  emb            string[]  FK → Embellishment codes
  overridePence  int?      manual unit sell price; null = use build-up
  overrides      LineOverride  per-line vendor/cost/sell overrides (see below)
  art            Artwork       per-SKU artwork record

LineOverride            -- what makes this order's economics differ from the catalog
  blank: { vendor?, costPence?, sellPence? }
  emb:   { [code]: { vendor?, costPence?, sellPence? } }

Artwork
  ver        int      version number, starts at 1
  files      Asset[]  uploaded artwork files
  approved   bool
  comments   Comment[]   per-SKU thread, separate from the order thread

Sku
  code, name, cat, gsm
  basePence      int   default SELL price per unit   — editable in app
  costPence      int   default VENDOR COST per unit  — editable in app
  brand          string  Arches Blanks | Norte Mills | Ribeira Knit | ECONYL | Third-party
  vendor         FK → Vendor   default supplier

Embellishment
  code, name
  pricePence     int   default SELL add-on per unit  — editable
  costPence      int   default VENDOR COST per unit  — editable
  vendor         FK → Vendor

Colorway        code (3 letters), name, hex, vendorName (mill's own colour name)
Client          name, contact, email, loc, ordersCount
Vendor          name, type (capability), loc, lead (time)
ActivityEntry   date, text, who: Sales|Design|Production|Accounting|System|Xero
Comment         who: client|internal, name, text, date
XeroRecord      orderId, ref ("INV-2042"), status: synced|queued|error, note
User            name, email, passwordHash, role, clientId? (portal users)
```

### Categories
`T-Shirts | Sweats | Bottoms | Bags | Headwear | Outerwear | Accessories`

---

## 2. Pricing and margin

This is the part that must be exactly right. All of it lives in `lib/pricing.ts`.

### Sell side

```
blankSell(line)   = line.overrides.blank.sellPence   ?? sku.basePence
embSell(line, c)  = line.overrides.emb[c].sellPence  ?? embellishment.pricePence

unitSell(line)    = line.overridePence
                    ?? ( blankSell(line) + Σ embSell(line, c) for c in line.emb )

lineTotal         = unitSell(line) × qty
orderValue        = Σ lineTotal
deposit           = orderValue × 0.5
balance           = orderValue − deposit + shipping
```

### Cost side (internal only)

```
blankCost(line)   = line.overrides.blank.costPence  ?? sku.costPence
embCost(line, c)  = line.overrides.emb[c].costPence ?? embellishment.costPence

unitCost(line)    = blankCost(line) + Σ embCost(line, c)
lineCost          = unitCost(line) × qty
orderCost         = Σ lineCost

grossProfit       = orderValue − orderCost
marginPct(rev, cost) = rev > 0 ? round((rev − cost) / rev × 100) : 0
```

Note: a line-level `overridePence` replaces the sell build-up but **does not** change the cost side. Margin on an overridden line is still computed against its real vendor costs.

### Cost composition split (order detail "Cost composition" card)

```
blanksRevenue = Σ blankSell(line) × qty   for lines WITHOUT overridePence
embRevenue    = Σ Σ embSell(line,c) × qty for lines WITHOUT overridePence
```
Overridden lines are excluded from this split because the override replaces the build-up.

### Repricing from cost at a target margin

The quote builder and order detail both offer a target-margin control (default 55%).

```
sellFromCost(costPence, targetPct) = round( costPence / (1 − targetPct/100) )
```
Applied per component (blank and each embellishment) or to the whole line, per the control used. Every reprice writes an activity entry.

### Display

GBP, `en-GB`. Table currency at 0 decimals (`£12,480`). Unit prices at 2 decimals (`£16.00`). Margin as a whole-number percent (`56%`).

**The blank cost and each embellishment cost must be visible at every step** — quote builder, quote summary, and every order line. This was an explicit client requirement, not a nice-to-have.

---

## 3. Roles and permissions

Four roles. In the prototype the switcher is cosmetic; in production it gates actions server-side.

| Role | Person | Can |
|---|---|---|
| Owner | A. Reyes | Everything, including costs, margins and deletion |
| Sales | M. Duval | Quotes, amendments, client comms, stage advance 0→3, reopen, decline |
| Production | J. Costa | Production milestones, stage 5→6, artwork versions; sees costs, cannot edit sell prices |
| Accounting | P. Okafor | Mark deposit received (4→5), push to Xero, edit shipping, stage 6→7 |

Portal users are a fifth kind of account, scoped to one `clientId`, with access only to `/portal`.

Header shows `SIGNED IN AS · [name]`.

---

## 4. Screens

### Shell
Fixed 236px sidebar on `#0F0E0C`; content area on `#F4F2EE`. Sidebar: wordmark `ARCHES™` with `PRODUCTION ERP` beneath; nav (Dashboard, New Quote, Catalog, Clients, Vendors, Invoices); a bordered "Client portal view" button; then `SIGNED IN AS` and the role block.

### 1. Operations Dashboard
Top to bottom:
- **KPI row** — 4 white cards: Open Orders, Pipeline Value, Awaiting Approval, Awaiting Deposit. Value at 40px/900.
- **Margin strip** — labelled `MARGIN · INTERNAL ONLY`, on `#0F0E0C`, white text, 1px-gap grid: Revenue (active orders), Vendor cost, Gross profit, Blended margin.
- **Order pipeline** — 8 cells, count above short stage label. Click filters the list; an active filter shows "Clear filter".
- **Status tabs** — Active / Declined & closed.
- **All orders table** — two-line rows. Line 1: Order ID, Client, Items (colorway swatches + summary), Qty, Value. Line 2: 8 stage dots (6px squares, filled to current stage), stage name, next action with `→`. Whole row clicks through to Order Detail.

### 2. New Quote
Two columns, `1.15fr 0.85fr`, max-width 1180px.
- **Client & Timeline** — client select, delivery weeks.
- **Add Line Item** — a `+ New SKU` toggle opens an inline form (code, name, category, GSM, base sell, vendor cost, brand, vendor) that writes a new SKU to the catalog and selects it. Then SKU select, Colorway select with a live swatch inside the field, Qty, then embellishment chips in a 2-up grid (selected chips invert to black, each shows `+£price`).
- **Cost & margin panel** — a black header bar showing `Cost £x · Sell £y · z%` that expands to per-component rows: for the blank and for each selected embellishment, a Vendor select, a Cost £ input and a Sell £ input, with that component's margin. Editing here can be saved **to the catalog** (changes the default everywhere) or **to this quote only** (writes a line override). The user chooses; default is quote-only.
- **Unit build-up** — one row per component with its price, ruled off above a bold Unit cost total.
- Unit price override input, line estimate, `Add line`.
- **Quote Summary** (sticky, right) — one block per line: name and total, swatch · colorway · qty · unit, Remove, then the itemised build-up under a hairline, with cost and margin shown. Footer: Subtotal at 28px/900 and `Create quote & open order`, which creates the order at stage 0 and navigates to it.

### 3. Product Catalog
- **Blanks table** — SKU, Name, Category, GSM, Brand, Vendor, **Cost £**, **Base £** — the last two are number inputs; editing updates the catalog and recalculates every order whose lines don't override. Footer band on `#F4F2EE` for adding a style.
- **Add-ons card** — one row per embellishment: name, vendor, cost input, price input. Footer to add one.
- **Colorways card** — 5-column swatch grid, code beneath, mill colour name. Footer to add one (native colour input, code, name).

### 4. Clients / 5. Vendors
One white table each with an add row in a `#F4F2EE` footer band. Clients: Client, Contact, Email, Location, Orders. Vendors: Vendor, Capability, Location, Lead.

### 6. Invoices & Accounting
- **Xero connection panel** — circled `X` mark, `ACCOUNTING INTEGRATION`, `Xero · [org]`, status line `Connected · GBP · VAT 20% · Last sync [time]`. Right: `Auto-push [On|Off]` toggle and a black `Sync now`. Beneath, a 4-up stat grid: Synced invoices, Queued, Sync direction, Mapping.
- **Invoice table** — two-line rows. Line 1: Order, Client (with swatches), Total, Deposit, Balance. Line 2: status badge, `Xero · [ref or "Queued"]` with a status dot, and `Push to Xero` on unsynced records.

Status derives from stage: 3 → Invoiced, 4 → Deposit due, 5–6 → Deposit paid, 7 → Paid in full.

### 7. Order Detail
Two columns, `240px minmax(0,1fr)`. Header: swatches + `[ORDER ID] · [CONTACT]`, client name at 40px/900, current stage right-aligned.

**Left rail — Lifecycle.** Eight numbered steps, 26px circles (filled black when done or current; current also gets `0 0 0 4px rgba(15,14,12,0.12)`), 1px connectors, status sub-label, and `Reopen here` on completed stages.

**Main column:**
1. **Action card** — black, white text. `NEXT ACTION`, title, description, then stage-specific controls. Copy per stage:

   | Stage | Title | Description | Button |
   |---|---|---|---|
   | 0 | Quote ready to send | Generate the quote PDF and send to the client for approval. | Generate & send quote |
   | 1 | Awaiting client confirmation | Client approved the quote. Send the formal order confirmation. | Send order confirmation |
   | 2 | Artwork approval | Client is reviewing artwork. Approve to proceed, or send change notes. | — (per-SKU) |
   | 3 | Invoice & accounting | Deposit invoice (50%) issued. Route to accounting and send to client. | Send deposit invoice |
   | 4 | Awaiting deposit | Mark the deposit as received to start the production timer. | Mark deposit received |
   | 5 | In production | Push production updates to the client at each 20% milestone. | Push next 20% update / Mark ready |
   | 6 | Ready — balance due | Order complete. Send balance invoice + shipping, then pack. | Send balance & pack |
   | 7 | Shipped | Goods dispatched. Tracking has been sent to the client. | — |

   Stage 5 shows a 1px progress track with a black fill animating width over 300ms. Stage 7 shows carrier select + tracking input + `Send tracking`.

2. **Financials** — auto-fit 1px-gap grid: Order value, Deposit 50%, Balance + ship, Delivery / Qty.
3. **Margin** — internal-only strip: order cost, gross profit, margin %, with a target-margin reprice control.
4. **Cost composition** — Blanks and Embellishments, each with cash figure and percentage share.
5. **Xero card** — circled `X`, org, invoice ref (17px/700), reconciliation note, payment status, Synced/Queued badge, `Push to Xero` when unsynced.
6. **Line items card** — header note: "Qty and unit price editable — amend on client request" or "Locked · in production". When editable, a `#F4F2EE` band with `+ Add SKU to order`. Each line: swatch + style name + `[SKU] · [colorway]`; a figures row (Qty, Unit £, Line total — inputs when editable); an expandable vendor-cost block with per-component vendor / cost / sell and margin; the build-up chips under a hairline; `Remove line` when more than one line exists; and an `Artwork →` link per SKU.
7. **Client Requests & Notes** — chat thread at every stage. Client messages left in white bordered bubbles, internal notes right in black bubbles, each with `NAME · DATE` at 9px. Composer plus, under a hairline, `← Reopen at [previous stage]`, which attaches the composer text as the reason.
8. **Automatic Client Updates** (stage 5 only) — the five milestones; sent ones get a filled badge, pending ones sit at 50% opacity.
9. **Shipped tracking** (stage 7 only) — carrier, tracking at 20px/700, confirmation line.
10. **Activity** — reverse-chronological log with date, text, actor.
11. **Danger row** — Decline order (with reason) and, for declined orders, Delete permanently behind a confirm.

### 8. Artwork Approval (per SKU)
Reached from a line item. Shows the SKU, colorway, version number, the artwork file (drop target), approve/request-changes controls, an internal comment thread and a client comment thread. Uploading a new version bumps `ver` and clears `approved`. Each SKU is approved independently; stage 2 can only advance when every line's artwork is approved.

### 9. Client Portal
A separate, client-scoped view at `/portal`. Shows that client's orders with: order ID, stage progress, line items with SKU, colorway, qty, unit price and line total, order value, deposit, balance, delivery estimate, artwork awaiting their approval (with approve + comment per SKU), tracking when shipped, and the order comment thread.

**Never shows:** vendor names, vendor costs, unit cost, gross profit, margin, the activity log, or any internal note. Enforced in the query layer, not the template.

Clients can approve a quote from the portal (moves stage 0 → 1), approve artwork per SKU, and comment.

---

## 5. Production milestone messages (fixed copy, sent to client)

```
20%  — Blanks cut & material prep complete.
40%  — Embellishment sampling signed off, bulk print underway.
60%  — Bulk embellishment complete, entering finishing.
80%  — Finishing & quality control in progress.
100% — Order complete and ready for packing.
```

---

## 6. Activity log — what gets written

Every one of these writes an entry, in the same transaction as the change:

- Quote drafted / quote sent / quote approved by client
- Order confirmation sent
- Artwork V*n* uploaded — [style] · Artwork approved — [style] · Artwork note — [style] · Artwork approved by client — [style] · Client comment on artwork — [style]
- Invoice generated / sent to accounting
- Deposit received (50%) — production timer started
- Client update sent · *n*%
- Order complete — client notified
- Balance + shipping invoice paid · goods packed
- Shipped — tracking sent to client
- Order amended — [what changed]
- Line vendor changed — [component] → [vendor]
- Line repriced to *n*% target margin
- Catalog price changed — [SKU] cost/base £x → £y
- Reopened at [stage] — [reason]
- Quote marked declined — [reason] / Quote reopened as active
- Invoice INV-#### created in Xero / Xero sync failed — [error]

Actor is one of Sales, Design, Production, Accounting, System, Xero.

---

## 7. Open questions for the client

These do not block the build. Build the prototype's behaviour and flag them.

- Should reopening a stage notify the client automatically, or stay internal until someone sends something?
- Do amended orders need a version number (Quote v2) on the paperwork?
- Are size/fit breakdowns needed per line item, or is one quantity per SKU/colorway enough?
- Should deposit always be 50%, or per-client configurable?
- Should the portal be passwordless (tokenised link per order) or a real login? Build a real login; the token link is a later addition.
