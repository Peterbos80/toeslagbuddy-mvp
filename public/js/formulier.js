// Verstuurt formulieren naar de database (Supabase, EU) via de functie
// bericht_plaatsen. Een Edge Function stuurt elk bericht door naar de
// beheerder; diens privé-adres staat nergens op de site. Geen Supabase
// ingesteld? Dan tonen we een link om te mailen naar info@toeslagbuddy.nl.
import { CONFIG } from './config.js';
import { teksten, paginaTaal } from './i18n.js';

const INFO = 'info@toeslagbuddy.nl';
export const MIN_INVULTIJD = 3000; // ms; de database controleert dit ook
const APART = new Set(['email', 'naam', 'bericht', 'botcheck', 'akkoord']);

const T = () => teksten(paginaTaal()).formulier;
const FOUTEN = ['te_veel', 'te_snel', 'ongeldig'];

function zet(form, tekst, soort, mailLink = false) {
  const status = form.querySelector('.formulier-status');
  if (!status) return;
  status.replaceChildren(tekst);
  if (mailLink) {
    const a = document.createElement('a');
    a.href = `mailto:${INFO}`;
    a.textContent = INFO;
    status.append(a, '.');
  }
  status.dataset.soort = soort;
}

// De invultijd telt vanaf het eerste veld dat je aanraakt
export function volgInvultijd(form) {
  const start = () => {
    if (!form.dataset.gestart) form.dataset.gestart = String(Date.now());
  };
  form.addEventListener('focusin', start);
  form.addEventListener('input', start);
}

// Alle overige velden (organisatie, telefoon, …) gaan als regels in de tekst mee
function tekstVan(form) {
  const regels = [];
  for (const [naam, waarde] of new FormData(form).entries()) {
    if (APART.has(naam) || !String(waarde).trim()) continue;
    const veld = form.querySelector(`[name="${naam}"]`);
    const label = veld?.id ? form.querySelector(`label[for="${veld.id}"]`) : null;
    const kop = (label?.childNodes[0]?.textContent || naam).trim();
    regels.push(`${kop}: ${String(waarde).trim()}`);
  }
  const bericht = form.querySelector('[name=bericht]')?.value.trim() || '';
  return [regels.join('\n'), bericht].filter(Boolean).join('\n\n').slice(0, 5000);
}

export async function verstuur(form, extra = {}) {
  // Spam-robot: doe alsof het gelukt is
  if (form.botcheck && form.botcheck.checked) {
    zet(form, T().robot, 'ok');
    return false;
  }
  const leeg = [...form.querySelectorAll('[required]')].find((el) => (el.type === 'checkbox' ? !el.checked : !el.value.trim()));
  if (leeg) {
    zet(form, T().verplicht, 'fout');
    leeg.focus();
    return false;
  }
  const email = form.querySelector('[type=email]');
  if (email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) {
    zet(form, T().email, 'fout');
    email.focus();
    return false;
  }
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    zet(form, T().nietIngesteld, 'fout', true);
    return false;
  }
  const knop = form.querySelector('button[type=submit]');
  if (knop) knop.disabled = true;
  zet(form, T().bezig, 'bezig');
  if (!form.dataset.gestart) form.dataset.gestart = String(Date.now());
  // Heel snel ingevuld (of automatisch)? Dan wachten we even; bots haken hier af
  const wacht = Number(form.dataset.gestart) + MIN_INVULTIJD + 200 - Date.now();
  if (wacht > 0) await new Promise((r) => setTimeout(r, wacht));
  const onderwerp = [form.dataset.onderwerp || 'Bericht', extra.onderwerp].filter(Boolean).join(' – ');
  try {
    const res = await fetch(`${CONFIG.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/bericht_plaatsen`, {
      method: 'POST',
      headers: { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${CONFIG.supabaseAnonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        soort: form.dataset.formulier || 'contact',
        onderwerp: onderwerp.slice(0, 200),
        email: email ? email.value.trim() : '',
        naam: form.querySelector('[name=naam]')?.value.trim() || null,
        tekst: tekstVan(form),
        taal: (document.documentElement.lang || 'nl').startsWith('en') ? 'en' : 'nl',
        gestart_op: new Date(Number(form.dataset.gestart)).toISOString(),
        honeypot: null,
      }),
    });
    if (!res.ok) {
      const r = await res.json().catch(() => ({}));
      const code = FOUTEN.find((k) => String(r.message || '') === k);
      if (code) zet(form, T()[code], 'fout');
      else zet(form, T().mislukt, 'fout', true);
      return false;
    }
    zet(form, T().ok, 'ok');
    form.reset();
    delete form.dataset.gestart;
    try {
      window.plausible && window.plausible('Formulier', { props: { soort: form.dataset.formulier } });
    } catch {
      /* meten mag nooit het formulier breken */
    }
    return true;
  } catch {
    // Geen internet (R1): de invoer blijft staan, opnieuw proberen kan
    zet(form, T().offline, 'fout');
    return false;
  } finally {
    if (knop) knop.disabled = false;
  }
}

document.querySelectorAll('form[data-formulier]').forEach(volgInvultijd);
document.querySelectorAll('form[data-formulier]:not([data-eigen-afhandeling])').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    verstuur(form);
  });
});
