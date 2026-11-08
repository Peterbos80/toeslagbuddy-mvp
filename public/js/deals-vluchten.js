// /deals/vluchten/: route en maand kiezen, prijskalender tonen, route volgen.
// Data: /deals/data/vluchten.json (alles al uitgerekend in de build).
import { vluchtResultaat, maandTekst, esc } from './deals-weergave.js';
import { volg } from './deals-opslag.js';

const form = document.querySelector('[data-vluchten]');
const uit = document.querySelector('[data-vlucht-resultaat]');
if (form && uit) {
  const van = form.querySelector('[name=van]');
  const naar = form.querySelector('[name=naar]');
  const maand = form.querySelector('[name=maand]');
  let data = { routes: [] };
  const route = () => data.routes.find((r) => r.van === van.value && r.naar === naar.value);

  function maanden() {
    const r = route();
    const oud = maand.value;
    maand.innerHTML = r ? r.maanden.map((m) => `<option value="${esc(m.maand)}">${esc(maandTekst(m.maand))}</option>`).join('') : '';
    if (r?.maanden.some((m) => m.maand === oud)) maand.value = oud;
    maand.disabled = !r;
  }
  function toon() {
    const r = route();
    if (!r) {
      uit.innerHTML = `<p class="geen-resultaat">Deze route volgen we (nog) niet. Kies een andere bestemming.</p>`;
      return;
    }
    const m = r.maanden.find((x) => x.maand === maand.value) || r.maanden[0];
    uit.innerHTML = vluchtResultaat(r, m, Date.parse(data.bijgewerkt) || Date.now());
    const q = new URLSearchParams({ route: r.route, maand: m.maand });
    history.replaceState(null, '', `?${q}`);
  }
  uit.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vlucht-alarm]');
    if (!b) return;
    volg({ type: 'vlucht', waarde: b.dataset.route, maand: b.dataset.maand, minKorting: 20, titel: `${b.dataset.titel} (${maandTekst(b.dataset.maand)})` });
    const s = uit.querySelector('[data-vlucht-status]');
    if (s) s.textContent = 'Gevolgd ✓ – staat in je volglijst.';
    b.disabled = true;
  });
  van.addEventListener('change', () => (maanden(), toon()));
  naar.addEventListener('change', () => (maanden(), toon()));
  maand.addEventListener('change', toon);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    toon();
  });
  fetch('/deals/data/vluchten.json')
    .then((r) => r.json())
    .then((j) => {
      data = j;
      const q = new URLSearchParams(location.search);
      const [qv, qn] = (q.get('route') || '').split('-');
      if (qv && data.routes.some((r) => r.van === qv && r.naar === qn)) {
        van.value = qv;
        naar.value = qn;
      }
      maanden();
      if (q.get('maand')) maand.value = q.get('maand');
      if (q.get('route')) toon();
    })
    .catch(() => {
      /* zonder data blijft het voorgerenderde resultaat staan */
    });
}
