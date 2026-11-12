import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = new URL('../', import.meta.url);

test('publishing and top-ups cannot restore generated jokes or discard reviewed joke types', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'grow-joke-publishing-'));
  try {
    await mkdir(join(dir, 'tools'));
    await mkdir(join(dir, 'js', 'data'), { recursive: true });
    for (const file of ['tools/publish-entertainment.mjs', 'tools/generate-morale-content.mjs', 'js/entertainment.js'])
      await copyFile(new URL(file, root), join(dir, ...file.split('/')));
    await writeFile(join(dir, 'package.json'), '{"type":"module"}');
    const makePack = items => ({ schemaVersion: 1, version: 'fixture', items });
    const joke = {
      id: 'reviewed', category: 'jokes', jokeType: 'animals',
      prompt: 'Reviewed fixture', answer: 'Reviewed answer', source: 'Reviewed source'
    };
    const oneLiner = {
      id: 'reviewed-one-liner', category: 'jokes', jokeType: 'wordplay',
      prompt: 'Complete reviewed one-liner fixture', source: 'Reviewed source'
    };
    const oldJoke = { id: 'generated', category: 'jokes', prompt: 'Generated fixture', source: 'Old generator' };
    await writeFile(join(dir, 'js', 'data', 'curated-jokes.json'), JSON.stringify(makePack([joke, oneLiner])));
    await writeFile(join(dir, 'js', 'data', 'entertainment-base.json'), JSON.stringify(makePack([oldJoke])));
    const existing = ['wyr', 'conversation', 'challenges'].flatMap(category =>
      Array.from({ length: category === 'wyr' ? 999 : 1000 }, (_, index) => ({
        id: `${category}-${index}`, category, prompt: `Existing ${category} ${index}`, source: 'Fixture'
      })));
    await writeFile(join(dir, 'supplement.json'), JSON.stringify(makePack([oldJoke, ...existing, {
      id: 'trivia', category: 'trivia', prompt: 'Fixture question', answer: 'Fixture answer', source: 'Fixture'
    }])));
    await run(process.execPath, [join(dir, 'tools', 'publish-entertainment.mjs'), join(dir, 'supplement.json')]);
    const packPath = join(dir, 'js', 'data', 'entertainment-pack.json');
    const published = JSON.parse(await readFile(packPath, 'utf8'));
    assert.deepEqual(published.items.filter(item => item.category === 'jokes'), [joke, oneLiner]);
    assert.equal(published.items.filter(item => item.category === 'trivia').length, 1);
    await run(process.execPath, [join(dir, 'tools', 'generate-morale-content.mjs')]);
    const toppedUp = JSON.parse(await readFile(packPath, 'utf8'));
    assert.deepEqual(toppedUp.items.filter(item => item.category === 'jokes'), [joke, oneLiner]);
    for (const category of ['wyr', 'conversation', 'challenges'])
      assert.equal(toppedUp.items.filter(item => item.category === category).length, 1000);
    const once = await readFile(packPath, 'utf8');
    await run(process.execPath, [join(dir, 'tools', 'generate-morale-content.mjs')]);
    assert.equal(await readFile(packPath, 'utf8'), once, 'top-ups must be idempotent');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
