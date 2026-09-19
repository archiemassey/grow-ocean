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

/* Official emergency contacts, transcribed verbatim from the Crisis Operations
   Plan §3 and the one-page flow chart. We inline these numbers wherever a step
   tells the crew to contact someone, so a rower never has to leave the
   procedure to look a number up — and each number is a tap-to-dial tel: link.
   Numbers are never invented — only these official ones are ever added, and
   only when the step doesn't already print the number itself.
   `present` lists every spelling of the number that may already appear in the
   verbatim text (so we never duplicate); `numbers` carries the label prefix,
   the human display and the dial string. */
export const CONTACTS = [
  {
    match: /\bNMOC\b/,
    present: ['+44 1329 244681', '+44 (0) 1329 244 681', '+441329244681'],
    numbers: [{ pre: 'call ', display: '+44 1329 244681', tel: '+441329244681' }]
  },
  {
    match: /Safety Officer|Duty Officer|\bDO\b/,
    present: ['+1 470-972-3338', '+1 470-972-3389'],
    numbers: [
      { pre: 'call ', display: '+1 470-972-3338', tel: '+14709723338' },
      { pre: '; out-of-hours emergencies only ', display: '+1 470-972-3389', tel: '+14709723389' }
    ]
  }
];

/* Where, and with which contact, a plain-language number should be inlined into
   a verbatim step. Returns ordered insertion points; the caller decides whether
   to render them as text (TTS) or tap-to-dial links (screen). */
export function contactInsertions(text) {
  if (!text) return [];
  const points = [];
  for (const c of CONTACTS) {
    if (c.present.some(n => text.includes(n))) continue;
    const m = c.match.exec(text);
    if (!m) continue;
    points.push({ at: m.index + m[0].length, contact: c });
  }
  return points.sort((a, b) => a.at - b.at);
}

/* Plain-text enrichment (used for read-aloud): numbers spoken inline. */
export function withContacts(text) {
  const points = contactInsertions(text);
  if (!points.length) return text;
  let out = '', pos = 0;
  for (const { at, contact } of points) {
    out += text.slice(pos, at) + ' (' + contact.numbers.map(n => n.pre + n.display).join('') + ')';
    pos = at;
  }
  return out + text.slice(pos);
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
