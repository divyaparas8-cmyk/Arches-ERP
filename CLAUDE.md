# CLAUDE.md — Arches Production ERP

Standing instructions for this repository. Read before every task.

## Project

Internal ERP for Arches™, a London merch production studio. Runs a custom apparel order from quote to shipped. Next.js 15 App Router, TypeScript, Postgres + Prisma, Auth.js, Tailwind, xero-node, Resend.

Design reference: `docs/prototype/Arches ERP.dc.html` — open it before building any screen. Spec: `docs/01-SPEC.md`. Tokens: `docs/06-UI-KIT.md`.

## Hard rules

1. **Activity log in the same transaction.** Any write that changes an order, its lines, its stage, its artwork or its Xero record must insert an `activity_log` row inside the same `prisma.$transaction`. Never after. Never optional.
2. **No cost or margin data in client-facing code paths.** The portal (`app/portal/**`) queries through `lib/portal-queries.ts` only, which selects client-safe fields explicitly. Never pass an order object from the internal data layer into a portal component.
3. **Money is integer pence** (`Int` in Prisma, named `*Pence`). Format only at render time with `formatGBP()`. Never `Number.toFixed` arithmetic.
4. **All pricing in `lib/pricing.ts`.** Pure functions, no DB access, full unit-test coverage. Components import from it; they never recompute.
5. **All stage transitions in `lib/stages.ts`.** One `advance()`, one `revertTo()`. Side effects (Xero requeue, progress reset, tracking clear) live there, not in route handlers.
6. **Role checks server-side.** `requireRole(['accounting','owner'])` at the top of every server action. Hiding a button is not a permission.

## Style rules

- Tailwind only, using the tokens in `06-UI-KIT.md`. No CSS-in-JS, no component library (no shadcn, no MUI).
- Radius max `2px` (`rounded-[2px]`). Swatches are circles. Nothing else is round.
- No shadows on cards — 1px `#E8E5DF` borders only. The one exception is the current-stage ring: `ring-4 ring-black/10`.
- No icons, no icon library, no SVG illustrations, no emoji. The brand is purely typographic. Product codes are the visual labels.
- Labels, categories and UI chrome are ALL CAPS with wide tracking. Body copy is sentence case.
- Font is Neue Haas Display, loaded from `public/fonts`. Fallback `Helvetica Neue, Arial, sans-serif`.
- Copy tone: precise, understated, declarative. No hype, no exclamation marks, no "Oops!" empty states.

## Code conventions

- Server components by default. `"use client"` only where there is real interactivity (quote builder, order detail editors, portal comment box).
- Mutations are server actions in `app/**/actions.ts`, validated with Zod at the boundary.
- File names: kebab-case. React components: PascalCase. Prisma models: PascalCase singular, table names snake_case plural.
- No `any`. No `@ts-ignore`. `npm run build` must be type-clean.
- Keep components under ~200 lines; extract a sub-component rather than nesting three levels of conditionals.

## Testing

- `lib/pricing.ts` and `lib/stages.ts` have unit tests in Vitest. These are the two places a bug costs the client money.
- Before saying a ticket is done: `npm run test && npm run build`, then click the flow in the browser.

## What not to do

- Don't redesign. If a screen looks different from the prototype, the prototype is right.
- Don't add features not in the spec — no analytics dashboards, no dark mode, no notification centre.
- Don't install packages beyond the agreed stack without asking.
- Don't refactor working code from an earlier ticket while doing a later one.
- Don't mock Xero in a way that can reach production. The sandbox connection is real from Ticket 10 onward.

## Current state

Keep a running `docs/PROGRESS.md`: ticket number, what shipped, anything deferred. Update it at the end of every ticket.
