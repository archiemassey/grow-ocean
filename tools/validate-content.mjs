import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validatePack } from '../js/entertainment.js';
import { RULES_DOCUMENT } from '../js/rules.js';

const root = new URL('../', import.meta.url);
const pack = validatePack(JSON.parse(await readFile(new URL('js/data/entertainment-pack.json', root), 'utf8')));
const pdf = await readFile(new URL(RULES_DOCUMENT.file, root));
if (createHash('sha256').update(pdf).digest('hex') !== RULES_DOCUMENT.sha256)
  throw new Error('Rules PDF differs from the reviewed searchable text. Review and re-extract before publishing.');
console.log(`Validated ${pack.items.length} entertainment items and ${RULES_DOCUMENT.pages.length} rules pages.`);
