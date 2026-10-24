import '../option/define.js';
import { HeruSelect } from './select.js';

if (!customElements.get('heru-select'))
  customElements.define('heru-select', HeruSelect);

declare global {
  interface HTMLElementTagNameMap {
    'heru-select': HeruSelect;
  }
}
