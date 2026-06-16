/* log.js — event logging with voice notes.
   Plain English: rowers can save structured logs (shift, watch, medical) and
   record VOICE NOTES using the phone microphone. Audio is stored on the device
   (works offline) and can be played back. The voice journal is for messages home. */

import { h, go, toast } from '../app.js';
import { db, uid } from '../db.js';
import { CONTENT } from '../data/content.js';

/* ---- shared voice recorder widget ---- */
function voiceRecorder(onSaved) {
  let mediaRecorder = null, chunks = [], stream = null, startTs = 0, ticker = null;
  const time = h('span', { class: 'rectime' }, '00:00');
  const btn = h('button', { class: 'recbtn', 'aria-label': 'Record' }, '●');
  const status = h('div', { class: 'hint' }, 'Tap to record a voice note');
  let blob = null, url = null;
  const playback = h('div', {});

  function fmt(ms) { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { toast('Microphone blocked — allow mic access'); return; }
    chunks = []; mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      url = URL.createObjectURL(blob);
      playback.innerHTML = '';
      playback.append(h('audio', { controls: '', src: url }));
      status.textContent = 'Recorded — save the log to keep it.';
      stream.getTracks().forEach((t) => t.stop());
    };
    mediaRecorder.start();
    startTs = Date.now(); ticker = setInterval(() => time.textContent = fmt(Date.now() - startTs), 250);
    btn.classList.add('recording'); btn.textContent = '■'; status.textContent = 'Recording… tap to stop';
  }
  function stop() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    clearInterval(ticker); btn.classList.remove('recording'); btn.textContent = '●';
  }
  btn.addEventListener('click', () => mediaRecorder && mediaRecorder.state === 'recording' ? stop() : start());

  const wrap = h('div', { class: 'recwrap' }, [btn, time, status, playback]);
  return { el: wrap, getBlob: () => blob, stop };
}

/* ---- new-entry form ---- */
async function renderForm(view, typeId) {
  const t = CONTENT.logTypes.find((x) => x.id === typeId);
  if (!t) { view.append(h('div', { class: 'empty' }, 'Unknown log type.')); return; }

  view.append(h('h2', {}, [t.icon + ' ', t.title]));
  const inputs = {};
  const form = h('div', { class: 'card' }, []);

  (t.fields || []).forEach((f) => {
    form.append(h('label', { class: 'field', for: 'f_' + f.k }, f.label));
    let input;
    if (f.type === 'select') {
      input = h('select', { id: 'f_' + f.k }, f.options.map((o) => h('option', {}, o)));
    } else if (f.type === 'number') {
      input = h('input', { id: 'f_' + f.k, type: 'number', inputmode: 'numeric' });
    } else {
      input = h('input', { id: 'f_' + f.k, type: 'text' });
    }
    inputs[f.k] = input; form.append(input);
  });

  let rec = null;
  if (t.voice) {
    form.append(h('hr', { class: 'hr' }), h('label', { class: 'field' }, '🎙 Voice note'));
    rec = voiceRecorder();
    form.append(rec.el);
  }

  view.append(form, h('div', { class: 'btnrow' }, [
    h('button', { class: 'btn secondary', onclick: () => go('#/log') }, 'Cancel'),
    h('button', { class: 'btn', onclick: async () => {
      if (rec) rec.stop();
      const data = {}; Object.entries(inputs).forEach(([k, el]) => data[k] = el.value);
      const id = uid();
      let voiceId = null;
      const blob = rec && rec.getBlob();
      if (blob) { voiceId = 'v-' + id; await db.put('voiceNotes', { id: voiceId, blob, ts: Date.now() }); }
      await db.put('logs', { id, type: t.id, typeTitle: t.title, icon: t.icon, data, voiceId, ts: Date.now() });
      toast('Log saved' + (blob ? ' with voice note' : ''));
      go('#/log');
    } }, '💾 Save')
  ]));
}

/* ---- list + history ---- */
async function renderList(view) {
  view.append(h('p', { class: 'sub' }, 'Record what happens — with optional voice notes. Everything is saved on the device.'));

  view.append(h('div', { class: 'cat-head' }, 'New entry'));
  const grid = h('div', { class: 'grid' }, CONTENT.logTypes.map((t) =>
    h('a', { class: 'tile', href: '#/log/' + t.id }, [
      h('span', { class: 'ti' }, t.icon),
      h('span', { class: 'tt' }, t.title),
      h('span', { class: 'td' }, t.voiceOnly ? 'Voice note' : (t.voice ? 'Form + voice' : 'Form'))
    ])));
  view.append(grid);

  const logs = (await db.all('logs')).sort((a, b) => b.ts - a.ts);
  view.append(h('div', { class: 'cat-head' }, 'History (' + logs.length + ')'));
  if (!logs.length) { view.append(h('div', { class: 'empty' }, 'No entries yet.')); return; }

  for (const lg of logs.slice(0, 50)) {
    const when = new Date(lg.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const summary = Object.values(lg.data || {}).filter(Boolean).join(' · ') || '(no details)';
    const card = h('div', { class: 'card' }, [
      h('h3', {}, [lg.icon + ' ', lg.typeTitle, h('span', { class: 'd', style: 'float:right;font-weight:400;color:var(--muted);font-size:13px' }, when)]),
      h('div', { class: 'hint', style: 'color:var(--ink)' }, summary)
    ]);
    if (lg.voiceId) {
      const note = await db.get('voiceNotes', lg.voiceId);
      if (note && note.blob) card.append(h('audio', { controls: '', src: URL.createObjectURL(note.blob) }));
    }
    card.append(h('button', { class: 'btn small ghost', style: 'margin-top:8px', onclick: async () => {
      if (lg.voiceId) await db.delete('voiceNotes', lg.voiceId);
      await db.delete('logs', lg.id); toast('Deleted'); renderLog(view, '');
    } }, '🗑 Delete'));
    view.append(card);
  }
}

export async function renderLog(view, param) {
  view.innerHTML = '';
  if (param) await renderForm(view, param);
  else await renderList(view);
}
