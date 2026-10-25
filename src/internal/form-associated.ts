import type { LitElement } from 'lit';
import { property } from 'lit/decorators.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

/** Public surface every form-associated Prism element shares. */
export interface FormAssociatedElement {
  readonly internals: ElementInternals;
  disabled: boolean;
  name: string;
  readonly form: HTMLFormElement | null;
  /** True when the element or an ancestor fieldset is disabled. */
  readonly isDisabled: boolean;
  setState(state: string, on: boolean): void;
}

/**
 * Private mixin: attaches ElementInternals, tracks `disabled` (own and
 * inherited from a fieldset) and mirrors it to `:state(disabled)`.
 * Not exported from the package.
 */
export const FormAssociated = <T extends Constructor<LitElement>>(Base: T) => {
  class FormAssociatedClass extends Base implements FormAssociatedElement {
    static formAssociated = true;

    readonly internals: ElementInternals = this.attachInternals();

    /** Disables the control. Reflected. */
    @property({ type: Boolean, reflect: true }) disabled = false;

    /** Name used when the owning form is submitted. */
    @property({ reflect: true }) name = '';

    #fieldsetDisabled = false;

    get form(): HTMLFormElement | null {
      return this.internals.form;
    }

    get isDisabled(): boolean {
      return this.disabled || this.#fieldsetDisabled;
    }

    formDisabledCallback(disabled: boolean): void {
      this.#fieldsetDisabled = disabled;
      this.requestUpdate();
    }

    setState(state: string, on: boolean): void {
      if (on) this.internals.states.add(state);
      else this.internals.states.delete(state);
    }

    override willUpdate(changed: Map<PropertyKey, unknown>): void {
      super.willUpdate(changed);
      this.setState('disabled', this.isDisabled);
      this.internals.ariaDisabled = this.isDisabled ? 'true' : null;
    }
  }
  return FormAssociatedClass as Constructor<FormAssociatedElement> &
    T & { formAssociated: boolean };
};
