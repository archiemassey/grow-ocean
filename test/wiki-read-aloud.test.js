import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { CONTENT } from '../js/data/content.js';
import { RULES_ARTICLES, RULES_DOCUMENT } from '../js/rules.js';
import { ACTION_CONDITIONS } from '../js/safety.js';

const source = await readFile(new URL('../js/views/wiki.js', import.meta.url), 'utf8');
const renderSource = source.slice(source.indexOf('async function renderArticle('),
  source.indexOf('/* ---------- edit / new form'));
const plain = html => html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39|nbsp);/g,
  (_match, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: '\u00a0' }[entity]));

async function reader(article) {
  const nodes = [], spoken = [];
  let stopped = 0;
  const h = (tag, attrs = {}, children = []) => {
    const node = { tag, ...attrs, children, text: typeof children === 'string' ? children : '' };
    nodes.push(node);
    return node;
  };
  const render = runInNewContext(renderSource + '\nrenderArticle;', {
    h, getArticle: async () => article,
    ACTION_CONDITIONS, RULES_DOCUMENT, stripHtml: plain,
    speak: text => spoken.push(text), stopSpeaking: () => stopped++, toast() {}, go() {},
    location: { hash: '#/wiki/' + article.id }, window: new EventTarget(),
    createVoiceSettings: () => ({ element: h('div', {}, 'Voice choices'), dispose() {} }),
    // Sentinels make accidental reintroduction of the old v8 prefixes fail exact-output checks.
    SAFETY_NOTICE: 'GLOBAL_APPROVAL_NOTICE',
    RULES_NOTICE: 'GLOBAL_RULES_REVIEW_NOTICE',
    PAIR_REVIEW: { [article.id]: 'GLOBAL_PAIR_REVIEW_NOTICE' }
  });
  await render({ append() {} }, article.id);
  return { nodes, spoken, stopped: () => stopped };
}

test('every Wiki Read aloud button speaks exactly title, action conditions and body, including Stargazing', async () => {
  assert.ok(CONTENT.wiki.some(article => article.id === 'stars'));
  for (const article of [...CONTENT.wiki, ...RULES_ARTICLES]) {
    const ui = await reader(article);
    assert.deepEqual(ui.spoken, [], article.id + ': rendering must not autoplay');
    ui.nodes.find(node => node.tag === 'button' && node.text === '🔊 Read aloud').onclick();
    const expected = [article.title, ACTION_CONDITIONS[article.id], plain(article.body)]
      .filter(Boolean).join('. ');
    assert.deepEqual(ui.spoken, [expected], article.id + ': exact spoken content');
    assert.doesNotMatch(ui.spoken[0], /GLOBAL_(APPROVAL|RULES_REVIEW|PAIR_REVIEW)_NOTICE/);
    assert.equal(ui.nodes.find(node => node.class === 'article card').html, article.body);
    const renderedText = ui.nodes.map(node => node.text + (node.html ? plain(node.html) : '')).join('\n');
    assert.doesNotMatch(renderedText, /GLOBAL_(APPROVAL|RULES_REVIEW|PAIR_REVIEW)_NOTICE|Reference \/ preparation notes/);
    ui.nodes.find(node => node.text === '⏹ Stop').onclick();
    assert.equal(ui.stopped(), 1);
  }
});

test('saved Stargazing and procedure prose is spoken and displayed unchanged, not keyword-stripped', async () => {
  for (const id of ['stars', 'mob']) {
    const article = {
      ...CONTENT.wiki.find(item => item.id === id), _edited: true,
      title: 'Our saved ' + id,
      body: '<p>Our crew approval notes: review this together.</p><p>Keep this saved sentence &amp; its wording.</p>'
    };
    const ui = await reader(article);
    ui.nodes.find(node => node.text === '🔊 Read aloud').onclick();
    assert.deepEqual(ui.spoken, [
      article.title + '. Our crew approval notes: review this together.Keep this saved sentence & its wording.'
    ]);
    assert.equal(ui.nodes.find(node => node.class === 'article card').html, article.body);
  }
});
