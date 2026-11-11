import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ANIMATED_KNOTS, KNOT_GROUPS } from '../js/data/knot-library.js';
import { drawFrame, prep } from '../js/knot-engine.js';
import { parentRoute, primaryTab } from '../js/navigation.js';

const viewSource = (await readFile(new URL('../js/views/knots.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export function renderKnots', 'function renderKnots');
const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');

function renderGuide(id = 'bowline', { reduced = false, canvasAvailable = true } = {}) {
  const nodes = [], frames = new Map(), draws = [], errors = [], observers = [];
  const controller = new AbortController();
  const document = Object.assign(new EventTarget(), {
    hidden: false, documentElement: { getAttribute() { return 'day'; } }
  });
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const window = Object.assign(new EventTarget(), { matchMedia: () => media });
  let nextFrame = 0, clock = 0;
  const view = { children: [], append(...children) { this.children.push(...children); } };
  function h(tag, attrs = {}, children = []) {
    const node = {
      tag, tagName: tag.toUpperCase(), ...attrs, textContent: typeof children === 'string' ? children : '',
      children: Array.isArray(children) ? children : [children], events: {},
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, callback) { this.events[name] = callback; },
      getContext() { return canvasAvailable ? { setTransform() {}, clearRect() {} } : null; }
    };
    for (const [key, value] of Object.entries(attrs))
      if (key.startsWith('on')) node.events[key.slice(2)] = value;
    nodes.push(node);
    return node;
  }
  const render = runInNewContext(viewSource + '\nrenderKnots;', {
    h, ANIMATED_KNOTS, KNOT_GROUPS, document, window,
    drawFrame(context, knot, step, u) { draws.push({ knot, step, u }); },
    getComputedStyle() { return { getPropertyValue() { return '#000000'; } }; },
    console: { error(...args) { errors.push(args); } },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() { this.connected = true; }
      disconnect() { this.connected = false; }
    },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(frame) { frames.delete(frame); }
  });
  render(view, id, controller.signal);
  return {
    nodes, frames, document, window, media, controller, draws, errors, observers,
    find(text) { return nodes.find(node => node.textContent === text); },
    click(node) { if (!node.disabled) node.events.click(); },
    tick(count = 1) {
      for (let i = 0; i < count; i++) {
        clock += 100;
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach(callback => callback(clock));
      }
    }
  };
}

