import {
  zorgtoeslag,
  huurtoeslag,
  kindgebondenBudget,
  kinderopvangtoeslag,
  kinderbijslag,
  allesCheck,
  euro,
} from './toeslagen.js';
import { JAAR, KINDEROPVANGTOESLAG } from './params.js';
import { zzpCheck, herinneringIcs } from './zzp.js';
import { uitlegBijResultaat } from './persona.js';

const PARTNERS = window.TB_PARTNERS || {};

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

const TIPS = {
  kwijtschelding: ['Kwijtschelding gemeentelijke belastingen', 'Met een laag inkomen hoef je afvalstoffenheffing, rioolheffing of waterschapsbelasting soms niet te betalen.', '/regelingen-laag-inkomen/#kwijtschelding'],
  'bijzondere-bijstand': ['Bijzondere bijstand', 'Voor noodzakelijke kosten die je zelf niet kunt betalen, zoals een nieuwe wasmachine of eigen risico.', '/regelingen-laag-inkomen/#bijzondere-bijstand'],
  'individuele-inkomenstoeslag': ['Individuele inkomenstoeslag', 'Een jaarlijks bedrag van je gemeente als je al lang een laag inkomen hebt.', '/regelingen-laag-inkomen/#individuele-inkomenstoeslag'],
  kindregelingen: ['Regelingen voor kinderen', 'Leergeld, Jeugdfonds Sport & Cultuur en de gemeentelijke meedoenregeling betalen schoolspullen, sport of een fiets.', '/regelingen-laag-inkomen/#kinderen'],
  toeslagenwet: ['Toeslag op je uitkering (Toeslagenwet)', 'Is je uitkering lager dan het sociaal minimum? Het UWV kan het aanvullen.', '/regelingen-laag-inkomen/#toeslagenwet'],
  'aio-aanvulling': ['AIO-aanvulling', 'Geen volledige AOW en weinig ander inkomen? De SVB kan je inkomen aanvullen.', '/regelingen-laag-inkomen/#aio'],
  'heffingskorting-partner': ['Heffingskorting voor de minstverdienende partner', 'Alleen als die partner vóór 1963 geboren is.', '/regelingen-laag-inkomen/#heffingskorting'],
};

const NAMEN = {
  zorgtoeslag: ['Zorgtoeslag', '/zorgtoeslag-berekenen/'],
  huurtoeslag: ['Huurtoeslag', '/huurtoeslag-berekenen/'],
  kindgebondenBudget: ['Kindgebonden budget', '/kindgebonden-budget-berekenen/'],
  kinderopvangtoeslag: ['Kinderopvangtoeslag', '/kinderopvangtoeslag-berekenen/'],
  kinderbijslag: ['Kinderbijslag', '/kinderbijslag-berekenen/'],
};

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
  const tekst = `Ik heb net gecheckt op welke toeslagen ik recht heb. Doe jij het ook? ${url}`;
  return `<div class="delen"><p><strong>Ken je iemand die dit ook moet weten?</strong> Veel mensen laten geld liggen.</p>
<a class="knop-licht" href="https://wa.me/?text=${encodeURIComponent(tekst)}" target="_blank" rel="noopener">Deel via WhatsApp</a>
<button type="button" class="knop-licht" data-kopieer="${esc(url)}">Kopieer link</button></div>`;
}

function kaart(naam, r, extra = '') {
  if (!r) return '';
  if (!r.recht) {
    return `<div class="resultaat geen"><h3>${naam}</h3><p class="bedrag">€ 0</p><p>${esc(r.reden || '')}</p>${extra}</div>`;
  }
  return `<div class="resultaat"><h3>${naam}</h3>
<p class="bedrag"><span data-telop="${r.perMaand}" data-dec="${Number.isInteger(r.perMaand) ? 0 : 2}">${euro(r.perMaand, Number.isInteger(r.perMaand) ? 0 : 2)}</span> <small>per maand</small></p>
<p class="subtiel">${euro(r.perJaar)} per jaar (indicatie ${JAAR})</p>${extra}</div>`;
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
  kinderopvangtoeslag: (d) => kinderopvangtoeslag({ inkomen: d.inkomen, kinderen: d.opvang }),
  kinderbijslag: (d) => kinderbijslag(d),
  alles: (d) => allesCheck({ ...d, opvang: d.gebruiktOpvang ? d.opvang : [] }),
  zzp: (d) => zzpCheck(d),
  toetsingsinkomen: () => ({}),
};

