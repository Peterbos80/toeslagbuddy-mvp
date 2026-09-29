import {
  zorgtoeslag,
  huurtoeslag,
  kindgebondenBudget,
  kinderopvangtoeslag,
  kinderbijslag,
  allesCheck,
  euro as euroTaal,
} from './toeslagen.js';
import { JAAR, KINDEROPVANGTOESLAG } from './params.js';
import { zzpCheck, herinneringIcs } from './zzp.js';
import { uitlegBijResultaat } from './persona.js';
import { CONFIG } from './config.js';
import { valideer } from './validatie.js';
import { teksten, paginaTaal } from './i18n.js';

// Taal uit <html lang>; alle teksten van de uitkomst komen uit src/i18n (app)
const TAAL = paginaTaal();
const T = teksten(TAAL).app;
const euro = (n, d = 0) => euroTaal(n, d, TAAL);
// Partnerlinks zijn Nederlandse aanbieders: alleen op Nederlandse pagina's
const PARTNERS = TAAL === 'nl' ? CONFIG.partners || {} : {};

const getal = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/\s|€/g, '');
  // "25.000" en "25000,50" en "25,000" allemaal goed lezen
  const schoon = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,](?=\d{3}(\D|$))/g, '');
  const n = Number(schoon);
  return Number.isFinite(n) ? n : 0;
};

function lees(form) {
  const fd = new FormData(form);
  const d = {};
  for (const [k, v] of fd.entries()) {
    if (k in d) d[k] = [].concat(d[k], v);
    else d[k] = v;
  }
  const ja = (k) => d[k] === 'ja';
  const kinderen = [...form.querySelectorAll('[data-kids-lijst] select')].map((s) => Number(s.value));
  const opvang = [...form.querySelectorAll('[data-opvang-rij]')].map((r) => ({
    soort: r.querySelector('select').value,
    uren: getal(r.querySelector('[name=uren]').value),
    uurprijs: getal(r.querySelector('[name=uurprijs]').value),
  }));
  return {
    taal: TAAL,
    partner: ja('partner'),
    inkomen: getal(d.inkomen),
    vermogen: getal(d.vermogen),
    kaleHuur: getal(d.kaleHuur),
    personen: getal(d.personen) || 1,
    volwassenen: getal(d.volwassenen) || 1,
    leeftijd: d.leeftijd ? getal(d.leeftijd) : undefined,
    aow: ja('aow'),
    aangepasteWoning: ja('aangepasteWoning'),
    huurt: ja('huurt'),
    medebewoners: getal(d.medebewoners),
    inkomenMedebewoners: getal(d.inkomenMedebewoners),
    uitkering: ja('uitkering'),
    langdurigLaag: ja('langdurigLaag'),
    gebruiktOpvang: ja('gebruiktOpvang'),
    brutoMaand: getal(d.brutoMaand),
    dertiendeMaand: ja('dertiendeMaand'),
    overig: getal(d.overig),
    aftrek: getal(d.aftrek),
    winstTotNu: getal(d.winstTotNu),
    maand: getal(d.maand),
    verwachteJaarwinst: getal(d.verwachteJaarwinst),
    urencriterium: ja('urencriterium'),
    ander: getal(d.ander),
    partnerInkomen: getal(d.partnerInkomen),
    opgegevenInkomen: getal(d.opgegevenInkomen),
    kinderen,
    opvang,
  };
}

const TIPS = T.tips;
const NAMEN = T.namen;

