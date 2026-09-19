import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { getShiftPerspective, SHIFT_PERSPECTIVES } from '../js/shift-perspective.js';
import { createShiftStore, shiftDisplay } from '../js/shift-state.js';

function storage() {
  const values = new Map();
  let queue = Promise.resolve();
  return {
    values,
    async getSetting(key, fallback) { return structuredClone(values.get(key) ?? fallback); },
    async setSetting(key, value) { values.set(key, structuredClone(value)); },
    async getSettings(defaults) {
      return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) =>
        [key, values.has(key) ? values.get(key) : fallback]));
    },
    updateSettings(defaults, update) {
      const result = queue.then(async () => {
        const next = update(await this.getSettings(defaults));
        for (const [key, value] of Object.entries(next)) values.set(key, structuredClone(value));
        return next;
      });
      queue = result.catch(() => {});
      return result;
    },
    updateSetting(key, update) {
      const result = queue.then(() => {
        const value = update(structuredClone(values.get(key) ?? null));
        values.set(key, structuredClone(value));
        return value;
      });
      queue = result.catch(() => {});
      return result;
    }
  };
}

test('welcome and actual shift IDs persist through repeated renders without consuming new prompts', async () => {
  const db = storage();
  let choices = 0;
  const random = () => { choices++; return 0; };
  const welcome = await getShiftPerspective(db, null, random);
  assert.equal(welcome.shiftKey, 'welcome');
  for (let index = 0; index < 10; index++)
    assert.deepEqual(await getShiftPerspective(db, null, random), welcome);
  assert.equal(choices, 1);
  const first = await getShiftPerspective(db, 1000, random);
  assert.notEqual(first.id, welcome.id);
  assert.equal(first.shiftKey, 'shift:1000');
  for (let index = 0; index < 10; index++)
    assert.deepEqual(await getShiftPerspective(db, 1000, random), first);
  assert.equal(choices, 2);
  assert.deepEqual(await getShiftPerspective(db, null, random), first, 'reset is not a new shift');
  assert.equal(choices, 2);
});

test('new shifts avoid consecutive repeats; revisiting an old ID does not change the latest assignment', async () => {
  const db = storage();
  const entries = [];
  for (let start = 1; start <= 50; start++) {
    const result = await getShiftPerspective(db, start, () => 0);
    if (entries.length) assert.notEqual(result.id, entries.at(-1).id);
    entries.push(result);
  }
  assert.deepEqual(await getShiftPerspective(db, 1), entries[0]);
  assert.deepEqual(await getShiftPerspective(db, null), entries.at(-1));
  assert.ok(SHIFT_PERSPECTIVES.some(prompt => prompt.id === entries.at(-1).id));
  assert.deepEqual([...db.values.keys()], ['shift-perspective-v1'], 'does not touch entertainment history');
});

test('concurrent Home tabs receive the same assignment for a shift and a failed save is not reported as persisted', async () => {
  const db = storage();
  let choices = 0;
  const results = await Promise.all(Array.from({ length: 10 }, () =>
    getShiftPerspective(db, 123, () => { choices++; return 0.6; })));
  assert.equal(new Set(results.map(result => result.id)).size, 1);
  assert.equal(choices, 1);
  db.updateSetting = async () => { throw new Error('Storage unavailable'); };
  await assert.rejects(getShiftPerspective(db, 124), /Storage unavailable/);
  assert.equal(Object.keys(db.values.get('shift-perspective-v1').assignments).length, 1);
});

const homeSource = (await readFile(new URL('../js/views/home.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');

function homeHarness(db) {
  let now = 1000, nodes = [], controller;
  const shiftStore = createShiftStore(db, { now: () => now });
  const render = vm.runInNewContext(homeSource + '\nrenderHome;', {
    db, getShiftPerspective, shiftStore, shiftDisplay, window: { confirm: () => true },
    APP_RELEASE: 'fixture', checkForUpdates: async () => 'No update',
    Date: { now: () => now }, clearInterval() {}, setInterval() { return 1; },
    CONTENT: {
      scheduled: [], meta: { disclaimer: 'Fixture notice' },
      live: ['speed', 'vmg24', 'dist', 'made'].map(id => ({ id, label: id, value: 1, unit: 'unit' }))
    },
    getReminderState() {}, go() {}, toast() {},
    h(tag, attrs = {}, children = []) {
      const node = {
        tag, style: {}, dataset: {}, ...attrs,
        replaceChildren(...children) { this.children = children; },
        children: Array.isArray(children) ? children : [children],
        textContent: typeof children === 'string' ? children : ''
      };
      nodes.push(node);
      return node;
    }
  });
  return {
    time(value) { now = value; },
    async render() {
      controller?.abort();
      controller = new AbortController();
      nodes = [];
      const view = { children: [], append(...children) { this.children.push(...children); } };
      await render(view, '', controller.signal);
      return view;
    },
    text: () => nodes.find(node => node.id === 'shift-perspective').textContent,
    button: label => nodes.find(node => node.tag === 'button' && node.textContent === label),
    nodes: () => nodes
  };
}

test('Home starts and swaps update This shift; duration edits, clock changes and navigation do not', async () => {
  const db = storage(), home = homeHarness(db);
  const firstView = await home.render();
  assert.equal(firstView.children[0]['aria-label'], 'This shift', 'thought is first main content');
  assert.equal(firstView.children[1].children[0].textContent, '🕒 Shift timer', 'timer follows thought');
  assert.ok(home.nodes().some(node => node.href === '#/stars'));
  const welcome = home.text();
  await home.render();
  assert.equal(home.text(), welcome);
  await home.button('▶ Start').onclick();
  const first = home.text();
  assert.notEqual(first, welcome);
  assert.equal(await db.getSetting('shiftStart'), 1000);
  await home.button('+5 min').onclick();
  await home.button('−5').onclick();
  assert.equal(home.text(), first);
  await home.render();
  assert.equal(home.text(), first, 'reopening the same running shift preserves its prompt');
  await home.button('🔁 Swap & restart').onclick();
  const swapped = home.text();
  assert.notEqual(swapped, first);
  assert.equal(await db.getSetting('shiftStart'), 1001, 'even same-millisecond starts have distinct IDs');
  assert.equal(await db.getSetting('activeRower'), 'Rower 2');
  home.time(9999999);
  await home.render();
  assert.equal(home.text(), swapped, 'wall-clock time is not the perspective key');
  await db.setSetting('activeRower', 'Rower 1');
  await home.render();
  assert.equal(home.text(), swapped, 'rower name alone does not rotate the prompt');
  await home.button('Reset').onclick();
  assert.equal(home.text(), swapped);
  await home.render();
  assert.equal(home.text(), swapped, 'between shifts retains the last prompt');
  await home.button('▶ Start').onclick();
  assert.notEqual(home.text(), swapped);
  assert.equal(Object.keys(db.values.get('shift-perspective-v1').assignments).length, 4);
  assert.ok(![...db.values.keys()].some(key => key.startsWith('entertainment-progress')));
});
