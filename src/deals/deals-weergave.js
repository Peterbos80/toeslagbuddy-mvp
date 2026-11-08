import { plaats } from './vluchten.js';

// HTML en SVG voor DealBuddy, gedeeld door de build (voorgerenderde pagina's)
// en de browser (live zoeken, vluchtkalender, volglijst). Alles wat uit een
// bron komt gaat door esc(). Kleuren via CSS-klassen, zodat donkere modus werkt.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const euroTekst = (n, decimalen = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? '–' : `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen })}`;
export const procentTekst = (k) => (k === null || k === undefined ? '–' : `${Math.round(k * 100)}%`);

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MAANDEN_LANG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const datumTekst = (iso, lang = false) => {
  if (!iso) return '–';
  const [j, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${(lang ? MAANDEN_LANG : MAANDEN)[m - 1]}${lang ? ` ${j}` : ''}`;
};
export const maandTekst = (maand) => `${MAANDEN_LANG[+maand.slice(5, 7) - 1]} ${maand.slice(0, 4)}`;
export const tijdTekst = (iso) => {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${d.getDate()} ${MAANDEN[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const initialen = (t) =>
  String(t || '?')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

// Sparkline: klein prijsverloop met stippellijn op de gangbare prijs
export function sparklineSvg(punten, { gangbaar = null, breedte = 120, hoogte = 36 } = {}) {
  const p = (punten || []).filter(Number.isFinite);
  if (p.length < 2) return '';
  const alle = gangbaar ? [...p, gangbaar] : p;
  const min = Math.min(...alle);
  const max = Math.max(...alle);
  const y = (v) => (max === min ? hoogte / 2 : 3 + (hoogte - 6) * (1 - (v - min) / (max - min)));
  const x = (i) => (i * (breedte - 6)) / (p.length - 1) + 3;
  const lijn = p.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const label = `Prijsverloop: laagste ${euroTekst(Math.min(...p))}, hoogste ${euroTekst(Math.max(...p))}, nu ${euroTekst(p.at(-1))}`;
  return `<svg class="spark" viewBox="0 0 ${breedte} ${hoogte}" width="${breedte}" height="${hoogte}" role="img" aria-label="${esc(label)}">${
    gangbaar ? `<line class="spark-gangbaar" x1="0" x2="${breedte}" y1="${y(gangbaar).toFixed(1)}" y2="${y(gangbaar).toFixed(1)}"/>` : ''
  }<polyline class="spark-lijn" points="${lijn}"/><circle class="spark-nu" cx="${x(p.length - 1).toFixed(1)}" cy="${y(p.at(-1)).toFixed(1)}" r="3"/></svg>`;
}

// Grote prijsgrafiek (90 dagen): vlak + lijn, gangbare prijs (stippel),
// laagste prijs 30 dagen (markering) en het punt van nu.
export function grafiekSvg(reeks, { nu, gangbaar = null, laagste30 = null, huidig = null, dagen = 90, id = 'g', titel = 'Prijsverloop' }) {
  const B = 720, H = 300, L = 62, R = 18, T = 18, O = 36;
  const eind = Date.parse(new Date(nu).toISOString().slice(0, 10) + 'T00:00:00Z');
  const begin = eind - dagen * 864e5;
  const p = reeks.filter((x) => Date.parse(x.datum + 'T00:00:00Z') >= begin).map((x) => ({ t: Date.parse(x.datum + 'T00:00:00Z'), v: x.totaal }));
  if (huidig !== null && huidig !== undefined) p.push({ t: eind, v: huidig });
  if (p.length < 2) return '<p class="grafiek-leeg">Nog te weinig prijzen voor een grafiek.</p>';
  const waarden = [...p.map((x) => x.v), ...(gangbaar ? [gangbaar] : []), ...(laagste30 ? [laagste30] : [])];
  let min = Math.min(...waarden);
  let max = Math.max(...waarden);
  const marge = Math.max(1, (max - min) * 0.12);
  min = Math.max(0, min - marge);
  max += marge;
  const x = (t) => L + ((t - begin) / (eind - begin)) * (B - L - R);
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - O);
  const lijn = p.map((q, i) => `${i ? 'L' : 'M'}${x(q.t).toFixed(1)} ${y(q.v).toFixed(1)}`).join(' ');
  const vlak = `${lijn} L${x(p.at(-1).t).toFixed(1)} ${H - O} L${x(p[0].t).toFixed(1)} ${H - O} Z`;
  const stappen = 4;
  const raster = Array.from({ length: stappen + 1 }, (_, i) => min + ((max - min) * i) / stappen)
    .map((v) => `<line class="gr-raster" x1="${L}" x2="${B - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="gr-as" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(euroTekst(v, 0))}</text>`)
    .join('');
  const maandLabels = [];
  for (let d = new Date(begin); d.getTime() <= eind; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDate() === 1) maandLabels.push(`<text class="gr-as" x="${x(d.getTime()).toFixed(1)}" y="${H - 12}" text-anchor="middle">${MAANDEN[d.getUTCMonth()]}</text>`);
  }
  const gl = gangbaar
    ? `<line class="gr-gangbaar" x1="${L}" x2="${B - R}" y1="${y(gangbaar).toFixed(1)}" y2="${y(gangbaar).toFixed(1)}"/><text class="gr-label gr-label-gangbaar" x="${B - R - 4}" y="${(y(gangbaar) - 6).toFixed(1)}" text-anchor="end">gangbaar ${esc(euroTekst(gangbaar))}</text>`
    : '';
  const l30 = laagste30
    ? `<line class="gr-l30" x1="${x(eind - 30 * 864e5).toFixed(1)}" x2="${x(eind).toFixed(1)}" y1="${y(laagste30).toFixed(1)}" y2="${y(laagste30).toFixed(1)}"/><text class="gr-label gr-label-l30" x="${x(eind - 30 * 864e5).toFixed(1)}" y="${(y(laagste30) + 16).toFixed(1)}">laagste 30 dagen ${esc(euroTekst(laagste30))}</text>`
    : '';
  const laatste = p.at(-1);
  const beschrijving = `Laagste totaalprijs per dag over ${dagen} dagen. ${gangbaar ? `Gangbare prijs ${euroTekst(gangbaar)}. ` : ''}${laagste30 ? `Laagste prijs in 30 dagen ${euroTekst(laagste30)}. ` : ''}Nu ${euroTekst(laatste.v)}.`;
  return `<svg class="grafiek" viewBox="0 0 ${B} ${H}" role="img" aria-labelledby="${id}-t ${id}-d" preserveAspectRatio="xMidYMid meet">
<title id="${id}-t">${esc(titel)}</title><desc id="${id}-d">${esc(beschrijving)}</desc>
<defs><linearGradient id="${id}-verloop" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="gr-stop1"/><stop offset="1" class="gr-stop2"/></linearGradient></defs>
${raster}${maandLabels.join('')}
<path class="gr-vlak" d="${vlak}" fill="url(#${id}-verloop)"/>
<path class="gr-lijn" d="${lijn}"/>
${gl}${l30}
<circle class="gr-nu" cx="${x(laatste.t).toFixed(1)}" cy="${y(laatste.v).toFixed(1)}" r="6"/>
</svg>`;
}

