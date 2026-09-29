// ToeslagBuddy Pro – aanmelden, inloggen en de afgeschermde omgeving.
// • Inloggen met een code van 6 cijfers per e-mail; de link in de mail werkt ook.
// • De server (mijn_omgeving) is leidend voor de proefstatus (R25).
// • Na een controle gaan alleen geaggregeerde tellingen naar de server, via een
//   outbox per gebruiker met een id per controle (idempotent), die het later
//   opnieuw probeert (R16, R22). Exacte cijfers blijven in deze browser.
// • Met ?demo=1 draait alles in deze browser (pro-demo.js).
// Alles wat een gebruiker invult, tonen we met textContent (dom.js).
import { verstuur } from './formulier.js';
import { supabaseAdapter, heeftServer, foutTekst } from './pro-server.js';
import { demoAdapter } from './pro-demo.js';
import { lokaleSamenvatting, vergelijkbaar, toonTelling } from './aggregaat.js';
import { el, tabel, datumNl, euroNl, download, melding } from './dom.js';

const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
const metDemo = (pad) => (DEMO ? `${pad}${pad.includes('?') ? '&' : '?'}demo=1` : pad);
const $ = (s, basis = document) => basis.querySelector(s);
const $$ = (s, basis = document) => [...basis.querySelectorAll(s)];
const adapter = DEMO ? demoAdapter() : heeftServer() ? supabaseAdapter() : null;
const UITNODIGING = 'toeslagbuddy-pro-uitnodiging';

// ── Opslag in deze browser (kan geblokkeerd zijn: dan gaat het zonder) ──
const opslag = {
  lees(k, standaard) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? standaard;
    } catch {
      return standaard;
    }
  },
  schrijf(k, v) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
};
const sleutels = (uid) => ({
  historie: `toeslagbuddy-pro-historie-${uid}`,
  outbox: `toeslagbuddy-pro-outbox-${uid}`,
  omgeving: `toeslagbuddy-pro-omgeving-${uid}`,
});
const wisLokaal = (uid) => uid && Object.values(sleutels(uid)).forEach((k) => opslag.schrijf(k, null));

// ── Code-stap (aanmelden en inloggen) ────────────────────────────────
const codeForm = $('form[data-pro-code]');
const aanmeld = $('form[data-pro-aanmelden]');
const inlog = $('form[data-pro-inloggen]');
let codeEmail = '';

function toonCodeStap(email) {
  codeEmail = email;
  $('[data-pro-code-uitleg]', codeForm).textContent =
    `We hebben een mail gestuurd naar ${email}. Vul de code van 6 cijfers uit die mail hieronder in. De link in de mail werkt ook.` +
    (DEMO ? ' Demo: de code is 123456.' : '');
  (aanmeld || inlog).hidden = true;
  codeForm.hidden = false;
  $('[name=code]', codeForm).focus();
}

codeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('.formulier-status', codeForm);
  const code = $('[name=code]', codeForm).value.replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return melding(status, 'Vul de 6 cijfers uit de e-mail in.', 'fout');
  try {
    melding(status, 'Even geduld…', 'bezig');
    await adapter.codeControleren(codeEmail, code);
    location.href = metDemo('/pro/app/');
  } catch (err) {
    melding(status, foutTekst(err), 'fout');
  }
});
$('[data-pro-opnieuw]')?.addEventListener('click', () => {
  codeForm.hidden = true;
  const form = aanmeld || inlog;
  form.hidden = false;
  $('[name=email]', form).focus();
});

