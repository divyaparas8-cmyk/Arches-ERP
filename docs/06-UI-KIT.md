# 06 — UI Kit

Every number here is exact and taken from the prototype. When in doubt, open `prototype/Arches ERP.dc.html` and inspect the element.

## Colours

| Token | Hex | Use |
|---|---|---|
| near-black | `#0F0E0C` | Primary text, primary buttons, sidebar, dark sections |
| dark-grey | `#3A3835` | Secondary text |
| mid-grey | `#999590` | Tertiary text, labels, placeholders |
| warm-grey | `#E8E5DF` | Borders, dividers, grid gaps |
| off-white | `#F4F2EE` | App background, footer bands, inset panels |
| white | `#FFFFFF` | Cards |

There is no accent colour. Garment colorways are product data and never UI colour. On dark sections use white at 0.5 opacity for labels and 0.7 for body copy.

```js
// tailwind.config.ts
colors: {
  'near-black': '#0F0E0C',
  'dark-grey':  '#3A3835',
  'mid-grey':   '#999590',
  'warm-grey':  '#E8E5DF',
  'off-white':  '#F4F2EE',
}
```

## Type

Neue Haas Display only, weights 100–900. Fallback `'Helvetica Neue', Arial, sans-serif`. Licence it properly for production — the files in `prototype/fonts/` are for development.

| Role | Size / weight / tracking / leading |
|---|---|
| Hero, client name | 40px / 900 / −0.03em / 1.0 |
| Page title | 28px / 900 / −0.03em |
| KPI figure | 40px / 900 / −0.03em / 1.0 |
| Margin-strip figure | 26px / 900 / −0.03em |
| Card figure large | 24px / 700 / −0.02em |
| Card figure | 20–22px / 700 / −0.02em |
| Section heading | 17–18px / 700 / −0.01em |
| Body | 13px / 300–400 / 1.5–1.7 |
| Small body | 12px / 300 |
| Micro, meta | 11px / 300 |
| Label | 9–10px / 500 / 0.14–0.22em / uppercase |

Labels, product codes, categories and UI chrome are ALL CAPS with wide tracking. Body copy is sentence case. Never emoji.

## Spacing, radius, shadow

- 4px base. Used: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32.
- Card padding 20–26px. Table rows 16px vertical, 20–24px horizontal. Screen padding 32px. Card gaps 24px.
- Radius `2px` on everything rectangular — inputs, buttons, badges, cards. Swatches are `50%`. Never more.
- No shadows on content cards; 1px `#E8E5DF` borders only. One exception: the current-stage ring, `0 0 0 4px rgba(15,14,12,0.12)`.

## Component recipes

**Card** — `bg-white border border-warm-grey rounded-[2px] p-6`. Section label inside at 10px/500, `tracking-[0.18em]`, uppercase, `text-mid-grey`, 16px below.

**Stat grid (hairline cells)** — a grid with `gap: 1px` on a `#E8E5DF` background; each cell `bg-white p-5`. The gap is the rule. Do not put borders on the cells.

**Dark stat grid** (margin strip) — same, on `#0F0E0C`, cells `border-right: 1px solid rgba(255,255,255,0.12)`, label at 9px white/50, value 26px/900, sub-line 11px/300 white/55.

**Table** — white card, 1px `#E8E5DF` border, header rule in `#E8E5DF`, row rules in `#F4F2EE`. More than about four columns: split into a figures row plus a wrapping detail row rather than shrinking columns.

**Add-record band** — the last row of a table, `bg-off-white`, inputs auto-fit at `minmax(118px, 1fr)`, with an Add button.

**Button, primary** — `bg-near-black text-white text-[10px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-[2px]`. Hover: opacity to 0.85 over 150ms.

**Button, secondary** — same metrics, `bg-white border border-warm-grey text-near-black`.

**Text affordance** (Remove line, Reopen here, + New SKU) — 10px/500, uppercase, `tracking-[0.14em]`, 1px bottom border, cursor pointer. Not a button.

**Input** — `border border-warm-grey px-3.5 py-3 text-[13px] font-light rounded-[2px] bg-white`. Number inputs for money align left like everything else. Focus: border to `#0F0E0C`, no glow, no ring.

**Chip (embellishment)** — `border border-warm-grey px-3 py-2.5 text-[12px] flex justify-between`, name left and `+£price` right at 11px/60% opacity. Selected: invert to `bg-near-black text-white`.

**Status badge** — 9px uppercase, `tracking-[0.12em]`, padding 4px 9px, radius 2px. Terminal states solid black with white text; in-progress states bordered.

**Colorway swatch** — circle, 12px default (16px in a select field), `border: 1px solid rgba(0,0,0,0.14)`.

**Stage dots** — 6px squares, 2px gap, filled `#0F0E0C` up to and including the current stage, `#E8E5DF` beyond.

**Lifecycle step** — 26px circle; done or current filled black with white numeral; current also `ring-4 ring-black/10`; todo white with a `#E8E5DF` border. 1px vertical connector between steps.

**Progress bar** — 1px-tall track in `#E8E5DF`, black fill, width transitions over 300ms.

**Comment bubble** — client: left-aligned, white, 1px `#E8E5DF` border. Internal: right-aligned, `#0F0E0C`, white text. Both carry a `NAME · DATE` label above at 9px uppercase `tracking-[0.14em]`.

## Motion

Opacity and background transitions only. 150ms fast, 250ms standard, standard cubic-bezier easing. The progress bar is the one 300ms exception. No bounces, springs, slide-ins, or skeleton shimmer.

## Responsive

The app is fluid and must hold down to a ~680px content area.

Two rules that matter:
1. Tables with more than about four columns split into a figures row plus a wrapping detail row rather than shrinking columns.
2. Every flexible grid track uses `minmax(floor, 1fr)`, never a bare `1fr`, so it can't collapse to zero.

## Assets

No icons, no illustrations, no icon library. The brand is purely typographic; product codes are the visual labels. The only graphics are colorway swatches (CSS circles) and the circled `X` for Xero — a bordered circle with a letter, replaced before go-live with the official Xero mark.

The Arches wordmark and animated halftone logo are available from the client if the sidebar should use them.

## Voice

Precise, understated, confident. Declarative sentences. No filler, no hype, no apology copy in error states. Em dashes sparingly. Ampersands preferred over "and" in headers. Numerals for numbers, en dash for ranges. "Arches™" on first use, "Arches" thereafter.

Empty states are a plain sentence: "No active orders." "No declined or closed quotes." Nothing more.
