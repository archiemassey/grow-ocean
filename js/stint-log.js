/* stint-log.js — pure, DOM-free per-rower stint logging + totals.

   Plain English: the app never used to remember who rowed, or for how long — it
   only showed the live clock. This module adds an honest on-device ledger. A
   reconciler watches the live shift state and appends ONE record each time a stint
   finishes, in both modes:

   - SCHEDULE mode: handovers are deterministic (settings + phone clock), so any
     stints that completed while the app was closed are back-filled exactly from the
     maths — nothing is missed, nothing is double-counted. Record ids are derived
     from the stint start, so re-running the reconciler is idempotent (a put with the
     same id overwrites rather than duplicating).
   - MANUAL mode: one record per completed stopwatch stint, identified by
     shiftLastStart (which survives pause/resume/reset, so those don't split a stint).

   "Miles made" is summed separately from GPS position fixes captured at handovers
   (foreground-only on iOS). Everything here is pure; persistence is the caller's job. */

import { computeSchedule, currentSegment } from './shift-schedule.js';

const MIN = 60000;
const R_NM = 3440.065; // Earth radius in nautical miles

/* The stint currently on oars, or null when the manual timer is idle/paused.
   startedAt is a STABLE identity: the schedule segment start, or the manual stint's
   shiftLastStart (unchanged by pause/resume/reset). */
export function currentStint(state, now = Date.now()) {
  if (!state) return null;
  if (state.scheduleOn && !state.manualOn) {
    const seg = currentSegment(computeSchedule(state), now);
    if (!seg) return null;
    return { rower: seg.rower, startedAt: seg.startedAt, endsAt: seg.endsAt, part: seg.part, mode: 'schedule' };
  }
  // Manual stopwatch: only an actively running stint counts as on oars.
  if (state.shiftStart === null || state.pausedLeft > 0) return null;
  const startedAt = state.shiftLastStart > 0 ? state.shiftLastStart : state.shiftStart;
  return {
    rower: state.activeRower, startedAt,
    endsAt: state.shiftStart + state.shiftMin * MIN, part: null, mode: 'manual'
  };
}

const samePtr = (a, b) => !!a && !!b && a.mode === b.mode && a.startedAt === b.startedAt && a.rower === b.rower;
const toPtr = s => ({ rower: s.rower, startedAt: s.startedAt, mode: s.mode, part: s.part || null });

/* Completed schedule segments whose whole span lies within (from, to]. Walks the
   deterministic cycle forward from `from`; bounded + guarded against runaway loops. */
export function scheduleSegmentsBetween(state, from, to) {
  if (!(to > from)) return [];
  const schedule = computeSchedule(state);
  const out = [];
  let t = from;
  for (let guard = 0; guard < 20000 && t < to; guard++) {
    const seg = currentSegment(schedule, t);
    if (!seg || seg.endsAt > to) break; // still running at `to` — not yet complete
    out.push({ rower: seg.rower, start: seg.startedAt, end: seg.endsAt, part: seg.part });
    t = seg.endsAt; // step to the next segment
  }
  return out;
}

function record(makeId, rower, start, end, part, mode) {
  const min = Math.max(0, Math.round((end - start) / MIN));
  return { id: makeId(start, rower), rower, start, end, min, part: part || null, mode, ts: end };
}
const defaultId = (start, rower) => 's-' + start + '-' + (rower === 'Rower 2' ? '2' : '1');

/* Given the previously-open stint pointer and the live state, return any newly
   completed stint records plus the new open pointer. Pure. */
export function reconcile({ open, state, now = Date.now() }, makeId = defaultId) {
  const curr = currentStint(state, now);
  if (!open) return { records: [], open: curr ? toPtr(curr) : null };
  if (curr && samePtr(open, curr)) return { records: [], open };

  const records = [];
  if (open.mode === 'schedule' && state.scheduleOn && !state.manualOn) {
    // Back-fill every schedule stint that finished since `open` began (incl. the one
    // that was open). Exact maths, so a closed app misses nothing.
    const limit = curr ? Math.min(now, curr.startedAt) : now;
    for (const s of scheduleSegmentsBetween(state, open.startedAt, limit)) {
      records.push(record(makeId, s.rower, s.start, s.end, s.part, 'schedule'));
    }
  } else {
    // Manual stint (or a mode switch): close it at the changeover / now.
    const end = curr ? Math.min(now, curr.startedAt) : now;
    if (end > open.startedAt) records.push(record(makeId, open.rower, open.startedAt, end, open.part, open.mode));
  }
  return { records, open: curr ? toPtr(curr) : null };
}

/* Great-circle distance between two {lat, lon} fixes, in nautical miles. */
export function haversineNm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return 0;
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* Sum of consecutive leg distances through an ordered list of GPS fixes (nm). */
export function totalMiles(fixes = []) {
  let sum = 0;
  for (let i = 1; i < fixes.length; i++) sum += haversineNm(fixes[i - 1], fixes[i]);
  return sum;
}

/* Aggregate stint records (+ optional GPS fixes) into per-rower and overall totals. */
export function summariseStints(records = [], fixes = []) {
  const perRower = { 'Rower 1': { stints: 0, minutes: 0 }, 'Rower 2': { stints: 0, minutes: 0 } };
  for (const r of records) {
    const key = r && r.rower === 'Rower 2' ? 'Rower 2' : 'Rower 1';
    perRower[key].stints += 1;
    perRower[key].minutes += Number(r && r.min) || 0;
  }
  return {
    perRower,
    totalStints: perRower['Rower 1'].stints + perRower['Rower 2'].stints,
    totalMinutes: perRower['Rower 1'].minutes + perRower['Rower 2'].minutes,
    milesMade: totalMiles(fixes)
  };
}
