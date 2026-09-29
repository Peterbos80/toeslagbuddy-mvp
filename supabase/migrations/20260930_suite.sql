-- ToeslagBuddy-suite: Pro-organisaties met leden en uitnodigingen,
-- geaggregeerde controles, berichten (vervangt Web3Forms), beheer en auditlog.
-- Zie docs/spec.md §4 en §9 (B3, B5, B6, punten 7–17).
--
-- Uitvoeren: Supabase → SQL Editor → hele bestand plakken → Run.
-- Vervangt 20260929_pro.sql (die heeft nooit in productie gedraaid).
--
-- Beveiliging in het kort:
-- • RLS op elke tabel. Eerst worden álle rechten ingetrokken, daarna volgen
--   gerichte grants. Schrijven kan alleen via de functies hieronder.
-- • Hulpfuncties staan in schema `private` (niet via de API bereikbaar).
-- • Elke security-definer-functie heeft `set search_path = ''` en gebruikt
--   volledige namen (schema.tabel).
-- • Elke functie controleert opnieuw of de gebruiker (nog) bestaat en lid is.
-- • Fouten zijn korte sleutels (bijv. 'geen_toegang'); de browser vertaalt
--   ze naar gewone taal.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public;

-- ── Tabellen ─────────────────────────────────────────────────────────

-- Profiel per gebruiker (gegevens uit het aanmeldformulier)
create table if not exists public.pro_profielen (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  naam text check (char_length(naam) <= 200),
  organisatie text check (char_length(organisatie) <= 200),
  clienten integer check (clienten between 0 and 100000),
  aangemaakt timestamptz not null default now()
);

-- Eén kantoor = één organisatie = één abonnement. 'verlopen' wordt afgeleid
-- (proef_eind voorbij), niet opgeslagen.
create table if not exists public.organisaties (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (char_length(naam) between 1 and 200),
  kvk text check (kvk ~ '^[0-9]{8}$'),
  abonnement text not null default 'proef' check (abonnement in ('proef', 'pilot', 'actief', 'opgezegd')),
  proef_eind timestamptz not null,
  opgezegd_op timestamptz,
  aangemaakt timestamptz not null default now()
);

create table if not exists public.leden (
  organisatie_id uuid not null references public.organisaties (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  rol text not null check (rol in ('eigenaar', 'lid')),
  toegevoegd timestamptz not null default now(),
  primary key (organisatie_id, user_id)
);

-- Uitnodigingslinks: alleen de sha256-hash van het token wordt bewaard
create table if not exists public.uitnodigingen (
  id uuid primary key default gen_random_uuid(),
  organisatie_id uuid not null references public.organisaties (id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  door uuid references auth.users (id) on delete set null,
  verloopt timestamptz not null default now() + interval '7 days',
  gebruikt_op timestamptz,
  gebruikt_door uuid references auth.users (id) on delete set null,
  aangemaakt timestamptz not null default now()
);
create index if not exists uitnodigingen_org on public.uitnodigingen (organisatie_id, aangemaakt);

-- Controles: alleen geaggregeerde tellingen (spec §9 B5). Geen cliëntnummers,
-- geen bedragen per cliënt, geen vrije tekst.
--   clienten_band: '1-9', '10-49', '50-199' of '200+'
--   met_actie en signalen: -1 betekent "minder dan 5"
--   bedragen: alleen bij 10 of meer cliënten, afgerond op € 500
create table if not exists public.controles (
  id uuid primary key, -- door de browser gemaakt: opnieuw versturen is veilig
  organisatie_id uuid not null references public.organisaties (id) on delete cascade,
  door uuid references auth.users (id) on delete set null,
  clienten_band text not null check (clienten_band in ('1-9', '10-49', '50-199', '200+')),
  met_actie integer not null check (met_actie = -1 or met_actie between 5 and 10000),
  gemist_jaar integer check (gemist_jaar between 0 and 9999999 and gemist_jaar % 500 = 0),
  risico_jaar integer check (risico_jaar between 0 and 9999999 and risico_jaar % 500 = 0),
  signalen jsonb not null check (jsonb_typeof(signalen) = 'object'),
  rekenversie text not null check (rekenversie ~ '^[0-9]{4}\.[0-9]{8}$'),
  aangemaakt timestamptz not null default now(),
  check ((clienten_band = '1-9') = (gemist_jaar is null and risico_jaar is null))
);
create index if not exists controles_org on public.controles (organisatie_id, aangemaakt);

-- Berichten van de formulieren op de site; na 90 dagen gewist
create table if not exists public.berichten (
  id uuid primary key default gen_random_uuid(),
  soort text not null check (soort ~ '^[a-z0-9-]{1,40}$'),
  onderwerp text not null check (char_length(onderwerp) between 1 and 200 and onderwerp !~ '[\r\n]'),
  email text not null check (char_length(email) <= 254),
  naam text check (char_length(naam) <= 200),
  tekst text not null default '' check (char_length(tekst) <= 5000),
  taal text not null default 'nl' check (taal in ('nl', 'en')),
  aangemaakt timestamptz not null default now(),
  doorgestuurd boolean not null default false,
  pogingen integer not null default 0,
  laatste_poging timestamptz
);
create index if not exists berichten_open on public.berichten (aangemaakt) where not doorgestuurd;

create table if not exists public.beheerders (
  user_id uuid primary key references auth.users (id) on delete cascade,
  toegevoegd timestamptz not null default now()
);

-- Auditlog: niemand kan regels wijzigen of verwijderen (alleen de
-- bewaartermijn-opruiming na 365 dagen, als eigenaar van de tabel).
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  wie uuid references auth.users (id) on delete set null,
  organisatie_id uuid references public.organisaties (id) on delete set null,
  actie text not null,
  doel text,
  details jsonb not null default '{}',
  wanneer timestamptz not null default now()
);
create index if not exists audit_org on public.audit_log (organisatie_id, wanneer);
create index if not exists audit_wie on public.audit_log (wie);

-- Tellers voor limieten (sleutel is een hash, nooit een e-mailadres)
create table if not exists public.rate_limit (
  sleutel text not null,
  venster timestamptz not null,
  teller integer not null default 0,
  primary key (sleutel, venster)
);

-- Instellingen voor het doorsturen van berichten (vul je zelf in, zie
-- docs/pro-accounts.md). Staat in private: niet via de API bereikbaar.
create table if not exists private.instellingen (
  sleutel text primary key,
  waarde text not null
);

alter table public.pro_profielen enable row level security;
alter table public.organisaties enable row level security;
alter table public.leden enable row level security;
alter table public.uitnodigingen enable row level security;
alter table public.controles enable row level security;
alter table public.berichten enable row level security;
alter table public.beheerders enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limit enable row level security;
alter table private.instellingen enable row level security;

-- ── Hulpfuncties (schema private) ───────────────────────────────────

-- De ingelogde gebruiker; faalt als de sessie ontbreekt of het account weg is
create or replace function private.gebruiker() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v uuid := auth.uid();
begin
  if v is null or not exists (select 1 from auth.users u where u.id = v) then
    raise exception 'niet_ingelogd' using errcode = '28000';
  end if;
  return v;
end $$;

-- Organisaties van de gebruiker (voor RLS, zonder recursie op leden)
create or replace function private.mijn_org_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select l.organisatie_id from public.leden l where l.user_id = auth.uid()
$$;

create or replace function private.is_lid(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.leden l where l.organisatie_id = p_org and l.user_id = auth.uid())
$$;

create or replace function private.is_eigenaar(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.leden l where l.organisatie_id = p_org and l.user_id = auth.uid() and l.rol = 'eigenaar')
$$;

-- Beheerder = in de lijst, ingelogd met MFA (aal2) én een geverifieerde factor
create or replace function private.is_beheerder() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (select 1 from public.beheerders b where b.user_id = auth.uid())
    and exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status::text = 'verified')
