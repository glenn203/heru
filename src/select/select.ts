import { LitElement, css, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { FormAssociated } from '../internal/form-associated.js';
import { uniqueId } from '../internal/ids.js';
import {
  controlBox,
  controlSize,
  textRole,
} from '../internal/control-styles.js';
import {
  fieldChromeStyles,
  renderDescription,
  renderError,
  renderLabel,
  syncFieldA11y,
} from '../internal/field-chrome.js';
import { FieldValidityController } from '../internal/field-validity.js';
import type { HeruOption } from '../option/option.js';

const isOption = (el: Element): el is HeruOption =>
  el.localName === 'heru-option';

/**
 * A headless single-value select (APG select-only combobox). Focus stays on
 * the trigger; the active option is exposed with aria-activedescendant via
 * element reflection to the light-DOM `heru-option` children.
 *
 * @tag heru-select
 * @slot - `heru-option` elements.
 * @slot description - Helper text. Replaced by the error while invalid.
 * @slot error - Error text, shown in the attached status box when invalid.
 * @csspart label - The label.
 * @csspart field - Wrapper around trigger, listbox and attached error.
 * @csspart trigger - The combobox (focus target).
 * @csspart value - Selected label or placeholder.
 * @csspart indicator - Chevron.
 * @csspart listbox - The popup list.
 * @csspart description - Helper text wrapper.
 * @csspart error - Attached error status box.
 * @cssstate open - The listbox is shown.
 * @cssstate invalid - Fails validation (after interaction or submit).
 * @cssstate disabled - Disabled.
 * @cssstate placeholder - No value selected.
 * @fires input - User picked a different option.
 * @fires change - User picked a different option.
 * @fires toggle - Listbox opened or closed (NAME PENDING — Technical Writer).
 */
export class HeruSelect extends FormAssociated(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    controlSize,
    fieldChromeStyles,
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
        gap: var(--heru-space-2, 0.5rem);
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
      [part='listbox'] {
        position: absolute;
        /* Sits UNDER the trigger (trigger z-index 2): starts 3px beneath it,
         * inset 6px each side. In-page, not top layer, so it can tuck. */
        z-index: 1;
        inset-inline: calc(var(--heru-space-1, 0.25rem) * 1.5);
        inset-block-start: calc(100% - 3px);
        box-sizing: border-box;
        max-block-size: 18rem;
        overflow: auto;
        ${textRole('body')}
      }
      [part='listbox'][hidden] {
        display: none;
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

  readonly #validity = new FieldValidityController(this);
  readonly #id = uniqueId('heru-select');
  #defaultValue: string | null = null;
  #typeahead = '';
  #typeaheadTimer?: ReturnType<typeof setTimeout>;

  get options(): HeruOption[] {
    return [...this.children].filter(isOption);
  }
  get selectedOption(): HeruOption | null {
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
  /** Mirrors native `showPicker()`. NAME PENDING — Technical Writer. */
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
    const opt = (e.target as Element).closest('heru-option');
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
        <div class="anchor">
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
            <span part="indicator" aria-hidden="true">▾</span>
          </div>
          <div
            part="listbox"
            id="${id}-listbox"
            role="listbox"
            aria-labelledby="${id}-label"
            ?hidden=${!this.open}
            @pointerdown=${(e: Event) => e.preventDefault()}
            @pointerup=${(e: Event) => this.#onListPointer(e, true)}
            @pointerover=${(e: Event) => this.#onListPointer(e, false)}
          >
            <slot @slotchange=${() => this.requestUpdate()}></slot>
          </div>
        </div>
        ${renderError(id)}
      </div>
      ${renderDescription(id)}
    `;
  }
}
