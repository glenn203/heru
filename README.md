# Herú

Headless web components for the Herū design system, built with [Lit](https://lit.dev).

Herú gives you behavior and nothing about how it looks. Each component handles
keyboard and focus, ARIA, and form participation, and is built on the native
element it stands for. You bring the design.

## Philosophy

- **Behavior is built in.** Keyboard support, focus, ARIA wiring and form
  participation work out of the box.
- **No visual opinions.** Components ship only the structural CSS they need to
  work. No colors, sizes, fonts or spacing.
- **Style from outside.** Reach inside with `::part()`, react to `:state()`,
  and tune the few structural knobs with CSS custom properties.
- **Many small components.** Each component does one job. Shared logic lives
  in private internals, never in one component that does everything.
- **Works anywhere.** Standard custom elements, usable from plain HTML or any
  framework.

## Install

```bash
pnpm add heru lit
```

`lit` is a peer dependency.

## Usage

Register the components you use. Class files have no side effects; the
`define` entry points register the tags.

```js
import 'heru/button/define';
import 'heru/text-field/define';
// or everything at once: import 'heru/define';
```

```html
<form>
  <heru-text-field label="Email" name="email" type="email" required>
    <span slot="description">We only use this for receipts.</span>
    <span slot="error">Enter an email address.</span>
  </heru-text-field>
  <heru-button type="submit">Save</heru-button>
</form>
```

```css
heru-button::part(base) {
  padding: 0.5rem 1rem;
  border: 1px solid currentcolor;
}

heru-button:state(disabled)::part(base) {
  opacity: 0.5;
}

heru-text-field:state(invalid)::part(input) {
  border-color: red;
}
```

To register under your own tag, import the class and define it yourself:

```js
import { HeruButton } from 'heru/button';
customElements.define('acme-button', class extends HeruButton {});
```

## Components

| Tag               | Parts                                    | States                | Slots                   |
| ----------------- | ---------------------------------------- | --------------------- | ----------------------- |
| `heru-button`     | `base`, `label`                          | `disabled`, `pressed` | default, `start`, `end` |
| `heru-text-field` | `label`, `input`, `description`, `error` | `invalid`, `disabled` | `description`, `error`  |

The full API is in `custom-elements.json`.

## Contributing

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm exec playwright install chromium
```

| Script                 | What it does                            |
| ---------------------- | --------------------------------------- |
| `pnpm build`           | Compiles `src/` to `dist/` with `tsc`   |
| `pnpm analyze`         | Writes `custom-elements.json`           |
| `pnpm lint`            | ESLint and a type check                 |
| `pnpm format`          | Prettier                                |
| `pnpm test`            | Playwright browser tests                |
| `pnpm storybook`       | Storybook on port 6006                  |
| `pnpm build-storybook` | Static Storybook in `storybook-static/` |
| `pnpm changeset`       | Records a change for the next release   |

Add a changeset with every change that affects the published package.

## License

[Apache-2.0](./LICENSE) © 2026 Chuck Bolton
