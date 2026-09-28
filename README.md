# ToeslagBuddy

Bereken in één check alle Nederlandse toeslagen: zorgtoeslag, huurtoeslag, kindgebonden budget, kinderopvangtoeslag en kinderbijslag. Daarnaast verwijst de check naar regelingen van de gemeente, het UWV en de SVB.

- **Snel en goedkoop te hosten.** Het is een statische site: gewone HTML-, CSS- en JavaScript-bestanden, zonder database en zonder frameworks. Het draait daarom op elk TransIP-webhostingpakket.
- **Privacy.** Alle berekeningen gebeuren in de browser van de bezoeker. Er gaat niets naar een server.
- **Eén rekenmotor** (`src/calc/`) voor de website, de tabellen op de pagina's en de tests.
- **Gemaakt om gevonden te worden in Google.** Elke pagina richt zich op één zoekvraag en heeft gestructureerde gegevens voor zoekmachines, een sitemap en een canonical-URL.

## Snel starten

```bash
npm test          # rekenregels controleren (13 tests)
npm run dev       # bouwen en bekijken op http://localhost:8080
```

Je hebt alleen Node.js 20 of nieuwer nodig. Er zijn geen npm-pakketten nodig.

## Mappenstructuur

| Pad | Wat |
|---|---|
| `src/calc/params.js` | **Alle bedragen en percentages** met bronnen. Dit pas je elk jaar aan. |
| `src/calc/toeslagen.js` | Rekenmotor (pure functies) |
| `src/site/pages.js` | Teksten, FAQ en SEO-titels van alle pagina's |
| `src/site/forms.js` | Formulieren van de rekenhulpen |
| `public/js/app.js` | Code in de browser (formulier → berekening → resultaat) |
| `site.config.js` | **Domein, AdSense, partnerlinks, statistieken en nieuwsbrief** |
| `build.js` | Bouwt `dist/`, inclusief `sitemap.xml`, `robots.txt`, `.htaccess` en `404.html` |
| `test/` | Tests die de rekenregels controleren tegen officiële voorbeelden |

## Live zetten

**Aanbevolen: GitHub Pages met je TransIP-domein.** Dit is gratis en bij elke push naar `main` automatisch live. De stappen staan in [docs/hosting.md](docs/hosting.md).

### Alternatief: TransIP-webhosting

1. **Domein en hosting.** Koop bij TransIP een domein (bijvoorbeeld `toeslagbuddy.nl`) met een webhostingpakket. Zet SSL (Let's Encrypt) aan in het controlepaneel.
2. **Domein instellen.** Zet je domein in `site.config.js` bij `url`.
3. **SFTP-gegevens opzoeken.** Die staan in het controlepaneel bij je webhostingpakket (SFTP/SSH): server, gebruikersnaam en wachtwoord. De website-map is meestal `www`.
4. **Uploaden.** Kies één van deze twee manieren.
   - **Handmatig:**
     ```bash
     TRANSIP_HOST=… TRANSIP_USER=… TRANSIP_PASSWORD=… npm run deploy
     ```
     Dit vereist `lftp`. Je kunt ook de inhoud van `dist/` met FileZilla naar de map `www` slepen. Vergeet `.htaccess` niet: dat bestand is verborgen.
   - **Automatisch bij elke push naar `main`:** zet in GitHub bij *Settings → Secrets and variables → Actions* de secrets `TRANSIP_HOST`, `TRANSIP_USER` en `TRANSIP_PASSWORD`. Als de map geen `www` heet, voeg dan ook `TRANSIP_REMOTE_DIR` toe.
5. **Aanmelden bij Google.** Meld de site aan bij [Google Search Console](https://search.google.com/search-console) en dien `https://jouwdomein.nl/sitemap.xml` in.

## Geld verdienen instellen (`site.config.js`)

- **Partnerlinks (affiliate).** Meld je aan bij Daisycon, TradeTracker en/of Awin. Zoek daar campagnes voor zorgverzekering, energie, internet en kinderopvang. Plak je trackinglinks bij `partners`. Blokken verschijnen automatisch onder de passende rekenuitkomst en zijn gemarkeerd als *partnerlink*.
- **AdSense.** Vraag AdSense aan zodra de site een paar weken live is. Vul daarna `client` en de twee `slot`-ID's in. `ads.txt` wordt dan automatisch aangemaakt. **Verplicht in de EU:** zet in AdSense onder *Privacy en berichten* de Europese toestemmingsmelding aan.
- **Statistieken zonder cookies.** Gebruik Plausible of GoatCounter. Omdat die geen cookies plaatsen, is er geen cookiebanner nodig. Elke berekening wordt geteld als event `Berekening`.
- **Nieuwsbrief.** Vul de form-URL van MailerLite, Brevo of Laposta in. Met deze lijst haal je bezoekers terug zodra de nieuwe bedragen bekend zijn.

## Jaarlijks bijwerken (belangrijk voor je ranking)

Werk in **november/december** alle bedragen in `src/calc/params.js` bij en pas `JAAR` en `GECONTROLEERD_OP` aan. Controleer daarbij:

- Toeslagenkaart van Dienst Toeslagen
- Regeling huurtoeslaggrenzen
- Regeling standaardpremie
- Bedragen kinderopvangtoeslag (Rijksoverheid)
- Kinderbijslag (SVB, op 1 januari en 1 juli)

Werk ook de verwachte uitkomsten in `test/toeslagen.test.js` bij naar de nieuwe officiële voorbeelden. Draai daarna `npm test` en deploy. Titels, tabellen en teksten nemen het nieuwe jaar automatisch over.

## Bekende beperkingen

- **Kinderopvangtoeslag.** Het percentage is een benadering van de officiële tabel met 69 inkomensklassen: er wordt lineair gerekend tussen gepubliceerde punten, met een afwijking van ongeveer 1 procentpunt. Voor exacte cijfers moet de volledige tabel in `params.js` worden gezet.
- **Huurtoeslag.**
  - Medebewoners (bijvoorbeeld inwonende kinderen jonger dan 23) worden vereenvoudigd meegenomen.
  - De 40%-vergoeding boven de aftoppingsgrens is alleen toegepast bij AOW-huishoudens en aangepaste woningen.
- **Bronnen.** De bedragen zijn op 28-09-2026 gecontroleerd via meerdere bronnen. Belastingdienst.nl en wetten.overheid.nl konden niet rechtstreeks worden geopend. Controleer daarom vóór livegang de bedragen in `params.js` nog één keer tegen de officiële pagina's die bij elke parameter staan.
