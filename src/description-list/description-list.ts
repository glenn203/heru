import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

/**
 * Label and value pairs about one thing: OS, Lumen OS; Sensor, 7.14.2. This
 * is a description list (it is not a Tag).
 * `prism-description-list` holds `prism-description-list-item`s. PROVISIONAL props:
 * `orientation` and `label`.
 *
 * - `orientation="horizontal"` (default): labels in one column, values in the
 *   next, aligned across rows (a subgrid). `vertical` puts each label above
 *   its value.
 * - Semantics: the list is a `list` of `listitem`s; each label is a `term` and
 *   each value a `definition`, so a screen reader says "Sensor, 7.14.2".
 *   Give the list a `label` when it is not already named by a heading.
 *
 * @tag prism-description-list
 * @slot - The `prism-description-list-item`s.
 * @csspart base - The grid.
 */
export class PrismDescriptionList extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-inline-size: 0;
    }
    :host([hidden]) {
      display: none;
    }
    [part='base'] {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      column-gap: var(--prism-space-4, 1rem);
      row-gap: var(--prism-space-1, 0.25rem);
    }
    :host([orientation='vertical']) [part='base'] {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--prism-space-2, 0.5rem);
    }
  `;

  @property({ reflect: true }) orientation: 'horizontal' | 'vertical' =
    'horizontal';
  /** Names the list when no heading does. */
  @property() label = '';

  override render() {
    return html`<div
      part="base"
      role="list"
      aria-label=${ifDefined(this.label || undefined)}
    >
      <slot></slot>
    </div>`;
  }
}
