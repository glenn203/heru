import { PrismDescriptionList } from './description-list.js';
import { PrismDescriptionListItem } from './description-list-item.js';

if (!customElements.get('prism-description-list'))
  customElements.define('prism-description-list', PrismDescriptionList);
if (!customElements.get('prism-description-list-item'))
  customElements.define(
    'prism-description-list-item',
    PrismDescriptionListItem,
  );

declare global {
  interface HTMLElementTagNameMap {
    'prism-description-list': PrismDescriptionList;
    'prism-description-list-item': PrismDescriptionListItem;
  }
}
