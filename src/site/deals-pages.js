// DealBuddy (/deals/): pagina's en publieke data, gebouwd uit data/deals/.
// build.js roept bouwDeals() aan. Rekenen gebeurt met src/deals/*.js.
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { leesHistorie, leesJson, DATA } from '../../scripts/deals/opslag.js';
import { bouwIndex } from '../deals/dealindex.js';
import { slug, CATEGORIEEN } from '../deals/aanbod.js';
import { weekOverzicht, dagReeks } from '../deals/historie.js';
import { plaats } from '../deals/vluchten.js';
import { grafiekData, grafiekMeerSvg, weekTabel, PERIODES } from '../deals/grafiek.js';
import { esc, euroTekst, procentTekst, datumTekst, tijdTekst, maandTekst, sparklineSvg, grafiekSvg, kortingBadge, kaartHtml, initialen, kleurVan, vluchtResultaat, ouderdom } from '../deals/deals-weergave.js';

const SUBNAV = [
  ['/deals/', 'Deals'],
  ['/deals/vluchten/', 'Vliegtickets'],
  ['/deals/jagers/', 'Mijn jagers'],
  ['/deals/volglijst/', 'Volglijst'],
  ['/deals/over/', 'Zo werkt het'],
];
const START = 'parfum';
const KRUIMEL = (slugPad, naam, tussen = []) => [['/', 'Home'], ['/deals/', 'Deals'], ...tussen, [slugPad, naam]];

