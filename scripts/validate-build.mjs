import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const outputDir = resolve('dist');
const swPath = resolve(outputDir, 'sw.js');
const sw = await readFile(swPath, 'utf8');
const entries = [...sw.matchAll(/\{\s*"revision"\s*:\s*(?:null|"[^"\\]*(?:\\.[^"\\]*)*")\s*,\s*"url"\s*:\s*"([^"\\]+)"\s*\}/g)]
  .map((match) => match[1]);

if (entries.length === 0) {
  throw new Error('Service worker precache manifest is empty or unreadable.');
}

for (const url of entries) {
  if (url.startsWith('/') || url.split('/').includes('..')) {
    throw new Error(`Unsafe service worker precache URL: ${url}`);
  }
  const filePath = resolve(outputDir, url);
  if (!filePath.startsWith(`${outputDir}${sep}`) || !(await exists(filePath))) {
    throw new Error(`Service worker precache resource is missing: ${url}`);
  }
}

for (const required of ['index.html', 'manifest.webmanifest']) {
  if (!entries.includes(required)) {
    throw new Error(`Service worker precache does not include ${required}.`);
  }
}

console.log(`Validated ${entries.length} service worker precache resources.`);

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}
