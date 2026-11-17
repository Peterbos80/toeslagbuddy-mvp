// De schermen van de regelkamer. Elk scherm is een functie (ctx) → HTML.
// ctx: { dossier, data, leden, termijnen, regels, bronnen, inst, sub, basis }
// Alle invoer van gebruikers gaat via h`` en wordt daar ge-escaped.
import { h, rauw, icoon, euro, centen, datumTekst, overTekst, vandaagIso, maandNaam, bronLabel } from './familie-ui.js';
import { ROLLEN, SOORT_CONTRACT, SOORT_DOCUMENT, avatarKleur, initialen, leeftijdIn } from './dossier.js';
import { maandoverzicht, reeks, CATEGORIEEN } from './logboek.js';
import { binnenkort } from './termijnmotor.js';
import { FASES, voortgang } from './checklist.js';
import { meldlijst, ACTIES } from './opzeggen.js';
import { VRAGEN } from './intake.js';

const illu = (naam) => rauw(document.getElementById(`fa-illu-${naam}`)?.innerHTML || '');
export const avatar = (lid, klasse = '') => (lid ? h`<span class="f-avatar ${klasse}" style="--a:${avatarKleur(lid.naam)}" title="${lid.naam}">${initialen(lid.naam)}</span>` : '');
const lidVan = (ctx, id) => ctx.leden.find((l) => l.id === id) || null;
const voornaam = (lid) => (lid ? lid.naam.split(' ')[0] : '');
const leeg = (naam, tekst, knop = '') => h`<div class="fa-leeg">${illu(naam)}<p>${tekst}</p>${knop}</div>`;
const pil = (t) => (t.dagen === null ? h`<span class="f-pil">controleer</span>` : t.dagen < 0 ? h`<span class="f-pil">${overTekst(t.dagen)}</span>` : t.dagen <= 14 ? h`<span class="f-pil nu">${overTekst(t.dagen)}</span>` : t.dagen <= 60 ? h`<span class="f-pil let">${overTekst(t.dagen)}</span>` : h`<span class="f-pil">${overTekst(t.dagen)}</span>`);
const ICOON_SOORT = { contract: 'contract', document: 'document', post: 'brief', wetswijziging: 'bliksem', overlijden: 'kaars', taak: 'taak' };
const dagenTot = (iso) => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${vandaagIso()}T12:00:00Z`)) / 864e5);

// ── Start: nog geen dossier, of de lijst met dossiers ──
export function start(ctx) {
  if (!ctx.state.dossiers.length) {
    return h`<div class="fa-intake" style="max-width:760px"><div class="f-form" style="text-align:center">
<div style="max-width:340px;margin:0 auto 8px">${illu('tafel')}</div>
<h1>Welkom in de regelkamer</h1>
<p class="intro" style="margin:0 auto 24px">Hier houd je samen met de familie de zaken van je vader of moeder bij. Je begint met 12 korte vragen. Alles blijft op dit apparaat.</p>
<div class="f-knoppen" style="justify-content:center"><a class="knop groot" href="#/nieuw">Begin met de 12 vragen</a><button type="button" class="knop-licht" data-actie="demo">Bekijk eerst een voorbeeld</button></div>
<p class="f-klein" style="margin-top:20px"><button type="button" class="knop-stil" data-actie="importeer">Ik heb een dossierbestand gekregen</button></p>
</div></div>`;
  }
  return h`<div class="fa-kop"><div><h1>Jouw dossiers</h1><p>Eén dossier per ouder of ouderpaar.</p></div><a class="knop" href="#/nieuw">${icoon('plus')} Nieuw dossier</a></div>
<div class="f-raster">${ctx.state.dossiers.map((d) => {
    const data = ctx.state.data[d.id] || {};
    return h`<a class="f-kaart" href="#/d/${d.id}/overzicht"><div class="fa-dossier" style="padding:0 0 12px"><span class="f-avatar groot" style="--a:${avatarKleur(d.naam)}">${initialen(d.naam)}</span><div><strong>${d.naam}</strong><small>${d.demo ? 'Voorbeeld met verzonnen gegevens' : d.status === 'overlijden' ? 'In afwikkeling' : `${(data.leden || []).length} leden`}</small></div></div><p>${(data.taken || []).filter((t) => !t.klaar).length} open taken · ${(data.contracten || []).length} contracten</p><span class="f-meer">Open ${icoon('pijl', 'klein')}</span></a>`;
  })}</div>
<p class="f-klein" style="margin-top:20px"><button type="button" class="knop-stil" data-actie="importeer">Dossierbestand importeren</button></p>`;
}

// ── Intake: één vraag per scherm ──
export function intake(ctx) {
  const i = ctx.intake.stap;
  const totaal = VRAGEN.length + 1;
  const balk = h`<div class="fa-voortgang" role="img" aria-label="Vraag ${i + 1} van ${totaal}">${Array.from({ length: totaal }, (_, n) => rauw(`<i class="${n < i ? 'klaar' : n === i ? 'nu' : ''}"></i>`))}</div>`;
  if (i >= VRAGEN.length) {
    return h`<div class="fa-intake"><form class="f-form" data-form="intake-toestemming">${balk}<h1>Weet ${ctx.intake.antwoorden.naam || 'je ouder'} dat je dit bijhoudt?</h1>
