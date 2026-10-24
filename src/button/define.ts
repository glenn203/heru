import { HeruButton } from './button.js';

if (!customElements.get('heru-button'))
  customElements.define('heru-button', HeruButton);

declare global {
  interface HTMLElementTagNameMap {
    'heru-button': HeruButton;
  }
}
