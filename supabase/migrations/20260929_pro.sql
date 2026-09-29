-- ToeslagBuddy Pro: profielen met proefperiode van 7 dagen.
-- Uitvoeren in Supabase → SQL Editor (eenmalig), of met de Supabase CLI.

create table if not exists public.pro_profielen (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  naam text,
  organisatie text,
  clienten integer,
  proef_eind timestamptz not null default now() + interval '7 days',
  abonnement text not null default 'proef' check (abonnement in ('proef', 'actief', 'opgezegd')),
  aangemaakt timestamptz not null default now()
);

alter table public.pro_profielen enable row level security;

-- Iedere gebruiker ziet alleen zijn eigen profiel
drop policy if exists "eigen profiel lezen" on public.pro_profielen;
create policy "eigen profiel lezen" on public.pro_profielen
  for select using (auth.uid() = id);

-- Alleen naam, organisatie en aantal cliënten mogen door de gebruiker zelf
-- worden aangepast. Proefperiode en abonnement kan alleen de beheerder wijzigen.
drop policy if exists "eigen profiel bijwerken" on public.pro_profielen;
create policy "eigen profiel bijwerken" on public.pro_profielen
  for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on public.pro_profielen from authenticated, anon;
grant select on public.pro_profielen to authenticated;
grant update (naam, organisatie, clienten) on public.pro_profielen to authenticated;

-- Bij elke nieuwe gebruiker automatisch een profiel met 7 dagen proef
create or replace function public.nieuw_pro_profiel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pro_profielen (id, email, naam, organisatie, clienten)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'naam',
    new.raw_user_meta_data ->> 'organisatie',
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'clienten', ''), '\D', '', 'g'), '')::integer
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists bij_nieuwe_gebruiker on auth.users;
create trigger bij_nieuwe_gebruiker
  after insert on auth.users
  for each row execute function public.nieuw_pro_profiel();
