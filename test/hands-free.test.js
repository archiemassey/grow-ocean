import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDeck } from '../js/entertainment.js';
import { createHandsFreePlayer, createSpeechReader } from '../js/hands-free.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function clock() {
  let now = 0, id = 0;
  const tasks = new Map();
  return {
    setTimeout(fn, delay) { tasks.set(++id, { at: now + delay, fn }); return id; },
    clearTimeout(key) { tasks.delete(key); },
    get size() { return tasks.size; },
    async tick(ms) {
      const end = now + ms;
      while (true) {
        const next = [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at; tasks.delete(next[0]); next[1].fn();
        await flush();
      }
      now = end;
      await flush();
    }
  };
}
function store() {
  const saved = new Map();
  let queue = Promise.resolve();
  return {
    getSetting: async (key, fallback) => structuredClone(saved.get(key) ?? fallback),
    updateSetting(key, update) {
      const result = queue.then(() => {
        const value = update(structuredClone(saved.get(key) ?? null));
        saved.set(key, structuredClone(value));
        return value;
      });
      queue = result.catch(() => {});
      return result;
    }
  };
}
const fixture = (id, category = 'jokes', answer = 'Answer ' + id) =>
  ({ id, category, prompt: 'Prompt ' + id, source: 'Fixture', ...(answer ? { answer } : {}) });
function harness(items = [fixture('one'), fixture('two')], storage = store()) {
  const deck = createDeck({ schemaVersion: 1, version: 'fixture', items }, storage, () => 0);
  const speechJobs = [], shown = [], statuses = [], timers = clock();
  const speech = {
    available: true,
    say(text, signal) {
      return new Promise((resolve, reject) => {
        const abort = () => reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
        signal.addEventListener('abort', abort, { once: true });
        speechJobs.push({
          text, signal,
          finish() { signal.removeEventListener('abort', abort); resolve(); },
          fail() { signal.removeEventListener('abort', abort); reject(new Error('Voice unavailable')); }
        });
      });
    }
  };
  const player = createHandsFreePlayer({
    deck, speech, timers, onItem: state => shown.push(state), onStatus: state => statuses.push(state)
  });
  return { deck, player, speech, speechJobs, shown, statuses, timers, storage };
}

test('hands-free waits for prompt completion, counts down, reveals/reads answer, then draws unseen', async () => {
  const h = harness();
  h.player.start();
  await flush();
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.speechJobs[0].text, 'Prompt one');
  assert.equal(h.timers.size, 0, 'no arbitrary speech-duration timer');
  await h.timers.tick(30000);
  assert.equal(h.deck.snapshot().seen, 1);
  h.speechJobs[0].finish();
  await flush();
  assert.equal(h.player.snapshot().remaining, 3);
  await h.timers.tick(2000);
  assert.equal(h.deck.snapshot().answer, '');
  assert.equal(h.player.snapshot().remaining, 1);
  await h.timers.tick(1000);
  assert.equal(h.deck.snapshot().answer, 'Answer one');
  assert.equal(h.speechJobs[1].text, 'Answer one');
  await h.timers.tick(30000);
  assert.equal(h.deck.snapshot().seen, 1, 'answer must finish speaking before the gap begins');
  h.speechJobs[1].finish();
  await flush();
  await h.timers.tick(3000);
  assert.equal(h.deck.snapshot().seen, 2);
  assert.equal(h.speechJobs[2].text, 'Prompt two');
  h.player.stop();
  assert.equal(h.timers.size, 0);
});

test('pause cancels speech and stale callbacks; Resume replays current item without consuming another', async () => {
  const h = harness();
  h.player.start();
  await flush();
  const oldSpeech = h.speechJobs[0];
  h.player.pause();
  assert.equal(oldSpeech.signal.aborted, true);
  oldSpeech.finish();
  await flush();
  assert.equal(h.player.snapshot().mode, 'paused');
  assert.equal(h.timers.size, 0);
  h.player.resume();
  await flush();
  assert.equal(h.speechJobs[1].text, oldSpeech.text);
  assert.equal(h.deck.snapshot().seen, 1);
  h.speechJobs[1].finish();
  await flush();
  await h.timers.tick(1000);
  h.player.pause();
  assert.equal(h.timers.size, 0);
  await h.timers.tick(50000);
  assert.equal(h.deck.snapshot().answer, '');
  h.player.resume();
  await flush();
  assert.equal(h.player.snapshot().remaining, 3, 'resume restarts the thinking countdown');
  h.player.stop();
  await h.timers.tick(50000);
  assert.equal(h.deck.snapshot().seen, 1);
});

