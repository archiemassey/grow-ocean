/* shift-qr.js — encode/decode the day/night schedule as a tiny QR payload.

   The two phones never talk over the network. Instead one shows a QR of the agreed
   schedule SETTINGS and the other scans it. Because the schedule is deterministic
   from the settings plus the phone clock (anchored to local midnight + night start),
   carrying the settings is enough — no shared "start time" is needed; both phones
   compute identical handovers once they hold the same settings.

   Pure and DOM-free so it can be unit-tested. */

import { normaliseSchedule } from './shift-schedule.js';

export const QR_VERSION = 1;
const QR_TYPE = 'grow-ocean-schedule';

/* Build the compact JSON string that goes into the QR image. */
export function encodeSchedulePayload(settings, { now = Date.now() } = {}) {
  const s = normaliseSchedule(settings);
  return JSON.stringify({
    t: QR_TYPE, v: QR_VERSION,
    sp: s.splitPct, ns: s.nightShiftMin, ds: s.dayShiftMin, st: s.nightStartMin,
    rev: now
  });
}

/* Parse a scanned string back into schedule settings, or null if it is not ours.
   The returned settings turn the schedule ON — applying a shared schedule means
   the receiving rower wants it running. */
export function decodeSchedulePayload(text) {
  let data;
  try { data = JSON.parse(text); } catch { return null; }
  if (!data || data.t !== QR_TYPE) return null;
  const s = normaliseSchedule({
    splitPct: data.sp, nightShiftMin: data.ns, dayShiftMin: data.ds, nightStartMin: data.st
  });
  return { ...s, scheduleOn: true, rev: Number(data.rev) || 0 };
}
