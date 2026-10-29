import { css, unsafeCSS, type CSSResult } from 'lit';

/**
 * PROPOSED tone palette for Tag, Badge and Progress. Component-private
 * `--_tone-*` properties; NOT tokens and nothing is added to tokens/*.json.
 *
 * The Tag page names six tones: neutral, info, success, warning, danger and
 * accent. The tokens have no success, warning or info colour yet, so those
 * three are stand-in OKLCH values here. Neutral, accent and danger reuse the
 * existing slate, accent and red values. Every pair is contrast-tested by
 * test/tokens.test.mjs ("tone palette"), which reads this file:
 * low text >= 4.5:1 on its tint and on the page, high text >= 4.5:1 on its
 * fill, fills >= 3:1 on the page and on the progress track.
 *
 *   low  = light tint fill with coloured text (the default emphasis)
 *   high = solid fill with white text
 *
 * `attr` is the host attribute that carries the tone. The theme reads the four
 * properties (`--_tone-low-bg`, `--_tone-low-fg`, `--_tone-high-bg`,
 * `--_tone-high-fg`) from the host.
 */
export function tonePalette(attr: string): CSSResult {
  const a = unsafeCSS(attr);
  return css`
    /* TONES-START */
    :host {
      --_tone-low-bg: var(--prism-color-slate-100, oklch(0.968 0.007 260));
      --_tone-low-fg: var(--prism-color-text, oklch(0.208 0.03 260));
      --_tone-high-bg: var(--prism-color-slate-700, oklch(0.372 0.035 260));
      --_tone-high-fg: var(--prism-color-on-accent, oklch(1 0 260));
    }
    :host([${a}='accent']) {
      --_tone-low-bg: oklch(0.94 0.015 260);
      --_tone-low-fg: var(--prism-color-accent, oklch(0.129 0.03 260));
      --_tone-high-bg: var(--prism-color-accent, oklch(0.129 0.03 260));
    }
    :host([${a}='danger']) {
      --_tone-low-bg: var(--prism-color-red-50, oklch(0.971 0.013 27));
      --_tone-low-fg: var(--prism-color-red-700, oklch(0.48 0.17 27));
      --_tone-high-bg: var(--prism-color-red-700, oklch(0.48 0.17 27));
    }
    :host([${a}='info']) {
      --_tone-low-bg: oklch(0.965 0.016 250);
      --_tone-low-fg: oklch(0.42 0.14 258);
      --_tone-high-bg: oklch(0.48 0.17 258);
    }
    :host([${a}='success']) {
      --_tone-low-bg: oklch(0.965 0.03 150);
      --_tone-low-fg: oklch(0.4 0.1 150);
      --_tone-high-bg: oklch(0.47 0.11 150);
    }
    :host([${a}='warning']) {
      --_tone-low-bg: oklch(0.97 0.036 90);
      --_tone-low-fg: oklch(0.42 0.09 65);
      --_tone-high-bg: oklch(0.48 0.1 60);
    }
    /* TONES-END */
  `;
}
