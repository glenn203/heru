---
'@glenn203/prism': minor
---

Smoother switch. The thumb is now two springs, one per edge, so it stretches while it travels and settles with a slight overshoot; on and off take the same time (about 400ms). A second tap, a press or the release of a drag takes the move over from the exact position and speed it has, so nothing snaps. The track fill, thumb and border colours and the pass of light are driven by the thumb's position on one clock, and only transform and opacity animate (no clip-path). Press and hold widens the thumb, and the thumb can be dragged (past the middle, or flicked) to turn the switch. A change from code moves the same way as a click, and nothing animates on first paint. `--prism-switch-duration` scales the whole move. Reduced motion is unchanged: no motion, a 120ms colour change.
