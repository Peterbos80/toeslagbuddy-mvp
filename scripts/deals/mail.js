// De bewijsmail van DealBuddy (Brevo, transactioneel). Alles wat uit een
// bron komt wordt ge-escaped; het onderwerp heeft geen CR/LF. Het adres van
// de ontvanger komt alleen uit de omgeving (DEALS_EMAIL) en staat nergens anders.
import { dagReeks, weekOverzicht } from '../../src/deals/historie.js';

export const AFZENDER = { name: 'DealBuddy', email: 'deals@toeslagbuddy.nl' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const eur = (n) => (n === null || n === undefined ? '–' : `€ ${Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const pct = (k) => (k === null || k === undefined ? '–' : `${Math.round(k * 100)}%`);
const datum = (iso) => (iso ? new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Amsterdam' }) : '–');
export const schoonOnderwerp = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
const KLEUREN = ['#6d28d9', '#be185d', '#0e7490', '#b45309', '#047857', '#4338ca', '#9f1239', '#374151'];

// Bewijs uit de historie: per winkel de laatste prijs, per week laagste/mediaan
export function bewijsVan(deal, record) {
  if (!record) return { winkels: [], weken: [], dagen: deal.dagen ?? 0, bronnen: [] };
  if (record.route) {
    // Vlucht: per waarneemweek de laagste prijs voor die vertrekmaand
    const reeks = Object.keys(record.dagen)
      .sort()
      .filter((d) => deal.maand in record.dagen[d])
      .map((d) => ({ datum: d, totaal: record.dagen[d][deal.maand] / 100 }));
    return { winkels: [], weken: weekOverzicht(reeks).slice(-13), dagen: reeks.length, bronnen: Object.keys(record.bronnen) };
  }
  const winkels = Object.entries(record.winkels)
    .map(([winkel, o]) => ({ winkel, prijs: o.prijs, verzending: o.verzendBekend === false ? null : Math.round((o.totaal - o.prijs) * 100) / 100, totaal: o.totaal, gezien: o.tijd, bron: o.bron }))
    .sort((a, b) => a.totaal - b.totaal);
  const reeks = dagReeks(record);
  return { winkels, weken: weekOverzicht(reeks).slice(-13), dagen: reeks.length, bronnen: Object.keys(record.bronnen) };
}

function dealBlok(m, siteUrl) {
  const { deal: d, bewijs: b, regels } = m;
  const link = d.url || `${siteUrl}${d.pagina}`;
  const bewijsUrl = d.paginaSlug ? `${siteUrl}/deals/bewijs/${d.paginaSlug}/` : `${siteUrl}${d.pagina}`;
  const grafiek = d.paginaSlug ? `<p><img src="${esc(`${siteUrl}/deals/bewijs/${d.paginaSlug}/grafiek.png`)}" width="600" height="200" alt="Prijsverloop van ${esc(d.titel)} (90 dagen)" style="max-width:100%;height:auto;border:1px solid #e5e7eb;border-radius:8px"></p>` : '';
  const winkels = b.winkels.length
    ? `<table role="presentation" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#f3edff"><th align="left">Winkel</th><th align="right">Prijs</th><th align="right">Verzending</th><th align="right">Totaal</th><th align="right">Laatst gezien</th></tr>${b.winkels
        .map((w, i) => `<tr style="border-top:1px solid #e5e7eb"><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${KLEUREN[i % 8]}"></span> ${esc(w.winkel)}</td><td align="right">${esc(eur(w.prijs))}</td><td align="right">${w.verzending === null ? 'onbekend' : w.verzending ? esc(eur(w.verzending)) : 'gratis'}</td><td align="right"><b>${esc(eur(w.totaal))}</b></td><td align="right">${esc(datum(w.gezien))}</td></tr>`)
        .join('')}</table>`
    : '';
  const weken = b.weken.length
    ? `<table role="presentation" cellpadding="5" style="border-collapse:collapse;font-size:13px"><tr style="background:#f3edff"><th align="left">Week</th><th align="right">Laagste</th><th align="right">Mediaan</th><th align="right">Dagen</th></tr>${b.weken
        .map((w) => `<tr style="border-top:1px solid #e5e7eb"><td>${esc(w.week)}</td><td align="right">${esc(eur(w.laagste))}</td><td align="right">${esc(eur(w.mediaan))}</td><td align="right">${w.dagen}</td></tr>`)
        .join('')}</table>`
    : '';
  return `<div style="border:1px solid #e9e2fb;border-radius:14px;padding:18px;margin:0 0 20px">
<h2 style="margin:0 0 6px;font-size:20px;color:#2e1065">${esc(d.titel)}</h2>
<p style="margin:0 0 10px;font-size:28px;font-weight:800">${esc(eur(d.totaal))} <span style="font-size:14px;font-weight:600;color:#047857;background:#d9f5ea;border-radius:99px;padding:2px 10px">${esc(pct(d.echteKorting))} onder gangbaar</span></p>
<p style="margin:0 0 4px">Bij <b>${esc(d.winkel)}</b>, inclusief verzending. Gangbare prijs: <b>${esc(eur(d.gangbaar))}</b> (mediaan van de laagste dagprijs, 90 dagen). Laagste prijs in de 30 dagen hiervoor: <b>${esc(eur(d.laagste30))}</b>.</p>
<p style="margin:0 0 12px;font-size:13px;color:#56615b">Gevonden door je alarm: ${regels.map((r) => esc(r.titel || `${r.type} ${r.waarde}`)).join(', ')}.</p>
<p style="margin:0 0 16px"><a href="${esc(link)}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:10px 16px">Bekijk de deal</a>${d.affiliate ? ' <span style="font-size:12px;color:#56615b">(partnerlink: wij kunnen een kleine vergoeding krijgen; jij betaalt niets extra)</span>' : ''}</p>
<h3 style="margin:16px 0 6px;font-size:16px">Bewijs</h3>
<p style="margin:0 0 8px;font-size:14px">Gemeten op <b>${b.dagen}</b> dagen, bij <b>${b.winkels.length || d.winkelsGezien}</b> winkel(s), via ${b.bronnen.length} bron(nen): ${esc(b.bronnen.join(', '))}.</p>
${grafiek}${winkels}<p style="margin:12px 0 4px;font-size:14px"><b>Per week</b> (laagste en mediaan van de dagprijzen):</p>${weken}
<p style="margin:12px 0 0;font-size:14px"><a href="${esc(bewijsUrl)}">Volledig bewijs met grafiek en alle prijzen per winkel</a></p>
</div>`;
}

function tekstBlok(m, siteUrl) {
  const { deal: d, bewijs: b } = m;
  return [
    `${d.titel}`,
    `Nu ${eur(d.totaal)} bij ${d.winkel} (incl. verzending), ${pct(d.echteKorting)} onder de gangbare prijs van ${eur(d.gangbaar)}.`,
    `Laagste prijs in de 30 dagen hiervoor: ${eur(d.laagste30)}.`,
    `Deal: ${d.url || `${siteUrl}${d.pagina}`}${d.affiliate ? ' (partnerlink)' : ''}`,
    `Bewijs: ${b.dagen} dagen gemeten, ${b.winkels.length || d.winkelsGezien} winkel(s), bronnen: ${b.bronnen.join(', ')}.`,
    ...b.winkels.map((w) => `  - ${w.winkel}: ${eur(w.totaal)} totaal (${w.verzending === null ? 'verzending onbekend' : w.verzending ? `incl. ${eur(w.verzending)} verzending` : 'gratis verzending'}), gezien ${datum(w.gezien)}`),
    'Per week (laagste / mediaan):',
    ...b.weken.map((w) => `  ${w.week}: ${eur(w.laagste)} / ${eur(w.mediaan)}`),
    d.paginaSlug ? `Volledig bewijs: ${siteUrl}/deals/bewijs/${d.paginaSlug}/` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// Eén mail (digest) voor alle nieuwe deals van deze ronde
export function maakMeldingMail(meldingen, { naar, siteUrl = 'https://www.toeslagbuddy.nl' }) {
  const eerste = meldingen[0].deal;
  const onderwerp = schoonOnderwerp(meldingen.length === 1 ? `DealBuddy: ${eerste.titel} nu ${pct(eerste.echteKorting)} onder de gangbare prijs` : `DealBuddy: ${meldingen.length} deals met bewijs`);
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f7f5fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d2521">
<div style="max-width:680px;margin:0 auto;padding:24px">
<p style="font-weight:900;color:#4c1d95;margin:0 0 16px">% DealBuddy</p>
<p style="margin:0 0 18px">We vonden ${meldingen.length === 1 ? 'een deal' : `${meldingen.length} deals`} die past bij je alarm, met genoeg bewijs: gemeten bij meerdere winkels, over een langere periode, inclusief verzendkosten.</p>
${meldingen.map((m) => dealBlok(m, siteUrl)).join('\n')}
<p style="font-size:12px;color:#56615b">Prijzen kunnen veranderen; controleer altijd de prijs in de winkel. Je krijgt deze mail omdat je alarmen hebt ingesteld in data/deals/alarmen.json. Stoppen: haal je alarm daar weg of zet het geheim DEALS_EMAIL uit.</p>
</div></body></html>`;
  const tekst = `DealBuddy\n\n${meldingen.map((m) => tekstBlok(m, siteUrl)).join('\n\n---\n\n')}\n\nPrijzen kunnen veranderen; controleer altijd de prijs in de winkel.`;
  return { sender: AFZENDER, to: [{ email: naar }], subject: onderwerp, htmlContent: html, textContent: tekst, tags: ['dealbuddy'] };
}
