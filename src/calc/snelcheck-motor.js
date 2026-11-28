// Snelcheck "Kan ik recht hebben?" in 3 vragen (startpagina). Geen bedragen:
// alleen de kans per toeslag, berekend met de echte rekenmotor aan beide
// kanten van de gekozen inkomensklasse. Aannames (bewust gunstig, zodat niemand
// onterecht afhaakt): geen spaargeld boven de grens, kale huur € 750, één kind
// van 8. De volledige check daaronder rekent het precies uit.
import { zorgtoeslag, huurtoeslag, kindgebondenBudget } from './toeslagen.js';

export const KLASSEN = [
  [0, 25_000],
  [25_000, 35_000],
  [35_000, 50_000],
  [50_000, 120_000],
];
export const AANNAME = { kaleHuur: 750, kind: 8, leeftijd: 30 };

// groot: ook bovenin de klasse nog recht; misschien: alleen onderin; klein: nergens
function kans(reken, [laag, hoog]) {
  if (reken(hoog).recht) return 'groot';
  if (reken(laag).recht) return 'misschien';
  return 'klein';
}

/**
 * @param {{ partner: boolean, klasse: number, huurt: boolean, kinderen: boolean, opvang: boolean }} a
 * @returns {{ id: string, kans: 'groot'|'misschien'|'klein' }[]}
 */
export function snelcheck(a) {
  const klasse = KLASSEN[a.klasse] || KLASSEN[0];
  const basis = { partner: !!a.partner, vermogen: 0, leeftijd: AANNAME.leeftijd };
  const uit = [{ id: 'zorgtoeslag', kans: kans((inkomen) => zorgtoeslag({ ...basis, inkomen }), klasse) }];
  if (a.huurt) {
    const personen = (a.partner ? 2 : 1) + (a.kinderen ? 1 : 0);
    uit.push({ id: 'huurtoeslag', kans: kans((inkomen) => huurtoeslag({ ...basis, inkomen, kaleHuur: AANNAME.kaleHuur, personen, volwassenen: a.partner ? 2 : 1 }), klasse) });
  }
  if (a.kinderen) {
    uit.push({ id: 'kinderbijslag', kans: 'groot' });
    uit.push({ id: 'kindgebondenBudget', kans: kans((inkomen) => kindgebondenBudget({ ...basis, inkomen, kinderen: [AANNAME.kind] }), klasse) });
  }
  // Kinderopvangtoeslag hangt niet af van een inkomensgrens: iedereen die werkt krijgt een deel
  if (a.kinderen && a.opvang) uit.push({ id: 'kinderopvangtoeslag', kans: 'groot' });
  return uit;
}
