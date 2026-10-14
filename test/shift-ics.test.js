import test from 'node:test';
import assert from 'node:assert/strict';
import { nextHandovers, rowerAfter, icsStamp, buildWakeupICS, buildRowerWakeupsICS } from '../js/shift-ics.js';
import { computeSchedule, nextHandovers as scheduleHandovers } from '../js/shift-schedule.js';

const SCHED = { scheduleOn: true, splitPct: 50, nightShiftMin: 180, dayShiftMin: 90, nightStartMin: 1200 };

const RUNNING = { shiftMin: 90, shiftStart: 1_000_000_000_000, activeRower: 'Rower 1', shiftLastStart: 1_000_000_000_000 };

test('nextHandovers returns count future timestamps spaced by shiftMin', () => {
  const now = RUNNING.shiftStart + 10 * 60000; // 10 min into the shift
  const hs = nextHandovers(RUNNING, { count: 4, now });
  assert.equal(hs.length, 4);
  assert.ok(hs[0] > now, 'first handover is in the future');
  assert.equal(hs[0], RUNNING.shiftStart + 90 * 60000);
  for (let i = 1; i < hs.length; i++) assert.equal(hs[i] - hs[i - 1], 90 * 60000);
});

test('nextHandovers skips past handovers that already elapsed', () => {
  const now = RUNNING.shiftStart + 200 * 60000; // more than two shifts in
  const hs = nextHandovers(RUNNING, { count: 2, now });
  assert.ok(hs[0] > now);
  assert.equal(hs[0], RUNNING.shiftStart + 270 * 60000); // 3rd handover (90*3)
});

test('nextHandovers anchors from now when no shift is running', () => {
  const now = 1_700_000_000_000;
  const hs = nextHandovers({ shiftMin: 60, shiftStart: null, activeRower: 'Rower 1' }, { count: 3, now });
  assert.equal(hs[0], now + 60 * 60000);
  assert.equal(hs[2], now + 180 * 60000);
});

test('nextHandovers returns nothing for invalid shift length', () => {
  assert.deepEqual(nextHandovers({ shiftMin: 0, shiftStart: null, activeRower: 'Rower 1' }), []);
  assert.deepEqual(nextHandovers(null), []);
});

test('rowerAfter alternates, resting rower on oars at the first handover', () => {
  assert.equal(rowerAfter(RUNNING, 0), 'Rower 2'); // R1 active now -> R2 on next
  assert.equal(rowerAfter(RUNNING, 1), 'Rower 1');
  assert.equal(rowerAfter(RUNNING, 2), 'Rower 2');
  const r2 = { ...RUNNING, activeRower: 'Rower 2' };
  assert.equal(rowerAfter(r2, 0), 'Rower 1');
});

test('icsStamp formats a UTC calendar timestamp', () => {
  assert.equal(icsStamp(Date.UTC(2026, 0, 9, 8, 7, 6)), '20260109T080706Z');
});

test('buildWakeupICS produces a valid calendar with one alarmed event per handover', () => {
  const now = RUNNING.shiftStart;
  const ics = buildWakeupICS(RUNNING, { count: 3, leadMin: 10, now });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 3);
  assert.ok(ics.includes('TRIGGER:-PT10M'));
  assert.ok(ics.includes('SUMMARY:Shift handover - Rower 2 on oars'));
  assert.ok(ics.includes('\r\n'), 'uses CRLF line endings');
  // No multi-byte characters that could break iCalendar line folding.
  assert.ok([...ics].every(ch => ch.charCodeAt(0) < 128), 'ASCII only');
});

test('buildWakeupICS honours a custom lead time', () => {
  const ics = buildWakeupICS(RUNNING, { count: 1, leadMin: 15, now: RUNNING.shiftStart });
  assert.ok(ics.includes('TRIGGER:-PT15M'));
  assert.ok(ics.includes('Handover in 15 minutes'));
});

test('buildRowerWakeupsICS next returns a single alarm for the chosen rower only', () => {
  const now = Date.UTC(2026, 0, 9, 12, 0, 0);
  const ics = buildRowerWakeupsICS(SCHED, { rower: 'Rower 2', horizon: 'next', now });
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.ok(ics.includes('SUMMARY:Wake up Rower 2 - on oars'));
  assert.ok(!ics.includes('Wake up Rower 1'), 'never wakes the other rower');
  assert.ok(ics.includes('TRIGGER:-PT10M'));
  assert.ok([...ics].every(ch => ch.charCodeAt(0) < 128), 'ASCII only');
});

test('buildRowerWakeupsICS 24h keeps only that rower coming on, excluding her own stints', () => {
  const now = Date.UTC(2026, 0, 9, 12, 0, 0);
  const schedule = computeSchedule(SCHED);
  const expected = scheduleHandovers(schedule, { count: 600, now })
    .filter(hv => hv.onNext === 'Rower 1' && hv.at <= now + 24 * 60 * 60000).length;
  const ics = buildRowerWakeupsICS(SCHED, { rower: 'Rower 1', horizon: '24h', now });
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, expected);
  assert.ok(expected > 0);
  assert.ok(!ics.includes('Wake up Rower 2'));
});

test('buildRowerWakeupsICS night keeps only night handovers', () => {
  const now = Date.UTC(2026, 0, 9, 12, 0, 0);
  const ics = buildRowerWakeupsICS(SCHED, { rower: 'Rower 1', horizon: 'night', now });
  const events = ics.match(/SUMMARY:[^\r\n]+/g) || [];
  assert.ok(events.length > 0);
  assert.ok(events.every(s => s.includes('(night)')), 'every kept handover is a night one');
});
