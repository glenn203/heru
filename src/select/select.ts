import { LitElement, css, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { canAnimate } from '../internal/choice-motion.js';
import { FormAssociated } from '../internal/form-associated.js';
import { uniqueId } from '../internal/ids.js';
import {
  controlBox,
  controlSize,
  textRole,
} from '../internal/control-styles.js';
import {
  fieldPartsStyles,
  renderDescription,
  renderError,
  renderLabel,
  syncFieldA11y,
} from '../internal/field-parts.js';
import { FieldValidityController } from '../internal/field-validity.js';
import {
  CLOSE_TUNE,
  HIGHLIGHT_FADE_TUNE,
  HIGHLIGHT_TUNE,
  NUDGE_TUNE,
  OPEN_TUNE,
  highlightLook,
  nudgeLook,
  popupLook,
  type HighlightPose,
  type PopupPose,
} from '../internal/field-motion.js';
import { iconChevronDown } from '../internal/icons.js';
import { SpringMotion } from '../internal/spring-motion.js';
import type { PrismOption } from '../option/option.js';

const isOption = (el: Element): el is PrismOption =>
  el.localName === 'prism-option';

/**
 * A headless single-value select (APG select-only combobox). Focus stays on
 * the trigger; the active option is exposed with aria-activedescendant via
 * element reflection to the light-DOM `prism-option` children.
 *
 * @tag prism-select
 * @slot - `prism-option` elements.
 * @slot description - Helper text. Replaced by the error while invalid.
 * @slot error - Error text, shown in the attached status box when invalid.
 * @csspart label - The label.
 * @csspart field - Wrapper around trigger, listbox and attached error.
 * @csspart anchor - Wrapper around trigger and listbox only.
 * @csspart trigger - The combobox (focus target).
 * @csspart value - Selected label or placeholder.
 * @csspart indicator - Chevron; turns over while open.
 * @csspart listbox - The popup list. It grows out of the trigger on springs.
 * @csspart highlight - The marker behind the active option; it slides.
 * @csspart description - Helper text wrapper.
 * @csspart error - Attached error status box.
 * @cssstate open - The listbox is shown.
 * @cssstate invalid - Fails validation (after interaction or submit).
 * @cssstate disabled - Disabled.
 * @cssstate placeholder - No value selected.
 * @fires input - User picked a different option.
 * @fires change - User picked a different option.
 * @fires toggle - Listbox opened or closed (NAME PENDING).
 */
export class PrismSelect extends FormAssociated(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    controlSize,
    fieldPartsStyles,
    css`
      [part='field'] {
        position: relative;
      }
      /* Containing block for the listbox: wraps trigger + listbox only. No
         z-index, so trigger (2) / listbox (1) / error (auto) still stack in
         the same context. */
      .anchor {
        position: relative;
      }
      /* While open the menu covers this area: hide the error like the
         description (space kept, aria-describedby still resolves). */
      :host([open]) [part='error'] {
        visibility: hidden;
      }
      [part='trigger'] {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: var(--prism-space-2, 0.5rem);
        inline-size: 100%;
        cursor: default;
        user-select: none;
        ${controlBox}
        ${textRole('body')}
      }
      [part='value'] {
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      /* Helper text hides while the menu is open; visibility keeps its
         layout space (nothing below jumps) and aria-describedby still
         resolves hidden text. No transition, so nothing to reduce. */
      :host([open]) [part='description'] {
        visibility: hidden;
      }
      [part='indicator'] {
        display: inline-grid;
        place-items: center;
      }
      [part='listbox'] {
        position: absolute;
        transform-origin: 50% 0;
        /* Sits UNDER the trigger (trigger z-index 2): starts 3px beneath it,
         * inset 6px each side. In-page, not top layer, so it can tuck. */
        z-index: 1;
        inset-inline: calc(var(--prism-space-1, 0.25rem) * 1.5);
        inset-block-start: calc(100% - 3px);
        box-sizing: border-box;
        max-block-size: 18rem;
        overflow: auto;
        ${textRole('body')}
      }
      [part='listbox'][hidden] {
        display: none;
      }
      /* Closing keeps the list on screen while it shrinks away: no input. */
      :host(:not([open])) [part='listbox'] {
        pointer-events: none;
      }
      /* The active option's marker. It sits over the options (a translucent
         tint, so text stays readable) and moves by transform only. */
      [part='highlight'] {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        z-index: 1;
        opacity: 0;
        pointer-events: none;
      }
    `,
  ];

  @property({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property() label = '';
  @property() value = '';
  @property() placeholder = '';
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean, reflect: true }) open = false;

  @query('[part="trigger"]') private readonly trigger!: HTMLElement;
  @state() private activeIndex = -1;
  /** The list is on screen: open, or still shrinking away after a close. */
  @state() private shown = false;

  readonly #validity = new FieldValidityController(this);
  readonly #id = uniqueId('prism-select');
  #defaultValue: string | null = null;
  #typeahead = '';
  #typeaheadTimer?: ReturnType<typeof setTimeout>;
  #wasOpen = false;
  #wasInvalid = false;
  #painted = false;

  readonly #popup = new SpringMotion<'p', 'listbox' | 'indicator'>(
    ['p'],
    {
      listbox: { el: () => this.renderRoot?.querySelector('[part="listbox"]') },
      indicator: {
        el: () => this.renderRoot?.querySelector('[part="indicator"]'),
      },
    },
    popupLook,
  );
  readonly #highlight = new SpringMotion<'y' | 'o', 'marker'>(
    ['y', 'o'],
    {
      marker: {
        el: () => this.renderRoot?.querySelector('[part="highlight"]'),
      },
    },
    (pose) => ({ marker: highlightLook(pose) }),
  );
  readonly #nudge = new SpringMotion<'n', 'anchor'>(
    ['n'],
    { anchor: { el: () => this.renderRoot?.querySelector('[part="anchor"]') } },
    (pose) => ({ anchor: { transform: nudgeLook(pose) } }),
  );

  get options(): PrismOption[] {
    return [...this.children].filter(isOption);
  }
  get selectedOption(): PrismOption | null {
    return this.options.find((o) => o.resolvedValue === this.value) ?? null;
  }
  get validity(): ValidityState {
    return this.internals.validity;
  }
  get validationMessage(): string {
    return this.internals.validationMessage;
  }
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }
  reportValidity(): boolean {
    this.#validity.touch();
    return this.internals.reportValidity();
  }
  override focus(options?: FocusOptions): void {
    this.trigger?.focus(options);
  }
  /** Mirrors native `showPicker()`. NAME PENDING. */
  showPicker(): void {
    this.#setOpen(true);
  }
  hidePicker(): void {
    this.#setOpen(false);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue = this.getAttribute('value');
    document.addEventListener('pointerdown', this.#onDocPointer);
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.#onDocPointer);
  }

  #initialValue(): string {
    if (this.#defaultValue !== null) return this.#defaultValue;
    return this.options.find((o) => o.selected)?.resolvedValue ?? '';
  }

  override firstUpdated(): void {
    if (this.#defaultValue === null) this.value = this.#initialValue();
    this.#popup.snap({ p: this.open ? 1 : 0 });
    this.#nudge.snap({ n: 0 });
    requestAnimationFrame(() => (this.#painted = true));
  }

  formResetCallback(): void {
    this.value = this.#initialValue();
    this.#validity.reset();
    this.#setOpen(false);
  }
  formStateRestoreCallback(s: string | File | FormData | null): void {
    if (
      typeof s === 'string' &&
      this.options.some((o) => o.resolvedValue === s)
    )
      this.value = s;
  }
  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    this.internals.setFormValue(
      this.isDisabled ? null : this.value,
      this.value,
    );
    if (this.isDisabled && this.open) this.open = false;
    if (this.open) this.shown = true;
    // No motion to wait for: closing is instant.
    else if (this.shown && !this.#canMove()) this.shown = false;
  }

  #canMove(): boolean {
    return (
      this.#painted &&
      canAnimate(
        this,
        this.renderRoot?.querySelector('[part="listbox"]') ?? null,
      )
    );
  }

  override updated(): void {
    const missing = this.required && !this.isDisabled && this.value === '';
    if (missing)
      this.internals.setValidity(
        { valueMissing: true },
        'Please select an item in the list.',
        this.trigger,
      );
    else this.internals.setValidity({});
    const invalid = this.#validity.sync();
    // Error replaces helper text: describe by the error only while invalid.
    syncFieldA11y(this.renderRoot, this.trigger, this.#id, invalid, {
      hideDescriptionWhenInvalid: true,
    });
    this.renderRoot
      .querySelector('[part="description"]')
      ?.toggleAttribute('hidden', invalid);
    this.setState('open', this.open);
    this.setState('placeholder', this.value === '');
    const opts = this.options;
    const active = this.open ? (opts[this.activeIndex] ?? null) : null;
    opts.forEach((o) =>
      o.setChoiceState(o.resolvedValue === this.value, o === active),
    );
    (
      this.trigger as HTMLElement & {
        ariaActiveDescendantElement: Element | null;
      }
    ).ariaActiveDescendantElement = active;
    active?.scrollIntoView?.({ block: 'nearest' });
    this.#movePopup();
    this.#moveHighlight(active);
    if (invalid && !this.#wasInvalid && this.#canMove())
      this.#nudge.go({ n: 0 }, () => NUDGE_TUNE);
    this.#wasInvalid = invalid;
    this.#wasOpen = this.open;
  }

  /** Grows the list out of the trigger, or shrinks it back; from where it is. */
  #movePopup(): void {
    const to: PopupPose = { p: this.open ? 1 : 0 };
    if (!this.#canMove()) {
      this.#popup.snap(to);
      return;
    }
    this.#popup.go(
      to,
      () => (this.open ? OPEN_TUNE : CLOSE_TUNE),
      () => {
        if (this.open) return;
        // Hide in the same frame the move ends, then let Lit catch up.
        this.renderRoot
          .querySelector('[part="listbox"]')
          ?.setAttribute('hidden', '');
        this.shown = false;
      },
    );
  }

  /** The marker slides to the active option; it appears in place on open. */
  #moveHighlight(active: PrismOption | null): void {
    const marker =
      this.renderRoot.querySelector<HTMLElement>('[part="highlight"]');
    const list = this.renderRoot.querySelector<HTMLElement>('[part="listbox"]');
    if (!marker || !list) return;
    let to: HighlightPose = { y: this.#highlight.target?.y ?? 0, o: 0 };
    if (active && this.open) {
      // Rects include the list's own grow-in scale: undo it to get list px.
      const lb = list.getBoundingClientRect();
      const sx = lb.width / list.offsetWidth || 1;
      const sy = lb.height / list.offsetHeight || 1;
      const r = active.getBoundingClientRect();
      const y = (r.top - lb.top) / sy - list.clientTop + list.scrollTop;
      marker.style.left = `${(r.left - lb.left) / sx - list.clientLeft}px`;
      marker.style.width = `${r.width / sx}px`;
      marker.style.height = `${r.height / sy}px`;
      to = { y, o: 1 };
    }
    const opened = this.open && !this.#wasOpen;
    if (opened || !this.#highlight.target || !this.#canMove()) {
      this.#highlight.snap(to);
    } else {
      // Appearing and fading are plain settles; moving between options is the
      // springy slide.
      const fades = this.#highlight.target.o !== to.o;
      this.#highlight.go(to, (k) =>
        k === 'o' || fades ? HIGHLIGHT_FADE_TUNE : HIGHLIGHT_TUNE,
      );
    }
    // At rest the inline style is the pose; a move plays over it.
    Object.assign(marker.style, highlightLook(to));
  }

  #enabledIndexes(): number[] {
    return this.options.flatMap((o, i) => (o.disabled ? [] : [i]));
  }

  #setOpen(open: boolean, active?: number): void {
    if (open && this.isDisabled) return;
    if (open) {
      const sel = this.options.indexOf(this.selectedOption!);
      this.activeIndex =
        active ?? (sel >= 0 ? sel : (this.#enabledIndexes()[0] ?? -1));
    }
    if (open === this.open) return;
    this.open = open;
    this.dispatchEvent(
      new ToggleEvent('toggle', {
        oldState: open ? 'closed' : 'open',
        newState: open ? 'open' : 'closed',
      }),
    );
  }

  #select(index: number): void {
    const opt = this.options[index];
    if (!opt || opt.disabled) return;
    const changed = opt.resolvedValue !== this.value;
    this.value = opt.resolvedValue;
    this.#validity.touch();
    if (changed) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  #move(delta: number): void {
    const en = this.#enabledIndexes();
    if (!en.length) return;
    const pos = en.indexOf(this.activeIndex);
    if (pos < 0) {
      this.activeIndex = (delta > 0 ? en[0] : en[en.length - 1]) ?? -1;
      return;
    }
    this.activeIndex =
      en[Math.max(0, Math.min(en.length - 1, pos + delta))] ?? -1;
  }

  #typeaheadTo(char: string): void {
    clearTimeout(this.#typeaheadTimer);
    this.#typeaheadTimer = setTimeout(() => (this.#typeahead = ''), 500);
    const same =
      this.#typeahead.length > 0 &&
      [...this.#typeahead].every((c) => c === char);
    this.#typeahead += char;
    const opts = this.options;
    const start = this.open
      ? this.activeIndex
      : opts.indexOf(this.selectedOption!);
    const order = [...opts.keys()].map((i) => (start + 1 + i) % opts.length);
    const query = same ? char : this.#typeahead;
    const hit = order.find(
      (i) =>
        !opts[i]!.disabled && opts[i]!.text.toLowerCase().startsWith(query),
    );
    if (hit !== undefined) {
      if (!this.open) this.#setOpen(true, hit);
      else this.activeIndex = hit;
    }
  }

  #onKeydown(e: KeyboardEvent): void {
    if (this.isDisabled) return;
    const en = this.#enabledIndexes();
    if (!this.open) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case ' ':
          this.#setOpen(true);
          break;
        case 'Home':
          this.#setOpen(true, en[0]);
          break;
        case 'End':
          this.#setOpen(true, en[en.length - 1]);
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            this.#typeaheadTo(e.key.toLowerCase());
            break;
          }
          return;
      }
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        this.#move(1);
        break;
      case 'ArrowUp':
        if (e.altKey) {
          this.#select(this.activeIndex);
          this.#setOpen(false);
        } else this.#move(-1);
        break;
      case 'Home':
        this.activeIndex = en[0] ?? -1;
        break;
      case 'End':
        this.activeIndex = en[en.length - 1] ?? -1;
        break;
      case 'PageDown':
        this.#move(10);
        break;
      case 'PageUp':
        this.#move(-10);
        break;
      case 'Enter':
      case ' ':
        if (e.key === ' ' && this.#typeahead) {
          this.#typeaheadTo(' ');
          break;
        }
        this.#select(this.activeIndex);
        this.#setOpen(false);
        break;
      case 'Escape':
        this.#setOpen(false);
        break;
      case 'Tab':
        this.#select(this.activeIndex);
        this.#setOpen(false);
        return; // let focus move
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          this.#typeaheadTo(e.key.toLowerCase());
          break;
        }
        return;
    }
    e.preventDefault();
  }

  #onDocPointer = (e: PointerEvent): void => {
    if (this.open && !e.composedPath().includes(this)) this.#setOpen(false);
  };

  #onListPointer(e: Event, commit: boolean): void {
    const opt = (e.target as Element).closest('prism-option');
    if (!opt || opt.disabled) return;
    const i = this.options.indexOf(opt);
    if (commit) {
      this.#select(i);
      this.#setOpen(false);
      this.trigger.focus();
    } else this.activeIndex = i;
  }

  override render() {
    const id = this.#id;
    const sel = this.selectedOption;
    return html`
      ${renderLabel(id, this.label)}
      <div part="field">
        <!-- Anchor: the listbox positions against the trigger only, so the
             error box (a later sibling in field) can't push it down. -->
        <div class="anchor" part="anchor">
          <div
            part="trigger"
            role="combobox"
            tabindex=${this.isDisabled ? '-1' : '0'}
            aria-labelledby="${id}-label"
            aria-haspopup="listbox"
            aria-expanded=${String(this.open)}
            aria-controls="${id}-listbox"
            aria-required=${String(this.required)}
            aria-disabled=${String(this.isDisabled)}
            @keydown=${this.#onKeydown}
            @click=${() => this.#setOpen(!this.open)}
            @blur=${() => {
              this.#validity.touch();
              this.#setOpen(false);
            }}
          >
            <span part="value">${sel ? sel.text : this.placeholder}</span>
            <span
              part="indicator"
              aria-hidden="true"
              style=${styleMap({
                transform: popupLook({ p: this.open ? 1 : 0 }).indicator
                  .transform,
              })}
              >${iconChevronDown()}</span
            >
          </div>
          <div
            part="listbox"
            id="${id}-listbox"
            role="listbox"
            aria-labelledby="${id}-label"
            ?hidden=${!this.shown}
            ?inert=${!this.open}
            @pointerdown=${(e: Event) => e.preventDefault()}
            @pointerup=${(e: Event) => this.#onListPointer(e, true)}
            @pointerover=${(e: Event) => this.#onListPointer(e, false)}
          >
            <div part="highlight" aria-hidden="true"></div>
            <slot @slotchange=${() => this.requestUpdate()}></slot>
          </div>
        </div>
        ${renderError(id)}
      </div>
      ${renderDescription(id)}
    `;
  }
}
