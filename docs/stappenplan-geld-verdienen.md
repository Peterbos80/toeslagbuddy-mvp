# Stappenplan: de site geld laten opleveren

*Geschreven op 28 november 2026. Voor de eigenaar: geen programmeerkennis nodig, de meeste stappen gaan vanaf de telefoon, en het doel is maximaal 1 uur per week.*

Dit plan zet alles op een rij wat jij zelf moet doen, in een vaste volgorde. Het is gebaseerd op [verdienmodel-hele-site.md](verdienmodel-hele-site.md), [geld-verdienen-instellen.md](geld-verdienen-instellen.md), [compliance-checklist.md](compliance-checklist.md), [groeiplan.md](groeiplan.md), [pro-accounts.md](pro-accounts.md) en [email.md](email.md).

## Eerst eerlijk

- **Niemand kan een plek bovenaan in Google of een bedrag per maand beloven.** Dit plan ook niet.
- **Zonder bezoekers verdient de site niets.** Reken op **3 tot 12 maanden** voordat nieuwe pagina's goed gevonden worden.
- **Op dit moment ontvangt de site nog geen geld.** Daarvoor zijn accounts op jouw naam nodig. Die vragen je identiteit, je KvK-nummer en je bankrekening, dus alleen jij kunt ze aanmaken.
- **Advertenties leveren weinig op.** Bij 15.000 bezoekers per maand is dat ongeveer € 50 tot € 150 per maand. Het meeste geld komt van abonnementen (Familie, Pro) en daarna van partnerlinks.
- **Met 1 uur per week groeit het langzaam.** Het Familie-ontwerp rekent daarom op 24 tot 36 maanden om bij € 10.000 per maand te komen, niet 12 tot 24 (zie [familieregie/ontwerp.md](familieregie/ontwerp.md) §16.6).

## Hoe je dingen in de site zet (vanaf je telefoon)

Bijna elke stap eindigt met: "zet een code in `site.config.js`". Dat gaat zo:

1. Open in je browser: https://github.com/Peterbos80/toeslagbuddy-mvp/edit/claude/toeslagbuddy-mvp/site.config.js
2. Zoek de regel die in de stap staat (bijvoorbeeld `google: ''`). Zet de code tussen de twee aanhalingstekens: `google: 'abc123...'`.
3. Tik op **Commit changes** en nog een keer op **Commit changes**.
4. De site bouwt zichzelf opnieuw. Dat duurt ongeveer **15 tot 30 minuten**, want eerst draaien alle tests. Je volgt het op https://github.com/Peterbos80/toeslagbuddy-mvp/actions (groen vinkje = live, rood kruis = niet gepubliceerd, de oude versie blijft staan).

**Liever niet zelf typen?** Stuur de code naar Claude in een sessie, dan zet Claude hem erin. Verificatiecodes, partnerlinks en de GoatCounter-code zijn niet geheim (ze staan straks openbaar in de site), dus die mag je gewoon in de chat zetten.

**Geheimen** (wachtwoorden, API-sleutels zoals die van Mollie, Brevo of Instagram) zet je **nooit** in `site.config.js` en nooit in de chat. Die gaan altijd naar GitHub → Settings → Secrets and variables → Actions: https://github.com/Peterbos80/toeslagbuddy-mvp/settings/secrets/actions (en waar dat staat ook in Supabase, zie [pro-accounts.md](pro-accounts.md)).

## Stap 0. Controleer dat het nieuwste werk live staat (2 minuten)

De site wordt gepubliceerd vanaf de branch **`claude/toeslagbuddy-mvp`** (de standaardbranch van de repository). Je hoeft dus niets samen te voegen.

- Open https://www.toeslagbuddy.nl/sitemap.xml en https://www.toeslagbuddy.nl/llms.txt. Openen ze, dan staat het nieuwste werk live.
- Opent een van beide niet: kijk op https://github.com/Peterbos80/toeslagbuddy-mvp/actions bij *Publiceer op GitHub Pages* of de laatste run groen is.

