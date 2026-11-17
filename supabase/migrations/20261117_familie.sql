-- ToeslagBuddy Familie: gedeelde dossiers voor een familie (de regelkamer).
-- Zonder account staat een dossier alleen in de browser; met een account
-- werkt de familie samen in dezelfde gegevens.
--
-- Tabellen:
--   familie_dossiers     één per ouder of ouderpaar
--   familie_leden        wie meedoet en in welke rol (ook uitnodigingen)
--   familie_items        contracten, contacten, documenten, brieven, taken,
--                        afspraken en checklist: één rij per ding (jsonb)
--   familie_logboek      verantwoording; alleen toevoegen, keten met hashes
--   familie_sleutels     de dossiersleutel, per lid ingepakt (voor documenten)
--   familie_audit        wie deed wat
--   familie_partners, familie_partner_leden, familie_uitnodigingen
--                        uitvaartondernemers: zien nooit de inhoud van een dossier
--   familie_betalingen   alleen de server (Mollie-webhook) schrijft
--   familie_hulp         hulpvragen met conceptantwoord voor de eigenaar
--
-- Rechten: alleen leden van een dossier zien het; schrijven hangt af van de
-- rol. Een BSN wordt geweigerd. Alles verdwijnt met het account of dossier.

create schema if not exists private;

-- ── Hulpfuncties ────────────────────────────────────────────────────

