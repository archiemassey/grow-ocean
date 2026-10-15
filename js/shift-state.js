import { db } from './db.js';
import { normaliseSchedule, computeSchedule, currentSegment } from './shift-schedule.js';

export const SHIFT_DEFAULTS = Object.freeze({
  shiftMin: 90, shiftStart: null, activeRower: 'Rower 1', shiftLastStart: 0,
  // Day/night schedule (deterministic from these settings + the phone clock, so two
  // phones with the same settings stay in sync without sharing a start time).
  scheduleOn: false, splitPct: 50, nightShiftMin: 180, dayShiftMin: 90, nightStartMin: 1200,
  // One-off current-stint nudge (±5): adjustMin shifts ONLY this phone's live handover
  // for the stint whose start is adjustSeg, then self-expires at the next changeover.
  adjustMin: 0, adjustSeg: 0,
  // Manual stopwatch: ▶/⏸/⇄ hand the dial to a stopwatch — seeded from the schedule's
  // current stint so the switch is seamless — while the schedule still clocks the
  // wake-up alarms + QR sync. ±5 does NOT flip this; ↺ in schedule mode clears it.
  manualOn: false, pausedLeft: 0,
  // Optional display names for the pair. Internal ids stay 'Rower 1'/'Rower 2'.
  rower1Name: '', rower2Name: ''
});

const cleanName = value => (typeof value === 'string' ? value.trim().slice(0, 24) : '');

/* Display name for a rower id, falling back to the id when no custom name is set.
   Internal ids ('Rower 1'/'Rower 2') never change — only the label a human sees. */
export function rowerName(state, rower) {
  if (!state) return rower;
  const custom = rower === 'Rower 2' ? state.rower2Name : state.rower1Name;
  return cleanName(custom) || rower;
}

function validate(state) {
  if (!Number.isFinite(state.shiftMin) || state.shiftMin < 5 ||
      (state.shiftStart !== null && (!Number.isFinite(state.shiftStart) || state.shiftStart <= 0)) ||
      !['Rower 1', 'Rower 2'].includes(state.activeRower) ||
      !Number.isFinite(state.shiftLastStart) || state.shiftLastStart < 0)
    throw new Error('Saved shift settings are invalid.');
  // Schedule, nudge and manual fields are coerced/clamped rather than rejected, so a
  // bad value can never break the timer.
  const adjustMin = Number.isFinite(state.adjustMin) ? state.adjustMin : 0;
  const adjustSeg = Number.isFinite(state.adjustSeg) ? state.adjustSeg : 0;
  const pausedLeft = Number.isFinite(state.pausedLeft) && state.pausedLeft > 0 ? state.pausedLeft : 0;
  const manualOn = !!state.manualOn;
  const rower1Name = cleanName(state.rower1Name);
  const rower2Name = cleanName(state.rower2Name);
  return { ...state, adjustMin, adjustSeg, pausedLeft, manualOn, rower1Name, rower2Name, ...normaliseSchedule(state) };
}

export function shiftDisplay(state, now = Date.now()) {
  if (!state) return { status: 'unavailable', label: 'Shift unavailable', time: '—', rower: null, phase: null, frac: 0, endsAt: null, startedAt: null, running: false, paused: false };
  // Schedule mode shows the deterministic clock, including a one-off ±5 nudge, UNTIL
  // ▶/⏸/⇄ hand the dial to the manual stopwatch (manualOn); from then on the stopwatch
  // owns the dial while the schedule still clocks the wake-up alarms + QR sync.
  if (state.scheduleOn && !state.manualOn) return scheduleDisplay(state, now);
  return manualDisplay(state, now);
}

/* Manual stopwatch — fixed mode, or schedule mode after a quick control is used.
   idle → ready, running → counting down from shiftStart, paused → frozen remaining. */
