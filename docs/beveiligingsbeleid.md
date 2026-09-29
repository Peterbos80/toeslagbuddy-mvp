# Beveiligingsbeleid ToeslagBuddy

*Versie 29-09-2026. Proportioneel voor een eenmanszaak (art. 32 AVG). De Cyberbeveiligingswet (NIS2) geldt niet voor deze schaal, maar klanten kunnen eisen doorgeven via contracten. Herzie dit beleid elk jaar en na elk incident.*

## 1. Accounts en MFA

MFA (liefst met een authenticator-app of passkey, niet per sms) is **verplicht** op:

| Account | Waarom | MFA aan? | Herstelcodes in kluis? |
|---|---|---|---|
| GitHub (repo en Actions-secrets) | Broncode, publicatie, geheimen | ☐ | ☐ |
| Supabase (organisatie-eigenaar) | Database, Auth, Edge Functions, geheimen | ☐ | ☐ |
| Supabase Auth: je beheerdersaccount voor `/beheer/` (TOTP, AAL2) | Beheerfuncties vereisen AAL2 | ☐ | ☐ |
| Brevo | Mailverkeer, API-sleutel | ☐ | ☐ |
| Domeinregistrar / DNS (TransIP) | Domeinkaping, mail-omleiding | ☐ | ☐ |
| Mailbox waar info@/privacy@/security@ binnenkomen | Wachtwoordherstel van alle andere accounts | ☐ | ☐ |
| Google (AdSense, als gebruikt) | Uitbetalingen, site-instellingen | ☐ | ☐ |
| HeyGen, Plausible, Instagram/Meta, TikTok | Merk en kosten | ☐ | ☐ |
| Mollie (later) | Betalingen | ☐ | ☐ |

**TOTP-telefoon kwijt (R21):** herstelcodes uit de wachtwoordkluis gebruiken. Voor Supabase Auth (beheer): als projecteigenaar in Supabase Studio de factor van je beheerdersgebruiker verwijderen (Authentication → Users → MFA), daarna direct opnieuw inschrijven, en de actie noteren in het incidentenregister.

**Wachtwoordkluis:** één kluis (bijv. Bitwarden of 1Password) met noodtoegang voor een tweede vertrouwenspersoon (continuïteit bij ziekte of vakantie).

## 2. Geheimen

- `service_role`-sleutel, Brevo-API-sleutel, `DOORSTUUR_EMAIL`: **alleen** als Supabase-geheim (Edge Functions) of GitHub Actions-secret. Nooit in de repo, nooit in de browser.
- Publiek mag: Supabase-URL en `anon`-sleutel (beveiliging zit in RLS).
- Automatische controle: `test/veiligheid.test.js` zoekt in de build naar `service_role` en naar JWT's met die rol; publicatie stopt als de test faalt.
- Zet GitHub **secret scanning** en **push protection** aan (Settings → Code security).
- Gelekt? Eerst roteren, dan opruimen. Zie `docs/datalekprocedure.md`.

## 3. Website en browser

| Maatregel | Waar | Test |
|---|---|---|
| CSP als eerste `<meta>` in `<head>`; strikt op `/pro/*` en `/beheer/*` (alleen `self` + Supabase), geen `'unsafe-inline'` voor scripts | `src/site/layout.js → csp()` | `test/veiligheid.test.js`, `test/e2e/rainy.e2e.js` |
| Geen statistieken, advertenties of nieuwsbrief-formulieren van derden op Pro/beheer | `afgeschermd()` in layout | idem |
| Framebuster tegen clickjacking (meta-CSP kent geen `frame-ancestors`) | `public/js/framebuster.js` | e2e |
| Geen inline scripts of event-handlers | build | `test/veiligheid.test.js` |
| Invoer via `textContent`/escapen | pagina-scripts | e2e met `<img onerror>`-payload (agent A, beheer) |
| CSV: privacyfilter, grenzen (5 MB / 10.000 regels), xlsx-herkenning, formule-injectie | `src/calc/pro.js` | `test/csv-privacy.test.js` |
| Rekeninvoer begrensd (R7) | `src/calc/validatie.js` | `test/validatie.test.js`, e2e |
| Alleen lokale spraakstemmen | `public/js/stem.js` | `test/stem.test.js`, e2e |
| HTTPS; bij TransIP ook HSTS, `X-Frame-Options`, `nosniff` via `.htaccess` | `build.js` | – |