$$;

create or replace function private.vereis_beheerder() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v uuid := private.gebruiker();
begin
  if not private.is_beheerder() then
    raise exception 'geen_beheerder' using errcode = '42501';
  end if;
  return v;
end $$;

-- Afgeleide status: proef, pilot, actief, opgezegd of verlopen
create or replace function private.status(p_org public.organisaties) returns text
language sql stable set search_path = '' as $$
  select case
    when p_org.abonnement in ('actief', 'opgezegd') then p_org.abonnement
    when p_org.proef_eind <= now() then 'verlopen'
    else p_org.abonnement
  end
$$;

create or replace function private.heeft_toegang(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select private.status(o) in ('proef', 'pilot', 'actief') from public.organisaties o where o.id = p_org), false)
$$;

create or replace function private.log(p_actie text, p_org uuid, p_doel text, p_details jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (wie, organisatie_id, actie, doel, details)
  values ((select u.id from auth.users u where u.id = auth.uid()), p_org, p_actie, p_doel, coalesce(p_details, '{}'))
$$;

create or replace function private.hash(p_tekst text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_tekst, 'sha256'), 'hex')
$$;

-- Telt een actie in het huidige uur; true = binnen de limiet
create or replace function private.tel(p_sleutel text, p_max integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v integer;
begin
  insert into public.rate_limit as r (sleutel, venster, teller)
  values (private.hash(p_sleutel), date_trunc('hour', now()), 1)
  on conflict (sleutel, venster) do update set teller = r.teller + 1
  returning r.teller into v;
  return v <= p_max;
end $$;

-- Telling in een aggregaat: -1 (= minder dan 5) of 5 tot en met p_max
create or replace function private.telling_ok(p_v jsonb, p_max integer) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p_v) = 'number' then
    p_v::numeric = trunc(p_v::numeric) and (p_v::numeric = -1 or p_v::numeric between 5 and p_max)
  else false end
$$;

-- Bedrag in een aggregaat: veelvoud van € 500, 0 tot 10 miljoen
create or replace function private.bedrag_ok(p_v jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p_v) = 'number' then
    p_v::numeric = trunc(p_v::numeric) and p_v::numeric between 0 and 9999999 and p_v::numeric % 500 = 0
  else false end
$$;

-- ── Trigger: alleen een profiel bij een nieuwe gebruiker (§9 punt 7) ──
create or replace function private.nieuw_profiel() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  v_cl text := regexp_replace(coalesce(v_meta ->> 'clienten', ''), '[\s.]', '', 'g');
begin
  insert into public.pro_profielen (id, email, naam, organisatie, clienten)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(left(btrim(coalesce(v_meta ->> 'naam', '')), 200), ''),
    nullif(left(btrim(coalesce(v_meta ->> 'organisatie', '')), 200), ''),
    case when v_cl ~ '^[0-9]{1,6}$' and v_cl::integer <= 100000 then v_cl::integer end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists bij_nieuwe_gebruiker on auth.users;
