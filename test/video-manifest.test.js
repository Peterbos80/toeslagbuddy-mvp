// Releasecontrole voor de echte AI-video's op de site: elk bestand in het
// manifest bestaat, heeft een AI-poster en doorstaat de keuring (als ffmpeg er is).
// Onvolledige persona's zijn toegestaan: de speler valt dan terug op de tekening.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SEGMENTEN } from '../src/calc/videoplan.js';
import { PERSONAS } from '../src/calc/uitleg.js';
import { keuring } from '../scripts/video-lib.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'public/video/manifest.json'), 'utf8'));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const heeftFfmpeg = spawnSync(FFMPEG, ['-version']).status === 0;

test('video-manifest: alleen bekende persona\'s en fragmenten, bestanden bestaan', () => {
  for (const [persona, clips] of Object.entries(manifest)) {
    assert.ok(PERSONAS[persona], `onbekende persona ${persona}`);
    for (const [segment, c] of Object.entries(clips)) {
      assert.ok(SEGMENTEN[segment], `onbekend fragment ${persona}/${segment}`);
      assert.match(c.src, new RegExp(`^/video/${persona}/${segment}\\.mp4$`));
      const pad = join(ROOT, 'public', c.src);
      assert.ok(existsSync(pad) && statSync(pad).size > 10_000, `${c.src} ontbreekt of is te klein`);
      assert.ok(c.hash && c.tekst, `${persona}/${segment} mist hash of tekst`);
      if (c.poster) assert.ok(existsSync(join(ROOT, 'public', c.poster)), `${c.poster} ontbreekt`);
    }
  }
});

test('video-manifest: elke clip doorstaat de keuring (geluid, beweging, formaat)', { skip: !heeftFfmpeg && 'ffmpeg niet gevonden' }, () => {
  for (const clips of Object.values(manifest)) {
    for (const c of Object.values(clips)) {
      const k = keuring(join(ROOT, 'public', c.src), FFMPEG);
      assert.ok(k.ok, `${c.src}: ${k.redenen.join(', ')}`);
    }
  }
});
