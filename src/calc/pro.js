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
// Oude aanroep: geeft alleen de rijen, maar wel door het privacyfilter.
export function leesCsv(tekst) {
  return leesCsvVeilig(tekst).rijen;
}

// Leest de hele tekst in één keer, zodat velden tussen aanhalingstekens ook
// een puntkomma, komma of regeleinde mogen bevatten ("" = één aanhalingsteken).
// Geeft [{regel, cellen}] terug; regel = regelnummer in het bestand (1 = kop).
function records(tekst, scheiding) {
  const uit = [];
  let cellen = [];
  let cel = '';
  let quote = false;
  let regel = 1;
  let start = 1;
  const klaar = () => {
    cellen.push(cel);
    if (cellen.some((c) => c.trim())) uit.push({ regel: start, cellen });
    cellen = [];
    cel = '';
  };
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i];
    if (quote) {
      if (c === '"' && tekst[i + 1] === '"') {
        cel += '"';
        i++;
      } else if (c === '"') quote = false;
      else {
        if (c === '\n') regel++;
        cel += c;
      }
    } else if (c === '"') quote = true;
    else if (c === scheiding) {
      cellen.push(cel);
      cel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && tekst[i + 1] === '\n') i++;
      klaar();
      regel++;
      start = regel;
    } else cel += c;
  }
  if (cel || cellen.length) klaar();
  return uit;
}

// Scheidingsteken kiezen op basis van de kopregel (buiten aanhalingstekens)
function kiesScheiding(tekst) {
  const kop = tekst.split(/\r?\n|\r/).find((r) => r.trim()) || '';
  const tel = { ';': 0, ',': 0, '\t': 0 };
  let quote = false;
  for (const c of kop) {
    if (c === '"') quote = !quote;
    else if (!quote && c in tel) tel[c]++;
  }
  return Object.entries(tel).reduce((a, b) => (b[1] > a[1] ? b : a), [';', 0])[0];
}

const ALIASSEN = {
  client: 'clientnr', clientnummer: 'clientnr', nr: 'clientnr', id: 'clientnr', dossier: 'clientnr', dossiernr: 'clientnr',
  toetsingsinkomen: 'inkomen', jaarinkomen: 'inkomen',
  huur: 'kale_huur', kalehuur: 'kale_huur',
  toeslagpartner: 'partner',
  zorgtoeslag: 'voorschot_zorgtoeslag', huurtoeslag: 'voorschot_huurtoeslag',
  kgb: 'voorschot_kgb', kindgebonden_budget: 'voorschot_kgb', voorschot_kindgebonden_budget: 'voorschot_kgb',
};

// Kleine letters, zonder accenten (ë → e), spaties en streepjes als _
const zonderAccent = (k) => String(k).normalize('NFD').replace(/[̀-ͯ]/g, '');
function normaliseerKop(k) {
  const s = zonderAccent(k).trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
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
      regels.push([c.clientnr, s.prioriteit, s.soort, s.toeslag, Math.round(s.bedragJaar), s.tekst].map(celCsv).join(';'));
    }
  }
  return '﻿' + regels.join('\r\n');
}

