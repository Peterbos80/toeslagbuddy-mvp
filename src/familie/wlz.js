// Eigen bijdrage Wet langdurige zorg (Wlz), volgens de rekenmethode die het
// CAK zelf publiceert (data/familie/regels/wlz-<jaar>.json, bronnen cak-*).
// Uitkomst is een indicatie: het CAK stelt de bijdrage vast.
import { waarde, afgerond } from './regels.js';

const pos = (n) => Math.max(0, Number(n) || 0);

// 4% van het vermogen boven het toetsbedrag
export function vermogensbijtelling(regel, { vermogen = 0, partner = false }) {
  const toets = waarde(regel, partner ? 'toetsbedragPartner' : 'toetsbedragAlleen');
  const boven = pos(pos(vermogen) - toets);
  return { toetsbedrag: toets, boven, bijtelling: afgerond(boven * waarde(regel, 'vermogen')) };
}

// Lage eigen bijdrage: 10% van het bijdrageplichtig inkomen, gedeeld door 12
// invoer: { verzamelinkomen, vermogen, partner, aow, mpt }
export function lageBijdrage(regel, invoer) {
  const { verzamelinkomen = 0, partner = false, aow = false, mpt = false } = invoer;
  const v = vermogensbijtelling(regel, invoer);
  const stappen = [];
  let bpi = pos(verzamelinkomen);
  stappen.push({ tekst: `Verzamelinkomen ${regel.peiljaar}${partner ? ' (samen)' : ''}`, bedrag: bpi });
  if (v.bijtelling) {
    bpi += v.bijtelling;
    stappen.push({ tekst: `4% van het vermogen boven het toetsbedrag (${v.boven.toLocaleString('nl-NL')} boven ${v.toetsbedrag.toLocaleString('nl-NL')})`, bedrag: v.bijtelling });
  }
  if (mpt) {
    const a = waarde(regel, 'mptInkomensaftrek');
    bpi = pos(bpi - a);
    stappen.push({ tekst: 'Inkomensaftrek bij zorg thuis (mpt of pgb)', bedrag: -a });
  }
  const reken = (inkomen) => {
    let maand = (inkomen * waarde(regel, 'laag')) / 12;
    if (mpt) maand -= waarde(regel, 'mptAftrekMaand');
    const min = waarde(regel, mpt ? 'mptMin' : 'laagMin');
    const max = waarde(regel, mpt ? 'mptMax' : 'laagMax');
    return { ruw: maand, maand: afgerond(Math.min(max, Math.max(min, maand))), min, max };
  };
  const hoog = reken(bpi);
  // Compensatie vervallen ouderentoeslag: "maximaal" een bedrag per persoon;
  // de precieze hoogte bepaalt het CAK. Daarom een bandbreedte.
  const comp = aow && pos(invoer.vermogen) > 0 ? waarde(regel, 'ouderentoeslagMax') * (partner ? 2 : 1) : 0;
  const laag = comp ? reken(pos(bpi - comp)) : hoog;
  return {
    soort: 'laag',
    bijdrageplichtigInkomen: afgerond(bpi),
    perMaand: hoog.maand,
    perMaandLaagst: laag.maand,
    minimum: hoog.min,
    maximum: hoog.max,
    opMinimum: hoog.maand === hoog.min,
    opMaximum: hoog.maand === hoog.max,
    compensatieMax: comp,
    stappen: [...stappen, { tekst: 'Bijdrageplichtig inkomen', bedrag: afgerond(bpi), totaal: true }, { tekst: `10% hiervan, gedeeld door 12${mpt ? ', min de mpt/pgb-aftrek' : ''}`, bedrag: afgerond(hoog.ruw) }],
  };
}

// Aftrek Zorgverzekeringswet per persoon (drie stappen van het CAK)
export function aftrekZvw(regel, { verzamelinkomen = 0, vermogen = 0, partner = false, aow = false, zvwAanslag = 0 }) {
  const premie = waarde(regel, 'zvwPremie');
  const bijdrage = aow ? pos(verzamelinkomen) * waarde(regel, 'zvwBijdrage') : pos(zvwAanslag);
  const min = waarde(regel, !aow ? 'zvwMinNietPensioen' : partner ? 'zvwMinGehuwdPensioen' : 'zvwMinAlleenPensioen');
  const stap1 = Math.min(waarde(regel, 'zvwMax'), Math.max(min, premie + bijdrage));
  let toeslag = partner
    ? (waarde(regel, 'zorgtoeslagGehuwd') - waarde(regel, 'zorgtoeslagAfbouw') * pos(pos(verzamelinkomen) - waarde(regel, 'zorgtoeslagDrempel'))) / 2
    : waarde(regel, 'zorgtoeslagAlleen') - waarde(regel, 'zorgtoeslagAfbouw') * pos(pos(verzamelinkomen) - waarde(regel, 'zorgtoeslagDrempel'));
  if (toeslag < 0 || pos(vermogen) > waarde(regel, partner ? 'zorgtoeslagVermogenPartner' : 'zorgtoeslagVermogenAlleen')) toeslag = 0;
  return { stap1: afgerond(stap1), zorgtoeslag: afgerond(toeslag), aftrek: afgerond(stap1 - toeslag) };
}

