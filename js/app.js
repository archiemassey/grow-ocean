/* app.js — router, navigation, shared helpers.
   Plain English: this is the app's "switchboard". It watches the address bar
   (the #/something part), loads the matching screen, highlights the right tab,
   and registers the service worker that makes the app work offline. */

import { renderHome } from './views/home.js';
import { renderWiki } from './views/wiki.js';
import { renderReminders } from './views/reminders.js';
import { renderChecklists } from './views/checklists.js';
import { renderLog } from './views/log.js';
import { renderEntertain } from './views/entertain.js';
import { renderFeedback } from './views/feedback.js';
import { initReminderEngine } from './reminders.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
const backBtn = document.getElementById('backBtn');
const topTitle = document.getElementById('topTitle');
const netStatus = document.getElementById('netStatus');

const TAB_FOR = { home:'home', wiki:'wiki', reminders:'reminders', checklists:'checklists', log:'log', entertain:'entertain' };

const routes = {
  home: { title: 'gROW Ocean', tab: 'home', render: renderHome },
  wiki: { title: 'Quick Wiki', tab: 'wiki', render: renderWiki },
  reminders: { title: 'Reminders', tab: 'reminders', render: renderReminders },
  checklists: { title: 'Checklists', tab: 'checklists', render: renderChecklists },
  log: { title: 'Event Log', tab: 'log', render: renderLog },
  entertain: { title: 'Morale & Media', tab: 'entertain', render: renderEntertain },
  feedback: { title: 'App Feedback', tab: 'home', render: renderFeedback }
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
export function speak(text) {
  if (!('speechSynthesis' in window)) { toast('Voice output not supported here'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95; u.pitch = 1;
  speechSynthesis.speak(u);
}
export function stopSpeaking() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

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

async function router() {
  stopSpeaking();
  const { name, param } = parseHash();
  const route = routes[name];
  topTitle.textContent = route.title;

  // Back button shows when we're on a sub-screen (a route param exists).
  backBtn.hidden = !param;
  backBtn.onclick = () => history.length > 1 ? history.back() : go('#/' + name);

  // Highlight active tab.
  [...tabbar.querySelectorAll('.tab')].forEach((a) =>
    a.classList.toggle('active', a.dataset.tab === TAB_FOR[route.tab]));

  view.innerHTML = '';
  try {
    await route.render(view, decodeURIComponent(param || ''));
  } catch (err) {
    console.error(err);
    view.append(h('div', { class: 'empty' }, 'Something went wrong loading this screen.'));
  }
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
window.addEventListener('DOMContentLoaded', () => {
  updateNet();
  router();
  initReminderEngine();
});

// Register the service worker (the offline engine).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((e) =>
      console.warn('SW registration failed:', e));
  });
}
