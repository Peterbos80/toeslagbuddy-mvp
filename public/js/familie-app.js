// De regelkamer: schil, navigatie en alle acties. De schermen zelf staan in
// familie-schermen.js; rekenen gebeurt met de kernen uit src/familie.
// Alles draait op het eigen apparaat (familie-opslag.js).
import { h, rauw, icoon, leesJson, getal, datumTekst, vandaagIso, euro } from './familie-ui.js';
import { laad, bewaar, legeData, bewaarBestand, leesBestand, exporteer, importeer, verwijderDossier } from './familie-opslag.js';
import { SCHERMEN, MENU, start, intake, avatar } from './familie-schermen.js';
import { nieuwDossier, uid, ROLLEN, SOORT_CONTRACT, SOORT_DOCUMENT, MAX_LEDEN, avatarKleur, initialen } from './dossier.js';
import { termijnen } from './termijnmotor.js';
import { VRAGEN, profielUit, startTaken } from './intake.js';
import { voegToe, controleerKeten, CATEGORIEEN, naarCent, centTekst } from './logboek.js';
import { basisUitleg, valideer } from './briefuitleg.js';
import { lak } from './lakken.js';
import { leesAfschrift, voorstel } from './bankscan.js';
import { brief as opzegBrief, ACTIES as OPZEG_ACTIES, standaardActie } from './opzeggen.js';
import { nieuweHerstelzin } from './versleutel.js';
import { maakDemo } from './familie-demo.js';
import { CONFIG } from './config.js';

const root = document.getElementById('familie-app');
const { regels, bronnen } = leesJson('familie-regels', { regels: {}, bronnen: {} });
const organisaties = leesJson('familie-organisaties', []);
const inst = leesJson('familie-instellingen', {});
let state = laad();
const sessie = { intake: { stap: 0, antwoorden: {} }, ketenOk: null, toast: null };

const opslaan = () => {
  if (!bewaar(state)) toast('Opslaan lukt niet: de opslag van je browser is vol of staat uit.');
};
const route = () => {
  const m = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (m[0] === 'd' && m[1]) return { dossierId: m[1], scherm: m[2] || 'overzicht', sub: m[3] || null };
  return { scherm: m[0] || 'start' };
};
const ga = (pad) => {
  if (location.hash === `#${pad}`) render();
  else location.hash = pad;
};

function context() {
  const r = route();
  const dossier = state.dossiers.find((d) => d.id === r.dossierId) || null;
  // Hetzelfde object houden: acties die nog een oudere ctx vasthouden, schrijven dan niet in het niets
  let data = null;
  if (dossier) {
    data = state.data[dossier.id] ||= {};
    for (const [k, v] of Object.entries(legeData())) if (!(k in data)) data[k] = v;
  }
  return {
    state,
    dossier,
    data,
    leden: data?.leden || [],
    ik: data?.leden.find((l) => l.ik) || data?.leden[0] || null,
    termijnen: dossier ? termijnen({ dossier, contracten: data.contracten, documenten: data.documenten, brieven: data.brieven, regels, bronnen }) : [],
    regels,
    bronnen,
    inst,
    sub: r.sub,
    scherm: r.scherm,
    intake: sessie.intake,
    ketenOk: sessie.ketenOk,
  };
}

// ── Tekenen ──
function render() {
  const ctx = context();
  let inhoud;
  let metZij = false;
  if (ctx.dossier && SCHERMEN[ctx.scherm]) {
    metZij = true;
    const open = ctx.data.taken.filter((t) => !t.klaar).length;
    const nieuw = ctx.data.brieven.filter((b) => !b.bevestigd).length;
    const teller = { taken: open, post: nieuw };
    const menu = MENU.filter(([k]) => k !== 'afwikkelen' || true);
    const link = ([k, ico, naam]) => h`<a href="#/d/${ctx.dossier.id}/${k}" ${k === ctx.scherm ? rauw('aria-current="page"') : ''}>${icoon(ico)}<span>${k === 'afwikkelen' && ctx.dossier.status === 'overlijden' ? 'Afwikkelen' : naam}</span>${teller[k] ? h`<span class="fa-teller">${teller[k]}</span>` : ''}</a>`;
    inhoud = h`<aside class="fa-zij" aria-label="Menu van de regelkamer"><a class="fa-dossier" href="#/" style="text-decoration:none;color:inherit" title="Alle dossiers"><span class="f-avatar groot" style="--a:${avatarKleur(ctx.dossier.naam)}">${initialen(ctx.dossier.naam)}</span><span><strong>${ctx.dossier.naam}</strong><small>Alle dossiers</small></span></a><nav class="fa-nav">${menu.slice(0, 5).map(link)}<hr>${menu.slice(5).map(link)}</nav></aside>
<div class="fa-hoofd" id="fa-hoofd" tabindex="-1">${SCHERMEN[ctx.scherm](ctx)}</div>
<nav class="fa-onder" aria-label="Menu van de regelkamer">${menu.slice(0, 4).map(([k, ico, naam]) => h`<a href="#/d/${ctx.dossier.id}/${k}" ${k === ctx.scherm ? rauw('aria-current="page"') : ''}>${icoon(ico)}<span>${naam}</span></a>`)}<a href="#/d/${ctx.dossier.id}/meer" ${menu.slice(4).some(([k]) => k === ctx.scherm) ? rauw('aria-current="page"') : ''} data-actie="meer">${icoon('menu')}<span>Meer</span></a></nav>
<button type="button" class="fa-plus" data-actie="plus" aria-label="Iets toevoegen">${icoon('plus', 'groot')}</button>`;
  } else if (ctx.dossier && ctx.scherm === 'meer') {
    metZij = true;
    inhoud = h`<div class="fa-hoofd"><div class="fa-kop"><h1>Meer</h1></div><nav class="fa-nav fa-kaart">${MENU.slice(4).map(([k, ico, naam]) => h`<a href="#/d/${ctx.dossier.id}/${k}">${icoon(ico)}<span>${naam}</span></a>`)}<hr><a href="#/">${icoon('pijl-terug')}<span>Alle dossiers</span></a></nav></div>
<nav class="fa-onder" aria-label="Menu van de regelkamer">${MENU.slice(0, 4).map(([k, ico, naam]) => h`<a href="#/d/${ctx.dossier.id}/${k}">${icoon(ico)}<span>${naam}</span></a>`)}<a href="#/d/${ctx.dossier.id}/meer" aria-current="page">${icoon('menu')}<span>Meer</span></a></nav>`;
  } else if (ctx.scherm === 'nieuw') inhoud = intake(ctx);
  else inhoud = h`<div class="fa-hoofd">${start(ctx)}</div>`;
  root.className = `fa${metZij ? ' met-zij' : ''}${ctx.dossier?.status === 'overlijden' ? ' rouw' : ''}`;
  root.innerHTML = String(inhoud);
  document.title = `${ctx.dossier ? `${ctx.dossier.naam} · ` : ''}De regelkamer | ToeslagBuddy`;
  if (ctx.dossier && ctx.scherm === 'logboek' && sessie.ketenOk === null) {
    controleerKeten(ctx.data.logboek).then((fout) => {
      sessie.ketenOk = fout === null;
      if (fout !== null) render();
    });
  }
}

