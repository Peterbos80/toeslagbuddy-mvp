// Doelgroep-persona's: voor wie maken we content, wat houdt ze bezig en
// welke invalshoek werkt? De namen zijn fictief en worden in posts altijd
// als "rekenvoorbeeld" getoond, nooit als echte persoon of klantverhaal.

export const personas = [
  {
    id: 'student',
    naam: 'Sanne',
    leeftijd: 20,
    rol: 'student, woont in een studio',
    wie: 'Studenten en starters van 18–25 jaar met een bijbaan. Voor het eerst zelf een zorgverzekering; heeft geen idee dat toeslagen bestaan of denkt dat het “voor anderen” is.',
    pijn: ['Zorgpremie voelt als weggegooid geld', 'Bang om later te moeten terugbetalen', 'Formulieren van de overheid zijn eng'],
    kanaal: 'Reels en carrousels, avond en weekend',
    toon: 'luchtig, jij-vorm, emoji mag, kort',
    situatie: { leeftijd: 20, inkomen: 9000, huurt: true, kaleHuur: 520, kinderen: [] },
    haakjes: [
      'Student? Dan laat je dit waarschijnlijk liggen 👇',
      'Je zorgverzekering kost bijna niks als je dít regelt',
      '18 geworden? Doe deze check vóór je eerste premie',
    ],
    hashtags: ['#student', '#studentenleven', '#zorgtoeslag', '#geldtips', '#studeren'],
  },
  {
    id: 'alleenstaande-ouder',
    naam: 'Ilse',
    leeftijd: 34,
    rol: 'alleenstaande moeder van 2',
    wie: 'Alleenstaande ouders met een parttimebaan. Heeft weinig tijd, rekent elke maand, is wantrouwig na de toeslagenaffaire.',
    pijn: ['Elke euro telt', 'Angst voor terugvorderingen', 'Geen tijd om alles uit te zoeken'],
    kanaal: 'Carrousels en stories, ’s avonds na 20:00',
    toon: 'warm, respectvol, geen oordeel, concreet',
    situatie: { leeftijd: 34, inkomen: 26000, huurt: true, kaleHuur: 740, kinderen: [4, 9] },
    haakjes: [
      'Alleenstaande ouder? Check of je deze € 3.320 extra krijgt',
      'Zoveel toeslag hoort bij een parttimebaan met 2 kinderen',
      'Minder uren gaan werken? Zo verandert je toeslag',
    ],
    hashtags: ['#alleenstaandeouder', '#alleenstaandemoeder', '#momlife', '#kindgebondenbudget', '#geldzaken'],
  },
  {
    id: 'jong-gezin',
    naam: 'Mo & Lisa',
    leeftijd: 31,
    rol: 'jong gezin, allebei aan het werk, kind naar de opvang',
    wie: 'Tweeverdieners met jonge kinderen. Denken dat ze “te veel verdienen” voor toeslagen; schrikken van de opvangrekening.',
    pijn: ['Kinderopvang is duur', 'Denken geen recht te hebben', 'Druk, druk, druk'],
    kanaal: 'Carrousels en Reels, 12:00 en 21:00',
    toon: 'praktisch, cijfers voorop, tijdbesparend',
    situatie: { partner: true, leeftijd: 31, inkomen: 62000, huurt: false, kinderen: [1, 3], gebruiktOpvang: true, opvang: [{ soort: 'dagopvang', uren: 90, uurprijs: 11.5 }, { soort: 'dagopvang', uren: 60, uurprijs: 11.5 }] },
    haakjes: [
      '“Wij verdienen te veel voor toeslagen” – klopt dat wel?',
      'Wat kost een kinderdagverblijf je écht na toeslag?',
      'Tweeverdieners: dit percentage van je opvang krijg je terug',
    ],
    hashtags: ['#jonggezin', '#kinderopvang', '#ouderschap', '#kinderopvangtoeslag', '#gezinsleven'],
  },
  {
    id: 'aow',
    naam: 'Henk',
    leeftijd: 71,
    rol: 'AOW’er, alleenstaand, huurwoning',
    wie: 'Gepensioneerden met AOW en een klein pensioen. Veel minder online, maar kinderen en kleinkinderen zijn dat wel: content richt zich óók op hen (“check dit voor je opa/oma”).',
    pijn: ['Rondkomen van AOW', 'Digitale overheid is lastig', 'Wil niemand tot last zijn'],
    kanaal: 'Facebook-crossposts, carrousels met grote letters, overdag',
    toon: 'rustig, duidelijk, grote cijfers, geen jargon',
    situatie: { leeftijd: 71, aow: true, inkomen: 23000, huurt: true, kaleHuur: 780, kinderen: [] },
    haakjes: [
      'Heeft je opa of oma dit al aangevraagd?',
      'Met AOW huur je vaak goedkoper dan je denkt',
      'Deze toeslag laten veel ouderen liggen',
    ],
    hashtags: ['#aow', '#pensioen', '#ouderen', '#huurtoeslag', '#mantelzorg'],
  },
  {
    id: 'flex',
    naam: 'Dani',
    leeftijd: 27,
    rol: 'flexwerker/zzp’er met wisselend inkomen, huurt samen',
    wie: 'Flexwerkers en starters met wisselend inkomen. Bang om te veel te krijgen en terug te moeten betalen, dus vraagt niets aan.',
    pijn: ['Inkomen schommelt', 'Geen overzicht', 'Terugbetalen'],
    kanaal: 'Reels en carrousels, 18:00–22:00',
    toon: 'nuchter, eerlijk over risico’s, tips',
    situatie: { partner: true, leeftijd: 27, inkomen: 44000, huurt: true, kaleHuur: 950, kinderen: [] },
    haakjes: [
      'Samen huren in de vrije sector? Check dit 👇',
      'Huur boven € 932? Sinds 2026 kun je tóch huurtoeslag krijgen',
      'Minder opdrachten dit jaar? Dit gebeurt er met je toeslag',
    ],
    hashtags: ['#zzp', '#flexwerk', '#huren', '#huurtoeslag', '#financieletips'],
  },
];

// Merkstem en spelregels – gelden voor alle content.
export const spelregels = [
  'Alle bedragen komen uit de rekenmotor van de site; nooit afronden naar boven of “tot wel” overdrijven.',
  'Persona’s zijn altijd zichtbaar een rekenvoorbeeld (“Rekenvoorbeeld · fictief”). Nooit nep-reviews, nep-klantverhalen of nep-accounts.',
  'Urgentie alleen bij echte deadlines (1 januari, 31 december, 1 september).',
  'Partnerlinks altijd benoemen als partnerlink / #ad.',
  'Nooit angst aanjagen over terugvorderingen; wél uitleggen hoe je het voorkomt.',
  'Nooit om persoonlijke gegevens vragen in DM of reacties; verwijs naar de anonieme check.',
];
