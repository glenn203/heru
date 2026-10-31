import { LitElement, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  POP_ON,
  canAnimate,
  clamp,
  num,
  prefersReducedMotion,
  squish,
  squishTune,
} from '../internal/choice-motion.js';
import { choiceStyles } from '../internal/choice-styles.js';
import { uniqueId } from '../internal/ids.js';
import { Press } from '../internal/press.js';
import {
  SpringMotion,
  type Pose,
  type Tune,
} from '../internal/spring-motion.js';
import { stateLayer } from '../internal/state-layer.js';
import { visuallyHidden } from '../internal/visually-hidden.js';

/*
 * Motion model. A pose of three numbers on springs, drawn by one pure
 * function (the same clock for all layers):
 *   q  squish: 0 at rest, 1 held down.
 *   r  ring: 0 plain edge, 1 accent ring.
 *   d  dot: its scale; past 1 is the overshoot as it springs in.
 * The dot that is leaving shrinks on a critical spring (no bounce), while the
 * one arriving grows with a gentle overshoot, started in the same frame.
 */
type Key = 'q' | 'r' | 'd';
type Layer = 'box' | 'ring' | 'dot';

const DOT_IN: Tune = { w: 26, z: 0.55 };
const DOT_OUT: Tune = { w: 30, z: 1 };
const RING: Tune = { w: 30, z: 1 };

function draw(pose: Pose<Key>): Record<Layer, Keyframe> {
  const dot = Math.max(0, pose.d);
  return {
    box: squish(pose.q),
    ring: { opacity: num(clamp(pose.r)) },
    dot: {
      transform: `scale(${num(dot)})`,
      opacity: num(clamp(dot * 4)),
    },
  };
}

/**
 * One choice in a radio group: `<prism-radio value="weekly" label="Weekly">`
 * inside a `<prism-radio-group>`, which owns the selected value, the form
 * value and the arrow keys. A radio on its own selects nothing.
 *
 * - A native `<button role="radio" aria-checked>` in shadow DOM, named by
 *   `label` (and any default-slot content). Put help text in the
 *   `description` slot. Space selects it. Only the selected radio (or the
 *   first, if none is) is in the tab order; the group's arrow keys move
 *   between the rest.
 * - `checked` is set by the group from its `value`. Set the group's `value`,
 *   not this.
 * - Motion: pressing squishes the dot's box; the dot springs in with a
 *   gentle overshoot as the ring turns to the accent, about 400ms. The radio
 *   that was selected shrinks its dot out at the same moment, and an arrow-key
 *   move animates the same way. A tap during a move turns it round from where
 *   it is, with its speed. Only transform and opacity move. Nothing animates
 *   on first paint; a change from code moves the same way as a click. Under
 *   `prefers-reduced-motion: reduce` the state changes at once and the colour
 *   fades over 120ms.
 * - State is never colour alone: the dot is drawn inside the ring.
 * - The hover, selected and pressed fills come from the shared state layer.
 *
 * @tag prism-radio
 * @slot - Extra label content, shown after `label`.
 * @slot description - Help text under the label.
 * @csspart container - Wraps the control and its text.
 * @csspart base - The native button; the 24px minimum hit area.
 * @csspart box - The drawn circle (squishes while pressed).
 * @csspart edge - The resting border.
 * @csspart ring - The accent border, shown while selected.
 * @csspart dot - The selected dot.
 * @csspart text - The label column.
 * @csspart label - The visible label.
 * @csspart description - The help text.
 * @cssstate checked - This radio is selected.
 * @cssstate selected - This radio is selected.
 * @cssstate disabled - This radio is disabled.
 * @fires prism-radio-select - Bubbles when the user picks this radio; the group listens for it.
 */
