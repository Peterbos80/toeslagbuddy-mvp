// English legal pages: a translation of the privacy statement and a summary of
// the Pro terms. The Dutch texts in juridisch.js are binding; keep both in step
// when one changes (docs/i18n.md). Not legal advice: have a lawyer check them.
import { VERSIE_JURIDISCH } from './juridisch.js';
import { JAAR } from '../calc/params.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mail = (adres) => `<a href="mailto:${adres}">${adres}</a>`;
const PRIVACY_MAIL = 'privacy@toeslagbuddy.nl';
const SECURITY_MAIL = 'security@toeslagbuddy.nl';
const nl = (href, titel) => `<a href="${href}" hreflang="nl" lang="nl">${titel}</a>`;

// Company details; empty fields show 'to follow' so the owner sees what is missing
function gegevensLijst(config) {
  const b = config.bedrijf || {};
  const naam = b.naam || b.handelsnaam || config.naam;
  const handelsnaam = b.handelsnaam || config.naam;
  const plaats = b.adres || b.vestigingsplaats || '';
  const rij = (k, v) => `<li><strong>${k}:</strong> ${v ? esc(v) : '<em>to follow</em>'}</li>`;
  return `<ul>
${rij('Name', naam)}
${handelsnaam !== naam ? rij('Trade name', handelsnaam) : ''}
${rij(b.adres ? 'Business address' : 'Place of business', plaats)}
${rij('Chamber of Commerce (KvK) number', b.kvk || '')}
${rij('VAT identification number', b.btwId || '')}
<li><strong>Email:</strong> ${mail(b.email || 'info@toeslagbuddy.nl')}</li>
<li><strong>Privacy questions:</strong> ${mail(PRIVACY_MAIL)}</li>
<li><strong>Report a security problem:</strong> ${mail(SECURITY_MAIL)}</li>
</ul>`;
}

const tabel = (koppen, rijen, label) =>
  `<div class="tabel-scroll" tabindex="0" role="region" aria-label="${label}"><table class="juridisch-tabel"><thead><tr>${koppen.map((k) => `<th scope="col">${k}</th>`).join('')}</tr></thead><tbody>${rijen
    .map((r) => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;

// What the server stores per Pro check (spec §9, B5)
const TELLINGEN =
  'a band for the number of clients (1–9, 10–49, 50–199 or 200+), the number of signals per type (numbers below 5 as ‘fewer than 5’), amounts only with 10 or more clients and rounded to € 500, the version of the calculation rules and the date';

// ───────────────────────────── PRIVACY (translation) ─────────────────────────────
export function privacyBodyEn({ config }) {
  const a = config.analytics;
  const stats = a.plausibleDomain ? 'Plausible Insights (Estonia; servers in Germany)' : a.goatcounterCode ? 'GoatCounter (EU)' : '';
  const web3forms = !!config.formulieren?.accessKey;
  const hosting =
    config.hosting === 'transip'
      ? ['TransIP (the Netherlands)', 'Data stays in the Netherlands.']
      : ['GitHub Pages (GitHub Inc., United States)', 'GitHub is covered by the EU-US Data Privacy Framework.'];
  const naam = (config.bedrijf && (config.bedrijf.naam || config.bedrijf.handelsnaam)) || config.naam;

  const rijen = [
    ['Calculators and allowances check', 'What you enter: income, rent, assets, children and age', 'Making the calculation', 'Nobody. The calculation happens on your own device. We do not receive this data', 'Not with us'],
    ['Allowance guard for the self-employed', 'Your saved checks (profit, income, date)', 'Your own overview, only if you click ‘Bewaar’ (save)', 'Nobody. It is only stored in your own browser', 'Until you delete it'],
    ['Client list in ToeslagBuddy Pro', 'The client data an office loads', 'The check for the office', 'Nobody. The check runs in the office’s browser. The office itself is responsible for this data', 'Not with us'],
    ['Counts per Pro check', `Per organisation: ${TELLINGEN}. Also which account did the check`, 'Reports and trends for your organisation. Legal basis: contract (Art. 6(1)(b) GDPR)', 'Supabase (database in Frankfurt, Germany)', 'As long as the organisation exists. After cancellation 12 more months, then deleted'],
    ['Pro account', 'Name, business email address, organisation, KvK number (optional), number of clients (optional), role, trial or subscription status, log-in times', 'Providing your account and subscription. Legal basis: contract (b)', 'Supabase (Frankfurt)', 'As long as your account exists. An expired trial without a subscription: 90 days. An account without an organisation: 30 days after the trial ends. Invoices: 7 years (legal retention obligation)'],
    ['Log-in code by email', 'Email address and time', 'Logging in safely without a password. Legal basis: contract (b)', 'Supabase and Brevo (Sendinblue SAS, France) for sending', 'Sending log up to 90 days'],
    ['Audit log', 'Which account did what (invite, change role, extend, delete) and when', 'Security and accountability to your organisation. Legal basis: legitimate interest (f)', 'Supabase (Frankfurt)', '365 days'],
    [
      'Messages through our forms (contact, pilot, subscription, waiting list)',
      'Name, email address, organisation, phone number (optional) and your message',
      'Answering your question or arranging a pilot or subscription. Legal basis: contract or steps before a contract (b), otherwise legitimate interest (f)',
      web3forms
        ? 'Web3Forms (Web3Creative, India). Please note: according to the EU, India does not have an adequate level of protection. We therefore use standard contractual clauses. We are moving to a service in the EU'
        : 'Supabase (Frankfurt) and Brevo (France), which forwards the message to our mailbox',
      'In the database 90 days. In our mailbox as long as needed to handle your question, up to 12 months, unless it leads to a customer relationship',
    ],
    ['Email to info@, privacy@ or security@', 'Your email address and your message', 'Answering your question. Legal basis: legitimate interest (f)', 'Our email provider (forwarding to our mailbox)', 'Up to 12 months, unless it leads to a customer relationship'],
    ['Visiting the website (hosting)', 'IP address, requested page, browser and time in the server log', 'Keeping the website running safely. Legal basis: legitimate interest (f)', `${hosting[0]}. ${hosting[1]}`, 'Decided by the hosting provider; we do not use these logs'],
    [
      'Visitor statistics',
      stats ? 'Anonymous totals: page visited, referring site, country, type of device. No cookies, no IP address stored' : '–',
      stats ? 'Seeing which pages help. Legal basis: legitimate interest (f)' : 'We currently do not use statistics',
      stats ? `${stats}. Not on the Pro and admin pages` : '–',
      stats ? 'Totals only' : '–',
    ],
    [
      'Advertising',
      config.adsense.client ? 'Cookies and advertising IDs, only if you give permission' : '–',
      config.adsense.client ? 'Showing adverts. Legal basis: consent (a)' : 'We currently do not show third-party adverts',
      config.adsense.client ? 'Google Ireland / Google LLC (US, Data Privacy Framework). Not on the Pro and admin pages' : '–',
      config.adsense.client ? 'See Google’s privacy policy; you can withdraw your consent at any time' : '–',
    ],
    ...(config.nieuwsbrief.formAction ? [['Newsletter', 'Email address', 'Sending you the newsletter. Legal basis: consent (a)', 'Our newsletter service', 'Until you unsubscribe']] : []),
  ];

  return `
