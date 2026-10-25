import { HeruPasswordInput } from './password-input.js';

if (!customElements.get('heru-password-input'))
  customElements.define('heru-password-input', HeruPasswordInput);

declare global {
  interface HTMLElementTagNameMap {
    'heru-password-input': HeruPasswordInput;
  }
}
