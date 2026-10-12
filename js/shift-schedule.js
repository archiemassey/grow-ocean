/* shift-schedule.js — pure, DOM-free day/night rowing schedule for a pair.

   The plan for a 24h cycle:
   - NIGHT: exactly one stint per rower (two segments), so each gets one long
     unbroken rest. The night block sits at a chosen clock time.
   - DAY: an even number of stints (equal number each), with a stint length as
     near the requested day length as divides the day block evenly.
   - SPLIT: a balance control. When it is not 50/50 (one rower feeling stronger),
     we bias stint LENGTHS, never counts — strict alternation is preserved, each
     rower still takes the same NUMBER of stints, the stronger one's are longer.

   The key invariant: each rower's total rowing per 24h equals her split share of
   24h (50/50 -> 12h each; 60/40 -> 14h24 / 9h36), regardless of the slider values,
   because every segment length scales by the same split ratio.

   The live countdown and the wake-up alarms are both clocked off these segments. */

const MIN = 60000;            // one minute in ms
const DAY_MIN = 1440;         // minutes in 24h

export const SCHEDULE_DEFAULTS = Object.freeze({
  scheduleOn: false,     // is the computed schedule driving the timer?
  splitPct: 50,          // Rower 1's share of rowing time (clamped 35..65)
  nightShiftMin: 180,    // nominal single night stint (one per rower)
  dayShiftMin: 90,       // target day stint length
  nightStartMin: 20 * 60 // minutes past local midnight the night block begins (20:00)
});

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

/* Normalise raw settings into safe numbers. Night block must leave room for day. */
export function normaliseSchedule(settings = {}) {
  const s = { ...SCHEDULE_DEFAULTS, ...settings };
  const splitPct = clamp(Math.round(Number(s.splitPct) || 50), 35, 65);
  const nightShiftMin = clamp(Math.round(Number(s.nightShiftMin) || 180), 30, 300);
  const dayShiftMin = clamp(Math.round(Number(s.dayShiftMin) || 90), 20, 180);
  const nightStartMin = ((Math.round(Number(s.nightStartMin) || 0) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return { scheduleOn: !!s.scheduleOn, splitPct, nightShiftMin, dayShiftMin, nightStartMin };
}

/* Build the repeating 24h segment pattern (cycle order, starting at night).
   Returns segment lengths in exact (possibly fractional) minutes plus a summary. */
export function computeSchedule(settings = {}) {
  const { splitPct, nightShiftMin, dayShiftMin, nightStartMin } = normaliseSchedule(settings);
  const r1 = splitPct / 100;            // Rower 1 share
  const r2 = 1 - r1;                     // Rower 2 share

  const nightBlock = 2 * nightShiftMin;             // fixed night duration
  const dayBlock = DAY_MIN - nightBlock;            // remainder of the 24h
  // Day stints per rower: pick the count that puts the stint length nearest the target.
  const dayPairs = Math.max(1, Math.round(dayBlock / (2 * dayShiftMin)));
  const dayPairLen = dayBlock / dayPairs;           // combined length of one R1+R2 day pair

  const nightR1 = nightBlock * r1, nightR2 = nightBlock * r2;
  const dayR1 = dayPairLen * r1, dayR2 = dayPairLen * r2;

  // Cycle order: night (R1 then R2), then dayPairs of (R1, R2). Strict alternation
  // holds across every boundary and around the wrap, so swaps stay a simple toggle.
  const segments = [
    { rower: 'Rower 1', min: nightR1, part: 'night' },
    { rower: 'Rower 2', min: nightR2, part: 'night' }
  ];
  for (let i = 0; i < dayPairs; i++) {
    segments.push({ rower: 'Rower 1', min: dayR1, part: 'day' });
    segments.push({ rower: 'Rower 2', min: dayR2, part: 'day' });
  }

  return {
    splitPct, nightShiftMin, dayShiftMin, nightStartMin,
    nightBlock, dayBlock, dayPairs,
    dayShiftActualMin: dayPairLen / 2, // average day stint actually used (50/50 reference)
    nightShiftActual: { 'Rower 1': nightR1, 'Rower 2': nightR2 },
    dayShiftActual: { 'Rower 1': dayR1, 'Rower 2': dayR2 },
    perRowerMin: { 'Rower 1': DAY_MIN * r1, 'Rower 2': DAY_MIN * r2 },
    segments
  };
}

/* Local midnight (ms) for the day containing `now`, using the device's local time. */
function localMidnight(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* The ms timestamp of the cycle start (night begins) at or before `now`. */
export function cycleAnchor(schedule, now = Date.now()) {
  let anchor = localMidnight(now) + schedule.nightStartMin * MIN;
  if (anchor > now) anchor -= DAY_MIN * MIN;
  return anchor;
}

/* The segment on oars at `now`: who, when it started and when it ends. */
export function currentSegment(schedule, now = Date.now()) {
  const cycleMs = DAY_MIN * MIN;
  const anchor = cycleAnchor(schedule, now);
  let t = anchor;
  for (let guard = 0; guard < schedule.segments.length + 2; guard++) {
    for (const seg of schedule.segments) {
      const end = t + seg.min * MIN;
      if (now < end) return { rower: seg.rower, part: seg.part, startedAt: Math.round(t), endsAt: Math.round(end) };
      t = end;
    }
    if (t - anchor >= cycleMs - 1) t = anchor + cycleMs * (Math.floor((now - anchor) / cycleMs) + 1);
  }
  return null;
}

/* The next `count` handover timestamps from `now`, each tagged with the rower who
   comes ON at that handover. Used for both the display and the wake-up alarms. */
export function nextHandovers(schedule, { count = 8, now = Date.now() } = {}) {
  if (!schedule || !schedule.segments || !schedule.segments.length) return [];
  const anchor = cycleAnchor(schedule, now);
  const out = [];
  let t = anchor, i = 0;
  // Walk forward across repeated cycles until we have `count` future handovers.
  for (let guard = 0; guard < 10000 && out.length < count; guard++) {
    const seg = schedule.segments[i % schedule.segments.length];
    const end = t + seg.min * MIN;
    if (end > now) {
      const nextSeg = schedule.segments[(i + 1) % schedule.segments.length];
      out.push({ at: Math.round(end), onNext: nextSeg.rower, part: nextSeg.part });
    }
    t = end; i++;
  }
  return out;
}

/* Human summary of each rower's daily rowing total, e.g. "14h 24m". */
export function formatHours(min) {
  const whole = Math.round(min);
  return Math.floor(whole / 60) + 'h ' + String(whole % 60).padStart(2, '0') + 'm';
}
