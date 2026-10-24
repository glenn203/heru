import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { FormAssociatedElement } from './form-associated.js';

type Host = ReactiveControllerHost & HTMLElement & FormAssociatedElement;

/**
 * Private: tracks "touched" (blur, change, invalid event, reportValidity) and
 * exposes whether the field should show as invalid. Sets :state(invalid).
 */
export class FieldValidityController implements ReactiveController {
  touched = false;
  constructor(private readonly host: Host) {
    host.addController(this);
    host.addEventListener('invalid', () => this.touch());
  }
  touch(): void {
    if (this.touched) return;
    this.touched = true;
    this.host.requestUpdate();
  }
  reset(): void {
    this.touched = false;
    this.host.requestUpdate();
  }
  /** Call after setValidity; returns and applies the visible invalid state. */
  sync(): boolean {
    const invalid = this.touched && !this.host.internals.validity.valid;
    this.host.setState('invalid', invalid);
    return invalid;
  }
  hostConnected(): void {}
}
