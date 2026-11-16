// Dossierlogica van /familie/: lakken, brieven uitleggen, logboek,
// bankafschrift-scan, termijnkalender, intake, opzegbrieven en versleuteling.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lak, isBsn, isIban, bevatBsn } from '../src/familie/lakken.js';
import { basisUitleg, valideer, vindBedragen, vindDatums, vindTermijn, UITLEG_SCHEMA } from '../src/familie/briefuitleg.js';
import { voegToe, controleerKeten, maandoverzicht, geldend, naarCent, reeks } from '../src/familie/logboek.js';
import { leesAfschrift, terugkerend, voorstel, sleutelVan, csvRijen } from '../src/familie/bankscan.js';
import { termijnen, plusMaanden, binnenkort } from '../src/familie/termijnmotor.js';
import { VRAGEN, profielUit, startTaken } from '../src/familie/intake.js';
import { brief, standaardActie, meldlijst } from '../src/familie/opzeggen.js';
import { nieuweSleutel, versleutel, ontsleutel, pakIn, pakUit, nieuweHerstelzin } from '../src/familie/versleutel.js';
import { nieuwDossier, mag, initialen, avatarKleur } from '../src/familie/dossier.js';
import { FASES, voortgang, alleStappen } from '../src/familie/checklist.js';
import { leesRegels } from '../scripts/familie/regelcheck.js';
import { readFileSync } from 'node:fs';

const regels = leesRegels();
const NU = new Date('2026-11-16T10:00:00Z');
// Verzonnen BSN's die de elfproef doorstaan (geen echte personen)
const NEP_BSN = '111222333';

test('lakken: BSN, IBAN, geboortedatum, e-mail en telefoon verdwijnen; bedragen en termijnen blijven', () => {
  assert.ok(isBsn(NEP_BSN));
  assert.ok(!isBsn('111222334'));
  assert.ok(isIban('NL91 ABNA 0417 1643 00'));
  assert.ok(!isIban('NL91 ABNA 0417 1643 01'));
  const tekst = `Betreft: de heer J. Voorbeeld, BSN ${NEP_BSN}, geboren op 3 maart 1942.\nU betaalt € 1.234,56 vóór 12 januari 2027 op NL91ABNA0417164300.\nVragen? Bel 088 123 45 67 of mail naar vragen@example.nl. Kenmerk 2026.111.222.`;
  const r = lak(tekst);
  assert.ok(!r.tekst.includes(NEP_BSN));
  assert.ok(!r.tekst.includes('NL91'));
  assert.ok(!r.tekst.includes('3 maart 1942'));
  assert.ok(!r.tekst.includes('example.nl'));
  assert.ok(!r.tekst.includes('088 123'));
  assert.ok(r.tekst.includes('€ 1.234,56') && r.tekst.includes('12 januari 2027'));
  assert.deepEqual(r.gevonden, { bsn: 1, iban: 1, geboortedatum: 1, email: 1, telefoon: 1 });
  assert.ok(bevatBsn(`nummer 1112.22.333`));
  assert.ok(!bevatBsn(lak(tekst).tekst));
  assert.ok(!bevatBsn('U ontvangt € 111.222.333,00'));
});

const CAK_BRIEF = `CAK
Datum: 2 november 2026
Betreft: beschikking eigen bijdrage Wlz

Geachte mevrouw Voorbeeld,

Wij hebben uw eigen bijdrage voor 2027 vastgesteld. U betaalt € 1.282,09 per maand.
Wij hebben gerekend met uw inkomen en vermogen van 2025.

Bent u het niet eens met dit besluit? Dan kunt u binnen 6 weken bezwaar maken.
Betaal de eerste factuur uiterlijk 12 januari 2027.`;

