// ToeslagBuddy Familie (/familie/): pagina's, rekenhulpen en de schil van de
// regelkamer. build.js roept bouwFamilie() aan. Regels en bedragen komen uit
// data/familie/regels/ (met officiële bron); rekenen gebeurt met src/familie/.
import { join, dirname } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import config from '../../site.config.js';
import { esc, icoon, uitlegVideo } from './layout.js';
import { MERK } from '../familie/merk.js';
import { FASES } from '../familie/checklist.js';
import { RELATIES } from '../familie/erfbelasting.js';
import { euro } from '../familie/regels.js';
import { GIDSEN } from './familie-gidsen.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const lees = (pad) => JSON.parse(readFileSync(join(ROOT, pad), 'utf8'));

export function leesRegels() {
  const uit = {};
  for (const f of readdirSync(join(ROOT, 'data/familie/regels')).filter((f) => f.endsWith('.json')).sort()) {
    const r = lees(`data/familie/regels/${f}`);
    uit[r.id] = r;
  }
  return uit;
}
const INSTANTIE = { 'hetcak.nl': 'CAK', 'belastingdienst.nl': 'Belastingdienst', 'rijksoverheid.nl': 'Rijksoverheid', 'svb.nl': 'SVB' };
export function leesBronnen() {
  const index = existsSync(join(ROOT, 'data/familie/bronnen/index.json')) ? lees('data/familie/bronnen/index.json').bronnen : {};
  const uit = {};
  for (const b of lees('data/familie/bronnen.json').bronnen) {
    const host = new URL(b.url).host.replace(/^www\./, '');
    uit[b.id] = { naam: INSTANTIE[host] || host, url: b.url, titel: (index[b.id]?.titel || '').replace(/\s*[|–-]\s*(CAK|Belastingdienst|Rijksoverheid\.nl).*$/i, ''), opgehaald: index[b.id]?.opgehaald || null, status: index[b.id]?.status || 'onbekend', onderwerp: b.onderwerp };
  }
  return uit;
}
const REGELS = leesRegels();
const BRONNEN = leesBronnen();
const PRIJZEN = lees('data/familie/prijzen.json');
const datumLang = (iso) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

// Regels (en hun bronnen) als JSON in de pagina, voor de scripts in de browser
function regelsJson(ids) {
  const regels = Object.fromEntries(ids.map((id) => [id, REGELS[id]]));
  const nodig = new Set();
  const loop = (o) => { for (const v of Object.values(o || {})) if (v && typeof v === 'object') { if (typeof v.bron === 'string') nodig.add(v.bron); loop(v); } };
  loop(regels);
  ['ro-aanvaarden', 'bd-toeslagen-partner', 'bd-ib-overledene', 'bd-erf-termijn', 'ro-salderen'].forEach((b) => nodig.add(b));
  const bronnen = Object.fromEntries([...nodig].filter((b) => BRONNEN[b]).map((b) => [b, { naam: BRONNEN[b].naam, url: BRONNEN[b].url }]));
  return `<script type="application/json" id="familie-regels">${JSON.stringify({ regels, bronnen }).replace(/</g, '\\u003c')}</script>`;
}

const bronLink = (id, tekst) => (BRONNEN[id] ? `<a class="f-bron" href="${esc(BRONNEN[id].url)}" rel="noopener" target="_blank">${icoon('bron')}${esc(tekst || BRONNEN[id].naam)}</a>` : '');
const bronnenRij = (regel) => {
  const ids = new Set(regel.bronnen || []);
  for (const groep of [regel.bedragen, regel.percentages, regel.tarieven, regel.termijnen]) for (const v of Object.values(groep || {})) if (v.bron) ids.add(v.bron);
  for (const f of regel.feiten || []) ids.add(f.bron);
  return `<p class="f-bronnen"><span>Bronnen, gecontroleerd op ${datumLang(regel.gecontroleerdOp)}:</span> ${[...ids].filter((i) => BRONNEN[i]).map((i) => bronLink(i, `${BRONNEN[i].naam}: ${BRONNEN[i].titel || i}`)).join(' ')}</p>`;
};

// ── Illustraties: rustige lijntekeningen, één vlak, één accent ──
export const ILLU = {
  tafel: `<svg class="f-illu" viewBox="0 0 520 380" role="img" aria-label="Een tafel met een map, brieven, een kalender en een kop koffie"><ellipse class="vlak" cx="262" cy="330" rx="230" ry="30"/><path class="vlak2" d="M70 250h380l-34 62H104z"/><path class="lijn" d="M70 250h380M104 312h312M104 312l-34-62M416 312l34-62"/><g transform="rotate(-7 190 200)"><rect class="wit lijn" x="110" y="150" width="150" height="110" rx="6"/><path class="lijn dun" d="M128 176h84M128 196h114M128 216h96M128 236h70"/><circle class="accent" cx="238" cy="172" r="7"/></g><g transform="rotate(5 300 190)"><rect class="wit lijn" x="230" y="128" width="140" height="118" rx="6"/><path class="lijn" d="M230 156h140"/><path class="lijn dun" d="M250 178h14M278 178h14M306 178h14M334 178h14M250 200h14M278 200h14M334 200h14M250 222h14M278 222h14"/><rect class="accent" x="302" y="191" width="22" height="18" rx="5"/><path class="lijn" d="M256 120v16M344 120v16"/></g><path class="wit lijn" d="M388 196h54v34a27 27 0 0 1-54 0z"/><path class="lijn" d="M442 204h10a12 12 0 0 1 0 24h-10M378 258h74"/><path class="lijn dun" d="M404 180c-6-10 6-14 0-24M424 180c-6-10 6-14 0-24"/><path class="lijn" d="M86 244c-8-30 6-50 30-58M96 244c2-22 14-34 30-38"/><path class="vlak lijn" d="M76 244h40l-6 34H82z"/></svg>`,
  map: `<svg class="f-illu" viewBox="0 0 320 240" role="img" aria-label="Twee handen geven een map door"><ellipse class="vlak" cx="160" cy="205" rx="130" ry="18"/><path class="vlak2 lijn" d="M96 70h54l12 16h66v90H96z"/><path class="lijn dun" d="M116 112h92M116 132h70M116 152h80"/><circle class="accent" cx="206" cy="150" r="8"/><path class="lijn" d="M20 150c26-6 46-6 66 4l22 12M20 186c30 0 60 2 88-8"/><path class="lijn" d="M300 128c-26-6-44-4-62 6l-12 8M300 164c-28 2-52 6-76-2"/></svg>`,
  kalender: `<svg class="f-illu" viewBox="0 0 320 240" role="img" aria-label="Een kalender met een lichtje bij een dag"><ellipse class="vlak" cx="160" cy="210" rx="120" ry="16"/><rect class="wit lijn" x="70" y="46" width="180" height="150" rx="14"/><path class="lijn" d="M70 86h180M112 34v24M208 34v24"/><path class="lijn dun" d="M98 112h18M134 112h18M170 112h18M206 112h18M98 140h18M134 140h18M206 140h18M98 168h18M134 168h18M170 168h18"/><rect class="accent" x="164" y="130" width="30" height="22" rx="7"/><path class="lijn" d="M262 60l12-10M270 84h16M258 38l4-14"/></svg>`,
  huis: `<svg class="f-illu" viewBox="0 0 320 240" role="img" aria-label="Een huis met een boom"><ellipse class="vlak" cx="160" cy="208" rx="130" ry="16"/><path class="vlak2 lijn" d="M84 112l68-56 68 56v84H84z"/><path class="lijn" d="M70 124l82-68 82 68M132 196v-44h40v44"/><rect class="wit lijn" x="184" y="126" width="24" height="24" rx="3"/><circle class="accent" cx="164" cy="176" r="3"/><path class="lijn" d="M262 196v-56"/><circle class="vlak lijn" cx="262" cy="118" r="28"/><path class="lijn dun" d="M262 150l12-12M262 164l-10-10"/></svg>`,
  brief: `<svg class="f-illu" viewBox="0 0 320 240" role="img" aria-label="Een brief met gemarkeerde regels"><ellipse class="vlak" cx="160" cy="210" rx="120" ry="16"/><g transform="rotate(-4 160 120)"><rect class="wit lijn" x="86" y="34" width="150" height="170" rx="8"/><path class="lijn dun" d="M106 64h60M106 92h110M106 112h96M106 152h110M106 172h50"/><rect class="accent" x="104" y="124" width="74" height="16" rx="4" opacity=".55"/><path class="lijn" d="M106 132h70"/></g><circle class="vlak2 lijn" cx="246" cy="74" r="22"/><path class="lijn" d="M237 74l7 7 12-13"/></svg>`,
  leeg: `<svg class="f-illu" viewBox="0 0 240 160" aria-hidden="true"><ellipse class="vlak" cx="120" cy="136" rx="92" ry="12"/><rect class="wit lijn" x="62" y="34" width="116" height="88" rx="10"/><path class="lijn dun" d="M82 62h76M82 80h52M82 98h64"/><circle class="accent" cx="170" cy="44" r="9"/></svg>`,
};

const KRUIMEL = (slug, naam, tussen = []) => [['/', 'Home'], ['/familie/', 'Familie'], ...tussen, [slug, naam]];
const vinkLijst = (items) => `<ul>${items.map((i) => `<li>${icoon('vink')}<span>${i}</span></li>`).join('')}</ul>`;
const avatar = (init, kleur, klasse = '') => `<span class="f-avatar${klasse ? ` ${klasse}` : ''}" style="--a:${kleur}" aria-hidden="true">${init}</span>`;