---

## Week 1: het fundament (ongeveer 1,5 uur, plus wachttijd)

### 1. Bedrijfsgegevens op de site (wettelijk verplicht)

De wet (art. 3:15d BW) vraagt naam, vestigingsadres, e-mail, KvK-nummer en btw-id op een site waarmee je geld verdient. Zolang het KvK-nummer leeg is, geeft de build een waarschuwing.

| | |
|---|---|
| **Al een bedrijf?** | Gebruik dat. Zoek je gegevens op via https://www.kvk.nl (je eigen inschrijving). Tijd: 5 minuten. |
| **Nog geen bedrijf?** | Schrijf een eenmanszaak in via https://www.kvk.nl (zoek op "eenmanszaak inschrijven"). Je betaalt eenmalig inschrijfkosten (controleer het bedrag op kvk.nl). Reken op enkele dagen. |
| **Btw-id** | Na de inschrijving krijg je van de Belastingdienst per brief je **btw-identificatienummer** (vorm `NL…B..`), meestal binnen een paar weken. Gebruik dat, **niet** je omzetbelastingnummer. Twijfel je over btw (bijvoorbeeld de kleineondernemersregeling)? Vraag het de Belastingdienst of een boekhouder. |
| **In de repo** | `site.config.js` → `bedrijf.naam`, `bedrijf.vestigingsplaats`, `bedrijf.kvk` (8 cijfers), `bedrijf.btwId`. Optioneel `bedrijf.adres`. |
| **Let op het adres** | De wet vraagt het *vestigingsadres*. Werk je vanuit huis, overleg dan met de KvK of een jurist of de vestigingsplaats genoeg is (zie [compliance-checklist.md](compliance-checklist.md), punt 2). |
| **E-mail** | Laat `bedrijf.email` op `info@toeslagbuddy.nl` staan. Zet hier nooit een privé-adres. Doorsturen naar je eigen mailbox staat in [email.md](email.md) (ImprovMX, ongeveer 15 minuten). |

### 2. Google Search Console (15 minuten, daarna wachten)

Hiermee vertel je Google dat de site van jou is en waar de lijst met pagina's staat.

1. Ga naar https://search.google.com/search-console en log in met je Google-account.
2. Tik op **Property toevoegen**. Kies rechts **URL-voorvoegsel** en vul in: `https://www.toeslagbuddy.nl/`. Tik op **Doorgaan**.
3. Kies bij de verificatiemethoden **HTML-tag**. Je ziet iets als `<meta name="google-site-verification" content="AbC123...">`.
4. Kopieer **alleen** wat tussen de aanhalingstekens bij `content="…"` staat.
5. Zet het in `site.config.js` → `vindbaar.google`. Commit (zie hierboven) en wacht tot het groene vinkje er is.
6. Ga terug naar Search Console en tik op **Verifiëren**.
7. Ga in het menu naar **Sitemaps**. Vul `sitemap.xml` in (het volledige adres is `https://www.toeslagbuddy.nl/sitemap.xml`) en tik op **Indienen**.
8. Optioneel: vul bovenin bij **URL-inspectie** `https://www.toeslagbuddy.nl/` in en tik op **Indexering aanvragen**.

Wat je daarna ziet: de eerste cijfers verschijnen na een paar dagen. Dat veel pagina's eerst "Niet geïndexeerd" zijn, is normaal bij een nieuwe site.

*Alternatief:* een **Domein**-property (dekt ook `toeslagbuddy.nl` zonder www). Die verifieer je met een TXT-record bij TransIP onder DNS. Dat werkt ook, maar is meer werk vanaf een telefoon.

### 3. Bing Webmaster Tools (5 minuten)

Bing is belangrijker dan het lijkt: DuckDuckGo en Ecosia gebruiken (deels) Bing, en de site meldt zelf dat Bing ook de antwoorden van ChatGPT-zoeken en Copilot levert.

