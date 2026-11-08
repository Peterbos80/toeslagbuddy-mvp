// Interactieve prijsgrafiek op de productpagina: periode kiezen, winkels
// aan/uit, tooltip met de prijzen per winkel (muis, aanraken en pijltjestoetsen).
import { grafiekMeerSvg, schaal, prijzenOp, PERIODES, MAAT_SMAL } from './grafiek.js';
import { esc, euroTekst, datumTekst } from './deals-weergave.js';

const DAG = 864e5;
for (const kader of document.querySelectorAll('[data-pg]')) {
  let data;
  try {
    data = JSON.parse(kader.querySelector('[data-pg-data]').textContent);
  } catch {
    continue;
  }
  const teken = kader.querySelector('[data-pg-teken]');
  const tip = kader.querySelector('[data-pg-tip]');
  let dagen = 90;
  let verborgen = [];
  let cursor = null; // ms van de gekozen dag

  // Op een telefoon een hogere grafiek met grotere letters
  const smal = () => teken.clientWidth < 560;
  const s = () => schaal(data, { dagen, verborgen, ...(smal() ? MAAT_SMAL : {}) });
  function opnieuw() {
    teken.innerHTML = grafiekMeerSvg(data, { dagen, verborgen, smal: smal() });
    if (cursor !== null) toonTip(cursor);
  }

  function toonTip(ms) {
    const sc = s();
    cursor = Math.min(sc.eind, Math.max(sc.begin, Math.round(ms / DAG) * DAG));
    const datum = new Date(cursor).toISOString().slice(0, 10);
    const prijzen = prijzenOp(data, datum, verborgen);
    const lijn = teken.querySelector('.pg-cursor');
    const x = sc.x(cursor);
    if (lijn) {
      lijn.setAttribute('x1', x);
      lijn.setAttribute('x2', x);
      lijn.setAttribute('visibility', 'visible');
    }
    tip.innerHTML = `<p class="pg-tip-datum">${esc(datumTekst(datum, true))}</p><ul>${prijzen
      .map((p) => `<li><span class="pg-stip pg-kleur-${p.kleur}" aria-hidden="true"></span>${esc(p.winkel)} <strong>${esc(euroTekst(p.totaal))}</strong><small>${p.verzending === null ? 'verzending onbekend' : p.verzending ? `incl. ${esc(euroTekst(p.verzending))} verzending` : 'gratis verzending'}</small></li>`)
      .join('')}</ul>`;
    tip.hidden = false;
    // Tooltip naast de cursor, binnen het kader
    const breedte = teken.getBoundingClientRect().width;
    const px = (x / sc.B) * breedte;
    tip.style.left = `${Math.max(0, Math.min(breedte - tip.offsetWidth, px > breedte / 2 ? px - tip.offsetWidth - 12 : px + 12))}px`;
  }
  function verberg() {
    cursor = null;
    tip.hidden = true;
    teken.querySelector('.pg-cursor')?.setAttribute('visibility', 'hidden');
  }
  const naarMs = (e) => {
    const svg = teken.querySelector('svg');
    const r = svg.getBoundingClientRect();
    const sc = s();
    const vx = ((e.clientX - r.left) / r.width) * sc.B;
    return sc.begin + ((vx - sc.L) / (sc.B - sc.L - sc.R)) * (sc.eind - sc.begin);
  };

  if (smal()) opnieuw();
  teken.addEventListener('pointermove', (e) => toonTip(naarMs(e)));
  teken.addEventListener('pointerdown', (e) => toonTip(naarMs(e)));
  teken.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && verberg());
  teken.tabIndex = 0;
  teken.setAttribute('aria-describedby', 'pg-tip');
  teken.addEventListener('keydown', (e) => {
    const sc = s();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      toonTip((cursor ?? sc.eind) + (e.key === 'ArrowLeft' ? -DAG : DAG));
    } else if (e.key === 'Escape') verberg();
  });
  teken.addEventListener('blur', verberg);

  for (const b of kader.querySelectorAll('[data-periode]')) {
    b.addEventListener('click', () => {
      dagen = PERIODES.find(([k]) => k === b.dataset.periode)[2];
      kader.querySelectorAll('[data-periode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      verberg();
      opnieuw();
    });
  }
  for (const b of kader.querySelectorAll('[data-winkel]')) {
    b.addEventListener('click', () => {
      const w = b.dataset.winkel;
      const aan = b.getAttribute('aria-pressed') === 'true';
      // Minstens één winkel blijft zichtbaar
      if (aan && data.winkels.length - verborgen.length <= 1) return;
      verborgen = aan ? [...verborgen, w] : verborgen.filter((x) => x !== w);
      b.setAttribute('aria-pressed', String(!aan));
      opnieuw();
    });
  }
}