export class PrismRadio extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    visuallyHidden,
    choiceStyles,
    css`
      [part='ring'] {
        opacity: 0;
      }
      [part='dot'] {
        position: absolute;
        inset: 25%;
        border-radius: 50%;
        transform: scale(0);
        opacity: 0;
      }
    `,
    stateLayer("[part='base']"),
    // After the state layer: its overlay is drawn by the box, above the ring.
    css`
      [part='base'] {
        background-image: none;
      }
    `,
  ];

  /** Selected. Set by the group from its `value`. Reflected. */
  @property({ type: Boolean, reflect: true }) checked = false;

  /** Value the group takes when this radio is picked. */
  @property() value = '';

  /** Required. The choice's name: "Weekly". */
  @property() label = '';

  /** Disables this radio. Reflected. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Size: sm, md or lg. */
  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  /** Set by the group: disabled by the group or a fieldset. */
  @property({ type: Boolean, attribute: false }) groupDisabled = false;

  /** Set by the group: whether this radio is the one in the tab order. */
  @property({ type: Boolean, attribute: false }) tabStop = true;

  @query('[part="base"]') private readonly base!: HTMLButtonElement;

  readonly #internals = this.attachInternals();
  readonly #id = uniqueId('prism-radio');
  readonly #press = new Press(
    this,
    () => !this.isDisabled && !prefersReducedMotion(),
    () => this.#retarget(),
  );
  readonly #motion = new SpringMotion<Key, Layer>(
    ['q', 'r', 'd'],
    {
      box: { el: () => this.#part('box') },
      ring: { el: () => this.#part('ring') },
      dot: { el: () => this.#part('dot') },
    },
    draw,
  );
  /** False until the first render is on screen: nothing animates before it. */
  #ready = false;

  get isDisabled(): boolean {
    return this.disabled || this.groupDisabled;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.#ready) this.#motion.snap(this.#pose());
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#motion.stop();
    this.#press.clear();
  }

  override focus(options?: FocusOptions): void {
    this.base?.focus(options);
  }

  /** Picks this radio as if the user had pressed it. */
  override click(): void {
    this.base?.click();
  }

  override willUpdate(): void {
    const states = this.#internals.states;
    for (const [name, on] of [
      ['checked', this.checked],
      ['selected', this.checked],
      ['disabled', this.isDisabled],
    ] as const)
      if (on) states.add(name);
      else states.delete(name);
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    if (!this.label && !this.textContent?.trim())
      console.error(
        '[prism-radio] `label` is required: a radio needs an accessible name.',
        this,
      );
    if (!this.#ready) {
      // The first render lands at rest, with no move.
      this.#ready = true;
      this.#motion.snap(this.#pose());
    } else if (changed.has('checked')) {
      // Any change of state, by the user or by code, moves the same way.
      this.#retarget(this.checked ? POP_ON : 0);
    }
  }

  #pick = (): void => {
    if (this.isDisabled || this.checked) return;
    this.dispatchEvent(
      new Event('prism-radio-select', { bubbles: true, composed: true }),
    );
  };

  #part(name: string): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(`[part="${name}"]`);
  }

  /** The pose for the current state, held down or not. */
  #pose(): Pose<Key> {
    return {
      q: this.#press.held ? 1 : 0,
      r: this.checked ? 1 : 0,
      d: this.checked ? 1 : 0,
    };
  }

  /** Moves to the current pose; `pop` is the extra push when it is picked. */
  #retarget(pop = 0): void {
    const pose = this.#pose();
    if (!this.#ready || !canAnimate(this, this.#part('box')))
      return this.#motion.snap(pose);
    this.#motion.go(pose, (key) => {
      if (key === 'q') return squishTune(pose.q > 0, pop);
      return key === 'r' ? RING : pose.d ? DOT_IN : DOT_OUT;
    });
  }

  override render() {
    const rest = draw(this.#pose());
    return html`<div part="container">
      <button
        part="base"
        id="control"
        type="button"
        role="radio"
        tabindex=${this.tabStop ? '0' : '-1'}
        aria-checked=${this.checked ? 'true' : 'false'}
        aria-labelledby="${this.#id}-label"
        aria-describedby="${this.#id}-description"
        ?disabled=${this.isDisabled}
        @click=${this.#pick}
        @keydown=${this.#press.keyDown}
        @keyup=${this.#press.up}
        @blur=${this.#press.up}
        @pointerdown=${this.#press.down}
        @pointerup=${this.#press.up}
        @pointercancel=${this.#press.up}
        @pointerleave=${this.#press.up}
      >
        <span part="box" style=${styleMap(rest.box)}>
          <span part="edge"></span>
          <span part="ring" style=${styleMap(rest.ring)}></span>
          <span part="dot" style=${styleMap(rest.dot)}></span>
        </span>
      </button>
      <div part="text">
        <label part="label" id="${this.#id}-label" for="control"
          >${this.label}<slot></slot
        ></label>
        <div part="description" id="${this.#id}-description">
          <slot name="description"></slot>
        </div>
      </div>
    </div>`;
  }
}
