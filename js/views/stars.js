/* stars.js — the Voyage Star Guide.
   A calm, offline "perspective for this shift": a real projection of the night
   sky for the crew's latitude and the hour of their watch, so the major
   constellations sit where they truly are and wheel across the night exactly as
   they will over the boat. No network, no data feed — pure geometry.

   The sky is drawn from actual star coordinates (right ascension / declination),
   projected to altitude/azimuth for the observer, so:
     • constellations rise in the east, culminate in the south and set in the west
       as you drag the time-of-night slider (or press Play);
     • as the voyage slider carries you south (28°N → 14°N) Polaris sinks and the
       southern stars — Canopus, then a low Southern Cross — climb into view.
   It honours the app theme: in Night-vision it redraws red-on-black to protect
   dark-adapted eyes. */

import { h } from '../app.js';
import { CONSTELLATIONS, altaz, latForVoyage, hoursAfterMidnight, lstHours } from '../star-math.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const W = 600, H = 360, HZ = 300;   // horizon y
const AZ0 = 60, AZ1 = 300;          // azimuth window (ENE..WNW) mapped left→right
const ALTMAX = 78;

function project(alt, az) {
  let a = az; if (a > 300 && a <= 360) a -= 360;
  const x = (a - AZ0) / (AZ1 - AZ0) * (W - 40) + 20;
  const y = HZ - (Math.min(alt, ALTMAX) / ALTMAX) * (HZ - 26);
  return { x, y, vis: a >= AZ0 - 8 && a <= AZ1 + 8 && alt > 0.5 };
}

/* Palette per theme so Night-vision protects dark-adapted eyes. */
function palette() {
  if (document.documentElement.getAttribute('data-theme') === 'night')
    return { night: true, sky0: '#000', sky1: '#0a0000', sky2: '#140000', sea0: '#0a0000', sea1: '#000',
      star: '#ff6a4a', warm: '#ff8a5a', cool: '#ff7a6a', line: 'rgba(255,90,60,.4)', con: '#ff5a4a', lab: '#ff8a6a',
      bg: '#3a0000', glow: '#2a0000', arc: 'rgba(255,80,60,.14)', horizon: '#4a1010' };
  return { night: false, sky0: '#070d24', sky1: '#0e1636', sky2: '#182140', sea0: '#0b1b2a', sea1: '#04080f',
    star: '#fff', warm: '#ffb27a', cool: '#bcd6ff', line: 'rgba(127,159,240,.42)', con: '#a9c2ff', lab: '#dfe8ff',
    bg: '#8fa4d8', glow: '#16304e', arc: 'rgba(95,121,192,.14)', horizon: '#3a4d6b' };
}

function svgEl(n, a) { const e = document.createElementNS(SVGNS, n); for (const k in a) e.setAttribute(k, a[k]); return e; }

