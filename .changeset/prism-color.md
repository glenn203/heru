---
'@glenn203/prism': minor
---

Color palette. A refraction spectrum (violet, blue, cyan, green, amber, red, magenta) and an airy slate neutral, written in OKLCH for Display P3 with sRGB fallbacks (`@media (color-gamut: p3)` and hex). New roles: `accent-text`, `accent-surface`, `on-solid`, `neutral`, and `info`, `success`, `warning` and `danger` with `-text` and `-surface`. The accent is now vivid violet and the focus ring follows it. Tones read these roles. Adds the `data-prism-theme` light, dark and auto themes, three gradient tokens (`spectrum`, `refract`, `mist`), a Foundations / Color page and a Storybook theme switcher. Existing token names are unchanged.
