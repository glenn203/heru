import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Foundations/Tokens',
  tags: ['!autodocs'],
  parameters: { a11y: { test: 'off' } },
};
export default meta;

const read = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const styles = html`<style>
  .f-grid {
    display: grid;
    gap: var(--heru-space-4);
    font-family: var(--heru-font-family-sans);
    color: var(--heru-color-text);
  }
  .f-ramp {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
    gap: var(--heru-space-3);
  }
  .f-sw {
    border: var(--heru-border-width) solid var(--heru-color-border);
    border-radius: var(--heru-radius-5);
    overflow: hidden;
    background: var(--heru-color-bg);
  }
  .f-chip {
    block-size: 64px;
  }
  .f-meta {
    padding: var(--heru-space-2);
    font: var(--heru-text-caption-font-weight)
      var(--heru-text-caption-font-size) / var(--heru-text-caption-line-height)
      var(--heru-font-family-mono);
  }
  .f-meta b {
    display: block;
    font-family: var(--heru-font-family-sans);
    font-weight: 600;
  }
  .f-row {
    display: flex;
    align-items: center;
    gap: var(--heru-space-4);
    font-family: var(--heru-font-family-mono);
    font-size: var(--heru-font-size-12);
  }
  .f-bar {
    block-size: var(--heru-space-4);
    background: var(--heru-color-accent);
    border-radius: var(--heru-radius-1);
  }
  .f-box {
    inline-size: 64px;
    block-size: 64px;
    background: var(--heru-color-surface);
    border: var(--heru-border-width) solid var(--heru-color-border-strong);
  }
  h3.f-h {
    margin: var(--heru-space-6) 0 var(--heru-space-2);
    font-size: var(--heru-font-size-16);
  }
  .f-muted {
    color: var(--heru-color-text-muted);
  }
</style>`;

const swatch = (name: string) => {
  const v = `--heru-color-${name}`;
  return html`<div class="f-sw">
    <div class="f-chip" style="background: var(${v})"></div>
    <div class="f-meta"><b>${name}</b>${read(v)}</div>
  </div>`;
};

const ramps = {
  slate: [
    '0',
    '50',
    '100',
    '200',
    '300',
    '400',
    '500',
    '600',
    '700',
    '800',
    '900',
    '950',
  ],
  red: ['50', '600', '700'],
};
const semantic = [
  'bg',
  'surface',
  'text',
  'text-muted',
  'border',
  'border-strong',
  'accent',
  'accent-hover',
  'accent-active',
  'on-accent',
  'focus-ring',
  'error',
  'error-text',
];

export const Color: StoryObj = {
  render: () =>
    html`${styles}
      <div class="f-grid">
        <p class="f-muted">
          Use the semantic names in components and themes. Ramps exist to feed
          them.
        </p>
        <h3 class="f-h">Semantic</h3>
        <div class="f-ramp">${semantic.map(swatch)}</div>
        ${Object.entries(ramps).map(
          ([ramp, steps]) =>
            html`<h3 class="f-h">${ramp}</h3>
              <div class="f-ramp">
                ${steps.map((s) => swatch(`${ramp}-${s}`))}
              </div>`,
        )}
      </div>`,
};

export const Spacing: StoryObj = {
  render: () =>
    html`${styles}
      <div class="f-grid">
        <p class="f-muted">space-N = N × 4px. Fixed across density modes.</p>
        ${[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map(
          (n) =>
            html`<div class="f-row">
              <span style="inline-size: 120px">--heru-space-${n}</span
              ><span style="inline-size: 48px">${n * 4}px</span>
              <div
                class="f-bar"
                style="inline-size: var(--heru-space-${n})"
              ></div>
            </div>`,
        )}
      </div>`,
};

export const Radius: StoryObj = {
  render: () =>
    html`${styles}
      <div class="f-row" style="flex-wrap: wrap">
        ${['none', '1', '3', '5', '7', '9', '11', 'full'].map(
          (r) =>
            html`<div
              style="display: grid; gap: var(--heru-space-2); justify-items: center"
            >
              <div
                class="f-box"
                style="border-radius: var(--heru-radius-${r})"
              ></div>
              <span>radius-${r}</span>
            </div>`,
        )}
      </div>`,
};

const roles = [
  'heading-1',
  'heading-2',
  'heading-3',
  'body-lg',
  'body',
  'label',
  'caption',
  'code',
];
export const Typography: StoryObj = {
  render: () =>
    html`${styles}
      <div class="f-grid">
        ${roles.map(
          (r) =>
            html`<div class="f-row" style="align-items: baseline">
              <span style="inline-size: 160px">--heru-text-${r}-*</span>
              <span
                style="font-family: var(--heru-text-${r}-font-family); font-size: var(--heru-text-${r}-font-size); line-height: var(--heru-text-${r}-line-height); font-weight: var(--heru-text-${r}-font-weight); color: var(--heru-color-text)"
                >The quick brown fox jumps over the lazy dog</span
              >
            </div>`,
        )}
      </div>`,
};

/** Tab through: the ring grows in over --heru-duration-default on --heru-ease-spring. */
export const Focus: StoryObj = {
  parameters: { a11y: { test: 'error' } },
  render: () =>
    html`${styles}
      <div class="f-grid" style="max-inline-size: 360px">
        <p class="f-muted">
          Press Tab. Ring = ${read('--heru-focus-ring-width')} at
          ${read('--heru-focus-ring-offset')} offset with a
          ${read('--heru-focus-ring-blur')} blur. Instant with reduced motion.
        </p>
        <heru-button type="button">Focus me</heru-button>
        <heru-text-input label="Or me"></heru-text-input>
      </div>`,
};

/** Shared elevation: one scale for menus, popovers, dialogs and status boxes. */
export const Elevation: StoryObj = {
  render: () =>
    html`${styles}
      <div class="f-grid" style="gap: 32px; padding: 16px">
        ${(
          [
            ['default', 'Resting raised surface: open menu, popover, dialog'],
            ['hover', 'Interactive item on hover or press'],
            ['urgent', 'Error-urgent: attached field status (red-tinted)'],
          ] as const
        ).map(
          ([level, use]) =>
            html`<div class="f-row">
              <div
                style="inline-size: 120px; block-size: 64px; border-radius: var(--heru-radius-7); background: var(--heru-color-bg); box-shadow: var(--heru-elevation-${level})"
              ></div>
              <span
                >--heru-elevation-${level}<br /><span class="f-muted"
                  >${use}</span
                ></span
              >
            </div>`,
        )}
      </div>`,
};
