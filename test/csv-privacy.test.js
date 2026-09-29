// Privacyfilter, grenzen en formule-injectie bij de cliëntenlijst (R3–R6, R26).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  leesCsv,
  leesCsvVeilig,
  elfproef,
  isVerbodenKolom,
  importMeldingen,
  actielijstCsv,
  celCsv,
  checkLijst,
  VOORBEELD_CSV,
  MAX_RIJEN,
} from '../src/calc/pro.js';

test('elfproef herkent een BSN', () => {
  assert.equal(elfproef('111222333'), true);
  assert.equal(elfproef('123456782'), true);
  assert.equal(elfproef('1234.56.782'), true);
  assert.equal(elfproef(' 123 456 782 '), true);
  assert.equal(elfproef('123456789'), false); // faalt de elfproef
  assert.equal(elfproef('000000000'), false);
  assert.equal(elfproef('12345678'), false); // 8 cijfers
  assert.equal(elfproef('1234567820'), false); // 10 cijfers
  assert.equal(elfproef('C-123456782'), false); // eigen nummer met letters
  assert.equal(elfproef(''), false);
  assert.equal(elfproef(undefined), false);
});

test('R3: kolommen met persoonsgegevens worden weggelaten, ook met hoofdletters, spaties en accenten', () => {
  const kop = ['BSN', ' Burgerservicenummer ', 'Naam cliënt', 'Voornaam', 'Achternaam', 'Geboortedatum', 'Adres', 'IBAN', 'E-mailadres', 'Telefoon', 'Clientnr', 'Inkomen'];
  const csv = `${kop.join(';')}\n111222333;123456782;Jan de Vries;Jan;Vries;01-01-1970;Dorpsstraat 1;NL91ABNA0417164300;jan@example.nl;0612345678;C-001;18500`;
  const r = leesCsvVeilig(csv);
  assert.equal(r.fout, null);
  assert.deepEqual(r.verwijderdeKolommen, kop.slice(0, 10).map((k) => k.trim()));
  assert.deepEqual(r.rijen, [{ clientnr: 'C-001', inkomen: '18500' }]);
  const alles = JSON.stringify(r.rijen);
  for (const geheim of ['111222333', '123456782', 'Jan', 'Dorpsstraat', 'NL91', 'example.nl', '0612345678', '1970']) {
    assert.ok(!alles.includes(geheim), `${geheim} mag niet in de rijen staan`);
  }
  assert.equal(isVerbodenKolom('BURGER SERVICE NUMMER'), true);
  assert.equal(isVerbodenKolom('kale_huur'), false);
  assert.equal(isVerbodenKolom('voorschot_kgb'), false);
});

test('R3: een cliëntnummer dat op een BSN lijkt wordt geweigerd, met regelnummer', () => {
  const r = leesCsvVeilig('clientnr;inkomen\nC-1;20000\n\n111222333;15000\n123456789;10000\n1234.56.782;9000');
  assert.deepEqual(r.rijen.map((x) => x.clientnr), ['C-1', '123456789']);
  assert.deepEqual(r.geweigerd.map((g) => g.regel), [4, 6]);
  assert.match(r.geweigerd[0].reden, /BSN/);
  // Ook de oude functie laat geen BSN door
  assert.deepEqual(leesCsv('clientnr;inkomen\n111222333;15000'), []);
});

test('R3: de export bevat geen BSN, ook niet als het in een weggelaten kolom stond', () => {
  const r = leesCsvVeilig('bsn;clientnr;inkomen;huurt;kale_huur\n111222333;C-9;9000;ja;560');
  const csv = actielijstCsv(checkLijst(r.rijen));
  assert.ok(!csv.includes('111222333'));
  assert.match(csv, /C-9/);
});

test('meldingen in gewone taal', () => {
  const m = importMeldingen(leesCsvVeilig('Naam;BSN;clientnr\nA;111222333;C1\nB;1;123456782'));
  assert.equal(m.length, 2);
  assert.match(m[0], /weggelaten.*Naam, BSN/);
  assert.match(m[1], /1 cliënt is niet gecontroleerd.*regel 3/);
  assert.deepEqual(importMeldingen(leesCsvVeilig(VOORBEELD_CSV)), []);
  assert.deepEqual(importMeldingen({ fout: 'Te groot' }), ['Te groot']);
});

