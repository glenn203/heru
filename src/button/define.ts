import { PrismButton } from './button.js';

if (!customElements.get('prism-button'))
  customElements.define('prism-button', PrismButton);

declare global {
  interface HTMLElementTagNameMap {
    'prism-button': PrismButton;
  }
}
