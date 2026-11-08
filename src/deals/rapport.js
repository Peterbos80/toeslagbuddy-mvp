// Rapport van een persoonlijke jager: beste aanbod, alternatieven, trend,
// oordeel en bewijs. Puur: draait in de browser (zonder account) en in
// scripts/deals/agent.js (met account). Zie opdracht.js voor de criteria.
import { pastBij } from './opdracht.js';
import { mediaan } from './historie.js';

const gem = (r) => (r.length ? r.reduce((a, b) => a + b, 0) / r.length : null);
const pct = (k) => `${Math.round(k * 100)}%`;
const eur = (n) => `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Trend uit een reeks dagprijzen (oud → nieuw): vergelijk het gemiddelde van
// de laatste 7 dagen met dat van 7 dagen rond 14 en 30 dagen geleden.
export function trend(reeks) {
  const p = (reeks || []).filter(Number.isFinite);
  if (p.length < 21) return { richting: 'onbekend', verandering14: null, verandering30: null, wekenDalend: 0 };
  const nu = gem(p.slice(-7));
  const v14 = gem(p.slice(-21, -14));
  const v30 = p.length >= 37 ? gem(p.slice(-37, -30)) : null;
  const ch14 = v14 ? nu / v14 - 1 : null;
  const ch30 = v30 ? nu / v30 - 1 : null;
  const hoofd = ch30 ?? ch14;
  const richting = hoofd === null ? 'onbekend' : hoofd < -0.03 ? 'dalend' : hoofd > 0.03 ? 'stijgend' : 'stabiel';
  // Hoeveel weken op rij daalde het weekgemiddelde (≥ 1%)?
  const weken = [];
  for (let i = p.length; i - 7 >= 0 && weken.length < 8; i -= 7) weken.unshift(gem(p.slice(i - 7, i)));
  let wekenDalend = 0;
  for (let i = weken.length - 1; i > 0 && weken[i] < weken[i - 1] * 0.99; i--) wekenDalend++;
  const r = (x) => (x === null ? null : Math.round(x * 1000) / 1000);
  return { richting, verandering14: r(ch14), verandering30: r(ch30), wekenDalend };
}

// Haalt de beste kandidaat de drempels van de jacht?
export function drempelGehaald(c, d) {
  if (!d) return false;
  const prijs = c.inclusiefVerzending === false ? d.prijs ?? d.totaal : d.totaal;
  if (c.maxTotaal !== null && c.maxTotaal !== undefined && prijs > c.maxTotaal + 1e-9) return false;
  if (c.minKorting) {
    if (d.echteKorting === null || d.echteKorting === undefined || d.echteKorting * 100 + 1e-9 < c.minKorting) return false;
  }
  return true;
}

export function maakRapport(c, deals, { nu = Date.now(), live = [], minDagen = 14 } = {}) {
  const kandidaten = deals.filter((d) => pastBij(c, d)).sort((a, b) => a.totaal - b.totaal || (b.echteKorting ?? -1) - (a.echteKorting ?? -1));
  const tijd = new Date(nu).toISOString();
  const bronnen = new Set(kandidaten.flatMap((d) => [d.bron, ...(d.winkels || []).map((w) => w.bron)]).filter(Boolean));
  for (const l of live) bronnen.add(l.bron);
  const prijzen = kandidaten.reduce((t, d) => t + (d.spark?.length || 0) + (d.winkels?.length || 0), 0) + live.length;
  if (!kandidaten.length) {
    return { tijd, beste: null, alternatieven: [], gangbaar: null, laagste30: null, trend: trend([]), oordeel: { soort: 'data', tekst: 'Nog niets gevonden', reden: 'Geen aanbod dat past bij je opdracht. Je jager blijft zoeken.' }, bewijs: null, cijfers: { bronnen: bronnen.size, prijzen, kandidaten: 0 }, gehaald: false };
  }
  const beste = kandidaten[0];
  // Alternatieven: andere winkels voor hetzelfde product, dan andere producten
  const alternatieven = [
    ...(beste.winkels || []).filter((w) => w.winkel !== beste.winkel).map((w) => ({ titel: beste.titel, winkel: w.winkel, totaal: w.totaal, verzendkosten: w.verzendkosten ?? null, url: w.url || null, pagina: beste.pagina })),
    ...kandidaten.slice(1).map((d) => ({ titel: d.titel, winkel: d.winkel, totaal: d.totaal, verzendkosten: d.verzendkosten ?? null, url: d.url || null, pagina: d.pagina })),
  ]
    .sort((a, b) => a.totaal - b.totaal)
    .slice(0, 3);
  const t = trend(beste.spark);
  const gehaald = drempelGehaald(c, beste);
  let oordeel;
  if (beste.gangbaar === null || beste.gangbaar === undefined || (beste.dagen ?? 0) < minDagen) {
    oordeel = { soort: 'data', tekst: 'Nog te weinig data', reden: `We volgen dit pas ${beste.dagen ?? 0} dag(en). Na ${minDagen} dagen kunnen we eerlijk zeggen of de prijs laag is.` };
  } else if (beste.nep) {
    oordeel = { soort: 'nep', tekst: `Nep-korting gezien bij ${beste.winkel}`, reden: (beste.nepRedenen && beste.nepRedenen[0]) || 'De ‘van’-prijs klopt niet met wat we zagen.' };
  } else if (gehaald && ((beste.echteKorting ?? 0) >= 0.1 || beste.onderLaagste30)) {
    const delen = [beste.echteKorting > 0 ? `${pct(beste.echteKorting)} onder de gangbare prijs` : null, beste.onderLaagste30 ? 'lager dan de laagste prijs van de afgelopen 30 dagen' : null].filter(Boolean);
    oordeel = { soort: 'kopen', tekst: 'Nu kopen', reden: `${eur(beste.totaal)} incl. verzending: ${delen.join(' en ')}.` };
  } else if (t.richting === 'dalend') {
    oordeel = { soort: 'wachten', tekst: 'Wachten', reden: t.wekenDalend >= 2 ? `De prijs daalt al ${t.wekenDalend} weken.` : 'De prijs daalt; de kans is groot dat hij nog lager wordt.' };
  } else if (gehaald) {
    oordeel = { soort: 'kopen', tekst: 'Nu kopen', reden: `Binnen je doel: ${eur(beste.totaal)} incl. verzending.` };
  } else {
    const doel = c.maxTotaal ?? (c.minKorting && beste.gangbaar ? beste.gangbaar * (1 - c.minKorting / 100) : null);
    oordeel = { soort: 'wachten', tekst: 'Wachten', reden: doel ? `Nu ${eur(beste.totaal)}; je doel is ${eur(doel)}. Nog ${pct(beste.totaal / doel - 1)} te duur.` : 'Nog geen echte korting.' };
  }
  return {
    tijd,
    beste: { id: beste.id, titel: beste.titel, winkel: beste.winkel, totaal: beste.totaal, verzendkosten: beste.verzendkosten ?? null, url: beste.url || null, pagina: beste.pagina, echteKorting: beste.echteKorting, demo: !!beste.demo },
    alternatieven,
    gangbaar: beste.gangbaar,
    laagste30: beste.laagste30,
    trend: t,
    oordeel,
    bewijs: { winkels: beste.winkelsGezien ?? null, dagen: beste.dagen ?? null, bronnen: beste.bronnen ?? null, bijgewerkt: beste.bijgewerkt || null, mediaan: beste.spark?.length ? Math.round(mediaan(beste.spark) * 100) / 100 : null },
    cijfers: { bronnen: bronnen.size, prijzen, kandidaten: kandidaten.length },
    spark: (beste.spark || []).slice(-60),
    gehaald,
  };
}

// Wat is er veranderd sinds het vorige rapport? (voor 'Ik ben er weer')
export function verschil(vorig, nieuw) {
  const uit = [];
  if (!nieuw) return uit;
  if (!vorig || !vorig.beste) {
    if (nieuw.beste) uit.push(`Gevonden: ${nieuw.beste.titel} voor ${eur(nieuw.beste.totaal)} bij ${nieuw.beste.winkel}.`);
    return uit;
  }
  if (nieuw.beste && Math.abs(nieuw.beste.totaal - vorig.beste.totaal) >= 0.01) {
    uit.push(`Beste prijs ${nieuw.beste.totaal < vorig.beste.totaal ? 'gedaald' : 'gestegen'} van ${eur(vorig.beste.totaal)} naar ${eur(nieuw.beste.totaal)}.`);
  }
  if (nieuw.beste && nieuw.beste.winkel !== vorig.beste.winkel) uit.push(`Nu het goedkoopst bij ${nieuw.beste.winkel}.`);
  if (nieuw.oordeel.tekst !== vorig.oordeel?.tekst) uit.push(`Nieuw oordeel: ${nieuw.oordeel.tekst}.`);
  return uit;
}

// Is een nieuw rapport het melden waard? (mail bij account)
export const meldenswaard = (vorig, nieuw) => !!nieuw && (nieuw.gehaald && !vorig?.gehaald ? true : verschil(vorig, nieuw).some((r) => /gedaald|Nieuw oordeel: Nu kopen/.test(r)));
