import { PrismBadge } from './badge.js';

if (!customElements.get('prism-badge'))
  customElements.define('prism-badge', PrismBadge);

declare global {
  interface HTMLElementTagNameMap {
    'prism-badge': PrismBadge;
  }
}
