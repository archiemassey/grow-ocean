/* shift-ics.js — build a native iOS Calendar (.ics) of upcoming shift handovers,
   each with an alarm a set number of minutes before.

   Plain English: a web app CANNOT set a loud background alarm on an iPhone. But it
   CAN hand iOS a calendar file; importing it once gives real, offline, locked-screen
   Calendar alerts. This is the reliable wake-up for the resting rower — and the
   10-minutes-to-handover cue for the rower on oars (they swap, so one file serves both).

   DOM-free and pure so it can be unit-tested. Uses UTC (Z) timestamps, so the alarms
   fire at the correct absolute instant regardless of the phone's time zone. */

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

/* Format a timestamp as an iCalendar UTC stamp: YYYYMMDDTHHMMSSZ. */
export function icsStamp(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
}

/* Build a complete .ics string of the next `count` handovers, each a 1-minute
   Calendar event with a DISPLAY alarm `leadMin` minutes before. ASCII only
   (no emoji/em-dashes) to stay within iCalendar line-length rules safely. */
export function buildWakeupICS(state, { count = 8, leadMin = 10, now = Date.now() } = {}) {
  const handovers = nextHandovers(state, { count, now });
  const dtstamp = icsStamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gROW Ocean//Shift Wake-ups//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:gROW Ocean shift wake-ups'
  ];
  handovers.forEach((at, i) => {
    const onNext = rowerAfter(state, i);
    lines.push(
      'BEGIN:VEVENT',
      'UID:grow-ocean-handover-' + at + '-' + i + '@grow-ocean',
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
