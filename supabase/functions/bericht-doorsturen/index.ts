// Supabase Edge Function (Deno): stuurt een nieuw bericht uit de tabel
// `berichten` door naar het privé-adres van de beheerder, via Brevo (EU).
//
// Aangeroepen door de database (pg_net-trigger of Database Webhook) met de
// kop `x-webhook-secret`. De functie vertrouwt de inhoud van het verzoek niet:
// ze leest het bericht zelf opnieuw uit de database op id.
//
// Geheimen (Supabase → Edge Functions → Secrets), nooit in de repo:
//   DOORSTUUR_EMAIL  je privé-adres
//   BREVO_API_KEY    API-sleutel van Brevo
//   WEBHOOK_SECRET   lang willekeurig geheim, ook in private.instellingen
// SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zet Supabase zelf.
//
// Lukt versturen niet (bijv. Brevo-quotum op, R27), dan blijft
// doorgestuurd = false en probeert een cronjob het later opnieuw.
import { maakMail, gelijkGeheim, UUID, type Bericht } from './mail.ts';

const antwoord = (status: number, data: Record<string, unknown>) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return antwoord(405, { fout: 'alleen POST' });
  const geheim = Deno.env.get('WEBHOOK_SECRET') ?? '';
  const naar = Deno.env.get('DOORSTUUR_EMAIL') ?? '';
  const brevo = Deno.env.get('BREVO_API_KEY') ?? '';
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const sleutel = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!geheim || !naar || !brevo || !url || !sleutel) return antwoord(500, { fout: 'geheimen ontbreken' });
  if (!(await gelijkGeheim(req.headers.get('x-webhook-secret') ?? '', geheim))) return antwoord(401, { fout: 'niet toegestaan' });

  const body = await req.json().catch(() => null);
  const id = String(body?.bericht_id ?? body?.record?.id ?? '');
  if (!UUID.test(id)) return antwoord(400, { fout: 'ongeldig id' });

  const kop = { apikey: sleutel, Authorization: `Bearer ${sleutel}` };
  const r = await fetch(`${url}/rest/v1/berichten?id=eq.${id}&select=*`, { headers: kop });
  if (!r.ok) return antwoord(502, { fout: 'database niet bereikbaar' });
  const [bericht] = (await r.json()) as (Bericht & { doorgestuurd: boolean })[];
  if (!bericht) return antwoord(404, { fout: 'onbekend bericht' });
  if (bericht.doorgestuurd) return antwoord(200, { ok: true, al: true });

  const mail = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevo, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(maakMail(bericht, naar)),
  });
  if (!mail.ok) {
    // Geen details over het bericht in de logs; alleen de status
    console.error(`Brevo weigerde bericht ${id}: HTTP ${mail.status}`);
    return antwoord(502, { fout: 'versturen mislukt' });
  }

  const klaar = await fetch(`${url}/rest/v1/berichten?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...kop, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ doorgestuurd: true }),
  });
  if (!klaar.ok) console.error(`Bericht ${id} verstuurd, maar niet gemarkeerd: HTTP ${klaar.status}`);
  return antwoord(200, { ok: true });
});
