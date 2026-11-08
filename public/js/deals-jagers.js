// /deals/jagers/: persoonlijke jagers zonder account. Opdracht in gewone taal
// → criteria (bevestigen en aanpassen) → bij elk bezoek een nieuw rapport
// uit de index (en live, als dat aan staat). Alles in localStorage.
import { leesOpdracht, criteriaTekst, geldigeCriteria } from './opdracht.js';
import { maakRapport, verschil } from './rapport.js';
import { lees, bewaar, laadDeals } from './deals-opslag.js';
import { esc, euroTekst, procentTekst, tijdTekst, sparklineSvg } from './deals-weergave.js';
import { liveAan, liveZoeken } from './deals-livezoek.js';

const SLEUTEL = 'dealbuddy-jagers';
const BEZOEK = 'dealbuddy-bezoek';
const form = document.querySelector('[data-jager-form]');
const bevestig = document.querySelector('[data-bevestig]');
const lijstEl = document.querySelector('[data-jagers]');
const terug = document.querySelector('[data-terug]');
let deals = [];

const jagers = () => (Array.isArray(lees(SLEUTEL, [])) ? lees(SLEUTEL, []) : []);
const bewaarJagers = (j) => bewaar(SLEUTEL, j);

function veld(naam, label, waarde, type = 'text', extra = '') {
  const id = `c-${naam}`;
  return `<div class="veld"><label for="${id}">${label}</label><input id="${id}" name="${naam}" type="${type}" value="${esc(waarde ?? '')}" autocomplete="off"${extra}></div>`;
}

function toonBevestiging(c) {
  const vlucht = c.soort === 'vlucht';
  bevestig.hidden = false;
  bevestig.innerHTML = `<h2>Klopt dit?</h2><p class="hint">Zo begrijpt je jager de opdracht: <strong data-samenvatting>${esc(criteriaTekst(c))}</strong>. Pas aan wat niet klopt.</p>
<form data-criteria novalidate><div class="criteria">${
    vlucht
      ? veld('van', 'Van (luchthaven)', c.vlucht.van, 'text', ' maxlength="3"') + veld('naar', 'Naar (luchthaven)', c.vlucht.naar, 'text', ' maxlength="3"') + veld('maand', 'Maand (jjjj-mm)', c.vlucht.maand || '', 'text', ' placeholder="2027-05"')
      : veld('zoekterm', 'Zoekwoorden', c.zoekterm) +
        veld('merk', 'Merk', c.merk || '') +
        veld('inhoud', `Inhoud (${c.inhoud?.eenheid || 'ml of g'})`, c.inhoud ? c.inhoud.waarde : '', 'text', ' inputmode="decimal"') +
        `<div class="veld"><label for="c-variant">Soort</label><select id="c-variant" name="variant">${[['', 'maakt niet uit'], ['edp', 'Eau de parfum'], ['edt', 'Eau de toilette'], ['edc', 'Eau de cologne'], ['parfum', 'Extrait/parfum']]
          .map(([k, n]) => `<option value="${k}"${(c.variant || '') === k ? ' selected' : ''}>${n}</option>`)
          .join('')}</select></div>`
  }${veld('maxTotaal', `Maximaal (€, ${c.inclusiefVerzending ? 'incl.' : 'excl.'} verzending)`, c.maxTotaal ?? '', 'text', ' inputmode="decimal"')}${veld('minKorting', 'Minstens % onder gangbaar', c.minKorting ?? '', 'number', ' min="0" max="95"')}</div>
${vlucht ? '' : `<p class="vinkje"><input type="checkbox" id="c-tester" name="tester"${c.uitsluiten.includes('tester') ? ' checked' : ''}><label for="c-tester">Geen testers</label> <input type="checkbox" id="c-set" name="set"${c.uitsluiten.includes('set') ? ' checked' : ''}><label for="c-set">Geen (cadeau)sets</label></p>`}
<p class="knoppen"><button type="submit" class="knop">Start jager</button> <button type="button" class="knop-licht" data-annuleer>Annuleer</button></p>
<p class="formulier-status" role="status" aria-live="polite" data-c-status></p></form>`;
  const f = bevestig.querySelector('[data-criteria]');
  const lees_ = () => {
    const g = (n) => f.querySelector(`[name=${n}]`)?.value.trim() ?? '';
    const getal = (n) => (g(n) === '' ? null : Number(g(n).replace(',', '.')));
    const nieuw = structuredClone(c);
    if (vlucht) nieuw.vlucht = { van: g('van').toUpperCase(), naar: g('naar').toUpperCase(), maand: /^\d{4}-\d{2}$/.test(g('maand')) ? g('maand') : null };
    else {
      nieuw.zoekterm = g('zoekterm');
      nieuw.merk = g('merk') || null;
      nieuw.inhoud = getal('inhoud') ? { waarde: getal('inhoud'), eenheid: c.inhoud?.eenheid || 'ml' } : null;
      nieuw.variant = g('variant') || null;
      nieuw.uitsluiten = [f.querySelector('[name=tester]')?.checked ? 'tester' : null, f.querySelector('[name=set]')?.checked ? 'set' : null].filter(Boolean);
    }
    nieuw.maxTotaal = getal('maxTotaal');
    nieuw.minKorting = getal('minKorting');
    return nieuw;
  };
  f.addEventListener('input', () => {
    bevestig.querySelector('[data-samenvatting]').textContent = criteriaTekst(lees_());
  });
  f.querySelector('[data-annuleer]').addEventListener('click', () => {
    bevestig.hidden = true;
    bevestig.innerHTML = '';
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nieuw = lees_();
    if (!geldigeCriteria(nieuw)) {
      const s = f.querySelector('[data-c-status]');
      s.dataset.soort = 'fout';
      s.textContent = 'Vul minstens een zoekwoord of merk in, en geldige bedragen.';
      return;
    }
    const lijst = jagers();
    const jager = { id: `j${Date.now().toString(36)}`, omschrijving: c.tekst, criteria: nieuw, aangemaakt: new Date().toISOString(), actief: true, rapporten: [] };
    lijst.unshift(jager);
    bewaarJagers(lijst);
    bevestig.hidden = true;
    bevestig.innerHTML = '';
    form.reset();
    await draai(jager.id);
  });
  f.querySelector('input,select')?.focus();
}

