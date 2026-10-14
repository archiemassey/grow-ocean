/* shift-ics.js — build a native iOS Calendar (.ics) of upcoming shift handovers,
   each with an alarm a set number of minutes before.

   Plain English: a web app CANNOT set a loud background alarm on an iPhone. But it
   CAN hand iOS a calendar file; importing it once gives real, offline, locked-screen
   Calendar alerts. This is the reliable wake-up for the resting rower — and the
   10-minutes-to-handover cue for the rower on oars (they swap, so one file serves both).

   DOM-free and pure so it can be unit-tested. Uses UTC (Z) timestamps, so the alarms
   fire at the correct absolute instant regardless of the phone's time zone. */

import { computeSchedule, nextHandovers as scheduleHandovers } from './shift-schedule.js';

/* Upcoming handover timestamps (ms). A handover happens every shiftMin minutes from
   shiftStart. If no shift is running we anchor from `now` as a planning aid. */
export function nextHandovers(state, { count = 8, now = Date.now() } = {}) {
  if (!state || !Number.isFinite(state.shiftMin) || state.shiftMin < 5) return [];
  const stepMs = state.shiftMin * 60000;
  const anchor = Number.isFinite(state.shiftStart) && state.shiftStart ? state.shiftStart : now;
  let t = anchor + stepMs;
  while (t <= now) t += stepMs; // first handover strictly in the future
  const out = [];
  for (let i = 0; i < count; i++) { out.push(t); t += stepMs; }
  return out;
}

/* Who is on oars AFTER the i-th upcoming handover (i = 0 is the next handover).
   The rowers swap at every handover, so the one resting now goes on first. */
export function rowerAfter(state, i) {
  const rowers = ['Rower 1', 'Rower 2'];
  const activeNow = state && state.activeRower === 'Rower 2' ? 1 : 0;
  return rowers[(activeNow + i + 1) % 2];
}

function pad(n) { return String(n).padStart(2, '0'); }

/* iCalendar SEQUENCE — bumped each time a file is generated (minute resolution) so a
   re-import with the SAME UID updates the existing Calendar event in place instead of
   creating a duplicate. This is also what lets "Remove gROW alarms" cancel them. */
function seqFor(now) { return Math.floor(now / 60000); }

/* Resolve a rower's display name for SUMMARY/DESCRIPTION text. Internal UIDs always use
   the fixed id so cancels still match prior imports — only the human-visible text uses
   the custom name. */
function labeller(names) { return r => (names && names[r]) || r; }

/* Format a timestamp as an iCalendar UTC stamp: YYYYMMDDTHHMMSSZ. */
export function icsStamp(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
}

/* Build a complete .ics string of the next `count` handovers, each a 1-minute
   Calendar event with a DISPLAY alarm `leadMin` minutes before. ASCII only
   (no emoji/em-dashes) to stay within iCalendar line-length rules safely. */
