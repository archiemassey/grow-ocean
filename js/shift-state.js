import { db } from './db.js';
import { normaliseSchedule, computeSchedule, currentSegment } from './shift-schedule.js';

export const SHIFT_DEFAULTS = Object.freeze({
  shiftMin: 90, shiftStart: null, activeRower: 'Rower 1', shiftLastStart: 0,
  // Day/night schedule (deterministic from these settings + the phone clock, so two
  // phones with the same settings stay in sync without sharing a start time).
  scheduleOn: false, splitPct: 50, nightShiftMin: 180, dayShiftMin: 90, nightStartMin: 1200
});

function validate(state) {
  if (!Number.isFinite(state.shiftMin) || state.shiftMin < 5 ||
      (state.shiftStart !== null && (!Number.isFinite(state.shiftStart) || state.shiftStart <= 0)) ||
      !['Rower 1', 'Rower 2'].includes(state.activeRower) ||
      !Number.isFinite(state.shiftLastStart) || state.shiftLastStart < 0)
    throw new Error('Saved shift settings are invalid.');
  // Schedule fields are clamped rather than rejected, so they can never break the timer.
  return { ...state, ...normaliseSchedule(state) };
}

export function shiftDisplay(state, now = Date.now()) {
  if (!state) return { status: 'unavailable', label: 'Shift unavailable', time: '—', rower: null };
  if (state.scheduleOn) return scheduleDisplay(state, now);
  const left = state.shiftStart === null ? state.shiftMin * 60000
    : state.shiftStart + state.shiftMin * 60000 - now;
  const seconds = Math.floor(Math.abs(left) / 1000);
  const time = (left < 0 ? '+' : '') + String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' + String(seconds % 60).padStart(2, '0');
  const status = state.shiftStart === null ? 'idle' : left <= 0 ? 'overdue' : left <= 600000 ? 'warning' : 'running';
  const label = status === 'idle' ? 'No shift running' : status === 'overdue' ? 'Overdue — handover'
    : status === 'warning' ? 'Handover in ≤10 min' : 'On oars';
  return { status, label, time, rower: state.activeRower };
}

/* Live countdown for the computed day/night schedule — clocked off the current stint. */
function scheduleDisplay(state, now) {
  const seg = currentSegment(computeSchedule(state), now);
  if (!seg) return { status: 'idle', label: 'No schedule', time: '--:--', rower: null };
  const left = seg.endsAt - now;
  const seconds = Math.floor(Math.abs(left) / 1000);
  const time = (left < 0 ? '+' : '') + String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' + String(seconds % 60).padStart(2, '0');
  const status = left <= 0 ? 'overdue' : left <= 600000 ? 'warning' : 'running';
  const label = (seg.part === 'night' ? 'Night · ' : 'Day · ') +
    (status === 'overdue' ? 'Overdue — handover' : status === 'warning' ? 'Handover in ≤10 min' : 'On oars');
  return { status, label, time, rower: seg.rower };
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
        const next = { ...validate(saved) };
        if (action === 'start' || action === 'swap') {
          next.shiftStart = Math.max(now(), (saved.shiftStart || 0) + 1, saved.shiftLastStart + 1);
          next.shiftLastStart = next.shiftStart;
          if (action === 'swap') next.activeRower = saved.activeRower === 'Rower 1' ? 'Rower 2' : 'Rower 1';
        } else if (action === 'reset') {
          next.shiftLastStart = Math.max(saved.shiftLastStart, saved.shiftStart || 0);
          next.shiftStart = null;
        }
        else if (action === 'shorter') next.shiftMin = Math.max(5, saved.shiftMin - 5);
        else if (action === 'longer') next.shiftMin += 5;
        else throw new Error('Unknown shift action');
        return validate(next);
      }));
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
    link.textContent = error ? 'Shift storage unavailable — open Home to retry'
      : state ? `${rower} · ${display.label} · ${display.time}` : 'Loading shift…';
  });
}
