import { css, html, type TemplateResult } from 'lit';
import { textRole } from './control-styles.js';

/**
 * Private shared field chrome: label, description and error, with stable ids
 * `${id}-label|-description|-error`. Used by every Prism field. Not exported.
 */
export const fieldChromeStyles = css`
  :host {
    display: block;
  }
  :host([hidden]) {
    display: none;
  }
  [part='label'] {
    display: block;
    ${textRole('label')}
  }
  [part='description'],
  [part='error'] {
    ${textRole('caption')}
  }
  [part='description'][hidden],
  [part='error'][hidden] {
    display: none;
  }
`;

export const renderLabel = (
  id: string,
  label: string,
  forId?: string,
): TemplateResult =>
  forId
    ? html`<label part="label" id="${id}-label" for="${forId}">${label}</label>`
    : html`<span part="label" id="${id}-label">${label}</span>`;

export const renderDescription = (id: string): TemplateResult =>
  html`<div part="description" id="${id}-description">
    <slot name="description"></slot>
  </div>`;

export const renderError = (id: string): TemplateResult =>
  html`<div part="error" id="${id}-error" aria-live="polite" hidden>
    <slot name="error"></slot>
  </div>`;

/**
 * Sets aria-invalid / aria-describedby on the control and shows the error
 * only while invalid. The error is referenced only while it is shown.
 */
export function syncFieldA11y(
  root: ParentNode,
  control: Element,
  id: string,
  invalid: boolean,
  { hideDescriptionWhenInvalid = false } = {},
): void {
  control.setAttribute('aria-invalid', String(invalid));
  const describedBy =
    invalid && hideDescriptionWhenInvalid
      ? `${id}-error`
      : `${id}-description${invalid ? ` ${id}-error` : ''}`;
  control.setAttribute('aria-describedby', describedBy);
  root.querySelector('[part="error"]')?.toggleAttribute('hidden', !invalid);
}
