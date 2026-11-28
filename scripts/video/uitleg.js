// Maakt de uitlegvideo's (1280 × 720, H.264) uit scripts/video/uitleg-scenes.js.
// Elke frame wordt in Chromium stilgezet en vastgelegd; ffmpeg maakt er een
// MP4 van met ingebrande ondertitels (werkt ook zonder geluid).
//
//   node build.js
//   node scripts/video/uitleg.js --teksten /tmp/teksten.json   (alleen de teksten voor de stem)
//   python scripts/video/uitleg_stem.py --teksten /tmp/teksten.json --map ~/.cache/piper --uit /tmp/stem
//   node scripts/video/uitleg.js --stem /tmp/stem                (met voice-over)
//   node scripts/video/uitleg.js                                 (zonder stem: stille versie)
//   node scripts/video/uitleg.js --verticaal [--stem /tmp/stem]   (9:16 voor Reels/TikTok)
//   node scripts/video/uitleg.js --verticaal --controle /tmp/stil  (per scène één beeld + opmaakcontrole, geen video)
// Verder: --alleen <id> (één video), --opnieuw (ook als er niets veranderde).
//
// Uitkomst: public/video/uitleg/<id>.mp4, <id>.jpg en manifest.json; met
// --verticaal <id>-verticaal.mp4, <id>-verticaal.jpg en verticaal.json
// (1080 × 1920, zelfde scènes, voice-over en ondertitels).
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { VIDEOS, STIJL, STIJL_FILM, STIJL_VERTICAAL, ondertitels, schatDuur } from './uitleg-scenes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const UIT = join(ROOT, 'public/video/uitleg');
const BEELDEN = join(ROOT, 'data/video/beelden');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 25;
// Mastering van de stem: omroepnorm (EBU R128, −16 LUFS voor online), pieken
// onder −1,5 dB, en een zacht hoogfilter tegen gebrom.
export const MASTER = 'highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11';
const PAUZE = 0.7; // stilte na elke scène

const arg = (naam) => {
  const i = process.argv.indexOf(naam);
  return i > -1 ? process.argv[i + 1] : null;
};
const sleutel = (v, i) => `${v.id}-${i + 1}`;

// Formaten. breedte/hoogte in CSS-pixels; schaal = deviceScaleFactor, dus de
// video is breedte × schaal bij hoogte × schaal. De verticale versie heeft
// kortere ondertitels (twee regels), een eigen manifest en een iets lagere
// CRF: de platforms comprimeren zelf nog eens.
export const FORMATEN = {
  liggend: { naam: 'liggend', breedte: 1280, hoogte: 720, schaal: 1, achtervoegsel: '', manifest: 'manifest.json', crf: 23, ondertitelMax: 90 },
  verticaal: { naam: 'verticaal', breedte: 720, hoogte: 1280, schaal: 1.5, achtervoegsel: '-verticaal', manifest: 'verticaal.json', crf: 26, ondertitelMax: 60, klasse: 'verticaal', stijl: STIJL_VERTICAAL, band: { y: 150, hoogte: 608 } },
};
export const formaatUit = (argv = process.argv) => (argv.includes('--verticaal') ? FORMATEN.verticaal : FORMATEN.liggend);
export const pixels = (f) => ({ breedte: Math.round(f.breedte * f.schaal), hoogte: Math.round(f.hoogte * f.schaal) });

function duurVan(wav) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  return Number.isFinite(d) ? d : null;
}

// Waar komt een clip vandaan? Stock (Pixabay/Pexels, met de maker) of AI (Veo, Kaggle, Flow)
let beeldIndex = null;
export function bronVan(naam, index = null) {
  if (!index) {
    if (beeldIndex === null) beeldIndex = existsSync(join(BEELDEN, 'index.json')) ? JSON.parse(readFileSync(join(BEELDEN, 'index.json'), 'utf8')) : {};
    index = beeldIndex;
  }
  const r = index[naam];
  const platform = { pexels: 'Pexels', pixabay: 'Pixabay' }[r?.bron];
  if (platform) return { soort: 'stock', label: `Beelden: ${r.fotograaf} / ${platform}`, credit: { fotograaf: r.fotograaf, fotograafUrl: r.fotograafUrl, url: r.url, platform } };
  return { soort: 'ai', label: 'Beelden gemaakt met AI' };
}

