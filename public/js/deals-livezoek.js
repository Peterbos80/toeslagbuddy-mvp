// Gedeeld: één live zoekopdracht naar de Edge Function deals-zoek, met de
// berichten (SSE) één voor één naar opBericht. Zonder Supabase: niets.
import { CONFIG } from './config.js';
import { sseLezer } from './samenvoegen.js';

export const liveAan = () => !!CONFIG.supabaseUrl;

export async function liveZoeken(vraag, opBericht, { timeout = 10000, signal } = {}) {
  if (!CONFIG.supabaseUrl) return { status: 'uit' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  signal?.addEventListener('abort', () => ctrl.abort());
  const lezer = sseLezer(({ event, data }) => data && opBericht(event, data));
  try {
    const r = await fetch(`${CONFIG.supabaseUrl.replace(/\/$/, '')}/functions/v1/deals-zoek`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(CONFIG.supabaseAnonKey ? { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${CONFIG.supabaseAnonKey}` } : {}) },
      body: JSON.stringify(vraag),
      signal: ctrl.signal,
    });
    if (r.status === 429) return { status: 'beperkt' };
    if (!r.ok || !r.body) return { status: 'fout' };
    const rd = r.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { value, done } = await rd.read();
      if (done) break;
      lezer.voeg(dec.decode(value, { stream: true }));
    }
    lezer.einde();
    return { status: 'ok' };
  } catch {
    return { status: 'timeout' };
  } finally {
    clearTimeout(t);
  }
}