function toast(tekst, ongedaan = null) {
  document.querySelector('.fa-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'fa-toast';
  t.setAttribute('role', 'status');
  t.append(document.createTextNode(tekst));
  if (ongedaan) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Ongedaan maken';
    b.addEventListener('click', () => {
      ongedaan();
      t.remove();
    });
    t.append(b);
  }
  document.body.append(t);
  clearTimeout(sessie.toast);
  sessie.toast = setTimeout(() => t.remove(), ongedaan ? 6000 : 4000);
}

// ── Dialoog met een formulier ──
// velden: [{ naam, label, soort: tekst|bedrag|datum|keuze|lijst|lang|bestand|info, opties, waarde, hint, verplicht }]
function dialoog({ titel, velden = [], knop = 'Bewaar', extra = '', wis = null, opslaan: klaar }) {
  document.querySelector('dialog.fa-dialoog')?.remove();
  const d = document.createElement('dialog');
  d.className = 'fa-dialoog';
  d.setAttribute('aria-labelledby', 'fa-dialoog-titel');
  const veld = (v) => {
    const id = `d-${v.naam}`;
    const hint = v.hint ? h`<p class="hint" id="${id}-hint">${v.hint}</p>` : '';
    const req = v.verplicht ? rauw('required') : '';
    if (v.soort === 'info') return h`<p class="f-klein">${v.label}</p>`;
    if (v.soort === 'keuze') return h`<fieldset class="f-veld"><legend>${v.label}</legend>${hint}<div class="f-keuze">${v.opties.map(([w, t]) => h`<input type="radio" name="${v.naam}" id="${id}-${w}" value="${w}" ${String(v.waarde ?? v.opties[0][0]) === String(w) ? rauw('checked') : ''}><label for="${id}-${w}">${t}</label>`)}</div></fieldset>`;
    if (v.soort === 'lijst') return h`<div class="f-veld"><label for="${id}">${v.label}</label>${hint}<select id="${id}" name="${v.naam}">${v.opties.map(([w, t]) => h`<option value="${w}" ${String(v.waarde ?? '') === String(w) ? rauw('selected') : ''}>${t}</option>`)}</select></div>`;
    if (v.soort === 'lang') return h`<div class="f-veld"><label for="${id}">${v.label}</label>${hint}<textarea id="${id}" name="${v.naam}" rows="${v.rijen || 6}" ${req}>${v.waarde || ''}</textarea></div>`;
    if (v.soort === 'bestand') return h`<div class="f-veld"><label for="${id}">${v.label}</label>${hint}<input id="${id}" name="${v.naam}" type="file" accept="${v.accept || 'image/*,application/pdf'}"></div>`;
    if (v.soort === 'bedrag') return h`<div class="f-veld"><label for="${id}">${v.label}</label>${hint}<div class="f-euro"><input id="${id}" name="${v.naam}" type="text" inputmode="decimal" autocomplete="off" value="${v.waarde ?? ''}" ${req}></div></div>`;
    return h`<div class="f-veld"><label for="${id}">${v.label}</label>${hint}<input id="${id}" name="${v.naam}" type="${v.soort === 'datum' ? 'date' : 'text'}" value="${v.waarde ?? ''}" maxlength="${v.max || 120}" autocomplete="off" ${req}></div>`;
  };
  d.innerHTML = String(h`<form method="dialog" novalidate><button type="button" class="fa-sluit" data-sluit aria-label="Sluit">${icoon('kruis')}</button><h2 id="fa-dialoog-titel">${titel}</h2>${velden.map(veld)}${rauw(String(extra))}<p class="veld-fout" data-fout hidden></p><div class="f-knoppen">${wis ? h`<button type="button" class="knop-stil" data-wis style="margin-right:auto;color:var(--rood)">Verwijder</button>` : ''}<button type="button" class="knop-licht" data-sluit>Annuleer</button>${klaar ? h`<button class="knop" type="submit">${knop}</button>` : ''}</div></form>`);
  document.body.append(d);
  const form = d.querySelector('form');
  const sluit = () => {
    d.close();
    d.remove();
  };
  d.querySelectorAll('[data-sluit]').forEach((b) => b.addEventListener('click', sluit));
  d.addEventListener('cancel', () => d.remove());
  d.querySelector('[data-wis]')?.addEventListener('click', () => {
    wis();
    sluit();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const w = {};
    for (const v of velden) if (v.soort !== 'info') w[v.naam] = v.soort === 'bestand' ? fd.get(v.naam) : String(fd.get(v.naam) ?? '').trim();
    const fout = d.querySelector('[data-fout]');
    const leeg = velden.find((v) => v.verplicht && !w[v.naam]);
    try {
      if (leeg) throw new Error(`Vul in: ${leeg.label.toLowerCase()}.`);
      const blijfOpen = await klaar(w, d);
      if (blijfOpen !== true) sluit();
    } catch (err) {
      fout.textContent = err.message || 'Dat lukte niet.';
      fout.hidden = false;
      const el = leeg && form.elements[leeg.naam];
      if (el && el.focus) el.focus();
    }
  });
  d.showModal();
  return d;
}