create trigger bij_nieuwe_gebruiker
  after insert on auth.users
  for each row execute function private.nieuw_profiel();

-- ── Pro: omgeving, organisatie en controles ─────────────────────────

-- Alles wat de app nodig heeft in één keer. De server is leidend voor de
-- proefstatus (R25): 'nu' en 'dagen_over' komen van hier.
create or replace function public.mijn_omgeving() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_lid public.leden;
  v_org public.organisaties;
  v_status text;
begin
  select * into v_lid from public.leden l where l.user_id = v_uid;
  if found then
    select * into v_org from public.organisaties o where o.id = v_lid.organisatie_id;
    v_status := private.status(v_org);
  end if;
  return jsonb_build_object(
    'nu', now(),
    'gebruiker', (select jsonb_build_object('id', u.id, 'email', u.email) from auth.users u where u.id = v_uid),
    'profiel', (select jsonb_build_object('naam', p.naam, 'organisatie', p.organisatie, 'clienten', p.clienten) from public.pro_profielen p where p.id = v_uid),
    'beheerder', exists (select 1 from public.beheerders b where b.user_id = v_uid),
    'rol', v_lid.rol,
    'organisatie', case when v_org.id is null then null else jsonb_build_object(
      'id', v_org.id, 'naam', v_org.naam, 'kvk', v_org.kvk, 'abonnement', v_org.abonnement,
      'proef_eind', v_org.proef_eind, 'aangemaakt', v_org.aangemaakt, 'status', v_status,
      'toegang', v_status in ('proef', 'pilot', 'actief'),
      'dagen_over', case when v_status in ('proef', 'pilot') then ceil(extract(epoch from v_org.proef_eind - now()) / 86400)::integer end
    ) end,
    'leden', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', l.user_id, 'email', u.email, 'naam', p.naam, 'rol', l.rol, 'toegevoegd', l.toegevoegd) order by l.toegevoegd)
      from public.leden l join auth.users u on u.id = l.user_id left join public.pro_profielen p on p.id = l.user_id
      where l.organisatie_id = v_org.id), '[]'::jsonb),
    'uitnodigingen', case when v_lid.rol = 'eigenaar' then coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'verloopt', i.verloopt) order by i.aangemaakt)
      from public.uitnodigingen i
      where i.organisatie_id = v_org.id and i.gebruikt_op is null and i.verloopt > now()), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;

