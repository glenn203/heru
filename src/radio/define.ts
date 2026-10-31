import { PrismRadio } from './radio.js';
import { PrismRadioGroup } from './radio-group.js';

if (!customElements.get('prism-radio'))
  customElements.define('prism-radio', PrismRadio);
if (!customElements.get('prism-radio-group'))
  customElements.define('prism-radio-group', PrismRadioGroup);

declare global {
  interface HTMLElementTagNameMap {
    'prism-radio': PrismRadio;
    'prism-radio-group': PrismRadioGroup;
  }
}
