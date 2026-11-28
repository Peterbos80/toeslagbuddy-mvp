// Bouwt de complete statische site in dist/. Uploaden naar TransIP kan
// daarna met `npm run deploy` of via de GitHub Action.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './site.config.js';
import * as params from './src/calc/params.js';
import { pages as pagesNl, nieuws } from './src/site/pages.js';
import { pagesEn } from './src/site/pages-en.js';
import { koppel } from './src/site/talen.js';
import { forms } from './src/site/forms.js';
import { layout, advertentie, nieuwsbrief, esc, icoon, partnerBlok, uitlegVideo } from './src/site/layout.js';
import { robotsTxt, llmsTxt, vingerafdruk, sleutelGeldig } from './src/site/vindbaar.js';
import { teksten } from './src/i18n/i18n.js';
import { bouwDeals } from './src/site/deals-pages.js';
import { bouwFamilie } from './src/site/familie-pages.js';

// Alle pagina's, Nederlands en Engels, met hreflang-paren en taalschakelaar
const pages = koppel([...pagesNl, ...pagesEn]);

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

// Alles weg behalve dist/og/: de deelafbeeldingen per pagina
// (scripts/og-paginas.js). Staan ze er al, dan verwijst een pagina er meteen
// naar; het script maakt ze bij elke publicatie opnieuw.
if (existsSync(DIST)) for (const f of readdirSync(DIST)) if (f !== 'og') rmSync(join(DIST, f), { recursive: true, force: true });
mkdirSync(join(DIST, 'js'), { recursive: true });
mkdirSync(join(DIST, 'css'), { recursive: true });

// Statische bestanden (favicon, og-afbeelding, manifest)
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });

// Versie voor cache-busting: hash van alle code en parameters
// styles.css is de basis; ontwerp.css is het ontwerpsysteem (v2) en komt erna.
// Overige bestanden in src/site/css/ worden losse stylesheets (/css/<naam>.css)
// die een pagina laadt met page.css = ['naam'].
const css = readFileSync(join(ROOT, 'src/site/styles.css'), 'utf8') + '\n' + readFileSync(join(ROOT, 'src/site/ontwerp.css'), 'utf8');
const losseCss = {};
if (existsSync(join(ROOT, 'src/site/css'))) {
  for (const f of readdirSync(join(ROOT, 'src/site/css')).filter((f) => f.endsWith('.css'))) losseCss[f] = readFileSync(join(ROOT, 'src/site/css', f), 'utf8');
}
// Alle browser-scripts: rekenmotor (src/calc), teksten (src/i18n), de
// DealBuddy-motor (src/deals) en pagina-scripts (public/js). Ze komen plat in
// /js/, dus namen moeten uniek zijn.
const js = {};
for (const map of ['src/calc', 'src/i18n', 'src/deals', 'src/familie', 'public/js']) {
  if (!existsSync(join(ROOT, map))) continue;
  for (const f of readdirSync(join(ROOT, map)).filter((f) => f.endsWith('.js'))) {
    if (js[f]) throw new Error(`Dubbele scriptnaam ${f} in ${map}: /js/ is plat`);
    js[f] = readFileSync(join(ROOT, map, f), 'utf8');
  }
}
const versie = createHash('sha1').update(css + Object.values(losseCss).join('') + Object.values(js).join('')).digest('hex').slice(0, 8);

