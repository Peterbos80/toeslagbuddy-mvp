// Verstuurt formulieren via de webapplicatie (Web3Forms) naar het privé-
// e-mailadres van de beheerder. Dat adres staat nergens op de site.

export async function verstuur(form, extra = {}) {
  const CONFIG = window.TB_FORMULIEREN || {};
  const status = form.querySelector('.formulier-status');
  const zet = (t, soort) => {
    if (!status) return;
    status.textContent = t;
    status.dataset.soort = soort;
  };
  if (form.botcheck && form.botcheck.checked) return false; // spam-robot
  const leeg = [...form.querySelectorAll('[required]')].find((el) => !el.value.trim());
  if (leeg) {
    zet('Vul alle verplichte velden in.', 'fout');
    leeg.focus();
    return false;
  }
  const email = form.querySelector('[type=email]');
  if (email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
    zet('Controleer je e-mailadres.', 'fout');
    email.focus();
    return false;
  }
  if (!CONFIG.accessKey) {
    zet('Dit formulier wordt binnenkort geactiveerd. Probeer het later nog eens.', 'fout');
    return false;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  delete data.botcheck;
  const knop = form.querySelector('button[type=submit]');
  knop.disabled = true;
  zet('Bezig met versturen…', 'bezig');
  try {
    const res = await fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: CONFIG.accessKey,
        subject: `[ToeslagBuddy] ${form.dataset.onderwerp || 'Bericht'}`,
        from_name: 'ToeslagBuddy website',
        formulier: form.dataset.formulier,
        pagina: location.pathname,
        ...data,
        ...extra,
      }),
    });
    const r = await res.json().catch(() => ({}));
    if (!res.ok || r.success === false) throw new Error(r.message || `HTTP ${res.status}`);
    zet('Bedankt! Je bericht is verstuurd. We reageren meestal binnen één werkdag.', 'ok');
    form.reset();
    try {
      window.plausible && window.plausible('Formulier', { props: { soort: form.dataset.formulier } });
    } catch {
      /* meten mag nooit het formulier breken */
    }
    return true;
  } catch {
    zet('Versturen is niet gelukt. Probeer het over een paar minuten opnieuw.', 'fout');
    return false;
  } finally {
    knop.disabled = false;
  }
}

document.querySelectorAll('form[data-formulier]:not([data-eigen-afhandeling])').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    verstuur(form);
  });
});
