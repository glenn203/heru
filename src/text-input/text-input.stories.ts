import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  label: string;
  type: 'text' | 'email' | 'url' | 'tel';
  size: 'sm' | 'md' | 'lg';
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  description: string;
  error: string;
}

/**
 * Single-line input for text, email, url and tel. `<heru-text-field>` is a
 * deprecated alias. Tag names are pending Technical Writer review.
 */
const meta: Meta<Args> = {
  title: 'Components/Text input',
  component: 'heru-text-input',
  argTypes: {
    type: { control: 'inline-radio', options: ['text', 'email', 'url', 'tel'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  args: {
    label: 'Email',
    type: 'email',
    size: 'md',
    required: false,
    disabled: false,
    readonly: false,
    description: 'We only use this for receipts.',
    error: 'Enter an email address.',
  },
  render: (a) => html`
    <heru-text-input
      label=${a.label}
      type=${a.type}
      size=${a.size}
      name="email"
      autocomplete="email"
      ?required=${a.required}
      ?disabled=${a.disabled}
      ?readonly=${a.readonly}
      style="max-inline-size: 320px"
    >
      <span slot="description">${a.description}</span>
      <span slot="error">${a.error}</span>
    </heru-text-input>
  `,
};
export default meta;
type S = StoryObj<Args>;

export const Default: S = {};
export const Required: S = { args: { required: true } };
export const Disabled: S = { args: { disabled: true } };
export const Readonly: S = { args: { readonly: true } };
export const Phone: S = {
  args: { label: 'Phone', type: 'tel', description: 'Digits and spaces.' },
};

/** Submit the form empty to see the attached error box. */
export const Invalid: S = {
  args: { required: true },
  render: (a) => html`
    <form
      @submit=${(e: Event) => e.preventDefault()}
      style="display: grid; gap: 12px; max-inline-size: 320px"
    >
      <heru-text-input label=${a.label} type="email" name="email" required>
        <span slot="description">${a.description}</span>
        <span slot="error">${a.error}</span>
      </heru-text-input>
      <heru-button>Submit</heru-button>
    </form>
  `,
};
