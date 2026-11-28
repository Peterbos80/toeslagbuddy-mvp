// Deelafbeeldingen (Open Graph): bestandsnaam per pagina, de keuze tussen de
// eigen afbeelding en die van het onderdeel, en de inhoud van de kaart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ogBestandsnaam, ogAfbeelding, heeftEigenOg, sectieAfbeelding, uitHtml, paginaKaart, kortTekst, ontEntiteit, kopGrootte, ogInhoud, OG_EXTENSIE } from '../src/site/og.js';
import { slugsUitSitemap, verwijsNaar } from '../scripts/og-paginas.js';
import { layout, sectieVan } from '../src/site/layout.js';

test('ogBestandsnaam: slug zonder slashes, alleen veilige tekens', () => {
  assert.equal(ogBestandsnaam('/'), `start.${OG_EXTENSIE}`);
  assert.equal(ogBestandsnaam('/zorgtoeslag-berekenen/'), `zorgtoeslag-berekenen.${OG_EXTENSIE}`);
  assert.equal(ogBestandsnaam('/familie/gids/wat-kost-een-verpleeghuis/'), `familie-gids-wat-kost-een-verpleeghuis.${OG_EXTENSIE}`);
  assert.equal(ogBestandsnaam('/familie/rekenhulp/zonnepanelen-2027/', 'png'), 'familie-rekenhulp-zonnepanelen-2027.png');
  assert.equal(ogBestandsnaam('/Cliënt Één/', 'png'), 'client-een.png');
  assert.equal(ogBestandsnaam('/a/../b/', 'png'), 'a-b.png');
  assert.equal(ogBestandsnaam('', 'jpg'), 'start.jpg');
  assert.match(ogBestandsnaam('/<script>/"x"/'), /^[a-z0-9-]+\.\w+$/);
});

test('heeftEigenOg: alleen indexeerbare Nederlandse pagina’s', () => {
  assert.equal(heeftEigenOg({ slug: '/toeslagpartner/', taal: 'nl' }), true);
  assert.equal(heeftEigenOg({ slug: '/deals/vluchten/' }), true);
  assert.equal(heeftEigenOg({ slug: '/en/rent-allowance/', taal: 'en' }), false);
  assert.equal(heeftEigenOg({ slug: '/en/', taal: 'nl' }), false);
  assert.equal(heeftEigenOg({ slug: '/deals/bewijs/x/', noindex: true }), false);
  assert.equal(heeftEigenOg({ slug: '/404.html', noindex: true }), false);
});

test('ogAfbeelding: eigen afbeelding als die bestaat, anders die van het onderdeel', () => {
  const er = new Set([`/og/${ogBestandsnaam('/familie/gids/')}`, `/og/${ogBestandsnaam('/')}`]);
  const bestaat = (p) => er.has(p);
  assert.equal(ogAfbeelding({ slug: '/familie/gids/' }, 'familie', bestaat), `/og/${ogBestandsnaam('/familie/gids/')}`);
  assert.equal(ogAfbeelding({ slug: '/' }, 'toeslagen', bestaat), `/og/${ogBestandsnaam('/')}`);
  // Bestand ontbreekt (script niet gedraaid): terug naar het onderdeel
  assert.equal(ogAfbeelding({ slug: '/familie/prijzen/' }, 'familie', bestaat), '/og-familie.png');
  assert.equal(ogAfbeelding({ slug: '/deals/' }, 'deals'), '/og-besparen.png');
  assert.equal(ogAfbeelding({ slug: '/zzp-toeslagen/' }, 'zzp'), '/og-pro.png');
  assert.equal(ogAfbeelding({ slug: '/nieuws/' }, 'nieuws'), '/og.png');
  // Engels of noindex: nooit de eigen afbeelding, ook al zou die bestaan
  assert.equal(ogAfbeelding({ slug: '/en/', taal: 'en' }, 'toeslagen', () => true), '/og.png');
  assert.equal(ogAfbeelding({ slug: '/beheer/', noindex: true }, 'pro', () => true), '/og-pro.png');
  assert.equal(sectieAfbeelding('onbekend'), '/og.png');
});

