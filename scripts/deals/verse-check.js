// Verse check (elk uur): kijk de winkelpagina's van producten die bij een
// alarm passen opnieuw na, zodat een melding op een prijs van nu rust.
//   node scripts/deals/verse-check.js [--uit uit-jager/verse-check.json] [--budget 60]
// Alleen echte (niet-demo) producten; robots.txt en 5 s per host via http.js.
import { join } from 'node:path';
import { DATA, leesJson, schrijfJson, optoutLijst } from './opslag.js';
import { laadIndex } from './meld.js';
import { zoekMatches } from '../../src/deals/alarm.js';
import { maakOphaler } from './http.js';
import { prijsFeiten } from './jager/html.js';
import { feitenNaarAanbod } from './bronnen/jsonld.js';

export async function verseCheck({ map = DATA, ophaler = maakOphaler({ budget: 60 }), nu = Date.now(), log = console.log } = {}) {
  const { deals, producten } = laadIndex(map);
  const regels = (leesJson(join(map, 'alarmen.json'), { regels: [] }).regels || []).map((r) => ({ ...r, minKorting: 0, maxPrijs: null }));
  const ids = new Set(zoekMatches(regels, deals.filter((d) => d.soort === 'product' && !d.demo)).map((m) => m.deal.id));
  const optout = optoutLijst(map);
  const doelen = [...ids].flatMap((id) => Object.entries(producten.get(id)?.winkels || {}).filter(([, o]) => o.url && !optout(o.url)).map(([winkel, o]) => ({ winkel, url: o.url, o })));
  const aanbod = [];
  for (const d of doelen) {
    try {
      const r = await ophaler.haal(d.url);
      if (!r.ok || !r.tekst) continue;
      for (const a of feitenNaarAanbod(prijsFeiten(r.tekst, d.url), d.winkel, { bron: 'verse-check', nu, verzendkosten: d.o.verzendkosten, gratisVerzendingVanaf: d.o.gratisVerzendingVanaf })) {
        aanbod.push({ ...a, tijd: new Date(nu).toISOString(), affiliate: d.o.affiliate, url: d.o.url });
      }
    } catch (e) {
      log(`verse check ${d.winkel}: ${e.reden || e.message}`);
    }
  }
  log(`✓ verse check: ${doelen.length} pagina's, ${aanbod.length} prijzen`);
  return { aanbod, status: {} };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (n, s) => {
    const i = process.argv.indexOf(n);
    return i > 0 ? process.argv[i + 1] : s;
  };
  const r = await verseCheck({ ophaler: maakOphaler({ budget: Number(arg('--budget', 60)) }) });
  schrijfJson(arg('--uit', 'uit-jager/verse-check.json'), r);
}
