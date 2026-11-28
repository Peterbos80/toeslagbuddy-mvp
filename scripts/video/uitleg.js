// Maakt de uitlegvideo's (1280 × 720, H.264) uit scripts/video/uitleg-scenes.js.
// Elke frame wordt in Chromium stilgezet en vastgelegd; ffmpeg maakt er een
// MP4 van met ingebrande ondertitels (werkt ook zonder geluid).
//
//   node build.js
//   node scripts/video/uitleg.js --teksten /tmp/teksten.json   (alleen de teksten voor de stem)
//   python scripts/video/uitleg_stem.py --teksten /tmp/teksten.json --map ~/.cache/piper --uit /tmp/stem
//   node scripts/video/uitleg.js --stem /tmp/stem                (met voice-over)
//   node scripts/video/uitleg.js                                 (zonder stem: stille versie)
//
// Uitkomst: public/video/uitleg/<id>.mp4, <id>.jpg en manifest.json.
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { VIDEOS, STIJL, STIJL_FILM, ondertitels, schatDuur } from './uitleg-scenes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const UIT = join(ROOT, 'public/video/uitleg');
const BEELDEN = join(ROOT, 'data/video/beelden');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 25;
const PAUZE = 0.7; // stilte na elke scène

const arg = (naam) => {
  const i = process.argv.indexOf(naam);
  return i > -1 ? process.argv[i + 1] : null;
};
const sleutel = (v, i) => `${v.id}-${i + 1}`;

function duurVan(wav) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  return Number.isFinite(d) ? d : null;
}

// Waar komt een clip vandaan? Pexels (met de maker) of AI (Veo, Kaggle, Flow)
let beeldIndex = null;
export function bronVan(naam, index = null) {
  if (!index) {
    if (beeldIndex === null) beeldIndex = existsSync(join(BEELDEN, 'index.json')) ? JSON.parse(readFileSync(join(BEELDEN, 'index.json'), 'utf8')) : {};
    index = beeldIndex;
  }
  const r = index[naam];
  if (r?.bron === 'pexels') return { soort: 'pexels', label: `Beelden: ${r.fotograaf} / Pexels`, credit: { fotograaf: r.fotograaf, fotograafUrl: r.fotograafUrl, url: r.url } };
  return { soort: 'ai', label: 'Beelden gemaakt met AI' };
}

export function plan(video, stemMap) {
  return video.scenes.map((s, i) => {
    const wav = stemMap ? join(stemMap, `${sleutel(video, i)}.wav`) : null;
    const gesproken = wav && existsSync(wav) ? duurVan(wav) : null;
    const duur = Math.round(((gesproken ?? schatDuur(s.tekst)) + PAUZE) * 100) / 100;
    const clip = clipVoor(video, i);
    return { ...s, wav: gesproken ? wav : null, clip, bron: clip ? bronVan(`${video.id}-${i + 1}`) : null, duur, ondertitels: ondertitels(s.ondertitel || s.tekst, duur - PAUZE / 2) };
  });
}

const bestandHash = (p) => (p ? createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12) : null);
const vingerafdruk = (video, scenes) => createHash('sha256').update(JSON.stringify([STIJL, STIJL_FILM, video, scenes.map((s) => [s.duur, !!s.wav, bestandHash(s.clip), s.bron?.label || ''])])).digest('hex').slice(0, 12);

// AI-beeld bij een scène (scripts/video/ai-beelden.js), als het er is
export function clipVoor(video, i, map = BEELDEN) {
  if (!video.scenes[i].film && !video.scenes[i].stock) return null;
  const c = join(map, `${video.id}-${i + 1}.mp4`);
  return existsSync(c) ? c : null;
}

const MP4 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', String(FPS)];

