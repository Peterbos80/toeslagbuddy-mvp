import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kiesPersona, maakScript, voorSpraak, PERSONAS } from '../src/calc/uitleg.js';
import { allesCheck, zorgtoeslag, huurtoeslag } from '../src/calc/toeslagen.js';
import { zzpCheck } from '../src/calc/zzp.js';

test('persona: keuze op leeftijd en situatie, anders Buddy', () => {
  assert.equal(kiesPersona({}).id, 'buddy');
  assert.equal(kiesPersona({ leeftijd: 20 }).id, 'sanne');
  assert.equal(kiesPersona({ leeftijd: 30 }).id, 'dani');
  assert.equal(kiesPersona({ leeftijd: 50 }).id, 'karin');
  assert.equal(kiesPersona({ leeftijd: 70 }).id, 'henk');
  assert.equal(kiesPersona({ leeftijd: 60, aow: true }).id, 'henk');
  assert.equal(kiesPersona({ leeftijd: 35, kinderen: [4] }).id, 'ilse');
  assert.equal(kiesPersona({ leeftijd: 35, kinderen: [4], partner: true }).id, 'mo');
  assert.equal(kiesPersona({}, 'zzp').id, 'dani');
  assert.equal(kiesPersona({}, 'kinderopvangtoeslag').id, 'mo');
});

test('uitleg: complete check noemt totaal en elke toeslag', () => {
  const d = { leeftijd: 20, inkomen: 9000, huurt: true, kaleHuur: 520, kinderen: [] };
  const { persona, regels } = maakScript('alles', d, allesCheck(d));
  assert.equal(persona.id, 'sanne');
  const tekst = regels.join(' ').replace(/\s+/g, ' ');
  assert.match(tekst, /per maand krijgen/);
  assert.match(tekst, /Zorgtoeslag: ongeveer € 129 per maand/);
  assert.match(tekst, /Huurtoeslag: ongeveer € 295 per maand/);
  assert.match(tekst, /studiefinanciering/);
  assert.match(tekst, /0800 0543/);
});

test('uitleg: geen recht en zzp-terugbetaling', () => {
  const z = maakScript('zorgtoeslag', { inkomen: 60000 }, zorgtoeslag({ inkomen: 60000 }));
  assert.equal(z.persona.id, 'buddy');
  assert.match(z.regels.join(' '), /geen recht op zorgtoeslag/);
  const d = { winstTotNu: 27000, maand: 8, urencriterium: true, opgegevenInkomen: 22000, huurt: true, kaleHuur: 780 };
  const r = maakScript('zzp', d, zzpCheck(d));
  assert.equal(r.persona.id, 'dani');
  assert.match(r.regels.join(' '), /terugbetalen/);
  const h = maakScript('huurtoeslag', { leeftijd: 71, aow: true }, huurtoeslag({ kaleHuur: 800, inkomen: 20000, aow: true, personen: 1 }));
  assert.equal(h.persona.id, 'henk');
  assert.match(h.regels.join(' '), /betaal je altijd zelf/);
});

test('uitleg: bedragen worden goed voorgelezen', () => {
  assert.equal(voorSpraak('€ 1.532 per maand'), '1532 euro per maand');
  assert.equal(voorSpraak('€ 202,52'), '202 euro 52');
  assert.equal(voorSpraak('€ 129,00'), '129 euro');
});

test('persona’s zijn volledig gedefinieerd', () => {
  for (const p of Object.values(PERSONAS)) {
    assert.ok(p.naam && p.intro && p.tip && p.uiterlijk, p.id);
  }
});