// Kortingslabel met eerlijke uitleg
export function kortingBadge(d) {
  if (d.echteKorting === null || d.echteKorting === undefined) return '<span class="badge badge-nieuw">Nieuw: nog geen gangbare prijs</span>';
  if (d.echteKorting <= 0.005) return `<span class="badge badge-geen">${d.echteKorting < -0.005 ? `${procentTekst(-d.echteKorting)} duurder dan normaal` : 'Normale prijs'}</span>`;
  return `<span class="badge badge-echt">${procentTekst(d.echteKorting)} onder gangbaar</span>`;
}

// Prijskalender als tabel (ma–zo), niveau 0–4 voor de kleur
export function kalenderHtml(kalender, { gangbaar = null } = {}) {
  const eerste = new Date(kalender.maand + '-01T00:00:00Z');
  const leeg = (eerste.getUTCDay() + 6) % 7;
  const cellen = [...Array(leeg).fill(null), ...kalender.dagen];
  while (cellen.length % 7) cellen.push(null);
  const rijen = [];
  for (let i = 0; i < cellen.length; i += 7) rijen.push(cellen.slice(i, i + 7));
  const td = (c) => {
    if (!c) return '<td class="kal-leeg"></td>';
    const dagNr = Number(c.datum.slice(8));
    if (c.prijs === null) return `<td class="kal-dag kal-geen"><span class="kal-nr">${dagNr}</span><span class="kal-prijs">–</span></td>`;
    const onder = gangbaar && c.prijs < gangbaar;
    return `<td class="kal-dag niveau-${c.niveau}${onder ? ' kal-onder' : ''}" data-datum="${esc(c.datum)}"><span class="kal-nr">${dagNr}</span><span class="kal-prijs">${esc(euroTekst(c.prijs, 0))}</span></td>`;
  };
  return `<table class="kalender"><caption>Laagste prijs per vertrekdag in ${esc(maandTekst(kalender.maand))}</caption>
<thead><tr>${['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((d) => `<th scope="col">${d}</th>`).join('')}</tr></thead>
<tbody>${rijen.map((r) => `<tr>${r.map(td).join('')}</tr>`).join('')}</tbody></table>`;
}

