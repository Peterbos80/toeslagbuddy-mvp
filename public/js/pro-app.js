// ToeslagBuddy Pro – cliëntenlijst controleren. Alles gebeurt lokaal in de browser.
import { leesCsv, checkLijst, actielijstCsv, VOORBEELD_CSV, KOLOMMEN } from './pro.js';
import { euro } from './toeslagen.js';
import { JAAR } from './params.js';

const $ = (s) => document.querySelector(s);
const invoer = $('#pro-invoer');
const uit = $('#pro-uitkomst');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let laatste = null;

function download(naam, inhoud, type) {
  const url = URL.createObjectURL(new Blob([inhoud], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: naam });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#pro-bestand').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  invoer.value = await f.text();
  controleer();
});
$('#pro-voorbeeld').addEventListener('click', () => {
  invoer.value = VOORBEELD_CSV;
  controleer();
});
$('#pro-sjabloon').addEventListener('click', () =>
  download('toeslagbuddy-sjabloon.csv', '﻿' + KOLOMMEN.map(([k]) => k).join(';') + '\r\n', 'text/csv;charset=utf-8'),
);
$('#pro-controleer').addEventListener('click', controleer);

const LABEL = {
  gemist: ['Niet aangevraagd', 'badge-groen'],
  'te-laag': ['Voorschot te laag', 'badge-groen'],
  terugbetaling: ['Terugbetalingsrisico', 'badge-rood'],
  vermogen: ['Vermogen', 'badge-geel'],
  leeftijd: ['Verandering', 'badge-geel'],
  gemeente: ['Gemeente', 'badge-blauw'],
  info: ['Controleren', 'badge-grijs'],
};

function controleer() {
  const rijen = leesCsv(invoer.value);
  if (!rijen.length) {
    uit.innerHTML = '<p class="melding">Plak een lijst, kies een CSV-bestand of laad het voorbeeld.</p>';
    return;
  }
  laatste = checkLijst(rijen);
  render();
  uit.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function render() {
  const { clienten, totaal } = laatste;
  const alleenActie = $('#pro-filter')?.checked ?? true;
  const lijst = alleenActie ? clienten.filter((c) => c.signalen.some((s) => s.prioriteit <= 2)) : clienten;
  const bedrag = (r, v) => {
    if (!r) return '<span class="subtiel">n.v.t.</span>';
    const recht = r.recht ? r.perMaand : 0;
    return `${euro(recht)} <small class="subtiel">(voorschot ${euro(v)})</small>`;
  };
  uit.innerHTML = `
<div class="tegels">
  <div class="tegel"><span>Cliënten gecontroleerd</span><strong>${totaal.aantal}</strong></div>
  <div class="tegel"><span>Met actiepunt</span><strong>${totaal.metActie}</strong></div>
  <div class="tegel groen"><span>Mogelijk gemist per jaar</span><strong>${euro(totaal.gemistPerJaar)}</strong></div>
  <div class="tegel rood"><span>Terugbetalingsrisico per jaar</span><strong>${euro(totaal.risicoPerJaar)}</strong></div>
</div>
<div class="pro-knoppen geen-print">
  <label class="vinkje-inline"><input type="checkbox" id="pro-filter"${alleenActie ? ' checked' : ''}> Alleen cliënten met actiepunt</label>
  <button type="button" class="knop-licht" id="pro-export">Actielijst downloaden (Excel/CSV)</button>
  <button type="button" class="knop-licht" id="pro-print">Rapport printen / PDF</button>
</div>
<p class="print-kop">ToeslagBuddy Pro – controle toeslagen ${JAAR} – ${new Date().toLocaleDateString('nl-NL')}</p>
${lijst
  .map(
    (c) => `<article class="client">
  <header><h3>${esc(c.clientnr)}</h3>
    ${c.gemistPerJaar ? `<span class="badge badge-groen">+ ${euro(c.gemistPerJaar)} / jaar</span>` : ''}
    ${c.risicoPerJaar ? `<span class="badge badge-rood">risico ${euro(c.risicoPerJaar)} / jaar</span>` : ''}
  </header>
  <dl class="rechten">
    <div><dt>Zorgtoeslag</dt><dd>${bedrag(c.recht.zorgtoeslag, c.voorschot.zorgtoeslag)}</dd></div>
    <div><dt>Huurtoeslag</dt><dd>${bedrag(c.recht.huurtoeslag, c.voorschot.huurtoeslag)}</dd></div>
    <div><dt>Kindgebonden budget</dt><dd>${bedrag(c.recht.kindgebondenBudget, c.voorschot.kindgebondenBudget)}</dd></div>
  </dl>
  ${c.signalen.length ? `<ul class="signalen">${c.signalen.map((s) => `<li><span class="badge ${LABEL[s.soort][1]}">${LABEL[s.soort][0]}</span> ${esc(s.tekst)}</li>`).join('')}</ul>` : '<p class="subtiel">Geen actiepunten.</p>'}
</article>`,
  )
  .join('') || '<p>Geen cliënten met actiepunten. 🎉</p>'}
<p class="hint">Indicatie op basis van de officiële rekenregels ${JAAR}. Controleer altijd in Mijn toeslagen voordat je een wijziging doorgeeft.</p>`;
  $('#pro-filter').addEventListener('change', render);
  $('#pro-export').addEventListener('click', () => download(`actielijst-toeslagen-${new Date().toISOString().slice(0, 10)}.csv`, actielijstCsv(laatste), 'text/csv;charset=utf-8'));
  $('#pro-print').addEventListener('click', () => window.print());
}
