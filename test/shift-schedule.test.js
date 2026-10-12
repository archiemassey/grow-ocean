import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSchedule, normaliseSchedule, nextHandovers, currentSegment,
  cycleAnchor, formatHours, SCHEDULE_DEFAULTS
} from '../js/shift-schedule.js';

const sum = (segs, rower) => segs.filter(s => s.rower === rower).reduce((a, s) => a + s.min, 0);

test('normaliseSchedule clamps every field into safe ranges', () => {
  const n = normaliseSchedule({ splitPct: 90, nightShiftMin: 9000, dayShiftMin: 1, nightStartMin: 25 * 60 });
  assert.equal(n.splitPct, 65);
  assert.equal(n.nightShiftMin, 300);
  assert.equal(n.dayShiftMin, 20);
  assert.equal(n.nightStartMin, 60); // 25:00 wraps to 01:00
});

test('50/50 split gives each rower exactly 12h, night one stint each', () => {
  const s = computeSchedule({ splitPct: 50, nightShiftMin: 180, dayShiftMin: 90 });
  assert.equal(Math.round(s.perRowerMin['Rower 1']), 720);
  assert.equal(Math.round(s.perRowerMin['Rower 2']), 720);
  const night = s.segments.filter(x => x.part === 'night');
  assert.equal(night.length, 2);
  assert.deepEqual(night.map(x => x.rower), ['Rower 1', 'Rower 2']);
  assert.equal(Math.round(night[0].min), 180);
  assert.equal(Math.round(night[1].min), 180);
  // Segment totals match the per-rower totals.
  assert.equal(Math.round(sum(s.segments, 'Rower 1')), 720);
  assert.equal(Math.round(sum(s.segments, 'Rower 2')), 720);
});

test('60/40 split biases length not count; totals land on the ratio', () => {
  const s = computeSchedule({ splitPct: 60, nightShiftMin: 180, dayShiftMin: 90 });
  assert.equal(Math.round(s.perRowerMin['Rower 1']), Math.round(0.6 * 1440)); // 864 = 14h24
  assert.equal(Math.round(s.perRowerMin['Rower 2']), Math.round(0.4 * 1440)); // 576 = 9h36
  assert.equal(Math.round(sum(s.segments, 'Rower 1')), 864);
  assert.equal(Math.round(sum(s.segments, 'Rower 2')), 576);
  // Same NUMBER of stints each (strict alternation preserved).
  assert.equal(s.segments.filter(x => x.rower === 'Rower 1').length,
               s.segments.filter(x => x.rower === 'Rower 2').length);
  // Rower 1's night stint is longer than Rower 2's.
  assert.ok(s.nightShiftActual['Rower 1'] > s.nightShiftActual['Rower 2']);
});

test('day block is split into an even number of stints near the target length', () => {
  const s = computeSchedule({ splitPct: 50, nightShiftMin: 180, dayShiftMin: 90 });
  // night block 360 -> day block 1080; 1080 / (2*90) = 6 pairs -> 12 day stints.
  assert.equal(s.dayPairs, 6);
  const dayStints = s.segments.filter(x => x.part === 'day');
  assert.equal(dayStints.length, 12);
  assert.ok(Math.abs(s.dayShiftActualMin - 90) < 1);
});

test('segments strictly alternate rowers around the whole cycle', () => {
  const s = computeSchedule({ splitPct: 55, nightShiftMin: 150, dayShiftMin: 75 });
  for (let i = 0; i < s.segments.length; i++) {
    const next = s.segments[(i + 1) % s.segments.length];
    assert.notEqual(s.segments[i].rower, next.rower, 'no rower rows two stints in a row');
  }
  assert.equal(Math.round(s.segments.reduce((a, x) => a + x.min, 0)), 1440);
});

test('cycleAnchor lands on the configured night-start, at or before now', () => {
  const s = computeSchedule({ nightStartMin: 20 * 60 }); // 20:00
  const now = new Date(2026, 0, 15, 22, 0, 0).getTime(); // 22:00 local
  const anchor = cycleAnchor(s, now);
  const d = new Date(anchor);
  assert.equal(d.getHours(), 20);
  assert.equal(d.getMinutes(), 0);
  assert.ok(anchor <= now && now - anchor < 24 * 3600000);
});

test('cycleAnchor rolls back a day when now is before tonight\'s night-start', () => {
  const s = computeSchedule({ nightStartMin: 20 * 60 });
  const now = new Date(2026, 0, 15, 8, 0, 0).getTime(); // 08:00, before 20:00
  const anchor = cycleAnchor(s, now);
  assert.equal(new Date(anchor).getDate(), 14); // previous day's 20:00
});

test('nextHandovers returns future, increasing handovers tagged with who comes on', () => {
  const s = computeSchedule({ splitPct: 50, nightShiftMin: 180, dayShiftMin: 90, nightStartMin: 20 * 60 });
  const now = new Date(2026, 0, 15, 20, 30, 0).getTime(); // 30 min into Rower 1's night stint
  const hs = nextHandovers(s, { count: 5, now });
  assert.equal(hs.length, 5);
  assert.ok(hs[0].at > now);
  for (let i = 1; i < hs.length; i++) assert.ok(hs[i].at > hs[i - 1].at);
  // First handover hands over to Rower 2 (night second stint).
  assert.equal(hs[0].onNext, 'Rower 2');
  assert.equal(hs[0].part, 'night');
});

test('currentSegment identifies the live stint and its end', () => {
  const s = computeSchedule({ splitPct: 50, nightShiftMin: 180, dayShiftMin: 90, nightStartMin: 20 * 60 });
  const now = new Date(2026, 0, 15, 20, 30, 0).getTime();
  const seg = currentSegment(s, now);
  assert.equal(seg.rower, 'Rower 1');
  assert.equal(seg.part, 'night');
  assert.ok(seg.endsAt > now && seg.startedAt <= now);
  // Ends 3h after 20:00 = 23:00.
  assert.equal(new Date(seg.endsAt).getHours(), 23);
});

test('formatHours renders hours and padded minutes', () => {
  assert.equal(formatHours(864), '14h 24m');
  assert.equal(formatHours(720), '12h 00m');
});

test('defaults are exported and sane', () => {
  assert.equal(SCHEDULE_DEFAULTS.splitPct, 50);
  assert.equal(SCHEDULE_DEFAULTS.nightStartMin, 1200);
});
