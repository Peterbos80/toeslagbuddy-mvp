// Gesimuleerde gebruikerstest met persona's. Per persona voert een browser de
// toptaken uit zoals die persoon dat zou doen (zijn apparaat, schermbreedte,
// tekstgrootte) en meet wat ertoe doet: lukt de taak, hoeveel handelingen,
// hoe lang, hoe leesbaar is de tekst (Flesch-Douma, B1 ≈ 60+), zijn knoppen
// groot genoeg (≥ 44 px op een telefoon, ≥ 24 px met muis), blijft alles in beeld bij grote tekst, en hoe
// zwaar is de pagina. Geen echte mensen: dit vervangt een echte test niet,
// maar vangt de meeste drempels vroeg op.
//
//   node build.js && CHROMIUM_PATH=… node scripts/persona-test.js [--uit docs/onderzoek/persona-test.md]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { start } from '../test/e2e/helpers.js';

// ── Leesbaarheid (Nederlands) ──
export function lettergrepen(woord) {
  const w = woord.toLowerCase().replace(/[^a-zàâäéèêëïîôöüûç]/g, '').replace(/ij/g, 'i');
  const n = (w.match(/[aeiouyàâäéèêëïîôöüû]+/g) || []).length;
  return Math.max(1, n);
}
export function fleschDouma(tekst) {
  const zinnen = tekst.split(/[.!?]+(?:\s|$)/).map((z) => z.trim()).filter((z) => z.split(/\s+/).length >= 2);
  const woorden = tekst.split(/\s+/).map((w) => w.replace(/[^\p{L}-]/gu, '')).filter((w) => /\p{L}/u.test(w));
  if (zinnen.length < 2 || woorden.length < 30) return null;
  const lg = woorden.reduce((s, w) => s + lettergrepen(w), 0);
  return Math.round(206.835 - 0.93 * (woorden.length / zinnen.length) - 77 * (lg / woorden.length));
}
export const niveau = (fd) => (fd === null ? 'n.v.t.' : fd >= 70 ? 'B1 of makkelijker' : fd >= 60 ? 'B1' : fd >= 50 ? 'B2' : 'moeilijk');

