/* breathe-math.js — pure, DOM-free timing for the Breath work pacer.
   Kept separate from the view so the cycle, sphere and fade logic can be
   unit-tested under Node and reused. All times are in seconds unless the name
   says Ms. No audio, no DOM. */

/* Where are we in one breath cycle at time t (seconds), given the four phase
   lengths? Returns { phase: 'in' | 'hold' | 'out' | 'holdOut', p: 0..1 progress
   in phase }. 'hold' is the pause with the lungs full (after the in-breath);
   'holdOut' is the pause with the lungs empty (after the out-breath). A
   zero-length phase is skipped (reported complete). */
export function cyclePhase(t, inS, holdS, outS, holdOutS = 0) {
  const total = Math.max(0.001, inS + holdS + outS + holdOutS);
  let tt = t % total;
  if (tt < 0) tt += total;
  if (tt < inS) return { phase: 'in', p: inS > 0 ? tt / inS : 1 };
  if (tt < inS + holdS) return { phase: 'hold', p: holdS > 0 ? (tt - inS) / holdS : 1 };
  if (tt < inS + holdS + outS) return { phase: 'out', p: outS > 0 ? (tt - inS - holdS) / outS : 1 };
  return { phase: 'holdOut', p: holdOutS > 0 ? (tt - inS - holdS - outS) / holdOutS : 1 };
}

/* Smooth 0..1 ease (raised cosine) so the sphere breathes rather than jerks. */
export function ease(x) {
  const c = Math.max(0, Math.min(1, x));
  return 0.5 - 0.5 * Math.cos(Math.PI * c);
}

/* Sphere scale for a phase/progress: fully exhaled = min, fully inhaled = max.
   Grows through the in-breath, holds full through the pause, shrinks on the
   out-breath, and stays fully exhaled through the empty pause. */
export function sphereScale(phase, p, min = 0.32, max = 1) {
  if (phase === 'in') return min + (max - min) * ease(p);
  if (phase === 'hold') return max;
  if (phase === 'holdOut') return min;
  return max - (max - min) * ease(p);
}

/* Breath "whoosh" loudness within a phase: silent at the pause, and a soft
   swell (0 → peak → 0) across the in- and out-breaths so there are no clicks
   and it sounds like a breath rather than a gate. Returns 0..1. */
export function breathEnvelope(phase, p) {
  if (phase === 'hold' || phase === 'holdOut') return 0;
  return Math.sin(Math.PI * Math.max(0, Math.min(1, p)));
}

/* Overall session gain multiplier: full through the active window, then a
   straight-line fade to silence over the fade window, then nothing. */
export function fadeGain(elapsedMs, activeMs, fadeMs) {
  if (elapsedMs <= activeMs) return 1;
  if (elapsedMs >= activeMs + fadeMs) return 0;
  return 1 - (elapsedMs - activeMs) / fadeMs;
}
