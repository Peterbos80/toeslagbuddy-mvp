// Echte AI-video's zonder account: fictief gezicht (Stable Diffusion), Nederlandse
// stem (Piper) en pratend hoofd met lipsync (SadTalker). Alles open source en
// op de CPU, bedoeld voor GitHub Actions (.github/workflows/videos-echt.yml).
//
//   node scripts/maak-echte-videos.js --persona henk --sadtalker .sadtalker \
//        [--segmenten intro,ja] [--verbeteren] [--uit uit-video]
//
// Zet het resultaat in <uit>/ (zelfde mappen als public/video) plus
// <uit>/manifest.<persona>.json. Alleen clips die de keuring doorstaan komen erin.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { alleClips } from '../src/calc/videoplan.js';
import { hashVan } from './maak-avatar-videos.js';
import { echteAvatar, teMaken, ffmpegArgs, keuring, sha, standaardFont } from './video-lib.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (naam, standaard = null) => (process.argv.includes(naam) ? process.argv[process.argv.indexOf(naam) + 1] : standaard);

function run(cmd, args, opties = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opties });
  if (r.status !== 0) throw new Error(`${cmd} stopte met code ${r.status}`);
}

export async function hoofd({
  persona = arg('--persona'),
  sadtalker = arg('--sadtalker', join(ROOT, '.sadtalker')),
  segmenten = arg('--segmenten'),
  verbeteren = process.argv.includes('--verbeteren'),
  uit = arg('--uit', join(ROOT, 'uit-video')),
  python = process.env.VIDEO_PYTHON || 'python',
  ffmpeg = process.env.FFMPEG || 'ffmpeg',
  cache = process.env.VIDEO_CACHE || join(process.env.HOME || '/tmp', '.cache', 'toeslagbuddy-video'),
  video = join(ROOT, 'public/video'), // bestaande clips, gezichten en manifest
  stuk = arg('--deel'), // 'k/n': alleen elke n-de clip vanaf k (parallelle jobs)
} = {}) {
  if (!persona) throw new Error('Geef --persona op');
  const [k, n] = stuk ? stuk.split('/').map(Number) : [1, 1];
  if (!(n >= 1 && k >= 1 && k <= n)) throw new Error(`Ongeldig --deel ${stuk}`);
  const gezichtMap = join(video, 'gezichten');
  const gezicht = join(gezichtMap, `${persona}.jpg`);
  const manifestPad = join(video, 'manifest.json');
  const manifest = existsSync(manifestPad) ? JSON.parse(readFileSync(manifestPad, 'utf8')) : {};
  mkdirSync(join(uit, persona), { recursive: true });
  mkdirSync(cache, { recursive: true });

  // 1. Gezicht: bestaat het al (in git), dan hergebruiken; anders nieuw maken en meeleveren
  if (!existsSync(gezicht)) {
    // Parallelle delen moeten hetzelfde gezicht gebruiken: dat wordt vooraf gemaakt
    if (n > 1) throw new Error(`Gezicht van ${persona} ontbreekt; maak het eerst (job 'gezichten')`);
    run(python, [join(ROOT, 'scripts/video/gezichten.py'), '--persona', persona, '--uit', gezichtMap, '--gewichten', join(sadtalker, 'gfpgan/weights')]);
    mkdirSync(join(uit, 'gezichten'), { recursive: true });
    copyFileSync(gezicht, join(uit, 'gezichten', `${persona}.jpg`));
    copyFileSync(join(gezichtMap, `${persona}.json`), join(uit, 'gezichten', `${persona}.json`));
  }

  // 2. Stem: deterministische keuze uit de Nederlandse Piper-stemmen
  const keuzePad = join(cache, 'stemkeuze.json');
  if (!existsSync(keuzePad)) run(python, [join(ROOT, 'scripts/video/stemmen.py'), '--map', join(cache, 'piper'), '--uit', keuzePad]);
  const stem = JSON.parse(readFileSync(keuzePad, 'utf8'))[persona];
  if (!stem) throw new Error(`Geen stem gekozen voor ${persona}`);

  // 3. Welke clips zijn nieuw of veranderd?
  const avatar = echteAvatar(sha(readFileSync(gezicht)), stem);
  const filter = segmenten ? new Set(segmenten.split(',').map((s) => s.trim())) : null;
  const clips = teMaken(alleClips().filter((c) => c.persona === persona && (!filter || filter.has(c.segment))), manifest, avatar, hashVan)
    .filter((_, i) => i % n === k - 1);
  console.log(`${persona}: ${clips.length} clip(s) te maken${n > 1 ? ` (deel ${k}/${n})` : ''}`);
  const deel = { [persona]: {} };
  const rapport = [];
  if (clips.length) {
    // 4. Renderen (Python: stem + SadTalker) in één proces, het gezicht wordt één keer geanalyseerd
    const opdracht = join(uit, `opdracht.${persona}.json`);
    const ruw = join(uit, '_ruw', persona);
    writeFileSync(opdracht, JSON.stringify({ persona, gezicht, stem: { model: stem.model, spreker: stem.spreker }, uit: ruw, verbeteren, clips: clips.map(({ segment, tekst }) => ({ segment, tekst })) }, null, 2));
    run(python, [join(ROOT, 'scripts/video/render.py'), '--opdracht', opdracht, '--sadtalker', sadtalker]);

    // 5. Comprimeren, AI-label inbranden, keuren
    for (const c of clips) {
      const bron = join(ruw, `${c.segment}.ruw.mp4`);
      const doel = join(uit, persona, `${c.segment}.mp4`);
      if (!existsSync(bron)) {
        rapport.push({ segment: c.segment, ok: false, redenen: ['niet gerenderd'] });
        continue;
      }
      run(ffmpeg, ffmpegArgs(bron, doel, { font: standaardFont(ffmpeg) }));
      const k = keuring(doel, ffmpeg);
      rapport.push({ segment: c.segment, ...k });
      if (!k.ok) {
        rmSync(doel, { force: true });
        continue;
      }
      deel[persona][c.segment] = { src: `/video/${persona}/${c.segment}.mp4`, poster: `/video/gezichten/${persona}.jpg`, hash: hashVan(c, avatar), tekst: c.tekst, duur: k.duur, bron: 'open-source' };
    }
    rmSync(join(uit, '_ruw'), { recursive: true, force: true });
    rmSync(opdracht, { force: true });
  }
  writeFileSync(join(uit, `manifest.${persona}.json`), JSON.stringify(deel, null, 2) + '\n');
  writeFileSync(join(uit, `keuring.${persona}.json`), JSON.stringify(rapport, null, 2) + '\n');
  const afgekeurd = rapport.filter((r) => !r.ok);
  for (const r of rapport) console.log(`${r.ok ? '✓' : '✗'} ${persona}/${r.segment}${r.ok ? ` (${r.duur} s)` : `: ${r.redenen.join(', ')}`}`);
  return { gemaakt: rapport.length - afgekeurd.length, afgekeurd: afgekeurd.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await hoofd();
  if (r.afgekeurd) process.exitCode = 1;
}
