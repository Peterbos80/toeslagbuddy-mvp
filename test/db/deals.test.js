// GESIMULEERDE databasetests (PGlite) voor DealBuddy-jachten met account:
// eigen rijen (RLS), criteria-controle, max. 20 jachten, rapporten alleen
// door de server, afmelden via token en verwijderen met het account.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nieuweDb } from './helpers.js';

const criteria = (extra = {}) => ({ tekst: 'Dior Sauvage 100 ml onder €70', soort: 'product', zoekterm: 'Dior Sauvage', merk: 'Dior', inhoud: { waarde: 100, eenheid: 'ml' }, variant: 'edt', categorie: 'parfum', maxTotaal: 70, minKorting: null, inclusiefVerzending: true, vlucht: null, uitsluiten: ['tester', 'set'], ...extra });
const nieuw = (db, wie, extra = {}) =>
  db.als(wie, `insert into public.deals_jachten (omschrijving, criteria, frequentie, toestemming) values ($1, $2, $3, now()) returning id, afmeld_token`, [extra.omschrijving ?? 'Dior Sauvage', JSON.stringify(extra.criteria ?? criteria()), extra.frequentie ?? 'dag']);
const SERVER = { id: null, rol: 'service_role' };

test('jachten: alleen je eigen rijen zien en wijzigen', async () => {
  const db = await nieuweDb();
  const ann = await db.gebruiker('ann@example.nl');
  const bob = await db.gebruiker('bob@example.nl');
  const [j] = await nieuw(db, ann);
  await nieuw(db, bob, { omschrijving: 'Lego' });
  assert.equal((await db.als(ann, 'select * from public.deals_jachten')).length, 1);
  assert.equal((await db.als(bob, 'select omschrijving from public.deals_jachten'))[0].omschrijving, 'Lego');
  // Bob kan de jacht van Ann niet wijzigen of verwijderen (RLS: 0 rijen)
  assert.equal((await db.als(bob, 'update public.deals_jachten set actief = false where id = $1 returning id', [j.id])).length, 0);
  assert.equal((await db.als(bob, 'delete from public.deals_jachten where id = $1 returning id', [j.id])).length, 0);
  // Geen jacht op naam van een ander
  assert.match(await db.fout(db.als(bob, `insert into public.deals_jachten (user_id, omschrijving, criteria, toestemming) values ($1, 'x', $2, now())`, [ann.id, JSON.stringify(criteria())])), /permission denied|niet_toegestaan|row-level security/);
  // Anoniem: niets
  assert.match(await db.fout(db.als(null, 'select * from public.deals_jachten')), /permission denied/);
  // Eigen jacht pauzeren mag; afmeld_token zelf wijzigen niet
  assert.equal((await db.als(ann, 'update public.deals_jachten set actief = false where id = $1 returning actief', [j.id]))[0].actief, false);
  assert.match(await db.fout(db.als(ann, 'update public.deals_jachten set afmeld_token = gen_random_uuid()')), /permission denied/);
});

test('jachten: criteria worden gecontroleerd, toestemming is verplicht', async () => {
  const db = await nieuweDb();
  const ann = await db.gebruiker('ann@example.nl');
  for (const fout of [criteria({ soort: 'iets' }), criteria({ maxTotaal: -5 }), criteria({ minKorting: 99 }), criteria({ zoekterm: '', merk: null }), { soort: 'vlucht', vlucht: { van: 'Amsterdam', naar: 'LIS' } }, criteria({ zoekterm: 'x'.repeat(5000) })]) {
    assert.match(await db.fout(nieuw(db, ann, { criteria: fout })), /check constraint|violates/, JSON.stringify(fout).slice(0, 60));
  }
  await nieuw(db, ann, { criteria: { soort: 'vlucht', vlucht: { van: 'AMS', naar: 'LIS', maand: '2027-05' }, maxTotaal: 120, minKorting: null } });
  assert.match(await db.fout(db.als(ann, `insert into public.deals_jachten (omschrijving, criteria) values ('x', $1)`, [JSON.stringify(criteria())])), /null value|toestemming/);
  assert.match(await db.fout(nieuw(db, ann, { frequentie: 'minuut' })), /check constraint/);
});

