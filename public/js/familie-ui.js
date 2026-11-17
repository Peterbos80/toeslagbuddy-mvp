// Gedeelde hulp voor de Familie-scripts: veilig HTML opbouwen, bedragen,
// datums en iconen. Alles wat een gebruiker invult, wordt automatisch
// ge-escaped; alleen wat met rauw() is gemarkeerd, gaat als HTML door.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

class Rauw {
  constructor(s) {
    this.s = String(s);
  }
  toString() {
    return this.s;
  }
}
export const rauw = (s) => new Rauw(s);
const waarde = (v) => (v instanceof Rauw ? v.s : Array.isArray(v) ? v.map(waarde).join('') : v === null || v === undefined || v === false ? '' : esc(v));

// h`<b>${naam}</b>` → Rauw met ge-escapete invoer
export function h(delen, ...waarden) {
  return new Rauw(delen.reduce((uit, deel, i) => uit + deel + (i < waarden.length ? waarde(waarden[i]) : ''), ''));
}

export const icoon = (naam, klasse = '') => rauw(`<svg class="ico${klasse ? ` ${esc(klasse)}` : ''}" aria-hidden="true" focusable="false"><use href="/img/iconen.svg#${esc(naam)}"/></svg>`);

export const euro = (n, decimalen = 2) => `€ ${Number(n).toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen })}`;
export const centen = (c) => euro(c / 100);

// "1.234,56" / "1234.56" / "€ 12" → getal, of null
export function getal(invoer) {
  const s = String(invoer ?? '').replace(/[€\s]/g, '');
  if (!s) return null;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const maandNaam = (m) => MAANDEN[m];
export function datumTekst(iso, { jaar = true, kort = false } = {}) {
  if (!iso) return '';
  const [j, m, d] = iso.slice(0, 10).split('-').map(Number);
  const naam = kort ? MAANDEN[m - 1].slice(0, 3) : MAANDEN[m - 1];
  return `${d} ${naam}${jaar ? ` ${j}` : ''}`;
}
export const vandaagIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "over 6 dagen", "vandaag", "3 dagen geleden"
export function overTekst(dagen) {
  if (dagen === 0) return 'vandaag';
  if (dagen === 1) return 'morgen';
  if (dagen === -1) return 'gisteren';
  if (dagen < 0) return `${-dagen} dagen geleden`;
  if (dagen < 60) return `over ${dagen} dagen`;
  if (dagen < 730) return `over ${Math.round(dagen / 30.4)} maanden`;
  return `over ${Math.round(dagen / 365)} jaar`;
}

// Regels en bronnen die build.js in de pagina heeft gezet
export function leesJson(id, anders = null) {
  try {
    return JSON.parse(document.getElementById(id)?.textContent || 'null') ?? anders;
  } catch {
    return anders;
  }
}

export const bronLabel = (bron, tekst) => (bron && bron.url ? h`<a class="f-bron" href="${bron.url}" rel="noopener" target="_blank">${icoon('bron')}${tekst || bron.naam}</a>` : bron ? h`<span class="f-bron">${icoon('bron')}${tekst || bron.naam}</span>` : '');
