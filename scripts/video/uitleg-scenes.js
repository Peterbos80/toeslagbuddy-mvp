// Uitlegvideo's (motion graphics in de huisstijl, geen pratende hoofden).
// Elke scène heeft een gesproken tekst (voice-over + ondertitel) en een beeld
// in HTML met CSS-animaties. scripts/video/uitleg.js zet de animaties per
// frame stil en maakt er een MP4 van. Alle namen en bedragen in beeld zijn
// verzonnen voorbeelden, behalve officiële bedragen met een bron op de site.

const ico = (naam) => `<svg class="i"><use href="/img/iconen.svg#${naam}"/></svg>`;

// Bouwstenen
const kaart = (inhoud, extra = '') => `<div class="kaart ${extra}">${inhoud}</div>`;
const regel = (icoon, kleur, titel, sub, pil = '', vertraging = 0) =>
  `<div class="regel in" style="animation-delay:${vertraging}s"><span class="stip ${kleur}">${ico(icoon)}</span><span><b>${titel}</b><small>${sub}</small></span>${pil ? `<span class="pil ${kleur}">${pil}</span>` : ''}</div>`;

export const VIDEOS = [
  {
    id: 'familie',
    titel: 'Samen de zaken van je ouders regelen',
    kleur: '#c2643a',
    scenes: [
      {
        tekst: 'Regel jij de zaken van je vader of moeder? Dan weet je hoe het gaat: brieven, termijnen en rekeningen, verspreid over de hele familie.',
        beeld: `<div class="titel smal"><p class="etiket in">ToeslagBuddy Familie</p><h1 class="in" style="animation-delay:.3s">Samen de zaken van je <em>ouders</em> regelen</h1></div>
<div class="stapel">${['CAK', 'Belastingdienst', 'Zorgverzekeraar', 'Gemeente', 'Pensioenfonds'].map((a, i) => `<div class="brief val" style="--r:${(i - 2) * 6}deg;animation-delay:${0.8 + i * 0.35}s">${ico('brief')}<b>${a}</b><i></i><i></i><i class="kort"></i></div>`).join('')}</div>`,
      },
      {
        tekst: 'In de regelkamer zie je samen wat er speelt. Elke termijn staat in de kalender, met de bron erbij. Zo mist niemand iets.',
        beeld: `<div class="twee"><div class="tekstblok"><p class="etiket in">De regelkamer</p><h2 class="in" style="animation-delay:.2s">Iedereen ziet <em>hetzelfde</em></h2>
<div class="avatars in" style="animation-delay:.5s"><span style="background:#c2643a">S</span><span style="background:#2f5d8a">M</span><span style="background:#6f3a73">J</span></div></div>
${kaart(`<p class="kop">Deze week</p>
${regel('kalender', 'rood', 'Bezwaar eigen bijdrage', 'CAK · vóór 15 december', 'nog 9 dagen', 0.6)}
${regel('zon', 'blauw', 'Salderen stopt 1 januari', 'Bekijk het energiecontract', 'bron', 1.0)}
${regel('taak', 'groen', 'Paspoort verlengen', 'Sanne pakt dit op', 'klaar', 1.4)}`, 'zweef')}</div>`,
      },
      {
        tekst: 'Snap je een brief niet? Plak de tekst. Je ziet meteen wat er staat, wat je moet doen en vóór wanneer. Een burgerservicenummer halen we er direct uit.',
        beeld: `<div class="twee"><div class="papier in">${ico('brief')}<p><b>Betreft: eigen bijdrage Wlz</b></p><p>U betaalt een eigen bijdrage van <mark>€ 212,60 per maand</mark>.</p><p>Burgerservicenummer: <s class="lak">●●●●●●●●●</s></p><p>U kunt <mark>binnen 6 weken</mark> bezwaar maken.</p></div>
${kaart(`<p class="kop">Wat staat er?</p>
${regel('euro', 'goud', '€ 212,60 per maand', 'Eigen bijdrage verpleeghuis', '', 0.8)}
${regel('klok', 'rood', 'Bezwaar vóór 15 december', '6 weken na de datum van de brief', '', 1.3)}
<p class="knop in" style="animation-delay:1.9s">${ico('vink')} Zet in de kalender</p>`)}</div>`,
      },
      {
        tekst: 'Wie geld uitgeeft, legt het vast in het logboek. Elke regel blijft zichtbaar, ook als hij wordt verbeterd. Zo kan iedereen meekijken.',
        beeld: `<div class="twee"><div class="tekstblok"><p class="etiket in">Logboek</p><h2 class="in" style="animation-delay:.2s">Geld van je ouder, <em>open</em> voor iedereen</h2></div>
${kaart(`<p class="kop">November</p>
${[['Boodschappen', '42,50', 'Sanne'], ['Apotheek', '18,20', 'Mark'], ['Kapper', '24,00', 'Sanne'], ['Taxi naar ziekenhuis', '31,75', 'Joke']].map(([w, b, d], i) => `<div class="rij in" style="animation-delay:${0.5 + i * 0.35}s"><span>${w}<small>${d}</small></span><b>€ ${b}</b></div>`).join('')}
<div class="rij som in" style="animation-delay:2.1s"><span>Totaal</span><b>€ 116,45</b></div>`)}</div>`,
      },
      {
        tekst: 'En als het moment komt, staat het stappenplan klaar. Met alle termijnen, en een opzegbrief voor elk contract.',
        beeld: `<div class="twee"><div class="tekstblok"><p class="etiket in">Na een overlijden</p><h2 class="in" style="animation-delay:.2s">Rust, als het <em>nodig</em> is</h2></div>
${kaart(`<p class="kop">Stappenplan</p>
${['Overlijden aangeven bij de gemeente', 'Uitvaart regelen', 'Contracten opzeggen of overzetten', 'Aangifte erfbelasting: 20 maanden'].map((t, i) => `<div class="vink in" style="animation-delay:${0.5 + i * 0.4}s"><span class="${i < 2 ? 'aan' : ''}">${i < 2 ? ico('vink') : ''}</span>${t}</div>`).join('')}`, 'rustig')}</div>`,
      },
      {
        tekst: 'Probeer het gratis op toeslagbuddy punt n l, schuine streep familie. Je gegevens blijven op je eigen apparaat.',
        ondertitel: 'Probeer het gratis op toeslagbuddy.nl/familie. Je gegevens blijven op je eigen apparaat.',
        beeld: `<div class="slot"><span class="logo in">€</span><h2 class="in" style="animation-delay:.25s">Probeer het <em>gratis</em></h2><p class="url in" style="animation-delay:.6s">toeslagbuddy.nl/familie</p>
<ul class="in" style="animation-delay:1s"><li>${ico('slot')} Op je eigen apparaat</li><li>${ico('schild')} Geen BSN</li><li>${ico('weegschaal')} Geen reclame</li></ul></div>`,
      },
    ],
  },
  {
    id: 'besparen',
    titel: 'Is die korting echt?',
    kleur: '#6f3a73',
    scenes: [
      {
        tekst: 'Vijftig procent korting. Maar was de prijs ooit echt zo hoog?',
        beeld: `<div class="titel"><p class="etiket in">ToeslagBuddy Besparen</p><h1 class="in" style="animation-delay:.3s">Is die korting <em>echt</em>?</h1>
<div class="sticker in" style="animation-delay:1s"><s>€ 199</s><b>€ 99</b><span>−50%</span></div></div>`,
      },
      {
        tekst: 'Wij kijken naar de gangbare prijs: wat een product de afgelopen negentig dagen meestal kostte, bij meerdere winkels, inclusief verzendkosten.',
        beeld: `<div class="twee"><div class="tekstblok"><p class="etiket in">90 dagen</p><h2 class="in" style="animation-delay:.2s">De <em>gangbare</em> prijs</h2></div>
${kaart(`<p class="kop">Prijs per week</p><svg class="grafiek" viewBox="0 16 600 124" aria-hidden="true">
<line x1="0" y1="96" x2="600" y2="96" class="gangbaar"/><text x="8" y="86" class="lab">gangbaar € 109</text>
<polyline class="lijn a" points="0,110 60,104 120,96 180,92 240,100 300,96 360,40 420,96 480,98 540,90 600,120"/>
<polyline class="lijn b" points="0,120 60,112 120,108 180,100 240,104 300,110 360,106 420,100 480,104 540,112 600,124"/>
<line x1="360" y1="40" x2="360" y2="140" class="piek"/><text x="372" y="36" class="lab rood">opgeblazen “van”-prijs</text></svg>`)}</div>`,
      },
      {
        tekst: 'Zo zie je in één oogopslag of het een echte deal is. En met een partnerlink krijgen wij soms een kleine vergoeding. Dat staat er altijd bij, en het verandert de volgorde niet.',
        beeld: `<div class="twee"><div class="tekstblok"><p class="etiket in">Met bewijs</p><h2 class="in" style="animation-delay:.2s">Eerlijk <em>berekend</em></h2></div>
${kaart(`<p class="kop">Koptelefoon met ruisonderdrukking</p>
<div class="rij in" style="animation-delay:.5s"><span>Vandaag, incl. verzending</span><b>€ 99,00</b></div>
<div class="rij in" style="animation-delay:.8s"><span>Gangbare prijs</span><b>€ 109,00</b></div>
<div class="rij som in" style="animation-delay:1.1s"><span>Echte korting</span><b class="groen">9%</b></div>
<p class="klein in" style="animation-delay:1.6s">${ico('info')} Partnerlink: wij kunnen een vergoeding krijgen</p>`)}</div>`,
      },
      {
        tekst: 'Zoek je iets? Zet een jager aan. Die houdt de prijzen voor je in de gaten en zegt eerlijk: nu kopen, of wachten.',
        beeld: `<div class="twee"><div class="tekstblok"><p class="etiket in">Jager</p><h2 class="in" style="animation-delay:.2s">Nu kopen of <em>wachten</em>?</h2></div>
${kaart(`${regel('zoek', 'blauw', 'Robotstofzuiger met dweilfunctie', 'onder € 300', '', 0.4)}
${regel('grafiek', 'goud', 'Prijs zakt meestal in januari', 'op basis van 90 dagen', '', 0.9)}
<p class="knop in" style="animation-delay:1.5s">${ico('klok')} Advies: wachten</p>`)}</div>`,
      },
      {
        tekst: 'Kijk op toeslagbuddy punt n l, schuine streep deals.',
        ondertitel: 'Kijk op toeslagbuddy.nl/deals',
        beeld: `<div class="slot"><span class="logo in">€</span><h2 class="in" style="animation-delay:.25s">Echte deals, <em>eerlijk</em> berekend</h2><p class="url in" style="animation-delay:.6s">toeslagbuddy.nl/deals</p></div>`,
      },
    ],
  },
  {
    id: 'toeslagen',
    titel: 'Mis je toeslag?',
    kleur: '#d9a441',
    scenes: [
      {
        tekst: 'Veel mensen krijgen geen toeslag, terwijl ze er wel recht op hebben. Jaar na jaar.',
        beeld: `<div class="titel"><p class="etiket in">ToeslagBuddy</p><h1 class="in" style="animation-delay:.3s">Mis je <em>geld</em> waar je recht op hebt?</h1></div>`,
      },
      {
        tekst: 'Bereken in twee minuten je zorgtoeslag, huurtoeslag, kindgebonden budget en kinderopvangtoeslag. Gratis, en zonder in te loggen.',
        beeld: `<div class="tegels">${[['zorg', 'Zorgtoeslag'], ['huis', 'Huurtoeslag'], ['familie', 'Kindgebonden budget'], ['hart', 'Kinderopvangtoeslag']].map(([i, n], k) => `<div class="tegel in" style="animation-delay:${0.3 + k * 0.3}s">${ico(i)}<b>${n}</b></div>`).join('')}</div>`,
      },
      {
        tekst: 'Je ziet ook of je moet terugbetalen. Zo pas je je voorschot op tijd aan.',
        beeld: `<div class="twee"><div class="tekstblok"><p class="etiket in">Op tijd</p><h2 class="in" style="animation-delay:.2s">Geen <em>verrassing</em> achteraf</h2></div>
${kaart(`${regel('vink', 'groen', 'Zorgtoeslag', 'je voorschot klopt', '', 0.5)}
${regel('waarschuwing', 'rood', 'Huurtoeslag', 'voorschot te hoog: pas het aan', '', 1.0)}`)}</div>`,
      },
      {
        tekst: 'Begin op toeslagbuddy punt n l.',
        ondertitel: 'Begin op toeslagbuddy.nl',
        beeld: `<div class="slot"><span class="logo in">€</span><h2 class="in" style="animation-delay:.25s">Bereken het in <em>2 minuten</em></h2><p class="url in" style="animation-delay:.6s">toeslagbuddy.nl</p></div>`,
      },
    ],
  },
];

