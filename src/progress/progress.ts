import { LitElement, css, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { tonePalette } from '../internal/tones.js';
import type { TagTone } from '../tag/tag.js';

/**
 * A bar that shows how far something has got. Common props: `value`, `max`,
 * `label`, `tone`. NAMES PROVISIONAL.
 *
 * - Role `progressbar` with `aria-valuemin` 0, `aria-valuemax` and
 *   `aria-valuenow`, named by `label`.
 * - Leave `value` off for an indeterminate bar (`aria-valuenow` is omitted and
 *   the stripe moves; it stops under reduced motion).
 * - The label is visible by default. `hide-label` hides it from sight only.
 *   `show-value` writes the number beside it ("60%", or `value-text` such as
 *   "3 of 5 steps", which is also the `aria-valuetext`). Colour is never the
 *   only signal: the fill length and the written value both say it.
 * - Use it for a task with a known end. For "loading, no idea how long" use
 *   a skeleton or an indeterminate bar.
 *
 * @tag prism-progress
 * @csspart base - The row (label, value).
 * @csspart label - The visible label.
 * @csspart value - The written value.
 * @csspart track - The bar's track.
 * @csspart fill - The filled part.
 * @cssstate indeterminate - No value.
 */
export class PrismProgress extends LitElement {
  static override styles = [
    tonePalette('tone'),
    css`
      :host {
        /* PROPOSED progress text: 12/20, weight 400 (the supporting style). */
        --_progress-font-size: var(--prism-font-size-12, 0.75rem);
        --_progress-line-height: var(--prism-font-line-height-20, 1.25rem);
        display: block;
        min-inline-size: 0;
      }
      :host([hidden]) {
        display: none;
      }
      [part='base'] {
        display: grid;
        gap: var(--prism-space-1, 0.25rem);
      }
      [part='row'] {
        display: flex;
        justify-content: space-between;
        gap: var(--prism-space-2, 0.5rem);
        font-family: var(--prism-font-family-sans, Inter, sans-serif);
        font-size: var(--_progress-font-size);
        line-height: var(--_progress-line-height);
      }
      [part='label'],
      [part='value'] {
        min-inline-size: 0;
      }
      [part='value'] {
        font-variant-numeric: tabular-nums;
        margin-inline-start: auto;
      }
      .vh {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
      [part='track'] {
        box-sizing: border-box;
        position: relative;
        block-size: 0.5rem;
        overflow: hidden;
        border: var(--prism-border-width, 1px) solid transparent;
        border-radius: var(--prism-radius-full, 9999px);
      }
      [part='fill'] {
        block-size: 100%;
        inline-size: var(--_fill, 0%);
        border-radius: inherit;
      }
      :host(:state(indeterminate)) [part='fill'] {
        inline-size: 40%;
        animation: prism-progress-slide 1400ms ease-in-out infinite;
      }
      @keyframes prism-progress-slide {
        from {
          margin-inline-start: -40%;
        }
        to {
          margin-inline-start: 100%;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        :host(:state(indeterminate)) [part='fill'] {
          animation: none;
          margin-inline-start: 30%;
        }
      }
    `,
  ];

  /** Required. What is progressing: "Setup", "Storage used". */
  @property() label = '';
  /** Current value from 0 to `max`. Leave off when unknown. */
  @property({ type: Number }) value?: number;
  @property({ type: Number }) max = 100;
  /** Writes the value beside the label. */
  @property({ type: Boolean, attribute: 'show-value' }) showValue = false;
  /** Replaces the percent with words, for example "3 of 5 steps". */
  @property({ attribute: 'value-text' }) valueText = '';
  /** Hides the label from sight (it still names the bar). */
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false;
  @property({ reflect: true }) tone: TagTone = 'accent';

  readonly #internals = this.attachInternals();

  get #determinate(): boolean {
    return typeof this.value === 'number' && !Number.isNaN(this.value);
  }

  get #now(): number {
    return Math.min(this.max, Math.max(0, this.value ?? 0));
  }

  get #text(): string {
    if (!this.#determinate) return '';
    return (
      this.valueText || `${Math.round((this.#now / (this.max || 1)) * 100)}%`
    );
  }

  override willUpdate(): void {
    try {
      if (!this.#determinate) this.#internals.states.add('indeterminate');
      else this.#internals.states.delete('indeterminate');
    } catch {
      /* :state() unsupported */
    }
  }

  override updated(): void {
    if (!this.label)
      console.error(
        '[prism-progress] `label` is required: a progress bar needs an accessible name.',
        this,
      );
  }

  override render() {
    const pct = this.#determinate
      ? Math.round((this.#now / (this.max || 1)) * 1000) / 10
      : 0;
    return html`<div part="base">
      <div part="row" ?hidden=${this.hideLabel && !this.showValue}>
        <span part="label" class=${this.hideLabel ? 'vh' : ''}
          >${this.label}</span
        >
        ${
          this.showValue && this.#determinate
            ? html`<span part="value" aria-hidden="true">${this.#text}</span>`
            : nothing
        }
      </div>
      <div
        part="track"
        role="progressbar"
        aria-label=${this.label || nothing}
        aria-valuemin="0"
        aria-valuemax=${this.max}
        aria-valuenow=${this.#determinate ? this.#now : nothing}
        aria-valuetext=${
          this.#determinate && this.valueText ? this.valueText : nothing
        }
        style=${`--_fill:${pct}%`}
      >
        <div part="fill"></div>
      </div>
    </div>`;
  }
}
