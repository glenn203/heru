import { PrismCard } from './card.js';
import { PrismCardTitle } from './card-title.js';
import { PrismCardDescription } from './card-description.js';
import { PrismCardMeta } from './card-meta.js';
import { PrismCardActions } from './card-actions.js';
import { PrismCardSelect } from './card-select.js';
import { PrismCardGroup } from './card-group.js';
import { PrismCardList } from './card-list.js';
import { PrismCardMetric } from './card-metric.js';
import { PrismCardSkeleton } from './card-skeleton.js';
import '../button/define.js';
import '../icon-button/define.js';
import '../menu/define.js';

const defs: [string, CustomElementConstructor][] = [
  ['prism-card', PrismCard],
  ['prism-card-title', PrismCardTitle],
  ['prism-card-description', PrismCardDescription],
  ['prism-card-meta', PrismCardMeta],
  ['prism-card-actions', PrismCardActions],
  ['prism-card-select', PrismCardSelect],
  ['prism-card-group', PrismCardGroup],
  ['prism-card-list', PrismCardList],
  ['prism-card-metric', PrismCardMetric],
  ['prism-card-skeleton', PrismCardSkeleton],
];
for (const [name, ctor] of defs)
  if (!customElements.get(name)) customElements.define(name, ctor);

declare global {
  interface HTMLElementTagNameMap {
    'prism-card': PrismCard;
    'prism-card-title': PrismCardTitle;
    'prism-card-description': PrismCardDescription;
    'prism-card-meta': PrismCardMeta;
    'prism-card-actions': PrismCardActions;
    'prism-card-select': PrismCardSelect;
    'prism-card-group': PrismCardGroup;
    'prism-card-list': PrismCardList;
    'prism-card-metric': PrismCardMetric;
    'prism-card-skeleton': PrismCardSkeleton;
  }
}
