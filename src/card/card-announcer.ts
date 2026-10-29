/**
 * The reorder announcements, word for word from the card spec ("Announcements").
 * One visually hidden polite live region per list says each of these once.
 * Positions are 1-based and come from the data (`total` when the list pages).
 */
export const reorderMessages = {
  pickedUp: (title: string, position: number, total: number): string =>
    `Picked up ${title}, position ${String(position)} of ${String(total)}.`,
  moved: (title: string, from: number, to: number, total: number): string =>
    `${title} moved from position ${String(from)} to position ${String(to)} of ${String(total)}.`,
  canceled: (title: string, position: number, total: number): string =>
    `Move canceled. ${title} is at position ${String(position)} of ${String(total)}.`,
  betweenLists: (
    title: string,
    fromList: string,
    toList: string,
    position: number,
    total: number,
  ): string =>
    `${title} moved from ${fromList} to ${toList}, position ${String(position)} of ${String(total)}.`,
  saveFailed: (title: string, position: number, total: number): string =>
    `Couldn't save the new order. ${title} is back at position ${String(position)} of ${String(total)}.`,
};
