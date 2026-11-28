// Filmische AI-beelden voor de uitlegvideo's, gemaakt met het videomodel van
// Google (Veo, via de Gemini API). Alleen sfeerbeelden onder de voice-over:
// geen tekst, geen logo's, geen huisstijl van de overheid, geen pratende
// gezichten. In de video staat altijd "Beelden gemaakt met AI".
//
//   GEMINI_API_KEY=… node scripts/video/ai-beelden.js [--max 12] [--alleen familie] [--model <naam>] [--droog]
//
// - Kiest zelf een beschikbaar videomodel (lijst van de API), tenzij --model
//   of AI_VIDEO_MODEL is gezet.
// - Maakt alleen beelden die er nog niet zijn of waarvan de prompt veranderde
//   (data/video/beelden/index.json), dus elke prompt kost één keer geld.
// - --max begrenst het aantal nieuwe clips per run (kosten).
// - --droog laat alleen zien wat er gemaakt zou worden.
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { VIDEOS, FILM_STIJL, NEGATIEF } from './uitleg-scenes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const MAP = join(ROOT, 'data/video/beelden');
const API = 'https://generativelanguage.googleapis.com/v1beta';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

export const promptHash = (prompt) => createHash('sha256').update(FILM_STIJL + '\n' + prompt + '\n' + NEGATIEF).digest('hex').slice(0, 12);
export const clipNaam = (videoId, i) => `${videoId}-${i + 1}`;

// Alle scènes met een filmprompt
export function wensen(videos = VIDEOS) {
  const uit = [];
  for (const v of videos) v.scenes.forEach((s, i) => s.film && uit.push({ naam: clipNaam(v.id, i), prompt: `${s.film} ${FILM_STIJL}`, hash: promptHash(s.film) }));
  return uit;
}

// Wat moet er nog gemaakt worden? Ontbreekt de clip, of veranderde de prompt
// van een clip die wij maakten. Een clip zonder regel in index.json is met de
// hand toegevoegd (bijv. gemaakt in Google Flow): die laten we altijd staan,
// net als een gekozen stockvideo (bron 'pexels').
export function nogTeMaken(lijst, index, bestaat = (naam) => existsSync(join(MAP, `${naam}.mp4`))) {
  return lijst.filter((w) => !bestaat(w.naam) || (index[w.naam] && index[w.naam].bron !== 'pexels' && index[w.naam].hash !== w.hash));
}

