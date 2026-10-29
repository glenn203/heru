import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  label: string;
  value: number;
  max: number;
  showValue: boolean;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
}

const meta: Meta<Args> = {
  title: 'Components/Progress',
  component: 'prism-progress',
  args: {
    label: 'Storage used',
    value: 60,
    max: 100,
    showValue: true,
    tone: 'accent',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'info', 'success', 'warning', 'danger', 'accent'],
    },
  },
  render: ({ label, value, max, showValue, tone }) =>
    html`<div style="max-inline-size:320px">
      <prism-progress
        label=${label}
        value=${value}
        max=${max}
        ?show-value=${showValue}
        tone=${tone}
      ></prism-progress>
    </div>`,
};
export default meta;
type Story = StoryObj<Args>;

/** Role progressbar with min, max and now, named by the label. */
export const Default: Story = {};

/** `value-text` puts words in the bar and in `aria-valuetext`. */
export const Steps: Story = {
  render: () =>
    html`<div style="max-inline-size:320px">
      <prism-progress
        label="Setup"
        value="3"
        max="5"
        value-text="3 of 5 steps"
        show-value
      ></prism-progress>
    </div>`,
};

/** No `value`: indeterminate. It stops moving under reduced motion. */
export const Indeterminate: Story = {
  render: () =>
    html`<div style="max-inline-size:320px">
      <prism-progress label="Loading resources"></prism-progress>
    </div>`,
};

export const Tones: Story = {
  render: () =>
    html`<div style="display:grid;gap:12px;max-inline-size:320px">
      ${['neutral', 'info', 'success', 'warning', 'danger', 'accent'].map(
        (t) =>
          html`<prism-progress
            label=${t}
            value="64"
            tone=${t}
            show-value
          ></prism-progress>`,
      )}
    </div>`,
};

/** Label hidden from sight when a heading already says it. It still names the bar. */
export const HiddenLabel: Story = {
  render: () =>
    html`<div style="max-inline-size:320px">
      <prism-progress label="Upload" value="30" hide-label></prism-progress>
    </div>`,
};
