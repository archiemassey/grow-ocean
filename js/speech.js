const VOICE_KEY = 'grow-ocean-voice';
export function readPreference(key, fallback) {
  try { return JSON.parse(globalThis.localStorage?.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
export function savePreference(key, value) {
  try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); } catch { /* Private/storage-full mode. */ }
}

export function selectVoice(voices = [], preferred = readPreference(VOICE_KEY, '')) {
  const local = voices.filter(voice => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang));
  const chosen = local.find(voice => voice.voiceURI === preferred);
  const score = voice => (/premium|enhanced|natural/i.test(voice.name) ? 10 : 0) +
    (/^en-GB$/i.test(voice.lang) ? 2 : 0) + (voice.default ? 1 : 0);
  const voice = chosen || [...local].sort((a, b) => score(b) - score(a))[0] || null;
  return {
    voice, voices: local,
    message: chosen ? `Using ${voice.name}.` : preferred
      ? `Saved voice isn't available. ${voice ? `Using ${voice.name} for now.` : voices.length ? 'No on-device English voice is available; using on-screen text.' : 'Using the device default; offline availability depends on your phone.'}`
      : voice ? `Using ${voice.name} · on-device English voice.`
        : voices.length ? 'No on-device English voice is available; using on-screen text.'
          : 'No on-device English voice listed yet. Using the device default; test it offline.'
  };
}

export function configureVoice(utterance, synthesis = globalThis.speechSynthesis) {
  const voices = synthesis?.getVoices?.() || [];
  const selection = selectVoice(voices);
  if (voices.length && !selection.voice) throw new Error('No installed English voice is available');
  if (selection.voice) utterance.voice = selection.voice;
  utterance.lang = selection.voice?.lang || 'en-GB';
  utterance.rate = 1;
  utterance.pitch = 1;
  return selection;
}

export function createVoiceSettings(h, onChange = () => {}, synthesis = globalThis.speechSynthesis) {
  const select = h('select', { 'aria-label': 'Read-aloud voice' });
  const status = h('p', { class: 'hint', role: 'status', 'aria-live': 'polite' });
  function refresh() {
    const preferred = readPreference(VOICE_KEY, '');
    const selection = selectVoice(synthesis?.getVoices?.() || [], preferred);
    select.replaceChildren(
      h('option', { value: '' }, 'Best available on-device English'),
      ...selection.voices.map(voice => h('option', { value: voice.voiceURI }, `${voice.name} (${voice.lang})`)),
      ...(preferred && !selection.voices.some(v => v.voiceURI === preferred)
        ? [h('option', { value: preferred }, 'Saved voice · currently unavailable')] : [])
    );
    select.value = preferred;
    status.textContent = selection.message;
  }
  select.addEventListener('change', () => {
    savePreference(VOICE_KEY, select.value); refresh(); onChange();
  });
  synthesis?.addEventListener?.('voiceschanged', refresh);
  refresh();
  return {
    element: h('div', {}, [
      h('label', { class: 'field' }, ['Voice', select]), status,
      h('p', { class: 'hint' }, 'For a more natural voice on iPhone, download an Enhanced or Premium English voice in Settings → Accessibility → Spoken Content (or Read & Speak) → Voices. Names and browser availability vary by iOS version. Test in aeroplane mode before departure.')
    ]),
    dispose: () => synthesis?.removeEventListener?.('voiceschanged', refresh)
  };
}