writeFileSync(join(DIST, 'css/site.css'), minifyCss(css));
for (const [naam, inhoud] of Object.entries(losseCss)) writeFileSync(join(DIST, 'css', naam), minifyCss(inhoud));
for (const [naam, code] of Object.entries(js)) {
  // '../i18n/nl.js' en './params.js' worden allebei './naam.js?v=…'
  const metVersie = code.replace(/(from |import\()'(?:\.\.\/[\w-]+\/|\.\/)([\w-]+)\.js'/g, `$1'./$2.js?v=${versie}'`);
  writeFileSync(join(DIST, 'js', naam), metVersie);
}

const zijbalk = (slug, S) => {
  const z = S.zijbalk;
  const links = z.links.filter(([u]) => u !== slug);
  return `<aside class="zij">
<div class="blok"><h2>${z.meer}</h2><ul>${links.map(([u, n]) => `<li><a href="${u}">${n}</a></li>`).join('')}</ul></div>
<div class="blok"><h2>${z.bijgewerkt(params.JAAR)}</h2><p>${z.bronnen}</p></div>
<div class="blok"><h2>${z.nieuw(params.JAAR + 1)}</h2><p>${z.nieuwTekst}</p></div>
</aside>`;
};

function bronnenHtml() {
  const groepen = [
    ['Zorgtoeslag', params.ZORGTOESLAG],
    ['Huurtoeslag', params.HUURTOESLAG],
    ['Kindgebonden budget', params.KINDGEBONDEN_BUDGET],
    ['Kinderopvangtoeslag', params.KINDEROPVANGTOESLAG],
    ['Kinderbijslag', params.KINDERBIJSLAG],
  ];
  return (
    `<p>Laatst gecontroleerd: <strong>${new Date(params.GECONTROLEERD_OP).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>` +
    groepen
      .map(
        ([naam, p]) =>
          `<h2>${naam}</h2><ul>${p.bronnen.map(([t, u]) => `<li><a href="${u}" rel="noopener">${esc(t)}</a></li>`).join('')}</ul>`,
      )
      .join('')
  );
}

function faqHtml(faq, S) {
  if (!faq || !faq.length) return '';
  return `<section class="faq"><h2>${S.faqKop}</h2>${faq
    .map(([q, a]) => `<details><summary>${esc(q)}</summary><div><p>${a}</p></div></details>`)
    .join('')}</section>`;
}

// Snelcheck "Kan ik recht hebben?" bovenaan de startpagina (public/js/snelcheck.js)
function snelcheckHtml(taal) {
  const T = teksten(taal).site.snelcheck;
  const F = teksten(taal).forms;
  const keuze = (name, value, label, type = 'radio') => `<label class="sc-keuze"><input type="${type}" name="${name}" value="${value}"><span>${label}</span></label>`;
  return `<section class="snelcheck" aria-labelledby="sc-kop" data-snelcheck hidden>
<div class="sc-vragen">
<h2 id="sc-kop">${T.kop}</h2>
<p class="sc-sub">${T.sub}</p>
<form>
<fieldset><legend><span class="sc-nr">1</span> ${T.partner}</legend><div class="sc-rij">${keuze('partner', 'ja', F.ja)}${keuze('partner', 'nee', F.nee)}</div></fieldset>
<fieldset><legend><span class="sc-nr">2</span> <span data-sc-inkomen>${T.inkomen(false)}</span></legend><div class="sc-rij sc-klassen">${T.klassen.map((k, i) => keuze('klasse', i, k)).join('')}</div></fieldset>
<fieldset><legend><span class="sc-nr">3</span> ${T.situatie}</legend><div class="sc-rij">${keuze('huurt', 'ja', T.huurt, 'checkbox')}${keuze('kinderen', 'ja', T.kinderen, 'checkbox')}<span data-sc-opvang hidden>${keuze('opvang', 'ja', T.opvang, 'checkbox')}</span></div></fieldset>
</form>
</div>
<div class="sc-uitkomst" aria-live="polite" data-sc-uitkomst><p class="sc-leeg">${T.leeg}</p></div>
</section>`;
}

// Alle onderdelen van de site in één overzicht (op de startpagina)
function onderdelenHtml() {
  const o = (klasse, url, ico, titel, tekst, meer, nieuw = '') =>
    `<a class="onderdeel o-${klasse}" href="${url}">${nieuw ? `<span class="o-nieuw">${nieuw}</span>` : ''}<span class="o-icoon">${icoon(ico)}</span><strong>${titel}</strong><span class="o-tekst">${tekst}</span><span class="o-meer">${meer} ${icoon('pijl', 'klein')}</span></a>`;
  return `<section class="onderdelen" aria-labelledby="onderdelen-kop">
<h2 id="onderdelen-kop">Meer dan toeslagen</h2>
<p>ToeslagBuddy helpt je met alles rond geld en regelzaken. Onafhankelijk, in gewone taal, en je gegevens blijven van jou.</p>
<div class="onderdelen-raster">
${o('familie', '/familie/', 'familie', 'Samen de zaken van je ouders regelen', 'Eén gedeelde regelkamer voor de familie: termijnen, brieven, geld en afspraken. Tot en met de afwikkeling na een overlijden.', 'Naar Familie', 'Nieuw')}
${o('deals', '/deals/', 'label', 'Echte deals, eerlijk berekend', 'We vergelijken de prijs van vandaag met wat een product meestal kost, inclusief verzendkosten. Met bewijs.', 'Naar Besparen')}
${o('pro', '/pro/', 'koffer', 'Voor bewindvoerders en budgetcoaches', 'Controleer in één keer voor al je cliënten of ze toeslagen missen of moeten terugbetalen.', 'Naar Professionals')}
${o('pro', '/zzp-toeslagen/', 'grafiek', 'Toeslagbewaker voor zzp’ers', 'Wisselend inkomen? Zie per maand of je toeslagen nog kloppen en voorkom terugbetalen.', 'Naar Zzp')}
</div>
${uitlegVideo('toeslagen')}
</section>`;
}

// Verdienen, eerlijk: een partnerblok op de informatiepagina waar het bij het
// onderwerp past. Een blok verschijnt alleen als de partnerlink is ingevuld
// in site.config.js; rekenhulpen tonen partners pas na de uitkomst.
// Familie krijgt nooit partnerlinks: dat onderdeel leeft van abonnementen.
const PARTNER_OP = {
  '/toeslagen-aow/': 'zorgverzekering',
  '/toeslagen-2027/': 'zorgverzekering',
  '/regelingen-laag-inkomen/': 'energie',
  '/toeslagen-student/': 'internet',
  '/toeslagen-alleenstaande-ouder/': 'kinderopvang',
  '/toeslag-terugbetalen/': 'belastinghulp',
  '/toetsingsinkomen/': 'belastinghulp',
  '/zzp-toeslagen/': 'boekhouden',
};
// Doorverwijzen binnen de eigen site: [onderdeel, url, icoon, kop, tekst, knop]
const KRUIS_OP = {
  '/toeslagen-aow/': ['familie', '/familie/', 'familie', 'Regel je de zaken van je ouders?', 'Houd termijnen, brieven en uitgaven samen bij in één gedeelde regelkamer. Gratis te proberen.', 'Bekijk Familie'],
  '/toeslagpartner/': ['familie', '/familie/checklist/na-overlijden/', 'kaars', 'Partner overleden?', 'De checklist na een overlijden zet alle stappen en termijnen op een rij, ook voor de toeslagen.', 'Naar de checklist'],
  '/regelingen-laag-inkomen/': ['deals', '/deals/', 'label', 'Ook besparen op aankopen?', 'We vergelijken de prijs van vandaag met wat een product meestal kost. Zo zie je of een korting echt is.', 'Bekijk Besparen'],
  '/zorgverzekering-overstappen/': ['familie', '/familie/gids/', 'document', 'Regel je de zorgverzekering voor je ouders?', 'In de gidsen lees je wat er verandert bij een verhuizing naar het verpleeghuis en wat het kost.', 'Lees de gidsen'],
  '/toeslag-terugbetalen/': ['pro', '/zzp-toeslagen/', 'grafiek', 'Wisselend inkomen als zzp’er?', 'De toeslagbewaker laat per maand zien of je voorschot nog klopt.', 'Naar Zzp'],
};
function verdienHtml(page, body) {
  if (page.taal !== 'nl') return '';
  const partner = PARTNER_OP[page.slug] && !body.includes('class="partner"') ? partnerBlok(PARTNER_OP[page.slug]) : '';
  const k = KRUIS_OP[page.slug];
  const kruis = k ? `<aside class="kruis o-${k[0]}" aria-label="Ook handig"><span class="o-ico">${icoon(k[2], 'groot')}</span><div><h3>${esc(k[3])}</h3><p>${esc(k[4])}</p><a class="knop-licht" href="${k[1]}">${esc(k[5])} →</a></div></aside>` : '';
  return partner + kruis;
}

// Uitlegvideo bovenaan de pagina van het onderwerp (scripts/video/uitleg-scenes.js)
const VIDEO_OP = { '/pro/': 'pro', '/zzp-toeslagen/': 'zzp', '/zorgtoeslag-berekenen/': 'zorgtoeslag' };

const sitemap = [];
for (const page of pages) {
  page.versie = versie;
  const S = teksten(page.taal).site;
  const home = page.slug === teksten(page.taal).home;
  const body = page.body({ config, bronnen: page.bronnen ? bronnenHtml() : '' });
  const html = `
<div class="hero">
<div class="hero-deco" aria-hidden="true"><span class="munt"></span><span class="munt"></span><span class="munt"></span><span class="munt"></span></div>
<div class="hero-grid"><div>
${page.calc ? `<span class="bijgewerkt">${S.bijgewerkt(params.JAAR)}</span>` : ''}
<h1>${home ? esc(page.h1).replace(S.accent, `<span class="accent">${S.accent}</span>`) : esc(page.h1)}</h1>
<p class="intro">${esc(page.intro)}</p>
${page.calc ? `<ul class="vertrouwen" aria-label="${S.vertrouwenLabel}">
${S.vertrouwen(params.JAAR).map((v) => `<li>${v}</li>`).join('')}
</ul>` : ''}
${home ? `<p class="hero-knoppen"><a class="knop groot" href="#check">${S.startCheck}</a></p>
<nav class="snel" aria-label="${S.snelLabel}"><span>${S.snelKies}</span> ${S.snel.map(([u, n]) => `<a href="${u}">${n}</a>`).join(' ')}</nav>` : ''}
<button type="button" class="voorlees" hidden aria-pressed="false" data-stop="${S.stopLezen}">${S.leesVoor}</button>
</div>
${home ? '<div class="hero-buddy" data-intro></div>' : ''}
</div>
</div>
<div class="raster">
<div class="inhoud">
${home ? snelcheckHtml(page.taal) : ''}
${page.calc ? `<section class="rekenkaart" id="${page.anker || 'rekenhulp'}" aria-label="${S.rekenhulp}">\n<noscript><p class="geen-js">${S.geenJs}</p></noscript>\n${forms[page.calc](page.taal)}\n</section>` : ''}
${home && page.taal === 'nl' ? onderdelenHtml() : ''}
${advertentie('slotInhoud', page)}
${VIDEO_OP[page.slug] ? uitlegVideo(VIDEO_OP[page.slug]) : ''}
${body}
${verdienHtml(page, body)}
${faqHtml(page.faq, S)}
${page.taal === 'nl' ? nieuwsbrief(page) : ''}
${advertentie('slotOnder', page)}
</div>
${zijbalk(page.slug, S)}
</div>`;
  const dir = join(DIST, page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), layout(page, html));
  if (!page.noindex) sitemap.push(page);
}

