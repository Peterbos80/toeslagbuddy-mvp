// Productpagina's uit een vaste lijst nakijken via schema.org JSON-LD
// (Product/Offer), met microdata en OpenGraph als terugval.
// Config: JSONLD_WINKELS = JSON of pad naar een JSON-bestand, standaard
// data/deals/jsonld-winkels.json:
//   [{ "winkel": "Naam", "urls": ["https://…"], "verzendkosten": 3.95, "gratisVerzendingVanaf": 25 }]
// robots.txt en max. 1 verzoek per 5 s per host via http.js; fouten → overslaan.
import { readFileSync, existsSync } from 'node:fs';
import { prijsFeiten } from '../jager/html.js';
import { maakOphaler } from '../http.js';

export function leesConfig(waarde, standaardPad) {
  try {
    if (waarde && waarde.trim().startsWith('[')) return JSON.parse(waarde);
    const pad = waarde || standaardPad;
    if (pad && existsSync(pad)) return JSON.parse(readFileSync(pad, 'utf8'));
  } catch {
    /* ongeldige config: niets doen */
  }
  return [];
}

export function feitenNaarAanbod(feiten, winkel, opties = {}) {
  return feiten
    .filter((f) => f.beschikbaar !== false)
    .map((f) => ({
      product: f.ean || undefined,
      ean: f.ean,
      titel: f.titel,
      merk: f.merk,
      winkel,
      prijs: f.prijs,
      valuta: f.valuta,
      verzendkosten: f.verzendkosten ?? opties.verzendkosten ?? null,
      gratisVerzendingVanaf: f.gratisVerzendingVanaf ?? opties.gratisVerzendingVanaf ?? null,
      url: f.url,
      afbeelding: f.afbeelding,
      bron: opties.bron || 'jsonld',
      affiliate: false,
      tijd: opties.nu,
      categorie: opties.categorie,
    }));
}

export const bron = {
  naam: 'jsonld',
  label: 'Winkelpagina’s (schema.org)',
  soort: 'crawl',
  actief: (env, { standaardPad } = {}) => leesConfig(env.JSONLD_WINKELS, standaardPad).length > 0,
  async haal(context) {
    const config = leesConfig(context.env.JSONLD_WINKELS, context.jsonldPad);
    const ophaler = context.ophaler || maakOphaler({ fetch: context.fetch, wacht: context.wacht, log: context.log });
    const uit = [];
    for (const w of config) {
      for (const url of w.urls || []) {
        if (context.optout?.(url)) continue;
        try {
          const r = await ophaler.haal(url);
          if (!r.ok || !r.tekst) continue;
          uit.push(...feitenNaarAanbod(prijsFeiten(r.tekst, url), w.winkel, { ...w, nu: context.nu }));
        } catch (e) {
          context.log?.(`jsonld ${url} overgeslagen: ${e.reden || e.message}`);
        }
      }
    }
    context.hostStatus?.(ophaler.status());
    return uit;
  },
};
