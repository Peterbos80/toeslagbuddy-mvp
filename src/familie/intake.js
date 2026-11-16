// De intake: 12 korte vragen, één per scherm, overslaan mag. De antwoorden
// worden het profiel van het dossier; daaruit volgen de eerste taken.
export const VRAGEN = [
  { id: 'naam', soort: 'tekst', vraag: 'Voor wie regel je dit?', hint: 'Alleen de voornaam of hoe jullie hem of haar noemen.', plaats: 'Bijvoorbeeld: Pa, of Henk' },
  { id: 'geboortejaar', soort: 'jaar', vraag: 'In welk jaar is hij of zij geboren?', hint: 'Alleen het jaar. De precieze geboortedatum bewaren we niet.' },
  { id: 'woonsituatie', soort: 'keuze', vraag: 'Hoe woont je ouder nu?', opties: [['alleen', 'Zelfstandig, alleen'], ['partner', 'Zelfstandig, met partner'], ['instelling', 'In een verpleeghuis of zorginstelling'], ['inwonend', 'Bij familie in huis']] },
  { id: 'huurKoop', soort: 'keuze', vraag: 'Is de woning een huurhuis of een koophuis?', opties: [['huur', 'Huur'], ['koop', 'Koop'], ['nvt', 'Niet van toepassing']] },
  { id: 'inkomens', soort: 'meer', vraag: 'Welke inkomsten zijn er?', opties: [['aow', 'AOW'], ['pensioen', 'Pensioen'], ['uitkering', 'Een andere uitkering'], ['loon', 'Loon uit werk'], ['anders', 'Iets anders']] },
  { id: 'toeslagen', soort: 'keuze', vraag: 'Krijgt je ouder toeslagen?', hint: 'Zoals zorgtoeslag of huurtoeslag.', opties: [['ja', 'Ja'], ['nee', 'Nee'], ['weetniet', 'Weet ik niet']] },
  { id: 'zorg', soort: 'keuze', gevoelig: true, vraag: 'Is er hulp of zorg geregeld?', hint: 'Dit is een gegeven over gezondheid. We bewaren het alleen als je ouder dat goed vindt.', opties: [['geen', 'Nee, nog niet'], ['wmo', 'Hulp via de gemeente (Wmo)'], ['wijk', 'Wijkverpleging'], ['wlz', 'Langdurige zorg (Wlz-indicatie)'], ['weetniet', 'Weet ik niet']] },
  { id: 'volmacht', soort: 'keuze', vraag: 'Is er een volmacht of levenstestament?', hint: 'Daarmee mag iemand namens je ouder beslissen als die dat zelf niet meer kan.', opties: [['ja', 'Ja'], ['nee', 'Nee'], ['weetniet', 'Weet ik niet']] },
  { id: 'testament', soort: 'keuze', vraag: 'Is er een testament?', opties: [['ja', 'Ja'], ['nee', 'Nee'], ['weetniet', 'Weet ik niet']] },
  { id: 'zonnepanelen', soort: 'keuze', vraag: 'Liggen er zonnepanelen op het dak?', hint: 'Per 1 januari 2027 verandert daar iets voor.', opties: [['ja', 'Ja'], ['nee', 'Nee']] },
  { id: 'banken', soort: 'tekst', vraag: 'Bij welke bank of banken zit je ouder?', hint: 'Alleen de naam van de bank. Geen rekeningnummers.', plaats: 'Bijvoorbeeld: Rabobank' },
  { id: 'dringend', soort: 'keuze', vraag: 'Wat is nu het meest dringend?', opties: [['overzicht', 'Overzicht krijgen'], ['post', 'De post en brieven'], ['geld', 'Geld en vaste lasten'], ['zorg', 'Zorg regelen en wat het kost'], ['familie', 'Afspraken maken met de familie'], ['overlijden', 'Er is iemand overleden']] },
];

