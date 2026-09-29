// Tweetaligheid: volledige vertaling, Engelse rekenteksten en persona-scripts,
// en (na `npm run build`) geldige hreflang-paren en een tweetalige sitemap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import nl from '../src/i18n/nl.js';
import en from '../src/i18n/en.js';
import { teksten, paginaTaal } from '../src/i18n/i18n.js';
import { zorgtoeslag, huurtoeslag, kindgebondenBudget, kinderopvangtoeslag, kinderbijslag, allesCheck, euro } from '../src/calc/toeslagen.js';
import { valideerVeld, valideer, GRENZEN } from '../src/calc/validatie.js';
import { maakScript, voorSpraak, personas, PERSONAS } from '../src/calc/uitleg.js';
import { forms } from '../src/site/forms.js';
import { zorgtoeslagTabel, kgbGrensTabel } from '../src/site/tabellen.js';
import { koppel } from '../src/site/talen.js';
import { pages } from '../src/site/pages.js';
import { pagesEn } from '../src/site/pages-en.js';

// Soort van een waarde: object, array, functie (met aantal parameters) of tekst
const soort = (v) => (Array.isArray(v) ? 'array' : typeof v === 'function' ? `functie/${v.length}` : v === null ? 'null' : typeof v);

function vergelijk(a, b, pad, fouten) {
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = pad ? `${pad}.${k}` : k;
    if (!(k in a)) fouten.push(`${p} ontbreekt in nl`);
    else if (!(k in b)) fouten.push(`${p} ontbreekt in en`);
    else if (soort(a[k]) !== soort(b[k])) fouten.push(`${p}: ${soort(a[k])} in nl, ${soort(b[k])} in en`);
    else if (soort(a[k]) === 'object') vergelijk(a[k], b[k], p, fouten);
    else if (soort(a[k]) === 'string' && b[k] === '' && a[k] !== '') fouten.push(`${p} is leeg in en`);
  }
}

test('i18n: elke sleutel in nl bestaat in en en andersom, met hetzelfde soort waarde', () => {
  const fouten = [];
  vergelijk(nl, en, '', fouten);
  assert.deepEqual(fouten, []);
});

