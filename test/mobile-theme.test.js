import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
const roots = [...css.matchAll(/:root\s*\{([^}]+)\}/g)].map(match =>
  Object.fromEntries([...match[1].matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(m => [m[1], m[2]])));
function luminance(hex) {
  return hex.slice(1).match(/../g).map(v => {
    const s = parseInt(v, 16) / 255;
    return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
function ratio(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
test('small-text theme pairs including toast, callouts, chips and buttons meet WCAG AA', () => {
  for (const colors of [roots[0], { ...roots[0], ...roots[1] }]) {
    for (const [fg, bg] of [
      ['ink', 'card'], ['ink', 'crit-bg'], ['muted', 'card'], ['muted', 'foam'],
      ['link', 'card'], ['link', 'foam'], ['link', 'sand'], ['crit', 'crit-bg'],
      ['warn', 'card'], ['ok', 'card']
    ]) assert.ok(ratio(colors[fg], colors[bg]) >= 4.5, `${fg}/${bg}`);
    for (const bg of ['navy', 'teal', 'danger-button'])
      assert.ok(ratio('#ffffff', colors[bg]) >= 4.5, `white/${bg}`);
  }
  assert.match(css, /\.toast\{[^}]*background:var\(--navy\);color:#fff/s);
  assert.match(css, /\.callout\.crit\{[^}]*background:var\(--crit-bg\);color:var\(--ink\)/);
  assert.match(css, /\[hidden\]\{display:none!important\}/);
});

test('Home puts the compact thought first, then actions, with review prose out of the app', async () => {
  const home = await readFile(new URL('../js/views/home.js', import.meta.url), 'utf8');
  const wiki = await readFile(new URL('../js/views/wiki.js', import.meta.url), 'utf8');
  const checks = await readFile(new URL('../js/views/checklists.js', import.meta.url), 'utf8');
  assert.match(home, /view.append\(\s*perspectiveCard, timerCard, emergency/);
  assert.match(css, /\.shift-thought\{padding:10px 14px\}/);
  assert.match(home, /h\('details', \{ class: 'card' \}, \[\s*h\('summary', \{\}, 'About & updates'\)/);
  assert.doesNotMatch(home, /setTimeout/);
  assert.doesNotMatch(wiki, /speak\(\(a.readOnly|speak\(SAFETY_NOTICE/);
  for (const source of [wiki, checks]) {
    assert.doesNotMatch(source, /Reference \/ preparation notes|SAFETY_NOTICE|PAIR_REVIEW|RULES_NOTICE/);
  }
  assert.match(wiki, /'Voice & source'/);
  assert.match(wiki, /speak\(\[a.title, ACTION_CONDITIONS\[a.id\]/);
});
