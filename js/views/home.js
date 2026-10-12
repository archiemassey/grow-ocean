/* Home — Deep Horizon hero (dial + wave + inspiration) over a calm layout, with the
   shift controls tucked into a rising sheet behind the ⚙️ cog. Perspective stays
   first-class, Emergency + reminders always visible. */
import { h, go, toast, shareOrDownload } from '../app.js';
import { db } from '../db.js';
import { CONTENT } from '../data/content.js';
import { getReminderState } from '../reminders.js';
import { APP_RELEASE, checkForUpdates } from '../updates.js';
import { getShiftPerspective } from '../shift-perspective.js';
import { shiftStore, shiftDisplay } from '../shift-state.js';
import { buildWakeupICS } from '../shift-ics.js';

/* −5 pulls the handover EARLIER, so a resting partner's Calendar alarm (set when the
   old schedule was shared) will not move itself earlier — she could be woken late.
   +5 is safe (she only wakes slightly early), so only −5 needs this warning. */
const SHORTEN_WARNING = 'Shorten this shift by 5 min? The handover comes forward 5 minutes. ' +
  'If your partner is resting, her wake-up alarm will NOT move earlier on its own — ' +
  're-share the wake-up alarms, or wake her, so she is not caught out.';

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const clock = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const otherRower = r => (r === 'Rower 1' ? 'Rower 2' : 'Rower 1');

