import type { Preview } from '@storybook/web-components';
import '../src/tokens/tokens.css';
import '../src/theme/theme.css';
import './preview.css';
import '../src/define.js';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    layout: 'padded',
    options: {
      storySort: { order: ['Introduction', 'Foundations', 'Components'] },
    },
  },
};

export default preview;
