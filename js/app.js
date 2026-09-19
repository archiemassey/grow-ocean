/* app.js — router, navigation, shared helpers.
   Plain English: this is the app's "switchboard". It watches the address bar
   (the #/something part), loads the matching screen, highlights the right tab,
   and registers the service worker that makes the app work offline. */

import { renderHome } from './views/home.js';
import { renderBoat } from './views/boat.js';
import { renderWiki } from './views/wiki.js';
import { renderReminders } from './views/reminders.js';
import { renderChecklists } from './views/checklists.js';
import { renderLog } from './views/log.js';
import { renderEntertain } from './views/entertain.js';
import { renderProcedures } from './views/procedures.js';
import { renderFeedback } from './views/feedback.js';
import { renderShortcuts } from './views/shortcuts.js';
import { initReminderEngine } from './reminders.js';
import { initAppUpdates } from './updates.js';
import { createSpeechReader } from './hands-free.js';
import { primaryTab, parentRoute, EMERGENCY_ROUTES } from './navigation.js';
import { initShiftClock, mountShiftStrip } from './shift-state.js';
import { initTheme } from './theme.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
const backBtn = document.getElementById('backBtn');
const topTitle = document.getElementById('topTitle');
const netStatus = document.getElementById('netStatus');

const routes = {
  home: { title: 'gROW Ocean', tab: 'home', render: renderHome },
  boat: { title: 'Boat', tab: 'boat', render: renderBoat },
  wiki: { title: 'Quick Wiki', tab: 'wiki', render: renderWiki },
  reminders: { title: 'Reminders', tab: 'reminders', render: renderReminders },
  checklists: { title: 'Checklists', tab: 'checklists', render: renderChecklists },
  log: { title: 'Event Log', tab: 'log', render: renderLog },
  entertain: { title: 'Morale & Media', tab: 'entertain', render: renderEntertain },
  procedures: { title: 'Emergency procedures', tab: 'home', render: renderProcedures },
  feedback: { title: 'App Feedback', tab: 'home', render: renderFeedback },
  shortcuts: { title: 'Siri Setup', tab: 'home', render: renderShortcuts }
};

/* ---------- shared UI helpers, exported for views ---------- */
export function h(tag, attrs = {}, children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  if (children != null) (Array.isArray(children) ? children : [children]).forEach((c) =>
    e.append(c instanceof Node ? c : document.createTextNode(c)));
  return e;
}

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* Text-to-speech — reads wiki/instructions aloud, hands-free. Works offline. */
let manualSpeech;
export function speak(text) {
  stopSpeaking();
  if (document.hidden) return;
  manualSpeech = new AbortController();
  createSpeechReader().say(text, manualSpeech.signal).catch(error => {
    if (error.name !== 'AbortError') toast('Read-aloud isn’t available. The instructions are still on screen.');
  });
}
export function stopSpeaking() {
  manualSpeech?.abort(); manualSpeech = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeaking(); });
window.addEventListener('pagehide', stopSpeaking);

export function go(hash) { location.hash = hash; }

/* ---------- file share / pick helpers (export & import) ----------
   Plain English: these let the app hand a file to iOS's Share sheet (so the
   rowers can AirDrop / message it to each other) and read a file back in.
   Falls back to a normal download if sharing isn't available. */
export async function shareOrDownload(filename, text, mime = 'application/json') {
  try {
    const file = new File([text], filename, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return false; // user cancelled the share sheet
  }
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch (e) {
    console.warn('share/download failed', e);
    return false;
  }
}

export function pickTextFile(accept = '.json,application/json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.style.display = 'none';
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) { resolve(null); return; }
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, text: String(r.result) });
      r.onerror = () => resolve(null);
      r.readAsText(f);
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
  });
}

/* ---------- routing ---------- */
function parseHash() {
  const raw = (location.hash || '#/home').replace(/^#\//, '');
  const [name, ...rest] = raw.split('/');
  return { name: routes[name] ? name : 'home', param: rest.join('/') };
}

let routeController;
async function router() {
  stopSpeaking();
  routeController?.abort();
  const controller = routeController = new AbortController();
  const { name, param } = parseHash();
  const route = routes[name];
  topTitle.textContent = route.title;

  const parent = parentRoute(name, param);
  backBtn.hidden = !parent;
  backBtn.onclick = () => go(parent);

  // Highlight active tab.
  [...tabbar.querySelectorAll('.tab')].forEach(a => {
    const active = a.dataset.tab === primaryTab(name);
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  // An old async render may finish, but can never append into the new route.
  const content = h('div', { class: 'route-content' });
  view.replaceChildren(content);
  try {
    await route.render(content, decodeURIComponent(param || ''), controller.signal);
  } catch (err) {
    console.error(err);
    content.append(h('div', { class: 'empty' }, 'Something went wrong loading this screen.'));
  }
  if (controller.signal.aborted) return;
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

/* ---------- connection indicator ---------- */
function updateNet() {
  const online = navigator.onLine;
  netStatus.textContent = online ? 'online' : 'offline-ready';
  netStatus.style.color = online ? '#8fe3c3' : '';
}
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);

/* ---------- boot ---------- */
window.addEventListener('hashchange', router);
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || !EMERGENCY_ROUTES.includes(link.getAttribute('href'))) return;
  // Stop Auto, queued speech and media synchronously, even on the current route.
  stopSpeaking();
  window.dispatchEvent(new Event('emergencyopen'));
  event.preventDefault();
  const target = link.getAttribute('href');
  if (location.hash === target) {
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  else go(target);
});
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateNet();
  mountShiftStrip(document.getElementById('shiftStrip'));
  initShiftClock();
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) document.documentElement.style.setProperty(
        entry.target.id === 'primaryDock' ? '--dock-height' : '--shift-height',
        `${entry.target.getBoundingClientRect().height}px`);
    });
    observer.observe(document.getElementById('primaryDock'));
    observer.observe(document.getElementById('shiftStrip'));
  }
  router();
  initReminderEngine();
});

initAppUpdates();
