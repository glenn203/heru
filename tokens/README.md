# Herú tokens

Source: `heru.tokens.json` (W3C DTCG). Build: `pnpm tokens` →
`src/tokens/tokens.css` (exported as `heru/tokens.css`) and
`heru.tokens.resolved.json` (exported as `heru/tokens.json`, every value in px per density mode, for Figma and agents). Never edit generated files.

## Naming rules

- Every CSS variable starts with `--heru-` and mirrors the token path: `control.height.md` → `--heru-control-height-md`.
- **One primitive:** `--heru-unit` = 4px (0.25rem, so it scales with user font size). Everything else is a multiple of it.
- **Numbers mean something.** `space-N` = N × 4px. `font-size-N` and `font-line-height-N` = N px. An agent can read the value from the name with no lookup table.
- **Sizes that aren't numbers are ordered:** `sm` < `md` < `lg` (radius, control heights).
- **Text roles** (`text-body-*`, `text-label-*`, `text-heading-1-*`, `text-code-*` …) bundle size, line height, weight and family. Components should use roles; reach for the numeric scales only when no role fits.
- All line heights, spacing, radii and control heights are multiples of 4px. Exceptions: `border-width` (1px) and `radius-full` (9999px). Font sizes 14 and 18 sit on 2px steps; their line heights stay on 4px.
- Borders are drawn inside control heights (`box-sizing: border-box`).

## Density

Three modes: `compact`, `default`, `comfortable`. Set on any element; `default` also applies on `:root`.

```html
<main data-heru-density="comfortable">
  <table data-heru-density="compact">
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

Minimal on purpose: one neutral ramp (`color-neutral-0…950`, hue 255, low chroma), one accent (`color-blue-*`), one error (`color-red-*`), all in OKLCH. The resolved JSON adds an sRGB `hex` for Figma.

Use the semantic names, not the ramps: `color-bg`, `-surface`, `-text`, `-text-muted`, `-border`, `-border-strong`, `-accent`, `-accent-hover`, `-accent-active`, `-on-accent`, `-focus-ring`, `-error`, `-error-text`. Contrast is checked in `test/tokens.test.mjs` (text pairs ≥ 4.5:1, borders/focus ≥ 3:1). No dark mode yet.

## Theme

`heru/theme.css` is an opt-in look built only on `::part()`, `:state()` and these tokens. Fonts (Inter, JetBrains Mono) are referenced by name and not bundled; load them in your app.
