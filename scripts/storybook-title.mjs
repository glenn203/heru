// Brand the static <title> of the built Storybook (template default is
// "@storybook/core - Storybook"). The runtime title is handled by
// .storybook/manager.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const file = process.argv[2] ?? 'storybook-static/index.html';
const html = readFileSync(file, 'utf8');
writeFileSync(
  file,
  html.replace(/<title>[^<]*<\/title>/, '<title>Prism</title>'),
);
console.log(`storybook-title: ${file} → <title>Prism</title>`);
