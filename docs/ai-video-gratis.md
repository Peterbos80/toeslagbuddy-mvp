# Gratis AI-beelden (Kaggle)

De filmische beelden onder de uitlegvideo's worden gratis gemaakt met het open-source videomodel **Wan 2.1** (1.3B, Apache-2.0: ook commercieel vrij te gebruiken) op de **gratis GPU van Kaggle** (30 uur per week). GitHub Actions regelt alles: klaarzetten, draaien, ophalen, in de video's zetten en publiceren.

## Eenmalig instellen (± 5 minuten)

1. Maak een gratis account op **kaggle.com** (inloggen met Google mag).
2. **Verifieer je telefoonnummer**: *Settings → Phone verification*. Zonder dat geeft Kaggle geen GPU en geen internet.
3. Maak een API-token: *Settings → API → Create New Token*.
   - Krijg je een bestand `kaggle.json`: daarin staan `username` en `key`.
   - Krijg je één lange token: gebruik die als `KAGGLE_API_TOKEN`.
4. Zet de geheimen in GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - `KAGGLE_USERNAME` = je Kaggle-gebruikersnaam
   - `KAGGLE_KEY` = de `key` uit `kaggle.json` **of** `KAGGLE_API_TOKEN` = de lange token
5. Start één keer: **Actions → AI-beelden maken (gratis, Kaggle) → Run workflow**. Daarna gaat het vanzelf als de scènes veranderen.

## Wat je mag verwachten

- Per beeld ± 10–20 minuten op de gratis GPU; 10 beelden ± 2–3 uur. Je hoeft niets te doen.
- Kwaliteit: goed voor sfeerbeelden (tafel, handen, post, een woonkamer). Minder dan Veo, en gezichten blijven lastig; daarom vragen de prompts om beelden zonder herkenbare gezichten.
- De clips zijn 5 seconden en worden heen-en-terug afgespeeld (10 s), zonder zichtbare sprong.
- In elke video staat *Beelden gemaakt met AI*.
- Bevalt een beeld niet? Verwijder het bestand in `data/video/beelden/` en start de workflow opnieuw, of zet er een eigen clip voor in de plaats (zie [ai-video-flow.md](ai-video-flow.md)).
