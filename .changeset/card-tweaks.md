---
'@glenn203/prism': patch
---

Card tweaks: the widget error Retry is now an outline small button, every icon button and menu trigger inside a card is size small (24/32/40px by density, never under 24px), `prism-menu` gains a provisional `size`, header actions keep an 8px gap, and `prism-card-list` puts `role="list"` on an inner wrapper so the selected count, pager and status region sit outside the list (fixes axe `aria-required-children`).
