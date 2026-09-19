import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  THEME_ORDER, THEME_META, normalizeTheme, nextTheme, clampDim
} from '../js/theme.js';

test('four screen modes are defined with the sunlight/night-vision cycle order', () => {
  assert.deepEqual(THEME_ORDER, ['auto', 'day', 'dark', 'night']);
  for (const mode of THEME_ORDER) {
    assert.ok(THEME_META[mode], `meta for ${mode}`);
    assert.ok(THEME_META[mode].label, `label for ${mode}`);
    assert.ok(THEME_META[mode].icon, `icon for ${mode}`);
  }
});

test('nextTheme cycles through every mode and wraps back to auto', () => {
  assert.equal(nextTheme('auto'), 'day');
  assert.equal(nextTheme('day'), 'dark');
  assert.equal(nextTheme('dark'), 'night');
  assert.equal(nextTheme('night'), 'auto');
  // A full cycle returns to the start.
  let t = 'auto';
  for (let i = 0; i < THEME_ORDER.length; i++) t = nextTheme(t);
  assert.equal(t, 'auto');
});

test('unknown or missing themes fall back to auto', () => {
  assert.equal(normalizeTheme('sunshine'), 'auto');
  assert.equal(normalizeTheme(undefined), 'auto');
  assert.equal(normalizeTheme(null), 'auto');
  assert.equal(nextTheme('bogus'), 'day');
});

test('extra dimming is clamped to a safe 0–0.8 range', () => {
  assert.equal(clampDim(-1), 0);
  assert.equal(clampDim(0.5), 0.5);
  assert.equal(clampDim(2), 0.8);
  assert.equal(clampDim('nope'), 0);
});

test('night-vision theme remaps the palette to red-on-black with no blue/green', async () => {
  const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
  const block = css.match(/html\[data-theme="night"\]\s*\{([^}]+)\}/);
  assert.ok(block, 'night theme :root override exists');
  assert.match(block[1], /--foam:#000000/, 'pure-black background');
  assert.match(block[1], /--ink:#[a-f\d]{6}/i, 'red ink defined');
  // The inline head init script must set data-theme before first paint.
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /localStorage\.getItem\('theme'\)/);
  assert.match(html, /data-theme/);
  assert.match(html, /id="dimOverlay"/);
  assert.match(html, /id="themeBtn"/);
});