const ledenOpties = (ctx, leeg = 'Nog niemand') => [['', leeg], ...ctx.leden.map((l) => [l.id, l.naam])];
const klaarEnToon = (tekst, ongedaan) => {
  opslaan();
  render();
  if (tekst) toast(tekst, ongedaan);
};
const vind = (lijst, id) => lijst.find((x) => x.id === id);
const verwijder = (ctx, soort, id, naam) => {
  const lijst = ctx.data[soort];
  const i = lijst.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [weg] = lijst.splice(i, 1);
  klaarEnToon(`${naam} verwijderd.`, () => {
    lijst.splice(i, 0, weg);
    klaarEnToon('');
  });
};

// ── Acties ──
const ACTIES = {
  async demo() {
    const { dossier, data } = await maakDemo();
    state.dossiers.push(dossier);
    state.data[dossier.id] = data;
    opslaan();
    ga(`/d/${dossier.id}/overzicht`);
  },
  async 'demo-wis'(ctx) {
    await verwijderDossier(state, ctx.dossier.id);
    opslaan();
    ga('/');
  },
  'intake-terug'() {
    sessie.intake.stap = Math.max(0, sessie.intake.stap - 1);
    render();
  },
  'intake-sla-over'() {
    sessie.intake.stap++;
    render();
  },
  meer() {},
  print() {
    window.print();
  },

  plus(ctx) {
    dialoog({
      titel: 'Wat wil je toevoegen?',
      extra: h`<div class="fa-keuzes">${[['brief-nieuw', 'brief', 'Een brief', 'Plak de tekst en zie wat je moet doen'], ['uitgave-nieuw', 'logboek', 'Een uitgave of ontvangst', 'Voor het logboek, met bon'], ['taak-nieuw', 'taak', 'Een taak', 'Met of zonder datum'], ['contract-nieuw', 'contract', 'Een contract', 'Vaste last of abonnement'], ['document-nieuw', 'document', 'Een document', 'Waar het ligt en wanneer het verloopt']].map(([a, i, t, s]) => h`<button type="button" data-kies="${a}"><span class="f-stip">${icoon(i)}</span><span><strong>${t}</strong><small>${s}</small></span></button>`)}</div>`,
    }).addEventListener('click', (e) => {
      const k = e.target.closest('[data-kies]');
      if (k) ACTIES[k.dataset.kies](ctx);
    });
  },

  // Taken
  'taak-nieuw'(ctx, _el, basis = {}) {
    dialoog({
      titel: basis.id ? 'Taak aanpassen' : 'Nieuwe taak',
      velden: [
        { naam: 'titel', label: 'Wat moet er gebeuren?', verplicht: true, waarde: basis.titel },
        { naam: 'toelichting', label: 'Toelichting', soort: 'lang', rijen: 3, waarde: basis.toelichting },
        { naam: 'wie', label: 'Wie doet dit?', soort: 'lijst', opties: ledenOpties(ctx), waarde: basis.wie ?? '' },
        { naam: 'deadline', label: 'Vóór wanneer?', soort: 'datum', waarde: basis.deadline, hint: 'Leeg laten mag.' },
      ],
      wis: basis.id ? () => verwijder(ctx, 'taken', basis.id, 'Taak') : null,
      opslaan(w) {
        if (basis.id) Object.assign(vind(ctx.data.taken, basis.id), { titel: w.titel, toelichting: w.toelichting, wie: w.wie || null, deadline: w.deadline || null });
        else ctx.data.taken.push({ id: uid(), titel: w.titel, toelichting: w.toelichting, wie: w.wie || null, deadline: w.deadline || null, klaar: false, bron: basis.bron || 'handmatig' });
        klaarEnToon(basis.id ? 'Taak aangepast.' : 'Taak toegevoegd.');
      },
    });
  },
  'taak-bewerk'(ctx, el) {
    ACTIES['taak-nieuw'](ctx, el, vind(ctx.data.taken, el.dataset.id));
  },
  'taak-vink'(ctx, el) {
    const t = vind(ctx.data.taken, el.dataset.id);
    t.klaar = !t.klaar;
    t.klaarOp = t.klaar ? vandaagIso() : null;
    if (t.klaar && !t.wie && ctx.ik) t.wie = ctx.ik.id;
    klaarEnToon(t.klaar ? 'Gedaan.' : '', t.klaar ? () => { t.klaar = false; klaarEnToon(''); } : null);
  },
  'taak-pak'(ctx, el) {
    const t = vind(ctx.data.taken, el.dataset.id);
    t.wie = ctx.ik?.id || null;
    klaarEnToon('Jij doet dit.');
  },
  'termijn-taak'(ctx, el) {
    const t = ctx.termijnen.find((x) => x.id === el.dataset.id);
    if (t) ACTIES['taak-nieuw'](ctx, el, { titel: t.titel, toelichting: t.waarom, deadline: t.datum, bron: 'termijn' });
  },
  'afspraak-nieuw'(ctx) {
    dialoog({
      titel: 'Afspraak vastleggen',
      velden: [{ naam: 'tekst', label: 'Wat spreken jullie af?', soort: 'lang', rijen: 3, verplicht: true, hint: 'Bijvoorbeeld wie wat betaalt, of wie wanneer belt.' }],
      opslaan(w) {
        ctx.data.afspraken.unshift({ id: uid(), tekst: w.tekst.slice(0, 500), door: ctx.ik?.id || null, datum: vandaagIso() });
        klaarEnToon('Afspraak vastgelegd.');
      },
    });
  },
  'afspraak-wis'(ctx, el) {
    verwijder(ctx, 'afspraken', el.dataset.id, 'Afspraak');
  },

  // Post
  'brief-nieuw'(ctx) {
    dialoog({
      titel: 'Brief toevoegen',
      knop: 'Leg uit',
      velden: [
        { naam: 'tekst', label: 'Tekst van de brief', soort: 'lang', rijen: 9, verplicht: true, hint: 'Plak of typ de tekst. Op een telefoon kun je tekst uit een foto kopiëren (houd je vinger op de tekst in de foto).' },
        { naam: 'ontvangen', label: 'Wanneer kwam de brief?', soort: 'datum', waarde: vandaagIso() },
        { naam: 'info', soort: 'info', label: 'De uitleg gebeurt op dit apparaat. BSN, rekeningnummers en geboortedatum halen we direct uit de tekst; die bewaren we niet.' },
      ],
      opslaan(w) {
        const gelakt = lak(w.tekst.slice(0, 20000));
        const uitleg = basisUitleg(gelakt.tekst);
        const b = { id: uid(), titel: `${uitleg.afzender?.naam || 'Brief'}: ${uitleg.soort.naam.toLowerCase()}`, tekst: gelakt.tekst, ontvangen: w.ontvangen || vandaagIso(), uitleg, bevestigd: false, door: ctx.ik?.id || null, nieuw: true };
        ctx.data.brieven.push(b);
        opslaan();
        ga(`/d/${ctx.dossier.id}/post/${b.id}`);
        if (gelakt.aantal) toast(`${gelakt.aantal} gevoelige gegevens weggelakt.`);
        setTimeout(() => { b.nieuw = false; opslaan(); }, 1500);
      },
    });
  },
  'brief-klopt'(ctx, el) {
    const b = vind(ctx.data.brieven, el.dataset.id);
    b.bevestigd = true;
    b.bevestigdDoor = ctx.ik?.id || null;
    if (b.uitleg?.termijn) ctx.data.taken.push({ id: uid(), titel: b.titel, toelichting: (b.uitleg.acties || [])[0] || '', wie: null, deadline: b.uitleg.termijn.datum, klaar: false, bron: 'brief', briefId: b.id });
    klaarEnToon(b.uitleg?.termijn ? 'Staat in de kalender, met een taak erbij.' : 'Bewaard.');
  },
  'brief-pasaan'(ctx, el) {
    const b = vind(ctx.data.brieven, el.dataset.id);
    dialoog({
      titel: 'Pas de uitleg aan',
      velden: [
        { naam: 'titel', label: 'Korte naam van de brief', waarde: b.titel, verplicht: true },
        { naam: 'datum', label: 'Termijn', soort: 'datum', waarde: b.uitleg?.termijn?.datum, hint: 'De uiterste datum die in de brief staat. Leeg als er geen is.' },
        { naam: 'bedrag', label: 'Bedrag', soort: 'bedrag', waarde: b.uitleg?.bedrag ? String(b.uitleg.bedrag.waarde).replace('.', ',') : '' },
      ],
      opslaan(w) {
        b.titel = w.titel;
        b.uitleg = { ...b.uitleg, bron: 'handmatig' };
        b.uitleg.termijn = w.datum ? { datum: w.datum, citaat: b.uitleg?.termijn?.citaat || 'Zelf ingevuld', soort: 'datum' } : null;
        const bedrag = getal(w.bedrag);
        b.uitleg.bedrag = bedrag !== null && w.bedrag ? { waarde: bedrag, citaat: b.uitleg?.bedrag?.citaat || 'Zelf ingevuld', richting: b.uitleg?.bedrag?.richting || 'onbekend' } : null;
        klaarEnToon('Aangepast. Controleer en bevestig.');
      },
    });
  },
  'brief-klaar'(ctx, el) {
    const b = vind(ctx.data.brieven, el.dataset.id);
    b.afgehandeld = true;
    for (const t of ctx.data.taken.filter((t) => t.briefId === b.id && !t.klaar)) Object.assign(t, { klaar: true, klaarOp: vandaagIso() });
    klaarEnToon('Brief afgehandeld.');
  },
  'brief-wis'(ctx, el) {
    verwijder(ctx, 'brieven', el.dataset.id, 'Brief');
    ga(`/d/${ctx.dossier.id}/post`);
  },
  async 'brief-ai'(ctx, el) {
    const b = vind(ctx.data.brieven, el.dataset.id);
    if (!CONFIG.supabaseUrl) return toast('Uitleg met AI staat nog niet aan.');
    el.disabled = true;
    el.textContent = 'Bezig…';
    try {
      const r = await fetch(`${CONFIG.supabaseUrl}/functions/v1/familie-brief`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${CONFIG.supabaseAnonKey}` }, body: JSON.stringify({ tekst: lak(b.tekst).tekst }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).fout || 'De uitleg lukte niet.');
      const ai = await r.json();
      b.uitleg = { ...valideer({ ...ai.uitleg, bron: 'ai', doorverwijzen: b.uitleg?.doorverwijzen || [] }, b.tekst), bron: 'ai' };
      klaarEnToon('Uitleg bijgewerkt. Controleer bedrag en termijn in de brief.');
    } catch (e) {
      toast(e.message);
      render();
    }
  },

  // Logboek
  'uitgave-nieuw'(ctx, _el, basis = {}) {
    dialoog({
      titel: basis.corrigeertId ? 'Regel verbeteren' : 'Vastleggen in het logboek',
      knop: 'Leg vast',
      velden: [
        ...(basis.corrigeertId ? [{ naam: 'info', soort: 'info', label: 'De oude regel blijft zichtbaar als verbeterd. Zo ziet iedereen wat er is veranderd.' }] : []),
        { naam: 'richting', label: 'Wat was het?', soort: 'keuze', opties: [['uit', 'Uitgegeven'], ['in', 'Ontvangen']], waarde: basis.richting || 'uit' },
        { naam: 'bedrag', label: 'Bedrag', soort: 'bedrag', verplicht: true, waarde: basis.bedragCent ? (basis.bedragCent / 100).toFixed(2).replace('.', ',') : '' },
        { naam: 'omschrijving', label: 'Waarvoor?', verplicht: true, waarde: basis.omschrijving, max: 200 },
        { naam: 'categorie', label: 'Soort', soort: 'lijst', opties: Object.entries(CATEGORIEEN), waarde: basis.categorie || 'boodschappen' },
        { naam: 'datum', label: 'Datum', soort: 'datum', verplicht: true, waarde: basis.datum || vandaagIso() },
        { naam: 'door', label: 'Wie deed dit?', soort: 'lijst', opties: ledenOpties(ctx, 'Onbekend'), waarde: basis.door ?? ctx.ik?.id ?? '' },
        { naam: 'bon', label: 'Foto van de bon', soort: 'bestand', hint: 'Wordt versleuteld bewaard op dit apparaat.' },
      ],
      async opslaan(w) {
        const cent = naarCent(w.bedrag);
        if (!cent || cent <= 0) throw new Error('Vul een bedrag in, bijvoorbeeld 12,50.');
        let bonId = basis.bonId || null;
        if (w.bon && w.bon.size) {
          if (w.bon.size > 8e6) throw new Error('De foto is te groot (maximaal 8 MB).');
          bonId = uid();
          await bewaarBestand(bonId, w.bon);
        }
        ctx.data.logboek.push(await voegToe(ctx.data.logboek, { datum: w.datum, bedragCent: cent, richting: w.richting, categorie: w.categorie, omschrijving: w.omschrijving, door: w.door || null, bonId, corrigeertId: basis.corrigeertId || null }));
        sessie.ketenOk = null;
        klaarEnToon(basis.corrigeertId ? 'Regel verbeterd.' : `${centTekst(cent)} vastgelegd.`);
      },
    });
  },
  'uitgave-verbeter'(ctx, el) {
    const r = vind(ctx.data.logboek, el.dataset.id);
    ACTIES['uitgave-nieuw'](ctx, el, { ...r, corrigeertId: r.id });
  },
  async 'bon-toon'(_ctx, el) {
    const blob = await leesBestand(el.dataset.id);
    if (!blob) return toast('Dit bestand staat niet op dit apparaat.');
    const url = URL.createObjectURL(blob);
    const d = dialoog({ titel: 'Bijlage', extra: blob.type.startsWith('image/') ? h`<img src="${url}" alt="Bijlage" style="max-width:100%;border-radius:12px">` : h`<p><a class="knop-licht" href="${url}" target="_blank" rel="noopener">Open het bestand</a></p>` });
    d.addEventListener('close', () => URL.revokeObjectURL(url));
  },

  // Dossier
  'contract-nieuw'(ctx, _el, basis = {}) {
    dialoog({
      titel: basis.id ? 'Contract aanpassen' : 'Contract toevoegen',
      velden: [
        { naam: 'naam', label: 'Naam', verplicht: true, waarde: basis.naam, hint: 'Bijvoorbeeld de leverancier of verzekeraar.' },
        { naam: 'soort', label: 'Soort', soort: 'lijst', opties: Object.entries(SOORT_CONTRACT), waarde: basis.soort || 'overig' },
        { naam: 'perMaand', label: 'Kosten per maand', soort: 'bedrag', waarde: basis.perMaandCent ? (basis.perMaandCent / 100).toFixed(2).replace('.', ',') : '' },
        { naam: 'einddatum', label: 'Einddatum van het contract', soort: 'datum', waarde: basis.einddatum, hint: 'Dan waarschuwen we op tijd. Leeg bij onbepaalde tijd.' },
        { naam: 'opzegtermijnDagen', label: 'Opzegtermijn in dagen', waarde: basis.opzegtermijnDagen ?? '', max: 3 },
        { naam: 'klantnummer', label: 'Klant- of polisnummer', waarde: basis.klantnummer, hint: 'Handig voor een opzegbrief. Geen BSN en geen rekeningnummer.' },
        { naam: 'wie', label: 'Wie regelt dit?', soort: 'lijst', opties: ledenOpties(ctx), waarde: basis.wie ?? '' },
      ],
      wis: basis.id ? () => verwijder(ctx, 'contracten', basis.id, 'Contract') : null,
      opslaan(w) {
        const c = { naam: w.naam, soort: w.soort, perMaandCent: naarCent(w.perMaand) || 0, einddatum: w.einddatum || null, opzegtermijnDagen: Number(w.opzegtermijnDagen) > 0 ? Math.min(365, Math.floor(Number(w.opzegtermijnDagen))) : null, klantnummer: w.klantnummer.replace(/\s+/g, ' ').slice(0, 40), wie: w.wie || null };
        if (basis.id) Object.assign(vind(ctx.data.contracten, basis.id), c);
        else ctx.data.contracten.push({ id: uid(), ...c });
        klaarEnToon('Contract bewaard.');
      },
    });
  },
  'contract-bewerk'(ctx, el) {
    ACTIES['contract-nieuw'](ctx, el, vind(ctx.data.contracten, el.dataset.id));
  },
  'contact-nieuw'(ctx, _el, basis = {}) {
    dialoog({
      titel: basis.id ? 'Contact aanpassen' : 'Contact toevoegen',
      velden: [
        { naam: 'naam', label: 'Naam', verplicht: true, waarde: basis.naam },
        { naam: 'rol', label: 'Wie is dit?', waarde: basis.rol, hint: 'Bijvoorbeeld huisarts, thuiszorg of notaris.' },
        { naam: 'telefoon', label: 'Telefoon', waarde: basis.telefoon, max: 20 },
        { naam: 'notitie', label: 'Notitie', waarde: basis.notitie, max: 200 },
      ],
      wis: basis.id ? () => verwijder(ctx, 'contacten', basis.id, 'Contact') : null,
      opslaan(w) {
        if (basis.id) Object.assign(vind(ctx.data.contacten, basis.id), w);
        else ctx.data.contacten.push({ id: uid(), ...w });
        klaarEnToon('Contact bewaard.');
      },
    });
  },
  'contact-bewerk'(ctx, el) {
    ACTIES['contact-nieuw'](ctx, el, vind(ctx.data.contacten, el.dataset.id));
  },
  'document-nieuw'(ctx, _el, basis = {}) {
    dialoog({
      titel: basis.id ? 'Document aanpassen' : 'Document toevoegen',
      velden: [
        { naam: 'titel', label: 'Naam', verplicht: true, waarde: basis.titel },
        { naam: 'soort', label: 'Soort', soort: 'lijst', opties: Object.entries(SOORT_DOCUMENT), waarde: basis.soort || 'overig' },
        { naam: 'verlooptOp', label: 'Verloopt op', soort: 'datum', waarde: basis.verlooptOp, hint: 'Voor een paspoort, rijbewijs of indicatie.' },
        { naam: 'notitie', label: 'Waar ligt het?', waarde: basis.notitie, max: 200 },
        { naam: 'bestand', label: 'Foto of scan (als je die wilt bewaren)', soort: 'bestand', hint: 'Wordt versleuteld bewaard op dit apparaat. Bewaar geen kopie van een identiteitsbewijs als dat niet nodig is.' },
      ],
      wis: basis.id ? () => verwijder(ctx, 'documenten', basis.id, 'Document') : null,
      async opslaan(w) {
        let bestandId = basis.bestandId || null;
        if (w.bestand && w.bestand.size) {
          if (w.bestand.size > 8e6) throw new Error('Het bestand is te groot (maximaal 8 MB).');
          bestandId = uid();
          await bewaarBestand(bestandId, w.bestand);
        }
        const d = { titel: w.titel, soort: w.soort, verlooptOp: w.verlooptOp || null, notitie: w.notitie, bestandId };
        if (basis.id) Object.assign(vind(ctx.data.documenten, basis.id), d);
        else ctx.data.documenten.push({ id: uid(), ...d });
        klaarEnToon('Document bewaard.');
      },
    });
  },
  'document-bewerk'(ctx, el) {
    ACTIES['document-nieuw'](ctx, el, vind(ctx.data.documenten, el.dataset.id));
  },
  bankscan(ctx) {
    const d = dialoog({
      titel: 'Bankafschrift inlezen',
      knop: 'Zoek vaste lasten',
      velden: [
        { naam: 'bestand', label: 'Bestand van de bank', soort: 'bestand', accept: '.csv,.txt,.xml,.sta,.mt940,.940,text/csv,text/plain,application/xml', hint: 'Download bij de bank de transacties van minstens 3 maanden als CSV, MT940 of CAMT.053.' },
        { naam: 'info', soort: 'info', label: 'Het bestand blijft op dit apparaat en wordt niet verstuurd. We bewaren alleen de contracten die je zelf aanvinkt.' },
      ],
      async opslaan(w, dlg) {
        if (!w.bestand || !w.bestand.size) throw new Error('Kies eerst een bestand.');
        if (w.bestand.size > 5e6) throw new Error('Het bestand is te groot (maximaal 5 MB).');
        const { transacties } = leesAfschrift(await w.bestand.text());
        if (!transacties.length) throw new Error('We konden dit bestand niet lezen. Probeer een CSV-export van je bank.');
        const lijst = voorstel(transacties, organisaties).filter((v) => !ctx.data.contracten.some((c) => c.naam.toLowerCase() === v.naam.toLowerCase()));
        if (!lijst.length) throw new Error(`${transacties.length} transacties gelezen, maar geen nieuwe terugkerende betalingen gevonden.`);
        dlg.remove();
        dialoog({
          titel: `${lijst.length} vaste lasten gevonden`,
          knop: 'Voeg toe aan het dossier',
          extra: h`<p class="f-klein">Uit ${transacties.length} transacties. Vink aan wat klopt.</p><ul class="fa-lijst">${lijst.map((v, i) => h`<li class="fa-item"><input type="checkbox" name="kies" value="${i}" id="scan-${i}" ${v.herkend || v.vast ? rauw('checked') : ''} style="width:24px;height:24px;min-height:0"><label for="scan-${i}"><b>${v.naam}</b><span class="f-sub">${SOORT_CONTRACT[v.soort]} · elke ${v.ritme === 'jaar' ? 'jaar' : v.ritme === 'kwartaal' ? '3 maanden' : v.ritme} · ${v.aantal}× gezien</span></label><span class="fa-bedrag">${centTekst(v.perMaandCent)} p/m</span></li>`)}</ul>`,
          opslaan(_w, dlg2) {
            const gekozen = [...dlg2.querySelectorAll('input[name=kies]:checked')].map((c) => lijst[Number(c.value)]);
            for (const v of gekozen) ctx.data.contracten.push({ id: uid(), naam: v.naam, soort: v.soort, perMaandCent: v.perMaandCent, einddatum: null, opzegtermijnDagen: null, klantnummer: '', wie: null });
            klaarEnToon(`${gekozen.length} contracten toegevoegd.`);
          },
        });
        return true;
      },
    });
    return d;
  },
  profiel(ctx) {
    const p = ctx.dossier.profiel || {};
    const jaNee = [['ja', 'Ja'], ['nee', 'Nee']];
    dialoog({
      titel: 'Profiel aanpassen',
      velden: [
        { naam: 'woonsituatie', label: 'Woonsituatie', soort: 'lijst', opties: VRAGEN.find((v) => v.id === 'woonsituatie').opties, waarde: p.woonsituatie },
        { naam: 'toeslagen', label: 'Toeslagen?', soort: 'keuze', opties: jaNee, waarde: p.toeslagen ? 'ja' : 'nee' },
        { naam: 'zonnepanelen', label: 'Zonnepanelen?', soort: 'keuze', opties: jaNee, waarde: p.zonnepanelen ? 'ja' : 'nee' },
      ],
      opslaan(w) {
        ctx.dossier.profiel = { ...p, woonsituatie: w.woonsituatie, partner: w.woonsituatie === 'partner', toeslagen: w.toeslagen === 'ja', zonnepanelen: w.zonnepanelen === 'ja' };
        klaarEnToon('Profiel aangepast.');
      },
    });
  },

  // Familie
  'lid-nieuw'(ctx, _el, basis = {}) {
    if (!basis.id && ctx.leden.length >= MAX_LEDEN) return toast(`Een dossier heeft maximaal ${MAX_LEDEN} leden.`);
    dialoog({
      titel: basis.id ? 'Lid aanpassen' : 'Iemand toevoegen',
      velden: [
        { naam: 'naam', label: 'Naam', verplicht: true, waarde: basis.naam, max: 60 },
        { naam: 'rol', label: 'Rol', soort: 'lijst', opties: Object.entries(ROLLEN).map(([k, r]) => [k, `${r.naam}: ${r.uitleg}`]), waarde: basis.rol || 'meekijker' },
      ],
      wis: basis.id && !basis.ik ? () => verwijder(ctx, 'leden', basis.id, 'Lid') : null,
      opslaan(w) {
        if (basis.id) Object.assign(vind(ctx.data.leden, basis.id), w);
        else ctx.data.leden.push({ id: uid(), ...w });
        klaarEnToon(basis.id ? 'Aangepast.' : `${w.naam} toegevoegd. Deel het dossier als bestand, zodat ${w.naam.split(' ')[0]} mee kan kijken.`);
      },
    });
  },
  'lid-bewerk'(ctx, el) {
    ACTIES['lid-nieuw'](ctx, el, vind(ctx.data.leden, el.dataset.id));
  },
  toestemming(ctx) {
    dialoog({
      titel: 'Toestemming',
      velden: [{ naam: 'soort', label: 'Wat is er afgesproken?', soort: 'lijst', opties: [['ouder-app', 'Mijn ouder weet ervan en vindt het goed'], ['schriftelijk', 'Er is schriftelijke toestemming'], ['volmacht', 'Er is een volmacht, bewind of mentorschap'], ['geen', 'Nog niet besproken']], waarde: ctx.dossier.toestemming?.soort || 'geen' }],
      opslaan(w) {
        ctx.dossier.toestemming = { soort: w.soort, datum: vandaagIso(), door: ctx.ik?.naam || '' };
        if (w.soort === 'geen' && ctx.dossier.profiel) ctx.dossier.profiel.zorg = null;
        klaarEnToon('Vastgelegd.');
      },
    });
  },
  exporteer(ctx) {
    const zin = nieuweHerstelzin();
    dialoog({
      titel: 'Deel als versleuteld bestand',
      knop: 'Download het bestand',
      velden: [{ naam: 'zin', label: 'Herstelzin', waarde: zin, verplicht: true, hint: 'Schrijf deze zin op of geef hem apart door (bel even). Zonder de zin kan niemand het bestand openen, ook wij niet.' }],
      async opslaan(w) {
        if (w.zin.trim().split(/\s+/).length < 4) throw new Error('Kies een herstelzin van minstens 4 woorden.');
        const tekst = await exporteer(state, ctx.dossier.id, w.zin);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([tekst], { type: 'application/json' }));
        a.download = `regelkamer-${ctx.dossier.naam.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${vandaagIso()}.json`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast('Bestand gedownload. Bewaar de herstelzin goed.');
      },
    });
  },
  importeer() {
    dialoog({
      titel: 'Dossierbestand openen',
      knop: 'Open',
      velden: [
        { naam: 'bestand', label: 'Het bestand', soort: 'bestand', accept: '.json,application/json' },
        { naam: 'zin', label: 'Herstelzin', verplicht: true, hint: 'De zin die je bij het bestand hebt gekregen.' },
      ],
      async opslaan(w) {
        if (!w.bestand || !w.bestand.size) throw new Error('Kies eerst het bestand.');
        const d = await importeer(state, await w.bestand.text(), w.zin);
        opslaan();
        ga(`/d/${d.id}/overzicht`);
        toast('Dossier geopend.');
      },
    });
  },

  // Afwikkelen
  'overlijden-start'(ctx) {
    dialoog({
      titel: 'Gecondoleerd',
      knop: 'Start de afwikkeling',
      velden: [
        { naam: 'info', soort: 'info', label: 'Het dossier krijgt een stappenplan, de termijnen voor jullie situatie en voor elk contract een opzegbrief. Alles wat er al staat, blijft.' },
        { naam: 'datum', label: 'Datum van overlijden', soort: 'datum', verplicht: true, waarde: vandaagIso() },
      ],
      opslaan(w) {
        if (w.datum > vandaagIso()) throw new Error('Deze datum ligt in de toekomst.');
        ctx.dossier.status = 'overlijden';
        ctx.dossier.overlijdensdatum = w.datum;
        opslaan();
        ga(`/d/${ctx.dossier.id}/afwikkelen`);
      },
    });
  },
  'overlijden-stop'(ctx) {
    ctx.dossier.status = 'actief';
    ctx.dossier.overlijdensdatum = null;
    klaarEnToon('Teruggezet.');
  },
  'check-vink'(ctx, el) {
    ctx.data.checklist[el.dataset.id] = !ctx.data.checklist[el.dataset.id];
    klaarEnToon('');
  },
  'opzeg-status'(ctx, el) {
    vind(ctx.data.contracten, el.dataset.id).overlijdenStatus = el.dataset.status;
    klaarEnToon('');
  },
  opzegbrief(ctx, el) {
    const c = vind(ctx.data.contracten, el.dataset.id);
    const vorige = sessie.afzender || {};
    dialoog({
      titel: `Brief aan ${c.naam}`,
      knop: 'Maak de brief',
      velden: [
        { naam: 'actie', label: 'Wat wil je?', soort: 'lijst', opties: Object.entries(OPZEG_ACTIES).map(([k, a]) => [k, a.naam]), waarde: c.overlijdenActie || standaardActie(c.soort, { partnerBlijft: !!ctx.dossier.profiel?.partner }) },
        { naam: 'overledene', label: 'Volledige naam van de overledene', verplicht: true, waarde: vorige.overledene, hint: 'Dit bewaren we niet in het dossier.' },
        { naam: 'afzender', label: 'Jouw naam', verplicht: true, waarde: vorige.afzender || ctx.ik?.naam },
        { naam: 'relatie', label: 'Jouw relatie', waarde: vorige.relatie || 'kind en erfgenaam' },
        { naam: 'email', label: 'Jouw e-mailadres of telefoonnummer', waarde: vorige.email },
        { naam: 'klantnummer', label: 'Klant- of polisnummer', waarde: c.klantnummer },
      ],
      opslaan(w, dlg) {
        sessie.afzender = { overledene: w.overledene, afzender: w.afzender, relatie: w.relatie, email: w.email };
        c.overlijdenActie = w.actie;
        opslaan();
        const tekst = opzegBrief({ organisatie: c.naam, actie: w.actie, overledene: { naam: w.overledene, overlijdensdatum: ctx.dossier.overlijdensdatum }, afzender: { naam: w.afzender, relatie: w.relatie, [w.email.includes('@') ? 'email' : 'telefoon']: w.email }, klantnummer: w.klantnummer });
        dlg.remove();
        const d2 = dialoog({
          titel: `Brief aan ${c.naam}`,
          extra: h`<textarea readonly rows="16" style="width:100%;font:inherit;font-size:.92rem" aria-label="Tekst van de brief" data-brief>${tekst}</textarea><p class="f-klein">Zoek op de website van ${c.naam} hoe je een overlijden doorgeeft. Stuur een kopie van de akte van overlijden mee.</p><div class="f-knoppen"><button type="button" class="knop" data-kopieer>Kopieer de tekst</button><button type="button" class="knop-licht" data-afdruk>Print</button></div>`,
        });
        d2.querySelector('[data-kopieer]').addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(tekst);
            toast('Gekopieerd.');
          } catch {
            d2.querySelector('[data-brief]').select();
          }
        });
        d2.querySelector('[data-afdruk]').addEventListener('click', () => {
          const w2 = window.open('', '_blank');
          if (!w2) return;
          const pre = w2.document.createElement('pre');
          pre.style.cssText = 'font:16px/1.6 Georgia,serif;white-space:pre-wrap;max-width:680px;margin:48px auto';
          pre.textContent = tekst;
          w2.document.body.append(pre);
          w2.document.title = `Brief aan ${c.naam}`;
          w2.print();
        });
        return true;
      },
    });
  },

  // Instellingen
  'dossier-naam'(ctx) {
    dialoog({
      titel: 'Naam aanpassen',
      velden: [{ naam: 'naam', label: 'Naam van het dossier', verplicht: true, waarde: ctx.dossier.naam, max: 60 }, { naam: 'geboortejaar', label: 'Geboortejaar', waarde: ctx.dossier.geboortejaar ?? '', max: 4 }],
      opslaan(w) {
        ctx.dossier.naam = w.naam;
        ctx.dossier.geboortejaar = /^(19|20)\d{2}$/.test(w.geboortejaar) ? Number(w.geboortejaar) : null;
        klaarEnToon('Aangepast.');
      },
    });
  },
  'dossier-wis'(ctx) {
    dialoog({
      titel: 'Dossier verwijderen?',
      knop: 'Ja, verwijder alles',
      velden: [{ naam: 'bevestig', label: `Typ de naam van het dossier (${ctx.dossier.naam}) om te bevestigen`, verplicht: true }],
      async opslaan(w) {
        if (w.bevestig.trim().toLowerCase() !== ctx.dossier.naam.trim().toLowerCase()) throw new Error('De naam klopt niet.');
        await verwijderDossier(state, ctx.dossier.id);
        opslaan();
        ga('/');
        toast('Dossier verwijderd.');
      },
    });
  },
};

// ── Gebeurtenissen ──
root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-actie]');
  if (!el || !ACTIES[el.dataset.actie]) return;
  if (el.tagName !== 'A') e.preventDefault();
  Promise.resolve(ACTIES[el.dataset.actie](context(), el)).catch((err) => toast(err.message || 'Dat lukte niet.'));
});

root.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const fd = new FormData(form);
  if (form.dataset.form === 'intake') {
    const v = VRAGEN[sessie.intake.stap];
    const a = v.soort === 'meer' ? fd.getAll('antwoord') : String(fd.get('antwoord') ?? '').trim();
    if (v.soort === 'jaar' && a && !/^(19|20)\d{2}$/.test(a)) return toast('Vul een jaartal in, bijvoorbeeld 1942.');
    if (v.id === 'naam' && !a) return toast('Vul een naam in, bijvoorbeeld Pa of Henk.');
    if (a !== '' && !(Array.isArray(a) && !a.length)) sessie.intake.antwoorden[v.id] = a;
    sessie.intake.stap++;
    render();
    root.querySelector('h1')?.focus?.();
  } else if (form.dataset.form === 'intake-toestemming') {
    const ik = String(fd.get('ik') || '').trim();
    if (!ik) return toast('Vul je naam in.');
    const soort = String(fd.get('toestemming'));
    const a = sessie.intake.antwoorden;
    const dossier = nieuwDossier({ naam: a.naam, geboortejaar: a.geboortejaar, door: ik });
    dossier.profiel = profielUit(a, { toestemming: soort !== 'geen' });
    dossier.toestemming = { soort, datum: vandaagIso(), door: ik };
    const data = legeData();
    data.leden = [{ id: uid(), naam: ik, rol: 'regelaar', ik: true }];
    data.taken = startTaken(dossier.profiel, { geboortejaar: dossier.geboortejaar }).map((t) => ({ id: uid(), titel: t.titel, toelichting: t.toelichting, link: t.link, wie: null, deadline: null, klaar: false, bron: 'intake' }));
    state.dossiers.push(dossier);
    state.data[dossier.id] = data;
    sessie.intake = { stap: 0, antwoorden: {} };
    opslaan();
    if (a.dringend === 'overlijden') {
      ga(`/d/${dossier.id}/afwikkelen`);
    } else ga(`/d/${dossier.id}/overzicht`);
    toast('Het dossier staat klaar. We hebben een paar eerste taken voor je gemaakt.');
  }
});

window.addEventListener('hashchange', () => {
  sessie.ketenOk = null;
  render();
  window.scrollTo({ top: 0 });
  document.getElementById('fa-hoofd')?.focus({ preventScroll: true });
});
render();