<p class="hint">Het dossier gaat over iemand anders dan jijzelf. Daarom leggen we vast wie toestemming gaf. Gegevens over zorg bewaren we alleen met toestemming.</p>
<fieldset class="f-veld"><legend class="skip">Toestemming</legend><div class="f-keuze kaarten">
${[['ouder-app', 'Ja, en vindt het goed'], ['schriftelijk', 'Ja, dat staat op papier'], ['volmacht', 'Er is een volmacht, bewind of mentorschap'], ['geen', 'Nog niet besproken']].map(([w, t], n) => h`<input type="radio" name="toestemming" id="t-${w}" value="${w}" ${n === 0 ? rauw('checked') : ''}><label for="t-${w}">${t}</label>`)}
</div></fieldset>
<div class="f-veld"><label for="i-ik">Hoe heet jij?</label><p class="hint">Je naam staat bij wat jij doet, zodat de familie weet wie wat regelt.</p><input id="i-ik" name="ik" type="text" autocomplete="name" required maxlength="60"></div>
<div class="f-knoppen"><button type="button" class="knop-licht" data-actie="intake-terug">Terug</button><button class="knop" type="submit">Maak het dossier</button></div></form></div>`;
  }
  const v = VRAGEN[i];
  const a = ctx.intake.antwoorden[v.id];
  let veld;
  if (v.soort === 'keuze') veld = h`<div class="f-keuze kaarten">${v.opties.map(([w, t]) => h`<input type="radio" name="antwoord" id="i-${w}" value="${w}" ${a === w ? rauw('checked') : ''}><label for="i-${w}">${t}</label>`)}</div>`;
  else if (v.soort === 'meer') veld = h`<div class="f-keuze kaarten">${v.opties.map(([w, t]) => h`<input type="checkbox" name="antwoord" id="i-${w}" value="${w}" ${(a || []).includes(w) ? rauw('checked') : ''}><label for="i-${w}">${t}</label>`)}</div>`;
  else if (v.soort === 'jaar') veld = h`<input id="i-antwoord" name="antwoord" type="text" inputmode="numeric" pattern="(19|20)[0-9]{2}" maxlength="4" value="${a || ''}" placeholder="Bijvoorbeeld 1942" style="max-width:220px" aria-labelledby="i-vraag">`;
  else veld = h`<input id="i-antwoord" name="antwoord" type="text" value="${a || ''}" placeholder="${v.plaats || ''}" maxlength="80" aria-labelledby="i-vraag">`;
  return h`<div class="fa-intake"><form class="f-form" data-form="intake">${balk}
<fieldset class="f-veld" style="margin:0"><legend><h1 id="i-vraag">${v.vraag}</h1></legend>${v.hint ? h`<p class="hint">${v.hint}</p>` : ''}${veld}</fieldset>
<div class="f-knoppen">${i ? h`<button type="button" class="knop-licht" data-actie="intake-terug">Terug</button>` : h`<a class="knop-licht" href="#/">Annuleren</a>`}<span style="display:flex;gap:8px"><button type="button" class="knop-stil" data-actie="intake-sla-over">Sla over</button><button class="knop" type="submit">Volgende</button></span></div></form></div>`;
}

// ── Overzicht ──
export function overzicht(ctx) {
  const { dossier, data } = ctx;
  const week = binnenkort(ctx.termijnen, { dagen: 30, terug: 7 }).slice(0, 5);
  const taken = data.taken.filter((t) => !t.klaar).sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9')).slice(0, 4);
  const vast = data.contracten.reduce((s, c) => s + (c.perMaandCent || 0), 0);
  const maand = vandaagIso().slice(0, 7);
  const log = maandoverzicht(data.logboek, maand);
  const nieuweBrieven = data.brieven.filter((b) => !b.bevestigd).length;
  const wijziging = ctx.termijnen.filter((t) => t.soort === 'wetswijziging');
  const leeftijd = leeftijdIn(dossier.geboortejaar);
  return h`${dossier.demo ? h`<div class="fa-banner demo">${icoon('info')}<p><strong>Dit is een voorbeeld.</strong> De familie De Vries en alle bedragen zijn verzonnen. <button type="button" class="knop-stil" data-actie="demo-wis" style="padding:0;min-height:0">Voorbeeld wissen en zelf beginnen</button></p></div>` : ''}
<div class="fa-kop"><div><h1>${dossier.naam}${leeftijd ? h` <span style="color:var(--zacht);font-weight:400">(${leeftijd})</span>` : ''}</h1><p>${dossier.status === 'overlijden' ? 'In afwikkeling' : `Overzicht van ${datumTekst(vandaagIso())}`}</p></div><a href="#/d/${dossier.id}/familie" class="f-avatars" aria-label="Familie: ${ctx.leden.length} leden">${ctx.leden.slice(0, 4).map((l) => avatar(l))}${ctx.leden.length > 4 ? h`<span class="f-avatar" style="--a:var(--zacht)">+${ctx.leden.length - 4}</span>` : ''}</a></div>
<div class="fa-tegels">
<a class="fa-tegel" href="#/d/${dossier.id}/taken"><span>${icoon('taak', 'klein')} Open taken</span><strong>${data.taken.filter((t) => !t.klaar).length}</strong></a>
<a class="fa-tegel" href="#/d/${dossier.id}/post"><span>${icoon('brief', 'klein')} Post te bekijken</span><strong>${nieuweBrieven}</strong></a>
<a class="fa-tegel" href="#/d/${dossier.id}/dossier"><span>${icoon('contract', 'klein')} Vaste lasten</span><strong>${vast ? euro(vast / 100, 0) : '–'}</strong></a>
<a class="fa-tegel" href="#/d/${dossier.id}/logboek"><span>${icoon('logboek', 'klein')} Uitgegeven deze maand</span><strong>${log.uitCent ? euro(log.uitCent / 100, 0) : '–'}</strong></a>
</div>
<div class="fa-kolommen">
<section class="fa-kaart"><h2>Komt eraan <a href="#/d/${dossier.id}/kalender">Hele kalender</a></h2>
${week.length ? h`<div>${week.map((t) => h`<a class="f-regel" href="#/d/${dossier.id}/kalender" style="text-decoration:none;color:inherit"><span class="f-stip ${t.dagen <= 14 ? 'rood' : ''}">${icoon(ICOON_SOORT[t.soort] || 'kalender')}</span><span><b>${t.titel}</b><span class="f-sub">${datumTekst(t.datum)}</span></span>${pil(t)}</a>`)}</div>` : leeg('kalender', 'De komende 30 dagen staat er niets. Voeg contracten en documenten toe, dan waarschuwen we op tijd.', h`<a class="knop-licht" href="#/d/${dossier.id}/dossier">Naar het dossier</a>`)}
</section>
<section class="fa-kaart"><h2>Te doen <a href="#/d/${dossier.id}/taken">Alle taken</a></h2>
${taken.length ? h`<ul class="fa-lijst">${taken.map((t) => taakRij(ctx, t))}</ul>` : leeg('leeg', 'Geen open taken. Mooi zo.', h`<button type="button" class="knop-licht" data-actie="taak-nieuw">Taak toevoegen</button>`)}
</section>
</div>
${wijziging.length ? h`<section class="fa-kaart"><h2>Verandert binnenkort</h2>${wijziging.map((t) => h`<div class="f-regel"><span class="f-stip blauw">${icoon('bliksem')}</span><span><b>${t.titel}${t.datum ? ` op ${datumTekst(t.datum)}` : ''}</b><span class="f-sub">${t.waarom}</span></span>${t.actie ? h`<a class="fa-mini" href="${t.actie.url}">${t.actie.tekst}</a>` : ''}</div>`)}</section>` : ''}
<section class="fa-kaart"><h2>Logboek ${maandNaam(Number(maand.slice(5)) - 1)} <a href="#/d/${dossier.id}/logboek">Open het logboek</a></h2>
${log.aantal ? h`<p style="margin:0">${log.aantal} regels · ${centen(log.uitCent)} uitgegeven · ${centen(log.inCent)} ontvangen${log.zonderBon ? h` · <span class="f-pil let">${log.zonderBon} zonder bon</span>` : ''}</p>` : h`<p style="margin:0;color:var(--zacht)">Nog niets vastgelegd deze maand. <button type="button" class="knop-stil" data-actie="uitgave-nieuw" style="padding:0;min-height:0">Leg een uitgave vast</button></p>`}
</section>`;
}

function taakRij(ctx, t) {
  const lid = lidVan(ctx, t.wie);
  return h`<li class="fa-item ${t.klaar ? 'gedaan' : ''}"><button type="button" class="fa-vink" aria-pressed="${t.klaar ? 'true' : 'false'}" aria-label="${t.klaar ? 'Zet terug op open' : 'Markeer als gedaan'}: ${t.titel}" data-actie="taak-vink" data-id="${t.id}">${icoon('vink')}</button>
