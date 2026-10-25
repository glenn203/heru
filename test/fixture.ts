import type { Page } from '@playwright/test';

/** Load the harness and render markup once both tags are defined. */
export async function mount(page: Page, markup: string): Promise<void> {
  await page.goto('/test/index.html');
  await page.evaluate(async (html) => {
    await customElements.whenDefined('prism-button');
    await customElements.whenDefined('prism-text-field');
    document.querySelector('#root')!.innerHTML = html;
    const elements = [
      ...document.querySelectorAll('#root *'),
    ] as (HTMLElement & {
      updateComplete?: Promise<unknown>;
    })[];
    await Promise.all(
      elements.map((el) => el.updateComplete ?? Promise.resolve()),
    );
  }, markup);
}

/** Submit-capture: records the FormData of the next submit as an object. */
export async function captureSubmit(page: Page): Promise<void> {
  await page.evaluate(() => {
    const form = document.querySelector('form')!;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form, event.submitter);
      (window as unknown as { submitted: unknown }).submitted =
        Object.fromEntries(data);
    });
  });
}

export const submitted = (page: Page) =>
  page.evaluate(() => (window as unknown as { submitted?: unknown }).submitted);
