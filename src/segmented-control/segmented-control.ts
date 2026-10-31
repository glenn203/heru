import { LitElement, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { canAnimate } from '../internal/choice-motion.js';
import { controlSize } from '../internal/control-styles.js';
import {
  fieldPartsStyles,
  renderDescription,
  renderError,
  syncFieldA11y,
} from '../internal/field-parts.js';
import { FieldValidityController } from '../internal/field-validity.js';
import { FormAssociated } from '../internal/form-associated.js';
import { uniqueId } from '../internal/ids.js';
import { SpringMotion, type Tune } from '../internal/spring-motion.js';
import { visuallyHidden } from '../internal/visually-hidden.js';
import {
  FADE,
  LEAD,
  REF,
  TRAIL,
  indicatorLook,
  type Bounds,
  type IndicatorPose,
} from './indicator-motion.js';
import type { PrismSegment } from './segment.js';

/**
 * A row of mutually exclusive choices that share one sliding indicator, like a
 * set of radio buttons drawn as a switch between views: `<prism-segmented-control
 * label="Range"><prism-segment value="day">Day</prism-segment>…`.
 *
 * - `role="radiogroup"`, named by `label` (`hide-label` keeps it for screen
 *   readers only). Put help text in the `description` slot and the message for
 *   a failed check in the `error` slot.
 * - One tab stop: the picked segment, or the first enabled one. Arrow keys
 *   (Left and Up go back, Right and Down go forward, Left and Right swap in
 *   right-to-left text) move focus to the next enabled segment, wrapping, and
 *   pick it, as radios do. Home and End go to the first and last enabled
 *   segment. Space picks the focused one. Disabled segments are skipped.
 * - `value` is the picked segment's `value` (empty: none, and no indicator).
 *   It is what is submitted under `name`. `required` fails validation while
 *   none is picked. A segment with `checked` in the markup sets the starting
 *   value. Resets to the starting value with the form.
 * - Fires `input` and `change` after each user pick.
 * - Sizes `sm`, `md`, `lg` follow the control heights and density. `full-width`
 *   shares the row equally.
 * - Motion: the indicator slides to the picked segment on two springs (one per
 *   edge) so it stretches on the way, about 300ms, with a small overshoot that
 *   never leaves the track. A new pick during the move turns it round from where
 *   it is. Transform and opacity only. Nothing moves on first paint, on a
 *   resize, or when the width of a segment changes: the indicator just follows.
 *   A change from code moves the same way as a click. Under
 *   `prefers-reduced-motion: reduce` it jumps and the colours change at once.
 *
 * @tag prism-segmented-control
 * @slot - The `prism-segment` choices.
 * @slot description - Help text under the label.
 * @slot error - Message shown while the control is invalid.
 * @csspart group - The radiogroup element.
 * @csspart label - The control's label.
 * @csspart description - The help text.
 * @csspart track - The rounded row that holds the segments.
 * @csspart indicator - The sliding shape under the picked segment.
 * @csspart error - The error message.
 * @cssstate disabled - The control is disabled.
 * @cssstate invalid - Fails validation (after interaction or submit).
 * @fires input - After the user picks a segment.
 * @fires change - After the user picks a segment.
 */
export class PrismSegmentedControl extends FormAssociated(LitElement) {
  static override styles = [
    visuallyHidden,
    fieldPartsStyles,
    controlSize,
    css`
      :host {
        --_pad: var(--prism-segmented-padding, 2px);
      }
      [part='group'] {
        display: grid;
        justify-items: start;
        row-gap: var(--prism-space-1, 0.25rem);
      }
      :host([full-width]) [part='group'] {
        justify-items: stretch;
      }
      [part='track'] {
        position: relative;
        box-sizing: border-box;
        display: inline-flex;
        align-items: stretch;
        block-size: var(--_prism-control-height);
        padding: var(--_pad);
        border: var(--prism-border-width, 1px) solid transparent;
        border-radius: var(--prism-radius-5, 5px);
        max-inline-size: 100%;
      }
      :host([full-width]) [part='track'] {
        display: flex;
      }
      :host([full-width]) ::slotted(prism-segment) {
        flex: 1 1 0;
      }
      [part='indicator'] {
        position: absolute;
        inset-block: var(--_pad);
        left: 0;
        inline-size: ${REF}px;
        transform-origin: 0 50%;
        border-radius: var(--prism-radius-3, 3px);
        pointer-events: none;
        z-index: 0;
      }
      ::slotted(prism-segment) {
        border-radius: var(--prism-radius-3, 3px);
      }
    `,
  ];

  /** The picked segment's `value`; empty when none is picked. */
  @property({ reflect: true }) value = '';

  /** Required. What the choice is: "Range". */
  @property() label = '';

  /** Keeps the label for screen readers only. */
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false;

  /** A pick is required for the form to submit. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** Control height: sm, md or lg. Follows density. */
  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  /** Share the row equally and fill the width. */
  @property({ type: Boolean, reflect: true, attribute: 'full-width' })
  fullWidth = false;

  @query('[part="group"]') private readonly group!: HTMLElement;
  @query('[part="track"]') private readonly track!: HTMLElement;
  @query('[part="indicator"]') private readonly indicator!: HTMLElement;

  readonly #id = uniqueId('prism-segmented-control');
  readonly #validity = new FieldValidityController(this);
  readonly #motion = new SpringMotion<'l' | 'r' | 'o', 'ind'>(
    ['l', 'r', 'o'],
    { ind: { el: () => this.indicator } },
    (pose) => ({ ind: indicatorLook(pose, this.#bounds) }),
  );
  readonly #sizes = new ResizeObserver(() => this.#follow());
  #bounds: Bounds = { min: 0, max: 0 };
  #defaultValue = '';
  #adopted = false;

  get validity(): ValidityState {
    return this.internals.validity;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    this.#validity.touch();
    return this.internals.reportValidity();
  }

  formResetCallback(): void {
    this.value = this.#defaultValue;
    this.#validity.reset();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    this.value = typeof state === 'string' ? state : '';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#sizes.disconnect();
    this.#motion.stop();
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    this.#adoptStartingValue();
    if (changed.has('value'))
      this.internals.setFormValue(this.value || null, this.value);
  }

  override firstUpdated(): void {
    this.#sizes.observe(this.track);
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    if (!this.label)
      console.error(
        '[prism-segmented-control] `label` is required: a group needs an accessible name.',
        this,
      );
    this.internals.setValidity(
      this.required && !this.value ? { valueMissing: true } : {},
      'Pick one of these choices to continue.',
      this.group,
    );
    syncFieldA11y(this.renderRoot, this.group, this.#id, this.#validity.sync());
    this.#syncSegments();
    if (changed.has('value') && changed.get('value') !== undefined)
      this.#slide();
  }

  #segments(): PrismSegment[] {
    return [...this.querySelectorAll<PrismSegment>(':scope > prism-segment')];
  }

  #picked(): PrismSegment | undefined {
    return this.value === ''
      ? undefined
      : this.#segments().find((s) => s.value === this.value);
  }

  /** Pushes the value, the disabled state and the tab stop into the segments. */
  #syncSegments(): void {
    const segments = this.#segments();
    const enabled = segments.filter((s) => !s.disabled && !this.isDisabled);
    const stop = enabled.find((s) => s === this.#picked()) ?? enabled[0];
    for (const s of segments) {
      s.checked = s === this.#picked();
      s.groupDisabled = this.isDisabled;
      s.tabStop = s === stop;
      this.#sizes.observe(s);
    }
  }

  /** A segment marked `checked` in the markup sets the starting value. Runs once. */
  #adoptStartingValue(): void {
    if (this.#adopted) return;
    const segments = this.#segments();
    if (!segments.length) return;
    this.#adopted = true;
    if (!this.value) this.value = segments.find((s) => s.checked)?.value ?? '';
    this.#defaultValue = this.value;
  }

  #onSlotChange = (): void => {
    this.#adoptStartingValue();
    this.#syncSegments();
    this.#follow();
  };

  /** The pose that has the indicator on the picked segment (or hidden). */
  #pose(): IndicatorPose | undefined {
    const seg = this.#picked();
    const track = this.track;
    if (!track) return undefined;
    // Rects are on screen: undo any scale an ancestor has (a pressed card).
    const box = track.getBoundingClientRect();
    const k =
      box.width && track.offsetWidth ? box.width / track.offsetWidth : 1;
    const inner = (n: number) => (n - box.left) / k - track.clientLeft;
    this.#bounds = {
      min: 0,
      max: track.clientWidth,
    };
    if (!seg || !seg.isConnected) {
      const t = this.#motion.target;
      return { l: t?.l ?? 0, r: t?.r ?? 0, o: 0 };
    }
    const r = seg.getBoundingClientRect();
    if (r.width === 0) return undefined;
    return { l: inner(r.left), r: inner(r.right), o: 1 };
  }

  /** Puts the indicator where the stylesheet cannot: the pose it rests at. */
  #rest(): void {
    const t = this.#motion.target;
    if (t) Object.assign(this.indicator.style, indicatorLook(t, this.#bounds));
  }

  /** Layout changed (a resize, a font, a new segment): no move, just follow. */
  #follow(): void {
    const pose = this.#pose();
    if (!pose) return;
    this.#motion.snap(pose);
    this.#rest();
  }

  /** The value changed: slide (or fade) to the new segment. */
  #slide(): void {
    const to = this.#pose();
    if (!to) return;
    const from = this.#motion.target;
    if (!from || !canAnimate(this, this.indicator)) {
      this.#motion.snap(to);
      return this.#rest();
    }
    // From nothing: appear in place. To nothing: fade where it is.
    const appearing = from.o === 0 && to.o === 1;
    if (appearing) this.#motion.snap({ ...to, o: 0 });
    const lead = this.#leadingEdge(from, to);
    this.#motion.go(
      to,
      (key): Tune => (key === 'o' ? FADE : key === lead ? LEAD : TRAIL),
      () => this.#rest(),
    );
  }

  /** The edge that goes first: the right one moving right, the left one moving left. */
  #leadingEdge(from: IndicatorPose, to: IndicatorPose): 'l' | 'r' {
    return to.l + to.r >= from.l + from.r ? 'r' : 'l';
  }

  #pick(segment: PrismSegment): void {
    if (segment.isDisabled || segment.value === this.value) return;
    this.value = segment.value;
    this.#validity.touch();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #onSelect = (event: Event): void => {
    this.#pick(event.target as PrismSegment);
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const segment = (event.target as Element).closest<PrismSegment>(
      'prism-segment',
    );
    if (!segment || event.ctrlKey || event.altKey || event.metaKey) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const enabled = this.#segments().filter((s) => !s.isDisabled);
    const at = enabled.indexOf(segment);
    const step = {
      ArrowDown: 1,
      ArrowUp: -1,
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
    }[event.key];
    const next =
      event.key === 'Home'
        ? enabled[0]
        : event.key === 'End'
          ? enabled.at(-1)
          : step
            ? enabled[(at + step + enabled.length) % enabled.length]
            : undefined;
    if (!next) return;
    event.preventDefault();
    next.focus();
    this.#pick(next);
  };

  #onFocusOut = (event: FocusEvent): void => {
    if (!this.contains(event.relatedTarget as Node | null))
      this.#validity.touch();
  };

  override render() {
    return html`<div
      part="group"
      role="radiogroup"
      aria-labelledby="${this.#id}-label"
      aria-required=${this.required ? 'true' : 'false'}
      @prism-segment-select=${this.#onSelect}
      @keydown=${this.#onKeyDown}
      @focusout=${this.#onFocusOut}
    >
      <span
        part="label"
        id="${this.#id}-label"
        class=${this.hideLabel ? 'visually-hidden' : ''}
        >${this.label}</span
      >
      ${renderDescription(this.#id)}
      <div part="track">
        <div part="indicator" style="opacity: 0"></div>
        <slot @slotchange=${this.#onSlotChange}></slot>
      </div>
      ${renderError(this.#id)}
    </div>`;
  }
}
