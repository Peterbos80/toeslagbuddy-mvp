// Meld-agent: mailt de eigenaar als een alarm (data/deals/alarmen.json) een
// deal vindt MET sterk bewijs (zie bewijsSterk in src/deals/alarm.js).
//   node scripts/deals/meld.js
// Geheimen (GitHub Actions secrets, nooit in de repo): BREVO_API_KEY,
// DEALS_EMAIL. Zonder geheimen: proefdraai → data/deals/concept-meldingen/.
// Gratis Brevo: 300 mails per dag. Wij sturen één digest per ronde en houden
// een dagteller bij; wat niet past, gaat de volgende ronde mee.
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { leesHistorie, leesJson, schrijfJson, DATA } from './opslag.js';
import { bouwIndex, paginaSlugs } from '../../src/deals/dealindex.js';
import { zoekMatches, bewijsSterk, filterMeldingen } from '../../src/deals/alarm.js';
import { maakMeldingMail, bewijsVan } from './mail.js';

// De deal-index zoals de site hem bouwt (zelfde paginanamen)
export function laadIndex(map = DATA, nu = null) {
  const { producten, vluchten } = leesHistorie(map);
  const status = leesJson(join(map, 'status.json'), {});
  const t = nu ?? (Date.parse(status.bijgewerkt || '') || Date.now());
  const slugs = paginaSlugs([...producten.values()]);
  const { deals } = bouwIndex([...producten.values()], [...vluchten.values()], t, { pagina: (r) => `/deals/p/${slugs.get(r.id)}/` });
  for (const d of deals) if (d.soort === 'product') d.paginaSlug = slugs.get(d.id);
  return { deals, producten, vluchten, t };
}

export async function meld({ env = process.env, map = DATA, fetch: f = globalThis.fetch, log = console.log, nu = null, maxPerMail = 10, maxPerDag = 250 } = {}) {
  const { deals, producten, vluchten, t } = laadIndex(map, nu);
  const regels = leesJson(join(map, 'alarmen.json'), { regels: [] }).regels || [];
  const opties = {
    minDagen: Number(env.DEALS_MIN_DAGEN) || 30,
    minWinkels: Number(env.DEALS_MIN_WINKELS) || 2,
    vluchtMinDagen: Number(env.DEALS_VLUCHT_MIN_DAGEN) || 14,
    demoToestaan: env.DEALS_MELD_DEMO === '1',
  };
  const matches = zoekMatches(regels, deals);
  const sterk = matches.filter((m) => bewijsSterk(m.deal, m.regel, opties).sterk);
  const verzondenPad = join(map, 'verzonden.json');
  const verzondenData = leesJson(verzondenPad, {});
  const { _teller: teller = { datum: '', aantal: 0 }, ...verzonden } = verzondenData;
  const vandaag = new Date(t).toISOString().slice(0, 10);
  const vandaagAl = teller.datum === vandaag ? teller.aantal : 0;
  const { nieuw } = filterMeldingen(sterk, verzonden, { nu: t });
  const ronde = nieuw.slice(0, maxPerMail);
  log(`meld: ${matches.length} matches, ${sterk.length} met sterk bewijs, ${nieuw.length} nieuw${nieuw.length > ronde.length ? ` (${nieuw.length - ronde.length} schuiven door naar de volgende ronde)` : ''}`);
  if (!ronde.length) return { verstuurd: 0, proef: false, nieuw: 0 };

  const meldingen = ronde.map((m) => ({ ...m, bewijs: bewijsVan(m.deal, m.deal.soort === 'vlucht' ? vluchten.get(`vlucht-${m.deal.route}`) : producten.get(m.deal.id)) }));
  const siteUrl = env.DEALS_SITE_URL || 'https://www.toeslagbuddy.nl';
  const markeer = () => {
    const bij = filterMeldingen(ronde.flatMap((m) => m.regels.map((regel) => ({ regel, deal: m.deal }))), verzonden, { nu: t }).verzonden;
    schrijfJson(verzondenPad, { ...bij, _teller: { datum: vandaag, aantal: vandaagAl + 1 } }, true);
  };

  if (!env.BREVO_API_KEY || !env.DEALS_EMAIL) {
    // Proefdraai: de mail als bestand (staat in .gitignore), niets versturen
    const mail = maakMeldingMail(meldingen, { naar: 'proefdraai@example.org', siteUrl });
    const dir = join(map, 'concept-meldingen');
    mkdirSync(dir, { recursive: true });
    const naam = `${new Date(t).toISOString().slice(0, 16).replace(/[:T]/g, '-')}.html`;
    writeFileSync(join(dir, naam), mail.htmlContent);
    writeFileSync(join(dir, naam.replace(/\.html$/, '.txt')), `Onderwerp: ${mail.subject}\n\n${mail.textContent}`);
    log(`meld: proefdraai (geen BREVO_API_KEY/DEALS_EMAIL) → ${join('data/deals/concept-meldingen', naam)}`);
    return { verstuurd: 0, proef: true, nieuw: ronde.length, mail };
  }
  if (vandaagAl >= maxPerDag) {
    log('meld: dagquotum bereikt; de deals gaan de volgende dag mee');
    return { verstuurd: 0, proef: false, nieuw: ronde.length, quotum: true };
  }
  const mail = maakMeldingMail(meldingen, { naar: env.DEALS_EMAIL, siteUrl });
  const r = await f('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(mail),
  });
  if (!r.ok) {
    // Geen adres of inhoud in de log; alleen de status. Volgende ronde opnieuw.
    log(`meld: Brevo weigerde de mail (HTTP ${r.status}); volgende ronde opnieuw`);
    return { verstuurd: 0, proef: false, nieuw: ronde.length, fout: r.status };
  }
  markeer();
  log(`meld: 1 mail met ${ronde.length} deal(s) verstuurd`);
  return { verstuurd: 1, proef: false, nieuw: ronde.length };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await meld();
