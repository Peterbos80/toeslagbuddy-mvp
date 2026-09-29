// Controle van de invoer in de rekenhulpen (R7). Rare of onmogelijke waarden
// geven een melding in gewone taal in plaats van een uitkomst.
import { teksten } from '../i18n/i18n.js';

// Nederlandse schrijfwijzen: "25.000", "25000,50", "€ 1 200", "-500"
// Leeg geeft null, onleesbaar geeft NaN.
export function leesGetal(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\s|€/g, '');
  if (!s) return null;
  if (!/^[-+]?[\d.,]*\d[\d.,]*$/.test(s) && !/^[-+]?\d+(\.\d+)?e[-+]?\d+$/i.test(s)) return NaN;
  const schoon = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,](?=\d{3}(\D|$))/g, '');
  const n = Number(schoon);
  return Number.isFinite(n) ? n : NaN;
}

const MLN = 1_000_000;
// [minimum, maximum, heel getal?] per veld. De omschrijving ('Het inkomen')
// staat per taal in src/i18n (validatie.velden).
const BEREIK = {
  inkomen: [0, 10 * MLN],
  vermogen: [-10 * MLN, 100 * MLN],
  kaleHuur: [0, 10_000],
  personen: [1, 20, true],
  volwassenen: [1, 20, true],
  leeftijd: [0, 120, true],
  medebewoners: [0, 20, true],
  inkomenMedebewoners: [0, 10 * MLN],
  aantalKinderen: [0, 20, true],
  uren: [0, 230],
  uurprijs: [0, 100],
  brutoMaand: [0, MLN],
  overig: [0, 10 * MLN],
  aftrek: [0, 10 * MLN],
  winstTotNu: [-10 * MLN, 10 * MLN],
  verwachteJaarwinst: [-10 * MLN, 10 * MLN],
  ander: [0, 10 * MLN],
  partnerInkomen: [0, 10 * MLN],
  opgegevenInkomen: [0, 10 * MLN],
};
// [minimum, maximum, omschrijving (Nederlands), heel getal?]
export const GRENZEN = Object.fromEntries(
  Object.entries(BEREIK).map(([k, [min, max, heel]]) => [k, heel ? [min, max, teksten('nl').validatie.velden[k], true] : [min, max, teksten('nl').validatie.velden[k]]]),
);

/** Controleert één veld. Geeft null (goed) of een melding in gewone taal. */
export function valideerVeld(naam, ruw, taal = 'nl') {
  const grens = BEREIK[naam];
  if (!grens) return null;
  const n = leesGetal(ruw);
  if (n === null) return null; // leeg: 'verplicht' wordt apart gecontroleerd
  const t = teksten(taal);
  const [min, max, heel] = grens;
  const wat = t.validatie.velden[naam];
  const getal = (x) => x.toLocaleString(t.locale);
  if (Number.isNaN(n)) return t.validatie.geenGetal(wat);
  if (n < 0 && min >= 0) return t.validatie.negatief(wat);
  if (n < min) return t.validatie.minimaal(wat, getal(min));
  if (n > max) return t.validatie.teHoog(wat, getal(max));
  if (heel && !Number.isInteger(n)) return t.validatie.heel(wat);
  return null;
}

/**
 * Controleert alle velden. `velden` is een lijst van [naam, waarde] (zoals uit
 * een formulier). Geeft een lijst van {veld, index, melding}; leeg = alles goed.
 */
export function valideer(velden, taal = 'nl') {
  const fouten = [];
  velden.forEach(([veld, waarde], index) => {
    const melding = valideerVeld(veld, waarde, taal);
    if (melding) fouten.push({ veld, index, melding });
  });
  return fouten;
}