function manualDisplay(state, now) {
  const total = state.shiftMin * 60000;
  const paused = state.pausedLeft > 0;
  const idle = !paused && state.shiftStart === null;
  const left = paused ? state.pausedLeft : idle ? total : state.shiftStart + total - now;
  const seconds = Math.floor(Math.abs(left) / 1000);
  const time = (left < 0 ? '+' : '') + String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' + String(seconds % 60).padStart(2, '0');
  const status = idle ? 'idle' : paused ? 'paused' : left <= 0 ? 'overdue' : left <= 600000 ? 'warning' : 'running';
  // Keep the Night/Day colour + phase tag when a schedule is configured.
  let phase = null;
  if (state.scheduleOn) {
    const seg = currentSegment(computeSchedule(state), now);
    phase = seg ? seg.part : null;
  }
  const base = phase === 'night' ? 'Night · ' : phase === 'day' ? 'Day · ' : '';
  const label = idle ? 'No shift running' : paused ? base + 'Paused'
    : status === 'overdue' ? base + 'Overdue — handover'
    : status === 'warning' ? base + 'Handover in ≤10 min' : base + 'On oars';
  const frac = idle ? 0 : Math.min(1, Math.max(0, (total - Math.max(0, Math.min(total, left))) / total));
  const endsAt = idle || paused ? null : state.shiftStart + total;
  return { status, label, time, rower: state.activeRower, phase, frac, endsAt, startedAt: idle || paused ? null : state.shiftStart, running: !idle && !paused, paused };
}

/* Live countdown for the computed day/night schedule — clocked off the current stint.
   A one-off ±5 nudge (adjustMin, tied to this stint's start) shifts only the live
   handover on this phone; it self-expires when the stint changes. Used until ▶/⏸/⇄
   hand over to manualDisplay. */
function scheduleDisplay(state, now) {
  const seg = currentSegment(computeSchedule(state), now);
  if (!seg) return { status: 'idle', label: 'No schedule', time: '--:--', rower: null, phase: null, frac: 0, endsAt: null, startedAt: null, running: false, paused: false };
  const adjust = state.adjustSeg === seg.startedAt ? (Number(state.adjustMin) || 0) * 60000 : 0;
  const endsAt = seg.endsAt + adjust;
  const left = endsAt - now;
  const seconds = Math.floor(Math.abs(left) / 1000);
  const time = (left < 0 ? '+' : '') + String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' + String(seconds % 60).padStart(2, '0');
  const status = left <= 0 ? 'overdue' : left <= 600000 ? 'warning' : 'running';
  const label = (seg.part === 'night' ? 'Night · ' : 'Day · ') +
    (status === 'overdue' ? 'Overdue — handover' : status === 'warning' ? 'Handover in ≤10 min' : 'On oars');
  const total = Math.max(60000, endsAt - seg.startedAt);
  const frac = Math.min(1, Math.max(0, (now - seg.startedAt) / total));
  return { status, label, time, rower: seg.rower, phase: seg.part, frac, endsAt, startedAt: seg.startedAt, running: true, paused: false };
}

/* Seed the manual stopwatch from the schedule's current stint, so touching a quick
   control in schedule mode continues seamlessly (same rower, same remaining) rather
   than jumping. No-op in fixed mode or once the stopwatch already owns the dial. */
function seedManual(state, now) {
  if (!state.scheduleOn || state.manualOn) return {};
  const seg = currentSegment(computeSchedule(state), now);
  if (!seg) return { manualOn: true };
  return {
    manualOn: true,
    activeRower: seg.rower,
    shiftMin: Math.max(5, Math.min(600, Math.round((seg.endsAt - seg.startedAt) / 60000))),
    shiftStart: seg.startedAt,
    pausedLeft: 0
  };
}