test('brief uitleggen zonder AI: afzender, soort, bedrag en termijn met letterlijk citaat', () => {
  const u = basisUitleg(CAK_BRIEF, { nu: NU });
  assert.equal(u.afzender.id, 'cak');
  assert.equal(u.soort.id, 'beschikking');
  assert.equal(u.briefdatum, '2026-11-02');
  assert.equal(u.bedrag.waarde, 1282.09);
  assert.ok(CAK_BRIEF.includes(u.bedrag.citaat));
  assert.equal(u.termijn.datum, '2027-01-12');
  assert.ok(CAK_BRIEF.includes(u.termijn.citaat));
  assert.ok(u.bezwaar.mogelijk);
  assert.ok(u.acties.some((a) => /bezwaar/.test(a)));
  assert.ok(u.doorverwijzen.some((d) => /Juridisch Loket/.test(d.naam)));
  assert.deepEqual(u.weggelaten, []);
});

test('brief uitleggen: aanmaning krijgt doorverwijzing naar schuldhulp; "binnen 14 dagen" telt vanaf de briefdatum', () => {
  const b = `Incassobureau Voorbeeld\nDatum: 01-11-2026\nAANMANING\nU heeft een betalingsachterstand. Het openstaande bedrag is € 245,00. Betaal dit bedrag binnen 14 dagen.`;
  const u = basisUitleg(b, { nu: NU });
  assert.equal(u.afzender.id, 'deurwaarder');
  assert.ok(u.soort.urgent);
  assert.equal(u.termijn.datum, '2026-11-15');
  assert.equal(u.bedrag.richting, 'betalen');
  assert.ok(u.doorverwijzen.some((d) => /Schuldhulp/.test(d.naam)));
});

test('brief uitleggen: bedragen en datums vinden', () => {
  assert.deepEqual(vindBedragen('€ 12,50, EUR 1.000,- en € 3').map((b) => b.waarde), [12.5, 1000, 3]);
  assert.deepEqual(vindDatums('op 1 mei en 31-12-2026', { nu: NU }).map((d) => d.datum), ['2027-05-01', '2026-12-31']);
  assert.equal(vindTermijn('Stuur het formulier vóór 1 mei terug.', { nu: NU }).datum, '2027-05-01');
  assert.equal(vindTermijn('Er is geen termijn. De brief is van 3 november 2026.', { nu: NU }), null);
});

test('valideer: een bedrag of termijn zonder letterlijk citaat in de brief verdwijnt (ook uit AI-uitleg)', () => {
  const ai = { afzender: { naam: 'CAK' }, soort: { id: 'beschikking', naam: 'Besluit' }, samenvatting: 'x', acties: ['a'], bedrag: { waarde: 999, richting: 'betalen', citaat: 'U betaalt € 999,00 per maand.' }, termijn: { datum: '2027-02-01', citaat: 'Betaal vóór 1 februari 2027.' }, bezwaar: { mogelijk: true, citaat: 'verzonnen zin over bezwaar' } };
  const u = valideer(ai, CAK_BRIEF);
  assert.equal(u.bedrag, null);
  assert.equal(u.termijn, null);
  assert.equal(u.bezwaar.mogelijk, false);
  assert.deepEqual(u.weggelaten, ['bedrag', 'termijn']);
  // Citaat klopt, maar het bedrag staat er niet in: ook weg
  const fout = valideer({ ...ai, bedrag: { waarde: 5000, citaat: 'U betaalt € 1.282,09 per maand.' }, termijn: null }, CAK_BRIEF);
  assert.equal(fout.bedrag, null);
  const goed = valideer({ ...ai, bedrag: { waarde: 1282.09, citaat: 'U betaalt € 1.282,09 per maand.' }, termijn: { datum: '2027-01-12', citaat: 'Betaal de eerste factuur uiterlijk 12 januari 2027.' } }, CAK_BRIEF);
  assert.equal(goed.bedrag.waarde, 1282.09);
  assert.equal(goed.termijn.datum, '2027-01-12');
  assert.ok(UITLEG_SCHEMA.required.includes('termijn'));
});

