// Bouwt de complete statische site in dist/. Uploaden naar TransIP kan
// daarna met `npm run deploy` of via de GitHub Action.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './site.config.js';
import * as params from './src/calc/params.js';
import { pages } from './src/site/pages.js';
import { forms } from './src/site/forms.js';
import { layout, advertentie, nieuwsbrief, esc } from './src/site/layout.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'js'), { recursive: true });
mkdirSync(join(DIST, 'css'), { recursive: true });

// Statische bestanden (favicon, og-afbeelding, manifest)
if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), DIST, { recursive: true });

// Versie voor cache-busting: hash van alle code en parameters
const css = readFileSync(join(ROOT, 'src/site/styles.css'), 'utf8');
// Alle browser-scripts: rekenmotor (src/calc) en pagina-scripts (public/js)
const js = {};
for (const map of ['src/calc', 'public/js']) {
  for (const f of readdirSync(join(ROOT, map)).filter((f) => f.endsWith('.js'))) js[f] = readFileSync(join(ROOT, map, f), 'utf8');
}
const versie = createHash('sha1').update(css + Object.values(js).join('')).digest('hex').slice(0, 8);

writeFileSync(join(DIST, 'css/site.css'), minifyCss(css));
for (const [naam, code] of Object.entries(js)) {
  const metVersie = code.replace(/from '\.\/([\w-]+)\.js'/g, `from './$1.js?v=${versie}'`);
  writeFileSync(join(DIST, 'js', naam), metVersie);
}

const zijbalk = (slug) => {
  const links = [
    ['/', 'Alle toeslagen in één check'],
    ['/zorgtoeslag-berekenen/', 'Zorgtoeslag berekenen'],
    ['/huurtoeslag-berekenen/', 'Huurtoeslag berekenen'],
    ['/kindgebonden-budget-berekenen/', 'Kindgebonden budget berekenen'],
    ['/kinderopvangtoeslag-berekenen/', 'Kinderopvangtoeslag berekenen'],
    ['/kinderbijslag-berekenen/', 'Kinderbijslag berekenen'],
    ['/toetsingsinkomen/', 'Toetsingsinkomen berekenen'],
  ].filter(([u]) => u !== slug);
  return `<aside class="zij">
<div class="blok"><h2>Meer rekenhulpen</h2><ul>${links.map(([u, n]) => `<li><a href="${u}">${n}</a></li>`).join('')}</ul></div>
<div class="blok"><h2>Bijgewerkt voor ${params.JAAR}</h2><p>Met de officiële bedragen en rekenregels. <a href="/bronnen/">Bekijk bronnen</a></p></div>
<div class="blok"><h2>Nieuw: toeslagen ${params.JAAR + 1}</h2><p>Wat verandert er volgend jaar? <a href="/toeslagen-2027/">Lees het overzicht</a></p></div>
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

function faqHtml(faq) {
  if (!faq || !faq.length) return '';
  return `<section class="faq"><h2>Veelgestelde vragen</h2>${faq
    .map(([q, a]) => `<details><summary>${esc(q)}</summary><div><p>${a}</p></div></details>`)
    .join('')}</section>`;
}

const sitemap = [];
for (const page of pages) {
  page.versie = versie;
  const body = page.body({ config, bronnen: page.bronnen ? bronnenHtml() : '' });
  const html = `
<div class="hero">
${page.calc ? `<span class="bijgewerkt">✓ Bijgewerkt voor ${params.JAAR}</span>` : ''}
<h1>${esc(page.h1)}</h1>
<p class="intro">${esc(page.intro)}</p>
</div>
<div class="raster">
<div class="inhoud">
${page.calc ? `<section class="rekenkaart" id="${page.anker || 'rekenhulp'}" aria-label="Rekenhulp">\n${forms[page.calc]()}\n</section>` : ''}
${advertentie('slotInhoud')}
${body}
${faqHtml(page.faq)}
${nieuwsbrief()}
${advertentie('slotOnder')}
</div>
${zijbalk(page.slug)}
</div>`;
  const dir = join(DIST, page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), layout(page, html));
  if (!page.noindex) sitemap.push(page.slug);
}

// 404-pagina
writeFileSync(
  join(DIST, '404.html'),
  layout(
    { slug: '/404.html', title: 'Pagina niet gevonden', description: 'Deze pagina bestaat niet.', h1: 'Pagina niet gevonden', versie },
    `<div class="hero"><h1>Deze pagina bestaat niet (meer)</h1><p class="intro">Geen zorgen, je toeslagen kun je gewoon berekenen.</p>
<p><a class="knop" href="/">Naar de toeslagen-check</a></p></div>`,
  ).replace('<head>', '<head>\n<meta name="robots" content="noindex">'),
);

// Sitemap en robots
const vandaag = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((s) => `<url><loc>${config.url}${s}</loc><lastmod>${vandaag}</lastmod><priority>${s === '/' ? '1.0' : s.includes('berekenen') ? '0.9' : '0.6'}</priority></url>`).join('\n')}
</urlset>
`,
);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${config.url}/sitemap.xml\n`);

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

function minifyCss(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}
