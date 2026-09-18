import { h } from '../app.js';

export function renderBoat(view) {
  const group = (title, links) => h('section', { 'aria-label': title }, [
    h('h2', { class: 'cat-head' }, title),
    ...links.map(([href, title, description]) => h('a', { class: 'listrow', href }, [
      h('span', { class: 'body' }, [
        h('span', { class: 't' }, title), h('span', { class: 'd' }, description)
      ]), h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')
    ]))
  ]);
  view.append(
    group('Knowledge & references', [
      ['#/wiki', 'Quick Wiki', 'Search safety, equipment and how-to guides'],
      ['#/procedures', 'Emergency procedures', 'Official Crisis Ops · offline · rower actions first'],
      ['#/wiki/official-rules', 'Official race rules', 'Atlantic 2025 v1.0 · offline reference'],
      ['#/wiki/stars', 'Star guide', 'A little perspective when watch duties allow']
    ]),
    group('Boat routines', [
      ['#/checklists', 'Checklists', 'Grab-bag, safety, medical and maintenance'],
      ['#/reminders', 'Reminders', 'Manage scheduled and event reminders']
    ]),
    group('Practical links', [
      ['#/log/journal', 'Voice journal', 'Record a message home'],
      ['#/shortcuts', 'Siri setup', 'Set up spoken shortcuts before departure'],
      ['#/feedback', 'App feedback', 'Save ideas and issues on this device'],
      ['#/entertain/live', 'Prototype race data · MOCK', 'Example values only — not live instruments']
    ])
  );
}