// Stijl van de scènes (1280 × 720). Kleuren en lettertypen van de site.
export const STIJL = `
@font-face { font-family: Fraunces; src: url(/fonts/fraunces-latin-soft-normal.woff2) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Figtree; src: url(/fonts/figtree-latin-wght-normal.woff2) format('woff2'); font-weight: 300 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1280px; height: 720px; overflow: hidden; }
body { background: #faf7f2; color: #1c2826; font-family: Figtree, sans-serif; position: relative; }
.decor { position: absolute; width: 640px; height: 640px; border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%; right: -180px; top: -220px; background: var(--k); opacity: .14; animation: draai 30s linear both; }
.decor.twee { left: -260px; right: auto; top: auto; bottom: -340px; background: #1f6b5a; opacity: .1; }
@keyframes draai { to { transform: rotate(40deg); } }
.scene { position: absolute; inset: 0; padding: 64px 80px 120px; display: flex; align-items: center; animation: scene-in .6s cubic-bezier(.2,.8,.2,1) both; }
@keyframes scene-in { from { opacity: 0; transform: translateY(18px); } }
.in { animation: in .7s cubic-bezier(.2,.8,.2,1) both; }
@keyframes in { from { opacity: 0; transform: translateY(22px); } }
em { font-style: italic; font-weight: 480; color: var(--kt); }
h1 { font-family: Fraunces, serif; font-variation-settings: 'SOFT' 100; font-weight: 560; font-size: 72px; line-height: 1.04; letter-spacing: -.025em; max-width: 900px; }
h2 { font-family: Fraunces, serif; font-variation-settings: 'SOFT' 100; font-weight: 560; font-size: 54px; line-height: 1.06; letter-spacing: -.02em; }
.etiket { font-size: 17px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--kt); margin-bottom: 18px; }
.titel { width: 100%; }
.titel.smal h1 { max-width: 600px; }
.twee { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; width: 100%; }
.tekstblok h2 { max-width: 520px; }
.kaart { background: #fff; border: 1px solid #e4ded3; border-radius: 28px; padding: 28px; box-shadow: 0 2px 4px rgb(60 45 25 / 5%), 0 28px 60px -28px rgb(40 50 40 / 32%); animation: in .8s cubic-bezier(.2,.8,.2,1) .3s both; }
.kaart.zweef { animation: in .8s cubic-bezier(.2,.8,.2,1) .3s both, zweef 6s ease-in-out 1.1s infinite alternate; }
@keyframes zweef { to { transform: translateY(-8px); } }
.kaart .kop { font-size: 14px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #55625f; margin-bottom: 14px; }
.regel { display: grid; grid-template-columns: 48px 1fr auto; gap: 14px; align-items: center; padding: 12px 0; border-top: 1px solid #efe9df; }
.regel:first-of-type { border-top: 0; }
.regel b { display: block; font-size: 19px; } .regel small { display: block; color: #55625f; font-size: 15px; margin-top: 2px; }
.stip { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; }
.i { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.rood { background: #fae4e1; color: #a8322a; } .blauw { background: #e3ecf5; color: #2f5d8a; } .groen { background: #e3f0e7; color: #2f6f47; } .goud { background: #fbf1da; color: #7a5a12; }
.pil { font-size: 14px; font-weight: 700; border-radius: 99px; padding: 5px 12px; }
.avatars { display: flex; margin-top: 30px; } .avatars span { width: 62px; height: 62px; border-radius: 50%; border: 4px solid #faf7f2; margin-right: -14px; color: #fff; font-weight: 800; font-size: 24px; display: grid; place-items: center; }
.stapel { position: absolute; right: 90px; top: 190px; width: 360px; height: 380px; }
.brief { position: absolute; inset: 0 0 auto 0; height: 220px; background: #fff; border: 1px solid #e4ded3; border-radius: 18px; padding: 24px; transform: rotate(var(--r)); box-shadow: 0 20px 40px -24px rgb(40 50 40 / 40%); }
.brief b { display: block; font-size: 22px; margin: 10px 0 18px; } .brief .i { color: #c2643a; width: 32px; height: 32px; }
.brief i { display: block; height: 10px; border-radius: 6px; background: #efe9df; margin-bottom: 12px; } .brief i.kort { width: 60%; }
.val { animation: val .7s cubic-bezier(.2,.8,.2,1) both; }
@keyframes val { from { opacity: 0; transform: translateY(-120px) rotate(calc(var(--r) * 3)); } }
.papier { background: #fff; border: 1px solid #e4ded3; border-radius: 18px; padding: 30px; font-size: 20px; line-height: 1.5; box-shadow: 0 20px 40px -24px rgb(40 50 40 / 40%); }
.papier p { margin-top: 10px; } .papier .i { color: #c2643a; width: 34px; height: 34px; }
mark { background: #fbf1da; color: inherit; border-radius: 4px; padding: 0 4px; }
.lak { text-decoration: none; background: #1c2826; color: #1c2826; border-radius: 4px; letter-spacing: .1em; }
.knop { margin-top: 18px; display: inline-flex; gap: 10px; align-items: center; background: #1f6b5a; color: #fff; font-weight: 700; font-size: 19px; border-radius: 99px; padding: 14px 24px; }
.knop .i { width: 22px; height: 22px; }
.rij { display: flex; justify-content: space-between; align-items: baseline; padding: 13px 0; border-top: 1px solid #efe9df; font-size: 20px; }
.rij small { display: block; color: #55625f; font-size: 14px; } .rij.som { border-top: 2px solid #1c2826; font-weight: 800; }
.rij b.groen { background: none; }
.vink { display: flex; align-items: center; gap: 14px; font-size: 21px; padding: 11px 0; }
.vink span { width: 32px; height: 32px; border-radius: 10px; border: 2px solid #b9b0a1; display: grid; place-items: center; }
.vink span.aan { background: #1f6b5a; border-color: #1f6b5a; color: #fff; } .vink .i { width: 20px; height: 20px; stroke-width: 2.6; }
.slot { width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; }
.slot .logo { width: 88px; height: 88px; border-radius: 26px; background: #1f6b5a; color: #fff; font-weight: 800; font-size: 50px; display: grid; place-items: center; margin-bottom: 28px; }
.slot h2 { font-size: 64px; } .url { font-size: 30px; font-weight: 700; color: #1f6b5a; margin-top: 18px; }
.slot ul { list-style: none; padding: 0; display: flex; gap: 14px; margin-top: 30px; }
.slot li { display: flex; gap: 8px; align-items: center; font-size: 19px; font-weight: 600; border: 1.5px solid #e4ded3; background: #fff; border-radius: 99px; padding: 10px 18px; }
.slot li .i { width: 22px; height: 22px; color: #1f6b5a; }
.sticker { display: inline-flex; gap: 18px; align-items: center; margin-top: 40px; background: #fff; border: 1px solid #e4ded3; border-radius: 22px; padding: 18px 26px; font-size: 34px; }
.sticker s { color: #55625f; } .sticker b { font-size: 44px; } .sticker span { background: #a8322a; color: #fff; font-weight: 800; border-radius: 12px; padding: 4px 12px; }
.grafiek { width: 100%; height: auto; }
.grafiek .lijn { fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 900; animation: teken 2.4s ease-out .6s both; }
.grafiek .lijn.a { stroke: #6f3a73; } .grafiek .lijn.b { stroke: #c2643a; animation-delay: 1s; }
@keyframes teken { from { stroke-dashoffset: 900; } to { stroke-dashoffset: 0; } }
.grafiek .gangbaar { stroke: #1f6b5a; stroke-width: 3; stroke-dasharray: 10 8; }
.grafiek .piek { stroke: #a8322a; stroke-width: 2; stroke-dasharray: 4 6; animation: in .5s 2.6s both; }
.grafiek .lab { font: 700 18px Figtree, sans-serif; fill: #1f6b5a; } .grafiek .lab.rood { fill: #a8322a; animation: in .5s 2.8s both; }
.klein { font-size: 15px; color: #55625f; margin-top: 14px; display: flex; gap: 8px; align-items: center; } .klein .i { width: 18px; height: 18px; }
.tegels { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; width: 100%; }
.tegel { background: #fff; border: 1px solid #e4ded3; border-radius: 24px; padding: 30px 24px; box-shadow: 0 20px 40px -24px rgb(40 50 40 / 30%); }
.tegel .i { width: 44px; height: 44px; color: #1f6b5a; } .tegel b { display: block; font-size: 24px; margin-top: 18px; line-height: 1.15; }
.ondertitel { position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%); max-width: 1040px; text-align: center; background: rgb(20 33 30 / 88%); color: #fff; font-size: 25px; line-height: 1.35; font-weight: 600; border-radius: 14px; padding: 10px 20px; }
.merk { position: absolute; left: 80px; top: 34px; display: flex; gap: 10px; align-items: center; font-family: Fraunces, serif; font-size: 22px; font-weight: 600; }
.merk span { width: 34px; height: 34px; border-radius: 10px; background: #1f6b5a; color: #fff; font-family: Figtree, sans-serif; font-weight: 800; display: grid; place-items: center; font-size: 19px; }
`;