<span><b>${t.titel}</b><span class="f-sub">${lid ? `${voornaam(lid)} doet dit` : 'Nog niemand'}${t.deadline ? ` · vóór ${datumTekst(t.deadline, { jaar: false })}` : ''}</span>${t.toelichting ? h`<span class="f-sub">${t.toelichting}</span>` : ''}${t.link ? h`<a class="f-sub" href="${t.link}">Open de rekenhulp</a>` : ''}</span>
<span class="fa-acties">${lid ? avatar(lid, 'klein') : t.klaar ? '' : h`<button type="button" class="fa-mini vol" data-actie="taak-pak" data-id="${t.id}">Ik doe dit</button>`}<button type="button" class="fa-mini" data-actie="taak-bewerk" data-id="${t.id}" aria-label="Bewerk ${t.titel}">${icoon('potlood', 'klein')}</button></span></li>`;
}

// ── Kalender ──
export function kalender(ctx) {
  const { dossier } = ctx;
  const taken = ctx.data.taken.filter((t) => !t.klaar && t.deadline).map((t) => ({ id: `taak-${t.id}`, soort: 'taak', datum: t.deadline, titel: t.titel, waarom: t.toelichting || 'Taak met een einddatum.', bron: null, dagen: dagenTot(t.deadline), wie: t.wie }));
  const alle = [...ctx.termijnen.filter((t) => t.datum), ...taken].filter((t) => t.dagen >= -30).sort((a, b) => a.datum.localeCompare(b.datum));
  const zonder = ctx.termijnen.filter((t) => !t.datum);
  if (!alle.length && !zonder.length) return h`<div class="fa-kop"><div><h1>Kalender</h1><p>Alles met een datum, op één tijdlijn.</p></div></div>${leeg('kalender', 'Nog geen termijnen. Voeg een contract met einddatum toe, een document dat verloopt, of een brief.', h`<a class="knop" href="#/d/${dossier.id}/dossier">Naar het dossier</a>`)}`;
  let maand = '';
  let vandaagGezet = false;
  const rijen = [];
  for (const t of alle) {
    if (!vandaagGezet && t.dagen >= 0) {
      rijen.push(h`<li class="fa-vandaag">Vandaag, ${datumTekst(vandaagIso(), { jaar: false })}</li>`);
      vandaagGezet = true;
    }
    const m = t.datum.slice(0, 7);
    if (m !== maand) {
      maand = m;
      rijen.push(h`<li class="fa-maand">${maandNaam(Number(m.slice(5)) - 1)} ${m.slice(0, 4)}</li>`);
    }
    const lid = lidVan(ctx, t.wie);
    rijen.push(h`<li class="fa-termijn ${t.dagen < 0 ? 'voorbij' : t.dagen <= 14 ? 'dichtbij' : ''}"><header><b>${t.titel}</b><time datetime="${t.datum}">${datumTekst(t.datum)}</time></header><p>${t.waarom}</p><div class="fa-voet">${pil(t)}${t.bron ? bronLabel(t.bron, `Bron: ${t.bron.naam}`) : ''}${t.actie ? h`<a class="fa-mini" href="${t.actie.url}">${t.actie.tekst}</a>` : ''}${lid ? h`<span class="f-pil">${avatar(lid, 'klein')} ${voornaam(lid)}</span>` : t.soort !== 'taak' ? h`<button type="button" class="fa-mini" data-actie="termijn-taak" data-id="${t.id}">${icoon('plus', 'klein')} Maak taak</button>` : ''}</div></li>`);
  }
  if (!vandaagGezet) rijen.push(h`<li class="fa-vandaag">Vandaag, ${datumTekst(vandaagIso(), { jaar: false })}</li>`);
  return h`<div class="fa-kop"><div><h1>Kalender</h1><p>Alles met een datum, op één tijdlijn. Bij elke termijn staat waar die vandaan komt.</p></div><button type="button" class="knop-licht" data-actie="taak-nieuw">${icoon('plus')} Taak met datum</button></div>
