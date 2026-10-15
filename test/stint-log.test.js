import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentStint, scheduleSegmentsBetween, reconcile,
  haversineNm, totalMiles, summariseStints
} from '../js/stint-log.js';
import { computeSchedule, currentSegment } from '../js/shift-schedule.js';

const scheduleState = () => ({
  scheduleOn: true, manualOn: false, splitPct: 50,
  nightShiftMin: 180, dayShiftMin: 90, nightStartMin: 1200,
  shiftStart: null, pausedLeft: 0, shiftLastStart: 0, activeRower: 'Rower 1', shiftMin: 90
});
const manualState = over => ({
  scheduleOn: false, manualOn: true, shiftStart: 1_000_000, pausedLeft: 0,
  shiftLastStart: 1_000_000, activeRower: 'Rower 1', shiftMin: 90, ...over
});

test('currentStint reads the deterministic schedule segment', () => {
  const s = scheduleState();
  const now = Date.UTC(2026, 0, 9, 12, 0, 0);
  const seg = currentSegment(computeSchedule(s), now);
  const stint = currentStint(s, now);
  assert.equal(stint.mode, 'schedule');
  assert.equal(stint.rower, seg.rower);
  assert.equal(stint.startedAt, seg.startedAt);
});

test('currentStint uses the stable manual start and ignores idle/paused stints', () => {
  assert.equal(currentStint(manualState()).startedAt, 1_000_000);
  assert.equal(currentStint(manualState({ shiftStart: null })), null, 'idle = nobody on oars');
  assert.equal(currentStint(manualState({ pausedLeft: 500 })), null, 'paused = nobody on oars');
  // shiftLastStart (not raw shiftStart) is the identity, so pause/resume keeps one stint.
  assert.equal(currentStint(manualState({ shiftStart: 1_200_000, shiftLastStart: 1_000_000 })).startedAt, 1_000_000);
});

test('scheduleSegmentsBetween returns whole completed stints in order', () => {
  const s = scheduleState();
  const sched = computeSchedule(s);
  const t0 = Date.UTC(2026, 0, 9, 0, 0, 0);
  const first = currentSegment(sched, t0);
  // Window covering exactly the first two segments.
  const second = currentSegment(sched, first.endsAt);
  const segs = scheduleSegmentsBetween(s, first.startedAt, second.endsAt);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].start, first.startedAt);
  assert.equal(segs[0].end, first.endsAt);
  assert.equal(segs[1].start, second.startedAt);
  // A segment still running at the window end is excluded.
  assert.equal(scheduleSegmentsBetween(s, first.startedAt, first.endsAt - 1).length, 0);
});

test('reconcile adopts the live stint when there is no open pointer', () => {
  const s = scheduleState();
  const now = Date.UTC(2026, 0, 9, 12, 0, 0);
  const r = reconcile({ open: null, state: s, now });
  assert.equal(r.records.length, 0, 'nothing logged on first sight');
  assert.ok(r.open && r.open.mode === 'schedule', 'but the open pointer is now set');
});

test('reconcile back-fills every schedule stint completed while the app was closed', () => {
  const s = scheduleState();
  const sched = computeSchedule(s);
  const start = currentSegment(sched, Date.UTC(2026, 0, 9, 0, 0, 0)).startedAt;
  const open = { rower: currentSegment(sched, start).rower, startedAt: start, mode: 'schedule', part: currentSegment(sched, start).part };
  // Re-open the app ~7 hours later: several stints have completed deterministically.
  const now = start + 7 * 60 * 60000;
  const r = reconcile({ open, state: s, now });
  assert.ok(r.records.length >= 2, 'multiple completed stints were back-filled');
  // Deterministic ids make a second reconcile idempotent (same ids, no duplicates).
  const again = reconcile({ open, state: s, now });
  assert.deepEqual(again.records.map(x => x.id), r.records.map(x => x.id));
  // Records are contiguous and carry a positive duration.
  for (let i = 0; i < r.records.length; i++) {
    assert.ok(r.records[i].min > 0);
    if (i) assert.equal(r.records[i].start, r.records[i - 1].end, 'stints are contiguous');
  }
});

test('reconcile closes a finished manual stint once the timer is idle', () => {
  const open = { rower: 'Rower 1', startedAt: 1_000_000, mode: 'manual', part: null };
  const idle = manualState({ shiftStart: null, manualOn: true });
  const now = 1_000_000 + 90 * 60000;
  const r = reconcile({ open, state: idle, now });
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].rower, 'Rower 1');
  assert.equal(r.records[0].min, 90);
  assert.equal(r.open, null, 'nobody is on oars now');
});

test('haversineNm and totalMiles measure real distance between fixes', () => {
  // ~1 degree of latitude ≈ 60 nm.
  const a = { lat: 10, lon: -30 }, b = { lat: 11, lon: -30 };
  assert.ok(Math.abs(haversineNm(a, b) - 60) < 0.5);
  assert.equal(haversineNm(a, a), 0);
  assert.equal(totalMiles([a]), 0, 'a single fix has no distance');
  const c = { lat: 12, lon: -30 };
  assert.ok(Math.abs(totalMiles([a, b, c]) - 120) < 1);
});

test('summariseStints aggregates per-rower stints, minutes and GPS miles', () => {
  const records = [
    { rower: 'Rower 1', min: 90 }, { rower: 'Rower 2', min: 180 }, { rower: 'Rower 1', min: 85 }
  ];
  const fixes = [{ lat: 10, lon: -30 }, { lat: 11, lon: -30 }];
  const sum = summariseStints(records, fixes);
  assert.equal(sum.totalStints, 3);
  assert.equal(sum.perRower['Rower 1'].stints, 2);
  assert.equal(sum.perRower['Rower 1'].minutes, 175);
  assert.equal(sum.perRower['Rower 2'].minutes, 180);
  assert.equal(sum.totalMinutes, 355);
  assert.ok(Math.abs(sum.milesMade - 60) < 0.5);
});
