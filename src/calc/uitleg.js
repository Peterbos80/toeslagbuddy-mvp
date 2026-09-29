// Persoonlijke uitleg bij een berekening, verteld door een (fictieve)
// persona die past bij de leeftijd en situatie van de bezoeker.
// Pure functies: dezelfde code draait in de browser en in de tests.
import { euro } from './toeslagen.js';
import { KINDGEBONDEN_BUDGET } from './params.js';

export const PERSONAS = {
  buddy: {
    id: 'buddy', naam: 'Buddy', leeftijd: null, rol: 'je digitale hulp van ToeslagBuddy',
    intro: 'Hoi, ik ben Buddy. Ik leg je in een halve minuut uit wat je uitkomst betekent.',
    tip: 'Verandert er iets in je inkomen of gezin? Geef het binnen vier weken door in Mijn toeslagen. Zo voorkom je dat je moet terugbetalen.',
    uiterlijk: { soort: 'mascotte', kleur: '#0d7a5f', accent: '#f2b233' },
  },
  sanne: {
    id: 'sanne', naam: 'Sanne', leeftijd: 21, rol: 'student en bijbaan in de horeca',
    intro: 'Hoi, ik ben Sanne. Ik ben 21 en studeer, dus ik weet precies hoe krap het kan zijn.',
    tip: 'Mijn tip: je studiefinanciering telt niet mee als inkomen. Maar ga je na je studie werken, geef dan meteen je nieuwe inkomen door.',
    uiterlijk: { huid: '#f1c7a5', haar: '#6b3e26', haarstijl: 'lang', shirt: '#7c5cff', bril: false },
  },
  dani: {
    id: 'dani', naam: 'Dani', leeftijd: 29, rol: 'zzp’er in de techniek',
    intro: 'Hoi, ik ben Dani. Ik werk als zzp’er, dus mijn inkomen gaat ook op en neer.',
    tip: 'Mijn tip: doe deze check elke maand. Loopt je bedrijf beter dan gedacht, pas dan meteen het inkomen aan in Mijn toeslagen.',
    uiterlijk: { huid: '#c98f65', haar: '#1f1a17', haarstijl: 'kort', shirt: '#0f766e', bril: true },
  },
  mo: {
    id: 'mo', naam: 'Mo', leeftijd: 34, rol: 'vader van twee, werkt samen met Lisa',
    intro: 'Hoi, ik ben Mo. Lisa en ik werken allebei en hebben twee kleine kinderen.',
    tip: 'Onze tip: vergelijk de uurprijs van je opvang met het maximum. Alles daarboven betaal je helemaal zelf.',
    uiterlijk: { huid: '#8d5a3b', haar: '#15110f', haarstijl: 'kort', shirt: '#2563eb', bril: false, baard: true },
  },
  ilse: {
    id: 'ilse', naam: 'Ilse', leeftijd: 36, rol: 'alleenstaande moeder van twee',
    intro: 'Hoi, ik ben Ilse. Ik ben alleenstaande moeder van twee kinderen, dus elke euro telt.',
    tip: `Mijn tip: als alleenstaande ouder krijg je tot ${euro(KINDGEBONDEN_BUDGET.alleenstaandeOuderkop)} per jaar extra kindgebonden budget. En kinderalimentatie telt niet mee als inkomen.`,
    uiterlijk: { huid: '#f5d0b5', haar: '#b7793b', haarstijl: 'staart', shirt: '#db2777', bril: false },
  },
  karin: {
    id: 'karin', naam: 'Karin', leeftijd: 54, rol: 'werkt parttime in de thuiszorg',
    intro: 'Hoi, ik ben Karin. Ik ben 54 en werk parttime in de thuiszorg.',
    tip: 'Mijn tip: vraag bij je gemeente naar de gemeentepolis. Die zorgverzekering is vaak goedkoper met een goede aanvullende dekking.',
    uiterlijk: { huid: '#e8b896', haar: '#8a8a8a', haarstijl: 'bob', shirt: '#ea580c', bril: true },
  },
  henk: {
    id: 'henk', naam: 'Henk', leeftijd: 71, rol: 'gepensioneerd, woont in een huurwoning',
    intro: 'Goedendag, ik ben Henk. Ik ben 71 en leef van mijn AOW en een klein pensioen.',
    tip: 'Mijn tip: met de AOW-leeftijd krijg je extra huurtoeslag als je huur hoger is. En heb je geen volledige AOW, vraag dan naar de AIO-aanvulling bij de SVB.',
    uiterlijk: { huid: '#f0c9a8', haar: '#e5e5e5', haarstijl: 'kaal', shirt: '#4b5563', bril: true },
  },
};

/**
 * Kies de persona die het beste bij de bezoeker past.
 * @param {{leeftijd?: number, aow?: boolean, partner?: boolean, kinderen?: number[]}} d
 * @param {string} calc naam van de rekenhulp
 */
export function kiesPersona(d = {}, calc = '') {
  if (calc === 'zzp') return PERSONAS.dani;
  const leeftijd = Number(d.leeftijd) || 0;
  const kinderen = (d.kinderen || []).length;
  if (d.aow || leeftijd >= 67) return PERSONAS.henk;
  if (leeftijd && leeftijd < 25) return PERSONAS.sanne;
  if (kinderen && !d.partner) return PERSONAS.ilse;
  if (kinderen && d.partner) return PERSONAS.mo;
  if (calc === 'kinderopvangtoeslag') return PERSONAS.mo;
  if (leeftijd >= 45) return PERSONAS.karin;
  if (leeftijd >= 25) return PERSONAS.dani;
  return PERSONAS.buddy; // geen gegevens: algemene uitleg
}

