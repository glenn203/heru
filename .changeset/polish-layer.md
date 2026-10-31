---
'@glenn203/prism': minor
---

Add an opt-in polish layer (`@glenn203/prism/polish.css` plus `enablePolish()`): squircle corners behind `--prism-corner-shape` (with `@supports` and a scaled radius, falling back to the normal radius), a light-following gradient border on hover and keyboard focus for buttons and clickable or raised cards, and a subtle 2.5 degree tilt on cards only. Turn it on with `data-prism-polish` on any ancestor (`all`, `squircle`, `light`, `tilt`, or `off`). Inert without the attribute; off on touch and under reduced motion (corners stay). Adds a `Foundations/Polish` story page and a toolbar toggle.
