import { css, unsafeCSS, type CSSResult } from 'lit';

/**
 * Private shared state layer for ANY interactive surface: buttons, options,
 * tree rows, list items, tabs, clickable cards, icon buttons.
 *
 * Contract (theme-facing, set from outside via ::part()):
 *   --_bg   resting fill (may be `transparent`)
 *   --_on   text/icon colour on that fill
 *   --_bg-hover / --_bg-pressed / --_bg-selected   optional fixed fills, used
 *           ONLY when color-mix() is unsupported (Safari < 16.2 etc.)
 * Fill = color-mix(in oklch, var(--_bg), var(--_on) <state %>).
 * Mixing with a transparent --_bg yields the on-colour at <state %> alpha
 * (identical to an srgb veil), so one formula covers solid and outline.
 * The resolved fill is exposed as --_heru-state-fill (e.g. for a border that
 * follows the fill).
 *
 * States (in the shadow root, so ::part() themes don't need per-state rules):
 *   hover     :hover inside @media (hover: hover), or host :state(active)
 *             (keyboard highlight, e.g. aria-activedescendant)
 *   pressed   :active, or [data-pressed] for components with a keyboard-
 *             pressed state
 *   selected  [aria-selected=true] / [aria-pressed=true] / [aria-current] /
 *             [aria-checked=true] on the surface, or host :state(selected).
 *             Uses --heru-state-selected. Selected+hover adds half of
 *             --heru-state-hover (18% by default) so tinted text/borders keep
 *             contrast; selected+pressed uses the pressed fill (12%). Colour is never the only cue: the
 *             component MUST also show a non-colour indicator (check mark,
 *             underline, bold, icon…) — WCAG 1.4.1.
 *   disabled  :disabled / [aria-disabled=true] / host :state(disabled):
 *             no hover/pressed/selected change at all.
 * Headless-safe: with no theme, --_bg is unset and the fill is transparent.
 */
export function stateLayer(selector: string): CSSResult {
  const s = unsafeCSS(selector);
  const live = unsafeCSS(`${selector}:not(:disabled, [aria-disabled='true'])`);
  return css`
    ${s} {
      --_heru-mix-hover: color-mix(
        in oklch,
        var(--_bg, transparent),
        var(--_on, transparent) var(--heru-state-hover, 8%)
      );
      --_heru-mix-pressed: color-mix(
        in oklch,
        var(--_bg, transparent),
        var(--_on, transparent) var(--heru-state-pressed, 12%)
      );
      --_heru-mix-selected: color-mix(
        in oklch,
        var(--_bg, transparent),
        var(--_on, transparent) var(--heru-state-selected, 14%)
      );
      --_heru-mix-selected-hover: color-mix(
        in oklch,
        var(--_bg, transparent),
        var(--_on, transparent)
          calc(
            var(--heru-state-selected, 14%) + var(--heru-state-hover, 8%) / 2
          )
      );
      --_heru-state-fill: var(--_bg, transparent);
      background-color: var(--_heru-state-fill);
    }
    @supports not (color: color-mix(in oklch, red, blue)) {
      ${s} {
        --_heru-mix-hover: var(--_bg-hover, var(--_bg, transparent));
        --_heru-mix-pressed: var(--_bg-pressed, var(--_bg, transparent));
        --_heru-mix-selected: var(--_bg-selected, var(--_bg, transparent));
        --_heru-mix-selected-hover: var(
          --_bg-selected,
          var(--_bg, transparent)
        );
      }
    }
    ${live}:is(
        [aria-selected='true'],
        [aria-pressed='true'],
        [aria-checked='true'],
        [aria-current]:not([aria-current='false'])
      ),
    :host(:state(selected):not(:state(disabled))) ${s} {
      --_heru-state-fill: var(--_heru-mix-selected);
    }
    :host(:state(active):not(:state(disabled))) ${s} {
      --_heru-state-fill: var(--_heru-mix-hover);
    }
    :host(:state(active):state(selected):not(:state(disabled))) ${s} {
      --_heru-state-fill: var(--_heru-mix-selected-hover);
    }
    @media (hover: hover) {
      :host(:not(:state(disabled))) ${live}:hover {
        --_heru-state-fill: var(--_heru-mix-hover);
      }
      :host(:not(:state(disabled)))
        ${live}:hover:is(
          [aria-selected='true'],
          [aria-pressed='true'],
          [aria-checked='true'],
          [aria-current]:not([aria-current='false'])
        ),
      :host(:state(selected):not(:state(disabled))) ${live}:hover {
        --_heru-state-fill: var(--_heru-mix-selected-hover);
      }
    }
    :host(:not(:state(disabled))) ${live}:is(:active, [data-pressed]) {
      --_heru-state-fill: var(--_heru-mix-pressed);
    }
  `;
}
