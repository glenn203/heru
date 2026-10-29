# Prism tokens

Source: `prism.tokens.json` (W3C DTCG). Build: `pnpm tokens` →
`src/tokens/tokens.css` (exported as `prism/tokens.css`) and
`prism.tokens.resolved.json` (exported as `prism/tokens.json`, every value in px per density mode, for Figma and agents). Never edit generated files.

## Naming rules

- Every CSS variable starts with `--prism-` and mirrors the token path: `control.height.md` → `--prism-control-height-md`.
- **One primitive:** `--prism-unit` = 4px (0.25rem, so it scales with user font size). Everything else is a multiple of it.
- **Numbers mean something.** `space-N` = N × 4px. `font-size-N` and `font-line-height-N` = N px. An agent can read the value from the name with no lookup table.
- **Sizes that aren't numbers are ordered:** `sm` < `md` < `lg` (control heights). Radius uses value-in-name (`radius-5` = 5px).
- **Text roles** (`text-body-*`, `text-label-*`, `text-heading-1-*`, `text-code-*` …) bundle size, line height, weight and family. Components should use roles; reach for the numeric scales only when no role fits.
- All line heights, spacing and control heights are multiples of 4px. Exceptions: `border-width` (1px) and the focus ring (2px offset, 3px ring, 0.5px blur); radii use their own odd-pixel ramp. Font sizes 14 and 18 sit on 2px steps; their line heights stay on 4px.
- Borders are drawn inside control heights (`box-sizing: border-box`).

## Density

Three modes: `compact`, `default`, `comfortable`. Set on any element; `default` also applies on `:root`.

```html
<main data-prism-density="comfortable">
  <table data-prism-density="compact">
    …
  </table>
</main>
```

Density only changes unit counts (leading 4/5/6, block padding 1/2/3, inline padding 2/3/4, small control height 6/8/10). `space-*` stays fixed.

| Control height | compact | default | comfortable |
| -------------- | ------- | ------- | ----------- |
| sm             | 24      | 32      | 40          |
| md             | 24      | 36      | 48          |
| lg             | 32      | 44      | 56          |

`md` = body leading + block padding × 2, and `lg` adds one more padding unit on each side. `sm` is set directly per mode (6/8/10 units), so it stays on the 4px grid and never drops below 24px (WCAG 2.2 target size). Compact `sm` equals compact `md`.

## Color

Minimal on purpose: one dark slate ramp (`color-slate-0…950`, hue 260, low chroma) and one error red (`color-red-*`), in OKLCH. The resolved JSON adds an sRGB `hex` for Figma.

Use the semantic names, not the ramps: `color-bg`, `-surface`, `-text`, `-text-muted`, `-border`, `-border-strong`, `-accent` (near-black slate-950), `-accent-hover` (one step lighter), `-accent-active`, `-on-accent`, `-focus-ring`, `-error`, `-error-text`. Contrast is checked in `test/tokens.test.mjs` (text pairs ≥ 4.5:1, borders/focus ≥ 3:1). No dark mode yet.

## Radius

Odd-pixel ramp, value in the name: `radius-1, -3, -5, -7, -9, -11`, plus `radius-none` and `radius-full`. Radii are exempt from the 4px grid. Controls use `radius-5`.

## Focus and motion

`focus-ring-offset` (1px), `focus-ring-width` (2px), `focus-ring-blur` (0.5px), `focus-halo-width` (1px) and `focus-halo` (slate at 12%); total reach is 4px, so fields use `space-1` (4px) label→control and `space-2` (8px) control→description, and the attached error text starts 6px below the control; `motion-duration-fast` (160ms), `motion-ease-out`. The theme grows a 2px box-shadow ring in on `:focus-visible` (inputs on `:focus`) and keeps a transparent outline for forced-colors mode. With `prefers-reduced-motion: reduce` the ring appears instantly.

## Elevation (shared foundation)

Three semantic levels, defined once in `prism.tokens.json` and emitted as
`--prism-elevation-*` box-shadow values. Any raised surface uses them: select
menus, popovers, dialogs, toasts, field status boxes. Components never
hard-code shadows; the theme applies these tokens through `::part()`.
Names: NAME PENDING — Technical Writer (semantic `default/hover/urgent` chosen
over numeric `1/2/3`).

| Token                       | Use                                                          | Built from                            |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| `--prism-elevation-default` | Resting raised surface (open menu, popover)                  | slate-950, hue 260, 6% + 12%          |
| `--prism-elevation-hover`   | RESERVED, unused (option hover is a flat slate-100/200 tint) | slate-950, hue 260, 8% + 16%, tighter |
| `--prism-elevation-urgent`  | Error-urgent (attached error box)                            | red-600, hue 27, 12% + 24%            |

Related: `--prism-color-error-surface` (error red at 10% alpha, ≈ #fce8eb on white; text contrast 9.62:1) is the flat fill for
the attached error box (text field and select, no shadow); `--prism-motion-duration-medium` (200ms) drives the menu
slide-down and error reveal. Both animations are disabled under
`prefers-reduced-motion`.

## Theme

`prism/theme.css` is an opt-in look built only on `::part()`, `:state()` and these tokens. Fonts (Inter, JetBrains Mono) are referenced by name and not bundled; load them in your app.
