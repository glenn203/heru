import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

interface Args {
  label: string;
  size: 'sm' | 'md' | 'lg';
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
  showLabel: boolean;
}

const TONES = ['accent', 'neutral', 'info', 'success', 'warning', 'danger'];

const meta: Meta<Args> = {
  title: 'Components/Running indicator',
  component: 'prism-running-indicator',
  args: { label: 'Running', size: 'md', tone: 'accent', showLabel: true },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    tone: { control: 'select', options: TONES },
  },
  render: ({ label, size, tone, showLabel }) =>
    html`<prism-running-indicator
      label=${label}
      size=${size}
      tone=${tone}
      ?show-label=${showLabel}
    ></prism-running-indicator>`,
};
export default meta;
type Story = StoryObj<Args>;

/**
 * A soft dot with rings that spread outward and fade, like light fanning out
 * of a prism. It says "this is running now". It is a status region, so screen
 * readers get the label. With the default accent tone the rings drift from
 * violet through blue to cyan.
 */
export const Default: Story = {};

/** The label is always in the page for screen readers. `show-label` also shows it. */
export const ScreenReaderOnly: Story = {
  args: { label: 'Export running', showLabel: false },
};

/** Sizes: sm 16px (fits a card header), md 24px, lg 40px. */
export const Sizes: Story = {
  render: () =>
    html`<div style="display:flex;gap:32px;align-items:center">
      ${(['sm', 'md', 'lg'] as const).map(
        (s) =>
          html`<prism-running-indicator
            size=${s}
            label="Size ${s}"
            show-label
          ></prism-running-indicator>`,
      )}
    </div>`,
};

/** Other tones keep one hue. Pick the tone that matches the job's meaning. */
export const Tones: Story = {
  render: () =>
    html`<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
      ${TONES.map(
        (t) =>
          html`<prism-running-indicator
            tone=${t}
            size="lg"
            label=${t}
            show-label
          ></prism-running-indicator>`,
      )}
    </div>`,
};

/** Beside a heading while a job runs. Swap it for a Tag when the job ends. */
export const BesideAHeading: Story = {
  render: () =>
    html`<div style="display:flex;gap:8px;align-items:center">
      <prism-running-indicator
        size="sm"
        label="Rendering preview"
      ></prism-running-indicator>
      <h3
        style="margin:0;font:600 16px/24px var(--prism-font-family-sans);color:var(--prism-color-text)"
      >
        Preview render
      </h3>
    </div>`,
};

/**
 * Under `prefers-reduced-motion: reduce` the rings hold still as a soft halo.
 * The dot and the written label are always there, so motion never carries the
 * meaning alone.
 */
export const ReducedMotion: Story = {
  render: () =>
    html`<prism-running-indicator
      size="lg"
      label="Running"
      show-label
    ></prism-running-indicator>`,
};
