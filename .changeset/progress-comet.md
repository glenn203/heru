---
'@glenn203/prism': minor
---

Progress comet fill. The fill now stacks a head, a tail and a lifted base over its filled width, with a soft glow ahead of the leading edge. New tokens: `--prism-progress-head-mix`, `-head-alpha`, `-head-size`, `-tail-alpha`, `-tail-max`, `-tail-min-fill`, `-glow-alpha`; `--prism-progress-fill-lift` is now 30% light and 45% dark. A fill under 24px hides its tail (`:state(tiny)`), a full bar drops the glow (`:state(full)`). Indeterminate: the comet travels in 1.6s; under reduced motion it pulses its opacity (0.6 to 1) over 2s. The head, its shoulder and the full tone hold 3:1 on the track in both themes on sRGB and P3.
