/* breathe.js — the Breath work & recovery pacer.
   A calm, offline wind-down for rest shifts. The crew set an inhale / hold /
   exhale rhythm (default 4 · 2 · 6 — the Oxygen Advantage "breathe slow" 4:6
   they know, with an optional silent pause). A 3D sphere breathes with them and
   a soft "sea breath" sound — warm brown noise, brighter on the in-breath, lower
   and longer on the out-breath, silent on the hold — paces them with eyes closed.

   After 10 minutes the screen fades to black ("sleep") and over the next 10
   minutes the sound fades to silence, so it carries them into sleep and then
   leaves them in peace. Everything is generated in the browser (Web Audio) — no
   files, no network. It is a relaxation aid, not medical treatment. */

import { h } from '../app.js';
import { cyclePhase, sphereScale, breathEnvelope, fadeGain } from '../breathe-math.js';

const ACTIVE_MS = 10 * 60 * 1000;   // full-volume guided window
const FADE_MS = 10 * 60 * 1000;     // then a slow fade to silence
const PEAK = 0.16;                  // gentle master volume for the noise
const HI_HZ = 620, LO_HZ = 300;     // in-breath brighter, out-breath warmer

/* A tiny looping silent WAV. Playing it through an <audio> element inside the
   Begin gesture promotes iOS Safari to the media-playback audio session, so the
   Web-Audio "sea breath" is heard even when the phone's ring/silent switch is
   set to silent — and helps the sound survive the screen dimming. */
function silentWavUrl() {
  const sr = 8000, n = sr / 2;               // 0.5s, 8-bit mono
  const b = new Uint8Array(44 + n);
  const dv = new DataView(b.buffer);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n, true); ws(8, 'WAVE');
  ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  ws(36, 'data'); dv.setUint32(40, n, true);
  for (let i = 0; i < n; i++) b[44 + i] = 128;   // 8-bit silence
  let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,' + btoa(s);
}

/* Theme-aware sphere colours so Night-vision stays red-on-black. */
function sphereColors() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'night') return { hi: '#ff8a78', mid: '#c8321f', lo: '#3a0000', glow: 'rgba(255,60,40,.30)' };
  if (t === 'day') return { hi: '#8fe6d6', mid: '#1f9e94', lo: '#0b5450', glow: 'rgba(20,120,110,.24)' };
  return { hi: '#9fe6ff', mid: '#2aa5c8', lo: '#0c3346', glow: 'rgba(70,185,225,.28)' };
}

