// Gesimuleerde databasetests (PGlite, nagebootste Supabase-auth): rechten,
// RLS en isolatie tussen organisaties. Zie test/db/helpers.js.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { nieuweDb, aggregaat } from './helpers.js';

let db, a, b, lidA;
before(async () => {
  db = await nieuweDb();
  a = await db.eigenaar('eigenaar@kantoor-a.nl', 'Kantoor A');
  b = await db.eigenaar('eigenaar@kantoor-b.nl', 'Kantoor B');
  lidA = await db.gebruiker('lid@kantoor-a.nl');
  const token = await db.rpc(a, 'uitnodiging_maken', { email: lidA.email });
  await db.rpc(lidA, 'uitnodiging_accepteren', { token });
  await db.rpc(a, 'controle_opslaan', { gegevens: aggregaat() });
  await db.rpc(b, 'controle_opslaan', { gegevens: aggregaat() });
});

const TABELLEN = ['pro_profielen', 'organisaties', 'leden', 'uitnodigingen', 'controles', 'berichten', 'beheerders', 'audit_log', 'rate_limit'];

test('RLS staat aan op elke tabel', async () => {
  const rijen = await db.sql(
    `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'private') and c.relkind = 'r'`,
  );
  assert.ok(rijen.length >= TABELLEN.length + 1);
  for (const r of rijen) assert.equal(r.relrowsecurity, true, r.relname);
});

test('elke security-definer-functie heeft een lege search_path', async () => {
  const rijen = await db.sql(
    `select p.proname, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef`,
  );
  assert.ok(rijen.length > 20);
  for (const r of rijen) assert.deepEqual(r.proconfig, ['search_path=""'], r.proname);
});

test('anon: geen tabellen lezen en alleen bericht_plaatsen uitvoeren', async () => {
  for (const t of TABELLEN) {
    assert.match(await db.fout(db.als(null, `select * from public.${t}`)), /permission denied/, t);
  }
  for (const f of ['mijn_omgeving()', 'mijn_gegevens()', 'account_verwijderen()', 'beheer_statistieken()', 'beheer_organisaties()']) {
    assert.match(await db.fout(db.als(null, `select public.${f}`)), /permission denied/, f);
  }
  assert.match(await db.fout(db.als(null, `select public.controle_opslaan('{}'::jsonb)`)), /permission denied/);
  assert.match(await db.fout(db.als(null, `select public.organisatie_aanmaken('x')`)), /permission denied/);
  assert.match(await db.fout(db.als(null, `select private.is_beheerder()`)), /permission denied/);
  assert.match(await db.fout(db.als(null, `select private.opruimen()`)), /permission denied/);
  // Alleen deze functie is voor anon
  const rijen = await db.sql(
    `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute')`,
  );
  assert.deepEqual(rijen.map((r) => r.proname), ['bericht_plaatsen']);
});

test('authenticated: interne functies en beheerfuncties zijn dicht', async () => {
  for (const f of ['private.opruimen()', 'private.berichten_opnieuw()', `private.log('x', null, null)`, `private.tel('x', 1)`, 'private.is_beheerder()']) {
    assert.match(await db.fout(db.als(a, `select ${f}`)), /permission denied/, f);
  }
  for (const f of ['beheer_statistieken', 'beheer_organisaties', 'beheer_berichten']) {
    assert.match(await db.fout(db.rpc(a, f)), /geen_beheerder/, f);
  }
  assert.match(await db.fout(db.rpc(a, 'beheer_verlengen_pilot', { org: a.org })), /geen_beheerder/);
  assert.match(await db.fout(db.rpc(a, 'beheer_abonnement_zetten', { org: a.org, status: 'actief' })), /geen_beheerder/);
});

