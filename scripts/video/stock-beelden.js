// Echte stockvideo's van Pixabay of Pexels onder de uitlegvideo's (gratis, ook
// voor commercieel gebruik, zonder watermerk). Per scène proberen we de
// zoektermen uit `stock` in uitleg-scenes.js en kiezen de best passende
// liggende HD-clip. De maker staat erbij (index.json → in de video en op de site).
//
//   PIXABAY_API_KEY=… node scripts/video/stock-beelden.js [--alleen familie] [--droog]
//   (of PEXELS_API_KEY=…; Pexels gaat voor als beide er zijn)
//
// - Alleen scènes zonder clip, of waarvan de zoektermen veranderden.
// - Met de hand toegevoegde clips (geen regel in index.json) blijven staan.
// - Een clip afkeuren: zet "<bron>:<id>" (bijv. "pixabay:12345") in index.json → "afgekeurd" en
//   verwijder het bestand; de volgende run kiest een andere.
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { VIDEOS } from './uitleg-scenes.js';
import { MAP, clipNaam } from './ai-beelden.js';

const API = 'https://api.pexels.com/videos/search';
const PIXABAY = 'https://pixabay.com/api/videos/';
export const STOCK = ['pexels', 'pixabay'];
const NAAM = { pexels: 'Pexels', pixabay: 'Pixabay' };
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

export const zoekHash = (termen) => createHash('sha256').update(JSON.stringify(termen)).digest('hex').slice(0, 12);

export function wensen(videos = VIDEOS) {
  const uit = [];
  for (const v of videos) v.scenes.forEach((s, i) => s.stock && uit.push({ naam: clipNaam(v.id, i), termen: s.stock, hash: zoekHash(s.stock) }));
  return uit;
}

// Ontbreekt, of eerder door ons via Pexels gekozen met andere zoektermen
export function nogTeZoeken(lijst, index, bestaat = (naam) => existsSync(join(MAP, `${naam}.mp4`))) {
  return lijst.filter((w) => !bestaat(w.naam) || (STOCK.includes(index[w.naam]?.bron) && index[w.naam].hash !== w.hash));
}

// Beste bestand van één video: liggend, 1280–1920 breed, mp4
export function kiesBestand(video) {
  const ok = (video.video_files || []).filter((f) => f.file_type === 'video/mp4' && f.width >= 1280 && f.width <= 1920 && f.width > f.height);
  return ok.sort((a, b) => Math.abs(a.width - 1920) - Math.abs(b.width - 1920) || (b.fps || 0) - (a.fps || 0))[0] || null;
}

// Beste video uit de zoekresultaten. Pexels sorteert al op relevantie; wij
// houden die volgorde aan, maar alleen liggend 16:9-achtig, 6–40 s lang, met
// een bruikbaar bestand, nog niet gebruikt en niet afgekeurd.
export function kiesVideo(resultaten, { afgekeurd = [], gebruikt = [] } = {}) {
  for (const v of resultaten) {
    if (afgekeurd.includes(v.id) || gebruikt.includes(v.id)) continue;
    if (!(v.width > v.height) || v.width / v.height < 1.6 || v.width / v.height > 1.9) continue;
    if (v.duration < 6 || v.duration > 40) continue;
    const bestand = kiesBestand(v);
    if (bestand) return { video: v, bestand };
  }
  return null;
}

export function credit(v) {
  return { id: v.id, url: v.url, fotograaf: v.user?.name || 'Pexels', fotograafUrl: v.user?.url || 'https://www.pexels.com' };
}

// Pixabay-resultaat in dezelfde vorm als Pexels, zodat de keuze gelijk werkt
export function vanPixabay(h) {
  const v = h.videos || {};
  const groot = v.large?.width ? v.large : v.medium || {};
  const bestanden = ['large', 'medium', 'small'].map((k) => v[k]).filter((f) => f?.url && f.width).map((f) => ({ file_type: 'video/mp4', width: f.width, height: f.height, link: f.url }));
  return { id: h.id, width: groot.width || 0, height: groot.height || 0, duration: h.duration, url: h.pageURL, user: { name: h.user, url: `https://pixabay.com/users/${encodeURIComponent(h.user)}-${h.user_id}/` }, video_files: bestanden };
}

