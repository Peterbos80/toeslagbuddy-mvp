// Regels en bedragen komen uit data/familie/regels/*.json. Elke waarde heeft
// een officiële bron. Dit bestand bepaalt of een regel nog te vertrouwen is:
// is hij te lang niet gecontroleerd of buiten zijn geldigheid, dan rekenen we
// er niet mee en verwijzen we naar de instantie ("veilig uitvallen").
export const MAX_DAGEN_ONGECONTROLEERD = 400;
const DAG = 864e5;

export function regelStatus(regel, vandaag = new Date()) {
  if (!regel) return 'ontbreekt';
  if (regel.status !== 'bevestigd') return 'te-controleren';
  const t = new Date(vandaag).getTime();
  if (!regel.gecontroleerdOp || (t - Date.parse(regel.gecontroleerdOp)) / DAG > MAX_DAGEN_ONGECONTROLEERD) return 'te-controleren';
  if (regel.geldigVanaf && t < Date.parse(regel.geldigVanaf)) return 'nog-niet-geldig';
  if (regel.geldigTot && t > Date.parse(regel.geldigTot) + DAG) return 'verlopen';
  return 'bevestigd';
}

export const bruikbaar = (regel, vandaag) => regelStatus(regel, vandaag) === 'bevestigd';

// Waarde van een bedrag of percentage; gooit een fout bij een onbekende sleutel,
// zodat een tikfout nooit stil als 0 meerekent.
export function waarde(regel, sleutel) {
  const v = regel.bedragen?.[sleutel] ?? regel.percentages?.[sleutel];
  if (!v || typeof v.waarde !== 'number') throw new Error(`Onbekende regelwaarde ${regel.id}.${sleutel}`);
  return v.waarde;
}

// De regel die op een datum geldt, uit een lijst met varianten per jaar
export function regelVoor(regels, voorvoegsel, vandaag = new Date()) {
  const t = new Date(vandaag).getTime();
  return (
    Object.values(regels)
      .filter((r) => r.id.startsWith(voorvoegsel))
      .find((r) => (!r.geldigVanaf || t >= Date.parse(r.geldigVanaf)) && (!r.geldigTot || t <= Date.parse(r.geldigTot) + DAG)) || null
  );
}

// Alle bron-id's die een regel gebruikt
export function bronnenVan(regel) {
  const uit = new Set(regel.bronnen || []);
  for (const groep of [regel.bedragen, regel.percentages, regel.tarieven, regel.termijnen]) for (const v of Object.values(groep || {})) if (v.bron) uit.add(v.bron);
  for (const f of regel.feiten || []) if (f.bron) uit.add(f.bron);
  return [...uit];
}

export const euro = (n, decimalen = 2) =>
  `€ ${Number(n).toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen })}`;
export const afgerond = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
