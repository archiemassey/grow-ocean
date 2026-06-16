/* entertain.js — Morale & Media: games, on-demand media, awe prompts, and the
   live race/weather sub-page. The white-noise generator and game prompts work
   fully offline. Music/podcasts/audiobooks are placeholders for side-loaded files. */

import { h, go, toast, speak } from '../app.js';
import { CONTENT } from '../data/content.js';

const WOULD_YOU_RATHER = [
  'a hot shower or a full night’s sleep?',
  'flat calm for a week or a 3-knot tailwind for a day?',
  'unlimited chocolate or unlimited coffee on board?',
  'see a whale or see another boat?',
  'always row at dawn or always row at dusk?',
  'one big storm now or constant light headwinds?'
];
const JOKES = [
  'Why don’t oceans ever get bored? They’re full of current events.',
  'What did the sea say to the rower? Nothing — it just waved.',
  'I’m reading a book about anti-gravity. It’s impossible to put down.',
  'Why did the sailor bring a ladder? To reach the high seas.',
  'What’s a pirate’s favourite letter? You’d think R… but it’s the C.'
];
const TRIVIA = [
  ['The Atlantic is the world’s ___-largest ocean.', 'Second'],
  ['Roughly how wide (nm) is a mid-Atlantic row, La Gomera→Antigua?', '~2,600–3,000 nm'],
  ['What does VMG stand for?', 'Velocity Made Good'],
  ['Polaris sits above which celestial point?', 'The North Celestial Pole'],
  ['What colour is a boat’s port nav light?', 'Red']
];

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

function gamesCard() {
  const out = h('div', { class: 'callout', style: 'min-height:46px' }, 'Tap a generator below 👇');
  const card = h('div', { class: 'card' }, [
    h('h3', {}, '🎲 Quick games & prompts'),
    out,
    h('div', { class: 'btnrow', style: 'flex-wrap:wrap;gap:8px' }, [
      h('button', { class: 'btn small secondary', onclick: () => out.textContent = 'Would you rather… ' + pick(WOULD_YOU_RATHER) }, 'Would you rather?'),
      h('button', { class: 'btn small secondary', onclick: () => { const j = pick(JOKES); out.textContent = j; } }, 'Joke'),
      h('button', { class: 'btn small secondary', onclick: () => { const t = pick(TRIVIA); out.innerHTML = '<strong>Q:</strong> ' + t[0] + '<br><em>Tap “Reveal”…</em>'; out.dataset.a = t[1]; } }, 'Trivia'),
      h('button', { class: 'btn small ghost', onclick: () => { if (out.dataset.a) out.innerHTML += '<br><strong>A:</strong> ' + out.dataset.a; } }, 'Reveal'),
    ]),
    h('div', { class: 'btnrow' }, [
      h('button', { class: 'btn small', onclick: () => { const g = pick(CONTENT.games); out.textContent = '🎮 ' + g; speak(g); } }, '✨ Surprise us (read aloud)')
    ])
  ]);
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

  view.append(
    h('p', { class: 'sub' }, 'Distraction, morale and a moment of awe — plus on-demand media and live race data.'),
    h('button', { class: 'btn secondary', style: 'margin-bottom:12px', onclick: () => go('#/entertain/live') }, '📡 Live race & weather'),
    gamesCard(),
    noisePlayer(),
    mediaCard(),
    aweCard(),
    h('div', { class: 'card' }, [
      h('h3', {}, '💬 Messages from home & journal'),
      h('p', { class: 'hint', style: 'color:var(--ink)' }, 'Record a voice message home or journal your day.'),
      h('button', { class: 'btn small', onclick: () => go('#/log/journal') }, '🎙 Open voice journal')
    ])
  );
}
