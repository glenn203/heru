---
'@glenn203/prism': minor
---

New `prism-checkbox`, `prism-radio` and `prism-radio-group`, with the same spring motion as the switch. Checkbox: indeterminate, required, description and error slots, form value and reset; pressing squishes the box, the fill grows from the centre and the check is drawn in with a tiny overshoot, and the dash and check turn into each other. Radio group: roving tab stop, arrow keys that move and pick (wrapping, skipping disabled, right-to-left aware), one form value; the new dot springs in as the old one shrinks out. Every move can be taken over mid-flight from its exact position and speed, a change from code moves like a click, nothing animates on first paint, and reduced motion changes state at once with a 120ms colour fade. The switch's spring maths moved to a shared internal module.