// De miniatuur van de regelkamer (verzonnen familie)
const demoKaart = () => `<div class="f-demo" aria-label="Voorbeeld van de regelkamer met een verzonnen familie">
<div class="f-demo-kop"><div><strong>Pa (Henk, 84)</strong><small>Familie De Vries · 4 leden</small></div><div class="f-avatars">${avatar('MV', '#b4532b')}${avatar('RV', '#2f5d8a')}${avatar('PV', '#6f3a73')}${avatar('H', '#2f6b5e')}</div></div>
<h4>Deze week</h4>
<div class="f-regel"><span class="f-stip rood">${icoon('brief')}</span><span><b>Brief CAK: bezwaar kan tot 12 januari</b><span class="f-sub">Eigen bijdrage 2027 · € 1.282,09 per maand</span></span><span class="f-pil nu">over 6 dagen</span></div>
<div class="f-regel"><span class="f-stip">${icoon('zorg')}</span><span><b>Zorgverzekering voor volgend jaar kiezen</b><span class="f-sub">Marieke doet dit</span></span>${avatar('MV', '#b4532b', 'klein')}</div>
<div class="f-regel"><span class="f-stip blauw">${icoon('zon')}</span><span><b>Zonnepanelen: salderen stopt op 1 januari</b><span class="f-sub">Bekijk het energiecontract</span></span><span class="f-pil let">over 46 dagen</span></div>
<div class="f-regel"><span class="f-stip groen">${icoon('taak')}</span><span><b>Paspoort verlengd</b><span class="f-sub">Gedaan door Ruud</span></span><span class="f-pil goed">gedaan</span></div>
<div class="f-demo-voet"><span>${icoon('logboek', 'klein')} Logboek november: 6 uitgaven · € 412,30</span><span class="f-pil">1 zonder bon</span></div>
</div>`;

function pagina(p) {
  return { taal: 'nl', css: ['familie'], bodyKlasse: 'familie-pagina', zonderHulp: true, ...p };
}

// ── /familie/ ──
function landing() {
  const html = `
<section class="f-hero">
<div>
<p class="f-etiket">${esc(MERK.naam)}</p>
<h1>Samen de zaken van je ouders regelen. <em>Zonder schoenendoos, zonder ruzie.</em></h1>
<p class="intro">Eén gedeelde regelkamer voor de familie. Je mist geen termijn, iedereen ziet hetzelfde, en na een overlijden ligt alles al klaar.</p>
<div class="f-knoppen"><a class="knop groot" href="/familie/app/">Open de regelkamer</a><a class="knop-licht" href="#zo-werkt-het">Bekijk hoe het werkt</a></div>
<ul class="vertrouwen" aria-label="Waarom je dit kunt vertrouwen"><li>Gratis te proberen, zonder account</li><li>Je gegevens blijven op je eigen apparaat</li><li>Elke regel met officiële bron</li></ul>
</div>
<div class="f-hero-beeld">${demoKaart()}</div>
</section>

<section class="f-sectie" aria-labelledby="herken">
<p class="f-etiket">Herkenbaar?</p>
<h2 id="herken">Op een dag regel jij de post van je vader</h2>
<p class="f-lead">Ruim 5 miljoen Nederlanders zorgen voor een naaste. Vaak begint het klein: een brief die hij niet snapt, een rekening die blijft liggen. Daarna komt alles tegelijk.</p>
<div class="f-raster">
<div class="f-kaart"><span class="f-ico">${icoon('kalender', 'groot')}</span><h3>Je mist geen termijn meer</h3><p>Een persoonlijke kalender met alles wat eraan komt: contracten, brieven, documenten die verlopen en regels die veranderen. Bij elke termijn staat de officiële bron.</p></div>
<div class="f-kaart"><span class="f-ico groen">${icoon('familie', 'groot')}</span><h3>Iedereen ziet hetzelfde</h3><p>Broers, zussen en partner kijken mee en pakken taken op. Wie geld uitgeeft namens je ouder, legt dat vast. Zo blijft het eerlijk en hoef je geen ruzie te krijgen.</p></div>
<div class="f-kaart"><span class="f-ico blauw">${icoon('hand', 'groot')}</span><h3>Na een overlijden ligt alles klaar</h3><p>Contracten, contactpersonen en documenten staan er al. De regelkamer maakt de opzegbrieven, rekent de erfbelasting door en houdt de termijnen bij.</p></div>
</div>
</section>

<section class="f-sectie" id="zo-werkt-het" aria-labelledby="werkt">
<p class="f-etiket">Zo werkt het</p>
<h2 id="werkt">In een kwartier heb je overzicht</h2>
<p class="f-lead">Geen cursus, geen handleiding. Je beantwoordt twaalf korte vragen en de regelkamer doet een voorstel.</p>
<div class="f-stappen">
<div class="f-stap"><h3>Beantwoord 12 vragen</h3><p>Hoe woont je ouder, welke inkomsten zijn er, is er een volmacht? Overslaan mag altijd.</p></div>
<div class="f-stap"><h3>Lees een bankafschrift in</h3><p>De regelkamer vindt zelf de vaste lasten en abonnementen. Het bestand blijft op je eigen apparaat.</p></div>
<div class="f-stap"><h3>Nodig de familie uit</h3><p>Verdeel de taken. Elke week zie je wat er speelt en wie wat doet.</p></div>
</div>
${uitlegVideo('familie')}
</section>

<section class="f-sectie" aria-labelledby="wat-zit-erin">
<p class="f-etiket">Wat zit erin</p>
<h2 id="wat-zit-erin">Alles voor de regelzaken van je ouders, op één plek</h2>
<div class="f-raster twee">
<div class="f-kaart"><span class="f-ico">${icoon('brief', 'groot')}</span><h3>Brieven die je meteen snapt</h3><p>Plak de tekst of maak een foto. Je ziet van wie de brief is, wat je moet doen, vóór wanneer en om welk bedrag het gaat. Bedrag en datum staan er altijd met het citaat uit de brief bij, zodat je het kunt nakijken.</p></div>
<div class="f-kaart"><span class="f-ico groen">${icoon('logboek', 'groot')}</span><h3>Verantwoording zonder gedoe</h3><p>Leg uitgaven vast met een foto van de bon. Elke maand staat er een overzicht klaar voor de hele familie. Een regel kan achteraf niet worden veranderd, alleen verbeterd.</p></div>
<div class="f-kaart"><span class="f-ico goud">${icoon('rekenmachine', 'groot')}</span><h3>Weten wat zorg kost</h3><p>Reken de eigen bijdrage voor het verpleeghuis na met de methode van het CAK zelf. Zie wat spaargeld en een huisverkoop doen, en wanneer.</p></div>
<div class="f-kaart"><span class="f-ico blauw">${icoon('slot', 'groot')}</span><h3>Veilig, en van jullie</h3><p>Geen BSN, geen volledige rekeningnummers. Documenten worden op je eigen apparaat versleuteld. Wij verkopen geen gegevens en krijgen geen commissie voor doorverwijzingen.</p></div>
</div>
</section>

<section class="f-sectie" aria-labelledby="rekenhulpen">
<p class="f-etiket">Gratis rekenhulpen</p>
<h2 id="rekenhulpen">Eerst rekenen, dan beslissen</h2>
<p class="f-lead">Zonder account. Elke uitkomst laat zien hoe er gerekend is en uit welke officiële bron het bedrag komt.</p>
<div class="f-raster drie">
${[
  ['/familie/rekenhulp/verpleeghuis/', 'huis', 'Eigen bijdrage verpleeghuis', 'Lage en hoge eigen bijdrage (Wlz) volgens de rekenmethode van het CAK.'],
  ['/familie/rekenhulp/erfbelasting/', 'weegschaal', 'Erfbelasting en verdeling', 'Wie erft wat zonder testament, en hoeveel erfbelasting betaal je?'],
  ['/familie/rekenhulp/zorgkosten/', 'zorg', 'Aftrek zorgkosten', 'Haal je de drempel? Met de verhoging voor lage inkomens.'],
  ['/familie/rekenhulp/zonnepanelen-2027/', 'zon', 'Zonnepanelen na 2027', 'Wat het einde van salderen kost, met de cijfers van je eigen contract.'],
  ['/familie/rekenhulp/wmo/', 'hand', 'Eigen bijdrage Wmo', 'Wat betaal je voor hulp via de gemeente, en wat verandert er?'],
  ['/familie/checklist/na-overlijden/', 'taak', 'Checklist na een overlijden', 'Stap voor stap wat je moet regelen, met termijnen en bronnen.'],
].map(([u, i, t, s]) => `<a class="f-kaart" href="${u}"><span class="f-ico">${icoon(i, 'groot')}</span><h3>${t}</h3><p>${s}</p><span class="f-meer">Open ${icoon('pijl', 'klein')}</span></a>`).join('\n')}
</div>
</section>

<section class="f-band" aria-labelledby="vertrouwen">
<div><h2 id="vertrouwen">Het gaat om je ouders. Dus zijn we streng voor onszelf.</h2>
<p>Wij verdienen aan abonnementen, niet aan jullie gegevens. Daarom kunnen we dit beloven.</p>
<p class="f-knoppen" style="margin-top:20px"><a class="knop" href="/familie/privacy/">Lees hoe we met gegevens omgaan</a></p></div>
<ul>
<li>${icoon('schild')}<span><strong>Geen BSN, geen volledig rekeningnummer</strong><small>Zulke nummers lakken we automatisch weg, nog op je eigen apparaat.</small></span></li>
<li>${icoon('slot')}<span><strong>Documenten versleuteld op je apparaat</strong><small>Alleen jullie hebben de sleutel. Wij kunnen ze niet lezen.</small></span></li>
<li>${icoon('bron')}<span><strong>Elke regel met officiële bron</strong><small>Elke week vergelijken we onze bedragen automatisch met de pagina's van het CAK, de Belastingdienst en de Rijksoverheid.</small></span></li>
<li>${icoon('weegschaal')}<span><strong>Geen commissies, geen reclame</strong><small>We verwijzen door naar de notaris of schuldhulp als dat beter is, zonder er iets voor te krijgen.</small></span></li>
</ul>
</section>

<section class="f-sectie" aria-labelledby="prijzen-kop">
<p class="f-etiket">Prijzen</p>
<h2 id="prijzen-kop">Begin gratis. Betaal pas als de familie meedoet.</h2>
<p class="f-lead">Eén abonnement voor de hele familie, niet per persoon.</p>
${prijzenHtml()}
</section>`;
  return pagina({
    slug: '/familie/',
    title: 'Samen de zaken van je ouders regelen',
    description: 'Eén gedeelde regelkamer voor de familie: termijnen, brieven, geld en afspraken rond je ouder wordende ouders. Tot en met de afwikkeling na een overlijden. Gratis te proberen.',
    h1: 'Samen de zaken van je ouders regelen',
    kort: 'Familie',
    kruimel: [],
    html,
    faq: [
      ['Is dit van de overheid?', 'Nee. ToeslagBuddy Familie is onafhankelijk en hoort niet bij het CAK, de Belastingdienst of een gemeente. We leggen officiële regels uit en verwijzen naar de bron.'],
      ['Moet ik een account maken?', 'Nee. Je kunt de regelkamer gebruiken zonder account. Alles blijft dan op je eigen apparaat. Een account heb je pas nodig als je met de familie wilt samenwerken op meerdere apparaten.'],
      ['Mag ik de administratie van mijn ouder zomaar overnemen?', 'Alleen als je ouder dat goed vindt, of als er een volmacht, bewind of mentorschap is. De regelkamer vraagt hiernaar en legt vast wie toestemming gaf. Zonder toestemming bewaren we geen gegevens over zorg of gezondheid.'],
      ['Geven jullie juridisch of financieel advies?', 'Nee. We leggen standaardregels uit en rekenen ze door. Bij een testament met bijzondere bepalingen, een onderneming, schulden of een conflict verwijzen we naar de notaris, het Juridisch Loket of schuldhulp.'],
      ['Wat gebeurt er met de gegevens als we stoppen?', 'Je kunt alles exporteren en daarna verwijderen. Zonder account staat er sowieso niets bij ons: dan wis je het dossier op je eigen apparaat.'],
    ],
  });
}

