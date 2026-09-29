# ToeslagBuddy Pro: accounts en proefabonnement activeren

Alles is gebouwd en getest:
- aanmelden (`/pro/aanmelden/`);
- inloggen met een link per e-mail (`/pro/inloggen/`);
- de afgeschermde omgeving (`/pro/app/`) met de cliëntencheck, het accountoverzicht, een abonnement aanvragen en uitleg;
- een gratis proef van 7 dagen die vanzelf verloopt.

Zolang Supabase niet is ingesteld, toont de omgeving een nette melding. Aanvragen voor een proef komen dan als e-mail bij je binnen via het formulier.

**Demo zonder account (voor je verkoopgesprekken):** open `https://www.toeslagbuddy.nl/pro/aanmelden/?demo=1`. Het account bestaat dan alleen in die browser.

## Eenmalig instellen (ongeveer 15 minuten)

1. **Project aanmaken.** Maak een gratis account op **supabase.com** en een nieuw project. Kies regio **Frankfurt (EU)**, zodat de gegevens in de EU blijven.
2. **Database klaarzetten.** Open **SQL Editor**, plak de inhoud van `supabase/migrations/20260929_pro.sql` en klik op **Run**. Dit maakt:
   - de tabel `pro_profielen`, met beveiliging waardoor iedereen alleen zijn eigen gegevens ziet;
   - een automatische proefperiode van 7 dagen voor elke nieuwe gebruiker.
3. **Inloggen instellen.** Ga naar **Authentication → URL Configuration**:
   - *Site URL:* `https://www.toeslagbuddy.nl`
   - *Redirect URLs:* `https://www.toeslagbuddy.nl/pro/app/`
4. **E-mailtekst in het Nederlands.** Ga naar **Authentication → Emails → Magic Link** en pas onderwerp en tekst aan, bijvoorbeeld "Je inloglink voor ToeslagBuddy Pro".
5. **Aanbevolen: eigen verzendserver (SMTP).** De ingebouwde mail van Supabase mag maar een paar mails per uur versturen. Zet onder **Authentication → SMTP Settings** een verzendserver in, bijvoorbeeld Brevo of Resend. Voor de eerste proefklanten werkt de ingebouwde mail ook.
6. **Sleutels naar de site.** Kopieer bij **Project Settings → API** de *Project URL* en de *anon public key* naar `site.config.js`, bij `pro.supabaseUrl` en `pro.supabaseAnonKey`. Push daarna naar GitHub. De anon key is bedoeld om openbaar te zijn; de beveiliging zit in de databaseregels uit stap 2.

   **Deel nooit de *service_role key*.**

## Beheer

- **Nieuwe proefaccounts** zie je in **Table Editor → pro_profielen**. Je krijgt bij elke aanmelding ook een e-mail via het formulier (zie [email.md](email.md)).
- **Abonnement activeren na betaling:** zet in `pro_profielen` de kolom `abonnement` op `actief`. De klant houdt dan toegang. De klant kan dit zelf niet aanpassen.
- **Proef verlengen:** pas `proef_eind` aan.
- **Later automatisch betalen:** koppel Mollie (iDEAL of incasso) via een Supabase Edge Function die `abonnement` op `actief` zet. Die staat in de [backlog](backlog.md).

## Hoe het werkt (en waarom het veilig is)

- **Geen wachtwoorden.** Je logt in met een link per e-mail.
- **Proefperiode in de database.** De proefperiode en het abonnement staan in de database en de gebruiker kan ze zelf niet wijzigen. Dat regelen de databaseregels (Row Level Security en kolomrechten).
- **Cliëntgegevens blijven op de computer.** De cliëntencheck draait in de browser van de bewindvoerder. Supabase bewaart alleen naam, organisatie, e-mail en abonnementsgegevens.
- **Getest.** De browsertests in `test/e2e/site.e2e.js` doorlopen aanmelden, de omgeving, de proefstatus, een verlopen proef en uitloggen (in demomodus).
