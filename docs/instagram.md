# Instagram-aanpak ToeslagBuddy

## Hoe het werkt

1. **Persona's** (`social/personas.js`) beschrijven vijf doelgroepen: wie ze zijn, waar ze mee zitten, welke toon werkt en welke openingszinnen (hooks).
2. **De contentgenerator** (`social/content.js`) maakt uit die persona's carrousels met echte bedragen uit de rekenmotor. De cijfers op Instagram zijn dus altijd dezelfde als op de site.
3. **`social/render.js`** tekent alle slides als JPEG van 1080×1350 in `dist/social/`. Ze komen met de site mee online. Een overzicht van alle posts met teksten staat op `/social/` van je site; die pagina wordt niet door Google gevonden.
4. **`.github/workflows/instagram.yml`** plaatst elke dag rond 19:00 de post van die dag via de officiële Instagram Graph API.

Kalender: **3 posts per week**.

| Dag | Soort post |
|---|---|
| Maandag | Rekenvoorbeeld van een persona |
| Woensdag | Feit of tip |
| Zaterdag | Rekenvoorbeeld van een persona |

De eerste post staat op maandag 5 oktober 2026 en de kalender loopt 6 weken. Je past dit aan in `site.config.js` bij `instagram.startDatum` en `instagram.weken`.

## De 5 persona's

| Persona | Doelgroep | Belangrijkste invalshoek |
|---|---|---|
| **Sanne, 20** – student in een studio | 18–25 jaar, bijbaan | Zorgtoeslag bijna maximaal; studiefinanciering telt niet mee |
| **Ilse, 34** – alleenstaande moeder van 2 | Alleenstaande ouders, parttime | € 3.320 alleenstaande-ouderkop; kinderalimentatie telt niet mee |
| **Mo & Lisa, 31** – tweeverdieners met opvang | Jonge gezinnen | "Wij verdienen te veel" klopt vaak niet; opvang tot 96% vergoed |
| **Henk, 71** – AOW'er in een huurwoning | Ouderen, én hun (klein)kinderen | "Check dit samen met je opa of oma" |
| **Dani, 27** – flexwerker, huurt samen | Flex/zzp, vrije-sectorhuur | Huur boven € 932 geeft sinds 2026 tóch recht; terugbetalen voorkomen |

## Waarom deze posts werken

Deze technieken werken en zijn eerlijk. Gebruik ze zoals hieronder beschreven.

| Techniek | In de praktijk |
|---|---|
| **Herkenning** | De eerste slide noemt de doelgroep bij naam ("Student?", "Alleenstaande ouder?"). Mensen stoppen met scrollen als ze zichzelf zien. |
| **Concreet bedrag** | "€ 454 per maand" werkt beter dan "je kunt misschien toeslag krijgen". Het bedrag klopt altijd, want het komt uit de rekenmotor. |
| **Geld laten liggen** (verliesaversie) | Mensen vinden het erger om geld mis te lopen dan om geld te winnen. Gebruik dit alleen als vraag ("Laat jij dit liggen?"), nooit als dreiging. |
| **Nieuwsgierigheid** | "Swipe voor het rekenvoorbeeld →" op slide 1, de uitkomst pas op slide 3 en 4. |
| **Doorsturen** | "Stuur dit naar je opa/oma". Delen via DM is een sterk signaal voor het algoritme. |
| **Opslaan** | Tips en checklists krijgen "📌 Bewaar deze post". Opgeslagen posts worden vaker getoond. |
| **Echte deadlines** | 1 januari (vermogen), 31 december (overstappen van zorgverzekering), 1 september (aanvragen met terugwerkende kracht). |
| **Lage drempel** | "Gratis, anoniem, zonder DigiD, in 2 minuten". Na de toeslagenaffaire is vertrouwen belangrijker dan wat ook. |

### Wat we bewust níet doen

Dit is ook zakelijk verstandig: de doelgroep is kwetsbaar en wantrouwig, en één nep-post kan het vertrouwen in het hele merk kosten.

- **Geen nep-accounts of nep-reviews.** Geen accounts die zich voordoen als echte mensen, geen nep-klantverhalen, geen gekochte volgers of likes. Dit is ook in strijd met de regels van Instagram en kan je account laten blokkeren.
- **Persona's zijn altijd herkenbaar fictief.** Op de slide staat altijd "Rekenvoorbeeld · fictief".
- **Geen bangmakerij** over terugvorderingen of de Belastingdienst. Geen nep-deadlines.
- **Partnerlinks herkenbaar maken** in posts: #ad of "partnerlink". Dat is wettelijk verplicht (Reclamecode Social Media).

## Eenmalig instellen (ongeveer 30 minuten)

1. **Instagram-account.** Maak een Instagram-account aan (bijvoorbeeld @toeslagbuddy) en zet het om naar een **zakelijk account**: Instellingen → Accounttype. Zet in je bio de link `https://www.toeslagbuddy.nl/instagram/`. Die pagina bestaat al en telt bezoekers via de UTM-tags in de links.
2. **Facebook-pagina.** Maak een Facebook-pagina "ToeslagBuddy" en koppel het Instagram-account eraan. Die koppeling heeft de API nodig.
3. **App bij Meta.** Ga naar [developers.facebook.com](https://developers.facebook.com), maak een app van het type "Zakelijk" en voeg het product **Instagram** (Instagram API met Facebook Login) toe.
4. **Toegangstoken.** Maak in Meta Business Suite onder Bedrijfsinstellingen → Systeemgebruikers een systeemgebruiker aan. Geef die toegang tot de pagina en het Instagram-account, en genereer een token met deze rechten:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`

   Een token van een systeemgebruiker verloopt niet.
5. **Instagram-ID opzoeken** met de Graph API Explorer: `GET /me/accounts?fields=instagram_business_account`.
6. **Secrets in GitHub.** Ga in je repo naar *Settings → Secrets and variables → Actions* en voeg toe:
   - `IG_USER_ID`
   - `IG_ACCESS_TOKEN`
7. **Account in de site.** Vul in `site.config.js` bij `instagram.account` je gebruikersnaam in. Er komt dan een Instagram-link in de footer van de site.
8. **Testen.** Ga naar *Actions → Instagram-post van vandaag → Run workflow* en vul een datum uit de kalender in.

Zonder `IG_USER_ID` en `IG_ACCESS_TOKEN` draait alles in proefmodus: er wordt niets geplaatst, je ziet alleen wat er geplaatst zou worden.

## Wat je zelf blijft doen (niet te automatiseren)

- **Reacties en DM's beantwoorden**, het liefst binnen een uur na het plaatsen. Dat is ook het moment waarop Instagram bepaalt of een post meer mensen bereikt. Vraag nooit om persoonsgegevens; verwijs naar de anonieme check.
- **Reels van 15–30 seconden**, 1 à 2 per week. Een eenvoudig format: gezicht of scherm-opname van de rekenhulp, met tekst uit de hook van een persona. De teksten uit `dist/social/kalender.json` kun je hergebruiken.
- **Stories** met een link naar de site, vooral van 12 november tot 31 december (overstappen van zorgverzekering) en in januari (nieuwe bedragen).
- **Samenwerken.** Stuur geldbesparende en mama-accounts een DM met de vraag of ze de check willen delen. Een eerlijke partnerschap levert meer op dan advertenties.

## Nieuwe content toevoegen

- **Nieuwe persona:** voeg een object toe aan `social/personas.js`.
- **Nieuw feit:** voeg een item toe aan `feiten()` in `social/content.js`.

Draai daarna `npm run social` en open `dist/social/index.html` om alles te controleren voordat je pusht.
