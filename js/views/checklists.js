/* checklists.js — checklists with state saved on the device. */

import { h, go, toast } from '../app.js';
import { db } from '../db.js';
import { CONTENT } from '../data/content.js';

async function renderOne(view, id) {
  const list = CONTENT.checklists.find((c) => c.id === id);
  if (!list) { view.append(h('div', { class: 'empty' }, 'Checklist not found.')); return; }

  const progress = h('i', {});
  const progWrap = h('div', { class: 'progress' }, progress);
  const counter = h('p', { class: 'hint' }, '');
  const card = h('div', { class: 'card' }, []);

  async function stateKey(i) { return id + ':' + i; }
  async function refresh() {
    let done = 0;
    for (let i = 0; i < list.items.length; i++) {
      const rec = await db.get('checkState', await stateKey(i));
      if (rec && rec.done) done++;
    }
    const pct = Math.round((done / list.items.length) * 100);
    progress.style.width = pct + '%';
    counter.textContent = `${done} of ${list.items.length} done`;
  }

  for (let i = 0; i < list.items.length; i++) {
    const key = id + ':' + i;
    const rec = await db.get('checkState', key);
    const cb = h('input', { type: 'checkbox', id: 'c' + i });
    cb.checked = !!(rec && rec.done);
    const row = h('div', { class: 'check' + (cb.checked ? ' done' : '') }, [cb, h('label', { for: 'c' + i }, list.items[i])]);
    cb.addEventListener('change', async () => {
      await db.put('checkState', { id: key, done: cb.checked, ts: Date.now() });
      row.classList.toggle('done', cb.checked);
      refresh();
    });
    card.append(row);
  }

  view.append(
    h('h2', {}, list.title),
    progWrap, counter, card,
    h('div', { class: 'btnrow', style: 'margin-top:12px' }, [
      h('button', { class: 'btn secondary', onclick: () => go('#/checklists') }, '← All checklists'),
      h('button', { class: 'btn ghost', onclick: async () => {
        for (let i = 0; i < list.items.length; i++) await db.delete('checkState', id + ':' + i);
        toast('Checklist reset'); renderChecklists(view, id);
      } }, 'Reset')
    ])
  );
  refresh();
}

function renderList(view) {
  view.append(h('p', { class: 'sub' }, 'Your ticks are saved on the device — close the app and they’ll still be here.'));
  CONTENT.checklists.forEach((c) => view.append(
    h('a', { class: 'listrow', href: '#/checklists/' + c.id }, [
      h('span', { class: 'lead' }, '✓'),
      h('span', { class: 'body' }, [h('span', { class: 't' }, c.title), h('span', { class: 'd' }, c.items.length + ' items')]),
      h('span', { class: 'chev' }, '›')
    ])));
}

export async function renderChecklists(view, param) {
  view.innerHTML = '';
  if (param) await renderOne(view, param);
  else renderList(view);
}
