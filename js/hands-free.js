export const HANDS_FREE_CATEGORIES = new Set(['jokes', 'trivia', 'wyr', 'conversation']);
const cancelled = () => Object.assign(new Error('Playback cancelled'), { name: 'AbortError' });

/* Keep the manual app.speak contract unchanged. Each utterance here completes
   only on onend; an interrupted, failed or stalled voice stops the sequence. */
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
        utterance.rate = 0.95;
        utterance.pitch = 1;
        let finished = false, timeout;
        function finish(error, stop = false) {
          if (finished) return;
          finished = true;
          timers.clearTimeout(timeout);
          signal.removeEventListener('abort', abort);
          utterance.onend = utterance.onerror = null;
          if (stop) synthesis.cancel();
          if (error) reject(error); else resolve();
        }
        const abort = () => finish(cancelled(), true);
        utterance.onend = () => finish();
        utterance.onerror = event => finish(new Error('Speech failed: ' + event.error), true);
        signal.addEventListener('abort', abort, { once: true });
        timeout = timers.setTimeout(() => finish(new Error('Speech did not finish'), true), 120000);
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
  let options = { audio: true, pace: 'normal' };
  let status = { mode, phase, message: 'Manual mode. Start hands-free when ready.', remaining: null };
  const active = token => mode === 'running' && token === generation;
  function report(message, remaining = null) {
    status = { mode, phase, message, remaining };
    onStatus(status);
  }
  function cancel() {
    generation++;
    controller?.abort();
    controller = null;
  }
  function stop(message = 'Stopped. Use Next or Start hands-free for an unseen item.') {
    cancel();
    session++;
    mode = 'idle'; phase = 'draw'; current = null;
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
          if (options.audio) await speech.say(current.prompt, signal);
          if (!active(token)) return;
          phase = current.item.answer ? 'think' : 'gap';
        } else if (phase === 'think') {
          await countdown(duration(), 'Answer in', signal);
          if (!active(token)) return;
          current = deck.reveal();
          onItem(current);
          phase = 'answer';
        } else if (phase === 'answer') {
          report(options.audio ? 'Reading answer…' : 'Answer shown.');
          if (options.audio) await speech.say(current.answer, signal);
          if (!active(token)) return;
          phase = 'gap';
        } else {
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
      if (ownSession === session && error.name !== 'AbortError') stop('Playback stopped: ' + error.message +
        '. Check saved progress; if speech failed, turn off Read aloud for timed visual mode.');
    }
  }
  function launch() {
    cancel();
    mode = 'running';
    controller = new AbortController();
    report('Starting hands-free…');
    void run(generation, session);
  }
  return {
    start(settings = {}) {
      stop();
      if (!HANDS_FREE_CATEGORIES.has(deck.snapshot().category)) {
        report('Hands-free is for jokes, trivia, Would you rather and conversation. Games/challenges stay manual.');
        return;
      }
      options = { ...options, ...settings };
      if (options.audio && !speech.available) {
        report('Speech unavailable. Turn off Read aloud for timed visual mode, or use manual controls.');
        return;
      }
      launch();
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
