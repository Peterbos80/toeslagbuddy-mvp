// Realistische AI-video's: vooraf gemaakte clips per persona en segment
// (zonder persoonsgegevens) + persoonlijke ondertitels in de browser.
// Zo krijgt de bezoeker een echte presentator te zien, terwijl zijn
// gegevens nooit naar de videodienst gaan.
import { euro } from './toeslagen.js';
import { PERSONAS } from './uitleg.js';

// Gesproken tekst per segment. {intro} en {tip} komen uit de persona.
export const SEGMENTEN = {
  intro: (p) => p.intro,
  ja: () => 'Goed nieuws! In beeld zie je hoeveel je waarschijnlijk kunt krijgen. Dat geld is voor jou bedoeld, dus laat het niet liggen.',
  nee: () => 'Met wat je hebt ingevuld, heb je waarschijnlijk geen recht op deze toeslag. Kijk wel even naar de andere regelingen hieronder, bijvoorbeeld van je gemeente.',
  zorgtoeslag: () => 'Zorgtoeslag is een bijdrage in de kosten van je zorgverzekering. Hoe lager je inkomen, hoe meer je krijgt.',
  huurtoeslag: () => 'Huurtoeslag is een bijdrage in je huur. Een deel van de huur betaal je altijd zelf; over de rest krijg je een vergoeding.',
  kindgebondenBudget: () => 'Het kindgebonden budget is extra geld voor je kinderen, bovenop de kinderbijslag.',
  kinderopvangtoeslag: () => 'Met kinderopvangtoeslag krijg je een groot deel van de kosten van de opvang terug. Let op: boven de maximale uurprijs betaal je zelf.',
  kinderbijslag: () => 'Kinderbijslag krijg je van de SVB voor elk kind tot achttien jaar, ongeacht je inkomen.',
  zzpTerug: () => 'Let op: je inkomen wordt hoger dan je hebt opgegeven. Pas het nu aan in Mijn toeslagen, dan hoef je straks niets terug te betalen.',
  zzpBij: () => 'Je krijgt nu waarschijnlijk te weinig. Pas je inkomen aan in Mijn toeslagen, dan krijg je meteen wat je toekomt.',
  zzpGoed: () => 'Je voorschot klopt ongeveer. Mooi zo! Doe de check volgende maand gewoon opnieuw.',
  tip: (p) => p.tip,
  aanvragen: () => 'Aanvragen doe je op toeslagen punt nl met je DigiD. Hulp nodig? Bel gratis de BelastingTelefoon.',
};

const TOESLAGEN = ['zorgtoeslag', 'huurtoeslag', 'kindgebondenBudget', 'kinderopvangtoeslag', 'kinderbijslag'];
const bedrag = (n) => (Number.isInteger(n) ? euro(n) : euro(n, 2));
const NAMEN = { zorgtoeslag: 'Zorgtoeslag', huurtoeslag: 'Huurtoeslag', kindgebondenBudget: 'Kindgebonden budget', kinderopvangtoeslag: 'Kinderopvangtoeslag', kinderbijslag: 'Kinderbijslag' };

/**
 * Welke clips spelen we af, met welke persoonlijke ondertitel?
 * @returns {{segment: string, ondertitel: string}[]}
 */
export function videoPlan(calc, uitkomst, persona) {
  const plan = [{ segment: 'intro', ondertitel: `${persona.naam}${persona.leeftijd ? `, ${persona.leeftijd}` : ''}` }];
  if (calc === 'alles') {
    if (uitkomst.totaalPerMaand > 0) {
      plan.push({ segment: 'ja', ondertitel: `± ${euro(uitkomst.totaalPerMaand)} per maand\n${euro(uitkomst.totaalPerJaar)} per jaar` });
      for (const k of TOESLAGEN) {
        if (uitkomst[k] && uitkomst[k].recht) plan.push({ segment: k, ondertitel: `${NAMEN[k]}: ${bedrag(uitkomst[k].perMaand)} per maand` });
      }
    } else {
      plan.push({ segment: 'nee', ondertitel: 'Kijk ook naar de regelingen van je gemeente' });
    }
  } else if (calc === 'zzp') {
    const seg = uitkomst.status === 'terugbetalen' ? 'zzpTerug' : uitkomst.status === 'bijkrijgen' ? 'zzpBij' : 'zzpGoed';
    const tekst = uitkomst.status === 'goed' ? 'Je voorschot klopt' : `Geef ${euro(uitkomst.adviesInkomen)} op als inkomen`;
    plan.push({ segment: seg, ondertitel: tekst });
  } else if (TOESLAGEN.includes(calc)) {
    if (uitkomst.recht) {
      plan.push({ segment: 'ja', ondertitel: `± ${bedrag(uitkomst.perMaand)} per maand` });
      plan.push({ segment: calc, ondertitel: `${NAMEN[calc]}: ${bedrag(uitkomst.perMaand)} per maand` });
    } else {
      plan.push({ segment: 'nee', ondertitel: uitkomst.reden || `Waarschijnlijk geen ${NAMEN[calc].toLowerCase()}` });
    }
  } else {
    return null; // geen video voor deze rekenhulp
  }
  plan.push({ segment: 'tip', ondertitel: 'Tip' });
  plan.push({ segment: 'aanvragen', ondertitel: 'toeslagen.nl · BelastingTelefoon 0800 0543' });
  return plan;
}

/** Alle clips die voor alle persona's gemaakt moeten worden */
export function alleClips(personas = PERSONAS) {
  const clips = [];
  for (const p of Object.values(personas)) {
    for (const [segment, tekst] of Object.entries(SEGMENTEN)) clips.push({ persona: p.id, segment, tekst: tekst(p) });
  }
  return clips;
}

/** Heeft het manifest alle clips voor dit plan? */
export function planCompleet(plan, manifest, personaId) {
  const m = manifest && manifest[personaId];
  return !!(plan && m && plan.every((s) => m[s.segment] && m[s.segment].src));
}
