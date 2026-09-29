// Pure hulpfuncties voor de mail (los getest in test/bericht-mail.test.js).

export const AFZENDER = { email: 'info@toeslagbuddy.nl', name: 'ToeslagBuddy website' };

export type Bericht = {
  id: string;
  soort: string;
  onderwerp: string;
  email: string;
  naam: string | null;
  tekst: string;
  taal: string;
  aangemaakt: string;
};

export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

// Geen CR/LF in een mailkop (header-injectie), en niet te lang
export function schoonOnderwerp(s: unknown): string {
  return String(s ?? '').replace(/[\r\n\t\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || 'Bericht';
}

export function geldigEmail(s: unknown): boolean {
  return typeof s === 'string' && s.length <= 254 && /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(s);
}

// Brevo transactional e-mail (POST https://api.brevo.com/v3/smtp/email)
export function maakMail(b: Bericht, naar: string) {
  const onderwerp = `[ToeslagBuddy] ${schoonOnderwerp(b.onderwerp)}`;
  const regels: [string, string][] = [
    ['Soort', b.soort],
    ['Naam', b.naam ?? ''],
    ['E-mail', b.email],
    ['Taal', b.taal],
    ['Ontvangen', b.aangemaakt],
  ];
  const html =
    `<table>${regels.map(([k, v]) => `<tr><th align="left">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table>` +
    `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(b.tekst)}</pre>` +
    `<p style="color:#666">Antwoord altijd vanaf info@toeslagbuddy.nl (send-as), niet vanaf je privé-adres.</p>`;
  const tekst = `${regels.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${b.tekst}`;
  return {
    sender: AFZENDER,
    to: [{ email: naar }],
    ...(geldigEmail(b.email) ? { replyTo: { email: b.email, ...(b.naam ? { name: schoonOnderwerp(b.naam).slice(0, 70) } : {}) } } : {}),
    subject: onderwerp,
    htmlContent: html,
    textContent: tekst,
    tags: ['formulier', b.soort].map((t) => schoonOnderwerp(t).slice(0, 40)),
  };
}

// Vergelijkt twee geheimen in constante tijd (via hun sha256)
export async function gelijkGeheim(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const ax = new Uint8Array(x);
  const ay = new Uint8Array(y);
  let verschil = a.length === 0 || b.length === 0 ? 1 : 0;
  for (let i = 0; i < ax.length; i++) verschil |= ax[i] ^ ay[i];
  return verschil === 0;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