// ── Aanmelden ────────────────────────────────────────────────────────
if (aanmeld) {
  const status = $('.formulier-status', aanmeld);
  aanmeld.addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = Object.fromEntries(new FormData(aanmeld).entries());
    if (!g.email?.trim() || !g.naam?.trim() || !g.organisatie?.trim() || !$('[name=akkoord]', aanmeld).checked) {
      melding(status, 'Vul je naam, organisatie en e-mail in en ga akkoord met de voorwaarden.', 'fout');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email.trim())) return melding(status, 'Controleer je e-mailadres.', 'fout');
    if (!adapter) {
      // Accounts nog niet actief: de aanvraag gaat als bericht naar de beheerder
      await verstuur(aanmeld, { onderwerp: 'accounts nog niet actief' });
      return;
    }
    if (aanmeld.botcheck?.checked) return;
    try {
      melding(status, 'Even geduld…', 'bezig');
      const gegevens = { naam: g.naam.trim().slice(0, 200), organisatie: g.organisatie.trim().slice(0, 200), clienten: String(g.clienten || '').trim().slice(0, 10) };
      await adapter.codeSturen(g.email.trim(), { nieuw: true, gegevens });
      melding(status, '', 'ok');
      toonCodeStap(g.email.trim());
    } catch (err) {
      melding(status, `Aanmelden lukt niet. ${foutTekst(err)}`, 'fout');
    }
  });
}

// ── Inloggen ─────────────────────────────────────────────────────────
const REDENEN = {
  sessie: 'Je sessie is verlopen. Log opnieuw in. Tellingen die nog niet verstuurd waren, wachten veilig in deze browser.',
  link: 'Deze inloglink werkt niet (meer). Een link in een mail werkt maar één keer en is kort geldig. Vraag hieronder een nieuwe code aan.',
  verwijderd: 'Je account is verwijderd. Bedankt voor het gebruiken van ToeslagBuddy Pro.',
  uitnodiging: 'Je bent uitgenodigd voor ToeslagBuddy Pro. Log in met het e-mailadres waarop je bent uitgenodigd. Heb je nog geen account? Dan maken we er meteen een voor je.',
};
if (inlog) {
  const status = $('.formulier-status', inlog);
  const uitgenodigd = Boolean(opslag.lees(UITNODIGING, null));
  const reden = $('[data-pro-reden]');
  const tekst = REDENEN[params.get('reden')] || (uitgenodigd ? REDENEN.uitnodiging : '');
  if (reden && tekst) {
    reden.textContent = tekst;
    reden.hidden = false;
  }
  if (!adapter) melding(status, 'Inloggen wordt binnenkort geactiveerd. Vraag hieronder alvast je proefabonnement aan.', 'fout');
  inlog.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('[name=email]', inlog).value.trim();
    if (!adapter) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return melding(status, 'Vul een geldig e-mailadres in.', 'fout');
    try {
      melding(status, 'Even geduld…', 'bezig');
      await adapter.codeSturen(email, { toestaanNieuw: uitgenodigd });
      melding(status, '', 'ok');
      toonCodeStap(email);
    } catch (err) {
      melding(status, foutTekst(err), 'fout');
    }
  });
}

// ── Afgeschermde omgeving ────────────────────────────────────────────
const omgevingEl = $('[data-pro-omgeving]');
let gebruiker = null;
let omg = null;
let outboxFout = null;

function toon(scherm) {
  $$('[data-pro-scherm]').forEach((s) => (s.hidden = s.dataset.proScherm !== scherm));
  $('[data-pro-laden]').hidden = true;
}
function bericht(tekst, soort = 'info') {
  const b = $('[data-pro-bericht]');
  b.textContent = tekst;
  b.dataset.soort = soort;
  b.hidden = !tekst;
}
const naarInloggen = (reden) => location.replace(metDemo(`/pro/inloggen/${reden ? `?reden=${reden}` : ''}`));

// Alleen wat nodig is om bij een storing door te kunnen werken (R16)
const cacheVan = (o) => ({ gebruiker: o.gebruiker, profiel: o.profiel, rol: o.rol, beheerder: o.beheerder, organisatie: o.organisatie, leden: o.leden, uitnodigingen: [] });

