# E-mail: berichten komen binnen op je privé-adres, dat nergens zichtbaar is

Op de site staat alleen **info@toeslagbuddy.nl**. Dat moet volgens de wet (art. 3:15d BW) en het is een doorstuuradres. Je privé-adres staat nergens op de site en nergens in de repo. Dat is getest: de browsertest controleert dat er geen ander e-mailadres dan info@, privacy@ of security@ in de pagina's staat.

Berichten komen via twee routes binnen.

## 1. Formulieren op de site → database → Brevo → jouw mailbox

Dit geldt voor:
- het contactformulier (`/contact/`);
- aanvragen voor een Pro-pilot en een Pro-abonnement;
- de zzp-wachtlijst.

Zo werkt het:
1. Het formulier schrijft naar de tabel `berichten` in Supabase (EU, Frankfurt), via de functie `bericht_plaatsen`. Die heeft een honeypot, een minimale invultijd van 3 seconden en limieten (3 per uur per e-mailadres, 30 per uur in totaal).
2. De Edge Function `bericht-doorsturen` stuurt het bericht via **Brevo (EU)** door naar je privé-adres. Dat adres staat alleen als geheim `DOORSTUUR_EMAIL` in Supabase.
3. Het bericht komt binnen met als onderwerp `[ToeslagBuddy] …`, als afzender info@toeslagbuddy.nl en als antwoordadres het adres van de bezoeker.
4. Berichten worden na 90 dagen automatisch uit de database gewist.

**Instellen:** volg [pro-accounts.md](pro-accounts.md), stap 1 tot en met 6.

**Zolang dat niet is gebeurd,** tonen de formulieren: "Dit formulier werkt nog niet. Mail je bericht naar info@toeslagbuddy.nl" (met een link). Web3Forms (India) gebruiken we niet meer.

**Lukt versturen niet** (bijvoorbeeld als het Brevo-quotum op is)? Dan blijft het bericht in de database staan en probeert de server het elk kwartier opnieuw. In `/beheer/` zie je welke berichten nog niet zijn doorgestuurd. Is de bezoeker offline, dan blijft zijn tekst in het formulier staan en kan hij het opnieuw proberen.

## 2. Mail aan info@toeslagbuddy.nl → doorsturen naar je privé-adres

Voor mail die mensen of bedrijven rechtstreeks sturen, bijvoorbeeld affiliate-netwerken of klanten.

1. Maak een gratis account op **improvmx.com**. Vul het domein `toeslagbuddy.nl` in en je **privé-adres** als bestemming. Stel ook een catch-all (`*@toeslagbuddy.nl`) in, zodat privacy@ en security@ ook werken.
2. Voeg bij TransIP onder **DNS** deze records toe. Laat de A- en CNAME-records van de website staan.

| Naam | Type | Waarde |
|---|---|---|
| @ | MX | 10 mx1.improvmx.com. |
| @ | MX | 20 mx2.improvmx.com. |
| @ | TXT | `v=spf1 include:spf.improvmx.com include:spf.brevo.com ~all` |

   Er mag maar één SPF-record zijn; daarin staan ImprovMX én Brevo. DKIM en DMARC voor Brevo staan in [pro-accounts.md](pro-accounts.md), stap 3. Gebruik altijd de waarden die ImprovMX en Brevo je laten zien, als die afwijken.
3. Wacht tot ImprovMX "active" toont en stuur een testmail naar info@toeslagbuddy.nl.

## Antwoorden: altijd als info@

Antwoord **altijd vanaf info@toeslagbuddy.nl** (send-as), niet vanaf je privé-adres. Anders lekt je privé-adres alsnog. Hoe je dat instelt, staat in [pro-accounts.md](pro-accounts.md), stap 8.

## Inlogcodes voor Pro

Die verstuurt Supabase via Brevo naar de gebruiker, niet naar jou; zie [pro-accounts.md](pro-accounts.md), stap 4. Nieuwe proefaccounts zie je in `/beheer/`.