export function buildWakeupICS(state, { count = 8, leadMin = 10, now = Date.now(), names = {} } = {}) {
  const handovers = nextHandovers(state, { count, now });
  const dtstamp = icsStamp(now);
  const seq = seqFor(now);
  const label = labeller(names);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gROW Ocean//Shift Wake-ups//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:gROW Ocean shift wake-ups'
  ];
  handovers.forEach((at, i) => {
    const onNext = label(rowerAfter(state, i));
    lines.push(
      'BEGIN:VEVENT',
      'UID:grow-ocean-handover-' + at + '@grow-ocean',
      'SEQUENCE:' + seq,
      'DTSTAMP:' + dtstamp,
      'DTSTART:' + icsStamp(at),
      'DTEND:' + icsStamp(at + 60000),
      'SUMMARY:Shift handover - ' + onNext + ' on oars',
      'DESCRIPTION:' + leadMin + ' min warning. Wake your partner and prepare to swap.',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Handover in ' + leadMin + ' minutes - ' + onNext + ' on oars',
      'TRIGGER:-PT' + leadMin + 'M',
      'END:VALARM',
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/* Build a .ics of wake-up alarms for ONE rower, clocked off the day/night schedule.
   We keep ONLY the handovers where `rower` comes ON oars, so her own rowing stints
   are excluded — these are the moments she actually needs waking. Horizons:
     'next'  - just her very next on-oars handover (a single alarm)
     'night' - her night on-oars handovers over the next 7 days
     '24h'   - all her on-oars handovers in the next 24 hours
   Each kept handover is a 1-minute event with a DISPLAY alarm `leadMin` before. */
export function buildRowerWakeupsICS(settings, { rower = 'Rower 1', horizon = '24h', leadMin = 10, now = Date.now(), names = {} } = {}) {
  const schedule = computeSchedule(settings);
  const all = scheduleHandovers(schedule, { count: 600, now });
  const mine = all.filter(hv => hv.onNext === rower);
  const DAY_MS = 24 * 60 * 60000;
  let picks;
  if (horizon === 'next') picks = mine.slice(0, 1);
  else if (horizon === 'night') picks = mine.filter(hv => hv.part === 'night' && hv.at <= now + 7 * DAY_MS);
  else picks = mine.filter(hv => hv.at <= now + DAY_MS); // '24h'

  const slug = rower.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const name = (names && names[rower]) || rower;
  const dtstamp = icsStamp(now);
  const seq = seqFor(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gROW Ocean//Rower Wake-ups//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:gROW Ocean wake-ups - ' + name
  ];
  picks.forEach(({ at, part }) => {
    const when = part === 'night' ? 'night' : 'day';
    lines.push(
      'BEGIN:VEVENT',
      'UID:grow-ocean-wake-' + slug + '-' + at + '@grow-ocean',
      'SEQUENCE:' + seq,
      'DTSTAMP:' + dtstamp,
      'DTSTART:' + icsStamp(at),
      'DTEND:' + icsStamp(at + 60000),
      'SUMMARY:Wake up ' + name + ' - on oars (' + when + ')',
      'DESCRIPTION:' + leadMin + ' min warning. Your shift starts - get ready to row.',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:On oars in ' + leadMin + ' minutes - ' + name,
      'TRIGGER:-PT' + leadMin + 'M',
      'END:VALARM',
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/* Build a .ics clocked off the computed day/night schedule. Each handover is a
   1-minute event with a DISPLAY alarm `leadMin` minutes before. The schedule is
   deterministic from the settings + the phone clock, so the resting rower's wake-ups
   line up exactly with the active rower's countdown. */
export function buildScheduleICS(settings, { count = 12, leadMin = 10, now = Date.now(), names = {} } = {}) {
  const schedule = computeSchedule(settings);
  const handovers = scheduleHandovers(schedule, { count, now });
  const dtstamp = icsStamp(now);
  const seq = seqFor(now);
  const label = labeller(names);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gROW Ocean//Shift Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:gROW Ocean shift schedule'
  ];
  handovers.forEach(({ at, onNext, part }) => {
    const when = part === 'night' ? 'night' : 'day';
    lines.push(
      'BEGIN:VEVENT',
      'UID:grow-ocean-schedule-' + at + '@grow-ocean',
      'SEQUENCE:' + seq,
      'DTSTAMP:' + dtstamp,
      'DTSTART:' + icsStamp(at),
      'DTEND:' + icsStamp(at + 60000),
      'SUMMARY:Shift handover - ' + label(onNext) + ' on oars (' + when + ')',
      'DESCRIPTION:' + leadMin + ' min warning. Wake your partner and prepare to swap.',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Handover in ' + leadMin + ' minutes - ' + label(onNext) + ' on oars',
      'TRIGGER:-PT' + leadMin + 'M',
      'END:VALARM',
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/* Build a METHOD:CANCEL .ics that withdraws previously-imported gROW alarms.

   A PWA cannot delete iOS Calendar events through any API. The workaround: emit
   CANCEL/STATUS:CANCELLED events with the SAME stable UIDs we published before and a
   HIGHER sequence, so a well-behaved Calendar removes the matching events on import.
   We cover the next `days` of schedule handovers (both the schedule and per-rower wake
   UIDs, since the user may have imported either), plus the running fixed-shift handover
   UIDs when a manual shift is active. Not guaranteed on every calendar app — pair with
   a dedicated gROW calendar the user can clear if needed. */
export function buildCancelICS(settings, { days = 21, now = Date.now(), names = {} } = {}) {
  const dtstamp = icsStamp(now);
  // Far above any publish sequence so the cancel always wins.
  const seq = seqFor(now) + 1000000;
  const horizonMs = now + days * 24 * 60 * 60000;
  const uids = new Set();

  // Schedule + per-rower wake UIDs across the horizon.
  const schedule = computeSchedule(settings);
  scheduleHandovers(schedule, { count: 2000, now }).forEach(({ at, onNext }) => {
    if (at > horizonMs) return;
    uids.add('grow-ocean-schedule-' + at + '@grow-ocean');
    const slug = onNext.toLowerCase().replace(/[^a-z0-9]+/g, '');
    uids.add('grow-ocean-wake-' + slug + '-' + at + '@grow-ocean');
  });
  // Running fixed-shift handover UIDs, when a manual shift is active.
  if (settings && Number.isFinite(settings.shiftStart) && settings.shiftStart) {
    nextHandovers(settings, { count: 200, now }).forEach(at => {
      if (at <= horizonMs) uids.add('grow-ocean-handover-' + at + '@grow-ocean');
    });
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gROW Ocean//Cancel//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:CANCEL',
    'X-WR-CALNAME:gROW Ocean shift schedule'
  ];
  [...uids].forEach(uid => {
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + uid,
      'SEQUENCE:' + seq,
      'STATUS:CANCELLED',
      'DTSTAMP:' + dtstamp,
      'DTSTART:' + dtstamp,
      'SUMMARY:gROW Ocean alarm cancelled',
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
