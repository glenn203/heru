import type { InlineConfig } from 'vite';
import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/web-components-vite', options: {} },
  // GitHub Pages serves from /heru/; set STORYBOOK_BASE=/heru/ in CI.
  viteFinal: (config: InlineConfig): InlineConfig => {
    const base = process.env.STORYBOOK_BASE;
    return base ? { ...config, base } : config;
  },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};

export default config;
