import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { CATEGORIES, createDeck } from '../js/entertainment.js';
import { HANDS_FREE_CATEGORIES, createHandsFreePlayer, createSpeechReader } from '../js/hands-free.js';

const source = await readFile(new URL('../js/views/entertain.js', import.meta.url), 'utf8');
const renderSource = source.slice(source.indexOf('export async function renderEntertain'))
  .replace('export async function', 'async function');

test('a delayed entertainment response cannot append to a different route', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const children = [];
  let replacements = 0;
  const view = {
    set innerHTML(value) { children.length = 0; },
    append(...nodes) { children.push(...nodes); },
    contains(node) { return children.includes(node); }
  };
  const context = {
    h: () => ({ replaceWith() { replacements++; } }),
    go() {},
    noisePlayer: () => ({}),
    mediaCard: () => ({}),
    gamesCard: () => pending
  };
  const render = runInNewContext(renderSource + '\nrenderEntertain;', context);
  const completion = render(view);
  assert.equal(children.length, 2, 'player is first; extras share one compact secondary section');
  view.innerHTML = '';
  const wiki = {};
  view.append(wiki);
  finish({});
  await completion;
  assert.deepEqual(children, [wiki]);
  assert.equal(replacements, 0);
});

test('a loaded entertainment card replaces its own loading placeholder', async () => {
  let replacements = 0;
  const children = [];
  const view = {
    set innerHTML(value) { children.length = 0; },
    append(...nodes) { children.push(...nodes); },
    contains(node) { return children.includes(node); }
  };
  const render = runInNewContext(renderSource + '\nrenderEntertain;', {
    h: () => ({ replaceWith() { replacements++; } }),
    go() {},
    noisePlayer: () => ({}),
    mediaCard: () => ({}),
    gamesCard: async () => ({})
  });

  await render(view);
  assert.equal(replacements, 1);
  assert.equal(children.length, 2);
});

test('the category UI distinguishes restored items from Next unseen item and labels the content release', async () => {
    const pack = {
      schemaVersion: 1, version: 'route-fixture', items: [
        { id: 'first', category: 'jokes', prompt: 'First joke', answer: 'First answer', source: 'Fixture' },
        { id: 'second', category: 'jokes', prompt: 'Second joke', source: 'Fixture' },
        { id: 'choice', category: 'wyr', prompt: 'Choice', source: 'Fixture' },
        { id: 'game', category: 'games', prompt: 'Play together', source: 'Fixture', instructions: 'Take turns until both finish.' }
      ]
    };
    const nodes = [], saved = new Map();
    const document = Object.assign(new EventTarget(), { hidden: false });
    const window = Object.assign(new EventTarget(), { confirm: () => false });
    function h(tag, attrs = {}, children = []) {
      const node = {
        tag, ...attrs, textContent: typeof children === 'string' ? children : '',
        children: Array.isArray(children) ? children : [children], events: {},
        append(...values) { this.children.push(...values); },
        setAttribute(name, value) { this[name] = value; },
        addEventListener(name, handler) { this.events[name] = handler; }
      };
      if (tag === 'select') node.value = (node.children.find(child => child.selected) || node.children[0])?.value;
      nodes.push(node);
      return node;
    }
    const gamesSource = source.slice(source.indexOf('async function gamesCard()'), source.indexOf('function mediaCard()'))
      .replace('import.meta.url', JSON.stringify('https://example.test/js/views/entertain.js'));
    const render = runInNewContext(gamesSource + '\ngamesCard;', {
      h, CATEGORIES, createDeck: (content, storage) => createDeck(content, storage, () => 0),
      HANDS_FREE_CATEGORIES, createHandsFreePlayer, createSpeechReader,
      db: {
        async getSetting(key, fallback) { return structuredClone(saved.get(key) ?? fallback); },
        async updateSetting(key, update) {
          const value = update(structuredClone(saved.get(key) ?? null));
          saved.set(key, structuredClone(value));
          return value;
        }
      },
      fetch: async () => ({ ok: true, json: async () => pack }),
      URL, speak() {}, stopSpeaking() {}, toast() {}, window, document, location: { hash: '#/entertain' }
    });
    const card = await render();
    assert.equal(card['aria-label'], 'Entertainment player');
    assert.equal(nodes.filter(node => node.id === 'entertainment-category').length, 1);
    assert.equal(nodes.filter(node => node.textContent === '🔊 Read current').length, 1);
    assert.equal(nodes.some(node => node.textContent === '⏹ Stop reading'), false);
    const details = nodes.find(node => node.class === 'player-details');
    assert.equal(details.open, undefined, 'secondary information is collapsed by default');
    const next = nodes.find(node => node.textContent === 'Next unseen item');
    const selector = nodes.find(node => node.id === 'entertainment-category');
    const progress = nodes.find(node => node.role === 'status');
    assert.ok(nodes.some(node => node.textContent.includes('Content route-fixture')));
    assert.match(progress.textContent, /^0 of 2 seen/);
    await next.onclick();
    assert.match(progress.textContent, /^1 of 2 seen/);
    const measure = nodes.find(node => node.class === 'player-answer-measure');
    assert.equal(measure['aria-hidden'], 'true');
    assert.equal(measure.textContent, 'First answer', 'answer space is reserved before reveal');
    assert.equal(nodes.find(node => node.class === 'player-answer-copy').hidden, true);
    selector.value = 'wyr';
    await selector.events.change();
    selector.value = 'jokes';
    await selector.events.change();
    assert.match(progress.textContent, /saved current item/);
    assert.match(progress.textContent, /^1 of 2 seen/);
    assert.ok(nodes.some(node => node.textContent === 'First joke'));
    await next.onclick();
    assert.ok(nodes.some(node => node.textContent === 'Second joke'));
    assert.equal(next.disabled, true);
    assert.match(progress.textContent, /All seen. Reset/);
    const primary = nodes.find(node => node.class === 'player-primary');
    const secondary = nodes.find(node => node.class === 'player-secondary');
    const controls = [...primary.children, ...secondary.children];
    selector.value = 'games';
    await selector.events.change();
    assert.equal(primary.children[0].disabled, true, 'games stay manual in the same primary slot');
    await next.onclick();
    assert.ok(nodes.some(node => node.textContent === 'Take turns until both finish.'));
    assert.deepEqual([...primary.children, ...secondary.children], controls, 'category changes keep the same controls');
    selector.value = 'wyr';
    await selector.events.change();
    const start = nodes.find(node => node.textContent === '▶ Start hands-free');
    const pause = start;
    assert.equal(start.disabled, false);
    start.onclick();
    await new Promise(resolve => setImmediate(resolve));
    document.hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(pause.textContent, '▶ Resume');
    assert.ok(nodes.some(node => node.textContent.includes('Paused ·')));
    document.hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(pause.textContent, '▶ Resume', 'returning to foreground never resumes automatically');
    pause.onclick();
    assert.equal(pause.textContent, '⏸ Pause');
    window.dispatchEvent(new Event('hashchange'));
    const before = structuredClone([...saved]);
    start.onclick();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual([...saved], before, 'a disposed route cannot start another draw');
});
