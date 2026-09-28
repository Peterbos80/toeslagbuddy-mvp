// Rekenmotor voor alle toeslagen. Pure functies zonder afhankelijkheden,
// zodat dezelfde code in de browser en in de tests draait.
import {
  MINIMUM_TOESLAG_PER_JAAR,
  ZORGTOESLAG,
  HUURTOESLAG,
  KINDGEBONDEN_BUDGET,
  KINDEROPVANGTOESLAG,
  KINDERBIJSLAG,
} from './params.js';

const num = (v) => {
  const n = typeof v === 'string' ? Number(v.replace(/\./g, '').replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Uitbetaling per maand: Dienst Toeslagen keert hele euro's uit (naar beneden afgerond).
const perMaand = (jaar) => Math.floor(jaar / 12);

function resultaat(jaar, reden, extra = {}) {
  const heeftRecht = jaar >= MINIMUM_TOESLAG_PER_JAAR;
  const bedragJaar = heeftRecht ? Math.round(jaar * 100) / 100 : 0;
  return {
    recht: heeftRecht,
    perJaar: bedragJaar,
    perMaand: heeftRecht ? perMaand(bedragJaar) : 0,
    reden: heeftRecht ? null : reden || 'Je inkomen is te hoog voor deze toeslag.',
    ...extra,
  };
}

/**
 * Zorgtoeslag.
 * @param {{partner?: boolean, inkomen: number, vermogen?: number, leeftijd?: number}} i
 *   inkomen = (gezamenlijk) toetsingsinkomen per jaar
 */
export function zorgtoeslag(i) {
  const p = ZORGTOESLAG;
  const inkomen = num(i.inkomen);
  const vermogen = num(i.vermogen);
  if (i.leeftijd !== undefined && num(i.leeftijd) < 18) {
    return resultaat(0, 'Je moet 18 jaar of ouder zijn voor zorgtoeslag.');
  }
  const grens = i.partner ? p.vermogensgrensPartner : p.vermogensgrensAlleen;
  if (vermogen > grens) {
    return resultaat(0, `Je vermogen is hoger dan de grens van ${euro(grens)}.`);
  }
  const personen = i.partner ? 2 : 1;
  const pct = i.partner ? p.normpercentagePartner : p.normpercentageAlleen;
  const normpremie = pct * p.drempelinkomen + p.afbouwpercentage * Math.max(0, inkomen - p.drempelinkomen);
  const jaar = Math.max(0, personen * p.standaardpremie - normpremie);
  return resultaat(jaar, null, { normpremie: Math.round(normpremie) });
}

/**
 * Huurtoeslag (systeem vanaf 2026).
 * @param {{
 *   kaleHuur: number, inkomen: number, vermogen?: number,
 *   personen?: number, volwassenen?: number, leeftijd?: number,
 *   aow?: boolean, aangepasteWoning?: boolean, zelfstandig?: boolean
 * }} i
 */
export function huurtoeslag(i) {
  const p = HUURTOESLAG;
  const kaleHuur = num(i.kaleHuur);
  const inkomen = num(i.inkomen);
  const vermogen = num(i.vermogen);
  const personen = Math.max(1, Math.round(num(i.personen) || 1));
  const volwassenen = Math.max(1, Math.round(num(i.volwassenen) || Math.min(personen, 2)));
  const leeftijd = i.leeftijd === undefined ? 30 : num(i.leeftijd);

  if (i.zelfstandig === false) {
    return resultaat(0, 'Huurtoeslag kan alleen voor een zelfstandige woonruimte (eigen voordeur, keuken en toilet).');
  }
  if (leeftijd < 18) {
    return resultaat(0, 'Je moet in de regel 18 jaar of ouder zijn voor huurtoeslag.');
  }
  const vermogensgrens = p.vermogensgrensPerPersoon * volwassenen;
  if (vermogen > vermogensgrens) {
    return resultaat(0, `Het vermogen van je huishouden is hoger dan ${euro(vermogensgrens)}.`);
  }
  if (kaleHuur <= 0) return resultaat(0, 'Vul je kale huur in.');

  const een = personen === 1;
  const maxHuur = leeftijd < p.leeftijdVolledig ? p.maximaleHuurgrensJong : p.maximaleHuurgrens;
  const rekenhuur = Math.min(kaleHuur, maxHuur);
  const basishuur = een ? p.basishuurEen : p.basishuurMeer;
  const aftopping = personen <= 2 ? p.aftoppingsgrensKlein : p.aftoppingsgrensGroot;

  const deel1 = Math.max(0, Math.min(rekenhuur, p.kwaliteitskortingsgrens) - basishuur) * p.percentageTotKwaliteitskorting;
  const deel2 = Math.max(0, Math.min(rekenhuur, aftopping) - Math.max(basishuur, p.kwaliteitskortingsgrens)) * p.percentageTotAftopping;
  const bovenAftopping = i.aow || i.aangepasteWoning;
  const deel3 = bovenAftopping ? Math.max(0, rekenhuur - Math.max(basishuur, aftopping)) * p.percentageBovenAftopping : 0;
  const maxPerMaand = deel1 + deel2 + deel3;

  const ijkpunt = een ? p.inkomensijkpuntEen : p.inkomensijkpuntMeer;
  const afbouw = een ? p.afbouwpercentageEen : p.afbouwpercentageMeer;
  const verminderingPerMaand = (afbouw * Math.max(0, inkomen - ijkpunt)) / 12;
  const maand = Math.max(0, maxPerMaand - verminderingPerMaand);

  const reden = maxPerMaand <= 0 ? 'Je huur is lager dan de basishuur die je zelf betaalt.' : null;
  return resultaat(maand * 12, reden, {
    rekenhuur: round2(rekenhuur),
    basishuur,
    maximaalPerMaand: round2(maxPerMaand),
    verminderingPerMaand: round2(verminderingPerMaand),
    huurBovenGrens: kaleHuur > maxHuur,
  });
}

/**
 * Kindgebonden budget.
 * @param {{partner?: boolean, inkomen: number, vermogen?: number, kinderen: number[]}} i
 *   kinderen = leeftijden van de kinderen
 */
export function kindgebondenBudget(i) {
  const p = KINDGEBONDEN_BUDGET;
  const kinderen = (i.kinderen || []).map(num).filter((l) => l < 18);
  if (!kinderen.length) return resultaat(0, 'Kindgebonden budget is er alleen voor kinderen jonger dan 18 jaar.');
  const vermogen = num(i.vermogen);
  const grens = i.partner ? p.vermogensgrensPartner : p.vermogensgrensAlleen;
  if (vermogen > grens) return resultaat(0, `Je vermogen is hoger dan de grens van ${euro(grens)}.`);

  let maximum = 0;
  for (const leeftijd of kinderen) {
    maximum += p.bedragPerKind;
    if (leeftijd >= 16) maximum += p.extra16tot17;
    else if (leeftijd >= 12) maximum += p.extra12tot15;
  }
  if (!i.partner) maximum += p.alleenstaandeOuderkop;

  const drempel = i.partner ? p.drempelinkomenPartner : p.drempelinkomenAlleen;
  const vermindering = p.afbouwpercentage * Math.max(0, num(i.inkomen) - drempel);
  const jaar = Math.max(0, maximum - vermindering);
  return resultaat(jaar, null, { maximum, vermindering: Math.round(vermindering) });
}

// Vergoedingspercentage kinderopvangtoeslag (benadering officiële tabel).
export function kotPercentage(inkomen, eersteKind = true) {
  const tabel = eersteKind ? KINDEROPVANGTOESLAG.tabelEersteKind : KINDEROPVANGTOESLAG.tabelVolgendKind;
  const x = num(inkomen);
  if (x <= tabel[0][0]) return tabel[0][1];
  for (let k = 1; k < tabel.length; k++) {
    const [x1, y1] = tabel[k];
    if (x <= x1) {
      const [x0, y0] = tabel[k - 1];
      return round3(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
    }
  }
  return tabel[tabel.length - 1][1];
}

/**
 * Kinderopvangtoeslag.
 * @param {{inkomen: number, kinderen: {soort: 'dagopvang'|'bso'|'gastouder', uren: number, uurprijs: number}[]}} i
 *   uren = opvanguren per maand
 */
export function kinderopvangtoeslag(i) {
  const p = KINDEROPVANGTOESLAG;
  const kinderen = (i.kinderen || [])
    .map((k) => {
      const soort = p.maxUurprijs[k.soort] ? k.soort : 'dagopvang';
      const uren = Math.min(num(k.uren), p.maxUrenPerMaand);
      const uurprijs = num(k.uurprijs);
      const vergoedbaar = Math.min(uurprijs, p.maxUurprijs[soort]);
      return { soort, uren, uurprijs, vergoedbaar, kosten: uren * uurprijs };
    })
    .filter((k) => k.uren > 0 && k.uurprijs > 0)
    .sort((a, b) => b.kosten - a.kosten); // hoogste kosten = 'eerste kind'

  if (!kinderen.length) return resultaat(0, 'Vul opvanguren en uurprijs in.');

  let maand = 0;
  let kosten = 0;
  const perKind = kinderen.map((k, idx) => {
    const pct = kotPercentage(i.inkomen, idx === 0);
    const toeslag = pct * k.vergoedbaar * k.uren;
    maand += toeslag;
    kosten += k.kosten;
    return { ...k, percentage: pct, toeslagPerMaand: round2(toeslag) };
  });
  const r = resultaat(maand * 12, null, {
    perKind,
    kostenPerMaand: round2(kosten),
    eigenBijdragePerMaand: round2(kosten - maand),
  });
  // Kinderopvangtoeslag wordt niet naar beneden afgerond op hele euro's.
  if (r.recht) r.perMaand = round2(maand);
  return r;
}

/**
 * Kinderbijslag (SVB). Geen inkomenstoets.
 * @param {{kinderen: number[]}} i leeftijden
 */
export function kinderbijslag(i) {
  const p = KINDERBIJSLAG.perKwartaal;
  const kinderen = (i.kinderen || []).map(num).filter((l) => l < 18);
  if (!kinderen.length) return resultaat(0, 'Kinderbijslag is er voor kinderen jonger dan 18 jaar.');
  const kwartaal = kinderen.reduce((s, l) => s + (l < 6 ? p.tot6 : l < 12 ? p.tot12 : p.tot18), 0);
  const jaar = kwartaal * 4;
  return {
    recht: true,
    perJaar: round2(jaar),
    perKwartaal: round2(kwartaal),
    perMaand: Math.round(jaar / 12),
    reden: null,
  };
}

/**
 * Alles-check: berekent alle toeslagen in één keer en geeft tips voor
 * andere regelingen (gemeente, UWV, SVB).
 */
export function allesCheck(i) {
  const partner = !!i.partner;
  const kinderen = (i.kinderen || []).map(num).filter((l) => l < 18);
  const personen = 1 + (partner ? 1 : 0) + num(i.medebewoners) + kinderen.length;
  const volwassenen = 1 + (partner ? 1 : 0) + num(i.medebewoners);
  const aow = !!i.aow;

  const res = {
    zorgtoeslag: zorgtoeslag({ partner, inkomen: i.inkomen, vermogen: i.vermogen, leeftijd: i.leeftijd }),
    huurtoeslag: i.huurt
      ? huurtoeslag({
          kaleHuur: i.kaleHuur,
          inkomen: num(i.inkomen) + num(i.inkomenMedebewoners),
          vermogen: i.vermogen,
          personen,
          volwassenen,
          leeftijd: i.leeftijd,
          aow,
        })
      : null,
    kindgebondenBudget: kinderen.length ? kindgebondenBudget({ partner, inkomen: i.inkomen, vermogen: i.vermogen, kinderen }) : null,
    kinderopvangtoeslag: i.opvang && i.opvang.length ? kinderopvangtoeslag({ inkomen: i.inkomen, kinderen: i.opvang }) : null,
    kinderbijslag: kinderen.length ? kinderbijslag({ kinderen }) : null,
  };

  const totaalJaar = Object.values(res).reduce((s, r) => s + (r && r.recht ? r.perJaar : 0), 0);
  return {
    ...res,
    totaalPerJaar: Math.round(totaalJaar),
    totaalPerMaand: Math.round(totaalJaar / 12),
    tips: tips({ ...i, partner, kinderen, aow }),
  };
}

// Heuristiek voor aanvullende regelingen. Het drempelinkomen van de
// zorgtoeslag ligt rond het bruto minimumloon en dient als ijkpunt.
function tips(i) {
  const inkomen = num(i.inkomen);
  const minimum = ZORGTOESLAG.drempelinkomen * (i.partner ? 1.4 : 1);
  const laag = inkomen <= minimum * 1.3;
  const t = [];
  if (laag) {
    t.push('kwijtschelding', 'bijzondere-bijstand');
    if (i.langdurigLaag) t.push('individuele-inkomenstoeslag');
    if (i.kinderen.length) t.push('kindregelingen');
  }
  if (i.uitkering) t.push('toeslagenwet');
  if (i.aow && laag) t.push('aio-aanvulling');
  if (i.partner && i.partnerZonderInkomen) t.push('heffingskorting-partner');
  return t;
}

export function euro(n, decimalen = 0) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimalen,
    maximumFractionDigits: decimalen,
  }).format(n);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
function round3(n) {
  return Math.round(n * 1000) / 1000;
}
