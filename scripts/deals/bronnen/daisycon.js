// Daisycon-productfeeds (XML of CSV, standaard Daisycon-velden:
// title, link, price, price_old, price_shipping, ean, brand, category,
// image_default, currency, in_stock). Geheim: DAISYCON_FEED_URLS.
import { parseXml, zoekAlle, tekstVan, kind } from '../xml.js';
import { parseCsv } from '../csv.js';
import { feedLijst, haalFeeds, hostNaam, winkelExtra, waar } from './feed-hulp.js';

function rij(v, winkel, opties) {
  if (v.in_stock !== undefined && v.in_stock !== '' && !waar(v.in_stock)) return null;
  const naam = winkel || v.program_name || hostNaam(v.link);
  const extra = winkelExtra(opties, naam, v.link);
  return {
    product: v.ean || undefined,
    ean: v.ean,
    titel: v.title || v.name,
    merk: v.brand,
    categorie: v.category,
    winkel: naam,
    prijs: v.price,
    vanPrijs: v.price_old,
    verzendkosten: v.price_shipping !== undefined && v.price_shipping !== '' ? v.price_shipping : extra.standaardVerzending,
    gratisVerzendingVanaf: extra.gratisVerzendingVanaf,
    valuta: v.currency || 'EUR',
    url: v.link,
    afbeelding: v.image_default || v.image,
    bron: 'daisycon',
    affiliate: true,
    tijd: opties.nu,
  };
}

export function parseDaisycon(tekst, opties = {}) {
  const t = String(tekst).trimStart();
  if (t.startsWith('<')) {
    const doc = parseXml(t);
    const uit = [];
    const programmas = zoekAlle(doc, 'program');
    for (const prog of programmas.length ? programmas : [doc]) {
      const progNaam = tekstVan(prog, 'program_info/name');
      for (const p of zoekAlle(prog, 'product')) {
        const info = kind(p, 'product_info') || p;
        const v = Object.fromEntries(info.kinderen.filter((k) => !k.kinderen.length).map((k) => [k.naam, k.tekst]));
        if (!v.image_default) v.image_default = zoekAlle(info, 'location')[0]?.tekst;
        uit.push(rij(v, opties.winkel || progNaam || null, opties));
      }
    }
    return uit.filter(Boolean);
  }
  return parseCsv(t).map((v) => rij(v, opties.winkel, opties)).filter(Boolean);
}

export const bron = {
  naam: 'daisycon',
  label: 'Daisycon-productfeeds',
  soort: 'feed',
  actief: (env) => feedLijst(env.DAISYCON_FEED_URLS).length > 0,
  haal: (context) => haalFeeds(feedLijst(context.env.DAISYCON_FEED_URLS), { ...context, bron: 'daisycon' }, parseDaisycon),
};
