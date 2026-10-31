---
'@glenn203/prism': minor
---

Progress restyled. The track loses its border and gets a faint inset edge shadow (`--prism-elevation-track`, from `--prism-color-track-shadow`: 6% in light, 30% in dark). The fill is now a gradient over its filled width: the full tone colour at the leading edge, lifted toward white (`--prism-color-lift`) at the left by `--prism-progress-fill-lift` (18% light, 40% dark). Both ends hold 3:1 on the track for every tone in both themes, on sRGB and P3. Forced colours keep a real border and a flat fill.