// Hoge eigen bijdrage (verblijf in een instelling, na de eerste 4 maanden)
// invoer: { verzamelinkomen, belasting, vermogen, partner, aow, arbeid, zvwAanslag }
// belasting = verschuldigde inkomstenbelasting of ingehouden loonheffing in het peiljaar
export function hogeBijdrage(regel, invoer) {
  const { verzamelinkomen = 0, belasting = 0, partner = false, aow = false, arbeid = 0 } = invoer;
  const personen = partner ? 2 : 1;
  const zvw = aftrekZvw(regel, invoer);
  const zak = waarde(regel, partner ? 'zakKleedgeldPartner' : 'zakKleedgeldAlleen');
  const leeftijd = waarde(regel, aow ? 'aftrekPensioen' : 'aftrekNietPensioen');
  const werk = afgerond(pos(arbeid) * waarde(regel, 'arbeid'));
  const netto = pos(verzamelinkomen) - pos(belasting);
  const stappen = [
    { tekst: `Verzamelinkomen ${regel.peiljaar}${partner ? ' (samen)' : ''}`, bedrag: pos(verzamelinkomen) },
    { tekst: 'Verschuldigde belasting', bedrag: -pos(belasting) },
    { tekst: `Aftrek Zorgverzekeringswet${partner ? ' (2 personen)' : ''}`, bedrag: -afgerond(zvw.aftrek * personen) },
    { tekst: 'Zak- en kleedgeld', bedrag: -zak },
    { tekst: aow ? 'Aftrek pensioengerechtigde leeftijd' : 'Aftrek niet-pensioengerechtigde leeftijd', bedrag: -leeftijd },
  ];
  if (werk) stappen.push({ tekst: '15% van de inkomsten uit werk', bedrag: -werk });
  const bpi = netto - zvw.aftrek * personen - zak - leeftijd - werk;
  stappen.push({ tekst: 'Bijdrageplichtig inkomen', bedrag: afgerond(bpi), totaal: true });

  // Aftrek van het beschikbaar inkomen: 25% boven de vrijstellingsgrens
  const beschikbaar = netto - waarde(regel, 'zvwPremie') * personen - zak - leeftijd - werk;
  const grens = waarde(regel, partner ? (aow ? 'vrijstellingGehuwdAow' : 'vrijstellingGehuwdJonger') : aow ? 'vrijstellingAlleenAow' : 'vrijstellingAlleenJonger');
  const aftrekBeschikbaar = afgerond(pos(beschikbaar - grens) * waarde(regel, 'beschikbaar'));
  if (aftrekBeschikbaar) stappen.push({ tekst: `Aftrek beschikbaar inkomen (25% boven € ${grens.toLocaleString('nl-NL')})`, bedrag: -aftrekBeschikbaar });
  const v = vermogensbijtelling(regel, invoer);
  if (v.bijtelling) stappen.push({ tekst: '4% van het vermogen boven het toetsbedrag', bedrag: v.bijtelling });
  const jaar = bpi - aftrekBeschikbaar + v.bijtelling;
  const max = waarde(regel, 'hoogMax');
  const klem = (j) => afgerond(Math.min(max, Math.max(0, j / 12)));
  const comp = aow && pos(invoer.vermogen) > 0 ? waarde(regel, 'ouderentoeslagMax') * personen : 0;
  stappen.push({ tekst: 'Hoge eigen bijdrage per jaar', bedrag: afgerond(Math.max(0, jaar)), totaal: true });
  return {
    soort: 'hoog',
    bijdrageplichtigInkomen: afgerond(bpi),
    perJaar: afgerond(Math.max(0, jaar)),
    perMaand: klem(jaar),
    perMaandLaagst: klem(jaar - comp),
    minimum: 0,
    maximum: max,
    opMinimum: klem(jaar) === 0,
    opMaximum: klem(jaar) === max,
    compensatieMax: comp,
    aftrekZvw: zvw,
    stappen,
  };
}

// Wat een huisverkoop of een schenking doet: het CAK kijkt 2 jaar terug.
// Geeft het jaar waarin een verandering in vermogen voor het eerst meetelt.
export const teltMeeVanaf = (jaarVanVerandering) => Number(jaarVanVerandering) + 2 + 1;
// Peildatum is 1 januari van het peiljaar: vermogen dat ná 1 januari van
// jaar X verandert, staat voor het eerst op 1 januari X+1 en telt dus mee
// voor de bijdrage van jaar X+3.