1. Ga naar https://www.bing.com/webmasters en log in (een Google-account mag ook).
2. Kies **Importeren** bij "Importeren uit Google Search Console". Geef toestemming en kies `https://www.toeslagbuddy.nl/`. Je sitemap komt automatisch mee.
3. Lukt importeren niet? Kies dan handmatig toevoegen, methode **HTML-metatag**, en zet de code van `content="…"` in `site.config.js` → `vindbaar.bing`.

### 4. Statistieken zonder cookies (10 minuten)

Zonder cijfers weet je niet wat werkt. Kies **één** van de twee. Beide werken zonder cookies, dus je hebt geen cookiebanner nodig.

| | GoatCounter | Plausible |
|---|---|---|
| **Waar** | https://www.goatcounter.com | https://plausible.io |
| **Kosten** | Gratis voor beperkt gebruik; lees bij aanmelden de voorwaarden voor commerciële sites | Betaald, ongeveer € 9 per maand |
| **Wat je invult** | Een code, bijvoorbeeld `toeslagbuddy` (dan wordt het `toeslagbuddy.goatcounter.com`) | Je domein `toeslagbuddy.nl` |
| **In de repo** | `site.config.js` → `analytics.goatcounterCode` | `site.config.js` → `analytics.plausibleDomain` |

De site meet daarna vanzelf: bezoekers, elke berekening (event `Berekening`) en klikken op partnerlinks (event `Partnerklik`). Bij Plausible voeg je die twee namen toe als **doel** (Site settings → Goals), anders zie je ze niet. Op `/pro/` en `/beheer/` draait nooit een statistiekscript; dat is zo gebouwd.

---

## Daarna: inkomsten aanzetten

Hieronder staan de bronnen in volgorde van **wat het oplevert per uur werk van jou**. Alle bedragen zijn schattingen uit [verdienmodel-hele-site.md](verdienmodel-hele-site.md), geen beloftes.

| # | Bron | Jouw werk | Wachttijd | Wat het kan opleveren (na 18–24 maanden) | Wat er nog mist |
|---|---|---|---|---|---|
| A | Partnerlinks (toeslagen + Besparen) | ~1–2 uur aanmelden | Dagen tot weken per adverteerder | € 300–800 (toeslagen) + € 2.400 (Besparen, bij 40.000 bezoekers) | Alleen jouw aanmelding |
| B | Pro voor kantoren | 1–2 uur instellen + verkoopgesprekken | Tot 48 uur (DNS) | € 2.500 (25 kantoren × € 100) | Supabase instellen, kantoren benaderen |
| C | Familie-abonnementen | ~1 uur Mollie + akkoord | Dagen (Mollie-controle) | € 2.100 + € 1.485 afwikkelingen + € 495 partners | **De betaalkoppeling met Mollie moet nog gebouwd worden** |
| D | AdSense | ~30 minuten | Dagen tot weken | € 50–150 bij 15.000 bezoekers | Toestemmingsmelding (CMP) |

### A. Partnerlinks: Daisycon, TradeTracker, Awin (eerst doen)

**Wat ervoor nodig is:** meestal je KvK-nummer, btw-gegevens en een bankrekening. Elk netwerk keurt eerst je site goed, en daarna keurt **elke adverteerder** je apart goed. Dat kan dagen tot weken duren. Sommige adverteerders weigeren nieuwe sites met weinig bezoekers; dat is normaal, probeer het dan later opnieuw.

1. Meld je aan als **publisher** (uitgever) bij:
   - Daisycon: https://www.daisycon.com
   - TradeTracker: https://www.tradetracker.com
   - Awin: https://www.awin.com
2. Voeg je site `https://www.toeslagbuddy.nl` toe.
3. Zoek campagnes en vraag ze aan. Lees de voorwaarden (bijvoorbeeld of social media mag).
4. Plak je trackinglink in `site.config.js` bij `url` van het juiste blok. Een blok verschijnt pas als de link is ingevuld, altijd met het label *Partnerlink* en `rel="sponsored"` (wettelijk verplicht, dat doet de site zelf).

