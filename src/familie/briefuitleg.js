// Brieven uitleggen. Twee wegen, één vorm van uitkomst:
// 1. basisUitleg(): regels, werkt altijd en volledig op het eigen apparaat;
// 2. AI (Edge Function familie-brief): begrijpelijke samenvatting erbij.
// In beide gevallen geldt: een bedrag of datum telt alleen als het letterlijk
// in de brief staat (citaat). valideer() haalt alles weg wat niet te vinden is.
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const plat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export const AFZENDERS = [
  { id: 'cak', naam: 'CAK', patroon: /\bCAK\b|Centraal Administratie Kantoor/i, onderwerp: 'eigen bijdrage voor zorg' },
  { id: 'toeslagen', naam: 'Dienst Toeslagen', patroon: /Dienst Toeslagen|Belastingdienst\/Toeslagen|\b(zorg|huur)toeslag\b|kindgebonden budget/i, onderwerp: 'toeslagen' },
  { id: 'belastingdienst', naam: 'Belastingdienst', patroon: /Belastingdienst|aanslag inkomstenbelasting|voorlopige aanslag|erfbelasting/i, onderwerp: 'belasting' },
  { id: 'svb', naam: 'SVB', patroon: /Sociale Verzekeringsbank|\bSVB\b|\bAOW\b|\bAnw\b/i, onderwerp: 'AOW of nabestaandenuitkering' },
  { id: 'uwv', naam: 'UWV', patroon: /\bUWV\b/i, onderwerp: 'uitkering' },
  { id: 'ciz', naam: 'CIZ', patroon: /\bCIZ\b|Centrum indicatiestelling zorg|indicatiebesluit/i, onderwerp: 'indicatie voor langdurige zorg' },
  { id: 'deurwaarder', naam: 'Deurwaarder of incassobureau', patroon: /deurwaarder|incassobureau|dagvaarding|exploot|beslag/i, onderwerp: 'een schuld' },
  { id: 'gemeente', naam: 'Gemeente', patroon: /\bgemeente\b|\bWmo\b|gemeentelijke belastingen|\bWOZ\b|bijzondere bijstand/i, onderwerp: 'gemeentelijke zaken' },
  { id: 'waterschap', naam: 'Waterschap', patroon: /waterschap|hoogheemraadschap/i, onderwerp: 'waterschapsbelasting' },
  { id: 'zorgverzekeraar', naam: 'Zorgverzekeraar', patroon: /zorgverzeker|eigen risico|zorgpolis|polisblad/i, onderwerp: 'de zorgverzekering' },
  { id: 'pensioen', naam: 'Pensioenfonds', patroon: /pensioenfonds|pensioenuitvoerder|nabestaandenpensioen|ouderdomspensioen/i, onderwerp: 'pensioen' },
  { id: 'energie', naam: 'Energieleverancier', patroon: /energieleverancier|jaarafrekening|termijnbedrag|\bkWh\b|stroom en gas/i, onderwerp: 'energie' },
  { id: 'bank', naam: 'Bank', patroon: /\bbank\b|betaalrekening|spaarrekening|hypotheek/i, onderwerp: 'bankzaken' },
  { id: 'notaris', naam: 'Notaris', patroon: /notaris|verklaring van erfrecht|testament/i, onderwerp: 'de erfenis' },
];

export const SOORTEN = {
  aanmaning: { naam: 'Aanmaning', patroon: /aanmaning|laatste herinnering|ingebrekestelling|dwangbevel/i, urgent: true },
  herinnering: { naam: 'Betalingsherinnering', patroon: /betalingsherinnering|herinnering|nog niet (?:van u )?ontvangen|betalingsachterstand/i, urgent: true },
  beschikking: { naam: 'Besluit of beschikking', patroon: /beschikking|besluit|definitieve berekening|voorschotbeschikking|toekenning|wij hebben besloten/i },
  factuur: { naam: 'Factuur of aanslag', patroon: /factuur|aanslag|te betalen|acceptgiro|nota\b/i },
  verzoek: { naam: 'Verzoek om informatie', patroon: /wij vragen u|stuur ons|vul (?:het|dit) formulier in|geef (?:aan ons )?door|wij hebben (?:nog )?(?:gegevens|informatie) nodig/i },
  informatie: { naam: 'Informatie', patroon: /./ },
};

