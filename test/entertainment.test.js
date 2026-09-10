import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CATEGORIES, validatePack, nextItem, reconcileProgress, resetProgress, presentation, createDeck
} from '../js/entertainment.js';

const item = (id, category = 'jokes', extra = {}) => ({ id, category, prompt: id, source: 'Test fixture', ...extra });
const pack = items => ({ schemaVersion: 1, version: 'test-1', items });
const memory = () => {
  const data = new Map();
  return {
    getSetting: async (key, fallback) => structuredClone(data.get(key) ?? fallback),
    setSetting: async (key, value) => { data.set(key, structuredClone(value)); }
  };
};

test('published content pack has valid stable IDs, provenance and all six categories', async () => {
  const content = validatePack(JSON.parse(await readFile(new URL('../js/data/entertainment-pack.json', import.meta.url))));
  const minimums = { trivia: 2000, jokes: 120, wyr: 160, games: 64, conversation: 110, challenges: 64 };
  for (const category of Object.keys(CATEGORIES))
    assert.ok(content.items.filter(item => item.category === category).length >= minimums[category], category);
  assert.equal(content.schedule.length, 44);
  const normalized = content.items.map(item => item.category + ':' + item.prompt.toLowerCase().replace(/\s+/g, ' ').trim());
  assert.equal(new Set(normalized).size, normalized.length, 'duplicate prompts within a category');
});

test('validation rejects malformed headers, IDs, categories, missing provenance and incomplete games/trivia', () => {
  for (const bad of [null, {}, { ...pack([]) }, { ...pack([item('a')]), schemaVersion: 2 },
    pack([item('a'), item('a')]), pack([item('../x')]), pack([item('a', '__proto__')]),
    pack([item('a'), item('b', 'jokes', { prompt: ' A ' })]),
    pack([item('a', 'jokes', { source: '' })]), pack([item('a', 'jokes', { prompt: 42 })]),
    pack([item('a', 'trivia')]), pack([item('a', 'games')]),
    pack([item('a', 'jokes', { answer: {} })])]) assert.throws(() => validatePack(bad));
});

test('draws every ID exactly once, then gracefully exhausts without changing state', () => {
  const items = [item('one'), item('two'), item('three')];
  let state;
  const results = [];
  for (let n = 0; n < items.length; n++) {
    const draw = nextItem(items, state, () => 0.5);
    state = draw.state;
    results.push(draw.item.id);
  }
  assert.equal(new Set(results).size, 3);
  const exhausted = nextItem(items, state);
  assert.equal(exhausted.item, null);
  assert.equal(exhausted.exhausted, true);
  assert.deepEqual(exhausted.state, state);
  const reset = resetProgress(items, state);
  assert.equal(reset.cycle, 2);
  assert.equal(reset.seen.length, 0);
  assert.ok(nextItem(items, reset).item);
});

test('an optional schedule must have 44 distinct days and attributed plain-text notes', () => {
  const content = pack([item('one')]);
  content.schedule = Array.from({ length: 44 }, (_, index) => ({
    day: index + 1, title: 'Choice', note: 'Choose freely', source: 'Test fixture'
  }));
  assert.equal(validatePack(content).schedule.length, 44);
  assert.throws(() => validatePack({ ...content, schedule: content.schedule.slice(1) }));
  assert.throws(() => validatePack({ ...content, schedule: content.schedule.map(() => content.schedule[0]) }));
});

test('upgrades retain seen stable IDs, remove retired IDs and offer additions before any repeats', () => {
  const items = [item('old', 'jokes', { prompt: 'Edited wording' }), item('new')];
  const state = reconcileProgress(items, { seen: ['old', 'retired', 'old'], currentId: 'retired', cycle: 2 });
  assert.deepEqual(state, { seen: ['old'], currentId: null, cycle: 2 });
  assert.equal(nextItem(items, state).item.id, 'new');
});

test('empty categories and damaged saved progress do not crash', () => {
  assert.equal(nextItem([], null).exhausted, true);
  assert.deepEqual(reconcileProgress([item('a')], { seen: 'wrong', cycle: -2, currentId: 'a' }),
    { seen: [], currentId: null, cycle: 1 });
});

test('deck persists across restarts, isolates categories and resets revealed answers', async () => {
  const content = pack([item('joke-one', 'jokes', { answer: 'Punchline' }), item('joke-two', 'jokes', { answer: 'Other' }),
    item('question', 'trivia', { answer: 'Correct' }), item('choice', 'wyr')]);
  const storage = memory();
  const first = createDeck(content, storage, () => 0);
  await first.select('jokes');
  await first.next();
  assert.equal(first.reveal().answer, 'Punchline');
  const second = createDeck(content, storage, () => 0);
  const resumed = await second.select('jokes');
  assert.equal(resumed.item.id, 'joke-one');
  assert.equal(resumed.seen, 1);
  assert.equal(resumed.answer, '');
  assert.equal((await second.next()).item.id, 'joke-two');
  second.reveal();
  assert.equal((await second.select('trivia')).answer, '');
  await second.next();
  second.reveal();
  const choice = await second.select('wyr');
  assert.equal(choice.answer, '');
  assert.equal(choice.canReveal, false);
  const jokes = await second.select('jokes');
  assert.equal(jokes.seen, 2);
  assert.equal(jokes.exhausted, true);
  assert.equal(jokes.answer, '');
  await second.reset();
  assert.equal(second.snapshot().seen, 0);
  assert.equal(second.snapshot().answer, '');
  assert.equal((await second.select('trivia')).seen, 1);
});

test('failed storage writes do not advance the deck or discard progress', async () => {
  const storage = memory();
  const deck = createDeck(pack([item('one'), item('two')]), storage);
  await deck.select('jokes');
  storage.setSetting = async () => { throw new Error('Quota exceeded'); };
  await assert.rejects(deck.next());
  assert.equal(deck.snapshot().seen, 0);
  await assert.rejects(deck.reset());
  assert.equal(deck.snapshot().cycle, 1);
  storage.getSetting = async () => { throw new Error('Unavailable'); };
  await assert.rejects(deck.select('trivia'));
  assert.equal(deck.snapshot().category, 'jokes');
});

test('a 2,000-item deck remains repeat-free across daily-style restarts and an app update', async () => {
  let content = pack(Array.from({ length: 2000 }, (_, index) =>
    item('fixture-' + index, 'trivia', { answer: 'Fixture answer' })));
  const storage = memory();
  const drawn = new Set();
  let deck;
  for (let index = 0; index < 2000; index++) {
    if (index % 45 === 0) {
      if (index === 990) content = { ...content, version: 'test-upgrade' };
      deck = createDeck(content, storage, () => 0.41);
      await deck.select('trivia');
    }
    const state = await deck.next();
    assert.equal(drawn.has(state.item.id), false);
    drawn.add(state.item.id);
  }
  assert.equal(drawn.size, 2000);
  assert.equal(deck.snapshot().exhausted, true);
});

test('presentation never carries a previous answer into a new prompt or turns text into HTML', () => {
  const text = '<img src=x onerror=alert(1)>';
  assert.equal(presentation(item('safe', 'jokes', { prompt: text })).prompt, text);
  assert.equal(presentation(item('answer', 'trivia', { answer: 'Secret' })).answer, '');
  assert.equal(presentation(null, true).answer, '');
  assert.equal(presentation(item('no-answer'), true).canReveal, false);
});
