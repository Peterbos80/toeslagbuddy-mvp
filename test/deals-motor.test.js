// DealBuddy-rekenmotor (src/deals): aanbod, historie, alarmen, vluchten,
// grafiek, live samenvoegen, jacht-opdrachten en rapporten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseer, ontdubbel, bedrag, gtin, productSleutel, totaalprijs, raadCategorie, slug } from '../src/deals/aanbod.js';
import { voegToe, dagReeks, gangbarePrijs, modusBand, laagste30, echteKorting, nepKorting, dealScore, productOverzicht, afkappen, weekOverzicht, isoWeek, mediaan } from '../src/deals/historie.js';
import { normaliseerRegel, matcht, zoekMatches, bewijsSterk, filterMeldingen, regelStatus } from '../src/deals/alarm.js';
import { normaliseerVlucht, voegVluchtToe, gangbaarRoute, prijsKalender, goedkoopste, routeOverzicht, afkappenVlucht } from '../src/deals/vluchten.js';
import { bouwIndex } from '../src/deals/dealindex.js';
import { grafiekData, verhogingVoorKorting, trapPad, schaal, grafiekMeerSvg, prijzenOp, weekTabel } from '../src/deals/grafiek.js';
import { sseLezer, zoekInIndex, uitIndex, voegLiveSamen, chipTekst } from '../src/deals/samenvoegen.js';
import { leesOpdracht, pastBij, criteriaTekst, geldigeCriteria, inhoud } from '../src/deals/opdracht.js';
import { maakRapport, trend, verschil, drempelGehaald, meldenswaard } from '../src/deals/rapport.js';
import { sparklineSvg, grafiekSvg, kaartHtml, kalenderHtml, esc } from '../src/deals/deals-weergave.js';

const NU = Date.parse('2026-11-08T12:00:00Z');
const DAG = 864e5;
const dagIso = (n) => new Date(NU - n * DAG).toISOString();

// Historie maken: prijzen[i] = totaal i dagen geleden (laatste = vandaag)
function record(prijzen, { winkel = 'A', product = 'p1', extra = [] } = {}) {
  let r = null;
  prijzen.forEach((p, i) => {
    const n = prijzen.length - 1 - i;
    r = voegToe(r, normaliseer({ product, titel: 'Test product 50 ml', winkel, prijs: p, verzendkosten: 0, tijd: dagIso(n), bron: 'test' }, { nu: NU }));
  });
  for (const e of extra) r = voegToe(r, normaliseer({ product, titel: 'Test product 50 ml', verzendkosten: 0, bron: 'test2', ...e }, { nu: NU }));
  return r;
}

// ── aanbod ──
test('bedrag: Nederlandse en Engelse notaties', () => {
  assert.equal(bedrag('12,95'), 12.95);
  assert.equal(bedrag('€ 1.299,00'), 1299);
  assert.equal(bedrag('1,299.00'), 1299);
  assert.equal(bedrag('12.95 EUR'), 12.95);
  assert.equal(bedrag('1.299.000'), 1299000);
  assert.equal(bedrag(''), null);
  assert.equal(bedrag('gratis'), null);
  assert.equal(bedrag(7), 7);
});

test('gtin: controlecijfer en vaste vorm', () => {
  assert.equal(gtin('4006381333931'), '4006381333931');
  assert.equal(gtin('04006381333931'), '4006381333931'); // GTIN-14 met voorloopnul
  assert.equal(gtin('4006381333932'), null); // fout controlecijfer
  assert.equal(gtin('036000291452'), '0036000291452'); // UPC-A → EAN-13
  assert.equal(gtin('abc'), null);
  assert.equal(productSleutel({ ean: '4006381333931', titel: 'x' }), '4006381333931');
  assert.equal(productSleutel({ titel: 'Eau de Parfum 50 ml', merk: 'Maison Lumière' }), 'maison-lumiere-eau-de-parfum-50-ml');
  assert.equal(slug('Crème & Co!'), 'creme-en-co');
});

test('normaliseer: verzendkosten, drempel gratis verzending, ontbrekende verzending', () => {
  const a = normaliseer({ titel: 'X', winkel: 'W', prijs: '24,50', verzendkosten: '3,95', gratisVerzendingVanaf: 25 });
  assert.equal(a.totaal, 28.45);
  assert.equal(a.verzendBekend, true);
  const b = normaliseer({ titel: 'X', winkel: 'W', prijs: 25, verzendkosten: 3.95, gratisVerzendingVanaf: 25 });
  assert.equal(b.totaal, 25, 'precies op de drempel: gratis');
  const c = normaliseer({ titel: 'X', winkel: 'W', prijs: 10 });
  assert.equal(c.totaal, 10);
  assert.equal(c.verzendBekend, false);
  assert.equal(totaalprijs({ prijs: 10, verzendkosten: null, gratisVerzendingVanaf: 5 }), 10);
});

