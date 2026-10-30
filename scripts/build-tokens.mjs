#!/usr/bin/env node
// Zero-dependency DTCG token build for Prism.
// Input:  tokens/prism.tokens.json
// Output: src/tokens/tokens.css            (calc() chains on --prism-unit + density vars)
//         tokens/prism.tokens.resolved.json (every value resolved to px per density mode)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oklchToHex, inSrgb, mapToGamut } from './oklch.mjs';
import { springToLinear } from './spring.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(
  readFileSync(resolve(root, 'tokens/prism.tokens.json'), 'utf8'),
);
const MODES = ['compact', 'default', 'comfortable'];
const UNIT_PX = 4;
const PREFIX = '--prism-';

/** Flatten to [{ path, value, type, modes }] */
function flatten(node, path = [], inheritedType) {
  const out = [];
  const type = node.$type ?? inheritedType;
  if ('$value' in node) {
    out.push({
      path,
      value: node.$value,
      type,
      modes: node.$extensions?.['prism.modes'],
      dark: node.$extensions?.['prism.dark'],
      spring: node.$extensions?.['prism.spring'],
    });
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$') || typeof v !== 'object' || v === null) continue;
    out.push(...flatten(v, [...path, k], type));
  }
  return out;
}

const tokens = flatten(src);
const byPath = new Map(tokens.map((t) => [t.path.join('.'), t]));
// ---------- Springs → linear() ----------
const durMs = (ref) => {
  const t = byPath.get(ref.slice(1, -1));
  if (!t) throw new Error(`Unknown spring duration ${ref}`);
  return parseFloat(t.value);
};
const springs = new Map();
for (const t of tokens) {
  if (!t.spring) continue;
  const { mass, stiffness, damping, duration } = t.spring;
  const ms = durMs(duration);
  const s = springToLinear({ mass, stiffness, damping }, ms);
  if (Math.abs(s.settleMs - ms) / ms > 0.1)
    throw new Error(
      `${t.path.join('.')}: spring settles at ${s.settleMs.toFixed(1)}ms, token ${duration} is ${ms}ms`,
    );
  springs.set(t.path.join('.'), { ...s, durationMs: ms });
}

const cssName = (p) => PREFIX + p.replaceAll('.', '-');
const REF = /\{([^}]+)\}/g;

function assertRefs(expr, where) {
  for (const [, ref] of expr.matchAll(REF)) {
    if (!byPath.has(ref))
      throw new Error(`Unknown reference {${ref}} in ${where}`);
  }
}

// ---------- CSS ----------
const valueOf = (t, theme) => (theme === 'dark' && t.dark ? t.dark : t.value);
function toCss(t, theme = 'light') {
  const { path } = t;
  const value = valueOf(t, theme);
  if (path.join('.') === 'unit') return `${parseFloat(value) / 16}rem`;
  if (springs.has(path.join('.'))) return springs.get(path.join('.')).css;
  if (t.type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
  if (Array.isArray(value))
    return value.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
  if (typeof value === 'number') return String(value);
  if (!value.includes('{')) return value;
  assertRefs(value, path.join('.'));
  // Colours/shadows built with color-mix(): refs become var(), no calc().
  if (
    ['color', 'shadow', 'gradient'].includes(t.type) &&
    !/^\{[^}]+\}$/.test(value)
  )
    return value.replace(REF, (_, r) => `var(${cssName(r)})`);
  // A bare alias stays a plain var(); expressions become calc()/max().
  if (/^\{[^}]+\}$/.test(value)) return `var(${cssName(value.slice(1, -1))})`;
  const body = value.replace(REF, (_, r) => `var(${cssName(r)})`);
  return body.startsWith('max(') ? body : `calc(${body})`;
}

