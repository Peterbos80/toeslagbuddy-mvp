import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leesCsv, checkClient, checkLijst, actielijstCsv, VOORBEELD_CSV, getal } from '../src/calc/pro.js';
import { zzpCheck, herinneringIcs } from '../src/calc/zzp.js';

test('pro: CSV met puntkomma, aliassen en Nederlandse getallen', () => {
  const rijen = leesCsv('Cliëntnummer;Toetsingsinkomen;Huur\nA1;"18.500";690,50');
  assert.equal(rijen[0].clientnr, 'A1');
  assert.equal(getal(rijen[0].inkomen), 18500);
  assert.equal(getal(rijen[0].kale_huur), 690.5);
});

test('pro: gemiste toeslag wordt gesignaleerd', () => {
  const r = checkClient({ clientnr: 'X', leeftijd: '19', inkomen: '9000', huurt: 'ja', kale_huur: '560', voorschot_zorgtoeslag: '0' });
  const soorten = r.signalen.filter((s) => s.soort === 'gemist').map((s) => s.toeslag);
  assert.deepEqual(soorten.sort(), ['Huurtoeslag', 'Zorgtoeslag']);
  assert.ok(r.gemistPerJaar > 1500 + 3000);
});

test('pro: voorschot zonder recht = terugbetalingsrisico', () => {
  // vermogen boven de huurtoeslaggrens, maar wel voorschot huurtoeslag
  const r = checkClient({ clientnr: 'Y', inkomen: '21000', vermogen: '40000', huurt: 'ja', kale_huur: '610', voorschot_huurtoeslag: '360', voorschot_zorgtoeslag: '129' });
  const t = r.signalen.find((s) => s.soort === 'terugbetaling' && s.toeslag === 'Huurtoeslag');
  assert.ok(t);
  assert.equal(t.bedragJaar, 360 * 12);
  assert.equal(r.risicoPerJaar, 360 * 12);
});

test('pro: leeftijdsovergangen en gemeentelijke regelingen', () => {
  const r = checkClient({ clientnr: 'Z', inkomen: '15000', kinderen: '17', langdurig_laag_inkomen: 'ja', voorschot_zorgtoeslag: '129', voorschot_kgb: '490' });
  assert.ok(r.signalen.some((s) => s.tekst.startsWith('Kind wordt 18')));
  assert.ok(r.signalen.some((s) => s.tekst.includes('individuele inkomenstoeslag')));
});

test('pro: voorbeeldbestand en export', () => {
  const res = checkLijst(leesCsv(VOORBEELD_CSV));
  assert.equal(res.totaal.aantal, 6);
  assert.ok(res.totaal.gemistPerJaar > 0);
  assert.ok(res.totaal.risicoPerJaar > 0);
  const csv = actielijstCsv(res);
  assert.ok(csv.startsWith('﻿clientnr;prioriteit'));
});

test('zzp: winst tot nu toe wordt doorgetrokken naar een jaar', () => {
  const r = zzpCheck({ winstTotNu: 18000, maand: 6, urencriterium: true, ander: 0, opgegevenInkomen: 20000 });
  assert.equal(r.jaarwinst, 36000);
  // (36.000 - 1.200) × 0,873
  assert.equal(r.belastbareWinst, Math.round(34800 * 0.873));
  assert.equal(r.status, 'terugbetalen');
  const zorg = r.regelingen.find((x) => x.regeling === 'zorgtoeslag');
  assert.ok(zorg.verschilJaar < 0);
  assert.ok(r.adviesInkomen >= r.verwachtInkomen && r.adviesInkomen % 500 === 0);
});

test('zzp: lager inkomen dan opgegeven = bijkrijgen', () => {
  const r = zzpCheck({ winstTotNu: 6000, maand: 6, urencriterium: true, ander: 0, opgegevenInkomen: 35000, huurt: true, kaleHuur: 700 });
  assert.equal(r.status, 'bijkrijgen');
});

test('zzp: agenda-herinnering is geldig iCalendar', () => {
  const ics = herinneringIcs('https://www.toeslagbuddy.nl/zzp-toeslagen/', new Date('2026-09-28T10:00:00Z'));
  assert.match(ics, /BEGIN:VCALENDAR[\s\S]*RRULE:FREQ=MONTHLY[\s\S]*END:VCALENDAR/);
  assert.match(ics, /DTSTART:20261001T080000Z/);
});