const PARTNER_BIJ = {
  zorgtoeslag: ['zorgverzekering'],
  huurtoeslag: ['energie', 'internet'],
  kindgebondenBudget: ['belastinghulp'],
  kinderopvangtoeslag: ['kinderopvang'],
  kinderbijslag: ['belastinghulp'],
  alles: ['zorgverzekering', 'energie'],
  toetsingsinkomen: ['belastinghulp'],
  zzp: ['belastinghulp'],
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function partnerBlokken(calc) {
  return (PARTNER_BIJ[calc] || [])
    .map((k) => PARTNERS[k])
    .filter(Boolean)
    .map(
      (p) => `<aside class="partner"><p class="partner-label">Partnerlink</p><h4>${esc(p.titel)}</h4><p>${esc(p.tekst)}</p>
<a class="knop-licht" href="${esc(p.url)}" rel="sponsored nofollow noopener" target="_blank">${esc(p.knop)} →</a></aside>`,
    )
    .join('');
}

function deelBlok() {
  const url = location.origin + location.pathname;
  const tekst = T.deelTekst(url);
  return `<div class="delen"><p>${T.deelKop}</p>
<a class="knop-licht" href="https://wa.me/?text=${encodeURIComponent(tekst)}" target="_blank" rel="noopener">${T.deelWhatsapp}</a>
<button type="button" class="knop-licht" data-kopieer="${esc(url)}">${T.kopieer}</button></div>`;
}

function kaart(naam, r, extra = '') {
  if (!r) return '';
  if (!r.recht) {
    return `<div class="resultaat geen"><h3>${naam}</h3><p class="bedrag">${T.nul}</p><p>${esc(r.reden || '')}</p>${extra}</div>`;
  }
  return `<div class="resultaat"><h3>${naam}</h3>
<p class="bedrag"><span data-telop="${r.perMaand}" data-dec="${Number.isInteger(r.perMaand) ? 0 : 2}">${euro(r.perMaand, Number.isInteger(r.perMaand) ? 0 : 2)}</span> <small>${T.perMaand}</small></p>
<p class="subtiel">${T.perJaarIndicatie(euro(r.perJaar), JAAR)}</p>${extra}</div>`;
}

// Geanimeerde balken: welk deel van het totaal komt uit welke toeslag
function balken(r) {
  const delen = Object.entries(NAMEN)
    .filter(([k]) => r[k] && r[k].recht)
    .map(([k, [naam]]) => [naam, r[k].perJaar, k]);
  const max = Math.max(...delen.map((x) => x[1]), 1);
  if (!delen.length) return '';
  return `<ul class="balken" aria-hidden="true">${delen
    .map(([naam, jaar, k]) => `<li class="balk-${k}"><span>${naam}</span><b style="--w:${Math.max(6, Math.round((jaar / max) * 100))}%"></b></li>`)
    .join('')}</ul>`;
}

// Bedragen laten oplopen (niet bij 'minder beweging')
function telOp(root) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-telop]').forEach((el) => {
    const doel = Number(el.dataset.telop);
    const dec = Number(el.dataset.dec) || 0;
    const start = performance.now();
    const stap = (t) => {
      const f = Math.min(1, (t - start) / 900);
      const e = 1 - Math.pow(1 - f, 3);
      el.textContent = euro(doel * e, dec);
      if (f < 1) requestAnimationFrame(stap);
      else el.textContent = euro(doel, dec);
    };
    requestAnimationFrame(stap);
  });
}

// Ruwe uitkomst per rekenhulp, voor de persoonlijke uitleg
const RUW = {
  zorgtoeslag: (d) => zorgtoeslag(d),
  huurtoeslag: (d) => huurtoeslag(d),
  kindgebondenBudget: (d) => kindgebondenBudget(d),
  kinderopvangtoeslag: (d) => kinderopvangtoeslag({ inkomen: d.inkomen, kinderen: d.opvang, taal: TAAL }),
  kinderbijslag: (d) => kinderbijslag(d),
  alles: (d) => allesCheck({ ...d, opvang: d.gebruiktOpvang ? d.opvang : [] }),
  zzp: (d) => zzpCheck(d),
  toetsingsinkomen: () => ({}),
};

const aanvragen = T.aanvragen;

