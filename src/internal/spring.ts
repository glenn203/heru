/**
 * Private spring maths shared by the switch, checkbox and radio. A spring
 * pulls a value to its target; it is solved in closed form, so any start
 * position and speed gives the same smooth curve and a move can be taken over
 * mid-flight without a jump. Not exported from the package.
 */

/** One value moving to its target. Units: the value's own, and seconds. */
export interface Spring {
  /** Start minus target. */
  x0: number;
  /** Start speed (per second). */
  v0: number;
  /** Natural frequency (rad/s). */
  w: number;
  /** Damping ratio: 1 settles with no overshoot, below 1 overshoots. */
  z: number;
}

/** Offset from the target and speed after `t` seconds. */
export function springAt(
  { x0, v0, w, z }: Spring,
  t: number,
): [number, number] {
  if (t <= 0) return [x0, v0];
  if (z >= 1) {
    const e = Math.exp(-w * t);
    const c = v0 + w * x0;
    return [e * (x0 + c * t), e * (v0 - w * c * t)];
  }
  const wd = w * Math.sqrt(1 - z * z);
  const e = Math.exp(-z * w * t);
  const cos = Math.cos(wd * t);
  const sin = Math.sin(wd * t);
  const k = (v0 + z * w * x0) / wd;
  return [
    e * (x0 * cos + k * sin),
    e * (v0 * cos - ((z * w * v0 + w * w * x0) / wd) * sin),
  ];
}

/**
 * Seconds until every spring is within `eps` of its target and slower than
 * `vEps` per second. Capped so a bad input can never loop on.
 */
export function settleTime(
  springs: readonly Spring[],
  eps = 0.2,
  vEps = 4,
  cap = 1.2,
): number {
  let last = 0;
  for (let t = 0; t <= cap; t += 0.004) {
    for (const s of springs) {
      const [x, v] = springAt(s, t);
      if (Math.abs(x) > eps || Math.abs(v) > vEps) last = t;
    }
  }
  return Math.min(cap, last + 0.004);
}
