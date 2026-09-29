// Maakt van een controle-uitkomst de geaggregeerde tellingen die naar de
// server mogen (spec §9 B5). Geen cliëntnummers, geen bedragen per cliënt:
// • het aantal cliënten als bandbreedte: 1-9, 10-49, 50-199 of 200+;
// • per signaalsoort het aantal cliënten, onder de 5 als -1 ("<5");
// • totaalbedragen alleen bij 10 of meer cliënten, afgerond op € 500;
// • de rekenversie. De datum zet de server zelf.
// De exacte cijfers blijven lokaal (zie lokaleSamenvatting).
import { JAAR, GECONTROLEERD_OP } from './params.js';

export const REKENVERSIE = `${JAAR}.${GECONTROLEERD_OP.replace(/-/g, '')}`;
export const SOORTEN = ['gemist', 'te-laag', 'terugbetaling', 'vermogen', 'leeftijd', 'gemeente', 'info'];
export const MAX_CLIENTEN = 10000;
export const KLEIN = -1;
const MAX_BEDRAG = 9999500;

export function band(n) {
  if (n < 10) return '1-9';
  if (n < 50) return '10-49';
  if (n < 200) return '50-199';
  return '200+';
}

// Aantallen onder de 5 (ook 0) worden "<5", opgeslagen als -1
export const telling = (n) => (n < 5 ? KLEIN : n);

// Afronden op € 500, met een bovengrens van net onder de 10 miljoen
export const afgerond = (bedrag) => Math.min(MAX_BEDRAG, Math.max(0, Math.round(bedrag / 500) * 500));

function nieuweId() {
  return globalThis.crypto.randomUUID();
}

// Per soort: het aantal cliënten met minstens één signaal van die soort
function perSoort(clienten) {
  const uit = Object.fromEntries(SOORTEN.map((s) => [s, 0]));
  for (const c of clienten) for (const s of new Set(c.signalen.map((x) => x.soort))) if (s in uit) uit[s]++;
  return uit;
}

/**
 * @param {{clienten: object[], totaal: {aantal: number, metActie: number, gemistPerJaar: number, risicoPerJaar: number}}} resultaat uitkomst van checkLijst()
 * @param {string} rekenversie
 */
export function maakAggregaat(resultaat, rekenversie = REKENVERSIE, id = nieuweId()) {
  const n = resultaat.totaal.aantal;
  if (!Number.isInteger(n) || n < 1 || n > MAX_CLIENTEN) throw new RangeError(`Aantal cliënten moet tussen 1 en ${MAX_CLIENTEN} liggen`);
  const bedragen = n >= 10;
  const soorten = perSoort(resultaat.clienten);
  return {
    id,
    rekenversie,
    clienten: band(n),
    met_actie: telling(resultaat.totaal.metActie),
    gemist_jaar: bedragen ? afgerond(resultaat.totaal.gemistPerJaar) : null,
    risico_jaar: bedragen ? afgerond(resultaat.totaal.risicoPerJaar) : null,
    signalen: Object.fromEntries(SOORTEN.map((s) => [s, telling(soorten[s])])),
  };
}

// Exacte cijfers voor de lokale geschiedenis van deze gebruiker (blijft in de browser)
export function lokaleSamenvatting(resultaat, rekenversie = REKENVERSIE, datum = new Date()) {
  return {
    datum: datum.toISOString(),
    rekenversie,
    aantal: resultaat.totaal.aantal,
    metActie: resultaat.totaal.metActie,
    gemist: resultaat.totaal.gemistPerJaar,
    risico: resultaat.totaal.risicoPerJaar,
    signalen: perSoort(resultaat.clienten),
  };
}

// Twee controles zijn alleen vergelijkbaar met dezelfde rekenregels (R29)
export const vergelijkbaar = (a, b) => Boolean(a && b && a.rekenversie === b.rekenversie);

// Tekst voor een telling die "<5" kan zijn
export const toonTelling = (n) => (n === KLEIN ? '<5' : String(n));
