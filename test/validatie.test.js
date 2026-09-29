// Invoercontrole van de rekenhulpen (R7)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leesGetal, valideerVeld, valideer } from '../src/calc/validatie.js';

test('getallen in Nederlandse schrijfwijze', () => {
  assert.equal(leesGetal('25.000'), 25000);
  assert.equal(leesGetal('25000,50'), 25000.5);
  assert.equal(leesGetal('€ 1 200'), 1200);
  assert.equal(leesGetal('-500'), -500);
  assert.equal(leesGetal('1e12'), 1e12);
  assert.equal(leesGetal(''), null);
  assert.equal(leesGetal('   '), null);
  assert.equal(leesGetal(undefined), null);
  assert.ok(Number.isNaN(leesGetal('abc')));
  assert.ok(Number.isNaN(leesGetal('12abc')));
  assert.ok(Number.isNaN(leesGetal('Infinity')));
  assert.ok(Number.isNaN(leesGetal('NaN')));
});

test('R7: normale invoer is goed', () => {
  assert.deepEqual(valideer([['inkomen', '25.000'], ['vermogen', ''], ['leeftijd', '67'], ['kaleHuur', '700'], ['aantalKinderen', '3'], ['uren', '120'], ['uurprijs', '10,50']]), []);
  assert.equal(valideerVeld('inkomen', '0'), null);
  assert.equal(valideerVeld('inkomen', '10000000'), null);
  assert.equal(valideerVeld('winstTotNu', '-5000'), null); // verlies kan
  assert.equal(valideerVeld('onbekendVeld', 'abc'), null);
});

test('R7: negatief, absurd of geen getal geeft een melding in gewone taal', () => {
  assert.match(valideerVeld('inkomen', '-100'), /kan niet negatief zijn/);
  assert.match(valideerVeld('inkomen', '1e12'), /te hoog.*10\.000\.000.*nullen/);
  assert.match(valideerVeld('inkomen', '1.000.000.000.000'), /te hoog/);
  assert.match(valideerVeld('inkomen', 'veel'), /geen getal/);
  assert.match(valideerVeld('leeftijd', '200'), /De leeftijd is te hoog.*120/);
  assert.match(valideerVeld('leeftijd', '30,5'), /heel getal/);
  assert.match(valideerVeld('kaleHuur', '25000'), /huur.*te hoog.*10\.000/);
  assert.match(valideerVeld('aantalKinderen', '21'), /te hoog/);
  assert.match(valideerVeld('personen', '0'), /minimaal 1/);
  assert.match(valideerVeld('uren', '999'), /uren.*te hoog/);
  assert.match(valideerVeld('uurprijs', '-1'), /negatief/);
  assert.match(valideerVeld('vermogen', '1e12'), /te hoog/);
});

test('valideer geeft veld en positie terug', () => {
  const f = valideer([['inkomen', '1e12'], ['leeftijd', '40'], ['leeftijd', '200']]);
  assert.deepEqual(f.map((x) => [x.veld, x.index]), [['inkomen', 0], ['leeftijd', 2]]);
});
