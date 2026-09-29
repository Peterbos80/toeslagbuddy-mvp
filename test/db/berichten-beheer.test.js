// Gesimuleerde databasetests (PGlite, nagebootste Supabase-auth): berichten
// van de formulieren, beheer met MFA en bewaartermijnen. Zie test/db/helpers.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nieuweDb, aggregaat } from './helpers.js';

const eerder = (sec = 30) => new Date(Date.now() - sec * 1000).toISOString();
const bericht = (extra = {}) => ({ soort: 'contact', onderwerp: 'Vraag over zorgtoeslag', email: 'jan@example.nl', naam: 'Jan', tekst: 'Hallo', taal: 'nl', gestart_op: eerder(), ...extra });
const aantal = async (db) => (await db.sql('select count(*)::int as n from public.berichten'))[0].n;

test('berichten: anoniem plaatsen, maar niet lezen', async () => {
  const db = await nieuweDb();
  assert.deepEqual(await db.rpc(null, 'bericht_plaatsen', bericht({ onderwerp: 'Regel 1\r\nBcc: x@y.nl' })), { ok: true });
  const [b] = await db.sql('select * from public.berichten');
  assert.equal(b.onderwerp, 'Regel 1 Bcc: x@y.nl', 'CR/LF uit het onderwerp');
  assert.equal(b.doorgestuurd, false);
  assert.equal(b.pogingen, 0, 'zonder pg_net en instellingen wordt niets verstuurd');
  assert.match(await db.fout(db.als(null, 'select * from public.berichten')), /permission denied/);
  assert.match(await db.fout(db.als(null, `insert into public.berichten (soort, onderwerp, email) values ('x', 'y', 'z@z.nl')`)), /permission denied/);
  // De Edge Function (service_role, alleen als geheim in Supabase) zet 'doorgestuurd'
  await db.als({ id: null, rol: 'service_role' }, 'update public.berichten set doorgestuurd = true');
  assert.equal((await db.sql('select doorgestuurd from public.berichten'))[0].doorgestuurd, true);
});

test('R14: honeypot, minimale invultijd en grenzen op lengte', async () => {
  const db = await nieuweDb();
  // Honeypot: lijkt gelukt, maar er wordt niets opgeslagen
  assert.deepEqual(await db.rpc(null, 'bericht_plaatsen', bericht({ honeypot: 'on' })), { ok: true });
  assert.equal(await aantal(db), 0);
  assert.match(await db.fout(db.rpc(null, 'bericht_plaatsen', bericht({ gestart_op: eerder(1) }))), /te_snel/);
  assert.match(await db.fout(db.rpc(null, 'bericht_plaatsen', bericht({ gestart_op: null }))), /te_snel/);
  for (const fout of [{ tekst: 'x'.repeat(5001) }, { email: 'geen-adres' }, { onderwerp: '' }, { naam: 'x'.repeat(201) }, { soort: 'Contact <script>' }, { taal: 'de' }]) {
    assert.match(await db.fout(db.rpc(null, 'bericht_plaatsen', bericht(fout))), /ongeldig/, JSON.stringify(fout).slice(0, 40));
  }
  assert.equal(await aantal(db), 0);
  assert.deepEqual(await db.rpc(null, 'bericht_plaatsen', bericht({ tekst: 'x'.repeat(5000) })), { ok: true });

  // Klok van de bezoeker loopt voor: geen robotsignaal, dus toegestaan
  assert.deepEqual(await db.rpc(null, 'bericht_plaatsen', bericht({ gestart_op: new Date(Date.now() + 5 * 60000).toISOString(), email: 'klok@example.nl' })), { ok: true });
});

test('R14: maximaal 3 per uur per e-mailadres en 30 per uur in totaal', async () => {
  const db = await nieuweDb();
  for (let i = 0; i < 3; i++) await db.rpc(null, 'bericht_plaatsen', bericht({ email: 'Spam@Example.nl' }));
  assert.match(await db.fout(db.rpc(null, 'bericht_plaatsen', bericht({ email: 'spam@example.nl' }))), /te_veel/);
  // Per IP-adres (als de header er is): maximaal 10 per uur
  const ip = { id: null, rol: 'anon', headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } };
  for (let i = 0; i < 10; i++) await db.rpc(ip, 'bericht_plaatsen', bericht({ email: `ip${i}@example.nl` }));
  assert.match(await db.fout(db.rpc(ip, 'bericht_plaatsen', bericht({ email: 'ip-extra@example.nl' }))), /te_veel/);
  // Globaal: 30 per uur (13 gelukt tot nu toe)
  for (let i = 0; i < 17; i++) await db.rpc(null, 'bericht_plaatsen', bericht({ email: `bezoeker${i}@example.nl` }));
  assert.equal(await aantal(db), 30);
  assert.match(await db.fout(db.rpc(null, 'bericht_plaatsen', bericht({ email: 'nummer31@example.nl' }))), /te_veel/);
  // De teller bewaart geen e-mailadressen, alleen hashes
  const sleutels = (await db.sql('select sleutel from public.rate_limit')).map((r) => r.sleutel);
  assert.ok(sleutels.every((s) => /^[0-9a-f]{64}$/.test(s)));
});