function subnav(actief) {
  return `<nav class="deals-sub" aria-label="DealBuddy-menu">${SUBNAV.map(([u, n]) => `<a href="${u}"${u === actief ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`;
}

const merk = '<span class="db-merk" aria-hidden="true"><span class="db-logo">%</span>DealBuddy</span>';

function demoBanner(status) {
  if (!status.demo) return '';
  return `<p class="demo-banner" role="note"><strong>Demo-gegevens.</strong> De winkels, merken en prijzen hieronder zijn verzonnen, zodat je kunt zien hoe DealBuddy werkt. Echte bronnen gaan aan zodra de partneraccounts er zijn. <a href="/deals/over/#bronnen">Meer over de bronnen</a></p>`;
}

function verouderd(status, nu) {
  const t = Date.parse(status.bijgewerkt || 0);
  return !t || nu - t > 24 * 36e5;
}

// ── /deals/ ──
function hubPagina({ deals, status, nu }) {
  const vluchtBeste = new Map();
  for (const d of deals.filter((d) => d.soort === 'vlucht')) {
    const b = vluchtBeste.get(d.route);
    if (!b || (d.echteKorting ?? -1) > (b.echteKorting ?? -1)) vluchtBeste.set(d.route, d);
  }
  // Parfum is de startcategorie: eerst in de lijst en standaard gekozen
  const eerst = (d) => (d.categorie === START ? 0 : 1);
  const kaarten = [...deals.filter((d) => d.soort === 'product'), ...vluchtBeste.values()].sort((a, b) => eerst(a) - eerst(b) || b.score - a.score || a.id.localeCompare(b.id));
  const cats = CATEGORIEEN.filter(([k]) => kaarten.some((d) => d.categorie === k)).sort((a, b) => (a[0] === START ? -1 : b[0] === START ? 1 : 0));
  const start = cats.some(([k]) => k === START) ? START : '';
  const echt = kaarten.filter((d) => (d.echteKorting ?? 0) >= 0.1 && !d.nep).length;
  return `
<section class="deals-hero">
<div class="deals-hero-deco" aria-hidden="true"><span></span><span></span><span></span></div>
${merk}
<h1>Echte deals, <span class="db-accent">eerlijk berekend</span></h1>
<p class="intro">We vergelijken de prijs van vandaag met de <strong>gangbare prijs</strong>: wat een product de afgelopen 90 dagen meestal kostte, inclusief verzendkosten. Zo zie je meteen of een korting echt is.</p>
<p class="teller" aria-live="polite"><span class="teller-getal" data-teller>${kaarten.length}</span> <span data-teller-tekst>deals gevonden</span>, waarvan <strong data-teller-echt>${echt}</strong> minstens 10% onder de gangbare prijs · laatst bijgewerkt <time datetime="${esc(status.bijgewerkt || '')}">${esc(tijdTekst(status.bijgewerkt))}</time>${verouderd(status, nu) ? ' <span class="badge badge-let">niet actueel</span>' : ''}</p>
${subnav('/deals/')}
</section>
${demoBanner(status)}
<form class="deals-filter" role="search" data-filter>
<div class="zoek-rij"><label for="deals-zoek">Zoek een product, merk of bestemming</label>
<div class="zoek-veld"><input id="deals-zoek" name="q" type="search" placeholder="Bijv. parfum, koptelefoon of Lissabon" autocomplete="off"><button type="submit" class="knop">Zoeken</button></div></div>
<fieldset class="chips"><legend>Categorie</legend>
${cats.map(([k, n], i) => `${i === 1 || (i === 0 && k !== START) ? `<button type="button" class="chip" data-cat="" aria-pressed="${!start}">Alles</button>\n` : ''}<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === start}">${n}</button>`).join('\n')}
</fieldset>
<div class="schuif"><label for="deals-min">Toon alleen deals van minstens <output for="deals-min" data-min-uit>0</output>% onder de gangbare prijs</label>
<input id="deals-min" name="min" type="range" min="0" max="60" step="5" value="0" aria-describedby="deals-min-hint">
<p class="hint" id="deals-min-hint">Gangbare prijs = de mediaan van de laagste dagprijs (incl. verzending) over 90 dagen.</p></div>
<div class="sorteer"><label for="deals-sorteer">Sorteer op</label><select id="deals-sorteer" name="sorteer"><option value="score">Beste deal</option><option value="korting">Hoogste echte korting</option><option value="prijs">Laagste prijs</option></select></div>
</form>
<section class="live" data-live hidden aria-labelledby="live-kop">
<h2 id="live-kop">Live gezocht</h2>
<p class="live-noot" data-live-noot></p>
<ul class="live-chips" data-live-chips aria-label="Bronnen"></ul>
<ol class="live-lijst" data-live-lijst aria-live="polite"></ol>
</section>
<p class="geen-resultaat" data-leeg hidden>Geen deals gevonden met deze keuze. Zet de schuif lager of kies een andere categorie.</p>
<div class="deal-raster" data-raster>
${kaarten.map((d) => kaartHtml(d, nu)).join('\n')}
</div>
<section class="deals-uitleg">
<h2>Waarom DealBuddy anders is</h2>
<div class="uitleg-raster">
<div><h3>Altijd inclusief verzending</h3><p>Een lage prijs met hoge verzendkosten is geen deal. Wij rekenen met de totaalprijs en houden rekening met gratis verzending vanaf een bepaald bedrag.</p></div>
<div><h3>Nep-kortingen ontmaskerd</h3><p>Noemt een winkel een hoge ‘van’-prijs, maar was het product de afgelopen 30 dagen al even goedkoop? Dan zie je een waarschuwing.</p></div>
<div><h3>Jij kiest de drempel</h3><p>Volg een product en kies zelf hoeveel procent onder de gangbare prijs het moet zijn. <a href="/deals/jagers/">Zet een jager aan</a>.</p></div>
</div>
<p class="disclosure">Sommige links zijn partnerlinks: koop je iets, dan krijgen wij een kleine vergoeding. Dat verandert niets aan de volgorde: die hangt alleen af van de echte korting, de versheid en de betrouwbaarheid van de winkel. Er zijn geen betaalde plaatsen. <a href="/deals/over/#partnerlinks">Meer uitleg</a></p>
</section>`;
}

// ── /deals/p/<slug>/ ──
function productPagina({ deal, ov, nu, status, record }) {
  const gd = grafiekData(record, nu);
  const winkels = ov.aanbod
    .map(
      (o, i) => `<tr${i === 0 ? ' class="beste"' : ''}><th scope="row">${esc(o.winkel)}${o.affiliate ? ' <span class="partner-label-klein">partnerlink</span>' : ''}</th><td>${esc(euroTekst(o.prijs))}</td><td>${
        o.verzendBekend ? (o.totaal - o.prijs > 0.004 ? esc(euroTekst(o.totaal - o.prijs)) : 'gratis') : 'onbekend'
      }${o.gratisVerzendingVanaf ? `<small>gratis vanaf ${esc(euroTekst(o.gratisVerzendingVanaf, 0))}</small>` : ''}</td><td><strong>${esc(euroTekst(o.totaal))}</strong></td><td>${esc(tijdTekst(o.tijd))}</td><td>${
        o.url ? `<a href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank">Naar winkel<span class="skip"> ${esc(o.winkel)} (opent nieuw venster)</span></a>` : '–'
      }</td></tr>`,
    )
    .join('');
  const modus = ov.modus ? `${euroTekst(ov.modus.van, 0)} – ${euroTekst(ov.modus.tot, 0)}` : '–';
  const tegels = [
    ['Nu (laagste totaal)', euroTekst(deal.totaal), deal.winkel ? `bij ${deal.winkel}` : ''],
    ['Gangbare prijs', euroTekst(deal.gangbaar), 'mediaan 90 dagen'],
    ['Echte korting', procentTekst(deal.echteKorting), 'tegenover gangbaar'],
    ['Laagste 30 dagen', euroTekst(deal.laagste30), 'Omnibus-regel'],
    ['Meest voorkomend', modus, 'prijsband'],
    ['Gemeten', `${deal.dagen} dagen`, `${deal.winkelsGezien} winkels`],
  ];
  const nep = deal.nep
    ? `<div class="nep-blok" role="note"><h2>Pas op: dit lijkt een nep-korting</h2><p>De winkel noemt een ‘van’-prijs van <strong>${esc(euroTekst(deal.vanPrijs))}</strong> (${esc(procentTekst(deal.geclaimd))} korting). Maar:</p><ul>${deal.nepRedenen.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`
    : '';
  return `
<section class="deals-hero deals-hero-klein">
${merk}
<p class="deal-meta"><span class="deal-cat">${esc(deal.categorie)}</span>${deal.demo ? '<span class="badge badge-demo">demo</span>' : ''}</p>
<h1>${esc(deal.titel)}</h1>
<p class="intro">${deal.merk ? `${esc(deal.merk)} · ` : ''}${deal.winkelsNu} winkel${deal.winkelsNu === 1 ? '' : 's'} vergeleken, inclusief verzendkosten.</p>
<div class="prijs-groot"><span class="totaal">${esc(euroTekst(deal.totaal))}</span> ${kortingBadge(deal)}</div>
${subnav('')}
</section>
${demoBanner(status)}
${nep}
<section class="deal-blok" aria-labelledby="kop-verloop"><h2 id="kop-verloop">Prijsverloop per winkel${gd.demo ? ' <span class="badge badge-demo">demo</span>' : ''}</h2>
${prijsGrafiek(gd)}
<div class="tegels">${tegels.map(([k, v, s]) => `<div class="tegel"><p class="tegel-kop">${esc(k)}</p><p class="tegel-waarde">${esc(v)}</p><p class="tegel-sub">${esc(s)}</p></div>`).join('')}</div>
</section>
<section class="deal-blok" aria-labelledby="kop-winkels"><h2 id="kop-winkels">Prijzen per winkel</h2>
<div class="tabel-scroll" tabindex="0" role="region" aria-labelledby="kop-winkels"><table class="deals-tabel"><thead><tr><th scope="col">Winkel</th><th scope="col">Prijs</th><th scope="col">Verzending</th><th scope="col">Totaal</th><th scope="col">Gezien</th><th scope="col"><span class="skip">Link</span></th></tr></thead><tbody>${winkels}</tbody></table></div>
<p class="hint">Prijzen kunnen veranderen. Controleer altijd de prijs en verzendkosten in de winkel. <a href="/deals/bewijs/${esc(deal.paginaSlug)}/">Bekijk het volledige bewijs</a>.</p>
</section>
<section class="deal-blok alarm-blok" aria-labelledby="kop-alarm"><h2 id="kop-alarm">Zet een prijsalarm</h2>
<form class="alarm-form" data-alarm data-id="${esc(deal.id)}" data-titel="${esc(deal.titel)}" data-gangbaar="${deal.gangbaar ?? ''}">
<div class="schuif"><label for="alarm-korting">Gewenste korting: minstens <output for="alarm-korting" data-alarm-uit>20</output>% onder de gangbare prijs</label>
<input id="alarm-korting" name="minKorting" type="range" min="0" max="60" step="5" value="20"><p class="hint" data-alarm-prijs></p></div>
<div class="veld"><label for="alarm-max">Maximale prijs incl. verzending <small>(optioneel)</small></label><div class="euro"><span aria-hidden="true">€</span><input id="alarm-max" name="maxPrijs" inputmode="decimal" autocomplete="off"></div></div>
<button type="submit" class="knop">Bewaar in mijn volglijst</button>
<p class="formulier-status" role="status" aria-live="polite" data-alarm-status></p>
</form>
<p class="hint">Je volglijst staat alleen in deze browser. Geen account nodig.</p>
</section>`;
}

// Interactieve grafiek: voorgerenderde SVG + data voor deals-grafiek.js
export function prijsGrafiek(gd) {
  const tabel = weekTabel(gd);
  const json = JSON.stringify(gd).replace(/</g, '\\u003c');
  return `<div class="pg-kader" data-pg>
<div class="pg-periodes" role="group" aria-label="Periode">${PERIODES.map(([k, n]) => `<button type="button" class="chip" data-periode="${k}" aria-pressed="${k === '90'}">${n}</button>`).join('')}</div>
<div class="pg-teken" data-pg-teken role="group" aria-label="Grafiek. Gebruik de pijltjes links en rechts om per dag de prijzen te zien.">${grafiekMeerSvg(gd, { dagen: 90 })}</div>
<div class="pg-tip" id="pg-tip" data-pg-tip hidden></div>
<p class="hint pg-uitleg">Elke lijn is één winkel: de totaalprijs incl. verzending. Tik of beweeg over de grafiek voor de prijzen per dag. Tik op een winkel om hem aan of uit te zetten.</p>
<ul class="pg-legenda" aria-label="Winkels">${gd.winkels.map((w) => `<li><button type="button" class="pg-winkel" data-winkel="${esc(w.winkel)}" aria-pressed="true"><span class="pg-stip pg-kleur-${w.kleur}" aria-hidden="true"></span>${esc(w.winkel)}</button></li>`).join('')}
<li class="pg-vast"><span class="lg lg-gangbaar"></span> gangbare prijs</li><li class="pg-vast"><span class="lg lg-l30"></span> laagste 30 dagen</li></ul>
<details class="pg-tabel"><summary>Toon de prijzen als tabel</summary>
<div class="tabel-scroll" tabindex="0" role="region" aria-label="Prijzen per week per winkel"><table class="deals-tabel"><thead><tr><th scope="col">Week tot</th>${tabel.winkels.map((w) => `<th scope="col">${esc(w)}</th>`).join('')}</tr></thead>
<tbody>${tabel.rijen.map((r) => `<tr><th scope="row">${esc(datumTekst(r.datum, true))}</th>${r.prijzen.map((p) => `<td>${esc(euroTekst(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
<script type="application/json" data-pg-data>${json}</script>
</div>`;
}

// ── /deals/bewijs/<slug>/ (noindex) ──
function bewijsPagina({ deal, ov, nu, record }) {
  const winkelRijen = Object.keys(record.winkels)
    .sort()
    .map((w) => {
      const reeks = dagReeks(record, w);
      const weken = weekOverzicht(reeks.slice(-90));
      return `<h3>${esc(w)}</h3><p class="hint">${reeks.length} dagen gezien, van ${esc(datumTekst(reeks[0]?.datum, true))} tot ${esc(datumTekst(reeks.at(-1)?.datum, true))}. Bron: ${esc(record.winkels[w].bron)}.</p>
<div class="tabel-scroll" tabindex="0" role="region" aria-label="Weekprijzen ${esc(w)}"><table class="deals-tabel smal"><thead><tr><th scope="col">Week</th><th scope="col">Laagste</th><th scope="col">Mediaan</th><th scope="col">Dagen</th></tr></thead><tbody>${weken
        .map((x) => `<tr><th scope="row">${esc(x.week)}</th><td>${esc(euroTekst(x.laagste))}</td><td>${esc(euroTekst(x.mediaan))}</td><td>${x.dagen}</td></tr>`)
        .join('')}</tbody></table></div>`;
    })
    .join('');
  return `
<section class="deals-hero deals-hero-klein">${merk}
<h1>Bewijs: ${esc(deal.titel)}</h1>
<p class="intro">Alle prijzen die we zagen, per winkel en per week. Zo kun je zelf controleren of de korting echt is.</p>
${subnav('')}</section>
${deal.demo ? '<p class="demo-banner" role="note"><strong>Demo-gegevens:</strong> verzonnen prijzen om te laten zien hoe het bewijs eruitziet.</p>' : ''}
<section class="deal-blok"><h2>Samenvatting</h2>
<ul class="bewijs-lijst">
<li>Nu: <strong>${esc(euroTekst(deal.totaal))}</strong> bij ${esc(deal.winkel)} (incl. verzending)</li>
<li>Gangbare prijs: <strong>${esc(euroTekst(deal.gangbaar))}</strong> (mediaan van de laagste dagprijs, 90 dagen)</li>
<li>Echte korting: <strong>${esc(procentTekst(deal.echteKorting))}</strong></li>
<li>Laagste prijs in de 30 dagen hiervoor: <strong>${esc(euroTekst(deal.laagste30))}</strong>${deal.onderLaagste30 ? ' – de prijs van nu is lager' : ''}</li>
<li>Gemeten op <strong>${deal.dagen}</strong> dagen bij <strong>${deal.winkelsGezien}</strong> winkels, via ${deal.bronnen} bron(nen)</li>
</ul>
<div class="grafiek-kader">${grafiekSvg(ov.reeks, { nu, gangbaar: deal.gangbaar, laagste30: deal.laagste30, huidig: deal.totaal, dagen: 180, id: 'bewijs', titel: `Prijsverloop ${deal.titel} (180 dagen)` })}</div>
<p><a href="${esc(deal.pagina)}">Terug naar het product</a></p>
</section>
<section class="deal-blok"><h2>Per winkel</h2>${winkelRijen}</section>`;
}

// ── /deals/vluchten/ ──
function vluchtenPagina({ routes, status, nu }) {
  const van = [...new Set(routes.map((r) => r.van))];
  const naar = [...new Set(routes.map((r) => r.naar))];
  const eerste = routes[0];
  const maand = eerste?.beste?.maand || eerste?.maanden[0]?.maand;
  const m = eerste?.maanden.find((x) => x.maand === maand);
  const oudste = routes.flatMap((r) => r.maanden.flatMap((x) => x.kalender.dagen.filter((d) => d.tijd).map((d) => d.tijd))).sort()[0];
  return `
<section class="deals-hero deals-hero-vlucht">
<div class="deals-hero-deco" aria-hidden="true"><span></span><span></span><span></span></div>
${merk}
<h1>Vliegtickets onder de <span class="db-accent">gangbare prijs</span></h1>
<p class="intro">Kies een route en een maand. Je ziet per vertrekdag de laagste prijs, en wat die route in die maand normaal kost.</p>
${subnav('/deals/vluchten/')}
</section>
${demoBanner(status)}
<form class="vlucht-form" data-vluchten>
<div class="veld"><label for="v-van">Van</label><select id="v-van" name="van">${van.map((c) => `<option value="${c}"${c === eerste?.van ? ' selected' : ''}>${esc(plaats(c))} (${c})</option>`).join('')}</select></div>
<div class="veld"><label for="v-naar">Naar</label><select id="v-naar" name="naar">${naar.map((c) => `<option value="${c}"${c === eerste?.naar ? ' selected' : ''}>${esc(plaats(c))} (${c})</option>`).join('')}</select></div>
<div class="veld"><label for="v-maand">Maand</label><select id="v-maand" name="maand">${(eerste?.maanden || []).map((x) => `<option value="${x.maand}"${x.maand === maand ? ' selected' : ''}>${esc(maandTekst(x.maand))}</option>`).join('')}</select></div>
<button type="submit" class="knop">Toon prijzen</button>
</form>
<p class="hint vlucht-noot">Prijzen zijn een <strong>indicatie</strong>: ze komen uit zoekresultaten van de afgelopen dagen${oudste ? ` (de oudste is ${esc(ouderdom(oudste, nu))})` : ''}. Enkele reis per persoon, inclusief belastingen. Bagage en de echte prijs zie je pas bij het boeken.</p>
<div class="vlucht-resultaat" data-vlucht-resultaat aria-live="polite">${m ? vluchtResultaat(eerste, m, nu) : '<p>Nog geen vluchtprijzen.</p>'}</div>`;
}

// ── /deals/volglijst/ ──
function volglijstPagina({ status }) {
  return `
<section class="deals-hero deals-hero-klein">${merk}
<h1>Mijn volglijst</h1>
<p class="intro">Producten en routes die je volgt, met de prijs van nu tegenover jouw drempel. Alles staat alleen in deze browser.</p>
${subnav('/deals/volglijst/')}</section>
${demoBanner(status)}
<div class="volglijst" data-volglijst aria-live="polite"><p>Volglijst laden…</p></div>
<section class="deal-blok"><h2>Bewaren of overzetten</h2>
<p>Zet je volglijst over naar een andere browser met een bestand.</p>
<p class="knoppen"><button type="button" class="knop-licht" data-export>Exporteer (JSON)</button>
<label class="knop-licht bestand-knop" for="volg-import">Importeer (JSON)</label><input id="volg-import" type="file" accept="application/json,.json" class="verborgen-invoer" data-import></p>
<p role="status" aria-live="polite" data-volg-status></p></section>`;
}

// ── /deals/jagers/ ──
function jagersPagina({ status }) {
  return `
<section class="deals-hero">
<div class="deals-hero-deco" aria-hidden="true"><span></span><span></span><span></span></div>
${merk}
<h1>Mijn <span class="db-accent">jagers</span></h1>
<p class="intro">Zeg in gewone woorden wat je zoekt. Je jager zoekt bij elk bezoek in alle bronnen en vertelt je eerlijk: nu kopen, of beter wachten.</p>
${subnav('/deals/jagers/')}
</section>
${demoBanner(status)}
<div class="terug-samenvatting" data-terug hidden role="status"></div>
<form class="jager-form" data-jager-form>
<label for="jager-opdracht">Wat zoek je?</label>
<div class="zoek-veld"><input id="jager-opdracht" name="opdracht" autocomplete="off" placeholder="Bijv. parfum Bloesem 50 ml onder € 55 incl. verzending" required><button class="knop" type="submit">Maak jager</button></div>
<p class="hint">Voorbeelden: <button type="button" class="link-knop" data-voorbeeld="koptelefoon minstens 20% onder gangbare prijs">koptelefoon minstens 20% onder gangbare prijs</button> · <button type="button" class="link-knop" data-voorbeeld="vlucht Amsterdam–Lissabon in januari, max €120">vlucht Amsterdam–Lissabon in januari, max €120</button> · <button type="button" class="link-knop" data-voorbeeld="airfryer onder 80 euro">airfryer onder 80 euro</button></p>
</form>
<div class="jager-bevestig" data-bevestig hidden></div>
<div class="jagers" data-jagers aria-live="polite"></div>
<section class="deal-blok"><h2>Hoe werkt een jager?</h2>
<ol>
<li>Je jager staat <strong>alleen in deze browser</strong> (geen account nodig).</li>
<li>Bij elk bezoek zoekt hij in onze prijsindex (elk uur bijgewerkt) en, als dat aan staat, live bij de bronnen.</li>
<li>Je krijgt een rapport: beste aanbod incl. verzending, de gangbare prijs, de trend en een oordeel. Met bewijs: welke winkels, welke dagen.</li>
<li>Is er te weinig data, dan zeggen we dat eerlijk. Geen gok.</li>
</ol></section>`;
}

// ── /deals/over/ ──
function overPagina({ status, winkels }) {
  const st = status.winkels || {};
  const rij = (b) => `<tr><th scope="row">${esc(b.label)}</th><td>${b.actief ? (b.status === 'ok' ? '<span class="badge badge-echt">aan</span>' : '<span class="badge badge-let">fout</span>') : '<span class="badge badge-geen">uit</span>'}</td><td>${b.actief ? b.aantal : '–'}</td></tr>`;
  return `
<section class="deals-hero deals-hero-klein">${merk}
<h1>Zo werkt DealBuddy</h1>
<p class="intro">Eerlijk over hoe we prijzen vinden, wat ‘gangbaar’ betekent en waar we aan verdienen.</p>
${subnav('/deals/over/')}</section>
<div class="tekst-blok">
<h2>De gangbare prijs</h2>
<p>Elke dag noteren we per product de <strong>laagste totaalprijs</strong>: prijs plus verzendkosten, bij alle winkels die we kennen. Gratis verzending vanaf een bedrag rekenen we mee. De <strong>gangbare prijs</strong> is de mediaan van die dagprijzen over de laatste 90 dagen (zonder vandaag). Hebben we minder dan 7 dagen, dan noemen we nog geen gangbare prijs.</p>
<p><strong>Echte korting</strong> = 1 − prijs nu ÷ gangbare prijs. We tonen ook de prijsband waarin het product het vaakst zat.</p>
<h2 id="omnibus">Nep-kortingen en de Omnibus-regel</h2>
<p>Sinds 2022 moet een winkel bij een prijsverlaging de laagste prijs van de 30 dagen ervoor noemen (EU-richtlijn ‘Omnibus’, in Nederland art. 6:193a e.v. BW en de Prijzenwet). Wij controleren dat zelf: noemt een winkel een ‘van’-prijs, maar is de prijs nu niet echt lager dan gangbaar, of niet lager dan de laagste prijs van 30 dagen? Dan tonen we een waarschuwing.</p>
<h2 id="bronnen">Bronnen nu</h2>
<p>Laatst bijgewerkt: <strong>${esc(tijdTekst(status.bijgewerkt))}</strong>.${status.demo ? ' <strong>Op dit moment draaien we op demo-gegevens</strong>: verzonnen winkels (adressen op .example) en verzonnen merken. Zo kun je de site testen voordat de echte bronnen aan staan.' : ''}</p>
<div class="tabel-scroll" tabindex="0" role="region" aria-label="Status van de bronnen"><table class="deals-tabel smal"><thead><tr><th scope="col">Bron</th><th scope="col">Status</th><th scope="col">Prijzen laatste ronde</th></tr></thead><tbody>${(status.bronnen || []).map(rij).join('')}</tbody></table></div>
<p>Vliegtickets komen uit zoekresultaten van andere reizigers (Travelpayouts). Die zijn een paar dagen oud: we tonen ze als indicatie, met de leeftijd erbij.</p>
<h2 id="winkels">Winkels die onze jager bezoekt</h2>
<p>Onze jager kijkt alleen naar openbare productpagina’s en openbare winkel-API’s, en alleen als de robots.txt van de winkel dat toestaat. We nemen alleen feiten over: titel, prijs, verzendkosten, link en de link naar de afbeelding. Geen teksten of foto’s.</p>
<div class="tabel-scroll" tabindex="0" role="region" aria-label="Status per winkel"><table class="deals-tabel smal"><thead><tr><th scope="col">Winkel</th><th scope="col">Categorie</th><th scope="col">Status</th></tr></thead><tbody>${winkels
    .map((w) => {
      const s = st[w.domein];
      const label = w.uitgesloten ? 'niet bezocht' : !s ? 'nog niet bezocht' : { ok: 'ok', robots: 'robots.txt: niet toegestaan', geblokkeerd: 'geblokkeerd (wij stoppen)', fout: 'tijdelijke fout' }[s.status] || s.status;
      return `<tr><th scope="row">${esc(w.naam)}</th><td>${esc(w.categorie)}</td><td>${esc(label)}${w.uitgesloten ? `<small>${esc(w.uitgesloten)}</small>` : ''}</td></tr>`;
    })
    .join('')}</tbody></table></div>
<h2 id="bot">Onze bot: DealBuddyBot</h2>
<ul>
<li>User-Agent: <code>DealBuddyBot/1.0 (+https://www.toeslagbuddy.nl/deals/over/)</code></li>
<li>Volgt robots.txt altijd. robots.txt is ook het officiële voorbehoud tegen tekst- en datamining (EU-richtlijn 2019/790, art. 4).</li>
<li>Per winkel één verzoek tegelijk, minimaal 5 seconden ertussen (of langer als de winkel een Crawl-delay vraagt).</li>
<li>Bij 403 of 429 stoppen we die ronde met die winkel. We respecteren Retry-After.</li>
<li>Geen captcha’s omzeilen, geen wisselende IP-adressen, geen inloggen, geen betaalmuren.</li>
</ul>
<h2 id="optout">Bent u een winkel?</h2>
<p>Wilt u niet dat DealBuddy uw prijzen toont? Blokkeer <code>DealBuddyBot</code> in uw robots.txt, of mail ons op <a href="mailto:info@toeslagbuddy.nl?subject=DealBuddy%20opt-out">info@toeslagbuddy.nl</a> met uw domein. We zetten het op onze opt-outlijst; de jager slaat het dan direct over en we verwijderen uw prijzen bij de volgende ronde. Klopt een prijs niet? Mail ons, dan passen we het aan.</p>
<h2 id="partnerlinks">Partnerlinks</h2>
<p>Sommige links naar winkels zijn partnerlinks (affiliate). Koopt u via zo’n link, dan krijgen wij een kleine vergoeding van de winkel. U betaalt niets extra. Partnerlinks staan erbij aangegeven. De volgorde van de deals hangt <strong>nooit</strong> af van een vergoeding: alleen van de echte korting, de versheid van de prijs en de betrouwbaarheid van de winkel.</p>
<h2>Privacy</h2>
<p>Je volglijst en je jagers staan in je eigen browser (localStorage). Wij zien ze niet. Live zoeken stuurt alleen je zoekwoorden naar onze server, zonder cookies.</p>
</div>`;
}

// ── Bouwen ──
export function bouwDeals({ dist, versie, layout, map = DATA }) {
  const { producten, vluchten } = leesHistorie(map);
  const status = leesJson(join(map, 'status.json'), { bijgewerkt: null, demo: true, bronnen: [] });
  const winkels = (leesJson(join(map, 'winkels.json'), { winkels: [] }).winkels || []).slice().sort((a, b) => a.naam.localeCompare(b.naam));
  // Rekenmoment = laatste verzamelronde (dan klopt 'nu' ook als de build later draait)
  const nu = Date.parse(status.bijgewerkt || '') || Date.now();
  const betrouwbaarheid = Object.fromEntries(winkels.filter((w) => w.betrouwbaarheid).map((w) => [w.naam, w.betrouwbaarheid]));
  const gebruikt = new Set();
  const paginaSlug = new Map();
  for (const r of [...producten.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    let s = slug(r.titel) || slug(r.id);
    if (gebruikt.has(s)) s = `${s}-${slug(r.id).slice(-6)}`;
    gebruikt.add(s);
    paginaSlug.set(r.id, s);
  }
  const index = bouwIndex([...producten.values()], [...vluchten.values()], nu, { pagina: (r) => `/deals/p/${paginaSlug.get(r.id)}/`, betrouwbaarheid });
  for (const p of index.producten) p.deal.paginaSlug = paginaSlug.get(p.deal.id);

  const paginas = [];
  const schrijf = (pad, page, html) => {
    const dir = join(dist, pad);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), layout({ versie, zonderHulp: true, bodyKlasse: 'deals', ...page, slug: pad }, `<div class="deals-pagina">${html}</div>`));
    paginas.push({ slug: pad, ...page });
  };

  schrijf('/deals/', { title: 'Deals onder de gangbare prijs – DealBuddy', h1: 'Deals', kort: 'Deals', description: 'Echte deals op parfum, elektronica, huis, speelgoed en vliegtickets. We vergelijken met de gangbare prijs van 90 dagen, inclusief verzendkosten.', script: ['deals-lijst.js', 'deals-live.js'], kruimel: [['/', 'Home'], ['/deals/', 'Deals']] }, hubPagina({ deals: index.deals, status, nu }));
  for (const { deal, ov } of index.producten) {
    const pad = `/deals/p/${deal.paginaSlug}/`;
    const record = producten.get(deal.id);
    schrijf(pad, {
      title: `${deal.titel}: prijs en prijsverloop`,
      h1: deal.titel,
      description: `${deal.titel}: nu ${euroTekst(deal.totaal)} incl. verzending. Gangbare prijs ${euroTekst(deal.gangbaar)}. Prijsverloop van 90 dagen en prijzen per winkel.`,
      kruimel: KRUIMEL(pad, deal.titel),
      // Demo-producten niet in zoekmachines: verzonnen prijzen horen daar niet
      noindex: deal.demo,
      script: ['deals-product.js', 'deals-grafiek.js'],
      schemas: deal.demo
        ? []
        : [{ '@context': 'https://schema.org', '@type': 'Product', name: deal.titel, ...(deal.merk ? { brand: { '@type': 'Brand', name: deal.merk } } : {}), ...(/^\d{13}$/.test(deal.id) ? { gtin13: deal.id } : {}), offers: { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: deal.totaal, offerCount: ov.aanbod.length } }],
    }, productPagina({ deal, ov, nu, status, record }));
    const bpad = `/deals/bewijs/${deal.paginaSlug}/`;
    schrijf(bpad, { title: `Bewijs: ${deal.titel}`, h1: `Bewijs: ${deal.titel}`, description: `Alle gemeten prijzen van ${deal.titel}, per winkel en per week.`, kruimel: KRUIMEL(bpad, 'Bewijs', [[pad, deal.titel]]), noindex: true }, bewijsPagina({ deal, ov, nu, record }));
  }
  schrijf('/deals/vluchten/', { title: 'Goedkope vliegtickets onder de gangbare prijs – DealBuddy', h1: 'Vliegtickets', kort: 'Vliegtickets', description: 'Prijskalender per route: zie per vertrekdag de laagste prijs en wat een vlucht normaal kost. Van Amsterdam, Eindhoven en Rotterdam.', script: ['deals-vluchten.js'], kruimel: KRUIMEL('/deals/vluchten/', 'Vliegtickets') }, vluchtenPagina({ routes: index.routes, status, nu }));
  schrijf('/deals/volglijst/', { title: 'Mijn volglijst – DealBuddy', h1: 'Mijn volglijst', description: 'Je gevolgde producten en routes met de prijs van nu tegenover jouw drempel.', script: ['deals-volglijst.js'], noindex: true, kruimel: KRUIMEL('/deals/volglijst/', 'Volglijst') }, volglijstPagina({ status }));
  schrijf('/deals/jagers/', { title: 'Mijn jagers: persoonlijke prijsagenten – DealBuddy', h1: 'Mijn jagers', description: 'Zeg in gewone woorden wat je zoekt. Je jager zoekt in alle bronnen en zegt eerlijk: nu kopen of wachten.', script: ['deals-jagers.js'], kruimel: KRUIMEL('/deals/jagers/', 'Mijn jagers') }, jagersPagina({ status }));
  schrijf('/deals/over/', { title: 'Zo werkt DealBuddy: bronnen, bot en partnerlinks', h1: 'Zo werkt DealBuddy', kort: 'Zo werkt het', description: 'Hoe DealBuddy de gangbare prijs berekent, nep-kortingen herkent, welke bronnen aan staan en hoe onze bot zich gedraagt.', kruimel: KRUIMEL('/deals/over/', 'Zo werkt het') }, overPagina({ status, winkels }));

  // Publieke data voor de browser
  const dataDir = join(dist, 'deals/data');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'deals.json'), JSON.stringify({ bijgewerkt: status.bijgewerkt, demo: !!status.demo, aantal: index.deals.length, deals: index.deals.map(({ nepRedenen, ...d }) => ({ ...d, nepRedenen })) }));
  writeFileSync(
    join(dataDir, 'vluchten.json'),
    JSON.stringify({
      bijgewerkt: status.bijgewerkt,
      routes: index.routes.map((r) => ({ route: r.route, van: r.van, naar: r.naar, vanNaam: r.vanNaam, naarNaam: r.naarNaam, demo: r.demo, dagen: r.dagen, bronnen: r.bronnen, maanden: r.maanden.map((m) => ({ maand: m.maand, gangbaar: m.gangbaar, laagste30: m.laagste30, echteKorting: m.echteKorting, goedkoopste: m.goedkoopste, kalender: { maand: m.kalender.maand, laagste: m.kalender.laagste, hoogste: m.kalender.hoogste, dagen: m.kalender.dagen.map(({ bron, affiliate, terug, ...d }) => d) } })) })),
    }),
  );
  writeFileSync(join(dataDir, 'status.json'), JSON.stringify({ bijgewerkt: status.bijgewerkt, demo: status.demo, bronnen: status.bronnen }));
  return { paginas, aantal: index.deals.length };
}

export { initialen, kleurVan, sparklineSvg };