test('normaliseer: valuta, ongeldige invoer en van-prijs', () => {
  assert.equal(normaliseer({ titel: 'X', winkel: 'W', prijs: 10, valuta: 'USD' }), null, 'onbekende koers: overslaan');
  assert.equal(normaliseer({ titel: 'X', winkel: 'W', prijs: 10, valuta: 'USD' }, { koersen: { USD: 0.9 } }).prijs, 9);
  assert.equal(normaliseer({ titel: '', winkel: 'W', prijs: 10 }), null);
  assert.equal(normaliseer({ titel: 'X', winkel: 'W', prijs: 0 }), null);
  assert.equal(normaliseer({ titel: 'X', winkel: 'W', prijs: -5 }), null);
  assert.equal(normaliseer({ titel: 'X', winkel: 'W', prijs: 10, vanPrijs: 8 }).vanPrijs, null, 'van-prijs lager dan prijs telt niet');
  assert.equal(normaliseer({ titel: 'X', winkel: 'W', prijs: 10, url: 'javascript:alert(1)' }).url, null);
  assert.equal(raadCategorie('Eau de Toilette 100 ml'), 'parfum');
  assert.equal(raadCategorie('LEGO bouwset'), 'speelgoed');
});

test('ontdubbel: nieuwste telt, bij gelijke tijd de laagste prijs', () => {
  const t = '2026-11-08T10:00:00Z';
  const a = normaliseer({ product: 'p', titel: 'X', winkel: 'W', prijs: 10, tijd: t, url: 'https://b.example' });
  const b = normaliseer({ product: 'p', titel: 'X', winkel: 'w', prijs: 9, tijd: t, url: 'https://a.example' });
  const c = normaliseer({ product: 'p', titel: 'X', winkel: 'W', prijs: 12, tijd: '2026-11-08T11:00:00Z' });
  assert.equal(ontdubbel([a, b]).length, 1);
  assert.equal(ontdubbel([a, b])[0].prijs, 9);
  assert.equal(ontdubbel([a, b, c])[0].prijs, 12);
  const gisteren = normaliseer({ product: 'p', titel: 'X', winkel: 'W', prijs: 11, tijd: '2026-11-07T10:00:00Z' });
  assert.equal(ontdubbel([a, gisteren]).length, 2, 'andere dag = andere meting');
});

// ── historie ──
test('gangbare prijs: mediaan van 90 dagen, zonder vandaag; te weinig punten = null', () => {
  const r = record([...Array(100).fill(50), 30]);
  const reeks = dagReeks(r);
  assert.equal(gangbarePrijs(reeks, NU), 50);
  assert.equal(gangbarePrijs(dagReeks(record([50, 50, 50, 50, 50, 50, 40])), NU), null, '6 punten vóór vandaag');
  assert.equal(gangbarePrijs(dagReeks(record([50, 50, 50, 50, 50, 50, 50, 40])), NU), 50, '7 punten');
  assert.equal(mediaan([1, 2, 3, 4]), 2.5);
});

test('gangbare prijs: uitschieters en dagelijks laagste over winkels', () => {
  const prijzen = Array(60).fill(80);
  prijzen[10] = 1; // prijsfout
  prijzen[20] = 500;
  const r = record(prijzen);
  assert.equal(gangbarePrijs(dagReeks(r), NU), 80);
  // Tweede winkel die altijd € 75 is: dagelijks laagste is 75
  let r2 = record(Array(30).fill(80));
  for (let n = 0; n < 30; n++) r2 = voegToe(r2, normaliseer({ product: 'p1', titel: 'T', winkel: 'B', prijs: 75, tijd: dagIso(n) }, { nu: NU }));
  assert.equal(gangbarePrijs(dagReeks(r2), NU), 75);
  assert.equal(dagReeks(r2)[0].winkel, 'B');
});

test('dagReeks: bij gelijke prijs wint de winkel die alfabetisch eerst komt', () => {
  let r = record([10], { winkel: 'Zeta' });
  r = voegToe(r, normaliseer({ product: 'p1', titel: 'T', winkel: 'Alfa', prijs: 10, tijd: dagIso(0) }, { nu: NU }));
  assert.equal(dagReeks(r).at(-1).winkel, 'Alfa');
});

