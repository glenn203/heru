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

| Element                  | Job                                                                             |
| ------------------------ | ------------------------------------------------------------------------------- |
| `prism-card`             | Surface with three slots: `header`, `content` (default) and `footer`.           |
| `prism-card-title`       | The card's name, always a real h2 to h6. `level` is **required**.               |
| `prism-card-description` | Supporting text, two lines then ellipsis.                                       |
| `prism-card-meta`        | Footer meta, one line.                                                          |
| `prism-card-actions`     | Header, footer or content-only button row. Enforces the action rules.           |
| `prism-card-select`      | Visible native checkbox or radio of a selectable card.                          |
| `prism-card-group`       | Selection group: single (radio) or multi (checkbox), by item id.                |
| `prism-card-list`        | Grid or list of cards: columns 1/2/3/4, paging, selection across pages.         |
| `prism-card-metric`      | A big number for a widget, with a label (PROPOSED metric style).                |
| `prism-card-skeleton`    | Decorative loading placeholder (`text` lines or a whole `card`).                |
| `prism-card-handle`      | Drag handle of a reorderable card (grip). `menu` makes it the Move menu button. |
| `prism-icon-button`      | Square ghost icon button. `label` is required (the accessible name).            |
| `prism-menu` / `-item`   | Minimal menu button (APG). Used for overflow and the Move menu later.           |

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
allowed in a footer or button row. Every `prism-icon-button` and menu trigger in a
card is size `sm` (32px at the default density, 24 compact, 40 comfortable, never
under the 24px minimum target), and header icon buttons sit 8px apart. A "View all" link counts as one action.

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

### Widget, collapsible and card list (M3, names provisional)

- **Widget** (`type="widget"`, a Card in a Grid; there is no Widget component).
  Header: title, a scope description, up to two actions (refresh icon button,
  overflow menu); a compact TimeRangeInput is accepted by tag name only when the
  widget overrides the range (TimeRangeInput is not built here). Footer:
  `prism-card-meta` "Updated 2 min ago" and a ghost "View all". The card is a
  labelled `group`, never a landmark. **No resize** (needs Grid edit mode).
  No header or footer dividers (dagger on the page).
- **Time range contract.** The page (Toolbar) sets
  `data-prism-time-range="Last 24 hours"` on any ancestor; every widget below it
  follows it, including later changes. A widget with its own `range` overrides
  it, shows that range in its header with the word "Overridden" (text, a border,
  not colour alone) and ignores page changes. `card.effectiveRange` and
  `card.rangeOverridden` are readable; `prism-card-range` fires when the
  effective range changes so the widget can refetch.
- **Card states** (`state="loading|error|empty"`, any card): only the content is
  replaced; header and footer stay. Loading is a skeleton and a polite "Loading"
  (`aria-busy`). Error says what failed (`state-message`) with one Retry
  (`prism-card-retry`), an outline small button (the one generated control that
  is outline; the footer rule above does not apply to it). Empty on a widget says "No data for this range" with
  "Change range" (`prism-card-change-range`). Controls the card generates for
  these are light-DOM children (`data-prism-generated`, `display: contents`),
  because the theme cannot style a `prism-button` inside a shadow root.
- **Metric.** `prism-card-metric` shows the number in the PROPOSED metric style
  (28/36, 600, tabular figures; `--_metric-*`, private) with a 12/20 label under
  it. No Display style inside a card.
- **Collapsible** (`type="collapsible"`). The title row is a real `<button>` in
  the heading: chevron first, `aria-expanded`, and `aria-controls` through
  element reflection (`ariaControlsElements`, pointing at the light-DOM content,
  because an ID cannot cross shadow roots). Header actions sit beside it, never
  inside. `open` is the state (default closed, set it where people need the
  content on first view), `storage-key` keeps it for the session
  (`sessionStorage`), and `prism-card-open-change` lets a page put it in the URL.
  Closed content is `display: none`, so it leaves the tab order. The footer
  stays. More than two nested levels is a dev error. `href` and `action` on the
  title are ignored with a dev error.
