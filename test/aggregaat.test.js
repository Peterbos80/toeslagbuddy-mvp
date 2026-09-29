import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maakAggregaat, lokaleSamenvatting, band, telling, afgerond, vergelijkbaar, toonTelling, REKENVERSIE, SOORTEN } from '../src/calc/aggregaat.js';
import { checkLijst, leesCsv, VOORBEELD_CSV } from '../src/calc/pro.js';

// Nep-uitkomst met n cliënten; de eerste k hebben een signaal 'gemist'
function uitkomst(n, k = 0, gemist = 0, risico = 0) {
  const clienten = Array.from({ length: n }, (_, i) => ({ clientnr: `C-${i}`, signalen: i < k ? [{ soort: 'gemist' }, { soort: 'gemist' }, { soort: 'gemeente' }] : [] }));
  return { clienten, totaal: { aantal: n, metActie: k, gemistPerJaar: gemist, risicoPerJaar: risico } };
}

test('aggregaat: bandbreedtes voor het aantal cliënten', () => {
  assert.deepEqual([1, 9, 10, 49, 50, 199, 200, 10000].map(band), ['1-9', '1-9', '10-49', '10-49', '50-199', '50-199', '200+', '200+']);
});

test('aggregaat: aantallen onder de 5 worden -1', () => {
  assert.deepEqual([0, 1, 4, 5, 6, 120].map(telling), [-1, -1, -1, 5, 6, 120]);
  assert.equal(toonTelling(-1), '<5');
  assert.equal(toonTelling(12), '12');
});

test('aggregaat: bedragen afgerond op € 500 met een bovengrens', () => {
  assert.deepEqual([0, 249, 250, 12345, 12750].map(afgerond), [0, 0, 500, 12500, 13000]);
  assert.equal(afgerond(5e7), 9999500);
});

test('aggregaat: kleine lijst heeft geen bedragen en geen exacte kleine aantallen', () => {
  const a = maakAggregaat(uitkomst(6, 3, 4321, 999), REKENVERSIE, '00000000-0000-4000-8000-000000000000');
  assert.deepEqual(a, {
    id: '00000000-0000-4000-8000-000000000000',
    rekenversie: REKENVERSIE,
    clienten: '1-9',
    met_actie: -1,
    gemist_jaar: null,
    risico_jaar: null,
    signalen: { gemist: -1, 'te-laag': -1, terugbetaling: -1, vermogen: -1, leeftijd: -1, gemeente: -1, info: -1 },
  });
});

test('aggregaat: vanaf 10 cliënten afgeronde bedragen; per soort het aantal cliënten', () => {
  const a = maakAggregaat(uitkomst(37, 8, 23480, 6010));
  assert.equal(a.clienten, '10-49');
  assert.equal(a.met_actie, 8);
  assert.equal(a.gemist_jaar, 23500);
  assert.equal(a.risico_jaar, 6000);
  // Twee 'gemist'-signalen bij dezelfde cliënt tellen één keer
  assert.equal(a.signalen.gemist, 8);
  assert.equal(a.signalen.gemeente, 8);
  assert.match(a.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepEqual(Object.keys(a.signalen), SOORTEN);
  // Geen cliëntnummers of andere tekst in het aggregaat
  assert.ok(!JSON.stringify(a).includes('C-'));
});

test('aggregaat: weigert 0 of meer dan 10.000 cliënten', () => {
  assert.throws(() => maakAggregaat(uitkomst(0)), RangeError);
  assert.throws(() => maakAggregaat({ clienten: [], totaal: { aantal: 10001, metActie: 0, gemistPerJaar: 0, risicoPerJaar: 0 } }), RangeError);
});

test('aggregaat: rekenversie en vergelijkbaarheid (R29)', () => {
  assert.match(REKENVERSIE, /^\d{4}\.\d{8}$/);
  assert.equal(vergelijkbaar({ rekenversie: 'a' }, { rekenversie: 'a' }), true);
  assert.equal(vergelijkbaar({ rekenversie: 'a' }, { rekenversie: 'b' }), false);
  assert.equal(vergelijkbaar(null, { rekenversie: 'a' }), false);
});

test('aggregaat: werkt op de echte voorbeeldlijst; lokale samenvatting is exact', () => {
  const res = checkLijst(leesCsv(VOORBEELD_CSV));
  const a = maakAggregaat(res);
  assert.equal(a.clienten, '1-9');
  assert.equal(a.gemist_jaar, null);
  const l = lokaleSamenvatting(res, REKENVERSIE, new Date('2026-10-01T10:00:00Z'));
  assert.equal(l.aantal, 6);
  assert.equal(l.gemist, res.totaal.gemistPerJaar);
  assert.equal(l.datum, '2026-10-01T10:00:00.000Z');
  assert.ok(Object.values(l.signalen).some((x) => x > 0 && x < 5), 'lokaal wel exacte kleine aantallen');
});
