/* Home keeps perspective first, then the shared shift controls and due reminders. */
import { h, go, toast } from '../app.js';
import { db } from '../db.js';
import { CONTENT } from '../data/content.js';
import { getReminderState } from '../reminders.js';
import { APP_RELEASE, checkForUpdates } from '../updates.js';
import { getShiftPerspective } from '../shift-perspective.js';
import { shiftStore, shiftDisplay } from '../shift-state.js';

export async function renderHome(view, param, signal) {
  const perspective = h('p', { id: 'shift-perspective', 'aria-live': 'polite' }, 'Loading this shift’s perspective…');
  const perspectiveCard = h('section', { class: 'card shift-thought', 'aria-label': 'This shift' }, [
    h('h3', {}, '🌌 This shift'), perspective,
    h('p', { class: 'hint' }, ['When watch duties allow. ', h('a', { href: '#/wiki/stars' }, 'Star guide')])
  ]);
  const timerEl = h('div', { class: 'timer-big' }, '--:--');
  const labelEl = h('div', { class: 'timer-label' }, 'Loading shift…');
  const storageError = h('p', { class: 'callout crit', role: 'status', hidden: true });
  const retry = h('button', { class: 'btn small secondary', hidden: true, onclick: () =>
    shiftStore.refresh().catch(() => {}) }, 'Retry shift storage');
  let busy = false, thoughtKey, thoughtVersion = 0, thoughtPending = Promise.resolve();
  const controls = [];
  function control(label, action, className = 'secondary') {
    const button = h('button', { class: 'btn small ' + className, disabled: true, onclick: async () => {
      if (busy || (action === 'reset' && !window.confirm('Reset this shift timer? Saved logs and the current perspective are kept.'))) return;
      busy = true;
      controls.forEach(button => button.disabled = true);
      try {
        await shiftStore.change(action);
        await thoughtPending;
        if (action === 'start') toast('Shift started');
        if (action === 'swap') toast('Swapped — ' + shiftStore.snapshot().state.activeRower + ' on oars');
      } catch { /* The persistent error below and the shell expose storage failures. */ }
      finally {
        busy = false;
        updateControls(shiftStore.snapshot());
      }
    } }, label);
    controls.push(button);
    return button;
  }
  function updateControls({ state, error }) {
    controls.forEach(button => button.disabled = busy || !state || !!error);
  }
  const timerCard = h('section', { class: 'card shift-controls', 'aria-label': 'Shift timer' }, [
    h('h3', {}, '🕒 Shift timer'), timerEl, labelEl, storageError, retry,
    h('a', { href: '#/log/watch', class: 'btn handover-action' }, 'Record handover'),
    h('div', { class: 'btnrow' }, [
      control('−5', 'shorter'), control('+5 min', 'longer'), control('▶ Start', 'start', '')
    ]),
    h('div', { class: 'btnrow' }, [
      control('🔁 Swap & restart', 'swap'), control('Reset', 'reset', 'ghost')
    ]),
    h('p', { class: 'hint' }, 'Start or swap starts a new shift. Duration edits keep this shift. The on-screen warning is not a reliable background alarm.')
  ]);
  const emergency = h('nav', { id: 'emergencyNav', class: 'card emergency-nav', 'aria-label': 'Emergency procedures' }, [
    h('h3', {}, 'Emergency procedures'),
    h('p', {}, 'Official Crisis Ops steps — opens instructions, not an alert.'),
    h('a', { class: 'emergency-flow', href: '#/procedures/flow' }, '🧭 Crisis flow chart — start here'),
    h('div', {}, [
      h('a', { href: '#/procedures/4' }, 'Person overboard'),
      h('a', { href: '#/procedures/12' }, 'Hull breach'),
      h('a', { href: '#/procedures/5' }, 'Medical')
    ]),
    h('a', { class: 'emergency-all', href: '#/procedures' }, 'All emergency procedures →')
  ]);
  view.append(perspectiveCard, timerCard, emergency);
  const unsubscribe = shiftStore.subscribe(snapshot => {
    if (signal?.aborted) return;
    const { state, error } = snapshot;
    const display = shiftDisplay(state);
    timerEl.textContent = error ? '—' : display.time;
    timerEl.dataset.status = display.status;
    labelEl.textContent = error ? 'Shift unavailable — retry storage below'
      : state ? `${display.label} · ${state.activeRower}${display.status === 'idle' ? ` · ${state.shiftMin} min planned` : ''}` : 'Loading shift…';
    storageError.hidden = retry.hidden = !error;
    storageError.textContent = error ? 'Could not read or save the shift on this device. No new shift change was confirmed. Retry before relying on the timer.' : '';
    updateControls(snapshot);
    if (state && !error && thoughtKey !== state.shiftStart) {
      thoughtKey = state.shiftStart;
      const version = ++thoughtVersion;
      thoughtPending = getShiftPerspective(db, state.shiftStart).then(selected => {
        if (!signal?.aborted && version === thoughtVersion) perspective.textContent = selected.text;
      }).catch(() => {
        if (!signal?.aborted && version === thoughtVersion) {
          perspective.textContent = 'Could not save this shift’s perspective on the device. Retry shift storage to try again.';
          thoughtKey = undefined;
        }
      });
    }
  });
  signal?.addEventListener('abort', unsubscribe, { once: true });
  if (signal?.aborted) { unsubscribe(); return; }
  await shiftStore.refresh().catch(() => {});
  await thoughtPending;
  if (signal?.aborted) return;

  const remBody = h('div', { class: 'hint' }, 'Loading reminders…');
  view.append(h('section', { class: 'card', 'aria-label': 'Next reminders' }, [
    h('h3', {}, '⏰ Next reminders'), remBody,
    h('button', { class: 'btn small secondary', onclick: () => go('#/reminders') }, 'Manage reminders')
  ]));
  try {
    const states = await Promise.all(CONTENT.scheduled.map(r => getReminderState(r.id)));
    if (signal?.aborted) return;
    const upcoming = states.filter(s => s.on && s.nextDue).sort((a, b) => a.nextDue - b.nextDue).slice(0, 3);
    remBody.replaceChildren(...(upcoming.length ? upcoming.map(s => {
      const reminder = CONTENT.scheduled.find(r => r.id === s.id);
      const mins = Math.round((s.nextDue - Date.now()) / 60000);
      return h('div', { class: 'metric' }, [h('span', {}, reminder.title),
        h('span', { class: 'v' }, mins <= 0 ? 'due now' : mins < 60 ? mins + 'm' : Math.round(mins / 60) + 'h')]);
    }) : [h('p', {}, 'No active reminders — turn some on in Reminders.')]));
  } catch { remBody.textContent = 'Could not read saved reminders. Open Reminders to retry.'; }
  if (signal?.aborted) return;
  const updateStatus = h('p', { class: 'hint', role: 'status' },
    'Updates keep saved logs, recordings, crew edits and entertainment progress.');
  const checkUpdate = h('button', { class: 'btn small secondary', onclick: async () => {
    checkUpdate.disabled = true;
    updateStatus.textContent = 'Checking for updates…';
    try { updateStatus.textContent = await checkForUpdates(); }
    finally { checkUpdate.disabled = false; }
  } }, 'Check for updates');
  view.append(h('details', { class: 'card' }, [
    h('summary', {}, 'About & updates'),
    h('p', {}, 'gROW Ocean · Your offline companion for the crossing. Open once online to save the app; live services and external links need a connection.'),
    h('p', { class: 'hint' }, `App release ${APP_RELEASE}`), checkUpdate, updateStatus,
    h('p', {}, [h('a', { href: '#/feedback' }, 'App feedback'), ' · ', h('a', { href: '#/shortcuts' }, 'Siri setup')])
  ]));
}
