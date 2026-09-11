/* entertain.js — Morale & Media: games, on-demand media, awe prompts, and the
   live race/weather sub-page. The white-noise generator and game prompts work
   fully offline. Music/podcasts/audiobooks are placeholders for side-loaded files. */

import { h, go, toast, stopSpeaking } from '../app.js';
import { CONTENT } from '../data/content.js';
import { db } from '../db.js';
import { CATEGORIES, createDeck } from '../entertainment.js';
import { HANDS_FREE_CATEGORIES, createHandsFreePlayer, createSpeechReader } from '../hands-free.js';
import { createVoiceSettings, readPreference, savePreference } from '../speech.js';

/* ---- functional offline white-noise generator ---- */
function noisePlayer() {
  let ctx = null, src = null, gain = null, playing = false;
  const label = h('div', { class: 'hint' }, 'Calming noise for the cabin — works offline.');
  const btn = h('button', { class: 'btn', onclick: toggle }, '▶ Play white noise');
  const vol = h('input', { type: 'range', min: '0', max: '100', value: '40', 'aria-label': 'Volume' });
  vol.addEventListener('input', () => { if (gain) gain.gain.value = vol.value / 100 * 0.4; });

  function toggle() {
    if (playing) { stop(); return; }
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const out = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) { // brown-ish noise (softer than pure white)
      const white = Math.random() * 2 - 1; out[i] = (last + 0.02 * white) / 1.02; last = out[i]; out[i] *= 3.5;
    }
    src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
    gain = ctx.createGain(); gain.gain.value = vol.value / 100 * 0.4;
    src.connect(gain); gain.connect(ctx.destination); src.start();
    playing = true; btn.textContent = '⏹ Stop';
  }
  function stop() { if (src) src.stop(); playing = false; btn.textContent = '▶ Play white noise'; }
  window.addEventListener('hashchange', stop, { once: true });
  return h('div', { class: 'card' }, [h('h3', {}, '🌊 White noise / Calm'), label, btn, h('label', { class: 'field' }, 'Volume'), vol]);
}