test('i18n: vaste lijsten hebben dezelfde lengte en dezelfde sleutels per rij', () => {
  assert.equal(en.uitleg.intro.length, nl.uitleg.intro.length);
  for (const [kop, links] of en.site.footer) assert.ok(kop && links.length, kop);
  for (const k of Object.keys(nl.app.tips)) assert.equal(en.app.tips[k].length, 3, k);
  for (const k of Object.keys(nl.app.namen)) assert.match(en.app.namen[k][1], /^\/en\//, k);
  for (const k of Object.keys(GRENZEN)) assert.ok(en.validatie.velden[k], k);
});

test('i18n: teksten() valt terug op Nederlands, paginaTaal() buiten de browser is nl', () => {
  assert.equal(teksten('en'), en);
  assert.equal(teksten('fr'), nl);
  assert.equal(teksten(), nl);
  assert.equal(paginaTaal(), 'nl');
});

test('rekenmotor: redenen in het Engels met taal: "en", Nederlands als standaard', () => {
  assert.equal(zorgtoeslag({ inkomen: 1e6 }).reden, 'Je inkomen is te hoog voor deze toeslag.');
  assert.equal(zorgtoeslag({ inkomen: 1e6, taal: 'en' }).reden, 'Your income is too high for this allowance.');
  assert.equal(zorgtoeslag({ inkomen: 0, leeftijd: 17, taal: 'en' }).reden, 'You must be 18 or older for healthcare allowance.');
  assert.equal(zorgtoeslag({ inkomen: 0, vermogen: 500000, taal: 'en' }).reden, 'Your assets are above the limit of €146,011.');
  assert.equal(zorgtoeslag({ inkomen: 0, vermogen: 500000 }).reden, `Je vermogen is hoger dan de grens van ${euro(146011)}.`);
  assert.equal(huurtoeslag({ kaleHuur: 0, inkomen: 0, taal: 'en' }).reden, 'Enter your basic rent.');
  assert.equal(huurtoeslag({ kaleHuur: 600, inkomen: 0, zelfstandig: false, taal: 'en' }).reden, en.calc.huurZelfstandig);
  assert.equal(huurtoeslag({ kaleHuur: 600, inkomen: 0, vermogen: 1e6, taal: 'en' }).reden, 'The assets of your household are above €38,479.');
  assert.equal(kindgebondenBudget({ inkomen: 0, kinderen: [], taal: 'en' }).reden, en.calc.kgbKinderen);
  assert.equal(kinderopvangtoeslag({ inkomen: 0, kinderen: [], taal: 'en' }).reden, en.calc.kotLeeg);
  assert.equal(kinderbijslag({ kinderen: [], taal: 'en' }).reden, en.calc.kbKinderen);
  // De complete check geeft de taal door aan elke toeslag
  const r = allesCheck({ inkomen: 1e6, huurt: true, kaleHuur: 700, kinderen: [4], taal: 'en' });
  assert.equal(r.zorgtoeslag.reden, en.calc.inkomenTeHoog);
  assert.equal(r.huurtoeslag.reden, en.calc.inkomenTeHoog);
  // Bedragen blijven gelijk, alleen de tekst verschilt
  assert.equal(allesCheck({ inkomen: 22000, taal: 'en' }).totaalPerJaar, allesCheck({ inkomen: 22000 }).totaalPerJaar);
});

test('euro(): Nederlandse en Engelse notatie', () => {
  assert.equal(euro(1532, 0, 'en'), '€1,532');
  assert.equal(euro(202.52, 2, 'en'), '€202.52');
  assert.equal(euro(1532).replace(/\s/g, ' '), '€ 1.532');
});

test('invoercontrole: meldingen in het Engels', () => {
  assert.equal(valideerVeld('inkomen', 'abc', 'en'), 'The income is not a number. Use digits only, for example 25000.');
  assert.equal(valideerVeld('kaleHuur', '-5', 'en'), 'The monthly rent cannot be negative. Enter 0 or more.');
  assert.equal(valideerVeld('inkomen', '1e12', 'en'), 'The income is too high. The maximum is 10,000,000. Check that you did not type too many zeros.');
  assert.equal(valideerVeld('leeftijd', '30,5', 'en'), 'The age must be a whole number, without decimals.');
  assert.equal(valideerVeld('inkomen', '1e12'), 'Het inkomen is te hoog. Het maximum is 10.000.000. Controleer of je niet te veel nullen hebt getypt.');
  assert.equal(valideer([['inkomen', 'x'], ['leeftijd', '40']], 'en')[0].melding, en.validatie.geenGetal('The income'));
  // Engelse schrijfwijze met komma's als duizendtal wordt goed gelezen
  assert.equal(valideerVeld('inkomen', '25,000', 'en'), null);
});

const NL_WOORDEN = /\b(je|jij|jouw|ongeveer|per maand|per jaar|waarschijnlijk|niet|Goed nieuws|Zorgtoeslag|Huurtoeslag|Kinderbijslag|aanvragen|Bel gratis)\b/;

test('persona-scripts in het Engels: complete check, geen recht en Nederlandse standaard', () => {
  const d = { leeftijd: 20, inkomen: 9000, huurt: true, kaleHuur: 520, kinderen: [], taal: 'en' };
  const { persona, regels } = maakScript('alles', d, allesCheck(d), undefined, { taal: 'en' });
  assert.equal(persona.id, 'sanne');
  const tekst = regels.join(' ');
  assert.match(tekst, /Hi, I’m Sanne/);
  assert.match(tekst, /Healthcare allowance: about €129 per month/);
  assert.match(tekst, /Rent allowance: about €295 per month/);
  assert.match(tekst, /student finance/);
  assert.match(tekst, /toeslagen\.nl/);
  assert.doesNotMatch(tekst, NL_WOORDEN);
  const z = maakScript('zorgtoeslag', { inkomen: 60000 }, zorgtoeslag({ inkomen: 60000, taal: 'en' }), undefined, { taal: 'en' });
  assert.match(z.regels.join(' '), /You are probably not entitled to healthcare allowance\. Your income is too high/);
  for (const calc of ['huurtoeslag', 'kinderopvangtoeslag', 'kinderbijslag', 'kindgebondenBudget', 'toetsingsinkomen']) {
    const invoer = { kaleHuur: 700, inkomen: 20000, kinderen: [3], taal: 'en' };
    const uitkomst = { huurtoeslag, kindgebondenBudget, kinderbijslag, toetsingsinkomen: () => ({}), kinderopvangtoeslag: (i) => kinderopvangtoeslag({ ...i, kinderen: [{ soort: 'bso', uren: 60, uurprijs: 9 }] }) }[calc](invoer);
    const s = maakScript(calc, invoer, uitkomst, undefined, { taal: 'en' }).regels.join(' ');
    assert.doesNotMatch(s, NL_WOORDEN, calc);
  }
  // Nederlands blijft ongewijzigd de standaard
  assert.match(maakScript('zorgtoeslag', { inkomen: 20000 }, zorgtoeslag({ inkomen: 20000 })).regels.join(' '), /Goed nieuws: je krijgt waarschijnlijk ongeveer €\s129 per maand aan zorgtoeslag\./);
});

test('persona’s: elke persona heeft Engelse rol, intro en tip; Ilse noemt het bedrag in Engelse notatie', () => {
  const p = personas('en');
  assert.deepEqual(Object.keys(p), Object.keys(PERSONAS));
  for (const x of Object.values(p)) {
    assert.ok(x.rol && x.intro && x.tip, x.id);
    assert.doesNotMatch(`${x.intro} ${x.tip}`, NL_WOORDEN, x.id);
    assert.deepEqual(x.uiterlijk, PERSONAS[x.id].uiterlijk);
  }
  assert.match(p.ilse.tip, /€3,320/);
  assert.equal(PERSONAS.ilse.tip, `Mijn tip: als alleenstaande ouder krijg je tot ${euro(3320)} per jaar extra kindgebonden budget. En kinderalimentatie telt niet mee als inkomen.`);
});

test('voorlezen in het Engels: bedragen, toeslagen.nl en het telefoonnummer', () => {
  assert.equal(voorSpraak('€1,532 per month', 'en'), '1532 euros per month');
  assert.equal(voorSpraak('€202.52', 'en'), '202 euros 52');
  assert.equal(voorSpraak('€129.00', 'en'), '129 euros');
  assert.equal(voorSpraak('Apply on toeslagen.nl or call 0800 0543.', 'en'), 'Apply on toeslagen dot n l or call 0 800, 0 5 4 3.');
  assert.equal(voorSpraak('€ 1.532 per maand'), '1532 euro per maand');
});

test('formulieren en tabellen: Engelse teksten, geen Nederlandse labels', () => {
  const html = forms.alles('en');
  assert.match(html, /Your situation/);
  assert.match(html, /Calculate all my allowances/);
  assert.match(html, /href="\/en\/#allowance-partner"/);
  assert.doesNotMatch(html, /Jouw situatie|Toetsingsinkomen per jaar|>Ja<|>Nee</);
  assert.match(forms.alles(), /Jouw situatie/);
  assert.match(forms.zorgtoeslag('en'), /Calculate healthcare allowance/);
  assert.match(zorgtoeslagTabel('en'), /<th scope="col">With allowance partner<\/th>/);
  assert.match(zorgtoeslagTabel('en'), /€129/);
  assert.match(kgbGrensTabel('en'), /1 child \(under 12\)/);
  assert.match(zorgtoeslagTabel(), /Met toeslagpartner/);
});

test('talen: elke Engelse pagina heeft een bestaande Nederlandse tegenhanger; paren zijn wederzijds', () => {
  const alle = koppel([...pages.map((p) => ({ ...p })), ...pagesEn.map((p) => ({ ...p }))]);
  const perSlug = new Map(alle.map((p) => [p.slug, p]));
  for (const p of alle.filter((x) => x.taal === 'en')) {
    assert.ok(p.slug.startsWith('/en/'), p.slug);
    assert.ok(perSlug.has(p.nl), `${p.slug} → ${p.nl} bestaat niet`);
    if (p.hreflang) assert.equal(perSlug.get(p.nl).hreflang.en, p.slug);
  }
  assert.equal(perSlug.get('/zorgtoeslag-berekenen/').wissel, '/en/healthcare-allowance/');
  assert.equal(perSlug.get('/toeslagen-student/').wissel, '/en/#in-dutch');
  assert.equal(perSlug.get('/pro/app/').wissel, '/en/pro/');
  assert.equal(perSlug.get('/pro/voorwaarden/').hreflang, undefined); // samenvatting, geen vertaling
  for (const slug of ['/en/', '/en/healthcare-allowance/', '/en/rent-allowance/', '/en/child-budget/', '/en/childcare-allowance/', '/en/child-benefit/', '/en/repaying-allowances/', '/en/privacy/', '/en/contact/', '/en/pro/', '/en/terms/']) {
    assert.ok(perSlug.has(slug), slug);
  }
});

// ── Na de build ──
const DIST = join(import.meta.dirname, '../dist');
const html = [];
function zoek(map) {
  for (const f of readdirSync(map)) {
    const p = join(map, f);
    if (statSync(p).isDirectory()) zoek(p);
    else if (f.endsWith('.html')) html.push(p);
  }
}
if (existsSync(DIST)) zoek(DIST);
const skip = !html.length && 'eerst npm run build';
const URL_BASIS = 'https://www.toeslagbuddy.nl';
const slugVan = (f) => f.replace(DIST, '').replace(/index\.html$/, '');

test('build: taal, hreflang-paren wederzijds, x-default = Nederlands, canonical per taal', { skip }, () => {
  const alt = new Map();
  for (const f of html) {
    const inhoud = readFileSync(f, 'utf8');
    const slug = slugVan(f);
    if (slug.startsWith('/social/')) continue; // intern contentoverzicht (noindex), geen sitepagina
    const lang = inhoud.match(/<html lang="(\w+)">/)[1];
    assert.equal(lang, slug.startsWith('/en/') ? 'en' : 'nl', slug);
    if (!slug.endsWith('.html')) assert.match(inhoud, new RegExp(`<link rel="canonical" href="${URL_BASIS}${slug}">`), slug);
    assert.match(inhoud, /<a class="taalwissel" href="\/[^"]*" hreflang="(en|nl)" lang="(en|nl)">/, slug);
    assert.match(inhoud, new RegExp(`og:locale" content="${lang === 'en' ? 'en_GB' : 'nl_NL'}"`), slug);
    alt.set(slug, Object.fromEntries([...inhoud.matchAll(/<link rel="alternate" hreflang="([\w-]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2].replace(URL_BASIS, '')])));
  }
  let paren = 0;
  for (const [slug, h] of alt) {
    if (!Object.keys(h).length) continue;
    paren++;
    assert.deepEqual(Object.keys(h).sort(), ['en', 'nl', 'x-default'], slug);
    assert.equal(h['x-default'], h.nl, slug);
    assert.ok([h.nl, h.en].includes(slug), `${slug} verwijst naar zichzelf`);
    for (const doel of [h.nl, h.en]) assert.deepEqual(alt.get(doel), h, `${slug} ↔ ${doel}`);
  }
  assert.ok(paren >= 20, `${paren} pagina's met hreflang`);
  // Engelse JSON-LD
  const home = readFileSync(join(DIST, 'en/index.html'), 'utf8');
  assert.match(home, /"inLanguage":"en"/);
  assert.match(home, /"operatingSystem":"Any"/);
});

test('build: sitemap met Engelse pagina’s en xhtml:link-alternatieven', { skip }, () => {
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(xml, /<url><loc>https:\/\/www\.toeslagbuddy\.nl\/en\/healthcare-allowance\/<\/loc><xhtml:link rel="alternate" hreflang="nl" href="https:\/\/www\.toeslagbuddy\.nl\/zorgtoeslag-berekenen\/"\/><xhtml:link rel="alternate" hreflang="en" href="https:\/\/www\.toeslagbuddy\.nl\/en\/healthcare-allowance\/"\/><xhtml:link rel="alternate" hreflang="x-default"/);
  for (const slug of pagesEn.map((p) => p.slug)) assert.ok(xml.includes(`<loc>${URL_BASIS}${slug}</loc>`), slug);
});

test('build: Engelse pagina’s bevatten geen Nederlandse kop- en voetteksten', { skip }, () => {
  for (const f of html.filter((x) => slugVan(x).startsWith('/en/'))) {
    const inhoud = readFileSync(f, 'utf8');
    for (const nlTekst of ['Naar de inhoud', 'Hulp nodig?', 'Rekenhulpen</h2>', 'Veelgestelde vragen', 'Meer rekenhulpen', 'onafhankelijke rekenhulp', 'Lees voor', 'handelend onder']) {
      assert.ok(!inhoud.includes(nlTekst), `${slugVan(f)}: ${nlTekst}`);
    }
  }
});
