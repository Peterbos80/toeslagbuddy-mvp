// Maakt Instagram-posts (carrousels) en een contentkalender. Alle bedragen
// komen rechtstreeks uit de rekenmotor, dus ze kloppen altijd met de site.
import { allesCheck, zorgtoeslag, euro } from '../src/calc/toeslagen.js';
import { JAAR, HUURTOESLAG as H, ZORGTOESLAG as Z, KINDGEBONDEN_BUDGET as K, KINDEROPVANGTOESLAG as O } from '../src/calc/params.js';
import { personas } from './personas.js';

const NAMEN = {
  zorgtoeslag: 'Zorgtoeslag',
  huurtoeslag: 'Huurtoeslag',
  kindgebondenBudget: 'Kindgebonden budget',
  kinderopvangtoeslag: 'Kinderopvangtoeslag',
  kinderbijslag: 'Kinderbijslag',
};

const bedrag = (r) => (Number.isInteger(r.perMaand) ? euro(r.perMaand) : euro(Math.round(r.perMaand)));

// Carrousel "Zoveel krijgt [persona]" – het sterkste format: concreet en herkenbaar.
// Ronde 2 en 3 van een persona rekenen met een ander inkomen, zodat elke post nieuw is.
const INKOMEN_VARIANT = [1, 1.3, 0.8];

function rekenvoorbeeld(persona, ronde = 0) {
  const factor = INKOMEN_VARIANT[ronde % INKOMEN_VARIANT.length];
  const p = { ...persona, situatie: { ...persona.situatie, inkomen: Math.round((persona.situatie.inkomen * factor) / 500) * 500 } };
  const haakIndex = ronde;
  const r = allesCheck(p.situatie);
  const regels = Object.keys(NAMEN)
    .filter((k) => r[k] && r[k].recht)
    .map((k) => [NAMEN[k], `${bedrag(r[k])} p/m`]);
  const situatie = [
    p.situatie.partner ? 'met partner' : 'alleenstaand',
    `inkomen ${euro(p.situatie.inkomen)} per jaar`,
    p.situatie.huurt ? `kale huur ${euro(p.situatie.kaleHuur)}` : 'koopwoning',
    p.situatie.kinderen.length ? `${p.situatie.kinderen.length} kind${p.situatie.kinderen.length > 1 ? 'eren' : ''} (${p.situatie.kinderen.join(' en ')} jaar)` : 'geen kinderen',
  ];
  const haak = p.haakjes[haakIndex % p.haakjes.length];
  return {
    type: 'rekenvoorbeeld',
    persona: p.id,
    slides: [
      { soort: 'haak', titel: haak, sub: 'Swipe voor het rekenvoorbeeld →' },
      { soort: 'persona', titel: `${p.naam}, ${p.leeftijd}`, sub: p.rol, lijst: situatie, label: 'Rekenvoorbeeld · fictief' },
      { soort: 'bedragen', titel: `Hier heeft ${p.naam} recht op in ${JAAR}`, lijst: regels },
      { soort: 'totaal', titel: `${euro(r.totaalPerMaand)} per maand`, sub: `Dat is ${euro(r.totaalPerJaar)} per jaar` },
      { soort: 'cta', titel: 'Hoeveel is het bij jou?', sub: 'Gratis & anoniem, in 2 minuten', knop: 'toeslagbuddy.nl' },
    ],
    caption: [
      haak,
      '',
      `Rekenvoorbeeld (fictief): ${p.naam}, ${p.leeftijd}, ${p.rol}. ${situatie.join(', ')}.`,
      '',
      ...regels.map(([n, b]) => `✅ ${n}: ${b}`),
      `💰 Totaal: ${euro(r.totaalPerMaand)} per maand`,
      '',
      'Jouw situatie is anders? Reken het zelf uit via de link in onze bio. Gratis, anoniem, geen DigiD nodig.',
      '',
      'ℹ️ Indicatie, gebaseerd op de officiële rekenregels ' + JAAR + '. ToeslagBuddy is onafhankelijk en geen onderdeel van de Belastingdienst.',
      '',
      [...p.hashtags, '#toeslagen', '#toeslagbuddy', '#geldbesparen'].join(' '),
    ].join('\n'),
  };
}