- **Card list.** Columns follow the list's own width (container query): under
  640px one, 640 to 1023 two, 1024 to 1279 three, 1280 and up four, never under
  280px per card (`minmax(0, 1fr)`; below 280px it reflows to the container),
  16px gap, equal row heights, no masonry. `columns="1"` pins one column.
  The `list` role is on an inner wrapper around the cards (named by `label`), so the
  selected count, pager and status sit outside it; cards are `listitem`s; `label` is required; titles share a
  `level` (dev error otherwise). `total` sets `aria-setsize` and `aria-posinset`
  from the data. **Paging** is server-side: `page`, `page-size` (12, 24 or 48,
  default 24), `prism-card-list-page`. The built-in pager (Previous, "Page X of
  Y", a Per page select) is shown even for one page; a `pagination` slot
  replaces it, and `load-more` swaps it for a Load more button. A new `total`
  says "24 results" politely.
- **Selection across pages.** The list extends `prism-card-group`, multi only,
  by `value` id. Ids that are not on screen stay selected. "N selected" and a
  "Clear selection" button show above the cards (`hide-selection-bar`, or fill
  the `toolbar` slot, to use the page Toolbar instead). Clear moves focus to the
  count, so it is not lost. Read `list.selected`; listen for
  `prism-selection-change`.
- **List states** (`state`): `loading` (skeleton cards, about eight, list busy),
  `refreshing` (cards stay, quiet busy line), `empty` (your `empty` slot),
  `no-matches` ("No matches", Clear filters), `error` (what failed, Retry). One
  failed card uses `state="error"` on that card.

### Reorder (M4, names provisional)

`prism-card-list[reorderable]` lets people reorder cards. Every card gets a
`prism-card-handle` in its header (the grip). The handle is the pointer way; the
Move menu is the keyboard and switch way (WCAG 2.5.7), so nobody has to drag.

- **Drag.** Press the handle and drag (touch: press and hold about 350 ms, so a
  scroll still scrolls). A card with no other controls can also be dragged from
  anywhere. The original dims to 40%, one copy follows the pointer (existing
  `elevation-default`, no new elevation), and a 2px accent line with a dot shows
  where it will land. The line is horizontal in a list and vertical in a grid
  (flips in RTL). The list scrolls itself near an edge. Escape or dropping outside
  cancels. A click right after a drag is ignored.
- **Move menu.** Move to top, Move up, Move down, Move to bottom (a grid reads
  Move to start, earlier, later, end). Items that would do nothing are disabled.
  They are added to the card's existing overflow menu. A card with no overflow menu
  makes the handle the menu button (`menu`), so a card never has two menus. The
  menu button is named "Reorder {title}".
- **Names.** Menu items read "Move up" and are named "Move up, {title}" so the
  visible words are the start of the name (WCAG 2.5.3). The page's "Move 'X' up"
  would not pass that, see open questions.
- **Announcements.** One polite live region per list, exact wording from the page:
  "Picked up {title}, position {n} of {total}." / "{title} moved from position
  {a} to position {b} of {total}." / "Move canceled. {title} is at position {n} of
  {total}." / "{title} moved from {list} to {list}, position {n} of {total}." /
  "Couldn't save the new order. {title} is back at position {n} of {total}."
  Exported as `reorderMessages`.
- **Focus.** After a menu move, focus returns to the same card's menu button. After
  a drag it goes to the handle.
- **Events.** `prism-card-reorder` (after a move; `{ value, card, from, to,
fromList, toList }`, positions are 1-based) and `prism-card-reorder-failed`
  (`{ value, card }`). Save the new order from the first. If saving fails, call
  `list.rollback()` (undoes the latest move, announces "Couldn't save...") and show
  a Toast from the second. `reorder-group="name"` lets cards move between lists
  with the same name.
- **Reduced motion.** With `prefers-reduced-motion: reduce` the moved card does not
  flash. Nothing else animates: the drop line jumps, the copy tracks the pointer
  and edge scrolling is instant, not smooth. A move is never conveyed by motion
  alone: it is announced.
- **Not built (dagger items).** Alt+Arrow shortcuts, "Move to position" form,
  stacked copy for a multi-selection drag.

### PROPOSED, not tokens yet

These values live as component-private `--_*` custom properties built from
existing primitives. They are **not** in `tokens/*.json` and Typography is
untouched. They wait for approval.

| Private property   | Value                                   | Where                                                                     |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------- |
| `--_title-*`       | 14px / 20px / 600 sans                  | `prism-card-title` (component title style)                                |
| `--_supporting-*`  | 12px / 20px / 400 sans                  | description and meta (page says 12/20; token `caption` is 12/16)          |
| `--_pad`           | density pad units + 2 (12 / 16 / 20px)  | `prism-card`                                                              |
| `--_metric-*`      | 28px / 36px / 600 sans, tabular figures | `prism-card-metric` (metric text style; the page leaves it to Typography) |
| `CARD_LIST_MIN_PX` | 280                                     | card list minimum card width (page: "at least 280px")                     |
| `CARD_NARROW_PX`   | 280                                     | narrow rule (page marks it with a dagger)                                 |

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