test('normal trivia uses ten seconds; short/long controls scale pauses and visual mode works without speech', async () => {
  for (const [pace, seconds] of [['short', 5], ['normal', 10], ['long', 20]]) {
    const h = harness([fixture('question', 'trivia')]);
    await h.deck.select('trivia');
    h.speech.available = false;
    h.player.start({ audio: true, pace });
    await flush();
    assert.equal(h.deck.snapshot().seen, 1);
    assert.match(h.player.snapshot().message, /Audio unavailable/);
    assert.equal(h.player.snapshot().remaining, seconds);
    assert.equal(h.speechJobs.length, 0);
    await h.timers.tick(seconds * 1000);
    assert.equal(h.deck.snapshot().answer, 'Answer question');
    h.player.stop();
  }
});

test('no-answer jokes read their full prompt and exhaust without a reset or repeated draw', async () => {
  const h = harness([fixture('one', 'jokes', '')]);
  h.player.start();
  await flush();
  h.speechJobs[0].finish();
  await flush();
  await h.timers.tick(3000);
  assert.equal(h.player.snapshot().mode, 'idle');
  assert.match(h.player.snapshot().message, /All items seen/);
  assert.equal(h.deck.snapshot().cycle, 1);
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.speechJobs.length, 1);
  h.player.start();
  await flush();
  assert.equal(h.speechJobs.length, 1, 'Start cannot replay the exhausted saved current item');
  assert.equal(h.timers.size, 0);
});

test('Start skips restored current items and concurrent-tab exhaustion never speaks an old current item', async () => {
  const storage = store();
  const h = harness(undefined, storage);
  await h.deck.next();
  const other = harness(undefined, storage);
  await other.deck.select('jokes');
  other.player.start();
  await flush();
  assert.equal(other.speechJobs[0].text, 'Prompt two');
  other.player.stop();
  h.player.start();
  await flush();
  assert.equal(h.speechJobs.length, 0, 'freshOnly rejects another tab’s exhausted restored item');
  assert.match(h.player.snapshot().message, /All items seen/);
});

test('stop during an in-flight storage write suppresses stale UI and serializes category changes', async () => {
  const h = harness();
  const original = h.storage.updateSetting;
  let finish;
  h.storage.updateSetting = (...args) => new Promise(resolve => {
    finish = async () => resolve(await original(...args));
  });
  h.player.start();
  await flush();
  h.player.stop('Category changed');
  const settled = h.player.settled();
  await finish();
  await settled;
  await h.deck.select('trivia');
  await flush();
  assert.equal(h.speechJobs.length, 0);
  assert.equal(h.shown.length, 0);
  assert.equal(h.deck.snapshot().category, 'trivia');
  assert.equal(h.player.snapshot().message, 'Category changed');
});

test('speech failure falls back to timed answers; storage failure stops advancement', async () => {
  const h = harness();
  h.player.start();
  await flush();
  h.speechJobs[0].fail();
  await flush();
  assert.equal(h.player.snapshot().mode, 'running');
  assert.match(h.player.snapshot().message, /continuing on screen/);
  await h.timers.tick(3000);
  assert.equal(h.deck.snapshot().answer, 'Answer one');
  h.player.stop();
  h.storage.updateSetting = async () => { throw new Error('Storage full'); };
  h.player.start();
  await flush();
  assert.match(h.player.snapshot().message, /Storage full/);
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.timers.size, 0);
});

