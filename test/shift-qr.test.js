import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSchedulePayload, decodeSchedulePayload, QR_VERSION } from '../js/shift-qr.js';

test('encode then decode round-trips the schedule settings and turns it on', () => {
  const settings = { splitPct: 60, nightShiftMin: 210, dayShiftMin: 75, nightStartMin: 21 * 60 };
  const payload = encodeSchedulePayload(settings, { now: 1700000000000 });
  const data = JSON.parse(payload);
  assert.equal(data.t, 'grow-ocean-schedule');
  assert.equal(data.v, QR_VERSION);
  assert.equal(data.rev, 1700000000000);

  const decoded = decodeSchedulePayload(payload);
  assert.equal(decoded.splitPct, 60);
  assert.equal(decoded.nightShiftMin, 210);
  assert.equal(decoded.dayShiftMin, 75);
  assert.equal(decoded.nightStartMin, 21 * 60);
  assert.equal(decoded.scheduleOn, true);
  assert.equal(decoded.rev, 1700000000000);
});

test('decode clamps out-of-range values rather than trusting the scan', () => {
  const decoded = decodeSchedulePayload(JSON.stringify({
    t: 'grow-ocean-schedule', v: 1, sp: 999, ns: 9999, ds: 1, st: 5000, rev: 1 }));
  assert.equal(decoded.splitPct, 65);      // clamped to max
  assert.equal(decoded.nightShiftMin, 300); // clamped to max
  assert.equal(decoded.dayShiftMin, 20);    // clamped to min
  assert.ok(decoded.nightStartMin >= 0 && decoded.nightStartMin < 1440);
});

test('decode rejects foreign or malformed QR content', () => {
  assert.equal(decodeSchedulePayload('not json'), null);
  assert.equal(decodeSchedulePayload(JSON.stringify({ t: 'something-else' })), null);
  assert.equal(decodeSchedulePayload('https://example.com'), null);
});