<ol class="fa-tijdlijn">${rijen}</ol>
${zonder.length ? h`<section class="fa-kaart" style="margin-top:24px"><h2>Zelf controleren</h2><p class="f-klein">Deze regels konden we niet bevestigen. Daarom noemen we geen datum.</p>${zonder.map((t) => h`<div class="f-regel"><span class="f-stip">${icoon('uitroep')}</span><span><b>${t.titel}</b><span class="f-sub">${t.waarom}</span></span>${bronLabel(t.bron, 'Controleer')}</div>`)}</section>` : ''}`;
}

// ── Taken ──
export function taken(ctx) {
  const open = ctx.data.taken.filter((t) => !t.klaar).sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9'));
  const klaar = ctx.data.taken.filter((t) => t.klaar).sort((a, b) => (b.klaarOp || '').localeCompare(a.klaarOp || '')).slice(0, 20);
  return h`<div class="fa-kop"><div><h1>Taken</h1><p>Wie doet wat. Pak een taak op met één tik.</p></div><button type="button" class="knop" data-actie="taak-nieuw">${icoon('plus')} Taak toevoegen</button></div>
<section class="fa-kaart"><h2>Te doen (${open.length})</h2>${open.length ? h`<ul class="fa-lijst">${open.map((t) => taakRij(ctx, t))}</ul>` : leeg('leeg', 'Geen open taken.', '')}</section>
${klaar.length ? h`<section class="fa-kaart"><h2>Gedaan</h2><ul class="fa-lijst">${klaar.map((t) => taakRij(ctx, t))}</ul></section>` : ''}
<section class="fa-kaart"><h2>Afspraken in de familie <button type="button" class="fa-mini" data-actie="afspraak-nieuw">${icoon('plus', 'klein')} Afspraak</button></h2>
${ctx.data.afspraken.length ? h`<ul class="fa-lijst">${ctx.data.afspraken.map((a) => h`<li class="fa-item" style="grid-template-columns:1fr auto"><span><b style="font-weight:500">${a.tekst}</b><span class="f-sub">Vastgelegd door ${voornaam(lidVan(ctx, a.door)) || 'onbekend'} op ${datumTekst(a.datum)}</span></span><button type="button" class="fa-mini" data-actie="afspraak-wis" data-id="${a.id}" aria-label="Verwijder afspraak">${icoon('prullenbak', 'klein')}</button></li>`)}</ul>` : h`<p style="margin:0;color:var(--zacht)">Leg vast wat jullie afspreken, bijvoorbeeld wie wat betaalt of wie wanneer belt.</p>`}</section>`;
}

// ── Post ──
export function post(ctx) {
  const { dossier, data } = ctx;
  if (ctx.sub) {
    const b = data.brieven.find((x) => x.id === ctx.sub);
    if (b) return brief(ctx, b);
  }
  const lijst = [...data.brieven].sort((a, b) => (b.ontvangen || '').localeCompare(a.ontvangen || ''));
  return h`<div class="fa-kop"><div><h1>Post</h1><p>Plak een brief en zie meteen wat je moet doen, en vóór wanneer.</p></div><button type="button" class="knop" data-actie="brief-nieuw">${icoon('plus')} Brief toevoegen</button></div>
${lijst.length ? h`<section class="fa-kaart"><ul class="fa-lijst">${lijst.map((b) => h`<li class="fa-item"><span class="f-stip ${b.bevestigd ? 'groen' : 'rood'}" style="width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--${b.bevestigd ? 'goed' : 'accent'}-licht);color:var(--${b.bevestigd ? 'goed' : 'accent-tekst'})">${icoon('brief')}</span><a href="#/d/${dossier.id}/post/${b.id}" style="text-decoration:none;color:inherit"><b>${b.titel}</b><span class="f-sub">${b.ontvangen ? `Ontvangen ${datumTekst(b.ontvangen)}` : ''}${b.uitleg?.termijn ? ` · termijn ${datumTekst(b.uitleg.termijn.datum)}` : ''}</span></a><span class="fa-acties">${b.afgehandeld ? h`<span class="f-pil goed">afgehandeld</span>` : b.bevestigd ? h`<span class="f-pil">in de kalender</span>` : h`<span class="f-pil nu">nog bekijken</span>`}</span></li>`)}</ul></section>` : leeg('brief', 'Nog geen post. Plak de tekst van een brief die je niet snapt. Op een telefoon kun je tekst uit een foto kopiëren.', h`<button type="button" class="knop" data-actie="brief-nieuw">Brief toevoegen</button>`)}`;
}

// Markeert de citaten van bedrag en termijn in de tekst van de brief
function gemarkeerd(tekst, uitleg) {
  const markeer = [];
  const zoek = (citaat, klasse) => {
    if (!citaat) return;
    const i = tekst.indexOf(citaat);
    if (i >= 0) markeer.push([i, i + citaat.length, klasse]);
  };
  zoek(uitleg?.termijn?.citaat, 'termijn');
  if (uitleg?.bedrag?.citaat && uitleg.bedrag.citaat !== uitleg?.termijn?.citaat) zoek(uitleg.bedrag.citaat, 'bedrag');
  markeer.sort((a, b) => a[0] - b[0]);
  const delen = [];
  let p = 0;
  for (const [van, tot, klasse] of markeer) {
    if (van < p) continue;
    delen.push(h`${tekst.slice(p, van)}<mark class="${klasse}">${tekst.slice(van, tot)}</mark>`);
    p = tot;
  }
  delen.push(h`${tekst.slice(p)}`);
  return delen;
}

function brief(ctx, b) {
  const u = b.uitleg || {};
  return h`<div class="fa-kop"><div><a href="#/d/${ctx.dossier.id}/post" class="f-klein">${icoon('pijl-terug', 'klein')} Alle post</a><h1>${b.titel}</h1></div><span class="fa-acties"><button type="button" class="knop-licht" data-actie="brief-wis" data-id="${b.id}">${icoon('prullenbak')} Verwijder</button></span></div>