export async function zoekPixabay(term, { sleutel, haal = fetch }) {
  const url = `${PIXABAY}?key=${encodeURIComponent(sleutel)}&q=${encodeURIComponent(term.slice(0, 100))}&video_type=film&safesearch=true&per_page=30`;
  const r = await haal(url);
  if (!r.ok) throw new Error(`Pixabay ${r.status}: ${(await r.text()).slice(0, 160).replaceAll(sleutel, '…')}`);
  return ((await r.json()).hits || []).map(vanPixabay);
}

export async function zoek(term, { sleutel, haal = fetch }) {
  const url = `${API}?query=${encodeURIComponent(term)}&orientation=landscape&size=medium&per_page=30`;
  const r = await haal(url, { headers: { Authorization: sleutel } });
  if (!r.ok) throw new Error(`Pexels ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return (await r.json()).videos || [];
}

// Max 14 s uit het midden, 1280 × 720, zonder geluid; kort → heen en terug
function verwerk(bron, doel, duur) {
  const lengte = Math.min(14, duur);
  const start = Math.max(0, (duur - lengte) / 2);
  const basis = `scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720,fps=25`;
  const filter = lengte < 10 ? `${basis},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p` : `${basis},format=yuv420p`;
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(start), '-t', String(lengte), '-i', bron, '-an', '-filter_complex', filter, '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-movflags', '+faststart', doel], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg mislukt');
}

async function main() {
  const arg = (n) => {
    const i = process.argv.indexOf(n);
    return i > -1 ? process.argv[i + 1] : null;
  };
  const bron = process.env.PEXELS_API_KEY ? 'pexels' : process.env.PIXABAY_API_KEY ? 'pixabay' : null;
  const sleutel = process.env.PEXELS_API_KEY || process.env.PIXABAY_API_KEY;
  const zoekBij = bron === 'pexels' ? zoek : zoekPixabay;
  const alleen = arg('--alleen');
  mkdirSync(MAP, { recursive: true });
  const indexPad = join(MAP, 'index.json');
  const index = existsSync(indexPad) ? JSON.parse(readFileSync(indexPad, 'utf8')) : {};
  const afgekeurd = index.afgekeurd || [];
  const lijst = nogTeZoeken(wensen().filter((w) => !alleen || w.naam.startsWith(`${alleen}-`)), index);
  console.log(`${lijst.length} stockbeelden te zoeken${bron ? ` bij ${NAAM[bron]}` : ''}`);
  if (process.argv.includes('--droog') || !lijst.length) {
    for (const w of lijst) console.log(`- ${w.naam}: ${w.termen.join(' | ')}`);
    return;
  }
  if (!sleutel) {
    console.log('Geen PIXABAY_API_KEY of PEXELS_API_KEY: geen stockbeelden gezocht.');
    return;
  }
  // Niet twee keer dezelfde clip in de video's
  const gebruikt = Object.values(index).filter((x) => STOCK.includes(x?.bron)).map((x) => `${x.bron}:${x.id}`);
  let n = 0;
  for (const w of lijst) {
    try {
      let keuze = null;
      for (const term of w.termen) {
        keuze = kiesVideo(await zoekBij(term, { sleutel }), { afgekeurd: afgekeurd.filter((a) => String(a).startsWith(`${bron}:`)).map((a) => Number(String(a).split(':')[1])), gebruikt: gebruikt.filter((g) => g.startsWith(`${bron}:`)).map((g) => Number(g.split(':')[1])) });
        if (keuze) break;
      }
      if (!keuze) {
        console.log(`✗ ${w.naam}: niets geschikts gevonden`);
        continue;
      }
      const ruw = join(tmpdir(), `${w.naam}-pexels.mp4`);
      const r = await fetch(keuze.bestand.link);
      if (!r.ok) throw new Error(`downloaden mislukt: ${r.status}`);
      writeFileSync(ruw, Buffer.from(await r.arrayBuffer()));
      verwerk(ruw, join(MAP, `${w.naam}.mp4`), keuze.video.duration);
      rmSync(ruw, { force: true });
      index[w.naam] = { bron, hash: w.hash, ...credit(keuze.video), gemaakt: new Date().toISOString().slice(0, 10) };
      gebruikt.push(`${bron}:${keuze.video.id}`);
      writeFileSync(indexPad, JSON.stringify(index, null, 1) + '\n');
      n++;
      console.log(`✓ ${w.naam}: ${keuze.video.url} (${credit(keuze.video).fotograaf})`);
    } catch (e) {
      console.log(`✗ ${w.naam}: ${e.message}`);
      if (/(Pexels|Pixabay) (400|401|403|429)/.test(e.message)) break;
    }
  }
  console.log(`${n} stockbeelden gekozen`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
