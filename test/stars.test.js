import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTELLATIONS, altaz, raSun, latForVoyage, lstHours, sunAltitudeDeg, themeForSunAltitude } from '../js/star-math.js';

// Orion's belt star Alnilam: RA 5.604h, Dec -1.20°.
const ALNILAM = [5.604, -1.20];
// Canopus (Carina): RA 6.399h, Dec -52.70°.
const CANOPUS = [6.399, -52.70];

test('catalogue holds the major named winter/southern constellations', () => {
  const names = CONSTELLATIONS.map(c => c.name);
  for (const n of ['ORION', 'CANIS MAJOR', 'TAURUS', 'GEMINI', 'AURIGA', 'LEO', 'SCORPIUS', 'CARINA', 'CRUX'])
    assert.ok(names.includes(n), `missing ${n}`);
  // Orion is drawn as a real figure with belt + shoulders + feet lines.
  const orion = CONSTELLATIONS.find(c => c.name === 'ORION');
  assert.ok(orion.stars.length >= 7 && orion.lines.length >= 6);
});

test('Polaris altitude equals the observer latitude (north celestial pole)', () => {
  // Polaris ≈ Dec +89.26°. Its altitude should track latitude regardless of time.
  for (const voy of [0, 0.5, 1]) {
    const lat = latForVoyage(voy);
    const { alt } = altaz(2.53, 89.26, lstHours(20, voy), lat);
    assert.ok(Math.abs(alt - lat) < 1.2, `alt ${alt} vs lat ${lat}`);
  }
});

test('constellations wheel east→south→west across the night (rotation)', () => {
  const lat = latForVoyage(0.5);
  const day = 20;
  const dusk = altaz(...ALNILAM, lstHours(day, 0), lat);     // 20:00
  const night = altaz(...ALNILAM, lstHours(day, 0.5), lat);  // ~01:00
  const dawn = altaz(...ALNILAM, lstHours(day, 1), lat);     // 06:00
  // Azimuth increases through the night: eastern sky (az<180) → south → west (az>180).
  assert.ok(dusk.az < night.az && night.az < dawn.az, `az ${dusk.az} ${night.az} ${dawn.az}`);
  // It is highest near the southern meridian (deep night), not at dusk or dawn.
  assert.ok(night.alt > dusk.alt && night.alt > dawn.alt);
});

test('Canopus is hidden in the north but rises into view as the crew rows south', () => {
  // Near the start (28°N) Canopus barely clears (or misses) the horizon at its best;
  // near the end (14°N) it climbs meaningfully higher.
  const best = voy => {
    const lat = latForVoyage(voy);
    let max = -90;
    for (let clk = 0; clk <= 1; clk += 0.05) max = Math.max(max, altaz(...CANOPUS, lstHours(20, clk), lat).alt);
    return max;
  };
  const north = best(0), south = best(1);
  assert.ok(south > north + 5, `south ${south} vs north ${north}`);
  assert.ok(south > 10, 'Canopus should be comfortably up near St Lucia');
});

test('the voyage carries the observer from 28°N down to 14°N', () => {
  assert.equal(Math.round(latForVoyage(0)), 28);
  assert.equal(Math.round(latForVoyage(1)), 14);
  assert.ok(raSun(1) > 0 && raSun(1) < 24);
});

test('the sun is high at local noon and below the horizon at local midnight (Auto engine)', () => {
  // Boat mid-Atlantic ~18°N, 40°W → solar noon ≈ 14:40 UTC (40°W = +2h40 from GMT).
  const lat = 18, lon = -40;
  const noon = sunAltitudeDeg(new Date(Date.UTC(2025, 11, 20, 14, 40)), lat, lon);
  const midnight = sunAltitudeDeg(new Date(Date.UTC(2025, 11, 20, 2, 40)), lat, lon);
  assert.ok(noon > 40, `noon altitude ${noon} should be high`);
  assert.ok(midnight < -20, `midnight altitude ${midnight} should be well below horizon`);
});

test('sun altitude maps to day / dusk-dawn / deep-night themes', () => {
  assert.equal(themeForSunAltitude(30), 'day');       // sun well up
  assert.equal(themeForSunAltitude(0), 'day');        // at the horizon, still readable daylight
  assert.equal(themeForSunAltitude(-5), 'dark');      // civil twilight → calm dark
  assert.equal(themeForSunAltitude(-20), 'night');    // properly dark → night vision
});
