/* wikiStore.js — the editable layer over the built-in wiki.
   Plain English: the app ships with a set of wiki pages (in data/content.js).
   The rowers can EDIT those pages, RESET them back to the original, or ADD their
   own new pages. Their changes are saved ON THE DEVICE (IndexedDB 'wiki' store),
   so they survive offline and app restarts. Nothing here needs the internet.

   They can also EXPORT all their changes to a single file and IMPORT it on the
   other rower's phone, so both phones stay in sync — and a reinstall won't lose
   their edits. */

import { db, uid } from './db.js';
import { CONTENT } from './data/content.js';

const STORE = 'wiki';
export const WIKI_EXPORT_TYPE = 'grow-ocean-wiki';
export const WIKI_EXPORT_VERSION = 1;

/* ---------- text helpers (HTML <-> plain) ---------- */

// Turn the built-in HTML body into readable plain text for the editor.
export function htmlToPlain(html) {
  if (!html) return '';
  let t = html
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<\s*\/\s*(p|div|ol|ul|h[1-6])\s*>/gi, '\n\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');                  // strip remaining tags
  const d = document.createElement('textarea');
  d.innerHTML = t;                              // decode entities (&amp; etc.)
  t = d.value;
  return t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Turn the rowers' plain-text edits back into safe display HTML.
// Blank line = new paragraph. Lines starting "- " or "* " become a bullet list.
export function plainToHtml(text) {
  const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/);
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    const bullets = lines.filter((l) => l.trim()).every((l) => /^\s*[-*]\s+/.test(l));
    if (bullets && lines.some((l) => l.trim())) {
      const items = lines.filter((l) => l.trim())
        .map((l) => '<li>' + escapeHtml(l.replace(/^\s*[-*]\s+/, '')) + '</li>').join('');
      out.push('<ul>' + items + '</ul>');
    } else {
      const html = lines.map((l) => escapeHtml(l)).join('<br>');
      if (html.trim()) out.push('<p>' + html + '</p>');
    }
  }
  return out.join('\n') || '<p></p>';
}

/* ---------- merge built-in pages with on-device edits ---------- */

function merge(base, ov) {
  if (!ov) return { ...base, _edited: false, _new: false, _plain: false, _rawBody: htmlToPlain(base.body) };
  return {
    ...base,
    title: ov.title ?? base.title,
    summary: ov.summary ?? base.summary,
    body: ov.plain ? plainToHtml(ov.body) : (ov.body ?? base.body),
    category: ov.category ?? base.category,
    _edited: true, _new: false, _plain: !!ov.plain,
    _rawBody: ov.plain ? ov.body : htmlToPlain(ov.body ?? base.body)
  };
}

function fromNew(ov) {
  return {
    id: ov.id, title: ov.title || 'Untitled', summary: ov.summary || '',
    body: plainToHtml(ov.body), category: ov.category || 'Notes',
    priority: ov.priority || 3, voice: !!ov.voice, ref: ov.ref || '',
    _edited: true, _new: true, _plain: true, _rawBody: ov.body || ''
  };
}

export async function getAllWiki() {
  const overrides = await db.all(STORE);
  const map = new Map(overrides.map((o) => [o.id, o]));
  const result = [];
  for (const base of CONTENT.wiki) {
    const o = map.get(base.id);
    map.delete(base.id);
    if (o && o.deleted) continue;            // built-in hidden by the rowers
    result.push(merge(base, o));
  }
  for (const o of map.values()) {            // remaining = brand-new pages
    if (o && o.isNew && !o.deleted) result.push(fromNew(o));
  }
  return result;
}

export async function getArticle(id) {
  return (await getAllWiki()).find((a) => a.id === id) || null;
}

// Returns the plain-text body suitable for the editor textarea.
export async function getEditable(id) {
  const a = await getArticle(id);
  if (!a) return null;
  return { id: a.id, title: a.title, summary: a.summary, body: a._rawBody,
           category: a.category, _new: a._new };
}

/* ---------- writes ---------- */

export async function saveArticle(id, fields) {
  const isBuiltIn = CONTENT.wiki.some((w) => w.id === id);
  const existing = await db.get(STORE, id);
  const rec = {
    id,
    title: fields.title,
    summary: fields.summary,
    body: fields.body,          // stored as PLAIN text
    category: fields.category || (existing && existing.category),
    plain: true,
    isNew: existing ? !!existing.isNew : !isBuiltIn,
    updated: Date.now()
  };
  await db.put(STORE, rec);
  return rec;
}

export async function addArticle(fields) {
  const id = 'u-' + uid();
  await db.put(STORE, {
    id, title: fields.title, summary: fields.summary, body: fields.body,
    category: fields.category || 'Notes', priority: 3, voice: false,
    plain: true, isNew: true, updated: Date.now()
  });
  return id;
}

// Built-in page → revert to original. New page → remove it.
export async function resetArticle(id) {
  const isBuiltIn = CONTENT.wiki.some((w) => w.id === id);
  if (isBuiltIn) await db.delete(STORE, id);
  else await db.delete(STORE, id);
  return isBuiltIn;
}

export async function hasOverride(id) {
  return !!(await db.get(STORE, id));
}

/* ---------- export / import (share between phones) ---------- */

export async function exportWiki() {
  const overrides = await db.all(STORE);
  return JSON.stringify({
    type: WIKI_EXPORT_TYPE,
    version: WIKI_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    count: overrides.length,
    overrides
  }, null, 2);
}

// Returns { added } count or throws a friendly Error.
export async function importWiki(text) {
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('That file isn’t readable. Make sure it’s a gROW Ocean wiki file.'); }
  if (!data || data.type !== WIKI_EXPORT_TYPE || !Array.isArray(data.overrides))
    throw new Error('That doesn’t look like a gROW Ocean wiki file.');
  let added = 0;
  for (const o of data.overrides) {
    if (!o || !o.id) continue;
    await db.put(STORE, o);
    added++;
  }
  return { added };
}
