// HTML voor de rekenhulpen. De berekening zelf gebeurt in de browser
// (public/js/app.js) met dezelfde rekenmotor als de tests.

const id = (() => {
  let n = 0;
  return (p) => `${p}-${++n}`;
})();

function janee(name, legend, standaard = 'nee', hint = '') {
  const a = id(name);
  const b = id(name);
  return `<fieldset class="veld">
  <legend>${legend}</legend>${hint ? `\n  <p class="hint">${hint}</p>` : ''}
  <div class="keuze">
    <input type="radio" id="${a}" name="${name}" value="ja"${standaard === 'ja' ? ' checked' : ''}><label for="${a}">Ja</label>
    <input type="radio" id="${b}" name="${name}" value="nee"${standaard === 'nee' ? ' checked' : ''}><label for="${b}">Nee</label>
  </div>
</fieldset>`;
}

function bedrag(name, label, { hint = '', placeholder = '', required = false, waarde = '' } = {}) {
  const i = id(name);
  return `<div class="veld">
  <label for="${i}">${label}</label>${hint ? `\n  <p class="hint" id="${i}-h">${hint}</p>` : ''}
  <div class="euro"><span aria-hidden="true">€</span><input id="${i}" name="${name}" inputmode="decimal" autocomplete="off" placeholder="${placeholder}"${waarde ? ` value="${waarde}"` : ''}${required ? ' required' : ''}${hint ? ` aria-describedby="${i}-h"` : ''}></div>
</div>`;
}

function getal(name, label, { hint = '', min = 0, max = 99, waarde = '' } = {}) {
  const i = id(name);
  return `<div class="veld">
  <label for="${i}">${label}</label>${hint ? `\n  <p class="hint">${hint}</p>` : ''}
  <input id="${i}" name="${name}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${waarde}" class="kort">
</div>`;
}

function vinkje(name, label, hint = '') {
  const i = id(name);
  return `<div class="veld vinkje">
  <input type="checkbox" id="${i}" name="${name}" value="ja"><label for="${i}">${label}</label>${hint ? `\n  <p class="hint">${hint}</p>` : ''}
</div>`;
}

const inkomenHint =
  'Je toetsingsinkomen is meestal je bruto jaarinkomen, inclusief vakantiegeld. Heb je een toeslagpartner? Tel jullie inkomens op. <a href="/toetsingsinkomen/">Hulp nodig?</a>';

const vermogenHint = 'Spaargeld en beleggingen op 1 januari, min schulden. Weet je het niet precies? Laat leeg als het weinig is.';

function kinderen(label = 'Hoeveel kinderen jonger dan 18 heb je?') {
  const i = id('aantal');
  return `<div class="veld" data-kids>
  <label for="${i}">${label}</label>
  <input id="${i}" name="aantalKinderen" type="number" inputmode="numeric" min="0" max="12" value="0" class="kort">
  <div class="kids" data-kids-lijst></div>
</div>`;
}

function opvang() {
  return `<div class="veld" data-opvang>
  <p class="label">Kinderopvang per kind</p>
  <p class="hint">Vul per kind de soort opvang, de uren per maand en de uurprijs van je opvang in. De uren staan op je contract of factuur.</p>
  <div data-opvang-lijst></div>
  <button type="button" class="knop-licht" data-opvang-erbij>+ Kind toevoegen</button>
</div>`;
}

function formulier(calc, inhoud, knop = 'Bereken') {
  return `<form class="rekenhulp" data-calc="${calc}" novalidate>
${inhoud}
<button type="submit" class="knop">${knop}</button>
<p class="privacy-noot">🔒 Je gegevens blijven op je eigen apparaat. We slaan niets op.</p>
</form>
<div class="uitkomst" data-result aria-live="polite"></div>`;
}

