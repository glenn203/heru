# Prism design rules (for agents building components)

Read this before adding or changing a component. Variant names are
**provisional** until they are confirmed.

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
- Vivid colours are written for Display P3. `tokens.css` declares the
  gamut-mapped sRGB value first, the full-chroma value inside
  `@media (color-gamut: p3)`, and a hex value inside
  `@supports not (color: oklch(0 0 0))`.
- Light is the default theme. `data-prism-theme="dark"` (or `"auto"`, which
  follows the system) on any element re-declares the roles. Never branch on
  the theme in a component: read a role.
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

| State          | Overlay of `--_on`                   | Trigger                                                                   |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| hover          | 6% (`--prism-state-hover`)           | `:hover` **only under `@media (hover: hover)`**, or host `:state(active)` |
| pressed        | 12% (`--prism-state-pressed`)        | `:active` or `[data-pressed]`                                             |
| selected       | 11% (`--prism-state-selected`)       | `aria-selected/pressed/checked=true`, `aria-current`, `:state(selected)`  |
| selected+hover | 15% (`--prism-state-selected-hover`) | both                                                                      |
| disabled       | no change (inert)                    | `:disabled`, `aria-disabled=true`, `:state(disabled)`                     |

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

| Variant                 | Fill (`--_bg`)                                                 | Text (`--_on`)      | Border          |
| ----------------------- | -------------------------------------------------------------- | ------------------- | --------------- |
| `primary` (**default**) | `color-accent` (solid)                                         | `color-on-accent`   | transparent     |
| `secondary`             | `color-mix(in oklch, bg, accent 8%)`, about an 8% primary tint | `color-accent-text` | transparent     |
| `ghost`                 | transparent                                                    | `color-text`        | none            |
| `outline`               | transparent                                                    | `color-text`        | `border-strong` |
| `destructive`           | soft red tint, identical to the error box over `bg`            | `on-error-surface`  | transparent     |

All variants use the shared state layer, the same focus ring and the same
inert disabled look.

## Card family (M1: shared Card, names provisional)

Settled names: Card, CardTitle, CardDescription, TimeRangeInput. Everything else here is **provisional**: `prism-card-actions`, `prism-card-meta`,
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
- **No cap on nested controls.** The spec's "at most two" is unconfirmed (dagger), so
  it is not enforced.
- **Edge.** Interactive cards use `color-border-strong` (about 4.8:1), never
  flat. Raised keeps a transparent border and its shadow.
- **State layer.** Clickable and choice cards tint 6% hover, 12% pressed. Other
  cards only use the layer for selected (11%, 15% on hover). While the pointer
  is over a nested control the card shows no tint (`data-nested` on the base).
  Hover never lifts.
