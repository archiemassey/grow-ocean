/* theme.js — screen modes for sunlight readability and night-vision safety.
   Four modes cycle from a single always-visible top-bar button so the crew can
   switch fast at every dawn/dusk shift change:
     auto  — follows the phone's light/dark setting
     day   — maximum-contrast light for direct sunlight glare
     dark  — the calm dark theme, regardless of phone setting
     night — red-on-black to protect night vision (no white/blue/green)
   A dim overlay lets them darken below the phone's minimum brightness. */

import { readPreference, savePreference } from './speech.js';

export const THEME_ORDER = ['auto', 'day', 'dark', 'night'];
export const THEME_META = {
  auto: { label: 'Auto', short: 'Auto', icon: '◐' },
  day: { label: 'Daylight', short: 'Day', icon: '☀' },
  dark: { label: 'Dark', short: 'Dark', icon: '☾' },
  night: { label: 'Night vision', short: 'Night', icon: '🔴' }
};
const THEME_KEY = 'theme';
const DIM_KEY = 'theme-dim';
const THEME_COLORS = { auto: '#0a2e44', day: '#ffffff', dark: '#0a1a24', night: '#000000' };

export function normalizeTheme(value) {
  return THEME_ORDER.includes(value) ? value : 'auto';
}
export function nextTheme(current) {
  return THEME_ORDER[(THEME_ORDER.indexOf(normalizeTheme(current)) + 1) % THEME_ORDER.length];
}
export function clampDim(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(0.8, Math.max(0, n));
}

export function currentTheme() {
  return normalizeTheme(document.documentElement.getAttribute('data-theme'));
}
export function currentDim() {
  return clampDim(readPreference(DIM_KEY, 0));
}

function applyDimOverlay(value) {
  const overlay = document.getElementById('dimOverlay');
  if (overlay) overlay.style.opacity = String(clampDim(value));
}

export function setDim(value) {
  const dim = clampDim(value);
  savePreference(DIM_KEY, dim);
  applyDimOverlay(dim);
  return dim;
}

export function applyTheme(theme) {
  const value = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', value);
  savePreference(THEME_KEY, value);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[value]);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: value } }));
  return value;
}

export function cycleTheme() {
  return applyTheme(nextTheme(currentTheme()));
}

/* Wire the persistent top-bar button and restore the saved dim level.
   The initial data-theme is set by an inline script in index.html to avoid a
   flash, so here we only reconcile state and attach behaviour. */
export function initTheme() {
  applyTheme(readPreference(THEME_KEY, 'auto'));
  applyDimOverlay(currentDim());
  const btn = document.getElementById('themeBtn');
  if (btn) {
    const paint = () => {
      const t = currentTheme();
      btn.textContent = THEME_META[t].icon;
      btn.setAttribute('aria-label', 'Screen mode: ' + THEME_META[t].label + ' (tap to change)');
      btn.title = 'Screen mode: ' + THEME_META[t].label;
    };
    btn.addEventListener('click', () => { cycleTheme(); paint(); });
    window.addEventListener('themechange', paint);
    paint();
  }
}
