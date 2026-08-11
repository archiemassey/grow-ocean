/* db.js — tiny IndexedDB wrapper.
   Plain English: IndexedDB is a small database built into every phone browser.
   It stores the rowers' data ON THE DEVICE (logs, checklist ticks, voice-note
   audio, reminder on/off state) so everything survives offline and app restarts. */

const DB_NAME = 'grow-ocean';
const DB_VERSION = 2;
const STORES = ['logs', 'voiceNotes', 'checkState', 'reminderState', 'settings', 'wiki', 'feedback'];

let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('logs'))
        db.createObjectStore('logs', { keyPath: 'id' }).createIndex('ts', 'ts');
      if (!db.objectStoreNames.contains('voiceNotes'))
        db.createObjectStore('voiceNotes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('checkState'))
        db.createObjectStore('checkState', { keyPath: 'id' }); // id = listId:itemIndex
      if (!db.objectStoreNames.contains('reminderState'))
        db.createObjectStore('reminderState', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings'))
        db.createObjectStore('settings', { keyPath: 'key' });
      // v2: on-device wiki edits (overrides + new pages) and app feedback notes.
      if (!db.objectStoreNames.contains('wiki'))
        db.createObjectStore('wiki', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('feedback'))
        db.createObjectStore('feedback', { keyPath: 'id' }).createIndex('ts', 'ts');
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const db = {
  put: (store, value) => tx(store, 'readwrite', (s) => s.put(value)),
  get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
  delete: (store, key) => tx(store, 'readwrite', (s) => s.delete(key)),
  all: (store) => tx(store, 'readonly', (s) => s.getAll()),

  // Convenience helpers
  async getSetting(key, fallback) {
    const r = await this.get('settings', key);
    return r ? r.value : fallback;
  },
  setSetting(key, value) { return this.put('settings', { key, value }); }
};

export function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
