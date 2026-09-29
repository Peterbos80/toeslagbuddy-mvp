# E-mail ontvangen op info@toeslagbuddy.nl

Op de site staat `info@toeslagbuddy.nl` (instelbaar in `site.config.js` via `contactEmail`). Ook pilotaanvragen en de zzp-wachtlijst lopen standaard via dat adres. Er zijn twee manieren om die mail te ontvangen.

## Optie A – Doorsturen naar je eigen mailbox (gratis, 10 minuten)

Mail naar `info@toeslagbuddy.nl` komt dan binnen in je bestaande Gmail of Outlook. Hiervoor gebruik je een gratis doorstuurdienst, zoals **ImprovMX**.

1. Maak een account aan op improvmx.com. Vul je domein `toeslagbuddy.nl` in en het adres waar de mail naartoe moet.
2. Voeg in TransIP bij **DNS** de records toe die ImprovMX je laat zien. Dat zijn meestal:

| Naam | Type | Waarde |
|---|---|---|
| @ | MX | 10 mx1.improvmx.com. |
| @ | MX | 20 mx2.improvmx.com. |
| @ | TXT | v=spf1 include:spf.improvmx.com ~all |

   Neem de waarden altijd over zoals ImprovMX ze toont. Staan er al MX-records van TransIP? Verwijder die.
3. Wacht tot ImprovMX "Email forwarding active" toont en stuur een testmail.

**Beperking:** antwoorden vanaf `info@toeslagbuddy.nl` kan zo niet gratis. Je antwoordt dan vanaf je eigen adres. Voor zakelijk contact met bewindvoerders is optie B netter.

## Optie B – Een echte mailbox (vanaf ongeveer € 1–5 per maand)

Kies een TransIP-mailpakket, Zoho Mail of Google Workspace. Na aanmelding krijg je MX-, SPF- en DKIM-records die je in TransIP bij DNS zet. Daarna kun je ook mailen **vanaf** info@toeslagbuddy.nl, en dat komt professioneler over bij bewindvoerders.

## Formulieren (pilotaanvraag en zzp-wachtlijst)

1. Maak een gratis formulier bij **Tally** (tally.so) of **Formspree**.
2. Zet in dat formulier "e-mailmelding bij nieuwe inzending" aan.
3. Plak de formulier-URL in `site.config.js`:
   - bij `pro.formAction` voor de pilotaanvraag;
   - bij `zzp.wachtlijstAction` voor de zzp-wachtlijst.

Zolang die leeg zijn, gaan aanvragen via een mailto-link naar `contactEmail`.

## Nieuwsbrief

Kies MailerLite, Brevo of Laposta (alle drie gratis tot een bepaald aantal abonnees) en zet de form-URL bij `nieuwsbrief.formAction`. Er verschijnt dan een aanmeldblok op elke pagina. Stuur vooral een mail rond eind november, als de bedragen voor 2027 definitief zijn.
