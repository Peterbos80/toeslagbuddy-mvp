// Kleine DOM-hulp zonder innerHTML: tekst wordt altijd als tekst gezet,
// zodat gegevens uit de database nooit als HTML worden uitgevoerd.

// el('p', { class: 'x' }, 'tekst', el('strong', {}, 'vet'))
export function el(tag, attrs = {}, ...kinderen) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const k of kinderen.flat()) {
    if (k === null || k === undefined || k === false) continue;
    e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return e;
}

// Tabel met kopregel in een scrollvak (met toetsenbord te bereiken, WCAG).
// Cellen zijn tekst of elementen.
export const scrollVak = (label, ...inhoud) => el('div', { class: 'tabel-scroll', tabindex: '0', role: 'region', 'aria-label': label }, ...inhoud);

export function tabel(koppen, rijen, label = 'Tabel') {
  return scrollVak(
    label,
    el(
      'table',
      {},
      el('thead', {}, el('tr', {}, koppen.map((k) => el('th', { scope: 'col' }, k)))),
      el('tbody', {}, rijen.map((r) => el('tr', {}, r.map((c) => el('td', {}, c))))),
    ),
  );
}

export const datumNl = (iso, metTijd = false) => {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d)) return '–';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', ...(metTijd ? { hour: '2-digit', minute: '2-digit' } : {}) });
};

export const euroNl = (n) => (n === null || n === undefined ? '–' : `€ ${Math.round(n).toLocaleString('nl-NL')}`);

export function download(naam, inhoud, type) {
  const url = URL.createObjectURL(new Blob([inhoud], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: naam });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function melding(elm, tekst, soort) {
  if (!elm) return;
  elm.textContent = tekst;
  elm.dataset.soort = soort;
}