// ---------- Resolution ----------
function resolveValue(path, mode, seen = new Set(), theme = 'light') {
  if (seen.has(path)) throw new Error(`Circular reference at ${path}`);
  seen.add(path);
  const t = byPath.get(path);
  if (t.modes && typeof t.modes === 'object' && !Array.isArray(t.modes))
    return t.modes[mode];
  const v = valueOf(t, theme);
  if (path === 'unit') return UNIT_PX;
  if (typeof v === 'number' || Array.isArray(v)) return v;
  if (/^\{[^}]+\}$/.test(v))
    return resolveValue(v.slice(1, -1), mode, new Set(seen), theme);
  if (t.type === 'gradient')
    return v.replace(REF, (_, r) =>
      resolveValue(r, mode, new Set(seen), theme),
    );
  if (['color', 'shadow'].includes(t.type) && v.includes('{'))
    return resolveMix(v, mode, seen, theme);
  if (
    ['color', 'duration', 'cubicBezier', 'shadow', 'percentage'].includes(
      t.type,
    )
  )
    return v;
  if (!v.includes('{')) return v.endsWith('px') ? parseFloat(v) : Number(v);
  const expr = v.replace(REF, (_, r) =>
    String(resolveValue(r, mode, new Set(seen), theme)),
  );
  if (!/^[\d\s.+\-*/(),max]+$/.test(expr))
    throw new Error(`Unsafe expression for ${path}: ${expr}`);
  return Function('max', `return (${expr});`)(Math.max);
}

// color-mix(in oklch, {ref} N%, transparent) → the ref's oklch() at alpha N.
// (Mixing an opaque colour with transparent in oklch keeps L/C/H exactly.)
function resolveMix(v, mode, seen, theme) {
  const out = v.replace(
    /color-mix\(in oklch, \{([^}]+)\} ([\d.]+)%, transparent\)/g,
    (_, ref, pct) => {
      const base = resolveValue(ref, mode, new Set(seen), theme);
      const m = /^oklch\(([^/)]+)\)$/.exec(base);
      if (!m) throw new Error(`color-mix base must be opaque oklch(): ${ref}`);
      return `oklch(${m[1].trim()} / ${Number(pct) / 100})`;
    },
  );
  if (out.includes('{') || out.includes('color-mix'))
    throw new Error(`Unsupported colour expression: ${v}`);
  return out;
}

// ---------- Emit CSS ----------
const OKLCH_TEST = '(color: oklch(0 0 0))';
const MIX_TEST = '(color: color-mix(in oklch, red, blue))';
const GRADIENT_TEST =
  '(background-image: linear-gradient(in oklch, red, blue))';
