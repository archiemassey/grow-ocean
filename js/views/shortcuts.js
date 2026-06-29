/* shortcuts.js — "Siri setup" helper.
   Plain English: iOS won't let Siri run things *inside* a web app, but Siri (via
   the Shortcuts app) CAN open a web link — and our links jump straight to the
   right page. This screen lists the handy phrases, gives a one-tap Copy of each
   link, and shows the ~20-second steps to add the spoken phrase. Works offline. */

import { h, go, toast } from '../app.js';

// The live home of the app. Used to build absolute links to copy into Shortcuts.
const ORIGIN = (location.origin + location.pathname).replace(/index\.html$/, '').replace(/#.*$/, '');

const ACTIONS = [
  { phrase: 'Man Overboard', route: '#/wiki/mob', icon: '🛟', crit: true },
  { phrase: 'Mayday', route: '#/wiki/vhf', icon: '📻', crit: true },
  { phrase: 'EPIRB', route: '#/wiki/epirb', icon: '🆘', crit: true },
  { phrase: 'Deploy anchor', route: '#/wiki/anchor', icon: '⚓', crit: true },
  { phrase: 'Log a shift', route: '#/log', icon: '🚣', crit: false },
  { phrase: 'Voice journal', route: '#/log/journal', icon: '🎙', crit: false },
  { phrase: 'Reminders', route: '#/reminders', icon: '⏰', crit: false },
  { phrase: 'Checklists', route: '#/checklists', icon: '✓', crit: false }
];

async function copy(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch (_) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (_) { return false; }
}

export async function renderShortcuts(view) {
  view.append(
    h('p', { class: 'sub' }, 'Say “Hey Siri, …” to jump straight to a page — handy hands-free in an emergency.'),
    h('div', { class: 'card' }, [
      h('h3', {}, '📲 One-time setup (per phrase, ~20s)'),
      h('ol', { style: 'padding-left:20px;margin:6px 0' }, [
        h('li', {}, ['Tap ', h('strong', {}, 'Copy link'), ' on an action below.']),
        h('li', {}, ['Open the iPhone ', h('strong', {}, 'Shortcuts'), ' app → ', h('strong', {}, '+'), ' (new shortcut).']),
        h('li', {}, ['Add action ', h('strong', {}, '“Open URLs”'), ' → paste the link.']),
        h('li', {}, ['Tap the shortcut’s name → ', h('strong', {}, 'Rename'), ' it to the phrase (e.g. “Man Overboard”).']),
        h('li', {}, ['Done — say ', h('strong', {}, '“Hey Siri, Man Overboard”'), '. Siri opens the page.'])
      ]),
      h('p', { class: 'hint' }, 'On a modern iPhone this works offline (on-device Siri). The page opens in Safari but is cached, so it still loads with no signal.')
    ])
  );

  view.append(h('div', { class: 'cat-head' }, 'Suggested phrases'));
  ACTIONS.forEach((a) => {
    const url = ORIGIN + a.route;
    view.append(h('div', { class: 'card', style: a.crit ? 'border-color:var(--crit)' : '' }, [
      h('div', { class: 'listrow', style: 'box-shadow:none;border:0;margin:0;padding:0' }, [
        h('span', { class: 'lead' }, a.icon),
        h('span', { class: 'body' }, [
          h('span', { class: 't' }, '“Hey Siri, ' + a.phrase + '”'),
          h('span', { class: 'd', style: 'word-break:break-all' }, url)
        ])
      ]),
      h('div', { class: 'btnrow', style: 'margin-top:10px' }, [
        h('button', { class: 'btn small', onclick: async () => { toast(await copy(url) ? 'Link copied' : 'Copy failed — long-press the link to copy'); } }, '📋 Copy link'),
        h('button', { class: 'btn small secondary', onclick: () => go(a.route) }, 'Preview page')
      ])
    ]));
  });

  view.append(
    h('p', { class: 'hint', style: 'margin-top:8px' }, 'Tip: you can also long-press the app icon on the Home Screen for quick actions (where supported).'),
    h('button', { class: 'btn secondary', style: 'margin-top:8px', onclick: () => go('#/home') }, '← Home')
  );
}
