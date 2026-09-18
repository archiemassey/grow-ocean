import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { SHIFT_DEFAULTS } from '../js/shift-state.js';

const source = (await readFile(new URL('../js/db.js', import.meta.url), 'utf8')).replaceAll('export ', '');

test('related settings use one committed transaction, serialize tabs and roll back all keys on failure', async () => {
  const records = new Map([['crew-note', { key: 'crew-note', value: 'Keep me' }]]);
  let queue = Promise.resolve(), fail = false, transactionCount = 0;
  class Request {}
  const database = {
    transaction(store, mode) {
      assert.equal(store, 'settings');
      transactionCount++;
      let request, aborted = false;
      const pending = [];
      const transaction = {
        objectStore() {
          return {
            getAll() { request = new Request(); return request; },
            put(record) { assert.equal(mode, 'readwrite'); pending.push(structuredClone(record)); }
          };
        },
        abort() { aborted = true; }
      };
      queue = queue.then(async () => {
        request.result = structuredClone([...records.values()]);
        request.onsuccess?.();
        await new Promise(resolve => setImmediate(resolve));
        if (fail || aborted) {
          transaction.error = new Error('Commit failed');
          transaction.onabort();
        } else {
          pending.forEach(record => records.set(record.key, record));
          transaction.oncomplete();
        }
      });
      return transaction;
    }
  };
  const indexedDB = {
    open() {
      const request = {};
      setImmediate(() => { request.result = database; request.onsuccess(); });
      return request;
    }
  };
  const db = vm.runInNewContext(source + '\ndb;', { indexedDB, IDBRequest: Request });
  const writes = await Promise.all([1, 2].map(() => db.updateSettings(SHIFT_DEFAULTS,
    state => ({ ...state, shiftMin: state.shiftMin + 5, activeRower: 'Rower 2', shiftStart: 1234 }))));
  assert.equal(transactionCount, 2, 'each related read/write is a single transaction');
  assert.equal(writes[1].shiftMin, 100, 'second tab reads latest committed duration');
  assert.equal(records.get('shiftStart').value, 1234);
  assert.equal(records.get('activeRower').value, 'Rower 2');
  assert.equal(records.get('crew-note').value, 'Keep me', 'unrelated settings are not rewritten');
  const before = structuredClone([...records]);
  fail = true;
  await assert.rejects(db.updateSettings(SHIFT_DEFAULTS,
    state => ({ ...state, shiftStart: 4567, activeRower: 'Rower 1' })), /Commit failed/);
  assert.deepEqual([...records], before, 'failed transaction changes neither key');
  fail = false;
  await assert.rejects(db.updateSettings(SHIFT_DEFAULTS, () => { throw new Error('Invalid reducer'); }), /Invalid reducer/);
  assert.deepEqual([...records], before);
  const state = await db.getSettings(SHIFT_DEFAULTS);
  assert.equal(state.shiftStart, 1234);
  records.set('shiftMin', { key: 'shiftMin', value: null });
  assert.equal((await db.getSettings(SHIFT_DEFAULTS)).shiftMin, null, 'explicit invalid null is not hidden by a fallback');
});
