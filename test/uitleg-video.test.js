// Uitlegvideo's: ondertitels, duur per scène en het manifest dat de site leest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { VIDEOS, ondertitels, schatDuur } from '../scripts/video/uitleg-scenes.js';
import { plan, vtt } from '../scripts/video/uitleg.js';

test('ondertitels: hele zinnen, nooit midden in een webadres, en precies de duur', () => {
  const o = ondertitels('Kijk op toeslagbuddy.nl/deals. Hier vergelijken we prijzen van meerdere winkels over negentig dagen.', 6);
  assert.deepEqual(o.map((x) => x.tekst), ['Kijk op toeslagbuddy.nl/deals.', 'Hier vergelijken we prijzen van meerdere winkels over negentig dagen.']);
  assert.equal(o[0].van, 0);
  assert.ok(Math.abs(o.at(-1).tot - 6) < 1e-9);
  for (const v of VIDEOS) {
    for (const s of v.scenes) {
      for (const r of ondertitels(s.ondertitel || s.tekst, 8)) {
        assert.ok(r.tekst.length <= 90, `${v.id}: te lang: ${r.tekst}`);
        assert.doesNotMatch(r.tekst, /^(nl|[a-z]{1,3})\b/, `${v.id}: begint midden in een woord: ${r.tekst}`);
      }
    }
  }
});

test('scènes: elke video heeft tekst en beeld, en zonder stem een redelijke duur', () => {
  assert.deepEqual(VIDEOS.map((v) => v.id), ['familie', 'besparen', 'toeslagen']);
  for (const v of VIDEOS) {
    const p = plan(v, null);
    const totaal = p.reduce((s, x) => s + x.duur, 0);
    assert.ok(totaal > 15 && totaal < 90, `${v.id}: ${totaal} s`);
    for (const s of p) {
      assert.ok(s.beeld.length > 50);
      assert.equal(s.wav, null);
    }
    // Het slotbeeld noemt het adres van het onderdeel
    assert.match(v.scenes.at(-1).beeld, /toeslagbuddy\.nl/);
  }
  assert.equal(schatDuur('kort'), 3.5);
});

test('manifest: als er video’s zijn, kloppen de paden en is er een transcript', () => {
  const pad = new URL('../public/video/uitleg/manifest.json', import.meta.url);
  if (!existsSync(pad)) return;
  const m = JSON.parse(readFileSync(pad, 'utf8'));
  for (const [id, v] of Object.entries(m)) {
    assert.equal(v.src, `/video/uitleg/${id}.mp4`);
    assert.ok(existsSync(new URL(`../public${v.src}`, import.meta.url)), v.src);
    assert.ok(existsSync(new URL(`../public${v.poster}`, import.meta.url)), v.poster);
    assert.ok(v.transcript.length > 40);
    assert.ok(v.duur > 10);
  }
});

test('WebVTT: tijden lopen door over de scènes heen', () => {
  const t = vtt([{ duur: 2.5, ondertitels: [{ van: 0, tot: 2, tekst: 'Een' }] }, { duur: 3, ondertitels: [{ van: 0, tot: 2.9, tekst: 'Twee' }] }]);
  assert.equal(t, 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nEen\n\n00:00:02.500 --> 00:00:05.400\nTwee\n');
});
