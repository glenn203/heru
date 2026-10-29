import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  label: string;
  placeholder: string;
  disabled: boolean;
}

/**
 * Search box (role searchbox) with a clear button. Escape clears; Enter fires
 * `search`. Name pending.
 */
const meta: Meta<Args> = {
  title: 'Components/Search input',
  component: 'prism-search-input',
  args: { label: 'Search', placeholder: 'Search docs', disabled: false },
  render: (a) => html`
    <prism-search-input
      label=${a.label}
      placeholder=${a.placeholder}
      name="q"
      ?disabled=${a.disabled}
      style="max-inline-size: 320px"
      @search=${(e: CustomEvent<{ value: string }>) =>
        console.log('search', e.detail.value)}
    ></prism-search-input>
  `,
};
export default meta;
type S = StoryObj<Args>;
export const Default: S = {};
export const WithValue: S = {
  render: (a) =>
    html`<prism-search-input
      label=${a.label}
      value="lit components"
      style="max-inline-size: 320px"
    ></prism-search-input>`,
};
export const Disabled: S = { args: { disabled: true } };
