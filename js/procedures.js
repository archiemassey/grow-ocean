/* procedures.js — smart lookup over the official Crisis Operations documents.
   The data is generated verbatim from the crew-provided PDFs (see
   js/data/procedures-data.js). This module only ranks and filters it; it never
   rewords a step. Rower ("boat") actions are always surfaced ahead of shore
   actions so the crew see THEIR actions first in an emergency. */

import { PROCEDURES_DOCUMENT } from './data/procedures-data.js';

export { PROCEDURES_DOCUMENT };

export const PLAN = PROCEDURES_DOCUMENT.plan;
export const FLOW_CHART = PROCEDURES_DOCUMENT.flowChart;

export function allProcedures() {
  return PLAN.procedures;
}
export function emergencyProcedures() {
  return PLAN.procedures.filter(p => p.group === 'emergency');
}
export function otherProcedures() {
  return PLAN.procedures.filter(p => p.group !== 'emergency');
}
export function getProcedure(id) {
  return PLAN.procedures.find(p => p.id === String(id)) || null;
}
export function boatSections(proc) {
  return proc.sections.filter(s => s.actor === 'boat');
}
export function shoreSections(proc) {
  return proc.sections.filter(s => s.actor !== 'boat');
}
export function pdfPage(page) {
  return PLAN.file + '#page=' + page;
}

function sectionText(proc) {
  return proc.sections.map(s => s.heading + ' ' + s.note + ' ' + s.steps.join(' ')).join(' ');
}

/* Rank matches so panic words ("person overboard") beat body-text hits.
   Score: synonym/title hit = 3, intro = 2, any step text = 1. Emergency
   procedures win ties so the most urgent stay on top. */
export function searchProcedures(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    return [...PLAN.procedures].sort((a, b) => a.priority - b.priority);
  }
  const scored = [];
  for (const proc of PLAN.procedures) {
    let score = 0;
    if (proc.title.toLowerCase().includes(q)) score += 3;
    if (proc.synonyms.some(s => s.includes(q) || q.includes(s))) score += 3;
    if (proc.intro.toLowerCase().includes(q)) score += 2;
    if (sectionText(proc).toLowerCase().includes(q)) score += 1;
    if (score > 0) scored.push({ proc, score });
  }
  scored.sort((a, b) =>
    b.score - a.score ||
    (a.proc.group === 'emergency' ? 0 : 1) - (b.proc.group === 'emergency' ? 0 : 1) ||
    a.proc.priority - b.proc.priority);
  return scored.map(s => s.proc);
}
