import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

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
    aweCard: () => ({}),
    gamesCard: () => pending
  };
  const render = runInNewContext(renderSource + '\nrenderEntertain;', context);
  const completion = render(view);
  assert.equal(children.length, 7, 'independent morale features render immediately');
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
    aweCard: () => ({}),
    gamesCard: async () => ({})
  });
  await render(view);
  assert.equal(replacements, 1);
  assert.equal(children.length, 7);
});
