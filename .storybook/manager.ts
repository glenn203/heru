import { addons } from 'storybook/internal/manager-api';
import { create } from 'storybook/internal/theming';

const BRAND = 'Prism';

addons.setConfig({
  theme: create({ base: 'light', brandTitle: BRAND }),
});

// Storybook 8 hard-codes "<page> ⋅ Storybook" as the tab title; brand it.
const brand = () => {
  const t = document.title.replace(/Storybook$/, BRAND);
  if (t !== document.title) document.title = t;
};
brand();
new MutationObserver(brand).observe(document.head, {
  subtree: true,
  childList: true,
  characterData: true,
});
