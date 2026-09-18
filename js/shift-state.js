import { db } from './db.js';

export const SHIFT_DEFAULTS = Object.freeze({
  shiftMin: 90, shiftStart: null, activeRower: 'Rower 1', shiftLastStart: 0
});

function validate(state) {
  if (!Number.isFinite(state.shiftMin) || state.shiftMin < 5 ||
      (state.shiftStart !== null && (!Number.isFinite(state.shiftStart) || state.shiftStart <= 0)) ||
      !['Rower 1', 'Rower 2'].includes(state.activeRower) ||
      !Number.isFinite(state.shiftLastStart) || state.shiftLastStart < 0)
    throw new Error('Saved shift settings are invalid.');
  return state;
}

export function shiftDisplay(state, now = Date.now()) {
  if (!state) return { status: 'unavailable', label: 'Shift unavailable', time: '—' };
  const left = state.shiftStart === null ? state.shiftMin * 60000
    : state.shiftStart + state.shiftMin * 60000 - now;
  const seconds = Math.floor(Math.abs(left) / 1000);
  const time = (left < 0 ? '+' : '') + String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' + String(seconds % 60).padStart(2, '0');
  const status = state.shiftStart === null ? 'idle' : left <= 0 ? 'overdue' : left <= 600000 ? 'warning' : 'running';
  const label = status === 'idle' ? 'No shift running' : status === 'overdue' ? 'Overdue — handover'
    : status === 'warning' ? 'Handover in ≤10 min' : 'On oars';
  return { status, label, time };
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
    link.textContent = error ? 'Shift storage unavailable — open Home to retry'
      : state ? `${state.activeRower} · ${display.label} · ${display.time}` : 'Loading shift…';
  });
}