export function plan(video, stemMap, formaat = FORMATEN.liggend) {
  return video.scenes.map((s, i) => {
    const wav = stemMap ? join(stemMap, `${sleutel(video, i)}.wav`) : null;
    const gesproken = wav && existsSync(wav) ? duurVan(wav) : null;
    const duur = Math.round(((gesproken ?? schatDuur(s.tekst)) + PAUZE) * 100) / 100;
    const clip = clipVoor(video, i);
    return { ...s, wav: gesproken ? wav : null, clip, bron: clip ? bronVan(`${video.id}-${i + 1}`) : null, duur, ondertitels: ondertitels(s.ondertitel || s.tekst, duur - PAUZE / 2, { max: formaat.ondertitelMax }) };
  });
}

const bestandHash = (p) => (p ? createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12) : null);
// Vingerafdruk van alles wat het beeld bepaalt. Voor de liggende video precies
// zoals altijd (anders zou alles opnieuw gerenderd worden); de verticale
// telt daarbij haar eigen stijl en instellingen op.
export function vingerafdruk(video, scenes, formaat = FORMATEN.liggend) {
  const basis = [STIJL, STIJL_FILM, video, scenes.map((s) => [s.duur, !!s.wav, bestandHash(s.clip), s.bron?.label || '']), MASTER];
  const invoer = formaat.naam === 'liggend' ? basis : [...basis, formaat.naam, formaat.stijl, formaat.breedte, formaat.hoogte, formaat.schaal, formaat.crf, formaat.ondertitelMax, formaat.band];
  return createHash('sha256').update(JSON.stringify(invoer)).digest('hex').slice(0, 12);
}

// AI-beeld bij een scène (scripts/video/ai-beelden.js), als het er is
export function clipVoor(video, i, map = BEELDEN) {
  if (!video.scenes[i].film && !video.scenes[i].stock) return null;
  const c = join(map, `${video.id}-${i + 1}.mp4`);
  return existsSync(c) ? c : null;
}

const mp4 = (formaat) => ['-c:v', 'libx264', '-preset', 'medium', '-crf', String(formaat.crf), '-pix_fmt', 'yuv420p', '-r', String(FPS)];

// ffmpeg-filter voor een scène met een clip eronder: [0:v] = clip, [1:v] = de
// vastgelegde pagina (doorzichtig). Langzaam inzoomen geeft het beeld leven.
// Liggend: clip schermvullend. Verticaal: de (liggende) clip in volle breedte
// in een band bovenin, zodat hij niet wordt uitvergroot, met een vervaagde
// kopie als achtergrond.
export function filmFilter(formaat, duur) {
  const { breedte: w, hoogte: h } = pixels(formaat);
  const groot = (x) => Math.round(x * 1.1);
  if (!formaat.band) {
    return `[0:v]scale=${groot(w)}:${groot(h)}:force_original_aspect_ratio=increase,crop=${groot(w)}:${groot(h)},fps=${FPS},trim=duration=${duur},setpts=PTS-STARTPTS,scale=w='${w}+${groot(w) - w}*t/${duur}':h=-2:eval=frame,crop=${w}:${h},setsar=1[bg];[1:v]format=rgba[ov];[bg][ov]overlay=0:0:shortest=1,format=yuv420p[v]`;
  }
  const b = formaat.band;
  return `[0:v]fps=${FPS},trim=duration=${duur},setpts=PTS-STARTPTS,split[a][b];` +
    `[a]scale=${w / 4}:${h / 4}:force_original_aspect_ratio=increase,crop=${w / 4}:${h / 4},boxblur=12:2,eq=brightness=-0.06:saturation=0.85,scale=${w}:${h},setsar=1[achter];` +
    `[b]scale=${groot(w)}:-2,scale=w='${w}+${groot(w) - w}*t/${duur}':h=-2:eval=frame,crop=${w}:${b.hoogte},setsar=1[voor];` +
    `[achter][voor]overlay=0:${b.y}[bg];[1:v]format=rgba[ov];[bg][ov]overlay=0:0:shortest=1,format=yuv420p[v]`;
}

