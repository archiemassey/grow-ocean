/* entertain.js — Morale & Media: games, on-demand media, awe prompts, and the
   live race/weather sub-page. The white-noise generator and game prompts work
   fully offline. Music/podcasts/audiobooks are placeholders for side-loaded files. */

import { h, go, toast, speak, stopSpeaking } from '../app.js';
import { CONTENT } from '../data/content.js';
import { db } from '../db.js';
import { CATEGORIES, createDeck } from '../entertainment.js';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
  const card = h('div', { class: 'card' }, h('h3', {}, '🎲 Games & prompts'));
  try {
    const response = await fetch(new URL('../data/entertainment-pack.json', import.meta.url));
    if (!response.ok) throw new Error('Content pack unavailable');
    const pack = await response.json();
    const deck = createDeck(pack, db);
    const selector = h('select', { id: 'entertainment-category', 'aria-label': 'Entertainment category' },
      Object.entries(CATEGORIES).map(([id, label]) => h('option', { value: id },
        `${label} (${pack.items.filter(item => item.category === id).length})`)));
    const progress = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
    const prompt = h('p', { 'aria-live': 'polite' });
    const instructions = h('p', { style: 'white-space:pre-line' });
    const answer = h('p', { 'aria-live': 'polite' });
    const source = h('p', { class: 'hint', style: 'overflow-wrap:anywhere' });
    const next = h('button', { class: 'btn', onclick: () => act(() => deck.next()) }, 'Next');
    const reveal = h('button', { class: 'btn secondary', onclick: () => draw(deck.reveal()) }, 'Reveal answer');
    const read = h('button', { class: 'btn small secondary', onclick: () => {
      const state = deck.snapshot();
      speak([state.prompt, state.instructions, state.answer].filter(Boolean).join('. '));
    } }, '🔊 Read aloud');
    const reset = h('button', { class: 'btn small ghost', onclick: () => {
      if (window.confirm('Start a new cycle for this category? Previously seen items may repeat.'))
        act(() => deck.reset());
    } }, 'Reset this category');
    let busy = false;
    function draw(state) {
      prompt.textContent = state.total ? state.prompt : 'No items published in this category yet. Choose another category.';
      instructions.textContent = state.instructions;
      instructions.hidden = !state.instructions;
      answer.textContent = state.answer;
      answer.hidden = !state.answer;
      source.textContent = state.item
        ? (state.canReveal ? 'Source shown with the answer to avoid spoilers.' : 'Source: ' + state.item.source) : '';
      progress.textContent = `${state.seen} of ${state.total} seen · cycle ${state.cycle}` +
        (!state.total ? ' · No items available.' :
          state.exhausted ? ' · All seen. Reset when you want another round.' : ' · No repeats until all seen.');
      next.disabled = state.exhausted;
      reveal.disabled = !state.canReveal;
      read.disabled = !state.item;
      reset.disabled = !state.seen;
    }
    async function act(action) {
      if (busy) return;
      busy = true;
      stopSpeaking();
      answer.hidden = true;
      source.textContent = '';
      [selector, next, reveal, read, reset].forEach(control => control.disabled = true);
      try { await action(); }
      catch { toast('Could not save progress on this device. Please try again.'); }
      finally {
        busy = false; selector.disabled = false;
        selector.value = deck.snapshot().category;
        draw(deck.snapshot());
      }
    }
    selector.addEventListener('change', () => act(() => deck.select(selector.value)));
    card.append(
      h('p', { class: 'hint' }, `${pack.items.length.toLocaleString()} offline items for your 44-day crossing. Choose freely; no daily lock.`),
      h('p', { class: 'hint' }, 'Optional entertainment for two. Pause whenever either rower needs to attend to the boat; no physical or timed safety drills.'),
      h('label', { class: 'field', for: 'entertainment-category' }, 'Category'), selector, progress,
      h('div', { class: 'callout', style: 'min-height:46px' }, [prompt, instructions, answer]),
      h('div', { class: 'btnrow', style: 'flex-wrap:wrap;gap:8px' }, [next, reveal, read,
        h('button', { class: 'btn small ghost', onclick: stopSpeaking }, '⏹ Stop'), reset]), source,
      h('p', { class: 'hint' }, 'Progress saves on this device only. Read-aloud needs an installed offline voice; test in aeroplane mode before departure.')
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
      card.append(h('details', {}, [
        h('summary', {}, 'Optional 44-day plan'), day, note,
        h('p', { class: 'hint' }, 'Suggestions only. Use the category picker and Next for unseen items; this plan never advances or resets your progress.')
      ]));
    }
    draw(await deck.select('jokes'));
  } catch {
    card.append(h('p', { role: 'alert' }, 'Entertainment could not load. Open once online to finish downloading the app, then try again. Other morale features remain available.'));
  }
  return card;
}

function mediaCard() {
  const card = h('div', { class: 'card' }, [h('h3', {}, '🎧 On-demand media')]);
  CONTENT.media.filter((m) => m.id !== 'whitenoise').forEach((m) =>
    card.append(h('div', { class: 'listrow', style: 'box-shadow:none;border:0;border-bottom:1px solid var(--line);border-radius:0;margin:0', onclick: () => toast(m.title + ': add your own files before departure') }, [
      h('span', { class: 'lead' }, m.icon),
      h('span', { class: 'body' }, [h('span', { class: 't' }, m.title), h('span', { class: 'd' }, m.detail)]),
      h('span', { class: 'mock' }, 'side-load')
    ])));
  card.append(h('p', { class: 'hint' }, 'Prototype: music/podcasts/audiobooks are placeholders. Before the row, load audio files onto the device so they play offline.'));
  return card;
}

function aweCard() {
  const out = h('div', { class: 'callout' }, 'Look up. Look out. What can you see right now? 🐋');
  const prompts = [
    'Name three things you can see that no one on land can right now.',
    'Watch the next wave all the way through. Just that one.',
    'Find the brightest star and make a wish for someone at home.',
    'Three good things from this shift — say them out loud.',
    'Picture the finish line. Hold it for ten breaths.'
  ];
  return h('div', { class: 'card' }, [
    h('h3', {}, '🌌 Awe & perspective'),
    out,
    h('div', { class: 'btnrow' }, [
      h('button', { class: 'btn small secondary', onclick: () => out.textContent = pick(prompts) }, 'New prompt'),
      h('button', { class: 'btn small secondary', onclick: () => go('#/wiki/stars') }, '★ Star guide'),
    ])
  ]);
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
    h('p', { class: 'sub' }, 'Distraction, morale and a moment of awe — plus on-demand media and live race data.'),
    h('button', { class: 'btn secondary', style: 'margin-bottom:12px', onclick: () => go('#/entertain/live') }, '📡 Live race & weather'),
    loading,
    noisePlayer(),
    mediaCard(),
    aweCard(),
    h('div', { class: 'card' }, [
      h('h3', {}, '💬 Messages from home & journal'),
      h('p', { class: 'hint', style: 'color:var(--ink)' }, 'Record a voice message home or journal your day.'),
      h('button', { class: 'btn small', onclick: () => go('#/log/journal') }, '🎙 Open voice journal')
    ])
  );
  const games = await gamesCard();
  if (view.contains(loading)) loading.replaceWith(games);
}