// ── Metingen op een pagina ──
async function meet(p) {
  return p.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const zichtbaar = (e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    // Tekst voor leesbaarheid: lopende tekst in de inhoud
    const tekst = [...main.querySelectorAll('p, li')].filter(zichtbaar).filter((e) => !e.closest('nav, footer, form, .kaart-lijst, table')).map((e) => e.innerText.trim()).filter((t) => t.length > 40).join(' ');
    const groottes = [...main.querySelectorAll('p, li, label')].filter(zichtbaar).map((e) => parseFloat(getComputedStyle(e).fontSize));
    // Doelen om op te tikken: knoppen, formulierelementen en losse links (niet in lopende tekst)
    const doelen = [...document.querySelectorAll('button, a.knop, a.knop-licht, input:not([type=hidden]), select, summary, nav a, [role=button]')].filter(zichtbaar);
    const klein = doelen.filter((e) => {
      const r = e.getBoundingClientRect();
      if (e.matches('input[type=radio], input[type=checkbox]')) return false; // het label is het doel
      // Aanraakscherm: 44 px (WCAG 2.5.5); muis: 24 px (WCAG 2.5.8)
      const min = innerWidth <= 900 ? 44 : 24;
      return r.height < min || r.width < min;
    }).map((e) => `${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className).split(' ')[0] : ''} "${(e.innerText || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
    const bytes = performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) + (performance.getEntriesByType('navigation')[0]?.encodedBodySize || 0);
    return {
      tekst,
      kleinsteTekst: groottes.length ? Math.min(...groottes) : null,
      kleineDoelen: klein,
      breedte: document.documentElement.scrollWidth,
      viewport: innerWidth,
      kb: Math.round(bytes / 1024),
    };
  });
}

// ── Persona's en hun toptaken ──
// stappen: lijst van [omschrijving, async (p) => …]; elke stap telt als één handeling.
export const PERSONAS = [
  {
    naam: 'Henk (71, AOW, slecht zicht, telefoon met grote tekst)',
    apparaat: { viewport: { width: 320, height: 640 }, tekstgrootte: 1.5 },
    taken: [
      {
        doel: 'Weten of hij zorgtoeslag krijgt en hoeveel',
        start: '/',
        stappen: [
          ['Menu openen', (p) => p.click('.menu-knop')],
          ['Naar zorgtoeslag', (p) => p.locator('#hoofdmenu a:visible', { hasText: /zorgtoeslag/i }).first().click()],
          ['Inkomen invullen', (p) => p.locator('form[data-calc] [name=inkomen]').fill('19000')],
          ['Berekenen', (p) => p.locator('form[data-calc] button[type=submit]').click()],
        ],
        gelukt: async (p) => /€\s?\d+ per maand/.test(await p.locator('[data-result]').innerText()),
      },
    ],
  },
  {
    naam: 'Ilse (36, alleenstaande moeder, weinig tijd, telefoon)',
    apparaat: { viewport: { width: 390, height: 844 } },
    taken: [
      {
        doel: 'In één keer al haar toeslagen zien',
        start: '/',
        stappen: [
          ['Leeftijd', (p) => p.locator('form[data-calc=alles] [name=leeftijd]').fill('36')],
          ['Volgende', (p) => p.locator('form[data-calc=alles] [data-volgende]').click()],
          ['Inkomen', (p) => p.locator('form[data-calc=alles] [name=inkomen]').fill('26000')],
          ['Volgende', (p) => p.locator('form[data-calc=alles] [data-volgende]').click()],
          ['Huur', (p) => p.locator('form[data-calc=alles] [name=kaleHuur]').fill('700')],
          ['Volgende', (p) => p.locator('form[data-calc=alles] [data-volgende]').click()],
          ['Kinderen', (p) => p.locator('form[data-calc=alles] [name=aantalKinderen]').fill('2')],
          ['Leeftijd kind 1', (p) => p.locator('form[data-calc=alles] select[name=kind1]').selectOption('4')],
          ['Leeftijd kind 2', (p) => p.locator('form[data-calc=alles] select[name=kind2]').selectOption('9')],
          ['Bekijk uitkomst', (p) => p.locator('form[data-calc=alles] button[type=submit]').click()],
        ],
        gelukt: async (p) => /Kindgebonden budget/.test(await p.locator('[data-result]').first().innerText()),
      },
    ],
  },
  {
    naam: 'Sanne (21, student, telefoon)',
    apparaat: { viewport: { width: 390, height: 844 } },
    taken: [
      {
        doel: 'Huurtoeslag voor haar studio uitrekenen',
        start: '/toeslagen-student/',
        stappen: [
          ['Naar huurtoeslag', (p) => p.locator('main a[href="/huurtoeslag-berekenen/"]').first().click()],
          ['Huur', (p) => p.locator('form[data-calc] [name=kaleHuur]').fill('520')],
          ['Inkomen', (p) => p.locator('form[data-calc] [name=inkomen]').fill('14000')],
          ['Berekenen', (p) => p.locator('form[data-calc] button[type=submit]').click()],
        ],
        gelukt: async (p) => /per maand|geen huurtoeslag/i.test(await p.locator('[data-result]').innerText()),
      },
    ],
  },
  {
    naam: 'Karin (54, mantelzorger voor haar moeder, laptop)',
    apparaat: { viewport: { width: 1280, height: 800 } },
    taken: [
      {
        doel: 'Weten wat het verpleeghuis haar moeder gaat kosten',
        start: '/',
        stappen: [
          ['Naar Familie', (p) => p.click('header.site nav >> text=Familie')],
          ['Naar rekenhulp verpleeghuis', (p) => p.locator('main a[href="/familie/rekenhulp/verpleeghuis/"]:visible').first().click()],
          ['Inkomen moeder', (p) => p.locator('[name=verzamelinkomen]').fill('24000')],
          ['Berekenen', (p) => p.locator('[data-rekenhulp] button[type=submit]').click()],
        ],
        gelukt: async (p) => /per maand/.test(await p.locator('[data-uitkomst]').innerText()),
      },
      {
        doel: 'Na het overlijden van haar vader weten wat eerst moet',
        start: '/familie/',
        stappen: [['Naar de checklist', (p) => p.locator('main a[href="/familie/checklist/na-overlijden/"]:visible').first().click()]],
        gelukt: async (p) => (await p.locator('input[data-stap]').count()) >= 10,
      },
    ],
  },
  {
    naam: 'Dani (29, zzp, wisselend inkomen, laptop)',
    apparaat: { viewport: { width: 1280, height: 800 } },
    taken: [
      {
        doel: 'Zien of zijn toeslagvoorschot nog klopt',
        start: '/',
        stappen: [
          ['Naar Zzp', (p) => p.click('header.site nav >> text=Zzp')],
          ['Winst tot nu toe', (p) => p.locator('form[data-calc=zzp] [name=winstTotNu]').fill('31200')],
          ['Maand', (p) => p.locator('form[data-calc=zzp] select[name=maand]').selectOption('10')],
          ['Volgende', (p) => p.locator('form[data-calc=zzp] [data-volgende]').click()],
          ['Opgegeven inkomen', (p) => p.locator('form[data-calc=zzp] [name=opgegevenInkomen]').fill('30000')],
          ['Volgende', (p) => p.locator('form[data-calc=zzp] [data-volgende]').click()],
          ['Huur', (p) => p.locator('form[data-calc=zzp] [name=kaleHuur]').fill('800')],
          ['Berekenen', (p) => p.locator('form[data-calc=zzp] button[type=submit]').click()],
        ],
        gelukt: async (p) => (await p.locator('[data-result]').innerText()).length > 40,
      },
    ],
  },
  {
    naam: 'Mo (34, vader, wil geen nepkorting, telefoon)',
    apparaat: { viewport: { width: 390, height: 844 } },
    taken: [
      {
        doel: 'Zien of een koptelefoon nu echt goedkoper is',
        start: '/',
        stappen: [
          ['Menu openen', (p) => p.click('.menu-knop')],
          ['Naar Besparen', (p) => p.locator('#hoofdmenu a:visible', { hasText: 'Besparen' }).first().click()],
          ['Zoeken', (p) => p.locator('#deals-zoek').fill('koptelefoon')],
        ],
        gelukt: async (p) => (await p.locator('.deal-kaart:visible').count()) >= 1,
      },
    ],
  },
  {
    naam: 'Fatima (45, bewindvoerder, 60 cliënten, laptop)',
    apparaat: { viewport: { width: 1440, height: 900 } },
    taken: [
      {
        doel: 'De demo van de bulkcheck bekijken',
        start: '/',
        stappen: [
          ['Naar Professionals', (p) => p.click('header.site nav >> text=Professionals')],
          ['Bekijk de demo', (p) => p.locator('main a[href="/pro/check/"]:visible').first().click()],
        ],
        gelukt: async (p) => p.url().includes('/pro/check/'),
      },
    ],
  },
];

async function voerUit(browser, basis, persona) {
  const { viewport, tekstgrootte = 1 } = persona.apparaat;
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce', bypassCSP: true });
  if (tekstgrootte !== 1) await ctx.addInitScript((f) => document.addEventListener('DOMContentLoaded', () => (document.documentElement.style.fontSize = `${f * 100}%`)), tekstgrootte);
  const uit = [];
  for (const taak of persona.taken) {
    const p = await ctx.newPage();
    const fouten = [];
    p.on('pageerror', (e) => fouten.push(e.message));
    const t0 = Date.now();
    await p.goto(basis + taak.start);
    const paginas = new Map();
    const noteer = async () => {
      const pad = new URL(p.url()).pathname;
      if (!paginas.has(pad)) paginas.set(pad, await meet(p));
    };
    await noteer();
    let mislukt = null;
    let handelingen = 0;
    for (const [naam, actie] of taak.stappen) {
      try {
        await actie(p);
        handelingen++;
        await p.waitForLoadState('domcontentloaded');
        await p.waitForTimeout(150);
        await noteer();
      } catch (e) {
        mislukt = `vastgelopen bij "${naam}": ${e.message.split('\n')[0].slice(0, 140)}`;
        break;
      }
    }
    let gelukt = false;
    if (!mislukt) {
      try {
        gelukt = await taak.gelukt(p);
        if (!gelukt) mislukt = 'geen uitkomst gevonden';
      } catch (e) {
        mislukt = `uitkomst niet te lezen: ${e.message.split('\n')[0].slice(0, 120)}`;
      }
    }
    uit.push({ doel: taak.doel, gelukt, mislukt, handelingen, seconden: Math.round((Date.now() - t0) / 100) / 10, fouten, paginas: Object.fromEntries([...paginas].map(([k, v]) => [k, { ...v, leesbaarheid: fleschDouma(v.tekst), tekst: undefined }])) });
    await p.close();
  }
  await ctx.close();
  return uit;
}

export function rapport(resultaten, datum) {
  const r = [`# Persona-test ${datum}`, '', 'Gesimuleerde gebruikerstest (browser, geen echte mensen). Per taak: gelukt, aantal handelingen, en de drempels op de pagina’s onderweg.', ''];
  r.push('| Persona | Taak | Gelukt | Handelingen | Tijd |', '|---|---|---|---|---|');
  for (const { persona, taken } of resultaten) for (const t of taken) r.push(`| ${persona} | ${t.doel} | ${t.gelukt ? 'ja' : `**nee** (${t.mislukt})`} | ${t.handelingen} | ${t.seconden} s |`);
  r.push('', '## Drempels per pagina', '');
  const gezien = new Set();
  for (const { persona, taken } of resultaten) {
    for (const t of taken) {
      for (const [pad, m] of Object.entries(t.paginas)) {
        const sleutel = `${pad}@${m.viewport}`;
        if (gezien.has(sleutel)) continue;
        gezien.add(sleutel);
        const punten = [];
        if (m.breedte > m.viewport) punten.push(`horizontaal scrollen (${m.breedte} px op ${m.viewport} px)`);
        if (m.kleinsteTekst !== null && m.kleinsteTekst < 15) punten.push(`kleinste tekst ${m.kleinsteTekst} px`);
        if (m.leesbaarheid !== null && m.leesbaarheid < 60) punten.push(`leesbaarheid ${m.leesbaarheid} (${niveau(m.leesbaarheid)})`);
        if (m.kleineDoelen.length) punten.push(`${m.kleineDoelen.length} kleine tikdoelen, o.a. ${m.kleineDoelen.slice(0, 3).join('; ')}`);
        if (m.kb > 900) punten.push(`zwaar: ${m.kb} kB`);
        r.push(`- **${pad}** (${m.viewport} px, ${persona.split(' (')[0]}): ${punten.length ? punten.join(' · ') : 'geen drempels gevonden'} · leesbaarheid ${m.leesbaarheid ?? 'n.v.t.'} · ${m.kb} kB`);
      }
      if (t.fouten.length) r.push(`  - JavaScript-fouten: ${t.fouten.join('; ')}`);
    }
  }
  return r.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--uit');
  const datum = new Date().toISOString().slice(0, 10);
  const uitPad = i > -1 ? process.argv[i + 1] : `docs/onderzoek/persona-test-${datum}.md`;
  const s = await start();
  const resultaten = [];
  try {
    for (const persona of PERSONAS) resultaten.push({ persona: persona.naam, taken: await voerUit(s.browser, s.basis, persona) });
  } finally {
    await s.stop();
  }
  mkdirSync(dirname(uitPad), { recursive: true });
  writeFileSync(uitPad, rapport(resultaten, datum));
  writeFileSync(uitPad.replace(/\.md$/, '.json'), JSON.stringify(resultaten, null, 1));
  const n = resultaten.flatMap((x) => x.taken);
  console.log(`${n.filter((t) => t.gelukt).length}/${n.length} taken gelukt → ${uitPad}`);
}