test('Auto off automatically reveals the current answer and never draws another', async () => {
  const h = harness();
  await h.deck.next();
  h.player.present({ audio: false, auto: false });
  await flush();
  assert.equal(h.player.snapshot().auto, false);
  await h.timers.tick(2999);
  assert.equal(h.deck.snapshot().answer, '');
  await h.timers.tick(1);
  assert.equal(h.deck.snapshot().answer, 'Answer one');
  await h.timers.tick(60000);
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.timers.size, 0);
});

test('Auto resumes after an already-revealed item without reading it again', async () => {
  const h = harness();
  await h.deck.next();
  h.player.present({ audio: false });
  await flush();
  await h.timers.tick(3000);
  h.player.setAuto(true, { audio: true });
  await flush();
  assert.equal(h.speechJobs.length, 0);
  await h.timers.tick(3000);
  assert.equal(h.deck.snapshot().seen, 2);
  assert.equal(h.speechJobs[0].text, 'Prompt two');
  h.player.stop();
});

test('deliberately enabling Auto on a silent restored prompt enables preferred speech', async () => {
  const h = harness();
  await h.deck.next();
  h.player.present({ audio: false });
  await flush();
  h.player.setAuto(true, { audio: true });
  await flush();
  assert.equal(h.speechJobs[0].text, 'Prompt one');
  assert.equal(h.timers.size, 0, 'the silent answer timer was cancelled');
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.player.snapshot().auto, true);
  h.player.stop();
});

test('Next cancels an old answer timer and continues Auto with the new item', async () => {
  const h = harness([fixture('one'), fixture('two'), fixture('three')]);
  h.player.start({ audio: false });
  await flush();
  await h.timers.tick(2000);
  const auto = h.player.snapshot().auto;
  h.player.stop();
  await h.player.settled();
  await h.deck.next({ freshOnly: true });
  h.player.present({ auto, audio: false });
  await flush();
  await h.timers.tick(1000);
  assert.equal(h.deck.snapshot().item.id, 'two');
  assert.equal(h.deck.snapshot().answer, '', 'old answer timer cannot reveal the next answer early');
  await h.timers.tick(2000);
  assert.equal(h.deck.snapshot().answer, 'Answer two');
  await h.timers.tick(3000);
  assert.equal(h.deck.snapshot().item.id, 'three');
  assert.equal(h.player.snapshot().auto, true);
  h.player.stop();
});

test('turning Auto off during prompt speech still completes and reveals the answer', async () => {
  const h = harness();
  h.player.start();
  await flush();
  h.player.setAuto(false);
  assert.equal(h.speechJobs[0].signal.aborted, false);
  h.speechJobs[0].finish();
  await flush();
  await h.timers.tick(3000);
  assert.equal(h.deck.snapshot().answer, 'Answer one');
  h.speechJobs[1].finish();
  await flush();
  assert.equal(h.player.snapshot().mode, 'idle');
  assert.equal(h.player.snapshot().auto, false);
  assert.equal(h.timers.size, 0);
});

test('game answers reveal automatically but games never auto-advance', async () => {
  const h = harness([
    { ...fixture('one', 'games'), instructions: 'Play at your pace.' },
    { ...fixture('two', 'games'), instructions: 'Take turns.' }
  ]);
  await h.deck.select('games');
  await h.deck.next();
  h.player.present({ auto: true, audio: false });
  await flush();
  await h.timers.tick(120000);
  assert.equal(h.deck.snapshot().answer, 'Answer one');
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.player.snapshot().auto, false);
  assert.equal(h.timers.size, 0);
});

test('settings/cancellation restart only the current visual answer; no stale speech completion', async () => {
  const h = harness();
  h.player.start();
  await flush();
  const oldSpeech = h.speechJobs[0];
  h.player.stop('Settings changed');
  h.player.present({ auto: false, audio: false, pace: 'short' });
  oldSpeech.finish();
  await flush();
  await h.timers.tick(2000);
  assert.equal(h.deck.snapshot().answer, 'Answer one');
  assert.equal(h.speechJobs.length, 1);
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.timers.size, 0);
});

test('games and challenges cannot start continuous playback', async () => {
  const h = harness([{ ...fixture('game', 'games', ''), instructions: 'Play until both finish.' }]);
  await h.deck.select('games');
  h.player.start();
  await flush();
  assert.equal(h.deck.snapshot().seen, 0);
  assert.match(h.player.snapshot().message, /stay manual/);
});

