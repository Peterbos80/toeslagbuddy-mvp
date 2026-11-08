// /deals/jagers/: jagers met een account (Supabase, inloggen met een link per
// mail). Dan draait de server je jagers ook als je de site niet open hebt en
// mailt een rapport. Zonder Supabase-config: alleen uitleg. Geen supabase-js
// nodig: we gebruiken de REST-API's direct (strikte CSP: connect-src).
import { CONFIG } from './config.js';
import { lees } from './deals-opslag.js';
import { esc, tijdTekst } from './deals-weergave.js';

const blok = document.querySelector('[data-account]');
const SESSIE = 'dealbuddy-sessie';
const basis = (CONFIG.supabaseUrl || '').replace(/\/$/, '');
const anon = CONFIG.supabaseAnonKey || '';

function sessie() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSIE) || 'null');
  } catch {
    return null;
  }
}
function zetSessie(s) {
  try {
    if (s) sessionStorage.setItem(SESSIE, JSON.stringify(s));
    else sessionStorage.removeItem(SESSIE);
  } catch {
    /* geen opslag: sessie alleen in deze pagina */
  }
}
async function api(pad, opties = {}, token = sessie()?.token) {
  const r = await fetch(`${basis}${pad}`, { ...opties, headers: { apikey: anon, Authorization: `Bearer ${token || anon}`, 'Content-Type': 'application/json', ...(opties.headers || {}) } });
  if (!r.ok) throw new Error(String(r.status));
  return r.status === 204 ? null : r.json().catch(() => null);
}
const status = (t, soort = 'ok') => {
  const s = blok.querySelector('[data-account-status]');
  s.textContent = t;
  s.dataset.soort = soort;
};

async function tekenIngelogd() {
  const s = sessie();
  let jachten = [];
  try {
    jachten = await api('/rest/v1/deals_jachten?select=id,omschrijving,frequentie,actief,laatst_gedraaid&order=aangemaakt.desc');
  } catch {
    zetSessie(null);
    return tekenUit();
  }
  blok.querySelector('[data-account-inhoud]').innerHTML = `<p>Ingelogd als <strong>${esc(s.email || 'jij')}</strong>.</p>
<p class="veld"><label for="acc-freq">Hoe vaak mag je jager mailen?</label><select id="acc-freq" data-freq><option value="dag">Hooguit één keer per dag</option><option value="uur">Elk uur</option><option value="week">Eén keer per week</option></select></p>
<p class="knoppen"><button type="button" class="knop" data-sync>Zet mijn jagers op de server</button> <button type="button" class="knop-licht" data-uit>Uitloggen</button> <button type="button" class="knop-licht" data-weg>Account en jagers verwijderen</button></p>
${jachten.length ? `<h3>Op de server (${jachten.length})</h3><ul>${jachten.map((j) => `<li>${esc(j.omschrijving)} – ${j.actief ? 'actief' : 'uit'}, ${esc(j.frequentie)}, laatst gezocht ${esc(tijdTekst(j.laatst_gedraaid))}</li>`).join('')}</ul>` : '<p>Nog geen jagers op de server.</p>'}`;
}

function tekenUit() {
  blok.querySelector('[data-account-inhoud]').innerHTML = `<form data-login novalidate><div class="veld"><label for="acc-email">Je e-mailadres</label><input id="acc-email" type="email" autocomplete="email" required></div>
<p class="vinkje"><input type="checkbox" id="acc-ok" required><label for="acc-ok">Ik wil mails van mijn jagers krijgen. Afmelden kan altijd, met één klik in elke mail.</label></p>
<button type="submit" class="knop">Stuur mij een inloglink</button></form>`;
}

if (blok) {
  const inhoud = blok.querySelector('[data-account-inhoud]');
  const q = new URLSearchParams(location.search);
  if (!basis) {
    inhoud.innerHTML = '<p>Mail-meldingen met een account komen beschikbaar zodra onze server is ingesteld. Tot die tijd werken je jagers in deze browser.</p>';
  } else {
    // Afmelden via de link in een mail (zonder in te loggen)
    if (q.get('afmelden')) {
      api('/rest/v1/rpc/deals_afmelden', { method: 'POST', body: JSON.stringify({ p_token: q.get('afmelden') }) }, anon)
        .then((r) => status(r?.afgemeld ? 'Gelukt: je krijgt geen mails meer van deze jager.' : 'Deze jager was al afgemeld.'))
        .catch(() => status('Afmelden lukte niet. Probeer het later opnieuw of mail info@toeslagbuddy.nl.', 'fout'));
    }
    // Terug van de inloglink: #access_token=…
    const hash = new URLSearchParams(location.hash.slice(1));
    if (hash.get('access_token')) {
      zetSessie({ token: hash.get('access_token'), email: null });
      history.replaceState(null, '', location.pathname);
      api('/auth/v1/user')
        .then((u) => zetSessie({ token: hash.get('access_token'), email: u?.email || null }))
        .catch(() => {})
        .finally(tekenIngelogd);
    } else if (sessie()) tekenIngelogd();
    else tekenUit();

    blok.addEventListener('submit', async (e) => {
      if (!e.target.matches('[data-login]')) return;
      e.preventDefault();
      const email = blok.querySelector('#acc-email').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return status('Vul een geldig e-mailadres in.', 'fout');
      if (!blok.querySelector('#acc-ok').checked) return status('Vink aan dat je mails wilt krijgen.', 'fout');
      try {
        await api('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email, create_user: true, options: { emailRedirectTo: `${location.origin}/deals/jagers/` } }) }, anon);
        sessionStorage.setItem('dealbuddy-toestemming', new Date().toISOString());
        status('Kijk in je mail en klik op de inloglink.');
      } catch {
        status('Versturen lukte niet. Probeer het over een paar minuten opnieuw.', 'fout');
      }
    });
    blok.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.matches('[data-uit]')) {
        zetSessie(null);
        tekenUit();
      } else if (b.matches('[data-sync]')) {
        const jagers = (lees('dealbuddy-jagers', []) || []).filter((j) => j.actief);
        if (!jagers.length) return status('Maak eerst een jager hierboven.', 'fout');
        const freq = blok.querySelector('[data-freq]').value;
        let ok = 0;
        for (const j of jagers) {
          try {
            await api('/rest/v1/deals_jachten', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ omschrijving: j.omschrijving.slice(0, 200), criteria: j.criteria, frequentie: freq, toestemming: new Date().toISOString() }) });
            ok++;
          } catch {
            /* bijv. max. 20 jagers */
          }
        }
        status(`${ok} van de ${jagers.length} jager(s) staan op de server.`, ok ? 'ok' : 'fout');
        tekenIngelogd();
      } else if (b.matches('[data-weg]')) {
        try {
          await api('/rest/v1/rpc/account_verwijderen', { method: 'POST', body: '{}' });
          zetSessie(null);
          tekenUit();
          status('Je account, jagers en rapporten zijn verwijderd.');
        } catch {
          status('Verwijderen lukte niet. Mail info@toeslagbuddy.nl, dan doen wij het.', 'fout');
        }
      }
    });
  }
}
