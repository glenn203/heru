---
'@glenn203/prism': patch
---

Running indicator: now one solid dot that breathes (radius 4 to 4.6 and back, opacity 1 to 0.85 and back) with a single ring that grows from radius 4 to 9 and fades from 60% to nothing, both in the tone colour and in step. One pulse takes 1.92s, then an 800ms rest (2.72s in all), with the ring gone and the dot still in the rest. The multi-ring violet, blue and cyan drift is removed. The cycle length is set with `--prism-running-cycle` (replaces `--prism-running-duration`). Still under reduced motion.