// DealBuddy (/deals/): eigen pagina's, data uit data/deals/
const deals = bouwDeals({ dist: DIST, versie, layout });
for (const p of deals.paginas) if (!p.noindex) sitemap.push({ ...p, taal: 'nl' });

// Familie (/familie/): pagina's, rekenhulpen en de regelkamer
const familie = bouwFamilie({ dist: DIST, versie, layout });
for (const p of familie.paginas) if (!p.noindex) sitemap.push({ ...p, taal: 'nl' });

// 404-pagina
writeFileSync(
  join(DIST, '404.html'),
  layout(
    { slug: '/404.html', title: 'Pagina niet gevonden', description: 'Deze pagina bestaat niet.', h1: 'Pagina niet gevonden', versie, noindex: true },
    `<div class="hero"><h1>Deze pagina bestaat niet (meer)</h1><p class="intro">Geen zorgen, je toeslagen kun je gewoon berekenen.</p>
<p><a class="knop" href="/">Naar de toeslagen-check</a></p>
<p lang="en">Page not found. <a href="/en/">Go to the English allowances check</a>.</p></div>`,
  ),
);

// Sitemap en robots
const vandaag = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemap
  .map((p) => {
    const s = p.slug;
    const prioriteit = s === '/' || s === '/en/' ? '1.0' : s.includes('berekenen') || (p.taal !== 'nl' && p.calc) || s === '/familie/' || s === '/deals/' || s.startsWith('/familie/rekenhulp/') ? '0.9' : '0.6';
    // Bij een vertaling: beide talen plus x-default (Nederlands)
    const alt = p.hreflang
      ? [...Object.entries(p.hreflang), ['x-default', p.hreflang.nl]].map(([t, u]) => `<xhtml:link rel="alternate" hreflang="${t}" href="${config.url}${u}"/>`).join('')
      : '';
    return `<url><loc>${config.url}${s}</loc>${alt}<lastmod>${vandaag}</lastmod><priority>${prioriteit}</priority></url>`;
  })
  .join('\n')}