// Eén ronde voor één jager: index (direct) en eventueel live
async function draai(id, { stil = false } = {}) {
  const lijst = jagers();
  const j = lijst.find((x) => x.id === id);
  if (!j || !j.actief) return null;
  const live = [];
  if (liveAan()) {
    const c = j.criteria;
    await liveZoeken(c.soort === 'vlucht' ? { q: '', vlucht: c.vlucht } : { q: [c.merk, c.zoekterm].filter(Boolean).join(' '), categorie: c.categorie || undefined }, (event, data) => {
      if (event === 'bron' && data.status === 'ok') for (const a of data.aanbiedingen || []) live.push({ ...a, bron: data.bron });
    }, { timeout: 8000 });
  }
  const rapport = maakRapport(j.criteria, deals, { live });
  const vorig = j.rapporten[0] || null;
  const wijziging = verschil(vorig, rapport);
  rapport.wijzigingen = wijziging;
  // Tijdlijn: alleen een nieuw punt als er iets veranderde (of het eerste)
  if (!vorig || wijziging.length) j.rapporten.unshift(rapport);
  else j.rapporten[0] = { ...rapport, wijzigingen: vorig.wijzigingen };
  j.rapporten = j.rapporten.slice(0, 20);
  j.laatst = rapport.tijd;
  bewaarJagers(lijst);
  if (!stil) teken();
  return { j, wijziging, vorig };
}

