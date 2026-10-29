import { PrismProgress } from './progress.js';

if (!customElements.get('prism-progress'))
  customElements.define('prism-progress', PrismProgress);

declare global {
  interface HTMLElementTagNameMap {
    'prism-progress': PrismProgress;
  }
}