</urlset>
`,
);
writeFileSync(join(DIST, 'robots.txt'), robotsTxt(config));
// llms.txt: wegwijzer voor AI-zoekmachines; IndexNow-sleutel; vingerafdruk per pagina
writeFileSync(join(DIST, 'llms.txt'), llmsTxt(config, sitemap, { gecontroleerd: params.GECONTROLEERD_OP }));
if (sleutelGeldig(config.vindbaar?.indexnowSleutel)) writeFileSync(join(DIST, `${config.vindbaar.indexnowSleutel}.txt`), config.vindbaar.indexnowSleutel);
writeFileSync(
  join(DIST, 'inhoud.json'),
  JSON.stringify({ paginas: Object.fromEntries(sitemap.map((p) => [p.slug, vingerafdruk(readFileSync(join(DIST, p.slug, 'index.html'), 'utf8'))])) }),
);

// Eigen RSS-feed met het nieuws
{
  const x = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  writeFileSync(
    join(DIST, 'nieuws/feed.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>ToeslagBuddy – nieuws over toeslagen</title><link>${config.url}/nieuws/</link><description>Dagelijks nieuws over toeslagen en inkomen</description><language>nl</language>
${nieuws.items.map((i) => `<item><title>${x(i.titel)}</title><link>${x(i.link)}</link>${i.datum ? `<pubDate>${new Date(i.datum).toUTCString()}</pubDate>` : ''}<description>${x(i.samenvatting || '')}</description><guid>${x(i.link)}</guid></item>`).join('\n')}
</channel></rss>
`,
  );
}