test('modus-band en laagste prijs van 30 dagen (Omnibus)', () => {
  const prijzen = [...Array(40).fill(100), ...Array(19).fill(90), ...Array(30).fill(100), 95];
  const reeks = dagReeks(record(prijzen));
  const m = modusBand(reeks, NU);
  assert.ok(m.van <= 100 && m.tot > 100, JSON.stringify(m));
  assert.equal(laagste30(reeks, NU), 100, 'de dip van 90 was langer dan 30 dagen geleden');
  const gelijk = modusBand(dagReeks(record([...Array(5).fill(10), ...Array(5).fill(20), 15])), NU, { breedte: 5 });
  assert.equal(gelijk.van, 10, 'gelijk aantal: goedkoopste band');
  assert.equal(laagste30([], NU), null);
});

test('echte korting en nep-korting', () => {
  assert.equal(echteKorting(75, 100), 0.25);
  assert.equal(echteKorting(110, 100), -0.1);
  assert.equal(echteKorting(10, null), null);
  // Van-prijs 160, maar gangbaar is 100 en nu 98: nep
  const nep = nepKorting({ vanPrijs: 160, huidig: 98, gangbaar: 100, laagste30: 97 });
  assert.equal(nep.nep, true);
  assert.ok(Math.abs(nep.geclaimd - 0.388) < 0.002);
  assert.ok(nep.redenen.length >= 2);
  // Echte korting en lager dan laagste30: geen nep
  assert.equal(nepKorting({ vanPrijs: 100, huidig: 70, gangbaar: 100, laagste30: 95 }).nep, false);
  // Geen van-prijs: nooit nep
  assert.equal(nepKorting({ vanPrijs: null, huidig: 70, gangbaar: 100, laagste30: 60 }).nep, false);
  // Wel 20% onder gangbaar, maar niet onder laagste30: nep volgens Omnibus
  assert.equal(nepKorting({ vanPrijs: 100, huidig: 80, gangbaar: 100, laagste30: 80 }).nep, true);
});

test('dealscore: korting, versheid, betrouwbaarheid, nep, verzending onbekend', () => {
  const basis = dealScore({ echteKorting: 0.5, uurOud: 0, betrouwbaarheid: 1 });
  assert.equal(basis, 100);
  assert.ok(dealScore({ echteKorting: 0.5, uurOud: 80, betrouwbaarheid: 1 }) < basis);
  assert.equal(dealScore({ echteKorting: 0.5, uurOud: 0, betrouwbaarheid: 1, nep: true }), 50);
  assert.equal(dealScore({ echteKorting: 0.5, uurOud: 0, betrouwbaarheid: 1, verzendBekend: false }), 95);
  assert.equal(dealScore({ echteKorting: 0.9, uurOud: 0, betrouwbaarheid: 1, verdacht: true }), 40);
  assert.equal(dealScore({ echteKorting: null }), 0);
  assert.ok(dealScore({ echteKorting: -0.2 }) < 30);
});

test('productOverzicht: beste winkel, korting, bewijsgetallen en afkappen op 180 dagen', () => {
  const r = record([...Array(200).fill(100), 70], { extra: [{ winkel: 'B', prijs: 72, tijd: dagIso(0) }] });
  afkappen(r, NU);
  assert.ok(Object.keys(r.dagen).length <= 181);
  const ov = productOverzicht(r, NU);
  assert.equal(ov.huidig, 70);
  assert.equal(ov.beste.winkel, 'A');
  assert.equal(ov.gangbaar, 100);
  assert.equal(ov.echteKorting, 0.3);
  assert.equal(ov.onderLaagste30, true);
  assert.equal(ov.winkelsGezien, 2);
  assert.ok(ov.score > 50);
  assert.equal(ov.aanbod.length, 2);
  // Oude prijzen (> 48 uur) tellen niet als 'nu'
  const oud = record([100, 100], {});
  assert.equal(productOverzicht(oud, NU + 5 * DAG).huidig, null);
});

test('weekoverzicht en ISO-weken', () => {
  assert.equal(isoWeek('2026-01-01'), '2026-W01');
  assert.equal(isoWeek('2027-01-01'), '2026-W53');
  const w = weekOverzicht([{ datum: '2026-11-02', totaal: 10 }, { datum: '2026-11-03', totaal: 12 }, { datum: '2026-11-09', totaal: 8 }]);
  assert.deepEqual(w[0], { week: '2026-W45', laagste: 10, mediaan: 11, dagen: 2 });
  assert.equal(w.length, 2);
});