// Eén scène → een los MP4-deel. Met een AI-beeld: de pagina wordt met een
// doorzichtige achtergrond vastgelegd (PNG) en over het beeld gelegd.
async function renderScene(pagina, s, start, deel) {
  const film = !!s.clip;
  await pagina.evaluate(([html, film, label]) => {
    document.body.classList.toggle('film', film);
    document.querySelector('.ai-label').textContent = label;
    document.getElementById('scene').innerHTML = `<div class="scene">${html}</div>`;
  }, [s.beeld, film, s.bron?.label || '']);
  const invoer = film
    ? ['-stream_loop', '-1', '-i', s.clip, '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-']
    : ['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  // Langzaam inzoomen geeft het beeld wat leven, ook als de clip kort is
  const filter = film
    ? ['-filter_complex', `[0:v]scale=1408:792:force_original_aspect_ratio=increase,crop=1408:792,fps=${FPS},trim=duration=${s.duur},setpts=PTS-STARTPTS,scale=w='1280+128*t/${s.duur}':h=-2:eval=frame,crop=1280:720,setsar=1[bg];[1:v]format=rgba[ov];[bg][ov]overlay=0:0:shortest=1,format=yuv420p[v]`, '-map', '[v]']
    : [];
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', ...invoer, ...filter, ...MP4, deel], { stdio: ['pipe', 'inherit', 'inherit'] });
  const klaar = new Promise((ok, fout) => ff.on('close', (c) => (c === 0 ? ok() : fout(new Error(`ffmpeg stopte met ${c}`)))));
  const frames = Math.round(s.duur * FPS);
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    const tekst = (s.ondertitels.find((o) => t >= o.van && t < o.tot) || s.ondertitels.at(-1)).tekst;
    await pagina.evaluate(([lokaal, totaal, tekst]) => {
      const scene = document.getElementById('scene');
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = (scene.contains(a.effect.target) ? lokaal : totaal) * 1000;
      }
      const ot = document.getElementById('ot');
      ot.hidden = false;
      if (ot.textContent !== tekst) ot.textContent = tekst;
    }, [t, start + t, tekst]);
    const beeld = film ? await pagina.screenshot({ type: 'png', omitBackground: true }) : await pagina.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(beeld)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await klaar;
}

async function render(browser, basis, video, scenes, bestand) {
  const pagina = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
  await pagina.goto(basis + '/404.html');
  const kleurTekst = { familie: '#9c4a26', besparen: '#6f3a73', toeslagen: '#7a5a12' }[video.id] || '#1f6b5a';
  await pagina.setContent(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><base href="${basis}/"><style>${STIJL}${STIJL_FILM}</style></head>
<body style="--k:${video.kleur};--kt:${kleurTekst}"><div class="scrim"></div><div class="decor"></div><div class="decor twee"></div><div class="merk"><span>€</span>ToeslagBuddy</div><p class="ai-label"></p><main id="scene"></main><p class="ondertitel" id="ot" hidden></p></body></html>`);
  await pagina.evaluate(() => document.fonts.ready);
  const tmp = join(tmpdir(), `uitleg-${video.id}-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const delen = [];
  let globaal = 0;
  for (const [i, s] of scenes.entries()) {
    const deel = join(tmp, `${i}.mp4`);
    await renderScene(pagina, s, globaal, deel);
    delen.push(deel);
    globaal += s.duur;
  }
  const lijst = join(tmp, 'delen.txt');
  writeFileSync(lijst, delen.map((d) => `file '${d}'`).join('\n'));
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lijst, '-c', 'copy', '-movflags', '+faststart', bestand], { stdio: 'inherit' });
  rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) throw new Error('ffmpeg (delen samenvoegen) mislukt');
  await pagina.context().close();
  return globaal;
}

const tijd = (t) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};
export function vtt(scenes) {
  let begin = 0;
  const regels = ['WEBVTT', ''];
  for (const s of scenes) {
    for (const o of s.ondertitels) regels.push(`${tijd(begin + o.van)} --> ${tijd(begin + o.tot)}`, o.tekst, '');
    begin += s.duur;
  }
  return regels.join('\n');
}

