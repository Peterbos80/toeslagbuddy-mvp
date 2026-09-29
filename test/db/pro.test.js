// Gesimuleerde databasetests (PGlite, nagebootste Supabase-auth): Pro-omgeving,
// controles, uitnodigingen en account verwijderen. Zie test/db/helpers.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nieuweDb, aggregaat } from './helpers.js';

test('trigger maakt alleen een profiel; clienten wordt veilig gelezen', async () => {
  const db = await nieuweDb();
  const gevallen = [['5.000', 5000], ['veel', null], ['999999', null], ['12', 12], [' 7 ', 7], [null, null]];
  for (const [invoer, verwacht] of gevallen) {
    const u = await db.gebruiker(`p${Math.random()}@x.nl`, { naam: 'Piet', organisatie: 'Bewind BV', clienten: invoer });
    const [p] = await db.sql('select * from public.pro_profielen where id = $1', [u.id]);
    assert.equal(p.clienten, verwacht, String(invoer));
    assert.equal(p.naam, 'Piet');
  }
  assert.equal((await db.sql('select count(*)::int as n from public.organisaties'))[0].n, 0);
  assert.equal((await db.sql('select count(*)::int as n from public.leden'))[0].n, 0);
});

test('organisatie aanmaken: proef van 7 dagen, maar één keer', async () => {
  const db = await nieuweDb();
  const u = await db.gebruiker('nieuw@kantoor.nl', { naam: 'Nina', organisatie: 'Nina Bewind' });
  const leeg = await db.rpc(u, 'mijn_omgeving');
  assert.equal(leeg.organisatie, null);
  assert.equal(leeg.profiel.organisatie, 'Nina Bewind');
  const omg = await db.rpc(u, 'organisatie_aanmaken', { naam: 'Nina Bewind' });
  assert.equal(omg.rol, 'eigenaar');
  assert.equal(omg.organisatie.status, 'proef');
  assert.equal(omg.organisatie.dagen_over, 7);
  assert.equal(omg.organisatie.toegang, true);
  assert.ok(omg.nu, 'server geeft de tijd mee (R25)');
  assert.match(await db.fout(db.rpc(u, 'organisatie_aanmaken', { naam: 'Tweede' })), /al_lid/);
  assert.match(await db.fout(db.rpc(u, 'organisatie_aanmaken', { naam: 'x'.repeat(201) })), /ongeldige_naam|al_lid/);
});

test('controle opslaan: geldig, idempotent en maximaal 50 per dag', async () => {
  const db = await nieuweDb();
  const a = await db.eigenaar('a@kantoor.nl');
  const agg = aggregaat();
  assert.deepEqual(await db.rpc(a, 'controle_opslaan', { gegevens: agg }), { id: agg.id, nieuw: true });
  assert.deepEqual(await db.rpc(a, 'controle_opslaan', { gegevens: agg }), { id: agg.id, nieuw: false });
  assert.deepEqual(await db.rpc(a, 'controle_opslaan', { gegevens: aggregaat({ clienten: '1-9', met_actie: -1, gemist_jaar: null, risico_jaar: null, signalen: { gemist: -1, 'te-laag': -1, terugbetaling: 5, vermogen: -1, leeftijd: -1, gemeente: -1, info: -1 } }) }).then((r) => r.nieuw), true);
  for (let i = 0; i < 48; i++) await db.rpc(a, 'controle_opslaan', { gegevens: aggregaat() });
  assert.match(await db.fout(db.rpc(a, 'controle_opslaan', { gegevens: aggregaat() })), /limiet/);
  // Opnieuw versturen van een bestaande controle blijft wel werken
  assert.equal((await db.rpc(a, 'controle_opslaan', { gegevens: agg })).nieuw, false);
});

