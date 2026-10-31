import { LitElement, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { FormAssociated } from '../internal/form-associated.js';
import { textRole } from '../internal/control-styles.js';
import { stateLayer } from '../internal/state-layer.js';
import { visuallyHidden } from '../internal/visually-hidden.js';

/**
 * A switch: an on/off control that takes effect right away, like a light
 * switch. Use it for a setting ("Auto-refresh"), not for a choice that is only
 * saved when a form is submitted (use a checkbox there).
 *
 * - A native `<button role="switch" aria-checked>` in shadow DOM, so Space and
 *   Enter toggle it and it takes part in the tab order.
 * - Named by `label` (and any default-slot content). The label is visible by
 *   default; `hide-label` hides it from sight only.
 * - Joins the surrounding form: submits `value` (default "on") under `name`
 *   while on, and nothing while off. Resets to its starting state with the form.
 * - Fires `input` and `change` after each user toggle.
 * - Motion: the thumb slides and stretches like a drop of liquid, then springs
 *   back into shape (about 240ms), while the track fills with the accent from
 *   the thumb outward. Under `prefers-reduced-motion: reduce` it just changes.
 * - State is never colour alone: the thumb sits at the start when off and at
 *   the end when on.
 * - The hover, selected and pressed fills come from the shared state layer.
 *
 * @tag prism-switch
 * @slot - Extra label content, shown after `label`.
 * @csspart container - Wraps the control and its label.
 * @csspart base - The native button, drawn as the track.
 * @csspart wash - The accent fill that spreads across the track when on.
 * @csspart thumb - The sliding pill.
 * @csspart label - The visible label.
 * @cssstate checked - The switch is on.
 * @cssstate disabled - The switch is disabled.
 * @fires input - After the user toggles the switch.
 * @fires change - After the user toggles the switch.
 * @cssprop [--prism-switch-duration=240ms] - Length of the stretch and spring.
 */
export class PrismSwitch extends FormAssociated(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    visuallyHidden,
    css`
      :host {
        /* Track height, width and the gap around the thumb (default size md). */
        --_h: 1.75rem;
        --_w: 3.25rem;
        --_inset: 0.25rem;
        --_bd: var(--prism-border-width, 1px);
        --_dir: 1;
        display: inline-block;
        vertical-align: middle;
      }
      :host([size='sm']) {
        --_h: 1.5rem;
        --_w: 2.75rem;
        --_inset: 0.1875rem;
      }
      :host([size='lg']) {
        --_h: 2rem;
        --_w: 3.75rem;
      }
      :host(:dir(rtl)) {
        --_dir: -1;
      }
      :host([hidden]) {
        display: none;
      }
      /* The thumb is a pill, a quarter wider than it is tall. */
      [part='container'] {
        --_th: calc(var(--_h) - 2 * var(--_bd) - 2 * var(--_inset));
        --_tw: calc(var(--_th) * 1.25);
        --_inner: calc(var(--_w) - 2 * var(--_bd));
        --_travel: calc(var(--_inner) - 2 * var(--_inset) - var(--_tw));
        /* Thumb centre, measured from the left edge, off and on. */
        --_x-off: calc(
          var(--_inner) / 2 + var(--_dir) *
            (var(--_inset) + var(--_tw) / 2 - var(--_inner) / 2)
        );
        --_x-on: calc(var(--_x-off) + var(--_dir) * var(--_travel));
        display: flex;
        align-items: center;
        gap: var(--prism-space-3, 0.75rem);
      }
      /* Label before the switch. A block host pushes the switch to the
         far end of the row. */
      :host([label-position='start']) [part='container'] {
        flex-direction: row-reverse;
        justify-content: space-between;
      }
      [part='base'] {
        all: unset;
        box-sizing: border-box;
        position: relative;
        flex: none;
        inline-size: var(--_w);
        block-size: var(--_h);
        overflow: hidden;
        border-width: var(--_bd);
        border-style: solid;
        border-color: transparent;
        border-radius: var(--prism-radius-full, 9999px);
        cursor: var(--prism-switch-cursor, pointer);
      }
      [part='base']:disabled {
        cursor: var(--prism-switch-cursor-disabled, default);
      }
      /* The accent fill spreads out from the thumb (off) or back into it. */
      [part='wash'] {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        clip-path: circle(0 at var(--_x-off) 50%);
        transition: clip-path var(--prism-duration-default, 200ms)
          var(--prism-ease-standard, cubic-bezier(0.2, 0, 0, 1));
      }
      [aria-checked='true'] > [part='wash'] {
        clip-path: circle(150% at var(--_x-on) 50%);
      }
      /* The state layer's overlay, drawn above the wash and below the thumb. */
      [part='base']::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background-color: var(--_prism-state-overlay, transparent);
        pointer-events: none;
      }
      /* A pass of light across the track while the thumb moves. */
      [part='base']::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        border-radius: inherit;
        background: linear-gradient(
          105deg,
          transparent 30%,
          rgb(255 255 255 / 0.45) 50%,
          transparent 70%
        );
        opacity: 0;
        translate: -100% 0;
        pointer-events: none;
      }
      [part='base'][data-moving]::before {
        animation: prism-switch-glint var(--prism-switch-duration, 240ms)
          ease-out;
      }
      @keyframes prism-switch-glint {
        0% {
          opacity: 0.9;
          translate: -100% 0;
        }
        100% {
          opacity: 0;
          translate: 100% 0;
        }
      }
      [part='thumb'] {
        position: absolute;
        z-index: 2;
        inset-block-start: var(--_inset);
        inset-inline-start: var(--_inset);
        inline-size: var(--_tw);
        block-size: var(--_th);
        border-radius: var(--prism-radius-full, 9999px);
        translate: 0 0;
        transition: translate var(--prism-duration-default, 200ms)
          var(--prism-ease-spring, cubic-bezier(0.25, 1, 0.5, 1));
      }
      [aria-checked='true'] > [part='thumb'] {
        translate: calc(var(--_dir) * var(--_travel)) 0;
      }
      [part='label'] {
        ${textRole('body')}
        cursor: var(--prism-switch-cursor, pointer);
        user-select: none;
      }
      :host(:state(disabled)) [part='label'] {
        cursor: var(--prism-switch-cursor-disabled, default);
      }
      @media (prefers-reduced-motion: reduce) {
        [part='wash'],
        [part='thumb'] {
          transition: none;
        }
        [part='base']::before {
          display: none;
        }
      }
    `,
    stateLayer("[part='base']"),
    // After the state layer: its overlay moves to ::after so the wash sits
    // underneath it, and the fill is the track's own.
    css`
      [part='base'] {
        background-image: none;
      }
    `,
  ];

  /** On when set. Reflected. */
  @property({ type: Boolean, reflect: true }) checked = false;

  /** Value submitted with the form while on. */
  @property() value = 'on';

  /** Required. What the switch controls: "Auto-refresh". */
  @property() label = '';

  /** Hides the label from sight (it still names the switch). */
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false;

  /** Where the label sits: after the switch (`end`, default) or before it. */
  @property({ attribute: 'label-position', reflect: true }) labelPosition:
    'start' | 'end' = 'end';

  /** Size: sm, md or lg. */
  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  @query('[part="base"]') private readonly button!: HTMLButtonElement;
  @query('[part="thumb"]') private readonly thumb!: HTMLElement;

  #defaultChecked?: boolean;

  override connectedCallback(): void {
    super.connectedCallback();
    // The first value seen is what a form reset goes back to.
    this.#defaultChecked ??= this.checked;
  }

  override focus(options?: FocusOptions): void {
    this.button?.focus(options);
  }

  /** Toggles the switch as if the user had pressed it. */
  override click(): void {
    this.button?.click();
  }

  formResetCallback(): void {
    this.checked = this.#defaultChecked ?? false;
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    this.checked = state === 'on';
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    this.setState('checked', this.checked);
    if (changed.has('checked') || changed.has('value')) {
      this.internals.setFormValue(
        this.checked ? this.value : null,
        this.checked ? 'on' : 'off',
      );
    }
  }

  override updated(): void {
    if (!this.label && !this.textContent?.trim())
      console.error(
        '[prism-switch] `label` is required: a switch needs an accessible name.',
        this,
      );
  }

  #toggle(): void {
    if (this.isDisabled) return;
    this.checked = !this.checked;
    this.#stretch();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * The liquid stretch: the thumb's trailing edge stays put while its leading
   * edge runs ahead, then it settles with a small overshoot. Skipped when the
   * user asks for reduced motion.
   */
  #stretch(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const thumb = this.thumb;
    const base = this.button;
    if (!thumb || !base || typeof thumb.animate !== 'function') return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    // Moving toward the end (turning on): anchor the start edge, and the other
    // way round when turning off.
    const toEnd = this.checked !== rtl;
    thumb.style.transformOrigin = toEnd ? 'left center' : 'right center';
    const duration = this.#duration();
    thumb.getAnimations().forEach((a) => {
      if (a instanceof CSSTransition) return;
      a.cancel();
    });
    thumb.animate(
      [
        { scale: '1 1', offset: 0 },
        { scale: '1.55 0.82', offset: 0.36, easing: 'ease-in-out' },
        { scale: '0.94 1.07', offset: 0.7, easing: 'ease-in-out' },
        { scale: '1 1', offset: 1 },
      ],
      { duration },
    );
    base.toggleAttribute('data-moving', true);
    window.setTimeout(() => base.removeAttribute('data-moving'), duration);
  }

  #duration(): number {
    const raw = getComputedStyle(this)
      .getPropertyValue('--prism-switch-duration')
      .trim();
    const n = parseFloat(raw);
    if (!raw || Number.isNaN(n)) return 240;
    return raw.endsWith('ms') ? n : n * 1000;
  }

  override render() {
    return html`<div part="container">
      <button
        part="base"
        id="control"
        type="button"
        role="switch"
        aria-checked=${this.checked ? 'true' : 'false'}
        aria-labelledby="label"
        ?disabled=${this.isDisabled}
        @click=${this.#toggle}
      >
        <span part="wash" aria-hidden="true"></span>
        <span part="thumb" aria-hidden="true"></span>
      </button>
      <label
        part="label"
        id="label"
        for="control"
        class=${this.hideLabel ? 'visually-hidden' : ''}
        >${this.label}<slot></slot
      ></label>
    </div>`;
  }
}
