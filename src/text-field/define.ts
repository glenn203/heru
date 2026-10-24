import { HeruTextField } from './text-field.js';

if (!customElements.get('heru-text-field'))
  customElements.define('heru-text-field', HeruTextField);

declare global {
  interface HTMLElementTagNameMap {
    'heru-text-field': HeruTextField;
  }
}
