/* reminders.js (view) — manage scheduled reminders (toggles) and trigger
   event-based reminders (manual "fire now" buttons for the prototype). */

import { h, toast } from '../app.js';
import { CONTENT } from '../data/content.js';
import { getReminderState, setReminderEnabled, snooze, markDoneNow } from '../reminders.js';

function timeLabel(s) {
  if (!s.on || !s.nextDue) return 'off';
  const mins = Math.round((s.nextDue - Date.now()) / 60000);
  if (mins <= 0) return 'due now';
  if (mins < 60) return 'in ' + mins + 'm';
  if (mins < 60 * 24) return 'in ' + Math.round(mins / 60) + 'h';
  return 'in ' + Math.round(mins / 1440) + 'd';
}

async function drawScheduled(wrap) {
  wrap.innerHTML = '';
  wrap.append(h('p', { class: 'hint' }, 'Toggle reminders on/off. While the app is open they pop a notification when due.'));
  const cats = [...new Set(CONTENT.scheduled.map((r) => r.category))];
  for (const cat of cats) {
    wrap.append(h('div', { class: 'cat-head' }, cat));
    for (const r of CONTENT.scheduled.filter((x) => x.category === cat)) {
      const s = await getReminderState(r.id);
      const every = r.time ? ('daily ' + r.time) : ('every ' + r.intervalH + 'h');
      const due = h('span', { class: 'd' }, every + ' · ' + timeLabel(s));

      const input = h('input', { type: 'checkbox' });
      input.checked = s.on;
      input.addEventListener('change', async () => {
        const ns = await setReminderEnabled(r.id, input.checked);
        due.textContent = every + ' · ' + timeLabel(ns);
        toast(r.title + (input.checked ? ' on' : ' off'));
      });
      const sw = h('label', { class: 'switch' }, [input, h('span', { class: 'slider' })]);

      const row = h('div', { class: 'listrow' }, [
        h('span', { class: 'lead' }, r.voice ? '🔊' : '⏰'),
        h('span', { class: 'body' }, [h('span', { class: 't' }, r.title), h('span', { class: 'd' }, r.detail), due]),
        sw
      ]);
      const actions = h('div', { class: 'btnrow', style: 'margin:-4px 0 10px' }, [
        h('button', { class: 'btn small ghost', onclick: async () => { await markDoneNow(r.id); drawScheduled(wrap); toast('Done — reset'); } }, '✓ Done'),
        h('button', { class: 'btn small ghost', onclick: async () => { await snooze(r.id, 15); drawScheduled(wrap); toast('Snoozed 15m'); } }, '😴 +15m'),
      ]);
      wrap.append(row, actions);
    }
  }
}

function drawEvents(wrap) {
  wrap.innerHTML = '';
  wrap.append(h('p', { class: 'hint' }, 'Event reminders fire when something happens. Tap to show the prompt now (in the real app these auto-trigger from sensors/the boat).'));
  for (const e of CONTENT.events) {
    wrap.append(h('button', {
      class: 'listrow', style: e.crit ? 'border-color:var(--crit)' : '',
      onclick: () => {
        const t = document.getElementById('toast');
        t.textContent = (e.crit ? '⚠️ ' : '🔔 ') + e.title + ' — ' + e.detail;
        t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 5000);
        if ('Notification' in window && Notification.permission === 'granted')
          try { new Notification((e.crit ? '⚠️ ' : '🔔 ') + e.title, { body: e.detail, icon: 'icons/icon-192.png' }); } catch (_) {}
        if (navigator.vibrate) navigator.vibrate(e.crit ? [120, 60, 120] : 80);
      }
    }, [
      h('span', { class: 'lead' }, e.crit ? '⚠️' : '🔔'),
      h('span', { class: 'body' }, [h('span', { class: 't' }, e.title), h('span', { class: 'd' }, e.detail)]),
      h('span', { class: 'chev' }, '›')
    ]));
  }
}

export async function renderReminders(view) {
  const scheduledWrap = h('div', {});
  const eventsWrap = h('div', {});

  const tabs = h('div', { class: 'btnrow', style: 'margin-bottom:12px' }, []);
  const btnSched = h('button', { class: 'btn small' }, 'Scheduled');
  const btnEvent = h('button', { class: 'btn small secondary' }, 'Event-based');
  tabs.append(btnSched, btnEvent);

  function show(which) {
    btnSched.className = 'btn small' + (which === 's' ? '' : ' secondary');
    btnEvent.className = 'btn small' + (which === 'e' ? '' : ' secondary');
    scheduledWrap.hidden = which !== 's';
    eventsWrap.hidden = which !== 'e';
  }
  btnSched.onclick = () => show('s');
  btnEvent.onclick = () => show('e');

  view.append(tabs, scheduledWrap, eventsWrap);
  await drawScheduled(scheduledWrap);
  drawEvents(eventsWrap);
  show('s');
}
