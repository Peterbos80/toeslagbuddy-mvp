// Rekenkernen van /familie/: Wlz, erfbelasting, zorgkosten, zonnepanelen,
// regels en de controle tegen de officiële bronteksten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leesRegels, controleer, leesBronBestand } from '../scripts/familie/regelcheck.js';
import { htmlNaarTekst, bedragenIn, bedragStaatIn, linksVan } from '../scripts/familie/tekst.js';
import { regelStatus, waarde, bronnenVan, regelVoor } from '../src/familie/regels.js';
import { lageBijdrage, hogeBijdrage, vermogensbijtelling, aftrekZvw } from '../src/familie/wlz.js';
import { erfbelasting, wettelijkeErfdelen, overzicht } from '../src/familie/erfbelasting.js';
import { drempel, aftrek } from '../src/familie/zorgkosten.js';
import { vergelijk } from '../src/familie/zonnepanelen.js';

const regels = leesRegels();
const VANDAAG = new Date('2026-11-16');
const wlz = regels['wlz-2026'];
const erf = regels['erfbelasting-2026'];

test('regels: elk bedrag en elke zin staat letterlijk in de afdruk van zijn officiële bron', () => {
  const b = controleer(regels, leesBronBestand, VANDAAG);
  assert.deepEqual(b, [], JSON.stringify(b, null, 1));
});

test('regelcheck: een fout bedrag of een verdwenen zin wordt gevonden', () => {
  const kopie = structuredClone(regels);
  kopie['wlz-2026'].bedragen.laagMin.waarde = 212.61;
  kopie['salderen'].feiten[0].tekst = 'De salderingsregeling blijft bestaan';
  delete kopie['wmo-2026'].bedragen.abonnementstarief.bron;
  const b = controleer(kopie, leesBronBestand, VANDAAG);
  assert.ok(b.some((x) => x.regel === 'wlz-2026' && x.sleutel === 'laagMin' && x.soort === 'bedrag'));
  assert.ok(b.some((x) => x.regel === 'salderen' && x.soort === 'feit'));
  assert.ok(b.some((x) => x.regel === 'wmo-2026' && x.soort === 'schema'));
  assert.equal(b.length, 3);
});

test('regels: veilig uitvallen als een regel te oud, onbevestigd of verlopen is', () => {
  assert.equal(regelStatus(wlz, VANDAAG), 'bevestigd');
  assert.equal(regelStatus({ ...wlz, status: 'te-controleren' }, VANDAAG), 'te-controleren');
  assert.equal(regelStatus(wlz, new Date('2028-02-01')), 'te-controleren'); // > 400 dagen niet gecontroleerd
  assert.equal(regelStatus({ ...wlz, gecontroleerdOp: '2027-01-02' }, new Date('2027-01-05')), 'verlopen');
  assert.equal(regelStatus(null), 'ontbreekt');
  assert.throws(() => waarde(wlz, 'bestaatNiet'), /Onbekende regelwaarde/);
  assert.ok(bronnenVan(wlz).includes('cak-wlz-laag'));
  assert.equal(regelVoor(regels, 'wlz-', VANDAAG).id, 'wlz-2026');
  assert.equal(regelVoor(regels, 'wlz-', new Date('2027-03-01')), null);
});

test('tekst: HTML naar tekst, bedragen en links', () => {
  const html = '<html><head><title>T</title></head><body><nav><a href="/x">menu</a></nav><main><h1>Wlz</h1><p>U betaalt minimaal &euro;&nbsp;212,60 per maand.</p><p>Zie <a href="/zorg#top">de <b>uitleg</b></a></p><script>x</script></main></body></html>';
  assert.equal(htmlNaarTekst(html), '# Wlz\nU betaalt minimaal € 212,60 per maand.\nZie de uitleg');
  assert.deepEqual(bedragenIn('€ 1.115,80 en €828.035 en € 30,4').map((b) => b.waarde), [1115.8, 828035, 30.4]);
  assert.ok(bedragStaatIn('maximaal € 3.061,80 per maand', 3061.8));
  assert.ok(!bedragStaatIn('maximaal € 3.061,80 per maand', 3061.81));
  assert.deepEqual(linksVan(html, 'https://voorbeeld.nl/a/'), [{ url: 'https://voorbeeld.nl/x', tekst: 'menu' }, { url: 'https://voorbeeld.nl/zorg', tekst: 'de uitleg' }]);
});

test('wlz: rekenvoorbeeld van het CAK (vermogen € 90.000 met partner → € 643,84 erbij)', () => {
  // Bron cak-toetsbedrag: "€ 90.000 - € 73.904 = € 16.096; 4% = € 643,84"
  assert.ok(leesBronBestand('cak-toetsbedrag').includes('643,84'));
  assert.deepEqual(vermogensbijtelling(wlz, { vermogen: 90000, partner: true }), { toetsbedrag: 73904, boven: 16096, bijtelling: 643.84 });
  assert.equal(vermogensbijtelling(wlz, { vermogen: 30000 }).bijtelling, 0);
});