// Antwoorden → profiel van het dossier. Gezondheidsgegevens (zorg) komen er
// alleen in als er toestemming is.
export function profielUit(antwoorden, { toestemming = false } = {}) {
  const a = antwoorden || {};
  const ja = (v) => v === 'ja';
  return {
    woonsituatie: a.woonsituatie || null,
    partner: a.woonsituatie === 'partner',
    huurKoop: a.huurKoop || null,
    inkomens: Array.isArray(a.inkomens) ? a.inkomens : [],
    aow: Array.isArray(a.inkomens) && a.inkomens.includes('aow'),
    toeslagen: ja(a.toeslagen),
    toeslagenOnbekend: a.toeslagen === 'weetniet',
    zorg: toestemming && a.zorg && a.zorg !== 'weetniet' ? a.zorg : null,
    volmacht: a.volmacht || null,
    testament: a.testament || null,
    zonnepanelen: ja(a.zonnepanelen),
    banken: String(a.banken || '').split(/[,;/]| en /).map((s) => s.trim()).filter(Boolean).slice(0, 5),
    dringend: a.dringend || null,
  };
}

// Eerste taken op basis van het profiel. Elke taak: { sleutel, titel, toelichting, link? }
export function startTaken(profiel, { geboortejaar = null, jaar = new Date().getFullYear() } = {}) {
  const t = [];
  const voeg = (sleutel, titel, toelichting, link = null) => t.push({ sleutel, titel, toelichting, link });
  voeg('familie', 'Nodig je broers, zussen of partner uit', 'Dan ziet iedereen hetzelfde overzicht en kun je taken verdelen.');
  voeg('contracten', 'Zet de vaste lasten op een rij', 'Energie, zorgverzekering, telefoon, verzekeringen en abonnementen. Tip: lees een bankafschrift in, dan vinden we ze voor je.');
  if (profiel.volmacht !== 'ja') voeg('volmacht', 'Bespreek een volmacht of levenstestament', 'Zolang je ouder zelf kan beslissen, kan dit nog bij de notaris worden vastgelegd. Daarna kan alleen de rechter iemand aanwijzen. Vraag de notaris ook om een afspraak over verantwoording aan de familie.');
  if (profiel.testament === 'weetniet') voeg('testament', 'Vraag of er een testament is', 'En bij welke notaris het ligt. Meer hoef je niet vast te leggen.');
  if (profiel.toeslagenOnbekend || (!profiel.toeslagen && profiel.huurKoop === 'huur')) voeg('toeslagen', 'Check of je ouder toeslagen mist', 'Veel ouderen met alleen AOW en een klein pensioen hebben recht op zorgtoeslag en huurtoeslag.', '/toeslagen-aow/');
  if (profiel.zorg === 'wlz' || profiel.woonsituatie === 'instelling') voeg('wlz', 'Reken de eigen bijdrage voor het verpleeghuis na', 'Het CAK rekent met het inkomen en vermogen van 2 jaar geleden. Kijk wat dat voor jullie betekent.', '/familie/rekenhulp/verpleeghuis/');
  if (profiel.zonnepanelen) voeg('salderen', 'Bekijk wat het einde van salderen betekent', 'Per 1 januari 2027 mag teruggeleverde stroom niet meer worden weggestreept.', '/familie/rekenhulp/zonnepanelen-2027/');
  if (geboortejaar && jaar - geboortejaar >= 74) voeg('rijbewijs', 'Check de datum op het rijbewijs', 'Vanaf 75 jaar is voor verlengen een medische keuring nodig. Dat kost tijd. Zet de verloopdatum bij de documenten, dan waarschuwen we op tijd.');
  voeg('documenten', 'Leg vast waar de belangrijke papieren liggen', 'Paspoort, polissen, het laatste besluit van de Belastingdienst en het CAK.');
  if (profiel.dringend === 'post') voeg('post', 'Maak een foto van de brief die je niet snapt', 'We halen eruit van wie hij is, wat je moet doen en vóór wanneer.');
  return t;
}

export const aantalBeantwoord = (antwoorden) => VRAGEN.filter((v) => antwoorden[v.id] !== undefined && antwoorden[v.id] !== '' && !(Array.isArray(antwoorden[v.id]) && !antwoorden[v.id].length)).length;
