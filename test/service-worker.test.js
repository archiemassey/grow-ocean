import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { APP_RELEASE } from '../js/updates.js';

const source = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const version = source.match(/const CACHE_VERSION = '([^']+)'/)[1];
const base = 'https://example.test/grow-ocean/';
const address = path => new URL(path, base).href;

function harness() {
  const handlers = {}, stores = new Map(), requests = [], actions = [];
  let network = async request => new Response(request.url.endsWith('/') || request.url.endsWith('index.html')
    ? html : 'fresh ' + request.url);
  const key = value => typeof value === 'string' ? value : value.url;
  function store(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async match(request) { return entries.get(key(request))?.clone(); },
      async addAll(batch) {
        requests.push(...batch);
        const responses = await Promise.all(batch.map(async request => {
          const response = await network(request);
          if (!response.ok) throw new Error('Download failed');
          return response;
        }));
        batch.forEach((request, index) => entries.set(key(request), responses[index]));
        actions.push('cached');
      }
    };
  }
  const self = {
    location: { href: address('service-worker.js'), origin: new URL(base).origin },
    addEventListener(name, handler) { handlers[name] = handler; },
    async skipWaiting() { actions.push('skipWaiting'); },
    clients: { async claim() { actions.push('claim'); } },
    registration: { async update() { actions.push('update'); } }
  };
  vm.runInNewContext(source, {
    self, URL, Request, Response, AbortController, setTimeout, clearTimeout,
    fetch: request => { requests.push(request); return network(request); },
    caches: {
      async open(name) { return store(name); },
      async keys() { return [...stores.keys()]; },
      async delete(name) { actions.push('delete:' + name); return stores.delete(name); }
    }
  });
  return {
    self, stores, requests, actions,
    network(fn) { network = fn; },
    seed(name, path, text) { store(name); stores.get(name).set(address(path), new Response(text)); },
    async lifecycle(name) {
      const waits = [];
      handlers[name]({ waitUntil: value => waits.push(value) });
      assert.equal(waits.length, 1);
      await Promise.all(waits);
    },
    async fetch(path, navigate = false) {
      const request = new Request(address(path));
      if (navigate) Object.defineProperty(request, 'mode', { value: 'navigate' });
      let response;
      const waits = [];
      handlers.fetch({ request, respondWith: value => { response = value; }, waitUntil: value => waits.push(value) });
      const result = await response;
      await Promise.all(waits);
      return result;
    }
  };
}

test('HTML, displayed app release and worker cache version stay in sync', () => {
  assert.equal(APP_RELEASE, version);
  assert.ok(html.includes(`name="app-release" content="${version}"`));
});

test('install bypasses stale HTTP caching for every shell asset before skipWaiting', async () => {
  const sw = harness();
  sw.network(async request => new Response(request.cache !== 'reload' ? 'stale HTTP cache'
    : request.url.endsWith('/') || request.url.endsWith('index.html') ? html : 'fresh module'));
  await sw.lifecycle('install');
  assert.ok(sw.requests.length > 25);
  assert.ok(sw.requests.every(request => request.cache === 'reload'));
  assert.deepEqual(sw.actions, ['cached', 'skipWaiting']);
  assert.equal(await (await sw.fetch('js/app.js')).text(), 'fresh module');
  assert.equal(await (await sw.fetch('js/views/entertain.js')).text(), 'fresh module');
});

