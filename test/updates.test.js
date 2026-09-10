import test from 'node:test';
import assert from 'node:assert/strict';
import { initAppUpdates, checkForUpdates, APP_RELEASE } from '../js/updates.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const elements = Object.fromEntries(['updateBanner', 'updateMessage', 'updateReload']
    .map(id => [id, Object.assign(new EventTarget(), { hidden: true, disabled: true, textContent: '' })]));
  const registration = Object.assign(new EventTarget(), {
    installing: null, waiting: null, update: async () => {}
  });
  const calls = [];
  const serviceWorker = Object.assign(new EventTarget(), {
    register: async (...args) => { calls.push(args); return registration; }
  });
  let reloads = 0, confirmed = false;
  const confirms = [];
  return {
    elements, registration, serviceWorker, calls, confirms,
    get reloads() { return reloads; },
    confirm(value) { confirmed = value; },
    start() {
      initAppUpdates({
        serviceWorker,
        document: { getElementById: id => elements[id] },
        location: { reload() { reloads++; } },
        confirm(message) { confirms.push(message); return confirmed; }
      });
    },
    click() { elements.updateReload.dispatchEvent(new Event('click')); }
  };
}

test('worker registration bypasses HTTP cache and a normal launch does not prompt a reload', async () => {
  const ui = harness();
  ui.start();
  await settle();
  assert.deepEqual(ui.calls, [['./service-worker.js', { updateViaCache: 'none' }]]);
  assert.equal(ui.elements.updateBanner.hidden, true);
  assert.match(await checkForUpdates(), new RegExp(APP_RELEASE));
  assert.equal(ui.reloads, 0);
});

test('controller changes never auto-reload recordings or forms; manual reload requires confirmation', async () => {
  const ui = harness();
  ui.start();
  await settle();
  ui.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(ui.elements.updateBanner.hidden, false);
  assert.equal(ui.elements.updateReload.disabled, false);
  assert.match(ui.elements.updateMessage.textContent, /Save recordings and any unsaved forms/);
  assert.equal(ui.reloads, 0, 'no reload even with unsaved work on screen');
  assert.equal(ui.confirms.length, 0, 'no interruption until the user clicks');
  ui.click();
  assert.equal(ui.reloads, 0, 'cancel keeps the current document alive');
  assert.match(ui.confirms[0], /stopped AND saved all recordings/);
  ui.confirm(true);
  ui.click();
  assert.equal(ui.reloads, 1);
});

test('detected updates show download and activation progress without enabling premature reload', async () => {
  const ui = harness();
  ui.start();
  await settle();
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  ui.registration.installing = worker;
  ui.registration.dispatchEvent(new Event('updatefound'));
  assert.match(ui.elements.updateMessage.textContent, /Downloading/);
  assert.equal(ui.elements.updateReload.disabled, true);
  ui.confirm(true);
  ui.click();
  assert.equal(ui.reloads, 0);
  worker.state = 'installed';
  worker.dispatchEvent(new Event('statechange'));
  assert.match(ui.elements.updateMessage.textContent, /activating/);
  assert.equal(ui.elements.updateReload.disabled, true);
  worker.state = 'activated';
  worker.dispatchEvent(new Event('statechange'));
  assert.equal(ui.elements.updateReload.disabled, false);
  assert.equal(ui.reloads, 0);
  assert.match(await checkForUpdates(), /release is ready/);
});

test('an update already waiting when registration resolves is observed', async () => {
  const ui = harness();
  const worker = Object.assign(new EventTarget(), { state: 'installed' });
  ui.registration.waiting = worker;
  ui.start();
  await settle();
  assert.match(ui.elements.updateMessage.textContent, /activating/);
  worker.state = 'activated';
  worker.dispatchEvent(new Event('statechange'));
  assert.equal(ui.elements.updateReload.disabled, false);
  assert.equal(ui.reloads, 0);
});

test('failed download and offline checks preserve the running document; registration can be retried', async () => {
  const ui = harness();
  let attempts = 0;
  ui.serviceWorker.register = async () => {
    if (++attempts === 1) throw new Error('Offline');
    return ui.registration;
  };
  ui.start();
  await settle();
  assert.match(ui.elements.updateMessage.textContent, /unavailable/);
  assert.equal(ui.elements.updateReload.disabled, true);
  await checkForUpdates();
  assert.equal(attempts, 2);
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  ui.registration.installing = worker;
  ui.registration.dispatchEvent(new Event('updatefound'));
  worker.state = 'redundant';
  worker.dispatchEvent(new Event('statechange'));
  assert.match(ui.elements.updateMessage.textContent, /previous offline app and saved data are unchanged/);
  ui.registration.update = async () => { throw new Error('Offline'); };
  assert.match(await checkForUpdates(), /Could not check/);
  assert.equal(ui.reloads, 0);
});
