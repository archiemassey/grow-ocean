import { configureVoice } from './speech.js';

export const HANDS_FREE_CATEGORIES = new Set(['jokes', 'trivia', 'wyr', 'conversation']);
const cancelled = () => Object.assign(new Error('Playback cancelled'), { name: 'AbortError' });

/* Completion is speech-aware; watchdogs fall back to visual playback if a
   browser refuses to start or never reports completion. */
export function createSpeechReader({
  synthesis = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  timers = globalThis
} = {}) {
  return {
    available: !!(synthesis && Utterance),
    say(text, signal) {
      return new Promise((resolve, reject) => {
        if (!synthesis || !Utterance) { reject(new Error('Speech is unavailable')); return; }
        if (signal.aborted) { reject(cancelled()); return; }
        const utterance = new Utterance(text);
        configureVoice(utterance, synthesis);
        let finished = false, timeout;
        function finish(error, stop = false) {
          if (finished) return;
          finished = true;
          timers.clearTimeout(timeout);
          signal.removeEventListener('abort', abort);
          utterance.onstart = utterance.onend = utterance.onerror = null;
          if (stop) synthesis.cancel();
          if (error) reject(error); else resolve();
        }
        const abort = () => finish(cancelled(), true);
        utterance.onend = () => finish();
        utterance.onerror = event => finish(new Error('Speech failed: ' + event.error), true);
        utterance.onstart = () => {
          if (finished) return;
          timers.clearTimeout(timeout);
          // Long Wiki articles need more time than short entertainment prompts.
          const words = text.trim().split(/\s+/).length;
          const duration = Math.max(120000, words * 1000 / Math.max(0.1, utterance.rate || 1) + 30000);
          timeout = timers.setTimeout(() => finish(new Error('Speech did not finish'), true), duration);
        };
        signal.addEventListener('abort', abort, { once: true });
        timeout = timers.setTimeout(() => finish(new Error('Speech did not finish starting'), true), 6000);
        try { synthesis.cancel(); synthesis.speak(utterance); }
        catch (error) { finish(error, true); }
      });
    }
  };
}

