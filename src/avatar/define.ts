import { PrismAvatar } from './avatar.js';

if (!customElements.get('prism-avatar'))
  customElements.define('prism-avatar', PrismAvatar);

declare global {
  interface HTMLElementTagNameMap {
    'prism-avatar': PrismAvatar;
  }
}