async function start() {
  if (!adapter) return toon('niet-actief');
  if (DEMO) $('[data-pro-demo]').hidden = false;
  // Uitnodigingslink: token bewaren en uit de adresbalk halen
  const token = params.get('uitnodiging');
  if (token) {
    opslag.schrijf(UITNODIGING, token);
    params.delete('uitnodiging');
    history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : ''));
  }
  // Ongeldige of verlopen inloglink uit de mail (R10)
  if (/error_code=|error=/.test(location.hash)) return naarInloggen('link');
  gebruiker = await adapter.sessie().catch(() => null);
  if (!gebruiker) return naarInloggen(opslag.lees(UITNODIGING, null) ? 'uitnodiging' : '');
  await laadOmgeving();
}

async function laadOmgeving() {
  const k = sleutels(gebruiker.id);
  let uitnodigingMislukt = false;
  omg = null;
  try {
    const wacht = opslag.lees(UITNODIGING, null);
    if (wacht) {
      opslag.schrijf(UITNODIGING, null);
      try {
        omg = await adapter.rpc('uitnodiging_accepteren', { token: wacht });
        bericht(`Welkom! Je hoort nu bij het team van ${omg.organisatie?.naam || 'je organisatie'}.`);
      } catch (e) {
        if (e.netwerk || e.sessie) {
          opslag.schrijf(UITNODIGING, wacht);
          throw e;
        }
        uitnodigingMislukt = true;
        bericht(foutTekst(e), 'fout');
      }
    }
    if (!omg) omg = await adapter.rpc('mijn_omgeving');
    // Eerste login zonder lidmaatschap: eigen organisatie met proef (§9 punt 7)
    if (!omg.organisatie && !omg.beheerder && !uitnodigingMislukt) {
      const p = omg.profiel || {};
      omg = await adapter.rpc('organisatie_aanmaken', { naam: (p.organisatie || p.naam || 'Mijn organisatie').slice(0, 200) });
    }
    opslag.schrijf(k.omgeving, cacheVan(omg));
  } catch (e) {
    if (e.sessie) return naarInloggen('sessie');
    const cache = opslag.lees(k.omgeving, null);
    if (e.netwerk && cache?.organisatie?.toegang) {
      omg = cache;
      bericht('De server is tijdelijk niet bereikbaar. Controleren werkt gewoon; de tellingen versturen we later.', 'fout');
    } else {
      if (!e.netwerk) bericht(foutTekst(e), 'fout');
      return toon('onbereikbaar');
    }
  }
  toonOmgeving();
}

function statusTekst(o) {
  const dagen = (n) => `${n} ${n === 1 ? 'dag' : 'dagen'}`;
  return {
    proef: [`Proef: nog ${dagen(o.dagen_over)}`, 'proef'],
    pilot: [`Pilot: nog ${dagen(o.dagen_over)}`, 'proef'],
    actief: ['Abonnement actief', 'abonnement'],
    opgezegd: ['Abonnement opgezegd', 'verlopen'],
    verlopen: ['Proef verlopen', 'verlopen'],
  }[o.status] || ['–', 'verlopen'];
}

function toonOmgeving() {
  if (!omg.organisatie) return toon(omg.beheerder ? 'beheerder' : 'geen-organisatie');
  const o = omg.organisatie;
  const eigenaar = omg.rol === 'eigenaar';
  $$('[data-pro-naam]').forEach((x) => (x.textContent = omg.profiel?.naam || omg.gebruiker.email));
  $$('[data-pro-organisatie]').forEach((x) => (x.textContent = o.naam));
  $$('[data-pro-email]').forEach((x) => (x.textContent = omg.gebruiker.email));
  const [tekst, soort] = statusTekst(o);
  const badge = $('[data-pro-status]');
  badge.textContent = tekst;
  badge.dataset.soort = soort;
  $('[data-pro-eind]').textContent = ['proef', 'pilot'].includes(o.abonnement) ? new Date(o.proef_eind).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : o.status === 'actief' ? 'Doorlopend abonnement' : '–';
  // Formulieren vooraf invullen
  $$('form[data-formulier^="pro-abonnement"]').forEach((f) => {
    $('[name=email]', f).value = omg.gebruiker.email || '';
    $('[name=organisatie]', f).value = o.naam || '';
  });
  const profiel = $('form[data-pro-profiel]');
  $('[name=naam]', profiel).value = omg.profiel?.naam || '';
  $('[name=organisatie]', profiel).value = o.naam || '';
  $('[name=kvk]', profiel).value = o.kvk || '';
  $('[data-pro-alleen-eigenaar]', profiel).hidden = !eigenaar;
  $$('[data-pro-org-verwijderen]').forEach((b) => (b.hidden = !eigenaar));
  toon(o.toegang ? 'actief' : 'verlopen');
  if (o.toegang) {
    import('./pro-app.js');
    renderTeam();
    renderHistorie();
    renderTrend();
    verstuurOutbox();
  }
}