function prijzenHtml() {
  const kaart = (p) => `<div class="f-prijs${p.uit ? ' uit' : ''}"${p.uit ? ' data-label="Meest gekozen"' : ''}><h3>${esc(p.naam)}</h3><p class="f-bedrag">${euro(p.bedrag, Number.isInteger(p.bedrag) ? 0 : 2)} <small>${esc(p.per)}</small></p><p class="f-klein">${esc(p.regel)}</p>${vinkLijst(p.punten.map(esc))}<a class="${p.uit ? 'knop' : 'knop-licht'}" href="${p.url}">${esc(PRIJZEN.betalenActief || p.id === 'gratis' ? p.knop : 'Nu gratis proberen')}</a></div>`;
  return `<div class="f-prijzen">${PRIJZEN.plannen.map(kaart).join('\n')}</div>
${PRIJZEN.betalenActief ? '' : '<p class="f-klein" style="margin-top:16px">Betalen staat nog uit: we zijn net gestart. Tot die tijd gebruik je alles gratis en betaal je niets. We vragen nooit ongevraagd om betaalgegevens.</p>'}`;
}

// ── Rekenhulpen ──
const veldEuro = (naam, label, hint = '', extra = '') => `<div class="f-veld"><label for="r-${naam}">${label}</label>${hint ? `<p class="hint" id="h-${naam}">${hint}</p>` : ''}<div class="f-euro"><input id="r-${naam}" name="${naam}" type="text" inputmode="decimal" autocomplete="off"${hint ? ` aria-describedby="h-${naam}"` : ''}${extra}></div></div>`;
const veldGetal = (naam, label, hint = '', eenheid = '') => `<div class="f-veld"><label for="r-${naam}">${label}</label>${hint ? `<p class="hint" id="h-${naam}">${hint}</p>` : ''}<input id="r-${naam}" name="${naam}" type="text" inputmode="decimal" autocomplete="off" style="max-width:220px"${hint ? ` aria-describedby="h-${naam}"` : ''}>${eenheid ? ` <span class="f-klein">${eenheid}</span>` : ''}</div>`;
const veldKeuze = (naam, legend, opties, { hint = '', gekozen = null, kaarten = false } = {}) => `<fieldset class="f-veld"><legend>${legend}</legend>${hint ? `<p class="hint">${hint}</p>` : ''}<div class="f-keuze${kaarten ? ' kaarten' : ''}">${opties.map(([w, t]) => `<input type="radio" name="${naam}" id="r-${naam}-${w}" value="${w}"${w === gekozen ? ' checked' : ''}><label for="r-${naam}-${w}">${t}</label>`).join('')}</div></fieldset>`;

function rekenhulp({ slug, soort, title, description, h1, intro, regelIds, formulier, uitleg, faq }) {
  const regel = REGELS[regelIds[0]];
  const html = `
<div class="hero"><p class="f-etiket">Gratis rekenhulp</p><h1>${esc(h1)}</h1><p class="intro">${intro}</p></div>
<div class="f-reken" data-rekenhulp="${soort}">
<form class="f-form" novalidate><h2>Jouw situatie</h2>
<noscript><p class="geen-js">Deze rekenhulp werkt alleen met JavaScript. De uitleg hieronder kun je wel lezen.</p></noscript>
${formulier}
<button class="knop" type="submit">Bereken</button>
<p class="privacy-noot">${icoon('slot', 'klein')} Wat je invult, blijft op je eigen apparaat. We slaan niets op.</p>
</form>
<div class="f-uitkomst" data-uitkomst data-leeg aria-live="polite"><div><div style="max-width:180px;margin:0 auto 12px">${ILLU.leeg}</div><p>Vul links je situatie in. De uitkomst komt hier te staan, met de berekening erbij.</p></div></div>
</div>
${bronnenRij(regel)}
<div class="f-artikel">${uitleg}</div>
${regelsJson(regelIds)}`;
  return pagina({ slug, title, description, h1, kort: h1, kruimel: KRUIMEL(slug, h1, [['/familie/#rekenhulpen', 'Rekenhulpen']]), html, faq, script: ['familie-rekenhulp.js'], schemas: [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: h1, url: config.url + slug, applicationCategory: 'FinanceApplication', operatingSystem: 'Alle', inLanguage: 'nl-NL', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, dateModified: regel.gecontroleerdOp }] });
}