// Eén cel voor de export. Tegen formule-injectie: een cel die begint met
// = + - @ (ook de brede varianten), tab of regeleinde krijgt een ' ervoor,
// zodat Excel of LibreOffice het als tekst toont en niet uitvoert.
export function celCsv(waarde) {
  let v = String(waarde ?? '');
  if (/^[=+\-@\t\r\n＝＋－＠]/.test(v)) v = "'" + v;
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// ── Privacyfilter en grenzen bij het inlezen ────────────────────────
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_RIJEN = 10000;

// Kolommen met persoonsgegevens die niet nodig zijn. Ook als deel van een
// kolomnaam ('Naam cliënt', 'BSN_partner', 'E-mailadres'), zonder accenten.
const VERBODEN = [
  'bsn', 'burgerservicenummer', 'sofinummer', 'naam', 'voornaam', 'achternaam', 'tussenvoegsel', 'initialen',
  'geboortedatum', 'geboren', 'adres', 'straat', 'huisnummer', 'postcode', 'woonplaats', 'iban', 'rekeningnummer',
  'email', 'telefoon', 'mobiel',
];
const kaleKop = (k) => zonderAccent(k).toLowerCase().replace(/[^a-z0-9]/g, '');
export function isVerbodenKolom(kop) {
  const k = kaleKop(kop);
  return VERBODEN.some((v) => k.includes(v));
}

/** Elfproef voor een BSN: 9 cijfers (spaties, punten en streepjes mogen). */
export function elfproef(waarde) {
  const s = String(waarde ?? '').trim();
  if (!/^[\d\s.-]+$/.test(s)) return false;
  const cijfers = s.replace(/\D/g, '');
  if (!/^\d{9}$/.test(cijfers) || /^0+$/.test(cijfers)) return false;
  let som = 0;
  for (let i = 0; i < 8; i++) som += Number(cijfers[i]) * (9 - i);
  som -= Number(cijfers[8]);
  return som % 11 === 0;
}

// Binair bestand? Een .xlsx is een zip (begint met PK), .xls heeft veel NUL-tekens.
function lijktBinair(tekst) {
  if (tekst.startsWith('PK\u0003\u0004')) return true;
  const begin = tekst.slice(0, 8192);
  const nul = (begin.match(/\u0000/g) || []).length;
  const kapot = (begin.match(/�/g) || []).length;
  return nul > 8 || (begin.length > 200 && kapot > begin.length / 10);
}

function bytes(tekst) {
  if (tekst.length > MAX_BYTES) return tekst.length; // minstens zoveel bytes
  if (tekst.length * 3 <= MAX_BYTES) return tekst.length; // kan niet te groot zijn
  return new TextEncoder().encode(tekst).length;
}

const nl = (n) => n.toLocaleString('nl-NL');

/**
 * Veilig inlezen: laat kolommen met persoonsgegevens weg, weigert een BSN als
 * cliëntnummer en weigert te grote of binaire bestanden (xlsx).
 * @returns {{rijen: object[], verwijderdeKolommen: string[], geweigerd: {regel: number, reden: string}[], fout: string|null}}
 */
export function leesCsvVeilig(tekst) {
  const leeg = (fout = null) => ({ rijen: [], verwijderdeKolommen: [], geweigerd: [], fout });
  const t = String(tekst ?? '');
  if (bytes(t) > MAX_BYTES) {
    return leeg(`Dit bestand is groter dan 5 MB. Splits de lijst in kleinere bestanden van maximaal ${nl(MAX_RIJEN)} cliënten.`);
  }
  if (lijktBinair(t)) {
    return leeg('Dit lijkt een Excel-bestand (.xlsx) en geen CSV. Open het in Excel en kies ‘Opslaan als’ → ‘CSV (gescheiden door lijstscheidingsteken)’. Sla op als CSV en probeer het opnieuw.');
  }
  const schoon = t.replace(/^﻿/, '');
  if (!schoon.trim()) return leeg();
  const alle = records(schoon, kiesScheiding(schoon));
  if (alle.length - 1 > MAX_RIJEN) {
    return leeg(`Deze lijst heeft ${nl(alle.length - 1)} regels. Het maximum is ${nl(MAX_RIJEN)}. Splits de lijst in kleinere bestanden.`);
  }
  const [kopRecord, ...data] = alle;
  const koppen = kopRecord.cellen.map((k) => k.trim());
  const verwijderdeKolommen = koppen.filter((k) => k && isVerbodenKolom(k));
  const houden = koppen.map((k, i) => [normaliseerKop(k), i]).filter(([, i]) => koppen[i] && !isVerbodenKolom(koppen[i]));
  const geweigerd = [];
  const rijen = [];
  for (const { regel, cellen } of data) {
    const rij = {};
    for (const [k, i] of houden) rij[k] = (cellen[i] ?? '').trim();
    if (elfproef(rij.clientnr)) {
      geweigerd.push({ regel, reden: 'Het cliëntnummer lijkt op een BSN. Gebruik een eigen cliëntnummer, bijvoorbeeld C-001.' });
      continue;
    }
    rijen.push(rij);
  }
  return { rijen, verwijderdeKolommen, geweigerd, fout: null };
}

/** Meldingen in gewone taal bij de uitkomst van leesCsvVeilig (om te tonen in de app). */
export function importMeldingen({ verwijderdeKolommen = [], geweigerd = [], fout = null } = {}) {
  if (fout) return [fout];
  const m = [];
  if (verwijderdeKolommen.length) {
    m.push(`We hebben ${verwijderdeKolommen.length === 1 ? 'deze kolom' : 'deze kolommen'} weggelaten, omdat er persoonsgegevens in staan die niet nodig zijn: ${verwijderdeKolommen.join(', ')}. Laat ze de volgende keer weg uit je export.`);
  }
  if (geweigerd.length) {
    const regels = geweigerd.slice(0, 10).map((g) => g.regel).join(', ') + (geweigerd.length > 10 ? ' en meer' : '');
    m.push(`${geweigerd.length === 1 ? '1 cliënt is' : `${geweigerd.length} cliënten zijn`} niet gecontroleerd, omdat het cliëntnummer op een BSN lijkt (regel ${regels}). Gebruik een eigen cliëntnummer, geen BSN.`);
  }
  return m;
}