// ── Outbox: geaggregeerde tellingen naar de server ──────────────────
const outbox = () => (gebruiker ? opslag.lees(sleutels(gebruiker.id).outbox, []) : []);
function zetOutbox(lijst) {
  const ok = opslag.schrijf(sleutels(gebruiker.id).outbox, lijst);
  toonOutbox();
  return ok;
}
let versturen = null;
function verstuurOutbox() {
  if (!gebruiker || !omg?.organisatie?.toegang) return Promise.resolve();
  versturen ||= (async () => {
    let opgeslagen = 0;
    for (const agg of outbox()) {
      try {
        await adapter.rpc('controle_opslaan', { gegevens: agg });
        zetOutbox(outbox().filter((x) => x.id !== agg.id));
        opgeslagen++;
        outboxFout = null;
      } catch (e) {
        outboxFout = e.netwerk ? 'netwerk' : e.sessie ? 'sessie' : e.code;
        if (e.sessie) return naarInloggen('sessie'); // R22: tellingen blijven bewaard
        if (e.netwerk || e.code === 'limiet') break;
        // Geweigerd (bijv. proef verlopen): niet eindeloos opnieuw proberen
        zetOutbox(outbox().filter((x) => x.id !== agg.id));
      }
    }
    toonOutbox(opgeslagen);
    if (opgeslagen) renderTrend();
  })().finally(() => (versturen = null));
  return versturen;
}
function toonOutbox(opgeslagen = 0) {
  const x = $('[data-pro-outbox]');
  if (!x) return;
  const n = outbox().length;
  x.dataset.wachtrij = String(n);
  if (n) {
    const extra = outboxFout === 'limiet' ? ' Je hebt vandaag het maximum van 50 controles bereikt; morgen gaat het verder.' : ' We proberen het automatisch opnieuw.';
    x.textContent = `${n === 1 ? '1 controle wacht' : `${n} controles wachten`} op verzending naar de trend van je organisatie.${extra}`;
  } else if (opgeslagen) x.textContent = 'Geaggregeerde tellingen opgeslagen voor de trend van je organisatie.';
  else if (outboxFout && outboxFout !== 'netwerk') x.textContent = `De tellingen zijn niet opgeslagen. ${foutTekst({ code: outboxFout })}`;
}

document.addEventListener('tb:controle', (e) => {
  const { resultaat, aggregaat } = e.detail || {};
  if (!gebruiker || !resultaat?.totaal?.aantal) return;
  const k = sleutels(gebruiker.id);
  const historie = [lokaleSamenvatting(resultaat), ...opslag.lees(k.historie, [])].slice(0, 50);
  const bewaard = opslag.schrijf(k.historie, historie);
  if (aggregaat) {
    if (zetOutbox([...outbox(), aggregaat])) verstuurOutbox();
    else adapter.rpc('controle_opslaan', { gegevens: aggregaat }).then(() => renderTrend(), () => {});
  }
  renderHistorie(bewaard ? null : historie);
});
if (omgevingEl) {
  window.addEventListener('online', () => verstuurOutbox());
  setInterval(() => verstuurOutbox(), 60000);
}

