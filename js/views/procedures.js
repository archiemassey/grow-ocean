/* procedures.js (view) — smart emergency navigation over the official docs.
   Three screens share this file:
     #/procedures        → finder (search + triaged list + flow-chart shortcut)
     #/procedures/flow   → Crisis Ops flow chart (quick decision aid + contacts)
     #/procedures/<id>   → one procedure, rower actions first, shore collapsed
   Every word shown is copied verbatim from the official PDFs. Rowers always
   see THEIR actions first; shore-team actions are kept for context, collapsed. */

import { h, go, speak, stopSpeaking, toast } from '../app.js';
import {
  PLAN, FLOW_CHART, emergencyProcedures, otherProcedures,
  getProcedure, boatSections, shoreSections, searchProcedures, pdfPage
} from '../procedures.js';
import { createVoiceSettings } from '../speech.js';

function pageLabel(refs) {
  if (!refs || !refs.length) return '';
  return refs.length > 1 ? 'Pages ' + refs.join(', ') : 'Page ' + refs[0];
}

function sourceNote(file, download, copyright) {
  return h('details', { class: 'card' }, [
    h('summary', {}, 'Source & full PDF'),
    h('a', { class: 'btn small secondary', href: file, target: '_blank', rel: 'noopener' }, '📄 Open full PDF'),
    h('a', { class: 'btn small secondary', style: 'margin-top:8px', href: file, download }, '⤓ Save PDF to device'),
    h('p', { class: 'hint', style: 'margin-top:8px' }, copyright)
  ]);
}

/* ---------- finder ---------- */
function renderFinder(view) {
  view.append(
    h('p', { class: 'sub' }, 'Find the right official procedure fast. Your on-boat actions show first.'),
    h('a', { class: 'btn crit', href: '#/procedures/flow' }, '🧭 Crisis Ops flow chart — start here')
  );

  const search = h('input', {
    type: 'search', placeholder: '🔍 Search — e.g. “person overboard”, “leak”, “no power”',
    'aria-label': 'Search emergency procedures', autocomplete: 'off'
  });
  const results = h('div', {});
  view.append(h('div', { style: 'margin:12px 0 4px' }, search), results);

  function row(proc) {
    const boat = proc.hasBoatActions;
    return h('a', { class: 'listrow', href: '#/procedures/' + proc.id }, [
      h('span', { class: 'lead' }, proc.group === 'emergency' ? '🛟' : '📄'),
      h('span', { class: 'body' }, [
        h('span', { class: 't' }, proc.title),
        h('span', { class: 'd' }, [pageLabel(proc.pageRefs), boat ? ' · your actions first' : ' · shore-led'].join(''))
      ]),
      h('span', { class: 'chev' }, '›')
    ]);
  }

  function draw(query) {
    results.innerHTML = '';
    const q = (query || '').trim();
    if (q) {
      const matches = searchProcedures(q);
      if (!matches.length) {
        results.append(h('div', { class: 'empty' }, 'No procedure matches. Try the flow chart or open the full PDF.'));
        results.append(sourceNote(PLAN.file, 'WTR Atlantic 2026 - Crisis Operations Plan.pdf', PLAN.copyright));
        return;
      }
      results.append(h('div', { class: 'cat-head' }, `Best matches (${matches.length})`));
      matches.forEach(p => results.append(row(p)));
      return;
    }
    results.append(h('div', { class: 'cat-head' }, 'On the boat — emergencies'));
    emergencyProcedures().forEach(p => results.append(row(p)));
    results.append(h('details', { class: 'card' }, [
      h('summary', {}, 'Other situations & definitions'),
      ...otherProcedures().map(row)
    ]));
    results.append(sourceNote(PLAN.file, 'WTR Atlantic 2026 - Crisis Operations Plan.pdf', PLAN.copyright));
  }

  search.addEventListener('input', () => draw(search.value));
  draw('');
}

/* ---------- single procedure ---------- */
function stepList(steps) {
  return h('ol', { class: 'proc-steps' }, steps.map(s => h('li', {}, s)));
}