test('layout: og:image volgt de keuze en heeft afmetingen', () => {
  const page = { slug: '/bestaat-niet-voor-og-test/', title: 'T', description: 'D', h1: 'Kop', versie: 'x' };
  const html = layout(page, '<p>x</p>');
  assert.match(html, /<meta property="og:image" content="https:\/\/[^"]+\/og\.png">/);
  assert.match(html, /<meta property="og:image:width" content="1200">/);
  assert.match(html, /<meta property="og:image:height" content="630">/);
  const fam = layout({ ...page, slug: '/familie/bestaat-niet/' }, '');
  assert.equal(sectieVan({ slug: '/familie/bestaat-niet/' }), 'familie');
  assert.match(fam, /og:image" content="[^"]+\/og-familie\.png"/);
});

test('uitHtml en paginaKaart: inhoud uit de gebouwde pagina', () => {
  const html = `<html><head><meta name="description" content="Bereken je zorgtoeslag &amp; huurtoeslag. Gratis en anoniem.">
<meta property="og:title" content="Zorgtoeslag"></head><body class="sectie-familie familie-pagina"><h1>Op welke toeslagen heb jij <span class="accent">recht</span> &amp; meer?</h1>
<section class="rekenkaart"></section></body></html>`;
  const i = uitHtml(html);
  assert.deepEqual(i, { kop: 'Op welke toeslagen heb jij recht & meer?', accent: 'recht', beschrijving: 'Bereken je zorgtoeslag & huurtoeslag. Gratis en anoniem.', sectie: 'familie', rekenhulp: true });
  const k = paginaKaart(i, 'toeslagbuddy.nl/familie');
  assert.equal(k.kop, 'Op welke toeslagen heb jij <em>recht</em> &amp; meer?');
  assert.equal(k.kleur, '#c2643a');
  assert.equal(k.label, 'Familie');
  assert.deepEqual(k.punten, ['Gratis rekenhulp']);
  // Kleuren per onderdeel
  for (const [sectie, kleur] of [['toeslagen', '#d9a441'], ['deals', '#b98abd'], ['pro', '#8fb8e0'], ['zzp', '#8fb8e0'], ['nieuws', '#d9a441']]) {
    assert.equal(paginaKaart({ ...i, sectie }, '').kleur, kleur);
  }
  // Geen h1: dan de og:title; HTML in de tekst wordt onschadelijk
  const zonder = uitHtml('<meta property="og:title" content="Alleen &lt;titel&gt;"><body class="sectie-deals">');
  assert.equal(zonder.kop, 'Alleen <titel>');
  assert.equal(paginaKaart(zonder, 'x').kop, 'Alleen &lt;titel&gt;');
  assert.match(ogInhoud(paginaKaart(zonder, 'toeslagbuddy.nl/deals')), /class="adres">toeslagbuddy\.nl\/deals</);
});

test('kortTekst en kopGrootte', () => {
  assert.equal(kortTekst('Kort.'), 'Kort.');
  const lang = 'Eerste zin is best lang en vertelt wat de pagina doet voor je. Tweede zin gaat verder over de details en de uitzonderingen. Derde zin past er niet meer bij want dan wordt het te veel.';
  assert.equal(kortTekst(lang, 130), 'Eerste zin is best lang en vertelt wat de pagina doet voor je. Tweede zin gaat verder over de details en de uitzonderingen.');
  const eenZin = 'woord '.repeat(60).trim();
  const k = kortTekst(eenZin, 100);
  assert.ok(k.length <= 100 && k.endsWith('…'), k);
  assert.equal(ontEntiteit('&euro;&nbsp;5 &#39;x&#x27;'), '€ 5 \'x\'');
  assert.ok(kopGrootte('Kort') > kopGrootte('Een heel lange kop die over meerdere regels gaat en nog verder'));
});

test('og-paginas: sitemap lezen en verwijzing omzetten', () => {
  const xml = '<urlset><url><loc>https://www.toeslagbuddy.nl/</loc><xhtml:link href="https://www.toeslagbuddy.nl/en/"/></url><url><loc>https://www.toeslagbuddy.nl/familie/gids/</loc></url></urlset>';
  assert.deepEqual(slugsUitSitemap(xml), ['/', '/familie/gids/']);
  const html = '<meta property="og:image" content="https://www.toeslagbuddy.nl/og-familie.png">\n<script type="application/ld+json">{"image":"https://www.toeslagbuddy.nl/og-familie.png"}</script>';
  const nieuw = verwijsNaar(html, 'https://www.toeslagbuddy.nl/og/familie-gids.png', { basis: 'https://www.toeslagbuddy.nl' });
  assert.equal(nieuw, '<meta property="og:image" content="https://www.toeslagbuddy.nl/og/familie-gids.png">\n<script type="application/ld+json">{"image":"https://www.toeslagbuddy.nl/og/familie-gids.png"}</script>');
});
