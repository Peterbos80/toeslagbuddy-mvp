import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  zorgtoeslag,
  huurtoeslag,
  kindgebondenBudget,
  kinderopvangtoeslag,
  kotPercentage,
  kinderbijslag,
  allesCheck,
} from '../src/calc/toeslagen.js';
import { ZORGTOESLAG } from '../src/calc/params.js';

test('zorgtoeslag: maximum 2026 komt overeen met Dienst Toeslagen (€ 129 / € 246 p/m)', () => {
  const alleen = zorgtoeslag({ inkomen: 20000 });
  assert.equal(Math.round(alleen.perJaar), 1550);
  assert.equal(alleen.perMaand, 129);
  const samen = zorgtoeslag({ inkomen: 20000, partner: true });
  assert.equal(Math.round(samen.perJaar), 2963);
  assert.equal(samen.perMaand, 246);
});

test('zorgtoeslag: gepubliceerde inkomensgrenzen (€ 40.857 / € 51.142)', () => {
  assert.equal(zorgtoeslag({ inkomen: ZORGTOESLAG.maxInkomenAlleen - 20 }).recht, true);
  assert.equal(zorgtoeslag({ inkomen: ZORGTOESLAG.maxInkomenAlleen + 20 }).recht, false);
  assert.equal(zorgtoeslag({ inkomen: ZORGTOESLAG.maxInkomenPartner - 20, partner: true }).recht, true);
  assert.equal(zorgtoeslag({ inkomen: ZORGTOESLAG.maxInkomenPartner + 20, partner: true }).recht, false);
});

test('zorgtoeslag: vermogen en leeftijd', () => {
  assert.equal(zorgtoeslag({ inkomen: 10000, vermogen: 150000 }).recht, false);
  assert.equal(zorgtoeslag({ inkomen: 10000, vermogen: 150000, partner: true }).recht, true);
  assert.equal(zorgtoeslag({ inkomen: 10000, leeftijd: 17 }).recht, false);
});

test('huurtoeslag: rekenvoorbeelden 2026', () => {
  // € 29.000 inkomen, € 710 huur, alleenstaand → € 307 p/m
  assert.equal(huurtoeslag({ kaleHuur: 710, inkomen: 29000, personen: 1 }).perMaand, 307);
  // € 28.000 inkomen, € 700 huur, alleenstaand → € 323 p/m
  assert.equal(huurtoeslag({ kaleHuur: 700, inkomen: 28000, personen: 1 }).perMaand, 323);
});

test('huurtoeslag: laag inkomen krijgt maximum voor de huur', () => {
  const r = huurtoeslag({ kaleHuur: 600, inkomen: 15000, personen: 1 });
  // (498,20 - 202,52) + 0,65 × (600 - 498,20)
  assert.equal(r.maximaalPerMaand, 361.85);
  assert.equal(r.perMaand, 361);
});

test('huurtoeslag: huur boven maximale huurgrens telt tot de grens (nieuw in 2026)', () => {
  const r = huurtoeslag({ kaleHuur: 1200, inkomen: 15000, personen: 1 });
  assert.equal(r.recht, true);
  assert.equal(r.rekenhuur, 932.93);
  assert.equal(r.huurBovenGrens, true);
});

test('huurtoeslag: 40% boven aftoppingsgrens alleen bij AOW', () => {
  const zonder = huurtoeslag({ kaleHuur: 900, inkomen: 15000, personen: 2 });
  const met = huurtoeslag({ kaleHuur: 900, inkomen: 15000, personen: 2, aow: true });
  assert.ok(Math.abs(met.maximaalPerMaand - zonder.maximaalPerMaand - 0.4 * (900 - 713.02)) < 0.02);
});

test('huurtoeslag: jongeren tot 21 tot de kwaliteitskortingsgrens', () => {
  const r = huurtoeslag({ kaleHuur: 700, inkomen: 12000, personen: 1, leeftijd: 19 });
  assert.equal(r.rekenhuur, 498.2);
  assert.equal(huurtoeslag({ kaleHuur: 700, inkomen: 12000, leeftijd: 17 }).recht, false);
});

test('huurtoeslag: vermogensgrens per volwassene en hoog inkomen', () => {
  assert.equal(huurtoeslag({ kaleHuur: 700, inkomen: 15000, vermogen: 40000 }).recht, false);
  assert.equal(huurtoeslag({ kaleHuur: 700, inkomen: 15000, vermogen: 40000, personen: 2, volwassenen: 2 }).recht, true);
  assert.equal(huurtoeslag({ kaleHuur: 700, inkomen: 60000, personen: 1 }).recht, false);
});

test('kindgebonden budget: bedragen 2026', () => {
  const alleen = kindgebondenBudget({ inkomen: 20000, kinderen: [5] });
  assert.equal(alleen.perJaar, 2580 + 3320);
  const gezin = kindgebondenBudget({ inkomen: 30000, partner: true, kinderen: [3, 13, 16] });
  assert.equal(gezin.perJaar, 2580 + 3283 + 3516);
  // Afbouw 7,6% boven drempel
  const hoger = kindgebondenBudget({ inkomen: 49141, partner: true, kinderen: [3] });
  assert.equal(hoger.perJaar, 2580 - 760);
  assert.equal(kindgebondenBudget({ inkomen: 20000, kinderen: [18] }).recht, false);
});

test('kinderopvangtoeslag: percentages en maximale uurprijs', () => {
  assert.equal(kotPercentage(40000), 0.96);
  assert.equal(kotPercentage(100000), 0.721);
  assert.equal(kotPercentage(100000, false), 0.905);
  assert.equal(kotPercentage(500000), 0.365);
  const r = kinderopvangtoeslag({
    inkomen: 50000,
    kinderen: [
      { soort: 'dagopvang', uren: 100, uurprijs: 12.5 },
      { soort: 'bso', uren: 40, uurprijs: 9 },
    ],
  });
  // 0,96 × 11,23 × 100 + 0,96 × 9 × 40
  assert.equal(r.perMaand, 1423.68);
  assert.equal(r.eigenBijdragePerMaand, Math.round((1250 + 360 - 1423.68) * 100) / 100);
});

test('kinderbijslag: bedragen per kwartaal vanaf juli 2026', () => {
  const r = kinderbijslag({ kinderen: [2, 8, 15] });
  assert.equal(r.perKwartaal, 298.4 + 362.35 + 426.29);
});

test('alles-check: telt alle toeslagen op', () => {
  const r = allesCheck({ inkomen: 22000, huurt: true, kaleHuur: 650, kinderen: [4], vermogen: 1000 });
  const som = ['zorgtoeslag', 'huurtoeslag', 'kindgebondenBudget', 'kinderbijslag'].reduce((s, k) => s + r[k].perJaar, 0);
  assert.equal(r.totaalPerJaar, Math.round(som));
  assert.ok(r.tips.includes('kwijtschelding'));
  assert.equal(r.kinderopvangtoeslag, null);
});
