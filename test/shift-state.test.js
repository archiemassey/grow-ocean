import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createShiftStore, shiftDisplay, rowerName, SHIFT_DEFAULTS } from '../js/shift-state.js';
import { primaryTab, parentRoute, EMERGENCY_ROUTES } from '../js/navigation.js';

function storage() {
  let saved = { ...SHIFT_DEFAULTS }, queue = Promise.resolve(), fail = false;
  return {
    async getSettings() { if (fail) throw new Error('Disk unavailable'); return { ...saved }; },
    updateSettings(defaults, reducer) {
      const result = queue.then(() => {
        if (fail) throw new Error('Disk unavailable');
        saved = reducer({ ...saved });
        return { ...saved };
      });
      queue = result.catch(() => {});
      return result;
    },
    fail(value) { fail = value; }
  };
}

test('shared shift state commits Start, duration, Swap and Reset without divergent timers', async () => {
  const db = storage();
  let broadcast = 0;
  const store = createShiftStore(db, { now: () => 1000, broadcast: () => broadcast++ });
  const home = [], strip = [];
  const unsub = store.subscribe(s => home.push(s));
  store.subscribe(s => strip.push(s));
  await store.refresh();
  assert.equal(store.snapshot().state.shiftStart, null);
  await store.change('start');
  await store.change('longer');
  assert.equal(store.snapshot().state.shiftStart, 1000);
  assert.equal(store.snapshot().state.shiftMin, 95);
  await store.change('shorter');
  await store.change('swap');
  assert.equal(store.snapshot().state.shiftStart, 1001);
  assert.equal(store.snapshot().state.activeRower, 'Rower 2');
  await store.change('reset');
  assert.equal(store.snapshot().state.shiftStart, 1002, 'reset restarts the stint running from a fresh ID');
  await store.change('start');
  assert.equal(store.snapshot().state.shiftStart, 1003, 'a new start cannot reuse a same-millisecond ID');
  assert.deepEqual(home, strip, 'both subscribers see exactly the same committed snapshots');
  assert.equal(broadcast, 6);
  unsub();
  const count = home.length;
  store.tick();
  assert.equal(home.length, count, 'leaving Home releases its subscription');
});

test('concurrent tabs modify latest persisted state atomically and refresh by notification', async () => {
  const db = storage();
  const a = createShiftStore(db, { now: () => 1000 });
  const b = createShiftStore(db, { now: () => 1000 });
  await Promise.all([a.refresh(), b.refresh()]);
  await Promise.all([a.change('start'), b.change('swap')]);
  await a.refresh();
  assert.equal(a.snapshot().state.shiftStart, 1001);
  assert.equal(a.snapshot().state.activeRower, 'Rower 2');
  await Promise.all([a.change('longer'), b.change('longer')]);
  await Promise.all([a.refresh(), b.refresh()]);
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.equal(a.snapshot().state.shiftMin, 100);
  assert.equal(a.snapshot().state.shiftStart, 1001);
});

test('failed persistence exposes error, never publishes an optimistic shift, and supports retry', async () => {
  const db = storage(), store = createShiftStore(db);
  await store.refresh();
  db.fail(true);
  await assert.rejects(store.change('start'), /Disk unavailable/);
  assert.equal(store.snapshot().state.shiftStart, null);
  assert.ok(store.snapshot().error);
  db.fail(false);
  await store.refresh();
  assert.equal(store.snapshot().error, null);
  const invalid = createShiftStore({ getSettings: async () => ({ ...SHIFT_DEFAULTS, shiftMin: null }) });
  await assert.rejects(invalid.refresh(), /invalid/);
  assert.equal(invalid.snapshot().state, null, 'invalid data is not silently replaced with defaults');
});