function renderProcedure(view, id) {
  const proc = getProcedure(id);
  if (!proc) { view.append(h('div', { class: 'empty' }, 'Procedure not found.')); return; }
  const boat = boatSections(proc);
  const shore = shoreSections(proc);
  const voiceSettings = createVoiceSettings(h, stopSpeaking);
  window.addEventListener('hashchange', () => voiceSettings.dispose(), { once: true });

  const aloud = [proc.title, proc.intro, ...boat.flatMap(s => s.steps)].filter(Boolean).join('. ');

  view.append(
    h('div', {}, [
      h('span', { class: 'chip crit' }, 'Crisis Ops · §' + proc.number),
      proc.pageRefs.length ? h('span', { class: 'chip' }, pageLabel(proc.pageRefs)) : ''
    ]),
    h('h2', {}, proc.title),
    proc.intro ? h('p', { class: 'sub' }, proc.intro) : ''
  );

  if (boat.length) {
    view.append(h('div', { class: 'btnrow', style: 'margin-bottom:10px' }, [
      h('button', { class: 'btn small', onclick: () => { speak(aloud); toast('Reading your actions…'); } }, '🔊 Read our actions'),
      h('button', { class: 'btn small ghost', onclick: stopSpeaking }, '⏹ Stop')
    ]));
    boat.forEach(sec => view.append(h('section', { class: 'card proc-boat' }, [
      h('h3', {}, '🛟 What we do on the boat'),
      sec.note ? h('p', { class: 'hint' }, sec.note) : '',
      stepList(sec.steps)
    ])));
  } else {
    view.append(h('section', { class: 'card' }, [
      h('p', {}, 'This section is shore-led — it lists no specific on-boat actions. Open the full PDF page and follow the flow chart.')
    ]));
  }

  if (shore.length) {
    view.append(h('details', { class: 'card' }, [
      h('summary', {}, 'What shore does (for context)'),
      ...shore.flatMap(sec => [
        h('div', { class: 'cat-head' }, sec.heading),
        sec.note ? h('p', { class: 'hint' }, sec.note) : '',
        stepList(sec.steps)
      ])
    ]));
  }

  view.append(
    h('div', { class: 'card' }, [
      voiceSettings.element
    ]),
    proc.pageRefs.length ? h('a', {
      class: 'btn small secondary', href: pdfPage(proc.pageRefs[0]), target: '_blank', rel: 'noopener'
    }, `📄 Open ${pageLabel(proc.pageRefs)} in the full PDF`) : '',
    h('p', { class: 'hint', style: 'margin-top:10px' }, PLAN.copyright),
    h('button', { class: 'btn secondary', style: 'margin-top:10px', onclick: () => go('#/procedures') }, '← All procedures')
  );
}

/* ---------- flow chart ---------- */
function renderFlowChart(view) {
  const fc = FLOW_CHART;
  view.append(
    h('p', { class: 'sub' }, 'Quick decision aid from the official one-page chart. Verify against the full PDF.'),
    h('section', { class: 'card proc-contacts' }, [
      h('h3', {}, '📞 Emergency contacts'),
      ...fc.contacts.map(c => h('a', {
        class: 'listrow', href: 'tel:' + c.value.replace(/[^+\d]/g, '')
      }, [
        h('span', { class: 'lead' }, '☎'),
        h('span', { class: 'body' }, [h('span', { class: 't' }, c.label), h('span', { class: 'd' }, c.value)]),
        h('span', { class: 'chev' }, '›')
      ]))
    ]),
    h('section', { class: 'card proc-boat' }, [
      h('h3', {}, '🚨 Grave & imminent danger?'),
      h('p', { class: 'hint' }, fc.emergency.when),
      stepList(fc.emergency.steps),
      h('div', { class: 'cat-head' }, 'Then, for your situation'),
      h('ul', { class: 'proc-notes' }, fc.emergency.scenarioNotes.map(n => h('li', {}, n)))
    ]),
    h('section', { class: 'card' }, [
      h('h3', {}, '⚠️ Not an emergency?'),
      h('p', { class: 'hint' }, 'Assess the problem, then follow the matching procedure.'),
      ...fc.nonEmergency.map(n => h('a', { class: 'listrow', href: '#/procedures/' + n.procId }, [
        h('span', { class: 'body' }, [
          h('span', { class: 't' }, [n.problem, h('span', { class: 'chip', style: 'margin-left:8px' }, 'pg ' + n.page)]),
          h('span', { class: 'd' }, n.guidance)
        ]),
        h('span', { class: 'chev' }, '›')
      ]))
    ]),
    sourceNote(fc.file, 'Crisis Ops Flow Chart WTR 2026.pdf', fc.copyright),
    h('button', { class: 'btn secondary', style: 'margin-top:10px', onclick: () => go('#/procedures') }, '← All procedures')
  );
}

/* ---------- entry ---------- */
export function renderProcedures(view, param) {
  if (param === 'flow') return renderFlowChart(view);
  if (param) return renderProcedure(view, param);
  return renderFinder(view);
}
