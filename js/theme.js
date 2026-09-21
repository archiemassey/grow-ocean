/* theme.js — screen modes for sunlight readability and night-vision safety.
   Four modes cycle from a single always-visible top-bar button so the crew can
   switch fast at every dawn/dusk shift change:
     auto  — follows the sky over the boat: bright by day, calm dark at dusk/dawn,
             red-on-black once it is properly dark (see the sun engine below)
     day   — maximum-contrast light for direct sunlight glare
     dark  — the calm dark theme, regardless of the sky
     night — red-on-black to protect night vision (no white/blue/green)
   A dim overlay lets them darken below the phone's minimum brightness.

   How Auto knows the time of day, offline: it computes the sun's altitude from
   the device's UTC clock (timezone-proof) and the boat's position. Position
   comes from GPS when available — it works with no signal — and is cached; until
   a fix arrives it falls back to the phone's timezone as a rough longitude. No
   network and no ambient-light sensor (unsupported on iOS) are needed. */

import { readPreference, savePreference } from './speech.js';
import { sunAltitudeDeg, themeForSunAltitude } from './star-math.js';

export const THEME_ORDER = ['auto', 'day', 'dark', 'night'];
export const THEME_META = {
  auto: { label: 'Auto (follows the sky)', short: 'Auto', icon: '◐' },
  day: { label: 'Daylight', short: 'Day', icon: '☀' },
  dark: { label: 'Dark', short: 'Dark', icon: '☾' },
  night: { label: 'Night vision', short: 'Night', icon: '🔴' }
};
const THEME_KEY = 'theme';
const DIM_KEY = 'theme-dim';
const POS_KEY = 'boat-pos';
const THEME_COLORS = { auto: '#0a2e44', day: '#ffffff', dark: '#0a1a24', night: '#000000' };

/* Last known boat position for the sun calculation, restored across launches. */
let boatPos = null;

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

/* The screen mode the crew has chosen (what the button and settings show). The
   applied data-theme may differ from this when the choice is 'auto'. */
export function currentTheme() {
  return normalizeTheme(readPreference(THEME_KEY, 'auto'));
}
export function currentDim() {
  return clampDim(readPreference(DIM_KEY, 0));
}

/* Best-guess position before any GPS fix: latitude mid-crossing, longitude from
   the phone's own timezone offset (15° per hour). Good enough to place dawn/dusk
   within the hour; a real fix replaces it as soon as one arrives. */
function fallbackPos() {
  let lon = 0;
  try { lon = -(new Date().getTimezoneOffset()) / 4; } catch (e) { lon = 0; }
  return { lat: 18, lon };
}

/* Resolve a chosen mode to the concrete theme actually painted. Only 'auto'
   depends on the sun; the other three are literal. */
export function effectiveTheme(mode) {
  const value = normalizeTheme(mode);
  if (value !== 'auto') return value;
  const pos = boatPos || fallbackPos();
  try {
    return themeForSunAltitude(sunAltitudeDeg(new Date(), pos.lat, pos.lon));
  } catch (e) {
    return 'dark';
  }
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

/* Save the chosen mode and paint its effective theme. */
export function applyTheme(theme) {
  const mode = normalizeTheme(theme);
  savePreference(THEME_KEY, mode);
  paintEffective(mode);
  return mode;
}

/* Paint the concrete theme for a mode without re-saving the preference — used by
   both applyTheme and the periodic sun re-evaluation. */
function paintEffective(mode) {
  const eff = effectiveTheme(mode);
  document.documentElement.setAttribute('data-theme', eff);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[eff] || THEME_COLORS.dark);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: eff, mode } }));
  return eff;
}

export function cycleTheme() {
  return applyTheme(nextTheme(currentTheme()));
}

/* Re-evaluate Auto against the sky and repaint only if the theme actually
   changed, so we do not fire needless themechange events every minute. */
function refreshAuto() {
  if (currentTheme() !== 'auto') return;
  const eff = effectiveTheme('auto');
  if (document.documentElement.getAttribute('data-theme') !== eff) paintEffective('auto');
}

/* Ask the GPS for a position (works offline). Cache it and, if we are in Auto,
   repaint against the fresh location. */
function locate() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    p => {
      boatPos = { lat: p.coords.latitude, lon: p.coords.longitude };
      savePreference(POS_KEY, boatPos);
      refreshAuto();
    },
    () => {},
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 3600000 }
  );
}

/* Wire the persistent top-bar button, restore the saved dim level, and start the
   sun engine. The initial data-theme is set by an inline script in index.html to
   avoid a flash, so here we reconcile state and attach behaviour. */
export function initTheme() {
  const saved = readPreference(POS_KEY, null);
  if (saved && typeof saved.lat === 'number' && typeof saved.lon === 'number') boatPos = saved;

  applyTheme(currentTheme());
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

  /* Follow the sky: get a fix now, refresh position occasionally, and re-check
     the sun every minute so dawn/dusk/deep-night transitions happen on their own. */
  if (typeof window !== 'undefined') {
    locate();
    setInterval(refreshAuto, 60000);
    setInterval(locate, 1800000);
  }
}
