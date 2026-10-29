import { PrismMenu } from './menu.js';
import { PrismMenuItem } from './menu-item.js';

if (!customElements.get('prism-menu-item'))
  customElements.define('prism-menu-item', PrismMenuItem);
if (!customElements.get('prism-menu'))
  customElements.define('prism-menu', PrismMenu);

declare global {
  interface HTMLElementTagNameMap {
    'prism-menu': PrismMenu;
    'prism-menu-item': PrismMenuItem;
  }
}
