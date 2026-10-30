import type { Preview } from '@storybook/web-components';
import '../src/tokens/tokens.css';
import '../src/theme/theme.css';
import './preview.css';
import '../src/define.js';
import { DEFAULT_FONT, FONTS, applyFont } from './fonts.js';

const preview: Preview = {
  // Toolbar: preview-only font. Sets the font-family variable on the preview
  // root; tokens and text styles are unchanged. Inter is the default.
  globalTypes: {
    theme: {
      description: 'Color theme (sets data-prism-theme on the preview root)',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'auto', title: 'Auto (system)' },
        ],
      },
    },
    font: {
      description: 'Preview font (docs only; the package ships no fonts)',
      toolbar: {
        title: 'Font',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: FONTS.map((f) => ({ value: f.name, title: f.name })),
      },
    },
  },
  initialGlobals: { font: DEFAULT_FONT, theme: 'light' },
  decorators: [
    (story, context) => {
      document.documentElement.dataset['prismTheme'] = String(
        context.globals['theme'] ?? 'light',
      );
      applyFont(
        String(context.globals['font'] ?? DEFAULT_FONT),
        document.documentElement,
      );
      return story();
    },
  ],
  tags: ['autodocs'],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    layout: 'padded',
    options: {
      storySort: {
        order: ['Introduction', 'Foundations', 'Components', 'Card recipes'],
      },
    },
  },
};

export default preview;