// ── vluchten ──
test('vluchten: normaliseren, gangbare prijs per maand, kalender en goedkoopste dagen', () => {
  assert.equal(normaliseerVlucht({ van: 'AMS', naar: 'AMS', vertrek: '2027-01-01', prijs: 10 }), null);
  assert.equal(normaliseerVlucht({ van: 'AMS', naar: 'LIS', vertrek: 'morgen', prijs: 10 }), null);
  assert.equal(normaliseerVlucht({ van: 'ams', naar: 'lis', vertrek: '2027-01-02', prijs: '80', valuta: 'GBP' }), null);
  let r = null;
  for (let n = 20; n >= 1; n--) r = voegVluchtToe(r, normaliseerVlucht({ van: 'AMS', naar: 'LIS', vertrek: '2027-01-10', prijs: 100 + n, tijd: dagIso(n) }));
  r = voegVluchtToe(r, normaliseerVlucht({ van: 'AMS', naar: 'LIS', vertrek: '2027-01-10', prijs: 60, tijd: dagIso(0), maatschappij: 'X' }));
  r = voegVluchtToe(r, normaliseerVlucht({ van: 'AMS', naar: 'LIS', vertrek: '2027-01-12', prijs: 60, tijd: dagIso(0), maatschappij: 'Y' }));
  assert.equal(gangbaarRoute(r, '2027-01', NU), 110.5);
  const k = prijsKalender(r, '2027-01');
  assert.equal(k.dagen.length, 31);
  assert.equal(k.aantal, 2);
  assert.equal(k.dagen[9].prijs, 60);
  assert.equal(goedkoopste(k)[0].datum, '2027-01-10', 'gelijke prijs: vroegste datum');
  const ov = routeOverzicht(r, NU);
  assert.equal(ov.maanden[0].echteKorting, 0.457);
  assert.equal(ov.maanden[0].laagste30, 101);
  afkappenVlucht(r, Date.parse('2027-01-11T00:00:00Z'));
  assert.ok(!r.actueel['2027-01-10'], 'vertrek in het verleden weg');
});

// ── alarmen ──
const deal = (x = {}) => ({ soort: 'product', id: '4006381333931', pagina: '/deals/p/x/', titel: 'Maison Eau de Parfum Bloesem 50 ml', merk: 'Maison', categorie: 'parfum', totaal: 70, prijs: 66, gangbaar: 100, laagste30: 90, echteKorting: 0.3, nep: false, demo: false, dagen: 60, winkelsGezien: 3, bronnen: 2, ...x });

test('alarm: regels controleren en matchen', () => {
  assert.equal(normaliseerRegel({ type: 'vlucht', waarde: 'ams → lis', minKorting: 10 }).waarde, 'AMS-LIS');
  assert.equal(normaliseerRegel({ type: 'vlucht', waarde: 'Lissabon' }), null);
  assert.equal(normaliseerRegel({ type: 'onzin', waarde: 'x' }), null);
  assert.equal(normaliseerRegel({ type: 'product', waarde: 'x', minKorting: 120 }), null);
  assert.ok(matcht(normaliseerRegel({ type: 'categorie', waarde: 'Parfum', minKorting: 30 }), deal()));
  assert.ok(!matcht(normaliseerRegel({ type: 'categorie', waarde: 'parfum', minKorting: 31 }), deal()));
  assert.ok(matcht(normaliseerRegel({ type: 'zoekterm', waarde: 'bloes parfum', minKorting: 0 }), deal()), 'voorvoegsel van ≥ 4 letters');
  assert.ok(!matcht(normaliseerRegel({ type: 'zoekterm', waarde: 'oordopjes' }), deal()));
  assert.ok(!matcht(normaliseerRegel({ type: 'product', waarde: '4006381333931', maxPrijs: 69 }), deal()), 'max incl. verzending');
  assert.ok(matcht(normaliseerRegel({ type: 'product', waarde: '4006381333931', maxPrijs: 69, inclusiefVerzending: false }), deal()));
  assert.ok(!matcht(normaliseerRegel({ type: 'categorie', waarde: 'parfum' }), deal({ nep: true })), 'nep-korting nooit');
  assert.equal(zoekMatches([{ type: 'categorie', waarde: 'parfum' }, { type: 'x' }], [deal(), deal({ id: 'b', categorie: 'huis' })]).length, 1);
});

test('alarm: bewijs moet sterk zijn (≥ 2 winkels, ≥ 30 dagen, onder laagste30, geen demo)', () => {
  const regel = { minKorting: 20 };
  assert.equal(bewijsSterk(deal(), regel).sterk, true);
  assert.match(bewijsSterk(deal({ winkelsGezien: 1, bronnen: 1 }), regel).redenen.join(), /winkel/);
  assert.match(bewijsSterk(deal({ dagen: 20 }), regel).redenen.join(), /20 dagen/);
  assert.match(bewijsSterk(deal({ laagste30: 70 }), regel).redenen.join(), /laagste prijs van 30 dagen/);
  assert.match(bewijsSterk(deal({ echteKorting: 0.1 }), regel).redenen.join(), /te laag/);
  assert.match(bewijsSterk(deal({ demo: true }), regel).redenen.join(), /demo/);
  assert.equal(bewijsSterk(deal({ demo: true }), regel, { demoToestaan: true }).sterk, true);
  const v = { soort: 'vlucht', id: 'v', totaal: 50, gangbaar: 100, laagste30: 80, echteKorting: 0.5, dagen: 15, bronnen: 1 };
  assert.equal(bewijsSterk(v, regel).sterk, true, 'vlucht: 14 dagen is genoeg');
  assert.equal(bewijsSterk({ ...v, dagen: 5 }, regel).sterk, false);
  assert.equal(bewijsSterk({ ...v, dagen: 5, bronnen: 2 }, regel).sterk, true);
});

