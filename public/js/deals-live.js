// Live zoeken op /deals/: eerst direct (0 ms) de resultaten uit de index,
// daarna de live-resultaten van de Edge Function deals-zoek (Server-Sent
// Events) erbij, per bron met een statuschip. Zonder Supabase: alleen index.
import { CONFIG } from './config.js';
import { sseLezer, zoekInIndex, uitIndex, voegLiveSamen, chipTekst } from './samenvoegen.js';
import { laadDeals } from './deals-opslag.js';
import { esc, euroTekst } from './deals-weergave.js';

const form = document.querySelector('[data-filter]');
const blok = document.querySelector('[data-live]');
if (form && blok) {
  const lijstEl = blok.querySelector('[data-live-lijst]');
  const chipsEl = blok.querySelector('[data-live-chips]');
  const noot = blok.querySelector('[data-live-noot]');
  const eind = CONFIG.supabaseUrl ? `${CONFIG.supabaseUrl.replace(/\/$/, '')}/functions/v1/deals-zoek` : '';
  let lopend = null;
  let lijst = [];
  const chips = new Map();

  const tijd = (iso) => new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  function teken(skeletten = 0) {
    lijstEl.innerHTML =
      lijst
        .slice(0, 12)
        .map(
          (r) => `<li class="live-regel${r.nieuwLaagste ? ' nieuw-laagste' : ''}" data-bron="${esc(r.bron)}"><div><a href="${esc(r.pagina || r.url || '#')}"${r.pagina ? '' : ' rel="sponsored nofollow noopener" target="_blank"'}>${esc(r.titel)}</a>
<p class="hint">bij ${esc(r.winkel)}${r.verzendkosten === null || r.verzendkosten === undefined ? '' : r.verzendkosten ? ` · incl. ${esc(euroTekst(r.verzendkosten))} verzending` : ' · gratis verzending'}${r.geverifieerd ? ` <span class="live-badge">nu geverifieerd ${esc(tijd(r.geverifieerd))}</span>` : ''}${r.nieuwLaagste ? ' <span class="live-badge">nieuwe laagste prijs</span>' : ''}${r.live ? '' : ' · uit de index'}</p></div>
<strong>${esc(euroTekst(r.totaal))}</strong></li>`,
        )
        .join('') + '<li class="live-regel skelet" aria-hidden="true"></li>'.repeat(skeletten);
    if (!lijst.length && !skeletten) lijstEl.innerHTML = '<li class="live-regel"><span>Nog niets gevonden.</span></li>';
  }
  function chip(bron, status, ms) {
    chips.set(bron, { bron, status, ms });
    chipsEl.innerHTML = [...chips.values()].map((c) => `<li class="live-chip" data-status="${esc(c.status)}">${esc(chipTekst(c))}</li>`).join('');
  }

  async function zoek(q) {
    lopend?.abort();
    chips.clear();
    chipsEl.innerHTML = '';
    if (!q.trim()) {
      blok.hidden = true;
      return;
    }
    blok.hidden = false;
    const cat = form.querySelector('.chip[aria-pressed=true]')?.dataset.cat || '';
    const { deals = [] } = await laadDeals();
    lijst = zoekInIndex(deals, q, cat).map(uitIndex).sort((a, b) => a.totaal - b.totaal);
    chip('index', 'ok', 0);
    if (!eind) {
      noot.textContent = 'Live zoeken staat nog niet aan. Je ziet de resultaten uit onze index (elk uur bijgewerkt).';
      teken();
      return;
    }
    noot.textContent = 'Direct uit onze index; live bronnen komen erbij zodra ze antwoorden.';
    teken(2);
    const ctrl = new AbortController();
    lopend = ctrl;
    const wacht = setTimeout(() => ctrl.abort(), 10000);
    const lezer = sseLezer(({ event, data }) => {
      if (!data) return;
      if (event === 'start') for (const b of data.bronnen || []) chip(b, 'bezig');
      else if (event === 'bron') {
        chip(data.bron, data.status, data.ms);
        lijst = voegLiveSamen(lijst, data);
        teken([...chips.values()].some((c) => c.status === 'bezig') ? 1 : 0);
      } else if (event === 'beperkt') noot.textContent = 'Live zoeken is even druk. Je ziet nu de resultaten uit onze index.';
      else if (event === 'klaar') {
        for (const c of chips.values()) if (c.status === 'bezig') chip(c.bron, 'timeout');
        teken();
      }
    });
    try {
      const r = await fetch(eind, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(CONFIG.supabaseAnonKey ? { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${CONFIG.supabaseAnonKey}` } : {}) },
        body: JSON.stringify({ q, categorie: cat || undefined }),
        signal: ctrl.signal,
      });
      if (r.status === 429) {
        noot.textContent = 'Live zoeken is even druk. Je ziet nu de resultaten uit onze index.';
        teken();
        return;
      }
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
      const rd = r.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        lezer.voeg(dec.decode(value, { stream: true }));
      }
      lezer.einde();
    } catch {
      if (lopend !== ctrl) return; // vervangen door een nieuwe zoekopdracht
      for (const c of chips.values()) if (c.status === 'bezig') chip(c.bron, 'timeout');
      if (![...chips.values()].some((c) => c.bron !== 'index')) noot.textContent = 'Live bronnen reageren nu niet. Je ziet de resultaten uit onze index.';
      teken();
    } finally {
      clearTimeout(wacht);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    zoek(form.querySelector('[name=q]').value);
  });
}