<div class="fa-brief">
<div class="fa-brieftekst ${b.nieuw ? 'fa-scan' : ''}" tabindex="0" role="region" aria-label="Tekst van de brief">${gemarkeerd(b.tekst, u)}</div>
<div>
<section class="fa-kaart"><h2>Wat staat er <span class="f-pil ${u.bron === 'ai' ? 'blauw' : ''}">${u.bron === 'ai' ? 'uitleg met AI' : 'basisuitleg'}</span></h2>
<p style="margin-top:0">${u.samenvatting || 'We konden deze brief niet uitleggen.'}</p>
${u.soort?.urgent ? h`<p class="f-controleer"><strong>Let op:</strong> dit lijkt een herinnering of aanmaning. Wacht hier niet mee.</p>` : ''}
<h3 style="font-family:var(--font);font-size:1rem;margin:16px 0 6px">Wat moet je doen</h3><ul style="margin:0;padding-left:20px">${(u.acties || []).map((a) => h`<li>${a}</li>`)}</ul>
</section>
<section class="fa-kaart"><h2>Controleer dit zelf in de brief</h2>
${u.termijn ? h`<p style="margin:0"><strong>Termijn: ${datumTekst(u.termijn.datum)}</strong>${u.termijn.geschat ? ' (geschat: we vonden geen datum op de brief)' : ''}</p><p class="fa-citaat">“${u.termijn.citaat}”</p>` : h`<p style="margin:0;color:var(--zacht)">We vonden geen termijn in deze brief.</p>`}
${u.bedrag ? h`<p style="margin:14px 0 0"><strong>Bedrag: ${euro(u.bedrag.waarde)}</strong>${u.bedrag.richting === 'betalen' ? ' om te betalen' : u.bedrag.richting === 'ontvangen' ? ' om te ontvangen' : ''}</p><p class="fa-citaat">“${u.bedrag.citaat}”</p>` : ''}
${(u.weggelaten || []).length ? h`<p class="f-klein">Weggelaten omdat het niet letterlijk in de brief stond: ${u.weggelaten.join(', ')}.</p>` : ''}
<div class="f-knoppen" style="margin-top:18px">${b.bevestigd ? h`<span class="f-pil goed">${icoon('vink', 'klein')} Staat in de kalender</span>${b.afgehandeld ? '' : h`<button type="button" class="knop-licht" data-actie="brief-klaar" data-id="${b.id}">Markeer als afgehandeld</button>`}` : h`<button type="button" class="knop" data-actie="brief-klopt" data-id="${b.id}">${u.termijn ? 'Klopt, zet in de kalender' : 'Klopt, bewaar'}</button><button type="button" class="knop-licht" data-actie="brief-pasaan" data-id="${b.id}">Klopt niet, pas aan</button>`}</div>
</section>
${(u.doorverwijzen || []).length ? h`<section class="fa-kaart"><h2>Hulp erbij</h2>${u.doorverwijzen.map((d) => h`<p style="margin:0 0 10px"><a href="${d.url}" rel="noopener" target="_blank"><strong>${d.naam}</strong></a><br><span class="f-klein">${d.uitleg}</span></p>`)}</section>` : ''}
${ctx.inst.ai && u.bron !== 'ai' ? h`<section class="fa-kaart"><h2>Uitleg in gewone taal</h2><p class="f-klein" style="margin-top:0">Met AI krijg je een samenvatting in gewone taal. De tekst gaat dan naar onze server. BSN, rekeningnummers en geboortedatum lakken we eerst weg op dit apparaat.</p><button type="button" class="knop-licht" data-actie="brief-ai" data-id="${b.id}">Leg uit met AI</button></section>` : ''}
</div></div>`;
}

// ── Logboek ──
export function logboek(ctx) {
  const maand = ctx.sub && /^\d{4}-\d{2}$/.test(ctx.sub) ? ctx.sub : vandaagIso().slice(0, 7);
  const o = maandoverzicht(ctx.data.logboek, maand);
  const serie = reeks(ctx.data.logboek, maand, 6);
  const top = Math.max(1, ...serie.map((s) => Math.max(s.inCent, s.uitCent)));
  const [j, m] = maand.split('-').map(Number);
  const stap = (n) => {
    const d = new Date(Date.UTC(j, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const leegBoek = !ctx.data.logboek.length;
  return h`<div class="fa-kop"><div><h1>Logboek</h1><p>Wat er namens ${ctx.dossier.naam} is uitgegeven en ontvangen. Een regel kan niet worden veranderd, alleen verbeterd.</p></div><span class="fa-acties"><button type="button" class="knop-licht" data-actie="print">${icoon('download')} Print</button><button type="button" class="knop" data-actie="uitgave-nieuw">${icoon('plus')} Vastleggen</button></span></div>