test('controle opslaan: vrije tekst, exacte kleine aantallen en te grote aantallen worden geweigerd', async () => {
  const db = await nieuweDb();
  const a = await db.eigenaar('a@kantoor.nl');
  const s = aggregaat().signalen;
  const fout = [
    aggregaat({ clientnr: 'C-001' }), // onbekende sleutel
    aggregaat({ opmerking: 'Jan de Vries, BSN 123456782' }),
    aggregaat({ signalen: { ...s, gemist: 'Jan de Vries' } }), // tekst
    aggregaat({ signalen: { ...s, notitie: 5 } }), // onbekende soort
    aggregaat({ signalen: { ...s, gemist: 3 } }), // exact klein aantal
    aggregaat({ signalen: { ...s, gemist: 0 } }),
    aggregaat({ signalen: { ...s, gemist: 5.5 } }),
    aggregaat({ met_actie: 2 }),
    aggregaat({ met_actie: '7' }),
    aggregaat({ clienten: '200+', met_actie: 10001 }), // meer dan 10.000
    aggregaat({ clienten: '10-49', met_actie: 50 }), // groter dan de bandbreedte
    aggregaat({ clienten: '37' }), // exact aantal in plaats van bandbreedte
    aggregaat({ gemist_jaar: 12345 }), // niet afgerond op € 500
    aggregaat({ gemist_jaar: -500 }),
    aggregaat({ gemist_jaar: 10000000 }),
    aggregaat({ gemist_jaar: null }), // bij 10 of meer cliënten verplicht
    aggregaat({ clienten: '1-9', met_actie: -1, signalen: { ...s, gemeente: -1, terugbetaling: -1 } }), // bedragen bij n < 10
    aggregaat({ rekenversie: 'drop table' }),
    aggregaat({ id: 'niet-een-uuid' }),
  ];
  const zonder = aggregaat();
  delete zonder.signalen;
  fout.push(zonder);
  for (const g of fout) {
    assert.match(await db.fout(db.rpc(a, 'controle_opslaan', { gegevens: g })), /ongeldig/, JSON.stringify(g));
  }
  assert.match(await db.fout(db.rpc(a, 'controle_opslaan', { gegevens: [1, 2] })), /ongeldig/);
  assert.equal((await db.sql('select count(*)::int as n from public.controles'))[0].n, 0);
});

test('R11: verlopen of opgezegd abonnement kan niet opslaan; actief wel', async () => {
  const db = await nieuweDb();
  const a = await db.eigenaar('a@kantoor.nl');
  await db.sql(`update public.organisaties set proef_eind = now() - interval '1 minute' where id = $1`, [a.org]);
  const omg = await db.rpc(a, 'mijn_omgeving');
  assert.equal(omg.organisatie.status, 'verlopen');
  assert.equal(omg.organisatie.toegang, false);
  assert.match(await db.fout(db.rpc(a, 'controle_opslaan', { gegevens: aggregaat() })), /geen_toegang/);
  assert.match(await db.fout(db.rpc(a, 'uitnodiging_maken', { email: 'x@y.nl' })), /geen_toegang/);
  await db.sql(`update public.organisaties set abonnement = 'actief' where id = $1`, [a.org]);
  assert.equal((await db.rpc(a, 'controle_opslaan', { gegevens: aggregaat() })).nieuw, true);
  await db.sql(`update public.organisaties set abonnement = 'opgezegd' where id = $1`, [a.org]);
  assert.match(await db.fout(db.rpc(a, 'controle_opslaan', { gegevens: aggregaat() })), /geen_toegang/);
});

test('uitnodigingen: juist e-mailadres, eenmalig, 7 dagen geldig, alleen hash bewaard', async () => {
  const db = await nieuweDb();
  const a = await db.eigenaar('baas@kantoor.nl');
  const jan = await db.gebruiker('Jan@Kantoor.nl');
  const piet = await db.gebruiker('piet@elders.nl');
  const token = await db.rpc(a, 'uitnodiging_maken', { email: ' jan@kantoor.nl ' });
  assert.match(token, /^[0-9a-f]{64}$/);
  const [inv] = await db.sql('select * from public.uitnodigingen');
  assert.notEqual(inv.token_hash, token);
  assert.ok(!JSON.stringify(await db.sql('select * from public.uitnodigingen')).includes(token), 'token staat niet in de database');
  // Verkeerd e-mailadres
  assert.match(await db.fout(db.rpc(piet, 'uitnodiging_accepteren', { token })), /uitnodiging_ander_email/);
  // Onbekend of kapot token
  assert.match(await db.fout(db.rpc(jan, 'uitnodiging_accepteren', { token: 'a'.repeat(64) })), /uitnodiging_ongeldig/);
  assert.match(await db.fout(db.rpc(jan, 'uitnodiging_accepteren', { token: "' or 1=1 --" })), /uitnodiging_ongeldig/);
  // Juiste persoon (e-mail hoofdletterongevoelig)
  const omg = await db.rpc({ ...jan, email: 'jan@kantoor.nl' }, 'uitnodiging_accepteren', { token });
  assert.equal(omg.rol, 'lid');
  assert.equal(omg.organisatie.id, a.org);
  assert.equal(omg.leden.length, 2);
  // Eenmalig
  const kees = await db.gebruiker('kees@kantoor.nl');
  assert.match(await db.fout(db.rpc(jan, 'uitnodiging_accepteren', { token })), /uitnodiging_gebruikt/);
  // Verlopen
  const t2 = await db.rpc(a, 'uitnodiging_maken', { email: kees.email });
  await db.sql(`update public.uitnodigingen set verloopt = now() - interval '1 second' where email = 'kees@kantoor.nl'`);
  assert.match(await db.fout(db.rpc(kees, 'uitnodiging_accepteren', { token: t2 })), /uitnodiging_verlopen/);
  // Al lid van een organisatie (R24)
  const b = await db.eigenaar('baas@elders.nl');
  const t3 = await db.rpc(a, 'uitnodiging_maken', { email: b.email });
  assert.match(await db.fout(db.rpc(b, 'uitnodiging_accepteren', { token: t3 })), /al_lid/);
  assert.match(await db.fout(db.rpc(a, 'uitnodiging_maken', { email: 'jan@kantoor.nl' })), /al_lid/);
  assert.match(await db.fout(db.rpc(a, 'uitnodiging_maken', { email: 'geen-adres' })), /ongeldig_email/);
});

