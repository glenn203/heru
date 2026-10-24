import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  label: string;
  size: 'sm' | 'md' | 'lg';
  disabled: boolean;
  required: boolean;
  description: string;
  error: string;
}

const options = html`
  <heru-option value="apple">Apple</heru-option>
  <heru-option value="banana">Banana</heru-option>
  <heru-option value="cherry">Cherry</heru-option>
  <heru-option value="durian" disabled>Durian (sold out)</heru-option>
  <heru-option value="elderberry">Elderberry</heru-option>
`;

const meta: Meta<Args> = {
  title: 'Components/Select',
  component: 'heru-select',
  args: {
    label: 'Fruit',
    size: 'md',
    disabled: false,
    required: false,
    description: '',
    error: 'Choose a fruit.',
  },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
  render: ({ label, size, disabled, required, description, error }) => html`
    <div style="max-inline-size: 320px">
      <heru-select
        label=${label}
        name="fruit"
        placeholder="Select a fruit"
        size=${size}
        ?disabled=${disabled}
        ?required=${required}
      >
        ${options}
        ${
          description
            ? html`<span slot="description">${description}</span>`
            : ''
        }
        <span slot="error">${error}</span>
      </heru-select>
    </div>
  `,
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => html`
    <div style="display: grid; gap: 24px; max-inline-size: 320px">
      ${(['sm', 'md', 'lg'] as const).map(
        (s) =>
          html`<heru-select label="Size ${s}" size=${s} value="apple"
            >${options}</heru-select
          >`,
      )}
    </div>
  `,
};

export const Densities: Story = {
  render: () => html`
    <div style="display: grid; gap: 24px; max-inline-size: 320px">
      ${(['compact', 'default', 'comfortable'] as const).map(
        (d) =>
          html`<div data-heru-density=${d}>
            <heru-select label="Density ${d}" value="banana"
              >${options}</heru-select
            >
          </div>`,
      )}
    </div>
  `,
};

export const Disabled: Story = { args: { disabled: true } };

export const WithHelper: Story = {
  args: { description: 'We ship fruit on Mondays.' },
};

/** Submit empty: the error animates in and replaces the helper text. */
export const ErrorState: Story = {
  args: { required: true, description: 'We ship fruit on Mondays.' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('heru-select')!;
    await el.updateComplete;
    el.reportValidity();
  },
};

/** The open menu overlays the helper text below the control. */
export const OpenMenuWithHelper: Story = {
  args: { description: 'We ship fruit on Mondays.' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('heru-select')!;
    await el.updateComplete;
    el.showPicker();
  },
};