| Blok in `site.config.js` | Zoek op | Wanneer het meeste oplevert |
|---|---|---|
| `partners.zorgverzekering.url` | zorgverzekering, zorgvergelijker | **12 november – 31 december** (piek; dat is nu) |
| `partners.energie.url` | energie vergelijken, energieleverancier | het hele jaar |
| `partners.internet.url` | internet, tv, mobiel | het hele jaar |
| `partners.kinderopvang.url` | kinderopvang | het hele jaar |
| `partners.belastinghulp.url` | belastingaangifte | maart – mei |
| `partners.boekhouden.url` | boekhoudprogramma | voor zzp'ers (pagina `/zzp-toeslagen/`) |

5. **Besparen (`/deals/`):** vraag bij dezelfde netwerken ook **productfeeds** aan van winkels. De feed-adressen zijn geheim. Zet ze als secret op https://github.com/Peterbos80/toeslagbuddy-mvp/settings/secrets/actions met de namen `DAISYCON_FEED_URLS`, `TRADETRACKER_FEED_URLS` en `AWIN_FEED_URLS` (uitleg in [deals-techniek.md](deals-techniek.md)). Daarna draaien de echte prijzen automatisch.
6. **Familie krijgt bewust geen partnerlinks.** Wie de zaken van een zieke of overleden ouder regelt, moet erop kunnen vertrouwen dat we niets aanraden om eraan te verdienen.

**Eerlijk over de zorgverzekeringspiek:** het overstapseizoen loopt tot 31 december. Als de goedkeuring langer duurt, mis je die piek dit jaar. Meld je dan toch aan: volgend jaar staat alles klaar.

**Op Instagram of TikTok:** zet bij een post met een partnerlink "Bevat partnerlinks" of `#adv` bovenaan (Reclamecode Social Media).

### B. Pro voor bewindvoerders en budgetcoaches (meeste geld per klant)

Eén kantoor betaalt minimaal € 99 per maand. Dat is meer dan alle advertenties samen bij 15.000 bezoekers. Maar **kantoren komen niet vanzelf**: iemand moet ze benaderen.

1. **Instellen (1 à 2 uur, eenmalig):** volg [pro-accounts.md](pro-accounts.md) stap 1 tot en met 10. Daarmee werken ook het contactformulier, de wachtlijst en `/beheer/`.
   - Supabase: https://supabase.com, regio **Frankfurt**, het **Pro-plan** (ongeveer $25 per maand) vóór de eerste pilot.
   - Brevo (mail): https://www.brevo.com.
   - In de repo: `site.config.js` → `pro.supabaseUrl` en `pro.supabaseAnonKey` (de *anon*-sleutel mag openbaar zijn). **Nooit** de `service_role`-sleutel in de repo.
   - Stap 5 (de Edge Function) vraagt een computer met een terminal. Dat kan niet vanaf de telefoon; Claude kan je daarbij begeleiden.
2. **Betalen gaat nu met de hand:** je stuurt een factuur en zet het kantoor daarna in `/beheer/` op **Actief**. Automatisch betalen via Mollie voor Pro staat nog in de [backlog](backlog.md) (punt 14).
3. **Verkoop:** volg [validatie-bewindvoerders.md](validatie-bewindvoerders.md). Begin met de ledenlijsten van de brancheorganisaties BPBI en NBPB. Doel volgens het plan: 3 pilots met betaaltoezegging in de eerste maand, anders stoppen of bijsturen.
4. **Vóór de eerste betalende klant** (zie [compliance-checklist.md](compliance-checklist.md)): MFA op alle accounts, een jurist laat de Pro-voorwaarden en privacyverklaring nakijken (reken op vanaf € 1.000), een beroepsaansprakelijkheidsverzekering.

**Eerlijk:** gesprekken met kantoren passen slecht in 1 uur per week. Eén mail of één gesprek per week is haalbaar; meer niet.

### C. Familie-abonnementen met Mollie

