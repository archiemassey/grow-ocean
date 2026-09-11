import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { db } from '../js/db.js';
import { CONTENT } from '../js/data/content.js';
import { RULES_ARTICLES } from '../js/rules.js';
import { ACTION_CONDITIONS } from '../js/safety.js';
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

test('built-in safety upgrades preserve crew edits and keep review records in the repository', async () => {
  await saveArticle('mob', { title: 'Our recovery notes', body: 'Crew-approved training notes', summary: 'Local', category: 'Safety' });
  const article = await getArticle('mob');
  assert.equal(article.title, 'Our recovery notes');
  assert.ok(article.body.includes('Crew-approved training notes'));
  assert.equal(article._edited, true);
  const review = await readFile(new URL('../docs/safety-review.md', import.meta.url), 'utf8');
  assert.match(review, /withdrawn generic sequence/);
  assert.match(review, /ONE rescuer/);
  await resetArticle('mob');
  assert.match((await getArticle('mob')).body, /only rescuer/);
  assert.match((await getArticle('mob')).body, /Use your practised boat-specific recovery method/);
  assert.match((await getArticle('mob')).body, /href="#\/wiki\/vhf"/);
  assert.doesNotMatch((await getArticle('mob')).body, /approval|UNAPPROVED|adviser|withdrawn|not a technical|reference only/i);
  assert.doesNotMatch(CONTENT.wiki.find(a => a.id === 'mob').body, /Keep pointing|Press\.|wake\/alert/);
  for (const id of ['hatch', 'tools']) {
    await saveArticle(id, { title: 'Our equipment plan', body: 'Our saved locations and review notes', summary: 'Local', category: 'Admin' });
    const saved = await getArticle(id);
    assert.equal(saved.title, 'Our equipment plan');
    assert.match(saved.body, /Our saved locations and review notes/);
    await resetArticle(id);
    assert.doesNotMatch((await getArticle(id)).body, /\[location\]|\[contents\]/);
  }
});

test('action-critical facts remain while placeholders and editorial review prose are removed', () => {
  const vhf = CONTENT.wiki.find(a => a.id === 'vhf');
  const beacon = CONTENT.wiki.find(a => a.id === 'epirb');
  assert.match(vhf.body, /hold times vary/);
  assert.match(vhf.body, /Two crew in total/);
  assert.doesNotMatch(vhf.body, /hold 5s|approved communications/);
  assert.match(beacon.body, /differ by model/);
  assert.match(beacon.body, /Not all beacons float/);
  assert.doesNotMatch(beacon.body, /same activate|press &amp; hold/);
  assert.match(ACTION_CONDITIONS.anchor, /both rowers to be capable/);
  assert.match(ACTION_CONDITIONS.liferaft, /One casualty leaves one person/);
  for (const article of CONTENT.wiki)
    assert.doesNotMatch(article.body, /UNAPPROVED|preparation review|aide-memoire only|\[location\]|\[contents\]|Customise this|Fill in real locations/i);
});

test('repository review documentation is not linked, precached or copied into the app', async () => {
  const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  const build = await readFile(new URL('../tools/build-www.mjs', import.meta.url), 'utf8');
  const paths = ['home', 'wiki', 'checklists', 'reminders'];
  for (const path of paths) {
    const source = await readFile(new URL(`../js/views/${path}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /safety-review\.md|Reference \/ preparation notes|SAFETY_NOTICE|PAIR_REVIEW|RULES_NOTICE|meta\.disclaimer/);
  }
  assert.doesNotMatch(worker, /safety-review|['"]\.\/docs/);
  assert.doesNotMatch(build, /['"]docs['"]/);
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