function rekenhulpen() {
  const w = REGELS['wlz-2026'];
  const b = (r, k, d = 2) => euro(r.bedragen[k].waarde, d);
  const e = REGELS['erfbelasting-2026'];
  const z = REGELS['zorgkosten-2026'];
  const wmo = REGELS['wmo-2026'];
  return [
    rekenhulp({
      slug: '/familie/rekenhulp/verpleeghuis/',
      soort: 'wlz',
      title: `Eigen bijdrage verpleeghuis berekenen (${w.jaar})`,
      description: `Bereken de lage en hoge eigen bijdrage voor het verpleeghuis (Wlz) in ${w.jaar}, met de rekenmethode van het CAK. Met uitleg over vermogen, spaargeld en de verkoop van het huis.`,
      h1: `Eigen bijdrage verpleeghuis berekenen`,
      intro: `Wat gaat je vader of moeder betalen voor het verpleeghuis of voor langdurige zorg thuis? We rekenen het na met de methode die het CAK zelf gebruikt voor ${w.jaar}.`,
      regelIds: ['wlz-2026'],
      formulier: `
${veldKeuze('zorg', 'Welke zorg krijgt je ouder?', [['instelling', 'Wonen in een verpleeghuis of zorginstelling'], ['vpt', 'Volledig pakket thuis'], ['mpt', 'Zorg thuis: modulair pakket of pgb']], { gekozen: 'instelling', kaarten: true })}
${veldKeuze('partner', 'Heeft je ouder een partner?', [['nee', 'Nee'], ['ja', 'Ja']], { gekozen: 'nee', hint: 'Getrouwd of geregistreerd partner. Het inkomen en vermogen van de partner tellen dan mee.' })}
${veldKeuze('aow', 'Heeft je ouder de AOW-leeftijd?', [['ja', 'Ja'], ['nee', 'Nee']], { gekozen: 'ja' })}
${veldEuro('verzamelinkomen', `Verzamelinkomen in ${w.peiljaar}`, `Staat op de belastingaanslag over ${w.peiljaar}. Geen aangifte gedaan? Neem het belastbaar loon van de jaaropgaven. Met partner: samen.`)}
${veldEuro('vermogen', `Spaargeld en beleggingen op 1 januari ${w.peiljaar}`, 'Vermogen in box 3 van de belastingaangifte, zoals spaargeld, beleggingen of een tweede woning. Met partner: samen.')}
<div data-toon="instelling">
${veldEuro('belasting', `Belasting over het inkomen in ${w.peiljaar}`, `Nodig voor de hoge eigen bijdrage. Het bedrag staat op de aanslag, of als ingehouden loonheffing op de jaaropgaven. Weet je het niet? Laat het leeg: dan zie je het hoogst mogelijke bedrag.`)}
${veldEuro('arbeid', 'Inkomsten uit werk (als die er zijn)', 'Loon uit werk in dat jaar. AOW en pensioen tellen hier niet mee. Meestal is dit € 0.')}
</div>`,
      uitleg: `
<h2>Zo werkt de eigen bijdrage</h2>
<p>Voor langdurige zorg betaal je een eigen bijdrage aan het CAK. Er zijn twee soorten:</p>
<ul>
<li><strong>Lage eigen bijdrage:</strong> de eerste 4 maanden in een instelling, en altijd bij langdurige zorg thuis. In ${w.jaar} is dat minimaal ${b(w, 'laagMin')} en maximaal ${b(w, 'laagMax')} per maand.</li>
<li><strong>Hoge eigen bijdrage:</strong> meestal vanaf de vijfde maand in een instelling. In ${w.jaar} is dat maximaal ${b(w, 'hoogMax')} per maand.</li>
</ul>
<p>In sommige persoonlijke situaties blijft ook na 4 maanden de lage eigen bijdrage gelden. Wat voor jullie geldt, staat op de beschikking van het CAK.</p>
<div class="f-kern"><h2>Drie dingen die vaak verrassen</h2><ul>
<li><strong>Het CAK kijkt 2 jaar terug.</strong> Voor ${w.jaar} telt het inkomen en vermogen van ${w.peiljaar}.</li>
<li><strong>Spaargeld telt mee, maar niet alles.</strong> Tot ${b(w, 'toetsbedragAlleen', 0)} (alleenstaand) of ${b(w, 'toetsbedragPartner', 0)} (met partner) telt vermogen niet mee. Van wat daarboven zit, telt 4% mee als inkomen.</li>
<li><strong>Het huis verkopen werkt pas later door.</strong> De opbrengst staat pas op 1 januari van het volgende jaar als vermogen op de bank, en telt dan 2 jaar later mee. Bij verkoop in 2026 merk je het dus voor het eerst in 2029.</li>
</ul></div>
<h2>Is het inkomen nu veel lager dan 2 jaar geleden?</h2>
<p>Dan kun je bij het CAK een aanpassing van de eigen bijdrage aanvragen. Het CAK rekent dan met het inkomen van nu. Voor de eigen bijdrage van ${w.jaar} kan dat tot 1 mei ${w.jaar + 1}. ${bronLink('cak-wlz-aanpassen', 'CAK: aanpassing aanvragen')}</p>
<h2>Waar deze rekenhulp niet voor is</h2>
<p>De uitkomst is een indicatie. Het CAK stelt de bijdrage vast en kent uitzonderingen die wij niet doorrekenen, zoals een partner die ook zorg krijgt, alimentatie of inkomen uit het buitenland. Controleer de uitkomst met de <a href="${esc(w.controleerBij)}" rel="noopener">rekenhulp van het CAK</a>.</p>`,
      faq: [
        ['Telt het eigen huis mee voor de eigen bijdrage?', 'Het CAK telt vermogen in box 3 mee, zoals spaargeld, beleggingen en een tweede woning. Of het huis van je ouder in box 3 valt, hangt af van de belastingaangifte: staat het huis lang leeg of wordt het verhuurd, dan kan dat veranderen. Kijk in de aangifte of vraag het na bij de Belastingdienst. Wordt het huis verkocht, dan wordt de opbrengst spaargeld. Dat telt mee vanaf het moment dat het op 1 januari op de bank staat, en het CAK kijkt daarbij 2 jaar terug.'],
        ['Kan ik de eigen bijdrage verlagen door geld te schenken?', 'Een schenking verlaagt het vermogen, maar je merkt dat pas na 2 jaar in de eigen bijdrage. Schenken heeft ook gevolgen voor de schenkbelasting en voor de erfenis. Bespreek dit met een notaris; wij geven hier geen advies over.'],
        ['Wat is zak- en kleedgeld?', `Een bedrag dat je ouder altijd overhoudt voor persoonlijke uitgaven. In ${w.jaar} is dat ${b(w, 'zakKleedgeldAlleen', 0)} per jaar voor een alleenstaande. Het CAK trekt dit af bij de berekening van de hoge eigen bijdrage.`],
      ],
    }),
    rekenhulp({
      slug: '/familie/rekenhulp/erfbelasting/',
      soort: 'erfbelasting',
      title: `Erfbelasting berekenen ${e.jaar}: vrijstelling, tarief en verdeling`,
      description: `Bereken de erfbelasting in ${e.jaar} en zie wie wat erft zonder testament (wettelijke verdeling). Met de vrijstellingen en tarieven van de Belastingdienst.`,
      h1: 'Erfbelasting berekenen',
      intro: `Hoeveel erfbelasting betaal je in ${e.jaar}, en wie erft wat als er geen testament is? Je ziet het per erfgenaam, met de berekening erbij.`,
      regelIds: ['erfbelasting-2026', 'overlijden'],
      formulier: `
${veldKeuze('wijze', 'Wat wil je berekenen?', [['verdeling', 'De hele erfenis, zonder testament'], ['los', 'Wat één erfgenaam betaalt']], { gekozen: 'verdeling', kaarten: true })}
<div data-toon="verdeling">
${veldEuro('nalatenschap', 'Waarde van de erfenis', 'Bezittingen min schulden van de overledene. Was je ouder getrouwd in gemeenschap van goederen? Dan is de erfenis de helft van het gezamenlijke bezit.')}
${veldKeuze('partner', 'Is er een echtgenoot of geregistreerd partner?', [['ja', 'Ja'], ['nee', 'Nee']], { gekozen: 'nee' })}
${veldGetal('kinderen', 'Aantal kinderen', '', '')}
</div>
<div data-toon="los" hidden>
${veldEuro('bedrag', 'Wat krijgt deze erfgenaam?', '')}
<div class="f-veld"><label for="r-relatie">Relatie met de overledene</label><select id="r-relatie" name="relatie">${Object.entries(RELATIES).map(([k, r]) => `<option value="${k}">${esc(r.naam)}</option>`).join('')}</select></div>
</div>`,
      uitleg: `
<h2>Vrijstellingen en tarieven in ${e.jaar}</h2>
<div class="tabel-scroll" tabindex="0" role="region" aria-label="Vrijstellingen en tarieven erfbelasting"><table class="f-tabel"><thead><tr><th>Je bent</th><th class="getal">Vrijstelling</th><th class="getal">Tot ${b(e, 'schijfgrens', 0)}</th><th class="getal">Daarboven</th></tr></thead><tbody>
<tr><td>Partner</td><td class="getal">${b(e, 'vrijPartner', 0)}</td><td class="getal">10%</td><td class="getal">20%</td></tr>
<tr><td>Kind, stiefkind of pleegkind</td><td class="getal">${b(e, 'vrijKind', 0)}</td><td class="getal">10%</td><td class="getal">20%</td></tr>
<tr><td>Kleinkind</td><td class="getal">${b(e, 'vrijKleinkind', 0)}</td><td class="getal">18%</td><td class="getal">36%</td></tr>
<tr><td>Ouder</td><td class="getal">${b(e, 'vrijOuder', 0)}</td><td class="getal">30%</td><td class="getal">40%</td></tr>
<tr><td>Iemand anders, zoals broer, zus of vriend</td><td class="getal">${b(e, 'vrijOverig', 0)}</td><td class="getal">30%</td><td class="getal">40%</td></tr>
</tbody></table></div>
<p>Je betaalt alleen erfbelasting over het deel boven je vrijstelling.</p>
<h2>Zonder testament: de wettelijke verdeling</h2>
<p>Was je ouder getrouwd (of geregistreerd partner) en zijn er kinderen? Dan erven de partner en de kinderen elk een gelijk deel. Maar de hele erfenis gaat eerst naar de partner. De kinderen krijgen hun deel als tegoed: een vordering in geld die meestal pas opeisbaar is als ook de partner overlijdt.</p>
<p>De kinderen zijn wél meteen erfbelasting verschuldigd over hun deel. De langstlevende ouder schiet die voor; het bedrag wordt verrekend met het tegoed van de kinderen. ${bronLink('bd-wettelijke-verdeling', 'Belastingdienst: wettelijke verdeling')}</p>
<div class="f-kern"><h2>Termijn voor de aangifte</h2><ul>
<li>Overlijden in ${REGELS.overlijden.termijnen.erfbelastingMaanden.vanafOverlijdensjaar} of later: de aangifte moet binnen <strong>${REGELS.overlijden.termijnen.erfbelastingMaanden.waarde} maanden</strong> binnen zijn.</li>
<li>Overlijden in ${REGELS.overlijden.termijnen.erfbelastingMaandenOud.totOverlijdensjaar} of eerder: binnen <strong>${REGELS.overlijden.termijnen.erfbelastingMaandenOud.waarde} maanden</strong>.</li>
<li>Daarna betaal je belastingrente.</li></ul>${bronLink('bd-erf-termijn', 'Belastingdienst: wanneer aangifte doen')}</div>
<h2>Wanneer klopt deze berekening niet?</h2>
<p>We rekenen met gelijke delen en de standaardtarieven. Bij een testament, een schenking kort voor het overlijden, een onderneming, vruchtgebruik, pensioen of lijfrente voor de partner, of een erfgenaam in het buitenland rekent de Belastingdienst anders. Gebruik dan het <a href="${esc(e.controleerBij)}" rel="noopener">hulpmiddel van de Belastingdienst</a> of vraag een notaris.</p>`,
      faq: [
        ['Moet ik een erfenis aanvaarden?', 'Nee. Je kunt een erfenis zuiver aanvaarden, beneficiair aanvaarden of verwerpen. Bij beneficiair aanvaarden ben je niet aansprakelijk voor schulden. Er is geen wettelijke termijn voor je keuze, maar schuldeisers mogen na 3 maanden om betaling vragen. Let op: wie spullen meeneemt of rekeningen betaalt, heeft de erfenis volgens de wet zuiver aanvaard.'],
        ['Mag ik de uitvaartkosten aftrekken?', 'In de aangifte erfbelasting mag je normale uitvaartkosten aftrekken, zoals de kist of urn, het graf, rouwkaarten en de koffietafel. In de aangifte inkomstenbelasting mag dat niet.'],
      ],
    }),
    rekenhulp({
      slug: '/familie/rekenhulp/zorgkosten/',
      soort: 'zorgkosten',
      title: `Aftrek zorgkosten ${z.jaar} berekenen: haal je de drempel?`,
      description: `Bereken de aftrek specifieke zorgkosten voor ${z.jaar}: de drempel bij jouw inkomen en de verhoging van 40% of 113%. Met de bedragen van de Belastingdienst.`,
      h1: 'Aftrek zorgkosten berekenen',
      intro: `Veel ouderen laten de aftrek van zorgkosten liggen. Kijk of je ouder de drempel haalt in ${z.jaar}, en wat de verhoging doet.`,
      regelIds: ['zorgkosten-2026'],
      formulier: `
${veldKeuze('partner', 'Is er het hele jaar een fiscale partner?', [['nee', 'Nee'], ['ja', 'Ja']], { gekozen: 'nee' })}
${veldKeuze('aow', 'AOW-leeftijd op 1 januari?', [['ja', 'Ja'], ['nee', 'Nee']], { gekozen: 'ja', hint: 'Met partner: het is genoeg als één van beiden de AOW-leeftijd heeft.' })}
${veldEuro('drempelinkomen', 'Drempelinkomen', 'Het totaal van de inkomsten en aftrekposten in box 1, 2 en 3, zonder de persoonsgebonden aftrek. Met partner: samen. Bij alleen AOW en pensioen is dit ongeveer het bruto jaarinkomen.')}
${veldEuro('kostenMetVerhoging', 'Zorgkosten die meetellen voor de verhoging', 'Bijvoorbeeld hulpmiddelen, vervoer naar arts of ziekenhuis, een dieet op voorschrift, extra gezinshulp.')}
${veldEuro('kostenZonderVerhoging', 'Kosten voor genees- en heelkundige hulp', 'Bijvoorbeeld tandarts of fysiotherapie die niet is vergoed, en reiskosten voor ziekenbezoek. Hiervoor geldt geen verhoging.')}`,
      uitleg: `
<h2>Zo werkt de aftrek</h2>
<p>Zorgkosten die niet zijn vergoed, mag je aftrekken voor zover ze boven een drempel komen. De drempel hangt af van het drempelinkomen. Niet alle zorgkosten tellen mee; de Belastingdienst heeft een overzicht van wat wel en niet aftrekbaar is.</p>
<div class="tabel-scroll" tabindex="0" role="region" aria-label="Drempel zorgkosten"><table class="f-tabel"><thead><tr><th>Drempelinkomen (zonder partner)</th><th>Drempel</th></tr></thead><tbody>
<tr><td>tot en met ${b(z, 'grensLaagAlleen', 0)}</td><td>${b(z, 'drempelMinAlleen', 0)}</td></tr>
<tr><td>tot en met ${b(z, 'grensHoog', 0)}</td><td>1,65% van het drempelinkomen</td></tr>
<tr><td>daarboven</td><td>${b(z, 'drempelVastHoog', 0)} + 5,75% van het bedrag boven ${b(z, 'grensHoog', 0)}</td></tr></tbody></table></div>
<p>Met een fiscale partner tel je kosten en inkomens bij elkaar op; de vaste drempel is dan ${b(z, 'drempelMinPartner', 0)} tot een drempelinkomen van ${b(z, 'grensLaagPartner', 0)}.</p>
<div class="f-kern"><h2>De verhoging: meer aftrekken dan je betaalde</h2><ul>
<li>Is het drempelinkomen niet hoger dan ${b(z, 'verhogingGrens', 0)}? Dan mag je een deel van de kosten verhogen.</li>
<li>Met de AOW-leeftijd op 1 januari: <strong>113%</strong> erbij. Jonger: 40%.</li>
<li>De verhoging geldt niet voor genees- en heelkundige hulp en reiskosten ziekenbezoek.</li></ul></div>
<p>Welke kosten precies meetellen en welke bewijzen je moet bewaren, staat bij de <a href="${esc(BRONNEN['bd-zorgkosten-overzicht']?.url || z.controleerBij)}" rel="noopener">Belastingdienst</a>.</p>`,
      faq: [['Geldt dit ook voor eerdere jaren?', 'De drempels en grenzen verschillen per jaar. Deze rekenhulp rekent met de bedragen van het jaar dat erboven staat. De bedragen van eerdere jaren staan bij de Belastingdienst.']],
    }),
    rekenhulp({
      slug: '/familie/rekenhulp/zonnepanelen-2027/',
      soort: 'zonnepanelen',
      title: 'Zonnepanelen na 1 januari 2027: wat kost het einde van salderen?',
      description: 'Bereken met de cijfers van je eigen energiecontract wat het einde van de salderingsregeling op 1 januari 2027 kost, en wat het oplevert om meer stroom zelf te gebruiken.',
      h1: 'Zonnepanelen na 2027: wat verandert er?',
      intro: 'Op 1 januari 2027 stopt salderen. Reken met de cijfers van het eigen contract uit wat dat scheelt. Onafhankelijk: wij verkopen geen batterijen en geen energiecontracten.',
      regelIds: ['salderen'],
      formulier: `
${veldGetal('opwek', 'Opwek van de zonnepanelen per jaar', 'Staat in de app van de omvormer of op de jaarafrekening.', 'kWh')}
${veldGetal('verbruik', 'Stroomverbruik van het huishouden per jaar', 'Alles wat er in huis is gebruikt: van het net én van het eigen dak.', 'kWh')}
${veldGetal('zelfverbruik', 'Hoeveel van de opwek wordt direct zelf gebruikt?', 'Opwek min teruglevering. De teruglevering staat op de jaarafrekening.', 'kWh')}
${veldEuro('tariefAllIn', 'Stroomprijs per kWh, alles inbegrepen', 'Wat je per kWh betaalt, inclusief energiebelasting en btw. Staat op het tarievenblad van het contract.')}
${veldEuro('tariefKaal', 'Kale leveringsprijs per kWh', 'De prijs per kWh zonder belastingen. Staat ook op het tarievenblad.')}
${veldEuro('vergoeding', 'Terugleververgoeding per kWh (als je die weet)', 'Leeg laten? Dan rekenen we met het wettelijke minimum: 50% van de kale leveringsprijs.')}
${veldEuro('terugleverkosten', 'Terugleverkosten per jaar', 'Vaste kosten die de leverancier rekent voor terugleveren. Geen kosten? Vul 0 in.')}`,
      uitleg: `
<h2>Wat verandert er op 1 januari 2027?</h2>
<p>Tot en met 31 december 2026 mag je teruggeleverde stroom wegstrepen tegen je verbruik. Dat heet salderen. Vanaf 1 januari 2027 mag dat niet meer. Je krijgt dan voor alle teruggeleverde stroom een vergoeding van je leverancier.</p>
<div class="f-kern"><h2>De regels in het kort</h2><ul>
<li>Tot 2030 is de vergoeding <strong>minimaal 50% van de kale leveringsprijs</strong> (de prijs zonder belastingen).</li>
<li>Leveranciers mogen terugleverkosten rekenen, maar alleen de kosten die ze echt maken. De ACM houdt toezicht.</li>
<li>Over stroom die je zelf opwekt en <strong>direct zelf gebruikt</strong>, betaal je niets: geen belasting en geen kosten aan de leverancier.</li></ul>${bronLink('ro-salderen', 'Rijksoverheid: salderingsregeling stopt in 2027')}</div>
<h2>Wat kun je doen?</h2>
<p>Elke kWh die je zelf gebruikt in plaats van teruglevert, is na 2027 meer waard. Zet de wasmachine, vaatwasser of boiler aan als de zon schijnt. Vergelijk bij het aflopen van het contract de terugleververgoeding en de terugleverkosten van leveranciers.</p>
<p>Een thuisbatterij is een grote uitgave. Reken eerst met deze rekenhulp uit wat één kWh extra eigen gebruik je oplevert, en vraag een onafhankelijk advies voordat je iets koopt.</p>`,
      faq: [['Waarom vullen jullie geen stroomprijzen voor mij in?', 'Omdat ze per contract sterk verschillen. Een gemiddelde zou een verkeerd beeld geven. Met de cijfers van je eigen tarievenblad klopt de uitkomst voor jouw situatie.']],
    }),
    rekenhulp({
      slug: '/familie/rekenhulp/wmo/',
      soort: 'wmo',
      title: `Eigen bijdrage Wmo ${wmo.jaar}: wat betaal je en wat verandert er?`,
      description: `De eigen bijdrage voor hulp via de gemeente (Wmo) is in ${wmo.jaar} maximaal ${b(wmo, 'abonnementstarief')} per maand. Zie of je ouder moet betalen, en wat het plan voor een inkomensafhankelijke bijdrage inhoudt.`,
      h1: 'Eigen bijdrage Wmo',
      intro: `Krijgt je ouder hulp via de gemeente, zoals huishoudelijke hulp of een traplift? In ${wmo.jaar} betaal je daarvoor een vast bedrag. Er ligt een plan om dat te veranderen.`,
      regelIds: ['wmo-2026'],
      formulier: `
${veldKeuze('partner', 'Woont je ouder samen met een partner?', [['nee', 'Nee, alleen'], ['ja', 'Ja']], { gekozen: 'nee' })}
<div data-toon="ja" hidden>${veldKeuze('beideAow', 'Hebben beiden de AOW-leeftijd?', [['ja', 'Ja, allebei'], ['nee', 'Nee, minstens één nog niet']], { gekozen: 'ja' })}</div>
${veldKeuze('wlz', 'Betaalt je ouder al een eigen bijdrage voor langdurige zorg (Wlz)?', [['nee', 'Nee'], ['ja', 'Ja']], { gekozen: 'nee' })}
${veldEuro('inkomen', 'Jaarinkomen van het huishouden (voor het plan)', 'Alleen nodig om te zien wat het plan van het kabinet zou betekenen.')}`,
      uitleg: `
<h2>Wat betaal je in ${wmo.jaar}?</h2>
<p>Bijna iedereen betaalt voor hulp of ondersteuning uit de Wmo een vast bedrag van maximaal <strong>${b(wmo, 'abonnementstarief')} per maand</strong>. Het maakt niet uit hoeveel hulp je krijgt of wat je inkomen is.</p>
<ul><li>Heb je een partner en heeft minstens één van jullie de AOW-leeftijd nog niet? Dan betaal je niets.</li>
<li>Betaal je al een eigen bijdrage voor de Wlz of voor beschermd wonen? Dan betaal je niet ook nog voor de Wmo.</li>
<li>Sommige gemeenten vragen geen bijdrage van mensen met een laag inkomen. Vraag dit na bij de gemeente.</li></ul>
<div class="f-kern"><h2>Het plan: een bijdrage naar inkomen en vermogen</h2><ul>
<li>Het kabinet wil de vaste bijdrage vervangen door een bijdrage die afhangt van inkomen en vermogen.</li>
<li><strong>Dit gaat niet in op 1 januari 2027.</strong> De ingangsdatum is uitgesteld en de Tweede en Eerste Kamer moeten nog instemmen.</li>
<li>In het voorstel: ${euro(wmo.plan.bedragen.minimum.waarde)} per maand bij een inkomen tot ongeveer ${euro(wmo.plan.bedragen.grensAlleen.waarde, 0)} (alleenstaand) of ${euro(wmo.plan.bedragen.grensMeer.waarde, 0)} (met meer personen), oplopend tot maximaal ${euro(wmo.plan.bedragen.maximum.waarde, 0)} per maand vanaf ongeveer ${euro(wmo.plan.bedragen.maxVanafAlleen.waarde, 0)} of ${euro(wmo.plan.bedragen.maxVanafMeer.waarde, 0)}.</li></ul>${bronLink('ro-wmo-2027', 'Rijksoverheid: plan en uitstel')} ${bronLink('ro-wmo', 'Rijksoverheid: eigen bijdrage Wmo')}</div>
<p>Zodra het plan wet is en de bedragen vaststaan, passen we deze pagina aan. In de regelkamer krijg je dan vanzelf een bericht als het voor jullie iets betekent.</p>`,
      faq: [],
    }),
  ];
}

