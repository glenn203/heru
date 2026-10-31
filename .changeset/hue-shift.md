---
'@glenn203/prism': minor
---

Pastel-neon hue shift. Violet 288→300 (a pinker purple), blue 250→235, cyan 210→192 (teal), green 152→160 (mint), amber 80→52 becomes 78→60, red 27→12 (rose), magenta 338→345. Lightness steps are unchanged, so every role pair keeps its contrast (text 4.5:1, non-text 3:1, both themes, sRGB and P3, lowest 4.51 non-text and 5.56 text). Chroma is pushed to 97% of the Display P3 edge at each step, so blue, teal and green are limited by the gamut at those hues. The tag and badge tints and tone text are regenerated for the new hues; sRGB fallbacks are regenerated.
