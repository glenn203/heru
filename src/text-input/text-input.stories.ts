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
 * Single-line input for text, email, url and tel. `<prism-text-field>` is a
 * deprecated alias. Tag names are pending.
 */
const meta: Meta<Args> = {
  title: 'Components/Text input',
  component: 'prism-text-input',
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
    <prism-text-input
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
    </prism-text-input>
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
      <prism-text-input label=${a.label} type="email" name="email" required>
        <span slot="description">${a.description}</span>
        <span slot="error">${a.error}</span>
      </prism-text-input>
      <prism-button>Submit</prism-button>
    </form>
  `,
};

/** The label rests inside the field and floats onto its top edge on focus or with a value. Click in, type, clear and click out to watch it move; it follows a value set from code the same way. */
export const FloatingLabel: S = {
  args: { label: 'Email', description: 'We only use this for receipts.' },
  render: (a) => html`
    <div style="display: grid; gap: 28px; max-inline-size: 320px">
      <prism-text-input
        label=${a.label}
        type="email"
        floating
        clearable
        autocomplete="email"
      >
        <span slot="description">${a.description}</span>
      </prism-text-input>
      <prism-text-input
        label="Starts with a value"
        floating
        value="lumen@example.com"
      ></prism-text-input>
      <prism-text-input
        label="With a placeholder"
        floating
        placeholder="name@example.com"
      ></prism-text-input>
      <prism-password-input label="Password" floating></prism-password-input>
    </div>
  `,
};

/** A short prefix or suffix sits inside the field; the text keeps clear of both and of the clear button. */
export const PrefixSuffixClear: S = {
  render: () => html`
    <div style="display: grid; gap: 28px; max-inline-size: 320px">
      <prism-text-input label="Amount" floating clearable value="42">
        <span slot="prefix">$</span>
        <span slot="suffix">USD</span>
        <span slot="description">Before tax.</span>
      </prism-text-input>
      <prism-text-input label="Website" clearable value="lumen.example">
        <span slot="prefix">https://</span>
      </prism-text-input>
      <prism-text-input label="Weight" size="sm" value="12">
        <span slot="suffix">kg</span>
      </prism-text-input>
    </div>
  `,
};

/** Submit the empty form: the field gives one small sideways nudge as the error appears, then the attached error box. */
export const FloatingInvalid: S = {
  render: () => html`
    <form
      @submit=${(e: Event) => e.preventDefault()}
      style="display: grid; gap: 12px; max-inline-size: 320px"
    >
      <prism-text-input label="Name" name="name" floating required>
        <span slot="description">As shown on your card.</span>
        <span slot="error">Enter a name.</span>
      </prism-text-input>
      <prism-button>Submit</prism-button>
    </form>
  `,
};

/** Read-only keeps focus and selection with the surface fill; disabled is inert. */
export const ReadonlyAndDisabled: S = {
  render: () => html`
    <div style="display: grid; gap: 28px; max-inline-size: 320px">
      <prism-text-input label="Plan" floating readonly value="Team">
      </prism-text-input>
      <prism-text-input label="Seat" floating disabled value="Window">
      </prism-text-input>
    </div>
  `,
};
