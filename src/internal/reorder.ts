/**
 * Pointer-event drag and drop for reordering items in one or more lists. No
 * dependency; it knows nothing about cards (the card list supplies the item,
 * the copy and the indicator). NAME PROVISIONAL, internal.
 *
 * - Mouse and pen: a drag starts after a small move. Touch: a press and hold
 *   (so scrolling still works) starts it; moving first cancels the press.
 * - The original stays in place (the caller dims it). A copy follows the
 *   pointer; the caller builds it.
 * - A drop indicator is reported through `indicator()` as a line between items:
 *   horizontal in a single column, vertical in a grid. No allowed target means
 *   no indicator, and releasing there returns the item (`drop(item, null)`).
 * - Escape cancels. The list scrolls on its own near the edge of its scroll
 *   parent.
 */

export interface ReorderTarget {
  list: HTMLElement;
  /** The items of that list, in order (the dragged item may be among them). */
  items: HTMLElement[];
}

export interface DropIndicator {
  list: HTMLElement;
  /** Viewport coordinates of the line. */
  x: number;
  y: number;
  length: number;
  /** A vertical line (grid) rather than a horizontal one. */
  vertical: boolean;
}

export interface DropPoint {
  list: HTMLElement;
  /** Final index of the dragged item among that list's items without it. */
  index: number;
}

export interface ReorderOptions {
  /** The item grabbed by this pointerdown path, or null to ignore it. */
  grab(path: EventTarget[]): HTMLElement | null;
  /** Lists the item may be dropped in (its own list included). */
  targets(item: HTMLElement): ReorderTarget[];
  makeCopy(item: HTMLElement): HTMLElement;
  indicator(info: DropIndicator | null): void;
  start(item: HTMLElement): void;
  /** `to` is null when the drag was canceled or the drop was not allowed. */
  drop(item: HTMLElement, to: DropPoint | null): void;
}

export const REORDER_DRAG_PX = 4;
export const REORDER_HOLD_MS = 350;
export const REORDER_HOLD_SLOP_PX = 8;
export const REORDER_EDGE_PX = 48;
export const REORDER_MAX_SCROLL_PX = 18;
/** Gap used for the indicator when an item has no neighbour to measure. */
export const REORDER_FALLBACK_GAP_PX = 16;
/** The copy never exceeds about this width (Card page). */
export const REORDER_COPY_MAX_PX = 280;

const rectOf = (el: Element): DOMRect => el.getBoundingClientRect();
const contains = (r: DOMRect, x: number, y: number): boolean =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

export class ReorderDrag {
  readonly #root: HTMLElement;
  readonly #o: ReorderOptions;
  #item: HTMLElement | null = null;
  #dragging = false;
  #pointerId = -1;
  #type = 'mouse';
  #sx = 0;
  #sy = 0;
  #x = 0;
  #y = 0;
  #offX = 0;
  #offY = 0;
  #hold?: ReturnType<typeof setTimeout>;
  #copy?: HTMLElement;
  #drop: DropPoint | null = null;
  #raf = 0;
  #suppressClick = false;

  constructor(root: HTMLElement, options: ReorderOptions) {
    this.#root = root;
    this.#o = options;
  }

  get dragging(): boolean {
    return this.#dragging;
  }

  attach(): void {
    this.#root.addEventListener('pointerdown', this.#down);
    this.#root.addEventListener('click', this.#click, true);
  }
  detach(): void {
    this.#root.removeEventListener('pointerdown', this.#down);
    this.#root.removeEventListener('click', this.#click, true);
    this.#end(true);
  }

  /** A click that ends a drag must not activate the control it ended on. */
  readonly #click = (event: MouseEvent): void => {
    if (!this.#suppressClick) return;
    this.#suppressClick = false;
    event.stopPropagation();
    event.preventDefault();
  };

