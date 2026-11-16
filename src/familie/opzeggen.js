// Opzeg- en meldbrieven na een overlijden. Wij versturen niets: de familie
// print de brief of plakt de tekst in een e-mail of webformulier.
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const datumLang = (iso) => {
  const [j, m, d] = iso.split('-').map(Number);
  return `${d} ${MAANDEN[m - 1]} ${j}`;
};

export const ACTIES = {
  opzeggen: { naam: 'Opzeggen', zin: 'Ik verzoek u het contract per de datum van overlijden te beëindigen en te veel betaalde bedragen terug te storten.' },
  overzetten: { naam: 'Op naam van de partner zetten', zin: 'Ik verzoek u het contract op naam te zetten van de achterblijvende partner. De gegevens staan hieronder.' },
  melden: { naam: 'Alleen het overlijden melden', zin: 'Ik verzoek u uw administratie aan te passen en mij te laten weten wat u verder van mij nodig heeft.' },
};

// Welke actie past meestal bij een soort contract?
export function standaardActie(soort, { partnerBlijft = false } = {}) {
  if (['energie', 'water', 'wonen', 'telecom', 'gemeente'].includes(soort) && partnerBlijft) return 'overzetten';
  if (['bank', 'zorg'].includes(soort)) return 'melden';
  return 'opzeggen';
}

// invoer: { organisatie, soort, actie, overledene: { naam, overlijdensdatum, geboortedatum? },
//   afzender: { naam, relatie, adres?, email?, telefoon? }, klantnummer, vandaag }
export function brief({ organisatie, actie = 'opzeggen', overledene, afzender, klantnummer = '', partnerNaam = '', vandaag = new Date() }) {
  const a = ACTIES[actie] || ACTIES.opzeggen;
  const regels = [
    afzender.naam,
    afzender.adres || '',
    '',
    `Aan: ${organisatie}`,
    '',
    datumLang(new Date(vandaag).toISOString().slice(0, 10)),
    '',
    `Betreft: overlijden van ${overledene.naam}${klantnummer ? ` (klant- of polisnummer ${klantnummer})` : ''}`,
    '',
    'Geachte heer, mevrouw,',
    '',
    `Op ${datumLang(overledene.overlijdensdatum)} is ${overledene.naam} overleden${overledene.geboortedatum ? ` (geboren op ${datumLang(overledene.geboortedatum)})` : ''}. Ik schrijf u als ${afzender.relatie || 'nabestaande'}.`,
    '',
    a.zin,
    actie === 'overzetten' && partnerNaam ? `Nieuwe contractant: ${partnerNaam}.` : '',
    '',
    'Wilt u mij schriftelijk bevestigen dat u dit heeft verwerkt, met de einddatum en een eventuele eindafrekening?',
    'Een kopie van de akte van overlijden stuur ik mee. Laat het mij weten als u een verklaring van erfrecht nodig heeft.',
    '',
    `U kunt mij bereiken${afzender.email ? ` via ${afzender.email}` : ''}${afzender.email && afzender.telefoon ? ' of' : ''}${afzender.telefoon ? ` op ${afzender.telefoon}` : ''}${!afzender.email && !afzender.telefoon ? ' op bovenstaand adres' : ''}.`,
    '',
    'Met vriendelijke groet,',
    '',
    afzender.naam,
  ];
  // Lege regels die door een ontbrekend veld dubbel staan, samenvoegen
  return regels.filter((r, i, alle) => !(r === '' && alle[i - 1] === '')).join('\n').trim();
}

// Lijst van meldingen uit de contracten van het dossier
export function meldlijst(contracten, opties = {}) {
  return contracten
    .filter((c) => !c.beeindigd)
    .map((c) => ({ contractId: c.id, organisatie: c.naam, soort: c.soort, actie: c.overlijdenActie || standaardActie(c.soort, opties), status: c.overlijdenStatus || 'open', klantnummer: c.klantnummer || '' }))
    .sort((a, b) => a.organisatie.localeCompare(b.organisatie));
}
