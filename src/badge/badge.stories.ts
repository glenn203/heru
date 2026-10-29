import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';
import '../button/define.js';
import '../icon-button/define.js';
import { iconRefresh } from '../internal/icons.js';

interface Args {
  count: number;
  max: number;
}

const meta: Meta<Args> = {
  title: 'Components/Badge',
  component: 'prism-badge',
  args: { count: 48, max: 99 },
  render: ({ count, max }) =>
    html`<prism-button variant="ghost"
      >Alerts <prism-badge count=${count} max=${max}></prism-badge
    ></prism-button>`,
};
export default meta;
type Story = StoryObj<Args>;

/** A count sits inside the control it counts, so it reads "Alerts 48". */
export const Count: Story = {};

/** Above the cap it reads 99+. Zero is hidden unless `show-zero`. */
export const CountCap: Story = {
  render: () =>
    html`<div style="display:flex;gap:16px;align-items:center">
      <prism-badge count="7"></prism-badge>
      <prism-badge count="128"></prism-badge>
      <prism-badge count="0" show-zero></prism-badge>
      <prism-badge count="0"></prism-badge>
      <span>(the last one is hidden)</span>
    </div>`,
};

/** On a nav icon: the parent has the name, the badge the number. */
export const OnAnIconButton: Story = {
  render: () =>
    html`<div style="display:inline-flex;align-items:center;gap:4px">
      <prism-icon-button label="Notifications, 3 unread"
        >${iconRefresh()}</prism-icon-button
      ><prism-badge count="3" aria-hidden="true"></prism-badge>
    </div>`,
};

/** Process status: Live, Running, Stopped. The word is always there. */
export const Status: Story = {
  render: () =>
    html`<div style="display:flex;gap:8px">
      <prism-badge job="status" status="live"></prism-badge>
      <prism-badge job="status" status="running"></prism-badge>
      <prism-badge job="status" status="stopped"></prism-badge>
    </div>`,
};
