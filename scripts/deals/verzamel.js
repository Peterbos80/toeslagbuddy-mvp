// De verzamel-agent: draait alle ingeschakelde bronnen, voegt de prijzen
// samen in de historie (data/deals/historie/*.json, max. 180 dagen) en
// schrijft data/deals/status.json. De site rekent de deals uit bij de build.
//
//   node scripts/deals/verzamel.js [--invoer map-met-json] [--map data/deals]
//
// Een bron is ingeschakeld als zijn geheimen/config bestaan (zie
// docs/deals-techniek.md). Zonder echte bron draait de demo-bron.
// --invoer: JSON-bestanden met ruwe aanbiedingen van de jager-shards of de
// verse-check (GitHub Actions-artefacten).
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normaliseer, ontdubbel } from '../../src/deals/aanbod.js';
import { voegToe, afkappen } from '../../src/deals/historie.js';
import { normaliseerVlucht, voegVluchtToe, afkappenVlucht } from '../../src/deals/vluchten.js';
import { DATA, leesHistorie, schrijfHistorie, schrijfJson, leesJson, optoutLijst, winkelInfo } from './opslag.js';
import { koppel, kenmerken } from './jager/koppelen.js';
import { bron as daisycon } from './bronnen/daisycon.js';
import { bron as tradetracker } from './bronnen/tradetracker.js';
import { bron as awin } from './bronnen/awin.js';
import { bron as travelpayouts } from './bronnen/travelpayouts.js';
import { bron as jsonld } from './bronnen/jsonld.js';
import { bron as demo } from './bronnen/demo.js';

export const BRONNEN = [daisycon, tradetracker, awin, travelpayouts, jsonld];
const isVlucht = (a) => a.soort === 'vlucht' || (a.van && a.naar && a.vertrek);

// Ruwe aanbiedingen in de historie zetten. Zonder EAN eerst proberen te
// koppelen aan een bestaand product (alleen bij hoge zekerheid).
export function verwerk(ruw, historie, { nu, koersen = {}, optout = () => false } = {}) {
  const producten = [];
  let vluchten = 0;
  let weg = 0;
  for (const a of ruw) {
    if (a?.url && optout(a.url)) {
      weg++;
      continue;
    }
    if (isVlucht(a)) {
      const v = normaliseerVlucht(a, { nu, koersen });
      if (!v) {
        weg++;
        continue;
      }
      const id = `vlucht-${v.route}`;
      historie.vluchten.set(id, voegVluchtToe(historie.vluchten.get(id), v));
      vluchten++;
    } else {
      const n = normaliseer(a, { nu, koersen });
      if (n) producten.push(n);
      else weg++;
    }
  }
  const kandidaten = [...historie.producten.values()].map((r) => ({ id: r.id, kenmerken: kenmerken({ titel: r.titel, merk: r.merk, ean: /^\d{13,14}$/.test(r.id) ? r.id : null }) }));
  let gekoppeld = 0;
  for (const a of ontdubbel(producten)) {
    if (!historie.producten.has(a.product) && !/^\d{13,14}$/.test(a.product)) {
      const m = koppel(a, kandidaten);
      if (m) {
        a.product = m.id;
        gekoppeld++;
      }
    }
    historie.producten.set(a.product, voegToe(historie.producten.get(a.product), a));
  }
  return { producten: producten.length, vluchten, weg, gekoppeld };
}

// Invoerbestanden: een lijst aanbiedingen, of { aanbod, status } van de jager
const winkelStatus = {};
function leesInvoer(map) {
  if (!map || !existsSync(map)) return [];
  const uit = [];
  const loop = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, f.name);
      if (f.isDirectory()) loop(p);
      else if (f.name.endsWith('.json')) {
        try {
          const j = JSON.parse(readFileSync(p, 'utf8'));
          for (const x of Array.isArray(j) ? j : j.aanbod || []) uit.push(x);
          if (j.status) Object.assign(winkelStatus, j.status);
        } catch {
          /* kapot bestand overslaan */
        }
      }
    }
  };
  loop(map);
  return uit;
}

export async function verzamel({ env = process.env, nu = Date.now(), map = DATA, fetch: f = globalThis.fetch, invoer = null, extraAanbod = [], log = console.log, bronnen = BRONNEN } = {}) {
  const historie = leesHistorie(map);
  const optout = optoutLijst(map);
  const context = {
    env,
    nu,
    fetch: f,
    log,
    fouten: [],
    optout,
    winkelInfo: winkelInfo(map),
    jsonldPad: join(map, 'jsonld-winkels.json'),
    terugvullen: (id) => (historie.producten.has(id) || historie.vluchten.has(`vlucht-${id}`) ? 0 : 180),
  };
  const statusBronnen = [];
  const ruw = [];
  const echte = bronnen.filter((b) => b.actief(env, { standaardPad: context.jsonldPad }));
  const extra = [...leesInvoer(invoer), ...extraAanbod];
  for (const b of [...bronnen, demo]) {
    const actief = b === demo ? demo.actief(env, { echteBronnen: echte.length + (extra.length ? 1 : 0) }) : echte.includes(b);
    const s = { naam: b.naam, label: b.label, soort: b.soort, actief, status: actief ? 'ok' : 'uit', aantal: 0 };
    if (actief) {
      const start = Date.now();
      try {
        const lijst = await b.haal(context);
        s.aantal = lijst.length;
        for (const x of lijst) ruw.push(x);
      } catch (e) {
        s.status = 'fout';
        s.fout = String(e.message || e).slice(0, 200);
        log(`bron ${b.naam} mislukt: ${s.fout}`);
      }
      s.ms = Date.now() - start;
    }
    statusBronnen.push(s);
  }
  if (extra.length) statusBronnen.push({ naam: 'jager', label: 'Jager (winkels zelf)', soort: 'crawl', actief: true, status: 'ok', aantal: extra.length });
  for (const x of extra) ruw.push(x);
  const telling = verwerk(ruw, historie, { nu, optout });
  for (const r of historie.producten.values()) afkappen(r, nu);
  for (const r of historie.vluchten.values()) afkappenVlucht(r, nu);
  // Lege records (alles verlopen) weggooien
  for (const [id, r] of historie.producten) if (!Object.keys(r.dagen).length) historie.producten.delete(id);
  const bestanden = schrijfHistorie(historie, map);
  const vorige = leesJson(join(map, 'status.json'), {});
  const status = {
    bijgewerkt: new Date(nu).toISOString(),
    demo: statusBronnen.find((s) => s.naam === 'demo')?.actief ?? false,
    bronnen: statusBronnen,
    winkels: { ...(vorige.winkels || {}), ...winkelStatus },
    producten: historie.producten.size,
    routes: historie.vluchten.size,
    ...telling,
  };
  schrijfJson(join(map, 'status.json'), status, true);
  log(`✓ ${telling.producten} prijzen en ${telling.vluchten} vluchtprijzen verwerkt (${telling.gekoppeld} gekoppeld, ${telling.weg} overgeslagen), ${bestanden} historiebestanden`);
  return status;
}

// Als script
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (n) => {
    const i = process.argv.indexOf(n);
    return i > 0 ? process.argv[i + 1] : null;
  };
  await verzamel({ invoer: arg('--invoer'), map: arg('--map') || DATA });
}
