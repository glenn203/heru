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

## Figma mapping

- States: add a **fill layer** above the resting fill using the element's
  **text colour variable** at **8%** (hover), **12%** (pressed), **14%**
  (selected) or **18%** (selected+hover) opacity. Disabled has no layer.
- Token names map 1:1. `--prism-color-text` is Figma `color/text`. Resolved
  px values come from `prism.tokens.resolved.json`.
