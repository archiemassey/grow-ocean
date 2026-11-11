import { h } from '../app.js';
import { ANIMATED_KNOTS, KNOT_GROUPS } from '../data/knot-library.js';
import { drawFrame } from '../knot-engine.js';

const aliases = { 'round-turn': 'round-turn-two-half-hitches', 'figure-eight': 'figure-eight-stopper' };
const canonicalId = id => aliases[id] || id;

function knotList(view) {
  view.append(
    h('h2', {}, 'Knot guide'),
    h('p', { class: 'sub' }, 'Fourteen animated knots, with written steps and storyboards you can use offline.'),
    h('p', { class: 'callout' },
      'Practise with an instructor. For safety-critical connections, follow the approved procedure for your boat.'),
    ...KNOT_GROUPS.flatMap(group => [
      h('h3', {}, group.name),
      ...group.ids.map(id => {
        const knot = ANIMATED_KNOTS.find(item => item.id === id);
        return h('a', { class: 'listrow', href: '#/knots/' + knot.id }, [
          h('span', { class: 'body' }, [
            h('span', { class: 't' }, knot.name), h('span', { class: 'd' }, knot.use)
          ]),
          h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')
        ]);
      })
    ])
  );
}

function animationPlayer(knot, signal) {
  let step = 0, elapsed = 0, frame = null, last = null, playing = false, speed = 1, failed = false;
  // Movement only runs after the user presses Play, so it is on by default even when
  // iOS Reduce Motion is set; the switch below gives still pictures instead.
  const animate = h('input', { type: 'checkbox', id: 'knotAnimate' });
  animate.checked = true;
  const speeds = [0.5, 1, 1.5];
  const height = knot.height || 800;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = h('canvas', { class: 'knot-canvas', width: 600 * dpr, height: height * dpr,
    role: 'img', tabindex: '0' }, 'The written instructions describe each step below.');
  const context = canvas.getContext('2d');
  const progress = h('p', { class: 'knot-animation-step' });
  const title = h('h3', { class: 'knot-animation-title' });
  const caption = h('p', { class: 'knot-instruction' });
  const error = h('p', { class: 'callout', role: 'status', hidden: true },
    'Animation unavailable on this device. You can still follow the written steps below.');
  const bar = h('progress', { class: 'knot-animation-progress', max: 1, value: 0,
    'aria-label': 'Current step playback' });
  const key = (cls, glyph, label, extra = {}) => h('button', { type: 'button', class: 'dp ' + cls,
    'aria-label': label, title: label, ...extra }, glyph);
  const restart = key('up', '↺', 'Restart');
  const previous = key('left', '‹', 'Previous step');
  const play = key('mid play', '▶', 'Play animation', { 'aria-pressed': 'false' });
  const next = key('right', '›', 'Next step');
  const rate = key('down rate', '1×', 'Speed 1x. Change speed');
  const pad = h('div', { class: 'dpad knot-pad', role: 'group', 'aria-label': 'Animation controls' },
    [restart, previous, play, next, rate]);
  const stepButtons = knot.steps.map((item, index) => h('button', {
    type: 'button', onclick: () => selectStep(index)
  }, `${index + 1}. ${item.title}`));
  const thumbnails = knot.steps.map((item, index) => {
    const picture = h('canvas', { width: 240 * dpr, height: Math.round(height * 0.4 * dpr),
      'aria-hidden': 'true' });
    return { picture, context: picture.getContext('2d'), button: h('button', {
      type: 'button', class: 'knot-thumb', onclick: () => selectStep(index)
    }, [picture, h('span', {}, `${index + 1}. ${item.title}`)]) };
  });
  const board = h('div', { class: 'knot-storyboard' }, thumbnails.map(item => item.button));
  const player = h('section', { class: 'card knot-animation', 'aria-label': 'Animated knot steps' }, [
    h('div', { class: 'knot-stage' }, [
      h('div', { class: 'knot-canvas-surface' }, canvas),
      h('div', { class: 'knot-side' }, [pad, h('div', { class: 'knot-now' }, [
        h('div', { 'aria-live': 'polite', 'aria-atomic': 'true' }, [progress, title, caption]), bar
      ])])
    ]), error,
    h('p', { class: 'knot-pad-key' },
      '↺ restart · ‹ › previous and next step · ▶ play or pause · 1× change speed'),
    h('div', { class: 'check' }, [animate, h('label', { for: 'knotAnimate' }, 'Animate rope movement')]),
    h('p', { class: 'sub' }, 'Turn off to see a still picture for each step.'),
    h('p', { class: 'knot-legend' },
      'Marked tip = working end. Dashed line = next movement. Arrow = pull.'),
    h('p', { class: 'knot-night-warning' },
      'Night vision uses red brightness instead of rope colours. Learn the colour references in daylight.'),
    h('ol', { class: 'knot-step-list', 'aria-label': 'Written steps' },
      stepButtons.map(button => h('li', {}, button))),
    h('details', { class: 'knot-storyboard-details' }, [h('summary', {}, 'Storyboard'), board])
  ]);

  function motion(index) { return index === 0 || !animate.checked ? 0 : (knot.steps[index].motion || 2.4); }
  function hold() { return step === 0 ? 1.8 : step === knot.steps.length - 1 ? 3.2 : 1.6; }
  function palette() {
    const night = document.documentElement.getAttribute('data-theme') === 'night';
    const css = getComputedStyle(document.documentElement);
    return night ? { night, text: '#ff0000', muted: '#b00000', labelBg: '#130000', ghost: '#e00000', accent: '#ff0000' }
      : { night, text: css.getPropertyValue('--ink').trim(), muted: css.getPropertyValue('--muted').trim(),
        labelBg: css.getPropertyValue('--card').trim(), ghost: css.getPropertyValue('--link').trim(),
        accent: css.getPropertyValue('--ok').trim() };
  }
  function stop() {
    playing = false; last = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    setPlayLabel(false);
  }
  function setPlayLabel(on) {
    const label = on ? 'Pause animation' : 'Play animation';
    play.textContent = on ? '❚❚' : '▶';
    play.setAttribute('aria-label', label);
    play.setAttribute('title', label);
    play.setAttribute('aria-pressed', String(on));
  }
  function unavailable(reason) {
    console.error('Knot animation failed', reason);
    failed = true; stop();
    canvas.hidden = true; board.hidden = true; error.hidden = false; play.disabled = true;
  }
  function paint() {
    if (failed || signal.aborted) return;
    try {
      if (!context) throw new Error('Canvas 2D is unavailable');
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const duration = motion(step);
      drawFrame(context, knot, step, duration ? Math.min(1, elapsed / duration) : 1, palette());
      bar.value = Math.min(1, elapsed / (duration + hold()));
    } catch (reason) { unavailable(reason); }
  }
  function drawBoard() {
    if (failed || signal.aborted) return;
    try {
      const theme = palette();
      thumbnails.forEach((item, index) => {
        if (!item.context) throw new Error('Storyboard canvas is unavailable');
        item.context.setTransform(1, 0, 0, 1, 0, 0);
        item.context.clearRect(0, 0, item.picture.width, item.picture.height);
        item.context.setTransform(0.4 * dpr, 0, 0, 0.4 * dpr, 0, 0);
        drawFrame(item.context, knot, index, 1, theme);
      });
    } catch (reason) { unavailable(reason); }
  }
  function updateText() {
    progress.textContent = `Step ${step + 1} of ${knot.steps.length}`;
    title.textContent = knot.steps[step].title;
    caption.textContent = knot.steps[step].caption;
    canvas.setAttribute('aria-label', `${knot.name}: ${title.textContent}. ${caption.textContent}`);
    previous.disabled = step === 0; next.disabled = step === knot.steps.length - 1;
    stepButtons.forEach((button, index) => button.setAttribute('aria-current', index === step ? 'step' : 'false'));
    thumbnails.forEach((item, index) => item.button.setAttribute('aria-current', index === step ? 'step' : 'false'));
  }
  function selectStep(index) {
    stop();
    step = index; elapsed = motion(step);
    updateText(); paint();
  }
  function tick(timestamp) {
    frame = null;
    if (!playing || signal.aborted || document.hidden) { stop(); return; }
    if (last !== null) {
      elapsed += Math.min(0.1, (timestamp - last) / 1000) * speed;
      if (elapsed >= motion(step) + hold()) {
        if (step === knot.steps.length - 1) { stop(); paint(); return; }
        step++; elapsed = 0; updateText();
      }
    }
    last = timestamp; paint();
    if (playing) frame = requestAnimationFrame(tick);
  }
  function start() {
    if (failed || signal.aborted || document.hidden) return;
    if (step === knot.steps.length - 1) selectStep(0);
    else if (elapsed >= motion(step)) elapsed = 0;
    playing = true; last = null;
    setPlayLabel(true);
    frame = requestAnimationFrame(tick);
  }
  previous.addEventListener('click', () => { if (step > 0) selectStep(step - 1); });
  next.addEventListener('click', () => { if (step < knot.steps.length - 1) selectStep(step + 1); });
  play.addEventListener('click', () => { if (playing) stop(); else start(); });
  restart.addEventListener('click', () => { selectStep(0); start(); });
  rate.addEventListener('click', () => {
    speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    rate.textContent = `${speed}×`;
    rate.setAttribute('aria-label', `Speed ${speed}x. Change speed`);
    rate.setAttribute('title', `Speed ${speed}x. Change speed`);
  });
  animate.addEventListener('change', () => {
    stop(); elapsed = 0; paint();
  });
  player.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' && step < knot.steps.length - 1) { event.preventDefault(); selectStep(step + 1); }
    else if (event.key === 'ArrowLeft' && step > 0) { event.preventDefault(); selectStep(step - 1); }
    else if (event.key === ' ' && event.target === canvas) {
      event.preventDefault(); if (playing) stop(); else start();
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal });
  window.addEventListener('pagehide', stop, { signal });
  window.addEventListener('emergencyopen', stop, { signal });
  const observer = new MutationObserver(() => { paint(); drawBoard(); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  signal.addEventListener('abort', () => { stop(); observer.disconnect(); }, { once: true });
  updateText(); paint(); drawBoard();
  return player;
}

export function renderKnots(view, id, signal) {
  if (!id) { knotList(view); return; }
  const knot = ANIMATED_KNOTS.find(item => item.id === canonicalId(id));
  if (!knot) {
    view.append(
      h('h2', {}, 'Knot not found'),
      h('p', { class: 'sub' }, 'Choose a knot from the guide.'),
      h('a', { class: 'listrow', href: '#/knots' }, 'See all knots')
    );
    return;
  }
  view.append(
    h('h2', {}, knot.name),
    h('p', { class: 'sub' }, knot.use),
    h('p', { class: 'callout crit' }, [h('strong', {}, 'Take care: '), knot.caution]),
    h('p', { class: 'knot-safety' },
      'Practise with an instructor. For safety-critical connections, follow the approved procedure for your boat.'),
    h('p', { class: 'knot-terms' },
      'The working end is the end you move; the standing part is the rest of the line.'),
    animationPlayer(knot, signal),
    h('section', { class: 'card knot-tips' }, [
      h('h3', {}, 'Tips at sea'), h('ul', {}, knot.tips.map(tip => h('li', {}, tip)))
    ])
  );
}
