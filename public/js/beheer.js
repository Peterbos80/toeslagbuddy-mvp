// Beheeromgeving /beheer/: cijfers, organisaties en berichten.
// Toegang: code per e-mail plus een code uit een authenticator-app (MFA,
// AAL2). De database eist dat zelf ook (private.is_beheerder), dus dit
// scherm is alleen gemak, geen beveiliging.
// Alles uit de database komt van gebruikers en wordt daarom alleen als tekst
// getoond (textContent via dom.js), nooit als HTML (spec §9 B4).
import { CONFIG } from './config.js';
import { supabaseAdapter, heeftServer, foutTekst } from './pro-server.js';
import { demoAdapter } from './pro-demo.js';
import { el, tabel, scrollVak, datumNl, euroNl, melding } from './dom.js';

const DEMO = new URLSearchParams(location.search).has('demo');
const adapter = DEMO ? demoAdapter({ beheer: true }) : heeftServer() ? supabaseAdapter() : null;
const PRIJS = CONFIG.pro?.prijsPerMaand || 99;
const $ = (s, basis = document) => basis.querySelector(s);
const $$ = (s, basis = document) => [...basis.querySelectorAll(s)];
const status = $('[data-beheer-status]');
let email = '';
let factorId = null;

const STATUS = {
  proef: ['Proef', 'badge-blauw'],
  pilot: ['Pilot', 'badge-geel'],
  actief: ['Actief (betaald)', 'badge-groen'],
  opgezegd: ['Opgezegd', 'badge-grijs'],
  verlopen: ['Verlopen', 'badge-rood'],
};

function toon(scherm) {
  $$('[data-beheer-scherm]').forEach((s) => (s.hidden = s.dataset.beheerScherm !== scherm));
  $('[data-beheer-laden]').hidden = true;
}

async function start() {
  if (!adapter) return toon('niet-actief');
  if (DEMO) $('[data-beheer-demo]').hidden = false;
  const s = await adapter.sessie().catch(() => null);
  if (!s) return toon('inloggen');
  email = s.email;
  await naLogin();
}

// Na stap 1: tweede stap (MFA) koppelen of controleren
async function naLogin() {
  try {
    const { huidig, volgend } = await adapter.aal();
    if (huidig === 'aal2') return dashboard();
    if (volgend === 'aal2') {
      factorId = await adapter.factorId();
      toon('mfa');
      return $('#bh-mfa2').focus();
    }
    // Nog geen factor: alleen iemand uit de beheerderslijst mag er een koppelen
    const omg = await adapter.rpc('mijn_omgeving');
    if (!omg.beheerder) return toon('geen-toegang');
    const f = await adapter.inschrijven();
    factorId = f.factorId;
    const qr = $('[data-beheer-qr]');
    if (f.qr) {
      qr.src = f.qr;
      qr.hidden = false;
    }
    $('[data-beheer-geheim]').textContent = f.geheim;
    toon('mfa-inschrijven');
  } catch (e) {
    melding(status, foutTekst(e), 'fout');
    toon(e.netwerk ? 'inloggen' : 'geen-toegang');
  }
}

function formulier(sel, actie) {
  const f = $(sel);
  f?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      melding(status, 'Even geduld…', 'bezig');
      await actie(f);
    } catch (err) {
      melding(status, foutTekst(err), 'fout');
    }
  });
}

formulier('form[data-beheer-email]', async (f) => {
  email = $('[name=email]', f).value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return melding(status, 'Vul een geldig e-mailadres in.', 'fout');
  await adapter.codeSturen(email, {});
  melding(status, `We hebben een code gestuurd naar ${email}.${DEMO ? ' Demo: de code is 123456.' : ''}`, 'ok');
  f.hidden = true;
  $('form[data-beheer-code]').hidden = false;
  $('#bh-code').focus();
});
formulier('form[data-beheer-code]', async (f) => {
  await adapter.codeControleren(email, $('[name=code]', f).value.trim());
  melding(status, '', 'ok');
  await naLogin();
});
const mfa = async (f) => {
  await adapter.verifieren(factorId, $('[name=code]', f).value.trim());
  melding(status, '', 'ok');
  await dashboard();
};
formulier('form[data-beheer-mfa-inschrijven]', mfa);
formulier('form[data-beheer-mfa]', mfa);

async function dashboard() {
  try {
    const stat = await adapter.rpc('beheer_statistieken');
    const [orgs, berichten] = await Promise.all([adapter.rpc('beheer_organisaties'), adapter.rpc('beheer_berichten')]);
    $('[data-beheer-wie]').textContent = email;
    renderCijfers(stat);
    renderOrganisaties(orgs);
    renderBerichten(berichten);
    toon('dashboard');
  } catch (e) {
    melding(status, foutTekst(e), 'fout');
    toon(e.code === 'geen_beheerder' ? 'geen-toegang' : 'inloggen');
  }
}

const procent = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');

