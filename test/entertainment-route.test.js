import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { CATEGORIES, createDeck } from '../js/entertainment.js';
import { HANDS_FREE_CATEGORIES, createHandsFreePlayer, createSpeechReader } from '../js/hands-free.js';
import { createVoiceSettings, readPreference, savePreference } from '../js/speech.js';

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
    let timerId = 0;
    const jobs = new Map();
    const timers = {
      setTimeout(fn) { jobs.set(++timerId, fn); return timerId; },
      clearTimeout(id) { jobs.delete(id); }
    };
    async function tick(seconds) {
      for (let i = 0; i < seconds; i++) {
        const pending = [...jobs.values()]; jobs.clear(); pending.forEach(fn => fn());
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    const document = Object.assign(new EventTarget(), { hidden: false });
    const window = Object.assign(new EventTarget(), { confirm: () => false });
    function h(tag, attrs = {}, children = []) {
      const node = {
        tag, ...attrs, textContent: typeof children === 'string' ? children : '',
        children: Array.isArray(children) ? children : [children], events: {},
        append(...values) { this.children.push(...values); },
        replaceChildren(...values) { this.children = values; },
        setAttribute(name, value) { this[name] = value; },
        addEventListener(name, handler) { this.events[name] = handler; }
      };
      if (tag === 'select') node.value = (node.children.find(child => child.selected) || node.children[0])?.value;
      nodes.push(node);
      return node;
    }
    const gamesSource = source.slice(source.indexOf('async function gamesCard('), source.indexOf('function mediaCard()'))
      .replace('import.meta.url', JSON.stringify('https://example.test/js/views/entertain.js'));
    const render = runInNewContext(gamesSource + '\ngamesCard;', {
      h, CATEGORIES, createDeck: (content, storage) => createDeck(content, storage, () => 0),
      HANDS_FREE_CATEGORIES, createHandsFreePlayer: options => createHandsFreePlayer({ ...options, timers }), createSpeechReader,
      createVoiceSettings, readPreference, savePreference,
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
    assert.equal(nodes.filter(node => /Reveal answer|Read current|Start hands-free/.test(node.textContent)).length, 0);
    assert.equal(nodes.some(node => node.textContent === '⏹ Stop reading'), false);
    const details = nodes.find(node => node.class === 'player-details');
    assert.equal(details.open, undefined, 'secondary information is collapsed by default');
    const next = nodes.find(node => node.textContent === 'Next');
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
    await tick(3);
    assert.equal(nodes.find(node => node.class === 'player-answer-copy').textContent, 'First answer');
    assert.equal(nodes.find(node => node.class === 'player-answer-copy').hidden, false);
    assert.match(progress.textContent, /^1 of 2 seen/, 'Auto off reveals without advancing');
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
    assert.equal(nodes.some(node => node.class === 'player-secondary'), false);
    const controls = [...primary.children];
    selector.value = 'games';
    await selector.events.change();
    assert.equal(primary.children[1].disabled, true, 'games stay manual in the same Auto slot');
    await next.onclick();
    assert.ok(nodes.some(node => node.textContent === 'Take turns until both finish.'));
    assert.deepEqual([...primary.children], controls, 'category changes keep the same two controls');
    selector.value = 'wyr';
    await selector.events.change();
    const start = nodes.find(node => node.textContent === 'Auto Off');
    assert.equal(start.disabled, false);
    start.onclick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(start.textContent, 'Auto On');
    assert.equal(start['aria-pressed'], 'true');
    document.hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(start.textContent, 'Auto Off');
    assert.ok(nodes.some(node => node.textContent.includes('Paused while away')));
    assert.equal(jobs.size, 0);
    document.hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(start.textContent, 'Auto Off', 'returning to foreground never resumes Auto');
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pageshow'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(start.textContent, 'Auto Off', 'back-forward page restoration never resumes Auto');
    start.onclick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(start.textContent, 'Auto On');
    window.dispatchEvent(new Event('emergencyopen'));
    assert.equal(jobs.size, 0, 'emergency click disposes playback before hash navigation');
    window.dispatchEvent(new Event('hashchange'));
    assert.equal(jobs.size, 0);
    const before = structuredClone([...saved]);
    start.onclick();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual([...saved], before, 'a disposed route cannot start another draw');
});
