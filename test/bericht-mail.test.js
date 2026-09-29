// De mail van de Edge Function bericht-doorsturen: HTML ge-escaped, geen
// CR/LF in het onderwerp, antwoord-aan de afzender, afzender info@.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// .ts-bestanden laden kan in Node 22.18+ (type stripping); anders overslaan
let mail = null;
try {
  mail = await import('../supabase/functions/bericht-doorsturen/mail.ts');
} catch {
  mail = null;
}
const t = mail ? test : test.skip;

const bericht = {
  id: '00000000-0000-4000-8000-000000000000',
  soort: 'contact',
  onderwerp: 'Hallo\r\nBcc: slachtoffer@example.nl',
  email: 'jan@example.nl',
  naam: 'Jan <b>',
  tekst: '<img src=x onerror=alert(1)> & "groet"',
  taal: 'nl',
  aangemaakt: '2026-09-30T10:00:00Z',
};

t('mail: veilig opgebouwd voor Brevo', () => {
  const m = mail.maakMail(bericht, 'prive@example.org');
  assert.deepEqual(m.sender, { email: 'info@toeslagbuddy.nl', name: 'ToeslagBuddy website' });
  assert.deepEqual(m.to, [{ email: 'prive@example.org' }]);
  assert.equal(m.replyTo.email, 'jan@example.nl');
  assert.equal(m.subject, '[ToeslagBuddy] Hallo Bcc: slachtoffer@example.nl');
  assert.ok(!/[\r\n]/.test(m.subject));
  assert.ok(!m.htmlContent.includes('<img'));
  assert.ok(m.htmlContent.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;groet&quot;'));
  assert.ok(m.htmlContent.includes('Jan &lt;b&gt;'));
});

t('mail: ongeldig afzenderadres geeft geen reply-to', () => {
  const m = mail.maakMail({ ...bericht, email: 'x@y.nl>\r\nBcc: z@z.nl' }, 'prive@example.org');
  assert.equal(m.replyTo, undefined);
});

t('mail: geheimen vergelijken', async () => {
  assert.equal(await mail.gelijkGeheim('abc', 'abc'), true);
  assert.equal(await mail.gelijkGeheim('abc', 'abd'), false);
  assert.equal(await mail.gelijkGeheim('', ''), false);
  assert.ok(mail.UUID.test(bericht.id));
});