test('uitnodigingen: maximaal 5 leden tijdens de proef en 10 per dag', async () => {
  const db = await nieuweDb();
  const a = await db.eigenaar('baas@kantoor.nl');
  const tokens = [];
  for (let i = 1; i <= 4; i++) tokens.push(await db.rpc(a, 'uitnodiging_maken', { email: `lid${i}@kantoor.nl` }));
  // Eigenaar + 4 open uitnodigingen = 5
  assert.match(await db.fout(db.rpc(a, 'uitnodiging_maken', { email: 'lid5@kantoor.nl' })), /max_leden/);
  // Opnieuw uitnodigen van hetzelfde adres mag (de oude link vervalt)
  const nieuw = await db.rpc(a, 'uitnodiging_maken', { email: 'lid1@kantoor.nl' });
  const lid1 = await db.gebruiker('lid1@kantoor.nl');
  assert.match(await db.fout(db.rpc(lid1, 'uitnodiging_accepteren', { token: tokens[0] })), /uitnodiging_verlopen/);
  await db.rpc(lid1, 'uitnodiging_accepteren', { token: nieuw });
  // Als pilot geldt de grens van 5 niet meer, wel 10 per dag
  await db.sql(`update public.organisaties set abonnement = 'pilot' where id = $1`, [a.org]);
  let aantal = (await db.sql('select count(*)::int as n from public.uitnodigingen'))[0].n;
  for (; aantal < 10; aantal++) await db.rpc(a, 'uitnodiging_maken', { email: `extra${aantal}@kantoor.nl` });
  assert.match(await db.fout(db.rpc(a, 'uitnodiging_maken', { email: 'teveel@kantoor.nl' })), /limiet/);
});

test('R23: een verwijderd lid met een open sessie wordt geweigerd', async () => {
  const db = await nieuweDb();
  const a = await db.eigenaar('baas@kantoor.nl');
  const lid = await db.gebruiker('lid@kantoor.nl');
  await db.rpc(lid, 'uitnodiging_accepteren', { token: await db.rpc(a, 'uitnodiging_maken', { email: lid.email }) });
  assert.equal((await db.rpc(lid, 'controle_opslaan', { gegevens: aggregaat() })).nieuw, true);
  // Een lid kan de eigenaar niet verwijderen
  assert.match(await db.fout(db.rpc(lid, 'lid_verwijderen', { lid: a.id })), /geen_toegang/);
  const omg = await db.rpc(a, 'lid_verwijderen', { lid: lid.id });
  assert.equal(omg.leden.length, 1);
  assert.match(await db.fout(db.rpc(lid, 'controle_opslaan', { gegevens: aggregaat() })), /geen_lid/);
  assert.equal((await db.als(lid, 'select * from public.controles')).length, 0);
  assert.equal((await db.als(lid, 'select * from public.organisaties')).length, 0);
  assert.equal((await db.rpc(lid, 'mijn_omgeving')).organisatie, null);
  const acties = (await db.sql('select actie from public.audit_log')).map((r) => r.actie);
  assert.ok(acties.includes('lid_verwijderd'));
});

