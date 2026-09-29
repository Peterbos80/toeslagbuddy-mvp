// Controle van de invoer in de rekenhulpen (R7). Rare of onmogelijke waarden
// geven een melding in gewone taal in plaats van een uitkomst.

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
// [minimum, maximum, omschrijving, heel getal?]
export const GRENZEN = {
  inkomen: [0, 10 * MLN, 'Het inkomen'],
  vermogen: [-10 * MLN, 100 * MLN, 'Het vermogen'],
  kaleHuur: [0, 10_000, 'De huur per maand'],
  personen: [1, 20, 'Het aantal personen', true],
  volwassenen: [1, 20, 'Het aantal volwassenen', true],
  leeftijd: [0, 120, 'De leeftijd', true],
  medebewoners: [0, 20, 'Het aantal medebewoners', true],
  inkomenMedebewoners: [0, 10 * MLN, 'Het inkomen van de medebewoners'],
  aantalKinderen: [0, 20, 'Het aantal kinderen', true],
  uren: [0, 230, 'Het aantal uren opvang per maand'],
  uurprijs: [0, 100, 'De uurprijs'],
  brutoMaand: [0, MLN, 'Het bruto maandloon'],
  overig: [0, 10 * MLN, 'Het overige inkomen'],
  aftrek: [0, 10 * MLN, 'De aftrekposten'],
  winstTotNu: [-10 * MLN, 10 * MLN, 'De winst'],
  verwachteJaarwinst: [-10 * MLN, 10 * MLN, 'De verwachte winst'],
  ander: [0, 10 * MLN, 'Het andere inkomen'],
  partnerInkomen: [0, 10 * MLN, 'Het inkomen van je partner'],
  opgegevenInkomen: [0, 10 * MLN, 'Het opgegeven inkomen'],
};

const bedragTekst = (n) => n.toLocaleString('nl-NL');

/** Controleert één veld. Geeft null (goed) of een melding in gewone taal. */
export function valideerVeld(naam, ruw) {
  const grens = GRENZEN[naam];
  if (!grens) return null;
  const n = leesGetal(ruw);
  if (n === null) return null; // leeg: 'verplicht' wordt apart gecontroleerd
  const [min, max, wat, heel] = grens;
  if (Number.isNaN(n)) return `${wat} is geen getal. Gebruik alleen cijfers, bijvoorbeeld 25000.`;
  if (n < 0 && min >= 0) return `${wat} kan niet negatief zijn. Vul 0 of meer in.`;
  if (n < min) return `${wat} moet minimaal ${bedragTekst(min)} zijn.`;
  if (n > max) return `${wat} is te hoog. Het maximum is ${bedragTekst(max)}. Controleer of je niet te veel nullen hebt getypt.`;
  if (heel && !Number.isInteger(n)) return `${wat} moet een heel getal zijn, zonder komma.`;
  return null;
}

/**
 * Controleert alle velden. `velden` is een lijst van [naam, waarde] (zoals uit
 * een formulier). Geeft een lijst van {veld, index, melding}; leeg = alles goed.
 */
export function valideer(velden) {
  const fouten = [];
  velden.forEach(([veld, waarde], index) => {
    const melding = valideerVeld(veld, waarde);
    if (melding) fouten.push({ veld, index, melding });
  });
  return fouten;
}
