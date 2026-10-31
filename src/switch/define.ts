import { PrismSwitch } from './switch.js';

if (!customElements.get('prism-switch'))
  customElements.define('prism-switch', PrismSwitch);

declare global {
  interface HTMLElementTagNameMap {
    'prism-switch': PrismSwitch;
  }
}