const reken = {
  zorgtoeslag(d) {
    const r = zorgtoeslag(d);
    return kaart(NAMEN.zorgtoeslag[0], r, r.recht ? aanvragen : '');
  },
  huurtoeslag(d) {
    const r = huurtoeslag(d);
    let extra = '';
    if (r.recht) {
      extra = `<ul class="uitleg"><li>${T.rekenhuur}: ${euro(r.rekenhuur, 2)}${r.huurBovenGrens ? T.bovenGrens : ''}</li>
<li>${T.basishuur}: ${euro(r.basishuur, 2)}</li>
<li>${T.maxHuur}: ${euro(r.maximaalPerMaand, 2)}</li>
<li>${T.minderInkomen}: ${euro(r.verminderingPerMaand, 2)}</li></ul>${aanvragen}`;
    }
    return kaart(NAMEN.huurtoeslag[0], r, extra);
  },
  kindgebondenBudget(d) {
    const r = kindgebondenBudget(d);
    const extra = r.recht
      ? `<p class="subtiel">${T.kgbUitleg(euro(r.maximum), euro(r.vermindering))}</p>`
      : '';
    return kaart(NAMEN.kindgebondenBudget[0], r, extra);
  },
  kinderopvangtoeslag(d) {
    const r = kinderopvangtoeslag({ inkomen: d.inkomen, kinderen: d.opvang, taal: TAAL });
    let extra = '';
    if (r.recht) {
      extra = `<ul class="uitleg">${r.perKind
        .map(
          (k, i) =>
            `<li>${T.kotRegel(i + 1, T.soortNaam[k.soort], Math.round(k.percentage * 1000) / 10, euro(k.vergoedbaar, 2), k.uren, euro(k.toeslagPerMaand, 2))}${k.uurprijs > k.vergoedbaar ? T.kotBoven(euro(KINDEROPVANGTOESLAG.maxUurprijs[k.soort], 2)) : ''}</li>`,
        )
        .join('')}</ul><p>${T.kotEigen(euro(r.eigenBijdragePerMaand, 2))}</p>${aanvragen}`;
    }
    return kaart(NAMEN.kinderopvangtoeslag[0], r, extra);
  },
  kinderbijslag(d) {
    const r = kinderbijslag(d);
    const extra = r.recht
      ? `<p>${T.kbUitleg(euro(r.perKwartaal, 2))}</p>`
      : '';
    return kaart(NAMEN.kinderbijslag[0], r, extra);
  },
  alles(d) {
    const r = allesCheck({ ...d, opvang: d.gebruiktOpvang ? d.opvang : [] });
    const rijen = Object.entries(NAMEN)
      .filter(([k]) => r[k])
      .map(([k, [naam, url]]) => {
        const x = r[k];
        const bedrag = x.recht ? `${euro(x.perMaand, Number.isInteger(x.perMaand) ? 0 : 2)} ${T.pm}` : '—';
        const reden = x.recht ? '' : `<small>${esc(x.reden || '')}</small>`;
        return `<tr class="${x.recht ? 'ja' : 'nee'}"><th scope="row"><a href="${url}">${naam}</a>${reden}</th><td>${bedrag}</td></tr>`;
      })
      .join('');
    const tips = r.tips
      .map((t) => TIPS[t])
      .filter(Boolean)
      .map(([titel, tekst, url]) => `<li><a href="${url}"${T.tipsTaal ? ` hreflang="${T.tipsTaal}"` : ''}><strong>${titel}</strong></a>${T.tipsNoot} – ${tekst}</li>`)
      .join('');
    return `<div class="resultaat totaal">
<h3>${T.jouwToeslagen(JAAR)}</h3>
<p class="bedrag"><span data-telop="${r.totaalPerMaand}" data-dec="0">${euro(r.totaalPerMaand)}</span> <small>${T.perMaand}</small></p>
<p class="subtiel">${T.ongeveerJaar(euro(r.totaalPerJaar))}</p>
${balken(r)}
<table class="overzicht"><tbody>${rijen}</tbody></table>
${r.totaalPerJaar > 0 ? aanvragen : ''}
</div>
${tips ? `<div class="resultaat tips"><h3>${T.ookKrijgen}</h3><ul>${tips}</ul></div>` : ''}`;
  },
  // De toeslagbewaker is (nog) alleen Nederlands; deze teksten staan daarom niet in src/i18n
  zzp(d) {
    const r = zzpCheck(d);
    // Het dashboard (zzp-dashboard.js) luistert mee om deze maand te kunnen bewaren
    setTimeout(() => document.dispatchEvent(new CustomEvent('tb:zzp-resultaat', { detail: { invoer: d, uitkomst: r } })), 0);
    const NAAM = { zorgtoeslag: 'Zorgtoeslag', huurtoeslag: 'Huurtoeslag', kindgebondenBudget: 'Kindgebonden budget' };
    const kop = {
      terugbetalen: ['Let op: je gaat waarschijnlijk terugbetalen', `Ongeveer ${euro(-r.verschilJaar)} over dit jaar, als je niets aanpast.`, 'geen'],
      bijkrijgen: ['Je krijgt waarschijnlijk te weinig', `Ongeveer ${euro(r.verschilJaar)} extra over dit jaar als je je inkomen verlaagt.`, ''],
      goed: ['Je voorschot klopt ongeveer', 'Het verschil is kleiner dan € 50 per jaar. Check het volgende maand opnieuw.', ''],
    }[r.status];
    const rijen = r.regelingen
      .map((x) => `<tr><th scope="row">${NAAM[x.regeling]}</th><td>${euro(x.voorschotJaar)}</td><td>${euro(x.verwachtJaar)}</td><td>${x.verschilJaar > 0 ? '+' : ''}${euro(x.verschilJaar)}</td></tr>`)
      .join('');
    return `<div class="resultaat ${kop[2]}"><h3>${kop[0]}</h3><p>${kop[1]}</p>
<ul class="uitleg"><li>Verwachte jaarwinst: ${euro(r.jaarwinst)}</li>
<li>Na ondernemersaftrek en mkb-winstvrijstelling: ${euro(r.belastbareWinst)}</li>
<li>Verwacht toetsingsinkomen${d.partner ? ' (met partner)' : ''}: <strong>${euro(r.verwachtInkomen)}</strong> – opgegeven: ${euro(d.opgegevenInkomen)}</li></ul>
<div class="tabel-scroll"><table class="overzicht"><thead><tr><th></th><th>Voorschot/jaar</th><th>Verwacht recht</th><th>Verschil</th></tr></thead><tbody>${rijen}</tbody></table></div>
${r.status === 'goed' ? '' : `<p><strong>Advies:</strong> geef in <a href="https://www.toeslagen.nl" target="_blank" rel="noopener">Mijn toeslagen</a> een inkomen van <strong>${euro(r.adviesInkomen)}</strong> op (je schatting plus 5% marge).</p>`}
<p><button type="button" class="knop-licht" data-ics>📅 Zet een maandelijkse herinnering in mijn agenda</button></p>
<p class="subtiel">Automatisch vanuit je boekhouding? <a href="/zzp-toeslagen/#wachtlijst">Zet je op de wachtlijst</a>.</p></div>`;
  },
  toetsingsinkomen(d) {
    const jaarloon = d.brutoMaand * 12 * 1.08 + (d.dertiendeMaand ? d.brutoMaand : 0);
    const totaal = Math.max(0, jaarloon + d.overig - d.aftrek);
    return `<div class="resultaat"><h3>${T.toetsKop}</h3>
<p class="bedrag">${euro(totaal)} <small>${T.perJaar}</small></p>
<p class="subtiel">${T.toetsUitleg(d)}</p>
<p><a class="knop" href="${teksten(TAAL).home}#check" data-inkomen="${Math.round(totaal)}">${T.toetsKnop}</a></p></div>`;
  },
};

