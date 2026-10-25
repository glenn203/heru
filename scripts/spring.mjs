// Spring → CSS linear() generator for Herú motion tokens.
import process from 'node:process';
// simulate({ mass, stiffness, damping }) integrates m·x'' = -k(x-1) - c·x'
// from rest at 0 to target 1, finds the settle time (|x-1| and |v|/ω below
// TOL), and springToLinear() samples x over [0, durationMs] as linear() stops.
// The settle time must match the duration token the curve is paired with;
// build-tokens.mjs fails the build if it is off by more than 10%.
export const TOL = 0.001;

export function simulate({ mass, stiffness, damping }, endMs = 2000) {
  const dt = 1e-5; // seconds
  const omega = Math.sqrt(stiffness / mass);
  let x = 0;
  let v = 0;
  let settle = 0;
  const xs = [];
  for (let t = 0, i = 0; t <= endMs / 1000; t += dt, i++) {
    if (i % 10 === 0) xs.push([t * 1000, x]); // every 0.1ms
    if (Math.abs(x - 1) > TOL || Math.abs(v) / omega > TOL) settle = t * 1000;
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt; // semi-implicit Euler
    x += v * dt;
  }
  return { settleMs: settle, xs };
}

export const dampingRatio = ({ mass, stiffness, damping }) =>
  damping / (2 * Math.sqrt(stiffness * mass));

/** Sample the spring over durationMs into `points` linear() stops (last forced to 1). */
export function springToLinear(params, durationMs, points = 40) {
  const { xs, settleMs } = simulate(params, Math.max(durationMs, 1) * 1.5);
  const at = (ms) => xs[Math.min(xs.length - 1, Math.round(ms * 10))][1];
  const stops = [];
  for (let i = 0; i <= points; i++) {
    const p = i / points;
    stops.push(
      i === points ? 1 : Math.round(at(p * durationMs) * 10000) / 10000,
    );
  }
  const overshoot = Math.max(...xs.map(([, x]) => x)) - 1;
  return {
    css: `linear(${stops.join(', ')})`,
    stops,
    settleMs,
    overshoot: Math.max(0, overshoot),
    zeta: dampingRatio(params),
  };
}

// CLI: node scripts/spring.mjs <mass> <stiffness> <damping> <durationMs>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [m, k, c, d] = process.argv.slice(2).map(Number);
  const r = springToLinear({ mass: m, stiffness: k, damping: c }, d);
  console.log(
    JSON.stringify({
      settleMs: r.settleMs,
      overshoot: r.overshoot,
      zeta: r.zeta,
    }),
  );
  console.log(r.css);
}
