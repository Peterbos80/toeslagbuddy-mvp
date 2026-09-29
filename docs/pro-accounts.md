# Pro, berichten en beheer live zetten (stappenplan)

Dit stappenplan zet alles live wat in de code klaarstaat:
- **Pro** (`/pro/aanmelden/`, `/pro/inloggen/`, `/pro/app/`): inloggen met een code per e-mail, een organisatie met een proef van 7 dagen, team (uitnodigingslinks), rapportage, gegevens downloaden en account verwijderen;
- **berichten**: de formulieren op de site komen via de database en Brevo in je privé-mailbox;
- **beheer** (`/beheer/`): cijfers, organisaties (pilot, actief, opgezegd) en berichten, alleen met MFA.

**Tijd:** 1 à 2 uur, plus wachttijd voor DNS (tot 48 uur).

**Zolang dit niet is ingesteld:**
- Pro toont een nette melding; de demo werkt altijd: `/pro/aanmelden/?demo=1` en `/beheer/?demo=1` (code: `123456`). De demo bewaart alles alleen in die browser.
- De formulieren tonen "mail naar info@toeslagbuddy.nl".

**Je hebt nodig:** toegang tot de DNS van toeslagbuddy.nl (TransIP), je mailbox (met doorsturen van info@, zie [email.md](email.md)), een wachtwoordkluis en een authenticator-app. Zet overal **MFA** aan: Supabase, Brevo, GitHub, TransIP en je mailbox.

## Stap 1. Supabase-project (EU, Pro-plan)

1. Maak een account op **supabase.com** en zet MFA aan (Account → Security).
2. Maak een nieuw project. Kies regio **Frankfurt (eu-central-1)**. Zet het databasewachtwoord in je wachtwoordkluis.
3. Neem het **Pro-plan** (ongeveer $25 per maand) vóór de eerste pilot. Het gratis plan pauzeert na 7 dagen zonder activiteit en maakt geen downloadbare back-ups.
4. Leg vast welke versie van de verwerkersovereenkomst (DPA) van Supabase geldt, met de datum. Die geldt door het accepteren van de voorwaarden.

## Stap 2. Database klaarzetten

1. Ga naar **Database → Extensions** en zet **pg_cron** en **pg_net** aan. (`pgcrypto` staat al aan.)
2. Open **SQL Editor**, plak de hele inhoud van `supabase/migrations/20260930_suite.sql` en klik op **Run**.
   - Dit maakt de tabellen, de beveiliging (RLS, rechten), de functies, het auditlog en twee geplande taken: dagelijks opruimen (berichten na 90 dagen, auditlog na 365 dagen, verlopen proeven 90 dagen na afloop) en elk kwartier berichten opnieuw doorsturen die nog niet verstuurd zijn.
   - Zie je de melding "pg_cron staat niet aan"? Zet pg_cron aan en voer alleen het laatste blok (`do $$ … $$;`) opnieuw uit.
   - Liever via de terminal: `supabase link --project-ref <ref>` en daarna `supabase db push`.
3. Draai de **rooktest** uit stap 10.

## Stap 3. Brevo voor alle mail (EU)

Brevo (Frankrijk) verstuurt zowel de inlogcodes als de doorgestuurde berichten. De ingebouwde mail van Supabase mailt alleen naar teamleden en maar een paar keer per uur; die is niet bruikbaar.

1. Maak een account op **brevo.com** en zet MFA aan.
2. **Senders, Domains & Dedicated IPs → Domains → Add a domain:** `toeslagbuddy.nl`. Brevo toont DNS-records. Zet ze bij TransIP onder **DNS**:

