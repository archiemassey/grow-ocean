import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createShiftStore, shiftDisplay, SHIFT_DEFAULTS } from '../js/shift-state.js';
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
  assert.equal(store.snapshot().state.shiftStart, null);
  await store.change('start');
  assert.equal(store.snapshot().state.shiftStart, 1002, 'reset cannot reuse a same-millisecond ID');
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
  assert.equal(store.snapshot().state.shiftStart, 2001);
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