test('reset of a legacy running shift preserves its ID floor even after the clock moves backwards', async () => {
  const db = storage();
  await db.updateSettings(SHIFT_DEFAULTS, saved => ({ ...saved, shiftStart: 2000 }));
  const store = createShiftStore(db, { now: () => 1000 });
  await store.refresh();
  await store.change('reset');
  await store.change('start');
  assert.equal(store.snapshot().state.shiftStart, 2002);
});

test('pause freezes the remaining time and resume continues from exactly where it stopped', async () => {
  const db = storage();
  let clock = 1_000_000;
  const store = createShiftStore(db, { now: () => clock });
  await store.refresh();
  await store.change('start');
  assert.equal(shiftDisplay(store.snapshot().state, clock).time, '90:00');

  clock += 30 * 60000; // 30 minutes of rowing
  await store.change('pause');
  let display = shiftDisplay(store.snapshot().state, clock);
  assert.equal(display.paused, true);
  assert.equal(display.running, false);
  assert.equal(display.status, 'paused');
  assert.equal(display.time, '60:00', 'paused clock freezes with 60 minutes left');
  assert.equal(store.snapshot().state.shiftStart, null, 'paused shift has no running start');

  clock += 45 * 60000; // time passes while paused — must not drain the timer
  display = shiftDisplay(store.snapshot().state, clock);
  assert.equal(display.time, '60:00', 'the frozen time does not drain while paused');

  await store.change('start'); // resume
  display = shiftDisplay(store.snapshot().state, clock);
  assert.equal(display.paused, false);
  assert.equal(display.running, true);
  assert.equal(display.time, '60:00', 'resume continues from the frozen 60 minutes');
});

test('reset restarts a running stint to full length without rotating the shift identity', async () => {
  const db = storage();
  let clock = 2_000_000;
  const store = createShiftStore(db, { now: () => clock });
  await store.refresh();
  await store.change('start');
  const stintId = store.snapshot().state.shiftLastStart;
  clock += 70 * 60000;
  assert.equal(shiftDisplay(store.snapshot().state, clock).time, '20:00');
  await store.change('reset');
  const after = store.snapshot().state;
  assert.equal(shiftDisplay(after, clock).time, '90:00', 'reset returns to the full configured length');
  assert.equal(after.running ?? true, true);
  assert.equal(shiftDisplay(after, clock).running, true, 'reset leaves the stint running');
  assert.equal(after.shiftLastStart, stintId, 'reset keeps the same shift identity (perspective)');
});

test('a quick control in schedule mode seeds the manual stopwatch from the current stint', async () => {
  const db = storage();
  const now = Date.UTC(2026, 0, 9, 12, 0, 0);
  await db.updateSettings(SHIFT_DEFAULTS, saved => ({
    ...saved, scheduleOn: true, splitPct: 50, nightShiftMin: 180, dayShiftMin: 90, nightStartMin: 1200
  }));
  const store = createShiftStore(db, { now: () => now });
  await store.refresh();
  assert.equal(store.snapshot().state.manualOn, false, 'schedule mode starts clock-driven');
  const scheduled = shiftDisplay(store.snapshot().state, now);
  assert.ok(scheduled.running, 'the deterministic schedule is running');

  await store.change('swap');
  const state = store.snapshot().state;
  assert.equal(state.manualOn, true, 'the quick control takes over the dial');
  assert.notEqual(state.activeRower, scheduled.rower, 'swap puts the other rower on oars');
  assert.equal(shiftDisplay(state, now).rower, state.activeRower, 'the dial now follows the manual rower');
});

test('rowerName falls back to the id, trims custom names and tolerates missing state', () => {
  assert.equal(rowerName({ rower1Name: '', rower2Name: '' }, 'Rower 1'), 'Rower 1');
  assert.equal(rowerName({ rower1Name: 'Jess' }, 'Rower 1'), 'Jess');
  assert.equal(rowerName({ rower2Name: 'Mim' }, 'Rower 2'), 'Mim');
  assert.equal(rowerName({ rower1Name: '  Jess  ' }, 'Rower 1'), 'Jess', 'custom names are trimmed');
  assert.equal(rowerName(null, 'Rower 2'), 'Rower 2', 'no state falls back to the id');
});

