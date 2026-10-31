import { LitElement, css, html, svg } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { canAnimate } from '../internal/choice-motion.js';
import {
  CHECK_OFF_TUNE,
  CHECK_ON_TUNE,
  checkLook,
  type CheckPose,
} from '../internal/field-motion.js';
import { uniqueId } from '../internal/ids.js';
import { SpringMotion } from '../internal/spring-motion.js';
import { stateLayer } from '../internal/state-layer.js';

/**
 * One choice inside `prism-select`. Light-DOM child, so the select's trigger
 * can point `aria-activedescendant` at it. NAME PENDING.
 *
 * @tag prism-option
 * @slot - The option label.
 * @csspart base - The row.
 * @csspart check - Selected indicator (a check mark that draws in and out).
 * @cssstate selected - This option is the select's value.
 * @cssstate active - Keyboard/pointer highlighted.
 * @cssstate disabled - Not selectable; skipped by arrow keys.
 */
export class PrismOption extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
        cursor: default;
      }
      :host([hidden]) {
        display: none;
      }
      [part='base'] {
        display: flex;
        align-items: center;
        gap: var(--prism-space-2, 0.5rem);
      }
      [part='check'] {
        display: grid;
        place-items: center;
        inline-size: 1em;
        block-size: 1em;
      }
      [part='check'] svg {
        inline-size: 100%;
        block-size: 100%;
        overflow: visible;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      [part='mark'] {
        stroke-dasharray: 1 1;
      }
    `,
    stateLayer("[part='base']"),
  ];

  /** Submitted value. Falls back to the text content. */
  @property() value = '';
  /** Initial selection (like native). */
  @property({ type: Boolean, reflect: true }) selected = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  /** Display label override; defaults to the text content. */
  @property() label = '';

  readonly #internals = this.attachInternals();
  #selected = false;
  readonly #check = new SpringMotion<'c', 'mark' | 'box'>(
    ['c'],
    {
      mark: { el: () => this.renderRoot?.querySelector('[part="mark"]') },
      box: { el: () => this.renderRoot?.querySelector('[part="check"] svg') },
    },
    (pose) => checkLook(pose),
  );

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.id) this.id = uniqueId('prism-option');
    // Host attributes (not only ElementInternals) so every AT and test tool sees them.
    this.setAttribute('role', 'option');
  }

  get resolvedValue(): string {
    return this.getAttribute('value') ?? this.value ?? this.text;
  }
  get text(): string {
    return this.label || (this.textContent ?? '').trim();
  }

  /** @internal set by the select. */
  setChoiceState(selected: boolean, active: boolean): void {
    const s = this.#internals.states;
    this.#moveCheck(selected);
    if (selected) s.add('selected');
    else s.delete('selected');
    if (active) s.add('active');
    else s.delete('active');
    this.setAttribute('aria-selected', String(selected));
  }

  /** Draws the check in or out on springs; never on first paint or while hidden. */
  #moveCheck(selected: boolean): void {
    if (selected === this.#selected && this.#check.target) return;
    this.#selected = selected;
    const to: CheckPose = { c: selected ? 1 : 0 };
    const svgEl = this.renderRoot?.querySelector('[part="check"] svg');
    if (
      !this.#check.target ||
      !canAnimate(this, svgEl ?? null) ||
      !this.checkVisibility?.()
    )
      this.#check.snap(to);
    else this.#check.go(to, () => (selected ? CHECK_ON_TUNE : CHECK_OFF_TUNE));
    this.requestUpdate();
  }

  override firstUpdated(): void {
    if (!this.#check.target) this.#check.snap({ c: this.#selected ? 1 : 0 });
  }

  override updated(): void {
    this.toggleAttribute('aria-disabled', this.disabled);
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    if (this.disabled) this.#internals.states.add('disabled');
    else this.#internals.states.delete('disabled');
  }

  override render() {
    const { mark, box } = checkLook({ c: this.#selected ? 1 : 0 });
    return html`<div part="base">
      <span part="check" aria-hidden="true"
        ><svg
          viewBox="0 0 16 16"
          style=${styleMap({ transform: box.transform })}
        >
          ${svg`<path
            part="mark"
            pathLength="1"
            d="M3.5 8.5 6.6 11.6 12.5 4.6"
            style=${styleMap({ 'stroke-dashoffset': mark.strokeDashoffset, opacity: mark.opacity })}
          />`}
        </svg></span
      >
      <slot></slot>
    </div>`;
  }
}