${leegBoek ? leeg('map', 'Nog niets vastgelegd. Leg elke uitgave namens je ouder vast, met een foto van de bon. Dan staat er elke maand een overzicht klaar voor de familie.', h`<button type="button" class="knop" data-actie="uitgave-nieuw">Eerste uitgave vastleggen</button>`) : h`
<section class="fa-kaart"><h2><span><a href="#/d/${ctx.dossier.id}/logboek/${stap(-1)}" class="fa-mini" aria-label="Vorige maand">${icoon('pijl-terug', 'klein')}</a> ${maandNaam(m - 1)} ${j} <a href="#/d/${ctx.dossier.id}/logboek/${stap(1)}" class="fa-mini" aria-label="Volgende maand">${icoon('pijl', 'klein')}</a></span><span class="f-pil ${ctx.ketenOk === false ? 'nu' : 'goed'}">${ctx.ketenOk === false ? 'Let op: het logboek is achteraf gewijzigd' : h`${icoon('schild', 'klein')} Ongewijzigd`}</span></h2>
<div class="fa-tegels" style="margin-bottom:8px"><div class="fa-tegel"><span>Uitgegeven</span><strong>${centen(o.uitCent)}</strong></div><div class="fa-tegel"><span>Ontvangen</span><strong>${centen(o.inCent)}</strong></div><div class="fa-tegel"><span>Zonder bon</span><strong>${o.zonderBon}</strong></div><div class="fa-tegel"><span>Contant opgenomen</span><strong>${centen(o.contantCent)}</strong></div></div>
<div class="fa-staven" role="img" aria-label="Ontvangen en uitgegeven per maand, laatste 6 maanden. De cijfers staan in de tabel hieronder.">${serie.map((s) => rauw(`<div class="fa-staaf"><i class="in" style="--h:${Math.round((s.inCent / top) * 100)}%"></i><i style="--h:${Math.round((s.uitCent / top) * 100)}%"></i></div>`))}</div>
<div class="fa-staven-as">${serie.map((s) => h`<span>${maandNaam(Number(s.maand.slice(5)) - 1).slice(0, 3)}</span>`)}</div>
<div class="fa-legenda"><span><i class="in"></i>Ontvangen</span><span><i></i>Uitgegeven</span></div>
<details class="f-rekenstappen"><summary>Cijfers als tabel</summary><table><tbody>${serie.map((s) => h`<tr><td>${maandNaam(Number(s.maand.slice(5)) - 1)} ${s.maand.slice(0, 4)}</td><td>in ${centen(s.inCent)} · uit ${centen(s.uitCent)}</td></tr>`)}</tbody></table></details>
</section>
<section class="fa-kaart"><h2>Regels in ${maandNaam(m - 1)} (${o.aantal})</h2>
${o.regels.length ? h`<ul class="fa-lijst">${[...o.regels].sort((a, b) => b.datum.localeCompare(a.datum)).map((r) => {
    const lid = lidVan(ctx, r.door);
    return h`<li class="fa-item">${avatar(lid || { naam: '?' }, 'klein')}<span><b>${r.omschrijving}</b><span class="f-sub">${datumTekst(r.datum, { jaar: false })} · ${CATEGORIEEN[r.categorie] || r.categorie}${lid ? ` · ${voornaam(lid)}` : ''}${r.corrigeertId ? ' · verbetering' : ''}${r.richting === 'uit' && !r.bonId && r.categorie !== 'vasteLasten' ? h` · <span class="f-pil let">geen bon</span>` : ''}</span></span><span class="fa-acties"><span class="fa-bedrag ${r.richting === 'in' ? 'in' : ''}">${r.richting === 'in' ? '+ ' : '− '}${centen(r.bedragCent)}</span>${r.bonId && r.bonId !== 'demo-bon' ? h`<button type="button" class="fa-mini" data-actie="bon-toon" data-id="${r.bonId}" aria-label="Bekijk de bon">${icoon('oog', 'klein')}</button>` : ''}<button type="button" class="fa-mini" data-actie="uitgave-verbeter" data-id="${r.id}" aria-label="Verbeter deze regel">${icoon('potlood', 'klein')}</button></span></li>`;
  })}</ul>` : h`<p style="margin:0;color:var(--zacht)">Geen regels in deze maand.</p>`}
</section>
${Object.keys(o.perPersoon).length > 1 ? h`<section class="fa-kaart"><h2>Wie gaf wat uit</h2><ul class="fa-lijst">${Object.entries(o.perPersoon).sort((a, b) => b[1] - a[1]).map(([id, cent]) => h`<li class="fa-item">${avatar(lidVan(ctx, id) || { naam: '?' }, 'klein')}<span><b>${lidVan(ctx, id)?.naam || 'Onbekend'}</b></span><span class="fa-bedrag">${centen(cent)}</span></li>`)}</ul></section>` : ''}`}`;
}

// ── Dossier: contracten, contacten, documenten ──
export function dossierScherm(ctx) {
  const { data, dossier } = ctx;
  const vast = data.contracten.reduce((s, c) => s + (c.perMaandCent || 0), 0);
  return h`<div class="fa-kop"><div><h1>Dossier</h1><p>Vaste lasten, contactpersonen en waar de papieren liggen.</p></div><button type="button" class="knop-licht" data-actie="bankscan">${icoon('upload')} Lees een bankafschrift in</button></div>
<section class="fa-kaart"><h2>Contracten en vaste lasten ${vast ? h`<span>${centen(vast)} per maand</span>` : ''}</h2>
${data.contracten.length ? h`<ul class="fa-lijst">${[...data.contracten].sort((a, b) => (b.perMaandCent || 0) - (a.perMaandCent || 0)).map((c) => h`<li class="fa-item"><span class="f-stip" style="width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--vlak-2);color:var(--zacht)">${icoon('contract')}</span><span><b>${c.naam}</b><span class="f-sub">${SOORT_CONTRACT[c.soort] || 'Overig'}${c.einddatum ? ` · loopt tot ${datumTekst(c.einddatum)}` : ''}${c.wie ? ` · ${voornaam(lidVan(ctx, c.wie))} regelt dit` : ''}</span></span><span class="fa-acties"><span class="fa-bedrag">${c.perMaandCent ? `${centen(c.perMaandCent)} p/m` : ''}</span><button type="button" class="fa-mini" data-actie="contract-bewerk" data-id="${c.id}" aria-label="Bewerk ${c.naam}">${icoon('potlood', 'klein')}</button></span></li>`)}</ul>` : h`<p style="margin:0 0 12px;color:var(--zacht)">Nog geen contracten. Lees een bankafschrift in, dan vinden we ze voor je.</p>`}
<p style="margin:14px 0 0"><button type="button" class="fa-mini" data-actie="contract-nieuw">${icoon('plus', 'klein')} Contract toevoegen</button></p></section>
<div class="fa-kolommen">
<section class="fa-kaart"><h2>Contactpersonen</h2>
${data.contacten.length ? h`<ul class="fa-lijst">${data.contacten.map((c) => h`<li class="fa-item" style="grid-template-columns:1fr auto"><span><b>${c.naam}</b><span class="f-sub">${c.rol}${c.telefoon ? ` · ${c.telefoon}` : ''}</span>${c.notitie ? h`<span class="f-sub">${c.notitie}</span>` : ''}</span><button type="button" class="fa-mini" data-actie="contact-bewerk" data-id="${c.id}" aria-label="Bewerk ${c.naam}">${icoon('potlood', 'klein')}</button></li>`)}</ul>` : h`<p style="margin:0 0 12px;color:var(--zacht)">Huisarts, thuiszorg, gemeente, notaris.</p>`}
<p style="margin:14px 0 0"><button type="button" class="fa-mini" data-actie="contact-nieuw">${icoon('plus', 'klein')} Contact toevoegen</button></p></section>
<section class="fa-kaart"><h2>Documenten <span class="f-pil">${icoon('slot', 'klein')} versleuteld</span></h2>
${data.documenten.length ? h`<ul class="fa-lijst">${data.documenten.map((d) => h`<li class="fa-item" style="grid-template-columns:1fr auto"><span><b>${d.titel}</b><span class="f-sub">${SOORT_DOCUMENT[d.soort] || 'Overig'}${d.verlooptOp ? ` · verloopt ${datumTekst(d.verlooptOp)}` : ''}</span>${d.notitie ? h`<span class="f-sub">${d.notitie}</span>` : ''}</span><span class="fa-acties">${d.bestandId ? h`<button type="button" class="fa-mini" data-actie="bon-toon" data-id="${d.bestandId}" aria-label="Bekijk ${d.titel}">${icoon('oog', 'klein')}</button>` : ''}<button type="button" class="fa-mini" data-actie="document-bewerk" data-id="${d.id}" aria-label="Bewerk ${d.titel}">${icoon('potlood', 'klein')}</button></span></li>`)}</ul>` : h`<p style="margin:0 0 12px;color:var(--zacht)">Leg vast waar het paspoort, de polissen en het testament liggen.</p>`}
<p style="margin:14px 0 0"><button type="button" class="fa-mini" data-actie="document-nieuw">${icoon('plus', 'klein')} Document toevoegen</button></p></section>
</div>
${dossier.status !== 'overlijden' ? h`<section class="fa-kaart"><h2>Profiel</h2><p style="margin:0;color:var(--zacht)">Het profiel bepaalt welke termijnen en regels in de kalender komen. <button type="button" class="knop-stil" data-actie="profiel" style="padding:0;min-height:0">Profiel aanpassen</button></p></section>` : ''}`;
}

// ── Familie ──
export function familie(ctx) {
  const { dossier } = ctx;
  const T = { 'ouder-app': 'De ouder weet ervan en vindt het goed', schriftelijk: 'Schriftelijke toestemming', volmacht: 'Volmacht, bewind of mentorschap', geen: 'Nog niet besproken' };
  return h`<div class="fa-kop"><div><h1>Familie</h1><p>Wie er meedoet, en in welke rol.</p></div><button type="button" class="knop" data-actie="lid-nieuw">${icoon('uitnodigen')} Iemand toevoegen</button></div>