// ── Invoercontrole (R7) ──────────────────────────────────────────────
// Velden die meedoen: getallen die zichtbaar zijn (een verborgen stap telt wel,
// een blok dat bij 'nee' verborgen is niet).
let foutTeller = 0;
function controleerVelden(root) {
  const velden = [...root.querySelectorAll('input[name]:not([type=radio]):not([type=checkbox])')].filter(
    (el) => !el.closest('[data-toon-bij][hidden], [data-toon-bij-kinderen][hidden]'),
  );
  return valideer(velden.map((el) => [el.name, el.value]), TAAL).map((f) => ({ ...f, el: velden[f.index] }));
}

function wisFouten(root) {
  root.querySelectorAll('.veld-fout').forEach((p) => p.remove());
  root.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid');
    const rest = (el.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && !x.endsWith('-fout'));
    if (rest.length) el.setAttribute('aria-describedby', rest.join(' '));
    else el.removeAttribute('aria-describedby');
  });
}

function toonFouten(fouten) {
  for (const { el, melding } of fouten) {
    if (!el.id) el.id = `veld-${++foutTeller}`;
    const p = document.createElement('p');
    p.className = 'veld-fout';
    p.id = `${el.id}-fout`;
    p.textContent = melding;
    (el.closest('.opvang-rij') || el.closest('.veld') || el.parentElement).append(p);
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', [el.getAttribute('aria-describedby'), p.id].filter(Boolean).join(' '));
  }
}