-- Elfproef: staat er een geldig BSN (8 of 9 cijfers) in de tekst?
create or replace function private.familie_bevat_bsn(p text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  m text[];
  c text;
  som integer;
  i integer;
begin
  for m in select pg_catalog.regexp_matches(coalesce(p, ''), '(?<![0-9,.])([0-9]{3,4}[ .]?[0-9]{2,3}[ .]?[0-9]{2,3})(?![0-9]|,[0-9])', 'g') loop
    c := pg_catalog.regexp_replace(m[1], '[^0-9]', '', 'g');
    if pg_catalog.length(c) in (8, 9) then
      c := pg_catalog.lpad(c, 9, '0');
      if c <> '000000000' then
        som := 0;
        for i in 1..8 loop
          som := som + pg_catalog.substr(c, i, 1)::integer * (10 - i);
        end loop;
        som := som - pg_catalog.substr(c, 9, 1)::integer;
        if som % 11 = 0 then
          return true;
        end if;
      end if;
    end if;
  end loop;
  return false;
end $$;

create table if not exists public.familie_dossiers (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (char_length(naam) between 1 and 60),
  geboortejaar integer check (geboortejaar between 1900 and 2100),
  status text not null default 'actief' check (status in ('actief', 'overlijden', 'archief')),
  overlijdensdatum date,
  profiel jsonb not null default '{}' check (jsonb_typeof(profiel) = 'object' and pg_catalog.octet_length(profiel::text) <= 4000),
  -- Wie gaf toestemming om dit bij te houden (AVG; gezondheid alleen met toestemming)
  toestemming jsonb check (toestemming is null or (jsonb_typeof(toestemming) = 'object' and toestemming ->> 'soort' in ('ouder-app', 'schriftelijk', 'volmacht', 'bewind', 'geen'))),
  eigenaar uuid not null default auth.uid() references auth.users (id) on delete cascade,
  partner_id uuid,
  abonnement text not null default 'proef' check (abonnement in ('proef', 'familie', 'afwikkeling', 'partner', 'gestopt')),
  betaald_tot date,
  verwijderen_op date,
  aangemaakt timestamptz not null default now(),
  gewijzigd timestamptz not null default now(),
  -- Zonder toestemming geen gegevens over zorg in het profiel
  constraint familie_zorg_met_toestemming check (
    profiel -> 'zorg' is null or jsonb_typeof(profiel -> 'zorg') = 'null'
    or coalesce(toestemming ->> 'soort', 'geen') <> 'geen')
);
create index if not exists familie_dossiers_eigenaar on public.familie_dossiers (eigenaar);

create table if not exists public.familie_leden (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.familie_dossiers (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  -- Uitnodiging: e-mailadres tot de persoon inlogt en de uitnodiging aanneemt
  email text check (email is null or (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  naam text not null check (char_length(naam) between 1 and 60),
  rol text not null default 'meekijker' check (rol in ('regelaar', 'meekijker', 'ouder', 'executeur')),
  uitgenodigd_door uuid references auth.users (id) on delete set null,
  toegevoegd timestamptz not null default now(),
  ingetrokken timestamptz,
  unique (dossier_id, user_id),
  check (user_id is not null or email is not null)
);
create index if not exists familie_leden_user on public.familie_leden (user_id) where ingetrokken is null;
create index if not exists familie_leden_email on public.familie_leden (lower(email)) where user_id is null;

-- Rol van de ingelogde gebruiker in een dossier (null = geen lid)
create or replace function private.familie_rol(p_dossier uuid) returns text
language sql stable security definer set search_path = '' as $$
  select l.rol from public.familie_leden l
  where l.dossier_id = p_dossier and l.user_id = auth.uid() and l.ingetrokken is null
$$;
create or replace function private.familie_is_lid(p_dossier uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.familie_rol(p_dossier) is not null
$$;
create or replace function private.familie_mag_schrijven(p_dossier uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.familie_rol(p_dossier) in ('regelaar', 'executeur'), false)
$$;

create table if not exists public.familie_items (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.familie_dossiers (id) on delete cascade,
  soort text not null check (soort in ('contracten', 'contacten', 'documenten', 'brieven', 'taken', 'afspraken', 'checklist')),
  inhoud jsonb not null check (jsonb_typeof(inhoud) = 'object' and pg_catalog.octet_length(inhoud::text) <= 30000),
  door uuid default auth.uid() references auth.users (id) on delete set null,
  aangemaakt timestamptz not null default now(),
  gewijzigd timestamptz not null default now()
);
create index if not exists familie_items_dossier on public.familie_items (dossier_id, soort);

create table if not exists public.familie_logboek (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.familie_dossiers (id) on delete cascade,
  volgnr bigint generated always as identity,
  datum date not null,
  bedrag_cent integer not null check (bedrag_cent > 0 and bedrag_cent <= 100000000),
  richting text not null check (richting in ('in', 'uit')),
  categorie text not null check (char_length(categorie) between 1 and 30),
  omschrijving text not null check (char_length(omschrijving) between 1 and 200),
  rekening text not null default '' check (char_length(rekening) <= 40),
  bon_id uuid,
  door uuid default auth.uid() references auth.users (id) on delete set null,
  door_naam text not null default '' check (char_length(door_naam) <= 60),
  corrigeert_id uuid references public.familie_logboek (id) on delete cascade,
  vastgelegd timestamptz not null default now(),
  vorige_hash text not null default '',
  hash text not null check (hash ~ '^[0-9a-f]{64}$')
);
create index if not exists familie_logboek_dossier on public.familie_logboek (dossier_id, volgnr);

create table if not exists public.familie_sleutels (
  dossier_id uuid not null references public.familie_dossiers (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pakket jsonb not null check (jsonb_typeof(pakket) = 'object' and pg_catalog.octet_length(pakket::text) <= 2000),
  primary key (dossier_id, user_id)
);

create table if not exists public.familie_audit (
  id bigserial primary key,
  dossier_id uuid not null references public.familie_dossiers (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  actie text not null,
  object text not null,
  object_id uuid,
  tijd timestamptz not null default now()
);
create index if not exists familie_audit_dossier on public.familie_audit (dossier_id, tijd desc);

create table if not exists public.familie_partners (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (char_length(naam) between 2 and 80),
  kleur text check (kleur is null or kleur ~ '^#[0-9a-fA-F]{6}$'),
  eigenaar uuid not null default auth.uid() references auth.users (id) on delete cascade,
  abonnement text not null default 'proef' check (abonnement in ('proef', 'actief', 'gestopt')),
  aangemaakt timestamptz not null default now()
);
create table if not exists public.familie_partner_leden (
  partner_id uuid not null references public.familie_partners (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (partner_id, user_id)
);
-- Wat een partner ziet: alleen dat een uitnodiging is verstuurd en geactiveerd
create table if not exists public.familie_uitnodigingen (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.familie_partners (id) on delete cascade,
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  code uuid not null default gen_random_uuid() unique,
  aangemaakt timestamptz not null default now(),
  geactiveerd timestamptz,
  dossier_id uuid references public.familie_dossiers (id) on delete set null
);
create index if not exists familie_uitnodigingen_partner on public.familie_uitnodigingen (partner_id, aangemaakt desc);

do $$ begin
  alter table public.familie_dossiers add constraint familie_dossiers_partner foreign key (partner_id) references public.familie_partners (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.familie_betalingen (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references public.familie_dossiers (id) on delete set null,
  partner_id uuid references public.familie_partners (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  mollie_id text not null unique check (char_length(mollie_id) between 3 and 60),
  plan text not null check (plan in ('familie-maand', 'familie-jaar', 'afwikkeling', 'partner')),
  bedrag_cent integer not null check (bedrag_cent >= 0),
  status text not null check (status in ('open', 'betaald', 'mislukt', 'terugbetaald', 'verlopen')),
  aangemaakt timestamptz not null default now(),
  bijgewerkt timestamptz not null default now()
);

create table if not exists public.familie_hulp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  vraag text not null check (char_length(vraag) between 1 and 2000),
  antwoord text check (antwoord is null or char_length(antwoord) <= 4000),
  soort text not null default 'direct' check (soort in ('direct', 'wachtrij')),
  status text not null default 'open' check (status in ('open', 'beantwoord', 'verstuurd')),
  aangemaakt timestamptz not null default now()
);

-- ── Triggers ────────────────────────────────────────────────────────

-- Nieuw dossier: de maker wordt regelaar; maximaal 10 dossiers per persoon
-- Bewust geen security definer: zo is current_user de rol van de aanroeper en
-- kan alleen de server (of een functie van de server) het abonnement zetten.
create or replace function private.familie_nieuw_dossier() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_gebruiker boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    if v_gebruiker then
      new.eigenaar := auth.uid();
      new.abonnement := 'proef';
      new.betaald_tot := null;
      new.partner_id := null;
      if (select count(*) from public.familie_dossiers d where d.eigenaar = auth.uid()) >= 10 then
        raise exception 'max_dossiers' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;
  new.gewijzigd := now();
  if v_gebruiker then
    -- Abonnement, eigenaar en partner wijzigt alleen de server
    new.abonnement := old.abonnement;
    new.betaald_tot := old.betaald_tot;
    new.eigenaar := old.eigenaar;
    new.partner_id := old.partner_id;
  end if;
  return new;
end $$;
create or replace function private.familie_na_dossier() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    insert into public.familie_leden (dossier_id, user_id, naam, rol, uitgenodigd_door)
    values (new.id, auth.uid(), coalesce(nullif((select u.raw_user_meta_data ->> 'naam' from auth.users u where u.id = auth.uid()), ''), 'Regelaar'), 'regelaar', auth.uid());
  end if;
  return null;
end $$;
drop trigger if exists familie_nieuw_dossier on public.familie_dossiers;
create trigger familie_nieuw_dossier before insert or update on public.familie_dossiers
  for each row execute function private.familie_nieuw_dossier();
drop trigger if exists familie_na_dossier on public.familie_dossiers;
create trigger familie_na_dossier after insert on public.familie_dossiers
  for each row execute function private.familie_na_dossier();

-- Leden: maximaal 8 per dossier; de laatste regelaar kan niet weg
create or replace function private.familie_lid_controle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.familie_leden l where l.dossier_id = new.dossier_id and l.ingetrokken is null) >= 8 then
      raise exception 'max_leden' using errcode = 'P0001';
    end if;
    new.email := lower(new.email);
    return new;
  end if;
  if old.rol = 'regelaar' and old.ingetrokken is null and (new.rol <> 'regelaar' or new.ingetrokken is not null)
     and not exists (select 1 from public.familie_leden l where l.dossier_id = old.dossier_id and l.id <> old.id and l.rol = 'regelaar' and l.ingetrokken is null and l.user_id is not null) then
    raise exception 'laatste_regelaar' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists familie_lid_controle on public.familie_leden;
create trigger familie_lid_controle before insert or update on public.familie_leden
  for each row execute function private.familie_lid_controle();

-- Items: geen BSN, maximaal 3000 per dossier, wijzigdatum bijhouden
create or replace function private.familie_item_controle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.familie_bevat_bsn(new.inhoud::text) then
    raise exception 'bsn_niet_toegestaan' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.familie_items i where i.dossier_id = new.dossier_id) >= 3000 then
      raise exception 'max_items' using errcode = 'P0001';
    end if;
    if auth.uid() is not null then new.door := auth.uid(); end if;
  else
    new.dossier_id := old.dossier_id;
    new.soort := old.soort;
    new.gewijzigd := now();
  end if;
  return new;
end $$;
drop trigger if exists familie_item_controle on public.familie_items;
create trigger familie_item_controle before insert or update on public.familie_items
  for each row execute function private.familie_item_controle();

-- Logboek: alleen toevoegen, en elke regel sluit aan op de vorige (hash-keten)
create or replace function private.familie_logboek_controle() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_vorige text;
begin
  if tg_op <> 'INSERT' then
    raise exception 'logboek_alleen_toevoegen' using errcode = '42501';
  end if;
  if private.familie_bevat_bsn(new.omschrijving) then
    raise exception 'bsn_niet_toegestaan' using errcode = 'P0001';
  end if;
  perform 1 from public.familie_dossiers d where d.id = new.dossier_id for update;
  select l.hash into v_vorige from public.familie_logboek l where l.dossier_id = new.dossier_id order by l.volgnr desc limit 1;
  if coalesce(v_vorige, '') <> new.vorige_hash then
    raise exception 'keten_sluit_niet_aan' using errcode = 'P0001';
  end if;
  if new.corrigeert_id is not null and not exists (select 1 from public.familie_logboek l where l.id = new.corrigeert_id and l.dossier_id = new.dossier_id) then
    raise exception 'onbekende_regel' using errcode = 'P0001';
  end if;
  if auth.uid() is not null then new.door := auth.uid(); end if;
  new.vastgelegd := now();
  return new;
end $$;
drop trigger if exists familie_logboek_controle on public.familie_logboek;
create trigger familie_logboek_controle before insert or update or delete on public.familie_logboek
  for each row execute function private.familie_logboek_controle();

-- Audit: wie deed wat (zonder inhoud)
create or replace function private.familie_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_table_name = 'familie_dossiers' then
    if tg_op = 'DELETE' then return old; end if;
    insert into public.familie_audit (dossier_id, user_id, actie, object, object_id) values (r.id, auth.uid(), lower(tg_op), 'dossier', r.id);
  elsif exists (select 1 from public.familie_dossiers d where d.id = r.dossier_id) then
    insert into public.familie_audit (dossier_id, user_id, actie, object, object_id)
    values (r.dossier_id, auth.uid(), lower(tg_op), case tg_table_name when 'familie_items' then pg_catalog.to_jsonb(r) ->> 'soort' when 'familie_leden' then 'lid' else 'logboek' end, r.id);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists familie_audit on public.familie_dossiers;
create trigger familie_audit after insert or update on public.familie_dossiers for each row execute function private.familie_audit();
drop trigger if exists familie_audit on public.familie_items;
create trigger familie_audit after insert or update or delete on public.familie_items for each row execute function private.familie_audit();
drop trigger if exists familie_audit on public.familie_leden;
create trigger familie_audit after insert or update on public.familie_leden for each row execute function private.familie_audit();
drop trigger if exists familie_audit on public.familie_logboek;
create trigger familie_audit after insert on public.familie_logboek for each row execute function private.familie_audit();

-- ── Functies voor de app ────────────────────────────────────────────

-- Iemand uitnodigen (alleen een regelaar). De persoon neemt aan na het inloggen.
create or replace function public.familie_uitnodigen(p_dossier uuid, p_email text, p_naam text, p_rol text default 'meekijker') returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v uuid := private.gebruiker();
  v_id uuid;
begin
  if not private.familie_mag_schrijven(p_dossier) then
    raise exception 'niet_toegestaan' using errcode = '42501';
  end if;
  if p_rol not in ('regelaar', 'meekijker', 'ouder', 'executeur') then
    raise exception 'onbekende_rol' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.familie_leden l where l.dossier_id = p_dossier and lower(l.email) = lower(trim(p_email)) and l.ingetrokken is null) then
    raise exception 'al_uitgenodigd' using errcode = 'P0001';
  end if;
  insert into public.familie_leden (dossier_id, email, naam, rol, uitgenodigd_door)
  values (p_dossier, lower(trim(p_email)), trim(p_naam), p_rol, v) returning id into v_id;
  return v_id;
end $$;

-- Openstaande uitnodigingen op mijn e-mailadres aannemen
create or replace function public.familie_aannemen() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v uuid := private.gebruiker();
  n integer;
begin
  update public.familie_leden l set user_id = v
  where l.user_id is null and l.ingetrokken is null and lower(l.email) = lower(auth.email())
    and not exists (select 1 from public.familie_leden x where x.dossier_id = l.dossier_id and x.user_id = v);
  get diagnostics n = row_count;
  return n;
end $$;

-- Een lid intrekken of van rol wisselen (alleen een regelaar); jezelf terugtrekken mag altijd
create or replace function public.familie_lid_wijzigen(p_lid uuid, p_rol text default null, p_intrekken boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v uuid := private.gebruiker();
  l public.familie_leden;
begin
  select * into l from public.familie_leden where id = p_lid;
  if not found then raise exception 'onbekend_lid' using errcode = 'P0001'; end if;
  if not (private.familie_mag_schrijven(l.dossier_id) or (l.user_id = v and p_intrekken and p_rol is null)) then
    raise exception 'niet_toegestaan' using errcode = '42501';
  end if;
  if p_rol is not null and p_rol not in ('regelaar', 'meekijker', 'ouder', 'executeur') then
    raise exception 'onbekende_rol' using errcode = 'P0001';
  end if;
  update public.familie_leden set rol = coalesce(p_rol, rol), ingetrokken = case when p_intrekken then now() else ingetrokken end where id = p_lid;
  if p_intrekken and l.user_id is not null then
    delete from public.familie_sleutels s where s.dossier_id = l.dossier_id and s.user_id = l.user_id;
  end if;
end $$;

-- Een uitnodiging van een partner activeren: maakt een dossier in afwikkeling
create or replace function public.familie_partner_activeren(p_code uuid, p_naam text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v uuid := private.gebruiker();
  u public.familie_uitnodigingen;
  v_dossier uuid;
begin
  select * into u from public.familie_uitnodigingen where code = p_code and geactiveerd is null for update;
  if not found then raise exception 'onbekende_code' using errcode = 'P0001'; end if;
  insert into public.familie_dossiers (naam, status) values (trim(p_naam), 'overlijden') returning id into v_dossier;
  update public.familie_dossiers set partner_id = u.partner_id, abonnement = 'partner' where id = v_dossier;
  update public.familie_uitnodigingen set geactiveerd = now(), dossier_id = v_dossier where id = u.id;
  return v_dossier;
end $$;

-- Opruimen: gearchiveerde dossiers na hun datum, oude uitnodigingen
create or replace function private.familie_opruimen() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n_dossiers integer;
  n_uitnodigingen integer;
begin
  delete from public.familie_dossiers where verwijderen_op is not null and verwijderen_op < current_date;
  get diagnostics n_dossiers = row_count;
  delete from public.familie_leden where user_id is null and toegevoegd < now() - interval '30 days';
  get diagnostics n_uitnodigingen = row_count;
  return jsonb_build_object('dossiers', n_dossiers, 'uitnodigingen', n_uitnodigingen);
end $$;

-- ── Row level security ──────────────────────────────────────────────
alter table public.familie_dossiers enable row level security;
alter table public.familie_leden enable row level security;
alter table public.familie_items enable row level security;
alter table public.familie_logboek enable row level security;
alter table public.familie_sleutels enable row level security;
alter table public.familie_audit enable row level security;
alter table public.familie_partners enable row level security;
alter table public.familie_partner_leden enable row level security;
alter table public.familie_uitnodigingen enable row level security;
alter table public.familie_betalingen enable row level security;
alter table public.familie_hulp enable row level security;

drop policy if exists familie_dossiers_lezen on public.familie_dossiers;
create policy familie_dossiers_lezen on public.familie_dossiers for select to authenticated
  using (private.familie_is_lid(id) or eigenaar = auth.uid());
drop policy if exists familie_dossiers_maken on public.familie_dossiers;
create policy familie_dossiers_maken on public.familie_dossiers for insert to authenticated with check (true);
drop policy if exists familie_dossiers_wijzigen on public.familie_dossiers;
create policy familie_dossiers_wijzigen on public.familie_dossiers for update to authenticated
  using (private.familie_mag_schrijven(id)) with check (private.familie_mag_schrijven(id));
drop policy if exists familie_dossiers_weg on public.familie_dossiers;
create policy familie_dossiers_weg on public.familie_dossiers for delete to authenticated
  using (private.familie_rol(id) = 'regelaar');

drop policy if exists familie_leden_lezen on public.familie_leden;
create policy familie_leden_lezen on public.familie_leden for select to authenticated
  using (private.familie_is_lid(dossier_id));

drop policy if exists familie_items_lezen on public.familie_items;
create policy familie_items_lezen on public.familie_items for select to authenticated
  using (private.familie_is_lid(dossier_id));
-- Meekijkers mogen taken oppakken en toevoegen; de rest doet de regelaar
drop policy if exists familie_items_maken on public.familie_items;
create policy familie_items_maken on public.familie_items for insert to authenticated
  with check (private.familie_mag_schrijven(dossier_id) or (soort in ('taken', 'afspraken') and private.familie_rol(dossier_id) = 'meekijker'));
drop policy if exists familie_items_wijzigen on public.familie_items;
create policy familie_items_wijzigen on public.familie_items for update to authenticated
  using (private.familie_mag_schrijven(dossier_id) or (soort = 'taken' and private.familie_rol(dossier_id) = 'meekijker'))
  with check (private.familie_mag_schrijven(dossier_id) or (soort = 'taken' and private.familie_rol(dossier_id) = 'meekijker'));
drop policy if exists familie_items_weg on public.familie_items;
create policy familie_items_weg on public.familie_items for delete to authenticated
  using (private.familie_mag_schrijven(dossier_id));

drop policy if exists familie_logboek_lezen on public.familie_logboek;
create policy familie_logboek_lezen on public.familie_logboek for select to authenticated
  using (private.familie_is_lid(dossier_id));
drop policy if exists familie_logboek_maken on public.familie_logboek;
create policy familie_logboek_maken on public.familie_logboek for insert to authenticated
  with check (private.familie_rol(dossier_id) in ('regelaar', 'executeur', 'meekijker'));

drop policy if exists familie_sleutels_eigen on public.familie_sleutels;
create policy familie_sleutels_eigen on public.familie_sleutels for select to authenticated
  using (user_id = auth.uid() and private.familie_is_lid(dossier_id));
-- Een lid mag de sleutel voor een ander lid klaarzetten (opnieuw inpakken)
drop policy if exists familie_sleutels_maken on public.familie_sleutels;
create policy familie_sleutels_maken on public.familie_sleutels for insert to authenticated
  with check (private.familie_is_lid(dossier_id) and exists (select 1 from public.familie_leden l where l.dossier_id = familie_sleutels.dossier_id and l.user_id = familie_sleutels.user_id and l.ingetrokken is null));

drop policy if exists familie_audit_lezen on public.familie_audit;
create policy familie_audit_lezen on public.familie_audit for select to authenticated
  using (private.familie_is_lid(dossier_id));

drop policy if exists familie_partners_eigen on public.familie_partners;
create policy familie_partners_eigen on public.familie_partners for select to authenticated
  using (eigenaar = auth.uid() or exists (select 1 from public.familie_partner_leden p where p.partner_id = id and p.user_id = auth.uid()));
drop policy if exists familie_partner_leden_eigen on public.familie_partner_leden;
create policy familie_partner_leden_eigen on public.familie_partner_leden for select to authenticated
  using (user_id = auth.uid());
drop policy if exists familie_uitnodigingen_partner on public.familie_uitnodigingen;
create policy familie_uitnodigingen_partner on public.familie_uitnodigingen for select to authenticated
  using (exists (select 1 from public.familie_partners p where p.id = partner_id and p.eigenaar = auth.uid())
      or exists (select 1 from public.familie_partner_leden p where p.partner_id = familie_uitnodigingen.partner_id and p.user_id = auth.uid()));
drop policy if exists familie_uitnodigingen_maken on public.familie_uitnodigingen;
create policy familie_uitnodigingen_maken on public.familie_uitnodigingen for insert to authenticated
  with check (exists (select 1 from public.familie_partners p where p.id = partner_id and p.eigenaar = auth.uid())
           or exists (select 1 from public.familie_partner_leden p where p.partner_id = familie_uitnodigingen.partner_id and p.user_id = auth.uid()));

drop policy if exists familie_betalingen_eigen on public.familie_betalingen;
create policy familie_betalingen_eigen on public.familie_betalingen for select to authenticated
  using (user_id = auth.uid());
drop policy if exists familie_hulp_eigen on public.familie_hulp;
create policy familie_hulp_eigen on public.familie_hulp for select to authenticated
  using (user_id = auth.uid());

-- ── Rechten: eerst alles weg, dan gericht ───────────────────────────
revoke all on table public.familie_dossiers, public.familie_leden, public.familie_items, public.familie_logboek, public.familie_sleutels,
  public.familie_audit, public.familie_partners, public.familie_partner_leden, public.familie_uitnodigingen, public.familie_betalingen, public.familie_hulp
  from public, anon, authenticated, service_role;
revoke all on sequence public.familie_audit_id_seq from public, anon, authenticated, service_role;
revoke execute on function private.familie_bevat_bsn(text), private.familie_rol(uuid), private.familie_is_lid(uuid), private.familie_mag_schrijven(uuid),
  private.familie_nieuw_dossier(), private.familie_na_dossier(), private.familie_lid_controle(), private.familie_item_controle(),
  private.familie_logboek_controle(), private.familie_audit(), private.familie_opruimen() from public, anon, authenticated;
revoke execute on function public.familie_uitnodigen(uuid, text, text, text), public.familie_aannemen(), public.familie_lid_wijzigen(uuid, text, boolean),
  public.familie_partner_activeren(uuid, text) from public, anon;

grant execute on function private.familie_rol(uuid), private.familie_is_lid(uuid), private.familie_mag_schrijven(uuid) to authenticated;
grant execute on function public.familie_uitnodigen(uuid, text, text, text), public.familie_aannemen(), public.familie_lid_wijzigen(uuid, text, boolean),
  public.familie_partner_activeren(uuid, text) to authenticated;

grant select, delete on public.familie_dossiers to authenticated;
grant insert (naam, geboortejaar, status, overlijdensdatum, profiel, toestemming) on public.familie_dossiers to authenticated;
grant update (naam, geboortejaar, status, overlijdensdatum, profiel, toestemming, verwijderen_op) on public.familie_dossiers to authenticated;
grant select on public.familie_leden to authenticated;
grant select, delete on public.familie_items to authenticated;
grant insert (dossier_id, soort, inhoud) on public.familie_items to authenticated;
grant insert (id, dossier_id, soort, inhoud) on public.familie_items to authenticated;
grant update (inhoud) on public.familie_items to authenticated;
grant select on public.familie_logboek to authenticated;
grant insert (id, dossier_id, datum, bedrag_cent, richting, categorie, omschrijving, rekening, bon_id, door_naam, corrigeert_id, vorige_hash, hash) on public.familie_logboek to authenticated;
grant select on public.familie_sleutels to authenticated;
grant insert (dossier_id, user_id, pakket) on public.familie_sleutels to authenticated;
grant select on public.familie_audit, public.familie_partners, public.familie_partner_leden, public.familie_betalingen, public.familie_hulp to authenticated;
grant select on public.familie_uitnodigingen to authenticated;
grant insert (partner_id, email_hash) on public.familie_uitnodigingen to authenticated;

-- De server (Edge Functions met de service_role-sleutel)
grant usage on schema private to service_role;
grant execute on function private.familie_opruimen() to service_role;
grant select, insert, update on public.familie_betalingen to service_role;
grant select, update (abonnement, betaald_tot, verwijderen_op, partner_id) on public.familie_dossiers to service_role;
grant select, insert, update on public.familie_partners to service_role;
grant select, insert, update on public.familie_hulp to service_role;
grant select on public.familie_leden to service_role;
