import { PrismPasswordInput } from './password-input.js';

if (!customElements.get('prism-password-input'))
  customElements.define('prism-password-input', PrismPasswordInput);

declare global {
  interface HTMLElementTagNameMap {
    'prism-password-input': PrismPasswordInput;
  }
}