<section class="fa-kaart"><h2>Leden (${ctx.leden.length})</h2><ul class="fa-lijst">${ctx.leden.map((l) => h`<li class="fa-item">${avatar(l)}<span><b>${l.naam}${l.ik ? ' (jij)' : ''}</b><span class="f-sub">${ROLLEN[l.rol]?.naam || l.rol}: ${ROLLEN[l.rol]?.uitleg || ''}</span></span><button type="button" class="fa-mini" data-actie="lid-bewerk" data-id="${l.id}" aria-label="Bewerk ${l.naam}">${icoon('potlood', 'klein')}</button></li>`)}</ul></section>
<section class="fa-kaart"><h2>Samen in hetzelfde dossier</h2>
${ctx.inst.accounts ? h`<p style="margin-top:0">Met een account werkt de hele familie in hetzelfde dossier, op elk apparaat.</p>` : h`<p style="margin-top:0">Het dossier staat nu alleen op dit apparaat. Deel het als <strong>versleuteld bestand</strong>: je kiest een herstelzin, stuurt het bestand naar je familie en geeft de zin apart door (bel even). Zij openen het in hun eigen regelkamer.</p><p class="f-klein">Samenwerken zonder bestanden heen en weer sturen komt eraan, met een account.</p>`}
<div class="f-knoppen"><button type="button" class="knop-licht" data-actie="exporteer">${icoon('deel')} Deel als versleuteld bestand</button><button type="button" class="knop-licht" data-actie="importeer">${icoon('upload')} Bestand van familie openen</button></div></section>
<section class="fa-kaart"><h2>Toestemming</h2><p style="margin:0">${T[dossier.toestemming?.soort] || T.geen}${dossier.toestemming?.datum ? h`<span class="f-sub" style="display:block;color:var(--zacht)">Vastgelegd op ${datumTekst(dossier.toestemming.datum)}${dossier.toestemming.door ? ` door ${dossier.toestemming.door}` : ''}</span>` : ''}</p>
${!dossier.toestemming || dossier.toestemming.soort === 'geen' ? h`<p class="f-controleer" style="margin-top:12px">Bespreek dit met je ouder. Tot die tijd bewaren we geen gegevens over zorg of gezondheid.</p>` : ''}
<p style="margin:14px 0 0"><button type="button" class="fa-mini" data-actie="toestemming">Aanpassen</button></p></section>`;
}

// ── Afwikkelen (na een overlijden) ──
export function afwikkelen(ctx) {
  const { dossier, data } = ctx;
  if (dossier.status !== 'overlijden') {
    return h`<div class="fa-kop"><div><h1>Na een overlijden</h1><p>Als ${dossier.naam} overlijdt, helpt de regelkamer met de afwikkeling.</p></div></div>
<section class="fa-kaart">${leeg('map', 'Alles wat hier al staat, gaat mee: contracten, contactpersonen en documenten. Je krijgt een stappenplan met de data voor jullie situatie, en voor elk contract een opzegbrief.', h`<button type="button" class="knop-licht" data-actie="overlijden-start">Er is iemand overleden</button>`)}
<p class="f-klein" style="text-align:center">Nu al iets regelen? Bekijk de <a href="/familie/checklist/na-overlijden/">checklist na een overlijden</a>.</p></section>`;
  }
  const v = voortgang(data.checklist);
  const meld = meldlijst(data.contracten, { partnerBlijft: !!dossier.profiel?.partner });
  const klaar = meld.filter((m) => m.status === 'bevestigd').length;
  const ov = ctx.termijnen.filter((t) => t.soort === 'overlijden');
  return h`<div class="fa-kop"><div><h1>Afwikkelen</h1><p>Overleden op ${datumTekst(dossier.overlijdensdatum)}. Je hoeft niet alles tegelijk te doen.</p></div><button type="button" class="knop-licht" data-actie="print">${icoon('download')} Print</button></div>