- **Focus.** Focus on the title (or a choice card's control) draws the ring
  around the whole card (`:state(focus-ring)`); the title and the choice radio
  draw none of their own. A nested control shows only its own ring. In
  forced-colors mode these become outlines.
- **Selected look.** 11% overlay, 2px accent ring drawn inside the edge
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
  No header or footer dividers (dagger in the spec).
- **Time range contract.** The page Toolbar sets
  `data-prism-time-range="Last 24 hours"` on any ancestor; every widget below it
  follows it, including later changes. A widget with its own `range` overrides
  it, shows that range in its header with the word "Overridden" (text, a border,
  not colour alone) and ignores page changes. `card.effectiveRange` and
  `card.rangeOverridden` are readable; `prism-card-range` fires when the
  effective range changes so the widget can refetch.
- **Card states** (`state="loading|error|empty"`, any card): only the content is
  replaced; header and footer stay. Loading is a skeleton and a polite "Loading"
  (`aria-busy`). Error says what failed (`state-message`) with one Retry
  (`prism-card-retry`), a soft (secondary) small button (a generated
  control, so the footer rule above does not apply to it). A widget footer's
  "View all" is a ghost small button; other footers stay medium. Empty on a widget says "No data for this range" with
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
  visible words are the start of the name (WCAG 2.5.3). The spec's "Move 'X' up"
  would not pass that, see open questions.
- **Announcements.** One polite live region per list, exact wording from the spec:
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

### Primitives (card-primitives, names provisional unless noted)

Extracted from the card stories and recipes. Names follow the settled spec
where it exists: **Tag** (`job`, `emphasis`, `tone`), **Badge** (`job`
count or status), **Description list** (label/value pairs). Avatar and Progress have no
settled spec yet, so those names and props are provisional.

| Element                  | Role and props                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prism-tag`              | Short word with meaning. `job`, `emphasis` (high, low, ghost), `tone`, `size` (sm 20px, md 24px). Behaviors: read-only, `dismissible`, `selectable`, `trigger`.           |
| `prism-badge`            | `job="count"` (`count`, `max` 99, `show-zero`) or `job="status"` (`status` live, running, stopped). Not clickable. The parent carries the name, the badge the number.     |
| `prism-avatar`           | Person or entity. `name` (initials fallback, accessible name), `src`, `size` xs to xl (24, 32, 40, 48, 64px), `shape`, `decorative` when the name is written beside it.   |
| `prism-progress`         | `role=progressbar` with `aria-valuemin/max/now/valuetext`. `label` (required), `value`, `max`, `value-text`, `show-value`, `hide-label`, `tone`. No value: indeterminate. |
| `prism-description-list` | Label/value list. `label`, `orientation` (horizontal, vertical). Children `prism-description-list-item` with `label`. Roles: list, listitem, term, definition.            |

Rules: the word carries the meaning, never colour alone (Tag text, Badge status
word, Progress value text, Description list labels). Tag selected shows a solid border;
a Live badge pulses its dot, and reduced motion stops it. Interactive Tags keep
a 24px minimum target. The card's "Overridden" flag is a real `prism-tag`.

Progress look: the track has no border. A faint inset edge (`--prism-elevation-track`,
`inset 0 0 2px 0` in `--prism-color-track-shadow`: the shadow neutral at 6% in light,
30% in dark) runs round it and over the fill. The fill is a comet, three background
layers top to bottom: a head (`ellipse 14px 120%` at the leading edge: the lift colour
mixed into the tone at `--prism-progress-head-mix`, fading through
`--prism-progress-head-alpha` at 45% to clear), a tail (`ellipse` as long as the fill up
to `--prism-progress-tail-max` 280px: the tone at the edge, 70% at 60% of its length, then
clear) and a base (`linear-gradient`, the tone lifted toward white by
`--prism-progress-fill-lift` at the left, the full tone at the right). A glow
`4px 0 10px -2px` in the tone at `--prism-progress-glow-alpha` follows the leading edge.
Light and dark differ: lift 30% / 45%, head 16% / 80% (shoulder 12% / 25%), glow 45% /
60% on the lighter dark tone. Light is capped by contrast: the head, its shoulder and the
full tone (the last ~14px, which carry the value) hold 3:1 on the track for every tone in
both themes on sRGB and P3 (lowest 3.27; the weakest tone, success, allows about 19% white
in light). The left end of the base is the start of the bar, not its value, so it may sit
lower in light (lowest 2.50); the test reports it. A fill under 24px (`:state(tiny)`)
hides its tail, and a full bar (`:state(full)`) drops the glow. Indeterminate: the comet
travels the track in 1.6s on `--prism-ease-settle`. Reduced motion: no travel, a value
change is instant, and the unknown bar pulses its opacity 0.6 to 1 over 2s. Forced
colours get a real 1px border and a flat Highlight fill, no shadow.

Not built: a **status dot** (it would duplicate Tag `health` and `presence`,
and Badge `status`; status stays as words) and **prism-icon**
(the icon system is undecided; stories keep a placeholder svg).

### Switch and Running indicator (names provisional)

| Element                   | Role and props                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prism-switch`            | On/off setting that applies at once. Native `button role="switch"` with `aria-checked`. `label` (required), `checked`, `disabled`, `name`, `value` (default "on"), `size` (sm, md, lg), `hide-label`, `label-position`. |
| `prism-running-indicator` | Something is running now. `role="status"`. `label` (default "Running"), `show-label`, `size` (sm 16px, md 24px, lg 40px), `tone` (default accent).                                                                      |

**Switch.**

- Flat and wide: track 24, 28 and 32px tall (sm, md, lg) and about twice as wide, a
  pill thumb a quarter wider than tall, no shadow and no gradient. The smallest is
  still a 24px target.
- Joins the form: submits `value` under `name` while on, nothing while off. A reset
  returns it to how it started. Fires `input` and `change` after a user toggle,
  not after a property change.
- State layer: the track uses `stateLayer()` like every clickable surface, with the
  overlay drawn above the wash and below the thumb. Off: hover 6%, pressed 12%. On
  (selected): 11%, and 15% when hovered. Disabled: no change.
- Motion (`--prism-motion-switch`, 400ms on; off takes 85%, 340ms). The thumb slides
  the full time on `--prism-ease-overshoot` (`cubic-bezier(0.34, 1.2, 0.64, 1)`, a
  slight overshoot). It also widens about 30% along its travel, trailing edge held:
  0-160ms on `--prism-ease-standard`, then springs back 160-400ms on
  `--prism-ease-recoil` (`cubic-bezier(0.34, 1.56, 0.64, 1)`). The accent spreads over
  the track from the side the thumb leaves (a growing clip circle) starting at 40ms and
  running 360ms on `--prism-ease-settle` (`cubic-bezier(0.4, 0, 0.2, 1)`); the track
  edge and thumb colour follow it. A single pass of light crosses the track.
  `--prism-switch-duration` sets the total time. With `prefers-reduced-motion: reduce`
  there is no slide, stretch, overshoot or spread: the thumb jumps and the colours
  change over 120ms. Programmatic changes slide but do not stretch. (`--prism-ease-spring`
  already means the critically damped focus-ring curve, so the overshoot slide has its
  own token.)
- Colour and contrast: off is `color-surface` with a `color-border-strong` edge and a
  `color-text-muted` thumb; on is `color-accent` with a `color-on-accent` thumb. The
  edge against the page and the thumb against its track are both >= 3:1 at rest,
  hover and pressed, in light and dark (`switch.test.ts` and the `MATRIX`). On or
  off is never colour alone: the thumb sits at the start or the end.

**Running indicator.**

- One solid dot and one ring, both in the tone's solid colour, drawn in a 24 unit
  box that scales to 16, 24 or 40px. The ring grows from radius 4 to 9 and fades
  from 60% opacity to nothing (stroke 2) while the dot swells from 4 to 4.6 and
  from 100% to 85% opacity and back, both on the same clock.
- Timing: a 1.92s pulse (the reference 1.6s, 20% slower) then an 800ms rest, 2.72s
  in all, repeating. In the rest the ring is invisible and the dot is at rest.
  Written as CSS keyframes with linear easing; `--prism-running-cycle` sets the
  whole cycle (the pulse is the first 70.6% of it).
- The dot is the tone's solid colour, >= 3:1 on the page in every tone and both
  themes. The label is always in the page for screen readers.
- With `prefers-reduced-motion: reduce` nothing moves; the dot stays with a faint ring.
- In a card header use `size="sm"` with `data-prism-card-icon`, which seats it ahead
  of the title (see the Running job recipe). Swap it for a Tag when the job ends.

#### Tone palette

Six tones: neutral, info, success, warning, danger, accent. They live in
`src/internal/tones.ts` as private `--_tone-low-bg/fg` and `--_tone-high-bg/fg`
and read colour roles (`color-info`, `color-info-text`, `color-info-surface`
and the same for success, warning and danger; `color-accent`,
`color-accent-text`, `color-accent-surface`; `color-neutral`,
`color-neutral-surface`), so every tone follows the theme. The tints sit at L 0.915 (dark L 0.30) with real chroma, and the text roles run near the Display P3 edge, so tags read as colour rather than grey-white; every pair is still 4.5:1 or more. Solid fills use
`color-on-solid` for their text (white in light, ink in dark). A hex fallback
sits in each `var()`. `test/tokens.test.mjs` checks every tone in both themes,
on sRGB and on Display P3: low text 4.5:1 on its tint, page and surface, high
text 4.5:1 on its fill, and the fill 3:1 against the page and the progress
track.

Open questions: (1) Tag `emphasis`: the Tag spec lists high, low and ghost, the
a second spec says ghost was dropped and outline is deferred. All
three are built. (2) Tag `size` and Badge `tone` are not in the specs.
(3) Whether Avatar gets a presence `status`.

- **Dashboard rows** (recipe, `src/card/dashboard-rows.recipe.ts`): three
  `reorder-group` lists of widget cards. A row lays out its cards as equal
  columns by item count (`grid-auto-flow: column`, `1fr`), so one card fills the
  row and an empty row stays a dashed drop zone with a note (an empty reorderable
  list has no `list` role). Keyboard: the card's menu adds "Move to row N" for
  every other row through `list.moveCardTo(card, target, index?)`, which says
  "{title} moved from Row 1 to Row 2, position 4 of 4.", fires
  `prism-card-reorder` and returns focus to the card's menu button. While a
  pointer drag runs, the dimmed original is `inert` (a placeholder).

### PROPOSED, not tokens yet

These values live as component-private `--_*` custom properties built from
existing primitives. They are **not** in `tokens/*.json` and Typography is
untouched. They wait for approval.

| Private property   | Value                                   | Where                                                                     |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------- |
| `--_title-*`       | 14px / 20px / 600 sans                  | `prism-card-title` (component title style)                                |
| `--_supporting-*`  | 12px / 20px / 400 sans                  | description and meta (spec says 12/20; token `caption` is 12/16)          |
| `--_pad`           | density pad units + 2 (12 / 16 / 20px)  | `prism-card`                                                              |
| `--_metric-*`      | 28px / 36px / 600 sans, tabular figures | `prism-card-metric` (metric text style; the spec leaves it to Typography) |
| `CARD_LIST_MIN_PX` | 280                                     | card list minimum card width (spec: "at least 280px")                     |
| `CARD_NARROW_PX`   | 280                                     | narrow rule (spec marks it with a dagger)                                 |

### Behavior notes

- Role and name: standalone card = `group`, inside an `li` = none, inside
  `prism-card-list` = `listitem`; never a landmark. The name is the title text,
  copied to `aria-label` (ID references cannot cross shadow roots). An author
  `role` or `aria-label` wins.
- Narrow (280px or less, dagger in the spec): the card gets `:state(narrow)`,
  the footer stacks and header icon buttons fold into one overflow menu.
- Layout properties are logical, so cards mirror in right-to-left.

## Polish layer (opt-in)

An optional layer for demos and products that want a slightly more finished feel. It changes corners and adds two pointer effects. It never changes layout, type, colour roles or focus visibility, and it does nothing unless an ancestor carries `data-prism-polish`.

- **Switch.** `data-prism-polish` on any ancestor (the page root for a global switch): empty or `all` turns on all three, or list `squircle`, `light`, `tilt`. `off` (or `none`) turns it off again inside a scope. Load `@glenn203/prism/polish.css` after the theme, and call `enablePolish()` once for the two pointer effects. The Storybook toolbar sets the attribute for you.
- **Squircle corners.** `--prism-corner-shape` becomes `squircle`, and radii on buttons, icon buttons, tags, text fields, cards, menus and menu items are multiplied by `--prism-corner-scale` (1.5). Both are gated by `@supports (corner-shape: squircle)`; where it is not supported nothing changes, so the normal radius stays. The scale is there because a squircle at the same radius reads tighter than a round corner. Pills and the switch track are left alone.
- **Light-following border.** On hover and keyboard focus, buttons and clickable, selectable or raised cards draw a 1px gradient ring (the spectrum hues at their 600 level in light, 300 in dark) whose highlight follows the pointer through `--x` and `--y`. It is a mask over the border box, so it sits on top of the existing border and focus ring and never replaces them; the border keeps its 3:1 contrast. Disabled and borderless cards, touch (`hover: none`, `pointer: coarse`) and forced colours get no ring.
- **Card tilt.** Cards only, at most `--prism-tilt-max` (2.5 degrees) under `--prism-tilt-perspective`, easing back on leave. Transform only. Never on buttons, on a dragged card, on touch, or when motion is reduced.
- **Reduced motion.** Corners still apply. The ring has no fade, the pointer is not tracked, nothing tilts.
- **Support.** `corner-shape` is new and not in every browser yet; where it is missing the corners stay round. The ring needs `mask-composite` and `light-dark()`.

## Figma mapping

- States: add a **fill layer** above the resting fill using the element's
  **text colour variable** at **6%** (hover), **12%** (pressed), **11%**
  (selected) or **15%** (selected+hover) opacity. Disabled has no layer.
- Token names map 1:1. `--prism-color-text` is Figma `color/text`. Resolved
  px values come from `prism.tokens.resolved.json`.
