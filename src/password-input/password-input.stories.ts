import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  label: string;
  autocomplete: 'current-password' | 'new-password';
  required: boolean;
  disabled: boolean;
}

/** Password with a show/hide toggle (aria-pressed). Name pending. */
const meta: Meta<Args> = {
  title: 'Components/Password input',
  component: 'prism-password-input',
  argTypes: {
    autocomplete: {
      control: 'inline-radio',
      options: ['current-password', 'new-password'],
    },
  },
  args: {
    label: 'Password',
    autocomplete: 'current-password',
    required: false,
    disabled: false,
  },
  render: (a) => html`
    <prism-password-input
      label=${a.label}
      name="password"
      autocomplete=${a.autocomplete}
      ?required=${a.required}
      ?disabled=${a.disabled}
      style="max-inline-size: 320px"
    >
      <span slot="description">At least 12 characters.</span>
      <span slot="error">Enter your password.</span>
    </prism-password-input>
  `,
};
export default meta;
type S = StoryObj<Args>;
export const SignIn: S = {};
export const NewPassword: S = {
  args: { label: 'New password', autocomplete: 'new-password' },
};
export const Disabled: S = { args: { disabled: true } };
