// De jaarstrook: het toeslagjaar als 12 maanden. Laat zien welke maanden al
// voorbij zijn maar nog aangevraagd kunnen worden, welke verloren zijn, en wat
// je nog krijgt of (bij een te hoog voorschot) terug moet betalen.
//
// Regels voor aanvragen met terugwerkende kracht:
// - zorgtoeslag, huurtoeslag, kindgebonden budget: over jaar J tot 1 september J+1
//   (dus het hele jaar, ook maanden die al voorbij zijn);
// - kinderopvangtoeslag: binnen 3 maanden na de maand waarin de opvang begon;
//   oudere maanden zijn verloren.
export const TERUG = { zorgtoeslag: 'jaar', huurtoeslag: 'jaar', kindgebondenBudget: 'jaar', kinderopvangtoeslag: 3 };

export const deadline = (soort, jaar) => (TERUG[soort] === 'jaar' ? `${jaar + 1}-09-01` : null);

/**
 * @param {{ soort: string, perMaand: number, jaar: number, vandaag?: Date, voorschot?: number }} i
 */
export function jaarstrook({ soort, perMaand, jaar, vandaag = new Date(), voorschot = 0 }) {
  const terug = TERUG[soort] ?? 'jaar';
  const j = vandaag.getFullYear();
  // Index van de huidige maand binnen het toeslagjaar: -1 = jaar nog niet begonnen, 12 = voorbij
  const nu = j < jaar ? -1 : j > jaar ? 12 : vandaag.getMonth();
  const deadlineVoorbij = terug === 'jaar' && vandaag >= new Date(`${jaar + 1}-09-01T00:00:00`);
  const maanden = Array.from({ length: 12 }, (_, m) => {
    let status;
    if (m === nu) status = 'nu';
    else if (m > nu) status = 'komend';
    else if (voorschot > 0) status = 'voorbij';
    else if (deadlineVoorbij || (terug !== 'jaar' && m < nu - terug)) status = 'verloren';
    else status = 'terug';
    return { m, status };
  });
  const tel = (s) => maanden.filter((x) => s.includes(x.status)).length;
  const r2 = (n) => Math.round(n * 100) / 100;
  return {
    maanden,
    // Nog niet aangevraagd: wat je over voorbije maanden nog kunt krijgen
    terugMaanden: tel(['terug']),
    terugBedrag: r2(tel(['terug']) * perMaand),
    verlorenMaanden: tel(['verloren']),
    // Krijg je al een voorschot: verschil over het hele jaar
    verschilJaar: voorschot > 0 ? r2((perMaand - voorschot) * 12) : 0,
    resterend: tel(['nu', 'komend']),
    deadline: deadline(soort, jaar),
  };
}