const KLEUREN = 6;
export const kleurVan = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % KLEUREN;

// Dealkaart voor de lijst op /deals/ (ook gebruikt na live zoeken)
export function kaartHtml(d, nu = Date.now()) {
  const vlucht = d.soort === 'vlucht';
  const zoek = `${d.titel} ${d.merk || ''} ${d.winkel || ''}`.toLowerCase();
  const korting = d.echteKorting === null || d.echteKorting === undefined ? -1 : Math.round(d.echteKorting * 100);
  const verzend = vlucht
    ? `<span class="verzend">${d.stops === 0 ? 'Rechtstreeks' : d.stops ? `${d.stops} overstap${d.stops > 1 ? 'pen' : ''}` : 'Overstappen onbekend'} · ${d.bagageInbegrepen === true ? 'ruimbagage inbegrepen' : d.bagageInbegrepen === false ? 'alleen handbagage' : 'bagage: check bij boeken'} · indicatie, ${esc(ouderdom(d.bijgewerkt, nu))}</span>`
    : d.verzendBekend
      ? `<span class="verzend">${d.verzendkosten ? `incl. ${esc(euroTekst(d.verzendkosten))} verzending` : 'incl. gratis verzending'}</span>`
      : '<span class="verzend verzend-onbekend">verzendkosten onbekend</span>';
  const nep = d.nep
    ? `<p class="nep-waarschuwing"><strong>Let op: nep-korting?</strong> De winkel noemt ${d.vanPrijs ? `een ‘van’-prijs van ${esc(euroTekst(d.vanPrijs))}` : 'een korting'}, maar ${esc((d.nepRedenen || [])[0] || 'de prijs is niet lager dan normaal').replace(/^./, (c) => c.toLowerCase())}.</p>`
    : '';
  const link = d.url
    ? `<a class="knop deal-knop" href="${esc(d.url)}" rel="sponsored nofollow noopener" target="_blank">Bekijk deal<span class="skip"> bij ${esc(d.winkel)} (opent nieuw venster)</span></a>`
    : '';
  const titel = vlucht ? `${esc(d.titel)} <small>${esc(datumTekst(d.vertrek, true))}</small>` : esc(d.titel);
  return `<article class="deal-kaart" data-categorie="${esc(d.categorie)}" data-korting="${korting}" data-zoek="${esc(zoek)}" data-id="${esc(d.id)}"${d.nep ? ' data-nep' : ''}>
<div class="deal-beeld kleur-${kleurVan(d.titel)}" aria-hidden="true">${vlucht ? '✈' : esc(initialen(d.merk || d.titel))}</div>
<div class="deal-tekst">
<p class="deal-meta"><span class="deal-cat">${esc(d.categorie)}</span>${d.demo ? '<span class="badge badge-demo">demo</span>' : ''}${d.affiliate ? '<span class="partner-label-klein">partnerlink</span>' : ''}</p>
<h3><a href="${esc(d.pagina)}">${titel}</a></h3>
<p class="deal-winkel">${vlucht ? 'met' : 'bij'} <strong>${esc(d.winkel || '–')}</strong>${d.winkelsNu > 1 ? ` · ${d.winkelsNu} winkels vergeleken` : ''}</p>
<p class="deal-prijs"><span class="totaal">${esc(euroTekst(d.totaal))}</span> ${verzend}</p>
<p class="deal-gangbaar">Gangbare prijs: <strong>${esc(euroTekst(d.gangbaar))}</strong>${d.laagste30 ? ` · laagste 30 dagen ${esc(euroTekst(d.laagste30))}` : ''}</p>
<div class="deal-badges">${kortingBadge(d)}${d.verdacht ? '<span class="badge badge-let">Verdacht laag: check de winkel</span>' : ''}</div>
${nep}
${sparklineSvg(d.spark, { gangbaar: d.gangbaar })}
<div class="deal-acties">${link}<button type="button" class="knop-licht volg-knop" data-volg="${esc(d.soort === 'vlucht' ? d.route : d.id)}" data-type="${vlucht ? 'vlucht' : 'product'}" data-titel="${esc(d.titel)}" aria-pressed="false">Volg</button></div>
</div>
</article>`;
}

