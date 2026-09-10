/* home.js — the dashboard. Shift timer, emergency quick-access, live snapshot,
   due reminders, and shortcuts to the six functions. */

import { h, go, toast } from '../app.js';
import { db } from '../db.js';
import { CONTENT } from '../data/content.js';
import { getReminderState } from '../reminders.js';
import { APP_RELEASE, checkForUpdates } from '../updates.js';
import { getShiftPerspective } from '../shift-perspective.js';

let shiftInterval = null;

function fmt(ms) {
  const neg = ms < 0; ms = Math.abs(ms);
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  return (neg ? '+' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export async function renderHome(view) {
  clearInterval(shiftInterval);

  // ----- Shift timer -----
  let durMin = await db.getSetting('shiftMin', 90);
  let start = await db.getSetting('shiftStart', null);
  let activeRower = await db.getSetting('activeRower', 'Rower 1');
  let lastStart = start || 0;
  const perspective = h('p', { id: 'shift-perspective', 'aria-live': 'polite' });
  async function refreshPerspective() {
    try { perspective.textContent = (await getShiftPerspective(db, start)).text; }
    catch { perspective.textContent = 'A moment of perspective will be available when on-device storage is ready.'; }
  }
  await refreshPerspective();
  const perspectiveCard = h('section', { class: 'card', 'aria-label': 'This shift' }, [
    h('h3', {}, '🌌 This shift'), perspective,
    h('p', { class: 'hint' }, ['Only when boat and watch duties allow. ',
      h('a', { href: '#/wiki/stars' }, 'Star guide')])
  ]);

  const timerEl = h('div', { class: 'timer-big' }, '--:--');
  const labelEl = h('div', { class: 'timer-label' }, 'No shift running');

  function tick() {
    if (!start) { timerEl.textContent = fmt(durMin * 60000); labelEl.textContent = `${durMin} min shift · ${activeRower} on oars`; return; }
    const end = start + durMin * 60000;
    const left = end - Date.now();
    timerEl.textContent = fmt(left);
    if (left <= 0) { timerEl.style.color = 'var(--crit)'; labelEl.textContent = `OVERDUE — swap! · ${activeRower}`; }
    else if (left <= 10 * 60000) { timerEl.style.color = 'var(--warn)'; labelEl.textContent = `10-min warning · ${activeRower} on oars`; }
    else { timerEl.style.color = ''; labelEl.textContent = `${activeRower} on oars · changeover at end`; }
  }

  async function save() { await db.setSetting('shiftMin', durMin); await db.setSetting('shiftStart', start); await db.setSetting('activeRower', activeRower); }
  async function startShift() {
    start = Math.max(Date.now(), lastStart + 1);
    lastStart = start;
    await save();
    await refreshPerspective();
    tick();
  }

  const timerCard = h('div', { class: 'card' }, [
    h('h3', {}, '🕒 Shift timer'),
    timerEl, labelEl,
    h('div', { class: 'btnrow', style: 'margin-top:12px' }, [
      h('button', { class: 'btn small secondary', onclick: async () => { durMin = Math.max(5, durMin - 5); await save(); tick(); } }, '−5'),
      h('button', { class: 'btn small secondary', onclick: async () => { durMin += 5; await save(); tick(); } }, '+5 min'),
      h('button', { class: 'btn small', onclick: async () => { await startShift(); toast('Shift started'); } }, '▶ Start'),
    ]),
    h('div', { class: 'btnrow', style: 'margin-top:10px' }, [
      h('button', { class: 'btn small ghost', onclick: async () => { start = null; timerEl.style.color = ''; await save(); tick(); } }, 'Reset'),
      h('button', { class: 'btn small secondary', onclick: async () => {
        activeRower = activeRower === 'Rower 1' ? 'Rower 2' : 'Rower 1';
        await startShift(); toast('Swapped — ' + activeRower + ' on oars'); } }, '🔁 Swap & restart'),
    ]),
    h('div', { class: 'hint' }, 'Adjust durations; a 10-minute warning shows in amber for smooth handovers.')
  ]);
  tick();
  shiftInterval = setInterval(tick, 1000);

  // ----- Emergency quick access -----
  const emergency = h('div', {}, [
    h('div', { class: 'cat-head' }, 'Emergency — one tap'),
    h('div', { class: 'btnrow' }, [
      h('button', { class: 'btn crit', onclick: () => go('#/wiki/mob') }, 'MOB'),
      h('button', { class: 'btn crit', onclick: () => go('#/wiki/vhf') }, 'Mayday'),
      h('button', { class: 'btn crit', onclick: () => go('#/wiki/epirb') }, 'EPIRB'),
    ])
  ]);

  // ----- Due reminders snapshot -----
  const states = await Promise.all(CONTENT.scheduled.map((r) => getReminderState(r.id)));
  const upcoming = states.filter((s) => s.on && s.nextDue)
    .sort((a, b) => a.nextDue - b.nextDue).slice(0, 3);
  const remCard = h('div', { class: 'card' }, [
    h('h3', {}, '⏰ Next reminders'),
    ...(upcoming.length ? upcoming.map((s) => {
      const r = CONTENT.scheduled.find((x) => x.id === s.id);
      const mins = Math.round((s.nextDue - Date.now()) / 60000);
      return h('div', { class: 'metric' }, [
        h('span', {}, r.title),
        h('span', { class: 'v' }, [mins <= 0 ? 'due now' : (mins < 60 ? mins + 'm' : Math.round(mins / 60) + 'h')])
      ]);
    }) : [h('div', { class: 'hint' }, 'No active reminders — turn some on in Reminders.')]),
    h('button', { class: 'btn small secondary', style: 'margin-top:10px', onclick: () => go('#/reminders') }, 'Manage reminders')
  ]);

  // ----- Live snapshot -----
  const live = CONTENT.live;
  const liveCard = h('div', { class: 'card' }, [
    h('h3', {}, ['📡 Live snapshot ', h('span', { class: 'mock' }, 'MOCK')]),
    ...['speed', 'vmg24', 'dist', 'made'].map((id) => {
      const m = live.find((x) => x.id === id);
      return h('div', { class: 'metric' }, [h('span', {}, m.label), h('span', { class: 'v' }, [m.value + ' ', h('small', {}, m.unit)])]);
    }),
    h('button', { class: 'btn small secondary', style: 'margin-top:10px', onclick: () => go('#/entertain/live') }, 'Full race data')
  ]);

  // ----- Function shortcuts -----
  const tiles = [
    ['#/wiki', '📖', 'Quick Wiki', 'Safety & how-to'],
    ['#/reminders', '⏰', 'Reminders', 'Scheduled & event'],
    ['#/checklists', '✓', 'Checklists', 'Grab-bag, meds…'],
    ['#/log', '🎙', 'Log', 'Shift, watch, voice'],
    ['#/entertain', '★', 'Morale', 'Games, prompts, music'],
    ['#/log/journal', '💬', 'Voice journal', 'Message home'],
    ['#/feedback', '📝', 'App feedback', 'Ideas & fixes'],
    ['#/shortcuts', '🗣', 'Siri setup', 'Hey Siri shortcuts'],
  ];
  const grid = h('div', { class: 'grid' }, tiles.map(([href, ico, tt, td]) =>
    h('a', { class: 'tile', href }, [h('span', { class: 'ti' }, ico), h('span', { class: 'tt' }, tt), h('span', { class: 'td' }, td)])));

  const updateStatus = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' },
    'Updates keep saved logs, recordings, crew edits and entertainment progress.');
  const checkUpdate = h('button', { class: 'btn small secondary', onclick: async () => {
    checkUpdate.disabled = true;
    updateStatus.textContent = 'Checking for updates…';
    try { updateStatus.textContent = await checkForUpdates(); }
    finally { checkUpdate.disabled = false; }
  } }, 'Check for updates');

  view.append(
    h('p', { class: 'sub' }, 'Your offline companion for the crossing. Everything here works with no signal.'),
    h('details', { class: 'card' }, [
      h('summary', {}, `App release ${APP_RELEASE} · Updates`), checkUpdate, updateStatus
    ]),
    timerCard, emergency, perspectiveCard,
    h('p', { class: 'callout crit' }, CONTENT.meta.disclaimer),
    h('div', { class: 'cat-head' }, 'Go to'), grid,
    remCard, liveCard
  );
}
