// HTML voor de rekenhulpen. De berekening zelf gebeurt in de browser
// (public/js/app.js) met dezelfde rekenmotor als de tests. Teksten per taal
// staan in src/i18n (forms); elke rekenhulp krijgt de taal mee: forms.x('en').
import { teksten } from '../i18n/i18n.js';

// Teksten voor de rekenhulp die nu wordt opgebouwd
let F = teksten('nl').forms;

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
    <input type="radio" id="${a}" name="${name}" value="ja"${standaard === 'ja' ? ' checked' : ''}><label for="${a}">${F.ja}</label>
    <input type="radio" id="${b}" name="${name}" value="nee"${standaard === 'nee' ? ' checked' : ''}><label for="${b}">${F.nee}</label>
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

function vinkje(name, label, hint = '', aan = false) {
  const i = id(name);
  return `<div class="veld vinkje">
  <input type="checkbox" id="${i}" name="${name}" value="ja"${aan ? ' checked' : ''}><label for="${i}">${label}</label>${hint ? `\n  <p class="hint">${hint}</p>` : ''}
</div>`;
}

function kinderen(label = F.kinderen) {
  const i = id('aantal');
  return `<div class="veld" data-kids>
  <label for="${i}">${label}</label>
  <input id="${i}" name="aantalKinderen" type="number" inputmode="numeric" min="0" max="12" value="0" class="kort">
  <div class="kids" data-kids-lijst></div>
</div>`;
}

function opvang() {
  return `<div class="veld" data-opvang>
  <p class="label">${F.opvangKop}</p>
  <p class="hint">${F.opvangHint}</p>
  <div data-opvang-lijst></div>
  <button type="button" class="knop-licht" data-opvang-erbij>${F.opvangErbij}</button>
</div>`;
}

function formulier(calc, inhoud, knop = F.bereken) {
  return `<form class="rekenhulp" data-calc="${calc}" novalidate>
${inhoud}
<button type="submit" class="knop">${knop}</button>
<p class="privacy-noot">${F.privacy}</p>
</form>
<div class="uitkomst" data-result aria-live="polite"></div>`;
}

// Zet de taal voordat een formulier wordt opgebouwd
const inTaal = (maak) => (taal = 'nl') => {
  F = teksten(taal).forms;
  return maak();
};

