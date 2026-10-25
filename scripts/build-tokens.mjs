#!/usr/bin/env node
// Zero-dependency DTCG token build for Prism.
// Input:  tokens/prism.tokens.json
// Output: src/tokens/tokens.css            (calc() chains on --prism-unit + density vars)
//         tokens/prism.tokens.resolved.json (every value resolved to px per density mode)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oklchToHex } from './oklch.mjs';
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
function toCss(t) {
  const { value, path } = t;
  if (path.join('.') === 'unit') return `${parseFloat(value) / 16}rem`;
  if (springs.has(path.join('.'))) return springs.get(path.join('.')).css;
  if (t.type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
  if (Array.isArray(value))
    return value.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
  if (typeof value === 'number') return String(value);
  if (!value.includes('{')) return value;
  assertRefs(value, path.join('.'));
  // Colours/shadows built with color-mix(): refs become var(), no calc().
  if (['color', 'shadow'].includes(t.type) && !/^\{[^}]+\}$/.test(value))
    return value.replace(REF, (_, r) => `var(${cssName(r)})`);
  // A bare alias stays a plain var(); expressions become calc()/max().
  if (/^\{[^}]+\}$/.test(value)) return `var(${cssName(value.slice(1, -1))})`;
  const body = value.replace(REF, (_, r) => `var(${cssName(r)})`);
  return body.startsWith('max(') ? body : `calc(${body})`;
}

// ---------- Resolution ----------
function resolveValue(path, mode, seen = new Set()) {
  if (seen.has(path)) throw new Error(`Circular reference at ${path}`);
  seen.add(path);
  const t = byPath.get(path);
  if (t.modes && typeof t.modes === 'object' && !Array.isArray(t.modes))
    return t.modes[mode];
  const v = t.value;
  if (path === 'unit') return UNIT_PX;
  if (typeof v === 'number' || Array.isArray(v)) return v;
  if (/^\{[^}]+\}$/.test(v))
    return resolveValue(v.slice(1, -1), mode, new Set(seen));
  if (['color', 'shadow'].includes(t.type) && v.includes('{'))
    return resolveMix(v, mode, seen);
  if (
    ['color', 'duration', 'cubicBezier', 'shadow', 'percentage'].includes(
      t.type,
    )
  )
    return v;
  if (!v.includes('{')) return v.endsWith('px') ? parseFloat(v) : Number(v);
  const expr = v.replace(REF, (_, r) =>
    String(resolveValue(r, mode, new Set(seen))),
  );
  if (!/^[\d\s.+\-*/(),max]+$/.test(expr))
    throw new Error(`Unsafe expression for ${path}: ${expr}`);
  return Function('max', `return (${expr});`)(Math.max);
}

// color-mix(in oklch, {ref} N%, transparent) → the ref's oklch() at alpha N.
// (Mixing an opaque colour with transparent in oklch keeps L/C/H exactly.)
function resolveMix(v, mode, seen) {
  const out = v.replace(
    /color-mix\(in oklch, \{([^}]+)\} ([\d.]+)%, transparent\)/g,
    (_, ref, pct) => {
      const base = resolveValue(ref, mode, new Set(seen));
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
const rest = tokens.filter((t) => t.path[0] !== 'density');
const fixed = rest.filter((t) => !dependsOnDensity(t));
const scoped = rest.filter((t) => dependsOnDensity(t));
css += `\n:root {\n`;
for (const t of fixed) css += `  ${cssName(t.path.join('.'))}: ${toCss(t)};\n`;
css += `}\n`;
// Literal fallbacks for engines without color-mix() (Safari < 16.2 etc.).
const mixed = fixed.filter(
  (t) => typeof t.value === 'string' && t.value.includes('color-mix('),
);
if (mixed.length) {
  css += `\n/* Fallback for engines without color-mix(): resolved literals. */\n@supports not (color: color-mix(in oklch, red, blue)) {\n  :root {\n`;
  for (const t of mixed)
    css += `    ${cssName(t.path.join('.'))}: ${resolveValue(t.path.join('.'), 'default')};\n`;
  css += `  }\n}\n`;
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

// ---------- Emit resolved JSON ----------
const resolved = {
  $description:
    'Resolved Prism tokens per density mode (dimensions in px; colors as oklch() with an sRGB hex fallback). Generated; do not edit.',
  unit: 'px',
  modes: {},
};
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
    if (t.type === 'color') out[key].hex = oklchToHex(out[key].value);
  }
  resolved.modes[mode] = out;
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