test('jachten: maximaal 20 per gebruiker', async () => {
  const db = await nieuweDb();
  const ann = await db.gebruiker('ann@example.nl');
  for (let i = 0; i < 20; i++) await nieuw(db, ann, { omschrijving: `jacht ${i}` });
  assert.match(await db.fout(nieuw(db, ann)), /max_jachten/);
  const bob = await db.gebruiker('bob@example.nl');
  await nieuw(db, bob);
});

test('rapporten: alleen de server schrijft, de gebruiker leest zijn eigen tijdlijn', async () => {
  const db = await nieuweDb();
  const ann = await db.gebruiker('ann@example.nl');
  const bob = await db.gebruiker('bob@example.nl');
  const [j] = await nieuw(db, ann);
  assert.match(await db.fout(db.als(ann, `insert into public.deals_rapporten (jacht_id, user_id, rapport) values ($1, $2, '{}')`, [j.id, ann.id])), /permission denied/);
  await db.als(SERVER, `insert into public.deals_rapporten (jacht_id, user_id, rapport, gemeld) values ($1, $2, $3, true)`, [j.id, ann.id, JSON.stringify({ oordeel: { tekst: 'Nu kopen' } })]);
  await db.als(SERVER, 'update public.deals_jachten set laatst_gedraaid = now() where id = $1', [j.id]);
  assert.equal((await db.als(ann, 'select rapport from public.deals_rapporten'))[0].rapport.oordeel.tekst, 'Nu kopen');
  assert.equal((await db.als(bob, 'select * from public.deals_rapporten')).length, 0);
  assert.match(await db.fout(db.als(SERVER, `insert into public.deals_rapporten (jacht_id, user_id, rapport) values ($1, $2, $3)`, [j.id, ann.id, JSON.stringify({ x: 'y'.repeat(30000) })])), /check constraint/);
  assert.match(await db.fout(db.als(SERVER, 'update public.deals_jachten set criteria = $1', [JSON.stringify(criteria())])), /permission denied/);
});

test('afmelden via de link in de mail en alles weg met het account', async () => {
  const db = await nieuweDb();
  const ann = await db.gebruiker('ann@example.nl');
  const [j] = await nieuw(db, ann);
  assert.deepEqual(await db.rpc(null, 'deals_afmelden', { p_token: j.afmeld_token }), { ok: true, afgemeld: true });
  assert.deepEqual(await db.rpc(null, 'deals_afmelden', { p_token: j.afmeld_token }), { ok: true, afgemeld: false });
  assert.deepEqual(await db.rpc(null, 'deals_afmelden', { p_token: '00000000-0000-4000-8000-000000000000' }), { ok: true, afgemeld: false });
  await db.als(SERVER, `insert into public.deals_rapporten (jacht_id, user_id, rapport) values ($1, $2, '{}')`, [j.id, ann.id]);
  await db.sql('delete from auth.users where id = $1', [ann.id]);
  assert.equal((await db.sql('select count(*)::int as n from public.deals_jachten'))[0].n, 0);
  assert.equal((await db.sql('select count(*)::int as n from public.deals_rapporten'))[0].n, 0);
});

test('account verwijderen (bestaande functie) neemt jachten en rapporten mee', async () => {
  const db = await nieuweDb();
  const ann = await db.gebruiker('ann@example.nl');
  const [j] = await nieuw(db, ann);
  await db.als(SERVER, `insert into public.deals_rapporten (jacht_id, user_id, rapport) values ($1, $2, '{}')`, [j.id, ann.id]);
  assert.deepEqual(await db.rpc(ann, 'account_verwijderen'), { verwijderd: true });
  assert.equal((await db.sql('select count(*)::int as n from public.deals_jachten'))[0].n, 0);
  assert.equal((await db.sql('select count(*)::int as n from public.deals_rapporten'))[0].n, 0);
});
