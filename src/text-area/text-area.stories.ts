import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  label: string;
  rows: number;
  autosize: boolean;
  counter: boolean;
  maxlength: number;
  required: boolean;
  disabled: boolean;
}

/**
 * Multi-line input. `autosize` grows with content; `counter` + `maxlength`
 * shows "n / max" and announces politely only near the limit. Name pending
 * Technical Writer.
 */
const meta: Meta<Args> = {
  title: 'Components/Text area',
  component: 'prism-text-area',
  args: {
    label: 'Bio',
    rows: 3,
    autosize: true,
    counter: true,
    maxlength: 160,
    required: false,
    disabled: false,
  },
  render: (a) => html`
    <prism-text-area
      label=${a.label}
      rows=${a.rows}
      maxlength=${a.maxlength}
      name="bio"
      ?autosize=${a.autosize}
      ?counter=${a.counter}
      ?required=${a.required}
      ?disabled=${a.disabled}
      style="max-inline-size: 360px"
    >
      <span slot="description">Shown on your profile.</span>
      <span slot="error">Tell us a little about yourself.</span>
    </prism-text-area>
  `,
};
export default meta;
type S = StoryObj<Args>;
export const Default: S = {};
export const Fixed: S = { args: { autosize: false, counter: false } };
export const Disabled: S = { args: { disabled: true } };
