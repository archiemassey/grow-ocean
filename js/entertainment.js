/* Pure content validation and progress logic. Stable IDs survive pack upgrades. */
export const CATEGORIES = Object.freeze({
  jokes: 'Jokes & riddles', wyr: 'Would you rather?', trivia: 'Trivia',
  games: 'Games', conversation: 'Conversation', challenges: 'Challenges'
});

export function validatePack(pack) {
  if (!pack || pack.schemaVersion !== 1 || typeof pack.version !== 'string' ||
      !pack.version.trim() || !Array.isArray(pack.items) || !pack.items.length)
    throw new Error('Invalid entertainment pack header');
  const ids = new Set();
  const prompts = new Set();
  for (const item of pack.items) {
    if (!item || typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(item.id) ||
        ids.has(item.id)) throw new Error('Invalid or duplicate entertainment ID');
    ids.add(item.id);
    if (!Object.hasOwn(CATEGORIES, item.category)) throw new Error(`Invalid category: ${item.id}`);
    for (const key of ['prompt', 'source']) {
      if (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > 10000)
        throw new Error(`Invalid ${key}: ${item.id}`);
    }
    const promptKey = item.category + ':' + item.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
    if (prompts.has(promptKey)) throw new Error(`Duplicate prompt: ${item.id}`);
    prompts.add(promptKey);
    for (const key of ['answer', 'instructions', 'topic']) {
      if (item[key] !== undefined && (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > 10000))
        throw new Error(`Invalid ${key}: ${item.id}`);
    }
    if (item.category === 'trivia' && !item.answer) throw new Error(`Missing answer: ${item.id}`);
    if (item.category === 'games' && !item.instructions) throw new Error(`Missing instructions: ${item.id}`);
  }
  if (pack.schedule !== undefined) {
    if (!Array.isArray(pack.schedule) || pack.schedule.length !== 44)
      throw new Error('An optional crossing schedule must cover 44 days');
    const days = new Set();
    for (const entry of pack.schedule) {
      if (!entry || !Number.isInteger(entry.day) || entry.day < 1 || entry.day > 44 || days.has(entry.day))
        throw new Error('Invalid or duplicate schedule day');
      days.add(entry.day);
      for (const key of ['title', 'note', 'source'])
        if (typeof entry[key] !== 'string' || !entry[key].trim() || entry[key].length > 10000)
          throw new Error('Invalid schedule text');
    }
  }
  return pack;
}

export function reconcileProgress(items, saved) {
  const ids = new Set(items.map(item => item.id));
  // Keep retired IDs too: an older open tab or a later pack must not erase history.
  const seen = [...new Set(Array.isArray(saved?.seen) ? saved.seen.filter(id => typeof id === 'string') : [])];
  return {
    seen,
    currentId: ids.has(saved?.currentId) && seen.includes(saved?.currentId) ? saved.currentId : null,
    cycle: Number.isSafeInteger(saved?.cycle) && saved.cycle > 0 ? saved.cycle : 1
  };
}

export function nextItem(items, saved, random = Math.random) {
  const state = reconcileProgress(items, saved);
  const seen = new Set(state.seen);
  const remaining = items.filter(item => !seen.has(item.id));
  if (!remaining.length) return { state, item: null, exhausted: true };
  const index = Math.min(remaining.length - 1, Math.max(0, Math.floor(random() * remaining.length)));
  const item = remaining[index];
  return { item, exhausted: false, state: { ...state, seen: [...state.seen, item.id], currentId: item.id } };
}

export function resetProgress(items, saved) {
  return { seen: [], currentId: null, cycle: reconcileProgress(items, saved).cycle + 1 };
}

export function presentation(item, revealed = false) {
  return {
    prompt: item?.prompt || 'Choose Next to begin.',
    answer: revealed ? item?.answer || '' : '',
    instructions: item?.instructions || '',
    canReveal: !!item?.answer && !revealed
  };
}

export function createDeck(pack, storage, random = Math.random) {
  validatePack(pack);
  let category = 'jokes', state, current = null, revealed = false;
  const items = () => pack.items.filter(item => item.category === category);
  const key = () => 'entertainment-progress-v1:' + category;
  return {
    async select(value) {
      if (!Object.hasOwn(CATEGORIES, value)) throw new Error('Unknown category');
      const saved = await storage.getSetting('entertainment-progress-v1:' + value, null);
      category = value;
      state = reconcileProgress(items(), saved);
      current = items().find(item => item.id === state.currentId) || null;
      revealed = false;
      return this.snapshot();
    },
    async next({ freshOnly = false } = {}) {
      let drawn = false;
      const committed = await storage.updateSetting(key(), saved => {
        const result = nextItem(items(), saved, random);
        drawn = !!result.item;
        return result.state;
      });
      state = committed;
      if (drawn) current = items().find(item => item.id === state.currentId) || null;
      revealed = false;
      return freshOnly && !drawn ? null : this.snapshot();
    },
    async reset() {
      const next = await storage.updateSetting(key(), saved => resetProgress(items(), saved));
      state = next; current = null; revealed = false;
      return this.snapshot();
    },
    reveal() { revealed = true; return this.snapshot(); },
    snapshot() {
      const seen = new Set(state?.seen || []);
      const count = items().filter(item => seen.has(item.id)).length;
      return {
        ...presentation(current, revealed), category, item: current,
        seen: count, total: items().length,
        cycle: state?.cycle || 1, exhausted: count === items().length
      };
    }
  };
}