Prijzen (staan al op de site): € 7,99 per maand of € 79 per jaar, € 99 eenmalig voor de afwikkeling, 30 dagen gratis. In `data/familie/prijzen.json` staat `betalenActief` op `false`: iedereen gebruikt Familie nu gratis en niemand kan betalen.

**Wat er nog mist (eerlijk):** de twee onderdelen die de betaling met Mollie regelen (`familie-betalen` en `familie-mollie-webhook`, beschreven in [familieregie/ontwerp.md](familieregie/ontwerp.md) §10) zijn **nog niet gebouwd**. Alleen `betalenActief` op `true` zetten is dus niet genoeg.

Volgorde:
1. **Mollie-account:** https://www.mollie.com/nl. Nodig: KvK-nummer, identiteitsbewijs, een bankrekening op naam van je bedrijf (bij een eenmanszaak: op jouw naam). Mollie controleert ook je site (prijzen, voorwaarden, contact). Reken op een paar dagen.
2. **Supabase** moet al draaien (zie B, stap 1).
3. Vraag Claude de betaalkoppeling te bouwen en te testen in de testmodus van Mollie.
4. Zet de Mollie-API-sleutel als **secret** in Supabase en op https://github.com/Peterbos80/toeslagbuddy-mvp/settings/secrets/actions (naam `MOLLIE_API_KEY`). Nooit in de chat.
5. Consumentenregels: prijzen inclusief btw, informatie over herroeping, een opzegknop (compliance-checklist punt 22). Laat dit door een jurist nakijken.
6. Pas daarna: `data/familie/prijzen.json` → `"betalenActief": true`.

**Familie-partners** (uitvaartondernemers, € 99 per maand): de eerste 3 moet je zelf benaderen. Dat kan niet automatisch.

### D. AdSense (als laatste, en alleen als je wilt)

AdSense levert het minst op en kan het vertrouwen schaden. Begin er pas aan als er duizenden bezoekers per maand zijn.

1. Ga naar https://adsense.google.com en voeg `toeslagbuddy.nl` toe.
2. **Eerst verplicht (EU):** zet in AdSense onder **Privacy en berichten** de Europese toestemmingsmelding van Google aan (een gecertificeerde CMP). Pas daarna de volgende stap.
3. Zet je publisher-ID (`ca-pub-…`) in `site.config.js` → `adsense.client`. De site plaatst dan zelf de verificatie, het script en `ads.txt`.
4. Klik in AdSense op **Verifiëren** en daarna **Beoordeling aanvragen**. Goedkeuring duurt dagen tot weken.
5. **Let op bij automatische advertenties:** het AdSense-script komt op alle pagina's behalve `/pro/` en `/beheer/`, dus ook op `/familie/`. Familie hoort geen advertenties te hebben. Zet automatische advertenties daarom niet aan, of sluit `/familie/` uit in AdSense, of vraag Claude om AdSense op `/familie/` uit te zetten vóórdat je dit invult.
6. Zet nooit advertenties tussen invulvelden.

---

## Vindbaarheid buiten Google

### Wat al automatisch gebeurt (jij hoeft niets te doen)

- **Sitemap** (`/sitemap.xml`) met alle openbare pagina's.
- **`robots.txt`** die zoekmachines en AI-zoekrobots (ChatGPT-zoeken, Claude, Perplexity, Google) toelaat, behalve in de apps en `/beheer/`.
- **`llms.txt`**: een korte wegwijzer zodat AI-assistenten de site goed kunnen citeren.
- **IndexNow:** na elke publicatie meldt de site zelf welke pagina's echt veranderd zijn bij Bing, Yandex, Seznam en Naver. Je ziet het in de run *Publiceer op GitHub Pages* als regel "IndexNow: … pagina's gemeld".
- Gestructureerde gegevens (organisatie, rekenhulpen, artikelen, veelgestelde vragen) en een eigen deelafbeelding per onderdeel.

### Wat jij kunt doen (alleen eerlijke methodes)

