import type { Preview } from '@storybook/web-components';
import '../src/tokens/tokens.css';
import '../src/define.js';

const preview: Preview = {
  parameters: { a11y: { test: 'error' }, controls: { expanded: true } },
};

export default preview;
