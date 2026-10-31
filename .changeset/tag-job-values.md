---
'@glenn203/prism': minor
---

Breaking: five `prism-tag` `job` values (and the matching `TagJob` members) have new names: `spectrum`, `illusionary`, `refractive-rules`, `diffusion` and `clarity`. The previous values for these jobs are removed, with no aliases, so update any `job` attribute or `TagJob` value that still uses them. `status`, `presence`, `health` and `keyword` are unchanged.