test('logboek: alleen toevoegen, keten met hashes, correcties en maandoverzicht', async () => {
  const regels = [];
  regels.push(await voegToe(regels, { datum: '2026-11-03', bedragCent: 4250, richting: 'uit', categorie: 'boodschappen', omschrijving: 'Boodschappen voor pa', door: 'marieke', bonId: 'b1' }));
  regels.push(await voegToe(regels, { datum: '2026-11-07', bedragCent: 10000, richting: 'uit', categorie: 'contant', omschrijving: 'Opname voor de kapper en de tuinman', door: 'ruud' }));
  regels.push(await voegToe(regels, { datum: '2026-11-20', bedragCent: 150000, richting: 'in', categorie: 'inkomen', omschrijving: 'AOW', door: 'marieke' }));
  regels.push(await voegToe(regels, { datum: '2026-10-28', bedragCent: 999, richting: 'uit', categorie: 'overig', omschrijving: 'Oktober', door: 'ruud' }));
  assert.equal(await controleerKeten(regels), null);
  const m = maandoverzicht(regels, '2026-11');
  assert.equal(m.uitCent, 14250);
  assert.equal(m.inCent, 150000);
  assert.equal(m.zonderBon, 1);
  assert.equal(m.contantCent, 10000);
  assert.deepEqual(m.perPersoon, { marieke: 4250, ruud: 10000 });
  // Corrigeren = nieuwe regel; de oude telt niet meer mee maar blijft staan
  regels.push(await voegToe(regels, { datum: '2026-11-07', bedragCent: 8000, richting: 'uit', categorie: 'contant', omschrijving: 'Opname (was 100, moet 80 zijn)', door: 'ruud', corrigeertId: regels[1].id }));
  assert.equal(regels.length, 5);
  assert.equal(geldend(regels).length, 4);
  assert.equal(maandoverzicht(regels, '2026-11').uitCent, 12250);
  // Achteraf knoeien valt op
  regels[0].bedragCent = 1;
  assert.equal(await controleerKeten(regels), regels[0].id);
  await assert.rejects(voegToe([], { datum: '2026-11-03', bedragCent: 0, omschrijving: 'x' }), /bedrag/);
  await assert.rejects(voegToe([], { datum: 'gisteren', bedragCent: 100, omschrijving: 'x' }), /datum/);
  assert.equal(naarCent('1.250,50'), 125050);
  assert.equal(naarCent('12,5'), 1250);
  assert.equal(naarCent('abc'), null);
  assert.deepEqual(reeks([], '2026-11', 3).map((r) => r.maand), ['2026-09', '2026-10', '2026-11']);
});

const CSV_ING = `"Datum";"Naam / Omschrijving";"Rekening";"Tegenrekening";"Code";"Af Bij";"Bedrag (EUR)";"Mutatiesoort";"Mededelingen"
"20260901";"ZIGGO SERVICES BV";"NL00VOOR0000000001";"NL00VOOR0000000002";"IC";"Af";"52,50";"Incasso";"Factuur sept"
"20261001";"ZIGGO SERVICES BV";"NL00VOOR0000000001";"NL00VOOR0000000002";"IC";"Af";"52,50";"Incasso";"Factuur okt"
"20261101";"ZIGGO SERVICES BV";"NL00VOOR0000000001";"NL00VOOR0000000002";"IC";"Af";"52,50";"Incasso";"Factuur nov"
"20260905";"Zilveren Kruis Zorgverzekeringen";"NL00VOOR0000000001";"";"IC";"Af";"158,95";"Incasso";"Premie"
"20261005";"Zilveren Kruis Zorgverzekeringen";"NL00VOOR0000000001";"";"IC";"Af";"158,95";"Incasso";"Premie"
"20261105";"Zilveren Kruis Zorgverzekeringen";"NL00VOOR0000000001";"";"IC";"Af";"158,95";"Incasso";"Premie"
"20260910";"Bakkerij De Hoek";"NL00VOOR0000000001";"";"BA";"Af";"7,20";"Betaalautomaat";""
"20260923";"SVB AOW";"NL00VOOR0000000001";"";"OV";"Bij";"1.450,00";"Overschrijving";"AOW september"
"20251115";"Nationale Postcode Loterij";"NL00VOOR0000000001";"";"IC";"Af";"15,00";"Incasso";""
"20261115";"Nationale Postcode Loterij";"NL00VOOR0000000001";"";"IC";"Af";"15,00";"Incasso";""`;