| Naam | Type | Waarde |
|---|---|---|
| `@` | TXT | de `brevo-code:…` die Brevo toont |
| `brevo1._domainkey` en `brevo2._domainkey` (of wat Brevo toont) | CNAME of TXT | de DKIM-waarden van Brevo |
| `@` | TXT | `v=spf1 include:spf.improvmx.com include:spf.brevo.com ~all` |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:info@toeslagbuddy.nl` |

   - Er mag maar **één** SPF-record zijn. Staat er al een voor ImprovMX, vervang het dan door de regel hierboven.
   - Begin DMARC met `p=none`. Zijn de rapporten na 2 à 4 weken schoon, zet het dan op `p=quarantine`.
   - Gebruik altijd de waarden die Brevo je laat zien als die afwijken.
3. Voeg **info@toeslagbuddy.nl** toe als afzender (Senders) en bevestig het.
4. Maak onder **SMTP & API**:
   - een **API-sleutel** (voor de Edge Function, stap 5);
   - een **SMTP-sleutel** (voor Supabase Auth, stap 4).
   Zet beide in je wachtwoordkluis. Zet ze nooit in de repo.

## Stap 4. Inloggen (Supabase Auth)

1. **Authentication → URL Configuration**
   - *Site URL:* `https://www.toeslagbuddy.nl`
   - *Redirect URLs:* `https://www.toeslagbuddy.nl/pro/app/`
2. **Authentication → Emails → SMTP Settings → Enable custom SMTP**
   - Host `smtp-relay.brevo.com`, poort `587`
   - Gebruikersnaam: je Brevo-SMTP-login; wachtwoord: de SMTP-sleutel
   - Afzender `info@toeslagbuddy.nl`, naam `ToeslagBuddy`
3. **Authentication → Sign In / Providers → Email:** e-mail aan, *Email OTP Length* **6**, *Email OTP Expiration* **3600** seconden.
4. **Authentication → Emails → Templates.** Pas **Magic Link** én **Confirm signup** aan. De code is de hoofdroute, want Outlook Safe Links opent links vooraf en verbruikt ze. Voorbeeld:

   *Onderwerp:* `Je inlogcode voor ToeslagBuddy Pro`

   ```html
   <h2>Je inlogcode</h2>
   <p>Vul deze code in op de website:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>De code is 1 uur geldig. Je kunt ook op deze link klikken: <a href="{{ .ConfirmationURL }}">inloggen</a>.</p>
   <p>Heb je dit niet aangevraagd? Dan kun je deze mail negeren.</p>
   <p>ToeslagBuddy · info@toeslagbuddy.nl</p>
   ```

5. **Authentication → Rate Limits** (kan pas met eigen SMTP). Een goed begin:
   - e-mails per uur: 30;
   - aanmeldingen en inlogpogingen per 5 minuten per IP-adres: 30;
   - codecontroles per 5 minuten per IP-adres: 30.
6. **Authentication → Multi-Factor:** TOTP staat standaard aan. Laat dat zo.

## Stap 5. Edge Function `bericht-doorsturen`

Deze functie stuurt elk nieuw bericht via Brevo naar je privé-adres. Het adres staat alleen als geheim in Supabase.

1. Installeer de Supabase CLI en log in: `supabase login`, daarna `supabase link --project-ref <ref>`.
2. Zet de geheimen (typ ze in je terminal, niet in een bestand in de repo):

   ```sh
   supabase secrets set DOORSTUUR_EMAIL=jouw-prive-adres@example.com
   supabase secrets set BREVO_API_KEY=xkeysib-...
   supabase secrets set WEBHOOK_SECRET=$(openssl rand -hex 32)
   supabase secrets list   # controleer; bewaar het WEBHOOK_SECRET in je kluis
   ```

3. Zet de functie live. De database roept haar aan met het geheim, niet met een gebruikers-JWT:

   ```sh
   supabase functions deploy bericht-doorsturen --no-verify-jwt
   ```

4. Vertel de database waar de functie staat (in de **SQL Editor**, niet in de repo):

   ```sql
   insert into private.instellingen (sleutel, waarde) values
     ('doorstuur_url', 'https://<project-ref>.supabase.co/functions/v1/bericht-doorsturen'),
     ('webhook_geheim', '<hetzelfde WEBHOOK_SECRET>')
   on conflict (sleutel) do update set waarde = excluded.waarde;
   ```

   Nu stuurt een trigger elk nieuw bericht via pg_net door. Mislukt dat (bijvoorbeeld als het Brevo-quotum op is), dan blijft `doorgestuurd = false` staan en probeert pg_cron het elk kwartier opnieuw, maximaal 10 keer. In `/beheer/` zie je welke berichten nog niet zijn doorgestuurd.

   *Alternatief:* een **Database Webhook** in het dashboard (Database → Webhooks, bij *insert* op `berichten`, kop `x-webhook-secret`). Kies één van beide, anders krijg je mails dubbel.

