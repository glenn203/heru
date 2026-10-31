import { css, unsafeCSS, type CSSResult } from 'lit';

/**
 * Tone palette for Tag, Badge and Progress. Component-private `--_tone-*`
 * properties that read the colour roles in tokens (neutral, accent, info,
 * success, warning, danger), so every tone follows the active theme, light or
 * dark. The hex after each role is its light sRGB value, used when the token
 * stylesheet is not loaded. test/tokens.test.mjs reads this file and checks
 * the fallbacks and every pair, in both themes, on sRGB and Display P3:
 * low text >= 4.5:1 on its tint and on the page, high text >= 4.5:1 on its
 * fill, fills >= 3:1 on the page and on the progress track.
 *
 *   low  = tint fill with coloured text (the default emphasis)
 *   high = solid fill with its on-colour text
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
      --_tone-low-bg: var(--prism-color-neutral-surface, #e7edf7);
      --_tone-low-fg: var(--prism-color-text, #101826);
      --_tone-high-bg: var(--prism-color-neutral, #354153);
      --_tone-high-fg: var(--prism-color-on-solid, #ffffff);
    }
    :host([${a}='accent']) {
      --_tone-low-bg: var(--prism-color-accent-surface, #e7ddfc);
      --_tone-low-fg: var(--prism-color-accent-text, #6400b1);
      --_tone-high-bg: var(--prism-color-accent, #7d24d3);
      --_tone-high-fg: var(--prism-color-on-accent, #ffffff);
    }
    :host([${a}='danger']) {
      --_tone-low-bg: var(--prism-color-danger-surface, #ffd8db);
      --_tone-low-fg: var(--prism-color-danger-text, #920034);
      --_tone-high-bg: var(--prism-color-danger, #b80044);
    }
    :host([${a}='info']) {
      --_tone-low-bg: var(--prism-color-info-surface, #c8e8fc);
      --_tone-low-fg: var(--prism-color-info-text, #005476);
      --_tone-high-bg: var(--prism-color-info, #006c97);
    }
    :host([${a}='success']) {
      --_tone-low-bg: var(--prism-color-success-surface, #bbf2d3);
      --_tone-low-fg: var(--prism-color-success-text, #005c3b);
      --_tone-high-bg: var(--prism-color-success, #00764c);
    }
    :host([${a}='warning']) {
      --_tone-low-bg: var(--prism-color-warning-surface, #fddeaf);
      --_tone-low-fg: var(--prism-color-warning-text, #733e00);
      --_tone-high-bg: var(--prism-color-warning, #8d5400);
    }
    /* TONES-END */
  `;
}
