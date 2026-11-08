// Vliegtickets via de Travelpayouts Data API (Aviasales v3 prices_for_dates).
// Geheim: TRAVELPAYOUTS_TOKEN (in de kop X-Access-Token, nooit in de url of
// logs). Optioneel TRAVELPAYOUTS_MARKER voor de partnerlink.
// Let op: dit zijn gecachte zoekresultaten van andere gebruikers (2–7 dagen
// oud). Op de site tonen we ze als 'indicatie' met de leeftijd erbij.
import { normaliseerVlucht } from '../../../src/deals/vluchten.js';

export const ROUTES = [
  ['AMS', 'BCN'], ['AMS', 'LIS'], ['AMS', 'NYC'], ['AMS', 'ROM'], ['AMS', 'LON'],
  ['AMS', 'AGP'], ['AMS', 'IST'], ['EIN', 'BCN'], ['EIN', 'ALC'], ['RTM', 'PMI'],
];

const maanden = (nu, n) => {
  const d = new Date(nu);
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1));
    return x.toISOString().slice(0, 7);
  });
};

export function parseTravelpayouts(json, { nu = Date.now(), marker = '' } = {}) {
  if (!json || json.success === false || !Array.isArray(json.data)) return [];
  const valuta = String(json.currency || 'eur').toUpperCase();
  return json.data
    .map((v) =>
      normaliseerVlucht(
        {
          van: v.origin,
          naar: v.destination,
          vertrek: v.departure_at,
          terug: v.return_at,
          prijs: v.price,
          valuta,
          maatschappij: v.airline,
          stops: Number.isInteger(v.transfers) ? v.transfers : null,
          bagageInbegrepen: null, // de API zegt niets over ruimbagage
          bron: 'travelpayouts',
          url: v.link ? `https://www.aviasales.com${v.link}${marker ? `${v.link.includes('?') ? '&' : '?'}marker=${encodeURIComponent(marker)}` : ''}` : null,
          affiliate: !!marker,
          // found_at = wanneer de prijs gevonden is (niet: nu)
          tijd: v.found_at || nu,
        },
        { nu },
      ),
    )
    .filter(Boolean);
}

export const bron = {
  naam: 'travelpayouts',
  label: 'Travelpayouts (vliegtickets)',
  soort: 'vlucht',
  actief: (env) => !!env.TRAVELPAYOUTS_TOKEN,
  async haal(context) {
    const f = context.fetch || globalThis.fetch;
    const token = context.env.TRAVELPAYOUTS_TOKEN;
    const uit = [];
    for (const [van, naar] of context.routes || ROUTES) {
      for (const maand of maanden(context.nu, 4)) {
        const q = new URLSearchParams({ origin: van, destination: naar, departure_at: maand, one_way: 'true', currency: 'eur', sorting: 'price', limit: '1000' });
        try {
          const r = await f(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${q}`, { headers: { 'X-Access-Token': token, Accept: 'application/json' } });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          uit.push(...parseTravelpayouts(await r.json(), { nu: context.nu, marker: context.env.TRAVELPAYOUTS_MARKER || '' }));
        } catch (e) {
          context.log?.(`travelpayouts ${van}-${naar} ${maand}: ${e.message}`);
        }
      }
    }
    return uit;
  },
};
