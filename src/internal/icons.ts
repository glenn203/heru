import { svg, html, type TemplateResult } from 'lit';

/**
 * Private, minimal inline icons (16px, 1.5px stroke, currentColor,
 * aria-hidden). Placeholder until the icon-system decision (Font Awesome vs
 * Lucide/Phosphor, undecided) — swap this module, not the components.
 */
const icon = (body: TemplateResult): TemplateResult =>
  html`<svg
    part="icon"
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    ${body}
  </svg>`;

export const iconEye = () =>
  icon(
    svg`<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="2"/>`,
  );
export const iconEyeOff = () =>
  icon(
    svg`<path d="M6.6 3.7A6.4 6.4 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5a11 11 0 0 1-1.7 2.2M4.3 4.9C2.5 6 1.5 8 1.5 8S4 12.5 8 12.5c1.3 0 2.4-.4 3.3-1"/><path d="M6.6 6.6a2 2 0 0 0 2.8 2.8"/><path d="M2 2l12 12"/>`,
  );
export const iconX = () => icon(svg`<path d="M4 4l8 8M12 4l-8 8"/>`);
export const iconSearch = () =>
  icon(svg`<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>`);
