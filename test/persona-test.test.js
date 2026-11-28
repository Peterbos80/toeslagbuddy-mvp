// Leesbaarheid en rapport van de persona-test (de browserdelen draaien apart).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lettergrepen, fleschDouma, niveau, rapport, PERSONAS } from '../scripts/persona-test.js';

test('lettergrepen en Flesch-Douma: korte zinnen en woorden lezen makkelijker', () => {
  assert.equal(lettergrepen('toeslag'), 2);
  assert.equal(lettergrepen('kinderopvangtoeslag'), 6);
  assert.equal(lettergrepen('ijs'), 1);
  const makkelijk = 'Je krijgt geld. Dat is fijn. Je vult je loon in. Dan zie je het. Het kost een minuut. Je hoeft niet in te loggen. Wij slaan niets op. Zo werkt het. Doe het nu. Het is gratis.';
  const moeilijk = 'De inkomensafhankelijke kinderopvangtoeslagberekening veronderstelt een gedetailleerde specificatie van toetsingsinkomensgerelateerde parameters, waarbij vermogensbestanddelen eveneens nadrukkelijk worden meegewogen in de uiteindelijke vaststelling. Bovendien worden overgangsrechtelijke bepalingen consequent toegepast op alle aanvragers.';
  assert.ok(fleschDouma(makkelijk) > 70);
  assert.ok(fleschDouma(moeilijk) < 30);
  assert.equal(fleschDouma('Te kort.'), null);
  assert.equal(niveau(65), 'B1');
  assert.equal(niveau(null), 'n.v.t.');
});

test('rapport: tabel met uitkomst per taak en drempels per pagina', () => {
  const md = rapport([{ persona: 'Henk (71)', taken: [{ doel: 'Zorgtoeslag', gelukt: false, mislukt: 'geen uitkomst', handelingen: 3, seconden: 4, fouten: [], paginas: { '/': { viewport: 320, breedte: 400, kleinsteTekst: 12, leesbaarheid: 45, kleineDoelen: ['a "x" 30×20'], kb: 1200 } } }] }], '2026-11-28');
  assert.match(md, /\| Henk \(71\) \| Zorgtoeslag \| \*\*nee\*\* \(geen uitkomst\) \| 3 \| 4 s \|/);
  assert.match(md, /horizontaal scrollen \(400 px op 320 px\)/);
  assert.match(md, /kleinste tekst 12 px/);
  assert.match(md, /zwaar: 1200 kB/);
  assert.ok(PERSONAS.length >= 7 && PERSONAS.every((p) => p.taken.length && p.apparaat.viewport));
});
