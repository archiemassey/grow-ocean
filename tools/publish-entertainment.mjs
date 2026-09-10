/* Manual curation only: consume a reviewed JSON supplement, never an Office workbook. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { CATEGORIES, validatePack } from '../js/entertainment.js';

if (!process.argv[2]) throw new Error('Usage: node tools/publish-entertainment.mjs <reviewed-supplement.json> [original-library-export.json]');
const base = validatePack(JSON.parse(await readFile(new URL('../js/data/entertainment-base.json', import.meta.url), 'utf8')));
const input = await readFile(resolve(process.argv[2]), 'utf8');
let supplement = JSON.parse(input);
if (!supplement.schemaVersion && Array.isArray(supplement.trivia) && Array.isArray(supplement.jokes) &&
    Array.isArray(supplement.sources)) {
  const payload = supplement;
  const references = new Map(payload.sources.map(row => [row[0], row]));
  supplement = {
    schemaVersion: 1, version: `${payload.date}-${payload.version}`,
    provenance: {
      producer: 'Entertainment Quality Upgrade agent; manually curated JSON handoff',
      date: payload.date,
      inputSha256: createHash('sha256').update(input).digest('hex'),
      note: 'Independently worded questions and editorial jokes. Subject/general-topic citations are not a claim that every question was independently verified. Humour sources are inspiration only; article text is not reproduced.',
      references: payload.sources
    },
    items: [
      ...payload.trivia.map(row => {
        const ref = references.get(row[7]);
        if (!ref) throw new Error(`Missing trivia reference: ${row[0]}`);
        return {
          id: 'trivia-' + String(row[0]).toLowerCase(), category: 'trivia', topic: row[2],
          prompt: row[4], answer: row[5],
          source: `${ref[3]} — ${ref[2]}. ${ref[4]} (${row[8]}; independently worded entertainment, not operational guidance.)`
        };
      }),
      ...payload.jokes.map(row => ({
        id: 'joke-' + String(row[0]).toLowerCase(), category: 'jokes', topic: row[2],
        prompt: row[4], answer: row[5],
        source: `Original gROW Ocean editorial joke, ${payload.date}. Humour bibliography H001–H004: inspiration only, no collection copied.`
      }))
    ]
  };
}
validatePack(supplement);
if (process.argv[3]) {
  const text = await readFile(resolve(process.argv[3]), 'utf8');
  const library = JSON.parse(text);
  const source = 'Original gROW Ocean crew entertainment library, supplied as a plain JSON export. Curated for the static app; no runtime workbook import.';
  const types = { 'Would You Rather': 'wyr', Games: 'games', Conversation: 'conversation', Challenges: 'challenges' };
  for (const [sheet, category] of Object.entries(types)) {
    const rows = library[sheet]?.values;
    if (!Array.isArray(rows)) throw new Error(`Missing original category: ${sheet}`);
    for (const row of rows.slice(1)) {
      if (!Array.isArray(row) || !['Yes', 'No'].includes(row[1])) throw new Error(`Invalid original row in ${sheet}`);
      if (row[1] === 'No') continue;
      const item = {
        id: 'library-' + category + '-' + String(row[0]).toLowerCase(),
        category, topic: row[2], prompt: row[4], source
      };
      if (category === 'games') {
        if (typeof row[5] !== 'string' || !row[5].trim()) throw new Error(`Missing game instructions: ${row[0]}`);
        item.instructions = row[5] + `\nSuggested duration: ${row[6]} minutes (optional). Equipment: ${row[7]}. Either player may pause or skip a timer.`;
      } else if (category === 'challenges' && row[5]) item.instructions = row[5];
      supplement.items.push(item);
    }
  }
  const days = library['Daily Packs']?.values;
  if (!Array.isArray(days)) throw new Error('Missing original 44-day plan');
  supplement.schedule = days.slice(1).map(row => ({
    day: Number(row[0]), title: row[1],
    note: `Suggested mix: a joke, Would You Rather, a game, a conversation and a challenge.\nOriginal crew plan references: ${row.slice(2).join(', ')}.\nUse the category picker and Next for unseen items rather than replaying the fixed source IDs.`,
    source: 'Original crew library 44 Daily Packs; themes/references preserved, adapted to optional no-repeat category draws.'
  }));
  supplement.provenance = {
    ...supplement.provenance,
    originalLibrarySha256: createHash('sha256').update(text).digest('hex'),
    originalLibrary: 'Plain JSON category export supplied by the content agent. Protected Office files are not read or modified by this publishing tool.'
  };
}
const prompts = new Set();
let duplicatePrompts = 0;
const items = [...base.items, ...supplement.items].filter(item => {
  const key = item.category + ':' + item.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
  if (prompts.has(key)) { duplicatePrompts++; return false; }
  prompts.add(key);
  return true;
});
const pack = validatePack({
  schemaVersion: 1,
  version: supplement.version,
  provenance: {
    base: base.provenance,
    supplement: supplement.provenance || 'Reviewed supplement; see each item source.',
    note: 'Manually curated static app content. No SharePoint sync or protected-workbook import.'
  },
  ...(supplement.schedule ? { schedule: supplement.schedule } : {}),
  items
});
await writeFile(new URL('../js/data/entertainment-pack.json', import.meta.url), JSON.stringify(pack, null, 2) + '\n');
console.log(JSON.stringify({
  version: pack.version, total: items.length, duplicatePromptsSkipped: duplicatePrompts,
  counts: Object.fromEntries(Object.keys(CATEGORIES).map(category => [category, items.filter(item => item.category === category).length]))
}));