// Leeftijd van een (vlucht)prijs: vluchtprijzen zijn gecachte zoekresultaten
export const ouderdom = (iso, ref) => {
  const d = Math.max(0, Math.round((ref - Date.parse(iso)) / 864e5));
  return d === 0 ? 'vandaag gevonden' : d === 1 ? '1 dag oud' : `${d} dagen oud`;
};


// Resultaat voor één route en maand (voorgerenderd en in de browser)
export function vluchtResultaat(r, m, nu) {
  const top = m.goedkoopste;
  return `<div class="tegels">
<div class="tegel"><p class="tegel-kop">Goedkoopst in ${esc(maandTekst(m.maand))}</p><p class="tegel-waarde">${esc(euroTekst(top[0]?.prijs ?? null, 0))}</p><p class="tegel-sub">${esc(top[0] ? datumTekst(top[0].datum, true) : '')}</p></div>
<div class="tegel"><p class="tegel-kop">Gangbare prijs</p><p class="tegel-waarde">${esc(euroTekst(m.gangbaar, 0))}</p><p class="tegel-sub">mediaan, 90 dagen gemeten</p></div>
<div class="tegel"><p class="tegel-kop">Echte korting</p><p class="tegel-waarde">${esc(procentTekst(m.echteKorting))}</p><p class="tegel-sub">goedkoopste dag</p></div>
</div>
<h2>Prijskalender ${esc(plaats(r.van))} → ${esc(plaats(r.naar))}</h2>
<div class="tabel-scroll" tabindex="0" role="region" aria-label="Prijskalender">${kalenderHtml(m.kalender, { gangbaar: m.gangbaar })}</div>
<p class="legenda"><span class="lg niveau-0"></span> goedkoop <span class="lg niveau-2"></span> gemiddeld <span class="lg niveau-4"></span> duur</p>
<h2>Goedkoopste vertrekdagen</h2>
<ol class="goedkoopst">${top
    .map(
      (d) => `<li><strong>${esc(datumTekst(d.datum, true))}</strong> – ${esc(euroTekst(d.prijs, 0))} met ${esc(d.maatschappij)}${d.stops === 0 ? ', rechtstreeks' : d.stops ? `, ${d.stops} overstap` : ''} <span class="hint">(${esc(ouderdom(d.tijd, nu))})</span>${
        d.url ? ` <a href="${esc(d.url)}" rel="sponsored nofollow noopener" target="_blank">Bekijk<span class="skip"> vlucht op ${esc(datumTekst(d.datum, true))} (opent nieuw venster)</span></a>` : ''
      }</li>`,
    )
    .join('')}</ol>
<p><button type="button" class="knop-licht" data-vlucht-alarm data-route="${esc(r.route)}" data-maand="${esc(m.maand)}" data-titel="${esc(`${plaats(r.van)} → ${plaats(r.naar)}`)}">Volg deze route (alarm bij 20% onder gangbaar)</button> <span role="status" data-vlucht-status></span></p>`;
}

