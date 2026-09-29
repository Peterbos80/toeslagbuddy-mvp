# Realistische AI-video's met fictieve personen

Na elke berekening legt een persona de uitkomst uit. Er zijn twee vormen:
1. **Getekende persona** (werkt nu al): een geanimeerd figuur met Nederlandse stem en ondertiteling.
2. **Realistische AI-presentator** (klaar om aan te zetten): een fotorealistische, fictieve persoon in echte video, gemaakt met **HeyGen**.

Staan de clips van een persona klaar, dan kiest de site automatisch de echte video. Anders valt hij terug op de getekende versie.

## Twee manieren om de echte video's te maken

| | **A. Open source (zonder account)** | **B. HeyGen (betaald)** |
|---|---|---|
| Nodig | Niets; draait in GitHub Actions | HeyGen-abonnement met API, sleutel en avatar-ID's |
| Gezicht | Fictief, gemaakt met Stable Diffusion (Realistic Vision) | Stock-avatar van HeyGen |
| Stem | Piper (open source, Nederlands) | Nederlandse stem van HeyGen |
| Beweging | Pratend hoofd met lipsync (SadTalker), hoofd vrij stil | Levendig, met gebaren |
| Echtheid | Goed op telefoonformaat; van dichtbij zie je dat het AI is | Heel echt |
| Kosten | Gratis (rekentijd van GitHub; ± 1,5 uur per persona, parallel) | Per minuut video |

**A starten:** GitHub → *Actions* → **Echte AI-video's maken (open source)** → *Run workflow*.
- Eerst een proef: persona `henk`, fragment `intro`.
- Daarna alles leeg laten voor alle persona's.
- Elke clip wordt automatisch **gekeurd**: echte video met geluid, niet bevroren, niet stil. Afgekeurde clips komen niet op de site.
- Onder de run staan per persona een **contactblad** (één beeld per seconde) en een keuringsrapport. Bekijk die vóór je de site deelt.
- Na afloop worden de clips in git bewaard en wordt de site opnieuw gepubliceerd. Dat gebeurt pas als alle tests slagen; de keuring draait bij de publicatie opnieuw.
- Gezichten worden één keer gemaakt en bewaard in `public/video/gezichten/`. Vind je een gezicht niet goed? Verwijder dan de foto en pas de `seed` of de beschrijving aan in `scripts/video/personas.json`.

**Licenties (A):**
- SadTalker: Apache 2.0.
- Realistic Vision en Stable Diffusion 1.5: CreativeML OpenRAIL-M. Commercieel gebruik mag, maar niet om te misleiden; het AI-label is dus verplicht.
- Piper: GPL-3.0. Dat geldt voor de software, niet voor de audio die ermee wordt gemaakt.
- SadTalker is getraind met hulpmodellen van derden (zoals Deep3DFaceReconstruction). Laat dit meenemen in de juridische check.

## Waarom dit privacyvriendelijk blijft

- De clips worden **vooraf** gemaakt met algemene teksten, zoals "Goed nieuws! In beeld zie je hoeveel je waarschijnlijk kunt krijgen". Er staan **geen persoonsgegevens** in.
- De persoonlijke bedragen verschijnen **als ondertitel in beeld**, in de browser van de bezoeker. Het inkomen van een bezoeker gaat dus nooit naar HeyGen.
- Het is goedkoop: ongeveer 91 korte clips (7 persona's × 13 fragmenten), eenmalig gemaakt. Alleen bij tekstwijzigingen, bijvoorbeeld nieuwe bedragen, worden clips opnieuw gemaakt.

## Wettelijk verplicht: AI-label

Sinds 2 augustus 2026 moeten AI-video's van mensen herkenbaar zijn als AI (AI-verordening, artikel 50). Dat is ingebouwd:
- een zichtbaar label **"AI-gegenereerde video · fictief persoon"** op elke video;
- een tekst onder de video;
- een markering in het videobestand zelf (metadata).

Gebruik alleen **stock-avatars van HeyGen** (die zijn daarvoor gelicentieerd). Gebruik **nooit** het gezicht of de stem van een bestaand persoon zonder schriftelijke toestemming.

## Eenmalig instellen

1. **Account en API-sleutel.** Maak een account op **heygen.com** met een abonnement dat API-toegang geeft. Maak onder *Settings → API* een API-sleutel aan.
2. **Sleutel in GitHub.** Zet die sleutel in GitHub als secret **`HEYGEN_API_KEY`** (*Settings → Secrets and variables → Actions*). Deel hem nooit in de chat.
3. **Avatar en stem per persona kiezen.** Kies in HeyGen een realistische stock-avatar die bij elke persona past, plus een **Nederlandse stem**:

| Persona | Uiterlijk |
|---|---|
| Buddy | vriendelijke presentator, neutraal |
| Sanne | vrouw van ongeveer 21, student |
| Dani | persoon van ongeveer 29, zzp'er |
| Mo | man van ongeveer 34, vader |
| Ilse | vrouw van ongeveer 36, moeder |
| Karin | vrouw van ongeveer 54 |
| Henk | man van ongeveer 71 |

   De ID's vind je via de API (`GET /v2/avatars` en `GET /v2/voices`) of in de HeyGen-app.
4. **ID's in de configuratie.** Zet ze in `site.config.js` bij `video.avatars`, bijvoorbeeld:
   ```js
   henk: { avatarId: 'Abigail_expressive_2024112501', voiceId: 'abc123…' },
   ```
   Dit is een voorbeeld; gebruik je eigen ID's.
5. **Clips laten maken.** Ga naar **Actions → "AI-video's maken" → Run workflow**. Die:
   - maakt de clips via HeyGen;
   - verkleint ze met ffmpeg (540p) en zet de AI-markering erin;
   - slaat ze op in `public/video/` met een `manifest.json`;
   - start daarna automatisch een nieuwe publicatie van de site.

   Tip: begin met één persona (bijvoorbeeld `buddy`) om kwaliteit en kosten te testen.

## Controle

- De browsertest `realistische AI-video` controleert dat de juiste clips in de goede volgorde spelen, dat de persoonlijke bedragen als ondertitel verschijnen en dat het AI-label zichtbaar is.
- Na het maken kun je alle clips met hun teksten bekijken in `public/video/manifest.json`.