export const forms = {
  zorgtoeslag: () =>
    formulier(
      'zorgtoeslag',
      [
        janee('partner', 'Heb je een toeslagpartner?', 'nee', 'Meestal je echtgenoot, geregistreerd partner of iemand met wie je samenwoont en op één adres staat ingeschreven. <a href="/toeslagpartner/">Wat is een toeslagpartner?</a>'),
        bedrag('inkomen', 'Toetsingsinkomen per jaar', { hint: inkomenHint, placeholder: '25.000', required: true }),
        bedrag('vermogen', 'Vermogen (optioneel)', { hint: vermogenHint, placeholder: '0' }),
      ].join('\n'),
      'Bereken zorgtoeslag',
    ),

  huurtoeslag: () =>
    formulier(
      'huurtoeslag',
      [
        bedrag('kaleHuur', 'Kale huur per maand', { hint: 'De huur zonder servicekosten, gas, water en licht. Servicekosten tellen vanaf 2026 niet meer mee.', placeholder: '700', required: true }),
        getal('personen', 'Met hoeveel personen woon je in de woning?', { hint: 'Jezelf meegeteld, ook kinderen.', min: 1, max: 12, waarde: 1 }),
        getal('volwassenen', 'Hoeveel daarvan zijn 18 jaar of ouder?', { min: 1, max: 12, waarde: 1 }),
        bedrag('inkomen', 'Inkomen van het hele huishouden per jaar', { hint: 'Jouw toetsingsinkomen plus dat van je toeslagpartner en medebewoners. ' + '<a href="/toetsingsinkomen/">Hoe bereken ik dit?</a>', placeholder: '25.000', required: true }),
        getal('leeftijd', 'Jouw leeftijd', { min: 16, max: 120, waarde: '' }),
        vinkje('aow', 'Iemand in mijn huishouden heeft de AOW-leeftijd'),
        vinkje('aangepasteWoning', 'Mijn woning is aangepast vanwege een handicap'),
        bedrag('vermogen', 'Vermogen van het huishouden (optioneel)', { hint: vermogenHint, placeholder: '0' }),
      ].join('\n'),
      'Bereken huurtoeslag',
    ),

  kindgebondenBudget: () =>
    formulier(
      'kindgebondenBudget',
      [
        janee('partner', 'Heb je een toeslagpartner?', 'ja'),
        kinderen(),
        bedrag('inkomen', 'Toetsingsinkomen per jaar', { hint: inkomenHint, placeholder: '35.000', required: true }),
        bedrag('vermogen', 'Vermogen (optioneel)', { hint: vermogenHint, placeholder: '0' }),
      ].join('\n'),
      'Bereken kindgebonden budget',
    ),

  kinderopvangtoeslag: () =>
    formulier(
      'kinderopvangtoeslag',
      [bedrag('inkomen', 'Gezamenlijk toetsingsinkomen per jaar', { hint: inkomenHint, placeholder: '60.000', required: true }), opvang()].join('\n'),
      'Bereken kinderopvangtoeslag',
    ),

  kinderbijslag: () => formulier('kinderbijslag', kinderen(), 'Bereken kinderbijslag'),

  alles: () =>
    formulier(
      'alles',
      `<div class="stap"><h3><span>1</span> Jouw situatie</h3>
${janee('partner', 'Heb je een toeslagpartner?', 'nee', 'Getrouwd, geregistreerd partner of samenwonend op één adres. <a href="/toeslagpartner/">Twijfel je?</a>')}
${getal('leeftijd', 'Jouw leeftijd', { min: 16, max: 120, waarde: '' })}
${vinkje('aow', 'Ik of mijn partner heeft de AOW-leeftijd')}
</div>
<div class="stap"><h3><span>2</span> Inkomen en vermogen</h3>
${bedrag('inkomen', 'Toetsingsinkomen per jaar (samen met je partner)', { hint: inkomenHint, placeholder: '25.000', required: true })}
${bedrag('vermogen', 'Vermogen (optioneel)', { hint: vermogenHint, placeholder: '0' })}
${vinkje('uitkering', 'Ik heb een uitkering (WW, WIA, Wajong, ZW of ANW)')}
${vinkje('langdurigLaag', 'Ik heb al 3 jaar of langer een laag inkomen')}
</div>
<div class="stap"><h3><span>3</span> Wonen</h3>
${janee('huurt', 'Huur je een zelfstandige woning?', 'ja', 'Met eigen voordeur, keuken en toilet.')}
<div data-toon-bij="huurt">
${bedrag('kaleHuur', 'Kale huur per maand', { hint: 'Zonder servicekosten en energie.', placeholder: '700' })}
${getal('medebewoners', 'Aantal andere volwassenen in huis (geen partner)', { hint: 'Bijvoorbeeld een volwassen kind of huisgenoot.', min: 0, max: 10, waarde: 0 })}
${bedrag('inkomenMedebewoners', 'Inkomen van die medebewoners per jaar', { placeholder: '0' })}
</div>
</div>
<div class="stap"><h3><span>4</span> Kinderen</h3>
${kinderen()}
<div data-toon-bij-kinderen>
${janee('gebruiktOpvang', 'Gebruik je betaalde kinderopvang?', 'nee')}
<div data-toon-bij="gebruiktOpvang">${opvang()}</div>
</div>
</div>`,
      'Bereken al mijn toeslagen',
    ),

  toetsingsinkomen: () =>
    formulier(
      'toetsingsinkomen',
      [
        bedrag('brutoMaand', 'Bruto maandloon', { hint: 'Staat op je loonstrook. Zonder vakantiegeld.', placeholder: '2.500' }),
        vinkje('dertiendeMaand', 'Ik krijg een 13e maand of eindejaarsuitkering'),
        bedrag('overig', 'Overig inkomen per jaar (optioneel)', { hint: 'Bijvoorbeeld een uitkering, pensioen of winst uit onderneming.', placeholder: '0' }),
        bedrag('aftrek', 'Aftrekposten per jaar (optioneel)', { hint: 'Bijvoorbeeld hypotheekrente of giften.', placeholder: '0' }),
      ].join('\n'),
      'Bereken toetsingsinkomen',
    ),
};