// ── Checklist na een overlijden ──
function checklist() {
  const slug = '/familie/checklist/na-overlijden/';
  const html = `
<div class="hero"><p class="f-etiket">Gratis checklist</p><h1>Wat moet je regelen na een overlijden?</h1><p class="intro">Stap voor stap, in de volgorde waarin het speelt. Je hoeft niet alles meteen te doen. Vink af wat klaar is; dat onthoudt alleen je eigen apparaat.</p></div>
<div class="f-artikel" style="max-width:820px" data-checklist>
<div class="f-check-kop"><strong data-check-tekst>0 van ${FASES.reduce((n, f) => n + f.stappen.length, 0)} gedaan</strong><div class="f-balk" role="img" aria-label="Voortgang"><i data-check-balk></i></div><button type="button" class="knop-licht" data-check-print>${icoon('download', 'klein')} Print</button></div>
${FASES.map((f) => `<section class="f-fase"><h2>${esc(f.titel)}</h2>${f.stappen.map((s) => `<div class="f-check${s.belangrijk ? ' belangrijk' : ''}"><input type="checkbox" id="c-${s.id}" data-stap="${s.id}"><div><label for="c-${s.id}">${esc(s.titel)}</label><p>${esc(s.tekst)}</p>${s.bron ? bronLink(s.bron) : ''}</div></div>`).join('')}</section>`).join('')}
<div class="f-kern" style="margin-top:40px"><h2>Liever alles op één plek, samen met de familie?</h2><p>In de regelkamer staan dezelfde stappen met de data voor jullie situatie erbij. Je maakt er de opzegbrieven, verdeelt de taken en houdt de boedelrekening bij.</p><p class="f-knoppen" style="margin-top:14px"><a class="knop" href="/familie/app/">Open de regelkamer</a><a class="knop-licht" href="/familie/rekenhulp/erfbelasting/">Bereken de erfbelasting</a></p></div>
<p class="f-klein">Deze checklist is algemene informatie en geen juridisch advies. Bij schulden, een testament met bijzondere bepalingen of onenigheid: vraag een notaris of het Juridisch Loket. Bronnen gecontroleerd op ${datumLang(REGELS.overlijden.gecontroleerdOp)}.</p>
</div>`;
  return pagina({ slug, title: 'Checklist na een overlijden: wat moet je regelen?', description: 'Checklist voor nabestaanden: wat moet je regelen na een overlijden, in welke volgorde en vóór wanneer? Met de termijnen voor erfbelasting, belastingaangifte en toeslagen, en de officiële bronnen.', h1: 'Checklist na een overlijden', kort: 'Checklist na een overlijden', kruimel: KRUIMEL(slug, 'Checklist na een overlijden'), html, script: ['familie-checklist.js'], schemas: [{ '@context': 'https://schema.org', '@type': 'HowTo', name: 'Wat moet je regelen na een overlijden?', inLanguage: 'nl-NL', step: FASES.flatMap((f) => f.stappen).map((s) => ({ '@type': 'HowToStep', name: s.titel, text: s.tekst })) }] });
}

