// /deals/: filteren op zoekwoord, categorie en minimale echte korting,
// sorteren, teller bijwerken en producten volgen. De kaarten staan al in de
// HTML (voorgerenderd), dus filteren is direct.
import { volg, ontvolg, isGevolgd } from './deals-opslag.js';

const form = document.querySelector('[data-filter]');
const raster = document.querySelector('[data-raster]');
if (form && raster) {
  const kaarten = [...raster.querySelectorAll('.deal-kaart')];
  const origineel = kaarten.slice();
  const zoek = form.querySelector('[name=q]');
  const min = form.querySelector('[name=min]');
  const minUit = form.querySelector('[data-min-uit]');
  const sorteer = form.querySelector('[name=sorteer]');
  const chips = [...form.querySelectorAll('[data-cat]')];
  const teller = document.querySelector('[data-teller]');
  const tellerTekst = document.querySelector('[data-teller-tekst]');
  const leeg = document.querySelector('[data-leeg]');
  const echtEl = document.querySelector('[data-teller-echt]');
  let cat = chips.find((c) => c.getAttribute('aria-pressed') === 'true')?.dataset.cat || '';

  const prijs = (k) => parseFloat(k.querySelector('.totaal')?.textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

  function toon() {
    const woorden = zoek.value.toLowerCase().split(/\s+/).filter(Boolean);
    const drempel = Number(min.value);
    minUit.textContent = String(drempel);
    let n = 0;
    let echt = 0;
    for (const k of kaarten) {
      const ok = (!cat || k.dataset.categorie === cat) && Number(k.dataset.korting) >= drempel && woorden.every((w) => k.dataset.zoek.includes(w));
      k.hidden = !ok;
      if (ok) n++;
      if (ok && Number(k.dataset.korting) >= 10 && !('nep' in k.dataset)) echt++;
    }
    if (echtEl) echtEl.textContent = String(echt);
    teller.textContent = String(n);
    tellerTekst.textContent = n === 1 ? 'deal gevonden' : 'deals gevonden';
    leeg.hidden = n > 0;
    const volgorde =
      sorteer.value === 'korting' ? kaarten.slice().sort((a, b) => b.dataset.korting - a.dataset.korting) : sorteer.value === 'prijs' ? kaarten.slice().sort((a, b) => prijs(a) - prijs(b)) : origineel;
    raster.append(...volgorde);
  }

  chips.forEach((c) =>
    c.addEventListener('click', () => {
      cat = c.dataset.cat;
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      toon();
    }),
  );
  zoek.addEventListener('input', toon);
  min.addEventListener('input', toon);
  sorteer.addEventListener('change', toon);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    toon();
  });

  // Volgen (standaard: alarm bij 20% onder de gangbare prijs)
  for (const b of raster.querySelectorAll('[data-volg]')) {
    const zet = () => {
      const aan = isGevolgd(b.dataset.type, b.dataset.type === 'vlucht' ? b.dataset.volg.toUpperCase() : b.dataset.volg);
      b.setAttribute('aria-pressed', String(aan));
      b.textContent = aan ? 'Gevolgd ✓' : 'Volg';
    };
    zet();
    b.addEventListener('click', () => {
      const waarde = b.dataset.volg;
      if (b.getAttribute('aria-pressed') === 'true') ontvolg(b.dataset.type, b.dataset.type === 'vlucht' ? waarde.toUpperCase() : waarde);
      else volg({ type: b.dataset.type, waarde, minKorting: 20, titel: b.dataset.titel });
      zet();
    });
  }
  toon();
}
