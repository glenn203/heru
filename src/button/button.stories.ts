import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
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
    html`<heru-button type=${type} ?disabled=${disabled} .pressed=${pressed}
      >${label}</heru-button
    >`,
};
export default meta;

export const Default: StoryObj<Args> = {};

export const Disabled: StoryObj<Args> = { args: { disabled: true } };

/** A toggle: `pressed` sets aria-pressed and :state(pressed). */
export const Toggle: StoryObj<Args> = {
  args: { label: 'Bold', pressed: false },
};

/** Sizes follow the density of the nearest [data-heru-density]. */
export const Sizes: StoryObj<Args> = {
  render: ({ label }) =>
    html`<div style="display: flex; gap: 8px; align-items: center">
      <heru-button type="button" size="sm">${label}</heru-button>
      <heru-button type="button" size="md">${label}</heru-button>
      <heru-button type="button" size="lg">${label}</heru-button>
    </div>`,
};

/** Outline variant (name provisional, pending Technical Writer). */
export const Outline: StoryObj = {
  render: () =>
    html`<div style="display: flex; gap: 12px">
      <heru-button variant="outline" type="button">Cancel</heru-button>
      <heru-button variant="outline" type="button" disabled
        >Disabled</heru-button
      >
    </div>`,
};

const VARIANTS = [
  'primary',
  'secondary',
  'ghost',
  'outline',
  'destructive',
] as const;
const variantStory = (v: (typeof VARIANTS)[number]): StoryObj => ({
  render: () =>
    html`<div style="display: flex; gap: 12px">
      <heru-button variant=${v} type="button">${v}</heru-button>
      <heru-button variant=${v} type="button" pressed>Selected</heru-button>
      <heru-button variant=${v} type="button" disabled>Disabled</heru-button>
    </div>`,
});
/** Variant names provisional, pending Technical Writer. */
export const Primary = variantStory('primary');
export const Secondary = variantStory('secondary');
export const Ghost = variantStory('ghost');
export const Destructive = variantStory('destructive');
/** Every variant side by side. */
export const AllVariants: StoryObj = {
  render: () =>
    html`<div style="display: grid; gap: 12px; justify-items: start">
      ${VARIANTS.map(
        (v) => html`<heru-button variant=${v} type="button">${v}</heru-button>`,
      )}
    </div>`,
};