// Ondertitel in stukjes van maximaal ~90 tekens, verdeeld over de duur van de scène
export function ondertitels(tekst, duur) {
  // Zinnen splitsen na . ! ? gevolgd door een spatie (niet in 'toeslagbuddy.nl');
  // korte zinnen samen in één regel als dat past
  const zinnen = [];
  for (const z of tekst.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean)) {
    const vorige = zinnen.at(-1);
    if (vorige && (vorige.length < 28 || z.length < 24) && vorige.length + z.length < 78) zinnen[zinnen.length - 1] = `${vorige} ${z}`;
    else zinnen.push(z);
  }
  const stukken = [];
  for (const z of zinnen) {
    if (z.length <= 90) { stukken.push(z); continue; }
    // Lange zin: in gelijke delen, bij voorkeur na een komma
    const delen = Math.ceil(z.length / 80);
    const doel = z.length / delen;
    const woorden = z.split(' ');
    let huidig = '';
    let gemaakt = 0;
    for (const w of woorden) {
      const nieuw = (huidig + ' ' + w).trim();
      const vol = huidig.length >= doel * 0.75 && (/,$/.test(huidig) || nieuw.length > doel * 1.1);
      if (vol && gemaakt < delen - 1) { stukken.push(huidig); gemaakt++; huidig = w; } else huidig = nieuw;
    }
    if (huidig) stukken.push(huidig);
  }
  const totaal = stukken.reduce((s, x) => s + x.length, 0);
  let t = 0;
  return stukken.map((x) => {
    const d = (x.length / totaal) * duur;
    const r = { van: t, tot: t + d, tekst: x };
    t += d;
    return r;
  });
}

// Geschatte duur zonder stem: rustig spreektempo plus een pauze
export const schatDuur = (tekst) => Math.max(3.5, tekst.split(/\s+/).length / 2.5 + 1.2);
