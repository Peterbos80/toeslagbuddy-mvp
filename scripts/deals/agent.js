// De DealBuddy-agent in één proces: jager → verzamelen → meldingen → jachten.
//   node scripts/deals/agent.js                 één ronde
//   node scripts/deals/agent.js --doorlopend    elke 60 minuten (--interval 30)
//   node scripts/deals/agent.js --alleen-jachten
// Zo kan alles ook draaien op een kleine server (bijv. Oracle Cloud Always
// Free) in plaats van GitHub Actions, zonder iets aan te passen.
//
// Jachten met account (Supabase): SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY
// alleen als geheim op de server/in Actions, nooit in de site.
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DATA, leesJson, schrijfJson, leesHistorie, optoutLijst } from './opslag.js';
import { verzamel } from './verzamel.js';
import { meld, laadIndex } from './meld.js';
import { maakRapport, meldenswaard } from '../../src/deals/rapport.js';
import { maakJachtMail } from './mail.js';

const UUR = 36e5;
const INTERVAL = { uur: UUR, dag: 24 * UUR, week: 7 * 24 * UUR };

// Is een jacht weer aan de beurt? (5 min speling voor de planning)
export const aanDeBeurt = (j, nu) => !j.laatst_gedraaid || nu - Date.parse(j.laatst_gedraaid) >= (INTERVAL[j.frequentie] || INTERVAL.dag) - 5 * 60000;

export async function draaiJachten({ env = process.env, fetch: f = globalThis.fetch, map = DATA, nu = Date.now(), log = console.log, maxMails = 50 } = {}) {
  const url = (env.SUPABASE_URL || '').replace(/\/$/, '');
  const sleutel = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sleutel) {
    log('jachten: geen SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY – jachten met account overgeslagen');
    return { gedraaid: 0, mails: 0 };
  }
  const kop = { apikey: sleutel, Authorization: `Bearer ${sleutel}`, 'Content-Type': 'application/json' };
  const rest = async (pad, opties = {}) => {
    const r = await f(`${url}${pad}`, { ...opties, headers: { ...kop, ...(opties.headers || {}) } });
    if (!r.ok) throw new Error(`HTTP ${r.status} op ${pad.split('?')[0]}`);
    return r.status === 204 ? null : r.json();
  };
  const { deals } = laadIndex(map);
  const jachten = (await rest('/rest/v1/deals_jachten?actief=eq.true&select=id,user_id,omschrijving,criteria,kanaal,frequentie,afmeld_token,laatst_gedraaid,laatst_gemeld')).filter((j) => aanDeBeurt(j, nu));
  const perGebruiker = new Map();
  for (const j of jachten) {
    const [vorig] = await rest(`/rest/v1/deals_rapporten?jacht_id=eq.${j.id}&order=tijd.desc&limit=1&select=rapport`);
    const rapport = maakRapport(j.criteria, deals, { nu });
    const [rij] = await rest('/rest/v1/deals_rapporten', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ jacht_id: j.id, user_id: j.user_id, rapport }) });
    await rest(`/rest/v1/deals_jachten?id=eq.${j.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ laatst_gedraaid: new Date(nu).toISOString() }) });
    // Alleen mailen bij een betekenisvolle verandering of een gehaalde drempel
    if (j.kanaal === 'email' && meldenswaard(vorig?.rapport, rapport)) {
      if (!perGebruiker.has(j.user_id)) perGebruiker.set(j.user_id, []);
      perGebruiker.get(j.user_id).push({ jacht: j, rapport, rapportId: rij?.id });
    }
  }
  let mails = 0;
  const proef = !env.BREVO_API_KEY;
  for (const [userId, items] of perGebruiker) {
    if (mails >= maxMails) {
      log(`jachten: mailgrens van ${maxMails} bereikt; de rest gaat de volgende ronde mee`);
      break;
    }
    const gebruiker = await rest(`/auth/v1/admin/users/${userId}`);
    if (!gebruiker?.email) continue;
    const mail = maakJachtMail(items, { naar: gebruiker.email, siteUrl: env.DEALS_SITE_URL || 'https://www.toeslagbuddy.nl' });
    if (proef) {
      const dir = join(map, 'concept-meldingen');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `jacht-${userId.slice(0, 8)}-${new Date(nu).toISOString().slice(0, 13)}.html`), mail.htmlContent);
    } else {
      const r = await f('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(mail) });
      if (!r.ok) {
        log(`jachten: Brevo weigerde een mail (HTTP ${r.status}); volgende ronde opnieuw`);
        continue;
      }
    }
    mails++;
    for (const it of items) {
      if (it.rapportId) await rest(`/rest/v1/deals_rapporten?id=eq.${it.rapportId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ gemeld: true }) });
      await rest(`/rest/v1/deals_jachten?id=eq.${it.jacht.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ laatst_gemeld: new Date(nu).toISOString() }) });
    }
  }
  log(`jachten: ${jachten.length} gedraaid, ${mails} ${proef ? 'proefmail(s) in concept-meldingen' : 'mail(s) verstuurd'}`);
  return { gedraaid: jachten.length, mails, proef };
}

export async function ronde({ env = process.env, log = console.log, alleenJachten = false } = {}) {
  if (!alleenJachten) {
    let extra = [];
    if (env.DEALS_JAGER === 'aan') {
      const { jaag } = await import('./jager/jager.js');
      const { maakOphaler } = await import('./http.js');
      const cachePad = join(DATA, 'http-cache.json');
      const cache = leesJson(cachePad, {});
      const { winkels } = leesJson(join(DATA, 'winkels.json'), { winkels: [] });
      const { producten } = leesHistorie(DATA);
      const gevolgdeUrls = [...producten.values()].filter((r) => !r.demo).flatMap((r) => Object.values(r.winkels).map((o) => o.url).filter(Boolean));
      const r = await jaag({ winkels, ophaler: maakOphaler({ budget: Number(env.DEALS_JAGER_BUDGET) || 1500, cache, log }), gevolgdeUrls, optout: optoutLijst(DATA), log });
      schrijfJson(cachePad, cache);
      mkdirSync('uit-jager', { recursive: true });
      schrijfJson(join('uit-jager', 'agent.json'), r);
      extra = r.aanbod;
      log(`jager: ${extra.length} prijzen, ${r.verzoeken} verzoeken`);
    }
    await verzamel({ env, log, extraAanbod: extra });
    await meld({ env, log });
  }
  await draaiJachten({ env, log });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const doorlopend = process.argv.includes('--doorlopend');
  const i = process.argv.indexOf('--interval');
  const minuten = i > 0 ? Number(process.argv[i + 1]) || 60 : 60;
  const alleenJachten = process.argv.includes('--alleen-jachten');
  do {
    const start = Date.now();
    try {
      await ronde({ alleenJachten });
    } catch (e) {
      // Een mislukte ronde stopt de agent niet
      console.error(`ronde mislukt: ${e.message}`);
    }
    if (!doorlopend) break;
    const wacht = Math.max(60000, minuten * 60000 - (Date.now() - start));
    console.log(`volgende ronde over ${Math.round(wacht / 60000)} min`);
    await new Promise((r) => setTimeout(r, wacht));
  } while (doorlopend);
}