// Eén scène → een los MP4-deel. Met een AI-beeld: de pagina wordt met een
// doorzichtige achtergrond vastgelegd (PNG) en over het beeld gelegd.
async function zetScene(pagina, s) {
  await pagina.evaluate(([html, film, label]) => {
    document.body.classList.toggle('film', film);
    document.querySelector('.ai-label').textContent = label;
    document.getElementById('scene').innerHTML = `<div class="scene">${html}</div>`;
  }, [s.beeld, !!s.clip, s.bron?.label || '']);
}

// Zet alle animaties stil op tijdstip t (in de scène) en toon de ondertitel
async function zetTijd(pagina, t, totaal, tekst) {
  await pagina.evaluate(([lokaal, totaal, tekst]) => {
    const scene = document.getElementById('scene');
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = (scene.contains(a.effect.target) ? lokaal : totaal) * 1000;
    }
    const ot = document.getElementById('ot');
    ot.hidden = false;
    if (ot.textContent !== tekst) ot.textContent = tekst;
  }, [t, totaal, tekst]);
}

async function renderScene(pagina, s, start, deel, formaat) {
  const film = !!s.clip;
  await zetScene(pagina, s);
  const invoer = film
    ? ['-stream_loop', '-1', '-i', s.clip, '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-']
    : ['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  const filter = film ? ['-filter_complex', filmFilter(formaat, s.duur), '-map', '[v]'] : [];
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', ...invoer, ...filter, ...mp4(formaat), deel], { stdio: ['pipe', 'inherit', 'inherit'] });
  const klaar = new Promise((ok, fout) => ff.on('close', (c) => (c === 0 ? ok() : fout(new Error(`ffmpeg stopte met ${c}`)))));
  const frames = Math.round(s.duur * FPS);
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    const tekst = (s.ondertitels.find((o) => t >= o.van && t < o.tot) || s.ondertitels.at(-1)).tekst;
    await zetTijd(pagina, t, start + t, tekst);
    const beeld = film ? await pagina.screenshot({ type: 'png', omitBackground: true }) : await pagina.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(beeld)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await klaar;
}

// Opent een pagina in het gevraagde formaat met de stijl en het decor
async function opzetten(browser, basis, video, formaat) {
  const pagina = await (await browser.newContext({ viewport: { width: formaat.breedte, height: formaat.hoogte }, deviceScaleFactor: formaat.schaal })).newPage();
  await pagina.goto(basis + '/404.html');
  const kleurTekst = video.kleurTekst || { familie: '#9c4a26', besparen: '#6f3a73', toeslagen: '#7a5a12' }[video.id] || '#1f6b5a';
  await pagina.setContent(`<!doctype html><html lang="nl"${formaat.klasse ? ` class="${formaat.klasse}"` : ''}><head><meta charset="utf-8"><base href="${basis}/"><style>${STIJL}${STIJL_FILM}${formaat.stijl || ''}</style></head>
<body style="--k:${video.kleur};--kt:${kleurTekst}"><div class="scrim"></div><div class="decor"></div><div class="decor twee"></div><div class="merk"><span>€</span>ToeslagBuddy</div><p class="ai-label"></p><main id="scene"></main><p class="ondertitel" id="ot" hidden></p></body></html>`);
  await pagina.evaluate(() => document.fonts.ready);
  return pagina;
}

// Opmaakcontrole (in de browser): staat er tekst of een kaart buiten beeld,
// over de ondertitel of het merk, of in de veilige zone van de app?
// Geeft een lijst met problemen terug (leeg = goed).
async function opmaakFouten(pagina, formaat) {
  return pagina.evaluate(([w, h, veiligRechts, veiligOnder]) => {
    const fouten = [];
    const naam = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.textContent || '').trim().slice(0, 40)}"`;
    const raakt = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const ot = document.getElementById('ot').getBoundingClientRect();
    const merk = document.querySelector('.merk').getBoundingClientRect();
    const scene = document.getElementById('scene');
    // Blokken met tekst of een kaart: alles met eigen tekst, plus kaarten
    const blokken = [...scene.querySelectorAll('*')].filter((el) => {
      if (el.closest('svg') && el.tagName !== 'svg') return false;
      const eigenTekst = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      return eigenTekst || /\b(kaart|tegel|papier|sticker|uitkomst-pil|brief)\b/.test(el.className);
    });
    for (const el of blokken) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.left < 0 || r.top < 0 || r.right > w || r.bottom > h) fouten.push(`buiten beeld: ${naam(el)}`);
      else if (veiligRechts && r.right > w - veiligRechts + 1 && !el.closest('.brief')) fouten.push(`in de veilige zone rechts: ${naam(el)}`);
      if (raakt(r, ot)) fouten.push(`overlapt de ondertitel: ${naam(el)}`);
      if (raakt(r, merk)) fouten.push(`overlapt het merk: ${naam(el)}`);
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') fouten.push(`tekst loopt uit: ${naam(el)}`);
    }
    if (veiligOnder && ot.bottom > h - veiligOnder + 1) fouten.push('ondertitel in de veilige zone onderaan');
    if (ot.left < 0 || ot.right > w || ot.top < 0) fouten.push('ondertitel buiten beeld');
    return [...new Set(fouten)];
  }, [formaat.breedte, formaat.hoogte, formaat.klasse ? 48 : 0, formaat.klasse ? 240 : 0]);
}