export function createHandsFreePlayer({
  deck, speech, timers = globalThis, onItem = () => {}, onStatus = () => {}
}) {
  let mode = 'idle', phase = 'draw', session = 0, generation = 0;
  let current = null, pendingDraw = null, controller = null;
  let options = { audio: true, pace: 'normal', auto: false };
  let audioWarning = '';
  let status = { mode, phase, auto: false, message: 'Tap Next when you’re ready.', remaining: null };
  const active = token => mode === 'running' && token === generation;
  function report(message, remaining = null) {
    status = { mode, phase, auto: options.auto, message: audioWarning + message, remaining };
    onStatus(status);
  }
  function cancel() {
    generation++;
    controller?.abort();
    controller = null;
  }
  function stop(message = 'Tap Next when you’re ready.') {
    cancel();
    session++;
    mode = 'idle'; phase = 'draw'; current = null; options.auto = false;
    report(message);
  }
  async function countdown(seconds, label, signal) {
    for (let left = seconds; left > 0; left--) {
      if (signal.aborted) throw cancelled();
      report(label, left);
      await new Promise((resolve, reject) => {
        const abort = () => { timers.clearTimeout(timer); reject(cancelled()); };
        const timer = timers.setTimeout(() => {
          signal.removeEventListener('abort', abort);
          resolve();
        }, 1000);
        signal.addEventListener('abort', abort, { once: true });
      });
    }
  }
  function duration(gap = false) {
    const category = deck.snapshot().category;
    const seconds = gap ? 3 : category === 'jokes' ? 3 : category === 'trivia' ? 10 : 20;
    return Math.max(1, Math.round(seconds * ({ short: 0.5, normal: 1, long: 2 }[options.pace] || 1)));
  }
  async function read(text, signal) {
    if (!options.audio) return;
    try {
      if (!speech.available) throw new Error('Speech unavailable');
      await speech.say(text, signal);
    } catch (error) {
      if (error.name === 'AbortError' || signal.aborted) throw cancelled();
      options.audio = false;
      audioWarning = 'Audio unavailable — continuing on screen. ';
      report('The answer will still appear.');
    }
  }
  async function run(token, ownSession) {
    const signal = controller.signal;
    try {
      // A cancelled IndexedDB write must finish before another draw or category change.
      await pendingDraw;
      while (active(token)) {
        if (phase === 'draw') {
          report('Saving the next unseen item…');
          pendingDraw = deck.next({ freshOnly: true });
          let result;
          try { result = await pendingDraw; }
          finally { pendingDraw = null; }
          if (ownSession !== session) return;
          current = result;
          phase = 'prompt';
          if (!active(token)) return;
          if (!current) { stop('All items seen. Stopped; reset manually only when you want repeats.'); return; }
        } else if (phase === 'prompt') {
          if (!current) { stop('All items seen. Stopped; reset manually only when you want repeats.'); return; }
          onItem(current);
          report(options.audio ? 'Reading prompt…' : 'Read the prompt on screen.');
          await read([current.prompt, current.instructions].filter(Boolean).join('. '), signal);
          if (!active(token)) return;
          phase = current.canReveal ? 'think' : current.answer ? 'answer' : 'gap';
        } else if (phase === 'think') {
          await countdown(duration(), 'Answer in', signal);
          if (!active(token)) return;
          current = deck.reveal();
          onItem(current);
          phase = 'answer';
        } else if (phase === 'answer') {
          report(options.audio ? 'Reading answer…' : 'Answer shown.');
          await read(current.answer, signal);
          if (!active(token)) return;
          phase = 'gap';
        } else {
          if (!options.auto || !HANDS_FREE_CATEGORIES.has(current.category)) {
            stop(deck.snapshot().exhausted ? 'All seen. Choose another category or reset in settings.' : 'Take your time. Tap Next when you’re ready.');
            return;
          }
          // No-answer prompts need time to read/discuss, especially in visual mode.
          const seconds = current.item.answer ? duration(true) : duration();
          await countdown(seconds, 'Next unseen item in', signal);
          if (!active(token)) return;
          if (deck.snapshot().exhausted) {
            stop('All items seen. Stopped; reset manually only when you want repeats.');
            return;
          }
          phase = 'draw';
        }
      }
    } catch (error) {
      if (ownSession === session && error.name !== 'AbortError') stop('Could not save the next item: ' + error.message + '. Please try again.');
    }
  }
  function launch() {
    cancel();
    mode = 'running';
    controller = new AbortController();
    report('Here we go…');
    void run(generation, session);
  }
  return {
    start(settings = {}) {
      stop();
      audioWarning = '';
      if (!HANDS_FREE_CATEGORIES.has(deck.snapshot().category)) {
        report('Hands-free is for jokes, trivia, Would you rather and conversation. Games/challenges stay manual.');
        return;
      }
      options = { ...options, ...settings, auto: true };
      launch();
    },
    present(settings = {}) {
      stop();
      audioWarning = '';
      options = { ...options, ...settings };
      options.auto = !!options.auto && HANDS_FREE_CATEGORIES.has(deck.snapshot().category);
      current = deck.snapshot();
      if (!current.item) return;
      phase = 'prompt';
      launch();
    },
    setAuto(value, settings = {}) {
      const enableAudio = settings.audio && !options.audio;
      options.auto = !!value && HANDS_FREE_CATEGORIES.has(deck.snapshot().category);
      if (mode === 'running') {
        if (options.auto) {
          options = { ...options, ...settings, auto: true };
          if (enableAudio && current?.canReveal) {
            this.present({ ...options });
            return;
          }
        }
        if (!options.auto && phase === 'gap') stop('Auto off. Tap Next when you’re ready.');
        else report(options.auto ? 'Auto on · Next keeps it going.' : 'Auto off · The answer will still appear.');
      } else if (options.auto) {
        if (!deck.snapshot().item) this.start(settings);
        else {
          stop();
          audioWarning = '';
          options = { ...options, ...settings, auto: true };
          current = deck.snapshot();
          phase = current.canReveal ? 'prompt' : 'gap';
          launch();
        }
      } else report('Auto off. Tap Next when you’re ready.');
    },
    pause(message = 'Paused. Resume replays the current speech or restarts its countdown; no new draw.') {
      if (mode !== 'running') return;
      cancel(); mode = 'paused'; report(message);
    },
    resume() {
      if (mode !== 'paused') return;
      launch();
    },
    stop,
    settled: () => pendingDraw || Promise.resolve(),
    snapshot: () => status
  };
}
