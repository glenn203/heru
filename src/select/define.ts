import '../option/define.js';
import { PrismSelect } from './select.js';

if (!customElements.get('prism-select'))
  customElements.define('prism-select', PrismSelect);

declare global {
  interface HTMLElementTagNameMap {
    'prism-select': PrismSelect;
  }
}
