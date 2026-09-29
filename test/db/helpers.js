// GESIMULEERDE databasetests (spec §7 en §9 punt 13).
// PGlite is echte Postgres, maar het auth-schema, de rollen (anon,
// authenticated, service_role) en de JWT van Supabase zijn hier nagebootst.
// Dat is geen volledige Supabase-test: draai na de installatie ook de
// SQL-rooktest uit docs/pro-accounts.md.
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const MIGRATIE = new URL('../../supabase/migrations/20260930_suite.sql', import.meta.url);

// Nagebootste Supabase-omgeving: auth-schema, rollen en standaardrechten.
// Supabase geeft anon en authenticated standaard álle rechten op nieuwe
// tabellen en functies in public; dat bootsen we na, zodat de test bewijst
// dat de migratie die rechten zelf weer intrekt.
const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}',
  created_at timestamptz default now()
);
create table auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  factor_type text not null default 'totp',
  status text not null default 'unverified',
  created_at timestamptz default now()
);
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create function auth.email() returns text language sql stable as
  $$ select auth.jwt() ->> 'email' $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema extensions;
`;

export async function nieuweDb() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);
  await db.exec(await readFile(MIGRATIE, 'utf8'));
  return new Db(db);
}

class Db {
  constructor(pg) {
    this.pg = pg;
  }

  // Als beheerder van de database (postgres), zonder RLS
  async sql(query, params = []) {
    await this.pg.exec('reset role');
    return (await this.pg.query(query, params)).rows;
  }

  // Als een rol met JWT-claims, zoals PostgREST dat doet
  async als(wie, query, params = []) {
    const claims = wie ? { sub: wie.id, email: wie.email, role: 'authenticated', aal: wie.aal || 'aal1' } : { role: 'anon' };
    const rol = wie ? wie.rol || 'authenticated' : 'anon';
    await this.pg.exec('reset role');
    await this.pg.query(`select set_config('request.jwt.claims', $1, false), set_config('request.headers', $2, false)`, [
      JSON.stringify(claims),
      JSON.stringify(wie?.headers || {}),
    ]);
    await this.pg.exec(`set role ${rol}`);
    try {
      return (await this.pg.query(query, params)).rows;
    } finally {
      await this.pg.exec('reset role');
    }
  }

  // Roept een RPC aan en geeft de eerste waarde terug
  async rpc(wie, functie, args = {}) {
    const namen = Object.keys(args);
    const rijen = await this.als(wie, `select public.${functie}(${namen.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`, Object.values(args));
    return rijen[0].r;
  }

  // Verwacht een fout met deze tekst (of een fout zonder rechten)
  async fout(belofte) {
    try {
      await belofte;
    } catch (e) {
      return e.message;
    }
    throw new Error('verwachtte een fout, maar de aanroep lukte');
  }

  async gebruiker(email, meta = {}) {
    const [u] = await this.sql('insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id, email', [email, meta]);
    return { id: u.id, email: u.email };
  }

  // Gebruiker met een eigen organisatie (eigenaar, proef)
  async eigenaar(email, orgNaam = 'Kantoor ' + email) {
    const u = await this.gebruiker(email);
    const omg = await this.rpc(u, 'organisatie_aanmaken', { naam: orgNaam });
    u.org = omg.organisatie.id;
    return u;
  }
}

// Een geldig aggregaat zoals src/calc/aggregaat.js het maakt
export function aggregaat(extra = {}) {
  return {
    id: crypto.randomUUID(),
    rekenversie: '2026.20260928',
    clienten: '10-49',
    met_actie: 7,
    gemist_jaar: 12500,
    risico_jaar: 3000,
    signalen: { gemist: 5, 'te-laag': -1, terugbetaling: 6, vermogen: -1, leeftijd: -1, gemeente: 9, info: -1 },
    ...extra,
  };
}
