// Verticale uitlegvideo's (9:16, Reels/TikTok): formaat, stijl, ondertitels
// en de vingerafdruk (de liggende video's mogen niet onnodig opnieuw).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VIDEOS, STIJL, STIJL_FILM, STIJL_VERTICAAL, ondertitels } from '../scripts/video/uitleg-scenes.js';
import { FORMATEN, formaatUit, pixels, plan, vingerafdruk, filmFilter } from '../scripts/video/uitleg.js';

test('formaten: liggend 1280 × 720, verticaal 1080 × 1920 (9:16)', () => {
  assert.deepEqual(pixels(FORMATEN.liggend), { breedte: 1280, hoogte: 720 });
  assert.deepEqual(pixels(FORMATEN.verticaal), { breedte: 1080, hoogte: 1920 });
  assert.equal(formaatUit(['node', 'uitleg.js']), FORMATEN.liggend);
  assert.equal(formaatUit(['node', 'uitleg.js', '--verticaal', '--stem', '/tmp/stem']), FORMATEN.verticaal);
  assert.equal(FORMATEN.verticaal.achtervoegsel, '-verticaal');
  assert.notEqual(FORMATEN.verticaal.manifest, FORMATEN.liggend.manifest);
  // De band met de clip past in beeld, onder het merk
  const b = FORMATEN.verticaal.band;
  assert.ok(b.y >= 120 && b.y + b.hoogte < 1920 / 2);
});

test('stijl: de verticale regels gelden alleen in de verticale opmaak', () => {
  assert.doesNotMatch(STIJL + STIJL_FILM, /verticaal/);
  const regels = STIJL_VERTICAAL.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?=\{)/g).map((s) => s.trim());
  assert.ok(regels.length > 20);
  for (const r of regels) for (const sel of r.split(',')) assert.match(sel.trim(), /^(html)?\.verticaal\b/, sel);
});

test('vingerafdruk: liggend precies zoals vroeger, verticaal apart', () => {
  for (const v of VIDEOS) {
    const liggend = plan(v, null);
    // Zelfde berekening als vóór de verticale versie (anders rendert CI alles opnieuw)
    const oud = createHash('sha256').update(JSON.stringify([STIJL, STIJL_FILM, v, liggend.map((s) => [s.duur, !!s.wav, s.clip ? vingerafdrukClip(s.clip) : null, s.bron?.label || ''])])).digest('hex').slice(0, 12);
    assert.equal(vingerafdruk(v, liggend), oud, v.id);
    const verticaal = plan(v, null, FORMATEN.verticaal);
    const h = vingerafdruk(v, verticaal, FORMATEN.verticaal);
    assert.notEqual(h, oud);
    assert.equal(h, vingerafdruk(v, plan(v, null, FORMATEN.verticaal), FORMATEN.verticaal), 'stabiel');
    // Zelfde duur per scène: de voice-over past op beide
    assert.deepEqual(verticaal.map((s) => s.duur), liggend.map((s) => s.duur));
  }
});

function vingerafdrukClip(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12);
}

test('filmfilter: liggend ongewijzigd, verticaal met scherpe band en vervaagde achtergrond', () => {
  assert.equal(filmFilter(FORMATEN.liggend, 6.5), "[0:v]scale=1408:792:force_original_aspect_ratio=increase,crop=1408:792,fps=25,trim=duration=6.5,setpts=PTS-STARTPTS,scale=w='1280+128*t/6.5':h=-2:eval=frame,crop=1280:720,setsar=1[bg];[1:v]format=rgba[ov];[bg][ov]overlay=0:0:shortest=1,format=yuv420p[v]");
  const f = filmFilter(FORMATEN.verticaal, 6.5);
  assert.match(f, /crop=1080:608/);
  assert.match(f, /overlay=0:150\[bg\]/);
  assert.match(f, /boxblur/);
  assert.match(f, /scale=1080:1920/);
  assert.match(f, /trim=duration=6\.5/);
  assert.match(f, /\[v\]$/);
});

test('ondertitels: standaard ongewijzigd; verticaal korter en de tekst blijft heel', () => {
  for (const v of VIDEOS) {
    for (const s of v.scenes) {
      const tekst = s.ondertitel || s.tekst;
      assert.deepEqual(ondertitels(tekst, 8), ondertitels(tekst, 8, { max: 90 }));
      const kort = ondertitels(tekst, 8, { max: FORMATEN.verticaal.ondertitelMax });
      for (const r of kort) {
        assert.ok(r.tekst.length <= FORMATEN.verticaal.ondertitelMax, `${v.id}: te lang: ${r.tekst}`);
        assert.doesNotMatch(r.tekst, /^(nl\b|\/)/, `${v.id}: midden in een webadres: ${r.tekst}`);
      }
      assert.equal(kort.map((r) => r.tekst).join(' '), tekst.replace(/\s+/g, ' ').trim());
      assert.ok(Math.abs(kort.at(-1).tot - 8) < 1e-9);
    }
  }
  const p = plan(VIDEOS[0], null, FORMATEN.verticaal);
  assert.ok(p.every((s) => s.ondertitels.every((o) => o.tekst.length <= 60)));
});