const aanvragen = `<p class="volgende"><strong>Volgende stap:</strong> vraag aan via <a href="https://www.toeslagen.nl" rel="noopener" target="_blank">Mijn toeslagen</a> met je DigiD. <a href="/toeslagen-aanvragen/">Zo werkt het</a>.</p>`;

const reken = {
  zorgtoeslag(d) {
    const r = zorgtoeslag(d);
    return kaart('Zorgtoeslag', r, r.recht ? aanvragen : '');
  },
  huurtoeslag(d) {
    const r = huurtoeslag(d);
    let extra = '';
    if (r.recht) {
      extra = `<ul class="uitleg"><li>Rekenhuur: ${euro(r.rekenhuur, 2)}${r.huurBovenGrens ? ' (je huur is hoger dan de grens, er wordt tot de grens gerekend)' : ''}</li>
<li>Basishuur (betaal je zelf): ${euro(r.basishuur, 2)}</li>
<li>Maximale huurtoeslag bij jouw huur: ${euro(r.maximaalPerMaand, 2)}</li>
<li>Minder door je inkomen: ${euro(r.verminderingPerMaand, 2)}</li></ul>${aanvragen}`;
    }
    return kaart('Huurtoeslag', r, extra);
  },
  kindgebondenBudget(d) {
    const r = kindgebondenBudget(d);
    const extra = r.recht
      ? `<p class="subtiel">Maximaal ${euro(r.maximum)} per jaar, min ${euro(r.vermindering)} door je inkomen. Je krijgt het automatisch als je kinderbijslag en zorgtoeslag krijgt; anders vraag je het aan.</p>`
      : '';
    return kaart('Kindgebonden budget', r, extra);
  },
  kinderopvangtoeslag(d) {
    const r = kinderopvangtoeslag({ inkomen: d.inkomen, kinderen: d.opvang });
    let extra = '';
    if (r.recht) {
      extra = `<ul class="uitleg">${r.perKind
        .map(
          (k, i) =>
            `<li>Kind ${i + 1} (${k.soort}): ${Math.round(k.percentage * 1000) / 10}% van ${euro(k.vergoedbaar, 2)} × ${k.uren} uur = ${euro(k.toeslagPerMaand, 2)}${k.uurprijs > k.vergoedbaar ? ` <em>(je uurprijs is hoger dan het maximum van ${euro(KINDEROPVANGTOESLAG.maxUurprijs[k.soort], 2)})</em>` : ''}</li>`,
        )
        .join('')}</ul><p>Je betaalt zelf ongeveer <strong>${euro(r.eigenBijdragePerMaand, 2)} per maand</strong>.</p>${aanvragen}`;
    }
    return kaart('Kinderopvangtoeslag', r, extra);
  },
  kinderbijslag(d) {
    const r = kinderbijslag(d);
    const extra = r.recht
      ? `<p>${euro(r.perKwartaal, 2)} per kwartaal. De SVB betaalt kinderbijslag elk kwartaal uit. Aanvragen gaat via <a href="https://www.svb.nl/kinderbijslag" rel="noopener" target="_blank">svb.nl</a>.</p>`
      : '';
    return kaart('Kinderbijslag', r, extra);
  },
  alles(d) {
    const r = allesCheck({ ...d, opvang: d.gebruiktOpvang ? d.opvang : [] });
    const rijen = Object.entries(NAMEN)
      .filter(([k]) => r[k])
      .map(([k, [naam, url]]) => {
        const x = r[k];
        const bedrag = x.recht ? `${euro(x.perMaand, Number.isInteger(x.perMaand) ? 0 : 2)} p/m` : '—';
        const reden = x.recht ? '' : `<small>${esc(x.reden || '')}</small>`;
        return `<tr class="${x.recht ? 'ja' : 'nee'}"><th scope="row"><a href="${url}">${naam}</a>${reden}</th><td>${bedrag}</td></tr>`;
      })
      .join('');
    const tips = r.tips
      .map((t) => TIPS[t])
      .filter(Boolean)
      .map(([titel, tekst, url]) => `<li><a href="${url}"><strong>${titel}</strong></a> – ${tekst}</li>`)
      .join('');
    return `<div class="resultaat totaal">
<h3>Jouw toeslagen in ${JAAR}</h3>
<p class="bedrag"><span data-telop="${r.totaalPerMaand}" data-dec="0">${euro(r.totaalPerMaand)}</span> <small>per maand</small></p>
<p class="subtiel">Dat is ongeveer ${euro(r.totaalPerJaar)} per jaar.</p>
${balken(r)}
<table class="overzicht"><tbody>${rijen}</tbody></table>
${r.totaalPerJaar > 0 ? aanvragen : ''}
</div>
${tips ? `<div class="resultaat tips"><h3>Dit kun je misschien ook krijgen</h3><ul>${tips}</ul></div>` : ''}`;
  },
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
    return `<div class="resultaat"><h3>Je geschatte toetsingsinkomen</h3>
<p class="bedrag">${euro(totaal)} <small>per jaar</small></p>
<p class="subtiel">Bruto maandloon × 12, plus 8% vakantiegeld${d.dertiendeMaand ? ', plus 13e maand' : ''}${d.overig ? ', plus overig inkomen' : ''}${d.aftrek ? ', min aftrekposten' : ''}.</p>
<p><a class="knop" href="/#check" data-inkomen="${Math.round(totaal)}">Gebruik dit in de toeslagen-check →</a></p></div>`;
  },
};