// ── Rapportage ──────────────────────────────────────────────────────
const LABELS = { gemist: 'Niet aangevraagd', 'te-laag': 'Voorschot te laag', terugbetaling: 'Terugbetalingsrisico', vermogen: 'Vermogen', leeftijd: 'Verandering', gemeente: 'Gemeente', info: 'Controleren' };
const versie = (v) => {
  const m = /^(\d{4})\.(\d{4})(\d{2})(\d{2})$/.exec(v || '');
  return m ? `${m[1]} (bijgewerkt ${Number(m[4])}-${Number(m[3])}-${m[2]})` : v || '–';
};
const verschil = (n) => (n > 0 ? `+${n}` : String(n));

function renderHistorie(inGeheugen = null) {
  const doel = $('[data-pro-historie]');
  if (!doel || !gebruiker) return;
  const h = inGeheugen || opslag.lees(sleutels(gebruiker.id).historie, []);
  if (!h.length) return doel.replaceChildren(el('p', { class: 'subtiel' }, 'Nog geen controles in deze browser. Doe een controle bij het tabblad Controle.'));
  const rijen = h.map((c, i) => {
    const vorige = h[i + 1];
    const vergelijk = !vorige ? '–' : vergelijkbaar(c, vorige) ? `${verschil(c.metActie - vorige.metActie)} met actiepunt` : el('span', { class: 'badge badge-geel' }, 'niet vergelijkbaar (andere rekenregels)');
    return [datumNl(c.datum, true), String(c.aantal), String(c.metActie), euroNl(c.gemist), euroNl(c.risico), vergelijk, versie(c.rekenversie)];
  });
  doel.replaceChildren(
    inGeheugen ? el('p', { class: 'melding' }, 'Bewaren in deze browser lukt niet (bijvoorbeeld in een privévenster). Print het rapport als je het wilt bewaren.') : '',
    tabel(['Datum', 'Cliënten', 'Met actiepunt', 'Mogelijk gemist per jaar', 'Risico per jaar', 'T.o.v. vorige', 'Rekenregels'], rijen, 'Jouw controles'),
  );
}

async function renderTrend() {
  const doel = $('[data-pro-trend]');
  if (!doel || !gebruiker) return;
  let rijen;
  try {
    rijen = await adapter.controles();
  } catch (e) {
    return doel.replaceChildren(el('p', { class: 'subtiel' }, e.netwerk ? 'De trend is nu niet te laden, omdat de server niet bereikbaar is.' : foutTekst(e)));
  }
  if (!rijen.length) return doel.replaceChildren(el('p', { class: 'subtiel' }, 'Nog geen opgeslagen controles in je organisatie.'));
  const bedrag = (n) => (n === null || n === undefined ? '–' : `± ${euroNl(n)}`);
  doel.replaceChildren(
    tabel(
      ['Datum', 'Cliënten', 'Met actiepunt', 'Mogelijk gemist per jaar', 'Risico per jaar', 'Signalen (cliënten)', 'Rekenregels'],
      rijen.map((c, i) => [
        datumNl(c.aangemaakt, true),
        c.clienten_band,
        toonTelling(c.met_actie),
        bedrag(c.gemist_jaar),
        bedrag(c.risico_jaar),
        Object.entries(c.signalen || {})
          .filter(([, n]) => n !== 0)
          .map(([s, n]) => `${LABELS[s] || s}: ${toonTelling(n)}`)
          .join(' · '),
        rijen[i + 1] && !vergelijkbaar(c, rijen[i + 1]) ? el('span', {}, versie(c.rekenversie), ' ', el('span', { class: 'badge badge-geel' }, 'niet vergelijkbaar')) : versie(c.rekenversie),
      ]),
      'Trend van je organisatie',
    ),
  );
}

$('[data-pro-rapport-print]')?.addEventListener('click', () => {
  $('[data-pro-rapport-org]').textContent = omg?.organisatie?.naam || '';
  $('[data-pro-rapport-datum]').textContent = new Date().toLocaleDateString('nl-NL');
  window.print();
});

