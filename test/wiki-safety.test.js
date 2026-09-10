import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../js/db.js';
import { CONTENT } from '../js/data/content.js';
import { RULES_ARTICLES } from '../js/rules.js';
import { SAFETY_NOTICE, PAIR_REVIEW } from '../js/safety.js';
import { getArticle, getEditable, saveArticle, importWiki, resetArticle } from '../js/wikiStore.js';

// Only entity decoding is needed by the store's plain-text editor conversion.
globalThis.document = { createElement: () => ({
  innerHTML: '',
  get value() { return this.innerHTML.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
}) };
const records = new Map();
db.all = async () => [...records.values()];
db.get = async (_store, id) => records.get(id);
db.put = async (_store, record) => records.set(record.id, record);
db.delete = async (_store, id) => records.delete(id);

test('built-in safety upgrades preserve crew local edits and add separate immutable review context', async () => {
  await saveArticle('mob', { title: 'Our recovery notes', body: 'Crew-approved training notes', summary: 'Local', category: 'Safety' });
  const article = await getArticle('mob');
  assert.equal(article.title, 'Our recovery notes');
  assert.ok(article.body.includes('Crew-approved training notes'));
  assert.equal(article._edited, true);
  assert.match(PAIR_REVIEW.mob, /withdrawn generic sequence/);
  assert.match(SAFETY_NOTICE, /ONE rescuer/);
  await resetArticle('mob');
  assert.match((await getArticle('mob')).body, /no third rower/);
  assert.doesNotMatch(CONTENT.wiki.find(a => a.id === 'mob').body, /Keep pointing|Press\.|wake\/alert/);
});

test('official reference and every extracted page are immutable even with a legacy override', async () => {
  for (const article of RULES_ARTICLES) {
    records.set(article.id, { id: article.id, deleted: true, body: 'Fake rules', plain: true });
    const actual = await getArticle(article.id);
    assert.equal(actual.readOnly, true);
    assert.equal(actual.body, article.body);
    assert.equal(await getEditable(article.id), null);
    await assert.rejects(saveArticle(article.id, { body: 'Changed' }), /read-only/);
    await assert.rejects(resetArticle(article.id), /read-only/);
    records.delete(article.id);
  }
});

test('wiki imports validate all records before writing and cannot replace official rules', async () => {
  const wrap = overrides => JSON.stringify({ type: 'grow-ocean-wiki', version: 1, overrides });
  await assert.rejects(importWiki(wrap([{ id: 'valid-note', body: 'Fine', isNew: true }, { id: 'official-rules', body: 'Fake' }])));
  assert.equal(records.has('valid-note'), false);
  await assert.rejects(importWiki(wrap([{ id: 'bad', body: {} }])));
  await importWiki(wrap([{ id: 'test-note', title: 'Test', body: '<img src=x onerror=alert(1)>', plain: true, isNew: true, ref: 'javascript:alert(1)' }]));
  const article = await getArticle('test-note');
  assert.ok(article.body.includes('&lt;img'));
  assert.equal(article.ref, '');
  records.clear();
});