test('wlz: lage eigen bijdrage is 10% van het bijdrageplichtig inkomen per jaar, gedeeld door 12, tussen minimum en maximum', () => {
  const r = lageBijdrage(wlz, { verzamelinkomen: 30000, vermogen: 0 });
  assert.equal(r.perMaand, 250);
  assert.equal(r.perMaandLaagst, 250);
  assert.equal(lageBijdrage(wlz, { verzamelinkomen: 15000 }).perMaand, 212.6); // minimum
  assert.ok(lageBijdrage(wlz, { verzamelinkomen: 15000 }).opMinimum);
  assert.equal(lageBijdrage(wlz, { verzamelinkomen: 200000 }).perMaand, 1115.8); // maximum
  // Vermogen boven het toetsbedrag telt voor 4% mee
  assert.equal(lageBijdrage(wlz, { verzamelinkomen: 30000, vermogen: 136952 }).perMaand, 283.33);
  // AOW met vermogen: bandbreedte door de compensatie vervallen ouderentoeslag (max € 1.133)
  const aow = lageBijdrage(wlz, { verzamelinkomen: 30000, vermogen: 50000, aow: true });
  assert.equal(aow.compensatieMax, 1133);
  assert.ok(aow.perMaandLaagst < aow.perMaand && aow.perMaand - aow.perMaandLaagst < 9.5);
  // Zorg thuis (mpt/pgb): inkomensaftrek en eigen minimum/maximum
  const mpt = lageBijdrage(wlz, { verzamelinkomen: 30000, mpt: true });
  assert.equal(mpt.perMaand, Math.round(((30000 - 7727.6) * 0.1 / 12 - 182.2) * 100) / 100 < 30.4 ? 30.4 : mpt.perMaand);
  assert.equal(mpt.minimum, 30.4);
  assert.equal(mpt.maximum, 933.6);
});

test('wlz: hoge eigen bijdrage volgt de stappen van het CAK', () => {
  // Alleenstaande AOW'er: verzamelinkomen 28.000, belasting 3.000, geen vermogen
  const invoer = { verzamelinkomen: 28000, belasting: 3000, vermogen: 0, aow: true };
  const zvw = aftrekZvw(wlz, invoer);
  // stap 1: 1.987 + 5,32% × 28.000 = 3.476,60 (tussen 3.029,45 en 5.797,61); zorgtoeslag: 1.483 − 13,67% × 1.180 = 1.321,69
  assert.equal(zvw.stap1, 3476.6);
  assert.equal(zvw.zorgtoeslag, 1321.69);
  assert.equal(zvw.aftrek, 2154.91);
  const r = hogeBijdrage(wlz, invoer);
  // bpi = 28.000 − 3.000 − 2.154,91 − 4.925 − 1.294 = 16.626,09
  assert.equal(r.bijdrageplichtigInkomen, 16626.09);
  // beschikbaar = 28.000 − 3.000 − 1.987 − 4.925 − 1.294 = 16.794; boven 11.830 = 4.964; 25% = 1.241
  assert.equal(r.perJaar, 15385.09);
  assert.equal(r.perMaand, 1282.09);
  assert.equal(r.compensatieMax, 0);
  // Hoog inkomen: nooit meer dan het maximum
  assert.equal(hogeBijdrage(wlz, { verzamelinkomen: 150000, belasting: 50000, aow: true }).perMaand, 3061.8);
  // Laag inkomen: nooit minder dan € 0
  assert.equal(hogeBijdrage(wlz, { verzamelinkomen: 5000, belasting: 0, aow: true }).perMaand, 0);
  // Vermogen: 4% boven het toetsbedrag telt mee, en geeft een bandbreedte bij AOW
  const v = hogeBijdrage(wlz, { ...invoer, vermogen: 136952 });
  assert.equal(v.perJaar, 15385.09 + 4000);
  assert.ok(v.perMaandLaagst < v.perMaand);
  // De stappen tellen op tot het jaarbedrag
  assert.ok(r.stappen.some((s) => s.tekst === 'Zak- en kleedgeld' && s.bedrag === -4925));
});