<p class="let-op"><strong>Translation.</strong> This is an English translation of our ${nl('/privacy/', 'privacyverklaring')}. If the two differ, the Dutch version is binding.</p>
<p class="subtiel">Translation of the Dutch version of ${esc(VERSIE_JURIDISCH)}.</p>
<h2>In short</h2>
<ul>
<li><strong>What you enter in the calculators stays on your own device.</strong> We do not receive it.</li>
<li><strong>Client data of offices does not reach our server.</strong> ToeslagBuddy Pro checks the list in the browser. We only receive aggregated counts per organisation.</li>
<li><strong>We do process data of Pro accounts and of messages</strong> you send us. That data is stored in the EU.</li>
<li><strong>No tracking cookies.</strong> No third-party scripts run on the Pro and admin pages.</li>
</ul>

<h2>Who are we?</h2>
<p>${esc(naam)} is responsible for processing personal data on this website, as described in this privacy statement.</p>
${gegevensLijst(config)}

<h2>Which data, why and for how long?</h2>
${tabel(['Part', 'Which data', 'Why (purpose and legal basis)', 'Who helps us (where)', 'How long'], rijen, 'Which data we process')}

<h2>Storage on your own device</h2>
<p>We do not use tracking cookies. Some parts do store something in your browser’s storage (<code>localStorage</code>). This is needed to make those parts work, so we do not ask for permission. It stays on your device.</p>
<ul>
<li><strong>Allowance guard:</strong> your saved checks, only if you click ‘Bewaar’ (save). Delete them with ‘Alles wissen’ (delete all).</li>
<li><strong>Pro log-in:</strong> your session, so you stay logged in. Removed when you log out.</li>
<li><strong>Pro checks:</strong> the exact trend of your own checks and counts that still need to be sent. Per user, removed when you log out.</li>
<li><strong>Pro demo:</strong> a trial account that only exists in this browser.</li>
</ul>

<h2>Reading aloud and videos</h2>
<p>The read-aloud button and the explanation by a persona only use a voice that runs on your own device. If there is none, you only see the subtitles. That way no text with your amounts goes to a speech service. The AI videos (Dutch only) were made in advance with HeyGen. Your data does not go to HeyGen: your personal amounts are only in the subtitles on your own device.</p>

<h2>Partner links</h2>
<p>Some links to comparison websites are partner links. If you click one and sign up for something, we may receive a fee. You do not pay anything extra. After you click, the privacy rules of that website apply.</p>

<h2>Data outside the EU</h2>
<p>Our database is in the EU (Frankfurt). Supabase is an American company, so the standard contractual clauses of the European Commission apply. ${config.hosting === 'transip' ? '' : 'GitHub (hosting of the website) is covered by the EU-US Data Privacy Framework. '}We never sell your data and we do not use it for profiling or automated decisions.</p>

