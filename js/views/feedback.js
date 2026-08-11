/* feedback.js — in-app feedback capture + export.
   Plain English: the rowers jot down anything about the app — what's confusing,
   what's missing, ideas — and it saves ON THE DEVICE (works offline, mid-ocean).
   When they next have signal they tap Export and share the file (AirDrop / message)
   to the person maintaining the app, who feeds it back into the next update. */

import { h, go, toast, shareOrDownload } from '../app.js';
import { db, uid } from '../db.js';

function whenStr(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function renderFeedback(view) {
  view.append(
    h('p', { class: 'sub' }, 'Tell us how to make the app better. Notes save on this phone and work with no signal — Export and share them when you’re back in range.')
  );

  const cat = h('select', {}, ['General', 'Wiki content', 'Reminders', 'Checklists', 'Logging', 'Morale/Media', 'A bug', 'An idea']
    .map((c) => h('option', { value: c }, c)));
  const text = h('textarea', { placeholder: 'What’s confusing, missing, or would help? Be as specific as you like.' });
  text.style.minHeight = '120px';
  const who = h('input', { type: 'text', placeholder: 'Your name (optional)' });

  const listWrap = h('div', {});

  async function refresh() {
    const all = (await db.all('feedback')).sort((a, b) => b.ts - a.ts);
    listWrap.innerHTML = '';
    if (!all.length) { listWrap.append(h('div', { class: 'empty' }, 'No feedback saved yet.')); return; }
    listWrap.append(h('div', { class: 'cat-head' }, `Saved on this phone (${all.length})`));
    all.forEach((fb) => {
      listWrap.append(h('div', { class: 'card' }, [
        h('div', {}, [
          h('span', { class: 'chip' }, fb.cat || 'General'),
          h('span', { class: 'hint', style: 'margin-left:6px' }, whenStr(fb.ts) + (fb.who ? ' · ' + fb.who : ''))
        ]),
        h('p', { style: 'margin:8px 0 6px;white-space:pre-wrap' }, fb.text),
        h('button', {
          class: 'btn small ghost', style: 'color:var(--crit)',
          onclick: async () => { await db.delete('feedback', fb.id); toast('Deleted'); refresh(); }
        }, '🗑 Delete')
      ]));
    });
  }

  async function add() {
    if (!text.value.trim()) { toast('Type some feedback first'); text.focus(); return; }
    await db.put('feedback', { id: uid(), ts: Date.now(), cat: cat.value, who: who.value.trim(), text: text.value.trim() });
    text.value = ''; who.value = '';
    toast('Saved on this device');
    refresh();
  }

  async function exportAll() {
    const all = (await db.all('feedback')).sort((a, b) => a.ts - b.ts);
    if (!all.length) { toast('Nothing to export yet'); return; }
    const lines = [
      'gROW Ocean — App feedback',
      'Exported: ' + new Date().toLocaleString(),
      'Total notes: ' + all.length,
      '='.repeat(40), ''
    ];
    all.forEach((fb, i) => {
      lines.push(`#${i + 1} [${fb.cat || 'General'}] ${whenStr(fb.ts)}${fb.who ? ' — ' + fb.who : ''}`);
      lines.push(fb.text);
      lines.push('');
    });
    const ok = await shareOrDownload(`grow-ocean-feedback-${stamp()}.txt`, lines.join('\n'), 'text/plain');
    toast(ok ? 'Feedback exported — share it to the team' : 'Could not export');
  }

  view.append(
    h('div', { class: 'card' }, [
      h('label', { class: 'field' }, 'Category'), cat,
      h('label', { class: 'field' }, 'Feedback'), text,
      h('label', { class: 'field' }, 'Name (optional)'), who,
      h('div', { class: 'btnrow', style: 'margin-top:12px' }, [
        h('button', { class: 'btn', onclick: add }, '➕ Save feedback'),
        h('button', { class: 'btn secondary', onclick: exportAll }, '⤓ Export all')
      ])
    ]),
    h('p', { class: 'hint' }, 'On land you can also raise feedback on GitHub — see the project’s “App feedback” issue form.'),
    listWrap,
    h('button', { class: 'btn secondary', style: 'margin-top:8px', onclick: () => go('#/home') }, '← Home')
  );

  refresh();
}