// ── Team ────────────────────────────────────────────────────────────
function renderTeam() {
  const eigenaar = omg.rol === 'eigenaar';
  $('[data-pro-team-eigenaar]').hidden = !eigenaar;
  $('[data-pro-team-lid]').hidden = eigenaar;
  const koppen = ['Naam', 'E-mail', 'Rol', 'Sinds', ...(eigenaar ? ['Acties'] : [])];
  const rijen = omg.leden.map((l) => [
    l.naam || '–',
    l.email || '–',
    l.rol === 'eigenaar' ? 'Eigenaar' : 'Lid',
    datumNl(l.toegevoegd),
    ...(eigenaar
      ? [
          l.user_id === omg.gebruiker.id
            ? 'Jij'
            : el(
                'span',
                { class: 'pro-knoppen' },
                el('button', { type: 'button', class: 'knop-licht', 'aria-label': `${l.email} verwijderen uit het team`, 'data-pro-lid-verwijderen': l.user_id, onclick: () => lidVerwijderen(l) }, 'Verwijderen'),
                el('button', { type: 'button', class: 'knop-licht', 'aria-label': `${l.email} eigenaar maken`, 'data-pro-eigenaar-maken': l.user_id, onclick: () => eigenaarMaken(l) }, 'Eigenaar maken'),
              ),
        ]
      : []),
  ]);
  $('[data-pro-leden]').replaceChildren(tabel(koppen, rijen, 'Leden van je team'));
  const open = omg.uitnodigingen || [];
  $('[data-pro-open-uitnodigingen]').replaceChildren(
    open.length ? el('h3', {}, 'Openstaande uitnodigingen') : '',
    open.length ? el('ul', {}, open.map((i) => el('li', {}, `${i.email} (link geldig tot ${datumNl(i.verloopt)})`))) : '',
  );
}

async function teamActie(vraag, functie, args, gelukt) {
  const status = $('[data-pro-team-status]');
  if (!confirm(vraag)) return;
  try {
    omg = await adapter.rpc(functie, args);
    melding(status, gelukt, 'ok');
    toonOmgeving();
  } catch (e) {
    melding(status, foutTekst(e), 'fout');
  }
}
const lidVerwijderen = (l) => teamActie(`Weet je zeker dat je ${l.email} uit je team wilt verwijderen?`, 'lid_verwijderen', { lid: l.user_id }, `${l.email} is verwijderd uit je team.`);
const eigenaarMaken = (l) =>
  teamActie(`Weet je zeker dat je ${l.email} eigenaar wilt maken? Jij wordt dan gewoon lid en kunt niet meer uitnodigen.`, 'eigendom_overdragen', { lid: l.user_id }, `${l.email} is nu de eigenaar.`);

const uitnodigen = $('form[data-pro-uitnodigen]');
uitnodigen?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('.formulier-status', uitnodigen);
  const email = $('[name=email]', uitnodigen).value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return melding(status, 'Vul het e-mailadres van je collega in.', 'fout');
  try {
    melding(status, 'Even geduld…', 'bezig');
    const token = await adapter.rpc('uitnodiging_maken', { email });
    $('[data-pro-link-veld]').value = adapter.uitnodigingsLink(token);
    $('[data-pro-link]').hidden = false;
    melding(status, `Link gemaakt voor ${email}. Kopieer hem en stuur hem zelf naar je collega. Je ziet de link maar één keer.`, 'ok');
    uitnodigen.reset();
    omg = await adapter.rpc('mijn_omgeving');
    renderTeam();
  } catch (err) {
    melding(status, foutTekst(err), 'fout');
  }
});
$('[data-pro-kopieer]')?.addEventListener('click', async () => {
  const veld = $('[data-pro-link-veld]');
  const status = $('.formulier-status', uitnodigen);
  try {
    await navigator.clipboard.writeText(veld.value);
    melding(status, 'De link is gekopieerd.', 'ok');
  } catch {
    veld.select();
    melding(status, 'Kopiëren lukt niet automatisch. De link is geselecteerd: kopieer hem met Ctrl+C (of Cmd+C).', 'fout');
  }
});

