/* reminders.js — the reminder engine.
   Plain English: TWO modes.
   • NATIVE (Capacitor app): reminders are scheduled with the phone's OS, so they
     fire reliably even when the screen is off / app closed. We schedule a rolling
     window of upcoming occurrences and top them up whenever the app is reopened.
   • WEB (plain PWA): while the app is open it checks the clock every 30 seconds and
     pops a web notification + in-app banner. (Web cannot fire alarms when closed.)
   The native path is what makes background/sleep-mode alarms reliable. */

import { db } from './db.js';
import { CONTENT } from './data/content.js';
import { isNative, ensureNotifPermission, scheduleNative, cancelNative, appPlugin } from './notify.js';

const CHECK_MS = 30 * 1000;
// Native rolling-schedule window. iOS caps pending notifications at ~64, so keep
// the total small: MAX_PER * (enabled reminders) must stay under ~64.
const NATIVE_WINDOW_H = 24;
const MAX_PER = 4;
let timer = null;

export function findScheduled(id) { return CONTENT.scheduled.find((r) => r.id === id); }

function nextFromInterval(intervalH, from = Date.now()) { return from + intervalH * 3600 * 1000; }
function nextFromDailyTime(time, from = new Date()) {
  const [hh, mm] = time.split(':').map(Number);
  const d = new Date(from);
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1);
  return d.getTime();
}
export function computeNextDue(r, from = Date.now()) {
  return r.time ? nextFromDailyTime(r.time, new Date(from)) : nextFromInterval(r.intervalH, from);
}

/* Upcoming occurrence timestamps for one reminder, within the native window. */
export function computeOccurrences(r) {
  const out = [];
  let t = computeNextDue(r);
  const end = Date.now() + NATIVE_WINDOW_H * 3600 * 1000;
  const stepMs = r.time ? 24 * 3600 * 1000 : r.intervalH * 3600 * 1000;
  while (t <= end && out.length < MAX_PER) { out.push(t); t += stepMs; }
  if (!out.length) out.push(computeNextDue(r));
  return out;
}

/* (Re)build the OS schedule for every enabled reminder. Called on native start
   and again each time the app resumes, so the rolling window stays topped up. */
export async function rescheduleAllNative() {
  if (!isNative()) return;
  for (const r of CONTENT.scheduled) {
    const s = await getReminderState(r.id);
    if (s.on) { await cancelNative(r.id); await scheduleNative(r, computeOccurrences(r)); }
    else { await cancelNative(r.id); }
  }
}

/* Get merged state (defaults from content + stored overrides). */
export async function getReminderState(id) {
  const r = findScheduled(id);
  if (!r) return null;
  const saved = await db.get('reminderState', id);
  return {
    id, on: saved ? saved.on : r.on,
    nextDue: saved ? saved.nextDue : computeNextDue(r),
    lastFired: saved ? saved.lastFired : null
  };
}

export async function setReminderEnabled(id, on) {
  const r = findScheduled(id);
  const state = { id, on, nextDue: on ? computeNextDue(r) : null, lastFired: null };
  await db.put('reminderState', state);
  if (on) {
    await ensureNotifPermission();
    if (isNative()) { await cancelNative(id); await scheduleNative(r, computeOccurrences(r)); }
  } else if (isNative()) {
    await cancelNative(id);
  }
  return state;
}

export async function snooze(id, minutes = 15) {
  const r = findScheduled(id);
  const s = await getReminderState(id);
  s.nextDue = Date.now() + minutes * 60000;
  await db.put('reminderState', s);
  if (isNative()) { await cancelNative(id); await scheduleNative(r, [s.nextDue]); }
}

export async function markDoneNow(id) {
  const r = findScheduled(id);
  const s = await getReminderState(id);
  s.nextDue = computeNextDue(r);
  s.lastFired = Date.now();
  await db.put('reminderState', s);
  if (isNative()) { await cancelNative(id); await scheduleNative(r, computeOccurrences(r)); }
}

function fire(r) {
  const title = '⏰ ' + r.title;
  const body = r.detail;
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body, tag: r.id, icon: 'icons/icon-192.png' }); } catch (_) {}
  }
  // Always show an in-app banner too.
  const toastEl = document.getElementById('toast');
  if (toastEl) { toastEl.textContent = title + ' — ' + body; toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 5000); }
}

async function tick() {
  const now = Date.now();
  for (const r of CONTENT.scheduled) {
    const s = await getReminderState(r.id);
    if (!s.on || !s.nextDue) continue;
    if (s.nextDue <= now) {
      fire(r);
      s.lastFired = now;
      s.nextDue = computeNextDue(r, now);
      await db.put('reminderState', s);
    }
  }
}

export async function initReminderEngine() {
  await ensureNotifPermission();
  // Seed default state for any reminder not yet stored.
  for (const r of CONTENT.scheduled) {
    const saved = await db.get('reminderState', r.id);
    if (!saved) await db.put('reminderState', { id: r.id, on: r.on, nextDue: r.on ? computeNextDue(r) : null, lastFired: null });
  }

  if (isNative()) {
    // OS handles firing while asleep/closed; (re)build the rolling schedule now
    // and again every time the app is reopened to keep the window topped up.
    await rescheduleAllNative();
    const app = appPlugin();
    if (app && app.addListener) app.addListener('resume', () => rescheduleAllNative());
  } else {
    // Web: poll while open (cannot fire when closed).
    clearInterval(timer);
    timer = setInterval(tick, CHECK_MS);
    tick();
  }
}