// ── Gidsen ──
function gidsen() {
  const hub = '/familie/gids/';
  const lijst = pagina({
    slug: hub,
    title: 'Gidsen: regelzaken voor je ouders, in gewone taal',
    description: 'Korte gidsen over de administratie van je ouders, de kosten van een verpleeghuis, erven, toeslagen na een overlijden en meer. Elke gids met officiële bronnen.',
    h1: 'Gidsen',
    kort: 'Gidsen',
    kruimel: KRUIMEL(hub, 'Gidsen'),
    html: `<div class="hero"><p class="f-etiket">Gidsen</p><h1>Regelzaken voor je ouders, in gewone taal</h1><p class="intro">Korte uitleg met de kern bovenaan. Elke gids verwijst naar de officiële bron en naar een rekenhulp of checklist.</p></div>
<div class="f-gidsen">${GIDSEN.map((g) => `<a class="f-kaart" href="${hub}${g.slug}/"><span class="f-ico">${icoon(g.icoon, 'groot')}</span><h3>${esc(g.kort)}</h3><p>${esc(g.kern[0])}</p><span class="f-meer">Lees de gids ${icoon('pijl', 'klein')}</span></a>`).join('\n')}</div>`,
  });
  const artikelen = GIDSEN.map((g) => {
    const slug = `${hub}${g.slug}/`;
    const bijgewerkt = REGELS.overlijden.gecontroleerdOp;
    return pagina({
      slug,
      title: g.titel,
      description: g.description,
      h1: g.titel,
      kort: g.kort,
      kruimel: KRUIMEL(slug, g.kort, [[hub, 'Gidsen']]),
      html: `<article class="f-artikel"><div class="hero" style="padding-bottom:0"><p class="f-etiket">Gids</p><h1>${esc(g.titel)}</h1></div>
<p class="f-meta"><span>Bijgewerkt op ${datumLang(bijgewerkt)}</span><span>Leestijd ± 3 minuten</span></p>
<div class="f-kern"><h2>In het kort</h2><ul>${g.kern.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>
${g.html}
<p class="f-knoppen" style="margin-top:32px"><a class="knop" href="${g.hulp[0]}">${esc(g.hulp[1])}</a></p>
${g.bronnen.length ? `<p class="f-bronnen"><span>Bronnen:</span> ${g.bronnen.map((b) => bronLink(b, `${BRONNEN[b]?.naam}: ${BRONNEN[b]?.titel || b}`)).join(' ')}</p>` : ''}
<p class="f-klein">Algemene informatie, geen advies voor jouw situatie. Bij twijfel: vraag de instantie zelf, een notaris of het Juridisch Loket.</p></article>`,
      schemas: [{ '@context': 'https://schema.org', '@type': 'Article', headline: g.titel, description: g.description, inLanguage: 'nl-NL', dateModified: bijgewerkt, author: { '@type': 'Organization', name: config.naam }, publisher: { '@type': 'Organization', name: config.naam }, mainEntityOfPage: config.url + slug }],
    });
  });
  return [lijst, ...artikelen];
}

