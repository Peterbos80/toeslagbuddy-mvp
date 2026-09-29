# Plan: online accounts voor zzp'ers (Toeslagbewaker Plus)

## Wat er nu al werkt (zonder account)

- **De toeslagbewaker**: winstprognose, vergelijking met het opgegeven inkomen, advies en een maandelijkse herinnering in de agenda.
- **Mijn toeslagbewaker**: checks bewaren, geschiedenis bekijken, exporteren en importeren. Dit staat alleen op het eigen apparaat, dus de privacy is maximaal en er is niets om te hacken.
- Alles is getest in de browsertests (`test/e2e/site.e2e.js`).

## Waarom accounts nog niet live staan

Een account-omgeving met inloggen, een database en betalen kan ik bouwen. Hij kan alleen niet goed getest worden zonder jouw eigen accounts bij een hostingpartij (database en inloggen) en een betaalprovider. Een onvoldoende geteste inlogomgeving met financiële gegevens van zzp'ers is een groot risico, voor die zzp'ers en voor jou onder de AVG.

Daarom deze volgorde: **eerst meten of er vraag is** (de wachtlijst op `/zzp-toeslagen/`), dan bouwen.

**Wanneer bouwen:** als er meer dan 300 aanmeldingen op de wachtlijst staan, of als 20 zzp'ers zeggen dat ze € 4–5 per maand willen betalen.

## Architectuur (als het doorgaat)

| Onderdeel | Keuze | Waarom |
|---|---|---|
| Voorkant | De bestaande statische site | Snel, goedkoop, al getest |
| Inloggen | **Supabase Auth** met inloglink per e-mail (geen wachtwoorden) | Eenvoudig voor de doelgroep, veilig |
| Database | **Supabase Postgres**, regio EU (Frankfurt), met Row Level Security | Iedere gebruiker ziet alleen zijn eigen gegevens |
| Betalen | **Mollie** (iDEAL, automatische incasso) met terugkoppeling naar een Supabase Edge Function | Nederlands, iDEAL, abonnementen |
| Boekhoudkoppeling | Moneybird-API (OAuth), later e-Boekhouden | Winst automatisch ophalen, maandelijks een seintje |
| Testen | Een aparte Supabase-testomgeving. GitHub Actions draait inloggen, bewaren, betalen (Mollie testmodus) en opzeggen, en publiceert alleen als alles slaagt | Zo test je elke functie voordat hij live gaat |
| Privacy | Verwerkersovereenkomsten met Supabase en Mollie, privacyverklaring bijwerken, alleen noodzakelijke gegevens opslaan (geen BSN) | AVG |

**Kosten (indicatie):**
- Supabase: gratis in het begin, later ongeveer € 25 per maand.
- Mollie: een klein bedrag per transactie.
- Moneybird-API: gratis.

## Wat ik van jou nodig heb om te bouwen

1. Een **Supabase**-account met twee projecten, `toeslagbuddy-test` en `toeslagbuddy-prod`, beide in regio EU.
2. Een **Mollie**-account. Testmodus is genoeg om te beginnen.
3. De sleutels als **GitHub-secrets**, nooit in de chat:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (alleen voor de testomgeving)
   - `MOLLIE_API_KEY`

## Wat de beste in de markt maakt

1. Het enige hulpmiddel dat zzp-winst uit de boekhouding koppelt aan toeslagen, met een seintje vóórdat er een terugvordering komt.
2. Eenvoudig: één getal per maand, advies in gewone taal.
3. Privacy voorop: minimale gegevens, alles in de EU, en de gebruiker kan alles zelf exporteren of verwijderen.
