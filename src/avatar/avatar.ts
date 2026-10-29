import { LitElement, css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Up to two initials: first letter of the first and last word. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = [...(words[0] as string)][0] ?? '';
  const last =
    words.length > 1 ? [...(words[words.length - 1] as string)][0] : '';
  return (first + (last ?? '')).toLocaleUpperCase();
}

/**
 * A picture or initials that stands for a person or thing. Common props:
 * `name`, `src`, `size`, `shape`. NAMES PROVISIONAL.
 *
 * - With `src` it shows the image, and falls back to initials if the image
 *   fails to load. With no `src` it shows the initials of `name`.
 * - The accessible name is `name` (role `img`). When the name is already
 *   written next to the avatar (a card title, a list row), set `decorative`
 *   so it is hidden from assistive tech instead of read twice.
 * - Sizes are 24 / 32 / 40 / 48 / 64px: `xs`, `sm`, `md` (default), `lg`, `xl`.
 * - Initials sit on a neutral fill; the picture or letters carry the meaning,
 *   never a colour per person.
 *
 * @tag prism-avatar
 * @csspart base - The circle or square.
 * @csspart image - The picture.
 * @csspart initials - The initials.
 */
export class PrismAvatar extends LitElement {
  static override styles = css`
    :host {
      --_avatar-size: 2.5rem;
      display: inline-flex;
      flex: none;
      vertical-align: middle;
    }
    :host([size='xs']) {
      --_avatar-size: 1.5rem;
    }
    :host([size='sm']) {
      --_avatar-size: 2rem;
    }
    :host([size='lg']) {
      --_avatar-size: 3rem;
    }
    :host([size='xl']) {
      --_avatar-size: 4rem;
    }
    :host([hidden]) {
      display: none;
    }
    [part='base'] {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: var(--_avatar-size);
      block-size: var(--_avatar-size);
      overflow: hidden;
      border-radius: 50%;
      font-family: var(--prism-font-family-sans, Inter, sans-serif);
      font-size: calc(var(--_avatar-size) * 0.4);
      line-height: 1;
      font-weight: var(--prism-font-weight-medium, 500);
      user-select: none;
    }
    :host([shape='square']) [part='base'] {
      border-radius: var(--prism-radius-5, 5px);
    }
    [part='image'] {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
  `;

  /** Required. The person or thing: names the avatar and makes the initials. */
  @property() name = '';
  /** Picture URL. */
  @property() src?: string;
  @property({ reflect: true }) size: AvatarSize = 'md';
  @property({ reflect: true }) shape: 'circle' | 'square' = 'circle';
  /** The name is written beside it: hide the avatar from assistive tech. */
  @property({ type: Boolean, reflect: true }) decorative = false;

  @state() private failed = false;

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('src')) this.failed = false;
  }

  override updated(): void {
    if (!this.name && !this.decorative)
      console.error(
        '[prism-avatar] `name` is required (or set `decorative` when the name is written beside it).',
        this,
      );
  }

  override render() {
    const image = this.src && !this.failed;
    return html`<span
      part="base"
      role=${this.decorative ? 'presentation' : 'img'}
      aria-label=${this.decorative || !this.name ? nothing : this.name}
      aria-hidden=${this.decorative ? 'true' : nothing}
      >${
        image
          ? html`<img
              part="image"
              alt=""
              src=${this.src}
              @error=${() => (this.failed = true)}
            />`
          : html`<span part="initials" aria-hidden="true"
              >${initialsOf(this.name)}</span
            >`
      }</span
    >`;
  }
}