test('erfbelasting 2026: vrijstelling en twee schijven per relatie', () => {
  // Kind erft 100.000: 73.770 belast tegen 10%
  const kind = erfbelasting(erf, { waarde: 100000, relatie: 'kind' });
  assert.equal(kind.vrijstelling, 26230);
  assert.equal(kind.belast, 73770);
  assert.equal(kind.belasting, 7377);
  // Partner onder de vrijstelling: niets
  assert.equal(erfbelasting(erf, { waarde: 500000, relatie: 'partner' }).belasting, 0);
  // Boven de schijfgrens: 10% over 158.669 en 20% over de rest
  const groot = erfbelasting(erf, { waarde: 26230 + 258669, relatie: 'kind' });
  assert.equal(groot.belasting, Math.floor(158669 * 0.1 + 100000 * 0.2));
  // Broer of zus: vrijstelling 2.769, 30%
  assert.equal(erfbelasting(erf, { waarde: 12769, relatie: 'overig' }).belasting, 3000);
  assert.equal(erfbelasting(erf, { waarde: 36230, relatie: 'kleinkind' }).belasting, 1800);
  assert.throws(() => erfbelasting(erf, { waarde: 1, relatie: 'buurman' }));
});

test('wettelijke verdeling: voorbeeld van de Belastingdienst (partner en 2 kinderen, erfenis 180.000)', () => {
  // Bron bd-wettelijke-verdeling: "Elke erfgenaam krijgt 1/3 deel ... Zij erven dus ieder € 60.000"
  assert.ok(leesBronBestand('bd-wettelijke-verdeling').includes('Zij erven dus ieder € 60.000'));
  const v = wettelijkeErfdelen({ nalatenschap: 180000, partner: true, kinderen: 2 });
  assert.equal(v.perDeel, 60000);
  assert.equal(v.erfgenamen.length, 3);
  assert.equal(v.erfgenamen[0].krijgtInHanden, 180000);
  assert.equal(v.erfgenamen[1].krijgtInHanden, 0);
  const o = overzicht(erf, { nalatenschap: 180000, partner: true, kinderen: 2 });
  assert.equal(o.erfgenamen[0].belasting, 0);
  assert.equal(o.erfgenamen[1].belasting, 3377); // (60.000 − 26.230) × 10%
  assert.equal(o.totaalBelasting, 6754);
  assert.equal(wettelijkeErfdelen({ nalatenschap: 90000, partner: false, kinderen: 3 }).perDeel, 30000);
  assert.ok(wettelijkeErfdelen({ nalatenschap: 1, partner: false, kinderen: 0 }).anders);
});

test('zorgkosten 2026: drempel in drie treden en verhoging', () => {
  const z = regels['zorgkosten-2026'];
  assert.equal(drempel(z, { drempelinkomen: 9000 }), 166);
  assert.equal(drempel(z, { drempelinkomen: 15000, partner: true }), 332);
  assert.equal(drempel(z, { drempelinkomen: 30000 }), 495); // 1,65%
  assert.equal(drempel(z, { drempelinkomen: 61411 }), 848 + 575); // 848 + 5,75% van 10.000
  const a = aftrek(z, { drempelinkomen: 30000, aow: true, kostenMetVerhoging: 1000, kostenZonderVerhoging: 500 });
  assert.equal(a.verhoging, 1130);
  assert.equal(a.aftrek, 2630 - 495);
  assert.equal(aftrek(z, { drempelinkomen: 60000, kostenMetVerhoging: 1000 }).verhoging, 0);
  assert.equal(aftrek(z, { drempelinkomen: 30000, kostenZonderVerhoging: 300 }).aftrek, 0);
});

test('zonnepanelen: met en zonder salderen, wettelijk minimum van 50% van het kale tarief', () => {
  const s = regels.salderen;
  const r = vergelijk(s, { opwek: 3000, verbruik: 3000, zelfverbruik: 900, tariefAllIn: 0.3, tariefKaal: 0.12, vergoeding: '', terugleverkosten: 0 });
  assert.equal(r.teruglevering, 2100);
  assert.equal(r.vanNet, 2100);
  assert.equal(r.minimumVergoeding, 0.06);
  assert.equal(r.metSalderen, 0); // alles weggestreept
  assert.equal(r.zonderSalderen, 2100 * 0.3 - 2100 * 0.06);
  assert.equal(r.verschil, 504);
  assert.equal(r.winstPerKwhZelf, 0.24);
  assert.ok(vergelijk(s, { opwek: 3000, verbruik: 3000, zelfverbruik: 900, tariefAllIn: 0.3, tariefKaal: 0.12, vergoeding: 0.01 }).onderMinimum);
  // Meer opwek dan verbruik: overschot krijgt ook nu al alleen de vergoeding
  const o = vergelijk(s, { opwek: 5000, verbruik: 3000, zelfverbruik: 1000, tariefAllIn: 0.3, tariefKaal: 0.12, vergoeding: 0.06, terugleverkosten: 100 });
  assert.equal(o.metSalderen, -2000 * 0.06 + 100);
});