test('bankafschrift: CSV lezen, terugkerende betalingen vinden en organisaties herkennen', () => {
  const { formaat, transacties } = leesAfschrift(CSV_ING);
  assert.equal(formaat, 'csv');
  assert.equal(transacties.length, 10);
  assert.deepEqual(transacties[0], { datum: '2026-09-01', bedragCent: -5250, tegenpartij: 'ZIGGO SERVICES BV', omschrijving: 'Factuur sept', rekening: '…0001' });
  assert.equal(transacties[7].bedragCent, 145000);
  const organisaties = JSON.parse(readFileSync(new URL('../data/familie/organisaties.json', import.meta.url), 'utf8')).organisaties;
  const v = voorstel(transacties, organisaties);
  assert.deepEqual(v.map((x) => [x.naam, x.soort, x.ritme, x.perMaandCent]), [
    ['Zilveren Kruis', 'zorgverzekering', 'maand', 15895],
    ['Ziggo', 'telecom', 'maand', 5250],
    ['Nationale Postcode Loterij', 'loterij', 'jaar', 125],
  ]);
  assert.ok(!terugkerend(transacties).some((t) => /bakkerij/i.test(t.tegenpartij)));
  assert.equal(sleutelVan('ZIGGO SERVICES B.V.'), 'ziggo services');
  assert.deepEqual(csvRijen('a,"b,c",d\n1,"x ""y""",3'), [['a', 'b,c', 'd'], ['1', 'x "y"', '3']]);
});

test('bankafschrift: MT940 en CAMT.053', () => {
  const mt = `:20:STARTUMS\n:25:NL00VOOR0000000001\n:61:2611011101D52,50N247NONREF\n:86:/TRTP/SEPA INCASSO/NAME/Ziggo Services BV/REMI/Factuur nov\n:61:2611231123C1450,00N247NONREF\n:86:/TRTP/SEPA OVERBOEKING/NAME/SVB/REMI/AOW\n-`;
  const a = leesAfschrift(mt);
  assert.equal(a.formaat, 'mt940');
  assert.deepEqual(a.transacties.map((t) => [t.datum, t.bedragCent, t.tegenpartij]), [['2026-11-01', -5250, 'Ziggo Services BV'], ['2026-11-23', 145000, 'SVB']]);
  const camt = `<Document><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="EUR">52.50</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-11-01</Dt></BookgDt><NtryDtls><TxDtls><RltdPties><Cdtr><Nm>Ziggo Services BV</Nm></Cdtr></RltdPties><RmtInf><Ustrd>Factuur nov</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>`;
  const c = leesAfschrift(camt);
  assert.equal(c.formaat, 'camt');
  assert.deepEqual(c.transacties, [{ datum: '2026-11-01', bedragCent: -5250, tegenpartij: 'Ziggo Services BV', omschrijving: 'Factuur nov', rekening: '' }]);
});

const BRONNEN = { 'ro-salderen': { naam: 'Rijksoverheid', url: 'https://www.rijksoverheid.nl/x' }, 'bd-erf-termijn': { naam: 'Belastingdienst', url: 'https://www.belastingdienst.nl/y' } };

