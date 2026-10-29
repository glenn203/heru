import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  name: string;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape: 'circle' | 'square';
}

// A tiny inline picture so the story needs no network.
const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#8aa0c8"/><circle cx="20" cy="16" r="7" fill="#f4f6fb"/><path d="M6 40c2-10 9-14 14-14s12 4 14 14Z" fill="#f4f6fb"/></svg>',
  );

const meta: Meta<Args> = {
  title: 'Components/Avatar',
  component: 'prism-avatar',
  args: { name: 'Maya Ortiz', size: 'md', shape: 'circle' },
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
  },
  render: ({ name, size, shape }) =>
    html`<prism-avatar
      name=${name}
      size=${size}
      shape=${shape}
    ></prism-avatar>`,
};
export default meta;
type Story = StoryObj<Args>;

/** Initials come from the name. */
export const Default: Story = {};

export const Sizes: Story = {
  render: () =>
    html`<div style="display:flex;gap:8px;align-items:center">
      ${['xs', 'sm', 'md', 'lg', 'xl'].map(
        (s) => html`<prism-avatar name="Tom Reyes" size=${s}></prism-avatar>`,
      )}
    </div>`,
};

export const WithPicture: Story = {
  render: () =>
    html`<div style="display:flex;gap:8px;align-items:center">
      <prism-avatar name="Priya Nair" src=${PHOTO}></prism-avatar>
      <prism-avatar
        name="Priya Nair"
        src=${PHOTO}
        shape="square"
      ></prism-avatar>
      <!-- a picture that fails falls back to initials -->
      <prism-avatar name="Priya Nair" src="/missing.png"></prism-avatar>
    </div>`,
};

/** Name already written next to it: `decorative` hides it from assistive tech. */
export const BesideAName: Story = {
  render: () =>
    html`<div style="display:flex;gap:8px;align-items:center">
      <prism-avatar name="Maya Ortiz" size="sm" decorative></prism-avatar>
      <span>Maya Ortiz</span>
    </div>`,
};
