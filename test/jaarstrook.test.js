import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jaarstrook } from '../src/calc/jaarstrook.js';

const statussen = (r) => r.maanden.map((m) => m.status[0]).join('');

test('jaarstrook: eind november nog het hele jaar met terugwerkende kracht', () => {
  const r = jaarstrook({ soort: 'zorgtoeslag', perMaand: 103, jaar: 2026, vandaag: new Date('2026-11-28T12:00:00') });
  assert.equal(statussen(r), 'tttttttttttnk'.slice(0, 10) + 'nk');
  assert.equal(r.terugMaanden, 10);
  assert.equal(r.terugBedrag, 1030);
  assert.equal(r.resterend, 2);
  assert.equal(r.deadline, '2027-09-01');
});

test('jaarstrook: kinderopvangtoeslag maar 3 maanden terug', () => {
  const r = jaarstrook({ soort: 'kinderopvangtoeslag', perMaand: 500, jaar: 2026, vandaag: new Date('2026-11-28T12:00:00') });
  assert.equal(statussen(r), 'vvvvvvvtttnk');
  assert.equal(r.terugMaanden, 3);
  assert.equal(r.verlorenMaanden, 7);
  assert.equal(r.deadline, null);
});

test('jaarstrook: met voorschot geen terugwerkende kracht, wel verschil per jaar', () => {
  const r = jaarstrook({ soort: 'huurtoeslag', perMaand: 200, jaar: 2026, voorschot: 250, vandaag: new Date('2026-03-10T12:00:00') });
  assert.equal(statussen(r), 'vvnkkkkkkkkk');
  assert.equal(r.terugMaanden, 0);
  assert.equal(r.verschilJaar, -600);
});

test('jaarstrook: na 1 september van het jaar erna is het verloren', () => {
  const r = jaarstrook({ soort: 'zorgtoeslag', perMaand: 100, jaar: 2026, vandaag: new Date('2027-09-02T12:00:00') });
  assert.equal(r.terugMaanden, 0);
  assert.equal(r.verlorenMaanden, 12);
});
