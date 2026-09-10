import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createDeck } from '../js/entertainment.js';

const source = (await readFile(new URL('../js/db.js', import.meta.url), 'utf8'))
  .replaceAll('export ', '');

// A small transaction scheduler, not a browser implementation of IndexedDB.
// It catches splitting the read and write or resolving before commit.
function databaseHarness() {
  const settings = new Map([['crew', { key: 'crew', value: 'Keep crew settings' }]]);
  const transactions = [];
  let queue = Promise.resolve(), failCommit = false;
  const database = {
    transaction(name, mode) {
      assert.equal(name, 'settings');
      assert.equal(mode, 'readwrite');
      let request, key, pending, aborted = false;
      const transaction = {
        error: null,
        objectStore(store) {
          assert.equal(store, name);
          return {
            get(value) { key = value; request = {}; return request; },
            put(value) { pending = structuredClone(value); }
          };
        },
        abort() { aborted = true; }
      };
      transactions.push(transaction);
      queue = queue.then(async () => {
        request.result = structuredClone(settings.get(key));
        request.onsuccess();
        await new Promise(resolve => setImmediate(resolve));
        if (aborted || failCommit) {
          transaction.error = new Error('Transaction aborted');
          transaction.onabort();
        } else {
          if (pending) settings.set(pending.key, pending);
          transaction.oncomplete();
        }
      });
      return transaction;
    }
  };
  const indexedDB = {
    open(name, version) {
      assert.equal(name, 'grow-ocean');
      assert.equal(version, 2, 'no destructive schema upgrade');
      const request = {};
      setImmediate(() => { request.result = database; request.onsuccess(); });
      return request;
    }
  };
  const db = vm.runInNewContext(source + '\ndb;', { indexedDB });
  return { db, settings, transactions, fail() { failCommit = true; } };
}

test('progress read/modify/write uses one committed transaction and serializes concurrent draws', async () => {
  const fixture = databaseHarness();
  const pack = { schemaVersion: 1, version: 'atomic', items: Array.from({ length: 125 }, (_, index) => ({
    id: 'joke-' + index, category: 'jokes', prompt: 'Fixture ' + index, source: 'Test'
  })) };
  const tabs = Array.from({ length: 5 }, () => createDeck(pack, fixture.db, () => 0));
  const drawn = new Set();
  for (let batch = 0; batch < 25; batch++) {
    const states = await Promise.all(tabs.map(tab => tab.next()));
    for (const state of states) {
      assert.ok(!drawn.has(state.item.id));
      drawn.add(state.item.id);
    }
  }
  assert.equal(drawn.size, 125);
  assert.equal(fixture.transactions.length, 125, 'exactly one transaction per draw');
  assert.equal(fixture.settings.get('entertainment-progress-v1:jokes').value.seen.length, 125);
  assert.equal(fixture.settings.get('crew').value, 'Keep crew settings');
});

test('commit failure and reducer exceptions reject without committing or advancing the deck', async () => {
  const fixture = databaseHarness();
  await fixture.db.updateSetting('counter', value => value + 1, 0);
  assert.equal(fixture.settings.get('counter').value, 1);
  await assert.rejects(fixture.db.updateSetting('counter', () => { throw new Error('Invalid progress'); }),
    /Invalid progress/);
  assert.equal(fixture.settings.get('counter').value, 1);
  const pack = { schemaVersion: 1, version: 'atomic', items: [
    { id: 'one', category: 'jokes', prompt: 'One', source: 'Test' },
    { id: 'two', category: 'jokes', prompt: 'Two', source: 'Test' }
  ] };
  const deck = createDeck(pack, fixture.db, () => 0);
  await deck.next();
  fixture.fail();
  await assert.rejects(deck.next(), /Transaction aborted/);
  assert.equal(deck.snapshot().seen, 1);
  assert.equal(deck.snapshot().item.id, 'one');
  await assert.rejects(deck.reset(), /Transaction aborted/);
  assert.equal(deck.snapshot().cycle, 1);
  assert.equal(fixture.settings.get('entertainment-progress-v1:jokes').value.seen.length, 1);
});
