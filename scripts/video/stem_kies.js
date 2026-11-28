// Kiest per fragment de beste stem: de natuurlijke (Chatterbox) als die er is
// en minstens zo natuurlijk klinkt als Piper volgens UTMOS, anders Piper.
//   node scripts/video/stem_kies.js opdracht <teksten.json> <stem-map> <nat-map>   → opdracht.json voor stem_natuurlijk.py
//   node scripts/video/stem_kies.js kies <stem-map> <nat-map>                      → kopieert de beste naar <stem-map>
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

export function opdracht(teksten, stemMap, natMap) {
  return Object.entries(teksten).map(([naam, tekst]) => ({ tekst, referentie: join(stemMap, 'referentie.wav'), uit: join(natMap, `${naam}.wav`) }));
}

// score: { mos, mos_referentie } uit stem_natuurlijk.py; zonder meting vertrouwen we Chatterbox
export function beter(score) {
  if (!score) return false;
  if (score.mos == null || score.mos_referentie == null) return true;
  return score.mos >= score.mos_referentie - 0.05;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , wat, ...rest] = process.argv;
  if (wat === 'opdracht') {
    const [tekstenPad, stemMap, natMap] = rest;
    writeFileSync(join(natMap, 'opdracht.json'), JSON.stringify(opdracht(JSON.parse(readFileSync(tekstenPad, 'utf8')), stemMap, natMap), null, 1));
  } else if (wat === 'kies') {
    const [stemMap, natMap] = rest;
    const teksten = JSON.parse(readFileSync(join(natMap, 'opdracht.json'), 'utf8'));
    let nat = 0;
    for (const { uit } of teksten) {
      const naam = uit.split('/').pop();
      const score = existsSync(`${uit}.json`) ? JSON.parse(readFileSync(`${uit}.json`, 'utf8')) : null;
      if (existsSync(uit) && beter(score)) {
        copyFileSync(uit, join(stemMap, naam));
        nat++;
      }
      console.log(`${naam}: ${existsSync(uit) && beter(score) ? 'natuurlijk' : 'piper'} ${score ? `(mos ${score.mos} tegen ${score.mos_referentie})` : ''}`);
    }
    const stem = JSON.parse(readFileSync(join(stemMap, 'stem.json'), 'utf8'));
    stem.stem = nat ? `chatterbox (${nat}/${teksten.length}), referentie ${stem.stem}` : stem.stem;
    writeFileSync(join(stemMap, 'stem.json'), JSON.stringify(stem));
    console.log(`${nat} van ${teksten.length} fragmenten met de natuurlijke stem`);
  }
}
