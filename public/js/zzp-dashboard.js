// Mijn toeslagbewaker: maandelijkse checks bewaren op dit apparaat (localStorage).
// Geen account nodig; exporteren/importeren om naar een ander apparaat te verhuizen.
import { euro } from './toeslagen.js';

const SLEUTEL = 'toeslagbuddy-zzp-v1';
const sectie = document.getElementById('mijn-overzicht');
let laatste = null;

function lees() {
  try {
    const d = JSON.parse(localStorage.getItem(SLEUTEL) || '[]');
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}
function schrijf(lijst) {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(lijst));
    return true;
  } catch {
    return false;
  }
}

// Privévenster of geblokkeerde opslag (Safari): rekenen werkt, bewaren niet (R2)
function opslagWerkt() {
  try {
    const k = `${SLEUTEL}-test`;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function toon() {
  if (!sectie) return;
  sectie.hidden = false;
  if (!opslagWerkt()) {
    sectie.querySelector('[data-overzicht]').innerHTML =
      '<p class="melding" data-opslag-uit>Opslaan is niet mogelijk in deze browser, bijvoorbeeld in een privévenster. De check hierboven werkt wel. Wil je je checks bewaren? Open de pagina in een gewoon venster.</p>';
    sectie.querySelectorAll('[data-export], [data-wis], [data-import]').forEach((el) => (el.closest('label') || el).setAttribute('hidden', ''));
    return;
  }
  const lijst = lees();
  const rijen = lijst
    .slice()
    .reverse()
    .map(
      (x) => `<tr><th scope="row">${new Date(x.datum).toLocaleDateString('nl-NL')}</th><td>${euro(x.winstTotNu)} (t/m mnd ${x.maand})</td><td>${euro(x.verwachtInkomen)}</td><td>${euro(x.opgegeven)}</td><td>${x.verschil > 0 ? '+' : ''}${euro(x.verschil)}</td></tr>`,
    )
    .join('');
  sectie.querySelector('[data-overzicht]').innerHTML = lijst.length
    ? `<div class="tabel-scroll"><table><thead><tr><th>Datum</th><th>Winst tot dan</th><th>Verwacht inkomen</th><th>Opgegeven</th><th>Verschil toeslag/jaar</th></tr></thead><tbody>${rijen}</tbody></table></div>`
    : '<p class="subtiel">Nog niets bewaard. Doe de check hierboven en klik op “Bewaar deze check”.</p>';
}

document.addEventListener('tb:zzp-resultaat', (e) => {
  laatste = e.detail;
  const uitkomst = document.querySelector('form[data-calc=zzp] + [data-result] .resultaat');
  if (uitkomst && !uitkomst.querySelector('[data-bewaar]') && opslagWerkt()) {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'knop-licht';
    knop.dataset.bewaar = '';
    knop.textContent = '💾 Bewaar deze check op dit apparaat';
    uitkomst.appendChild(knop);
  }
});

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-bewaar]') && laatste) {
    const { invoer, uitkomst } = laatste;
    const lijst = lees();
    lijst.push({
      datum: new Date().toISOString(),
      maand: invoer.maand,
      winstTotNu: invoer.winstTotNu,
      verwachtInkomen: uitkomst.verwachtInkomen,
      opgegeven: invoer.opgegevenInkomen,
      verschil: uitkomst.verschilJaar,
    });
    const ok = schrijf(lijst);
    e.target.closest('[data-bewaar]').textContent = ok ? '✓ Bewaard' : 'Bewaren lukt niet in deze browser (privémodus?)';
    toon();
  }
  if (e.target.closest('[data-export]')) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(lees(), null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'mijn-toeslagbewaker.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  if (e.target.closest('[data-wis]') && confirm('Alle bewaarde checks van dit apparaat verwijderen?')) {
    schrijf([]);
    toon();
  }
});

document.querySelector('[data-import]')?.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const nieuw = JSON.parse(await f.text());
    if (!Array.isArray(nieuw)) throw new Error();
    const gezien = new Set(lees().map((x) => x.datum));
    schrijf([...lees(), ...nieuw.filter((x) => x && x.datum && !gezien.has(x.datum))].sort((a, b) => a.datum.localeCompare(b.datum)));
    toon();
  } catch {
    alert('Dit bestand kan niet worden ingelezen.');
  }
});

toon();
