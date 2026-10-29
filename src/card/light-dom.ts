import { render, type TemplateResult } from 'lit';

/** Marks nodes the card family generates in its own light DOM. */
export const GENERATED_ATTR = 'data-prism-generated';

/**
 * Renders a template into a generated light-DOM child of `host` that is
 * assigned to the named slot, or removes it when `template` is null.
 *
 * Why light DOM: the opt-in theme styles `prism-button` and friends from the
 * document, and document selectors cannot reach into a shadow root. Controls
 * the card family adds itself (Retry, Clear selection, the pager) therefore
 * live in the light DOM so they get the same look as any other button. The
 * container is `display: contents`, so it never takes part in layout.
 */
export function renderLight(
  host: HTMLElement,
  slot: string,
  template: TemplateResult | null,
): void {
  const existing = [...host.children].find(
    (c) => c.hasAttribute(GENERATED_ATTR) && c.getAttribute('slot') === slot,
  ) as HTMLElement | undefined;
  if (!template) {
    existing?.remove();
    return;
  }
  const box = existing ?? document.createElement('div');
  if (!existing) {
    box.setAttribute(GENERATED_ATTR, '');
    box.setAttribute('slot', slot);
    box.style.display = 'contents';
    host.append(box);
  }
  render(template, box);
}

/** An author-supplied (not generated) child assigned to a slot. */
export function authored(host: Element, slot: string): Element | null {
  return (
    [...host.children].find(
      (c) => !c.hasAttribute(GENERATED_ATTR) && c.getAttribute('slot') === slot,
    ) ?? null
  );
}