function renderCijfers(s) {
  const tegels = [
    ['proeven', 'Lopende proeven', s.proeven],
    ['pilots', 'Pilots', s.pilots],
    ['actief', 'Betaald (actief)', s.actief],
    ['opgezegd', 'Opgezegd', s.opgezegd],
    ['verlopen', 'Verlopen zonder omzetting', s.verlopen],
    ['activatie', 'Activatie (eerste controle)', procent(s.geactiveerd, s.organisaties)],
    ['omzetting', 'Omzetting naar betaald', procent(s.actief, s.organisaties)],
    ['mrr', `MRR (schatting, € ${PRIJS} per kantoor)`, euroNl(s.actief * PRIJS)],
    ['binnenkort', 'Verloopt binnen 3 dagen', s.verloopt_binnenkort],
    ['berichten', 'Nieuwe berichten (7 dagen)', s.berichten_nieuw],
    ['niet-doorgestuurd', 'Berichten niet doorgestuurd', s.berichten_niet_doorgestuurd],
  ];
  $('[data-beheer-tegels]').replaceChildren(
    ...tegels.map(([k, label, waarde]) =>
      el('div', { class: `tegel${k === 'niet-doorgestuurd' && waarde > 0 ? ' rood' : ''}`, 'data-beheer-tegel': k }, el('span', {}, label), el('strong', {}, String(waarde ?? 0))),
    ),
  );
  const weken = s.controles_per_week || [];
  $('[data-beheer-weken]').replaceChildren(
    weken.length ? tabel(['Week van', 'Controles'], weken.map((w) => [datumNl(w.week), String(w.aantal)]), 'Controles per week') : el('p', { class: 'subtiel' }, 'Nog geen controles in de laatste 8 weken.'),
  );
}

function renderOrganisaties(orgs) {
  if (!orgs.length) return $('[data-beheer-organisaties]').replaceChildren(el('p', { class: 'subtiel' }, 'Nog geen organisaties.'));
  const knop = (o, soort, tekst) =>
    el('button', { type: 'button', class: 'knop-licht', 'data-beheer-actie': soort, 'aria-label': `${tekst}: ${o.naam}`, onclick: () => actie(o, soort) }, tekst);
  const rij = (o) => {
    const [naam, kleur] = STATUS[o.status] || [o.status, 'badge-grijs'];
    return el(
      'tr',
      { 'data-org': o.id, 'data-status': o.status },
      el('td', {}, el('strong', {}, o.naam)),
      el('td', {}, el('span', { class: `badge ${kleur}` }, naam)),
      el('td', {}, ['proef', 'pilot', 'verlopen'].includes(o.status) ? datumNl(o.proef_eind) : '–'),
      el('td', {}, String(o.leden)),
      el('td', {}, String(o.controles)),
      el('td', {}, datumNl(o.laatste_controle)),
      el('td', {}, o.eigenaar || '–'),
      el('td', {}, o.kvk || '–'),
      el(
        'td',
        {},
        el(
          'span',
          { class: 'pro-knoppen' },
          o.status !== 'actief' ? knop(o, 'pilot', 'Pilot 30 dagen') : null,
          o.status !== 'actief' ? knop(o, 'actief', 'Actief') : null,
          o.status !== 'opgezegd' ? knop(o, 'opgezegd', 'Opgezegd') : null,
        ),
      ),
    );
  };
  $('[data-beheer-organisaties]').replaceChildren(
    scrollVak(
      'Organisaties',
      el(
        'table',
        {},
        el('thead', {}, el('tr', {}, ['Organisatie', 'Status', 'Proef tot', 'Leden', 'Controles', 'Laatste controle', 'Eigenaar', 'KvK', 'Acties'].map((k) => el('th', { scope: 'col' }, k)))),
        el('tbody', {}, orgs.map(rij)),
      ),
    ),
  );
}

async function actie(o, soort) {
  try {
    const lijst =
      soort === 'pilot' ? await adapter.rpc('beheer_verlengen_pilot', { org: o.id }) : await adapter.rpc('beheer_abonnement_zetten', { org: o.id, status: soort });
    renderOrganisaties(lijst);
    renderCijfers(await adapter.rpc('beheer_statistieken'));
    const nieuw = lijst.find((x) => x.id === o.id);
    melding(status, `Opgeslagen: ${o.naam} is nu ${(STATUS[nieuw?.status] || [nieuw?.status])[0].toLowerCase()}.`, 'ok');
  } catch (e) {
    melding(status, foutTekst(e), 'fout');
  }
}

function renderBerichten(lijst) {
  if (!lijst.length) return $('[data-beheer-berichten]').replaceChildren(el('p', { class: 'subtiel' }, 'Geen berichten.'));
  $('[data-beheer-berichten]').replaceChildren(
    ...lijst.map((b) =>
      el(
        'article',
        { class: 'client', 'data-bericht': b.id, 'data-doorgestuurd': String(Boolean(b.doorgestuurd)) },
        el(
          'header',
          {},
          el('h3', {}, b.onderwerp),
          b.doorgestuurd ? el('span', { class: 'badge badge-groen' }, 'Doorgestuurd') : el('span', { class: 'badge badge-rood' }, `Niet doorgestuurd${b.pogingen ? ` (${b.pogingen} pogingen)` : ''}`),
        ),
        el('p', { class: 'subtiel' }, [datumNl(b.aangemaakt, true), b.soort, b.naam || 'geen naam', b.email].join(' · ')),
        el('p', { class: 'bericht-tekst' }, b.tekst || '(geen tekst)'),
      ),
    ),
  );
}

$$('[data-beheer-uitloggen]').forEach((k) =>
  k.addEventListener('click', async () => {
    await adapter?.uitloggen();
    location.reload();
  }),
);
$('[data-beheer-vernieuwen]')?.addEventListener('click', () => dashboard());

if ($('[data-beheer]')) start();