<section class="fa-kaart"><h2>Termijnen voor jullie situatie</h2>${ov.map((t) => h`<div class="f-regel"><span class="f-stip">${icoon('klok')}</span><span><b>${t.titel}</b><span class="f-sub">${t.datum ? datumTekst(t.datum) : 'Controleer bij de instantie'} · ${t.waarom}</span></span><span class="fa-acties">${t.datum ? pil(t) : ''}${bronLabel(t.bron)}</span></div>`)}
<p style="margin:12px 0 0"><a class="fa-mini" href="/familie/rekenhulp/erfbelasting/">${icoon('rekenmachine', 'klein')} Bereken de erfbelasting</a></p></section>
<section class="fa-kaart"><h2>Opzeggen en melden <span>${klaar} van ${meld.length} bevestigd</span></h2>
${meld.length ? h`<ul class="fa-lijst">${meld.map((m) => h`<li class="fa-item" style="grid-template-columns:1fr auto"><span><b>${m.organisatie}</b><span class="f-sub">${ACTIES[m.actie].naam} · ${SOORT_CONTRACT[m.soort] || 'Overig'}</span></span><span class="fa-acties"><span class="f-pil ${m.status === 'bevestigd' ? 'goed' : m.status === 'verstuurd' ? 'let' : ''}">${m.status === 'bevestigd' ? 'bevestigd' : m.status === 'verstuurd' ? 'verstuurd' : 'nog doen'}</span><button type="button" class="fa-mini vol" data-actie="opzegbrief" data-id="${m.contractId}">Maak brief</button>${m.status !== 'bevestigd' ? h`<button type="button" class="fa-mini" data-actie="opzeg-status" data-id="${m.contractId}" data-status="${m.status === 'verstuurd' ? 'bevestigd' : 'verstuurd'}">${m.status === 'verstuurd' ? 'Bevestigd' : 'Verstuurd'}</button>` : ''}</span></li>`)}</ul>` : h`<p style="margin:0;color:var(--zacht)">Geen contracten in het dossier. <a href="#/d/${dossier.id}/dossier">Lees een bankafschrift in</a> om ze te vinden.</p>`}</section>
<section class="fa-kaart"><h2>Stappenplan <span>${v.klaar} van ${v.totaal} gedaan</span></h2><div class="f-balk" style="margin-bottom:16px"><i style="width:${Math.round(v.deel * 100)}%"></i></div>
${FASES.map((f) => h`<h3 style="font-size:1.1rem;margin:18px 0 8px">${f.titel}</h3><ul class="fa-lijst">${f.stappen.map((s) => h`<li class="fa-item ${data.checklist[s.id] ? 'gedaan' : ''}" style="align-items:start"><button type="button" class="fa-vink" aria-pressed="${data.checklist[s.id] ? 'true' : 'false'}" aria-label="${s.titel}" data-actie="check-vink" data-id="${s.id}">${icoon('vink')}</button><span><b>${s.titel}</b><span class="f-sub">${s.tekst}</span></span>${s.bron && ctx.bronnen[s.bron] ? bronLabel(ctx.bronnen[s.bron]) : rauw('<span></span>')}</li>`)}</ul>`)}</section>
<p class="f-klein">Bij schulden, een testament met bijzondere bepalingen of onenigheid: vraag een notaris of het <a href="https://www.juridischloket.nl/" rel="noopener">Juridisch Loket</a>. De boedelrekening houd je bij in het <a href="#/d/${dossier.id}/logboek">logboek</a> (categorie Nalatenschap).</p>`;
}

// ── Instellingen ──
export function instellingen(ctx) {
  const { dossier } = ctx;
  return h`<div class="fa-kop"><div><h1>Instellingen</h1><p>Dit dossier staat op dit apparaat.</p></div></div>
<section class="fa-kaart"><h2>Dossier</h2><p style="margin:0 0 12px"><strong>${dossier.naam}</strong>${dossier.geboortejaar ? `, geboren in ${dossier.geboortejaar}` : ''}</p><div class="f-knoppen"><button type="button" class="knop-licht" data-actie="dossier-naam">Naam aanpassen</button><button type="button" class="knop-licht" data-actie="profiel">Profiel aanpassen</button></div></section>
<section class="fa-kaart"><h2>Reservekopie</h2><p style="margin-top:0">Wis je de gegevens van je browser, dan is het dossier weg. Maak daarom af en toe een kopie. Die is versleuteld met een herstelzin die jij kiest.</p><div class="f-knoppen"><button type="button" class="knop-licht" data-actie="exporteer">${icoon('download')} Maak een kopie</button><button type="button" class="knop-licht" data-actie="importeer">${icoon('upload')} Zet een kopie terug</button></div></section>
${dossier.status !== 'overlijden' ? h`<section class="fa-kaart"><h2>Na een overlijden</h2><p style="margin-top:0">Het dossier krijgt dan een stappenplan, termijnen en opzegbrieven.</p><button type="button" class="knop-licht" data-actie="overlijden-start">Er is iemand overleden</button></section>` : h`<section class="fa-kaart"><h2>Afwikkeling</h2><p style="margin-top:0">Overleden op ${datumTekst(dossier.overlijdensdatum)}.</p><button type="button" class="knop-licht" data-actie="overlijden-stop">Dit was een vergissing: zet terug</button></section>`}
<section class="fa-kaart"><h2>Verwijderen</h2><p style="margin-top:0">Het dossier en alle documenten worden van dit apparaat gewist. Dit kan niet ongedaan worden gemaakt.</p><button type="button" class="knop gevaar" data-actie="dossier-wis">Verwijder dit dossier</button></section>
<p class="f-klein">Meer weten? <a href="/familie/privacy/">Hoe we met gegevens omgaan</a> · <a href="/familie/voorwaarden/">Voorwaarden</a> · <a href="/familie/bronnen/">Bronnen</a></p>`;
}

export const SCHERMEN = { overzicht, kalender, taken, post, logboek, dossier: dossierScherm, familie, afwikkelen, instellingen };
export const MENU = [
  ['overzicht', 'huis', 'Overzicht'],
  ['kalender', 'kalender', 'Kalender'],
  ['taken', 'taak', 'Taken'],
  ['post', 'brief', 'Post'],
  ['logboek', 'logboek', 'Logboek'],
  ['dossier', 'document', 'Dossier'],
  ['familie', 'familie', 'Familie'],
  ['afwikkelen', 'kaars', 'Na een overlijden'],
  ['instellingen', 'instellingen', 'Instellingen'],
];
