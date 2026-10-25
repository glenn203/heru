import { HeruTextArea } from './text-area.js';

if (!customElements.get('heru-text-area'))
  customElements.define('heru-text-area', HeruTextArea);

declare global {
  interface HTMLElementTagNameMap {
    'heru-text-area': HeruTextArea;
  }
}