// Losse feiten: kort, deelbaar, opslaan-waardig.
const feiten = () => [
  {
    id: 'huur-geen-max',
    persona: 'flex',
    slides: [
      { soort: 'haak', titel: `Huur boven ${euro(H.maximaleHuurgrens, 2)}?`, sub: `Sinds ${JAAR} kun je tóch huurtoeslag krijgen` },
      { soort: 'tekst', titel: 'Wat is er veranderd?', lijst: ['Geen maximale huur meer als voorwaarde', `Er wordt gerekend tot ${euro(H.maximaleHuurgrens, 2)}`, 'Servicekosten tellen niet meer mee', 'Volledige toeslag vanaf 21 jaar (was 23)'] },
      { soort: 'cta', titel: 'Check of jij nu wél recht hebt', sub: 'Met de nieuwe regels van ' + JAAR, knop: 'toeslagbuddy.nl' },
    ],
    caption: `Vroeger: huur te hoog = geen huurtoeslag. Sinds ${JAAR} niet meer! 🏠\n\nIs je kale huur hoger dan ${euro(H.maximaleHuurgrens, 2)}? Dan wordt er gerekend alsof je huur ${euro(H.maximaleHuurgrens, 2)} is, en kun je dus tóch huurtoeslag krijgen (als je inkomen en vermogen niet te hoog zijn).\n\nOok nieuw: servicekosten tellen niet meer mee en je krijgt de volledige huurtoeslag al vanaf 21 jaar.\n\n👉 Check je huurtoeslag via de link in bio.\n\n#huurtoeslag #huren #vrijesector #middenhuur #toeslagen #toeslagbuddy`,
  },
  {
    id: 'zorgtoeslag-max',
    persona: 'student',
    slides: [
      { soort: 'haak', titel: `Tot ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} per maand`, sub: 'voor je zorgverzekering' },
      { soort: 'tekst', titel: 'Zorgtoeslag ' + JAAR, lijst: [`Alleen: max. ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} p/m`, `Met partner: max. ${euro(Math.floor(zorgtoeslag({ inkomen: 0, partner: true }).perJaar / 12))} p/m`, `Inkomensgrens: ${euro(Z.maxInkomenAlleen)} (alleen)`, `Samen: ${euro(Z.maxInkomenPartner)}`] },
      { soort: 'cta', titel: 'Heb jij het al aangevraagd?', sub: 'Reken het uit in 1 minuut', knop: 'toeslagbuddy.nl' },
    ],
    caption: `Verdien je minder dan ${euro(Z.maxInkomenAlleen)} per jaar? Dan heb je waarschijnlijk recht op zorgtoeslag. 💚\n\nAlleen: maximaal ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} per maand\nMet toeslagpartner: maximaal ${euro(Math.floor(zorgtoeslag({ inkomen: 0, partner: true }).perJaar / 12))} per maand\n\nStudiefinanciering telt níet mee als inkomen. Over dit jaar kun je nog aanvragen tot 1 september ${JAAR + 1}.\n\n👉 Link in bio voor je eigen berekening.\n\n#zorgtoeslag #student #zorgverzekering #geldtips #toeslagbuddy`,
  },
  {
    id: 'alo-kop',
    persona: 'alleenstaande-ouder',
    slides: [
      { soort: 'haak', titel: `${euro(K.alleenstaandeOuderkop)} extra per jaar`, sub: 'voor alleenstaande ouders' },
      { soort: 'tekst', titel: 'De alleenstaande-ouderkop', lijst: ['Komt bovenop het kindgebonden budget', `Maximaal tot een inkomen van ${euro(K.drempelinkomenAlleen)}`, 'Daarboven daalt het geleidelijk', 'Kinderalimentatie telt níet mee als inkomen'] },
      { soort: 'cta', titel: 'Krijg jij het al?', sub: 'Check al je toeslagen in één keer', knop: 'toeslagbuddy.nl' },
    ],
    caption: `Ben je alleenstaande ouder? Dan krijg je bovenop het kindgebonden budget maximaal ${euro(K.alleenstaandeOuderkop)} per jaar extra: de alleenstaande-ouderkop. 💪\n\nGoed om te weten: kinderalimentatie telt niet mee als inkomen, partneralimentatie wel.\n\n👉 Bereken via de link in bio wat jij krijgt – anoniem, je gegevens blijven op je telefoon.\n\n#alleenstaandeouder #kindgebondenbudget #alleenstaandemoeder #alleenstaandevader #toeslagbuddy`,
  },
  {
    id: 'opvang-96',
    persona: 'jong-gezin',
    slides: [
      { soort: 'haak', titel: '96% van je kinderopvang terug?', sub: `Tot ${euro(O.inkomenMaximaalPercentage)} gezamenlijk inkomen` },
      { soort: 'tekst', titel: 'Maximale uurprijs ' + JAAR, lijst: [`Dagopvang: ${euro(O.maxUurprijs.dagopvang, 2)}`, `BSO: ${euro(O.maxUurprijs.bso, 2)}`, `Gastouder: ${euro(O.maxUurprijs.gastouder, 2)}`, 'Hoger? Dat verschil betaal je zelf'] },
      { soort: 'cta', titel: 'Wat kost jouw opvang netto?', sub: 'Reken het uit per kind', knop: 'toeslagbuddy.nl' },
    ],
    caption: `Tot een gezamenlijk inkomen van ${euro(O.inkomenMaximaalPercentage)} krijg je 96% van de maximale uurprijs terug. 👶\n\nMaar let op: is de uurprijs van je opvang hoger dan het maximum (dagopvang ${euro(O.maxUurprijs.dagopvang, 2)}), dan betaal je dat verschil helemaal zelf.\n\n👉 Bereken je netto kosten via de link in bio.\n\n#kinderopvang #kinderopvangtoeslag #jonggezin #werkendeouders #toeslagbuddy`,
  },
  {
    id: 'terugbetalen',
    persona: 'flex',
    slides: [
      { soort: 'haak', titel: 'Nooit meer toeslag terugbetalen', sub: '5 tips die écht helpen' },
      { soort: 'tekst', titel: 'Zo voorkom je het', lijst: ['Geef wijzigingen binnen 4 weken door', 'Schat je inkomen liever iets te hoog', 'Check je voorschot elke januari', 'Let op je vermogen op 1 januari', 'Reken opnieuw als je situatie verandert'] },
      { soort: 'cta', titel: 'Bewaar deze post 📌', sub: 'En reken je toeslag opnieuw uit', knop: 'toeslagbuddy.nl' },
    ],
    caption: `Terugbetalen is het grootste toeslag-schrikbeeld. Zo voorkom je het: 👇\n\n1️⃣ Geef veranderingen binnen 4 weken door\n2️⃣ Schat je inkomen liever iets te hoog – te weinig gekregen krijg je later alsnog\n3️⃣ Check je voorschot elke januari\n4️⃣ Let op je vermogen op 1 januari\n5️⃣ Reken opnieuw als je situatie verandert\n\n📌 Bewaar deze post voor later.\n\n#toeslagen #terugbetalen #geldzaken #flexwerk #toeslagbuddy`,
  },
  {
    id: 'opa-oma',
    persona: 'aow',
    slides: [
      { soort: 'haak', titel: 'Check dit samen met je opa of oma', sub: 'Veel ouderen laten toeslag liggen' },
      { soort: 'tekst', titel: 'Met AOW heb je vaak recht op', lijst: ['Zorgtoeslag', 'Huurtoeslag – met extra vergoeding bij hogere huur', 'AIO-aanvulling bij een onvolledige AOW', 'Kwijtschelding gemeentelijke belastingen'] },
      { soort: 'cta', titel: 'Samen in 2 minuten gecheckt', sub: 'Geen DigiD nodig', knop: 'toeslagbuddy.nl' },
    ],
    caption: `Stuur dit door naar je ouders, opa of oma. ❤️\n\nMet AOW en een klein pensioen heb je vaak recht op zorgtoeslag en huurtoeslag. Heeft iemand in huis de AOW-leeftijd, dan krijg je zelfs extra vergoeding over het deel van de huur boven de aftoppingsgrens.\n\n👉 Doe samen de check via de link in bio. Gratis, anoniem en zonder DigiD.\n\n#aow #pensioen #ouderen #mantelzorg #huurtoeslag #toeslagbuddy`,
  },
];

