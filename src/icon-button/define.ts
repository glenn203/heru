import { PrismIconButton } from './icon-button.js';

if (!customElements.get('prism-icon-button'))
  customElements.define('prism-icon-button', PrismIconButton);

declare global {
  interface HTMLElementTagNameMap {
    'prism-icon-button': PrismIconButton;
  }
}