function voegStemToe(beeld, scenes, uit) {
  const tmp = join(tmpdir(), `uitleg-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const delen = scenes.map((s, i) => {
    const deel = join(tmp, `${i}.wav`);
    const bron = s.wav ? ['-i', s.wav] : ['-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono'];
    const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', ...bron, '-af', `apad,atrim=0:${s.duur}`, '-ar', '22050', '-ac', '1', deel]);
    if (r.status !== 0) throw new Error('ffmpeg (stem) mislukt');
    return deel;
  });
  const lijst = join(tmp, 'lijst.txt');
  writeFileSync(lijst, delen.map((d) => `file '${d}'`).join('\n'));
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', beeld, '-f', 'concat', '-safe', '0', '-i', lijst, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', uit], { stdio: 'inherit' });
  rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) throw new Error('ffmpeg (samenvoegen) mislukt');
}

async function main() {
  const teksten = arg('--teksten');
  if (teksten) {
    const t = {};
    for (const v of VIDEOS) v.scenes.forEach((s, i) => (t[sleutel(v, i)] = s.tekst));
    writeFileSync(teksten, JSON.stringify(t, null, 1));
    console.log(`${Object.keys(t).length} teksten → ${teksten}`);
    return;
  }
  const stemMap = arg('--stem');
  const alleen = arg('--alleen');
  const { start } = await import('../../test/e2e/helpers.js');
  const s = await start();
  mkdirSync(UIT, { recursive: true });
  const manifestPad = join(UIT, 'manifest.json');
  const manifest = existsSync(manifestPad) ? JSON.parse(readFileSync(manifestPad, 'utf8')) : {};
  const stem = stemMap && existsSync(join(stemMap, 'stem.json')) ? JSON.parse(readFileSync(join(stemMap, 'stem.json'), 'utf8')).stem : null;
  try {
    for (const video of VIDEOS) {
      if (alleen && video.id !== alleen) continue;
      const scenes = plan(video, stemMap);
      const hash = vingerafdruk(video, scenes);
      const mp4 = join(UIT, `${video.id}.mp4`);
      if (manifest[video.id]?.hash === hash && existsSync(mp4) && !process.argv.includes('--opnieuw')) {
        console.log(`= ${video.id} ongewijzigd`);
        continue;
      }
      const beeld = join(tmpdir(), `${video.id}-beeld.mp4`);
      const duur = await render(s.browser, s.basis, video, scenes, beeld);
      const metStem = scenes.some((x) => x.wav);
      if (metStem) voegStemToe(beeld, scenes, mp4);
      else spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', beeld, '-c', 'copy', '-movflags', '+faststart', mp4]);
      rmSync(beeld, { force: true });
      // Poster: een rustig moment uit de eerste scène
      spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(Math.min(2.6, scenes[0].duur - 0.2)), '-i', mp4, '-frames:v', '1', '-q:v', '3', join(UIT, `${video.id}.jpg`)]);
      // Ondertitels ook als WebVTT (voor schermlezers en zoekmachines)
      writeFileSync(join(UIT, `${video.id}.vtt`), vtt(scenes));
      manifest[video.id] = {
        titel: video.titel,
        src: `/video/uitleg/${video.id}.mp4`,
        poster: `/video/uitleg/${video.id}.jpg`,
        vtt: `/video/uitleg/${video.id}.vtt`,
        duur: Math.round(duur * 10) / 10,
        stem: metStem ? stem || 'piper' : null,
        ai: scenes.some((x) => x.clip && x.bron?.soort === 'ai'),
        credits: [...new Map(scenes.filter((x) => x.bron?.soort === 'pexels').map((x) => [x.bron.credit.url, x.bron.credit])).values()],
        transcript: video.scenes.map((x) => x.ondertitel || x.tekst).join(' '),
        hash,
      };
      writeFileSync(manifestPad, JSON.stringify(manifest, null, 1) + '\n');
      console.log(`✓ ${video.id}: ${duur.toFixed(1)} s${metStem ? ' met stem' : ' zonder stem'}`);
    }
  } finally {
    await s.stop();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