5. Test het: verstuur het contactformulier (na stap 6) en controleer je mailbox. In de SQL Editor:

   ```sql
   select aangemaakt, soort, doorgestuurd, pogingen from public.berichten order by aangemaakt desc limit 5;
   select id, status_code, created from net._http_response order by created desc limit 5;
   ```

   Staat `doorgestuurd` op false? Kijk bij **Edge Functions → bericht-doorsturen → Logs**.

## Stap 6. Sleutels naar de site

1. Kopieer bij **Project Settings → API** de *Project URL* en de *anon public key* naar `site.config.js`, bij `pro.supabaseUrl` en `pro.supabaseAnonKey`.
2. Push naar GitHub. De site bouwt opnieuw.

De anon key is bedoeld om openbaar te zijn; de beveiliging zit in de database. **Zet nooit de `service_role`-sleutel in de repo of op de site.** Die staat alleen in Supabase (de Edge Function krijgt hem automatisch).

## Stap 7. Jezelf beheerder maken en MFA koppelen

1. Maak je beheerdersaccount aan bij **Authentication → Users → Add user → Create new user** (met *Auto Confirm User*). Gebruik een apart adres, niet je Pro-testaccount. Een beheerder krijgt geen proeforganisatie.
2. Zet jezelf in de beheerderslijst (SQL Editor):

   ```sql
   insert into public.beheerders (user_id)
   select id from auth.users where email = 'jouw-beheer-adres@example.com';
   ```

3. Ga naar `https://www.toeslagbuddy.nl/beheer/`, vraag een code aan en log in.
4. Scan de QR-code met je authenticator-app en vul de code in. **Bewaar de sleutel die eronder staat in je wachtwoordkluis.** Vanaf nu vraagt `/beheer/` elke keer om de code uit de app. De database eist dit ook: zonder AAL2 én een geverifieerde factor weigert elke beheerfunctie.

**Telefoon kwijt (R21):**
- Heb je de sleutel in je kluis? Voeg hem toe aan de authenticator-app op je nieuwe telefoon. Klaar.
- Geen sleutel meer? Log in op supabase.com (met je eigen MFA) en verwijder de oude factor: **Authentication → Users → jouw account → MFA factors → Delete**, of in de SQL Editor:
  `delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'jouw-beheer-adres@example.com');`
  Log daarna in op `/beheer/` en koppel een nieuwe factor.

## Stap 8. Antwoorden als info@ (send-as)

Antwoord op een doorgestuurd bericht **altijd vanaf info@toeslagbuddy.nl**, nooit vanaf je privé-adres. Anders ziet de afzender je privé-adres alsnog.
- Gmail: **Instellingen → Accounts → E-mail verzenden als → Nog een e-mailadres toevoegen** → `info@toeslagbuddy.nl`, via SMTP `smtp-relay.brevo.com`, poort 587, met je Brevo-SMTP-sleutel. Kies daarna "Antwoorden vanaf hetzelfde adres waar het bericht naartoe is gestuurd", of kies bij elk antwoord info@ als afzender.
- Elk bericht heeft als antwoordadres (reply-to) het adres van de bezoeker; je hoeft dat niet over te typen.

## Stap 9. Back-up en herstel één keer testen

Doe dit vóór de eerste pilot, en daarna eens per jaar.
1. **Database → Backups:** controleer dat er dagelijkse back-ups zijn (Pro-plan) en download de laatste.
2. Maak een tijdelijk tweede project en zet de back-up daarin terug volgens de actuele handleiding van Supabase ("Restore to a new project" of met `psql`).
3. Controleer in het testproject: `select count(*) from public.organisaties;` en `select count(*) from auth.users;` geven dezelfde aantallen.
4. Verwijder het testproject. Noteer de datum en de uitkomst in je incidenten- en beheerlogboek.

## Stap 10. Rooktest na de installatie

De databasetests in `test/db/` zijn **gesimuleerd** (PGlite: echte Postgres, maar het auth-schema, de rollen en de JWT zijn nagebootst). Draai daarom na de installatie deze rooktest in de **SQL Editor** van Supabase. Draai de blokken één voor één.