1. **Bing Webmaster Tools** (week 1, zie hierboven).
2. **Organisaties die een rekenhulp of gids zoeken om naar door te verwijzen.** Dit levert bezoekers op én verwijzende links. Stuur één korte, persoonlijke mail per keer, vanaf info@toeslagbuddy.nl, met wat de site doet en de link. Ideeën:
   - Toeslagen: schuldhulpverlening, sociale raadslieden, Informatiepunten Digitale Overheid in bibliotheken, huurdersverenigingen, ouderenbonden (KBO-PCOB).
   - Pro: bewindvoerders via BPBI en NBPB.
   - Familie: MantelzorgNL en lokale mantelzorgsteunpunten.
   - Eén mail per week past in je uur. Mail niemand twee keer als er geen antwoord komt.
3. **Gidsen en startpagina's:** alleen gratis vermeldingen die bij het onderwerp passen. Betaal **niet** voor links. Google ziet betaalde links zonder `rel="sponsored"` als linkkopen, en dat kan je vindbaarheid schaden.
4. **Pers:** na Prinsjesdag (september) en in november een kort bericht met een eigen rekenvoorbeeld naar regionale media en geldsites (zie [groeiplan.md](groeiplan.md)).
5. **Google Bedrijfsprofiel: niet nodig.** Dat is alleen voor bedrijven met een bezoekadres.
6. **Instagram** staat klaar via `.github/workflows/instagram.yml` (dagelijks rond 19:00). Nodig (zie [instagram.md](instagram.md)): een zakelijk account, de secrets `IG_USER_ID` en `IG_ACCESS_TOKEN` op https://github.com/Peterbos80/toeslagbuddy-mvp/settings/secrets/actions, en je gebruikersnaam in `site.config.js` → `instagram.account`. Let op: de kalender begon op 5 oktober 2026 en liep 6 weken. Zet een nieuwe `instagram.startDatum` als je wilt beginnen. Bio-link: `https://www.toeslagbuddy.nl/instagram/`.
7. **Nieuwsbrief (optioneel):** maak een formulier bij Brevo, MailerLite of Laposta en zet de form-action-URL in `site.config.js` → `nieuwsbrief.formAction`. Twee mails per jaar is genoeg: nieuwe bedragen (september) en zorgverzekering overstappen (november).

**Wat je nooit doet:** links kopen, linkruil op grote schaal, nep-reviews, nep-accounts, gekochte volgers, automatisch gegenereerde dunne pagina's, of ongevraagde massamails. Dat is tegen de regels van Google en Instagram en kan de site of het account laten blokkeren.

---

## Wekelijkse routine (maximaal 1 uur)

Kies een vaste dag. Dit kan allemaal op de telefoon (GitHub-app of browser).

| Tijd | Wat | Waar |
|---|---|---|
| 10 min | **Meldingen van de automatische controles.** Issues met "Familie: regel wijkt af van de officiële bron" of van de wijzigingsmonitor (officiële bedragen). Lees de melding; laat Claude de regel aanpassen. Dit gaat vóór alles: foute bedragen kosten vertrouwen. | https://github.com/Peterbos80/toeslagbuddy-mvp/issues |
| 5 min | **Mislukte publicaties.** Staat er een rood kruis bij *Publiceer op GitHub Pages*? Dan blijft de oude versie live. Vraag Claude wat er misgaat. | https://github.com/Peterbos80/toeslagbuddy-mvp/actions |
| 10 min | **Search Console:** meldingen (ook per mail), het rapport *Pagina's* (worden er meer geïndexeerd?) en *Prestaties* (op welke zoekwoorden komen mensen binnen?). | https://search.google.com/search-console |
| 5 min | **Statistieken:** bezoekers, berekeningen, partnerklikken. Vergelijk met vorige week, niet met gisteren. | GoatCounter of Plausible |
| 5 min | **Partnerdashboard(s):** klikken, afgewezen of beëindigde campagnes (een beëindigde link vervangen of leegmaken). | Daisycon / TradeTracker / Awin |
| 10 min | **Mail aan info@** beantwoorden (altijd vanaf info@, zie [email.md](email.md)). Als Supabase draait: nieuwe proeven en berichten in `/beheer/`. | je mailbox, https://www.toeslagbuddy.nl/beheer/ |
| 15 min | **Eén actie voor groei:** één mail aan een organisatie, kantoor of uitvaartondernemer. | |