// ads.txt (verplicht voor AdSense-inkomsten)
if (config.adsense.client) {
  writeFileSync(join(DIST, 'ads.txt'), `google.com, ${config.adsense.client.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
}

// CNAME voor GitHub Pages (eigen domein)
writeFileSync(join(DIST, 'CNAME'), `${new URL(config.url).host}\n`);

// .htaccess voor Apache (TransIP webhosting)
const host = new URL(config.url).host;
writeFileSync(
  join(DIST, '.htaccess'),
  `# Gegenereerd door build.js – niet met de hand aanpassen
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html

RewriteEngine On
# Altijd https en altijd ${host}
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} !^${host.replace(/\./g, '\\.')}$ [NC]
RewriteRule ^(.*)$ https://${host}/$1 [R=301,L]

# Map-URLs altijd met slash aan het eind
RewriteCond %{REQUEST_FILENAME} -d
RewriteCond %{REQUEST_URI} !/$
RewriteRule ^(.*)$ https://${host}/$1/ [R=301,L]

<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "geolocation=(), camera=(), microphone=()"
  Header always set X-Frame-Options "SAMEORIGIN"
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript application/json image/svg+xml application/xml text/plain application/manifest+json
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 1 hour"
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

AddType application/manifest+json .webmanifest
AddType text/javascript .js
`,
);

console.log(`✓ ${pages.length} pagina's gebouwd in dist/ (versie ${versie}), plus ${deals.paginas.length} DealBuddy-pagina's met ${deals.aantal} deals en ${familie.paginas.length} Familie-pagina's (${familie.regels} regels, ${familie.gidsen} gidsen)`);

// security.txt (RFC 9116) moet een geldige 'Expires' hebben
{
  const bestand = join(DIST, '.well-known/security.txt');
  const verloopt = existsSync(bestand) && readFileSync(bestand, 'utf8').match(/^Expires:\s*(\S+)/m);
  if (!verloopt) console.warn('⚠ WAARSCHUWING: dist/.well-known/security.txt ontbreekt of heeft geen Expires.');
  else if (new Date(verloopt[1]) - Date.now() < 30 * 864e5) console.warn(`⚠ WAARSCHUWING: security.txt verloopt op ${verloopt[1]}. Zet 'Expires' in public/.well-known/security.txt een jaar vooruit.`);
}

// Bedrijfsgegevens zijn wettelijk verplicht op de site (art. 3:15d BW)
{
  const b = config.bedrijf || {};
  const mist = [['kvk', 'KvK-nummer'], ['btwId', 'btw-id'], ['vestigingsplaats', 'vestigingsplaats'], ['naam', 'naam']].filter(([k]) => !b[k]).map(([, n]) => n);
  if (!b.kvk) console.warn(`⚠ WAARSCHUWING: bedrijfsgegevens niet compleet in site.config.js → bedrijf (ontbreekt: ${mist.join(', ')}). Verplicht vóór livegang (art. 3:15d BW).`);
  else if (mist.length) console.warn(`⚠ WAARSCHUWING: in site.config.js → bedrijf ontbreekt nog: ${mist.join(', ')}.`);
}

function minifyCss(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}
