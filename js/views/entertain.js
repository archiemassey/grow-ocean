/* entertain.js — Morale & Media: games, on-demand media, awe prompts, and the
   live race/weather sub-page. The white-noise generator and game prompts work
   fully offline. Music/podcasts/audiobooks are placeholders for side-loaded files. */

import { h, go, toast, speak, stopSpeaking } from '../app.js';
import { CONTENT } from '../data/content.js';
import { db } from '../db.js';
import { CATEGORIES, createDeck } from '../entertainment.js';
import { HANDS_FREE_CATEGORIES, createHandsFreePlayer, createSpeechReader } from '../hands-free.js';

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
    const next = h('button', { class: 'btn secondary', onclick: () => act(() => deck.next()) }, 'Next unseen item');
    const reveal = h('button', { class: 'btn secondary', onclick: () => act(() => deck.reveal()) }, 'Reveal answer');
    const read = h('button', { class: 'btn secondary', 'aria-label': 'Read current prompt and revealed answer aloud', onclick: () => act(() => {
      const state = deck.snapshot();
      speak([state.prompt, state.instructions, state.answer].filter(Boolean).join('. '));
    }) }, '🔊 Read current');
    const reset = h('button', { class: 'btn ghost', onclick: () => {
      if (window.confirm('Start a new cycle for this category? Previously seen items may repeat.'))
        act(() => deck.reset());
    } }, 'Reset this category');
    let busy = false, disposed = false;
    const speech = createSpeechReader();
    const audio = h('input', { type: 'checkbox', checked: speech.available, disabled: !speech.available });
    const pace = h('select', { id: 'hands-free-pace', 'aria-label': 'Hands-free timing' }, [
      h('option', { value: 'short' }, 'Short — half the pauses'),
      h('option', { value: 'normal', selected: true }, 'Normal — jokes 3s, trivia 10s'),
      h('option', { value: 'long' }, 'Long — double the pauses')
    ]);
    const playbackStatus = h('p', { class: 'hint player-status', role: 'status', 'aria-live': 'polite' });
    const start = h('button', { id: 'hands-free-toggle', class: 'btn', onclick: () => {
      if (busy || disposed || document.hidden) return;
      if (player.snapshot().mode === 'running') { player.pause(); return; }
      if (player.snapshot().mode === 'paused') { player.resume(); return; }
      stopSpeaking();
      player.start({ audio: audio.checked, pace: pace.value });
    } }, '▶ Start hands-free');
    const stop = h('button', { class: 'btn secondary', onclick: () => {
      player.stop(); stopSpeaking();
    } }, '⏹ Stop');
    const player = createHandsFreePlayer({
      deck, speech,
      onItem: state => { if (!disposed) draw(state); },
      onStatus: state => {
        if (disposed) return;
        playbackStatus.textContent = state.remaining !== null
          ? `${state.phase === 'think' ? 'Answer' : 'Next item'} in ${state.remaining}s`
          : state.mode === 'paused' ? 'Paused · Tap Resume when ready.'
            : state.message.startsWith('Manual control') ? 'Manual mode · Unseen items only'
              : state.message.startsWith('Stopped.') ? 'Stopped · Your progress is saved.' : state.message;
        draw(deck.snapshot());
      }
    });
    function dispose() {
      disposed = true;
      player.stop(); stopSpeaking();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('hashchange', dispose);
      window.removeEventListener('pagehide', pagehide);
    }
    function visibility() {
      if (document.hidden) {
        player.pause('Paused because the app is hidden or the screen locked. Return here and tap Resume.');
        stopSpeaking();
      }
    }
    function pagehide() {
      player.pause('Paused while leaving the page. Tap Resume after returning.');
      stopSpeaking();
    }
    // A delayed pack load must not attach playback handlers to a route already left.
    if (location.hash !== enteredRoute) return card;
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('hashchange', dispose);
    window.addEventListener('pagehide', pagehide);
    pace.addEventListener('change', () => player.stop('Timing changed. Start hands-free to use the new pauses.'));
    audio.addEventListener('change', () => player.stop('Audio mode changed. Start hands-free to continue.'));
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
      reveal.disabled = busy || !state.canReveal;
      read.disabled = busy || !state.item;
      reset.disabled = busy || !state.seen;
      const playback = player.snapshot();
      start.disabled = busy || (playback.mode === 'idle' &&
        (state.exhausted || !HANDS_FREE_CATEGORIES.has(state.category)));
      start.textContent = playback.mode === 'running' ? '⏸ Pause' :
        playback.mode === 'paused' ? '▶ Resume' : '▶ Start hands-free';
      start.setAttribute('aria-pressed', String(playback.mode === 'running'));
      stop.disabled = busy || (!state.item && playback.mode === 'idle');
    }
    async function act(action) {
      if (busy) return;
      busy = true;
      player.stop('Manual control selected. Hands-free stopped.');
      stopSpeaking();
      answer.hidden = true;
      source.textContent = '';
      [selector, next, reveal, read, reset].forEach(control => control.disabled = true);
      try {
        await player.settled();
        if (!disposed) await action();
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
        h('div', { class: 'player-primary' }, [start, next]),
        h('div', { class: 'player-secondary' }, [reveal, read, stop])
      ]),
      h('p', { class: 'hint player-footnote' }, 'Foreground only · Boat and watch duties first'),
      ...(!speech.available ? [h('p', { class: 'hint' },
        'Speech unavailable — timed visual mode is active. Manual controls still work.')] : []),
      h('details', { class: 'player-details' }, [
        h('summary', {}, 'Playback settings, progress & source'),
        h('label', { class: 'field player-audio' }, [audio, ' Read aloud during hands-free']),
        h('label', { class: 'field', for: 'hands-free-pace' }, 'Thinking / next-item pauses'), pace,
        h('p', { class: 'hint' }, 'Normal pauses: jokes 3s, trivia 10s, conversation/choices 20s; 3s after an answer. Resume restarts the current speech/countdown. Games and challenges stay manual.'),
        h('p', { class: 'hint' }, 'Hiding the app or locking the screen pauses playback. An installed offline voice is required for read-aloud; turn it off for timed visual mode if speech fails. Test on your phone before departure.'),
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
    playbackStatus.textContent = 'Manual or hands-free · Your choice';
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
