import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './define.js';

interface Args {
  label: string;
  type: 'button' | 'submit' | 'reset';
  disabled: boolean;
  pressed?: boolean;
}

const meta: Meta<Args> = {
  title: 'Components/Button',
  component: 'heru-button',
  args: { label: 'Save', type: 'button', disabled: false },
  argTypes: {
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
  },
  render: ({ label, type, disabled, pressed }) =>
    html`<heru-button
      type=${type}
      ?disabled=${disabled}
      ?pressed=${ifDefined(pressed)}
      >${label}</heru-button
    >`,
};
export default meta;

export const Default: StoryObj<Args> = {};

export const Disabled: StoryObj<Args> = { args: { disabled: true } };

/** Headless: all visuals come from the consumer through parts and states. */
export const StyledExample: StoryObj<Args> = {
  render: ({ label }) => html`
    <style>
      .demo::part(base) {
        padding: 0.5rem 1rem;
        border: 1px solid currentcolor;
        border-radius: 4px;
      }
      .demo:state(disabled)::part(base) {
        opacity: 0.5;
      }
    </style>
    <heru-button class="demo" type="button">${label}</heru-button>
  `,
};
