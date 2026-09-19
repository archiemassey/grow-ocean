import { h } from '../app.js';
import { THEME_ORDER, THEME_META, currentTheme, applyTheme, currentDim, setDim } from '../theme.js';

function screenCard() {
  const card = h('section', { class: 'screen-card', 'aria-label': 'Screen and visibility' }, [
    h('h2', { class: 'cat-head' }, 'Screen & visibility'),
    h('p', { class: 'screen-hint' },
      'Pick the mode that reads best right now. Night vision uses red on black to protect your eyes on watch.')
  ]);
  const modes = h('div', { class: 'seg', role: 'group', 'aria-label': 'Screen mode' });
  const buttons = THEME_ORDER.map(mode => {
    const btn = h('button', {
      type: 'button', class: 'seg-btn', 'data-mode': mode,
      onclick: () => { applyTheme(mode); paint(); }
    }, THEME_META[mode].icon + ' ' + THEME_META[mode].label);
    modes.append(btn);
    return btn;
  });
  function paint() {
    const active = currentTheme();
    buttons.forEach(btn => {
      const on = btn.getAttribute('data-mode') === active;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  const dim = h('input', {
    type: 'range', min: '0', max: '0.8', step: '0.05', class: 'dim-range',
    'aria-label': 'Extra dimming', value: String(currentDim()),
    oninput: e => setDim(e.target.value)
  });
  card.append(modes, h('label', { class: 'dim-row' }, [
    h('span', {}, 'Extra dimming'), dim
  ]));
  window.addEventListener('themechange', paint);
  paint();
  return card;
}

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
      ['#/stars', 'Star guide', 'The live night sky over the boat — a little perspective on watch']
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
    ]),
    screenCard()
  );
}
