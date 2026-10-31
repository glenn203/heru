---
'@glenn203/prism': minor
---

Lighter state layer. Hover is now 6% (was 8%), selected 11% (was 14%) and selected+hover 15% (was 18%); pressed stays 12%. Selected+hover is its own token, `--prism-state-selected-hover`. Every component that uses the shared state layer (buttons, icon buttons, options, cards) follows. A pressed toggle button now also underlines its label, so the lighter selected tint is never the only cue.
