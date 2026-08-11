/* wiki.js — quick-access reference + EDITOR.
   List + search, a single-article reader with "Read aloud", and an editing layer
   so the rowers can change wiki content themselves (no code, fully offline).
   They can edit a page, reset it to the original, add a new page, and export /
   import all their changes to share between the two phones. */

import { h, go, speak, stopSpeaking, toast, shareOrDownload, pickTextFile } from '../app.js';
import {
  getAllWiki, getArticle, getEditable, saveArticle, addArticle,
  resetArticle, exportWiki, importWiki
} from '../wikiStore.js';

function stripHtml(html) {
  const d = document.createElement('div'); d.innerHTML = html; return d.textContent || '';
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ---------- single article ---------- */
async function renderArticle(view, id) {
  const a = await getArticle(id);
  if (!a) { view.append(h('div', { class: 'empty' }, 'Article not found.')); return; }

  const crit = a.priority === 1;
  view.append(
    h('div', {}, [
      h('span', { class: 'chip ' + (crit ? 'crit' : '') }, a.category),
      crit ? h('span', { class: 'chip p1' }, 'PRIORITY 1') : '',
      a.voice ? h('span', { class: 'chip voice' }, '🔊 voice') : '',
      a._edited ? h('span', { class: 'chip' }, a._new ? '✎ added' : '✎ edited') : ''
    ]),
    h('h2', {}, a.title),
    h('p', { class: 'sub' }, a.summary),
    h('div', { class: 'btnrow', style: 'margin-bottom:8px' }, [
      h('button', { class: 'btn small', onclick: () => { speak(a.title + '. ' + stripHtml(a.body)); toast('Reading aloud…'); } }, '🔊 Read aloud'),
      h('button', { class: 'btn small ghost', onclick: stopSpeaking }, '⏹ Stop'),
      h('button', { class: 'btn small secondary', onclick: () => go('#/wiki/edit/' + a.id) }, '✏️ Edit')
    ]),
    h('div', { class: 'article card', html: a.body }),
    a.ref ? h('p', { class: 'ref' }, ['Reference: ', h('a', { href: a.ref, target: '_blank', rel: 'noopener' }, a.ref)]) : '',
    h('button', { class: 'btn secondary', style: 'margin-top:10px', onclick: () => go('#/wiki') }, '← All topics')
  );
}

/* ---------- edit / new form ---------- */
async function renderEditor(view, id /* undefined = new page */) {
  const isNew = !id;
  const cur = isNew ? { title: '', summary: '', body: '', category: 'Notes', _new: true } : await getEditable(id);
  if (!cur) { view.append(h('div', { class: 'empty' }, 'Article not found.')); return; }

  const title = h('input', { type: 'text', value: cur.title, placeholder: 'Page title' });
  const summary = h('input', { type: 'text', value: cur.summary, placeholder: 'One-line summary' });
  const category = h('input', { type: 'text', value: cur.category || 'Notes', placeholder: 'Category (e.g. Safety, Medical, Notes)' });
  const body = h('textarea', { placeholder: 'Write the page here.\n\nLeave a blank line between paragraphs.\nStart a line with "- " to make a bullet list.' });
  body.value = cur.body || '';
  body.style.minHeight = '220px';

  async function save() {
    if (!title.value.trim()) { toast('Please add a title'); title.focus(); return; }
    const fields = { title: title.value.trim(), summary: summary.value.trim(), body: body.value, category: category.value.trim() || 'Notes' };
    let goId = id;
    if (isNew) goId = await addArticle(fields);
    else await saveArticle(id, fields);
    toast('Saved on this device');
    go('#/wiki/' + goId);
  }

  view.append(
    h('h2', {}, isNew ? 'New wiki page' : 'Edit page'),
    h('p', { class: 'sub' }, 'Changes save on THIS phone and work offline. Use Export to copy them to the other rower’s phone.'),
    h('label', { class: 'field' }, 'Title'), title,
    h('label', { class: 'field' }, 'Summary'), summary,
    h('label', { class: 'field' }, 'Category'), category,
    h('label', { class: 'field' }, 'Page content'), body,
    h('p', { class: 'hint' }, 'Tip: blank line = new paragraph · line starting with “- ” = bullet point.'),
    h('div', { class: 'btnrow', style: 'margin-top:14px' }, [
      h('button', { class: 'btn', onclick: save }, '💾 Save'),
      h('button', { class: 'btn secondary', onclick: () => go(isNew ? '#/wiki' : '#/wiki/' + id) }, 'Cancel')
    ]),
    isNew ? '' : h('button', {
      class: 'btn ghost', style: 'margin-top:10px;color:var(--crit)',
      onclick: async () => {
        const wasBuiltIn = await resetArticle(id);
        toast(wasBuiltIn ? 'Reset to the original' : 'Page removed');
        go(wasBuiltIn ? '#/wiki/' + id : '#/wiki');
      }
    }, cur._new ? '🗑 Delete this page' : '↩︎ Reset to original')
  );
}

/* ---------- import / export bar ---------- */
function toolbar() {
  async function doExport() {
    const json = await exportWiki();
    const ok = await shareOrDownload(`grow-ocean-wiki-${stamp()}.json`, json, 'application/json');
    toast(ok ? 'Wiki exported — share it to the other phone' : 'Could not export');
  }
  async function doImport() {
    const picked = await pickTextFile('.json,application/json');
    if (!picked) return;
    try {
      const { added } = await importWiki(picked.text);
      toast(`Imported ${added} page change${added === 1 ? '' : 's'}`);
      if (_listView) renderList(_listView);
    } catch (e) {
      toast(e.message || 'Import failed');
    }
  }
  return h('div', { class: 'btnrow', style: 'margin:4px 0 14px' }, [
    h('button', { class: 'btn small secondary', onclick: () => go('#/wiki/new') }, '➕ New page'),
    h('button', { class: 'btn small secondary', onclick: doExport }, '⤓ Export'),
    h('button', { class: 'btn small secondary', onclick: doImport }, '⤒ Import')
  ]);
}

/* ---------- list ---------- */
let _listView = null;
async function renderList(view) {
  _listView = view;
  view.innerHTML = '';
  view.append(h('p', { class: 'sub' }, 'Tap a topic. Critical drills are flagged Priority 1. Use search if you’re in a hurry.'));
  view.append(toolbar());

  const search = h('input', { type: 'text', placeholder: '🔍 Search the wiki…', 'aria-label': 'Search wiki' });
  const listWrap = h('div', {});
  view.append(search, listWrap);

  const all = await getAllWiki();
  const cats = [...new Set(all.map((w) => w.category))];

  function draw(filter = '') {
    listWrap.innerHTML = '';
    const f = filter.trim().toLowerCase();
    const matches = all.filter((w) =>
      !f || w.title.toLowerCase().includes(f) || w.summary.toLowerCase().includes(f) || w.category.toLowerCase().includes(f));
    if (!matches.length) { listWrap.append(h('div', { class: 'empty' }, 'No topics match.')); return; }
    cats.forEach((cat) => {
      const items = matches.filter((w) => w.category === cat).sort((a, b) => a.priority - b.priority);
      if (!items.length) return;
      listWrap.append(h('div', { class: 'cat-head' }, cat));
      items.forEach((w) => listWrap.append(
        h('a', { class: 'listrow', href: '#/wiki/' + w.id }, [
          h('span', { class: 'lead' }, w.priority === 1 ? '🛟' : (w.voice ? '🔊' : (w._edited ? '✎' : '📄'))),
          h('span', { class: 'body' }, [
            h('span', { class: 't' }, w.title),
            h('span', { class: 'd' }, w.summary)
          ]),
          h('span', { class: 'chev' }, '›')
        ])));
    });
  }
  search.addEventListener('input', () => draw(search.value));
  draw();
}

/* ---------- entry ---------- */
export async function renderWiki(view, param) {
  if (param === 'new') return renderEditor(view);
  if (param && param.startsWith('edit/')) return renderEditor(view, param.slice(5));
  if (param) return renderArticle(view, param);
  return renderList(view);
}
