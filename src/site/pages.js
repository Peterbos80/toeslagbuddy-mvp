// Alle pagina's van de site. Elke pagina richt zich op één zoekvraag.
import {
  JAAR,
  ZORGTOESLAG as Z,
  HUURTOESLAG as H,
  KINDGEBONDEN_BUDGET as K,
  KINDEROPVANGTOESLAG as O,
  KINDERBIJSLAG as B,
} from '../calc/params.js';
import { euro } from '../calc/toeslagen.js';
import {
  zorgtoeslagTabel,
  huurtoeslagTabel,
  huurtoeslagGrensTabel,
  kgbTabel,
  kgbGrensTabel,
  tabel,
  maxInkomen,
} from './tabellen.js';
import { zorgtoeslag, huurtoeslag, kindgebondenBudget, kotPercentage } from '../calc/toeslagen.js';
import { KOLOMMEN } from '../calc/pro.js';
import { partnerBlok } from './layout.js';
import { readFileSync, existsSync } from 'node:fs';

const NIEUWS_BESTAND = new URL('../../data/nieuws.json', import.meta.url);
export const nieuws = existsSync(NIEUWS_BESTAND) ? JSON.parse(readFileSync(NIEUWS_BESTAND, 'utf8')) : { bijgewerkt: null, items: [] };
const datumNl = (iso) => (iso ? new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const escN = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const nieuwsLijst = (items) =>
  `<ul class="nieuws-lijst">${items
    .map((i) => `<li><a href="${escN(i.link)}" rel="noopener" target="_blank">${escN(i.titel)}</a><span class="meta">${escN(i.bron)}${i.datum ? ' · ' + datumNl(i.datum) : ''}</span>${i.samenvatting ? `<p>${escN(i.samenvatting)}</p>` : ''}</li>`)
    .join('')}</ul>`;
import { ZZP } from '../calc/params.js';

const e2 = (n) => euro(n, 2);
const pct = (n) => `${(n * 100).toLocaleString('nl-NL', { maximumFractionDigits: 3 })}%`;
const VOLGEND = JAAR + 1;
const pctKot = (p) => `${(p * 100).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`;

const kaartenAlle = `<div class="kaarten">
<a href="/zorgtoeslag-berekenen/"><strong>Zorgtoeslag</strong><span>Tot ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} per maand voor je zorgverzekering</span></a>
<a href="/huurtoeslag-berekenen/"><strong>Huurtoeslag</strong><span>Vanaf ${JAAR} ook bij een huur boven ${e2(H.maximaleHuurgrens)}</span></a>
<a href="/kindgebonden-budget-berekenen/"><strong>Kindgebonden budget</strong><span>Tot ${euro(K.bedragPerKind)} per kind per jaar</span></a>
<a href="/kinderopvangtoeslag-berekenen/"><strong>Kinderopvangtoeslag</strong><span>Tot 96% van de opvangkosten vergoed</span></a>
<a href="/kinderbijslag-berekenen/"><strong>Kinderbijslag</strong><span>Voor elk kind, zonder inkomenstoets</span></a>
<a href="/regelingen-laag-inkomen/"><strong>Gemeente, UWV en SVB</strong><span>Kwijtschelding, bijzondere bijstand en meer</span></a>
</div>`;

const alleCheckLink = `<p class="let-op"><strong>Tip:</strong> reken in één keer uit waar je recht op hebt met de <a href="/#check">complete toeslagen-check</a>. Je ziet dan ook regelingen van je gemeente.</p>`;

export const pages = [
  // ───────────────────────────── HOME ─────────────────────────────
  {
    slug: '/',
    title: `Toeslagen berekenen ${JAAR} – check al je toeslagen in 2 minuten | ToeslagBuddy`,
    description: `Bereken gratis en anoniem al je toeslagen voor ${JAAR}: zorgtoeslag, huurtoeslag, kindgebonden budget, kinderopvangtoeslag en kinderbijslag. Met de nieuwste bedragen en regels.`,
    h1: `Op welke toeslagen heb jij recht in ${JAAR}?`,
    intro: 'Beantwoord een paar eenvoudige vragen. Je ziet meteen hoeveel zorgtoeslag, huurtoeslag en geld voor je kinderen je kunt krijgen.',
    calc: 'alles',
    anker: 'check',
    body: () => `
<h2>Alle toeslagen en regelingen op een rij</h2>
<p>Duizenden huishoudens laten elk jaar geld liggen, simpelweg omdat ze niet weten dat ze recht hebben op een toeslag. Met ToeslagBuddy check je alles in één keer.</p>
${kaartenAlle}
${nieuws.items.length ? `<h2>Laatste nieuws over toeslagen</h2>${nieuwsLijst(nieuws.items.slice(0, 3))}<p><a href="/nieuws/">Meer nieuws →</a></p>` : ''}
<h2>Wat is er veranderd in ${JAAR}?</h2>
<ul>
<li><strong>Huurtoeslag is eenvoudiger en voor meer mensen.</strong> Je huur mag hoger zijn dan ${e2(H.maximaleHuurgrens)}: er wordt dan tot die grens gerekend. Servicekosten tellen niet meer mee. Jongeren krijgen vanaf 21 jaar (was 23) de volledige huurtoeslag.</li>
<li><strong>Zorgtoeslag:</strong> maximaal ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} per maand voor alleenstaanden en ${euro(Math.floor(zorgtoeslag({ inkomen: 0, partner: true }).perJaar / 12))} met toeslagpartner. De inkomensgrens is ${euro(Z.maxInkomenAlleen)} (alleen) en ${euro(Z.maxInkomenPartner)} (samen).</li>
<li><strong>Kinderopvangtoeslag:</strong> tot een gezamenlijk inkomen van ${euro(O.inkomenMaximaalPercentage)} krijg je 96% van de maximale uurprijs vergoed.</li>
</ul>
<p>Bekijk ook <a href="/toeslagen-2027/">wat er verandert in ${VOLGEND}</a>.</p>
<h2>Waarom ToeslagBuddy?</h2>
<ul>
<li><strong>Alles in één check</strong> – niet vijf losse rekenhulpen, maar één overzicht met het totaalbedrag.</li>
<li><strong>Privé</strong> – de berekening gebeurt op je eigen telefoon of computer. We slaan niets op.</li>
<li><strong>Actueel</strong> – met de officiële rekenregels en bedragen van ${JAAR}. <a href="/bronnen/">Bekijk onze bronnen</a>.</li>
<li><strong>In gewone taal</strong> – geen ambtelijke termen, wel uitleg bij elke vraag.</li>
</ul>`,
    faq: [
      ['Hoeveel toeslag krijg ik?', 'Dat hangt af van je inkomen, vermogen, huur, gezinssituatie en kinderen. Met de toeslagen-check bovenaan deze pagina zie je in 2 minuten een indicatie van alle toeslagen samen.'],
      ['Is deze berekening officieel?', 'Nee. ToeslagBuddy is een onafhankelijke rekenhulp. We gebruiken de officiële rekenregels, maar alleen Dienst Toeslagen stelt vast hoeveel je echt krijgt. Vraag je toeslag altijd aan via toeslagen.nl.'],
      ['Moet ik inloggen met DigiD?', 'Niet voor deze berekening. Voor het aanvragen van een toeslag bij Dienst Toeslagen heb je wel DigiD nodig.'],
      ['Wat gebeurt er met mijn gegevens?', 'Niets. De berekening draait volledig in je browser. Je antwoorden worden niet naar ons of iemand anders verstuurd.'],
      [`Tot wanneer kan ik toeslag aanvragen over ${JAAR}?`, `Zorgtoeslag, huurtoeslag en kindgebonden budget over ${JAAR} kun je aanvragen tot 1 september ${VOLGEND}. Kinderopvangtoeslag moet je binnen 3 maanden na de eerste opvangdag aanvragen.`],
    ],
  },

  // ───────────────────────────── ZORGTOESLAG ─────────────────────────────
  {
    slug: '/zorgtoeslag-berekenen/',
    kort: 'Zorgtoeslag berekenen',
    title: `Zorgtoeslag berekenen ${JAAR} – hoeveel krijg je per maand?`,
    description: `Bereken je zorgtoeslag ${JAAR} in 1 minuut. Maximaal ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} per maand (alleen) of ${euro(Math.floor(zorgtoeslag({ inkomen: 0, partner: true }).perJaar / 12))} (samen). Inkomensgrens ${euro(Z.maxInkomenAlleen)}. Met tabel per inkomen.`,
    h1: `Zorgtoeslag berekenen ${JAAR}`,
    intro: `Zorgtoeslag is een bijdrage in de kosten van je zorgverzekering. Vul je inkomen in en zie direct hoeveel je per maand krijgt.`,
    calc: 'zorgtoeslag',
    partner: 'zorgverzekering',
    body: () => `
<h2>Zorgtoeslag ${JAAR} in het kort</h2>
<div class="tabel-scroll"><table><thead><tr><th></th><th scope="col">Alleenstaand</th><th scope="col">Met toeslagpartner</th></tr></thead><tbody>
<tr><th scope="row">Maximale zorgtoeslag per maand</th><td>${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))}</td><td>${euro(Math.floor(zorgtoeslag({ inkomen: 0, partner: true }).perJaar / 12))}</td></tr>
<tr><th scope="row">Maximaal inkomen</th><td>${euro(Z.maxInkomenAlleen)}</td><td>${euro(Z.maxInkomenPartner)}</td></tr>
<tr><th scope="row">Maximaal vermogen</th><td>${euro(Z.vermogensgrensAlleen)}</td><td>${euro(Z.vermogensgrensPartner)}</td></tr>
</tbody></table></div>

<h2>Voorwaarden voor zorgtoeslag</h2>
<ul>
<li>Je bent 18 jaar of ouder.</li>
<li>Je hebt een Nederlandse zorgverzekering (of een verdragsverzekering).</li>
<li>Je hebt de Nederlandse nationaliteit of een geldige verblijfsvergunning.</li>
<li>Je inkomen en vermogen zijn niet te hoog (zie de tabel hierboven).</li>
</ul>

<h2>Zorgtoeslag per inkomen (${JAAR})</h2>
<p>In deze tabel zie je hoeveel zorgtoeslag je per maand krijgt bij verschillende inkomens.</p>
${zorgtoeslagTabel()}

<h2>Zo wordt zorgtoeslag berekend</h2>
<p>De overheid gaat uit van een gemiddelde zorgpremie: de <strong>standaardpremie</strong>. Die is in ${JAAR} ${euro(Z.standaardpremie)} per persoon per jaar. Van dat bedrag moet je zelf een deel betalen: de <strong>normpremie</strong>. Het verschil krijg je als zorgtoeslag.</p>
<ul>
<li>Normpremie alleenstaande: ${pct(Z.normpercentageAlleen)} van het drempelinkomen (${euro(Z.drempelinkomen)}), plus ${pct(Z.afbouwpercentage)} van je inkomen daarboven.</li>
<li>Normpremie met toeslagpartner: ${pct(Z.normpercentagePartner)} van het drempelinkomen, plus ${pct(Z.afbouwpercentage)} van jullie gezamenlijke inkomen daarboven. De standaardpremie telt dan twee keer.</li>
</ul>
<p>Voorbeeld: een alleenstaande met een inkomen van ${euro(32000)} betaalt een normpremie van ${euro(zorgtoeslag({ inkomen: 32000 }).normpremie)}. De zorgtoeslag is ${euro(Z.standaardpremie)} − ${euro(zorgtoeslag({ inkomen: 32000 }).normpremie)} = ${euro(zorgtoeslag({ inkomen: 32000 }).perJaar)} per jaar, ofwel ${euro(zorgtoeslag({ inkomen: 32000 }).perMaand)} per maand.</p>
<p class="let-op"><strong>Besparen:</strong> zorgtoeslag dekt maar een deel van je premie. Tussen 12 november en 31 december kun je overstappen naar een goedkopere zorgverzekering. <a href="/zorgverzekering-overstappen/">Zo stap je over</a>.</p>
${alleCheckLink}`,
    faq: [
      [`Hoeveel zorgtoeslag krijg ik in ${JAAR}?`, `Maximaal ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} per maand als alleenstaande en ${euro(Math.floor(zorgtoeslag({ inkomen: 0, partner: true }).perJaar / 12))} met een toeslagpartner. Hoe hoger je inkomen boven ${euro(Z.drempelinkomen)}, hoe minder je krijgt.`],
      [`Wat is de inkomensgrens voor zorgtoeslag in ${JAAR}?`, `${euro(Z.maxInkomenAlleen)} per jaar voor alleenstaanden en ${euro(Z.maxInkomenPartner)} voor jou en je toeslagpartner samen.`],
      ['Krijgen studenten zorgtoeslag?', 'Ja, vanaf 18 jaar. Studiefinanciering telt niet als inkomen, een bijbaan wel. Let op: verdien je in het jaar dat je afstudeert veel, dan moet je misschien terugbetalen. Geef een nieuw inkomen dus op tijd door.'],
      ['Wanneer wordt zorgtoeslag uitbetaald?', 'Dienst Toeslagen betaalt elke maand een voorschot, meestal rond de 20e van de maand, voor de maand erna.'],
      ['Moet ik zorgtoeslag terugbetalen als mijn inkomen stijgt?', 'Ja, als je inkomen hoger uitvalt dan je hebt doorgegeven. Geef veranderingen daarom meteen door via Mijn toeslagen.'],
    ],
  },

  // ───────────────────────────── HUURTOESLAG ─────────────────────────────
  {
    slug: '/huurtoeslag-berekenen/',
    kort: 'Huurtoeslag berekenen',
    title: `Huurtoeslag berekenen ${JAAR} – met de nieuwe regels`,
    description: `Bereken je huurtoeslag ${JAAR} met de nieuwe rekenregels: geen maximale huur meer, servicekosten tellen niet mee, volledige toeslag vanaf 21 jaar. Met tabellen per huur en inkomen.`,
    h1: `Huurtoeslag berekenen ${JAAR}`,
    intro: `Sinds 1 januari ${JAAR} wordt huurtoeslag op een nieuwe, eenvoudigere manier berekend. Meer huurders hebben nu recht op huurtoeslag. Reken uit hoeveel jij krijgt.`,
    calc: 'huurtoeslag',
    partner: 'energie',
    body: () => `
<h2>Wat is er nieuw aan de huurtoeslag in ${JAAR}?</h2>
<ul>
<li><strong>Geen maximale huur meer.</strong> Is je kale huur hoger dan ${e2(H.maximaleHuurgrens)}? Dan kun je toch huurtoeslag krijgen. Er wordt gerekend alsof je huur ${e2(H.maximaleHuurgrens)} is.</li>
<li><strong>Servicekosten tellen niet meer mee.</strong> Alleen je kale huur telt.</li>
<li><strong>Volledige huurtoeslag vanaf 21 jaar</strong> (was 23). Ben je 18, 19 of 20? Dan wordt gerekend tot een huur van ${e2(H.maximaleHuurgrensJong)}.</li>
<li><strong>Lineaire afbouw.</strong> Verdien je meer, dan daalt je huurtoeslag geleidelijk: ${Math.round(H.afbouwpercentageEen * 100)} cent per extra verdiende euro voor alleenstaanden en ${Math.round(H.afbouwpercentageMeer * 100)} cent voor meerpersoonshuishoudens.</li>
</ul>

<h2>Voorwaarden voor huurtoeslag</h2>
<ul>
<li>Je huurt een <strong>zelfstandige woning</strong>: met eigen voordeur, keuken en toilet. Voor een kamer met gedeelde voorzieningen krijg je meestal geen huurtoeslag.</li>
<li>Je staat ingeschreven op het adres en bent in de regel 18 jaar of ouder.</li>
<li>Je vermogen is niet hoger dan ${euro(H.vermogensgrensPerPersoon)} per persoon (${euro(H.vermogensgrensPerPersoon * 2)} met toeslagpartner).</li>
<li>Je inkomen is niet te hoog. Er is geen vaste inkomensgrens meer: die hangt af van je huur (zie de tabel verderop).</li>
</ul>

<h2>Huurtoeslag per maand – alleenstaand</h2>
${huurtoeslagTabel(1)}
<h2>Huurtoeslag per maand – 2 personen</h2>
${huurtoeslagTabel(2)}

<h2>Tot welk inkomen krijg je huurtoeslag?</h2>
<p>Omdat er geen vaste inkomensgrens is, hangt het maximale inkomen af van je huur. Deze bedragen gelden voor huishoudens zonder AOW-leeftijd.</p>
${huurtoeslagGrensTabel()}

<h2>Zo wordt huurtoeslag berekend</h2>
<ol>
<li><strong>Rekenhuur:</strong> je kale huur, maximaal ${e2(H.maximaleHuurgrens)} (${e2(H.maximaleHuurgrensJong)} als je jonger bent dan 21).</li>
<li><strong>Basishuur:</strong> dit deel betaal je altijd zelf: ${e2(H.basishuurEen)} voor alleenstaanden en ${e2(H.basishuurMeer)} voor meerpersoonshuishoudens.</li>
<li><strong>Vergoeding per huurdeel:</strong> 100% van de huur tussen de basishuur en ${e2(H.kwaliteitskortingsgrens)}, 65% tussen ${e2(H.kwaliteitskortingsgrens)} en de aftoppingsgrens (${e2(H.aftoppingsgrensKlein)} voor 1–2 personen, ${e2(H.aftoppingsgrensGroot)} voor 3 of meer). Boven de aftoppingsgrens krijg je 40% als iemand in huis de AOW-leeftijd heeft of als je woning is aangepast vanwege een handicap.</li>
<li><strong>Inkomensafbouw:</strong> verdien je meer dan ${euro(H.inkomensijkpuntEen)} (alleen) of ${euro(H.inkomensijkpuntMeer)} (meerpersoons), dan gaat er ${Math.round(H.afbouwpercentageEen * 100)}% respectievelijk ${Math.round(H.afbouwpercentageMeer * 100)}% van het meerdere per jaar van je huurtoeslag af.</li>
</ol>
<p>Voorbeeld: je woont alleen, betaalt ${euro(710)} kale huur en verdient ${euro(29000)} per jaar. Maximale huurtoeslag: ${e2(H.kwaliteitskortingsgrens - H.basishuurEen)} + 65% × ${e2(710 - H.kwaliteitskortingsgrens)} = ${e2(H.kwaliteitskortingsgrens - H.basishuurEen + 0.65 * (710 - H.kwaliteitskortingsgrens))}. Door je inkomen gaat er ${e2((0.27 * (29000 - H.inkomensijkpuntEen)) / 12)} per maand af. Je krijgt ongeveer <strong>${euro(307)} per maand</strong>.</p>
<p class="let-op"><strong>Let op bij medebewoners:</strong> woont er een volwassen kind of huisgenoot bij je? Dan telt hun inkomen en vermogen meestal mee. Voor inwonende kinderen jonger dan 23 geldt een vrijstelling voor een deel van hun inkomen.</p>
${alleCheckLink}`,
    faq: [
      [`Wat is de maximale huur voor huurtoeslag in ${JAAR}?`, `Die is er niet meer als voorwaarde. Vanaf ${JAAR} kun je ook huurtoeslag krijgen als je huur hoger is dan ${e2(H.maximaleHuurgrens)}. Er wordt dan gerekend met ${e2(H.maximaleHuurgrens)}.`],
      [`Wat is de inkomensgrens voor huurtoeslag in ${JAAR}?`, `Er is geen vaste inkomensgrens. Hoe hoger je huur, hoe hoger het inkomen waarbij je nog huurtoeslag krijgt. Bij een huur van ${euro(700)} ligt de grens voor een alleenstaande rond ${euro(maxInkomen(huurtoeslag, { kaleHuur: 700, personen: 1 }))}.`],
      ['Tellen servicekosten nog mee?', `Nee. Vanaf ${JAAR} telt alleen de kale huur mee voor de huurtoeslag.`],
      ['Krijg ik huurtoeslag voor een studentenkamer?', 'Meestal niet. Huurtoeslag is alleen voor zelfstandige woonruimte met een eigen voordeur, keuken en toilet. Er zijn uitzonderingen voor bijvoorbeeld woongroepen voor ouderen of mensen met een handicap.'],
      ['Hoeveel vermogen mag ik hebben voor huurtoeslag?', `Maximaal ${euro(H.vermogensgrensPerPersoon)} per persoon. Met een toeslagpartner samen ${euro(H.vermogensgrensPerPersoon * 2)}. Ook elke medebewoner mag niet meer dan ${euro(H.vermogensgrensPerPersoon)} hebben.`],
    ],
  },

  // ───────────────────────────── KINDGEBONDEN BUDGET ─────────────────────────────
  {
    slug: '/kindgebonden-budget-berekenen/',
    kort: 'Kindgebonden budget berekenen',
    title: `Kindgebonden budget berekenen ${JAAR} – bedragen en inkomensgrens`,
    description: `Bereken je kindgebonden budget ${JAAR}. Tot ${euro(K.bedragPerKind)} per kind per jaar, extra voor kinderen vanaf 12 jaar en ${euro(K.alleenstaandeOuderkop)} extra voor alleenstaande ouders.`,
    h1: `Kindgebonden budget berekenen ${JAAR}`,
    intro: 'Het kindgebonden budget is een bijdrage in de kosten van je kinderen onder de 18. Je krijgt het naast de kinderbijslag. Reken uit hoeveel jij krijgt.',
    calc: 'kindgebondenBudget',
    partner: 'belastinghulp',
    body: () => `
<h2>Bedragen kindgebonden budget ${JAAR}</h2>
<div class="tabel-scroll"><table><thead><tr><th scope="col">Situatie</th><th scope="col">Maximaal per jaar</th></tr></thead><tbody>
<tr><th scope="row">Per kind jonger dan 12</th><td>${euro(K.bedragPerKind)}</td></tr>
<tr><th scope="row">Per kind van 12 tot en met 15</th><td>${euro(K.bedragPerKind + K.extra12tot15)}</td></tr>
<tr><th scope="row">Per kind van 16 of 17</th><td>${euro(K.bedragPerKind + K.extra16tot17)}</td></tr>
<tr><th scope="row">Extra voor alleenstaande ouders</th><td>${euro(K.alleenstaandeOuderkop)}</td></tr>
</tbody></table></div>
<p>Je krijgt het maximale bedrag tot een inkomen van ${euro(K.drempelinkomenAlleen)} (alleenstaande ouder) of ${euro(K.drempelinkomenPartner)} (met toeslagpartner). Daarboven gaat er ${pct(K.afbouwpercentage)} van het meerdere inkomen af.</p>

<h2>Kindgebonden budget per maand bij jouw inkomen</h2>
<p>Bedragen per maand voor kinderen jonger dan 12 jaar.</p>
${kgbTabel()}

<h2>Tot welk inkomen krijg je kindgebonden budget?</h2>
${kgbGrensTabel()}

<h2>Voorwaarden</h2>
<ul>
<li>Je krijgt kinderbijslag voor je kind (of je kind is 16 of 17 en woont bij je).</li>
<li>Je inkomen en vermogen zijn niet te hoog. Het vermogen mag in ${JAAR} niet hoger zijn dan ${euro(K.vermogensgrensAlleen)} (alleen) of ${euro(K.vermogensgrensPartner)} (samen).</li>
<li>Je hebt de Nederlandse nationaliteit of een geldige verblijfsvergunning.</li>
</ul>
<p>Heb je al kinderbijslag én zorgtoeslag? Dan krijg je het kindgebonden budget meestal automatisch. Anders vraag je het aan via Mijn toeslagen.</p>
${alleCheckLink}`,
    faq: [
      [`Hoeveel kindgebonden budget krijg ik per kind in ${JAAR}?`, `Maximaal ${euro(K.bedragPerKind)} per jaar voor een kind jonger dan 12. Voor kinderen van 12 tot 16 is het maximaal ${euro(K.bedragPerKind + K.extra12tot15)} en voor 16- en 17-jarigen ${euro(K.bedragPerKind + K.extra16tot17)}.`],
      ['Wat is de alleenstaande-ouderkop?', `Alleenstaande ouders krijgen maximaal ${euro(K.alleenstaandeOuderkop)} per jaar extra bovenop het kindgebonden budget.`],
      ['Telt kinderalimentatie mee als inkomen?', 'Nee, kinderalimentatie telt niet mee voor je toetsingsinkomen. Partneralimentatie telt wel mee.'],
      ['Moet ik kindgebonden budget aanvragen?', 'Vaak niet: als je kinderbijslag en zorgtoeslag krijgt, krijg je het meestal automatisch. Krijg je geen zorgtoeslag? Vraag het dan zelf aan via Mijn toeslagen.'],
    ],
  },

  // ───────────────────────────── KINDEROPVANGTOESLAG ─────────────────────────────
  {
    slug: '/kinderopvangtoeslag-berekenen/',
    kort: 'Kinderopvangtoeslag berekenen',
    title: `Kinderopvangtoeslag berekenen ${JAAR} – wat betaal je netto?`,
    description: `Bereken je kinderopvangtoeslag ${JAAR} en je netto kosten per maand. Maximale uurprijs dagopvang ${e2(O.maxUurprijs.dagopvang)}, BSO ${e2(O.maxUurprijs.bso)}, gastouder ${e2(O.maxUurprijs.gastouder)}. Tot 96% vergoed.`,
    h1: `Kinderopvangtoeslag berekenen ${JAAR}`,
    intro: 'Werk je en gaat je kind naar een kinderdagverblijf, BSO of gastouder? Dan krijg je een groot deel van de kosten terug. Bereken wat de opvang jou netto kost.',
    calc: 'kinderopvangtoeslag',
    partner: 'kinderopvang',
    body: () => `
<h2>Maximale uurprijs ${JAAR}</h2>
${tabel(['Soort opvang', 'Maximale uurprijs', 'Bij 96% vergoeding'], [
  ['Dagopvang (kinderdagverblijf)', e2(O.maxUurprijs.dagopvang), e2(O.maxUurprijs.dagopvang * 0.96)],
  ['Buitenschoolse opvang (BSO)', e2(O.maxUurprijs.bso), e2(O.maxUurprijs.bso * 0.96)],
  ['Gastouderopvang', e2(O.maxUurprijs.gastouder), e2(O.maxUurprijs.gastouder * 0.96)],
])}
<p>Is je uurprijs hoger dan het maximum? Dan betaal je het verschil helemaal zelf. Je krijgt toeslag voor maximaal ${O.maxUrenPerMaand} uur per kind per maand.</p>

<h2>Welk percentage krijg je vergoed?</h2>
<p>Tot een gezamenlijk toetsingsinkomen van ${euro(O.inkomenMaximaalPercentage)} krijg je 96% van de maximale uurprijs vergoed. Daarboven daalt het percentage. Voor het tweede en volgende kind daalt het minder snel.</p>
${tabel(['Gezamenlijk inkomen', 'Eerste kind', 'Tweede en volgende kind'], [
  ...[O.inkomenMaximaalPercentage, 70000, 80000, 90000, 100000, 120000, 140000, 160000, 200000].map((i) => [
    `${i === O.inkomenMaximaalPercentage ? 't/m ' : ''}${euro(i)}`,
    pctKot(kotPercentage(i, true)),
    pctKot(kotPercentage(i, false)),
  ]),
  ['Hoogste inkomens', pctKot(O.tabelEersteKind.at(-1)[1]), pctKot(O.tabelVolgendKind.at(-1)[1])],
])}
<p class="hint">De officiële tabel heeft 69 inkomensklassen. Onze rekenhulp rekent tussen bekende punten uit die tabel, dus de uitkomst kan tot ongeveer 1 procentpunt afwijken. Het 'eerste kind' is het kind met de hoogste opvangkosten.</p>

<h2>Voorwaarden voor kinderopvangtoeslag</h2>
<ul>
<li>Jij en je toeslagpartner werken allebei (of volgen een opleiding of traject naar werk).</li>
<li>De opvang staat in het Landelijk Register Kinderopvang (LRK).</li>
<li>Je hebt een schriftelijke overeenkomst met de opvang en betaalt je eigen deel via de bank.</li>
<li>Er is geen vermogensgrens voor kinderopvangtoeslag.</li>
</ul>
<p class="let-op"><strong>Op tijd aanvragen:</strong> vraag kinderopvangtoeslag aan binnen 3 maanden na de maand waarin de opvang begint. Anders loop je toeslag mis.</p>
${alleCheckLink}`,
    faq: [
      [`Hoeveel kinderopvangtoeslag krijg ik in ${JAAR}?`, `Tot een gezamenlijk inkomen van ${euro(O.inkomenMaximaalPercentage)} krijg je 96% van de maximale uurprijs. Voor dagopvang is dat ${e2(O.maxUurprijs.dagopvang * 0.96)} per uur.`],
      ['Is er een inkomensgrens voor kinderopvangtoeslag?', 'Nee. Ook met een hoog inkomen krijg je een deel vergoed: minimaal 36,5% voor het eerste kind en 68,2% voor volgende kinderen.'],
      ['Telt vermogen mee voor de kinderopvangtoeslag?', 'Nee, voor kinderopvangtoeslag geldt geen vermogensgrens.'],
      ['Moet ik blijven werken om kinderopvangtoeslag te houden?', 'Ja, in de regel moeten beide ouders werken. Het aantal gewerkte uren maakt niet meer uit, wel dat je werkt. Stop je met werken, dan heb je nog 3 maanden recht.'],
    ],
  },

  // ───────────────────────────── KINDERBIJSLAG ─────────────────────────────
  {
    slug: '/kinderbijslag-berekenen/',
    kort: 'Kinderbijslag berekenen',
    title: `Kinderbijslag ${JAAR} berekenen – bedragen per kwartaal`,
    description: `Kinderbijslag ${JAAR}: ${e2(B.perKwartaal.tot6)} (0–5 jaar), ${e2(B.perKwartaal.tot12)} (6–11 jaar) en ${e2(B.perKwartaal.tot18)} (12–17 jaar) per kwartaal. Bereken hoeveel je krijgt.`,
    h1: `Kinderbijslag berekenen ${JAAR}`,
    intro: 'Kinderbijslag krijg je van de SVB voor elk kind tot 18 jaar, ongeacht je inkomen. Bereken hoeveel je per kwartaal en per jaar krijgt.',
    calc: 'kinderbijslag',
    partner: 'belastinghulp',
    body: () => `
<h2>Bedragen kinderbijslag ${JAAR}</h2>
${tabel(['Leeftijd kind', 'Per kwartaal (vanaf 1 juli)', 'Per kwartaal (tot 1 juli)'], [
  ['0 tot en met 5 jaar', e2(B.perKwartaal.tot6), e2(B.perKwartaalEersteHelft.tot6)],
  ['6 tot en met 11 jaar', e2(B.perKwartaal.tot12), e2(B.perKwartaalEersteHelft.tot12)],
  ['12 tot en met 17 jaar', e2(B.perKwartaal.tot18), e2(B.perKwartaalEersteHelft.tot18)],
])}
<p>De SVB past de bedragen twee keer per jaar aan: op 1 januari en 1 juli. Onze rekenhulp gebruikt de bedragen vanaf 1 juli ${JAAR}.</p>
<h2>Voorwaarden</h2>
<ul>
<li>Je kind is jonger dan 18 jaar en woont bij je, of je betaalt flink mee aan de kosten.</li>
<li>Voor kinderen van 16 en 17: ze gaan naar school of studeren, of verdienen niet te veel.</li>
<li>Je woont of werkt in Nederland.</li>
</ul>
<h2>Kinderbijslag aanvragen</h2>
<p>Na de geboorte van je kind stuurt de SVB je meestal automatisch een aanvraagformulier. Krijg je niets? Vraag dan aan via <a href="https://www.svb.nl/kinderbijslag" rel="noopener">svb.nl</a>. Naast de kinderbijslag heb je misschien ook recht op <a href="/kindgebonden-budget-berekenen/">kindgebonden budget</a>.</p>
${alleCheckLink}`,
    faq: [
      ['Is kinderbijslag afhankelijk van mijn inkomen?', 'Nee, iedereen met kinderen tot 18 jaar krijgt hetzelfde bedrag, ongeacht het inkomen.'],
      ['Wanneer wordt kinderbijslag uitbetaald?', 'Na afloop van elk kwartaal: begin januari, april, juli en oktober.'],
      ['Krijg ik meer kinderbijslag voor mijn tweede kind?', 'Nee, het bedrag hangt alleen af van de leeftijd van het kind, niet van het aantal kinderen.'],
    ],
  },

  // ───────────────────────────── TOETSINGSINKOMEN ─────────────────────────────
  {
    slug: '/toetsingsinkomen/',
    kort: 'Toetsingsinkomen',
    title: `Toetsingsinkomen berekenen voor toeslagen ${JAAR}`,
    description: 'Wat is je toetsingsinkomen en hoe bereken je het? Reken je bruto maandloon om naar het jaarinkomen dat Dienst Toeslagen gebruikt.',
    h1: 'Toetsingsinkomen berekenen',
    intro: 'Voor alle toeslagen kijkt Dienst Toeslagen naar je toetsingsinkomen. Weet je niet precies wat dat is? Bereken het hier vanuit je maandloon.',
    calc: 'toetsingsinkomen',
    body: () => `
<h2>Wat is het toetsingsinkomen?</h2>
<p>Je toetsingsinkomen is meestal je <strong>verzamelinkomen</strong> uit je belastingaangifte: je inkomen uit werk, uitkering of pensioen (box 1), plus eventueel inkomen uit aanmerkelijk belang (box 2) en uit sparen en beleggen (box 3). Doe je geen aangifte? Dan is het meestal je bruto jaarloon inclusief vakantiegeld, min eventuele aftrekposten.</p>
<h2>Wat telt mee en wat niet?</h2>
${tabel(['Telt mee', 'Telt niet mee'], [
  ['Loon, inclusief vakantiegeld en 13e maand', 'Studiefinanciering'],
  ['Uitkering (WW, WIA, bijstand, AOW)', 'Kinderbijslag en kindgebonden budget'],
  ['Pensioen', 'Kinderalimentatie'],
  ['Winst uit onderneming', 'Toeslagen zelf'],
  ['Partneralimentatie', 'Vergoedingen die belastingvrij zijn'],
])}
<h2>Waar vind ik mijn toetsingsinkomen?</h2>
<ul>
<li>Op je jaaropgave (werkgever of uitkeringsinstantie): kijk naar 'fiscaal loon'.</li>
<li>In je belastingaanslag: het verzamelinkomen.</li>
<li>In Mijn toeslagen: daar zie je welk inkomen Dienst Toeslagen nu gebruikt.</li>
</ul>
<p class="let-op"><strong>Schat liever iets te hoog dan te laag.</strong> Is je inkomen achteraf hoger dan je hebt doorgegeven, dan moet je toeslag terugbetalen. <a href="/toeslag-terugbetalen/">Zo voorkom je dat</a>.</p>`,
    faq: [
      ['Is toetsingsinkomen bruto of netto?', 'Bruto. Het is je inkomen vóór aftrek van loonheffing, inclusief vakantiegeld.'],
      ['Telt het inkomen van mijn partner mee?', 'Ja, als je een toeslagpartner hebt, tellen jullie inkomens bij elkaar op. Voor huurtoeslag telt ook het inkomen van medebewoners mee.'],
    ],
  },

  // ───────────────────────────── DOELGROEPEN ─────────────────────────────
  {
    slug: '/toeslagen-student/',
    kort: 'Toeslagen voor studenten',
    title: `Toeslagen voor studenten ${JAAR} – zorgtoeslag, huurtoeslag en meer`,
    description: `Op welke toeslagen heb je als student recht in ${JAAR}? Zorgtoeslag, huurtoeslag voor een studio en wat je moet weten over je bijbaan en studieschuld.`,
    h1: 'Toeslagen voor studenten',
    intro: 'Als student heb je vaak recht op zorgtoeslag, en soms op huurtoeslag. Doe de check en lees waar je op moet letten.',
    calc: 'alles',
    body: () => `
<h2>Zorgtoeslag als student</h2>
<p>Vanaf je 18e moet je een zorgverzekering hebben, en de meeste studenten hebben recht op de maximale zorgtoeslag van ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} per maand. Je studiefinanciering telt niet mee als inkomen, je bijbaan wel.</p>
<h2>Huurtoeslag als student</h2>
<p>Huurtoeslag krijg je alleen voor een <strong>zelfstandige woning</strong>, zoals een studio met eigen keuken, douche en toilet. Voor een kamer met gedeelde voorzieningen krijg je geen huurtoeslag. Ben je 18, 19 of 20? Dan wordt gerekend tot een huur van ${e2(H.maximaleHuurgrensJong)}. Vanaf 21 jaar tot ${e2(H.maximaleHuurgrens)}.</p>
<h2>Let op in het jaar dat je afstudeert</h2>
<p class="let-op">Ga je na je studie fulltime werken? Dan stijgt je jaarinkomen snel. Geef je nieuwe inkomen meteen door in Mijn toeslagen, anders moet je later honderden euro’s terugbetalen.</p>
<h2>Studieschuld en vermogen</h2>
<p>Een studieschuld bij DUO telt als schuld voor je vermogen in box 3. Spaargeld is voor de meeste studenten geen probleem: de vermogensgrens voor zorgtoeslag is ${euro(Z.vermogensgrensAlleen)}.</p>`,
    faq: [
      ['Telt studiefinanciering mee voor zorgtoeslag?', 'Nee. Studiefinanciering (basisbeurs, aanvullende beurs en lening) telt niet mee als inkomen.'],
      ['Krijg ik huurtoeslag voor mijn studentenkamer?', 'Alleen als het een zelfstandige woonruimte is met eigen voordeur, keuken en toilet.'],
    ],
  },
  {
    slug: '/toeslagen-alleenstaande-ouder/',
    kort: 'Toeslagen voor alleenstaande ouders',
    title: `Toeslagen voor alleenstaande ouders ${JAAR} – alles op een rij`,
    description: `Alleenstaande ouder? Bereken je kindgebonden budget met alleenstaande-ouderkop (${euro(K.alleenstaandeOuderkop)} extra), huurtoeslag, zorgtoeslag, kinderopvangtoeslag en kinderbijslag.`,
    h1: 'Toeslagen voor alleenstaande ouders',
    intro: 'Als alleenstaande ouder heb je vaak recht op meerdere toeslagen tegelijk. Doe de check en zie in één keer wat je kunt krijgen.',
    calc: 'alles',
    body: () => `
<h2>Waar heb je als alleenstaande ouder recht op?</h2>
<ul>
<li><strong>Kindgebonden budget</strong> met de alleenstaande-ouderkop: tot ${euro(K.alleenstaandeOuderkop)} per jaar extra. Het maximale bedrag krijg je tot een inkomen van ${euro(K.drempelinkomenAlleen)}.</li>
<li><strong>Kinderbijslag</strong> van de SVB, voor elk kind tot 18 jaar.</li>
<li><strong>Huurtoeslag</strong> als je een zelfstandige woning huurt. Je kinderen tellen mee voor de grootte van je huishouden.</li>
<li><strong>Zorgtoeslag</strong> voor je eigen zorgverzekering. Kinderen tot 18 zijn gratis verzekerd.</li>
<li><strong>Kinderopvangtoeslag</strong> als je werkt en je kind naar een geregistreerde opvang gaat.</li>
<li>De <strong>inkomensafhankelijke combinatiekorting</strong> in je belastingaangifte als je werkt en een kind jonger dan 12 hebt.</li>
</ul>
<h2>Alimentatie en toeslagen</h2>
<p>Kinderalimentatie die je ontvangt telt <strong>niet</strong> mee als inkomen. Partneralimentatie telt wel mee.</p>
<h2>Kindgebonden budget voor alleenstaande ouders</h2>
${kgbTabel()}
<p>Ook bij je gemeente kun je vaak extra hulp krijgen, zoals een bijdrage voor schoolspullen of sport. <a href="/regelingen-laag-inkomen/">Bekijk alle regelingen</a>.</p>`,
    faq: [
      ['Hoeveel is de alleenstaande-ouderkop?', `In ${JAAR} maximaal ${euro(K.alleenstaandeOuderkop)} per jaar, bovenop het gewone kindgebonden budget.`],
      ['Word ik toeslagpartner als ik ga samenwonen?', 'Vaak wel, bijvoorbeeld als je samen een kind krijgt of een samenlevingscontract hebt. Dan vervalt de alleenstaande-ouderkop. Geef het meteen door.'],
    ],
  },
  {
    slug: '/toeslagen-aow/',
    kort: 'Toeslagen voor AOW’ers',
    title: `Toeslagen met AOW ${JAAR} – zorgtoeslag, huurtoeslag en AIO`,
    description: `Heb je AOW? Check je recht op zorgtoeslag, huurtoeslag (extra vergoeding boven de aftoppingsgrens) en de AIO-aanvulling in ${JAAR}.`,
    h1: 'Toeslagen voor AOW’ers en gepensioneerden',
    intro: 'Ook met AOW en pensioen heb je vaak recht op toeslagen. Veel ouderen laten geld liggen. Doe de check.',
    calc: 'alles',
    body: () => `
<h2>Zorgtoeslag met AOW</h2>
<p>Met alleen AOW en een klein pensioen heb je meestal recht op zorgtoeslag. De inkomensgrens is ${euro(Z.maxInkomenAlleen)} voor alleenstaanden en ${euro(Z.maxInkomenPartner)} voor partners samen.</p>
<h2>Huurtoeslag met AOW</h2>
<p>Heeft iemand in je huishouden de AOW-leeftijd? Dan krijg je ook 40% vergoed over het deel van je huur boven de aftoppingsgrens (${e2(H.aftoppingsgrensKlein)} voor 1 of 2 personen). Jongere huishoudens krijgen dat niet.</p>
<h2>AIO-aanvulling</h2>
<p>Heb je geen volledige AOW, omdat je niet altijd in Nederland woonde? En heb je weinig ander inkomen? Dan kan de SVB je inkomen aanvullen tot het sociaal minimum met de AIO-aanvulling. <a href="/regelingen-laag-inkomen/#aio">Meer over de AIO</a>.</p>
<h2>Vermogen</h2>
<p>Voor huurtoeslag mag je vermogen niet hoger zijn dan ${euro(H.vermogensgrensPerPersoon)} per persoon. Voor zorgtoeslag is de grens ${euro(Z.vermogensgrensAlleen)} (alleen) of ${euro(Z.vermogensgrensPartner)} (samen). Een eigen huis telt niet mee voor zorgtoeslag, maar met een eigen huis krijg je ook geen huurtoeslag.</p>`,
    faq: [
      ['Krijg ik zorgtoeslag met alleen AOW?', 'Meestal wel. Een AOW-uitkering met een klein aanvullend pensioen blijft vaak onder de inkomensgrens.'],
      ['Wat is de AIO-aanvulling?', 'Een aanvulling van de SVB voor mensen met een onvolledige AOW en weinig ander inkomen of vermogen.'],
    ],
  },

  // ───────────────────────────── REGELINGEN ─────────────────────────────
  {
    slug: '/regelingen-laag-inkomen/',
    kort: 'Regelingen bij een laag inkomen',
    title: `Regelingen bij een laag inkomen ${JAAR} – gemeente, UWV en SVB`,
    description: 'Naast toeslagen zijn er veel regelingen bij een laag inkomen: kwijtschelding, bijzondere bijstand, individuele inkomenstoeslag, Toeslagenwet, AIO en hulp voor kinderen.',
    h1: 'Regelingen bij een laag inkomen',
    intro: 'Toeslagen van de Belastingdienst zijn niet het enige. Je gemeente, het UWV en de SVB hebben ook regelingen. Dit zijn de belangrijkste.',
    body: () => `
<h2 id="kwijtschelding">Kwijtschelding gemeentelijke belastingen</h2>
<p>Met een laag inkomen en weinig vermogen hoef je gemeentelijke belastingen (zoals afvalstoffenheffing en rioolheffing) en waterschapsbelasting soms niet te betalen. Vraag kwijtschelding aan bij je gemeente of via de belastingsamenwerking in je regio, meestal binnen 3 maanden na de aanslag.</p>
<h2 id="bijzondere-bijstand">Bijzondere bijstand</h2>
<p>Heb je onverwachte, noodzakelijke kosten die je niet zelf kunt betalen? Denk aan een kapotte koelkast, het eigen risico van je zorgverzekering of kosten van een bewindvoerder. Dan kun je bijzondere bijstand aanvragen bij je gemeente, ook als je werkt.</p>
<h2 id="individuele-inkomenstoeslag">Individuele inkomenstoeslag</h2>
<p>Heb je al minimaal 3 jaar een laag inkomen en weinig kans dat dit verbetert? Dan kun je bij je gemeente een individuele inkomenstoeslag aanvragen: een jaarlijks bedrag dat je vrij kunt besteden. Je moet tussen de 21 jaar en de AOW-leeftijd zijn.</p>
<h2 id="gemeentepolis">Collectieve zorgverzekering (gemeentepolis)</h2>
<p>Veel gemeenten hebben een voordelige zorgverzekering voor inwoners met een laag inkomen, vaak met een goede aanvullende dekking en soms een vergoeding voor het eigen risico. Vraag ernaar bij je gemeente vóór 31 december.</p>
<h2 id="kinderen">Regelingen voor kinderen</h2>
<ul>
<li><strong>Stichting Leergeld</strong> helpt met schoolspullen, een laptop, een fiets of schoolreisjes.</li>
<li><strong>Jeugdfonds Sport &amp; Cultuur</strong> betaalt contributie voor sport, muziekles of dansles.</li>
<li>Veel gemeenten hebben een <strong>kindpakket of meedoenregeling</strong>.</li>
</ul>
<h2 id="toeslagenwet">Toeslag op je uitkering (Toeslagenwet)</h2>
<p>Heb je een uitkering zoals WW, WIA, Wajong of Ziektewet, en is die samen met het inkomen van je partner lager dan het sociaal minimum? Dan kan het UWV je uitkering aanvullen met een toeslag. Vraag het aan bij het UWV.</p>
<h2 id="aio">AIO-aanvulling (SVB)</h2>
<p>Heb je de AOW-leeftijd, maar geen volledige AOW? En is je totale inkomen lager dan het sociaal minimum? Dan kun je bij de SVB een aanvullende inkomensvoorziening ouderen (AIO) aanvragen.</p>
<h2 id="heffingskorting">Heffingskorting voor de minstverdienende partner</h2>
<p>Heeft je partner weinig of geen inkomen en is die geboren vóór 1 januari 1963? Dan kan die partner een deel van de algemene heffingskorting laten uitbetalen via de belastingaangifte. Voor jongere partners is deze regeling afgeschaft.</p>
<h2 id="schulden">Hulp bij geldzorgen</h2>
<p>Heb je betalingsachterstanden? Iedere gemeente biedt gratis schuldhulpverlening. Hoe eerder je hulp vraagt, hoe makkelijker het op te lossen is. Kijk ook op <a href="https://www.geldfit.nl" rel="noopener">geldfit.nl</a> voor een gratis geldcheck.</p>
${alleCheckLink}`,
    faq: [
      ['Waar vraag ik bijzondere bijstand aan?', 'Bij de afdeling werk en inkomen (sociale dienst) van je eigen gemeente.'],
      ['Tellen toeslagen mee voor de bijstand?', 'Nee, zorgtoeslag, huurtoeslag en kindgebonden budget tellen in de regel niet mee als inkomen voor de bijstand.'],
    ],
  },

  // ───────────────────────────── UITLEG ─────────────────────────────
  {
    slug: '/inkomensgrenzen-toeslagen/',
    kort: `Inkomensgrenzen ${JAAR}`,
    title: `Inkomensgrenzen toeslagen ${JAAR} – overzicht per toeslag`,
    description: `Alle inkomensgrenzen voor toeslagen in ${JAAR}: zorgtoeslag ${euro(Z.maxInkomenAlleen)} / ${euro(Z.maxInkomenPartner)}, huurtoeslag per huur, kindgebonden budget per aantal kinderen en kinderopvangtoeslag.`,
    h1: `Inkomensgrenzen toeslagen ${JAAR}`,
    intro: 'Tot welk inkomen krijg je nog toeslag? Hieronder staan alle grenzen op een rij, berekend met de officiële rekenregels.',
    body: () => `
<h2>Zorgtoeslag</h2>
${tabel(['', 'Maximaal toetsingsinkomen'], [['Alleenstaand', euro(Z.maxInkomenAlleen)], ['Met toeslagpartner', euro(Z.maxInkomenPartner)]])}
<h2>Huurtoeslag</h2>
<p>Voor huurtoeslag is er geen vaste grens meer: die hangt af van je huur.</p>
${huurtoeslagGrensTabel()}
<h2>Kindgebonden budget</h2>
${kgbGrensTabel()}
<h2>Kinderopvangtoeslag en kinderbijslag</h2>
<p>Voor kinderopvangtoeslag en kinderbijslag is er <strong>geen</strong> inkomensgrens. Bij kinderopvangtoeslag krijg je met een hoger inkomen wel een lager percentage vergoed.</p>
${alleCheckLink}`,
    faq: [
      [`Wat is de inkomensgrens voor zorgtoeslag in ${JAAR}?`, `${euro(Z.maxInkomenAlleen)} voor alleenstaanden en ${euro(Z.maxInkomenPartner)} voor partners samen.`],
      [`Tot welk inkomen krijg je kindgebonden budget met 2 kinderen?`, `Met toeslagpartner tot ongeveer ${euro(maxInkomen(kindgebondenBudget, { kinderen: [5, 5], partner: true }))}, als alleenstaande ouder tot ongeveer ${euro(maxInkomen(kindgebondenBudget, { kinderen: [5, 5] }))} (kinderen jonger dan 12).`],
    ],
  },
  {
    slug: '/vermogensgrens-toeslagen/',
    kort: `Vermogensgrenzen ${JAAR}`,
    title: `Vermogensgrens toeslagen ${JAAR} – hoeveel spaargeld mag je hebben?`,
    description: `Hoeveel spaargeld mag je hebben voor toeslagen in ${JAAR}? Zorgtoeslag ${euro(Z.vermogensgrensAlleen)}, huurtoeslag ${euro(H.vermogensgrensPerPersoon)} per persoon en kindgebonden budget ${euro(K.vermogensgrensAlleen)}.`,
    h1: `Vermogensgrenzen toeslagen ${JAAR}`,
    intro: 'Heb je te veel spaargeld of beleggingen, dan krijg je geen toeslag. Dit zijn de grenzen voor dit jaar.',
    body: () => `
${tabel(['Toeslag', 'Alleenstaand', 'Met toeslagpartner'], [
  ['Zorgtoeslag', euro(Z.vermogensgrensAlleen), euro(Z.vermogensgrensPartner)],
  ['Huurtoeslag', euro(H.vermogensgrensPerPersoon), `${euro(H.vermogensgrensPerPersoon * 2)} (plus ${euro(H.vermogensgrensPerPersoon)} per medebewoner)`],
  ['Kindgebonden budget', euro(K.vermogensgrensAlleen), euro(K.vermogensgrensPartner)],
  ['Kinderopvangtoeslag', 'geen grens', 'geen grens'],
  ['Kinderbijslag', 'geen grens', 'geen grens'],
])}
<h2>Wat telt als vermogen?</h2>
<p>Dienst Toeslagen kijkt naar je vermogen in box 3 op <strong>1 januari</strong>: spaargeld, beleggingen, een tweede huis en andere bezittingen, min je schulden. Je eigen woning waarin je woont telt niet mee. Er geldt een drempel voor schulden: kleine schulden mag je niet aftrekken.</p>
<p class="let-op">Zit je vermogen op 1 januari boven de grens, dan heb je dat <strong>hele jaar</strong> geen recht op die toeslag. Ook niet als je later in het jaar minder hebt.</p>
${alleCheckLink}`,
    faq: [
      [`Hoeveel spaargeld mag je hebben voor huurtoeslag in ${JAAR}?`, `${euro(H.vermogensgrensPerPersoon)} per persoon, ${euro(H.vermogensgrensPerPersoon * 2)} samen met je toeslagpartner.`],
      ['Telt mijn auto mee als vermogen?', 'Een auto voor eigen gebruik telt meestal niet mee als vermogen in box 3.'],
    ],
  },
  {
    slug: '/toeslagpartner/',
    kort: 'Toeslagpartner',
    title: 'Wie is mijn toeslagpartner? Uitleg en voorbeelden',
    description: 'Wanneer is iemand je toeslagpartner? Uitleg over getrouwd, samenwonend, samenlevingscontract en een kind samen, en waarom het zo belangrijk is voor je toeslag.',
    h1: 'Wie is je toeslagpartner?',
    intro: 'Of je een toeslagpartner hebt, bepaalt voor een groot deel hoeveel toeslag je krijgt. Het is niet altijd hetzelfde als je partner in het dagelijks leven.',
    body: () => `
<h2>Je bent in ieder geval toeslagpartners als je:</h2>
<ul>
<li>getrouwd bent, of</li>
<li>een geregistreerd partnerschap hebt.</li>
</ul>
<h2>Als je samenwoont</h2>
<p>Woon je samen op hetzelfde adres en ben je niet getrouwd? Dan ben je toeslagpartners als een van deze dingen geldt:</p>
<ul>
<li>Jullie hebben samen een kind (ook als je het kind hebt erkend).</li>
<li>Jullie hebben een samenlevingscontract bij de notaris.</li>
<li>Jullie hebben samen een eigen huis.</li>
<li>Je bent als partner aangemeld bij een pensioenfonds.</li>
<li>Jullie waren vorig jaar al toeslagpartners of fiscaal partners.</li>
<li>Er staat een minderjarig kind van een van jullie op het adres ingeschreven.</li>
</ul>
<p class="let-op">Twijfel je? Kijk in Mijn toeslagen of bel de BelastingTelefoon Toeslagen. Een verkeerde partner opgeven is een van de meest voorkomende redenen om later te moeten terugbetalen.</p>
<h2>Huisgenoot of medebewoner</h2>
<p>Woon je met iemand samen die geen toeslagpartner is, zoals een volwassen kind of een huisgenoot? Dan is die persoon een <strong>medebewoner</strong>. Voor de huurtoeslag telt het inkomen en vermogen van medebewoners wel mee. Voor de andere toeslagen niet.</p>`,
    faq: [
      ['Is mijn vriend(in) mijn toeslagpartner?', 'Alleen als jullie getrouwd zijn, geregistreerd partner zijn, of samenwonen en aan een van de extra voorwaarden voldoen, zoals samen een kind of een samenlevingscontract.'],
      ['Kan ik kiezen of iemand mijn toeslagpartner is?', 'Meestal niet: het volgt uit de regels. Alleen in sommige situaties, zoals ongehuwd samenwonen zonder de extra voorwaarden, ben je geen toeslagpartners.'],
    ],
  },
  {
    slug: '/toeslagen-aanvragen/',
    kort: 'Toeslagen aanvragen',
    title: `Toeslagen aanvragen ${JAAR} – stappenplan`,
    description: `Zo vraag je zorgtoeslag, huurtoeslag, kindgebonden budget en kinderopvangtoeslag aan in ${JAAR}. Stappenplan, wat je nodig hebt en wanneer je het geld krijgt.`,
    h1: 'Toeslagen aanvragen: zo werkt het',
    intro: 'Toeslagen vraag je aan bij Dienst Toeslagen, online met je DigiD. Met dit stappenplan ben je in 15 minuten klaar.',
    body: () => `
<h2>Wat heb je nodig?</h2>
<ul>
<li>Je DigiD (met sms-controle of de DigiD-app).</li>
<li>Een schatting van je inkomen voor dit jaar (en dat van je toeslagpartner). <a href="/toetsingsinkomen/">Bereken je toetsingsinkomen</a>.</li>
<li>Een Nederlands bankrekeningnummer op jouw naam.</li>
<li>Voor huurtoeslag: je kale huur en de gegevens van je medebewoners.</li>
<li>Voor kinderopvangtoeslag: het registratienummer (LRK) van de opvang, de uurprijs en het aantal uren.</li>
</ul>
<h2>Stappenplan</h2>
<ol>
<li>Reken eerst uit waar je recht op hebt met de <a href="/#check">toeslagen-check</a>.</li>
<li>Ga naar <a href="https://www.toeslagen.nl" rel="noopener">toeslagen.nl</a> en log in bij Mijn toeslagen.</li>
<li>Kies 'Toeslag aanvragen' en vul je gegevens in.</li>
<li>Controleer je gegevens en verstuur de aanvraag.</li>
<li>Je krijgt een brief (beschikking) met de hoogte van je voorschot. Daarna wordt het elke maand uitbetaald.</li>
</ol>
<h2>Wanneer krijg je het geld?</h2>
<p>Dienst Toeslagen betaalt het voorschot elke maand, meestal rond de 20e van de maand. Na afloop van het jaar, als je inkomen definitief bekend is, wordt je toeslag definitief berekend. Heb je te weinig gekregen, dan krijg je bij. Te veel gekregen? Dan moet je terugbetalen.</p>
<h2>Deadlines</h2>
<ul>
<li>Zorgtoeslag, huurtoeslag en kindgebonden budget over ${JAAR}: aanvragen tot en met 31 augustus ${VOLGEND}.</li>
<li>Kinderopvangtoeslag: binnen 3 maanden na de maand waarin de opvang begint.</li>
</ul>`,
    faq: [
      ['Kan ik toeslagen aanvragen zonder DigiD?', 'Je kunt een machtiging geven aan iemand anders, bijvoorbeeld een familielid of hulpverlener, of hulp vragen bij een Informatiepunt Digitale Overheid in de bibliotheek.'],
      ['Kan ik met terugwerkende kracht toeslag aanvragen?', `Ja. Zorgtoeslag, huurtoeslag en kindgebonden budget over ${JAAR} kun je nog aanvragen tot 1 september ${VOLGEND}.`],
    ],
  },
  {
    slug: '/toeslag-terugbetalen/',
    kort: 'Terugbetalen voorkomen',
    title: 'Toeslag terugbetalen? Zo voorkom je het (en wat als het toch moet)',
    description: 'Waarom moet je toeslag terugbetalen en hoe voorkom je het? Tips om je voorschot goed in te stellen, en wat je kunt doen als je moet terugbetalen.',
    h1: 'Toeslag terugbetalen voorkomen',
    intro: 'Een terugvordering van honderden of duizenden euro’s is een flinke klap. Met deze tips voorkom je het.',
    body: () => `
<h2>Waarom moet je terugbetalen?</h2>
<p>Je toeslag is een voorschot op basis van een schatting. Klopt die schatting achteraf niet, dan wordt het bedrag aangepast. De meest voorkomende oorzaken:</p>
<ul>
<li>Je inkomen was hoger dan je had doorgegeven (loonsverhoging, bonus, nieuwe baan, afstuderen).</li>
<li>Je kreeg een toeslagpartner of je partnerschap eindigde.</li>
<li>Er kwam een medebewoner bij met eigen inkomen (huurtoeslag).</li>
<li>Je vermogen was op 1 januari hoger dan de grens.</li>
<li>Je kinderopvanguren of uurprijs veranderden.</li>
</ul>
<h2>5 tips om terugbetalen te voorkomen</h2>
<ol>
<li><strong>Geef veranderingen binnen 4 weken door</strong> via Mijn toeslagen of de app Toeslagen.</li>
<li><strong>Schat je inkomen liever iets te hoog.</strong> Te weinig gekregen krijg je later alsnog.</li>
<li><strong>Check je voorschot elk jaar in januari</strong>, als de nieuwe bedragen ingaan.</li>
<li><strong>Controleer je vermogen op 1 januari</strong>, vooral na een erfenis of verkoop van een huis.</li>
<li><strong>Reken na met ToeslagBuddy</strong> als je situatie verandert.</li>
</ol>
<h2>Moet je toch terugbetalen?</h2>
<p>Je krijgt een betalingsregeling van maximaal 24 maanden, waarbij rekening wordt gehouden met je draagkracht. Kun je het bedrag niet betalen? Vraag dan een persoonlijke betalingsregeling aan. Ben je het niet eens met de berekening, dan kun je binnen 6 weken bezwaar maken.</p>`,
    faq: [
      ['Hoe lang heb ik om een toeslag terug te betalen?', 'Standaard krijg je een betalingsregeling van 24 maanden. Bij een laag inkomen kun je een persoonlijke betalingsregeling aanvragen.'],
      ['Moet ik rente betalen over een terugvordering?', 'Nee, over een terugvordering van een toeslag betaal je in de regel geen rente zolang je je aan de betalingsregeling houdt.'],
    ],
  },
  {
    slug: '/toeslagen-2027/',
    kort: `Toeslagen ${VOLGEND}`,
    title: `Toeslagen ${VOLGEND}: dit verandert er (Prinsjesdag ${JAAR})`,
    description: `Wat verandert er aan de toeslagen in ${VOLGEND}? Zorgtoeslag omhoog, lagere vermogensgrens voor zorgtoeslag en kindgebonden budget, en meer. Overzicht na Prinsjesdag ${JAAR}.`,
    h1: `Toeslagen ${VOLGEND}: wat verandert er?`,
    intro: `Op Prinsjesdag (15 september ${JAAR}) presenteerde het kabinet de plannen voor ${VOLGEND}. Dit zijn de belangrijkste veranderingen voor toeslagen. De definitieve bedragen volgen in november en december; we werken deze pagina en alle rekenhulpen dan direct bij.`,
    body: () => `
<p class="let-op"><strong>Let op:</strong> de bedragen op deze pagina zijn ramingen en voornemens uit de Prinsjesdagstukken. Ze kunnen nog veranderen door besluiten van de Tweede en Eerste Kamer. Onze rekenhulpen rekenen nog met de bedragen van ${JAAR}.</p>
<h2>Zorgtoeslag ${VOLGEND}</h2>
<p>De zorgtoeslag gaat volgens de ramingen omhoog, omdat ook de zorgpremie stijgt. De maximale zorgtoeslag wordt naar verwachting ongeveer <strong>€ 140 per maand</strong> voor alleenstaanden (nu ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))}) en ongeveer <strong>€ 268 per maand</strong> met toeslagpartner (nu ${euro(Math.floor(zorgtoeslag({ inkomen: 0, partner: true }).perJaar / 12))}).</p>
<h2>Lagere vermogensgrens voor zorgtoeslag en kindgebonden budget</h2>
<p>Het kabinet wil de vermogensgrens voor zorgtoeslag en kindgebonden budget verlagen. Volgens de plannen wordt de grens ongeveer € 119.122 voor alleenstaanden en € 158.748 voor partners (nu ${euro(Z.vermogensgrensAlleen)} en ${euro(Z.vermogensgrensPartner)}). Heb je veel spaargeld? Controleer dan op 1 januari ${VOLGEND} of je nog onder de grens zit.</p>
<h2>Kindgebonden budget en kinderbijslag</h2>
<p>Het kabinet wil het kindgebonden budget voor hogere inkomens sneller afbouwen. Daartegenover staat een voorgenomen verhoging van de kinderbijslag.</p>
<h2>Huurtoeslag ${VOLGEND}</h2>
<p>De bedragen voor de huurtoeslag worden elk jaar per 1 januari aangepast aan de huren en inkomens. De nieuwe grenzen worden meestal eind november bekendgemaakt.</p>
<h2>Belangrijke data</h2>
${tabel(['Wanneer', 'Wat'], [
  ['12 november', 'Zorgverzekeraars maken premies bekend; overstappen kan tot 31 december'],
  ['Eind november', `Definitieve bedragen huurtoeslag en toeslagen ${VOLGEND}`],
  ['Begin december', `Brief met je voorschot voor ${VOLGEND}`],
  [`1 januari ${VOLGEND}`, 'Nieuwe bedragen gaan in; peildatum voor je vermogen'],
])}
${alleCheckLink}`,
    faq: [
      [`Hoeveel zorgtoeslag krijg ik in ${VOLGEND}?`, `Volgens de ramingen van Prinsjesdag ongeveer € 140 per maand voor alleenstaanden en € 268 met toeslagpartner. De definitieve bedragen volgen in november.`],
      [`Wanneer zijn de toeslagbedragen voor ${VOLGEND} bekend?`, 'De definitieve bedragen worden meestal eind november of begin december gepubliceerd. Rond die tijd krijg je ook een brief met je nieuwe voorschot.'],
    ],
  },

  // ───────────────────────────── PRO (B2B) ─────────────────────────────
  {
    slug: '/pro/',
    kort: 'Voor bewindvoerders',
    title: 'ToeslagBuddy Pro – toeslagencheck voor bewindvoerders en budgetcoaches',
    description: 'Controleer in één keer voor al je cliënten of ze alle toeslagen en regelingen krijgen, en waar een terugvordering dreigt. Cliëntgegevens blijven op je eigen computer.',
    h1: 'Alle cliënten in één keer gecontroleerd op toeslagen',
    intro: 'Voor bewindvoerders, budgetcoaches en schuldhulpverleners. Zet je cliëntenlijst erin en zie binnen een minuut wie geld misloopt, wie een te hoog voorschot heeft en welke regeling van de gemeente nog kan worden aangevraagd.',
    body: ({ config }) => `
<p><a class="knop" href="/pro/check/">Probeer het direct met voorbeeldcliënten →</a></p>

<h2>Het probleem</h2>
<ul>
<li>Je bent verplicht om ervoor te zorgen dat cliënten alle toeslagen en regelingen krijgen waar ze recht op hebben.</li>
<li>Inkomens, huren, kinderen en vermogen veranderen, maar voorschotten lopen door. Een terugvordering komt pas een jaar later, en raakt juist deze cliënten hard.</li>
<li>Per cliënt alles handmatig narekenen kost tijd die je niet hebt.</li>
</ul>

<h2>Zo werkt ToeslagBuddy Pro</h2>
<ol>
<li><strong>Exporteer je cliëntenlijst</strong> uit je administratie naar Excel of CSV, of gebruik ons sjabloon.</li>
<li><strong>Zet de lijst in ToeslagBuddy Pro.</strong> De controle draait in je eigen browser.</li>
<li><strong>Werk de actielijst af</strong> of download die als Excel-bestand. Print het rapport als onderbouwing voor je dossier.</li>
</ol>

<h2>Wat wordt er gecontroleerd?</h2>
<ul>
<li><strong>Niet aangevraagd:</strong> zorgtoeslag, huurtoeslag en kindgebonden budget waar waarschijnlijk recht op is.</li>
<li><strong>Terugbetalingsrisico:</strong> voorschotten die hoger zijn dan het berekende recht, of waar door vermogen geen recht meer is.</li>
<li><strong>Voorschot te laag:</strong> cliënten die maandelijks te weinig ontvangen.</li>
<li><strong>Vermogen dicht bij de grens</strong> (peildatum 1 januari).</li>
<li><strong>Veranderingen volgend jaar:</strong> kind wordt 12, 16 of 18; cliënt wordt 18 of 21.</li>
<li><strong>Gemeentelijke regelingen:</strong> kwijtschelding, bijzondere bijstand, individuele inkomenstoeslag en kindregelingen.</li>
</ul>

<h2>Privacy: cliëntgegevens blijven bij jou</h2>
<p>De berekening draait volledig in je browser. Wij ontvangen, zien en bewaren <strong>geen</strong> cliëntgegevens. Er gaat niets over het internet. Gebruik cliëntnummers in plaats van namen of BSN; meer is niet nodig.</p>

<h2>Prijzen</h2>
<div class="prijzen">
<div class="prijs uitgelicht"><h3>Pilot</h3><p class="bedrag">€ 0</p><p>30 dagen, daarna € 99 per maand</p><ul><li>Tot 100 cliënten</li><li>Onbeperkt controleren</li><li>Actielijst en rapport</li><li>Persoonlijke onboarding</li></ul></div>
<div class="prijs"><h3>Kantoor</h3><p class="bedrag">€ 1</p><p>per cliënt per maand (minimaal € 99)</p><ul><li>Onbeperkt cliënten</li><li>Jaarlijkse update rekenregels</li><li>Rapport voor je dossier en de jaarlijkse controle</li><li>Support per mail en telefoon</li></ul></div>
<div class="prijs"><h3>Organisatie</h3><p class="bedrag">Op maat</p><p>Schuldhulpverlening, gemeenten, woningcorporaties</p><ul><li>Meerdere teams</li><li>Eigen huisstijl</li><li>Koppeling met je eigen software</li></ul></div>
</div>
<p class="hint">Introductieprijzen voor de eerste 10 kantoren. Alle prijzen exclusief btw.</p>

<h2 id="pilot">Pilot aanvragen</h2>
${config.pro.formAction
  ? `<form class="aanvraag" action="${config.pro.formAction}" method="post">
<div class="veld"><label for="p-naam">Naam</label><input id="p-naam" name="naam" required autocomplete="name"></div>
<div class="veld"><label for="p-org">Kantoor / organisatie</label><input id="p-org" name="organisatie" required autocomplete="organization"></div>
<div class="veld"><label for="p-mail">E-mail</label><input id="p-mail" type="email" name="email" required autocomplete="email"></div>
<div class="veld"><label for="p-tel">Telefoon (optioneel)</label><input id="p-tel" type="tel" name="telefoon" autocomplete="tel"></div>
<div class="veld"><label for="p-aantal">Aantal cliënten</label><input id="p-aantal" name="clienten" inputmode="numeric"></div>
<button class="knop" type="submit">Pilot aanvragen</button></form>`
  : `<p class="aanvraag">Mail naar <a href="mailto:${config.contactEmail}?subject=Pilot%20ToeslagBuddy%20Pro&body=Naam%3A%0AKantoor%3A%0AAantal%20cli%C3%ABnten%3A%0ATelefoon%3A">${config.contactEmail}</a> met je naam, kantoor en het aantal cliënten. We nemen binnen één werkdag contact op.</p>`}
`,
    faq: [
      ['Moet ik een verwerkersovereenkomst met jullie sluiten?', 'Wij verwerken geen persoonsgegevens: de controle draait in je eigen browser en er gaat niets naar onze server. Bespreek het met je eigen privacyfunctionaris als je twijfelt; we lichten de werking graag toe.'],
      ['Welke gegevens heb ik per cliënt nodig?', 'Leeftijd, partner ja/nee, verwacht inkomen, vermogen, huur, huishouden, leeftijden van de kinderen en de huidige voorschotten. Het sjabloon laat precies zien welke kolommen er zijn.'],
      ['Hoe nauwkeurig is de controle?', 'We gebruiken de officiële rekenregels van het lopende jaar. Het is een signaleringsinstrument: controleer een signaal altijd in Mijn toeslagen voordat je een wijziging doorgeeft.'],
      ['Werkt het met mijn bewindvoeringssoftware?', 'Ja, via een export naar Excel of CSV. Kolomnamen hoeven niet exact overeen te komen: veelgebruikte namen worden herkend.'],
    ],
  },
  {
    slug: '/pro/check/',
    kort: 'Cliëntenlijst controleren',
    title: 'Cliëntenlijst controleren op toeslagen – ToeslagBuddy Pro',
    description: 'Laad je cliëntenlijst en zie direct wie toeslagen misloopt en waar een terugvordering dreigt. De controle draait in je eigen browser.',
    h1: 'Cliëntenlijst controleren',
    intro: 'Kies een CSV-bestand, plak je lijst of probeer het voorbeeld. Er gaat niets over het internet.',
    script: 'pro-app.js',
    body: () => `
<section class="rekenkaart" aria-label="Cliëntenlijst">
<div class="pro-knoppen">
<label class="knop-licht" style="cursor:pointer">📄 CSV-bestand kiezen<input type="file" id="pro-bestand" accept=".csv,text/csv" hidden></label>
<button type="button" class="knop-licht" id="pro-voorbeeld">Voorbeeld laden</button>
<button type="button" class="knop-licht" id="pro-sjabloon">Sjabloon downloaden</button>
</div>
<label for="pro-invoer" class="label">Of plak hier je lijst (met kopregel):</label>
<textarea id="pro-invoer" spellcheck="false" placeholder="${KOLOMMEN.map(([k]) => k).join(';')}"></textarea>
<p><button type="button" class="knop" id="pro-controleer">Controleer lijst</button></p>
<p class="privacy-noot">🔒 De controle draait lokaal in je browser. Wij ontvangen geen cliëntgegevens.</p>
</section>
<div id="pro-uitkomst" aria-live="polite"></div>
<h2>Kolommen</h2>
<p>Scheidingsteken puntkomma of komma. Ja/nee-velden mogen ook j/n of 1/0 zijn. Onbekende kolommen worden genegeerd.</p>
${tabel(['Kolom', 'Betekenis'], KOLOMMEN.map(([k, b]) => [`<code>${k}</code>`, b]))}
<p>Nog geen account? <a href="/pro/#pilot">Vraag een gratis pilot aan</a>.</p>`,
  },

  // ───────────────────────────── ZZP ─────────────────────────────
  {
    slug: '/zzp-toeslagen/',
    kort: 'Toeslagen voor zzp’ers',
    title: `Toeslagen voor zzp'ers ${JAAR} – voorkom terugbetalen met de toeslagbewaker`,
    description: 'Wisselende winst? Check in 2 minuten of je toeslagvoorschot nog klopt, hoeveel je gaat terugbetalen of bijkrijgen, en welk inkomen je moet opgeven.',
    h1: 'Toeslagbewaker voor zzp’ers',
    intro: 'Als zzp’er schommelt je winst, en daarmee je toeslag. Vul je winst tot nu toe in en zie of je voorschot nog klopt, vóórdat je een terugvordering krijgt.',
    calc: 'zzp',
    script: 'zzp-dashboard.js',
    body: ({ config }) => `
<section id="mijn-overzicht" class="aanvraag" hidden>
<h2>Mijn toeslagbewaker</h2>
<p class="subtiel">Je bewaarde checks staan alleen op dit apparaat. Wij kunnen ze niet zien.</p>
<div data-overzicht></div>
<p class="pro-knoppen"><button type="button" class="knop-licht" data-export>Exporteren</button>
<label class="knop-licht" style="cursor:pointer">Importeren<input type="file" accept="application/json" data-import hidden></label>
<button type="button" class="knop-licht" data-wis>Alles wissen</button></p>
</section>
<h2>Waarom zzp’ers vaak terugbetalen</h2>
<p>Je toeslag is een voorschot op basis van het inkomen dat je aan het begin van het jaar hebt geschat. Loopt je bedrijf beter dan verwacht, dan krijg je te veel en betaal je volgend jaar terug. Loopt het slechter, dan krijg je nu te weinig. Uit onderzoek van het CPB blijkt ook dat zelfstandigen vaker toeslagen laten liggen dan werknemers.</p>
<h2>Hoe rekent de toeslagbewaker?</h2>
<ol>
<li>Je winst tot nu toe wordt doorgetrokken naar een heel jaar (of we gebruiken je eigen schatting).</li>
<li>Daar gaat de zelfstandigenaftrek af (${euro(ZZP.zelfstandigenaftrek)} in ${JAAR}, als je aan het urencriterium voldoet) en daarna de mkb-winstvrijstelling (${(ZZP.mkbWinstvrijstelling * 100).toLocaleString('nl-NL')}%).</li>
<li>Samen met je andere inkomen (en dat van je partner) is dat je verwachte toetsingsinkomen.</li>
<li>We berekenen je toeslagen met dat inkomen én met het inkomen dat nu in Mijn toeslagen staat, en laten het verschil zien.</li>
</ol>
<p class="let-op"><strong>Tip:</strong> doe deze check elke maand. Met de knop “herinnering in mijn agenda” krijg je op de 1e van elke maand een seintje.</p>
<h2 id="wachtlijst">Binnenkort: automatisch vanuit je boekhouding</h2>
<p>We werken aan een koppeling met boekhoudpakketten zoals Moneybird en e-Boekhouden, zodat je automatisch een seintje krijgt als je voorschot niet meer klopt.</p>
${config.zzp.wachtlijstAction
  ? `<form class="aanvraag" action="${config.zzp.wachtlijstAction}" method="post"><div class="veld"><label for="w-mail">E-mail</label><input id="w-mail" type="email" name="email" required autocomplete="email"></div>
<div class="veld"><label for="w-pakket">Welk boekhoudpakket gebruik je?</label><input id="w-pakket" name="boekhoudpakket" placeholder="Moneybird, e-Boekhouden, Jortt…"></div>
<button class="knop" type="submit">Zet me op de wachtlijst</button></form>`
  : `<p class="aanvraag">Mail naar <a href="mailto:${config.contactEmail}?subject=Wachtlijst%20toeslagbewaker&body=Mijn%20boekhoudpakket%3A%20">${config.contactEmail}</a> en noem je boekhoudpakket.</p>`}
${alleCheckLink}`,
    faq: [
      ['Telt mijn omzet of mijn winst voor toeslagen?', 'Je winst, na aftrek van de ondernemersaftrek en de mkb-winstvrijstelling. Niet je omzet.'],
      ['Wat als mijn inkomen per maand erg wisselt?', 'Voor toeslagen telt alleen je inkomen over het hele jaar. Een drukke of rustige maand maakt dus niet uit, zolang je jaarschatting klopt.'],
      ['Wanneer moet ik een nieuw inkomen doorgeven?', 'Zodra je verwacht dat je jaarinkomen duidelijk anders uitvalt dan je hebt opgegeven. Hoe eerder, hoe kleiner de terugvordering.'],
    ],
  },

  {
    slug: '/instagram/',
    kort: 'Instagram',
    noindex: true,
    title: 'ToeslagBuddy op Instagram – snel naar je berekening',
    description: 'Vanaf Instagram direct naar de juiste rekenhulp: alle toeslagen, zorgtoeslag, huurtoeslag, kindgebonden budget en kinderopvangtoeslag.',
    h1: 'Hoi! Wat wil je uitrekenen?',
    intro: 'Kies hieronder. Gratis, anoniem en zonder DigiD – je gegevens blijven op je telefoon.',
    body: () => `
<div class="kaarten">
<a href="/?utm_source=instagram&utm_medium=bio#check"><strong>Alle toeslagen in één check</strong><span>In 2 minuten je totaalbedrag</span></a>
<a href="/zorgtoeslag-berekenen/?utm_source=instagram&utm_medium=bio"><strong>Zorgtoeslag</strong><span>Tot ${euro(Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12))} per maand</span></a>
<a href="/huurtoeslag-berekenen/?utm_source=instagram&utm_medium=bio"><strong>Huurtoeslag</strong><span>Nieuwe regels ${JAAR}</span></a>
<a href="/kindgebonden-budget-berekenen/?utm_source=instagram&utm_medium=bio"><strong>Kindgebonden budget</strong><span>Ook voor alleenstaande ouders</span></a>
<a href="/kinderopvangtoeslag-berekenen/?utm_source=instagram&utm_medium=bio"><strong>Kinderopvangtoeslag</strong><span>Wat kost opvang netto?</span></a>
<a href="/toeslagen-2027/?utm_source=instagram&utm_medium=bio"><strong>Toeslagen ${VOLGEND}</strong><span>Wat verandert er?</span></a>
<a href="/toeslag-terugbetalen/?utm_source=instagram&utm_medium=bio"><strong>Terugbetalen voorkomen</strong><span>5 tips</span></a>
</div>`,
  },

  {
    slug: '/zorgverzekering-overstappen/',
    kort: `Zorgverzekering ${VOLGEND}`,
    title: `Zorgverzekering ${VOLGEND} overstappen – zo bespaar je (en houd je je zorgtoeslag)`,
    description: `Overstappen van zorgverzekering voor ${VOLGEND}: wanneer, hoe opzeggen, wat er met je zorgtoeslag gebeurt en hoe je honderden euro's bespaart. Stappenplan in gewone taal.`,
    h1: `Zorgverzekering ${VOLGEND}: overstappen en besparen`,
    intro: `Elk jaar kun je tot en met 31 december overstappen naar een andere zorgverzekering. Je zorgtoeslag verandert daar niet door, maar je premie wel.`,
    body: ({ config }) => `
${partnerBlok('zorgverzekering')}
<h2>In het kort</h2>
<ul>
<li><strong>Wanneer?</strong> Zorgverzekeraars maken hun premies voor ${VOLGEND} uiterlijk 12 november bekend. Overstappen kan tot en met 31 december ${JAAR}.</li>
<li><strong>Opzeggen?</strong> Hoeft meestal niet. Sluit je vóór 1 januari een nieuwe verzekering af, dan zegt je nieuwe verzekeraar je oude verzekering voor je op (de overstapservice).</li>
<li><strong>Zorgtoeslag?</strong> Blijft gewoon doorlopen. Je zorgtoeslag hangt af van je inkomen, niet van je verzekeraar. Geef alleen een nieuw inkomen door als dat verandert.</li>
<li><strong>Kinderen</strong> tot 18 jaar zijn gratis verzekerd. Zet ze bij je nieuwe verzekeraar op je polis.</li>
</ul>

<h2>Zo bespaar je op je zorgverzekering</h2>
<ol>
<li><strong>Kijk wat je echt gebruikt.</strong> Betaal je voor een aanvullende verzekering (tandarts, fysio, bril) die je bijna niet gebruikt? Dat kan vaak tientallen euro’s per maand schelen.</li>
<li><strong>Vergelijk de basisverzekering.</strong> De basisverzekering dekt bij iedere verzekeraar hetzelfde, maar de prijs verschilt. Let wel op de vergoeding bij zorgverleners zonder contract (naturapolis of restitutiepolis).</li>
<li><strong>Laag inkomen?</strong> Vraag bij je gemeente naar de <a href="/regelingen-laag-inkomen/#gemeentepolis">gemeentepolis</a>: vaak goedkoop, met een goede aanvullende dekking en soms hulp bij het eigen risico.</li>
<li><strong>Eigen risico:</strong> je kunt het eigen risico vaak in termijnen betalen. Kies alleen een hoger vrijwillig eigen risico als je dat bedrag in één keer kunt missen.</li>
</ol>

<h2>Wat gaat de zorgpremie kosten in ${VOLGEND}?</h2>
<p>Volgens de ramingen van Prinsjesdag stijgt de gemiddelde premie in ${VOLGEND}. Daarom gaat ook de zorgtoeslag omhoog: naar verwachting tot ongeveer € 140 per maand voor alleenstaanden. De echte premies zie je vanaf 12 november bij de verzekeraars. <a href="/toeslagen-2027/">Alles over toeslagen ${VOLGEND}</a>.</p>

<h2>Check ook je zorgtoeslag</h2>
<p>Veel mensen die hun zorgverzekering vergelijken, blijken ook recht te hebben op zorgtoeslag – en krijgen het nog niet. <a href="/zorgtoeslag-berekenen/">Bereken je zorgtoeslag</a> in 1 minuut.</p>
${partnerBlok('zorgverzekering')}
${alleCheckLink}`,
    faq: [
      [`Tot wanneer kan ik overstappen van zorgverzekering?`, `Tot en met 31 december ${JAAR}. Je nieuwe verzekering gaat dan in op 1 januari ${VOLGEND}.`],
      ['Moet ik mijn oude zorgverzekering zelf opzeggen?', 'Meestal niet. Als je vóór 1 januari overstapt, zegt je nieuwe verzekeraar je oude basisverzekering voor je op.'],
      ['Verandert mijn zorgtoeslag als ik overstap?', 'Nee. Je zorgtoeslag hangt af van je inkomen en vermogen, niet van je verzekeraar of je premie.'],
      ['Kan ik overstappen als ik een betalingsachterstand heb?', 'Niet altijd: bij een betalingsachterstand kan je verzekeraar het opzeggen weigeren. Vraag je gemeente om hulp; schuldhulp is gratis.'],
    ],
  },

  {
    slug: '/nieuws/',
    kort: 'Nieuws',
    title: 'Nieuws over toeslagen – dagelijks bijgewerkt',
    description: 'Het laatste nieuws over zorgtoeslag, huurtoeslag, kinderopvangtoeslag, kindgebonden budget, kinderbijslag en inkomen. Elke dag bijgewerkt uit officiële bronnen.',
    h1: 'Nieuws over toeslagen',
    intro: 'Elke dag verzamelen we het nieuws van de Rijksoverheid en andere officiële bronnen over toeslagen en inkomen.',
    body: () => `
${nieuws.bijgewerkt ? `<p class="subtiel">Laatst bijgewerkt: ${datumNl(nieuws.bijgewerkt)}. Abonneer je via <a href="/nieuws/feed.xml">RSS</a>.</p>` : ''}
${nieuws.items.length ? nieuwsLijst(nieuws.items) : '<p>Nog geen nieuws. Kom morgen terug.</p>'}
<p class="hint">Titels en samenvattingen komen van de genoemde bron. Klik door voor het volledige bericht.</p>
${alleCheckLink}`,
  },

  // ───────────────────────────── OVER / JURIDISCH ─────────────────────────────
  {
    slug: '/bronnen/',
    kort: 'Bronnen en rekenregels',
    title: 'Bronnen en rekenregels',
    description: `Welke bronnen en bedragen gebruikt ToeslagBuddy? Alle rekenregels voor ${JAAR} met links naar Dienst Toeslagen, Rijksoverheid en SVB.`,
    h1: 'Bronnen en rekenregels',
    intro: 'We rekenen met de officiële regels en bedragen. Hieronder zie je welke bronnen we gebruiken en wanneer we ze voor het laatst hebben gecontroleerd.',
    bronnen: true,
    body: ({ bronnen }) => `
${bronnen}
<h2>Hoe nauwkeurig is ToeslagBuddy?</h2>
<p>Voor zorgtoeslag, huurtoeslag, kindgebonden budget en kinderbijslag volgen we de officiële formules. Kleine verschillen door afronding zijn mogelijk. Voor kinderopvangtoeslag benaderen we de officiële tabel met 69 inkomensklassen; de uitkomst kan daardoor tot ongeveer 1 procentpunt afwijken.</p>
<p>Zie je een fout? Mail ons via de <a href="/over/">contactgegevens</a>, dan passen we het zo snel mogelijk aan.</p>`,
  },
  {
    slug: '/over/',
    kort: 'Over ToeslagBuddy',
    title: 'Over ToeslagBuddy',
    description: 'ToeslagBuddy is een onafhankelijke, gratis rekenhulp die iedereen helpt om te zien op welke toeslagen hij of zij recht heeft.',
    h1: 'Over ToeslagBuddy',
    intro: 'Wij vinden dat niemand geld moet laten liggen omdat de regels te ingewikkeld zijn.',
    body: ({ config }) => `
<p>ToeslagBuddy is een onafhankelijke, gratis rekenhulp. In één check zie je op welke toeslagen en regelingen je recht hebt, in gewone taal en zonder dat je gegevens je apparaat verlaten.</p>
<h2>Onafhankelijk</h2>
<p>We zijn geen onderdeel van de overheid, de Belastingdienst of Dienst Toeslagen. De site wordt betaald met advertenties en partnerlinks. Die zijn altijd duidelijk herkenbaar en hebben geen invloed op de berekening.</p>
<h2>Contact</h2>
<p>Vragen, tips of een fout gevonden? Mail naar <a href="mailto:${config.contactEmail}">${config.contactEmail}</a>. Let op: wij kunnen niet in je persoonlijke toeslagdossier kijken. Daarvoor bel je de BelastingTelefoon Toeslagen.</p>`,
  },
  {
    slug: '/privacy/',
    kort: 'Privacy',
    title: 'Privacy en cookies',
    description: 'Hoe ToeslagBuddy omgaat met je privacy: berekeningen blijven op je apparaat, geen tracking-cookies zonder toestemming.',
    h1: 'Privacy en cookies',
    intro: 'Kort gezegd: wat je invult in de rekenhulpen blijft op je eigen apparaat.',
    body: ({ config }) => `
<h2>Je berekeningen</h2>
<p>Alle berekeningen gebeuren in je browser. Je inkomen, huur, vermogen en andere antwoorden worden niet naar onze server of naar anderen verstuurd en niet opgeslagen.</p>
<h2>Bezoekersstatistieken</h2>
<p>${config.analytics.plausibleDomain || config.analytics.goatcounterCode ? 'We meten anoniem hoeveel mensen de site bezoeken, zonder cookies en zonder persoonsgegevens op te slaan.' : 'We gebruiken op dit moment geen bezoekersstatistieken.'}</p>
<h2>Advertenties</h2>
<p>${config.adsense.client ? 'Op deze site staan advertenties van Google AdSense. Google gebruikt alleen cookies voor gepersonaliseerde advertenties als je daar toestemming voor geeft via de toestemmingsmelding. Je kunt je keuze altijd wijzigen.' : 'Op dit moment tonen we geen advertenties van derden.'}</p>
<h2>Partnerlinks</h2>
<p>Sommige links naar vergelijkingssites zijn partnerlinks. Klik je erop en sluit je iets af, dan krijgen wij mogelijk een vergoeding. Jij betaalt daar niets extra voor. Na het klikken gelden de privacyregels van die website.</p>
<h2>Nieuwsbrief</h2>
<p>Meld je je aan voor onze nieuwsbrief, dan bewaren we alleen je e-mailadres om je die mail te sturen. Afmelden kan altijd via de link onderaan elke mail.</p>
<h2>Contact</h2>
<p>Vragen over privacy? Mail naar <a href="mailto:${config.contactEmail}">${config.contactEmail}</a>.</p>`,
  },
  {
    slug: '/disclaimer/',
    kort: 'Disclaimer',
    title: 'Disclaimer',
    description: 'Disclaimer van ToeslagBuddy: de berekeningen zijn een indicatie, je kunt er geen rechten aan ontlenen.',
    h1: 'Disclaimer',
    intro: 'We doen ons best om alles juist en actueel te houden, maar de uitkomsten blijven een indicatie.',
    body: () => `
<p>ToeslagBuddy is een onafhankelijke rekenhulp en is <strong>geen</strong> onderdeel van de Belastingdienst, Dienst Toeslagen, de SVB, het UWV of een gemeente.</p>
<p>De berekeningen zijn een indicatie op basis van de rekenregels en bedragen voor ${JAAR}, en op basis van de gegevens die je zelf invult. Je kunt er geen rechten aan ontlenen. Alleen Dienst Toeslagen stelt vast of en hoeveel toeslag je krijgt.</p>
<p>We zijn niet aansprakelijk voor schade die ontstaat door het gebruik van deze website of de berekeningen. Neem bij twijfel contact op met de BelastingTelefoon Toeslagen of een onafhankelijke adviseur, zoals het Juridisch Loket of een sociaal raadslieden.</p>`,
  },
];
