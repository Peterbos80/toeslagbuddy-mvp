# AI-beelden maken in Google Flow (route B)

Gebruik dit als je de filmbeelden met de hand in **Google Flow** wilt maken in plaats van automatisch via de API (route A: geheim `GEMINI_API_KEY` in GitHub). Beide routes eindigen op dezelfde plek: `data/video/beelden/`.

## Stappen

1. Open **https://labs.google/flow** en maak een nieuw project.
2. Kies **Text to Video**, beeldverhouding **16:9 (liggend)**, lengte **8 seconden**. Kies de beste kwaliteit die je abonnement toestaat (Veo 3.1 of nieuwer).
3. Plak de prompt uit de tabel hieronder (precies zoals hij er staat, in het Engels).
4. Maak het beeld. Mislukt het (rare handen, tekst in beeld, een gezicht dat nep oogt)? Maak het opnieuw; kies de mooiste.
5. Download de clip (**Download → MP4**, 720p of 1080p is genoeg).
6. Hernoem het bestand naar de **bestandsnaam** uit de tabel, bijv. `familie-1.mp4`.
7. Upload alle clips naar GitHub:
   - Ga naar **github.com/Peterbos80/toeslagbuddy-mvp**, open de map **data → video → beelden**.
   - Klik **Add file → Upload files**, sleep de MP4-bestanden erin.
   - Kies onderaan **Commit directly to the `claude/toeslagbuddy-mvp` branch** en klik **Commit changes**.
8. Klaar. Een upload in die map start vanzelf de workflow *Uitlegvideo's maken*: die zet de beelden in de video's, met voice-over en ondertitels, en publiceert de site opnieuw (± 15 minuten).

Tips
- Geen tekst, logo's of overheidshuisstijl in beeld (dat zou misleidend zijn). Bij de video staat altijd *Beelden gemaakt met AI*.
- Met de hand geplaatste clips worden nooit door de automatische route overschreven.
- Wil je een clip vervangen? Upload een nieuwe met dezelfde naam.
- Grote bestanden (1080p uit Flow) worden in de workflow vanzelf verkleind tot 720p, zodat de site snel blijft.

Negatieve prompt (als Flow daar een veld voor heeft): `text, letters, words, captions, subtitles, watermark, logo, brand names, government emblem, flags, police, close-up of faces, person talking to camera, distorted hands, extra fingers, deformed bodies, cartoon, illustration, 3d render, low quality`

## De 10 beelden

| Bestandsnaam | Bij de zin | Prompt |
|---|---|---|
| `familie-1.mp4` | Regel jij de zaken van je vader of moeder? | A wooden kitchen table in a cosy Dutch home covered with a messy pile of unopened envelopes and letters, a cup of tea beside them, soft morning light through the window, slow dolly-in. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `familie-2.mp4` | In de regelkamer zie je samen wat er speelt. | Over-the-shoulder shot from behind of an adult daughter and her elderly father sitting side by side at a kitchen table, looking together at a tablet, their faces not visible, warm afternoon light, gentle slow push-in. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `familie-3.mp4` | Snap je een brief niet? | Close-up of two hands holding a printed letter with blurred, unreadable lines next to a smartphone on a wooden table, shallow depth of field, slow gentle camera drift. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `familie-4.mp4` | Wie geld uitgeeft, legt het vast in het logboek. | Close-up of hands tucking a small paper receipt into a notebook on a kitchen counter, a bag of groceries softly out of focus behind, warm light, slow motion. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `familie-5.mp4` | En als het moment komt, staat het stappenplan klaar. | A calm, sunlit Dutch living room with an empty armchair, a reading lamp and green plants, sheer curtains moving softly in a breeze, peaceful and respectful mood, very slow pan. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `besparen-1.mp4` | Vijftig procent korting. | A Dutch shopping street at dusk seen through a shop window, colourful abstract price tags and blurred city lights, bokeh, slow tracking shot. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `besparen-2.mp4` | Wij kijken naar de gangbare prijs: wat een product de afgelopen negentig dagen meestal kostte, bij meerdere winkels, inclusief verzendkosten. | Close-up of a person's hands on a sofa scrolling on a smartphone, the screen softly out of focus, cosy evening lamp light, slow push-in. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `besparen-4.mp4` | Zoek je iets? | A cardboard parcel standing on the doorstep of a Dutch brick terraced house with a green front door, light drizzle, soft daylight, slow motion. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `toeslagen-1.mp4` | Veel mensen krijgen geen toeslag, terwijl ze er wel recht op hebben. | Seen from behind, a young couple at a kitchen table in the morning with a laptop and a few paper bills, a child's drawing on the fridge, natural light, slow dolly. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
| `toeslagen-3.mp4` | Je ziet ook of je moet terugbetalen. | Top-down close-up of a hand ticking boxes on a paper checklist with a pen, next to a calculator and a cup of coffee, slow rotation. Photorealistic live-action footage, cinematic 35mm film look, shallow depth of field, natural warm colour grading, smooth steady camera, set in the Netherlands. No on-screen text, no logos, no subtitles. |