const langsteOndertitel = (s) => s.ondertitels.reduce((a, b) => (b.tekst.length > a.tekst.length ? b : a)).tekst;

// Per scène één stilstaand beeld (alle animaties klaar, langste ondertitel)
// plus de opmaakcontrole. Voor een snelle blik zonder video te renderen.
async function controle(browser, basis, video, scenes, formaat, map) {
  const pagina = await opzetten(browser, basis, video, formaat);
  const alle = [];
  for (const [i, s] of scenes.entries()) {
    await zetScene(pagina, s);
    await zetTijd(pagina, s.duur, s.duur, langsteOndertitel(s));
    alle.push(...(await opmaakFouten(pagina, formaat)).map((f) => `${video.id}-${i + 1}: ${f}`));
    await pagina.screenshot({ path: join(map, `${video.id}${formaat.achtervoegsel}-${i + 1}.png`), omitBackground: !!s.clip });
  }
  await pagina.context().close();
  return alle;
}

async function render(browser, basis, video, scenes, bestand, formaat) {
  const pagina = await opzetten(browser, basis, video, formaat);
  // Fouten in de opmaak melden (de video wordt wel gemaakt)
  for (const [i, s] of scenes.entries()) {
    await zetScene(pagina, s);
    await zetTijd(pagina, s.duur, s.duur, langsteOndertitel(s));
    for (const f of await opmaakFouten(pagina, formaat)) console.warn(`⚠ ${video.id}${formaat.achtervoegsel} scène ${i + 1}: ${f}`);
  }
  const tmp = join(tmpdir(), `uitleg-${video.id}-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const delen = [];
  let globaal = 0;
  for (const [i, s] of scenes.entries()) {
    const deel = join(tmp, `${i}.mp4`);
    await renderScene(pagina, s, globaal, deel, formaat);
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
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', beeld, '-f', 'concat', '-safe', '0', '-i', lijst, '-c:v', 'copy', '-af', MASTER, '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-shortest', '-movflags', '+faststart', uit], { stdio: 'inherit' });
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
  const formaat = formaatUit();
  const controleMap = arg('--controle');
  const { start } = await import('../../test/e2e/helpers.js');
  const s = await start();
  if (controleMap) {
    mkdirSync(controleMap, { recursive: true });
    const fouten = [];
    try {
      for (const video of VIDEOS) if (!alleen || video.id === alleen) fouten.push(...(await controle(s.browser, s.basis, video, plan(video, stemMap, formaat), formaat, controleMap)));
    } finally {
      await s.stop();
    }
    for (const f of fouten) console.warn(`⚠ ${f}`);
    console.log(`${fouten.length ? '✗' : '✓'} opmaakcontrole ${formaat.naam}: ${fouten.length} problemen; beelden in ${controleMap}`);
    if (fouten.length) process.exitCode = 1;
    return;
  }
  mkdirSync(UIT, { recursive: true });
  const manifestPad = join(UIT, formaat.manifest);
  const manifest = existsSync(manifestPad) ? JSON.parse(readFileSync(manifestPad, 'utf8')) : {};
  const stem = stemMap && existsSync(join(stemMap, 'stem.json')) ? JSON.parse(readFileSync(join(stemMap, 'stem.json'), 'utf8')).stem : null;
  try {
    for (const video of VIDEOS) {
      if (alleen && video.id !== alleen) continue;
      const scenes = plan(video, stemMap, formaat);
      const hash = vingerafdruk(video, scenes, formaat);
      const id = `${video.id}${formaat.achtervoegsel}`;
      const mp4 = join(UIT, `${id}.mp4`);
      if (manifest[video.id]?.hash === hash && existsSync(mp4) && !process.argv.includes('--opnieuw')) {
        console.log(`= ${id} ongewijzigd`);
        continue;
      }
      const begin = Date.now();
      const beeld = join(tmpdir(), `${id}-beeld.mp4`);
      const duur = await render(s.browser, s.basis, video, scenes, beeld, formaat);
      const metStem = scenes.some((x) => x.wav);
      if (metStem) voegStemToe(beeld, scenes, mp4);
      else spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', beeld, '-c', 'copy', '-movflags', '+faststart', mp4]);
      rmSync(beeld, { force: true });
      // Poster: een rustig moment uit de eerste scène
      spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(Math.min(2.6, scenes[0].duur - 0.2)), '-i', mp4, '-frames:v', '1', '-q:v', '3', join(UIT, `${id}.jpg`)]);
      const credits = [...new Map(scenes.filter((x) => x.bron?.soort === 'stock').map((x) => [x.bron.credit.url, x.bron.credit])).values()];
      const klaar = `${duur.toFixed(1)} s${metStem ? ' met stem' : ' zonder stem'}, gerenderd in ${((Date.now() - begin) / 1000).toFixed(0)} s`;
      if (formaat.naam !== 'liggend') {
        // Verticaal: voor sociale media; eigen manifest met de bronvermelding
        manifest[video.id] = { titel: video.titel, src: `/video/uitleg/${id}.mp4`, poster: `/video/uitleg/${id}.jpg`, breedte: pixels(formaat).breedte, hoogte: pixels(formaat).hoogte, duur: Math.round(duur * 10) / 10, stem: metStem ? stem || 'piper' : null, ai: scenes.some((x) => x.clip && x.bron?.soort === 'ai'), credits, hash };
        writeFileSync(manifestPad, JSON.stringify(manifest, null, 1) + '\n');
        console.log(`✓ ${id}: ${klaar}`);
        continue;
      }
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
        credits,
        transcript: video.scenes.map((x) => x.ondertitel || x.tekst).join(' '),
        hash,
      };
      writeFileSync(manifestPad, JSON.stringify(manifest, null, 1) + '\n');
      console.log(`✓ ${id}: ${klaar}`);
    }
  } finally {
    await s.stop();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
