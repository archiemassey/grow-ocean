/* Home — Deep Horizon hero (dial + wave + inspiration) over a calm layout, with the
   shift controls tucked into a rising sheet behind the ⚙️ cog. Perspective stays
   first-class, Emergency + reminders always visible. */
import { h, go, toast, openCalendarFile } from '../app.js';
import { db } from '../db.js';
import { CONTENT } from '../data/content.js';
import { getReminderState } from '../reminders.js';
import { APP_RELEASE, checkForUpdates } from '../updates.js';
import { getShiftPerspective } from '../shift-perspective.js';
import { shiftStore, shiftDisplay, rowerName } from '../shift-state.js';
import { buildWakeupICS, buildCancelICS } from '../shift-ics.js';
import { computeSchedule, formatHours } from '../shift-schedule.js';

const clock = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const otherRower = r => (r === 'Rower 1' ? 'Rower 2' : 'Rower 1');
const mins = n => Math.round(n) + ' min';
const timeLabel = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
/* Saved schedule fields with the same fallbacks the schedule screen uses. */
const schedFields = (s = {}) => ({
  scheduleOn: !!s.scheduleOn,
  nightShiftMin: Number.isFinite(s.nightShiftMin) ? s.nightShiftMin : 180,
  dayShiftMin: Number.isFinite(s.dayShiftMin) ? s.dayShiftMin : 90,
  splitPct: Number.isFinite(s.splitPct) ? s.splitPct : 50,
  nightStartMin: Number.isFinite(s.nightStartMin) ? s.nightStartMin : 1200
});

