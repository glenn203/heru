/**
 * Private. Tracks "held down" for a control's press squish: a primary pointer
 * press, or Space. Letting go is reported at once; the click that follows then
 * takes over the move from where the release left it.
 */
export class Press {
  held = false;

  constructor(
    private readonly host: { requestUpdate(): void },
    private readonly canPress: () => boolean,
    private readonly onChange: () => void,
  ) {}

  down = (e: PointerEvent | KeyboardEvent): void => {
    const isKey = e instanceof KeyboardEvent;
    if (isKey ? e.key !== ' ' || e.repeat : e.button !== 0 || !e.isPrimary)
      return;
    if (!this.canPress()) return;
    this.#set(true);
  };

  /** Key presses: Space squishes; Enter does nothing, as on a native checkbox or radio. */
  keyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') e.preventDefault();
    else this.down(e);
  };

  up = (): void => this.#set(false);

  /** Drops the press at once (disconnect, disabled). */
  clear(): void {
    this.held = false;
  }

  #set(held: boolean): void {
    if (this.held === held) return;
    this.held = held;
    this.onChange();
    // Re-render so the rest style matches the pose the move ends on.
    this.host.requestUpdate();
  }
}