// "€ 1.234,56" / "EUR 12,50" → bedragen met positie
export function vindBedragen(tekst) {
  const uit = [];
  for (const m of String(tekst).matchAll(/(?:€|EUR)\s?(-?\d{1,3}(?:\.\d{3})+|-?\d+)(?:,(\d{2}|-))?/g)) {
    const waarde = Number(`${m[1].replace(/\./g, '')}.${m[2] && m[2] !== '-' ? m[2] : '00'}`);
    if (Number.isFinite(waarde)) uit.push({ waarde, citaat: m[0], positie: m.index });
  }
  return uit;
}

// "12-01-2027", "12 januari 2027", "1 mei" (jaar uit de context) → datums
export function vindDatums(tekst, { nu = new Date() } = {}) {
  const uit = [];
  const t = String(tekst);
  for (const m of t.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g)) {
    const [d, mnd, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mnd >= 1 && mnd <= 12 && d >= 1 && d <= 31 && j > 2000 && j < 2100) uit.push({ datum: iso(j, mnd, d), citaat: m[0], positie: m.index });
  }
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2})\\s+(${MAANDEN.join('|')})(?:\\s+(\\d{4}))?\\b`, 'gi'))) {
    const d = Number(m[1]);
    const mnd = MAANDEN.indexOf(m[2].toLowerCase()) + 1;
    let j = m[3] ? Number(m[3]) : null;
    if (!j) {
      // Zonder jaar: de eerstvolgende keer dat die datum valt
      j = nu.getFullYear();
      if (new Date(iso(j, mnd, d)) < new Date(nu.toISOString().slice(0, 10))) j++;
    }
    if (d >= 1 && d <= 31) uit.push({ datum: iso(j, mnd, d), citaat: m[0], positie: m.index, zonderJaar: !m[3] });
  }
  return uit.sort((a, b) => a.positie - b.positie);
}
const iso = (j, m, d) => `${j}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const zinRond = (tekst, positie) => {
  const begin = Math.max(tekst.lastIndexOf('.', positie - 1), tekst.lastIndexOf('\n', positie - 1)) + 1;
  let eind = tekst.slice(positie).search(/[.!?](\s|$)|\n/);
  eind = eind < 0 ? tekst.length : positie + eind + 1;
  return plat(tekst.slice(begin, eind));
};

