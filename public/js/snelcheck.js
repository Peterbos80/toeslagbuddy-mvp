// Snelcheck "Kan ik recht hebben?" op de startpagina. Werkt live bij elke keuze;
// "Reken precies uit" vult de volledige check alvast in en springt ernaartoe.
import { snelcheck } from './snelcheck-motor.js';
import { teksten, paginaTaal } from './i18n.js';

const T = teksten(paginaTaal()).site.snelcheck;
const blok = document.querySelector('[data-snelcheck]');

if (blok) {
  const form = blok.querySelector('form');
  const uit = blok.querySelector('[data-sc-uitkomst]');
  const opvang = blok.querySelector('[data-sc-opvang]');
  const inkomenKop = blok.querySelector('[data-sc-inkomen]');
  blok.hidden = false;

  const antwoorden = () => {
    const fd = new FormData(form);
    return {
      partner: fd.get('partner'),
      klasse: fd.get('klasse'),
      huurt: fd.get('huurt') === 'ja',
      kinderen: fd.get('kinderen') === 'ja',
      opvang: fd.get('opvang') === 'ja',
    };
  };

  const toon = () => {
    const a = antwoorden();
    inkomenKop.textContent = T.inkomen(a.partner === 'ja');
    opvang.hidden = !a.kinderen;
    if (!a.kinderen) opvang.querySelector('input').checked = false;
    if (!a.partner || a.klasse === null) {
      uit.innerHTML = `<p class="sc-leeg">${T.leeg}</p>`;
      return;
    }
    const lijst = snelcheck({ ...a, partner: a.partner === 'ja', klasse: Number(a.klasse) });
    uit.innerHTML = `<h3>${T.uitkomstKop}</h3>
<ul class="sc-lijst">${lijst.map((r) => `<li class="sc-${r.kans}"><a href="${T.urls[r.id]}"><span class="sc-naam">${T.namen[r.id]}</span><span class="sc-kans">${T.kans[r.kans]}</span></a></li>`).join('')}</ul>
<p><a class="knop" href="#check" data-sc-verder>${T.verder} →</a></p>
<p class="sc-voet">${T.voet}</p>`;
  };

  // De volledige check alvast invullen met wat we al weten
  const vulIn = () => {
    const a = antwoorden();
    const check = document.querySelector('form[data-calc=alles]');
    if (!check) return;
    const zet = (name, waarde) => {
      const r = check.querySelector(`[name=${name}][value=${waarde}]`);
      if (r && !r.checked) {
        r.checked = true;
        r.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    if (a.partner) zet('partner', a.partner);
    zet('huurt', a.huurt ? 'ja' : 'nee');
    const kids = check.querySelector('[name=aantalKinderen]');
    if (kids && a.kinderen && !(Number(kids.value) > 0)) {
      kids.value = '1';
      kids.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (a.opvang) zet('gebruiktOpvang', 'ja');
  };

  form.addEventListener('change', toon);
  uit.addEventListener('click', (e) => {
    if (e.target.closest('[data-sc-verder]')) vulIn();
  });
  toon();
}
