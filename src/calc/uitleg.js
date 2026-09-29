// Persoonlijke uitleg bij een berekening, verteld door een (fictieve)
// persona die past bij de leeftijd en situatie van de bezoeker.
// Pure functies: dezelfde code draait in de browser en in de tests.
import { euro } from './toeslagen.js';
import { KINDGEBONDEN_BUDGET } from './params.js';
import { teksten } from '../i18n/i18n.js';

// Vaste gegevens per persona; rol, intro en tip staan per taal in src/i18n.
const BASIS = {
  buddy: { naam: 'Buddy', leeftijd: null, uiterlijk: { soort: 'mascotte', kleur: '#0d7a5f', accent: '#f2b233' } },
  sanne: { naam: 'Sanne', leeftijd: 21, uiterlijk: { huid: '#f1c7a5', haar: '#6b3e26', haarstijl: 'lang', shirt: '#7c5cff', bril: false } },
  dani: { naam: 'Dani', leeftijd: 29, uiterlijk: { huid: '#c98f65', haar: '#1f1a17', haarstijl: 'kort', shirt: '#0f766e', bril: true } },
  mo: { naam: 'Mo', leeftijd: 34, uiterlijk: { huid: '#8d5a3b', haar: '#15110f', haarstijl: 'kort', shirt: '#2563eb', bril: false, baard: true } },
  ilse: { naam: 'Ilse', leeftijd: 36, uiterlijk: { huid: '#f5d0b5', haar: '#b7793b', haarstijl: 'staart', shirt: '#db2777', bril: false } },
  karin: { naam: 'Karin', leeftijd: 54, uiterlijk: { huid: '#e8b896', haar: '#8a8a8a', haarstijl: 'bob', shirt: '#ea580c', bril: true } },
  henk: { naam: 'Henk', leeftijd: 71, uiterlijk: { huid: '#f0c9a8', haar: '#e5e5e5', haarstijl: 'kaal', shirt: '#4b5563', bril: true } },
};

/** De persona's in een taal (rol, intro en tip vertaald). */
export function personas(taal = 'nl') {
  const t = teksten(taal).uitleg.personas;
  const kop = euro(KINDGEBONDEN_BUDGET.alleenstaandeOuderkop, 0, taal);
  return Object.fromEntries(
    Object.entries(BASIS).map(([id, b]) => [id, { id, naam: b.naam, leeftijd: b.leeftijd, rol: t[id].rol, intro: t[id].intro, tip: t[id].tip(kop), uiterlijk: b.uiterlijk }]),
  );
}

export const PERSONAS = personas('nl');

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

const TOESLAGEN = ['zorgtoeslag', 'huurtoeslag', 'kindgebondenBudget', 'kinderopvangtoeslag', 'kinderbijslag'];

/**
 * Maak het script (een lijst korte zinnen) voor de uitleg.
 * @param {{taal?: string}} [opties] taal van het script ('nl' of 'en')
 * @returns {{persona: object, regels: string[]}}
 */
export function maakScript(calc, invoer, uitkomst, persona = kiesPersona(invoer, calc), { taal = 'nl' } = {}) {
  const t = teksten(taal).uitleg;
  const e = (n, d = 0) => euro(n, d, taal);
  const bedrag = (n) => (Number.isInteger(n) ? e(n) : e(n, 2));
  persona = personas(taal)[persona.id] || persona;
  const regels = [persona.intro];

  if (calc === 'alles') {
    if (uitkomst.totaalPerMaand > 0) {
      regels.push(t.allesJa(e(uitkomst.totaalPerMaand), e(uitkomst.totaalPerJaar)));
      for (const k of TOESLAGEN) {
        const r = uitkomst[k];
        if (r && r.recht) regels.push(t.eenJa(t.namen[k][0], bedrag(r.perMaand), t.namen[k][1]));
      }
    } else {
      regels.push(t.allesNee);
    }
    if (uitkomst.tips && uitkomst.tips.length) regels.push(t.gemeente);
  } else if (calc === 'zzp') {
    if (uitkomst.status === 'terugbetalen') {
      regels.push(t.zzpTerug(e(uitkomst.verwachtInkomen), e(-uitkomst.verschilJaar)));
      regels.push(t.zzpAdvies(e(uitkomst.adviesInkomen)));
    } else if (uitkomst.status === 'bijkrijgen') {
      regels.push(t.zzpBij(e(uitkomst.verschilJaar)));
    } else {
      regels.push(t.zzpGoed);
    }
  } else if (calc === 'toetsingsinkomen') {
    regels.push(t.toets1, t.toets2);
  } else if (t.namen[calc]) {
    const r = uitkomst;
    const naam = t.namen[calc][0];
    if (r.recht) {
      regels.push(t.goedNieuws(bedrag(r.perMaand), calc === 'kinderbijslag' ? '' : naam));
      if (calc === 'huurtoeslag') regels.push(t.basishuur(e(r.basishuur, 2)));
      if (calc === 'kinderopvangtoeslag') regels.push(t.kotEigen(e(r.eigenBijdragePerMaand, 2)));
      if (calc === 'kinderbijslag') regels.push(t.kbKwartaal(e(r.perKwartaal, 2)));
    } else {
      regels.push(t.geenRecht(naam, r.reden || ''));
      regels.push(t.twijfel);
    }
  }

  if (persona.tip) regels.push(persona.tip);
  if (calc !== 'toetsingsinkomen') regels.push(t.aanvragen);
  return { persona, regels: regels.filter(Boolean) };
}

// Tekst geschikt maken om voor te lezen: "€ 1.532" wordt "1532 euro",
// in het Engels wordt "€1,532.50" "1532 euros 50".
export function voorSpraak(tekst, taal = 'nl') {
  if (taal === 'en') {
    return String(tekst)
      .replace(/€\s?(-?[\d,]+)(\.(\d\d))?/g, (_, heel, __, cent) => `${heel.replace(/,/g, '')}${cent && cent !== '00' ? ` euros ${Number(cent)}` : ' euros'}`)
      .replace(/toeslagen\.nl/g, 'toeslagen dot n l')
      .replace(/0800 0543/g, '0 800, 0 5 4 3');
  }
  return String(tekst)
    .replace(/€\s?(-?[\d.]+)(,(\d\d))?/g, (_, heel, __, cent) => `${heel.replace(/\./g, '')}${cent && cent !== '00' ? ` euro ${Number(cent)}` : ' euro'}`)
    .replace(/toeslagen punt nl/g, 'toeslagen punt n l')
    .replace(/0800 0543/g, '0 800, 0 5 4 3');
}