function drawingContext() {
  const colors = new Set();
  const context = {};
  for (const name of ['beginPath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'quadraticCurveTo',
    'fillRect', 'fillText', 'stroke', 'fill', 'closePath', 'save', 'restore', 'setLineDash']) {
    context[name] = (...args) => {
      for (const value of args.flat())
        if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name}: non-finite geometry`);
    };
  }
  context.measureText = text => ({ width: text.length * 8 });
  for (const name of ['strokeStyle', 'fillStyle'])
    Object.defineProperty(context, name, { set(value) { colors.add(value); } });
  return { context, colors };
}

test('all fourteen animated routes are grouped under Boat; legacy links still resolve', () => {
  assert.equal(primaryTab('knots'), 'boat');
  assert.equal(parentRoute('knots'), '#/boat');
  assert.equal(parentRoute('knots', 'bowline'), '#/knots');
  const ids = ANIMATED_KNOTS.map(knot => knot.id);
  assert.equal(new Set(ids).size, 14);
  assert.deepEqual(KNOT_GROUPS.flatMap(group => group.ids), ids);
  const guide = renderGuide('');
  assert.deepEqual(guide.nodes.filter(node => node.tag === 'a').map(node => node.href),
    ids.map(id => '#/knots/' + id));
  for (const [alias, id] of [['round-turn', 'round-turn-two-half-hitches'], ['figure-eight', 'figure-eight-stopper']])
    assert.ok(renderGuide(alias).nodes.some(node => node.tag === 'h2'
      && node.textContent === ANIMATED_KNOTS.find(knot => knot.id === id).name));
  assert.ok(renderGuide('no-such-knot').find('Knot not found'));
  assert.ok(!renderGuide().nodes.some(node => node.tag === 'img'));
  assert.ok(!worker.includes('references/knots/'));
  for (const module of ['js/views/knots.js', 'js/data/knot-library.js', 'js/knot-engine.js'])
    assert.ok(worker.includes(`'./${module}'`), module);
});

test('all 81 supplied steps prepare and draw valid geometry with a red-only night palette', () => {
  assert.equal(ANIMATED_KNOTS.reduce((count, knot) => count + knot.steps.length, 0), 81);
  for (const knot of ANIMATED_KNOTS) {
    assert.ok(knot.caution && knot.use && knot.tips.length, knot.id);
    assert.equal(prep(knot).steps.length, knot.steps.length);
    for (const [step, instruction] of knot.steps.entries()) {
      assert.ok(instruction.title && instruction.caption, knot.id);
      for (const night of [false, true]) {
        const { context, colors } = drawingContext();
        for (const u of [0, 0.5, 1]) drawFrame(context, knot, step, u, {
          night, text: '#ff0000', muted: '#b00000', labelBg: '#130000', ghost: '#e00000', accent: '#ff0000'
        });
        if (night) for (const color of colors)
          assert.match(color, /^(#[0-9a-f]{2}0000|rgba\(\d+,0,0,[\d.]+\))$/i, `${knot.id}: ${color}`);
      }
    }
  }
});

test('manual steps, storyboard, keyboard and playback keep the same instruction selected', () => {
  const knot = ANIMATED_KNOTS[0], guide = renderGuide(knot.id);
  const previous = guide.find('Previous step'), next = guide.find('Next step');
  const play = guide.find('Play animation');
  const progress = guide.nodes.find(node => node.class === 'knot-animation-step');
  const player = guide.nodes.find(node => node.class === 'card knot-animation');
  const canvas = guide.nodes.find(node => node.class === 'knot-canvas');
  assert.equal(guide.frames.size, 0, 'starts paused');
  assert.equal(previous.disabled, true);
  guide.click(next);
  assert.equal(progress.textContent, `Step 2 of ${knot.steps.length}`);
  assert.match(canvas['aria-label'], new RegExp(knot.steps[1].title));
  guide.click(previous);
  guide.click(play);
  assert.equal(play['aria-pressed'], 'true');
  guide.tick(1000);
  assert.equal(next.disabled, true);
  assert.equal(play['aria-pressed'], 'false');
  assert.equal(guide.frames.size, 0);
  guide.click(play);
  assert.equal(progress.textContent, `Step 1 of ${knot.steps.length}`, 'play restarts after the last step');
  guide.click(next);
  assert.equal(guide.frames.size, 0, 'manual navigation pauses');
  const thumbs = guide.nodes.filter(node => node.class === 'knot-thumb');
  guide.click(thumbs.at(-1));
  assert.equal(thumbs.at(-1)['aria-current'], 'step');
  player.events.keydown({ key: 'ArrowLeft', target: canvas, preventDefault() {} });
  assert.equal(thumbs.at(-2)['aria-current'], 'step');
  guide.click(guide.find('Restart'));
  assert.equal(progress.textContent, `Step 1 of ${knot.steps.length}`);
  assert.equal(guide.frames.size, 1);
  guide.controller.abort();
});

test('speed changes timing; reduced motion uses static frames and pauses on preference changes', () => {
  function advance(rate) {
    const guide = renderGuide();
    const speed = guide.nodes.find(node => node.tag === 'select');
    speed.value = rate;
    speed.events.change();
    guide.click(guide.find('Play animation'));
    guide.tick(25);
    const step = guide.nodes.find(node => node.class === 'knot-animation-step').textContent;
    guide.controller.abort();
    return step;
  }
  assert.match(advance('0.5'), /^Step 1/);
  assert.match(advance('1.5'), /^Step 2/);
  const guide = renderGuide('bowline', { reduced: true });
  guide.click(guide.find('Play animation'));
  guide.tick(100);
  assert.ok(guide.draws.every(draw => draw.u === 1), 'no interpolated motion');
  const event = Object.assign(new Event('change'), { matches: false });
  guide.media.dispatchEvent(event);
  assert.equal(guide.frames.size, 0);
  guide.controller.abort();
});

test('rope movement can override iOS reduced motion and be turned off again', () => {
  const guide = renderGuide('bowline', { reduced: true });
  const animate = guide.nodes.find(node => node.id === 'knotAnimate');
  const play = guide.find('Play animation');
  assert.equal(animate.checked, false, 'respects device preference initially');
  guide.click(guide.find('Next step'));
  animate.checked = true;
  animate.events.change();
  const start = guide.draws.length;
  guide.click(play);
  guide.tick(10);
  const moving = guide.draws.slice(start);
  assert.ok(moving.every(draw => draw.step === 1), 'animates the selected step');
  assert.ok(moving.some(draw => draw.u > 0 && draw.u < 1), 'renders intermediate rope positions');
  assert.ok(moving.at(-1).u > moving[0].u, 'motion progresses between animation frames');
  animate.checked = false;
  animate.events.change();
  assert.equal(guide.frames.size, 0, 'changing motion pauses playback');
  const stopped = guide.draws.length;
  guide.click(play);
  guide.tick(50);
  assert.ok(guide.draws.slice(stopped).every(draw => draw.u === 1), 'can return to static steps');
  animate.checked = true;
  animate.events.change();
  guide.click(play);
  guide.media.dispatchEvent(Object.assign(new Event('change'), { matches: true }));
  assert.equal(animate.checked, false, 'a new device preference resets the override');
  assert.equal(guide.frames.size, 0);
  guide.controller.abort();
});

test('backgrounding, emergency opening, page hide and route abort cancel playback', () => {
  const guide = renderGuide(), play = guide.find('Play animation');
  guide.click(play);
  guide.document.hidden = true;
  guide.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(guide.frames.size, 0);
  guide.document.hidden = false;
  guide.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(guide.frames.size, 0, 'foregrounding does not resume playback');
  for (const event of ['emergencyopen', 'pagehide']) {
    guide.click(play);
    guide.window.dispatchEvent(new Event(event));
    assert.equal(guide.frames.size, 0, event);
  }
  guide.click(play);
  guide.controller.abort();
  assert.equal(guide.frames.size, 0);
  assert.ok(guide.observers.every(observer => !observer.connected));
  guide.click(play);
  assert.equal(guide.frames.size, 0, 'aborted controls cannot restart playback');
});

test('missing canvas explicitly reports failure but keeps written steps usable', () => {
  const guide = renderGuide('bowline', { canvasAvailable: false });
  assert.equal(guide.errors.length, 1);
  assert.equal(guide.find('Play animation').disabled, true);
  assert.ok(guide.nodes.some(node => node.role === 'status' && node.hidden === false));
  assert.equal(guide.nodes.find(node => node.class === 'knot-canvas').hidden, true);
  guide.click(guide.find('Next step'));
  assert.equal(guide.nodes.find(node => node.class === 'knot-instruction').textContent,
    ANIMATED_KNOTS[0].steps[1].caption);
  assert.equal(guide.frames.size, 0);
  guide.controller.abort();
});
