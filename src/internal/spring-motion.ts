import { settleTime, springAt, type Spring } from './spring.js';

/**
 * Private. One clock for a control's motion. The control describes how a
 * pose (a few numbers: squish, fill, mark progress) looks as styles; this
 * moves the pose to a new target on springs, one per number, and plays the
 * result with the Web Animations API on every layer at once. A spring has no
 * fixed start, so a new target can take over a move in flight from the exact
 * position and speed it had: no snap, however fast the taps come.
 */

/** Where each number is (or is headed). */
export type Pose<K extends string> = Record<K, number>;

/** How one number moves: natural frequency (rad/s), damping ratio, and an extra push (units/s). */
export interface Tune {
  w: number;
  z: number;
  kick?: number;
}

/** One animated element (or its pseudo-element). */
export interface Layer {
  el: () => Element | null | undefined;
  pseudo?: '::before' | '::after';
}

interface Run<K extends string> {
  springs: Record<K, Spring>;
  to: Pose<K>;
  ms: number;
  master: Animation;
  anims: Animation[];
  done?: () => void;
}

/** Keyframe spacing (ms). */
const STEP = 8;
/**
 * A new animation shows its first frame at its start, so taking over from the
 * pose last drawn would draw it twice. A take-over starts one frame ahead (ms).
 */
const FRAME = 16.7;
/** Settled: closer than this to the target, and slower than this per second. */
const NEAR = 0.01;
const SLOW = 0.1;

export class SpringMotion<K extends string, L extends string> {
  #to?: Pose<K>;
  #run?: Run<K>;

  constructor(
    private readonly keys: readonly K[],
    private readonly layers: Record<L, Layer>,
    /** What every layer looks like at a pose. Also draws the pose at rest. */
    readonly draw: (pose: Pose<K>) => Record<L, Keyframe>,
  ) {}

  /** The pose the motion is at, or heading for. */
  get target(): Pose<K> | undefined {
    return this.#to;
  }

  /** Sets the pose with no move: first paint, reduced motion, disconnect. */
  snap(pose: Pose<K>): void {
    this.stop();
    this.#to = pose;
  }

  /** Cancels the move; the stylesheet and inline rest style draw the pose. */
  stop(): void {
    for (const a of this.#run?.anims ?? []) a.cancel();
    this.#run = undefined;
  }

  /**
   * Moves to `to`, from wherever (and however fast) the pose is now. `done`
   * runs when this move comes to rest (never if another move takes it over).
   * A tune with a `kick` always moves, even to the pose it is already at.
   */
  go(to: Pose<K>, tune: (key: K) => Tune, done?: () => void): void {
    const from = this.#now();
    if (!from) {
      this.snap(to);
      return done?.();
    }
    const run = this.#run;
    const kicked = this.keys.some((k) => tune(k).kick);
    if (!kicked && this.#same(run?.to ?? from.x, to)) {
      // Already there, or on the way: only the callback changes hands.
      if (run) run.done = done;
      else done?.();
      return;
    }

    const springs = {} as Record<K, Spring>;
    for (const k of this.keys) {
      const { w, z, kick = 0 } = tune(k);
      springs[k] = { x0: from.x[k] - to[k], v0: from.v[k] + kick, w, z };
    }
    const ms = Math.max(
      60,
      Math.round(settleTime(Object.values<Spring>(springs), NEAR, SLOW) * 1000),
    );
    const frames = Math.max(2, Math.ceil(ms / STEP));
    const keyframes = {} as Record<L, Keyframe[]>;
    for (const l of Object.keys(this.layers) as L[]) keyframes[l] = [];
    for (let i = 0; i <= frames; i++) {
      const t = (ms * i) / frames / 1000;
      const pose = {} as Pose<K>;
      for (const k of this.keys)
        pose[k] = i === frames ? to[k] : to[k] + springAt(springs[k], t)[0];
      const drawn = this.draw(pose);
      for (const l in drawn) keyframes[l].push(drawn[l]);
    }

    this.stop();
    const anims: Animation[] = [];
    for (const l in this.layers) {
      const el = this.layers[l].el();
      if (!el) continue;
      anims.push(
        el.animate(keyframes[l], {
          duration: ms,
          easing: 'linear',
          fill: 'forwards',
          pseudoElement: this.layers[l].pseudo,
        }),
      );
    }
    const master = anims[0];
    if (!master) {
      this.snap(to);
      return done?.();
    }
    this.#to = to;
    this.#run = { springs, to, ms, master, anims, done };
    master.onfinish = () => {
      // At rest the stylesheet draws exactly this pose: hand over to it.
      const run = this.#run;
      if (run?.master !== master) return;
      this.stop();
      run.done?.();
    };
  }

  #same(a: Pose<K>, b: Pose<K>): boolean {
    return this.keys.every((k) => Math.abs(a[k] - b[k]) < 1e-3);
  }

  /** Pose and speed one frame ahead of the move in flight, or at rest. */
  #now(): { x: Pose<K>; v: Pose<K> } | undefined {
    const run = this.#run;
    if (!run) {
      const x = this.#to;
      if (!x) return undefined;
      const v = {} as Pose<K>;
      for (const k of this.keys) v[k] = 0;
      return { x, v };
    }
    // A move that has not drawn a frame yet has nothing to skip.
    const at = Number(run.master.currentTime ?? 0);
    const ms = Math.min(at > 0 ? at + FRAME : 0, run.ms);
    const x = {} as Pose<K>;
    const v = {} as Pose<K>;
    for (const k of this.keys) {
      const [dx, dv] = springAt(run.springs[k], ms / 1000);
      x[k] = run.to[k] + dx;
      v[k] = dv;
    }
    return { x, v };
  }
}
