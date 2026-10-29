# Prism design rules (for agents building components)

Read this before adding or changing a component. Variant names are
**provisional** until the Technical Writer signs off.

## Prefixes

- Elements: `prism-*` (`prism-button`, `prism-select`).
- CSS variables: `--prism-*`. Private, component-internal variables start
  with `--_` (`--_bg`, `--_on`).
- Data attributes: `data-prism-*` (`data-prism-density`).
- There are no aliases for old names.

## Tokens, density, grid

- Tokens live in `tokens/prism.tokens.json` (DTCG). `pnpm tokens` generates
  `src/tokens/tokens.css` and `tokens/prism.tokens.resolved.json`. Never edit
  generated files.
- One primitive: `--prism-unit` = 4px. Spacing, line heights and control
  heights sit on the 4px grid. Radii use their own odd ramp (`radius-5`,
  `radius-7`).
- Colours are OKLCH. Components and the theme use **roles only**
  (`--prism-color-text`, `--prism-color-accent` …), never palette primitives
  or literals. A test enforces this.
- Density modes are `compact`, `default` and `comfortable`, set with
  `data-prism-density` on any element. Density changes unit counts only.
- Components are headless. Visuals live only in the opt-in theme
  (`src/theme/theme.css`), which styles through `::part()` and `:state()`.
  It sets **custom properties only** for state-layer surfaces.

## State layer (every clickable item)

There is one utility, `stateLayer()` in `src/internal/state-layer.ts`. Use it
for every interactive surface: buttons, options, rows, tabs, cards and icon
buttons. Do not write your own hover rules.

**Rule.** The surface keeps its resting fill `--_bg`. Each state paints the
element's own text colour `--_on` on top as an alpha overlay:

| State          | Overlay of `--_on`             | Trigger                                                                   |
| -------------- | ------------------------------ | ------------------------------------------------------------------------- |
| hover          | 8% (`--prism-state-hover`)     | `:hover` **only under `@media (hover: hover)`**, or host `:state(active)` |
| pressed        | 12% (`--prism-state-pressed`)  | `:active` or `[data-pressed]`                                             |
| selected       | 14% (`--prism-state-selected`) | `aria-selected/pressed/checked=true`, `aria-current`, `:state(selected)`  |
| selected+hover | 18% (selected + hover/2)       | both                                                                      |
| disabled       | no change (inert)              | `:disabled`, `aria-disabled=true`, `:state(disabled)`                     |

The overlay is implemented as
`background-image: linear-gradient(X, X)` with
`X = color-mix(in srgb, var(--_on) N%, transparent)`. Without `color-mix()`
support, the utility swaps the fill for `--_bg-hover`, `--_bg-pressed` and
`--_bg-selected`.

- **Selected needs a non-colour cue** (check mark, underline, weight, icon).
  Colour is never the only signal (WCAG 1.4.1).
- The overlay also paints under the border. A border that should match the
  fill must be `transparent`. A visible border (outline) keeps its own colour
  in every state.

### Applying it to a new component

```ts
import { stateLayer } from '../internal/state-layer.js';

export class PrismTab extends LitElement {
  static override styles = [
    css`
      [part='base'] {
        /* layout only, no colours */
      }
    `,
    stateLayer("[part='base']"),
  ];
  // Selected: set aria-selected on the part or internals.states.add('selected')
  // and render a non-colour cue (e.g. an underline).
}
```

```css
/* theme.css: name the colours, nothing else */
prism-tab::part(base) {
  --_bg: transparent;
  --_on: var(--prism-color-text);
  --_bg-hover: var(--prism-color-surface-hover); /* no-color-mix fallbacks */
  --_bg-pressed: var(--prism-color-surface-pressed);
  --_bg-selected: var(--prism-color-surface-pressed);
}
```

## Contrast (every state, enforced)

- Text ≥ **4.5:1**. Borders, icons and other non-text ≥ **3:1**.
- These must hold at rest, hover, pressed, selected and selected+hover.
  Disabled is exempt but reported.