// One timestamp-based state source for Home and the shell. No view owns a timer.
export function createShiftStore(storage, { now = Date.now, broadcast = () => {} } = {}) {
  let state = null, error = null, queue = Promise.resolve();
  const listeners = new Set();
  const snapshot = () => ({ state, error });
  const emit = () => listeners.forEach(listener => listener(snapshot()));
  function enqueue(action) {
    const result = queue.then(async () => {
      try { state = validate(await action()); error = null; }
      catch (failure) { error = failure; emit(); throw failure; }
      emit();
      return state;
    });
    queue = result.catch(() => {});
    return result;
  }
  return {
    snapshot,
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
    tick: emit,
    refresh() { return enqueue(() => storage.getSettings(SHIFT_DEFAULTS)); },
    async change(action) {
      const result = await enqueue(() => storage.updateSettings(SHIFT_DEFAULTS, saved => {
        const base = validate(saved);
        const nowMs = now();
        // Schedule mode, before any manual takeover, keeps the deterministic clock.
        if (base.scheduleOn && !base.manualOn && (action === 'longer' || action === 'shorter')) {
          // ±5 is a ONE-OFF nudge to the CURRENT handover only: it shifts just this
          // stint's end on this phone and self-expires at the next changeover, so the
          // next rower's scheduled end is untouched. It never flips to manual mode.
          const seg = currentSegment(computeSchedule(base), nowMs);
          if (seg) {
            const delta = action === 'longer' ? 5 : -5;
            const same = base.adjustSeg === seg.startedAt;
            return validate({ ...base, adjustSeg: seg.startedAt,
              adjustMin: (same ? (Number(base.adjustMin) || 0) : 0) + delta });
          }
        }
        // Reset in schedule mode always hands the dial back to the pure schedule: it
        // drops any one-off nudge AND any manual takeover (from ▶/⏸/⇄), rather than
        // starting a free-running stopwatch.
        if (action === 'reset' && base.scheduleOn) {
          return validate({ ...base, adjustMin: 0, adjustSeg: 0, manualOn: false, pausedLeft: 0 });
        }
        // Manual stopwatch — fixed mode, or schedule mode once ▶/⏸/⇄ have taken over.
        const next = { ...base, ...seedManual(base, nowMs) };
        const total = () => next.shiftMin * 60000;
        // Strictly-increasing start id (perspective key + ICS UID uniqueness) even if
        // the clock moves backwards.
        const freshStart = () => Math.max(nowMs, (base.shiftStart || 0) + 1, base.shiftLastStart + 1);
        if (action === 'start') {
          if (next.pausedLeft > 0) {
            // Resume from pause, preserving the elapsed time.
            next.shiftStart = nowMs - (total() - next.pausedLeft);
            next.pausedLeft = 0;
          } else {
            next.shiftStart = freshStart();
            next.shiftLastStart = next.shiftStart;
          }
        } else if (action === 'pause') {
          if (next.pausedLeft === 0 && next.shiftStart !== null) {
            next.pausedLeft = Math.max(0, next.shiftStart + total() - nowMs);
            next.shiftStart = null;
          }
        } else if (action === 'reset') {
          // Restart the current stint from its full configured length, running now.
          // shiftLastStart is deliberately left unchanged so a reset keeps this shift's
          // identity (and its "This shift" perspective) — only a fresh start or swap
          // begins a genuinely new shift.
          next.shiftStart = freshStart();
          next.pausedLeft = 0;
        } else if (action === 'swap') {
          next.activeRower = next.activeRower === 'Rower 1' ? 'Rower 2' : 'Rower 1';
          next.shiftStart = freshStart();
          next.shiftLastStart = next.shiftStart;
          next.pausedLeft = 0;
        } else if (action === 'shorter' || action === 'longer') {
          const delta = action === 'longer' ? 5 : -5;
          next.shiftMin = Math.max(5, Math.min(600, next.shiftMin + delta));
          if (next.pausedLeft > 0) next.pausedLeft = Math.min(next.pausedLeft, next.shiftMin * 60000);
        } else throw new Error('Unknown shift action');
        return validate(next);
      }));
      broadcast();
      return result;
    },
    // Save the pair's display names (merged + validated like schedule settings).
    async setNames(rower1Name, rower2Name) {
      const result = await enqueue(() => storage.updateSettings(SHIFT_DEFAULTS, saved =>
        validate({ ...validate(saved), rower1Name, rower2Name })));
      broadcast();
      return result;
    },
    // Merge schedule settings (sliders / Re-calc / QR apply). Values are clamped by validate().
    async setSchedule(partial) {
      const result = await enqueue(() => storage.updateSettings(SHIFT_DEFAULTS, saved =>
        validate({ ...validate(saved), ...partial })));
      broadcast();
      return result;
    }
  };
}

let channel;
export const shiftStore = createShiftStore(db, { broadcast: () => channel?.postMessage('changed') });

export function initShiftClock() {
  const refresh = () => shiftStore.refresh().catch(() => {});
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel('grow-ocean-shift');
      channel.onmessage = refresh;
    } catch { /* Restricted browsers still refresh saved state on focus/resume. */ }
  }
  let interval;
  function resume() {
    clearInterval(interval);
    if (!document.hidden) {
      shiftStore.tick();
      refresh();
      interval = setInterval(() => shiftStore.tick(), 1000);
    }
  }
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', refresh);
  window.addEventListener('pagehide', () => clearInterval(interval));
  resume();
}

export function mountShiftStrip(link) {
  return shiftStore.subscribe(({ state, error }) => {
    const display = shiftDisplay(state);
    link.dataset.status = error ? 'unavailable' : display.status;
    const rower = display.rower || state?.activeRower;
    const name = state ? rowerName(state, rower) : rower;
    link.textContent = error ? 'Shift storage unavailable — open Home to retry'
      : state ? `${name} · ${display.label} · ${display.time}` : 'Loading shift…';
  });
}
