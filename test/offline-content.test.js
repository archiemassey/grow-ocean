import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { RULES_DOCUMENT, RULES_ARTICLES } from '../js/rules.js';

const root = new URL('../', import.meta.url);

test('rules PDF is unchanged and the searchable text has exact physical page references', async () => {
  const pdf = await readFile(new URL(RULES_DOCUMENT.file, root));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal(createHash('sha256').update(pdf).digest('hex'), RULES_DOCUMENT.sha256);
  assert.equal(RULES_DOCUMENT.pages.length, 11);
  RULES_DOCUMENT.pages.forEach((page, index) => {
    assert.equal(page.page, index + 1);
    assert.ok(page.text.length > 100);
    assert.ok(RULES_ARTICLES[index + 1].ref.endsWith('#page=' + (index + 1)));
  });
  assert.match(RULES_DOCUMENT.pages[1].text, /1\.7 Safety at Sea/);
  assert.match(RULES_DOCUMENT.pages[6].text, /2 – 20 LITRES/);
});

test('all precached files exist, including content, rules and PDF', async () => {
  const sw = await readFile(new URL('service-worker.js', root), 'utf8');
  const entries = [...sw.matchAll(/'(\.\/[^']*)'/g)].map(match => match[1]);
  for (const file of entries) await access(new URL(file, root));
  for (const expected of ['./js/data/entertainment-pack.json', './js/entertainment.js', './js/rules.js',
    './js/safety.js', './js/data/rules-data.js', './' + RULES_DOCUMENT.file])
    assert.ok(entries.includes(expected), expected);
  const build = await readFile(new URL('tools/build-www.mjs', root), 'utf8');
  assert.ok(build.includes("'references'"));
});

test('offline missing PDF and JSON return an honest failure, not app HTML', async () => {
  const handlers = {};
  const sw = await readFile(new URL('service-worker.js', root), 'utf8');
  const context = {
    self: { addEventListener: (name, handler) => { handlers[name] = handler; },
      location: { href: 'https://example.test/service-worker.js', origin: 'https://example.test' } },
    caches: { open: async () => ({ match: async () => undefined }) }, URL, Response, Request,
    fetch: async () => { throw new Error('Offline'); }
  };
  vm.runInNewContext(sw, context);
  for (const filename of ['rules.pdf', 'pack.json']) {
    let response;
    handlers.fetch({
      request: { method: 'GET', url: 'https://example.test/' + filename, mode: 'navigate' },
      respondWith: promise => { response = promise; }
    });

    assert.equal((await response).status, 503);
  }
});

test('an offline pack upgrade deletes only older gROW Ocean caches', async () => {
  const handlers = {}, deleted = [];
  const sw = await readFile(new URL('service-worker.js', root), 'utf8');
  const current = sw.match(/const CACHE_VERSION = '([^']+)'/)[1];
  vm.runInNewContext(sw, {
    self: { addEventListener: (name, handler) => { handlers[name] = handler; }, clients: { claim() {} },
      location: { href: 'https://example.test/service-worker.js', origin: 'https://example.test' } },
    URL,
    caches: {
      keys: async () => ['grow-ocean-old-cache', current, 'other-app-v1'],
      delete: async key => { deleted.push(key); }
    }
  });
  let done;
  handlers.activate({ waitUntil: promise => { done = promise; } });
  await done;
  assert.deepEqual(deleted, ['grow-ocean-old-cache']);
});
