/* wiki.js — quick-access reference. List + search, and a single-article reader
   with "Read aloud" (text-to-speech) for hands-free use on the oars. */

import { h, go, speak, stopSpeaking, toast } from '../app.js';
import { CONTENT } from '../data/content.js';

function stripHtml(html) {
  const d = document.createElement('div'); d.innerHTML = html; return d.textContent || '';
}

function renderArticle(view, id) {
  const a = CONTENT.wiki.find((w) => w.id === id);
  if (!a) { view.append(h('div', { class: 'empty' }, 'Article not found.')); return; }

  const crit = a.priority === 1;
  view.append(
    h('div', {}, [
      h('span', { class: 'chip ' + (crit ? 'crit' : '') }, a.category),
      crit ? h('span', { class: 'chip p1' }, 'PRIORITY 1') : '',
      a.voice ? h('span', { class: 'chip voice' }, '🔊 voice') : ''
    ]),
    h('h2', {}, a.title),
    h('p', { class: 'sub' }, a.summary),
    h('div', { class: 'btnrow', style: 'margin-bottom:8px' }, [
      h('button', { class: 'btn small', onclick: () => { speak(a.title + '. ' + stripHtml(a.body)); toast('Reading aloud…'); } }, '🔊 Read aloud'),
      h('button', { class: 'btn small ghost', onclick: stopSpeaking }, '⏹ Stop'),
    ]),
    h('div', { class: 'article card', html: a.body }),
    h('p', { class: 'ref' }, ['Reference: ', h('a', { href: a.ref, target: '_blank', rel: 'noopener' }, a.ref)]),
    h('button', { class: 'btn secondary', style: 'margin-top:10px', onclick: () => go('#/wiki') }, '← All topics')
  );
}

function renderList(view) {
  view.append(h('p', { class: 'sub' }, 'Tap a topic. Critical drills are flagged Priority 1. Use search if you’re in a hurry.'));

  const search = h('input', { type: 'text', placeholder: '🔍 Search the wiki…', 'aria-label': 'Search wiki' });
  const listWrap = h('div', {});
  view.append(search, listWrap);

  const cats = [...new Set(CONTENT.wiki.map((w) => w.category))];

  function draw(filter = '') {
    listWrap.innerHTML = '';
    const f = filter.trim().toLowerCase();
    const matches = CONTENT.wiki.filter((w) =>
      !f || w.title.toLowerCase().includes(f) || w.summary.toLowerCase().includes(f) || w.category.toLowerCase().includes(f));
    if (!matches.length) { listWrap.append(h('div', { class: 'empty' }, 'No topics match.')); return; }
    cats.forEach((cat) => {
      const items = matches.filter((w) => w.category === cat).sort((a, b) => a.priority - b.priority);
      if (!items.length) return;
      listWrap.append(h('div', { class: 'cat-head' }, cat));
      items.forEach((w) => listWrap.append(
        h('a', { class: 'listrow', href: '#/wiki/' + w.id }, [
          h('span', { class: 'lead' }, w.priority === 1 ? '🛟' : (w.voice ? '🔊' : '📄')),
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

export async function renderWiki(view, param) {
  if (param) renderArticle(view, param);
  else renderList(view);
}
