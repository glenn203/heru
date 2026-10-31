import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';
import '../button/define.js';

interface Args {
  label: string;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  required: boolean;
  size: 'sm' | 'md' | 'lg';
  hideLabel: boolean;
}

const meta: Meta<Args> = {
  title: 'Components/Checkbox',
  component: 'prism-checkbox',
  args: {
    label: 'Email me a weekly summary',
    checked: false,
    indeterminate: false,
    disabled: false,
    required: false,
    size: 'md',
    hideLabel: false,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  render: (a) =>
    html`<prism-checkbox
      label=${a.label}
      size=${a.size}
      ?checked=${a.checked}
      ?indeterminate=${a.indeterminate}
      ?disabled=${a.disabled}
      ?required=${a.required}
      ?hide-label=${a.hideLabel}
    ></prism-checkbox>`,
};
export default meta;
type Story = StoryObj<Args>;

/**
 * A yes or no choice. Click it, or press Space when it has focus. Pressing
 * squishes the box a little, and letting go springs it back with a small pop.
 * Checking grows the accent out of the centre, then draws the check in with a
 * tiny overshoot, in about 450ms; unchecking runs it back. A tap in the middle
 * of a move turns it round from where it is, so quick taps never snap. A soft
 * pass of light crosses the fill as it grows.
 */
export const Default: Story = {};

/** Starts checked. The check is drawn on the accent fill. */
export const Checked: Story = { args: { checked: true } };

/**
 * Indeterminate is for a parent of a partly picked group. The dash and the
 * check turn into each other: the two arms of the mark swing about one corner.
 * Click it to check the box.
 */
export const Indeterminate: Story = { args: { indeterminate: true } };

/** Every look side by side. */
export const States: Story = {
  render: () =>
    html`<div style="display:grid;gap:12px">
      <prism-checkbox label="Off"></prism-checkbox>
      <prism-checkbox label="On" checked></prism-checkbox>
      <prism-checkbox label="Some" indeterminate></prism-checkbox>
      <prism-checkbox label="Off, disabled" disabled></prism-checkbox>
      <prism-checkbox label="On, disabled" checked disabled></prism-checkbox>
      <prism-checkbox
        label="Some, disabled"
        indeterminate
        disabled
      ></prism-checkbox>
    </div>`,
};

/** Sizes: sm (16px box), md (20px) and lg (24px). All keep a 24px minimum target. */
export const Sizes: Story = {
  render: () =>
    html`<div style="display:grid;gap:12px">
      ${(['sm', 'md', 'lg'] as const).map(
        (s) =>
          html`<div style="display:flex;gap:24px;align-items:center">
            <prism-checkbox label="Size ${s}, off" size=${s}></prism-checkbox>
            <prism-checkbox
              label="Size ${s}, on"
              size=${s}
              checked
            ></prism-checkbox>
          </div>`,
      )}
    </div>`,
};

/** Help text goes in the `description` slot, under the label. */
export const WithDescription: Story = {
  render: () =>
    html`<prism-checkbox label="Share my spectrum">
      <span slot="description">Anyone with the link can see your bands.</span>
    </prism-checkbox>`,
};

/**
 * The label can be hidden from sight when the row already says what the box
 * is for, as in a table. It still names the checkbox for screen readers.
 */
export const HiddenLabel: Story = {
  render: () =>
    html`<div style="display:flex;gap:12px;align-items:center">
      <prism-checkbox label="Select prism A" hide-label></prism-checkbox>
      <span aria-hidden="true">Prism A</span>
    </div>`,
};

/**
 * A parent box that follows its children. It shows indeterminate while only
 * some are checked, and a click on it checks or clears them all.
 */
export const SelectAll: Story = {
  render: () => {
    const sync = (root: HTMLElement) => {
      const all = root.querySelector<
        HTMLElement & { checked: boolean; indeterminate: boolean }
      >('#all')!;
      const kids = [
        ...root.querySelectorAll<HTMLElement & { checked: boolean }>('.kid'),
      ];
      const on = kids.filter((k) => k.checked).length;
      all.checked = on === kids.length;
      all.indeterminate = on > 0 && on < kids.length;
    };
    return html`<div
      style="display:grid;gap:8px"
      @change=${(e: Event) => {
        const root = e.currentTarget as HTMLElement;
        const target = e.target as HTMLElement & { checked: boolean };
        if (target.id === 'all')
          for (const k of root.querySelectorAll<
            HTMLElement & { checked: boolean }
          >('.kid'))
            k.checked = target.checked;
        sync(root);
      }}
    >
      <prism-checkbox
        id="all"
        label="All colours"
        indeterminate
      ></prism-checkbox>
      <div style="display:grid;gap:8px;padding-inline-start:32px">
        <prism-checkbox class="kid" label="Violet" checked></prism-checkbox>
        <prism-checkbox class="kid" label="Cyan"></prism-checkbox>
        <prism-checkbox class="kid" label="Amber"></prism-checkbox>
      </div>
    </div>`;
  },
};

/**
 * Required, inside a form. The error appears once the box has been touched or
 * the form is submitted, and goes when the box is checked. While checked the
 * box submits its `value` under its `name`; unchecked it submits nothing.
 */
export const InForm: Story = {
  render: () =>
    html`<form
      style="display:grid;gap:12px;max-inline-size:340px"
      @submit=${(e: SubmitEvent) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        form.querySelector('output')!.textContent =
          `Submitted: ${JSON.stringify(Object.fromEntries(new FormData(form)))}`;
      }}
    >
      <prism-checkbox
        label="Weekly summary"
        name="summary"
        value="weekly"
        checked
      ></prism-checkbox>
      <prism-checkbox label="I have read the notes" name="notes" required>
        <span slot="error">Tick this box to continue.</span>
      </prism-checkbox>
      <div style="display:flex;gap:8px">
        <prism-button>Save</prism-button>
        <prism-button type="reset" variant="outline">Reset</prism-button>
      </div>
      <output
        aria-live="polite"
        style="font:400 12px/16px var(--prism-font-family-mono);color:var(--prism-color-text-muted)"
      ></output>
    </form>`,
};

/**
 * Under `prefers-reduced-motion: reduce` nothing squishes, grows or draws: the
 * state changes at once and the colour fades over 120ms. Try it with your
 * system setting turned on. Forced colours use the system highlight.
 */
export const ReducedMotion: Story = {
  render: () => html`<prism-checkbox label="Tick me"></prism-checkbox>`,
};