// Geeft false als de invoer niet klopt (dan staat er een melding in plaats van een uitkomst)
function render(form, { focus = false } = {}) {
  const calc = form.dataset.calc;
  const uit = form.nextElementSibling;
  wisFouten(form);
  const fouten = controleerVelden(form);
  if (fouten.length) {
    toonFouten(fouten);
    uit.innerHTML = `<div class="melding invoerfout"><p>${T.controleer}</p><ul>${fouten.map((f) => `<li>${esc(f.melding)}</li>`).join('')}</ul></div>`;
    if (focus) {
      const stap = fouten[0].el.closest('.stap');
      if (stap && stap.hidden && form.tbToonStap) form.tbToonStap(stap);
      fouten[0].el.focus();
    }
    return false;
  }
  const d = lees(form);
  const inkomenVeld = form.querySelector('[name=inkomen]');
  if (inkomenVeld && !inkomenVeld.value.trim()) {
    uit.innerHTML = `<p class="melding">${T.vulInkomen}</p>`;
    return false;
  }
  uit.innerHTML = reken[calc](d) + partnerBlokken(calc) + (calc === 'toetsingsinkomen' ? '' : deelBlok());
  // Persoonlijke uitleg door een persona, direct onder de eerste uitkomst
  const eerste = uit.querySelector('.resultaat');
  if (eerste && RUW[calc]) {
    const blok = document.createElement('div');
    blok.className = 'uitleg-blok';
    blok.dataset.uitleg = '';
    eerste.after(blok);
    uitlegBijResultaat(blok, calc, d, RUW[calc](d), TAAL);
  }
  telOp(uit);
  track('Berekening', { calc });
  return true;
}

function kidsWidget(root) {
  const aantal = root.querySelector('[name=aantalKinderen]');
  const lijst = root.querySelector('[data-kids-lijst]');
  const opties = Array.from({ length: 18 }, (_, i) => `<option value="${i}">${i === 0 ? T.jongerDan1 : T.jaarOud(i)}</option>`).join('');
  const bijwerken = () => {
    const n = Math.max(0, Math.min(12, Number(aantal.value) || 0));
    while (lijst.children.length < n) {
      const k = lijst.children.length + 1;
      const div = document.createElement('div');
      div.className = 'kind';
      div.innerHTML = `<label>${T.leeftijdKind(k)}<select name="kind${k}">${opties}</select></label>`;
      lijst.appendChild(div);
    }
    while (lijst.children.length > n) lijst.lastElementChild.remove();
    const form = root.closest('form');
    const blok = form.querySelector('[data-toon-bij-kinderen]');
    if (blok) blok.hidden = n === 0;
  };
  aantal.addEventListener('input', bijwerken);
  bijwerken();
}

function opvangWidget(root) {
  const lijst = root.querySelector('[data-opvang-lijst]');
  const max = KINDEROPVANGTOESLAG.maxUurprijs;
  const rij = () => {
    const div = document.createElement('div');
    div.className = 'opvang-rij';
    div.dataset.opvangRij = '';
    const o = T.opvangOpties;
    div.innerHTML = `<label>${T.soortOpvang}<select name="soort">
<option value="dagopvang">${o.dagopvang} (${T.maxPrijs(euro(max.dagopvang, 2))})</option>
<option value="bso">${o.bso} (${T.maxPrijs(euro(max.bso, 2))})</option>
<option value="gastouder">${o.gastouder} (${T.maxPrijs(euro(max.gastouder, 2))})</option></select></label>
<label>${T.urenPerMaand}<input name="uren" inputmode="numeric" placeholder="80"></label>
<label>${T.uurprijs}<input name="uurprijs" inputmode="decimal" placeholder="${T.phUurprijs}"></label>
<button type="button" class="weg" aria-label="${T.verwijderKind}">×</button>`;
    div.querySelector('.weg').addEventListener('click', () => div.remove());
    lijst.appendChild(div);
  };
  root.querySelector('[data-opvang-erbij]').addEventListener('click', rij);
  rij();
}

function toonBij(form) {
  form.querySelectorAll('[data-toon-bij]').forEach((blok) => {
    const naam = blok.dataset.toonBij;
    const update = () => {
      const gekozen = form.querySelector(`[name=${naam}]:checked`);
      blok.hidden = !gekozen || gekozen.value !== 'ja';
    };
    form.querySelectorAll(`[name=${naam}]`).forEach((el) => el.addEventListener('change', update));
    update();
  });
}

function track(naam, props) {
  try {
    if (window.plausible) window.plausible(naam, { props });
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: `event-${props.calc}`, title: naam, event: true });
  } catch (e) {
    /* statistieken mogen nooit de rekenhulp breken */
  }
}

