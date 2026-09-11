import { RULES_DOCUMENT } from './data/rules-data.js';

export { RULES_DOCUMENT };

function escapeText(text) {
  return text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export const RULES_ARTICLES = [{
  id: 'official-rules', title: RULES_DOCUMENT.title, category: 'Official race rules',
  priority: 1, voice: true, readOnly: true,
  summary: 'Atlantic 2025 v1.0 · Offline PDF · 11 searchable pages.',
  body: '<p>Open the original PDF or choose a page below. Wiki search includes all 11 pages.</p>',
  ref: RULES_DOCUMENT.file
}, ...RULES_DOCUMENT.pages.map(page => ({
  id: `official-rules-page-${page.page}`,
  title: `Race rules · PDF page ${page.page} — ${page.topic}`,
  category: 'Official race rules', priority: 2, voice: true, readOnly: true,
  summary: `${RULES_DOCUMENT.edition} · PDF page ${page.page} of ${RULES_DOCUMENT.pages.length}.`,
  body: '<p style="white-space:pre-wrap">' + escapeText(page.text) + '</p>',
  ref: RULES_DOCUMENT.file + '#page=' + page.page
}))];