const hexify = (s) => s.replace(/oklch\([^)]*\)/g, (m) => oklchToHex(m));
const isLiteral = (t) =>
  t.type === 'color' && typeof t.value === 'string' && /^oklch\(/.test(t.value);
const isGradient = (t) => t.type === 'gradient';
const noInterp = (s) => s.replaceAll('in oklch ', '');
const hasMix = (t, theme) => {
  const v = valueOf(t, theme);
  return typeof v === 'string' && v.includes('color-mix(');
};
const indent2 = (str) =>
  str
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');
const block = (sel, decls, indent = '') =>
  `${indent}${sel} {\n${decls.map((d) => `${indent}  ${d};`).join('\n')}\n${indent}}\n`;

const densityTokens = tokens.filter((t) => t.path[0] === 'density');
const header = `/* Generated by scripts/build-tokens.mjs from tokens/prism.tokens.json. Do not edit. */\n`;
let css = header + `\n:root,\n[data-prism-density='default'] {\n`;
for (const t of densityTokens)
  css += `  ${cssName(t.path.join('.'))}: ${t.modes.default};\n`;
css += `}\n`;
for (const mode of MODES.filter((m) => m !== 'default')) {
  css += `\n[data-prism-density='${mode}'] {\n`;
  for (const t of densityTokens)
    css += `  ${cssName(t.path.join('.'))}: ${t.modes[mode]};\n`;
  css += `}\n`;
}
// Density-dependent tokens must be re-declared on every density scope, otherwise a
// calc() computed on :root would be inherited with the root's density baked in.
const dependsOnDensity = (t, seen = new Set()) => {
  if (t.path[0] === 'density') return true;
  if (typeof t.value !== 'string') return false;
  for (const [, r] of t.value.matchAll(REF)) {
    if (seen.has(r)) continue;
    seen.add(r);
    if (!byPath.has(r))
      throw new Error(`Unknown reference {${r}} in ${t.path.join('.')}`);
    if (dependsOnDensity(byPath.get(r), seen)) return true;
  }
  return false;
};
// Same idea for the dark theme: a token that is, or is built from, a token
// with a dark value must be re-declared in every theme scope, because custom
// properties inherit as resolved values.
const dependsOnDark = (t, seen = new Set()) => {
  if (t.dark) return true;
  for (const v of [t.value, t.dark]) {
    if (typeof v !== 'string') continue;
    for (const [, r] of v.matchAll(REF)) {
      if (seen.has(r)) continue;
      seen.add(r);
      if (dependsOnDark(byPath.get(r), seen)) return true;
    }
  }
  return false;
};
const rest = tokens.filter((t) => t.path[0] !== 'density');
const fixed = rest.filter((t) => !dependsOnDensity(t));
const scoped = rest.filter((t) => dependsOnDensity(t));
const themed = fixed.filter((t) => dependsOnDark(t));

// Display P3: a literal that leaves sRGB is written gamut-mapped (chroma
// lowered at the same lightness and hue) in the base declaration, and in full
// inside @media (color-gamut: p3). Engines without oklch() get hex.
const vivid = fixed.filter((t) => isLiteral(t) && !inSrgb(t.value));
const baseCss = (t) => {
  if (isLiteral(t) && !inSrgb(t.value)) return mapToGamut(t.value);
  if (isGradient(t)) return noInterp(toCss(t));
  return toCss(t);
};

css += `\n:root {\n  color-scheme: light;\n`;
for (const t of fixed)
  css += `  ${cssName(t.path.join('.'))}: ${baseCss(t)};\n`;
css += `}\n`;
if (vivid.length) {
  css += `\n/* Display P3 screens: the full-chroma colours. */\n@media (color-gamut: p3) {\n`;
  css += block(
    ':root',
    vivid.map((t) => `${cssName(t.path.join('.'))}: ${t.value}`),
    '  ',
  );
  css += `}\n`;
}
const gradients = fixed.filter(isGradient);
if (gradients.length) {
  css += `\n/* Interpolate gradients in oklch where supported. */\n@supports ${GRADIENT_TEST} {\n`;
  css += block(
    ':root',
    gradients.map((t) => `${cssName(t.path.join('.'))}: ${toCss(t)}`),
    '  ',
  );
  css += `}\n`;
}
// Literal fallbacks for engines without color-mix() (Safari < 16.2 etc.).
const mixed = fixed.filter((t) => hasMix(t, 'light'));
if (mixed.length) {
  css += `\n/* Fallback for engines without color-mix(): resolved literals. */\n@supports not ${MIX_TEST} {\n`;
  css += block(
    ':root',
    mixed.map(
      (t) =>
        `${cssName(t.path.join('.'))}: ${resolveValue(t.path.join('.'), 'default')}`,
    ),
    '  ',
  );
  css += `}\n`;
}
if (springs.size) {
  css += `\n/* Fallback for engines without linear(): the token's cubic-bezier $value. */\n@supports not (animation-timing-function: linear(0, 1)) {\n  :root {\n`;
  for (const k of springs.keys())
    css += `    ${cssName(k)}: cubic-bezier(${byPath.get(k).value.join(', ')});\n`;
  css += `  }\n}\n`;
}
css += `\n:root,\n[data-prism-density] {\n`;
for (const t of scoped) css += `  ${cssName(t.path.join('.'))}: ${toCss(t)};\n`;
css += `}\n`;

// ---------- Theme scopes (light is the default; dark is opt-in) ----------
// <html data-prism-theme="dark">, "light", or "auto" (follows the OS). Any
// element can carry it. Declared after every :root block above so the
// attribute wins on the root element too.
const themeCtx = (theme, sel, scheme, media) => ({ theme, sel, scheme, media });
const ctxs = [
  themeCtx('dark', `[data-prism-theme='dark']`, 'dark'),
  themeCtx(
    'dark',
    `[data-prism-theme='auto']`,
    'dark',
    '(prefers-color-scheme: dark)',
  ),
  themeCtx('light', `[data-prism-theme='light']`, 'light'),
];
const wrap = (ctx, inner) =>
  ctx.media ? `@media ${ctx.media} {\n${indent2(inner)}}\n` : inner;
css += `\n/* Theme scopes: every token built from a themed role is re-declared. */\n`;
for (const ctx of ctxs) {
  css += wrap(
    ctx,
    block(ctx.sel, [
      `color-scheme: ${ctx.scheme}`,
      ...themed.map(
        (t) =>
          `${cssName(t.path.join('.'))}: ${isGradient(t) ? noInterp(toCss(t, ctx.theme)) : toCss(t, ctx.theme)}`,
      ),
    ]),
  );
}
const themedGradients = themed.filter(isGradient);
if (themedGradients.length) {
  css += `\n@supports ${GRADIENT_TEST} {\n`;
  for (const ctx of ctxs)
    css += indent2(
      wrap(
        ctx,
        block(
          ctx.sel,
          themedGradients.map(
            (t) => `${cssName(t.path.join('.'))}: ${toCss(t, ctx.theme)}`,
          ),
        ),
      ),
    );
  css += `}\n`;
}
const themedMixed = (theme) => themed.filter((t) => hasMix(t, theme));
if (themedMixed('dark').length) {
  css += `\n@supports not ${MIX_TEST} {\n`;
  for (const ctx of ctxs)
    css += indent2(
      wrap(
        ctx,
        block(
          ctx.sel,
          themedMixed(ctx.theme).map(
            (t) =>
              `${cssName(t.path.join('.'))}: ${resolveValue(t.path.join('.'), 'default', new Set(), ctx.theme)}`,
          ),
        ),
      ),
    );
  css += `}\n`;
}

// Engines without oklch(): hex for every literal colour, and for mixed
// tokens (with alpha) in every theme scope. Last, so it wins where it applies.
const literals = fixed.filter(isLiteral);
css += `\n/* Fallback for engines without oklch(): sRGB hex. */\n@supports not ${OKLCH_TEST} {\n`;
css += block(
  ':root',
  [
    ...literals.map(
      (t) => `${cssName(t.path.join('.'))}: ${oklchToHex(t.value)}`,
    ),
    ...mixed.map(
      (t) =>
        `${cssName(t.path.join('.'))}: ${hexify(resolveValue(t.path.join('.'), 'default'))}`,
    ),
  ],
  '  ',
);
for (const ctx of ctxs) {
  const needsHex = themed.filter(
    (t) =>
      hasMix(t, ctx.theme) || /^oklch\(/.test(String(valueOf(t, ctx.theme))),
  );
  const inner = block(
    ctx.sel,
    needsHex.map(
      (t) =>
        `${cssName(t.path.join('.'))}: ${hexify(resolveValue(t.path.join('.'), 'default', new Set(), ctx.theme))}`,
    ),
  );
  css += indent2(wrap(ctx, inner));
}
css += `}\n`;

// ---------- Emit resolved JSON ----------
const resolved = {
  $description:
    'Resolved Prism tokens per density mode (dimensions in px; colors as oklch() with an sRGB hex fallback; gamut p3 marks colours outside sRGB, whose hex is the gamut-mapped fallback). `themes.dark` holds the dark values of every themed token. Generated; do not edit.',
  unit: 'px',
  modes: {},
  themes: {},
};
function addColor(entry) {
  entry.hex = oklchToHex(entry.value);
  if (/^oklch\(/.test(entry.value) && !inSrgb(entry.value)) entry.gamut = 'p3';
}
for (const mode of MODES) {
  const out = {};
  for (const t of tokens) {
    const key = t.path.join('.');
    out[key] = {
      cssVar: cssName(key),
      type: t.type ?? 'number',
      value: resolveValue(key, mode),
    };
    const sp = springs.get(key);
    if (sp)
      Object.assign(out[key], {
        value: sp.css,
        fallback: `cubic-bezier(${t.value.join(', ')})`,
        spring: {
          ...t.spring,
          dampingRatio: +sp.zeta.toFixed(3),
          overshoot: +sp.overshoot.toFixed(4),
          settleMs: +sp.settleMs.toFixed(1),
        },
      });
    if (t.type === 'color') addColor(out[key]);
  }
  resolved.modes[mode] = out;
}
// Dark theme: only tokens whose value changes (default density).
resolved.themes.dark = {};
for (const t of themed) {
  const key = t.path.join('.');
  const entry = {
    cssVar: cssName(key),
    type: t.type ?? 'number',
    value: resolveValue(key, 'default', new Set(), 'dark'),
  };
  if (t.type === 'color') addColor(entry);
  resolved.themes.dark[key] = entry;
}

mkdirSync(resolve(root, 'src/tokens'), { recursive: true });
writeFileSync(resolve(root, 'src/tokens/tokens.css'), css);
writeFileSync(
  resolve(root, 'tokens/prism.tokens.resolved.json'),
  JSON.stringify(resolved, null, 2) + '\n',
);
console.log(
  `tokens: ${tokens.length} tokens → src/tokens/tokens.css, tokens/prism.tokens.resolved.json`,
);
