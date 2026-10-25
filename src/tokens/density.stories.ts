import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../define.js';

const meta: Meta = { title: 'Foundations/Density' };
export default meta;

const modes = ['compact', 'default', 'comfortable'] as const;
const sizes = ['sm', 'md', 'lg'] as const;

/** Each column sets data-heru-density; rows show sm, md, lg. */
export const DensityModes: StoryObj = {
  render: () => html`
    <style>
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
      }
      .col > * {
        margin-block-end: 0.5rem;
      }
    </style>
    <div class="grid">
      ${modes.map(
        (d) =>
          html`<div class="col" data-heru-density=${d}>
            <h3>${d}</h3>
            ${sizes.map(
              (s) =>
                html`<heru-button type="button" size=${s}
                    >Button ${s}</heru-button
                  >
                  <heru-text-input
                    size=${s}
                    label="Field ${s}"
                  ></heru-text-input>`,
            )}
          </div>`,
      )}
    </div>
  `,
};
