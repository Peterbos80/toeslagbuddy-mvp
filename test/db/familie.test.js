// GESIMULEERDE databasetests (PGlite) voor ToeslagBuddy Familie: alleen leden
// zien een dossier, rollen bepalen wat mag, het logboek is alleen-toevoegen
// met een hash-keten, een BSN wordt geweigerd en een partner ziet geen inhoud.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nieuweDb } from './helpers.js';
import { voegToe } from '../../src/familie/logboek.js';

const SERVER = { id: null, rol: 'service_role' };
const dossier = async (db, wie, naam = 'Pa') => (await db.als(wie, `insert into public.familie_dossiers (naam, geboortejaar) values ($1, 1942) returning id`, [naam]))[0].id;
const item = (db, wie, d, soort, inhoud) => db.als(wie, `insert into public.familie_items (dossier_id, soort, inhoud) values ($1, $2, $3) returning id`, [d, soort, JSON.stringify(inhoud)]);
async function metFamilie() {
  const db = await nieuweDb();
  const ann = await db.gebruiker('ann@example.nl');
  const bob = await db.gebruiker('bob@example.nl');
  const eva = await db.gebruiker('eva@example.nl');
  const d = await dossier(db, ann);
  await db.als(ann, `select public.familie_uitnodigen($1, 'Bob@Example.nl', 'Bob', 'meekijker')`, [d]);
  assert.equal((await db.als(bob, 'select public.familie_aannemen() as n'))[0].n, 1);
  return { db, ann, bob, eva, d };
}

test('dossier: de maker wordt regelaar; alleen leden zien het dossier', async () => {
  const { db, ann, bob, eva, d } = await metFamilie();
  assert.deepEqual((await db.als(ann, 'select naam, rol from public.familie_leden order by toegevoegd')).map((l) => l.rol), ['regelaar', 'meekijker']);
  assert.equal((await db.als(bob, 'select id from public.familie_dossiers')).length, 1);
  assert.equal((await db.als(eva, 'select id from public.familie_dossiers')).length, 0);
  assert.equal((await db.als(eva, 'select id from public.familie_leden')).length, 0);
  assert.match(await db.fout(db.als(null, 'select * from public.familie_dossiers')), /permission denied/);
  // Abonnement en eigenaar kan een gebruiker niet zelf zetten
  assert.match(await db.fout(db.als(ann, `update public.familie_dossiers set abonnement = 'familie' where id = $1`, [d])), /permission denied/);
  // Een meekijker kan het dossier niet wijzigen of verwijderen
  assert.equal((await db.als(bob, `update public.familie_dossiers set naam = 'x' where id = $1 returning id`, [d])).length, 0);
  assert.equal((await db.als(bob, `delete from public.familie_dossiers where id = $1 returning id`, [d])).length, 0);
  // Een buitenstaander kan niemand uitnodigen
  assert.match(await db.fout(db.als(eva, `select public.familie_uitnodigen($1, 'x@example.nl', 'X', 'regelaar')`, [d])), /niet_toegestaan/);
  assert.match(await db.fout(db.als(bob, `select public.familie_uitnodigen($1, 'x@example.nl', 'X', 'regelaar')`, [d])), /niet_toegestaan/);
});