// Kies een videomodel uit de modellenlijst van de API. Voorkeur: stabiele
// (niet-preview) Veo-modellen, de snelle variant eerst (goedkoper).
export function kiesModel(modellen, voorkeur = null) {
  const video = modellen.filter((m) => (m.supportedGenerationMethods || []).includes('predictLongRunning') && /veo|omni|video/i.test(m.name));
  const naam = (m) => m.name.replace(/^models\//, '');
  if (voorkeur) return video.find((m) => naam(m) === voorkeur) ? voorkeur : null;
  const score = (m) => {
    const n = naam(m);
    let s = 0;
    if (/veo-3\.1/.test(n)) s += 40;
    else if (/veo-3/.test(n)) s += 30;
    else if (/omni/.test(n)) s += 25;
    else if (/veo/.test(n)) s += 10;
    if (/fast/.test(n)) s += 6;
    if (/lite/.test(n)) s += 3;
    if (/preview|exp/.test(n)) s -= 15;
    return s;
  };
  const beste = [...video].sort((a, b) => score(b) - score(a) || naam(a).localeCompare(naam(b)))[0];
  return beste ? naam(beste) : null;
}

export function verzoek(prompt) {
  return {
    instances: [{ prompt }],
    parameters: { aspectRatio: '16:9', resolution: '720p', negativePrompt: NEGATIEF, sampleCount: 1 },
  };
}

// Het adres van de video uit een afgeronde bewerking (twee bekende vormen)
export function videoUri(operatie) {
  const r = operatie?.response || {};
  return r.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || r.generatedVideos?.[0]?.video?.uri || r.videos?.[0]?.uri || null;
}

export function maakClient({ sleutel, haal = fetch, wacht = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const kop = { 'x-goog-api-key': sleutel };
  const json = async (url, opties = {}) => {
    const r = await haal(url, { ...opties, headers: { ...kop, 'content-type': 'application/json', ...(opties.headers || {}) } });
    const tekst = await r.text();
    let data = null;
    try {
      data = JSON.parse(tekst);
    } catch {
      /* geen json */
    }
    if (!r.ok) throw new Error(`API ${r.status}: ${data?.error?.message || tekst.slice(0, 200)}`);
    return data;
  };
  return {
    async modellen() {
      const alle = [];
      let token = '';
      do {
        const d = await json(`${API}/models?pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
        alle.push(...(d.models || []));
        token = d.nextPageToken || '';
      } while (token);
      return alle;
    },
    async maak(model, prompt, { maxWacht = 8 * 60_000, stap = 10_000 } = {}) {
      let op = await json(`${API}/models/${model}:predictLongRunning`, { method: 'POST', body: JSON.stringify(verzoek(prompt)) });
      const naam = op.name;
      const start = Date.now();
      while (!op.done) {
        if (Date.now() - start > maxWacht) throw new Error('duurt te lang');
        await wacht(stap);
        op = await json(`${API}/${naam}`);
      }
      if (op.error) throw new Error(`model: ${op.error.message || JSON.stringify(op.error)}`);
      const uri = videoUri(op);
      if (!uri) {
        const reden = JSON.stringify(op.response || {}).slice(0, 300);
        throw new Error(`geen video in het antwoord (mogelijk geweigerd door het veiligheidsfilter): ${reden}`);
      }
      const r = await haal(uri, { headers: kop, redirect: 'follow' });
      if (!r.ok) throw new Error(`downloaden mislukt: ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    },
  };
}

// Kleiner maken voor git: 1280 × 720, zonder geluid
function verklein(bron, doel) {
  const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', bron, '-an', '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=25', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', doel]);
  if (r.status !== 0) throw new Error('ffmpeg (verkleinen) mislukt');
}

// Met de hand geüploade clips (bijv. 1080p uit Flow) verkleinen tot 720p
export function verkleinGroot(map = MAP, grens = 4_000_000) {
  const gedaan = [];
  for (const f of readdirSync(map).filter((x) => x.endsWith('.mp4'))) {
    const pad = join(map, f);
    if (statSync(pad).size <= grens) continue;
    const tmp = join(tmpdir(), `klein-${f}`);
    verklein(pad, tmp);
    copyFileSync(tmp, pad);
    rmSync(tmp, { force: true });
    gedaan.push(f);
  }
  return gedaan;
}

async function main() {
  if (process.argv.includes('--verklein')) {
    const g = verkleinGroot();
    console.log(g.length ? `Verkleind: ${g.join(', ')}` : 'Niets te verkleinen');
    return;
  }
  const arg = (n) => {
    const i = process.argv.indexOf(n);
    return i > -1 ? process.argv[i + 1] : null;
  };
  const sleutel = process.env.GEMINI_API_KEY;
  const max = Number(arg('--max') || 12);
  const alleen = arg('--alleen');
  mkdirSync(MAP, { recursive: true });
  const indexPad = join(MAP, 'index.json');
  const index = existsSync(indexPad) ? JSON.parse(readFileSync(indexPad, 'utf8')) : {};
  const lijst = nogTeMaken(wensen().filter((w) => !alleen || w.naam.startsWith(`${alleen}-`)), index);
  console.log(`${lijst.length} beelden te maken${lijst.length > max ? ` (deze run: ${max})` : ''}`);
  if (process.argv.includes('--droog') || !lijst.length) {
    for (const w of lijst) console.log(`- ${w.naam}: ${w.prompt.slice(0, 110)}…`);
    return;
  }
  if (!sleutel) {
    console.log('Geen GEMINI_API_KEY: geen AI-beelden gemaakt. De video’s blijven zoals ze zijn.');
    return;
  }
  const client = maakClient({ sleutel });
  const modellen = await client.modellen();
  const model = kiesModel(modellen, arg('--model') || process.env.AI_VIDEO_MODEL || null);
  if (!model) {
    console.log('Geen videomodel beschikbaar voor deze sleutel. Beschikbaar met predictLongRunning:');
    for (const m of modellen.filter((x) => (x.supportedGenerationMethods || []).includes('predictLongRunning'))) console.log(`- ${m.name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Model: ${model}`);
  let gemaakt = 0;
  let fouten = 0;
  for (const w of lijst.slice(0, max)) {
    try {
      const ruw = join(tmpdir(), `${w.naam}-ruw.mp4`);
      writeFileSync(ruw, await client.maak(model, w.prompt));
      verklein(ruw, join(MAP, `${w.naam}.mp4`));
      rmSync(ruw, { force: true });
      index[w.naam] = { hash: w.hash, model, gemaakt: new Date().toISOString().slice(0, 10) };
      writeFileSync(indexPad, JSON.stringify(index, null, 1) + '\n');
      gemaakt++;
      console.log(`✓ ${w.naam}`);
    } catch (e) {
      fouten++;
      console.log(`✗ ${w.naam}: ${e.message}`);
      // Sleutel of tegoed fout: stoppen in plaats van alles te proberen
      if (/API (400|401|403|429)/.test(e.message) && /key|quota|billing|permission|exhausted/i.test(e.message)) break;
    }
  }
  console.log(`${gemaakt} gemaakt, ${fouten} mislukt`);
  if (!gemaakt && fouten) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
