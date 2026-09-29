// ToeslagBuddy Pro – aanmelden, inloggen en de afgeschermde omgeving.
// Werkt met Supabase (inloglink per e-mail) als die is ingesteld.
// Met ?demo=1 draait een demo-account in deze browser (voor tests en
// verkoopdemo's bij kantoren); dan wordt niets opgeslagen op een server.
import { proefStatus, proefEind } from './proef.js';
import { verstuur } from './formulier.js';

const CFG = window.TB_PRO || {};
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
const metDemo = (pad) => (DEMO ? `${pad}?demo=1` : pad);
const $ = (s) => document.querySelector(s);

// ── Adapters ─────────────────────────────────────────────────────────
function demoAdapter() {
  const SLEUTEL = 'toeslagbuddy-pro-demo';
  const lees = () => {
    try {
      return JSON.parse(localStorage.getItem(SLEUTEL) || 'null');
    } catch {
      return null;
    }
  };
  const schrijf = (v) => {
    try {
      v ? localStorage.setItem(SLEUTEL, JSON.stringify(v)) : localStorage.removeItem(SLEUTEL);
    } catch {
      /* privémodus */
    }
  };
  return {
    soort: 'demo',
    async aanmelden(g) {
      const nu = new Date().toISOString();
      schrijf({ ...g, id: 'demo', proef_eind: proefEind(nu, CFG.proefDagen || 7), abonnement: 'proef' });
      return { direct: true };
    },
    async inloggen(email) {
      const p = lees();
      if (!p || p.email !== email) throw new Error('Geen demo-account met dit e-mailadres. Meld je eerst aan.');
      return { direct: true };
    },
    async profiel() {
      const p = lees();
      if (p && params.has('verlopen')) return { ...p, proef_eind: new Date(Date.now() - 1000).toISOString() };
      return p;
    },
    async uitloggen() {
      schrijf(null);
    },
  };
}

function supabaseAdapter() {
  const db = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true } });
  const terug = `${location.origin}/pro/app/`;
  return {
    soort: 'supabase',
    async aanmelden({ email, naam, organisatie, clienten }) {
      const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: terug, data: { naam, organisatie, clienten } } });
      if (error) throw error;
      return { direct: false };
    },
    async inloggen(email) {
      const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: terug, shouldCreateUser: false } });
      if (error) throw new Error('Inloggen lukt niet. Heb je al een account? Meld je anders eerst aan.');
      return { direct: false };
    },
    async profiel() {
      const { data: s } = await db.auth.getSession();
      if (!s.session) return null;
      const { data, error } = await db.from('pro_profielen').select('*').eq('id', s.session.user.id).single();
      if (error) throw error;
      return data;
    },
    async uitloggen() {
      await db.auth.signOut();
    },
  };
}

const adapter = DEMO ? demoAdapter() : CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase ? supabaseAdapter() : null;

function melding(el, tekst, soort) {
  el.textContent = tekst;
  el.dataset.soort = soort;
}

// ── Aanmelden ────────────────────────────────────────────────────────
const aanmeld = $('form[data-pro-aanmelden]');
if (aanmeld) {
  const status = aanmeld.querySelector('.formulier-status');
  aanmeld.addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = Object.fromEntries(new FormData(aanmeld).entries());
    if (!g.email || !g.naam || !g.organisatie || !aanmeld.querySelector('[name=akkoord]').checked) {
      melding(status, 'Vul je naam, organisatie en e-mail in en ga akkoord met de voorwaarden.', 'fout');
      return;
    }
    if (!adapter) {
      // Accounts nog niet actief: aanvraag komt als e-mail bij de beheerder binnen
      const ok = await verstuur(aanmeld, { soort: 'Proefabonnement aangevraagd' });
      if (ok) melding(status, 'Bedankt! We zetten je proefabonnement klaar en sturen je binnen één werkdag een inloglink.', 'ok');
      return;
    }
    try {
      melding(status, 'Even geduld…', 'bezig');
      const r = await adapter.aanmelden(g);
      if (!DEMO) verstuur(aanmeld, { soort: 'Nieuwe Pro-proef gestart' }).catch(() => {});
      if (r.direct) location.href = metDemo('/pro/app/');
      else melding(status, `Gelukt! We hebben een inloglink gestuurd naar ${g.email}. Klik op de link in die e-mail om je proef van ${CFG.proefDagen || 7} dagen te starten.`, 'ok');
    } catch (err) {
      melding(status, `Aanmelden lukt niet: ${err.message}`, 'fout');
    }
  });
}