export function renderBreathe(view, _param, signal) {
  let ctx = null, src = null, filter = null, gain = null, keepEl = null;
  let raf = null, startT = 0, running = false, sleeping = false, wakeLock = null;

  const sphere = h('div', { class: 'bx-sphere', 'aria-hidden': 'true' });
  const stage = h('div', { class: 'bx-stage' }, sphere);
  const phaseText = h('div', { class: 'bx-phase', role: 'status', 'aria-live': 'polite' }, 'Ready when you are');

  const overlay = h('div', { class: 'bx-overlay' }, h('span', {}, 'tap to wake'));
  overlay.addEventListener('click', () => stop(false));

  function paintSphere() {
    const c = sphereColors();
    sphere.style.setProperty('--sph-hi', c.hi);
    sphere.style.setProperty('--sph-mid', c.mid);
    sphere.style.setProperty('--sph-lo', c.lo);
    sphere.style.setProperty('--sph-glow', c.glow);
  }
  const onTheme = () => paintSphere();
  window.addEventListener('themechange', onTheme);
  paintSphere();
  sphere.style.transform = 'scale(0.32)';

  const slider = (id, label, value) => {
    const input = h('input', { type: 'range', id, min: '0', max: '10', step: '0.5', value: String(value),
      'aria-label': label + ' seconds' });
    const out = h('span', { class: 'bx-val' }, value + 's');
    input.addEventListener('input', () => { out.textContent = input.value + 's'; });
    return { row: h('label', { class: 'bx-slider' }, [h('span', {}, label), input, out]), input };
  };
  const inS = slider('bxIn', 'Breathe in', 4);
  const holdS = slider('bxHold', 'Hold', 2);
  const outS = slider('bxOut', 'Breathe out', 6);
  const lengths = () => [Math.max(0, +inS.input.value), Math.max(0, +holdS.input.value), Math.max(0, +outS.input.value)];

  const startBtn = h('button', { type: 'button', class: 'btn bx-start' }, '▶ Begin');
  startBtn.addEventListener('click', () => (running ? stop(false) : start()));

  async function lock() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* fine without it */ }
  }
  function unlock() { try { wakeLock && wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
  const onVis = () => { if (running && document.visibilityState === 'visible' && !wakeLock) lock(); };
  document.addEventListener('visibilitychange', onVis);

  function startAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // Promote iOS to media-playback so sound is heard past the ring/silent switch.
    try {
      keepEl = new Audio(silentWavUrl());
      keepEl.loop = true; keepEl.playsInline = true;
      keepEl.setAttribute('playsinline', ''); keepEl.setAttribute('webkit-playsinline', '');
      const pl = keepEl.play(); if (pl && pl.catch) pl.catch(() => {});
    } catch (e) { /* fall back to normal Web-Audio output */ }
    ctx = new AC();
    // Brown noise: integrate white noise, then normalise. Warm, surf-like, kind to sleep.
    const len = Math.floor(ctx.sampleRate * 3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = LO_HZ; filter.Q.value = 0.6;
    gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start();
    // iOS creates the context suspended even inside a gesture — resume it now.
    if (ctx.resume) { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); }
  }

  function frame(now) {
    if (!running) return;
    const elapsed = now - startT;
    const [i, hold, o] = lengths();
    const { phase, p } = cyclePhase(elapsed / 1000, i, hold, o);

    sphere.style.transform = 'scale(' + sphereScale(phase, p).toFixed(3) + ')';
    const label = phase === 'in' ? 'Breathe in' : phase === 'hold' ? 'Hold' : 'Breathe out';
    if (phaseText.textContent !== label) phaseText.textContent = label;

    if (ctx && gain) {
      const g = PEAK * breathEnvelope(phase, p) * fadeGain(elapsed, ACTIVE_MS, FADE_MS);
      gain.gain.setTargetAtTime(g, ctx.currentTime, 0.04);
      const target = phase === 'in' ? HI_HZ : phase === 'out' ? LO_HZ : filter.frequency.value;
      filter.frequency.setTargetAtTime(target, ctx.currentTime, 0.06);
    }

    if (!sleeping && elapsed >= ACTIVE_MS) { sleeping = true; overlay.classList.add('bx-asleep'); }
    if (elapsed >= ACTIVE_MS + FADE_MS) { stop(true); return; }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    running = true; sleeping = false; startT = performance.now();
    startBtn.textContent = '■ Stop';
    startBtn.classList.add('bx-running');
    if (!ctx) startAudio(); else { if (ctx.resume) { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); } if (keepEl) { const p = keepEl.play(); if (p && p.catch) p.catch(() => {}); } }
    lock();
    if (!view.contains(overlay)) document.body.appendChild(overlay);
    raf = requestAnimationFrame(frame);
  }

  function stop(finished) {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (gain && ctx) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    const closing = ctx;
    setTimeout(() => { try { src && src.stop(); } catch (e) { /* ignore */ } try { closing && closing.close(); } catch (e) { /* ignore */ } }, 200);
    try { if (keepEl) { keepEl.pause(); keepEl.src = ''; } } catch (e) { /* ignore */ }
    ctx = src = filter = gain = keepEl = null;
    unlock();
    startBtn.textContent = '▶ Begin';
    startBtn.classList.remove('bx-running');
    phaseText.textContent = finished ? 'Rest well 🌙' : 'Ready when you are';
    sphere.style.transform = 'scale(0.32)';
    // On a manual stop, clear the black overlay immediately; on a natural finish
    // leave it dark (they're asleep) until a tap wakes it.
    overlay.classList.remove('bx-asleep');
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    sleeping = false;
  }

  // Full teardown when the crew navigate away mid-session.
  signal && signal.addEventListener('abort', () => {
    stop(false);
    window.removeEventListener('themechange', onTheme);
    document.removeEventListener('visibilitychange', onVis);
  });

  view.append(
    h('h2', { class: 'bx-h' }, 'Breath work & recovery'),
    h('p', { class: 'sub' }, 'A slow-breathing wind-down for rest shifts. Breathe in and out through your nose, follow the sphere and the sound, and let the exhale be the longest part.'),
    h('section', { class: 'card bx-wrap' }, [
      stage,
      phaseText,
      startBtn,
      h('div', { class: 'bx-sliders' }, [
        h('div', { class: 'bx-legend' }, 'Set your rhythm (seconds)'),
        inS.row, holdS.row, outS.row
      ]),
      h('p', { class: 'bx-note' }, 'Default is 4 · 2 · 6 — the "breathe slow" 4:6 you know, with a gentle pause. A longer out-breath is what settles the nervous system. Runs 10 minutes, then the screen sleeps and the sound fades away over 10 more.')
    ]),
    h('section', { class: 'card bx-yojo' }, [
      h('h3', {}, '🌀 Pairing with your Yōjō'),
      h('p', {}, 'On a rest shift you can run this alongside a Yōjō relax, sleep or recovery session — the device works the vagus nerve electrically while your slow 4:6 breathing does the same by feel. Two gentle routes to the same "rest and digest" calm.')
    ]),
    h('section', { class: 'card bx-safe' }, [
      h('h3', {}, 'Keep it safe'),
      h('ul', {}, [
        h('li', {}, 'A relaxation and recovery aid — not medical advice or treatment.'),
        h('li', {}, 'Off-watch only. Never pace your breathing while steering or on lookout.'),
        h('li', {}, 'This is slow breathing, not breath-holding — keep it easy and comfortable.'),
        h('li', {}, 'Stop and breathe normally if you feel dizzy, breathless or unwell.')
      ])
    ])
  );
}