```sql
-- 1. RLS staat aan op elke tabel (verwacht: 0 rijen)
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'private') and c.relkind = 'r' and not c.relrowsecurity;

-- 2. anon mag alleen bericht_plaatsen uitvoeren (verwacht: 1 rij, bericht_plaatsen)
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute');

-- 3. anon en authenticated kunnen niet direct schrijven (verwacht: 0 rijen)
select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema in ('public', 'private') and grantee in ('anon', 'authenticated') and privilege_type <> 'SELECT';

-- 4. Elke security-definer-functie heeft een vaste, lege search_path (verwacht: 0 rijen)
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private') and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'], false);

-- 5. Geplande taken (verwacht: 2 rijen)
select jobname, schedule from cron.job where jobname like 'toeslagbuddy-%';

-- 6. De functies mogen gebruikers verwijderen (account verwijderen) (verwacht: true)
select has_table_privilege('postgres', 'auth.users', 'delete');

-- 7. Als anonieme bezoeker: plaatsen kan, lezen niet (verwacht: een fout "permission denied")
begin;
set local role anon;
select public.bericht_plaatsen(soort => 'contact', onderwerp => 'Rooktest', email => 'rooktest@example.com',
  tekst => 'test', gestart_op => now() - interval '10 seconds');
select count(*) from public.berichten;
rollback;

-- 8. Zonder bestaand account: geweigerd (verwacht: fout "niet_ingelogd")
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
set local role authenticated;
select public.mijn_omgeving();
rollback;

-- 9. Beheerfunctie zonder MFA: geweigerd (verwacht: fout "geen_beheerder")
begin;
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'aal', 'aal1',
  'sub', (select id from auth.users where email = 'jouw-beheer-adres@example.com'))::text, true);
set local role authenticated;
select public.beheer_statistieken();
rollback;
```

Wijkt een uitkomst af? Zet dan nog geen klanten op het systeem en zoek eerst uit waarom.

## Dagelijks gebruik

- **Nieuwe proeven, verlopen proeven, berichten:** `/beheer/`.
- **Proef verlengen tot een pilot van 30 dagen:** knop "Pilot 30 dagen" in `/beheer/`.
- **Klant heeft betaald:** knop "Actief". Dat kan alleen als de klant een KvK-nummer heeft ingevuld (Account in de app).
- **Opzegging:** knop "Opgezegd". De toegang stopt; de tellingen worden 12 maanden later gewist.
- Elke actie komt in het auditlog (`public.audit_log`, 1 jaar bewaard).
- **Later automatisch betalen:** Mollie via een Edge Function die het abonnement op actief zet (staat in de [backlog](backlog.md)).

## Hoe het werkt, en waarom het veilig is

- **Geen wachtwoorden.** Inloggen gaat met een code van 6 cijfers per e-mail; de link werkt ook.
- **De server beslist over de proef.** De browser vraagt de status op bij `mijn_omgeving()`. Opslaan, trend en team weigert de database zelf zodra de proef voorbij is.
- **Geen cliëntgegevens op de server.** De controle draait in de browser. Naar de server gaan alleen bandbreedtes ("10-49 cliënten"), aantallen onder de 5 als "<5" en bedragen afgerond op € 500 (pas vanaf 10 cliënten). De database weigert elke andere sleutel en elke tekst. De exacte cijfers blijven in de browser en worden gewist bij uitloggen.
- **Alles dicht, tenzij.** RLS op elke tabel; alle rechten ingetrokken en daarna gericht toegekend. Anonieme bezoekers kunnen alleen `bericht_plaatsen` aanroepen (met honeypot, minimale invultijd van 3 seconden, 3 berichten per uur per e-mailadres, 10 per IP-adres en 30 in totaal).
- **Beheer alleen met MFA.** Beheerfuncties eisen de beheerderslijst, AAL2 en een geverifieerde factor.
- **Getest:** `npm test` (rekenregels, aggregaat, gesimuleerde databasetests) en `npm run test:e2e` (browsertests in demomodus, ook een XSS-test op `/beheer/`).
