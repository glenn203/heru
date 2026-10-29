import { PrismTag } from './tag.js';

if (!customElements.get('prism-tag'))
  customElements.define('prism-tag', PrismTag);

declare global {
  interface HTMLElementTagNameMap {
    'prism-tag': PrismTag;
  }
}