-- Eerste login zonder lidmaatschap: organisatie met proef van 7 dagen
create or replace function public.organisatie_aanmaken(naam text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_naam text := btrim(coalesce(naam, ''));
  v_org uuid;
begin
  if char_length(v_naam) not between 1 and 200 then
    raise exception 'ongeldige_naam' using errcode = '22023';
  end if;
  if exists (select 1 from public.beheerders b where b.user_id = v_uid) then
    raise exception 'beheerder_geen_organisatie' using errcode = '42501';
  end if;
  if exists (select 1 from public.leden l where l.user_id = v_uid) then
    raise exception 'al_lid' using errcode = '23505';
  end if;
  insert into public.organisaties (naam, proef_eind) values (v_naam, now() + interval '7 days') returning id into v_org;
  insert into public.leden (organisatie_id, user_id, rol) values (v_org, v_uid, 'eigenaar');
  perform private.log('organisatie_aangemaakt', v_org, v_org::text);
  return public.mijn_omgeving();
end $$;

create or replace function public.organisatie_bijwerken(naam text, kvk text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_naam text := btrim(coalesce(naam, ''));
  v_kvk text := nullif(regexp_replace(coalesce(kvk, ''), '\s', '', 'g'), '');
  v_org uuid;
begin
  select l.organisatie_id into v_org from public.leden l where l.user_id = v_uid and l.rol = 'eigenaar';
  if v_org is null then
    raise exception 'geen_eigenaar' using errcode = '42501';
  end if;
  if char_length(v_naam) not between 1 and 200 then
    raise exception 'ongeldige_naam' using errcode = '22023';
  end if;
  if v_kvk is not null and v_kvk !~ '^[0-9]{8}$' then
    raise exception 'ongeldig_kvk' using errcode = '22023';
  end if;
  update public.organisaties o set naam = v_naam, kvk = v_kvk where o.id = v_org;
  perform private.log('organisatie_bijgewerkt', v_org, v_org::text, jsonb_build_object('kvk_ingevuld', v_kvk is not null));
  return public.mijn_omgeving();
end $$;

create or replace function public.profiel_bijwerken(naam text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_naam text := btrim(coalesce(naam, ''));
begin
  if char_length(v_naam) not between 1 and 200 then
    raise exception 'ongeldige_naam' using errcode = '22023';
  end if;
  update public.pro_profielen p set naam = v_naam where p.id = v_uid;
  perform private.log('profiel_bijgewerkt', (select l.organisatie_id from public.leden l where l.user_id = v_uid), v_uid::text);
  return public.mijn_omgeving();
end $$;

-- Slaat één geaggregeerde controle op. Het schema is strikt: onbekende
-- sleutels, tekst of exacte kleine aantallen worden geweigerd.
create or replace function public.controle_opslaan(gegevens jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  g jsonb := gegevens;
  v_velden constant text[] := array['id', 'rekenversie', 'clienten', 'met_actie', 'gemist_jaar', 'risico_jaar', 'signalen'];
  v_soorten constant text[] := array['gemist', 'te-laag', 'terugbetaling', 'vermogen', 'leeftijd', 'gemeente', 'info'];
  v_org uuid;
  v_id uuid;
  v_band text;
  v_max integer;
  v_bestaand uuid;
  v_signalen jsonb;
begin
  select l.organisatie_id into v_org from public.leden l where l.user_id = v_uid;
  if v_org is null then
    raise exception 'geen_lid' using errcode = '42501';
  end if;
  if not private.heeft_toegang(v_org) then
    raise exception 'geen_toegang' using errcode = '42501';
  end if;

  -- Schema
  if g is null or jsonb_typeof(g) <> 'object'
    or exists (select 1 from jsonb_object_keys(g) k where k <> all (v_velden))
    or not (g ?& v_velden) then
    raise exception 'ongeldig' using errcode = '22023', detail = 'velden';
  end if;
  if jsonb_typeof(g -> 'id') <> 'string' or (g ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'ongeldig' using errcode = '22023', detail = 'id';
  end if;
  if jsonb_typeof(g -> 'rekenversie') <> 'string' or (g ->> 'rekenversie') !~ '^[0-9]{4}\.[0-9]{8}$' then
    raise exception 'ongeldig' using errcode = '22023', detail = 'rekenversie';
  end if;
  v_band := case when jsonb_typeof(g -> 'clienten') = 'string' then g ->> 'clienten' end;
  v_max := case v_band when '1-9' then 9 when '10-49' then 49 when '50-199' then 199 when '200+' then 10000 end;
  if v_max is null then
    raise exception 'ongeldig' using errcode = '22023', detail = 'clienten';
  end if;
  if not private.telling_ok(g -> 'met_actie', v_max) then
    raise exception 'ongeldig' using errcode = '22023', detail = 'met_actie';
  end if;
  if v_band = '1-9' then
    if jsonb_typeof(g -> 'gemist_jaar') <> 'null' or jsonb_typeof(g -> 'risico_jaar') <> 'null' then
      raise exception 'ongeldig' using errcode = '22023', detail = 'bedragen';
    end if;
  elsif not (private.bedrag_ok(g -> 'gemist_jaar') and private.bedrag_ok(g -> 'risico_jaar')) then
    raise exception 'ongeldig' using errcode = '22023', detail = 'bedragen';
  end if;
  if jsonb_typeof(g -> 'signalen') <> 'object'
    or exists (select 1 from jsonb_object_keys(g -> 'signalen') k where k <> all (v_soorten))
    or not ((g -> 'signalen') ?& v_soorten)
    or exists (select 1 from unnest(v_soorten) s where not private.telling_ok(g -> 'signalen' -> s, v_max)) then
    raise exception 'ongeldig' using errcode = '22023', detail = 'signalen';
  end if;
  v_id := (g ->> 'id')::uuid;

  -- Idempotent: dezelfde controle opnieuw versturen is geen fout
  select c.organisatie_id into v_bestaand from public.controles c where c.id = v_id;
  if found then
    if v_bestaand = v_org then
      return jsonb_build_object('id', v_id, 'nieuw', false);
    end if;
    raise exception 'ongeldig' using errcode = '22023', detail = 'id';
  end if;

  if (select count(*) from public.controles c where c.organisatie_id = v_org and c.aangemaakt > now() - interval '1 day') >= 50 then
    raise exception 'limiet' using errcode = '54000';
  end if;

  select jsonb_object_agg(s, (g -> 'signalen' ->> s)::integer) into v_signalen from unnest(v_soorten) s;
  insert into public.controles (id, organisatie_id, door, clienten_band, met_actie, gemist_jaar, risico_jaar, signalen, rekenversie)
  values (v_id, v_org, v_uid, v_band, (g ->> 'met_actie')::integer,
    (g ->> 'gemist_jaar')::integer, (g ->> 'risico_jaar')::integer, v_signalen, g ->> 'rekenversie');
  perform private.log('controle_opgeslagen', v_org, v_id::text);
  return jsonb_build_object('id', v_id, 'nieuw', true);
end $$;

-- ── Team: uitnodigingslinks (geen mail, spec §9 B6) ─────────────────

-- Geeft het token één keer terug; de database bewaart alleen de hash
create or replace function public.uitnodiging_maken(email text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_email text := lower(btrim(coalesce(email, '')));
  v_org public.organisaties;
  v_token text;
  v_id uuid;
begin
  select o.* into v_org from public.organisaties o join public.leden l on l.organisatie_id = o.id
  where l.user_id = v_uid and l.rol = 'eigenaar';
  if v_org.id is null then
    raise exception 'geen_eigenaar' using errcode = '42501';
  end if;
  if not private.heeft_toegang(v_org.id) then
    raise exception 'geen_toegang' using errcode = '42501';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'ongeldig_email' using errcode = '22023';
  end if;
  if exists (select 1 from public.leden l join auth.users u on u.id = l.user_id where l.organisatie_id = v_org.id and lower(u.email) = v_email) then
    raise exception 'al_lid' using errcode = '23505';
  end if;
  if (select count(*) from public.uitnodigingen i where i.organisatie_id = v_org.id and i.aangemaakt > now() - interval '1 day') >= 10 then
    raise exception 'limiet' using errcode = '54000';
  end if;
  if v_org.abonnement = 'proef' and
    (select count(*) from public.leden l where l.organisatie_id = v_org.id)
    + (select count(*) from public.uitnodigingen i where i.organisatie_id = v_org.id and i.gebruikt_op is null and i.verloopt > now() and i.email <> v_email) >= 5 then
    raise exception 'max_leden' using errcode = '54000';
  end if;
  -- Een oudere open uitnodiging voor hetzelfde adres vervalt
  update public.uitnodigingen i set verloopt = now() where i.organisatie_id = v_org.id and i.email = v_email and i.gebruikt_op is null and i.verloopt > now();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.uitnodigingen (organisatie_id, email, token_hash, door)
  values (v_org.id, v_email, private.hash(v_token), v_uid) returning id into v_id;
  perform private.log('uitnodiging_gemaakt', v_org.id, v_id::text);
  return v_token;
end $$;

create or replace function public.uitnodiging_accepteren(token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_token text := lower(btrim(coalesce(token, '')));
  v_email text := lower(coalesce(auth.email(), ''));
  v_inv public.uitnodigingen;
  v_org public.organisaties;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'uitnodiging_ongeldig' using errcode = '22023';
  end if;
  select * into v_inv from public.uitnodigingen i where i.token_hash = private.hash(v_token) for update;
  if not found then
    raise exception 'uitnodiging_ongeldig' using errcode = '22023';
  end if;
  if v_inv.gebruikt_op is not null then
    raise exception 'uitnodiging_gebruikt' using errcode = '22023';
  end if;
  if v_inv.verloopt <= now() then
    raise exception 'uitnodiging_verlopen' using errcode = '22023';
  end if;
  if v_inv.email <> v_email or v_inv.email <> (select lower(u.email) from auth.users u where u.id = v_uid) then
    raise exception 'uitnodiging_ander_email' using errcode = '42501';
  end if;
  if exists (select 1 from public.beheerders b where b.user_id = v_uid) then
    raise exception 'beheerder_geen_organisatie' using errcode = '42501';
  end if;
  if exists (select 1 from public.leden l where l.user_id = v_uid) then
    raise exception 'al_lid' using errcode = '23505';
  end if;
  select * into v_org from public.organisaties o where o.id = v_inv.organisatie_id for update;
  if v_org.abonnement = 'proef' and (select count(*) from public.leden l where l.organisatie_id = v_org.id) >= 5 then
    raise exception 'max_leden' using errcode = '54000';
  end if;
  insert into public.leden (organisatie_id, user_id, rol) values (v_org.id, v_uid, 'lid');
  update public.uitnodigingen i set gebruikt_op = now(), gebruikt_door = v_uid where i.id = v_inv.id;
  perform private.log('uitnodiging_geaccepteerd', v_org.id, v_inv.id::text);
  return public.mijn_omgeving();
end $$;

-- De eigenaar verwijdert een lid; een lid kan zelf vertrekken
create or replace function public.lid_verwijderen(lid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_doel public.leden;
begin
  select * into v_doel from public.leden l where l.user_id = lid;
  if not found or (v_doel.user_id <> v_uid and not private.is_eigenaar(v_doel.organisatie_id)) then
    raise exception 'geen_toegang' using errcode = '42501';
  end if;
  if v_doel.rol = 'eigenaar' then
    raise exception 'eerst_eigendom_overdragen' using errcode = '42501';
  end if;
  delete from public.leden l where l.user_id = v_doel.user_id;
  perform private.log(case when v_doel.user_id = v_uid then 'lid_vertrokken' else 'lid_verwijderd' end, v_doel.organisatie_id, v_doel.user_id::text);
  return public.mijn_omgeving();
end $$;

create or replace function public.eigendom_overdragen(lid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_org uuid;
begin
  select l.organisatie_id into v_org from public.leden l where l.user_id = v_uid and l.rol = 'eigenaar';
  if v_org is null then
    raise exception 'geen_eigenaar' using errcode = '42501';
  end if;
  if lid is null or lid = v_uid or not exists (select 1 from public.leden l where l.user_id = lid and l.organisatie_id = v_org) then
    raise exception 'geen_toegang' using errcode = '42501';
  end if;
  update public.leden l set rol = 'lid' where l.user_id = v_uid;
  update public.leden l set rol = 'eigenaar' where l.user_id = lid;
  perform private.log('eigendom_overgedragen', v_org, lid::text);
  return public.mijn_omgeving();
end $$;

-- ── Rechten van betrokkenen ─────────────────────────────────────────

create or replace function public.mijn_gegevens() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_email text := (select lower(u.email) from auth.users u where u.id = v_uid);
begin
  return jsonb_build_object(
    'gemaakt_op', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'aangemaakt', u.created_at) from auth.users u where u.id = v_uid),
    'profiel', (select to_jsonb(p) from public.pro_profielen p where p.id = v_uid),
    'lidmaatschap', (select jsonb_build_object('organisatie_id', l.organisatie_id, 'rol', l.rol, 'toegevoegd', l.toegevoegd) from public.leden l where l.user_id = v_uid),
    'organisatie', (select jsonb_build_object('id', o.id, 'naam', o.naam, 'kvk', o.kvk, 'abonnement', o.abonnement, 'proef_eind', o.proef_eind, 'aangemaakt', o.aangemaakt)
      from public.organisaties o join public.leden l on l.organisatie_id = o.id where l.user_id = v_uid),
    'controles_door_mij', coalesce((select jsonb_agg(to_jsonb(c) - 'door' order by c.aangemaakt) from public.controles c where c.door = v_uid), '[]'::jsonb),
    'uitnodigingen_door_mij', coalesce((select jsonb_agg(jsonb_build_object('email', i.email, 'aangemaakt', i.aangemaakt, 'verloopt', i.verloopt, 'gebruikt_op', i.gebruikt_op) order by i.aangemaakt)
      from public.uitnodigingen i where i.door = v_uid), '[]'::jsonb),
    'auditregels', coalesce((select jsonb_agg(jsonb_build_object('actie', a.actie, 'doel', a.doel, 'details', a.details, 'wanneer', a.wanneer) order by a.wanneer)
      from public.audit_log a where a.wie = v_uid), '[]'::jsonb),
    'berichten', coalesce((select jsonb_agg(jsonb_build_object('soort', b.soort, 'onderwerp', b.onderwerp, 'naam', b.naam, 'tekst', b.tekst, 'aangemaakt', b.aangemaakt) order by b.aangemaakt)
      from public.berichten b where lower(b.email) = v_email), '[]'::jsonb)
  );
end $$;

-- Verwijdert het account. De laatste eigenaar met leden moet eerst het
-- eigendom overdragen; een eigenaar zonder leden neemt de organisatie mee.
create or replace function public.account_verwijderen() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_lid public.leden;
begin
  select * into v_lid from public.leden l where l.user_id = v_uid;
  if found and v_lid.rol = 'eigenaar' then
    if exists (select 1 from public.leden l where l.organisatie_id = v_lid.organisatie_id and l.user_id <> v_uid) then
      raise exception 'eerst_eigendom_overdragen' using errcode = '42501';
    end if;
    perform private.log('organisatie_verwijderd', v_lid.organisatie_id, v_lid.organisatie_id::text);
    delete from public.organisaties o where o.id = v_lid.organisatie_id;
  end if;
  delete from public.berichten b where lower(b.email) = (select lower(u.email) from auth.users u where u.id = v_uid);
  perform private.log('account_verwijderd', null, v_uid::text);
  delete from auth.users u where u.id = v_uid;
  return jsonb_build_object('verwijderd', true);
end $$;

-- De eigenaar verwijdert de hele organisatie (alle leden verliezen toegang)
create or replace function public.organisatie_verwijderen() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.gebruiker();
  v_org uuid;
begin
  select l.organisatie_id into v_org from public.leden l where l.user_id = v_uid and l.rol = 'eigenaar';
  if v_org is null then
    raise exception 'geen_eigenaar' using errcode = '42501';
  end if;
  perform private.log('organisatie_verwijderd', v_org, v_org::text);
  delete from public.organisaties o where o.id = v_org;
  return public.mijn_omgeving();
end $$;

-- ── Berichten (formulieren op de site) ──────────────────────────────

-- Anoniem aan te roepen. Honeypot, minimale invultijd van 3 seconden,
-- maximaal 3 per uur per e-mailadres, 10 per uur per IP en 30 per uur in totaal.
create or replace function public.bericht_plaatsen(
  soort text default null,
  onderwerp text default null,
  email text default null,
  naam text default null,
  tekst text default null,
  taal text default 'nl',
  gestart_op timestamptz default null,
  honeypot text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_soort text := lower(btrim(coalesce(soort, '')));
  v_onderwerp text := btrim(regexp_replace(coalesce(onderwerp, ''), '[\r\n\t]+', ' ', 'g'));
  v_email text := lower(btrim(coalesce(email, '')));
  v_naam text := nullif(btrim(coalesce(naam, '')), '');
  v_tekst text := btrim(coalesce(tekst, ''));
  v_taal text := coalesce(nullif(taal, ''), 'nl');
  v_headers text := nullif(current_setting('request.headers', true), '');
  v_ip text;
  v_id uuid;
begin
  -- Bots vullen het verborgen veld in: doe alsof het gelukt is
  if coalesce(honeypot, '') not in ('', 'false', 'off') then
    return jsonb_build_object('ok', true);
  end if;
  if v_soort !~ '^[a-z0-9-]{1,40}$'
    or char_length(v_onderwerp) not between 1 and 200
    or char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or char_length(v_naam) > 200
    or char_length(v_tekst) > 5000
    or v_taal not in ('nl', 'en') then
    raise exception 'ongeldig' using errcode = '22023';
  end if;
  if gestart_op is null or gestart_op > now() - interval '3 seconds' then
    raise exception 'te_snel' using errcode = '22023';
  end if;
  if not private.tel('bericht:email:' || v_email, 3) then
    raise exception 'te_veel' using errcode = '54000';
  end if;
  if v_headers is not null then
    v_ip := btrim(split_part(coalesce(v_headers::jsonb ->> 'x-forwarded-for', ''), ',', 1));
    if v_ip <> '' and not private.tel('bericht:ip:' || v_ip, 10) then
      raise exception 'te_veel' using errcode = '54000';
    end if;
  end if;
  if not private.tel('bericht:globaal', 30) then
    raise exception 'te_veel' using errcode = '54000';
  end if;
  insert into public.berichten (soort, onderwerp, email, naam, tekst, taal)
  values (v_soort, v_onderwerp, v_email, v_naam, v_tekst, v_taal) returning id into v_id;
  perform private.log('bericht_geplaatst', null, v_id::text, jsonb_build_object('soort', v_soort));
  return jsonb_build_object('ok', true);
end $$;

-- Stuurt een bericht door via de Edge Function (pg_net). Zonder pg_net of
-- zonder ingevulde instellingen gebeurt er niets; het bericht blijft staan
-- met doorgestuurd = false en is zichtbaar in /beheer/.
create or replace function private.bericht_doorsturen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text := (select i.waarde from private.instellingen i where i.sleutel = 'doorstuur_url');
  v_geheim text := (select i.waarde from private.instellingen i where i.sleutel = 'webhook_geheim');
begin
  if v_url is null or v_geheim is null or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return;
  end if;
  update public.berichten b set pogingen = b.pogingen + 1, laatste_poging = now() where b.id = p_id;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 10000)'
    using v_url, jsonb_build_object('bericht_id', p_id), jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_geheim);
exception when others then
  raise warning 'bericht % niet doorgestuurd: %', p_id, sqlerrm;
end $$;

create or replace function private.bij_nieuw_bericht() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.bericht_doorsturen(new.id);
  return new;
end $$;

drop trigger if exists bij_nieuw_bericht on public.berichten;
create trigger bij_nieuw_bericht
  after insert on public.berichten
  for each row execute function private.bij_nieuw_bericht();

-- Opnieuw proberen (bijv. als het Brevo-quotum op was, R27)
create or replace function private.berichten_opnieuw() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_aantal integer := 0;
begin
  for v_id in
    select b.id from public.berichten b
    where not b.doorgestuurd and b.pogingen < 10
      and b.aangemaakt < now() - interval '5 minutes'
      and (b.laatste_poging is null or b.laatste_poging < now() - interval '10 minutes')
    order by b.aangemaakt limit 50
  loop
    perform private.bericht_doorsturen(v_id);
    v_aantal := v_aantal + 1;
  end loop;
  return v_aantal;
end $$;

-- ── Bewaartermijnen ─────────────────────────────────────────────────
create or replace function private.opruimen() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_berichten integer;
  v_audit integer;
  v_limiet integer;
  v_proeven integer;
  v_controles integer;
begin
  delete from public.berichten b where b.aangemaakt < now() - interval '90 days';
  get diagnostics v_berichten = row_count;
  delete from public.audit_log a where a.wanneer < now() - interval '365 days';
  get diagnostics v_audit = row_count;
  delete from public.rate_limit r where r.venster < now() - interval '1 day';
  get diagnostics v_limiet = row_count;
  -- Verlopen proef of pilot zonder omzetting: 90 dagen na het einde weg
  delete from public.organisaties o where o.abonnement in ('proef', 'pilot') and o.proef_eind < now() - interval '90 days';
  get diagnostics v_proeven = row_count;
  -- Na opzegging: controles 12 maanden later weg
  delete from public.controles c using public.organisaties o
  where c.organisatie_id = o.id and o.abonnement = 'opgezegd' and o.opgezegd_op < now() - interval '12 months';
  get diagnostics v_controles = row_count;
  return jsonb_build_object('berichten', v_berichten, 'audit', v_audit, 'rate_limit', v_limiet, 'proeven', v_proeven, 'controles', v_controles);
end $$;

-- ── Beheer (alleen beheerders met MFA) ──────────────────────────────

create or replace function public.beheer_statistieken() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.vereis_beheerder();
  return (
    select jsonb_build_object(
      'nu', now(),
      'organisaties', count(*),
      'proeven', count(*) filter (where s.status = 'proef'),
      'pilots', count(*) filter (where s.status = 'pilot'),
      'verlopen', count(*) filter (where s.status = 'verlopen'),
      'actief', count(*) filter (where s.status = 'actief'),
      'opgezegd', count(*) filter (where s.status = 'opgezegd'),
      'geactiveerd', count(*) filter (where s.geactiveerd),
      'verloopt_binnenkort', count(*) filter (where s.status in ('proef', 'pilot') and s.proef_eind < now() + interval '3 days'),
      'controles_per_week', coalesce((
        select jsonb_agg(jsonb_build_object('week', w.week, 'aantal', w.aantal) order by w.week)
        from (select date_trunc('week', c.aangemaakt)::date as week, count(*) as aantal
              from public.controles c where c.aangemaakt > now() - interval '8 weeks' group by 1) w), '[]'::jsonb),
      'berichten_nieuw', (select count(*) from public.berichten b where b.aangemaakt > now() - interval '7 days'),
      'berichten_niet_doorgestuurd', (select count(*) from public.berichten b where not b.doorgestuurd)
    )
    from (select o.proef_eind, private.status(o) as status,
                 exists (select 1 from public.controles c where c.organisatie_id = o.id) as geactiveerd
          from public.organisaties o) s
  );
end $$;

create or replace function public.beheer_organisaties() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.vereis_beheerder();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'naam', o.naam, 'kvk', o.kvk, 'abonnement', o.abonnement, 'status', private.status(o),
      'proef_eind', o.proef_eind, 'aangemaakt', o.aangemaakt,
      'leden', (select count(*) from public.leden l where l.organisatie_id = o.id),
      'controles', (select count(*) from public.controles c where c.organisatie_id = o.id),
      'laatste_controle', (select max(c.aangemaakt) from public.controles c where c.organisatie_id = o.id),
      'eigenaar', (select u.email from public.leden l join auth.users u on u.id = l.user_id where l.organisatie_id = o.id and l.rol = 'eigenaar' limit 1)
    ) order by o.aangemaakt desc)
    from public.organisaties o), '[]'::jsonb);
end $$;

create or replace function public.beheer_berichten() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.vereis_beheerder();
  return coalesce((
    select jsonb_agg(to_jsonb(b) order by b.aangemaakt desc)
    from (select * from public.berichten order by aangemaakt desc limit 200) b), '[]'::jsonb);
end $$;

-- Proef verlengen tot een pilot van 30 dagen (vanaf nu)
create or replace function public.beheer_verlengen_pilot(org uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_o public.organisaties;
begin
  perform private.vereis_beheerder();
  select * into v_o from public.organisaties o where o.id = org for update;
  if not found then
    raise exception 'niet_gevonden' using errcode = '22023';
  end if;
  if v_o.abonnement = 'actief' then
    raise exception 'al_actief' using errcode = '22023';
  end if;
  update public.organisaties o set abonnement = 'pilot', proef_eind = now() + interval '30 days', opgezegd_op = null where o.id = org;
  perform private.log('pilot_verlengd', org, org::text, jsonb_build_object('van', v_o.abonnement, 'proef_eind_was', v_o.proef_eind));
  return public.beheer_organisaties();
end $$;

-- Abonnement op actief of opgezegd. Actief vergt een KvK-nummer (§9).
create or replace function public.beheer_abonnement_zetten(org uuid, status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_o public.organisaties;
  v_status text := status;
begin
  perform private.vereis_beheerder();
  if v_status not in ('actief', 'opgezegd') then
    raise exception 'ongeldig' using errcode = '22023';
  end if;
  select * into v_o from public.organisaties o where o.id = org for update;
  if not found then
    raise exception 'niet_gevonden' using errcode = '22023';
  end if;
  if v_status = 'actief' and v_o.kvk is null then
    raise exception 'kvk_verplicht' using errcode = '22023';
  end if;
  update public.organisaties o
  set abonnement = v_status, opgezegd_op = case when v_status = 'opgezegd' then now() end
  where o.id = org;
  perform private.log('abonnement_gezet', org, org::text, jsonb_build_object('van', v_o.abonnement, 'naar', v_status));
  return public.beheer_organisaties();
end $$;

-- ── RLS-policies (alleen lezen; schrijven gaat via de functies) ─────

drop policy if exists "eigen profiel" on public.pro_profielen;
create policy "eigen profiel" on public.pro_profielen for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "eigen organisatie" on public.organisaties;
create policy "eigen organisatie" on public.organisaties for select to authenticated
  using (id in (select private.mijn_org_ids()));

drop policy if exists "leden eigen organisatie" on public.leden;
create policy "leden eigen organisatie" on public.leden for select to authenticated
  using (organisatie_id in (select private.mijn_org_ids()));

drop policy if exists "controles eigen organisatie" on public.controles;
create policy "controles eigen organisatie" on public.controles for select to authenticated
  using (organisatie_id in (select private.mijn_org_ids()));

-- Auditlog: je eigen regels, en als eigenaar die van je organisatie
drop policy if exists "audit eigen of als eigenaar" on public.audit_log;
create policy "audit eigen of als eigenaar" on public.audit_log for select to authenticated
  using (wie = (select auth.uid()) or (organisatie_id in (select private.mijn_org_ids()) and private.is_eigenaar(organisatie_id)));

-- uitnodigingen, berichten, beheerders, rate_limit en private.instellingen:
-- geen policies, dus onleesbaar voor anon en authenticated.

-- ── Rechten: eerst alles dicht, dan gericht open (spec §9 B3) ───────

revoke all on table
  public.pro_profielen, public.organisaties, public.leden, public.uitnodigingen, public.controles,
  public.berichten, public.beheerders, public.audit_log, public.rate_limit
  from public, anon, authenticated;
revoke all on table private.instellingen from public, anon, authenticated;
revoke all on sequence public.audit_log_id_seq from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

grant select on public.pro_profielen, public.organisaties, public.leden, public.controles, public.audit_log to authenticated;

-- Nodig voor de RLS-policies hierboven (schema private staat niet in de API)
grant usage on schema private to authenticated;
grant execute on function private.mijn_org_ids(), private.is_eigenaar(uuid) to authenticated;

grant execute on function
  public.mijn_omgeving(),
  public.organisatie_aanmaken(text),
  public.organisatie_bijwerken(text, text),
  public.profiel_bijwerken(text),
  public.controle_opslaan(jsonb),
  public.uitnodiging_maken(text),
  public.uitnodiging_accepteren(text),
  public.lid_verwijderen(uuid),
  public.eigendom_overdragen(uuid),
  public.mijn_gegevens(),
  public.account_verwijderen(),
  public.organisatie_verwijderen(),
  public.beheer_statistieken(),
  public.beheer_organisaties(),
  public.beheer_berichten(),
  public.beheer_verlengen_pilot(uuid),
  public.beheer_abonnement_zetten(uuid, text)
  to authenticated;

grant execute on function public.bericht_plaatsen(text, text, text, text, text, text, timestamptz, text) to anon, authenticated;

-- De Edge Function (service_role) leest een bericht en zet doorgestuurd = true
grant select, update (doorgestuurd) on public.berichten to service_role;

-- ── Geplande taken (alleen als pg_cron aanstaat) ────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('toeslagbuddy-opruimen', '17 3 * * *', 'select private.opruimen()');
    perform cron.schedule('toeslagbuddy-berichten-opnieuw', '*/15 * * * *', 'select private.berichten_opnieuw()');
  else
    raise notice 'pg_cron staat niet aan: zet het aan (Database → Extensions) en voer dit blok opnieuw uit.';
  end if;
end $$;
