// ToeslagBuddy Pro: controleert een hele cliëntenlijst in één keer.
// Bedoeld voor bewindvoerders, budgetcoaches en schuldhulpverleners.
// Draait volledig in de browser: cliëntgegevens verlaten het apparaat niet.
import { zorgtoeslag, huurtoeslag, kindgebondenBudget, kinderbijslag, laagInkomen } from './toeslagen.js';
import { ZORGTOESLAG, HUURTOESLAG, KINDGEBONDEN_BUDGET } from './params.js';

// Afwijking per maand waaronder we geen signaal geven (afronding, kleine verschillen)
const MARGE_PER_MAAND = 10;

export const KOLOMMEN = [
  ['clientnr', 'Eigen cliëntnummer (geen naam of BSN)'],
  ['leeftijd', 'Leeftijd cliënt'],
  ['partner', 'Toeslagpartner (ja/nee)'],
  ['inkomen', 'Verwacht toetsingsinkomen dit jaar (samen met partner)'],
  ['vermogen', 'Vermogen op 1 januari (samen met partner)'],
  ['huurt', 'Huurt zelfstandige woning (ja/nee)'],
  ['kale_huur', 'Kale huur per maand'],
  ['personen', 'Aantal personen in de woning'],
  ['volwassenen', 'Aantal volwassenen in de woning'],
  ['inkomen_medebewoners', 'Inkomen medebewoners per jaar'],
  ['aow', 'Iemand in huis met AOW-leeftijd (ja/nee)'],
  ['kinderen', 'Leeftijden kinderen, gescheiden door / (bijv. 4/9)'],
  ['voorschot_zorgtoeslag', 'Huidig voorschot zorgtoeslag per maand'],
  ['voorschot_huurtoeslag', 'Huidig voorschot huurtoeslag per maand'],
  ['voorschot_kgb', 'Huidig voorschot kindgebonden budget per maand'],
  ['langdurig_laag_inkomen', 'Al 3 jaar of langer laag inkomen (ja/nee)'],
];

export const VOORBEELD_CSV = [
  KOLOMMEN.map(([k]) => k).join(';'),
  'C-001;42;nee;18500;1200;ja;690;1;1;0;nee;;129;0;0;ja',
  'C-002;35;nee;24000;300;ja;745;3;1;0;nee;4/11;129;420;600;nee',
  'C-003;68;ja;31000;52000;ja;820;2;2;0;ja;;246;380;0;ja',
  'C-004;19;nee;9000;0;ja;560;1;1;0;nee;;0;0;0;nee',
  'C-005;29;ja;47000;5000;ja;880;4;2;0;nee;1/3;150;120;210;nee',
  'C-006;54;nee;21000;36000;ja;610;1;1;0;nee;17;129;360;230;ja',
].join('\n');

// ── CSV ──────────────────────────────────────────────────────────────
export function leesCsv(tekst) {
  const regels = String(tekst).replace(/^﻿/, '').split(/\r?\n/).filter((r) => r.trim());
  if (!regels.length) return [];
  const scheiding = (regels[0].match(/;/g) || []).length >= (regels[0].match(/,/g) || []).length ? ';' : ',';
  const kop = splits(regels[0], scheiding).map(normaliseerKop);
  return regels.slice(1).map((regel) => {
    const cellen = splits(regel, scheiding);
    const rij = {};
    kop.forEach((k, i) => (rij[k] = (cellen[i] ?? '').trim()));
    return rij;
  });
}

function splits(regel, scheiding) {
  const uit = [];
  let cel = '';
  let quote = false;
  for (const c of regel) {
    if (c === '"') quote = !quote;
    else if (c === scheiding && !quote) {
      uit.push(cel);
      cel = '';
    } else cel += c;
  }
  uit.push(cel);
  return uit;
}

const ALIASSEN = {
  client: 'clientnr', clientnummer: 'clientnr', nr: 'clientnr', id: 'clientnr', dossier: 'clientnr', dossiernr: 'clientnr',
  toetsingsinkomen: 'inkomen', jaarinkomen: 'inkomen',
  huur: 'kale_huur', kalehuur: 'kale_huur',
  toeslagpartner: 'partner',
  zorgtoeslag: 'voorschot_zorgtoeslag', huurtoeslag: 'voorschot_huurtoeslag',
  kgb: 'voorschot_kgb', kindgebonden_budget: 'voorschot_kgb', voorschot_kindgebonden_budget: 'voorschot_kgb',
};

function normaliseerKop(k) {
  const s = k.trim().toLowerCase().replace(/[ë]/g, 'e').replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
  return ALIASSEN[s] || s;
}

export function getal(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/\s|€/g, '');
  if (!s) return 0;
  const schoon = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,](?=\d{3}(\D|$))/g, '');
  const n = Number(schoon);
  return Number.isFinite(n) ? n : 0;
}

