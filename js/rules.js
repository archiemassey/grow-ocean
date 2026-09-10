import { RULES_DOCUMENT } from './data/rules-data.js';

export { RULES_DOCUMENT };
export const RULES_NOTICE = 'Official crew-provided race reference: Atlantic 2025 v1.0. The crew must confirm this is the correct edition for their crossing; it is not verified as current. The unchanged PDF is authoritative. Searchable text is extracted for convenience and may lose formatting. This document is not a substitute for approved boat-specific training.';

function escapeText(text) {
  return text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export const RULES_ARTICLES = [{
  id: 'official-rules', title: RULES_DOCUMENT.title, category: 'Official race rules',
  priority: 1, voice: true, readOnly: true,
  summary: 'Unchanged offline PDF · 11 searchable pages · confirm edition before crossing.',
  body: '<p>Open the unchanged PDF or use the page links below. Full-text wiki search includes all 11 PDF pages. Add crew annotations as separate notes; the official reference cannot be edited here.</p><p>The appendices referenced by these rules (including mandatory equipment and medical-kit lists) are not bundled separately. Obtain the applicable supporting documents from the race organiser; the prototype checklists do not replace them.</p>',
  ref: RULES_DOCUMENT.file
}, ...RULES_DOCUMENT.pages.map(page => ({
  id: `official-rules-page-${page.page}`,
  title: `Race rules · PDF page ${page.page} — ${page.topic}`,
  category: 'Official race rules', priority: 2, voice: true, readOnly: true,
  summary: `${RULES_DOCUMENT.edition} · exact PDF page ${page.page} of ${RULES_DOCUMENT.pages.length}. Extracted text; check the PDF.`,
  body: '<p style="white-space:pre-wrap">' + escapeText(page.text) + '</p>',
  ref: RULES_DOCUMENT.file + '#page=' + page.page
}))];
