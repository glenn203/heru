---
'@glenn203/prism': minor
---

Add `PrismCardList.moveCardTo(card, target, index?)` for app-defined move items such as "Move to row 2": it announces like a drag, fires `prism-card-reorder` and keeps focus on the card's menu button. An empty reorderable list no longer has the `list` role (it is a drop zone), and the dimmed original is `inert` during a pointer drag. Adds the "Dashboard rows" recipe.
