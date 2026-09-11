import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectVoice, configureVoice, createVoiceSettings, savePreference } from '../js/speech.js';

const voice = (name, lang = 'en-GB', localService = true) =>
  ({ name, lang, localService, voiceURI: name, default: false });

test('voice choice prefers high-quality local English, honours device preference and never selects cloud voices', () => {
  const voices = [voice('Cloud Premium', 'en-GB', false), voice('Basic'), voice('English Enhanced', 'en-US'), voice('French Premium', 'fr-FR')];
  assert.equal(selectVoice(voices).voice.name, 'English Enhanced');
  assert.equal(selectVoice(voices, 'Basic').voice.name, 'Basic');
  assert.equal(selectVoice(voices, 'Cloud Premium').voice.name, 'English Enhanced');
  assert.match(selectVoice(voices, 'Removed voice').message, /Saved voice isn't available/);
  assert.equal(selectVoice([]).voice, null);
  assert.match(selectVoice([]).message, /device default/);
  assert.throws(() => configureVoice({}, { getVoices: () => [voices[0]] }), /No installed English voice/);
  const utterance = {};
  configureVoice(utterance, { getVoices: () => voices });
  assert.equal(utterance.voice, voices[2]);
  assert.equal(utterance.rate, 1);
  assert.equal(utterance.pitch, 1);
  assert.equal(utterance.lang, 'en-US');
});

test('voiceschanged refreshes choices; unavailable preference is retained and restored, with cleanup', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
  const nodes = [];
  const h = (tag, attrs = {}, children = []) => {
    const node = {
      tag, ...attrs, children, textContent: '', events: {},
      replaceChildren(...items) { this.children = items; },
      addEventListener(name, fn) { this.events[name] = fn; }
    };
    nodes.push(node); return node;
  };
  let voices = [];
  const synthesis = new EventTarget();
  synthesis.getVoices = () => voices;
  savePreference('grow-ocean-voice', 'My Enhanced Voice');
  let changed = 0;
  const settings = createVoiceSettings(h, () => changed++, synthesis);
  const select = nodes.find(node => node.tag === 'select');
  const status = nodes.find(node => node.role === 'status');
  assert.equal(select.value, 'My Enhanced Voice');
  assert.match(status.textContent, /Saved voice isn't available/);
  voices = [voice('My Enhanced Voice'), voice('Basic')];
  synthesis.dispatchEvent(new Event('voiceschanged'));
  assert.match(status.textContent, /^Using My Enhanced Voice/);
  select.value = 'Basic'; select.events.change();
  assert.equal(changed, 1);
  assert.equal(JSON.parse(saved.get('grow-ocean-voice')), 'Basic');
  settings.dispose();
  const before = select.children;
  voices = [];
  synthesis.dispatchEvent(new Event('voiceschanged'));
  assert.equal(select.children, before);
  delete globalThis.localStorage;
});

test('manual and automatic speech share the same adapter; routes and visibility cancel speech', async () => {
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const controller = await readFile(new URL('../js/hands-free.js', import.meta.url), 'utf8');
  assert.match(app, /createSpeechReader\(\)\.say/);
  assert.match(controller, /configureVoice\(utterance, synthesis\)/);
  assert.match(app, /visibilitychange.*stopSpeaking/);
  assert.match(app, /async function router\(\) \{\s*stopSpeaking\(\)/);
});