/**
 * Bouwt een contentkalender: 3 posts per week (ma: rekenvoorbeeld,
 * wo: feit, za: rekenvoorbeeld) om 19:00. Geen enkele post komt dubbel voor.
 * @param {string} startDatum YYYY-MM-DD (een maandag)
 * @param {number} weken
 */
export function kalender(startDatum, weken = 6) {
  const f = feiten();
  const maxRekenvoorbeelden = personas.length * INKOMEN_VARIANT.length;
  const posts = [];
  let pi = 0;
  let fi = 0;
  for (let w = 0; w < weken; w++) {
    for (const [dag, soort] of [[0, 'persona'], [2, 'feit'], [5, 'persona']]) {
      const datum = new Date(`${startDatum}T12:00:00Z`);
      datum.setUTCDate(datum.getUTCDate() + w * 7 + dag);
      let post = null;
      if (soort === 'persona' && pi < maxRekenvoorbeelden) {
        const p = personas[pi % personas.length];
        const ronde = Math.floor(pi / personas.length);
        post = { id: `${p.id}-${ronde + 1}`, ...rekenvoorbeeld(p, ronde) };
        pi++;
      } else if (soort === 'feit' && fi < f.length) {
        post = { type: 'feit', ...f[fi] };
        fi++;
      }
      if (post) posts.push({ datum: datum.toISOString().slice(0, 10), tijd: '19:00', ...post });
    }
  }
  return posts;
}