const ja = (v) => /^(ja|j|yes|y|1|true|x)$/i.test(String(v || '').trim());
const leeftijden = (v) =>
  String(v || '')
    .split(/[\/|+ ]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0 && n < 18);

// ── Check per cliënt ────────────────────────────────────────────────
export function checkClient(rij) {
  const c = {
    clientnr: rij.clientnr || '?',
    leeftijd: rij.leeftijd ? getal(rij.leeftijd) : undefined,
    partner: ja(rij.partner),
    inkomen: getal(rij.inkomen),
    vermogen: getal(rij.vermogen),
    huurt: ja(rij.huurt),
    kaleHuur: getal(rij.kale_huur),
    personen: getal(rij.personen) || 1,
    volwassenen: getal(rij.volwassenen) || 1,
    inkomenMedebewoners: getal(rij.inkomen_medebewoners),
    aow: ja(rij.aow),
    kinderen: leeftijden(rij.kinderen),
    voorschot: {
      zorgtoeslag: getal(rij.voorschot_zorgtoeslag),
      huurtoeslag: getal(rij.voorschot_huurtoeslag),
      kindgebondenBudget: getal(rij.voorschot_kgb),
    },
    langdurigLaag: ja(rij.langdurig_laag_inkomen),
  };

  const recht = {
    zorgtoeslag: zorgtoeslag({ partner: c.partner, inkomen: c.inkomen, vermogen: c.vermogen, leeftijd: c.leeftijd }),
    huurtoeslag: c.huurt
      ? huurtoeslag({
          kaleHuur: c.kaleHuur,
          inkomen: c.inkomen + c.inkomenMedebewoners,
          vermogen: c.vermogen,
          personen: c.personen,
          volwassenen: c.volwassenen,
          leeftijd: c.leeftijd,
          aow: c.aow,
        })
      : null,
    kindgebondenBudget: c.kinderen.length
      ? kindgebondenBudget({ partner: c.partner, inkomen: c.inkomen, vermogen: c.vermogen, kinderen: c.kinderen })
      : null,
  };

  const signalen = [];
  const NAAM = { zorgtoeslag: 'Zorgtoeslag', huurtoeslag: 'Huurtoeslag', kindgebondenBudget: 'Kindgebonden budget' };

  for (const k of Object.keys(NAAM)) {
    const r = recht[k];
    const berekend = r && r.recht ? r.perMaand : 0;
    const voorschot = c.voorschot[k];
    const verschil = berekend - voorschot;
    if (voorschot === 0 && berekend > MARGE_PER_MAAND) {
      signalen.push({
        soort: 'gemist',
        prioriteit: 1,
        toeslag: NAAM[k],
        bedragJaar: berekend * 12,
        tekst: `${NAAM[k]} lijkt niet aangevraagd. Mogelijk recht op ± € ${berekend} per maand.`,
      });
    } else if (verschil < -MARGE_PER_MAAND) {
      signalen.push({
        soort: 'terugbetaling',
        prioriteit: 1,
        toeslag: NAAM[k],
        bedragJaar: -verschil * 12,
        tekst:
          berekend === 0
            ? `${NAAM[k]}: waarschijnlijk géén recht (${r ? r.reden : 'geen situatie voor deze toeslag'}). Voorschot van € ${voorschot} p/m stopzetten om terugvordering te voorkomen.`
            : `${NAAM[k]}: voorschot € ${voorschot} p/m is hoger dan berekend recht (± € ${berekend}). Inkomen of situatie bijwerken in Mijn toeslagen.`,
      });
    } else if (voorschot > 0 && verschil > MARGE_PER_MAAND) {
      signalen.push({
        soort: 'te-laag',
        prioriteit: 2,
        toeslag: NAAM[k],
        bedragJaar: verschil * 12,
        tekst: `${NAAM[k]}: voorschot € ${voorschot} p/m is lager dan berekend recht (± € ${berekend}). Controleer het opgegeven inkomen.`,
      });
    }
  }

  // Kinderbijslag: geen voorschotgegeven, alleen herinnering bij kinderen
  if (c.kinderen.length) {
    const kb = kinderbijslag({ kinderen: c.kinderen });
    if (kb.recht) {
      signalen.push({ soort: 'info', prioriteit: 3, toeslag: 'Kinderbijslag', bedragJaar: 0, tekst: `Controleer of kinderbijslag (SVB) wordt ontvangen: ± € ${kb.perKwartaal.toFixed(2).replace('.', ',')} per kwartaal.` });
    }
  }

  // Vermogensgrenzen: dichtbij of erboven
  const grenzen = [
    ['zorgtoeslag', c.partner ? ZORGTOESLAG.vermogensgrensPartner : ZORGTOESLAG.vermogensgrensAlleen],
    ...(c.huurt ? [['huurtoeslag', HUURTOESLAG.vermogensgrensPerPersoon * c.volwassenen]] : []),
    ...(c.kinderen.length ? [['kindgebonden budget', c.partner ? KINDGEBONDEN_BUDGET.vermogensgrensPartner : KINDGEBONDEN_BUDGET.vermogensgrensAlleen]] : []),
  ];
  for (const [naam, grens] of grenzen) {
    if (c.vermogen <= grens && c.vermogen >= grens * 0.9) {
      signalen.push({ soort: 'vermogen', prioriteit: 2, toeslag: naam, bedragJaar: 0, tekst: `Vermogen (€ ${Math.round(c.vermogen)}) zit dicht bij de grens voor ${naam} (€ ${grens}). Let op de peildatum 1 januari.` });
    }
  }

  // Leeftijdsovergangen volgend jaar
  for (const l of c.kinderen) {
    if (l === 11) signalen.push({ soort: 'leeftijd', prioriteit: 3, toeslag: 'Kindgebonden budget', bedragJaar: 0, tekst: 'Kind wordt 12: kindgebonden budget gaat omhoog.' });
    if (l === 15) signalen.push({ soort: 'leeftijd', prioriteit: 3, toeslag: 'Kindgebonden budget', bedragJaar: 0, tekst: 'Kind wordt 16: kindgebonden budget gaat omhoog; kinderbijslag alleen bij school/studie.' });
    if (l === 17) signalen.push({ soort: 'leeftijd', prioriteit: 2, toeslag: 'Kind wordt 18', bedragJaar: 0, tekst: 'Kind wordt 18: kinderbijslag en kindgebonden budget stoppen; kind heeft eigen zorgverzekering nodig en mogelijk eigen zorgtoeslag. Telt mogelijk mee als medebewoner voor huurtoeslag.' });
  }
  if (c.leeftijd === 17) signalen.push({ soort: 'leeftijd', prioriteit: 2, toeslag: 'Zorgtoeslag', bedragJaar: 0, tekst: 'Cliënt wordt 18: zorgverzekering afsluiten en zorgtoeslag aanvragen.' });
  if (c.huurt && c.leeftijd === 20) signalen.push({ soort: 'leeftijd', prioriteit: 3, toeslag: 'Huurtoeslag', bedragJaar: 0, tekst: 'Cliënt wordt 21: huurtoeslag wordt vanaf dan tot de volledige huurgrens berekend.' });

  // Gemeentelijke regelingen bij laag inkomen
  if (laagInkomen(c.inkomen, c.partner)) {
    signalen.push({ soort: 'gemeente', prioriteit: 3, toeslag: 'Gemeente', bedragJaar: 0, tekst: 'Laag inkomen: controleer kwijtschelding gemeentelijke belastingen/waterschap en bijzondere bijstand.' });
    if (c.langdurigLaag) signalen.push({ soort: 'gemeente', prioriteit: 2, toeslag: 'Gemeente', bedragJaar: 0, tekst: 'Langdurig laag inkomen: individuele inkomenstoeslag aanvragen bij de gemeente (21 jaar t/m AOW-leeftijd).' });
    if (c.kinderen.length) signalen.push({ soort: 'gemeente', prioriteit: 3, toeslag: 'Gemeente', bedragJaar: 0, tekst: 'Kinderen: check kindpakket/meedoenregeling, Stichting Leergeld en Jeugdfonds Sport & Cultuur.' });
  }

  signalen.sort((a, b) => a.prioriteit - b.prioriteit || b.bedragJaar - a.bedragJaar);
  const som = (soort) => signalen.filter((s) => s.soort === soort).reduce((t, s) => t + s.bedragJaar, 0);
  return {
    clientnr: c.clientnr,
    recht,
    voorschot: c.voorschot,
    signalen,
    gemistPerJaar: Math.round(som('gemist') + som('te-laag')),
    risicoPerJaar: Math.round(som('terugbetaling')),
  };
}

export function checkLijst(rijen) {
  const clienten = rijen.filter((r) => Object.values(r).some((v) => String(v).trim())).map(checkClient);
  return {
    clienten,
    totaal: {
      aantal: clienten.length,
      metActie: clienten.filter((c) => c.signalen.some((s) => s.prioriteit <= 2)).length,
      gemistPerJaar: clienten.reduce((t, c) => t + c.gemistPerJaar, 0),
      risicoPerJaar: clienten.reduce((t, c) => t + c.risicoPerJaar, 0),
    },
  };
}

// Actielijst als CSV (puntkomma, opent direct goed in Nederlandse Excel)
export function actielijstCsv(resultaat) {
  const regels = [['clientnr', 'prioriteit', 'soort', 'regeling', 'bedrag_per_jaar', 'actie'].join(';')];
  for (const c of resultaat.clienten) {
    for (const s of c.signalen) {
      regels.push([c.clientnr, s.prioriteit, s.soort, s.toeslag, Math.round(s.bedragJaar), `"${s.tekst.replace(/"/g, "'")}"`].join(';'));
    }
  }
  return '﻿' + regels.join('\r\n');
}
