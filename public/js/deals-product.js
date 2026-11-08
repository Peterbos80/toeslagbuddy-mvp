// Productpagina: prijsalarm instellen (bewaard in de volglijst)
import { volg } from './deals-opslag.js';
import { bedrag } from './aanbod.js';
import { euroTekst } from './deals-weergave.js';

const form = document.querySelector('[data-alarm]');
if (form) {
  const schuif = form.querySelector('[name=minKorting]');
  const uit = form.querySelector('[data-alarm-uit]');
  const prijsTekst = form.querySelector('[data-alarm-prijs]');
  const status = form.querySelector('[data-alarm-status]');
  const gangbaar = Number(form.dataset.gangbaar) || null;
  const bij = () => {
    uit.textContent = schuif.value;
    prijsTekst.textContent = gangbaar ? `Dat is ${euroTekst(gangbaar * (1 - schuif.value / 100))} of minder (gangbaar: ${euroTekst(gangbaar)}).` : 'Er is nog geen gangbare prijs; je alarm gaat af zodra die er is.';
  };
  schuif.addEventListener('input', bij);
  bij();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const maxRuw = form.querySelector('[name=maxPrijs]').value.trim();
    const max = maxRuw ? bedrag(maxRuw) : null;
    if (maxRuw && !(max > 0)) {
      status.textContent = 'Vul een geldig bedrag in, bijvoorbeeld 49,95.';
      status.dataset.soort = 'fout';
      return;
    }
    volg({ type: 'product', waarde: form.dataset.id, titel: form.dataset.titel, minKorting: Number(schuif.value), maxPrijs: max });
    status.dataset.soort = 'ok';
    status.textContent = 'Bewaard in je volglijst.';
    const a = document.createElement('a');
    a.href = '/deals/volglijst/';
    a.textContent = ' Bekijk je volglijst';
    status.append(a);
  });
}