test('setNames persists trimmed display names without disturbing the timer', async () => {
  const db = storage();
  const store = createShiftStore(db, { now: () => 1000 });
  await store.refresh();
  await store.change('start');
  await store.setNames('  Jess  ', 'Mim');
  const state = store.snapshot().state;
  assert.equal(state.rower1Name, 'Jess');
  assert.equal(state.rower2Name, 'Mim');
  assert.equal(state.shiftStart, 1000, 'saving names leaves the running shift untouched');
});

test('countdown uses wall-clock timestamps through warnings, zero, overdue and resume across midnight', () => {
  const start = Date.parse('2026-09-17T23:30:00Z');
  const state = { ...SHIFT_DEFAULTS, shiftStart: start };
  assert.equal(shiftDisplay(state, start).time, '90:00');
  assert.equal(shiftDisplay(state, start + 80 * 60000).status, 'warning');
  assert.equal(shiftDisplay(state, start + 90 * 60000).status, 'overdue');
  assert.equal(shiftDisplay(state, start + 92 * 60000).time, '+02:00');
  assert.equal(shiftDisplay(state, Date.parse('2026-09-18T00:15:00Z')).time, '45:00');
  assert.equal(shiftDisplay(SHIFT_DEFAULTS).status, 'idle');
});

test('foreground clock has one interval, stops while hidden and refreshes on resume and cross-tab messages', async () => {
  const source = (await readFile(new URL('../js/shift-state.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  let reads = 0, ticks = 0, channel;
  const intervals = new Set();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = new EventTarget();
  const store = vm.runInNewContext(source + '\ninitShiftClock(); shiftStore;', {
    db: { async getSettings() { reads++; return { ...SHIFT_DEFAULTS }; } },
    document, window,
    BroadcastChannel: class { constructor() { channel = this; } },
    setInterval(fn) { intervals.add(fn); return fn; },
    clearInterval(fn) { intervals.delete(fn); }
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  store.subscribe(() => ticks++);
  assert.equal(intervals.size, 1);
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pageshow'));
  await settle();
  assert.equal(intervals.size, 1, 'repeat resumes do not leak intervals');
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(intervals.size, 0);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  await settle();
  const before = reads;
  channel.onmessage({ data: 'changed' });
  await settle();
  assert.equal(reads, before + 1);
  window.dispatchEvent(new Event('pagehide'));
  assert.equal(intervals.size, 0);
  assert.ok(ticks > 0);
});

test('four-tab grouping and Back preserve legacy and emergency deep links', () => {
  for (const name of ['wiki', 'checklists', 'reminders', 'feedback', 'shortcuts', 'boat'])
    assert.equal(primaryTab(name), 'boat');
  assert.equal(primaryTab('log'), 'log');
  assert.equal(primaryTab('entertain'), 'entertain');
  assert.equal(parentRoute('wiki', 'mob'), '#/wiki');
  assert.equal(parentRoute('wiki', 'official-rules-page-2'), '#/wiki/official-rules');
  assert.equal(parentRoute('wiki'), '#/boat');
  assert.equal(parentRoute('checklists', 'grab'), '#/checklists');
  assert.equal(parentRoute('reminders'), '#/boat');
  assert.equal(parentRoute('log', 'watch'), '#/log');
  assert.equal(parentRoute('entertain', 'live'), '#/entertain');
  assert.equal(parentRoute('procedures'), '#/home');
  assert.equal(parentRoute('procedures', '4'), '#/procedures');
  assert.equal(parentRoute('procedures', 'flow'), '#/procedures');
  assert.equal(primaryTab('procedures'), 'home');
  assert.equal(parentRoute('home'), null);
  assert.deepEqual(EMERGENCY_ROUTES,
    ['#/procedures', '#/procedures/flow', '#/procedures/4', '#/procedures/12', '#/procedures/5']);
});
