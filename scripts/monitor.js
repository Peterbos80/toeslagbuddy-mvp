// Wijzigingsmonitor: controleert dagelijks de officiële bronpagina's van alle
// bedragen (uit src/calc/params.js). Verandert er een bedrag of percentage,
// dan maakt dit script een GitHub-issue zodat je params.js kunt bijwerken.
//   node scripts/monitor.js          (GITHUB_TOKEN + GITHUB_REPOSITORY voor issues)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as params from '../src/calc/params.js';
import { bedragenUit, vingerafdruk, verschil } from './monitor-lib.js';

const BESTAND = join(import.meta.dirname, '../data/monitor.json');
const bronnen = Object.values(params)
  .filter((p) => p && Array.isArray(p.bronnen))
  .flatMap((p) => p.bronnen)
  .filter(([, url], i, a) => a.findIndex(([, u]) => u === url) === i);

const staat = existsSync(BESTAND) ? JSON.parse(readFileSync(BESTAND, 'utf8')) : {};
const wijzigingen = [];
const fouten = [];

for (const [titel, url] of bronnen) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ToeslagBuddy-monitor/1.0; +https://www.toeslagbuddy.nl)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const regels = bedragenUit(await res.text());
    const hash = vingerafdruk(regels);
    const vorig = staat[url];
    if (vorig && vorig.hash !== hash) {
      wijzigingen.push({ titel, url, ...verschil(vorig.regels, regels) });
      console.log(`⚠ gewijzigd: ${titel}`);
    } else {
      console.log(`✓ ${vorig ? 'ongewijzigd' : 'eerste meting'}: ${titel} (${regels.length} bedragen)`);
    }
    staat[url] = { titel, hash, regels: regels.slice(0, 80), gecontroleerd: new Date().toISOString() };
  } catch (e) {
    fouten.push(`${titel} – ${url}: ${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ''}`);
    console.warn(`✗ ${titel}: ${e.message}`);
  }
}

writeFileSync(BESTAND, JSON.stringify(staat, null, 2) + '\n');

const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
if (wijzigingen.length && GITHUB_TOKEN && GITHUB_REPOSITORY) {
  const body = [
    'De wijzigingsmonitor zag nieuwe of veranderde bedragen op officiële bronpagina’s. Controleer of `src/calc/params.js` en de tests moeten worden bijgewerkt.',
    '',
    ...wijzigingen.flatMap((w) => [
      `### [${w.titel}](${w.url})`,
      w.erbij.length ? `**Nieuw:**\n${w.erbij.slice(0, 20).map((r) => `- ${r}`).join('\n')}` : '',
      w.weg.length ? `**Verdwenen:**\n${w.weg.slice(0, 20).map((r) => `- ${r}`).join('\n')}` : '',
      '',
    ]),
    fouten.length ? `\n_Niet bereikbaar:_\n${fouten.map((f) => `- ${f}`).join('\n')}` : '',
  ].join('\n');
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    body: JSON.stringify({ title: `Bedragen gewijzigd op ${wijzigingen.length} bronpagina('s) – ${new Date().toISOString().slice(0, 10)}`, body }),
  });
  console.log(res.ok ? '✓ Issue aangemaakt' : `✗ Issue maken mislukt: HTTP ${res.status}`);
}
console.log(`Klaar: ${bronnen.length} bronnen, ${wijzigingen.length} gewijzigd, ${fouten.length} niet bereikbaar.`);