- `test/tokens.test.mjs` (`MATRIX`) computes the composited colour (overlay
  over fill, or over `color-bg` when the fill is transparent) and asserts
  every pair. Add every new surface to `MATRIX`.
- If a pair fails, **don't silently change colours**. Flag it with the
  numbers and options.

## Button variants (names provisional)

| Variant                 | Fill (`--_bg`)                                                 | Text (`--_on`)     | Border          |
| ----------------------- | -------------------------------------------------------------- | ------------------ | --------------- |
| `primary` (**default**) | `color-accent` (solid)                                         | `color-on-accent`  | transparent     |
| `secondary`             | `color-mix(in oklch, bg, accent 8%)`, about an 8% primary tint | `color-accent`     | transparent     |
| `ghost`                 | transparent                                                    | `color-text`       | none            |
| `outline`               | transparent                                                    | `color-text`       | `border-strong` |
| `destructive`           | soft red tint, identical to the error box over `bg`            | `on-error-surface` | transparent     |

All variants use the shared state layer, the same focus ring and the same
inert disabled look.

## Card family (M1: shared Card, names provisional)

Source: the Notion Card page. Names from the page: Card, CardTitle,
CardDescription, TimeRangeInput. Everything else here is **provisional**
(Technical Writer): `prism-card-actions`, `prism-card-meta`,
`prism-icon-button`, `prism-menu`, `prism-menu-item`, the `type`, `raised` and
`standalone` attributes.

| Element                  | Job                                                                   |
| ------------------------ | --------------------------------------------------------------------- |
| `prism-card`             | Surface with three slots: `header`, `content` (default) and `footer`. |
| `prism-card-title`       | The card's name, always a real h2 to h6. `level` is **required**.     |
| `prism-card-description` | Supporting text, two lines then ellipsis.                             |
| `prism-card-meta`        | Footer meta, one line.                                                |
| `prism-card-actions`     | Header, footer or content-only button row. Enforces the action rules. |
| `prism-card-select`      | Visible native checkbox or radio of a selectable card.                |
| `prism-card-group`       | Selection group: single (radio) or multi (checkbox), by item id.      |
| `prism-icon-button`      | Square ghost icon button. `label` is required (the accessible name).  |
| `prism-menu` / `-item`   | Minimal menu button (APG). Used for overflow and the Move menu later. |

### Restricted slots

`header` and `footer` accept only approved parts (`card-slots.ts` is the one
place that lists them). An unapproved element is **not rendered**
(`data-prism-invalid` + `display: none`) and one `console.error` says why.
`content` is free. Header: one CardTitle (required), one CardDescription, one
icon or avatar, one Tag or Badge, a drag handle and a selection control (later
milestones), and one CardActions with at most two ghost icon buttons or an
overflow menu. **No text buttons in the header.** Footer: one CardMeta and one
CardActions with at most two actions: ghost and secondary (soft), plus **one
primary only on a `standalone` card**. Outline and destructive are never
allowed. A "View all" link counts as one action.

Content-only cards put `prism-card-actions` (no slot) last in the content:
end side, 8px apart, medium, ghost to the left of secondary, no primary,
outline or destructive. It wraps onto the next line on the end side and sits at
the bottom of cards in the same row. Never position it with absolute placement.

### Elevation, hover, borders

- Bordered (default): 1px `color-border`, no shadow. Raised: a transparent
  border plus `--prism-elevation-hover`. Borderless: flat `color-surface`, no
  border, no shadow. A card is never both bordered and raised.
- **Hover is the state layer only.** No lift, no transform, no shadow change.
  `--prism-elevation-hover` is used by `prism-card[raised]` and nowhere else;
  `--prism-elevation-urgent` is never used on a card. A test guards both.
- A dragged copy (later milestone) uses `--prism-elevation-default`.
- Interactive cards (later) take `color-border-strong` so the edge meets 3:1.

### Interactive cards (M2, names provisional)

