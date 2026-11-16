// Controleert elke regel in data/familie/regels/ tegen de tekstafdruk van zijn
// officiële bron (data/familie/bronnen/). Staat een bedrag of zin niet meer
// letterlijk in de bron, dan is de bron veranderd of klopt onze waarde niet.
//
//   node scripts/familie/regelcheck.js [--json] [--streng]
//
// --streng: sluit af met een fout als er iets niet klopt (voor CI).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bedragStaatIn } from './tekst.js';
import { regelStatus } from '../../src/familie/regels.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function leesRegels(map = join(ROOT, 'data/familie/regels')) {
  const uit = {};
  for (const f of readdirSync(map).filter((f) => f.endsWith('.json')).sort()) {
    const r = JSON.parse(readFileSync(join(map, f), 'utf8'));
    uit[r.id] = r;
  }
  return uit;
}

const plat = (s) => String(s).replace(/\s+/g, ' ').toLowerCase();

// Procent in de tekst: 0.0165 → "1,65%"
const procentTekst = (w) => `${(w * 100).toLocaleString('nl-NL', { maximumFractionDigits: 2 })}%`;

export function controleer(regels, leesBron, vandaag = new Date()) {
  const bevindingen = [];
  const teksten = new Map();
  const bron = (id) => {
    if (!teksten.has(id)) teksten.set(id, leesBron(id));
    return teksten.get(id);
  };
  for (const r of Object.values(regels)) {
    const meld = (soort, sleutel, bericht) => bevindingen.push({ regel: r.id, soort, sleutel, bericht });
    for (const veld of ['id', 'titel', 'gecontroleerdOp', 'status', 'instantie', 'controleerBij']) if (!r[veld]) meld('schema', veld, `veld ${veld} ontbreekt`);
    const st = regelStatus(r, vandaag);
    if (st === 'te-controleren') meld('status', 'status', 'regel staat op te-controleren (of is langer dan 400 dagen niet gecontroleerd)');
    for (const [k, v] of Object.entries(r.bedragen || {})) {
      if (!v.bron) { meld('schema', k, 'bedrag zonder bron'); continue; }
      const t = bron(v.bron);
      if (t == null) meld('bron', k, `geen afdruk van bron ${v.bron}`);
      else if (!bedragStaatIn(t, v.waarde)) meld('bedrag', k, `€ ${v.waarde} staat niet (meer) in bron ${v.bron}`);
    }
    for (const [k, v] of Object.entries(r.percentages || {})) {
      if (!v.bron) { meld('schema', k, 'percentage zonder bron'); continue; }
      const t = bron(v.bron);
      if (t == null) meld('bron', k, `geen afdruk van bron ${v.bron}`);
      else if (!plat(t).includes(plat(v.tekst || procentTekst(v.waarde)))) meld('percentage', k, `"${v.tekst || procentTekst(v.waarde)}" staat niet (meer) in bron ${v.bron}`);
    }
    for (const [k, v] of Object.entries(r.tarieven || {})) {
      const t = bron(v.bron);
      if (t == null) meld('bron', k, `geen afdruk van bron ${v.bron}`);
      else for (const p of [v.laag, v.hoog]) if (!plat(t).includes(procentTekst(p))) meld('percentage', k, `${procentTekst(p)} staat niet (meer) in bron ${v.bron}`);
    }
    for (const [k, v] of Object.entries(r.termijnen || {})) {
      const t = bron(v.bron);
      if (t == null) meld('bron', k, `geen afdruk van bron ${v.bron}`);
      else if (!plat(t).includes(plat(v.tekst))) meld('feit', k, `"${v.tekst}" staat niet (meer) in bron ${v.bron}`);
    }
    (r.feiten || []).forEach((f, i) => {
      const t = bron(f.bron);
      if (t == null) meld('bron', `feit ${i + 1}`, `geen afdruk van bron ${f.bron}`);
      else if (!plat(t).includes(plat(f.tekst))) meld('feit', `feit ${i + 1}`, `"${f.tekst}" staat niet (meer) in bron ${f.bron}`);
    });
  }
  return bevindingen;
}

export function leesBronBestand(id, map = join(ROOT, 'data/familie/bronnen')) {
  const b = join(map, `${id}.txt`);
  return existsSync(b) ? readFileSync(b, 'utf8') : null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const regels = leesRegels();
  const b = controleer(regels, leesBronBestand);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ regels: Object.keys(regels).length, bevindingen: b }, null, 1));
  else {
    console.log(`${Object.keys(regels).length} regels gecontroleerd, ${b.length} bevindingen`);
    for (const x of b) console.log(`- ${x.regel} · ${x.sleutel}: ${x.bericht}`);
  }
  if (b.length && process.argv.includes('--streng')) process.exit(1);
}