test('R12: een lid ziet en wijzigt niets van een andere organisatie', async () => {
  for (const [t, kolom] of [['organisaties', 'id'], ['leden', 'organisatie_id'], ['controles', 'organisatie_id']]) {
    const rijen = await db.als(b, `select ${kolom} as org from public.${t}`);
    assert.ok(rijen.length > 0, t);
    assert.ok(rijen.every((r) => r.org === b.org), `${t} lekt`);
  }
  const profielen = await db.als(b, 'select id from public.pro_profielen');
  assert.deepEqual(profielen.map((r) => r.id), [b.id]);
  const audit = await db.als(b, 'select organisatie_id, wie from public.audit_log');
  assert.ok(audit.every((r) => r.organisatie_id === b.org || r.wie === b.id));
  // Direct schrijven kan niet; via functies alleen binnen de eigen organisatie
  assert.match(await db.fout(db.als(b, `insert into public.leden (organisatie_id, user_id, rol) values ($1, $2, 'lid')`, [a.org, b.id])), /permission denied/);
  assert.match(await db.fout(db.als(b, `insert into public.controles (id, organisatie_id, clienten_band, met_actie, signalen, rekenversie) values (gen_random_uuid(), $1, '1-9', -1, '{}', '2026.20260928')`, [a.org])), /permission denied/);
  assert.match(await db.fout(db.rpc(b, 'lid_verwijderen', { lid: lidA.id })), /geen_toegang/);
  assert.match(await db.fout(db.rpc(b, 'eigendom_overdragen', { lid: lidA.id })), /geen_toegang/);
  // Een controle-id van een andere organisatie hergebruiken lukt niet
  const [{ id }] = await db.sql('select id from public.controles where organisatie_id = $1', [a.org]);
  assert.match(await db.fout(db.rpc(b, 'controle_opslaan', { gegevens: aggregaat({ id }) })), /ongeldig/);
  // Een lid (geen eigenaar) kan niet uitnodigen of de organisatie wijzigen
  assert.match(await db.fout(db.rpc(lidA, 'uitnodiging_maken', { email: 'x@y.nl' })), /geen_eigenaar/);
  assert.match(await db.fout(db.rpc(lidA, 'organisatie_bijwerken', { naam: 'Overgenomen' })), /geen_eigenaar/);
  // Uitnodigingen (met token-hash) zijn voor niemand direct leesbaar
  assert.match(await db.fout(db.als(a, 'select * from public.uitnodigingen')), /permission denied/);
});

test('R13: niemand wijzigt zijn eigen abonnement of proef_eind', async () => {
  assert.match(await db.fout(db.als(a, `update public.organisaties set abonnement = 'actief' where id = $1`, [a.org])), /permission denied/);
  assert.match(await db.fout(db.als(a, `update public.organisaties set proef_eind = now() + interval '1 year' where id = $1`, [a.org])), /permission denied/);
  assert.match(await db.fout(db.als(a, `update public.leden set rol = 'eigenaar' where user_id = $1`, [lidA.id])), /permission denied/);
  assert.match(await db.fout(db.als(a, `delete from public.organisaties where id = $1`, [a.org])), /permission denied/);
  // De eigenaar mag alleen de naam en het KvK-nummer wijzigen
  const omg = await db.rpc(a, 'organisatie_bijwerken', { naam: 'Kantoor A BV', kvk: '1234 5678' });
  assert.equal(omg.organisatie.naam, 'Kantoor A BV');
  assert.equal(omg.organisatie.kvk, '12345678');
  assert.equal(omg.organisatie.abonnement, 'proef');
  assert.match(await db.fout(db.rpc(a, 'organisatie_bijwerken', { naam: 'x', kvk: 'abc' })), /ongeldig_kvk/);
  assert.match(await db.fout(db.rpc(a, 'organisatie_bijwerken', { naam: '  ' })), /ongeldige_naam/);
  assert.match(await db.fout(db.als(a, `update public.pro_profielen set naam = 'x' where id = $1`, [a.id])), /permission denied/);
});

test('auditlog: regels worden geschreven en zijn niet te wijzigen of te wissen', async () => {
  const acties = (await db.sql('select actie from public.audit_log where organisatie_id = $1', [a.org])).map((r) => r.actie);
  for (const x of ['organisatie_aangemaakt', 'uitnodiging_gemaakt', 'uitnodiging_geaccepteerd', 'controle_opgeslagen', 'organisatie_bijgewerkt']) {
    assert.ok(acties.includes(x), x);
  }
  assert.match(await db.fout(db.als(a, 'delete from public.audit_log')), /permission denied/);
  assert.match(await db.fout(db.als(a, `update public.audit_log set actie = 'weg'`)), /permission denied/);
  assert.match(await db.fout(db.als(a, `insert into public.audit_log (actie) values ('nep')`)), /permission denied/);
  assert.match(await db.fout(db.als(null, 'delete from public.audit_log')), /permission denied/);
  // Een lid ziet alleen zijn eigen auditregels, de eigenaar die van de organisatie
  const vanLid = await db.als(lidA, 'select wie from public.audit_log');
  assert.ok(vanLid.length > 0 && vanLid.every((r) => r.wie === lidA.id));
  const vanEigenaar = await db.als(a, 'select organisatie_id from public.audit_log');
  assert.ok(vanEigenaar.length >= acties.length);
});

test('een gebruiker zonder account (JWT nog geldig) kan niets', async () => {
  const spook = { id: crypto.randomUUID(), email: 'spook@x.nl' };
  assert.match(await db.fout(db.rpc(spook, 'mijn_omgeving')), /niet_ingelogd/);
  assert.match(await db.fout(db.rpc(spook, 'organisatie_aanmaken', { naam: 'x' })), /niet_ingelogd/);
});