test('R15: beheerfuncties vergen de beheerderslijst, aal2 én een geverifieerde factor', async () => {
  const db = await nieuweDb();
  const org = await db.eigenaar('klant@kantoor.nl');
  const beh = await db.gebruiker('ik@toeslagbuddy.nl');
  const zonderLijst = await db.gebruiker('ander@toeslagbuddy.nl');
  await db.sql('insert into public.beheerders (user_id) values ($1)', [beh.id]);
  // Geen MFA-factor, geen aal2
  assert.match(await db.fout(db.rpc(beh, 'beheer_statistieken')), /geen_beheerder/);
  // aal2 in de JWT maar geen geverifieerde factor
  assert.match(await db.fout(db.rpc({ ...beh, aal: 'aal2' }, 'beheer_statistieken')), /geen_beheerder/);
  await db.sql(`insert into auth.mfa_factors (user_id, status) values ($1, 'unverified')`, [beh.id]);
  assert.match(await db.fout(db.rpc({ ...beh, aal: 'aal2' }, 'beheer_statistieken')), /geen_beheerder/);
  await db.sql(`update auth.mfa_factors set status = 'verified' where user_id = $1`, [beh.id]);
  // Factor wel, maar ingelogd op aal1
  assert.match(await db.fout(db.rpc(beh, 'beheer_statistieken')), /geen_beheerder/);
  // Niet in de lijst, wel aal2 en factor
  await db.sql(`insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`, [zonderLijst.id]);
  assert.match(await db.fout(db.rpc({ ...zonderLijst, aal: 'aal2' }, 'beheer_organisaties')), /geen_beheerder/);
  // Alles in orde
  const mfa = { ...beh, aal: 'aal2' };
  const stat = await db.rpc(mfa, 'beheer_statistieken');
  assert.equal(stat.organisaties, 1);
  assert.equal(stat.proeven, 1);
  // Een beheerder krijgt geen proeforganisatie en ziet geen tabellen direct
  assert.match(await db.fout(db.rpc(beh, 'organisatie_aanmaken', { naam: 'Mijn proef' })), /beheerder_geen_organisatie/);
  assert.equal((await db.rpc(beh, 'mijn_omgeving')).beheerder, true);
  assert.match(await db.fout(db.als(mfa, 'select * from public.beheerders')), /permission denied/);
  assert.ok(org.org);
});

