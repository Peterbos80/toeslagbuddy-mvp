-- DealBuddy: persoonlijke jagers met een account (los van Pro).
-- Zonder account staan jagers alleen in de browser; met account draait
-- scripts/deals/agent.js ze op de server en mailt een rapport (met bewijs).
--
-- Tabellen:
--   deals_jachten   een jacht per regel; criteria als jsonb (gecontroleerd)
--   deals_rapporten de rapporten (tijdlijn) per jacht
-- Rechten: iedereen ziet en wijzigt alleen zijn eigen jachten; rapporten
-- schrijft alleen de server (service_role). Max. 20 jachten per gebruiker.
-- Account verwijderen (public.account_verwijderen) verwijdert alles via
-- 'on delete cascade' op auth.users.

create schema if not exists private;

-- Criteria zoals src/deals/opdracht.js ze maakt
create or replace function private.deals_criteria_ok(c jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(c) = 'object'
    and pg_catalog.octet_length(c::text) <= 4000
    and c ->> 'soort' in ('product', 'vlucht')
    and (c -> 'maxTotaal' is null or jsonb_typeof(c -> 'maxTotaal') = 'null'
         or (jsonb_typeof(c -> 'maxTotaal') = 'number' and (c ->> 'maxTotaal')::numeric > 0 and (c ->> 'maxTotaal')::numeric <= 100000))
    and (c -> 'minKorting' is null or jsonb_typeof(c -> 'minKorting') = 'null'
         or (jsonb_typeof(c -> 'minKorting') = 'number' and (c ->> 'minKorting')::numeric between 0 and 95))
    and (c ->> 'soort' <> 'vlucht' or (
         coalesce(c #>> '{vlucht,van}', '') ~ '^[A-Z]{3}$'
         and coalesce(c #>> '{vlucht,naar}', '') ~ '^[A-Z]{3}$'
         and (c #>> '{vlucht,maand}' is null or c #>> '{vlucht,maand}' ~ '^\d{4}-\d{2}$')))
    and (c ->> 'soort' <> 'product' or pg_catalog.char_length(coalesce(c ->> 'zoekterm', '') || coalesce(c ->> 'merk', '')) between 1 and 200)
$$;

create table if not exists public.deals_jachten (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  omschrijving text not null check (char_length(omschrijving) between 1 and 200),
  criteria jsonb not null check (private.deals_criteria_ok(criteria)),
  kanaal text not null default 'email' check (kanaal in ('email', 'app')),
  frequentie text not null default 'dag' check (frequentie in ('uur', 'dag', 'week')),
  actief boolean not null default true,
  -- Toestemming voor de mail (AVG): tijdstip van het aanvinken
  toestemming timestamptz not null,
  afmeld_token uuid not null default gen_random_uuid() unique,
  aangemaakt timestamptz not null default now(),
  laatst_gedraaid timestamptz,
  laatst_gemeld timestamptz
);
create index if not exists deals_jachten_user on public.deals_jachten (user_id);

create table if not exists public.deals_rapporten (
  id bigserial primary key,
  jacht_id uuid not null references public.deals_jachten (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tijd timestamptz not null default now(),
  rapport jsonb not null check (jsonb_typeof(rapport) = 'object' and pg_catalog.octet_length(rapport::text) <= 20000),
  gemeld boolean not null default false
);
create index if not exists deals_rapporten_jacht on public.deals_rapporten (jacht_id, tijd desc);

-- Max. 20 jachten per gebruiker; user_id altijd de ingelogde gebruiker
create or replace function private.deals_jacht_controle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and new.user_id is distinct from auth.uid() then
    raise exception 'niet_toegestaan' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.deals_jachten j where j.user_id = new.user_id) >= 20 then
    raise exception 'max_jachten' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists deals_jacht_controle on public.deals_jachten;
create trigger deals_jacht_controle before insert or update on public.deals_jachten
  for each row execute function private.deals_jacht_controle();

alter table public.deals_jachten enable row level security;
alter table public.deals_rapporten enable row level security;

drop policy if exists deals_jachten_eigen on public.deals_jachten;
create policy deals_jachten_eigen on public.deals_jachten for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists deals_rapporten_eigen on public.deals_rapporten;
create policy deals_rapporten_eigen on public.deals_rapporten for select to authenticated
  using (user_id = auth.uid());
drop policy if exists deals_rapporten_weg on public.deals_rapporten;
create policy deals_rapporten_weg on public.deals_rapporten for delete to authenticated
  using (user_id = auth.uid());

-- Afmelden via de link in de mail (zonder in te loggen): zet de jacht uit
create or replace function public.deals_afmelden(p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.deals_jachten set actief = false where afmeld_token = p_token and actief;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'afgemeld', n > 0);
end $$;

-- Rechten: eerst alles weg (Supabase geeft standaard alles), dan gericht
revoke all on table public.deals_jachten, public.deals_rapporten from public, anon, authenticated, service_role;
revoke all on sequence public.deals_rapporten_id_seq from public, anon, authenticated, service_role;
revoke execute on function private.deals_criteria_ok(jsonb), private.deals_jacht_controle() from public, anon, authenticated;
revoke execute on function public.deals_afmelden(uuid) from public;
grant usage on schema private to service_role;
grant execute on function private.deals_criteria_ok(jsonb) to authenticated, service_role;
grant select, delete on public.deals_jachten to authenticated;
grant insert (omschrijving, criteria, kanaal, frequentie, toestemming) on public.deals_jachten to authenticated;
grant update (omschrijving, criteria, kanaal, frequentie, actief) on public.deals_jachten to authenticated;
grant select, delete on public.deals_rapporten to authenticated;
grant execute on function public.deals_afmelden(uuid) to anon, authenticated;
-- De agent (scripts/deals/agent.js) werkt met de service_role-sleutel
grant select, update (laatst_gedraaid, laatst_gemeld, actief) on public.deals_jachten to service_role;
grant select, insert, update (gemeld) on public.deals_rapporten to service_role;
grant usage on sequence public.deals_rapporten_id_seq to service_role;