test('items: rollen, geen BSN, en een ingetrokken lid ziet direct niets meer', async () => {
  const { db, ann, bob, eva, d } = await metFamilie();
  const [c] = await item(db, ann, d, 'contracten', { naam: 'Energie', perMaandCent: 14500 });
  // Meekijker: lezen, taken toevoegen en oppakken; geen contracten wijzigen of verwijderen
  assert.equal((await db.als(bob, 'select id from public.familie_items')).length, 1);
  const [t] = await item(db, bob, d, 'taken', { titel: 'Paspoort verlengen' });
  assert.match(await db.fout(item(db, bob, d, 'contracten', { naam: 'x' })), /row-level security/);
  assert.equal((await db.als(bob, `update public.familie_items set inhoud = '{"naam":"gehackt"}' where id = $1 returning id`, [c.id])).length, 0);
  assert.equal((await db.als(bob, `update public.familie_items set inhoud = '{"titel":"Paspoort","wie":"bob"}' where id = $1 returning id`, [t.id])).length, 1);
  assert.equal((await db.als(bob, `delete from public.familie_items where id = $1 returning id`, [t.id])).length, 0);
  // Buitenstaander: niets
  assert.match(await db.fout(item(db, eva, d, 'taken', { titel: 'x' })), /row-level security/);
  // Een BSN (elfproef) wordt geweigerd, ook met punten; een bedrag niet
  assert.match(await db.fout(item(db, ann, d, 'contacten', { naam: 'CAK', notitie: 'BSN 111222333' })), /bsn_niet_toegestaan/);
  assert.match(await db.fout(item(db, ann, d, 'contacten', { naam: 'CAK', notitie: 'nummer 1112.22.333' })), /bsn_niet_toegestaan/);
  await item(db, ann, d, 'contacten', { naam: 'CAK', notitie: 'klantnummer 111222334, bedrag 111222333,00' });
  // Onbekende soort en te grote inhoud
  assert.match(await db.fout(item(db, ann, d, 'geheim', {})), /check constraint/);
  assert.match(await db.fout(item(db, ann, d, 'brieven', { tekst: 'x'.repeat(31000) })), /check constraint/);
  // Intrekken: Bob ziet meteen niets meer
  const [lid] = await db.als(ann, `select id from public.familie_leden where rol = 'meekijker'`);
  await db.als(ann, `select public.familie_lid_wijzigen($1, null, true)`, [lid.id]);
  assert.equal((await db.als(bob, 'select id from public.familie_items')).length, 0);
  assert.equal((await db.als(bob, 'select id from public.familie_dossiers')).length, 0);
  // De laatste regelaar kan niet weg
  const [zelf] = await db.als(ann, `select id from public.familie_leden where rol = 'regelaar'`);
  assert.match(await db.fout(db.als(ann, `select public.familie_lid_wijzigen($1, null, true)`, [zelf.id])), /laatste_regelaar/);
  // Audit: zichtbaar voor leden, zonder inhoud
  const audit = await db.als(ann, 'select actie, object from public.familie_audit order by id');
  assert.ok(audit.some((a) => a.object === 'contracten' && a.actie === 'insert'));
  assert.equal((await db.als(eva, 'select id from public.familie_audit')).length, 0);
});

test('logboek: alleen toevoegen, de keten moet aansluiten, wijzigen en verwijderen kan niemand', async () => {
  const { db, ann, bob, d } = await metFamilie();
  const leg = (wie, r) => db.als(wie, `insert into public.familie_logboek (id, dossier_id, datum, bedrag_cent, richting, categorie, omschrijving, door_naam, corrigeert_id, vorige_hash, hash) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`, [r.id, d, r.datum, r.bedragCent, r.richting, r.categorie, r.omschrijving, r.door || '', r.corrigeertId, r.vorigeHash, r.hash]);
  const regels = [];
  regels.push(await voegToe(regels, { datum: '2026-11-03', bedragCent: 4250, richting: 'uit', categorie: 'boodschappen', omschrijving: 'Boodschappen', door: 'Ann' }));
  await leg(ann, regels[0]);
  regels.push(await voegToe(regels, { datum: '2026-11-07', bedragCent: 10000, richting: 'uit', categorie: 'contant', omschrijving: 'Opname', door: 'Bob' }));
  await leg(bob, regels[1]); // een meekijker mag vastleggen
  // Een regel die niet op de vorige aansluit, wordt geweigerd
  const los = await voegToe([], { datum: '2026-11-08', bedragCent: 500, richting: 'uit', categorie: 'overig', omschrijving: 'Los' });
  assert.match(await db.fout(leg(ann, los)), /keten_sluit_niet_aan/);
  // Wijzigen en verwijderen: geen recht, ook niet voor de regelaar of de server
  assert.match(await db.fout(db.als(ann, `update public.familie_logboek set bedrag_cent = 1`)), /permission denied/);
  assert.match(await db.fout(db.als(ann, `delete from public.familie_logboek`)), /permission denied/);
  assert.match(await db.fout(db.sql(`update public.familie_logboek set bedrag_cent = 1`)), /logboek_alleen_toevoegen/);
  // Verbeteren = nieuwe regel die naar de oude verwijst
  regels.push(await voegToe(regels, { datum: '2026-11-07', bedragCent: 8000, richting: 'uit', categorie: 'contant', omschrijving: 'Opname (verbeterd)', corrigeertId: regels[1].id }));
  await leg(ann, regels[2]);
  assert.equal((await db.als(bob, 'select id from public.familie_logboek')).length, 3);
  assert.match(await db.fout(leg(ann, { ...(await voegToe(regels, { datum: '2026-11-09', bedragCent: 100, richting: 'uit', categorie: 'overig', omschrijving: 'BSN 111222333' })) })), /bsn_niet_toegestaan/);
});