test('alarm: niet twee keer melden, wel bij ≥ 5% extra daling', () => {
  const r = normaliseerRegel({ type: 'categorie', waarde: 'parfum' });
  const r2 = normaliseerRegel({ type: 'zoekterm', waarde: 'bloesem' });
  const eerst = filterMeldingen([{ regel: r, deal: deal() }, { regel: r2, deal: deal() }], {}, { nu: NU });
  assert.equal(eerst.nieuw.length, 1, 'twee regels, één melding');
  assert.equal(eerst.nieuw[0].regels.length, 2);
  assert.equal(filterMeldingen([{ regel: r, deal: deal({ totaal: 68 }) }], eerst.verzonden).nieuw.length, 0);
  assert.equal(filterMeldingen([{ regel: r, deal: deal({ totaal: 66.5 }) }], eerst.verzonden).nieuw.length, 1);
  assert.equal(regelStatus({ type: 'categorie', waarde: 'parfum', minKorting: 50 }, [deal()]).status, 'wachten');
  assert.equal(regelStatus({ type: 'categorie', waarde: 'parfum', minKorting: 20 }, [deal()]).status, 'gehaald');
  assert.equal(regelStatus({ type: 'categorie', waarde: 'huis' }, [deal()]).status, 'geen-aanbod');
});

// ── index ──
test('bouwIndex: producten en vluchten, beste deals eerst', () => {
  const r1 = record([...Array(40).fill(100), 60], { product: 'a' });
  const r2 = record([...Array(40).fill(100), 99], { product: 'b' });
  let v = null;
  for (let n = 10; n >= 0; n--) v = voegVluchtToe(v, normaliseerVlucht({ van: 'AMS', naar: 'BCN', vertrek: '2027-02-01', prijs: n ? 100 : 80, tijd: dagIso(n) }));
  const { deals } = bouwIndex([r1, r2], [v], NU);
  assert.equal(deals[0].id, 'a');
  assert.ok(deals.some((d) => d.soort === 'vlucht' && d.route === 'AMS-BCN' && d.echteKorting === 0.2));
  assert.equal(deals.find((d) => d.id === 'a').spark.length, 41);
});

// ── grafiek ──
test('grafiek: verhoging vóór een korting wordt herkend', () => {
  const p = (prijzen) => prijzen.map((totaal, i) => ({ datum: new Date(NU - (prijzen.length - i) * DAG).toISOString().slice(0, 10), totaal }));
  const nep = verhogingVoorKorting(p([...Array(20).fill(50), ...Array(6).fill(62), ...Array(5).fill(50)]));
  assert.equal(nep.length, 1);
  assert.equal(nep[0].verhoogd, 62);
  assert.equal(nep[0].basis, 50);
  assert.equal(verhogingVoorKorting(p([...Array(20).fill(50), ...Array(2).fill(62), ...Array(5).fill(50)])).length, 0, 'te kort verhoogd');
  assert.equal(verhogingVoorKorting(p([...Array(20).fill(50), ...Array(6).fill(62), ...Array(5).fill(58)])).length, 0, 'niet terug naar het oude niveau');
  assert.equal(verhogingVoorKorting(p(Array(40).fill(50))).length, 0);
});