export async function renderHome(view, param, signal) {
  let busy = false, thoughtKey, thoughtVersion = 0, thoughtPending = Promise.resolve();

  // ---- Shift quick-controls (D-pad beside the dial) ----
  const controls = [];
  function control(label, action, opts = {}) {
    const button = h('button', { class: 'dp ' + (opts.cls || ''), type: 'button',
      'aria-label': opts.aria || label, title: opts.aria || label, disabled: true, onclick: async () => {
      if (busy) return;
      busy = true;
      controls.forEach(b => b.disabled = true);
      try {
        await shiftStore.change(action);
        await thoughtPending;
        if (action === 'swap') toast('Swapped — ' + rowerName(shiftStore.snapshot().state, shiftStore.snapshot().state.activeRower) + ' on oars');
      } catch { /* The persistent error below and the shell expose storage failures. */ }
      finally { busy = false; updateControls(shiftStore.snapshot()); }
    } }, label);
    controls.push(button);
    return button;
  }
  // Play / pause toggles between starting (or resuming) and pausing the manual timer.
  // The glyph + action are set from the live display in the subscribe block below.
  let playAction = 'start';
  const playBtn = h('button', { class: 'dp right', type: 'button', 'aria-label': 'Start shift',
    title: 'Start shift', disabled: true, onclick: async () => {
    if (busy) return;
    busy = true;
    controls.forEach(b => b.disabled = true);
    const action = playAction;
    const wasPaused = shiftStore.snapshot().state?.pausedLeft > 0;
    try {
      await shiftStore.change(action);
      await thoughtPending;
      toast(action === 'pause' ? 'Shift paused' : wasPaused ? 'Shift resumed' : 'Shift started');
    } catch { /* storage errors surfaced below */ }
    finally { busy = false; updateControls(shiftStore.snapshot()); }
  } }, '▶');
  controls.push(playBtn);
  function updateControls({ state, error }) {
    controls.forEach(button => button.disabled = busy || !state || !!error);
  }

  // ---- Hero (gradient + conic dial + D-pad + wave) ----
  const kick = h('div', { class: 'hero-kick' }, 'Loading shift…');
  const ringTime = h('b', {}, '--:--');
  const ringSub = h('span', {}, 'to handover');
  const ring = h('div', { class: 'hero-ring', role: 'img', 'aria-label': 'Shift progress' },
    [h('div', { class: 'hero-ring-t' }, [ringTime, ringSub])]);
  const dpad = h('div', { class: 'dpad', role: 'group', 'aria-label': 'Shift quick controls' }, [
    control('+5', 'longer', { cls: 'up', aria: 'Add 5 minutes to this shift' }),
    control('⇄', 'swap', { cls: 'left', aria: 'Swap rower on oars' }),
    control('↺', 'reset', { cls: 'mid', aria: 'Reset shift timer' }),
    playBtn,
    control('−5', 'shorter', { cls: 'down', aria: 'Shorten this shift by 5 minutes' })
  ]);
  const heroMain = h('div', { class: 'hero-main' }, [ring, dpad]);
  const handoverLine = h('div', { class: 'hero-handover' }, '');
  const cog = h('button', { class: 'hero-cog', type: 'button', 'aria-label': 'Shift settings',
    'aria-haspopup': 'dialog', onclick: openSheet }, '⚙️');
  const waveWrap = h('div', { class: 'hero-wave-wrap', 'aria-hidden': 'true' });
  waveWrap.innerHTML = '<svg class="hero-wave" viewBox="0 0 320 26" preserveAspectRatio="none">' +
    '<path d="M0 14 Q 54 0 107 14 T 214 14 T 322 14 V26 H0 Z"/></svg>';
  const hero = h('section', { class: 'hero', 'aria-label': 'Shift timer' },
    [cog, kick, heroMain, handoverLine, waveWrap]);

  const storageError = h('p', { class: 'callout crit', role: 'status', hidden: true });
  const retry = h('button', { class: 'btn small secondary', hidden: true, onclick: () =>
    shiftStore.refresh().catch(() => {}) }, 'Retry shift storage');

  // ---- Inspiration + primary action ----
  const perspective = h('p', { id: 'shift-perspective', 'aria-live': 'polite' }, 'Loading this shift’s perspective…');
  const inspiration = h('section', { class: 'card inspiration', 'aria-label': 'This shift' }, [
    perspective, h('a', { href: '#/stars', class: 'star-link' }, '✦ Star guide →')
  ]);
  const primary = h('a', { href: '#/log/watch', class: 'btn handover-action primary-home' }, '⬤ Record handover');

  // ---- Embedded day / night schedule (sliders moved into the sheet) ----
  const init = schedFields(shiftStore.snapshot().state || {});
  const schedToggle = h('input', { type: 'checkbox', id: 'homeSchedOn', ...(init.scheduleOn ? { checked: true } : {}) });
  const slider = (id, label, min, max, step, value, fmt) => {
    const input = h('input', { type: 'range', id, min: String(min), max: String(max), step: String(step),
      value: String(value), 'aria-label': label });
    const out = h('span', { class: 'bx-val' }, fmt(value));
    input.addEventListener?.('input', () => { out.textContent = fmt(+input.value); updatePreview(); });
    return { row: h('label', { class: 'bx-slider sched-slider' }, [h('span', {}, label), input, out]), input, out, fmt };
  };
  const nightS = slider('homeNight', 'Night stint (one each)', 30, 300, 15, init.nightShiftMin, v => formatHours(v));
  const dayS = slider('homeDay', 'Day stint (target)', 20, 180, 5, init.dayShiftMin, v => mins(v));
  const splitS = slider('homeSplit', 'Balance · R1 share', 35, 65, 5, init.splitPct,
    v => 'R1 ' + v + '% / R2 ' + (100 - v) + '%');
  const nightStartInput = h('input', { type: 'time', id: 'homeNightStart', value: timeLabel(init.nightStartMin) });
  nightStartInput.addEventListener?.('input', () => updatePreview());
  function currentInputs() {
    const [hh, mm] = (nightStartInput.value || '20:00').split(':').map(n => parseInt(n, 10) || 0);
    return {
      splitPct: +splitS.input.value,
      nightShiftMin: +nightS.input.value,
      dayShiftMin: +dayS.input.value,
      nightStartMin: hh * 60 + mm
    };
  }
  const totalsEl = h('div', { class: 'sched-totals', 'aria-live': 'polite' });
  function updatePreview() {
    const sched = computeSchedule(currentInputs());
    const r1 = formatHours(sched.perRowerMin['Rower 1']);
    const r2 = formatHours(sched.perRowerMin['Rower 2']);
    const even = Math.abs(sched.perRowerMin['Rower 1'] - sched.perRowerMin['Rower 2']) < 1;
    totalsEl.replaceChildren(
      h('strong', {}, 'Rower 1 ' + r1), h('span', {}, ' · '),
      h('strong', {}, 'Rower 2 ' + r2), h('span', {}, ' ' + (even ? '✓ even' : '· chosen split')));
  }
  function syncSchedule(state) {
    const f = schedFields(state);
    schedToggle.checked = f.scheduleOn;
    nightS.input.value = String(f.nightShiftMin); nightS.out.textContent = nightS.fmt(f.nightShiftMin);
    dayS.input.value = String(f.dayShiftMin); dayS.out.textContent = dayS.fmt(f.dayShiftMin);
    splitS.input.value = String(f.splitPct); splitS.out.textContent = splitS.fmt(f.splitPct);
    nightStartInput.value = timeLabel(f.nightStartMin);
    r1NameInput.value = state.rower1Name || '';
    r2NameInput.value = state.rower2Name || '';
    updatePreview();
  }
  const saveBtn = h('button', { class: 'btn', onclick: async () => {
    try {
      await shiftStore.setSchedule({ ...currentInputs(), scheduleOn: schedToggle.checked });
      updatePreview();
      toast(schedToggle.checked ? 'Schedule saved — now driving the timer' : 'Schedule saved');
    } catch { toast('Could not save the schedule — storage unavailable.'); }
  } }, '✓ Save & re-calc');

  // Rower names: optional labels shown instead of “Rower 1 / Rower 2” everywhere.
  const r1NameInput = h('input', { type: 'text', id: 'homeR1Name', maxlength: '24', placeholder: 'Rower 1', 'aria-label': 'Rower 1 name' });
  const r2NameInput = h('input', { type: 'text', id: 'homeR2Name', maxlength: '24', placeholder: 'Rower 2', 'aria-label': 'Rower 2 name' });
  const saveNamesBtn = h('button', { class: 'btn', onclick: async () => {
    try { await shiftStore.setNames(r1NameInput.value, r2NameInput.value); toast('Names saved'); }
    catch { toast('Could not save names — storage unavailable.'); }
  } }, '✓ Save names');

  const names = state => ({ 'Rower 1': rowerName(state, 'Rower 1'), 'Rower 2': rowerName(state, 'Rower 2') });

  const wakeupsBtn = h('button', { class: 'btn small secondary sheet-wakeup', onclick: async () => {
    const { state, error } = shiftStore.snapshot();
    if (error || !state) { toast('Shift storage unavailable — retry first.'); return; }
    const ics = buildWakeupICS(state, { count: 8, leadMin: 10, names: names(state) });
    const shared = await openCalendarFile('grow-ocean-wake-ups.ics', ics);
    if (shared) toast('Opening Calendar — tap “Add All” to set the alarms.');
  } }, '⏰ Wake-up alarms (.ics)');

  // Removes previously-imported gROW alarms via a METHOD:CANCEL .ics (best-effort —
  // see shift-ics.js). Lets the pair clear old alarms before importing a fresh set.
  const cancelBtn = h('button', { class: 'btn small secondary', onclick: async () => {
    const { state, error } = shiftStore.snapshot();
    if (error || !state) { toast('Shift storage unavailable — retry first.'); return; }
    const ics = buildCancelICS(state, { names: names(state) });
    const shared = await openCalendarFile('grow-ocean-remove-alarms.ics', ics);
    if (shared) toast('Opening Calendar — confirm to remove the old gROW alarms.');
  } }, '🗑 Remove gROW alarms (.ics)');

  const backdrop = h('div', { class: 'sheet-backdrop', hidden: true, onclick: closeSheet });
  const closeX = h('button', { class: 'sheet-x', type: 'button', 'aria-label': 'Close shift settings',
    onclick: closeSheet }, '✕');
  const sheet = h('div', { class: 'shift-sheet', role: 'dialog', 'aria-modal': 'true',
    'aria-label': 'Shift controls & settings', tabindex: '-1', hidden: true }, [
    h('div', { class: 'sheet-grab', 'aria-hidden': 'true' }),
    h('div', { class: 'sheet-head' }, [h('h3', {}, 'Shift controls & settings'), closeX]),
    h('p', { class: 'hint' }, 'Both of you, together — nothing is sent to the other phone on its own. ' +
      'The +5 / −5 / ▶ keys beside the dial adjust just this phone’s timer.'),
    storageError, retry,
    h('p', { class: 'sheet-lbl' }, 'Rower names'),
    h('label', { class: 'sched-field' }, [h('span', {}, 'Rower 1'), r1NameInput]),
    h('label', { class: 'sched-field' }, [h('span', {}, 'Rower 2'), r2NameInput]),
    h('div', { class: 'btnrow' }, [saveNamesBtn]),
    h('p', { class: 'sheet-lbl' }, 'Day / night schedule'),
    h('label', { class: 'switch-row' }, [
      h('span', { class: 'switch' }, [schedToggle, h('span', { class: 'slider' })]),
      h('span', {}, 'Drive the timer & alarms from this schedule')
    ]),
    nightS.row, dayS.row, splitS.row,
    h('label', { class: 'sched-field' }, [h('span', {}, 'Night starts at'), nightStartInput]),
    totalsEl,
    h('div', { class: 'btnrow' }, [saveBtn]),
    h('p', { class: 'sheet-lbl' }, 'Sync & alarms'),
    h('a', { href: '#/schedule', class: 'sheet-link', onclick: closeSheet },
      [h('span', {}, '🔗 Show QR / scan partner’s phone'), h('span', { class: 'r' }, '›')]),
    wakeupsBtn, cancelBtn,
    h('p', { class: 'hint' }, '−5 shortens just this shift on this phone — your partner’s wake-up ' +
      'alarm won’t move on its own. Re-share the wake-up alarms after changing the schedule. ' +
      '“Remove gROW alarms” clears a previously-imported set first.')
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
      : display.status === 'idle' ? 'ready' : display.status === 'paused' ? 'paused'
      : display.status === 'overdue' ? 'overdue' : 'to handover';
    // Play/pause: pause while a shift is actively running, otherwise start/resume.
    playAction = display.running ? 'pause' : 'start';
    playBtn.textContent = display.running ? '⏸' : '▶';
    const playLbl = display.running ? 'Pause shift' : display.paused ? 'Resume shift' : 'Start shift';
    playBtn.setAttribute?.('aria-label', playLbl);
    if ('title' in playBtn) playBtn.title = playLbl;
    if (error) { kick.textContent = 'Shift unavailable'; handoverLine.textContent = ''; }
    else if (!state) { kick.textContent = 'Loading shift…'; handoverLine.textContent = ''; }
    else {
      const phaseLabel = display.phase ? (display.phase === 'night' ? 'Night shift' : 'Day shift') : '';
      const onName = rowerName(state, display.rower);
      const offName = rowerName(state, otherRower(display.rower));
      if (display.status === 'idle') {
        kick.textContent = phaseLabel || 'No shift running';
        handoverLine.textContent = state.scheduleOn
          ? 'Press ▶ to begin this stint'
          : 'Press ▶ to begin · ' + state.shiftMin + ' min shifts';
      } else if (display.status === 'paused') {
        kick.textContent = phaseLabel || 'Paused';
        handoverLine.textContent = onName + ' on oars · paused — press ▶ to resume';
      } else {
        kick.textContent = phaseLabel || 'On oars';
        handoverLine.textContent = display.status === 'overdue'
          ? 'Handover due now → ' + offName
          : onName + ' on oars · hand to ' + offName +
            ' at ' + (display.endsAt ? clock(display.endsAt) : '—');
      }
    }
    storageError.hidden = retry.hidden = !error;
    storageError.textContent = error ? 'Could not read or save the shift on this device. No new shift change was confirmed. Retry before relying on the timer.' : '';
    updateControls(snapshot);
    if (state && !error && thoughtKey !== state.shiftLastStart) {
      thoughtKey = state.shiftLastStart;
      const version = ++thoughtVersion;
      thoughtPending = getShiftPerspective(db, state.shiftLastStart).then(selected => {
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
  const refreshed = shiftStore.snapshot();
  if (refreshed.state && !refreshed.error) syncSchedule(refreshed.state);

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
