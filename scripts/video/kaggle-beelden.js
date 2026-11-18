// Gratis AI-beelden: het open-source model Wan 2.1 op de gratis GPU van Kaggle.
// GitHub Actions (.github/workflows/ai-beelden.yml) doet:
//   node scripts/video/kaggle-beelden.js voorbereid --gebruiker <naam> --map /tmp/kernel [--max 10]
//   kaggle kernels push -p /tmp/kernel   … wachten …   kaggle kernels output … -p /tmp/uit
//   node scripts/video/kaggle-beelden.js verwerk --uit /tmp/uit
// Alleen beelden die ontbreken of waarvan de prompt veranderde; met de hand
// toegevoegde clips (bijv. uit Google Flow) blijven altijd staan.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { MAP, wensen, nogTeMaken } from './ai-beelden.js';
import { NEGATIEF } from './uitleg-scenes.js';

const HIER = dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
export const SLUG = 'toeslagbuddy-ai-beelden';
export const MODEL = 'wan2.1-t2v-1.3b';

export function metadata(gebruiker) {
  if (!/^[a-z0-9][a-z0-9-]{1,49}$/i.test(gebruiker || '')) throw new Error('ongeldige Kaggle-gebruikersnaam');
  return {
    id: `${gebruiker}/${SLUG}`,
    title: SLUG,
    code_file: 'beelden.py',
    language: 'python',
    kernel_type: 'script',
    is_private: true,
    enable_gpu: true,
    enable_tpu: false,
    enable_internet: true,
    dataset_sources: [],
    competition_sources: [],
    kernel_sources: [],
    model_sources: [],
  };
}

// Vult het Kaggle-script met de prompts. JSON in een r'''…'''-blok: we
// weigeren ''' in de tekst, zodat het blok niet kan worden afgebroken.
export function script(lijst, sjabloon = readFileSync(join(HIER, 'kaggle/beelden.py'), 'utf8')) {
  const json = JSON.stringify(lijst.map(({ naam, prompt, hash }) => ({ naam, prompt, hash })));
  if (json.includes("'''") || NEGATIEF.includes("'''")) throw new Error("''' in een prompt");
  return sjabloon.replace('__WENSEN__', json).replace('__NEGATIEF__', NEGATIEF);
}

function leesIndex() {
  const p = join(MAP, 'index.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}

function voorbereid({ gebruiker, map, max }) {
  const lijst = nogTeMaken(wensen(), leesIndex()).slice(0, max);
  mkdirSync(map, { recursive: true });
  writeFileSync(join(map, 'kernel-metadata.json'), JSON.stringify(metadata(gebruiker), null, 1));
  writeFileSync(join(map, 'beelden.py'), script(lijst));
  console.log(`${lijst.length} beelden klaargezet: ${lijst.map((w) => w.naam).join(', ') || '(niets)'}`);
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `aantal=${lijst.length}\n`, { flag: 'a' });
}

// 832×480, 5 s → 1280×720, 10 s: heen en terug afspelen (geen zichtbare sprong)
export const VERWERK_FILTER = 'scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720,fps=25,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p';

function verwerk({ uit }) {
  const logPad = join(uit, 'log.json');
  if (!existsSync(logPad)) throw new Error('geen log.json in de uitvoer van Kaggle');
  const log = JSON.parse(readFileSync(logPad, 'utf8'));
  const index = leesIndex();
  mkdirSync(MAP, { recursive: true });
  let n = 0;
  for (const k of log.klaar || []) {
    const bron = join(uit, `${k.naam}.mp4`);
    if (!/^[a-z]+-\d+$/.test(k.naam) || !existsSync(bron)) continue;
    const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', bron, '-an', '-filter_complex', VERWERK_FILTER, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-movflags', '+faststart', join(MAP, `${k.naam}.mp4`)], { stdio: 'inherit' });
    if (r.status !== 0) {
      console.log(`✗ ${k.naam}: ffmpeg mislukt`);
      continue;
    }
    index[k.naam] = { hash: k.hash, model: MODEL, gemaakt: new Date().toISOString().slice(0, 10) };
    n++;
    console.log(`✓ ${k.naam} (${k.seconden} s op ${log.gpu}, ${log.dtype})`);
  }
  for (const [naam, fout] of Object.entries(log.mislukt || {})) console.log(`✗ ${naam}: ${fout}`);
  writeFileSync(join(MAP, 'index.json'), JSON.stringify(index, null, 1) + '\n');
  console.log(`${n} beelden verwerkt`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n) => {
    const i = process.argv.indexOf(n);
    return i > -1 ? process.argv[i + 1] : null;
  };
  const opdracht = process.argv[2];
  if (opdracht === 'voorbereid') voorbereid({ gebruiker: arg('--gebruiker'), map: arg('--map'), max: Number(arg('--max') || 10) });
  else if (opdracht === 'verwerk') verwerk({ uit: arg('--uit') });
  else {
    console.error('Gebruik: voorbereid --gebruiker <naam> --map <map> [--max n] | verwerk --uit <map>');
    process.exit(2);
  }
}