  readonly #down = (event: PointerEvent): void => {
    if (this.#item || (event.pointerType === 'mouse' && event.button !== 0))
      return;
    const item = this.#o.grab(event.composedPath());
    if (!item) return;
    this.#item = item;
    this.#pointerId = event.pointerId;
    this.#type = event.pointerType;
    this.#sx = this.#x = event.clientX;
    this.#sy = this.#y = event.clientY;
    const r = rectOf(item);
    this.#offX = event.clientX - r.left;
    this.#offY = event.clientY - r.top;
    window.addEventListener('pointermove', this.#move);
    window.addEventListener('pointerup', this.#up);
    window.addEventListener('pointercancel', this.#cancelPointer);
    window.addEventListener('keydown', this.#key, true);
    // Non-passive from the start, so a drag that began after the hold can stop
    // the page from scrolling under the finger.
    window.addEventListener('touchmove', this.#touchmove, { passive: false });
    if (this.#type === 'touch')
      this.#hold = setTimeout(() => this.#begin(), REORDER_HOLD_MS);
  };

  readonly #touchmove = (event: TouchEvent): void => {
    if (this.#dragging && event.cancelable) event.preventDefault();
  };

  readonly #move = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    this.#x = event.clientX;
    this.#y = event.clientY;
    if (!this.#dragging) {
      const d = Math.hypot(this.#x - this.#sx, this.#y - this.#sy);
      if (this.#type === 'touch') {
        // Moving before the hold ends: the user is scrolling.
        if (d > REORDER_HOLD_SLOP_PX) this.#end(true);
      } else if (d > REORDER_DRAG_PX) this.#begin();
      return;
    }
    event.preventDefault();
    this.#track();
  };

  readonly #up = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    const was = this.#dragging;
    const item = this.#item;
    const to = this.#drop;
    this.#end(false);
    if (was && item) {
      this.#suppressClick = true;
      setTimeout(() => (this.#suppressClick = false), 0);
      this.#o.drop(item, to);
    }
  };

  readonly #cancelPointer = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    this.#end(true);
  };

  readonly #key = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.#dragging) return;
    event.preventDefault();
    event.stopPropagation();
    this.#end(true);
  };

  #begin(): void {
    const item = this.#item;
    if (!item || this.#dragging) return;
    this.#dragging = true;
    this.#o.start(item);
    const copy = this.#o.makeCopy(item);
    copy.style.position = 'fixed';
    copy.style.left = '0';
    copy.style.top = '0';
    copy.style.pointerEvents = 'none';
    copy.style.zIndex = '2147483000';
    document.body.append(copy);
    this.#copy = copy;
    this.#track();
    const loop = (): void => {
      if (!this.#dragging) return;
      this.#autoscroll();
      this.#raf = requestAnimationFrame(loop);
    };
    this.#raf = requestAnimationFrame(loop);
  }

  /** Moves the copy and recomputes the drop point and the indicator. */
  #track(): void {
    const item = this.#item;
    if (!item || !this.#copy) return;
    this.#copy.style.transform = `translate(${String(this.#x - Math.min(this.#offX, REORDER_COPY_MAX_PX / 2))}px, ${String(this.#y - this.#offY)}px)`;
    const targets = this.#o.targets(item);
    const hit =
      targets
        .filter((t) => contains(rectOf(t.list), this.#x, this.#y))
        // Prefer the smallest (innermost) list under the pointer.
        .sort(
          (a, b) =>
            rectOf(a.list).width * rectOf(a.list).height -
            rectOf(b.list).width * rectOf(b.list).height,
        )[0] ?? null;
    if (!hit) {
      this.#drop = null;
      this.#o.indicator(null);
      return;
    }
    const others = hit.items.filter((i) => i !== item);
    if (others.length === 0) {
      const r = rectOf(hit.list);
      this.#drop = { list: hit.list, index: 0 };
      this.#o.indicator({
        list: hit.list,
        x: r.left,
        y: r.top,
        length: r.width,
        vertical: false,
      });
      return;
    }
    // The item nearest to the pointer, then which side of it.
    let best = others[0] as HTMLElement;
    let bestD = Infinity;
    for (const el of others) {
      const r = rectOf(el);
      const cx = Math.max(r.left, Math.min(this.#x, r.right));
      const cy = Math.max(r.top, Math.min(this.#y, r.bottom));
      const d = Math.hypot(this.#x - cx, this.#y - cy);
      if (d < bestD) {
        bestD = d;
        best = el;
      }
    }
    const br = rectOf(best);
    const grid = others.some((el) => Math.abs(rectOf(el).left - br.left) > 2);
    const rtl = getComputedStyle(hit.list).direction === 'rtl';
    const after = grid
      ? rtl
        ? this.#x < br.left + br.width / 2
        : this.#x > br.left + br.width / 2
      : this.#y > br.top + br.height / 2;
    const i = others.indexOf(best);
    const index = i + (after ? 1 : 0);
    this.#drop = { list: hit.list, index };
    const gap = this.#gap(others, i, after, grid, br);
    if (grid) {
      // A vertical line beside the target, in the middle of the gap.
      const left = rtl ? !after : after;
      this.#o.indicator({
        list: hit.list,
        x: left ? br.right + gap / 2 : br.left - gap / 2,
        y: br.top,
        length: br.height,
        vertical: true,
      });
    } else {
      this.#o.indicator({
        list: hit.list,
        x: br.left,
        y: after ? br.bottom + gap / 2 : br.top - gap / 2,
        length: br.width,
        vertical: false,
      });
    }
  }

  #gap(
    others: HTMLElement[],
    i: number,
    after: boolean,
    grid: boolean,
    br: DOMRect,
  ): number {
    const neighbour = others[after ? i + 1 : i - 1];
    if (!neighbour) return REORDER_FALLBACK_GAP_PX;
    const nr = rectOf(neighbour);
    const gap = grid
      ? after
        ? nr.left - br.right
        : br.left - nr.right
      : after
        ? nr.top - br.bottom
        : br.top - nr.bottom;
    // A neighbour on another row of a grid gives no useful horizontal gap.
    return gap > 0 && gap < 96 ? gap : REORDER_FALLBACK_GAP_PX;
  }

  #scrollParent(): HTMLElement | null {
    for (
      let el: HTMLElement | null = this.#root.parentElement;
      el;
      el = el.parentElement
    ) {
      const o = getComputedStyle(el).overflowY;
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight)
        return el;
    }
    return null;
  }

  #autoscroll(): void {
    const parent = this.#scrollParent();
    const top = parent ? rectOf(parent).top : 0;
    const bottom = parent ? rectOf(parent).bottom : window.innerHeight;
    let dy = 0;
    if (this.#y < top + REORDER_EDGE_PX)
      dy = -Math.ceil(
        (REORDER_MAX_SCROLL_PX * (top + REORDER_EDGE_PX - this.#y)) /
          REORDER_EDGE_PX,
      );
    else if (this.#y > bottom - REORDER_EDGE_PX)
      dy = Math.ceil(
        (REORDER_MAX_SCROLL_PX * (this.#y - (bottom - REORDER_EDGE_PX))) /
          REORDER_EDGE_PX,
      );
    if (!dy) return;
    dy = Math.max(-REORDER_MAX_SCROLL_PX, Math.min(REORDER_MAX_SCROLL_PX, dy));
    if (parent) parent.scrollTop += dy;
    else window.scrollBy(0, dy);
    this.#track();
  }

  /** Ends the gesture. With `cancel`, tells the caller nothing moved. */
  #end(cancel: boolean): void {
    clearTimeout(this.#hold);
    cancelAnimationFrame(this.#raf);
    window.removeEventListener('pointermove', this.#move);
    window.removeEventListener('pointerup', this.#up);
    window.removeEventListener('pointercancel', this.#cancelPointer);
    window.removeEventListener('keydown', this.#key, true);
    window.removeEventListener('touchmove', this.#touchmove);
    const item = this.#item;
    const was = this.#dragging;
    this.#copy?.remove();
    this.#copy = undefined;
    if (was) this.#o.indicator(null);
    this.#dragging = false;
    this.#item = null;
    this.#drop = null;
    if (cancel && was && item) {
      this.#suppressClick = true;
      setTimeout(() => (this.#suppressClick = false), 0);
      this.#o.drop(item, null);
    }
  }
}
