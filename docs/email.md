# E-mail: alles komt binnen op je privé-adres, dat nergens zichtbaar is

Op de site staat **geen enkel e-mailadres**. Alle berichten lopen via de webapplicatie en komen in je eigen mailbox binnen. Dat is getest: de browsertest controleert dat er geen `mailto:` of e-mailadres in de pagina's staat.

Berichten komen via twee routes binnen.

## 1. Formulieren op de site → Web3Forms → jouw mailbox (5 minuten)

Dit geldt voor:
- het contactformulier (`/contact/`);
- aanvragen voor een Pro-proef en een pilot;
- aanvragen voor een Pro-abonnement;
- de zzp-wachtlijst.

Instellen:
1. Ga naar **web3forms.com** en vul je **privé-e-mailadres** in. Je krijgt een *access key* per mail.
2. Zet die sleutel in `site.config.js` bij `formulieren.accessKey` en push naar GitHub.

Je e-mailadres is alleen bij Web3Forms bekend; op de site staat alleen de sleutel. Elk bericht komt binnen met als onderwerp `[ToeslagBuddy] …`, en je kunt direct antwoorden naar de afzender.

## 2. Mail aan info@toeslagbuddy.nl → doorsturen naar je privé-adres (10 minuten)

Voor mail die mensen of bedrijven rechtstreeks sturen, bijvoorbeeld affiliate-netwerken of AdSense.

1. Maak een gratis account op **improvmx.com**. Vul het domein `toeslagbuddy.nl` in en je **privé-adres** als bestemming. Stel ook een catch-all (`*@toeslagbuddy.nl`) in, zodat elk adres op je domein werkt.
2. Voeg bij TransIP onder **DNS** deze records toe. Laat de A- en CNAME-records van de website staan.

| Naam | Type | Waarde |
|---|---|---|
| @ | MX | 10 mx1.improvmx.com. |
| @ | MX | 20 mx2.improvmx.com. |
| @ | TXT | v=spf1 include:spf.improvmx.com ~all |

   Gebruik altijd de waarden die ImprovMX je laat zien, als die afwijken.
3. Wacht tot ImprovMX "active" toont en stuur een testmail naar info@toeslagbuddy.nl.

## Inloglinks voor Pro

Die verstuurt Supabase naar de gebruiker, niet naar jou; zie [pro-accounts.md](pro-accounts.md). Bij elke nieuwe proefaanmelding krijg jij wel een melding via route 1.