test('all 125 published jokes run hands-free once, then stop with no timers or automatic reset', async () => {
  const pack = JSON.parse(await readFile(new URL('../js/data/entertainment-pack.json', import.meta.url)));
  const h = harness(pack.items.filter(item => item.category === 'jokes'));
  h.player.start({ audio: false });
  await flush();
  await h.timers.tick(1000000);
  const prompts = h.shown.filter(state => !state.answer).map(state => state.item.id);
  assert.equal(prompts.length, 125);
  assert.equal(new Set(prompts).size, 125);
  assert.equal(h.deck.snapshot().seen, 125);
  assert.equal(h.deck.snapshot().cycle, 1);
  assert.equal(h.player.snapshot().mode, 'idle');
  assert.equal(h.timers.size, 0);
});

test('pausing a pending save resumes its committed item instead of drawing or reading stale content', async () => {
  const h = harness();
  const original = h.storage.updateSetting;
  let finish;
  h.storage.updateSetting = (...args) => new Promise(resolve => {
    finish = async () => resolve(await original(...args));
  });
  h.player.start();
  await flush();
  h.player.pause();
  h.player.resume();
  await finish();
  await flush();
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.speechJobs.length, 1);
  assert.equal(h.speechJobs[0].text, 'Prompt one');
  assert.equal(h.shown[0].item.id, 'one');
  h.player.stop();
});

test('pausing during answer speech cancels it and resumes that answer, not another draw', async () => {
  const h = harness();
  h.player.start();
  await flush();
  h.speechJobs[0].finish();
  await flush();
  await h.timers.tick(3000);
  assert.equal(h.speechJobs[1].text, 'Answer one');
  h.player.pause();
  h.speechJobs[1].finish();
  h.player.resume();
  await flush();
  assert.equal(h.speechJobs[2].text, 'Answer one');
  assert.equal(h.deck.snapshot().seen, 1);
  assert.equal(h.deck.snapshot().answer, 'Answer one');
  h.player.stop();
});

test('long Wiki narration is not cancelled at the short-prompt time limit', async () => {
  const timers = clock();
  let utterance, completed = false;
  const reader = createSpeechReader({
    timers, Utterance: class { constructor(text) { this.text = text; } },
    synthesis: { speak: value => { utterance = value; }, cancel() {} }
  });
  const result = reader.say(Array(588).fill('word').join(' '), new AbortController().signal)
    .then(() => { completed = true; });
  utterance.onstart();
  await timers.tick(300000);
  assert.equal(completed, false);
  assert.equal(typeof utterance.onend, 'function');
  utterance.onend();
  await result;
  assert.equal(timers.size, 0);
});

test('speech adapter resolves only on utterance end and cancels cleanly on abort/error/timeout', async () => {
  const timers = clock(), utterances = [];
  let cancelled = 0;
  const reader = createSpeechReader({
    timers, Utterance: class { constructor(text) { this.text = text; } },
    synthesis: { speak: utterance => utterances.push(utterance), cancel: () => cancelled++ }
  });
  const controller = new AbortController();
  let finished = false;
  const first = reader.say('Prompt', controller.signal).then(() => { finished = true; });
  await timers.tick(1000);
  assert.equal(finished, false);
  utterances[0].onend();
  await first;
  assert.equal(timers.size, 0);
  const second = reader.say('Answer', controller.signal);
  const rejected = assert.rejects(second, { name: 'AbortError' });
  const staleEnd = utterances[1].onend;
  controller.abort();
  staleEnd();
  await rejected;
  assert.equal(timers.size, 0);
  const third = reader.say('Error', new AbortController().signal);
  const failed = assert.rejects(third, /Speech failed/);
  utterances[2].onerror({ error: 'not-allowed' });
  await failed;
  const fourth = reader.say('Stall', new AbortController().signal);
  const stalled = assert.rejects(fourth, /did not finish/);
  await timers.tick(120000);
  await stalled;
  assert.equal(timers.size, 0);
  assert.ok(cancelled >= 4);
});