**Wat je níet doet** (kost tijd en levert niets op):
- Elke dag je positie in Google opzoeken. Posities schommelen; kijk eens per week naar de trend.
- Elke pagina met "Niet geïndexeerd" najagen. Bij een nieuwe site is dat normaal.
- Pagina's herschrijven na één slechte week.
- Reageren op mails die "SEO", "gastblogs" of "backlinks" te koop aanbieden.
- Zelf prijzen, bronnen of nieuws controleren: dat doen de GitHub Actions al elke dag of week.

---

## Eerlijke verwachting

### Tijdlijn

| Periode | Wat je kunt verwachten |
|---|---|
| Week 1–4 | Site aangemeld, statistieken lopen. Weinig bezoekers. Partneraanvragen lopen. |
| Maand 1–3 | Google en Bing nemen steeds meer pagina's op. Eerste bezoekers via zoeken. Eerste partnerklikken, nog weinig geld. |
| Maand 3–12 | Vindbaarheid groeit (of niet: dat is onzeker). Het groeiplan mikt op 5.000 bezoekers per maand na 6 maanden. Seizoenspieken: half september (Prinsjesdag), 12 november – 31 december (zorgverzekering), januari, maart – mei (aangifte). |
| Maand 12–24 | Pas hier wordt duidelijk of de abonnementen (Familie, Pro) aanslaan. |

### Realistische rekensom na 18–24 maanden (uit [verdienmodel-hele-site.md](verdienmodel-hele-site.md))

Alle getallen zijn schattingen, geen beloftes.

| Bron | Aanname | Per maand |
|---|---|---|
| Familie | 300 betalende families × gemiddeld € 7 (na btw en kosten) | € 2.100 |
| Familie-afwikkeling | 15 per maand × € 99 | € 1.485 |
| Familie-partners | 5 uitvaartondernemers × € 99 | € 495 |
| Professionals | 25 kantoren × € 100 | € 2.500 |
| Besparen | 40.000 bezoekers, 2% koopt via een link, € 3 commissie | € 2.400 |
| Toeslagen-partnerlinks | 15.000 bezoekers, vooral in het overstapseizoen | € 300–800 |
| **Totaal** | | **≈ € 9.000–10.000** |

- **Kans dat dit lukt: laag tot redelijk, ongeveer 15–25%.**
- **Alleen consumenten, zonder Pro en partners:** € 10.000 per maand is onwaarschijnlijk (kleiner dan 5%).
- **Alleen advertenties en partnerlinks op de toeslagensite:** het groeiplan rekent op ongeveer € 500 per maand bij 40.000 bezoekers.
- **Met maar 1 uur per week** schuift alles op: reken dan eerder op 24–36 maanden, met een kleinere kans.

### Vaste kosten om rekening mee te houden

| Wat | Ongeveer |
|---|---|
| KvK-inschrijving | eenmalig (zie kvk.nl) |
| Supabase Pro | $25 per maand (pas nodig voor Pro, formulieren en Familie-accounts) |
| Plausible (als je dat kiest) | € 9 per maand |
| Jurist voor voorwaarden en privacy | vanaf € 1.000, eenmalig, vóór de eerste betalende klant |
| Beroepsaansprakelijkheidsverzekering | vóór de eerste betalende klant (offerte vragen) |
| Mollie | geen vaste kosten, wel kosten per betaling |

### De grootste risico's

