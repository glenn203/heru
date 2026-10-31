import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { tonePalette } from '../internal/tones.js';
import { visuallyHidden } from '../internal/visually-hidden.js';
import type { TagTone } from '../tag/tag.js';

/**
 * Shows that something is running right now: a soft dot with rings that spread
 * outward and fade, like light fanning out of a prism. Use it beside a task or
 * card title while a job is in progress, and remove it (or swap it for a Tag
 * that says "Done") when the job ends.
 *
 * - `role="status"` with a written label ("Running" by default). The label is
 *   always in the page for screen readers; `show-label` also shows it.
 *   Change `label` to say what is running: "Export running".
 * - Sizes: `sm` 16px, `md` 24px (default), `lg` 40px.
 * - The default tone is `accent`, whose rings drift from violet through blue to
 *   cyan. Other tones keep one colour.
 * - Motion: the rings repeat every 1.6s. Under `prefers-reduced-motion:
 *   reduce` they hold still as a soft halo. The dot is always there, so motion
 *   is never the only signal.
 * - It does not show progress. For a known amount of work use Progress.
 *
 * @tag prism-running-indicator
 * @csspart base - The status wrapper.
 * @csspart graphic - The SVG with the dot and rings.
 * @csspart label - The label text (visually hidden unless `show-label`).
 * @cssprop [--prism-running-duration=1600ms] - Time for one ring to spread and fade.
 */
export class PrismRunningIndicator extends LitElement {
  static override styles = [
    tonePalette('tone'),
    visuallyHidden,
    css`
      :host {
        --_size: 1.5rem;
        display: inline-block;
        vertical-align: middle;
        min-inline-size: 0;
      }
      :host([size='sm']) {
        --_size: 1rem;
      }
      :host([size='lg']) {
        --_size: 2.5rem;
      }
      :host([hidden]) {
        display: none;
      }
      /* The dot is the tone's solid colour. Accent rings fan out through the
         spectrum; every other tone keeps one hue. */
      :host {
        --_dot: var(--_tone-high-bg);
        --_ring-1: var(--_tone-high-bg);
        --_ring-2: var(--_tone-high-bg);
        --_ring-3: var(--_tone-high-bg);
      }
      :host([tone='accent']) {
        --_ring-2: var(--prism-color-blue-500, #3d8bfd);
        --_ring-3: var(--prism-color-cyan-500, #14b8c8);
      }
      [part='base'] {
        display: inline-flex;
        align-items: center;
        gap: var(--prism-space-2, 0.5rem);
        font-family: var(--prism-font-family-sans, Inter, sans-serif);
        font-size: var(--prism-font-size-14, 0.875rem);
        line-height: var(--prism-font-line-height-20, 1.25rem);
      }
      [part='graphic'] {
        flex: none;
        inline-size: var(--_size);
        block-size: var(--_size);
        overflow: visible;
      }
      .core {
        fill: var(--_dot);
      }
      .ring {
        fill: none;
        stroke-width: 1.5;
        vector-effect: non-scaling-stroke;
        transform-box: fill-box;
        transform-origin: center;
        opacity: 0;
        animation: prism-running-ring var(--prism-running-duration, 1600ms)
          cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
      }
      .ring-1 {
        stroke: var(--_ring-1);
      }
      .ring-2 {
        stroke: var(--_ring-2);
        animation-delay: calc(var(--prism-running-duration, 1600ms) / 3);
      }
      .ring-3 {
        stroke: var(--_ring-3);
        animation-delay: calc(var(--prism-running-duration, 1600ms) * 2 / 3);
      }
      /* The dot breathes a little as each ring leaves it. */
      .core {
        transform-box: fill-box;
        transform-origin: center;
        animation: prism-running-core var(--prism-running-duration, 1600ms)
          ease-in-out infinite;
      }
      @keyframes prism-running-ring {
        0% {
          opacity: 0.85;
          scale: 1;
        }
        100% {
          opacity: 0;
          scale: 2.6;
        }
      }
      @keyframes prism-running-core {
        0%,
        100% {
          scale: 1;
        }
        18% {
          scale: 1.12;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ring,
        .core {
          animation: none;
        }
        /* Still: a soft two-ring halo. */
        .ring-1 {
          opacity: 0.55;
          scale: 1.7;
        }
        .ring-2 {
          opacity: 0.3;
          scale: 2.3;
        }
        .ring-3 {
          display: none;
        }
      }
      @media (forced-colors: active) {
        .core {
          fill: Highlight;
        }
        .ring {
          stroke: Highlight;
        }
      }
    `,
  ];

  /** What is running, for screen readers. Default "Running". */
  @property() label = 'Running';
  /** Also shows the label as text beside the dot. */
  @property({ type: Boolean, attribute: 'show-label' }) showLabel = false;
  /** Size: sm (16px), md (24px) or lg (40px). */
  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /** Colour: accent (default), neutral, info, success, warning or danger. */
  @property({ reflect: true }) tone: TagTone = 'accent';

  override render() {
    return html`<span part="base" role="status">
      <svg
        part="graphic"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
      >
        <circle class="ring ring-1" cx="24" cy="24" r="9" />
        <circle class="ring ring-2" cx="24" cy="24" r="9" />
        <circle class="ring ring-3" cx="24" cy="24" r="9" />
        <circle class="core" cx="24" cy="24" r="7" />
      </svg>
      <span part="label" class=${this.showLabel ? '' : 'visually-hidden'}
        >${this.label}</span
      >
    </span>`;
  }
}