// ── Prijzen, partner, privacy, voorwaarden, bronnen ──
function overige() {
  const accounts = !!config.pro.supabaseUrl;
  const prijzen = pagina({
    slug: '/familie/prijzen/',
    title: 'Prijzen van ToeslagBuddy Familie',
    description: 'Begin gratis op je eigen apparaat. Eén abonnement voor de hele familie als je wilt samenwerken, en een eenmalig pakket voor de afwikkeling na een overlijden.',
    h1: 'Prijzen',
    kort: 'Prijzen',
    kruimel: KRUIMEL('/familie/prijzen/', 'Prijzen'),
    html: `<div class="hero"><p class="f-etiket">Prijzen</p><h1>Begin gratis. Betaal pas als de familie meedoet.</h1><p class="intro">Eén abonnement voor de hele familie, niet per persoon. Maandelijks opzegbaar, met twee klikken.</p></div>
${prijzenHtml()}
${accounts ? '' : '<p class="f-controleer" style="margin-top:24px"><strong>Eerlijk over waar we staan.</strong> Samenwerken op meerdere apparaten en herinneringen per e-mail werken met een account. Accounts gaan binnenkort open. Tot die tijd werkt de regelkamer volledig op je eigen apparaat, en deel je het dossier met de familie als versleuteld bestand.</p>'}
<section class="f-sectie"><h2>Waarom kost dit geld?</h2><p class="f-lead">Omdat we niet aan je gegevens willen verdienen. Geen reclame, geen verkoop van gegevens, geen commissie voor doorverwijzingen. Het abonnement betaalt de servers, de controles van de regels en de ontwikkeling.</p>
<div class="f-raster"><div class="f-kaart"><span class="f-ico groen">${icoon('vink', 'groot')}</span><h3>Altijd gratis</h3><p>Alle rekenhulpen, checklists en gidsen. De regelkamer op je eigen apparaat.</p></div><div class="f-kaart"><span class="f-ico">${icoon('klok', 'groot')}</span><h3>Geld terug</h3><p>Binnen 14 dagen na je eerste betaling krijg je zonder vragen alles terug.</p></div><div class="f-kaart"><span class="f-ico blauw">${icoon('download', 'groot')}</span><h3>Je gegevens blijven van jou</h3><p>Exporteer het hele dossier wanneer je wilt. Na opzeggen kun je er nog 90 dagen bij.</p></div></div></section>
<section class="f-sectie"><h2>Voor uitvaartondernemers</h2><p class="f-lead">${esc(PRIJZEN.partner.tekst)} ${euro(PRIJZEN.partner.bedrag, 0)} ${esc(PRIJZEN.partner.per)}, onbeperkt aantal families.</p><p class="f-knoppen"><a class="knop-licht" href="/familie/partner/">Lees meer voor partners</a></p></section>`,
  });
  const partner = pagina({
    slug: '/familie/partner/',
    title: 'Nazorg voor uitvaartondernemers: de regelkamer onder je eigen naam',
    description: 'Geef families na de uitvaart een digitale nazorgomgeving onder je eigen naam: checklist met termijnen, opzegbrieven, erfbelasting en een boedelrekening. Zelf aanmelden, geen verkoopgesprek.',
    h1: 'Voor uitvaartondernemers',
    kort: 'Voor partners',
    kruimel: KRUIMEL('/familie/partner/', 'Voor partners'),
    html: `<section class="f-hero"><div><p class="f-etiket">Voor uitvaartondernemers</p><h1>Nazorg die doorloopt als jouw werk klaar is</h1><p class="intro">Na de uitvaart begint voor de familie het regelwerk. Geef ze de regelkamer mee, onder je eigen naam. Grote coöperaties bieden nazorg aan huis; dit is jouw antwoord, zonder extra personeel.</p><div class="f-knoppen"><a class="knop groot" href="/contact/">Meld je aan als partner</a><a class="knop-licht" href="/familie/checklist/na-overlijden/">Bekijk de checklist</a></div></div><div class="f-hero-beeld">${ILLU.map}</div></section>
<section class="f-sectie"><h2>Wat de familie krijgt</h2><div class="f-raster">
<div class="f-kaart"><span class="f-ico">${icoon('taak', 'groot')}</span><h3>Stappenplan met data</h3><p>Alle stappen na een overlijden, met de termijnen voor hun situatie: erfbelasting, belastingaangifte, toeslagen.</p></div>
<div class="f-kaart"><span class="f-ico groen">${icoon('brief', 'groot')}</span><h3>Opzegbrieven</h3><p>Voor elk contract een kant-en-klare brief. De familie houdt bij wat verstuurd en bevestigd is.</p></div>
<div class="f-kaart"><span class="f-ico blauw">${icoon('weegschaal', 'groot')}</span><h3>Verdeling en erfbelasting</h3><p>Wie erft wat, en wat betaalt ieder? Met de bedragen van de Belastingdienst.</p></div></div></section>
<section class="f-sectie"><h2>Wat jij ziet en niet ziet</h2><p class="f-lead">Je ziet hoeveel families je hebt uitgenodigd en hoeveel de regelkamer gebruiken. De inhoud van een dossier zie je nooit. Dat is technisch afgedwongen, niet alleen afgesproken.</p>
<p><strong>Prijs:</strong> ${euro(PRIJZEN.partner.bedrag, 0)} ${esc(PRIJZEN.partner.per)}, onbeperkt aantal families. Families betalen niets.</p>
<p class="f-controleer"><strong>Eerlijk over waar we staan.</strong> Het partnerportaal met eigen huisstijl gaat open zodra de accounts live zijn. Meld je nu aan, dan hoor je het als eerste en doe je de eerste drie maanden gratis mee.</p></section>`,
  });
  const privacy = pagina({
    slug: '/familie/privacy/',
    title: 'Privacy bij ToeslagBuddy Familie',
    description: 'Wat ToeslagBuddy Familie wel en niet opslaat: geen BSN, geen volledige rekeningnummers, documenten versleuteld op je eigen apparaat, en gezondheidsgegevens alleen met toestemming.',
    h1: 'Privacy bij Familie',
    kort: 'Privacy',
    kruimel: KRUIMEL('/familie/privacy/', 'Privacy'),
    html: `<article class="f-artikel"><div class="hero" style="padding-bottom:0"><p class="f-etiket">Privacy</p><h1>Wat we wel en niet met jullie gegevens doen</h1></div>
<p class="f-meta"><span>Aanvulling op de <a href="/privacy/">algemene privacyverklaring</a> van ToeslagBuddy</span></p>
<div class="f-kern"><h2>In het kort</h2><ul><li>Zonder account staat alles alleen op je eigen apparaat. Wij ontvangen dan niets.</li><li>We vragen nooit om een BSN, een volledig rekeningnummer of een volledige geboortedatum.</li><li>Gegevens over zorg of gezondheid bewaren we alleen als de ouder daarmee instemt, of als er een volmacht of bewind is.</li><li>We verkopen geen gegevens en tonen geen reclame in de regelkamer.</li></ul></div>
<h2>Zonder account: alles op je eigen apparaat</h2>
<p>De regelkamer bewaart het dossier in de opslag van je browser. Documenten en bonnen worden versleuteld met een sleutel die op je apparaat blijft. Wis je de browsergegevens, dan is het dossier weg. Maak daarom af en toe een export.</p>
<h2>Bankafschriften</h2>
<p>Een bankafschrift dat je inleest, wordt in je browser verwerkt en niet verstuurd. We bewaren alleen wat je zelf bevestigt: de naam van een contract en het bedrag per maand.</p>
<h2>Brieven uitleggen</h2>
<p>De basisuitleg van een brief gebeurt volledig op je apparaat. Kies je voor uitleg met AI, dan gaat de tekst van de brief naar onze server en naar onze AI-leverancier (Anthropic). Vóór verzending lakken we op je apparaat het BSN, rekeningnummers, de geboortedatum, e-mailadressen en telefoonnummers weg. We vragen hiervoor per brief je toestemming.</p>
<h2>Met een account</h2>
<p>Met een account staat het dossier in onze database in de Europese Unie (Supabase, Frankfurt), zodat de familie kan samenwerken. Alleen leden van het dossier kunnen erbij; dat is in de database zelf afgedwongen. Documenten blijven versleuteld met een sleutel die alleen de familie heeft: verliest de hele familie die sleutel en de herstelzin, dan kunnen ook wij de documenten niet terughalen.</p>
<h2>Gegevens over je ouder</h2>
<p>Het dossier gaat over iemand anders dan jijzelf. Daarom vraagt de regelkamer bij het aanmaken wie toestemming gaf, en legt dat vast. Je ouder mag altijd meekijken en kan vragen om inzage of verwijdering.</p>
<h2>Bewaartermijnen en verwijderen</h2>
<p>Je kunt een dossier op elk moment exporteren en verwijderen. Met een account bewaren we een dossier zolang het abonnement loopt en 90 dagen daarna. Een dossier in afwikkeling wordt 12 maanden na afsluiten verwijderd, tenzij de familie een andere termijn kiest.</p>
<h2>Vragen of een verzoek?</h2>
<p>Mail naar <a href="mailto:privacy@toeslagbuddy.nl">privacy@toeslagbuddy.nl</a>. Je kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.</p></article>`,
  });
  const voorwaarden = pagina({
    slug: '/familie/voorwaarden/',
    title: 'Voorwaarden van ToeslagBuddy Familie',
    description: 'De voorwaarden voor het gebruik van ToeslagBuddy Familie: wat je mag verwachten, wat het niet is (geen advies, geen notaris), betalen, opzeggen en geld terug.',
    h1: 'Voorwaarden Familie',
    kort: 'Voorwaarden',
    kruimel: KRUIMEL('/familie/voorwaarden/', 'Voorwaarden'),
    html: `<article class="f-artikel"><div class="hero" style="padding-bottom:0"><p class="f-etiket">Voorwaarden</p><h1>Voorwaarden van ToeslagBuddy Familie</h1></div>
<div class="f-kern"><h2>In het kort</h2><ul><li>De regelkamer is een hulpmiddel. De uitkomsten zijn een indicatie, geen besluit en geen advies.</li><li>Wij zijn geen notaris, geen bewindvoerder en geen financieel adviseur, en we beheren geen geld.</li><li>Opzeggen kan altijd; binnen 14 dagen na je eerste betaling krijg je je geld terug.</li></ul></div>
<h2>1. Wat je mag verwachten</h2><p>We leggen regels van de overheid uit en rekenen standaardsituaties door. Elke regel heeft een officiële bron en een datum waarop we hem hebben gecontroleerd. Kunnen we een regel niet meer bevestigen, dan rekenen we er niet mee en verwijzen we naar de instantie.</p>
<h2>2. Wat het niet is</h2><p>De regelkamer vervangt geen notaris, advocaat, belastingadviseur, bewindvoerder of schuldhulpverlener. Een instantie zoals het CAK of de Belastingdienst stelt een bedrag vast, niet wij. Controleer belangrijke bedragen en termijnen altijd in de brief of bij de instantie zelf.</p>
<h2>3. Jouw verantwoordelijkheid</h2><p>Je gebruikt de regelkamer alleen voor iemand die daarmee instemt, of voor wie je een volmacht, bewind of mentorschap hebt. Je vult geen BSN in en bewaart geen wachtwoorden of pincodes in het dossier.</p>
<h2>4. Betalen, opzeggen en geld terug</h2><p>Een abonnement geldt per dossier, voor de hele familie. Je kunt maandelijks opzeggen in de regelkamer. Na opzeggen blijft het dossier 90 dagen leesbaar en kun je het exporteren. Binnen 14 dagen na je eerste betaling krijg je op verzoek het volledige bedrag terug.</p>
<h2>5. Aansprakelijkheid</h2><p>We doen ons best om alles juist en actueel te houden, maar kunnen fouten niet uitsluiten. Onze aansprakelijkheid is beperkt tot het bedrag dat je in de 12 maanden daarvoor hebt betaald, behalve bij opzet of grove nalatigheid van onze kant.</p>
<h2>6. Contact</h2><p>Vragen of een klacht? Mail naar <a href="mailto:info@toeslagbuddy.nl">info@toeslagbuddy.nl</a>. De bedrijfsgegevens staan in de <a href="/colofon/">colofon</a>.</p></article>`,
  });
  const perSite = {};
  for (const [id, b] of Object.entries(BRONNEN)) (perSite[b.naam] = perSite[b.naam] || []).push({ id, ...b });
  const index = existsSync(join(ROOT, 'data/familie/bronnen/index.json')) ? lees('data/familie/bronnen/index.json') : { bijgewerkt: null };
  const nietOpgehaald = lees('data/familie/bronnen.json').nietOpgehaald || [];
  const bronnen = pagina({
    slug: '/familie/bronnen/',
    title: 'Bronnen en controles van ToeslagBuddy Familie',
    description: 'Alle officiële bronnen achter de regels en bedragen van ToeslagBuddy Familie, wanneer ze voor het laatst zijn gecontroleerd, en hoe onze bronnen-robot werkt.',
    h1: 'Bronnen en controles',
    kort: 'Bronnen',
    kruimel: KRUIMEL('/familie/bronnen/', 'Bronnen'),
    html: `<article class="f-artikel" style="max-width:860px"><div class="hero" style="padding-bottom:0"><p class="f-etiket">Bronnen</p><h1>Waar onze regels en bedragen vandaan komen</h1></div>
<p class="intro">Elk bedrag in de rekenhulpen en elke termijn in de regelkamer komt van een officiële pagina. We halen die pagina's automatisch op en vergelijken ze met onze regels.</p>
<div class="f-kern"><h2>Zo controleren we</h2><ul><li>Elke week haalt onze bronnen-robot de pagina's hieronder op en bewaart de tekst.</li><li>Een controle vergelijkt elk bedrag en elke aangehaalde zin met die tekst. Staat iets er niet meer letterlijk, dan krijgen wij een melding.</li><li>Een regel die we langer dan 400 dagen niet konden bevestigen, schakelen we uit. De rekenhulp verwijst dan naar de instantie.</li></ul></div>
<p>Laatste ophaalronde: <strong>${index.bijgewerkt ? datumLang(index.bijgewerkt) : 'nog niet uitgevoerd'}</strong>. Regels: ${Object.values(REGELS).map((r) => `${esc(r.titel)} (gecontroleerd op ${datumLang(r.gecontroleerdOp)})`).join('; ')}.</p>
${Object.entries(perSite).sort().map(([site, lijst]) => `<h2>${esc(site)}</h2><ul>${lijst.sort((a, b) => (a.titel || a.id).localeCompare(b.titel || b.id)).map((b) => `<li><a href="${esc(b.url)}" rel="noopener">${esc(b.titel || b.url)}</a>${b.status !== 'ok' && b.status !== 'onbekend' ? ' <span class="f-pil let">niet opgehaald</span>' : ''}</li>`).join('')}</ul>`).join('')}
<h2 id="robot">Onze bronnen-robot</h2>
<p>De robot meldt zich als <code>ToeslagBuddyBronnen/1.0</code>. Hij leest eerst robots.txt, haalt per site één pagina tegelijk op met minstens 5 seconden ertussen, en stopt als een site hem weigert. Hij omzeilt geen blokkades.</p>
${nietOpgehaald.length ? `<p>Niet opgehaald: ${nietOpgehaald.map((n) => `<strong>${esc(n.site)}</strong>: ${esc(n.reden)}`).join(' ')}</p>` : ''}
<p>Beheer je een van deze sites en wil je dat we iets anders doen? Mail naar <a href="mailto:info@toeslagbuddy.nl">info@toeslagbuddy.nl</a>.</p></article>`,
  });
  return [prijzen, partner, privacy, voorwaarden, bronnen];
}