<h2>Client data of offices</h2>
<p>Do you use ToeslagBuddy Pro as a financial administrator, budget coach or debt counsellor? Then you remain responsible for your clients’ data. The check runs in your own browser. Columns with a name, BSN, date of birth, address, IBAN, email address or phone number are removed automatically. Because client data does not reach our server, we are not a processor for it. More detail is in the ${nl('/pro/beveiliging/', 'beveiligingsfactsheet')} (in Dutch).</p>

<h2>Your rights</h2>
<p>You may ask us:</p>
<ul>
<li>which data we hold about you (access), and for a copy;</li>
<li>to correct or complete your data;</li>
<li>to delete your data;</li>
<li>to do less with your data (restriction);</li>
<li>to give you your data in a file, so you can use it elsewhere (portability).</li>
</ul>
<p>Do we use your data on the basis of legitimate interest? Then you may object. Did you give consent? Then you can always withdraw it.</p>
<p>Do you have a Pro account? Then you can download your data and delete your account yourself in your environment. You can also email us: ${mail(PRIVACY_MAIL)}, in English or Dutch. We reply within one month. Sometimes we ask you to show that the data is yours.</p>
<p><strong>Complaint?</strong> Please tell us first, so we can look for a solution together. You may also always complain to the Dutch Data Protection Authority, the <a href="https://autoriteitpersoonsgegevens.nl/en" rel="noopener">Autoriteit Persoonsgegevens</a>.</p>

<h2>Security and data breaches</h2>
<p>We protect data with appropriate measures, such as encrypted connections, strict access rules in the database and two-factor authentication for administrators. If something does go wrong, we report a data breach to the Autoriteit Persoonsgegevens within 72 hours where required, and we inform you if the risk to you is high.</p>

<h2>Changes</h2>
<p>If anything changes in how we handle data, we update this statement. The date of the latest version is at the top. For major changes affecting Pro customers, we send a message in advance.</p>`;
}

// ───────────────────────────── PRO TERMS (summary) ─────────────────────────────
export function voorwaardenSamenvatting({ config }) {
  const dagen = config.pro?.proefDagen || 7;
  return `
<p class="let-op"><strong>Only the Dutch text is binding.</strong> This page summarises the ${nl('/pro/voorwaarden/', 'Voorwaarden ToeslagBuddy Pro')} (version ${esc(VERSIE_JURIDISCH)}) for English-speaking readers. It is not a translation, and it leaves out details. In case of any difference, the Dutch terms apply.</p>
<h2>Who we are</h2>
${gegevensLijst(config)}
<h2>The main points</h2>
<ol>
<li><strong>Business use only.</strong> Pro is for organisations and professionals (financial administrators, budget coaches, debt counsellors, municipalities). It is not a consumer service. A paid subscription requires a Chamber of Commerce (KvK) number.</li>
<li><strong>Trial and pilot.</strong> The trial lasts ${dagen} days with all features and no payment details. It stops by itself and never turns into a paid subscription automatically. We can extend it to a guided pilot of up to 30 days. Without a subscription, we delete the account and counts 90 days after the trial ends.</li>
<li><strong>Price.</strong> € 1 per client per month, with a minimum of € 99 per month. <strong>All prices exclude VAT.</strong> One organisation shares one subscription.</li>
<li><strong>Payment.</strong> A monthly invoice in advance by email; payment within 14 days. After a reminder, access can be blocked until payment arrives.</li>
<li><strong>Cancelling.</strong> Monthly subscription; you can cancel at the end of any month by email or the contact form. We can cancel with one month’s notice. Counts are deleted 12 months after the end.</li>
<li><strong>Price changes</strong> are announced at least one month in advance; you may then cancel free of charge.</li>
<li><strong>Proper use.</strong> Use your own client numbers. Do not load a BSN, names, dates of birth, addresses, IBAN, email addresses or phone numbers. Keep your log-in to yourself.</li>
<li><strong>Data.</strong> We are the controller for account data. Client data stays in your browser; we only receive aggregated counts (${TELLINGEN}). We are therefore not a processor for client data.</li>
<li><strong>Confidentiality</strong> applies to both parties, also after the subscription ends.</li>
<li><strong>Availability.</strong> We do our best but cannot promise the service never fails. The check in your browser keeps working if our server is unreachable.</li>
<li><strong>Results</strong> are an estimate based on the official rules for ${JAAR}; childcare allowance is an approximation. Always check a signal in Mijn toeslagen. No rights can be derived from the results.</li>
<li><strong>Liability</strong> is limited to direct damage, up to the subscription fees paid in the 12 months before the event. No liability for indirect damage. These limits do not apply in case of intent or deliberate recklessness.</li>
<li><strong>Law and disputes.</strong> Dutch law applies. Disputes go to the competent court in the district where ToeslagBuddy is established. We first try to solve things together.</li>
</ol>
<p>Questions about the terms? Use the <a href="/en/contact/">contact form</a> or email ${mail('info@toeslagbuddy.nl')}.</p>`;
}
