// Parameters voor alle berekeningen. Eén plek om bij te werken als de
// Belastingdienst / Dienst Toeslagen nieuwe bedragen publiceert.
//
// Controleer elk jaar (rond november voor het nieuwe jaar):
// - Toeslagenkaart (belastingdienst.nl/toeslagen)
// - Regeling huurtoeslaggrenzen <jaar> (wetten.overheid.nl)
// - Regeling vaststelling standaardpremie <jaar> (wetten.overheid.nl)
// - Bedragen kinderopvangtoeslag <jaar> (rijksoverheid.nl)
// - Kinderbijslagbedragen (svb.nl), wijzigen per 1 januari en 1 juli

export const JAAR = 2026;
export const GECONTROLEERD_OP = '2026-09-28';

// Awir: een toeslag lager dan € 24 per jaar wordt niet uitgekeerd.
export const MINIMUM_TOESLAG_PER_JAAR = 24;

export const ZORGTOESLAG = {
  standaardpremie: 2119, // per persoon per jaar
  drempelinkomen: 29736,
  normpercentageAlleen: 0.01912,
  normpercentagePartner: 0.04289,
  afbouwpercentage: 0.1373, // over inkomen boven drempelinkomen
  vermogensgrensAlleen: 146011,
  vermogensgrensPartner: 184633,
  // Gepubliceerde grenzen (ter controle in tests)
  maxInkomenAlleen: 40857,
  maxInkomenPartner: 51142,
  bronnen: [
    ['Dienst Toeslagen – Hoeveel zorgtoeslag krijg ik in 2026?', 'https://www.belastingdienst.nl/wps/wcm/connect/nl/zorgtoeslag/content/hoeveel-zorgtoeslag-in-2026'],
    ['Regeling vaststelling standaardpremie 2026', 'https://wetten.overheid.nl/BWBR0051838/2026-01-01'],
  ],
};

export const HUURTOESLAG = {
  // Vanaf 2026: vaste basishuur + lineaire inkomensafbouw (Wet huurtoeslag, kamerstuk 36608)
  basishuurEen: 202.52,
  basishuurMeer: 200.71,
  inkomensijkpuntEen: 23425,
  inkomensijkpuntMeer: 31500,
  afbouwpercentageEen: 0.27,
  afbouwpercentageMeer: 0.22,
  kwaliteitskortingsgrens: 498.2,
  aftoppingsgrensKlein: 713.02, // 1 of 2 personen
  aftoppingsgrensGroot: 764.14, // 3 of meer personen
  maximaleHuurgrens: 932.93, // 21 jaar en ouder
  maximaleHuurgrensJong: 498.2, // 18 t/m 20 jaar
  leeftijdVolledig: 21,
  percentageTotKwaliteitskorting: 1.0,
  percentageTotAftopping: 0.65,
  percentageBovenAftopping: 0.4, // alleen AOW-huishoudens / aangepaste woning
  vermogensgrensPerPersoon: 38479,
  bronnen: [
    ['Dienst Toeslagen – Bedragen huurtoeslag 2026', 'https://www.overtoeslagen.nl/actueel/nieuws/2025/11/24/bedragen-huurtoeslag-en-andere-toeslagen-2026-bekend'],
    ['Regeling huurtoeslaggrenzen 2026', 'https://wetten.overheid.nl/BWBR0051841/2026-01-01'],
    ['Rijksoverheid – Huurtoeslagparameters 2026', 'https://www.rijksoverheid.nl/actueel/nieuws/2025/11/25/indexering-inkomensgrenzen-woningcorporaties-maximale-huurprijsgrenzen-en-huurtoeslagparameters-2026'],
  ],
};

export const KINDGEBONDEN_BUDGET = {
  bedragPerKind: 2580,
  extra12tot15: 703, // 3.283 - 2.580
  extra16tot17: 936, // 3.516 - 2.580
  alleenstaandeOuderkop: 3320,
  drempelinkomenAlleen: 29736,
  drempelinkomenPartner: 39141,
  afbouwpercentage: 0.076,
  vermogensgrensAlleen: 146011,
  vermogensgrensPartner: 184633,
  bronnen: [
    ['Dienst Toeslagen – Hoeveel kindgebonden budget krijg ik?', 'https://www.belastingdienst.nl/wps/wcm/connect/nl/kindgebonden-budget/content/hoeveel-kindgebonden-budget'],
    ['Consumentenbond – Kindgebonden budget 2026', 'https://www.consumentenbond.nl/toeslagen/kindgebonden-budget'],
  ],
};

export const KINDEROPVANGTOESLAG = {
  maxUurprijs: { dagopvang: 11.23, bso: 9.98, gastouder: 8.49 },
  maxUrenPerMaand: 230,
  inkomenMaximaalPercentage: 56412,
  // Ankerpunten uit de officiële tabel 2026 (gezamenlijk toetsingsinkomen → %).
  // Tussen de ankerpunten wordt lineair geïnterpoleerd: dit is een benadering
  // van de officiële tabel met 69 inkomensklassen (afwijking ca. 1 procentpunt).
  tabelEersteKind: [
    [56412, 0.96],
    [80000, 0.859],
    [100000, 0.721],
    [120000, 0.606],
    [165658, 0.365],
  ],
  tabelVolgendKind: [
    [56412, 0.96],
    [80000, 0.939],
    [100000, 0.905],
    [120000, 0.879],
    [235689, 0.682],
  ],
  bronnen: [
    ['Rijksoverheid – Bedragen kinderopvangtoeslag 2026', 'https://www.rijksoverheid.nl/onderwerpen/kinderopvangtoeslag/bedragen-kinderopvangtoeslag-2026'],
    ['Dienst Toeslagen – Maximale uurprijs', 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/toeslagen/kinderopvangtoeslag/hoeveel-kinderopvangtoeslag-kan-ik-krijgen/maximaal-uurtarief-voor-de-kinderopvang'],
  ],
};

export const KINDERBIJSLAG = {
  // Bedragen per kwartaal vanaf 1 juli 2026 (SVB). Eerste helft 2026 tussen haakjes.
  perKwartaal: { tot6: 298.4, tot12: 362.35, tot18: 426.29 },
  perKwartaalEersteHelft: { tot6: 295.07, tot12: 358.3, tot18: 421.53 },
  bronnen: [
    ['SVB – Kinderbijslag gaat per 1 juli 2026 omhoog', 'https://www.svb.nl/nl/kinderbijslag/nieuws/kinderbijslag-gaat-per-1-juli-2026-omhoog'],
  ],
};

export const ZZP = {
  zelfstandigenaftrek: 1200, // bij urencriterium (1.225 uur)
  mkbWinstvrijstelling: 0.127,
  bronnen: [
    ['Belastingdienst – Mkb-winstvrijstelling 2026', 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/inkomstenbelasting/veranderingen-inkomstenbelasting-2026/mkb-winstvrijstelling-2026'],
    ['Belastingdienst – Zelfstandigenaftrek 2026', 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/inkomstenbelasting/veranderingen-inkomstenbelasting-2026/ondernemersaftrek-2026/zelfstandigenaftrek-2026'],
  ],
};