const bedrag = (n) => (Number.isInteger(n) ? euro(n) : euro(n, 2));

const NAMEN = {
  zorgtoeslag: ['Zorgtoeslag', 'een bijdrage in je zorgverzekering'],
  huurtoeslag: ['Huurtoeslag', 'een bijdrage in je huur'],
  kindgebondenBudget: ['Kindgebonden budget', 'extra geld voor je kinderen'],
  kinderopvangtoeslag: ['Kinderopvangtoeslag', 'een groot deel van je opvangkosten terug'],
  kinderbijslag: ['Kinderbijslag', 'van de SVB, voor elk kind'],
};

function eenToeslag(naam, r) {
  const [titel, wat] = NAMEN[naam];
  if (!r) return null;
  if (!r.recht) return `${titel}: waarschijnlijk niet. ${r.reden || ''}`.trim();
  return `${titel}: ongeveer ${bedrag(r.perMaand)} per maand. Dat is ${wat}.`;
}

/**
 * Maak het script (een lijst korte zinnen) voor de uitleg.
 * @returns {{persona: object, regels: string[]}}
 */
export function maakScript(calc, invoer, uitkomst, persona = kiesPersona(invoer, calc)) {
  const regels = [persona.intro];

  if (calc === 'alles') {
    if (uitkomst.totaalPerMaand > 0) {
      regels.push(`Goed nieuws: je kunt waarschijnlijk ${euro(uitkomst.totaalPerMaand)} per maand krijgen. Dat is ongeveer ${euro(uitkomst.totaalPerJaar)} per jaar.`);
      for (const k of Object.keys(NAMEN)) {
        const r = uitkomst[k];
        if (r && r.recht) regels.push(eenToeslag(k, r));
      }
    } else {
      regels.push('Met wat je nu hebt ingevuld, heb je waarschijnlijk geen recht op toeslagen van de Belastingdienst.');
    }
    if (uitkomst.tips && uitkomst.tips.length) {
      regels.push('Je gemeente heeft misschien nog meer voor je, zoals kwijtschelding of bijzondere bijstand. Die staan hieronder.');
    }
  } else if (calc === 'zzp') {
    if (uitkomst.status === 'terugbetalen') {
      regels.push(`Let op: je verwacht een inkomen van ongeveer ${euro(uitkomst.verwachtInkomen)}. Daardoor moet je waarschijnlijk ${euro(-uitkomst.verschilJaar)} terugbetalen als je niets doet.`);
      regels.push(`Geef in Mijn toeslagen een inkomen van ${euro(uitkomst.adviesInkomen)} op. Dan is het probleem meteen opgelost.`);
    } else if (uitkomst.status === 'bijkrijgen') {
      regels.push(`Je krijgt waarschijnlijk te weinig: ongeveer ${euro(uitkomst.verschilJaar)} per jaar. Verlaag het inkomen in Mijn toeslagen, dan krijg je het meteen.`);
    } else {
      regels.push('Je voorschot klopt ongeveer. Mooi zo! Check het volgende maand opnieuw.');
    }
  } else if (calc === 'toetsingsinkomen') {
    regels.push('Dit bedrag is je geschatte toetsingsinkomen. Dat is het inkomen waar Dienst Toeslagen naar kijkt.');
    regels.push('Gebruik het in de toeslagen-check, dan zie je meteen op welke toeslagen je recht hebt.');
  } else if (NAMEN[calc]) {
    const r = uitkomst;
    if (r.recht) {
      regels.push(`Goed nieuws: je krijgt waarschijnlijk ongeveer ${bedrag(r.perMaand)} per maand ${calc === 'kinderbijslag' ? '' : 'aan ' + NAMEN[calc][0].toLowerCase()}.`.replace(/\s+\./, '.'));
      if (calc === 'huurtoeslag') regels.push(`Een deel van de huur, ${euro(r.basishuur, 2)}, betaal je altijd zelf. Over de rest krijg je een vergoeding, en die wordt kleiner als je meer verdient.`);
      if (calc === 'kinderopvangtoeslag') regels.push(`Je betaalt zelf nog ongeveer ${euro(r.eigenBijdragePerMaand, 2)} per maand voor de opvang.`);
      if (calc === 'kinderbijslag') regels.push(`De SVB betaalt ${euro(r.perKwartaal, 2)} per kwartaal. Vergeet ook het kindgebonden budget niet.`);
    } else {
      regels.push(`Je hebt waarschijnlijk geen recht op ${NAMEN[calc][0].toLowerCase()}. ${r.reden || ''}`.trim());
      regels.push('Twijfel je? Doe de complete check. Soms heb je wel recht op een andere toeslag of een regeling van je gemeente.');
    }
  }

  if (persona.tip) regels.push(persona.tip);
  if (calc !== 'toetsingsinkomen') {
    regels.push('Aanvragen doe je op toeslagen punt nl met je DigiD. Hulp nodig? Bel gratis de BelastingTelefoon: 0800 0543.');
  }
  return { persona, regels: regels.filter(Boolean) };
}

// Tekst geschikt maken om voor te lezen: "€ 1.532" wordt "1532 euro".
export function voorSpraak(tekst) {
  return String(tekst)
    .replace(/€\s?(-?[\d.]+)(,(\d\d))?/g, (_, heel, __, cent) => `${heel.replace(/\./g, '')}${cent && cent !== '00' ? ` euro ${Number(cent)}` : ' euro'}`)
    .replace(/toeslagen punt nl/g, 'toeslagen punt n l')
    .replace(/0800 0543/g, '0 800, 0 5 4 3');
}