**Bekende beperking GitHub Pages:** geen eigen headers (geen HSTS-header van ons, geen `frame-ancestors`). Daarom de framebuster. Advies: productie op TransIP.

**Let op bij AdSense:** zodra AdSense aan staat, verruimt de CSP zich op gewone pagina's naar Google-domeinen. Controleer na het aanzetten de browserconsole op CSP-meldingen en pas `csp()` aan. Op Pro/beheer blijft alles dicht.

## 4. Database (Supabase)

- RLS op elke tabel; `revoke all` voor `anon`/`authenticated`, daarna gerichte grants; functies `security definer` met `set search_path = ''` (uitgewerkt door agent A).
- Beheerfuncties: `is_beheerder()` + AAL2 + geverifieerde factor.
- Regio: Frankfurt.

## 5. Back-ups en herstel

- **Supabase Pro** (ongeveer $ 25/maand) vóór de eerste pilot: dagelijkse back-ups, 7 dagen bewaard. Het gratis plan maakt geen downloadbare back-ups en pauzeert na 7 dagen.
- Eén keer per jaar (en direct na de overstap naar Pro): **hersteltest** naar een tijdelijk project. Noteer datum en resultaat hieronder.
- Code en migraties staan in GitHub (plus een lokale kloon).

| Datum | Test | Resultaat |
|---|---|---|
| *(invullen)* | Back-up terugzetten naar testproject | |

## 6. Jaarlijkse zelftest (OWASP ASVS niveau 1)

Eén keer per jaar (voorstel: september, samen met de nieuwe rekenregels) de [ASVS 4.0.3 niveau 1](https://owasp.org/www-project-application-security-verification-standard/)-checklist doorlopen voor: authenticatie (V2), sessies (V3), toegangscontrole (V4), invoer (V5), opslag van geheimen (V6), foutafhandeling en logging (V7), gegevensbescherming (V8), communicatie (V9), configuratie (V14). Resultaat en acties noteren:

| Jaar | Uitgevoerd door | Bevindingen | Acties | Klaar op |
|---|---|---|---|---|
| 2026 | *(invullen)* | | | |

Een **externe pentest** pas zodra cliëntgegevens op de server komen of een grotere klant erom vraagt.

## 7. Leveranciers en verwerkersovereenkomsten (vastleggen)

Houd per leverancier bij: DPA-versie en datum van acceptatie, regio, MFA aan, wie toegang heeft. Zie `docs/verwerkingsregister.md` §3.

| Leverancier | DPA-versie / datum | Regio | Opmerking |
|---|---|---|---|
| Supabase | *(invullen)* | eu-central-1 (Frankfurt) | Amerikaans moederbedrijf: SCC's |
| Brevo | *(invullen)* | EU (Frankrijk) | Ook als SMTP voor Supabase Auth (spec §9 B1); SPF, DKIM, DMARC op toeslagbuddy.nl |
| GitHub | *(invullen)* | VS (DPF) | Hosting en CI |
| E-mailprovider / doorstuurdienst | *(invullen)* | *(invullen)* | Antwoord altijd **als info@** (send-as), anders lekt je privé-adres |
| Plausible (als gebruikt) | *(invullen)* | EU | |
| HeyGen | *(invullen)* | VS (DPF + SCC's) | Geen bezoekersgegevens |

## 8. Werkplek

- Laptop met schijfversleuteling (FileVault/BitLocker), automatische updates, schermvergrendeling.
- Geen productiegeheimen in `.env`-bestanden die in de repo kunnen belanden (`.gitignore` controleren).
- Browserextensies beperken op de computer waarmee je `/beheer/` gebruikt.

## 9. Kwetsbaarheden melden

`/.well-known/security.txt` (RFC 9116) verwijst naar security@toeslagbuddy.nl en het beleid op `/pro/beveiliging/#melden`. **Verleng `Expires` elk jaar** (build.js waarschuwt 30 dagen vooraf). Reageer binnen 3 werkdagen.