export const forms = {
  zorgtoeslag: inTaal(() =>
    formulier(
      'zorgtoeslag',
      [
        janee('partner', F.partner, 'nee', F.partnerHintZorg),
        bedrag('inkomen', F.toetsingsinkomen, { hint: F.inkomenHint, placeholder: F.phInkomen, required: true }),
        bedrag('vermogen', F.vermogen, { hint: F.vermogenHint, placeholder: '0' }),
      ].join('\n'),
      F.knopZorg,
    ),
  ),

  huurtoeslag: inTaal(() =>
    formulier(
      'huurtoeslag',
      [
        bedrag('kaleHuur', F.kaleHuur, { hint: F.kaleHuurHint, placeholder: F.phHuur, required: true }),
        getal('personen', F.personen, { hint: F.personenHint, min: 1, max: 12, waarde: 1 }),
        getal('volwassenen', F.volwassenen, { min: 1, max: 12, waarde: 1 }),
        bedrag('inkomen', F.inkomenHuishouden, { hint: F.inkomenHuishoudenHint, placeholder: F.phInkomen, required: true }),
        getal('leeftijd', F.leeftijd, { min: 16, max: 120, waarde: '' }),
        vinkje('aow', F.aowHuis),
        vinkje('aangepasteWoning', F.aangepast),
        bedrag('vermogen', F.vermogenHuishouden, { hint: F.vermogenHint, placeholder: '0' }),
      ].join('\n'),
      F.knopHuur,
    ),
  ),

  kindgebondenBudget: inTaal(() =>
    formulier(
      'kindgebondenBudget',
      [
        janee('partner', F.partner, 'ja'),
        kinderen(),
        bedrag('inkomen', F.toetsingsinkomen, { hint: F.inkomenHint, placeholder: F.phInkomenKgb, required: true }),
        bedrag('vermogen', F.vermogen, { hint: F.vermogenHint, placeholder: '0' }),
      ].join('\n'),
      F.knopKgb,
    ),
  ),

  kinderopvangtoeslag: inTaal(() =>
    formulier(
      'kinderopvangtoeslag',
      [bedrag('inkomen', F.inkomenSamen, { hint: F.inkomenHint, placeholder: F.phInkomenKot, required: true }), opvang()].join('\n'),
      F.knopKot,
    ),
  ),

  kinderbijslag: inTaal(() => formulier('kinderbijslag', kinderen(), F.knopKb)),

  alles: inTaal(() =>
    formulier(
      'alles',
      `<div class="stap"><h3><span>1</span> ${F.stap1}</h3>
${janee('partner', F.partner, 'nee', F.partnerHintAlles)}
${getal('leeftijd', F.leeftijd, { min: 16, max: 120, waarde: '' })}
${vinkje('aow', F.aowAlles)}
</div>
<div class="stap"><h3><span>2</span> ${F.stap2}</h3>
${bedrag('inkomen', F.inkomenAlles, { hint: F.inkomenHint, placeholder: F.phInkomen, required: true })}
${bedrag('vermogen', F.vermogen, { hint: F.vermogenHint, placeholder: '0' })}
${vinkje('uitkering', F.uitkering)}
${vinkje('langdurigLaag', F.langdurigLaag)}
</div>
<div class="stap"><h3><span>3</span> ${F.stap3}</h3>
${janee('huurt', F.huurt, 'ja', F.huurtHint)}
<div data-toon-bij="huurt">
${bedrag('kaleHuur', F.kaleHuur, { hint: F.kaleHuurKortHint, placeholder: F.phHuur })}
${getal('medebewoners', F.medebewoners, { hint: F.medebewonersHint, min: 0, max: 10, waarde: 0 })}
${bedrag('inkomenMedebewoners', F.inkomenMedebewoners, { placeholder: '0' })}
</div>
</div>
<div class="stap"><h3><span>4</span> ${F.stap4}</h3>
${kinderen()}
<div data-toon-bij-kinderen>
${janee('gebruiktOpvang', F.gebruiktOpvang, 'nee')}
<div data-toon-bij="gebruiktOpvang">${opvang()}</div>
</div>
</div>`,
      F.knopAlles,
    ),
  ),

  // De toeslagbewaker is (nog) alleen Nederlands
  zzp: inTaal(() => {
    const m = id('maand');
    const huidig = new Date().getMonth(); // maanden die helemaal voorbij zijn
    const opties = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
      .map((n, k) => `<option value="${k + 1}"${k + 1 === Math.max(1, huidig) ? ' selected' : ''}>t/m ${n}</option>`)
      .join('');
    return formulier(
      'zzp',
      `<div class="stap"><h3><span>1</span> Je winst tot nu toe</h3>
${bedrag('winstTotNu', 'Winst dit jaar tot nu toe', { hint: 'Omzet min kosten, zoals in je boekhouding (Moneybird, e-Boekhouden, Jortt…).', placeholder: '18.000', required: true })}
<div class="veld"><label for="${m}">Over welke periode?</label><select id="${m}" name="maand" class="kort" style="max-width:220px">${opties}</select></div>
${bedrag('verwachteJaarwinst', 'Of: verwachte winst over het hele jaar (optioneel)', { hint: 'Weet je dat je nog grote opdrachten krijgt of juist een rustige periode hebt? Vul dan je eigen schatting in.', placeholder: '' })}
${vinkje('urencriterium', 'Ik werk minimaal 1.225 uur per jaar aan mijn bedrijf (urencriterium)', '', true)}
${bedrag('ander', 'Ander inkomen dit jaar (optioneel)', { hint: 'Bijvoorbeeld loon uit een baan naast je bedrijf.', placeholder: '0' })}
</div>
<div class="stap"><h3><span>2</span> Wat heb je opgegeven bij Toeslagen?</h3>
${bedrag('opgegevenInkomen', 'Inkomen dat nu in Mijn toeslagen staat', { hint: 'Staat in Mijn toeslagen of op je laatste beschikking. Met partner: jullie samen.', placeholder: '25.000', required: true })}
</div>
<div class="stap"><h3><span>3</span> Je situatie</h3>
${janee('partner', 'Heb je een toeslagpartner?', 'nee')}
<div data-toon-bij="partner">${bedrag('partnerInkomen', 'Verwacht inkomen partner dit jaar', { placeholder: '0' })}</div>
${janee('huurt', 'Huur je een zelfstandige woning?', 'ja')}
<div data-toon-bij="huurt">${bedrag('kaleHuur', 'Kale huur per maand', { placeholder: '750' })}</div>
${kinderen()}
${bedrag('vermogen', 'Vermogen (optioneel)', { hint: F.vermogenHint, placeholder: '0' })}
</div>`,
      'Check mijn toeslagen',
    );
  }),

  toetsingsinkomen: inTaal(() =>
    formulier(
      'toetsingsinkomen',
      [
        bedrag('brutoMaand', F.brutoMaand, { hint: F.brutoMaandHint, placeholder: F.phBruto }),
        vinkje('dertiendeMaand', F.dertiende),
        bedrag('overig', F.overig, { hint: F.overigHint, placeholder: '0' }),
        bedrag('aftrek', F.aftrek, { hint: F.aftrekHint, placeholder: '0' }),
      ].join('\n'),
      F.knopToets,
    ),
  ),
};
