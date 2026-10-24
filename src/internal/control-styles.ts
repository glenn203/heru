import { css, unsafeCSS } from 'lit';

/**
 * Structural sizing shared by controls. Every value reads a --heru- token with
 * a literal fallback equal to the default-density value, so components size
 * correctly without tokens.css. Density switching via [data-heru-density]
 * works once tokens.css is loaded (it defines the density-scoped tokens).
 */
export const controlSize = css`
  :host {
    --_heru-control-height: var(--heru-control-height-md, 2.25rem);
  }
  :host([size='sm']) {
    --_heru-control-height: var(--heru-control-height-sm, 2rem);
  }
  :host([size='lg']) {
    --_heru-control-height: var(--heru-control-height-lg, 2.75rem);
  }
`;

export const controlBox = css`
  box-sizing: border-box;
  block-size: var(--_heru-control-height);
  padding-block: 0;
  padding-inline: var(--heru-control-padding-inline, 0.75rem);
  border-width: var(--heru-border-width, 1px);
  border-style: solid;
  border-color: transparent;
  border-radius: var(--heru-radius-5, 5px);
`;

/** Text-role font shorthand. role = label | body | caption */
export const textRole = (role: 'label' | 'body' | 'caption') => {
  const fallback = {
    label: ['0.875rem', '1.25rem', '500'],
    body: ['0.875rem', '1.25rem', '400'],
    caption: ['0.75rem', '1rem', '400'],
  }[role];
  const r = role;
  return css`
    font-family: var(
      --heru-text-${unsafeCSS(r)}-font-family,
      Inter,
      ui-sans-serif,
      system-ui,
      sans-serif
    );
    font-size: var(
      --heru-text-${unsafeCSS(r)}-font-size,
      ${unsafeCSS(fallback[0])}
    );
    line-height: var(
      --heru-text-${unsafeCSS(r)}-line-height,
      ${unsafeCSS(fallback[1])}
    );
    font-weight: var(
      --heru-text-${unsafeCSS(r)}-font-weight,
      ${unsafeCSS(fallback[2])}
    );
  `;
};