test('zorggegevens alleen met toestemming; maximaal 8 leden en 10 dossiers', async () => {
  const { db, ann, d } = await metFamilie();
  assert.match(await db.fout(db.als(ann, `update public.familie_dossiers set profiel = '{"zorg":"wlz"}' where id = $1`, [d])), /familie_zorg_met_toestemming/);
  await db.als(ann, `update public.familie_dossiers set toestemming = '{"soort":"ouder-app","datum":"2026-11-17"}', profiel = '{"zorg":"wlz"}' where id = $1`, [d]);
  for (let i = 0; i < 6; i++) await db.als(ann, `select public.familie_uitnodigen($1, $2, 'Lid', 'meekijker')`, [d, `lid${i}@example.nl`]);
  assert.match(await db.fout(db.als(ann, `select public.familie_uitnodigen($1, 'negen@example.nl', 'Negen', 'meekijker')`, [d])), /max_leden/);
  assert.match(await db.fout(db.als(ann, `select public.familie_uitnodigen($1, 'lid0@example.nl', 'Dubbel', 'meekijker')`, [d])), /max_leden|al_uitgenodigd/);
  for (let i = 0; i < 9; i++) await dossier(db, ann, `Dossier ${i}`);
  assert.match(await db.fout(dossier(db, ann, 'Te veel')), /max_dossiers/);
});

test('partner (uitvaartondernemer): ziet uitnodigingen, nooit de inhoud van een dossier', async () => {
  const db = await nieuweDb();
  const uit = await db.gebruiker('uitvaart@example.nl');
  const fam = await db.gebruiker('familie@example.nl');
  const [p] = await db.als(SERVER, `insert into public.familie_partners (naam, eigenaar, abonnement) values ('Uitvaartzorg Voorbeeld', $1, 'actief') returning id`, [uit.id]);
  const [u] = await db.als(uit, `insert into public.familie_uitnodigingen (partner_id, email_hash) values ($1, $2) returning id`, [p.id, 'a'.repeat(64)]);
  const code = (await db.sql('select code from public.familie_uitnodigingen where id = $1', [u.id]))[0].code;
  const [{ id: d }] = await db.als(fam, `select public.familie_partner_activeren($1, 'Ma') as id`, [code]);
  await item(db, fam, d, 'contracten', { naam: 'Energie' });
  // De familie ziet het dossier, in afwikkeling en op het partnerabonnement
  assert.deepEqual(await db.als(fam, 'select status, abonnement from public.familie_dossiers'), [{ status: 'overlijden', abonnement: 'partner' }]);
  // De partner ziet dat de uitnodiging is geactiveerd, maar geen dossier en geen items
  const gezien = await db.als(uit, 'select geactiveerd is not null as actief from public.familie_uitnodigingen');
  assert.deepEqual(gezien, [{ actief: true }]);
  assert.equal((await db.als(uit, 'select id from public.familie_dossiers')).length, 0);
  assert.equal((await db.als(uit, 'select id from public.familie_items')).length, 0);
  assert.equal((await db.als(uit, 'select id from public.familie_leden')).length, 0);
  // Een code werkt één keer
  assert.match(await db.fout(db.als(fam, `select public.familie_partner_activeren($1, 'Nog een')`, [code])), /onbekende_code/);
  // Een ander kan geen uitnodiging maken namens deze partner
  assert.match(await db.fout(db.als(fam, `insert into public.familie_uitnodigingen (partner_id, email_hash) values ($1, $2)`, [p.id, 'b'.repeat(64)])), /row-level security/);
});

test('betalingen en hulpvragen schrijft alleen de server; opruimen verwijdert verlopen dossiers', async () => {
  const { db, ann, d } = await metFamilie();
  assert.match(await db.fout(db.als(ann, `insert into public.familie_betalingen (mollie_id, plan, bedrag_cent, status) values ('tr_x', 'familie-maand', 799, 'betaald')`)), /permission denied/);
  await db.als(SERVER, `insert into public.familie_betalingen (dossier_id, user_id, mollie_id, plan, bedrag_cent, status) values ($1, $2, 'tr_1', 'familie-maand', 799, 'betaald')`, [d, ann.id]);
  await db.als(SERVER, `update public.familie_dossiers set abonnement = 'familie', betaald_tot = current_date + 31 where id = $1`, [d]);
  assert.equal((await db.als(ann, 'select abonnement from public.familie_dossiers'))[0].abonnement, 'familie');
  assert.equal((await db.als(ann, 'select mollie_id from public.familie_betalingen')).length, 1);
  await db.sql(`update public.familie_dossiers set verwijderen_op = current_date - 1 where id = $1`, [d]);
  assert.equal((await db.als(SERVER, 'select private.familie_opruimen() as r'))[0].r.dossiers, 1);
  assert.equal((await db.sql('select count(*)::int as n from public.familie_items'))[0].n, 0);
});
