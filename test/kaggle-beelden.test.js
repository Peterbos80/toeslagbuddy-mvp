// Gratis AI-beelden via Kaggle: metadata van de kernel en het gevulde script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metadata, script, SLUG } from '../scripts/video/kaggle-beelden.js';

test('kernel: privé, met GPU en internet, alleen een nette gebruikersnaam', () => {
  const m = metadata('peter-b80');
  assert.equal(m.id, `peter-b80/${SLUG}`);
  assert.equal(m.is_private, true);
  assert.equal(m.enable_gpu, true);
  assert.equal(m.enable_internet, true);
  assert.equal(m.code_file, 'beelden.py');
  for (const fout of ['', 'a', '../x', 'naam met spatie', 'x;rm -rf /']) assert.throws(() => metadata(fout), /gebruikersnaam/);
});

test('script: prompts als JSON ingevuld, geen ruimte om uit het blok te breken', () => {
  const sjabloon = "WENSEN = json.loads(r'''__WENSEN__''')\nNEGATIEF = r'''__NEGATIEF__'''\n";
  const s = script([{ naam: 'familie-1', prompt: 'A kitchen table', hash: 'abc', extra: 'weg' }], sjabloon);
  assert.match(s, /\[\{"naam":"familie-1","prompt":"A kitchen table","hash":"abc"\}\]/);
  assert.doesNotMatch(s, /__WENSEN__|__NEGATIEF__|"extra"/);
  assert.throws(() => script([{ naam: 'a-1', prompt: "x''' ; import os", hash: 'h' }], sjabloon), /'''/);
});