test('grafiek: reeksen per winkel, traplijn, tooltip-prijzen en SVG', () => {
  let r = record([...Array(100).fill(80), 70], { winkel: 'Alfa' });
  for (let n = 0; n < 50; n++) r = voegToe(r, normaliseer({ product: 'p1', titel: 'T', winkel: 'Beta', prijs: 75, verzendkosten: 4.95, tijd: dagIso(n) }, { nu: NU }));
  const g = grafiekData(r, NU);
  assert.equal(g.winkels.length, 2);
  assert.equal(g.winkels[1].verzending, 4.95);
  assert.equal(g.beste.winkel, 'Alfa');
  assert.equal(g.gangbaar, 79.95);
  assert.equal(g.laagste30, 79.95);
  const s = schaal(g, { dagen: 30 });
  assert.ok(s.begin >= NU - 31 * DAG);
  const pad = trapPad(g.winkels[0].punten, s);
  assert.match(pad, /^M[\d.]+ [\d.]+(H[\d.]+V[\d.]+)+H[\d.]+$/);
  const svg = grafiekMeerSvg(g, { dagen: 90 });
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="Prijsverloop bij 2 winkels/);
  assert.equal((svg.match(/class="pg-lijn/g) || []).length, 2);
  assert.equal((grafiekMeerSvg(g, { verborgen: ['Beta'] }).match(/class="pg-lijn/g) || []).length, 1);
  const op = prijzenOp(g, new Date(NU - 10 * DAG).toISOString().slice(0, 10));
  assert.deepEqual(op.map((x) => [x.winkel, x.totaal]), [['Alfa', 80], ['Beta', 79.95]].sort((a, b) => a[1] - b[1]));
  const t = weekTabel(g, { weken: 4 });
  assert.equal(t.rijen.length, 4);
  assert.deepEqual(t.winkels, ['Alfa', 'Beta']);
});

// ── weergave ──
test('weergave: escapen, sparkline, grafiek en kaart', () => {
  assert.equal(esc('<a href="x">\'</a>'), '&lt;a href=&quot;x&quot;&gt;&#39;&lt;/a&gt;');
  assert.equal(sparklineSvg([1]), '');
  assert.match(sparklineSvg([1, 2, 3], { gangbaar: 2 }), /spark-gangbaar/);
  assert.match(grafiekSvg([{ datum: '2026-11-01', totaal: 10 }, { datum: '2026-11-05', totaal: 12 }], { nu: NU, gangbaar: 11, laagste30: 10 }), /gangbaar € 11,00/);
  const k = kaartHtml({ ...deal({ titel: '<script>x</script>', url: 'https://w.example/p', winkel: 'W', affiliate: true, verzendkosten: 3.95, verzendBekend: true }), spark: [1, 2] });
  assert.ok(!k.includes('<script>x'));
  assert.match(k, /rel="sponsored nofollow noopener"/);
  assert.match(k, /partnerlink/);
  assert.match(k, /incl\. € 3,95 verzending/);
  const kal = kalenderHtml({ maand: '2026-12', dagen: Array.from({ length: 31 }, (_, i) => ({ datum: `2026-12-${String(i + 1).padStart(2, '0')}`, prijs: i % 2 ? 50 : null, niveau: 0 })) });
  assert.match(kal, /<caption>/);
  assert.equal((kal.match(/<tr>/g) || []).length, 6, 'kop + 5 weken (1 dec 2026 is een dinsdag)');
});

// ── live samenvoegen ──
test('SSE-lezer: stukjes, meerdere data-regels, commentaar en CRLF', () => {
  const uit = [];
  const l = sseLezer((b) => uit.push(b));
  l.voeg(': ping\r\nevent: bron\r\ndata: {"bron":"bol",');
  l.voeg('"status":"ok"}\r\n\r\nevent: klaar\ndata: {}\n');
  l.voeg('\ndata: regel1\ndata: regel2\n\n');
  l.einde();
  assert.deepEqual(uit.map((b) => b.event), ['bron', 'klaar', 'message']);
  assert.equal(uit[0].data.bron, 'bol');
  assert.equal(uit[2].tekst, 'regel1\nregel2');
  assert.equal(uit[2].data, null);
});

test('live: direct uit de index, dan samenvoegen, sorteren en nieuwe laagste prijs', () => {
  const index = [deal({ id: 'a', winkel: 'Geurwinkel', totaal: 70, laagste30: 68 }), deal({ id: 'b', titel: 'Airfryer', categorie: 'huis', winkel: 'Huis', totaal: 50 })];
  assert.equal(zoekInIndex(index, 'bloesem').length, 1);
  assert.equal(zoekInIndex(index, '', 'huis').length, 1);
  let lijst = zoekInIndex(index, 'parfum').map(uitIndex);
  assert.equal(lijst[0].bron, 'index');
  lijst = voegLiveSamen(lijst, { bron: 'verificatie', status: 'ok', aanbiedingen: [{ product: 'a', titel: 'Bloesem', winkel: 'geurwinkel', totaal: 69, geverifieerd: '2026-11-08T12:00:00Z' }] });
  assert.equal(lijst.length, 1, 'zelfde product+winkel samengevoegd (hoofdletters maken niet uit)');
  assert.equal(lijst[0].totaal, 69);
  assert.equal(lijst[0].geverifieerd, '2026-11-08T12:00:00.000Z');
  assert.equal(lijst[0].nieuwLaagste, false, '69 is niet lager dan laagste30 68');
  lijst = voegLiveSamen(lijst, { bron: 'bol', status: 'ok', aanbiedingen: [{ product: 'a', titel: 'Bloesem', winkel: 'bol', prijs: 60, verzendkosten: 2.5 }, { titel: '', winkel: 'x', totaal: 1 }] });
  assert.equal(lijst.length, 2);
  assert.equal(lijst[0].winkel, 'bol');
  assert.equal(lijst[0].totaal, 62.5);
  assert.equal(lijst[0].nieuwLaagste, true);
  assert.deepEqual(voegLiveSamen(lijst, { bron: 'x', status: 'timeout' }).length, 2, 'time-out verandert niets');
  assert.equal(chipTekst({ bron: 'bol', status: 'ok', ms: 812 }), 'bol.com ✓ 0,8 s');
  assert.equal(chipTekst({ bron: 'Winkel X', status: 'timeout' }), 'Winkel X ✗ time-out');
});

// ── jacht-opdrachten ──
test('opdracht: product met merk, inhoud, variant en maximumprijs', () => {
  const c = leesOpdracht('Dior Sauvage EDT 100 ml onder €70 incl. verzending', { nu: NU });
  assert.equal(c.soort, 'product');
  assert.equal(c.merk, 'Dior');
  assert.deepEqual(c.inhoud, { waarde: 100, eenheid: 'ml' });
  assert.equal(c.variant, 'edt');
  assert.equal(c.maxTotaal, 70);
  assert.equal(c.inclusiefVerzending, true);
  assert.equal(c.zoekterm, 'Dior Sauvage');
  assert.equal(c.categorie, 'parfum');
  assert.deepEqual(c.uitsluiten, ['tester', 'set']);
  assert.ok(geldigeCriteria(c));
  assert.match(criteriaTekst(c), /max\. € 70 incl\. verzending/);
});

test('opdracht: allerlei schrijfwijzen van bedragen', () => {
  for (const [tekst, verwacht] of [
    ['airfryer onder € 70', 70],
    ['airfryer max 70,-', 70],
    ['airfryer tot 70 euro', 70],
    ['airfryer voor €69,95', 69.95],
    ['airfryer niet meer dan 1.299 euro', 1299],
    ['airfryer € 85', 85],
    ['airfryer 85 eur', 85],
    ['airfryer maximaal €70,50 excl. verzending', 70.5],
  ]) assert.equal(leesOpdracht(tekst).maxTotaal, verwacht, tekst);
  assert.equal(leesOpdracht('airfryer maximaal €70 excl. verzending').inclusiefVerzending, false);
  assert.equal(leesOpdracht('airfryer').maxTotaal, null);
});

test('opdracht: korting, Lego-nummer, gram, testers en sets', () => {
  const lego = leesOpdracht('Lego 42115 minstens 25% onder gangbare prijs');
  assert.equal(lego.minKorting, 25);
  assert.equal(lego.merk, 'Lego');
  assert.equal(lego.zoekterm, 'Lego 42115');
  assert.equal(lego.categorie, 'speelgoed');
  assert.equal(leesOpdracht('koffiebonen 1 kg 20% korting').inhoud.waarde, 1000);
  assert.equal(leesOpdracht('koffiebonen 500 gram').inhoud.eenheid, 'g');
  assert.equal(leesOpdracht('dagcrème 0,05 l').inhoud.waarde, 50);
  assert.equal(leesOpdracht('parfum -30%').minKorting, 30);
  assert.equal(leesOpdracht('parfum 15 procent goedkoper').minKorting, 15);
  assert.deepEqual(leesOpdracht('Dior Sauvage tester').uitsluiten, ['set']);
  assert.deepEqual(leesOpdracht('Rituals giftset').uitsluiten, ['tester']);
  assert.equal(leesOpdracht('Chanel eau de parfum 50ml').variant, 'edp');
  assert.ok(!geldigeCriteria(leesOpdracht('')));
});

test('opdracht: vluchten met steden, codes en maanden', () => {
  const v = leesOpdracht('vlucht Amsterdam–Lissabon in mei, max €120', { nu: NU });
  assert.equal(v.soort, 'vlucht');
  assert.deepEqual(v.vlucht, { van: 'AMS', naar: 'LIS', maand: '2027-05' });
  assert.equal(v.maxTotaal, 120);
  assert.equal(leesOpdracht('vliegen van Eindhoven naar Alicante in december', { nu: NU }).vlucht.maand, '2026-12');
  assert.equal(leesOpdracht('vlucht Amsterdam naar Barcelona in november', { nu: NU }).vlucht.maand, '2026-11', 'deze maand telt mee');
  assert.equal(leesOpdracht('ticket AMS-NYC maart 2028', { nu: NU }).vlucht.maand, '2028-03');
  assert.deepEqual(leesOpdracht('AMS-BCN').vlucht, { van: 'AMS', naar: 'BCN', maand: null });
  assert.equal(leesOpdracht('vlucht Rotterdam - Mallorca volgende maand', { nu: NU }).vlucht.maand, '2026-12');
  assert.ok(geldigeCriteria(v));
});

test('opdracht: pastBij let op inhoud, variant, testers en route', () => {
  const c = leesOpdracht('Maison Bloesem 50 ml');
  assert.ok(pastBij(c, deal()));
  assert.ok(!pastBij(c, deal({ titel: 'Maison Eau de Parfum Bloesem 100 ml' })), '100 ml is een ander product');
  assert.ok(!pastBij(c, deal({ titel: 'Maison Bloesem 50 ml Tester' })));
  assert.ok(!pastBij(c, deal({ titel: 'Maison Bloesem 50 ml giftset' })));
  assert.ok(!pastBij(leesOpdracht('Bloesem EDT'), deal()), 'EDP is geen EDT');
  const v = leesOpdracht('vlucht AMS-LIS');
  assert.ok(pastBij(v, { soort: 'vlucht', route: 'AMS-LIS', maand: '2027-01' }));
  assert.ok(!pastBij(v, deal()));
  assert.deepEqual(inhoud('3 x 50 ml'), { waarde: 150, eenheid: 'ml' });
});

// ── rapporten ──
test('rapport: trend uit dagprijzen', () => {
  assert.equal(trend([1, 2]).richting, 'onbekend');
  const dalend = Array.from({ length: 60 }, (_, i) => 100 - i * 0.5);
  const t = trend(dalend);
  assert.equal(t.richting, 'dalend');
  assert.ok(t.wekenDalend >= 3);
  assert.equal(trend(Array(60).fill(50)).richting, 'stabiel');
  assert.equal(trend(Array.from({ length: 60 }, (_, i) => 50 + i)).richting, 'stijgend');
});

test('rapport: oordelen nu kopen, wachten, nep, te weinig data, niets gevonden', () => {
  const c = leesOpdracht('Maison Bloesem 50 ml onder €75');
  const spark = Array(60).fill(100);
  const kopen = maakRapport(c, [deal({ spark, winkels: [{ winkel: 'A', totaal: 70 }, { winkel: 'B', totaal: 72, verzendkosten: 0 }], winkel: 'A', onderLaagste30: true })], { nu: NU });
  assert.equal(kopen.oordeel.tekst, 'Nu kopen');
  assert.equal(kopen.gehaald, true);
  assert.equal(kopen.alternatieven[0].winkel, 'B');
  assert.equal(kopen.bewijs.dagen, 60);
  assert.equal(maakRapport(c, [deal({ spark, nep: true, winkel: 'Geurwinkel', nepRedenen: ['x'] })]).oordeel.tekst, 'Nep-korting gezien bij Geurwinkel');
  assert.equal(maakRapport(c, [deal({ dagen: 3, gangbaar: null })]).oordeel.tekst, 'Nog te weinig data');
  assert.equal(maakRapport(c, []).oordeel.tekst, 'Nog niets gevonden');
  const daalt = Array.from({ length: 60 }, (_, i) => 120 - i * 0.6);
  const wacht = maakRapport(c, [deal({ totaal: 85, echteKorting: 0.05, onderLaagste30: false, spark: daalt })]);
  assert.equal(wacht.oordeel.tekst, 'Wachten');
  assert.match(wacht.oordeel.reden, /daalt al \d+ weken/);
  const teDuur = maakRapport(c, [deal({ totaal: 85, echteKorting: 0.05, onderLaagste30: false, spark })]);
  assert.match(teDuur.oordeel.reden, /je doel is € 75,00/);
  assert.equal(drempelGehaald({ maxTotaal: null, minKorting: 40 }, deal()), false);
});

test('rapport: verschillen tussen rapporten en wanneer melden', () => {
  const c = leesOpdracht('Maison Bloesem 50 ml onder €75');
  const spark = Array(60).fill(100);
  const oud = maakRapport(c, [deal({ totaal: 80, echteKorting: 0.2, spark })]);
  const nieuw = maakRapport(c, [deal({ totaal: 70, spark, onderLaagste30: true })]);
  const v = verschil(oud, nieuw);
  assert.ok(v.some((r) => /gedaald van € 80,00 naar € 70,00/.test(r)));
  assert.ok(v.some((r) => /Nieuw oordeel: Nu kopen/.test(r)));
  assert.ok(meldenswaard(oud, nieuw));
  assert.ok(!meldenswaard(nieuw, nieuw));
  assert.deepEqual(verschil(null, maakRapport(c, [])), []);
});
