import test from 'node:test';
import assert from 'node:assert/strict';
import { cyclePhase, ease, sphereScale, breathEnvelope, fadeGain } from '../js/breathe-math.js';

test('cyclePhase walks in → hold → out and repeats each cycle', () => {
  const [i, hold, o] = [4, 2, 6]; // 12s cycle
  assert.equal(cyclePhase(0, i, hold, o).phase, 'in');
  assert.equal(cyclePhase(3.9, i, hold, o).phase, 'in');
  assert.equal(cyclePhase(4.1, i, hold, o).phase, 'hold');
  assert.equal(cyclePhase(6.5, i, hold, o).phase, 'out');
  assert.equal(cyclePhase(11.9, i, hold, o).phase, 'out');
  // Wraps: 12s later we are back at the start of the in-breath.
  assert.equal(cyclePhase(12.05, i, hold, o).phase, 'in');
  // Progress is 0..1 within the phase.
  const mid = cyclePhase(2, i, hold, o);
  assert.equal(mid.phase, 'in');
  assert.ok(Math.abs(mid.p - 0.5) < 1e-9);
});

test('cyclePhase adds an empty hold after the out-breath and repeats each cycle', () => {
  const [i, hold, o, holdOut] = [4, 2, 6, 3]; // 15s cycle
  assert.equal(cyclePhase(0, i, hold, o, holdOut).phase, 'in');
  assert.equal(cyclePhase(4.1, i, hold, o, holdOut).phase, 'hold');
  assert.equal(cyclePhase(6.5, i, hold, o, holdOut).phase, 'out');
  assert.equal(cyclePhase(12.1, i, hold, o, holdOut).phase, 'holdOut');
  assert.equal(cyclePhase(14.9, i, hold, o, holdOut).phase, 'holdOut');
  // Wraps after 15s back to the in-breath.
  assert.equal(cyclePhase(15.05, i, hold, o, holdOut).phase, 'in');
});

test('the empty hold defaults away: a zero-length holdOut is skipped', () => {
  // Omitting the 5th arg (default 0) keeps the classic in/hold/out cycle.
  assert.equal(cyclePhase(11.9, 4, 2, 6).phase, 'out');
  assert.equal(cyclePhase(12.05, 4, 2, 6, 0).phase, 'in');
});

test('a zero-length hold is skipped (pure 4:6 breathing)', () => {
  assert.equal(cyclePhase(4.01, 4, 0, 6).phase, 'out');
});

test('sphere grows on the in-breath, holds full, shrinks on the out-breath, stays empty on the empty hold', () => {
  const min = 0.32, max = 1;
  assert.ok(Math.abs(sphereScale('in', 0, min, max) - min) < 1e-9);
  assert.ok(Math.abs(sphereScale('in', 1, min, max) - max) < 1e-9);
  assert.equal(sphereScale('hold', 0.5, min, max), max);
  assert.ok(Math.abs(sphereScale('out', 0, min, max) - max) < 1e-9);
  assert.ok(Math.abs(sphereScale('out', 1, min, max) - min) < 1e-9);
  assert.equal(sphereScale('holdOut', 0.5, min, max), min); // empty pause sits fully exhaled
  // Monotonic swell up during the in-breath.
  assert.ok(sphereScale('in', 0.25, min, max) < sphereScale('in', 0.75, min, max));
  // ease is smooth and bounded.
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
});

test('breath sound swells then fades within a phase and is silent on both holds', () => {
  assert.equal(breathEnvelope('hold', 0.5), 0);
  assert.equal(breathEnvelope('holdOut', 0.5), 0);
  assert.ok(Math.abs(breathEnvelope('in', 0)) < 1e-9);      // silent at the turn
  assert.ok(Math.abs(breathEnvelope('in', 1)) < 1e-9);      // silent at the turn
  assert.ok(breathEnvelope('in', 0.5) > 0.99);              // peak mid-breath
  assert.ok(breathEnvelope('out', 0.5) > 0.99);
});

test('session sound is full for 10 min, fades linearly, then silent', () => {
  const ACTIVE = 10 * 60 * 1000, FADE = 10 * 60 * 1000;
  assert.equal(fadeGain(0, ACTIVE, FADE), 1);
  assert.equal(fadeGain(ACTIVE, ACTIVE, FADE), 1);
  assert.ok(Math.abs(fadeGain(ACTIVE + FADE / 2, ACTIVE, FADE) - 0.5) < 1e-9);
  assert.equal(fadeGain(ACTIVE + FADE, ACTIVE, FADE), 0);
  assert.equal(fadeGain(ACTIVE + FADE + 1000, ACTIVE, FADE), 0);
});
