// Tests voor de open-source videopijplijn (zonder AI: een nep-"python" maakt
// testbeelden met ffmpeg). Controleert keuring, AI-label, manifest en samenvoegen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { echteAvatar, teMaken, ffmpegArgs, keuring, samenvoegen, LABEL } from '../scripts/video-lib.js';
import { hashVan } from '../scripts/maak-avatar-videos.js';
import { hoofd } from '../scripts/maak-echte-videos.js';
import { voegSamen } from '../scripts/video-samenvoegen.js';
import { SEGMENTEN } from '../src/calc/videoplan.js';

const HIER = dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const heeftFfmpeg = spawnSync(FFMPEG, ['-version']).status === 0;
const skip = !heeftFfmpeg && 'ffmpeg niet gevonden (zet FFMPEG=…)';
const NEP = join(HIER, 'fixtures/nep-python.js');
const tmp = () => mkdtempSync(join(tmpdir(), 'tb-video-'));

test('echte video: hash verandert met tekst, gezicht of stem; alleen gewijzigde clips', () => {
  const stem = { sleutel: 'nl_NL-mls-medium', spreker: 3 };
  const a = echteAvatar('abc', stem);
  const clip = { persona: 'henk', segment: 'intro', tekst: 'Hoi' };
  assert.notEqual(hashVan(clip, a), hashVan(clip, echteAvatar('abd', stem)));
  assert.notEqual(hashVan(clip, a), hashVan(clip, echteAvatar('abc', { ...stem, spreker: 4 })));
  const manifest = { henk: { intro: { hash: hashVan(clip, a) } } };
  const clips = [clip, { persona: 'henk', segment: 'ja', tekst: 'Ja' }];
  assert.deepEqual(teMaken(clips, manifest, a, hashVan).map((c) => c.segment), ['ja']);
});

test('echte video: ffmpeg maakt 9:16 met ingebrand AI-label en AI-metadata', () => {
  const args = ffmpegArgs('in.mp4', 'uit.mp4', { font: '/f.ttf' });
  const vf = args[args.indexOf('-vf') + 1];
  assert.match(vf, /scale=432:768.*crop=432:768/);
  assert.ok(vf.includes(`text='${LABEL}'`));
  assert.ok(args.includes('comment=AI-gegenereerde video (synthetische, fictieve persoon) - ToeslagBuddy'));
  assert.ok(args.includes('+faststart'));
  // Zonder lettertype: geen drawtext (en geen fout)
  assert.ok(!ffmpegArgs('a', 'b', { font: null }).join(' ').includes('drawtext'));
});

test('samenvoegen: persona-delen overschrijven alleen hun eigen clips', () => {
  const m = samenvoegen({ henk: { intro: { src: 'oud' }, ja: { src: 'blijft' } } }, [{ henk: { intro: { src: 'nieuw' } } }, { sanne: { intro: { src: 's' } } }]);
  assert.deepEqual(m, { henk: { intro: { src: 'nieuw' }, ja: { src: 'blijft' } }, sanne: { intro: { src: 's' } } });
});

test('pijplijn: gezicht, stem, render, label, keuring, manifest en samenvoegen', { skip }, async () => {
  const video = tmp();
  const uit = tmp();
  writeFileSync(join(video, 'manifest.json'), '{}');
  process.env.FFMPEG = FFMPEG;
  const r = await hoofd({ persona: 'henk', segmenten: 'intro,ja', uit, video, python: NEP, ffmpeg: FFMPEG, cache: tmp(), sadtalker: '/nergens' });
  assert.deepEqual(r, { gemaakt: 2, afgekeurd: 0 });
  const deel = JSON.parse(readFileSync(join(uit, 'manifest.henk.json'), 'utf8'));
  assert.deepEqual(Object.keys(deel.henk).sort(), ['intro', 'ja']);
  assert.equal(deel.henk.intro.src, '/video/henk/intro.mp4');
  assert.equal(deel.henk.intro.poster, '/video/gezichten/henk.jpg');
  assert.equal(deel.henk.intro.bron, 'open-source');
  assert.equal(deel.henk.intro.tekst, SEGMENTEN.intro({ intro: deel.henk.intro.tekst }));
  assert.ok(existsSync(join(uit, 'henk/intro.mp4')) && existsSync(join(uit, 'gezichten/henk.jpg')));
  // Het resultaat zelf is gekeurd: H.264 + AAC, 9:16, en bevat de AI-markering
  const probe = spawnSync(FFMPEG, ['-hide_banner', '-i', join(uit, 'henk/intro.mp4')], { encoding: 'utf8' }).stderr;
  assert.match(probe, /Video: h264.*432x768/);
  assert.match(probe, /AI-gegenereerde video/);
  // Samenvoegen zoals de workflow doet (artefact per persona)
  const art = tmp();
  mkdirSync(join(art, 'video-henk'));
  cpSync(uit, join(art, 'video-henk'), { recursive: true });
  const m = voegSamen(art, video);
  assert.equal(Object.keys(m.henk).length, 2);
  assert.ok(existsSync(join(video, 'henk/ja.mp4')) && existsSync(join(video, 'gezichten/henk.jpg')));
  // Tweede keer: niets te doen (hash gelijk)
  const opnieuw = await hoofd({ persona: 'henk', segmenten: 'intro,ja', uit: tmp(), video, python: NEP, ffmpeg: FFMPEG, cache: tmp(), sadtalker: '/nergens' });
  assert.deepEqual(opnieuw, { gemaakt: 0, afgekeurd: 0 });
});