1. **Te weinig bezoekers.** Alles hangt hiervan af. Google laat geldonderwerpen pas hoog zien als een site betrouwbaar overkomt; dat kost tijd en goede verwijzingen.
2. **Kantoren of uitvaartondernemers willen niet betalen.** Dan valt de grootste inkomstenbron weg. Het validatieplan geeft daar binnen 4 weken antwoord op.
3. **Een fout bedrag op de site.** Dat schaadt vertrouwen en kan tot klachten leiden. De automatische controles helpen, maar alleen als jij de meldingen elke week bekijkt.
4. **Regels:** AVG, consumentenrecht (opzegknop, herroeping), Reclamecode (partnerlinks herkenbaar). Fouten hierin kunnen boetes of een geblokkeerd account opleveren.
5. **Minder klikken uit zoekmachines** doordat Google en AI-assistenten steeds vaker zelf het antwoord geven. Daarom zijn `llms.txt` en de bronvermeldingen er; garanties zijn er niet.
6. **Afhankelijk van anderen:** partnerprogramma's kunnen stoppen of de vergoeding verlagen, en gratis diensten kunnen hun voorwaarden veranderen.
7. **Tijd.** Met 1 uur per week is er nauwelijks ruimte voor verkoop. Dat is de grootste rem op Pro en Familie-partners.

---

## Checklist

| # | Stap | Wie | Tijd | Status |
|---|---|---|---|---|
| 0 | Controleren dat sitemap.xml en llms.txt live openen | Eigenaar | 2 min | ☐ |
| 1 | KvK, btw-id en vestigingsplaats in `site.config.js` → `bedrijf` | Eigenaar | 5 min (bestaand bedrijf) of enkele dagen | ☐ |
| 2 | info@, privacy@ en security@ doorsturen (ImprovMX, [email.md](email.md)) | Eigenaar | 15 min + DNS-wachttijd | ☐ |
| 3 | Google Search Console: verifiëren via `vindbaar.google`, sitemap indienen | Eigenaar | 15 min | ☐ |
| 4 | Bing Webmaster Tools: importeren uit Search Console | Eigenaar | 5 min | ☐ |
| 5 | Statistieken: `analytics.goatcounterCode` of `analytics.plausibleDomain` | Eigenaar | 10 min | ☐ |
| 6 | Sitemap, robots.txt, llms.txt bijwerken | Automatisch | – | ✅ klaar (na stap 0 live) |
| 7 | IndexNow na elke publicatie | Automatisch | – | ✅ klaar (na stap 0 live) |
| 8 | Aanmelden bij Daisycon, TradeTracker, Awin; links in `partners.*.url` | Eigenaar | 1–2 uur + wachttijd | ☐ |
| 9 | Productfeeds als secrets (`DAISYCON_FEED_URLS` enz.) | Eigenaar | 15 min | ☐ |
| 10 | Supabase en Brevo instellen ([pro-accounts.md](pro-accounts.md)) | Eigenaar (stap 5 met computer) | 1–2 uur + DNS-wachttijd | ☐ |
| 11 | Eerste kantoren benaderen ([validatie-bewindvoerders.md](validatie-bewindvoerders.md)) | Eigenaar | 15 min per week | ☐ |
| 12 | Mollie-account aanmaken | Eigenaar | 30 min + enkele dagen | ☐ |
| 13 | Betaalkoppeling Familie bouwen en testen | Claude | – | ☐ nog niet gebouwd |
| 14 | `MOLLIE_API_KEY` als secret (GitHub en Supabase) | Eigenaar | 5 min | ☐ |
| 15 | Jurist en verzekering vóór eerste betalende klant | Eigenaar | extern | ☐ |
| 16 | `betalenActief` op `true` in `data/familie/prijzen.json` | Eigenaar of Claude | 2 min | ☐ (pas na 12–15) |
| 17 | Instagram: secrets, `instagram.account`, nieuwe `startDatum` | Eigenaar | 30–60 min | ☐ |
| 18 | AdSense met Europese toestemmingsmelding (optioneel, als laatste) | Eigenaar | 30 min + wachttijd | ☐ |
| 19 | Prijzen, bronnen en regels controleren | Automatisch (GitHub Actions) | – | ✅ draait |
| 20 | Wekelijkse routine | Eigenaar | max 1 uur per week | ☐ |