async function gamesCard() {
  const card = h('section', { class: 'card entertainment-player', 'aria-label': 'Entertainment player' },
    h('header', { class: 'player-heading' }, [
      h('p', { class: 'player-eyebrow' }, 'A moment for you'),
      h('h2', {}, 'Your downtime')
    ]));
  const enteredRoute = location.hash;
  try {
    const response = await fetch(new URL('../data/entertainment-pack.json', import.meta.url));
    if (!response.ok) throw new Error('Content pack unavailable');
    const pack = await response.json();
    const deck = createDeck(pack, db);
    const selector = h('select', { id: 'entertainment-category', 'aria-label': 'Entertainment category' },
      Object.entries(CATEGORIES).map(([id, label]) => h('option', { value: id },
        `${label} (${pack.items.filter(item => item.category === id).length})`)));
    const progress = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
    const position = h('p', { class: 'hint player-position' });
    const prompt = h('p', { class: 'player-prompt', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const instructions = h('p', { class: 'player-instructions' });
    const answer = h('p', { class: 'player-answer-copy', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const answerMeasure = h('p', { class: 'player-answer-measure', 'aria-hidden': 'true' });
    const answerPlaceholder = h('p', { class: 'player-answer-placeholder' });
    const source = h('p', { class: 'hint', style: 'overflow-wrap:anywhere' });
    const next = h('button', { class: 'btn secondary', 'aria-label': 'Next unseen item',
      onclick: () => act(() => deck.next({ freshOnly: true }), true) }, 'Next');
    const reset = h('button', { class: 'btn ghost', onclick: () => {
      if (window.confirm('Start a new cycle for this category? Previously seen items may repeat.'))
        act(() => deck.reset());
    } }, 'Reset this category');
    let busy = false, disposed = false, lifecycle = 0;
    const speech = createSpeechReader();
    const audio = h('input', { type: 'checkbox', checked: readPreference('grow-ocean-audio', true) });
    const pace = h('select', { id: 'hands-free-pace', 'aria-label': 'Hands-free timing' }, [
      h('option', { value: 'short' }, 'Short — half the pauses'),
      h('option', { value: 'normal', selected: true }, 'Normal — jokes 3s, trivia 10s'),
      h('option', { value: 'long' }, 'Long — double the pauses')
    ]);
    const playbackStatus = h('p', { class: 'hint player-status', role: 'status', 'aria-live': 'polite' });
    const savedPace = readPreference('grow-ocean-pace', 'normal');
    pace.value = ['short', 'normal', 'long'].includes(savedPace) ? savedPace : 'normal';
    const settings = (auto = false, read = true) => ({ auto, audio: read && audio.checked, pace: pace.value });
    const start = h('button', { id: 'hands-free-toggle', class: 'btn', 'aria-pressed': 'false', onclick: () => {
      if (busy || disposed || document.hidden) return;
      if (player.snapshot().mode !== 'running') stopSpeaking();
      player.setAuto(!player.snapshot().auto, settings());
    } }, 'Auto Off');
    const player = createHandsFreePlayer({
      deck, speech,
      onItem: state => { if (!disposed) draw(state); },
      onStatus: state => {
        if (disposed) return;
        playbackStatus.textContent = state.remaining !== null
          ? `${state.message} ${state.remaining}s` : state.message;
        draw(deck.snapshot());
      }
    });
    const voiceSettings = createVoiceSettings(h, changeSettings);
    function dispose() {
      disposed = true; lifecycle++;
      player.stop(); stopSpeaking();
      voiceSettings.dispose();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('hashchange', dispose);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', visibility);
    }
    async function visibility() {
      if (document.hidden) {
        lifecycle++;
        player.stop('Paused while away. Auto is off.');
        stopSpeaking();
      } else {
        const token = lifecycle;
        await player.settled();
        if (!disposed && !busy && !document.hidden && token === lifecycle) player.present(settings(false, false));
      }
    }
    function pagehide() {
      lifecycle++;
      player.stop('Paused while away. Auto is off.');
      stopSpeaking();
    }
    // A delayed pack load must not attach playback handlers to a route already left.
    if (location.hash !== enteredRoute) { dispose(); return card; }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('hashchange', dispose);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', visibility);
    function changeSettings() {
      savePreference('grow-ocean-audio', audio.checked);
      savePreference('grow-ocean-pace', pace.value);
      return act(async () => deck.snapshot());
    }
    pace.addEventListener('change', changeSettings);
    audio.addEventListener('change', changeSettings);
    function draw(state) {
      if (disposed) return;
      prompt.textContent = state.total ? state.prompt : 'No items published in this category yet. Choose another category.';
      instructions.textContent = state.instructions;
      instructions.hidden = !state.instructions;
      answer.textContent = state.answer;
      answer.hidden = !state.answer;
      // Reserve the real answer's height without exposing it to assistive tech.
      // Revealing a punchline must not move the controls under a rower's thumb.
      answerMeasure.textContent = state.item?.answer || '';
      answerPlaceholder.textContent = state.item?.answer
        ? 'A little thinking time…' : state.item ? 'Enjoy this one at your own pace.' : 'Ready when you are.';
      answerPlaceholder.hidden = !!state.answer;
      source.textContent = state.item
        ? (state.canReveal ? 'Source shown with the answer to avoid spoilers.' : 'Source: ' + state.item.source) : '';
      progress.textContent = `${state.seen} of ${state.total} seen · cycle ${state.cycle}` +
        (!state.total ? ' · No items available.' :
          state.exhausted ? ' · All seen. Reset when you want another round.' : ' · Next draws an unseen item.') +
        (state.item ? ' · Showing the saved current item; reopening this category is not a new draw.' : '');
      position.textContent = `${state.seen} / ${state.total} seen` +
        (!state.total ? ' · No items available.' : state.exhausted ? ' · All seen — reset is in settings.' :
          !HANDS_FREE_CATEGORIES.has(state.category) ? ' · Manual activity; take as long as you need.' : '');
      next.disabled = busy || state.exhausted;
      reset.disabled = busy || !state.seen;
      const playback = player.snapshot();
      start.disabled = busy || !HANDS_FREE_CATEGORIES.has(state.category) ||
        (state.exhausted && !state.canReveal && playback.mode === 'idle');
      start.textContent = playback.auto ? 'Auto On' : 'Auto Off';
      start.setAttribute('aria-pressed', String(playback.auto));
    }
    async function act(action, continueAuto = false) {
      if (busy || disposed || document.hidden) return;
      const auto = continueAuto && player.snapshot().auto;
      const token = lifecycle;
      busy = true;
      player.stop();
      stopSpeaking();
      answer.hidden = true;
      source.textContent = '';
      [selector, next, start, reset].forEach(control => control.disabled = true);
      try {
        await player.settled();
        if (!disposed && !document.hidden && token === lifecycle) {
          const result = await action();
          if (!disposed && !document.hidden) player.present(settings(!!result && token === lifecycle && auto, !!result && token === lifecycle && continueAuto));
        }
      }
      catch { toast('Could not save progress on this device. Please try again.'); }
      finally {
        busy = false; selector.disabled = false;
        selector.value = deck.snapshot().category;
        if (!disposed) draw(deck.snapshot());
      }
    }
    selector.addEventListener('change', () => act(() => deck.select(selector.value)));
    card.append(
      h('div', { class: 'player-category' }, [
        h('label', { class: 'field', for: 'entertainment-category' }, 'Choose your category'), selector
      ]),
      h('div', { class: 'player-content' }, [
        position, prompt, instructions,
        h('div', { class: 'player-answer', role: 'group', 'aria-label': 'Answer area' }, [
          h('span', { class: 'player-eyebrow' }, 'The reveal'),
          h('div', { class: 'player-answer-body' }, [answerMeasure, answer, answerPlaceholder])
        ])
      ]),
      h('div', { class: 'player-controls', role: 'group', 'aria-label': 'Playback controls' }, [
        playbackStatus,
        h('div', { class: 'player-primary' }, [next, start])
      ]),
      h('p', { class: 'hint player-footnote' }, 'Foreground only · Boat and watch duties first'),
      ...(!speech.available ? [h('p', { class: 'hint' },
        'Read-aloud isn’t available here. Answers still appear on screen.')] : []),
      h('details', { class: 'player-details' }, [
        h('summary', {}, 'Playback settings, progress & source'),
        h('label', { class: 'field player-audio' }, [audio, ' Read aloud after Next / Auto']),
        voiceSettings.element,
        h('label', { class: 'field', for: 'hands-free-pace' }, 'Thinking / next-item pauses'), pace,
        h('p', { class: 'hint' }, 'Answers appear automatically, even with Auto off. Normal pauses: jokes 3s, trivia 10s, conversation/choices 20s; 3s after an answer. Auto moves on after reading finishes. Next skips ahead and keeps Auto going. Games and challenges stay at your pace.'),
        h('p', { class: 'hint' }, 'Leaving or locking the screen stops speech and turns Auto off. Returning shows answers silently; tap Next or Auto to read aloud again. Changing category, voice or timing also turns Auto off. Audio trouble falls back to on-screen answers.'),
        progress, reset, source,
        h('p', { class: 'hint' }, `Content ${pack.version} · ${pack.items.length.toLocaleString()} offline items. Progress stays on this device; only an explicit reset permits repeated draws.`)
      ])
    );
    if (pack.schedule) {
      const day = h('select', { 'aria-label': 'Optional crossing day' }, [...pack.schedule]
        .sort((a, b) => a.day - b.day).map(entry => h('option', { value: entry.day }, `Day ${entry.day} · ${entry.title}`)));
      const note = h('p', { style: 'white-space:pre-line', 'aria-live': 'polite' });
      function showDay() {
        const entry = pack.schedule.find(entry => entry.day === Number(day.value));
        note.textContent = entry.note + '\nSource: ' + entry.source;
      }
      day.addEventListener('change', showDay);
      showDay();
      card.append(h('details', { class: 'player-details' }, [
        h('summary', {}, 'Optional 44-day plan'), day, note,
        h('p', { class: 'hint' }, 'Suggestions only. Use the category picker and Next for unseen items; this plan never advances or resets your progress.')
      ]));
    }
    draw(await deck.select('jokes'));
    if (!disposed && !document.hidden) player.present(settings(false, false));
  } catch {
    card.append(h('p', { role: 'alert' }, 'Entertainment could not load. Open once online to finish downloading the app, then try again. Other morale features remain available.'));
  }
  return card;
}

function mediaCard() {
  const card = h('div', { class: 'card' }, [h('h3', {}, '🎧 On-demand media')]);
  CONTENT.media.filter((m) => m.id !== 'whitenoise').forEach((m) =>
    card.append(h('button', { type: 'button', class: 'listrow', style: 'box-shadow:none;border:0;border-bottom:1px solid var(--line);border-radius:0;margin:0', onclick: () => toast(m.title + ': add your own files before departure') }, [
      h('span', { class: 'lead' }, m.icon),
      h('span', { class: 'body' }, [h('span', { class: 't' }, m.title), h('span', { class: 'd' }, m.detail)]),
      h('span', { class: 'mock' }, 'side-load')
    ])));
  card.append(h('p', { class: 'hint' }, 'Prototype: music/podcasts/audiobooks are placeholders. Before the row, load audio files onto the device so they play offline.'));
  return card;
}

function renderLive(view) {
  view.append(
    h('h2', {}, '📡 Live race data'),
    h('p', { class: 'sub' }, ['Mocked for the prototype ', h('span', { class: 'mock' }, 'MOCK'), ' — wire to YB Tracking / weather router later.']),
    h('div', { class: 'card' }, CONTENT.live.map((m) =>
      h('div', { class: 'metric' }, [h('span', {}, m.label), h('span', { class: 'v' }, [m.value + ' ', h('small', {}, m.unit)])]))),
    h('div', { class: 'card' }, [
      h('h3', {}, '🌦 Weather routing — ' + CONTENT.weather.router),
      h('p', {}, CONTENT.weather.summary),
      h('span', { class: 'mock' }, 'MOCK — from router')
    ]),
    h('button', { class: 'btn secondary', onclick: () => go('#/entertain') }, '← Back to Morale')
  );
}

export async function renderEntertain(view, param) {
  view.innerHTML = '';
  if (param === 'live') { renderLive(view); return; }

  const loading = h('div', { class: 'card', role: 'status' }, 'Loading entertainment...');
  view.append(
    loading,
    h('section', { class: 'morale-more', 'aria-label': 'More ways to unwind' }, [
      h('h2', {}, 'More ways to unwind'),
      h('details', { class: 'morale-disclosure' }, [
        h('summary', {}, '🌊 Sound & media'), noisePlayer(), mediaCard()
      ]),
      h('details', { class: 'morale-disclosure' }, [
        h('summary', {}, '💬 Journal & crossing'),
        h('div', { class: 'player-links' }, [
          h('a', { class: 'btn secondary', href: '#/log/journal' }, '🎙 Voice journal'),
          h('a', { class: 'btn secondary', href: '#/home' }, '🌌 This shift on Home'),
          h('a', { class: 'btn ghost', href: '#/entertain/live' }, 'Race & weather · prototype')
        ])
      ])
    ])
  );
  const games = await gamesCard();
  if (view.contains(loading)) loading.replaceWith(games);
}
