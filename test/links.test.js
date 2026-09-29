// Controleert na `npm run build` dat alle interne links en gestructureerde
// gegevens kloppen. Wordt overgeslagen als dist/ nog niet bestaat.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '../dist');
const html = [];
function zoek(map) {
  for (const f of readdirSync(map)) {
    const p = join(map, f);
    if (statSync(p).isDirectory()) zoek(p);
    else if (f.endsWith('.html')) html.push(p);
  }
}
if (existsSync(DIST)) zoek(DIST);

test('alle interne links verwijzen naar een bestaande pagina', { skip: !html.length && 'eerst npm run build' }, () => {
  const kapot = [];
  for (const bestand of html) {
    const inhoud = readFileSync(bestand, 'utf8');
    for (const [, href] of inhoud.matchAll(/href="(\/[^"#?]*)/g)) {
      const doel = join(DIST, href);
      const ok = existsSync(doel) && (statSync(doel).isFile() || existsSync(join(doel, 'index.html')));
      if (!ok) kapot.push(`${bestand.replace(DIST, '')} → ${href}`);
    }
  }
  assert.deepEqual(kapot, []);
});

test('gestructureerde gegevens (JSON-LD) zijn geldig', { skip: !html.length && 'eerst npm run build' }, () => {
  for (const bestand of html) {
    for (const [, json] of readFileSync(bestand, 'utf8').matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(json), bestand);
    }
  }
});