test('termijnkalender: contracten, documenten, brieven en salderen, elk met bron', () => {
  const dossier = { ...nieuwDossier({ naam: 'Henk', geboortejaar: 1942 }), profiel: { zonnepanelen: true } };
  const lijst = termijnen({
    dossier,
    contracten: [{ id: 'c1', naam: 'Energie Voorbeeld', einddatum: '2027-03-31', opzegtermijnDagen: 30 }],
    documenten: [{ id: 'd1', titel: 'Paspoort', verlooptOp: '2026-12-01' }],
    brieven: [{ id: 'b1', bevestigd: true, uitleg: basisUitleg(CAK_BRIEF, { nu: NU }) }, { id: 'b2', bevestigd: false, uitleg: basisUitleg(CAK_BRIEF, { nu: NU }) }],
    regels,
    bronnen: BRONNEN,
    vandaag: NU,
  });
  assert.deepEqual(lijst.map((t) => [t.id, t.datum]), [
    ['document-d1', '2026-12-01'],
    ['salderen-einde', '2027-01-01'],
    ['brief-b1', '2027-01-12'],
    ['contract-opzeg-c1', '2027-03-01'],
    ['contract-eind-c1', '2027-03-31'],
  ]);
  assert.ok(lijst.every((t) => t.bron && t.waarom));
  assert.equal(lijst[0].dagen, 15);
  assert.equal(lijst.find((t) => t.id === 'salderen-einde').bron.url, 'https://www.rijksoverheid.nl/x');
  assert.deepEqual(binnenkort(lijst, { dagen: 30 }).map((t) => t.id), ['document-d1']);
});

test('termijnkalender: regel niet meer bevestigd → geen datum van ons, wel "controleer"', () => {
  const dossier = { ...nieuwDossier({ naam: 'Henk' }), profiel: { zonnepanelen: true } };
  const oud = { ...regels, salderen: { ...regels.salderen, status: 'te-controleren' } };
  const [t] = termijnen({ dossier, regels: oud, vandaag: NU });
  assert.equal(t.status, 'controleer');
  assert.equal(t.datum, null);
});

test('termijnkalender na een overlijden: erfbelasting na 20 maanden (8 bij een overlijden t/m 2025)', () => {
  const dossier = { ...nieuwDossier({ naam: 'Henk' }), status: 'overlijden', overlijdensdatum: '2026-10-31', profiel: { toeslagen: true } };
  const lijst = termijnen({ dossier, regels, bronnen: BRONNEN, vandaag: NU });
  const d = Object.fromEntries(lijst.map((t) => [t.id, t.datum]));
  assert.equal(d['ov-erfbelasting'], '2028-06-30');
  assert.equal(d['ov-schuldeisers'], '2027-01-31');
  assert.equal(d['ov-ib-vanaf'], '2027-03-01');
  assert.equal(d['ov-ib-brief'], '2027-03-31');
  assert.equal(d['ov-toeslagen'], '2026-12-26');
  const oud = termijnen({ dossier: { ...dossier, overlijdensdatum: '2025-04-19' }, regels, vandaag: NU });
  assert.equal(oud.find((t) => t.id === 'ov-erfbelasting').datum, '2025-12-19'); // voorbeeld Belastingdienst: 19 april → uiterlijk 18 december
  assert.equal(plusMaanden('2026-08-31', 6), '2027-02-28');
});

test('intake: profiel uit antwoorden; zorg alleen met toestemming; passende eerste taken', () => {
  assert.equal(VRAGEN.length, 12);
  const a = { naam: 'Henk', geboortejaar: 1942, woonsituatie: 'alleen', huurKoop: 'huur', inkomens: ['aow', 'pensioen'], toeslagen: 'weetniet', zorg: 'wmo', volmacht: 'nee', testament: 'weetniet', zonnepanelen: 'ja', banken: 'Rabobank en ING', dringend: 'post' };
  const zonder = profielUit(a);
  assert.equal(zonder.zorg, null);
  const met = profielUit(a, { toestemming: true });
  assert.equal(met.zorg, 'wmo');
  assert.deepEqual(met.banken, ['Rabobank', 'ING']);
  assert.ok(met.aow && met.zonnepanelen && met.toeslagenOnbekend);
  const taken = startTaken(met, { geboortejaar: 1942, jaar: 2026 }).map((t) => t.sleutel);
  assert.deepEqual(taken, ['familie', 'contracten', 'volmacht', 'testament', 'toeslagen', 'salderen', 'rijbewijs', 'documenten', 'post']);
});