// Stappenplan: toon één stap tegelijk (eenvoudiger voor wie moeite heeft met lange formulieren)
function stappenplan(form) {
  const stappen = [...form.querySelectorAll('.stap')];
  if (stappen.length < 2) return;
  const verzend = form.querySelector('button[type=submit]');
  const voortgang = document.createElement('div');
  voortgang.className = 'voortgang';
  voortgang.innerHTML = '<p class="voortgang-tekst" aria-live="polite"></p><div class="balk" aria-hidden="true"><i></i></div>';
  form.prepend(voortgang);
  const knoppen = document.createElement('div');
  knoppen.className = 'stap-knoppen';
  knoppen.innerHTML = `<button type="button" class="knop-licht" data-vorige>${T.vorige}</button><button type="button" class="knop" data-volgende>${T.volgende}</button>`;
  verzend.before(knoppen);
  knoppen.appendChild(verzend);
  let huidig = 0;
  const toon = (i, focus) => {
    huidig = i;
    stappen.forEach((st, k) => (st.hidden = k !== i));
    const laatste = i === stappen.length - 1;
    knoppen.querySelector('[data-vorige]').hidden = i === 0;
    knoppen.querySelector('[data-volgende]').hidden = laatste;
    verzend.hidden = !laatste;
    voortgang.querySelector('.voortgang-tekst').textContent = T.stapVan(i + 1, stappen.length);
    voortgang.querySelector('i').style.width = `${((i + 1) / stappen.length) * 100}%`;
    if (focus) {
      const kop = stappen[i].querySelector('h3');
      kop.tabIndex = -1;
      kop.focus();
    }
  };
  knoppen.querySelector('[data-vorige]').addEventListener('click', () => toon(Math.max(0, huidig - 1), true));
  knoppen.querySelector('[data-volgende]').addEventListener('click', () => {
    const leeg = [...stappen[huidig].querySelectorAll('input[required]')].find((el) => !el.value.trim());
    const oud = stappen[huidig].querySelector('.melding');
    if (oud) oud.remove();
    if (leeg) {
      const m = document.createElement('p');
      m.className = 'melding';
      m.textContent = T.vulVeld;
      leeg.closest('.veld').after(m);
      leeg.focus();
      return;
    }
    wisFouten(stappen[huidig]);
    const fouten = controleerVelden(stappen[huidig]);
    if (fouten.length) {
      toonFouten(fouten);
      fouten[0].el.focus();
      return;
    }
    toon(Math.min(stappen.length - 1, huidig + 1), true);
  });
  // Voor de invoercontrole: spring naar de stap met de eerste fout
  form.tbToonStap = (stap) => toon(stappen.indexOf(stap), false);
  toon(0, false);
}

document.querySelectorAll('form[data-calc]').forEach((form) => {
  form.querySelectorAll('[data-kids]').forEach(kidsWidget);
  stappenplan(form);
  // Zzp: standaard de laatste volledig verstreken maand selecteren
  const maandKeuze = form.querySelector('select[name=maand]');
  if (maandKeuze) maandKeuze.value = String(Math.max(1, new Date().getMonth()));
  form.querySelectorAll('[data-opvang]').forEach(opvangWidget);
  toonBij(form);
  // Inkomen meenemen vanuit de toetsingsinkomen-hulp
  const vooraf = new URLSearchParams(location.search).get('inkomen');
  const inkomenVeld = form.querySelector('[name=inkomen]');
  if (vooraf && inkomenVeld) inkomenVeld.value = vooraf;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (render(form, { focus: true })) form.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  let t;
  form.addEventListener('input', () => {
    if (!form.nextElementSibling.innerHTML) return; // pas live bijwerken na eerste klik
    clearTimeout(t);
    t = setTimeout(() => render(form), 250);
  });
});

document.addEventListener('click', (e) => {
  const kopieer = e.target.closest('[data-kopieer]');
  if (kopieer) {
    navigator.clipboard?.writeText(kopieer.dataset.kopieer);
    kopieer.textContent = T.gekopieerd;
  }
  if (e.target.closest('[data-ics]')) {
    const url = location.origin + location.pathname;
    const blob = new Blob([herinneringIcs(url)], { type: 'text/calendar' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'toeslagcheck-zzp.ics' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    track('Herinnering', { calc: 'zzp' });
  }
  const naarCheck = e.target.closest('[data-inkomen]');
  if (naarCheck) {
    e.preventDefault();
    location.href = `${teksten(TAAL).home}?inkomen=${naarCheck.dataset.inkomen}#check`;
  }
});