test('keuring: bevroren beeld wordt afgekeurd en komt niet in het manifest', { skip }, async () => {
  const uit = tmp();
  const video = tmp();
  writeFileSync(join(video, 'manifest.json'), '{}');
  process.env.NEP_MODUS = 'stil';
  try {
    const r = await hoofd({ persona: 'sanne', segmenten: 'intro', uit, video, python: NEP, ffmpeg: FFMPEG, cache: tmp(), sadtalker: '/nergens' });
    assert.deepEqual(r, { gemaakt: 0, afgekeurd: 1 });
  } finally {
    delete process.env.NEP_MODUS;
  }
  assert.deepEqual(JSON.parse(readFileSync(join(uit, 'manifest.sanne.json'), 'utf8')), { sanne: {} });
  const rapport = JSON.parse(readFileSync(join(uit, 'keuring.sanne.json'), 'utf8'));
  assert.match(rapport[0].redenen.join(), /stil/);
  assert.ok(!existsSync(join(uit, 'sanne/intro.mp4')));
});

test('keuring: stil geluid en onleesbaar bestand worden afgekeurd', { skip }, () => {
  const d = tmp();
  const stil = join(d, 'stil.mp4');
  spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=432x768:r=25', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', stil]);
  const k = keuring(stil, FFMPEG);
  assert.equal(k.ok, false);
  assert.match(k.redenen.join(), /geluid/);
  writeFileSync(join(d, 'kapot.mp4'), 'geen video');
  assert.equal(keuring(join(d, 'kapot.mp4'), FFMPEG).ok, false);
});

test('stemkeuze: vrouwen- en mannenstemmen op toonhoogte, iedere persona een eigen stem', { skip: spawnSync('python3', ['--version']).status !== 0 && 'python3 ontbreekt' }, () => {
  const code = `
import json, sys
sys.path.insert(0, 'scripts/video')
from stemmen import kies
personas = json.load(open('scripts/video/personas.json'))['personas']
metingen = [{'sleutel': 'nl_NL-mls-medium', 'model': 'm', 'spreker': i, 'f0': f} for i, f in enumerate([95, 110, 120, 130, 140, 150, 160, 175, 190, 205, 220, 240, 300])]
print(json.dumps(kies(metingen, personas)))`;
  const r = spawnSync('python3', ['-c', code], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const k = JSON.parse(r.stdout);
  for (const p of ['sanne', 'ilse', 'karin', 'buddy']) assert.ok(k[p].f0 >= 170 && k[p].f0 <= 280, `${p} ${k[p].f0}`);
  for (const p of ['henk', 'mo', 'dani']) assert.ok(k[p].f0 <= 145, `${p} ${k[p].f0}`);
  assert.ok(k.henk.f0 < k.mo.f0 && k.mo.f0 < k.dani.f0, 'Henk het laagst, Dani het hoogst');
  assert.ok(k.karin.f0 < k.ilse.f0 && k.ilse.f0 < k.sanne.f0, 'Karin het laagst, Sanne het hoogst');
  assert.equal(new Set(Object.values(k).map((s) => s.spreker)).size, 7, 'iedere persona een eigen stem');
});
