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
import { layout, advertentie, nieuwsbrief, esc } from './src/site/layout.js';
import { teksten } from './src/i18n/i18n.js';

// Alle pagina's, Nederlands en Engels, met hreflang-paren en taalschakelaar
const pages = koppel([...pagesNl, ...pagesEn]);

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'js'), { recursive: true });
mkdirSync(join(DIST, 'css'), { recursive: true });

// Statische bestanden (favicon, og-afbeelding, manifest)
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });

// Versie voor cache-busting: hash van alle code en parameters
const css = readFileSync(join(ROOT, 'src/site/styles.css'), 'utf8');
// Alle browser-scripts: rekenmotor (src/calc), teksten (src/i18n) en
// pagina-scripts (public/js). Ze komen plat in /js/, dus namen moeten uniek zijn.
const js = {};
for (const map of ['src/calc', 'src/i18n', 'public/js']) {
  for (const f of readdirSync(join(ROOT, map)).filter((f) => f.endsWith('.js'))) {
    if (js[f]) throw new Error(`Dubbele scriptnaam ${f} in ${map}: /js/ is plat`);
    js[f] = readFileSync(join(ROOT, map, f), 'utf8');
  }
}
const versie = createHash('sha1').update(css + Object.values(js).join('')).digest('hex').slice(0, 8);

writeFileSync(join(DIST, 'css/site.css'), minifyCss(css));
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
${page.calc ? `<section class="rekenkaart" id="${page.anker || 'rekenhulp'}" aria-label="${S.rekenhulp}">\n<noscript><p class="geen-js">${S.geenJs}</p></noscript>\n${forms[page.calc](page.taal)}\n</section>` : ''}
${advertentie('slotInhoud', page)}
${body}
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
    const prioriteit = s === '/' || s === '/en/' ? '1.0' : s.includes('berekenen') || (p.taal !== 'nl' && p.calc) ? '0.9' : '0.6';
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
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${config.url}/sitemap.xml\n`);

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

console.log(`✓ ${pages.length} pagina's gebouwd in dist/ (versie ${versie})`);

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