test('opzegbrief: melding van overlijden met de juiste actie', () => {
  const b = brief({ organisatie: 'Ziggo', actie: 'opzeggen', overledene: { naam: 'H. Voorbeeld', overlijdensdatum: '2026-10-31' }, afzender: { naam: 'M. Voorbeeld', relatie: 'dochter en erfgenaam', email: 'marieke@example.nl' }, klantnummer: '12345', vandaag: NU });
  assert.match(b, /Aan: Ziggo/);
  assert.match(b, /Op 31 oktober 2026 is H\. Voorbeeld overleden/);
  assert.match(b, /klant- of polisnummer 12345/);
  assert.match(b, /per de datum van overlijden te beëindigen/);
  assert.match(b, /via marieke@example\.nl/);
  assert.ok(!/\n\n\n/.test(b));
  assert.equal(standaardActie('energie', { partnerBlijft: true }), 'overzetten');
  assert.equal(standaardActie('loterij', { partnerBlijft: true }), 'opzeggen');
  assert.equal(standaardActie('bank'), 'melden');
  assert.deepEqual(meldlijst([{ id: '1', naam: 'Ziggo', soort: 'telecom' }, { id: '2', naam: 'Essent', soort: 'energie', beeindigd: true }]).map((m) => m.organisatie), ['Ziggo']);
});

test('versleuteling: document alleen te lezen met de sleutel; sleutel alleen uit te pakken met de herstelzin', async () => {
  const sleutel = await nieuweSleutel();
  const pakket = await versleutel(sleutel, new TextEncoder().encode('polis 123'));
  assert.ok(!atob(pakket.data).includes('polis'));
  assert.equal(new TextDecoder().decode(await ontsleutel(sleutel, pakket)), 'polis 123');
  const zin = nieuweHerstelzin();
  assert.equal(zin.split(' ').length, 6);
  const ingepakt = await pakIn(sleutel, zin);
  const terug = await pakUit(ingepakt, `  ${zin.toUpperCase()} `);
  assert.equal(new TextDecoder().decode(await ontsleutel(terug, pakket)), 'polis 123');
  await assert.rejects(pakUit(ingepakt, 'appel bakker cirkel dakpan egel fiets'), /herstelzin klopt niet/);
  await assert.rejects(ontsleutel(await nieuweSleutel(), pakket));
});

test('dossier en checklist: rollen, initialen, stappen met bron', () => {
  const d = nieuwDossier({ naam: '  Henk  ', geboortejaar: '1942' });
  assert.equal(d.naam, 'Henk');
  assert.equal(d.geboortejaar, 1942);
  assert.ok(mag('regelaar', 'verwijderen') && !mag('meekijker', 'verwijderen') && mag('meekijker', 'logboek') && !mag('ouder', 'schrijven'));
  assert.equal(initialen('Marieke de Vries'), 'MV');
  assert.equal(avatarKleur('marieke'), avatarKleur('marieke'));
  assert.equal(FASES.length, 4);
  const bronIds = new Set(JSON.parse(readFileSync(new URL('../data/familie/bronnen.json', import.meta.url), 'utf8')).bronnen.map((b) => b.id));
  for (const s of alleStappen()) if (s.bron) assert.ok(bronIds.has(s.bron), `bron ${s.bron} van stap ${s.id} bestaat niet`);
  assert.deepEqual(voortgang({ arts: true, uitvaart: true }), { klaar: 2, totaal: alleStappen().length, deel: 2 / alleStappen().length });
});
