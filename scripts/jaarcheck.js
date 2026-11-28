// Jaarcheck: is elk onderdeel klaar voor het volgende kalenderjaar?
//   node scripts/jaarcheck.js [--jaar 2027] [--json] [--streng]
// Kijkt per onderdeel welk jaar de bedragen hebben en of de bedragen voor
// het doeljaar er al zijn (met officiële bron). --streng: exitcode 1 als er
// iets ontbreekt en het al december (of later) is. De wekelijkse workflow
// jaarcheck.yml maakt daar een melding van; de AI-agent werkt het bij.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as params from '../src/calc/params.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGELMAP = join(ROOT, 'data/familie/regels');

export function familieRegels(map = REGELMAP) {
  return readdirSync(map).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(map, f), 'utf8')));
}

// Soorten die elk jaar nieuwe bedragen krijgen (de rest loopt over jaren heen)
export const JAARLIJKS = { wlz: 'Eigen bijdrage verpleeghuis (CAK)', erfbelasting: 'Erfbelasting', zorgkosten: 'Aftrek zorgkosten', wmo: 'Eigen bijdrage Wmo' };

export function check({ jaar, toeslagenJaar = params.JAAR, regels = familieRegels() }) {
  const uit = [
    { onderdeel: 'Toeslagen, Pro en Zzp', wat: 'Bedragen en grenzen toeslagen (src/calc/params.js)', jaarNu: toeslagenJaar, klaar: toeslagenJaar >= jaar },
  ];
  for (const [soort, naam] of Object.entries(JAARLIJKS)) {
    const jaren = regels.filter((r) => r.id.startsWith(`${soort}-`)).map((r) => r.jaar);
    const max = Math.max(...jaren);
    const doel = regels.find((r) => r.id === `${soort}-${jaar}`);
    uit.push({ onderdeel: 'Familie', wat: naam, jaarNu: max, klaar: !!doel && doel.status === 'bevestigd' });
  }
  for (const r of regels.filter((r) => r.geldigTot && !Object.keys(JAARLIJKS).some((s) => r.id.startsWith(`${s}-`)))) {
    uit.push({ onderdeel: 'Familie', wat: r.titel, jaarNu: Number(r.geldigTot.slice(0, 4)), klaar: Number(r.geldigTot.slice(0, 4)) >= jaar || r.id === 'salderen' });
  }
  return uit;
}

export function alsTabel(rijen, jaar) {
  return `| Onderdeel | Wat | Nu | Klaar voor ${jaar} |\n|---|---|---|---|\n${rijen.map((r) => `| ${r.onderdeel} | ${r.wat} | ${r.jaarNu} | ${r.klaar ? 'ja' : '**nee**'} |`).join('\n')}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--jaar');
  const nu = new Date();
  const jaar = i > -1 ? Number(process.argv[i + 1]) : nu.getMonth() >= 6 ? nu.getFullYear() + 1 : nu.getFullYear();
  const rijen = check({ jaar });
  const open = rijen.filter((r) => !r.klaar);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ jaar, open: open.length, rijen }, null, 1));
  else console.log(`${alsTabel(rijen, jaar)}\n\n${open.length ? `${open.length} onderdelen nog niet klaar voor ${jaar}.` : `Alles klaar voor ${jaar}.`}`);
  const dringend = nu >= new Date(`${jaar - 1}-12-01`);
  if (open.length && dringend && process.argv.includes('--streng')) process.exit(1);
}
