import type { ReactiveController, ReactiveControllerHost } from 'lit';

export type SelectionMode = 'single' | 'multi';

/**
 * Selection by item id, not by what is on screen. A paged list keeps ids that
 * are not in the page, so "3 selected" stays true when you change page. NAME
 * PROVISIONAL (Technical Writer).
 *
 * Single mode holds at most one id and never clears itself (like radios).
 * Multi mode toggles. Works on its own or as a Lit ReactiveController.
 */
export class SelectionController implements ReactiveController {
  readonly #ids = new Set<string>();
  readonly #host?: ReactiveControllerHost;
  mode: SelectionMode;

  constructor(
    host?: ReactiveControllerHost,
    options: { mode?: SelectionMode } = {},
  ) {
    this.#host = host;
    this.mode = options.mode ?? 'multi';
    host?.addController(this);
  }

  hostConnected(): void {
    /* nothing to attach: state is plain data */
  }

  get size(): number {
    return this.#ids.size;
  }
  /** Selected ids in the order they were selected. */
  get values(): string[] {
    return [...this.#ids];
  }
  has(id: string): boolean {
    return this.#ids.has(id);
  }

  /** Selects an id. In single mode it replaces the current one. */
  select(id: string): boolean {
    if (this.#ids.has(id) && this.#ids.size === 1) return false;
    if (this.mode === 'single') this.#ids.clear();
    else if (this.#ids.has(id)) return false;
    this.#ids.add(id);
    return this.#changed();
  }

  /** Deselects an id (multi mode; a single selection cannot be cleared by user). */
  deselect(id: string): boolean {
    if (!this.#ids.delete(id)) return false;
    return this.#changed();
  }

  /** Multi: flips the id. Single: selects it. Returns the new state. */
  toggle(id: string): boolean {
    if (this.mode === 'single') {
      this.select(id);
      return true;
    }
    if (this.#ids.has(id)) this.deselect(id);
    else this.select(id);
    return this.#ids.has(id);
  }

  /** Replaces the selection. Single mode keeps the first id only. */
  set(ids: Iterable<string>): boolean {
    const next = [...new Set(ids)];
    const kept = this.mode === 'single' ? next.slice(0, 1) : next;
    if (kept.length === this.#ids.size && kept.every((id) => this.#ids.has(id)))
      return false;
    this.#ids.clear();
    for (const id of kept) this.#ids.add(id);
    return this.#changed();
  }

  clear(): boolean {
    if (this.#ids.size === 0) return false;
    this.#ids.clear();
    return this.#changed();
  }

  #changed(): true {
    this.#host?.requestUpdate();
    return true;
  }
}
