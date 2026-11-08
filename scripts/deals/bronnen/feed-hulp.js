// Gedeeld door de affiliate-feeds (Daisycon, TradeTracker, Awin).
// Feed-adressen komen uit een omgevingsvariabele, gescheiden door komma's of
// regels. Optioneel met winkelnaam ervoor: 'Parfumwinkel=https://…'.
import { USER_AGENT } from '../robots.js';

export function feedLijst(waarde) {
  return String(waarde || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^([^=]{1,60})=(https?:\/\/.+)$/);
      return m ? { naam: m[1].trim(), url: m[2] } : { naam: null, url: s };
    })
    .filter((f) => /^https?:\/\//.test(f.url));
}

export const hostNaam = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// Haal alle feeds op; een fout in één feed stopt de rest niet.
// Feeds zijn bedoeld voor partners: geen robots.txt, wel onze User-Agent.
export async function haalFeeds(lijst, context, verwerk) {
  const f = context.fetch || globalThis.fetch;
  const uit = [];
  for (const feed of lijst) {
    try {
      const r = await f(feed.url, { headers: { 'User-Agent': USER_AGENT } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      for (const x of verwerk(await r.text(), { winkel: feed.naam, nu: context.nu, winkelInfo: context.winkelInfo })) uit.push(x);
    } catch (e) {
      context.log?.(`feed ${hostNaam(feed.url)} overgeslagen: ${e.message}`);
      context.fouten?.push({ bron: context.bron, feed: hostNaam(feed.url), fout: e.message });
    }
  }
  return uit;
}

// Gratis-verzenddrempel en standaardverzendkosten uit data/deals/winkels.json
export const winkelExtra = (opties, winkel, url) => {
  const info = opties.winkelInfo?.(winkel, hostNaam(url)) || {};
  return { gratisVerzendingVanaf: info.gratisVerzendingVanaf ?? null, standaardVerzending: info.verzendkosten ?? null };
};

export const waar = (v) => !/^(0|false|nee|no|n|out of stock|niet op voorraad)$/i.test(String(v ?? '').trim());
