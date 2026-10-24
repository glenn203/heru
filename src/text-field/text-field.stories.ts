import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  label: string;
  required: boolean;
  disabled: boolean;
  description: string;
  error: string;
}

const meta: Meta<Args> = {
  title: 'Components/Text field',
  component: 'heru-text-field',
  args: {
    label: 'Email',
    required: false,
    disabled: false,
    description: 'We only use this for receipts.',
    error: 'Enter an email address.',
  },
  render: ({ label, required, disabled, description, error }) => html`
    <heru-text-field
      label=${label}
      name="email"
      ?required=${required}
      ?disabled=${disabled}
    >
      <span slot="description">${description}</span>
      <span slot="error">${error}</span>
    </heru-text-field>
  `,
};
export default meta;

export const Default: StoryObj<Args> = {};
export const Required: StoryObj<Args> = { args: { required: true } };
export const Disabled: StoryObj<Args> = { args: { disabled: true } };