// ── Inloggen ─────────────────────────────────────────────────────────
const inlog = $('form[data-pro-inloggen]');
if (inlog) {
  const status = inlog.querySelector('.formulier-status');
  if (!adapter) melding(status, 'Inloggen wordt binnenkort geactiveerd. Vraag hieronder alvast je proefabonnement aan.', 'fout');
  inlog.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = inlog.querySelector('[name=email]').value.trim();
    if (!adapter || !email) return;
    try {
      melding(status, 'Even geduld…', 'bezig');
      const r = await adapter.inloggen(email);
      if (r.direct) location.href = metDemo('/pro/app/');
      else melding(status, `We hebben een inloglink gestuurd naar ${email}. Open je mail en klik op de link.`, 'ok');
    } catch (err) {
      melding(status, err.message, 'fout');
    }
  });
}

// ── Afgeschermde omgeving ────────────────────────────────────────────
const omgeving = $('[data-pro-omgeving]');
if (omgeving) {
  const laden = $('[data-pro-laden]');
  const toon = (sel) => {
    document.querySelectorAll('[data-pro-scherm]').forEach((el) => (el.hidden = el.dataset.proScherm !== sel));
    laden.hidden = true;
  };
  (async () => {
    if (!adapter) return toon('niet-actief');
    let profiel = null;
    try {
      profiel = await adapter.profiel();
    } catch {
      profiel = null;
    }
    if (!profiel) return (location.href = metDemo('/pro/inloggen/'));
    const st = proefStatus(profiel);
    document.querySelectorAll('[data-pro-naam]').forEach((el) => (el.textContent = profiel.naam || profiel.email));
    document.querySelectorAll('[data-pro-organisatie]').forEach((el) => (el.textContent = profiel.organisatie || ''));
    document.querySelectorAll('[data-pro-email]').forEach((el) => (el.textContent = profiel.email));
    const badge = $('[data-pro-status]');
    if (st.soort === 'abonnement') badge.textContent = 'Abonnement actief';
    else if (st.soort === 'proef') badge.textContent = `Proef: nog ${st.dagenOver} ${st.dagenOver === 1 ? 'dag' : 'dagen'}`;
    else badge.textContent = 'Proef verlopen';
    badge.dataset.soort = st.soort;
    const eind = $('[data-pro-eind]');
    if (eind) eind.textContent = st.eind ? st.eind.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '–';
    if (DEMO) $('[data-pro-demo]').hidden = false;
    // Abonnement-aanvraag vooraf invullen
    document.querySelectorAll('form[data-formulier^="pro-abonnement"]').forEach((upg) => {
      upg.querySelector('[name=email]').value = profiel.email || '';
      upg.querySelector('[name=organisatie]').value = profiel.organisatie || '';
    });
    toon(st.toegang ? 'actief' : 'verlopen');
    if (st.toegang) import('./pro-app.js');
  })();

  document.querySelectorAll('[data-pro-uitloggen]').forEach((b) =>
    b.addEventListener('click', async () => {
      await adapter?.uitloggen();
      location.href = metDemo('/pro/inloggen/');
    }),
  );
  document.querySelectorAll('[data-pro-tab]').forEach((t) =>
    t.addEventListener('click', () => {
      document.querySelectorAll('[data-pro-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
      document.querySelectorAll('[data-pro-paneel]').forEach((p) => (p.hidden = p.dataset.proPaneel !== t.dataset.proTab));
    }),
  );
}
