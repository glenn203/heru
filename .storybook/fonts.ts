/**
 * Storybook-only font switcher data. The package ships no fonts and the tokens
 * are not touched: the toolbar sets `--prism-font-family-sans` (and the mono
 * family for Geist) on the preview root, and loads the chosen family from Google
 * Fonts on demand. Inter is the default and the one CI's metric tests use.
 */
export interface FontChoice {
  /** Toolbar label and the value stored in `globals.font`. */
  name: string;
  /** CSS font-family stack for `--prism-font-family-sans`. */
  sans: string;
  /** Optional mono stack for `--prism-font-family-mono`. */
  mono?: string;
  /** Google Fonts css2 `family=` parts to load, empty for the default. */
  families: string[];
}

const FALLBACK = 'ui-sans-serif, system-ui, sans-serif';

export const FONTS: FontChoice[] = [
  {
    name: 'Inter',
    sans: `Inter, ${FALLBACK}`,
    families: ['Inter:wght@400;500;600;700'],
  },
  {
    name: 'Geist',
    sans: `Geist, ${FALLBACK}`,
    mono: '"Geist Mono", ui-monospace, SFMono-Regular, monospace',
    families: ['Geist:wght@400;500;600;700', 'Geist+Mono:wght@400;500'],
  },
  {
    name: 'Figtree',
    sans: `Figtree, ${FALLBACK}`,
    families: ['Figtree:wght@400;500;600;700'],
  },
  {
    name: 'Manrope',
    sans: `Manrope, ${FALLBACK}`,
    families: ['Manrope:wght@400;500;600;700'],
  },
  {
    name: 'Plus Jakarta Sans',
    sans: `"Plus Jakarta Sans", ${FALLBACK}`,
    families: ['Plus+Jakarta+Sans:wght@400;500;600;700'],
  },
  {
    name: 'Onest',
    sans: `Onest, ${FALLBACK}`,
    families: ['Onest:wght@400;500;600;700'],
  },
];

export const DEFAULT_FONT = 'Inter';

const loaded = new Set<string>();

/** Adds the Google Fonts stylesheet for a choice once. */
export function loadFont(choice: FontChoice): void {
  if (choice.name === DEFAULT_FONT || loaded.has(choice.name)) return;
  loaded.add(choice.name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${choice.families
    .map((f) => `family=${f}`)
    .join('&')}&display=swap`;
  link.dataset['prismFont'] = choice.name;
  document.head.append(link);
}

/** Sets or clears the preview-only overrides on the document root. */
export function applyFont(name: string, root: HTMLElement): void {
  const choice = FONTS.find((f) => f.name === name) ?? FONTS[0]!;
  loadFont(choice);
  if (choice.name === DEFAULT_FONT) {
    root.style.removeProperty('--prism-font-family-sans');
    root.style.removeProperty('--prism-font-family-mono');
    return;
  }
  root.style.setProperty('--prism-font-family-sans', choice.sans);
  if (choice.mono)
    root.style.setProperty('--prism-font-family-mono', choice.mono);
  else root.style.removeProperty('--prism-font-family-mono');
}