test('R4: meer dan 10.000 regels of groter dan 5 MB wordt geweigerd', () => {
  const regel = 'C;20000;ja;700';
  const precies = 'clientnr;inkomen;huurt;kale_huur\n' + Array(MAX_RIJEN).fill(regel).join('\n');
  const ok = leesCsvVeilig(precies);
  assert.equal(ok.fout, null);
  assert.equal(ok.rijen.length, MAX_RIJEN);
  const teVeel = leesCsvVeilig(precies + '\n' + regel);
  assert.match(teVeel.fout, /10\.001 regels.*maximum is 10\.000/);
  assert.deepEqual(teVeel.rijen, []);
  const groot = leesCsvVeilig('clientnr;opmerking\nC1;' + 'x'.repeat(5 * 1024 * 1024));
  assert.match(groot.fout, /groter dan 5 MB/);
  // 5 MB aan multibyte-tekens (é = 2 bytes) telt ook
  const multibyte = leesCsvVeilig('clientnr;opmerking\nC1;' + 'é'.repeat(2.7 * 1024 * 1024));
  assert.match(multibyte.fout, /groter dan 5 MB/);
  assert.deepEqual(leesCsv(precies + '\n' + regel), []);
});

test('R26: een xlsx-bestand geeft de melding "sla op als CSV"', () => {
  const xlsx = 'PK\u0003\u0004\u0014\u0000\u0006\u0000\b\u0000\u0000\u0000!\u0000[Content_Types].xml';
  assert.match(leesCsvVeilig(xlsx).fout, /Sla op als CSV/);
  const xls = '��\u0011�' + '\u0000'.repeat(40) + 'Workbook';
  assert.match(leesCsvVeilig(xls).fout, /Excel-bestand/);
});

test('R5: BOM, puntkomma, komma, tab, aanhalingstekens, lege regels en CRLF', () => {
  const verwacht = [{ clientnr: 'C1', inkomen: '18.500', kale_huur: '690,50' }, { clientnr: 'C2', inkomen: '0', kale_huur: '' }];
  const puntkomma = '﻿Cliëntnummer;Toetsingsinkomen;Huur\r\n\r\nC1;"18.500";690,50\r\nC2;0;\r\n\r\n';
  assert.deepEqual(leesCsvVeilig(puntkomma).rijen, verwacht);
  const komma = 'clientnr,inkomen,kale_huur\nC1,18.500,"690,50"\nC2,0,\n';
  assert.deepEqual(leesCsvVeilig(komma).rijen, verwacht);
  const tab = 'clientnr\tinkomen\tkale_huur\rC1\t18.500\t690,50\rC2\t0\t';
  assert.deepEqual(leesCsvVeilig(tab).rijen, verwacht);
  // Scheidingsteken, "" en een regeleinde binnen aanhalingstekens
  const lastig = 'clientnr;kinderen;opmerking\n"C;3";4/9;"Zei: ""prima""\nnieuwe regel"\nC4;;Ünïcödé € 12';
  const r = leesCsvVeilig(lastig);
  assert.deepEqual(r.rijen[0], { clientnr: 'C;3', kinderen: '4/9', opmerking: 'Zei: "prima"\nnieuwe regel' });
  assert.equal(r.rijen[1].opmerking, 'Ünïcödé € 12');
  // Regelnummers kloppen ook na een regeleinde binnen een veld
  assert.deepEqual(leesCsvVeilig(lastig + '\n111222333;;').geweigerd.map((g) => g.regel), [5]);
  // Leeg of alleen een kopregel
  assert.deepEqual(leesCsvVeilig(''), { rijen: [], verwijderdeKolommen: [], geweigerd: [], fout: null });
  assert.deepEqual(leesCsvVeilig('clientnr;inkomen\n').rijen, []);
});

test('oude leesCsv blijft werken met het voorbeeld', () => {
  const res = checkLijst(leesCsv(VOORBEELD_CSV));
  assert.equal(res.totaal.aantal, 6);
});

test('R6: formule-injectie wordt geneutraliseerd in de export', () => {
  for (const gevaar of ['=HYPERLINK("https://evil.example","klik")', '+31612345678', '-2+3', '@SUM(A1)', '\tX', '\rX', '＝1+1']) {
    const cel = celCsv(gevaar);
    assert.ok(cel.replace(/^"/, '').startsWith("'"), `${JSON.stringify(gevaar)} → ${cel}`);
  }
  assert.equal(celCsv('C-001'), 'C-001');
  assert.equal(celCsv(12), '12');
  assert.equal(celCsv('a;b'), '"a;b"');
  assert.equal(celCsv('zei "hoi"'), '"zei ""hoi"""');
  const csv = actielijstCsv(checkLijst(leesCsv('clientnr;inkomen;huurt;kale_huur\n"=HYPERLINK(""https://evil.example"")";9000;ja;560')));
  const regels = csv.split('\r\n').slice(1);
  assert.ok(regels.length > 0);
  for (const r of regels) assert.ok(r.startsWith(`"'=HYPERLINK(""https://evil.example"")"`), r);
  // Terug inlezen geeft de tekst met ' ervoor, dus geen formule
  const terug = leesCsvVeilig(csv);
  assert.ok(terug.rijen.every((x) => x.clientnr.startsWith("'=")));
});
