/* build-www.mjs — copies the static web app into ./www so Capacitor can wrap it.
   The canonical source stays at the project root (so the PWA + GitHub Pages keep
   working from root). `www` is just a build artifact for the native shell. */
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const www = join(root, 'www');

const ITEMS = [
  'index.html',
  'manifest.webmanifest',
  'service-worker.js',
  'css',
  'js',
  'icons'
];

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });

for (const item of ITEMS) {
  const src = join(root, item);
  if (!existsSync(src)) { console.warn('skip (missing):', item); continue; }
  await cp(src, join(www, item), { recursive: true });
}
console.log('Built www/ with:', ITEMS.join(', '));