// ── De regelkamer (schil; de app zelf is public/js/familie-app.js) ──
function app() {
  const organisaties = lees('data/familie/organisaties.json').organisaties;
  const html = `<div id="familie-app" class="fa" aria-live="polite"><noscript><p class="geen-js">De regelkamer werkt alleen met JavaScript.</p></noscript><div class="fa-leeg"><p>De regelkamer wordt geladen…</p></div></div>
<template id="fa-illu-leeg">${ILLU.leeg}</template><template id="fa-illu-kalender">${ILLU.kalender}</template><template id="fa-illu-brief">${ILLU.brief}</template><template id="fa-illu-map">${ILLU.map}</template><template id="fa-illu-tafel">${ILLU.tafel}</template>
${regelsJson(Object.keys(REGELS))}
<script type="application/json" id="familie-organisaties">${JSON.stringify(organisaties).replace(/</g, '\\u003c')}</script>
<script type="application/json" id="familie-instellingen">${JSON.stringify({ betalenActief: PRIJZEN.betalenActief, proefDagen: PRIJZEN.proefDagen, accounts: !!config.pro.supabaseUrl, ai: !!(config.familie && config.familie.aiActief) })}</script>`;
  return pagina({ slug: '/familie/app/', title: 'De regelkamer', description: 'De regelkamer van ToeslagBuddy Familie: overzicht, kalender, taken, post en logboek voor de zaken van je ouders.', h1: 'De regelkamer', kort: 'Regelkamer', kruimel: [], html, noindex: true, script: ['familie-app.js'], bodyKlasse: 'familie-pagina fa-pagina', zonderKopActie: true });
}

// ── Stijlpagina: het ontwerpsysteem in beeld ──
function stijl() {
  const kleuren = ['bg', 'vlak', 'vlak-2', 'lijn', 'lijn-sterk', 'tekst', 'zacht', 'merk', 'merk-vast', 'merk-licht', 'accent', 'accent-licht', 'goud', 'goud-licht', 'blauw', 'blauw-licht', 'pruim', 'pruim-licht', 'goed', 'goed-licht', 'rood', 'rood-licht'];
  const iconen = [...readFileSync(join(ROOT, 'public/img/iconen.svg'), 'utf8').matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
  const html = `<div class="hero"><p class="f-etiket">Ontwerpsysteem</p><h1>Stijl</h1><p class="intro">Alle bouwstenen van de site op één pagina: kleuren, letters, iconen, illustraties en onderdelen. In licht en donker (volgt je apparaat).</p></div>
<section class="f-sectie" style="margin-top:32px"><h2>Kleuren</h2><div class="f-raster" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">${kleuren.map((k) => `<div style="border:1px solid var(--lijn);border-radius:14px;overflow:hidden;background:var(--vlak)"><div style="height:64px;background:var(--${k})"></div><div style="padding:8px 10px;font-size:.82rem;font-weight:700">--${k}</div></div>`).join('')}</div></section>
<section class="f-sectie"><h2>Letters</h2><div class="f-kaart"><h1 style="margin-bottom:8px">Kop 1 in Fraunces: € 1.282,09</h1><h2 style="margin:0 0 8px">Kop 2: samen regelen</h2><h3 style="margin:0 0 8px">Kop 3: je mist geen termijn</h3><p class="intro" style="margin:0 0 8px">Inleiding in Figtree, iets groter en zachter van kleur.</p><p style="color:var(--tekst)">Lopende tekst op 18 px. Cijfers staan in tabelstand: € 0,00 · € 21,80 · € 3.061,80. <a href="#">Een link</a> en <strong>vette tekst</strong>.</p><p class="f-klein">Kleine tekst voor bijschriften, nooit kleiner dan 14 px.</p></div></section>
<section class="f-sectie"><h2>Knoppen en invoer</h2><div class="f-kaart"><div class="f-knoppen"><a class="knop groot" href="#">Grote knop</a><a class="knop" href="#">Knop</a><a class="knop-licht" href="#">Tweede keus</a><button class="knop-stil" type="button">Stille knop</button><button class="knop" type="button" disabled>Uitgeschakeld</button><button class="fa-mini" type="button">Mini</button><button class="fa-mini vol" type="button">Mini vol</button></div>
<div style="display:grid;gap:8px 24px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-top:24px">${veldEuro('s1', 'Bedrag', 'Met een toelichting eronder.')}${veldKeuze('s2', 'Keuze', [['a', 'Ja'], ['b', 'Nee']], { gekozen: 'a' })}<div class="f-veld"><label for="s3">Keuzelijst</label><select id="s3"><option>Partner</option><option>Kind</option></select></div></div>
<p><span class="f-pil">neutraal</span> <span class="f-pil let">over 46 dagen</span> <span class="f-pil nu">over 6 dagen</span> <span class="f-pil goed">gedaan</span> <span class="f-pil blauw">nieuw</span> ${bronLink('cak-wlz-laag', 'CAK: bronlabel')}</p></div></section>
<section class="f-sectie"><h2>Kaarten</h2><div class="f-raster"><div class="f-kaart"><span class="f-ico">${icoon('kalender', 'groot')}</span><h3>Kaart met icoon</h3><p>Rustig vlak, zachte schaduw, één onderwerp.</p></div><a class="f-kaart" href="#"><span class="f-ico groen">${icoon('familie', 'groot')}</span><h3>Kaart als link</h3><p>Komt iets omhoog als je eroverheen beweegt.</p><span class="f-meer">Open ${icoon('pijl', 'klein')}</span></a><div class="f-stap"><h3>Stap</h3><p>Genummerd blok voor uitleg in stappen.</p></div></div>
<div style="margin-top:24px">${demoKaart()}</div></section>
<section class="f-sectie"><h2>Iconen</h2><div class="f-kaart" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:16px">${iconen.map((i) => `<div style="display:grid;justify-items:center;gap:6px;font-size:.75rem;color:var(--zacht)">${icoon(i, 'groot')}<span>${i}</span></div>`).join('')}</div></section>
<section class="f-sectie"><h2>Illustraties</h2><div class="f-raster">${Object.entries(ILLU).map(([n, svg]) => `<div class="f-kaart"><div style="max-width:260px;margin:0 auto">${svg}</div><p class="f-klein" style="text-align:center;margin-top:8px">${n}</p></div>`).join('')}</div></section>
<section class="f-sectie"><h2>Prijskaarten</h2>${prijzenHtml()}</section>
<section class="f-band"><div><h2>Donkere band</h2><p>Voor een belofte of een oproep. Witte knop erop.</p><p class="f-knoppen" style="margin-top:16px"><a class="knop" href="#">Knop op donker</a></p></div><ul><li>${icoon('schild')}<span><strong>Punt met icoon</strong><small>Toelichting in zachtere kleur.</small></span></li><li>${icoon('slot')}<span><strong>Nog een punt</strong><small>Zelfde opbouw.</small></span></li></ul></section>`;
  return { taal: 'nl', css: ['familie'], bodyKlasse: 'familie-pagina', zonderHulp: true, sectie: 'toeslagen', zonderSub: true, slug: '/stijl/', title: 'Stijl: het ontwerpsysteem', description: 'Het ontwerpsysteem van ToeslagBuddy: kleuren, letters, iconen en onderdelen.', h1: 'Stijl', kort: 'Stijl', kruimel: [], html, noindex: true };
}

// Gestructureerde gegevens per soort pagina, zodat zoekmachines en
// AI-assistenten begrijpen wat de pagina is. Geen verzonnen beoordelingen.
function schemasVoor(p) {
  const url = config.url + p.slug;
  const uitgever = { '@type': 'Organization', name: config.naam, url: config.url + '/' };
  const gecontroleerd = Object.values(REGELS).map((r) => r.gecontroleerdOp).filter(Boolean).sort().pop();
  if (p.slug === '/familie/') {
    return [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: MERK.naam, url, applicationCategory: 'LifestyleApplication', operatingSystem: 'Alle', inLanguage: 'nl-NL', description: p.description, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, publisher: uitgever }];
  }
  if (/^\/familie\/checklist\/.+/.test(p.slug)) {
    return [{ '@context': 'https://schema.org', '@type': 'Article', headline: p.h1, description: p.description, url, mainEntityOfPage: url, inLanguage: 'nl-NL', dateModified: gecontroleerd, author: uitgever, publisher: uitgever, image: config.url + '/og-familie.png' }];
  }
  return [];
}

export function bouwFamilie({ dist, versie, layout }) {
  const paginas = [landing(), ...rekenhulpen(), checklist(), ...gidsen(), ...overige(), app(), stijl()];
  for (const p of paginas) {
    p.versie = versie;
    p.schemas = [...(p.schemas || []), ...schemasVoor(p)];
    const faq = p.faq && p.faq.length ? `<section class="faq f-sectie" style="max-width:820px"><h2>Veelgestelde vragen</h2>${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><div><p>${a}</p></div></details>`).join('')}</section>` : '';
    const dir = join(dist, p.slug);
    mkdirSync(dir, { recursive: true });
    const video = { '/familie/rekenhulp/verpleeghuis/': 'verpleeghuis', '/familie/checklist/na-overlijden/': 'na-overlijden' }[p.slug];
    writeFileSync(join(dir, 'index.html'), layout(p, p.html + (video ? `<section class="f-sectie" style="max-width:860px">${uitlegVideo(video)}</section>` : '') + faq));
  }
  return { paginas, regels: Object.keys(REGELS).length, gidsen: GIDSEN.length };
}