function plusDagen(isoDatum, dagen) {
  const d = new Date(`${isoDatum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dagen);
  return d.toISOString().slice(0, 10);
}

// De termijn in de brief: "vóór 1 mei", "uiterlijk 12-01-2027", "binnen 6 weken"
export function vindTermijn(tekst, { nu = new Date(), briefdatum = null } = {}) {
  const t = String(tekst);
  const datums = vindDatums(t, { nu });
  for (const d of datums) {
    const voor = t.slice(Math.max(0, d.positie - 60), d.positie).toLowerCase();
    if (/(v[oó]{1,2}r|uiterlijk(?: op)?|ten laatste|tot en met|niet later dan|binnen zijn(?: op)?|betaal(?:t u)? (?:dit )?(?:bedrag )?(?:v[oó]{1,2}r|uiterlijk))\s*(?:op\s*)?$/.test(voor)) {
      return { datum: d.datum, citaat: zinRond(t, d.positie), soort: 'datum' };
    }
  }
  const m = t.match(/binnen\s+(\d{1,2}|een|twee|drie|vier|vijf|zes|acht|tien|veertien)\s+(dagen|dag|weken|week|maanden|maand)/i);
  if (m) {
    const woorden = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, acht: 8, tien: 10, veertien: 14 };
    const n = Number(m[1]) || woorden[m[1].toLowerCase()];
    const dagen = /dag/i.test(m[2]) ? n : /we/i.test(m[2]) ? n * 7 : n * 30;
    const start = briefdatum || nu.toISOString().slice(0, 10);
    return { datum: plusDagen(start, dagen), citaat: zinRond(t, m.index), soort: 'periode', vanaf: start, geschat: !briefdatum };
  }
  return null;
}

// De datum van de brief zelf: de eerste datum in de kop
export function vindBriefdatum(tekst, opties) {
  const kop = String(tekst).slice(0, 600);
  const m = kop.match(/(?:datum|dagtekening)\s*:?\s*([^\n]{6,30})/i);
  const d = vindDatums(m ? m[1] : kop, opties).find((x) => !x.zonderJaar);
  return d ? d.datum : null;
}

// Het bedrag waar het om gaat: liefst bij "te betalen", "u ontvangt", "totaal"
export function vindHoofdbedrag(tekst) {
  const t = String(tekst);
  const alle = vindBedragen(t);
  if (!alle.length) return null;
  const score = (b) => {
    const voor = t.slice(Math.max(0, b.positie - 80), b.positie).toLowerCase();
    let s = 0;
    if (/te betalen|totaal|openstaand|u betaalt|te voldoen|verschuldigd|terug(?: te )?betalen/.test(voor)) s += 3;
    if (/u (?:krijgt|ontvangt)|wij betalen|terug(?:krijgt| te ontvangen)|uw (?:toeslag|uitkering|eigen bijdrage) (?:is|wordt|bedraagt)/.test(voor)) s += 3;
    if (/per maand|maandelijks/.test(t.slice(b.positie, b.positie + 40).toLowerCase())) s += 1;
    return s;
  };
  const beste = [...alle].sort((a, b) => score(b) - score(a) || a.positie - b.positie)[0];
  const voor = t.slice(Math.max(0, beste.positie - 80), beste.positie).toLowerCase();
  const richting = /u (?:krijgt|ontvangt)|wij betalen|terugkrijgt|te ontvangen/.test(voor) ? 'ontvangen' : /betalen|voldoen|verschuldigd|openstaand/.test(voor) ? 'betalen' : 'onbekend';
  return { waarde: beste.waarde, citaat: zinRond(t, beste.positie), richting };
}

const DOORVERWIJZEN = {
  schuld: { naam: 'Schuldhulp van je gemeente of Geldfit', uitleg: 'Bij een aanmaning, deurwaarder of betalingsachterstand: wacht niet. Hulp is gratis.', url: 'https://geldfit.nl/' },
  juridisch: { naam: 'Het Juridisch Loket', uitleg: 'Gratis eerste advies als je het niet eens bent met een besluit.', url: 'https://www.juridischloket.nl/' },
  notaris: { naam: 'Een notaris', uitleg: 'Bij vragen over een testament, erfenis of volmacht.', url: 'https://www.notaris.nl/' },
};

// Uitleg zonder AI. Geeft dezelfde vorm als de AI-uitleg.
export function basisUitleg(tekst, opties = {}) {
  const t = String(tekst || '');
  const afzender = AFZENDERS.find((a) => a.patroon.test(t.slice(0, 1500))) || AFZENDERS.find((a) => a.patroon.test(t)) || null;
  const soortId = Object.keys(SOORTEN).find((k) => SOORTEN[k].patroon.test(t));
  const soort = SOORTEN[soortId];
  const briefdatum = vindBriefdatum(t, opties);
  const termijn = vindTermijn(t, { ...opties, briefdatum });
  const bedrag = vindHoofdbedrag(t);
  const bezwaarZin = t.match(/[^.\n]*\bbezwaar\b[^.\n]*\./i);
  const bezwaar = bezwaarZin ? { mogelijk: true, citaat: plat(bezwaarZin[0]), termijn: (bezwaarZin[0].match(/binnen\s+\w+\s+(?:dagen|weken)/i) || [null])[0] } : { mogelijk: false };
  const acties = [];
  if (bedrag?.richting === 'betalen') acties.push(`Betaal ${bedrag.citaat.match(/(?:€|EUR)\s?[\d.,-]+/)?.[0] || 'het bedrag'}${termijn ? ` vóór ${datumTekst(termijn.datum)}` : ''}, of vraag een betalingsregeling aan als dat niet lukt.`);
  if (soortId === 'verzoek') acties.push('Stuur de gevraagde gegevens op.');
  if (soortId === 'beschikking') acties.push('Controleer of de gegevens in het besluit kloppen (inkomen, vermogen, datum).');
  if (bezwaar.mogelijk) acties.push(`Niet mee eens? Je kunt bezwaar maken${bezwaar.termijn ? ` (${bezwaar.termijn})` : ''}.`);
  if (!acties.length) acties.push('Lees de brief en bewaar hem in het dossier.');
  const doorverwijzen = [];
  if (afzender?.id === 'deurwaarder' || soort?.urgent) doorverwijzen.push(DOORVERWIJZEN.schuld);
  if (bezwaar.mogelijk) doorverwijzen.push(DOORVERWIJZEN.juridisch);
  if (afzender?.id === 'notaris') doorverwijzen.push(DOORVERWIJZEN.notaris);
  const samenvatting = `${afzender ? `Brief van ${afzender.naam}` : 'Brief'} over ${afzender?.onderwerp || 'een onderwerp dat we niet herkennen'}. Soort: ${soort.naam.toLowerCase()}.${bedrag ? ` Het gaat om ${bedrag.citaat.match(/(?:€|EUR)\s?[\d.,-]+/)?.[0]}${bedrag.richting === 'betalen' ? ' om te betalen' : bedrag.richting === 'ontvangen' ? ' om te ontvangen' : ''}.` : ''}${termijn ? ` Er staat een termijn in: ${datumTekst(termijn.datum)}.` : ''}`;
  return valideer({ bron: 'regels', afzender: afzender ? { id: afzender.id, naam: afzender.naam } : null, soort: { id: soortId, naam: soort.naam, urgent: !!soort.urgent }, briefdatum, samenvatting, acties, termijn, bedrag, bezwaar, doorverwijzen }, t);
}

export function datumTekst(isoDatum) {
  const [j, m, d] = isoDatum.split('-').map(Number);
  return `${d} ${MAANDEN[m - 1]} ${j}`;
}

// Elk bedrag en elke termijn moet met een letterlijk citaat in de brief staan.
// Wat niet te vinden is, verdwijnt uit de uitleg (liever niets dan verzonnen).
export function valideer(uitleg, brontekst) {
  const bron = plat(brontekst).toLowerCase();
  const staatErin = (citaat) => !!citaat && bron.includes(plat(citaat).toLowerCase());
  const u = { ...uitleg, weggelaten: [] };
  if (u.bedrag && (!staatErin(u.bedrag.citaat) || !vindBedragen(u.bedrag.citaat).some((b) => Math.abs(b.waarde - u.bedrag.waarde) < 0.005))) {
    u.weggelaten.push('bedrag');
    u.bedrag = null;
  }
  if (u.termijn && (!staatErin(u.termijn.citaat) || !/^\d{4}-\d{2}-\d{2}$/.test(u.termijn.datum || ''))) {
    u.weggelaten.push('termijn');
    u.termijn = null;
  }
  if (u.bezwaar?.mogelijk && !staatErin(u.bezwaar.citaat)) u.bezwaar = { mogelijk: false };
  u.samenvatting = String(u.samenvatting || '').slice(0, 900);
  u.acties = (u.acties || []).slice(0, 6).map((a) => String(a).slice(0, 300));
  return u;
}

// JSON-schema voor de AI-uitleg (structured outputs in de Edge Function)
export const UITLEG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['afzender', 'soort', 'samenvatting', 'acties', 'termijn', 'bedrag', 'bezwaar'],
  properties: {
    afzender: { type: 'string', description: 'Wie de brief stuurt, zoals het in de brief staat' },
    soort: { type: 'string', enum: Object.keys(SOORTEN) },
    samenvatting: { type: 'string', description: 'Wat staat er in de brief, in 2 tot 4 korte zinnen op taalniveau B1' },
    acties: { type: 'array', items: { type: 'string' }, description: 'Wat de lezer moet doen, elk in één korte zin. Leeg als er niets hoeft.' },
    termijn: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['datum', 'citaat'], properties: { datum: { type: 'string', description: 'JJJJ-MM-DD' }, citaat: { type: 'string', description: 'De zin uit de brief waarin de termijn staat, letterlijk' } } }] },
    bedrag: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['waarde', 'richting', 'citaat'], properties: { waarde: { type: 'number' }, richting: { type: 'string', enum: ['betalen', 'ontvangen', 'onbekend'] }, citaat: { type: 'string', description: 'De zin uit de brief waarin het bedrag staat, letterlijk' } } }] },
    bezwaar: { type: 'object', additionalProperties: false, required: ['mogelijk', 'citaat'], properties: { mogelijk: { type: 'boolean' }, citaat: { type: 'string', description: 'De zin over bezwaar, letterlijk; leeg als er geen is' } } },
  },
};