test('eigendom overdragen en account verwijderen (met cascade)', async () => {
  const db = await nieuweDb();
  const a = await db.eigenaar('baas@kantoor.nl');
  const lid = await db.gebruiker('lid@kantoor.nl');
  await db.rpc(lid, 'uitnodiging_accepteren', { token: await db.rpc(a, 'uitnodiging_maken', { email: lid.email }) });
  await db.rpc(a, 'controle_opslaan', { gegevens: aggregaat() });
  await db.rpc(null, 'bericht_plaatsen', { soort: 'contact', onderwerp: 'Vraag', email: 'baas@kantoor.nl', tekst: 'Hallo', gestart_op: new Date(Date.now() - 60000).toISOString() });
  // De laatste eigenaar met leden kan niet weg
  assert.match(await db.fout(db.rpc(a, 'account_verwijderen')), /eerst_eigendom_overdragen/);
  assert.match(await db.fout(db.rpc(a, 'lid_verwijderen', { lid: a.id })), /eerst_eigendom_overdragen/);
  assert.match(await db.fout(db.rpc(lid, 'eigendom_overdragen', { lid: lid.id })), /geen_eigenaar/);
  // Mijn gegevens: inclusief auditregels en eigen berichten
  const export_ = await db.rpc(a, 'mijn_gegevens');
  assert.equal(export_.account.email, 'baas@kantoor.nl');
  assert.equal(export_.lidmaatschap.rol, 'eigenaar');
  assert.equal(export_.controles_door_mij.length, 1);
  assert.ok(export_.auditregels.some((r) => r.actie === 'organisatie_aangemaakt'));
  assert.equal(export_.berichten.length, 1);
  // Overdragen, daarna kan de oud-eigenaar vertrekken
  const omg = await db.rpc(a, 'eigendom_overdragen', { lid: lid.id });
  assert.equal(omg.rol, 'lid');
  assert.deepEqual(await db.rpc(a, 'account_verwijderen'), { verwijderd: true });
  assert.equal((await db.sql('select count(*)::int as n from auth.users where id = $1', [a.id]))[0].n, 0);
  assert.equal((await db.sql('select count(*)::int as n from public.pro_profielen where id = $1', [a.id]))[0].n, 0);
  assert.equal((await db.sql(`select count(*)::int as n from public.berichten where email = 'baas@kantoor.nl'`))[0].n, 0);
  // Controles van de organisatie blijven (organisatie bestaat nog), 'door' is leeg
  const [c] = await db.sql('select door from public.controles');
  assert.equal(c.door, null);
  // Auditregels blijven, zonder verwijzing naar de persoon
  const audit = await db.sql(`select wie from public.audit_log where actie = 'account_verwijderd'`);
  assert.equal(audit.length, 1);
  assert.equal(audit[0].wie, null);
  // De nieuwe eigenaar is alleen: account verwijderen neemt de organisatie mee
  await db.rpc(lid, 'account_verwijderen');
  assert.equal((await db.sql('select count(*)::int as n from public.organisaties'))[0].n, 0);
  assert.equal((await db.sql('select count(*)::int as n from public.controles'))[0].n, 0);
  assert.ok((await db.sql('select count(*)::int as n from public.audit_log'))[0].n > 0);
  // Met een verwijderd account (JWT nog geldig) kan niets meer
  assert.match(await db.fout(db.rpc(lid, 'mijn_omgeving')), /niet_ingelogd/);
});

test('organisatie verwijderen door de eigenaar', async () => {
  const db = await nieuweDb();
  const a = await db.eigenaar('baas@kantoor.nl');
  const lid = await db.gebruiker('lid@kantoor.nl');
  await db.rpc(lid, 'uitnodiging_accepteren', { token: await db.rpc(a, 'uitnodiging_maken', { email: lid.email }) });
  assert.match(await db.fout(db.rpc(lid, 'organisatie_verwijderen')), /geen_eigenaar/);
  const omg = await db.rpc(a, 'organisatie_verwijderen');
  assert.equal(omg.organisatie, null);
  assert.equal((await db.rpc(lid, 'mijn_omgeving')).organisatie, null);
});

test('contract: elk aggregaat uit src/calc/aggregaat.js wordt door de database geaccepteerd', async () => {
  const { maakAggregaat } = await import('../../src/calc/aggregaat.js');
  const db = await nieuweDb();
  const a = await db.eigenaar('a@kantoor.nl');
  const soorten = ['gemist', 'te-laag', 'terugbetaling', 'vermogen', 'leeftijd', 'gemeente', 'info'];
  for (const n of [1, 4, 9, 10, 37, 199, 200, 10000]) {
    const clienten = Array.from({ length: n }, (_, i) => ({ signalen: [{ soort: soorten[i % 7] }] }));
    const res = { clienten, totaal: { aantal: n, metActie: Math.floor(n / 2), gemistPerJaar: n * 777, risicoPerJaar: n * 1234 } };
    assert.equal((await db.rpc(a, 'controle_opslaan', { gegevens: maakAggregaat(res) })).nieuw, true, String(n));
  }
});
