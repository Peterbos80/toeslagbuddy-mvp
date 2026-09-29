# Compliance-checklist ToeslagBuddy

*Stand 29-09-2026, na bouwronde B (compliance en rainy day). Gebaseerd op [onderzoek §10](onderzoek/wetgeving-en-compliance.md). Geen juridisch advies: laat de privacyverklaring, de Pro-voorwaarden en de verwerkersovereenkomst vóór de eerste betalende klant toetsen door een jurist (reken op vanaf € 1.000).*

Legenda: ✅ in orde in de code · 🟡 deels / afhankelijk van jou · ❌ open · 👤 jouw actie

## Checklist (onderzoek §10, bijgewerkt)

| # | Actie | Niveau | Status | Wat er nu is | Wat jij nog moet doen |
|---|---|---|---|---|---|
| 1 | Geen scripts van derden (AdSense, statistieken) op `/pro/*` | Moet | ✅ | `afgeschermd()` in `src/site/layout.js`: geen statistieken, AdSense, advertentieblokken of nieuwsbrief-formulier op `/pro/*` en `/beheer/*` (ook als je ze later aanzet). Strikte CSP + framebuster. Tests: `test/veiligheid.test.js`, `test/e2e/rainy.e2e.js` | – |
| 2 | Bedrijfsgegevens (naam, adres, e-mail, KvK, btw-id) in de footer (art. 3:15d BW) | Moet | 🟡 | Footer op elke pagina toont naam, vestigingsplaats/adres, `info@toeslagbuddy.nl` (mailto), KvK en btw-id uit `site.config.js → bedrijf`. Ook op `/colofon/`. De build waarschuwt zolang het KvK-nummer leeg is. De test die elk e-mailadres verbood, staat nu alleen info@, privacy@ en security@ toe | 👤 Vul `bedrijf.naam`, `vestigingsplaats`, `kvk`, `btwId` in. **Let op:** de wet vraagt het *vestigingsadres*. Werk je vanuit huis, overleg dan (jurist/KvK) of vestigingsplaats volstaat of dat je een zakelijk adres nodig hebt; vul dan `bedrijf.adres` in. Gebruik het **btw-identificatienummer**, niet je omzetbelastingnummer |
| 3 | Volledige privacyverklaring | Moet | ✅ 🟡 | `/privacy/`: identiteit, tabel per datastroom (Supabase EU, Brevo EU, hosting, statistieken/AdSense alleen als ingesteld, geen Web3Forms tenzij sleutel ingevuld), localStorage, lokale stemmen, HeyGen, doorgifte, rechten, klacht bij de AP, bewaartermijnen uit spec §4, privacy@ | 👤 Vul de e-mailprovider in (regel "E-mail aan info@") in `src/site/juridisch.js` zodra bekend. Zet `site.config.js → hosting` op `transip` als je verhuist. Laat een jurist meelezen |
| 4 | Verwerkingsregister | Moet | ✅ 🟡 | `docs/verwerkingsregister.md` (V1–V11) | 👤 Vul de *(invullen)*-velden in (mailprovider, DPA-data) |
| 5 | Verwerkersovereenkomsten vastleggen (Supabase, Brevo, Plausible, Mollie) | Moet | 🟡 | Tabel in `docs/verwerkingsregister.md` §3 en `docs/beveiligingsbeleid.md` §7 | 👤 Per leverancier de DPA accepteren/downloaden en versie + datum noteren |
| 6 | Web3Forms vervangen door een EU-dienst | Moet | 🟡 (agent A) | Spec §2.8: berichten via Supabase + Brevo (agent A). De CSP staat Web3Forms op Pro-pagina's alleen toe als er nog een sleutel is ingevuld; de privacyverklaring noemt Web3Forms dan met waarschuwing | Controleer na de merge dat `formulieren.accessKey` leeg is |
| 7 | BSN- en naamkolommen weigeren; elfproef op `clientnr` | Moet | ✅ 🟡 | `leesCsvVeilig()` in `src/calc/pro.js`: kolommen weg (ook deelnamen, accenten, hoofdletters), elfproef, 5 MB / 10.000 regels, xlsx-melding; ook de oude `leesCsv()` filtert. `importMeldingen()` geeft de teksten. Tests: `test/csv-privacy.test.js`, e2e R3/R4 | Na de merge: `public/js/pro-app.js` (agent A) moet `leesCsvVeilig` + `importMeldingen` tonen; de e2e-test "R3: de Pro-app toont een melding" wordt dan automatisch actief |
| 8 | Gecertificeerde CMP met TCF v2.3 vóór AdSense | Moet (bij AdSense) | 🟡 | AdSense staat uit. CSP laat Google-domeinen alleen toe als AdSense is ingevuld | 👤 In AdSense "Privacy en berichten" de Europese toestemmingsmelding aanzetten vóór je `adsense.client` invult; daarna de console controleren op CSP-meldingen |
| 9 | AI-label op video's | Moet | ✅ | Ongewijzigd in orde (label, tekst, metadata, test) | – |
| 10 | AI-label en `#adv` in social posts | Moet | 🟡 | Posts zijn grafische carrousels met "Rekenvoorbeeld · fictief"; captions bevatten geen partnerlinks, dus `#adv` is nu niet nodig. Tekst "gebaseerd op de officiële rekenregels" | 👤 Zet in een post met een partnerlink "Bevat partnerlinks" of `#adv` bovenaan. Plaats je een HeyGen-video op Instagram/TikTok: label in beeld houden **en** het AI-label van het platform aanzetten |
| 11 | Pro-voorwaarden uitbreiden | Moet | ✅ 🟡 | `/pro/voorwaarden/`: 16 artikelen (B2B, excl. btw, KvK verplicht bij omzetting, proef stopt vanzelf, pilot, betaling, opzegging, prijswijziging, goed gebruik, rol en geen cliëntdata (B5-formulering), geheimhouding, beschikbaarheid, uitkomsten, aansprakelijkheid max. 12 maanden behalve opzet/bewuste roekeloosheid, IE, wijziging, Nederlands recht, rechtbank vestigingsplaats, NL bindend) | 👤 Jurist laten toetsen (reflexwerking grijze lijst bij kleine kantoren). Bied bij aanmelden de voorwaarden ook als download aan (nu: printen als PDF) |
| 12 | MFA op alle beheeraccounts | Moet | 👤 | Lijst in `docs/beveiligingsbeleid.md` §1; database eist AAL2 voor beheer (agent A) | 👤 Aanzetten en afvinken |
| 13 | Datalekprocedure en incidentenregister | Moet | ✅ | `docs/datalekprocedure.md` (72 uur AP, 24 uur kantoren, sjabloon register) | 👤 Contacten invullen, register privé bewaren, jaarlijks oefenen |
| 14 | Verwerkersovereenkomst plus DPIA-model vóór opslag van rapportages | Moet (bij de geplande functie) | ✅ | Opslag is beperkt tot geaggregeerde tellingen (spec §9 B5). `docs/verwerkersovereenkomst-model.md` deel A (verklaring "geen verwerker" + technische onderbouwing) en deel B (model voor later); `docs/dpia-model.md` (pre-DPIA voor kantoren) | 👤 Deel A op briefpapier zetten zodra KvK bekend is |
| 15 | Alleen lokale stemmen (`localService`) | Zou moeten | ✅ | `public/js/stem.js → kiesLokaleStem()`; voorleesknop verborgen zonder lokale stem; persona speelt dan alleen ondertitels. Tests: `test/stem.test.js`, e2e R9 | – |
| 16 | Knoppen voor export en verwijderen van het account | Zou moeten | (agent A) | Spec §2.6 | – |
| 17 | CSP-meta-tag, security.txt, formule-injectie tegengaan | Zou moeten | ✅ | CSP als eerste element na charset op elke pagina; `/.well-known/security.txt` (RFC 9116, Expires 28-09-2027, build waarschuwt 30 dagen vooraf); `celCsv()` neutraliseert = + - @ tab CR | 👤 Elk jaar `Expires` verlengen |
| 18 | Hosting in de EU (TransIP) in plaats van GitHub Pages | Zou moeten | 🟡 | Beide routes werken; `.well-known` wordt meegekopieerd (ook door `lftp mirror`) | 👤 Kies TransIP voor productie (echte headers); zet dan `hosting: 'transip'` |
| 19 | Handmatige WCAG 2.1 AA-check | Zou moeten | 🟡 | Toegankelijkheidsverklaring op `/toegankelijkheid/` (doel AA, status "gedeeltelijk", axe op alle pagina's, bekende beperkingen, contact). Foutmeldingen bij invoer met `aria-invalid`, `aria-describedby` en een live-regio | 👤 Handmatige toets (toetsenbord + NVDA/VoiceOver) laten doen en de uitkomst in de verklaring zetten |
| 20 | Beveiligingsfactsheet voor bewindvoerders | Zou moeten | ✅ | `/pro/beveiliging/` + `docs/beveiligingsbeleid.md` | 👤 Controleer dat de beloftes kloppen vóór je het verstuurt: Supabase **Pro** met back-ups, hersteltest gedaan, MFA aan |
| 21 | FAQ "wij verwerken geen persoonsgegevens" nauwkeuriger | Zou moeten | ✅ | `/pro/` FAQ en privacyblok: "geen cliëntgegevens op onze server; wél accountgegevens; geaggregeerde tellingen" | – |
| 22 | Consumentenregels (btw, opzegknop) bij Toeslagbewaker Plus | Moet (bij lancering) | ❌ | Nog niet gebouwd | Bij lancering: prijzen incl. btw, herroepingsinformatie, opzegknop (art. 6:230oa BW) |

## Extra in deze ronde

- "Officiële rekenregels" is overal "gebaseerd op de officiële rekenregels" (spec §9), ook in de social posts. Uitzondering: `public/js/pro-app.js` (agent A) bevat nog "Indicatie op basis van de officiële rekenregels" → bij de merge aanpassen.
- Disclaimer: geen volledige uitsluiting van aansprakelijkheid meer (onredelijk bezwarend tegenover consumenten).
- Rainy scenarios getest in `test/e2e/rainy.e2e.js`: R1, R2, R3, R4/R26, R7, R8, R9, R17, CSP op Pro, framebuster.
- `<noscript>`-melding op rekenhulpen en Pro-pagina's (R17).
- Nieuwe pagina's in de footer: Colofon, Toegankelijkheid, Beveiliging (voor kantoren).

## Wat jij moet invullen of doen (samengevat)

1. `site.config.js → bedrijf`: naam, vestigingsplaats (of adres), KvK, btw-id. Tot dan waarschuwt de build.
2. E-mail: info@, privacy@ en security@toeslagbuddy.nl laten doorsturen; antwoorden als info@ (send-as). Provider noteren in register en privacyverklaring.
3. MFA op alle accounts (beveiligingsbeleid §1); herstelcodes in de wachtwoordkluis.
4. DPA's accepteren en versies noteren.
5. Supabase Pro vóór de eerste pilot; hersteltest doen en noteren.
6. Jurist: privacyverklaring, Pro-voorwaarden, verklaring "geen verwerker".
7. Beroepsaansprakelijkheidsverzekering (IT/advies) vóór de eerste betalende klant.
8. Handmatige toegankelijkheidstoets.
9. Elk jaar: `security.txt` verlengen, ASVS-zelftest, datalekoefening, deze checklist herzien.
