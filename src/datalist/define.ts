import { PrismDatalist } from './datalist.js';
import { PrismDatalistItem } from './datalist-item.js';

if (!customElements.get('prism-datalist'))
  customElements.define('prism-datalist', PrismDatalist);
if (!customElements.get('prism-datalist-item'))
  customElements.define('prism-datalist-item', PrismDatalistItem);

declare global {
  interface HTMLElementTagNameMap {
    'prism-datalist': PrismDatalist;
    'prism-datalist-item': PrismDatalistItem;
  }
}