// ── Account ─────────────────────────────────────────────────────────
const profielForm = $('form[data-pro-profiel]');
profielForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('.formulier-status', profielForm);
  const naam = $('[name=naam]', profielForm).value.trim();
  if (!naam) return melding(status, 'Vul je naam in.', 'fout');
  try {
    melding(status, 'Even geduld…', 'bezig');
    if (naam !== (omg.profiel?.naam || '')) omg = await adapter.rpc('profiel_bijwerken', { naam });
    if (omg.rol === 'eigenaar') {
      omg = await adapter.rpc('organisatie_bijwerken', { naam: $('[name=organisatie]', profielForm).value.trim(), kvk: $('[name=kvk]', profielForm).value.trim() || null });
    }
    toonOmgeving();
    melding(status, 'Opgeslagen.', 'ok');
  } catch (err) {
    melding(status, foutTekst(err), 'fout');
  }
});

$$('[data-pro-export]').forEach((knop) =>
  knop.addEventListener('click', async () => {
    const status = $('[data-pro-privacy-status]', knop.closest('section, [data-pro-paneel]'));
    try {
      const server = await adapter.rpc('mijn_gegevens');
      const lokaal = { historie_in_deze_browser: opslag.lees(sleutels(gebruiker.id).historie, []) };
      download('mijn-gegevens-toeslagbuddy.json', JSON.stringify({ ...server, ...lokaal }, null, 2), 'application/json');
      melding(status, 'Je gegevens zijn gedownload.', 'ok');
    } catch (e) {
      melding(status, foutTekst(e), 'fout');
    }
  }),
);

$$('[data-pro-verwijderen]').forEach((knop) =>
  knop.addEventListener('click', async () => {
    const status = $('[data-pro-privacy-status]', knop.closest('section, [data-pro-paneel]'));
    if (!confirm('Weet je zeker dat je je account wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    try {
      await adapter.rpc('account_verwijderen');
      wisLokaal(gebruiker.id);
      await adapter.uitloggen();
      location.href = metDemo('/pro/inloggen/?reden=verwijderd');
    } catch (e) {
      melding(status, foutTekst(e), 'fout');
    }
  }),
);

$$('[data-pro-org-verwijderen]').forEach((knop) =>
  knop.addEventListener('click', async () => {
    const status = $('[data-pro-privacy-status]', knop.closest('section, [data-pro-paneel]'));
    if (!confirm('Weet je zeker dat je de hele organisatie wilt verwijderen? Alle leden verliezen hun toegang en de trend verdwijnt.')) return;
    try {
      omg = await adapter.rpc('organisatie_verwijderen');
      toonOmgeving();
    } catch (e) {
      melding(status, foutTekst(e), 'fout');
    }
  }),
);

$$('[data-pro-org-starten]').forEach((knop) =>
  knop.addEventListener('click', async () => {
    try {
      const p = omg?.profiel || {};
      omg = await adapter.rpc('organisatie_aanmaken', { naam: (p.organisatie || p.naam || 'Mijn organisatie').slice(0, 200) });
      bericht('');
      toonOmgeving();
    } catch (e) {
      bericht(foutTekst(e), 'fout');
    }
  }),
);
$$('[data-pro-opnieuw-laden]').forEach((k) => k.addEventListener('click', () => location.reload()));

// ── Uitloggen en tabbladen ──────────────────────────────────────────
$$('[data-pro-uitloggen]').forEach((b) =>
  b.addEventListener('click', async () => {
    wisLokaal(gebruiker?.id); // exacte cijfers en outbox horen bij deze sessie (§9 B5, punt 17)
    await adapter?.uitloggen();
    location.href = metDemo('/pro/inloggen/');
  }),
);
$$('[data-pro-tab]').forEach((t) =>
  t.addEventListener('click', () => {
    $$('[data-pro-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    $$('[data-pro-paneel]').forEach((p) => (p.hidden = p.dataset.proPaneel !== t.dataset.proTab));
    if (t.dataset.proTab === 'rapportage') {
      renderHistorie();
      renderTrend();
    }
  }),
);

if (omgevingEl) start();