| Type                      | Whole-card click | Title                         | Control                                | Tab stops                                    |
| ------------------------- | ---------------- | ----------------------------- | -------------------------------------- | -------------------------------------------- |
| `clickable`               | Yes, stretched   | the one real `<a>`/`<button>` | none                                   | the title, then each nested control          |
| `selectable` `choice`     | Yes, toggles     | plain heading                 | `prism-card-select`, no other controls | one per group (radio) or one each (checkbox) |
| `selectable` `collection` | No               | link or button, not stretched | `prism-card-select`                    | control, title, then actions                 |

- **Stretched link.** `prism-card-title` with `href` (goes somewhere) or
  `action` (does something) renders the link or button inside the heading. Its
  `::after` covers the card; the card host is the positioning context. Direct
  children that are controls, plus `prism-card-actions`, the select and the
  handle, sit above it (`z-index: 1`). The theme adds the same for controls
  deeper in a clickable card. Never put a loose button in a card and make the
  whole card clickable any other way. A borderless card is never clickable.
- **No cap on nested controls.** The page's "at most two" is unconfirmed (dagger), so
  it is not enforced.
- **Edge.** Interactive cards use `color-border-strong` (about 4.8:1), never
  flat. Raised keeps a transparent border and its shadow.
- **State layer.** Clickable and choice cards tint 8% hover, 12% pressed. Other
  cards only use the layer for selected (14%, 18% on hover). While the pointer
  is over a nested control the card shows no tint (`data-nested` on the base).
  Hover never lifts.
- **Focus.** Focus on the title (or a choice card's control) draws the ring
  around the whole card (`:state(focus-ring)`); the title and the choice radio
  draw none of their own. A nested control shows only its own ring. In
  forced-colors mode these become outlines.
- **Selected look.** 14% overlay, 2px accent ring drawn inside the edge
  (`inset` shadow, so nothing shifts, under a raised card's shadow), and the
  control's check or dot. Colour is never the only cue.
- **`prism-card-group`** owns selection by item id (`value` on each card):
  `selection="single"` is a radio group (Tab enters on the selected or first
  card, arrows move **and** select and wrap, flipped in right-to-left, disabled
  cards skipped, `aria-posinset`/`aria-setsize` set), `selection="multi"` is
  checkboxes (Tab visits each, Space toggles, polite "N selected"). Read and set
  `group.selected` (ids), `clear()`, listen for `prism-selection-change`. Ids of
  cards that are not on screen stay selected. `SelectionController` is the
  plain, reusable store behind it. The visible count and "Clear selection"
  button belong to the card list (M3).
- **Control labels.** IDs cannot cross shadow roots, so the select's name and
  description are copied from the title and description. A disabled card's
  reason must be in its description (dev error otherwise). A nested control's
  label must include the card title (dev error otherwise).

### PROPOSED, not tokens yet

These values live as component-private `--_*` custom properties built from
existing primitives. They are **not** in `tokens/*.json` and Typography is
untouched. They wait for approval.

| Private property  | Value                                  | Where                                                            |
| ----------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `--_title-*`      | 14px / 20px / 600 sans                 | `prism-card-title` (component title style)                       |
| `--_supporting-*` | 12px / 20px / 400 sans                 | description and meta (page says 12/20; token `caption` is 12/16) |
| `--_pad`          | density pad units + 2 (12 / 16 / 20px) | `prism-card`                                                     |
| `CARD_NARROW_PX`  | 280                                    | narrow rule (page marks it with a dagger)                        |

### Behavior notes

- Role and name: standalone card = `group`, inside an `li` = none, inside
  `prism-card-list` = `listitem`; never a landmark. The name is the title text,
  copied to `aria-label` (ID references cannot cross shadow roots). An author
  `role` or `aria-label` wins.
- Narrow (280px or less, dagger on the page): the card gets `:state(narrow)`,
  the footer stacks and header icon buttons fold into one overflow menu.
- Layout properties are logical, so cards mirror in right-to-left.

## Figma mapping

- States: add a **fill layer** above the resting fill using the element's
  **text colour variable** at **8%** (hover), **12%** (pressed), **14%**
  (selected) or **18%** (selected+hover) opacity. Disabled has no layer.
- Token names map 1:1. `--prism-color-text` is Figma `color/text`. Resolved
  px values come from `prism.tokens.resolved.json`.