test('beheer: statistieken, verlengen tot pilot, actief (met KvK) en opgezegd', async () => {
  const db = await nieuweDb();
  const beh = await db.gebruiker('ik@toeslagbuddy.nl');
  await db.sql('insert into public.beheerders (user_id) values ($1)', [beh.id]);
  await db.sql(`insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`, [beh.id]);
  const mfa = { ...beh, aal: 'aal2' };
  const a = await db.eigenaar('a@kantoor.nl', '<img src=x onerror="window.__xss=1">');
  await db.rpc(a, 'controle_opslaan', { gegevens: aggregaat() });
  await db.rpc(null, 'bericht_plaatsen', bericht());
  await db.sql(`update public.organisaties set proef_eind = now() - interval '1 day' where id = $1`, [a.org]);

  let stat = await db.rpc(mfa, 'beheer_statistieken');
  assert.equal(stat.verlopen, 1);
  assert.equal(stat.geactiveerd, 1);
  assert.equal(stat.controles_per_week.reduce((t, w) => t + w.aantal, 0), 1);
  assert.equal(stat.berichten_nieuw, 1);
  assert.equal(stat.berichten_niet_doorgestuurd, 1);
  const orgs = await db.rpc(mfa, 'beheer_organisaties');
  assert.equal(orgs[0].naam, '<img src=x onerror="window.__xss=1">', 'naam ongewijzigd opgeslagen; de browser toont het als tekst');
  assert.equal(orgs[0].eigenaar, 'a@kantoor.nl');
  assert.equal((await db.rpc(mfa, 'beheer_berichten'))[0].doorgestuurd, false);

  // Verlengen tot pilot: 30 dagen vanaf nu
  const na = (await db.rpc(mfa, 'beheer_verlengen_pilot', { org: a.org }))[0];
  assert.equal(na.status, 'pilot');
  const dagen = (new Date(na.proef_eind) - Date.now()) / 86400000;
  assert.ok(dagen > 29.9 && dagen <= 30, String(dagen));
  assert.equal((await db.rpc(a, 'mijn_omgeving')).organisatie.toegang, true);

  // Actief kan pas met een KvK-nummer
  assert.match(await db.fout(db.rpc(mfa, 'beheer_abonnement_zetten', { org: a.org, status: 'actief' })), /kvk_verplicht/);
  assert.match(await db.fout(db.rpc(mfa, 'beheer_abonnement_zetten', { org: a.org, status: 'gratis' })), /ongeldig/);
  await db.rpc(a, 'organisatie_bijwerken', { naam: 'Kantoor A', kvk: '12345678' });
  assert.equal((await db.rpc(mfa, 'beheer_abonnement_zetten', { org: a.org, status: 'actief' }))[0].status, 'actief');
  assert.match(await db.fout(db.rpc(mfa, 'beheer_verlengen_pilot', { org: a.org })), /al_actief/);
  assert.equal((await db.rpc(mfa, 'beheer_abonnement_zetten', { org: a.org, status: 'opgezegd' }))[0].status, 'opgezegd');
  assert.equal((await db.rpc(a, 'mijn_omgeving')).organisatie.toegang, false);
  assert.match(await db.fout(db.rpc(mfa, 'beheer_verlengen_pilot', { org: crypto.randomUUID() })), /niet_gevonden/);

  const acties = (await db.sql('select actie, wie from public.audit_log where organisatie_id = $1 and wie = $2', [a.org, beh.id])).map((r) => r.actie);
  assert.deepEqual(acties.sort(), ['abonnement_gezet', 'abonnement_gezet', 'pilot_verlengd']);
  stat = await db.rpc(mfa, 'beheer_statistieken');
  assert.equal(stat.opgezegd, 1);
});

test('bewaartermijnen: berichten 90 dagen, audit 365 dagen, verlopen proef 90 dagen', async () => {
  const db = await nieuweDb();
  const oud = await db.eigenaar('oud@kantoor.nl');
  const nieuw = await db.eigenaar('nieuw@kantoor.nl');
  await db.rpc(null, 'bericht_plaatsen', bericht());
  await db.rpc(null, 'bericht_plaatsen', bericht({ email: 'b@example.nl' }));
  await db.sql(`update public.berichten set aangemaakt = now() - interval '91 days' where email = 'jan@example.nl'`);
  await db.sql(`update public.audit_log set wanneer = now() - interval '366 days' where organisatie_id = $1`, [nieuw.org]);
  await db.sql(`update public.rate_limit set venster = now() - interval '2 days'`);
  await db.sql(`update public.organisaties set proef_eind = now() - interval '91 days' where id = $1`, [oud.org]);
  // Accounts zonder organisatie: na 90 dagen weg, beheerders nooit
  const [wees] = await db.sql(`insert into auth.users (email, created_at) values ('wees@example.nl', now() - interval '91 days') returning id`);
  const [beh] = await db.sql(`insert into auth.users (email, created_at) values ('beheer@example.nl', now() - interval '91 days') returning id`);
  await db.sql('insert into public.beheerders (user_id) values ($1)', [beh.id]);
  const r = await db.sql('select private.opruimen() as r');
  assert.deepEqual(r[0].r, { berichten: 1, audit: 1, rate_limit: 3, proeven: 1, controles: 0 });
  const over = (await db.sql('select email from auth.users where id in ($1, $2)', [wees.id, beh.id])).map((x) => x.email);
  assert.deepEqual(over, ['beheer@example.nl']);
  assert.deepEqual((await db.sql('select email from public.berichten')).map((x) => x.email), ['b@example.nl']);
  assert.equal((await db.sql('select count(*)::int as n from public.organisaties'))[0].n, 1);
  // Opnieuw doorsturen zonder pg_net: geen fout, niets verstuurd
  await db.sql(`update public.berichten set aangemaakt = now() - interval '1 hour'`);
  await db.sql(`insert into private.instellingen values ('doorstuur_url', 'https://voorbeeld.supabase.co/functions/v1/bericht-doorsturen'), ('webhook_geheim', 'test')`);
  assert.equal((await db.sql('select private.berichten_opnieuw() as n'))[0].n, 1);
  assert.equal((await db.sql('select pogingen from public.berichten'))[0].pogingen, 0);
});
