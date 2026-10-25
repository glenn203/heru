import { HeruTextInput } from './text-input.js';

if (!customElements.get('heru-text-input'))
  customElements.define('heru-text-input', HeruTextInput);

declare global {
  interface HTMLElementTagNameMap {
    'heru-text-input': HeruTextInput;
  }
}