function render(form) {
  const calc = form.dataset.calc;
  const d = lees(form);
  const uit = form.nextElementSibling;
  const inkomenVeld = form.querySelector('[name=inkomen]');
  if (inkomenVeld && !inkomenVeld.value.trim()) {
    uit.innerHTML = '<p class="melding">Vul je inkomen in om te rekenen. Heb je geen inkomen? Vul dan 0 in.</p>';
    return;
  }
  uit.innerHTML = reken[calc](d) + partnerBlokken(calc) + (calc === 'toetsingsinkomen' ? '' : deelBlok());
  // Persoonlijke uitleg door een persona, direct onder de eerste uitkomst
  const eerste = uit.querySelector('.resultaat');
  if (eerste && RUW[calc]) {
    const blok = document.createElement('div');
    blok.className = 'uitleg-blok';
    blok.dataset.uitleg = '';
    eerste.after(blok);
    uitlegBijResultaat(blok, calc, d, RUW[calc](d));
  }
  telOp(uit);
  track('Berekening', { calc });
}

function kidsWidget(root) {
  const aantal = root.querySelector('[name=aantalKinderen]');
  const lijst = root.querySelector('[data-kids-lijst]');
  const opties = Array.from({ length: 18 }, (_, i) => `<option value="${i}">${i === 0 ? 'jonger dan 1 jaar' : `${i} jaar`}</option>`).join('');
  const bijwerken = () => {
    const n = Math.max(0, Math.min(12, Number(aantal.value) || 0));
    while (lijst.children.length < n) {
      const k = lijst.children.length + 1;
      const div = document.createElement('div');
      div.className = 'kind';
      div.innerHTML = `<label>Leeftijd kind ${k}<select name="kind${k}">${opties}</select></label>`;
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
    div.innerHTML = `<label>Soort opvang<select name="soort">
<option value="dagopvang">Dagopvang / kinderdagverblijf (max. ${euro(max.dagopvang, 2)})</option>
<option value="bso">Buitenschoolse opvang (max. ${euro(max.bso, 2)})</option>
<option value="gastouder">Gastouder (max. ${euro(max.gastouder, 2)})</option></select></label>
<label>Uren per maand<input name="uren" inputmode="numeric" placeholder="80"></label>
<label>Uurprijs<input name="uurprijs" inputmode="decimal" placeholder="10,50"></label>
<button type="button" class="weg" aria-label="Verwijder dit kind">×</button>`;
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
  knoppen.innerHTML = '<button type="button" class="knop-licht" data-vorige>← Vorige</button><button type="button" class="knop" data-volgende>Volgende →</button>';
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
    voortgang.querySelector('.voortgang-tekst').textContent = `Stap ${i + 1} van ${stappen.length}`;
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
      m.textContent = 'Vul dit veld in om verder te gaan. Geen inkomen? Vul dan 0 in.';
      leeg.closest('.veld').after(m);
      leeg.focus();
      return;
    }
    toon(Math.min(stappen.length - 1, huidig + 1), true);
  });
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
    render(form);
    form.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    kopieer.textContent = 'Link gekopieerd ✓';
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
    location.href = `/?inkomen=${naarCheck.dataset.inkomen}#check`;
  }
});
