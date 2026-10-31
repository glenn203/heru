import { PrismRunningIndicator } from './running-indicator.js';

if (!customElements.get('prism-running-indicator'))
  customElements.define('prism-running-indicator', PrismRunningIndicator);

declare global {
  interface HTMLElementTagNameMap {
    'prism-running-indicator': PrismRunningIndicator;
  }
}
