let counter = 0;
/** Private: unique id for wiring ARIA inside a single shadow root. */
export const uniqueId = (prefix: string): string => `${prefix}-${++counter}`;
