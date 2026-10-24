import { HeruOption } from './option.js';

if (!customElements.get('heru-option'))
  customElements.define('heru-option', HeruOption);

declare global {
  interface HTMLElementTagNameMap {
    'heru-option': HeruOption;
  }
}
