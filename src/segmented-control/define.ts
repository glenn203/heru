import { PrismSegment } from './segment.js';
import { PrismSegmentedControl } from './segmented-control.js';

if (!customElements.get('prism-segment'))
  customElements.define('prism-segment', PrismSegment);
if (!customElements.get('prism-segmented-control'))
  customElements.define('prism-segmented-control', PrismSegmentedControl);

declare global {
  interface HTMLElementTagNameMap {
    'prism-segment': PrismSegment;
    'prism-segmented-control': PrismSegmentedControl;
  }
}