export async function renderHome(view, param, signal) {
  // ---- Hero (gradient + conic dial + wave + inspiration) ----
  const kick = h('div', { class: 'hero-kick' }, 'Loading shift…');
  const ringTime = h('b', {}, '--:--');
  const ringSub = h('span', {}, 'to handover');
  const ring = h('div', { class: 'hero-ring', role: 'img', 'aria-label': 'Shift progress' },
    [h('div', { class: 'hero-ring-t' }, [ringTime, ringSub])]);
  const handoverLine = h('div', { class: 'hero-handover' }, '');
  const cog = h('button', { class: 'hero-cog', type: 'button', 'aria-label': 'Shift controls & settings',
    'aria-haspopup': 'dialog', onclick: openSheet }, '⚙️');
  const waveWrap = h('div', { class: 'hero-wave-wrap', 'aria-hidden': 'true' });
  waveWrap.innerHTML = '<svg class="hero-wave" viewBox="0 0 320 26" preserveAspectRatio="none">' +
    '<path d="M0 14 Q 54 0 107 14 T 214 14 T 322 14 V26 H0 Z"/></svg>';
  const hero = h('section', { class: 'hero', 'aria-label': 'Shift timer' },
    [cog, kick, ring, handoverLine, waveWrap]);

  const storageError = h('p', { class: 'callout crit', role: 'status', hidden: true });
  const retry = h('button', { class: 'btn small secondary', hidden: true, onclick: () =>
    shiftStore.refresh().catch(() => {}) }, 'Retry shift storage');

  // ---- Inspiration + primary action ----
  const perspective = h('p', { id: 'shift-perspective', 'aria-live': 'polite' }, 'Loading this shift’s perspective…');
  const inspiration = h('section', { class: 'card inspiration', 'aria-label': 'This shift' }, [
    perspective, h('a', { href: '#/stars', class: 'star-link' }, '✦ Star guide →')
  ]);
  const primary = h('a', { href: '#/log/watch', class: 'btn handover-action primary-home' }, '⬤ Record handover');

  // ---- Shift controls (live in the rising sheet) ----
  let busy = false, thoughtKey, thoughtVersion = 0, thoughtPending = Promise.resolve();
  const controls = [];
  function control(label, action, className = 'secondary') {
    const button = h('button', { class: 'btn small ' + className, disabled: true, onclick: async () => {
      if (busy) return;
      if (action === 'reset' && !window.confirm('Reset this shift timer? Saved logs and the current perspective are kept.')) return;
      const snapshot = shiftStore.snapshot();
      const running = !!snapshot.state && (snapshot.state.shiftStart || snapshot.state.scheduleOn);
      if (action === 'shorter' && running && !window.confirm(SHORTEN_WARNING)) return;
      busy = true;
      controls.forEach(b => b.disabled = true);
      try {
        await shiftStore.change(action);
        await thoughtPending;
        if (action === 'start') toast('Shift started');
        if (action === 'swap') toast('Swapped — ' + shiftStore.snapshot().state.activeRower + ' on oars');
      } catch { /* The persistent error below and the shell expose storage failures. */ }
      finally { busy = false; updateControls(shiftStore.snapshot()); }
    } }, label);
    controls.push(button);
    return button;
  }
  function updateControls({ state, error }) {
    controls.forEach(button => button.disabled = busy || !state || !!error);
  }
  const wakeupsBtn = h('button', { class: 'btn small secondary sheet-wakeup', onclick: async () => {
    const { state, error } = shiftStore.snapshot();
    if (error || !state) { toast('Shift storage unavailable — retry first.'); return; }
    const ics = buildWakeupICS(state, { count: 8, leadMin: 10 });
    const shared = await shareOrDownload('grow-ocean-wake-ups.ics', ics, 'text/calendar');
    if (shared) toast('Wake-up alarms ready — open the file to add them to Calendar.');
  } }, '⏰ Wake-up alarms (.ics)');

  const backdrop = h('div', { class: 'sheet-backdrop', hidden: true, onclick: closeSheet });
  const doneBtn = h('button', { class: 'btn small sheet-done', type: 'button', onclick: closeSheet }, 'Done');
  const sheet = h('div', { class: 'shift-sheet', role: 'dialog', 'aria-modal': 'true',
    'aria-label': 'Shift controls & settings', tabindex: '-1', hidden: true }, [
    h('div', { class: 'sheet-grab', 'aria-hidden': 'true' }),
    h('h3', {}, 'Shift controls'),
    h('p', { class: 'hint' }, 'Both of you, together — nothing is sent to the other phone on its own.'),
    storageError, retry,
    h('p', { class: 'sheet-lbl' }, 'Adjust this shift · one-time nudge'),
    h('div', { class: 'btnrow' }, [control('−5', 'shorter'), control('+5 min', 'longer')]),
    h('p', { class: 'sheet-lbl' }, 'Shift'),
    h('div', { class: 'btnrow' }, [
      control('▶ Start', 'start', ''), control('🔁 Swap', 'swap'), control('Reset', 'reset', 'ghost')
    ]),
    h('p', { class: 'sheet-lbl' }, 'Set up'),
    h('a', { href: '#/schedule', class: 'sheet-link', onclick: closeSheet },
      [h('span', {}, '🗓️ Day / night schedule & QR sync'), h('span', { class: 'r' }, '›')]),
    wakeupsBtn,
    h('p', { class: 'hint' }, '−5 shortens just this shift on this phone — your partner’s wake-up ' +
      'alarm won’t move on its own. Wake-up alarms add iPhone Calendar alerts 10 min before each ' +
      'handover; re-download after changing the shift length.'),
    doneBtn
  ]);

  let sheetOpen = false, lastFocus = null;
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    const f = [...sheet.querySelectorAll('button:not([disabled]),a[href]')];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openSheet() {
    if (sheetOpen) return;
    sheetOpen = true; lastFocus = document.activeElement;
    backdrop.hidden = sheet.hidden = false;
    requestAnimationFrame(() => { backdrop.dataset.open = sheet.dataset.open = '1'; });
    document.addEventListener('keydown', onKey, true);
    (sheet.querySelector('button:not([disabled]),a[href]') || sheet).focus();
  }
  // Closed state (and off-screen slide) is driven entirely by CSS off the data-open
  // flag — no view-owned timer. visibility flips to hidden only after the transition.
  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    backdrop.dataset.open = sheet.dataset.open = '';
    document.removeEventListener('keydown', onKey, true);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---- Emergency (always visible) ----
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

  view.append(hero, inspiration, primary, emergency, backdrop, sheet);

  const unsubscribe = shiftStore.subscribe(snapshot => {
    if (signal?.aborted) return;
    const { state, error } = snapshot;
    const display = shiftDisplay(state);
    ring.dataset.status = error ? 'unavailable' : display.status;
    ring.style.setProperty?.('--frac', error ? '0' : String(display.frac || 0));
    ringTime.textContent = error ? '—' : display.time;
    ringSub.textContent = error ? 'storage error'
      : display.status === 'idle' ? 'ready' : display.status === 'overdue' ? 'overdue' : 'to handover';
    if (error) { kick.textContent = 'Shift unavailable'; handoverLine.textContent = ''; }
    else if (!state) { kick.textContent = 'Loading shift…'; handoverLine.textContent = ''; }
    else {
      const phase = display.phase ? cap(display.phase) + ' · ' : '';
      kick.textContent = display.status === 'idle' ? phase + 'No shift running' : phase + display.rower + ' on oars';
      handoverLine.textContent = display.status === 'idle'
        ? 'Press ▶ Start to begin · ' + state.shiftMin + ' min shifts'
        : display.status === 'overdue' ? 'Handover due now → ' + otherRower(display.rower)
        : 'Handover ' + (display.endsAt ? clock(display.endsAt) : '—') + ' → ' + otherRower(display.rower);
    }
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
  function cleanup() { unsubscribe(); if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey, true); }
  signal?.addEventListener('abort', cleanup, { once: true });
  if (signal?.aborted) { cleanup(); return; }
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