function kaart(j) {
  const r = j.rapporten[0];
  const b = r?.beste;
  return `<article class="jager-kaart" data-jager="${esc(j.id)}">
<div class="jager-kop"><h3>${esc(j.omschrijving)}</h3>${j.actief ? '<span class="agent-actief">agent actief</span>' : '<span class="badge badge-geen">gepauzeerd</span>'}</div>
<p class="hint">${esc(criteriaTekst(j.criteria))}</p>
<p class="jager-cijfers"><span>Laatst gezocht: ${esc(tijdTekst(j.laatst))}</span><span>${r ? r.cijfers.bronnen : 0} bronnen doorzocht</span><span>${r ? r.cijfers.prijzen : 0} prijzen gecontroleerd</span></p>
${r ? `<p class="oordeel" data-soort="${esc(r.oordeel.soort)}" data-oordeel>${esc(r.oordeel.tekst)}</p><p>${esc(r.oordeel.reden)}</p>` : ''}
${
  b
    ? `<p>Beste prijs nu: <strong>${esc(euroTekst(b.totaal))}</strong> bij ${esc(b.winkel)}${b.verzendkosten === null ? '' : b.verzendkosten ? ` (incl. ${esc(euroTekst(b.verzendkosten))} verzending)` : ' (gratis verzending)'} – <a href="${esc(b.pagina)}">${esc(b.titel)}</a>${b.demo ? ' <span class="badge badge-demo">demo</span>' : ''}</p>
<p class="hint">Gangbaar ${esc(euroTekst(r.gangbaar))} · laagste 30 dagen ${esc(euroTekst(r.laagste30))} · echte korting ${esc(procentTekst(b.echteKorting))} · trend: ${esc(r.trend.richting)}</p>
${sparklineSvg(r.spark, { gangbaar: r.gangbaar })}
${r.alternatieven.length ? `<p class="hint">Alternatieven: ${r.alternatieven.map((a) => `${esc(a.winkel)} ${esc(euroTekst(a.totaal))}`).join(' · ')}</p>` : ''}
${r.bewijs ? `<p class="hint">Bewijs: ${r.bewijs.dagen} dagen gemeten bij ${r.bewijs.winkels} winkels.</p>` : ''}`
    : ''
}
<details><summary>Tijdlijn (${j.rapporten.length})</summary><ol class="tijdlijn">${j.rapporten
    .slice(0, 8)
    .map((x) => `<li><strong>${esc(tijdTekst(x.tijd))}</strong> – ${esc(x.oordeel.tekst)}${x.beste ? `, ${esc(euroTekst(x.beste.totaal))} bij ${esc(x.beste.winkel)}` : ''}${x.wijzigingen?.length ? `<br><span class="hint">${esc(x.wijzigingen.join(' '))}</span>` : ''}</li>`)
    .join('')}</ol></details>
<p class="knoppen"><button type="button" class="knop-licht" data-actie="zoek">Zoek nu</button> <button type="button" class="knop-licht" data-actie="pauze">${j.actief ? 'Pauzeer' : 'Hervat'}</button> <button type="button" class="knop-licht" data-actie="weg">Verwijder</button></p>
</article>`;
}

function teken() {
  const lijst = jagers();
  lijstEl.innerHTML = lijst.length ? lijst.map(kaart).join('') : '<p class="geen-resultaat">Je hebt nog geen jagers. Typ hierboven wat je zoekt.</p>';
}

if (form && lijstEl) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tekst = form.querySelector('[name=opdracht]').value;
    if (!tekst.trim()) return;
    toonBevestiging(leesOpdracht(tekst));
  });
  document.querySelectorAll('[data-voorbeeld]').forEach((b) =>
    b.addEventListener('click', () => {
      form.querySelector('[name=opdracht]').value = b.dataset.voorbeeld;
      toonBevestiging(leesOpdracht(b.dataset.voorbeeld));
    }),
  );
  lijstEl.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-actie]');
    if (!b) return;
    const id = b.closest('[data-jager]').dataset.jager;
    const lijst = jagers();
    const j = lijst.find((x) => x.id === id);
    if (b.dataset.actie === 'weg') bewaarJagers(lijst.filter((x) => x.id !== id));
    else if (b.dataset.actie === 'pauze') {
      j.actief = !j.actief;
      bewaarJagers(lijst);
    } else if (b.dataset.actie === 'zoek') {
      b.disabled = true;
      b.textContent = 'Zoeken…';
      await draai(id);
      return;
    }
    teken();
  });

  // Bij elk bezoek: alle actieve jagers draaien en vertellen wat er veranderde
  (async () => {
    ({ deals = [] } = await laadDeals());
    const vorigBezoek = lees(BEZOEK, null);
    const nieuws = [];
    for (const j of jagers().filter((x) => x.actief)) {
      const r = await draai(j.id, { stil: true });
      if (r?.vorig && r.wijziging.length) nieuws.push(`<li><strong>${esc(j.omschrijving)}</strong>: ${esc(r.wijziging.join(' '))}</li>`);
    }
    if (vorigBezoek && nieuws.length) {
      terug.hidden = false;
      terug.innerHTML = `<h2>Ik ben er weer</h2><p>Sinds je vorige bezoek (${esc(tijdTekst(vorigBezoek))}) veranderde er dit:</p><ul>${nieuws.join('')}</ul>`;
    }
    bewaar(BEZOEK, new Date().toISOString());
    teken();
  })();
}
