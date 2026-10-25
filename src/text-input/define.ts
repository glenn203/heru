import { PrismTextInput } from './text-input.js';

if (!customElements.get('prism-text-input'))
  customElements.define('prism-text-input', PrismTextInput);

declare global {
  interface HTMLElementTagNameMap {
    'prism-text-input': PrismTextInput;
  }
}