export function renderStars(view) {
  let voy = 0.04, clk = 0, playTimer = null;

  const sky = svgEl('svg', { id: 'sky', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'The night sky looking south' });
  const dayLabel = h('b', {}, 'Day 1');
  const legLabel = h('span', { class: 'sub sg-inline' }, '');
  const clockLabel = h('span', {}, '');
  const phaseTag = h('span', { class: 'tag' }, 'Dusk');
  const nowTitle = h('span', {}, 'What’s up now');
  const nowBody = h('p', {}, '');
  const special = h('div', { class: 'special' }, '');
  const awe = h('p', { class: 'awe' }, '');
  const polarisNote = h('div', { class: 'polaris-note' }, '');

  const voyRange = h('input', { type: 'range', min: '0', max: '100', value: '4', 'aria-label': 'Voyage progress',
    oninput: e => { voy = +e.target.value / 100; draw(); } });
  const clkRange = h('input', { type: 'range', min: '0', max: '100', value: '0', 'aria-label': 'Time through the night',
    oninput: e => { clk = +e.target.value / 100; stopPlay(); draw(); } });

  const phaseBtns = [['🌆 Dusk', 0], ['🌌 Deep night', 0.5], ['🌅 Pre-dawn', 1]].map(([lbl, v], i) =>
    h('button', { type: 'button', 'data-p': String(i), 'aria-pressed': i === 0 ? 'true' : 'false',
      onclick: () => { clk = v; clkRange.value = String(v * 100); stopPlay(); setPressed(i); draw(); } }, lbl));
  const playBtn = h('button', { type: 'button', class: 'sg-play', 'aria-label': 'Play the night turning' }, '▶');
  function setPressed(i) { phaseBtns.forEach((b, j) => b.setAttribute('aria-pressed', i === j ? 'true' : 'false')); }
  function stopPlay() { if (playTimer) { clearInterval(playTimer); playTimer = null; playBtn.textContent = '▶'; } }
  playBtn.addEventListener('click', () => {
    if (playTimer) { stopPlay(); return; }
    playBtn.textContent = '⏸';
    playTimer = setInterval(() => { clk += 0.01; if (clk > 1) clk = 0; clkRange.value = String(clk * 100); draw(); }, 80);
  });

  function starDot(x, y, mag, kind, p) {
    const r = Math.max(0.7, 3.4 - 0.42 * mag);
    const col = kind === 'warm' ? p.warm : kind === 'cool' ? p.cool : p.star;
    const g = svgEl('g', {});
    if (r >= 2.2) g.appendChild(svgEl('circle', { cx: x, cy: y, r: r * 2.6, fill: col, 'fill-opacity': p.night ? 0.12 : 0.18 }));
    g.appendChild(svgEl('circle', { cx: x, cy: y, r, fill: col, 'fill-opacity': Math.min(1, 1.15 - 0.08 * mag) }));
    return g;
  }
  function text(x, y, t, cls, p) {
    const e = svgEl('text', { x, y, fill: cls === 'con' ? p.con : p.lab, 'fill-opacity': cls === 'con' ? 0.78 : 0.9,
      'font-size': cls === 'con' ? 10 : 11, 'font-weight': cls === 'con' ? 700 : 400,
      'font-family': 'Segoe UI,sans-serif', 'text-anchor': 'middle', 'letter-spacing': cls === 'con' ? '0.06em' : '0' });
    e.textContent = t; return e;
  }

  function draw() {
    const p = palette();
    sky.replaceChildren();
    const day = Math.max(1, Math.round(1 + voy * 43));
    const lat = latForVoyage(voy);
    const lst = lstHours(day, clk);

    const defs = svgEl('defs', {});
    const grad = svgEl('linearGradient', { id: 'sg', x1: 0, y1: 0, x2: 0, y2: 1 });
    [['0%', p.sky0], ['62%', p.sky1], ['100%', p.sky2]].forEach(([o, c]) => grad.appendChild(svgEl('stop', { offset: o, 'stop-color': c })));
    defs.appendChild(grad);
    const sea = svgEl('linearGradient', { id: 'sea', x1: 0, y1: 0, x2: 0, y2: 1 });
    sea.appendChild(svgEl('stop', { offset: '0%', 'stop-color': p.sea0 }));
    sea.appendChild(svgEl('stop', { offset: '100%', 'stop-color': p.sea1 }));
    defs.appendChild(sea); sky.appendChild(defs);
    sky.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#sg)' }));

    let s = 42; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < 130; i++) {
      const r = rnd() * 1.1 + 0.3;
      sky.appendChild(svgEl('circle', { cx: rnd() * W, cy: rnd() * HZ, r, fill: p.bg, 'fill-opacity': (0.25 + rnd() * 0.4).toFixed(2) }));
    }
    for (let k = 0; k < 3; k++) {
      const yc = 90 + k * 58;
      sky.appendChild(svgEl('path', { d: `M20,${HZ - 6} Q300,${yc} 580,${HZ - 6}`, fill: 'none', stroke: p.arc, 'stroke-width': 1, 'stroke-dasharray': '2 7' }));
    }
    sky.appendChild(svgEl('rect', { x: 0, y: HZ - 70, width: W, height: 70, fill: p.glow, 'fill-opacity': (0.06 + voy * 0.16).toFixed(3) }));

    CONSTELLATIONS.forEach(c => {
      const pts = c.stars.map(st => ({ ...project(...(({ alt, az }) => [alt, az])(altaz(st[1], st[2], lst, lat))), name: st[0], mag: st[3], kind: st[4] }));
      c.lines.forEach(([a, b]) => { if (pts[a].vis && pts[b].vis)
        sky.appendChild(svgEl('line', { x1: pts[a].x, y1: pts[a].y, x2: pts[b].x, y2: pts[b].y, stroke: p.line, 'stroke-width': 1 })); });
      let vx = 0, vy = 0, vn = 0;
      pts.forEach(o => { if (!o.vis) return; sky.appendChild(starDot(o.x, o.y, o.mag, o.kind, p));
        if (o.name) sky.appendChild(text(o.x, o.y - 9, o.name, 'star', p)); vx += o.x; vy += o.y; vn++; });
      if (vn >= Math.max(2, c.stars.length - 1)) sky.appendChild(text(vx / vn, vy / vn + 16, c.name, 'con', p));
    });

    sky.appendChild(svgEl('rect', { x: 0, y: HZ, width: W, height: H - HZ, fill: 'url(#sea)' }));
    sky.appendChild(svgEl('line', { x1: 0, y1: HZ, x2: W, y2: HZ, stroke: p.horizon, 'stroke-width': 1 }));
    [['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270]].forEach(([t, az]) => {
      const x = (az - AZ0) / (AZ1 - AZ0) * (W - 40) + 20; sky.appendChild(text(x, HZ + 34, t, 'star', p));
    });
    sky.appendChild(text(300, HZ + 52, '— looking south —', 'star', p));
    updateText(day, lat);
  }

  function updateText(day, lat) {
    const pl = Math.round(lat);
    const seg = clk < 0.28 ? 0 : clk < 0.72 ? 1 : 2;
    const hh = (24 + Math.round(hoursAfterMidnight(clk))) % 24;
    const em = seg === 0 ? '🌆' : seg === 1 ? '🌌' : '🌅';
    const word = seg === 0 ? 'dusk' : seg === 1 ? 'deep night' : 'pre-dawn';
    dayLabel.textContent = 'Day ' + day;
    legLabel.textContent = voy < 0.15 ? 'leaving the Canaries' : voy < 0.5 ? 'open ocean' : voy < 0.85 ? 'mid-Atlantic' : 'nearing the Caribbean';
    clockLabel.textContent = em + ' ' + String(hh).padStart(2, '0') + ':00 · ' + word;
    phaseTag.textContent = seg === 0 ? 'Dusk' : seg === 1 ? 'Deep night' : 'Pre-dawn';
    polarisNote.innerHTML = '⬆ Behind you (north): <b>Polaris</b> sits ~<b>' + pl +
      '° up</b> — that’s your latitude, sinking lower as you row south. The whole sky turns around it.';

    const T = [
      ['Orion rising in the east', 'As the sky darkens, Orion climbs out of the eastern sea on your left, tilted on his side. His three belt stars point down to brilliant Sirius (Canis Major) and up to orange Aldebaran and the Pleiades cluster in Taurus.', 'Give your eyes 10–15 min to adapt and keep to red light — the winter showpieces are all about to rise.'],
      ['The winter sky blazing in the south', 'Orion now stands high due south over the bow, inside the huge Winter Hexagon — Sirius, Procyon, the Gemini twins Castor & Pollux, yellow Capella, Aldebaran and blue-white Rigel. The Milky Way’s winter arm runs overhead.', 'Darker than any sky at home. Watch satellites glide over and the odd shooting star cross the whole dome.'],
      ['The sky has wheeled west', 'Orion now leans into the western sea on your right, setting, while Leo and orange Arcturus climb in the east and — low in the SSE — Scorpius with red Antares. This is the whole sky turning in one night.', 'The blackest, quietest watch, and your best chance at the southern surprises breaking the horizon.']
    ][seg];
    nowTitle.textContent = T[0]; nowBody.textContent = T[1];

    let sp;
    if (voy < 0.18) sp = '🌟 <b>Right now:</b> Polaris still rides ~' + pl + '° high in the north. Every clear night it drops a touch lower — proof you’re rowing south.';
    else if (voy < 0.72) sp = '🌟 <b>New star unlocked:</b> <b>Canopus</b> (sky’s 2nd-brightest) now clears your southern horizon — you cannot see it from the UK. Polaris is down to ~' + pl + '°.';
    else if (seg === 2) sp = '🏆 <b>The prize:</b> low in the SSE before dawn the <b>Southern Cross</b> (Crux) and the Centaurus stars break the horizon — stars you rowed thousands of miles to earn.';
    else sp = '🌟 <b>Almost there:</b> Polaris is barely a fist (~' + pl + '°) over the northern sea. Slide to the pre-dawn watch to hunt the Southern Cross in the SSE.';
    special.innerHTML = sp;

    const AWE = ['“We are made of star-stuff — and tonight we’re rowing right underneath it.”',
      '“The same Orion has guided sailors for 3,000 years. Tonight he’s yours.”',
      '“No city, no other soul for a thousand miles — just you two and the entire galaxy.”',
      '“Every star you can see left home before you did, and travelled years to reach your eyes.”'];
    awe.textContent = AWE[(Math.round(voy * 3) + seg) % AWE.length];
  }

  const onTheme = () => draw();
  window.addEventListener('themechange', onTheme);

  view.append(
    h('h2', { class: 'sg-title' }, 'The sky over your shoulder'),
    h('p', { class: 'sub' }, 'Drag the voyage from La\u00a0Gomera to St\u00a0Lucia, choose the hour of your watch, and see what’s overhead. Illustrative — not to navigational scale.'),
    h('section', { class: 'card sg-controls' }, [
      h('div', { class: 'dayline' }, [dayLabel, legLabel]),
      h('div', { class: 'leglabel' }, [h('span', {}, '🇮🇨 La Gomera · 28°N'), h('span', {}, 'St Lucia · 14°N 🌴')]),
      voyRange,
      h('div', { class: 'leglabel sg-clock' }, [clockLabel, h('span', {}, 'the sky turns ~15°/hour →')]),
      clkRange,
      h('div', { class: 'sg-seg' }, [...phaseBtns, playBtn])
    ]),
    h('section', { class: 'card sg-sky' }, [sky, polarisNote]),
    h('section', { class: 'card sg-now' }, [
      h('h2', {}, [phaseTag, nowTitle]), nowBody, special, awe
    ]),
    h('section', { class: 'card' }, [
      h('h2', { class: 'sg-ms-head' }, '🌠 Sky milestones on the crossing'),
      h('ul', { class: 'sg-ms' }, [
        h('li', {}, [h('span', { class: 'sg-when' }, 'Day 1–7'), h('span', {}, [h('b', {}, 'Orion sets the scene.'), ' The great hunter owns the whole night — your constant companion for the crossing.'])]),
        h('li', {}, [h('span', { class: 'sg-when' }, 'Day 8–20'), h('span', {}, [h('b', {}, 'Canopus climbs.'), ' The sky’s 2nd-brightest star — invisible from the UK — clears the southern horizon. You’re properly south now.'])]),
        h('li', {}, [h('span', { class: 'sg-when' }, 'Day 20–35'), h('span', {}, [h('b', {}, 'Richest skies.'), ' Far from all land-glow, the winter Milky Way and thousands of stars fill the darkest watches.'])]),
        h('li', {}, [h('span', { class: 'sg-when' }, 'Day 35–44'), h('span', {}, [h('b', {}, 'Southern Cross teaser.'), ' In the last pre-dawn shifts a low Southern Cross and Centaurus appear in the SSE — stars you rowed thousands of miles to earn.'])])
      ])
    ])
  );

  draw();
}