test('failed installs leave the previous complete offline cache and data alone', async () => {
  for (const failure of ['offline', '404', 'wrong-release']) {
    const sw = harness();
    sw.seed('grow-ocean-v7', 'index.html', 'old offline HTML');
    sw.seed('grow-ocean-v7', 'js/app.js', 'old offline JS');
    sw.seed('unrelated-cache', 'keep', 'unrelated');
    sw.network(async request => {
      if (failure === 'offline') throw new Error('Disconnected');
      if (failure === '404' && request.url.endsWith('.json')) return new Response('', { status: 404 });
      return new Response(failure === 'wrong-release' ? 'old HTML' : html);
    });
    await assert.rejects(sw.lifecycle('install'));
    assert.equal(sw.stores.has(version), false);
    assert.equal(sw.stores.get('grow-ocean-v7').size, 2);
    assert.equal(sw.stores.has('unrelated-cache'), true);
    assert.ok(!sw.actions.includes('skipWaiting'));
    assert.ok(!sw.actions.includes('claim'));
  }
});

test('activation waits for deletion and claiming; reads never fall through to an old cache', async () => {
  const sw = harness();
  sw.seed('grow-ocean-v7', 'js/app.js', 'stale JS');
  sw.seed('grow-ocean-v7', 'js/views/entertain.js', 'standalone random Joke button');
  sw.seed('unrelated-cache', 'keep', 'keep');
  await sw.lifecycle('install');
  sw.network(async () => { throw new Error('Offline'); });
  assert.match(await (await sw.fetch('js/views/entertain.js')).text(), /^fresh /);
  // Even before old-cache cleanup, a missing active asset is not replaced by stale JS.
  sw.stores.get(version).delete(address('js/app.js'));
  assert.equal((await sw.fetch('js/app.js')).status, 503);
  let claimed = false;
  sw.self.clients.claim = async () => {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(sw.stores.has('grow-ocean-v7'), false);
    claimed = true;
  };
  await sw.lifecycle('activate');
  assert.equal(claimed, true);
  assert.equal(sw.stores.has('unrelated-cache'), true);
  assert.equal(sw.stores.has(version), true);
});

test('online navigations bypass HTTP cache, but reject mismatched HTML and retain the active module graph', async () => {
  const sw = harness();
  await sw.lifecycle('install');
  sw.network(async request => {
    assert.equal(request.cache, 'reload');
    return new Response(html.replace('<title>', '<!-- network navigation --><title>'));
  });
  assert.match(await (await sw.fetch('./', true)).text(), /network navigation/);
  assert.ok(sw.actions.includes('update'));
  sw.network(async () => new Response(html.replaceAll(version, 'grow-ocean-v999')));
  const page = await (await sw.fetch('index.html?launch=1', true)).text();
  assert.ok(page.includes(version));
  assert.ok(!page.includes('v999'));
  assert.match(await (await sw.fetch('js/app.js?release=' + version)).text(), /^fresh /);
  assert.match(await (await sw.fetch('js/db.js')).text(), /^fresh /);
});

test('upgraded shell, content and nested modules open offline, including explicit index.html navigations', async () => {
  const sw = harness();
  sw.seed('grow-ocean-v7', 'index.html', 'old HTML');
  await sw.lifecycle('install');
  await sw.lifecycle('activate');
  sw.network(async () => { throw new Error('Offline'); });
  for (const path of ['./', 'index.html', '?from=homescreen', 'crew-route'])
    assert.equal(await (await sw.fetch(path, true)).text(), html);
  for (const path of ['js/views/entertain.js', 'js/updates.js', 'js/data/entertainment-pack.json',
    'references/race-rules-wtr-atlantic-2025-v1.0.pdf'])
    assert.equal((await sw.fetch(path)).status, 200);
  for (const path of ['missing.pdf', 'missing.json', 'js/missing.js'])
    assert.equal((await sw.fetch(path, true)).status, 503);
});

test('a stalled navigation falls back to the installed shell, even when the update check fails', async () => {
  const sw = harness();
  await sw.lifecycle('install');
  sw.self.registration.update = async () => { throw new Error('No connection'); };
  let aborted = false;
  sw.network(request => new Promise((resolve, reject) => {
    request.signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('Navigation timed out'));
    });
  }));
  assert.equal(await (await sw.fetch('./', true)).text(), html);
  assert.equal(aborted, true);
});
