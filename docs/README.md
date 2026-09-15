# Arches™ Production ERP — Developer Handoff

Read this file first. It takes ten minutes and tells you exactly what to build, in what order, and how you will be judged.

## What this is

An internal operations system for Arches™ (arches.global), a London merch production studio. It replaces a spreadsheet-and-email process and runs a custom apparel order from quote through to shipped: pricing, vendor costs and margin, artwork approval, invoicing via Xero, production milestones, and a client-facing portal.

## What's in this folder

| File | What it's for |
|---|---|
| `README.md` | This file. Orientation + rules of engagement. |
| `CLAUDE.md` | **Copy to your repo root.** Standing instructions for Claude Code. |
| `01-SPEC.md` | The product spec: entities, business rules, every screen. The source of truth. |
| `02-SCHEMA.sql` | Postgres schema, ready to run. |
| `03-SEED.sql` | Catalog, clients, vendors, colorways — real seed data. |
| `04-BUILD-PLAN.md` | 13 tickets in build order, each with a paste-ready prompt and acceptance criteria. |
| `05-XERO.md` | Xero OAuth + invoice sync, step by step. |
| `06-UI-KIT.md` | Design tokens, component recipes, exact measurements. |
| `prototype/Arches ERP.dc.html` | **The working prototype.** Open it in a browser. |

## Do this first

1. Open `prototype/Arches ERP.dc.html` in Chrome. Click through every screen: dashboard, new quote, catalog, clients, vendors, invoices, an order, the artwork screen, and the client portal (button near the bottom of the sidebar). Spend 20 minutes in it. Everything you build should look and behave like this.
2. Read `01-SPEC.md` end to end.
3. Read `04-BUILD-PLAN.md` and start at Ticket 0.

## The prototype is a design reference, not production code

It is a single HTML file. All state is in memory and resets on reload. There is no database, no login, no real Xero. It exists so you never have to guess what a screen should look like or how an interaction should behave.

**Do not port its code.** Build the real app per the tickets. When a detail is ambiguous, the prototype wins — open it and look.

## Stack (agreed — do not substitute)

- **Next.js 15** (App Router) + **TypeScript**
- **Postgres** (Neon or Supabase; connection string in env)
- **Prisma** ORM
- **Auth.js / NextAuth** with credentials provider, 4 roles
- **Tailwind CSS** for styling, with the tokens in `06-UI-KIT.md`
- **xero-node** official SDK
- **Resend** for outbound email, **React Email** for templates
- **Vitest** for the pricing and stage-machine tests

Everything server-side goes through Next.js server actions or route handlers. No separate backend service.

## Non-negotiables

1. **Every mutation that touches an order writes an activity-log row in the same database transaction.** The log is the audit trail. If the log write fails, the mutation fails. No exceptions, no fire-and-forget.
2. **Costs and margins are never sent to the client portal.** Not in the HTML, not in the JSON payload, not in a hidden field. The portal's data layer must select only client-safe columns. This is the single most important security rule in the app.
3. **Money is stored in integer pence, never floats.** Convert at the edges.
4. **Pricing logic lives in one module** (`lib/pricing.ts`) with unit tests. Never inline a price calculation in a component.
5. **Match the design.** Colours, type sizes, spacing and borders are specified exactly in `06-UI-KIT.md`. No rounded corners beyond 2px, no drop shadows, no icons, no emoji, no accent colours.

## Definition of done for the whole project

- A user can log in as each of the four roles and sees the correct permissions.
- A quote can be built from the catalog with per-line vendor costs and margin, saved, and opened as an order.
- An order can be advanced through all eight stages, reopened at any earlier stage, and amended.
- Artwork can be approved per SKU by the client in the portal, with comments flowing both ways.
- An invoice can be pushed to a real Xero sandbox organisation and its payment status read back.
- The client portal shows a client their orders and never leaks a cost or margin figure.
- `npm run test` passes. `npm run build` produces no type errors.

## How to ask questions

Batch them. Send one message with everything that's blocking you rather than a question a day. If something is genuinely ambiguous, build the version that matches the prototype and flag it — don't stall.

Open items the client still needs to decide are listed at the end of `01-SPEC.md`. You don't need answers to those to start.
