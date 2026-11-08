// /deals/volglijst/: alles wat je volgt, met de status tegenover je drempel.
// Exporteren en importeren als JSON.
import { leesVolglijst, bewaarVolglijst, ontvolg, laadDeals } from './deals-opslag.js';
import { regelStatus, normaliseerRegel } from './alarm.js';
import { esc, euroTekst, procentTekst, maandTekst } from './deals-weergave.js';
import { download } from './dom.js';

const doel = document.querySelector('[data-volglijst]');
const status = document.querySelector('[data-volg-status]');
const STATUS = { gehaald: 'Drempel gehaald!', wachten: 'Nog niet onder je drempel', 'geen-aanbod': 'Nu geen aanbod gevonden', ongeldig: 'Ongeldige regel' };
const TYPE = { product: 'Product', categorie: 'Categorie', zoekterm: 'Zoekwoord', vlucht: 'Vlucht' };

async function toon() {
  const lijst = leesVolglijst();
  const { deals = [] } = await laadDeals();
  if (!lijst.length) {
    doel.innerHTML = '<p class="geen-resultaat">Je volgt nog niets. Klik bij een deal op <strong>Volg</strong>, of zet een alarm op een productpagina. <a href="/deals/">Naar de deals</a></p>';
    return;
  }
  doel.innerHTML = lijst
    .map((r) => {
      const s = regelStatus(r, deals);
      const b = s.beste;
      const drempel = [r.minKorting ? `≥ ${r.minKorting}% onder gangbaar` : null, r.maxPrijs ? `max. ${euroTekst(r.maxPrijs)}` : null, r.maand ? maandTekst(r.maand) : null].filter(Boolean).join(' · ') || 'elke prijs';
      return `<article class="volg-item" data-volg-item="${esc(r.type)}:${esc(r.waarde)}">
<div><p class="hint">${esc(TYPE[r.type] || r.type)}</p><h3>${b ? `<a href="${esc(b.pagina)}">${esc(r.titel || b.titel)}</a>` : esc(r.titel || r.waarde)}</h3>
<p>Jouw drempel: ${esc(drempel)}</p>
<p>${b ? `Nu: <strong>${esc(euroTekst(b.totaal))}</strong> bij ${esc(b.winkel)} · gangbaar ${esc(euroTekst(b.gangbaar))} · echte korting ${esc(procentTekst(b.echteKorting))}` : ''}</p>
<p class="volg-status" data-status="${esc(s.status)}">${esc(STATUS[s.status])}</p></div>
<button type="button" class="knop-licht" data-weg="${esc(r.type)}|${esc(r.waarde)}">Niet meer volgen</button>
</article>`;
    })
    .join('');
}

if (doel) {
  doel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-weg]');
    if (!b) return;
    const [type, waarde] = b.dataset.weg.split('|');
    ontvolg(type, waarde);
    toon();
  });
  document.querySelector('[data-export]')?.addEventListener('click', () => {
    download(`dealbuddy-volglijst-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ soort: 'dealbuddy-volglijst', versie: 1, regels: leesVolglijst() }, null, 2), 'application/json');
    status.textContent = 'Volglijst geëxporteerd.';
  });
  document.querySelector('[data-import]')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const nieuw = (Array.isArray(j) ? j : j.regels || []).map(normaliseerRegel).filter(Boolean);
      if (!nieuw.length) throw new Error('leeg');
      const bestaand = leesVolglijst();
      const sleutel = (r) => `${r.type}|${r.waarde}`;
      const samen = [...nieuw, ...bestaand.filter((r) => !nieuw.some((n) => sleutel(n) === sleutel(r)))];
      bewaarVolglijst(samen);
      status.textContent = `${nieuw.length} regel(s) geïmporteerd.`;
      toon();
    } catch {
      status.textContent = 'Dit bestand kan ik niet lezen. Kies een export van DealBuddy.';
    }
    e.target.value = '';
  });
  toon();
}
