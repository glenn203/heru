import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';
import '../tag/define.js';

interface Args {
  orientation: 'horizontal' | 'vertical';
}

const meta: Meta<Args> = {
  title: 'Components/Datalist',
  component: 'prism-datalist',
  args: { orientation: 'horizontal' },
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
  },
  render: ({ orientation }) =>
    html`<div style="max-inline-size:360px">
      <prism-datalist label="Host details" orientation=${orientation}>
        <prism-datalist-item label="OS"
          >Windows Server 2022</prism-datalist-item
        >
        <prism-datalist-item label="Sensor">7.14.2</prism-datalist-item>
        <prism-datalist-item label="IP address">192.0.2.42</prism-datalist-item>
        <prism-datalist-item label="Health"
          ><prism-tag job="health" tone="success"
            >Online</prism-tag
          ></prism-datalist-item
        >
      </prism-datalist>
    </div>`,
};
export default meta;
type Story = StoryObj<Args>;

/** Labels line up in one column across rows. */
export const Default: Story = {};

export const Vertical: Story = { args: { orientation: 'vertical' } };
