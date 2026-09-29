// Supabase-adapter voor Pro en beheer: inloggen met een 6-cijferige code
// (de link in de mail werkt ook), databasefuncties (RPC) en MFA.
// Fouten krijgen een vaste vorm: e.code (bijv. 'geen_toegang'), e.netwerk
// (server onbereikbaar, R16) of e.sessie (sessie verlopen, R10/R22).
// De demo-adapter in pro-demo.js heeft precies dezelfde vorm.
import { CONFIG } from './config.js';

export const heeftServer = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase?.createClient);

export function normaliseer(error) {
  const m = String(error?.message || error || '');
  const e = new Error(m);
  if (error?.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|load failed|fetch failed|network request failed/i.test(m)) e.netwerk = true;
  else if (/niet_ingelogd|jwt expired|invalid jwt|refresh token|session/i.test(m) || ['PGRST301', 'PGRST303'].includes(error?.code)) e.sessie = true;
  e.code = /^[a-z_]+$/.test(m) ? m : error?.code || 'onbekend';
  return e;
}

export function supabaseAdapter() {
  const db = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
  const terug = `${location.origin}/pro/app/`;
  const verwerk = ({ data, error }) => {
    if (error) throw normaliseer(error);
    return data;
  };
  const probeer = async (f) => {
    try {
      return await f();
    } catch (e) {
      throw normaliseer(e);
    }
  };

  async function rpc(naam, args = {}) {
    const r = await probeer(() => db.rpc(naam, args));
    if (!r.error) return r.data;
    const e = normaliseer(r.error);
    // JWT verlopen tijdens een lange sessie (R22): één keer verversen
    if (e.sessie && e.code !== 'niet_ingelogd') {
      const { error } = await probeer(() => db.auth.refreshSession());
      if (!error) return verwerk(await probeer(() => db.rpc(naam, args)));
    }
    throw e;
  }

  return {
    soort: 'supabase',
    async codeSturen(email, { nieuw = false, gegevens = null, toestaanNieuw = false } = {}) {
      const { error } = await probeer(() =>
        db.auth.signInWithOtp({ email, options: { emailRedirectTo: terug, shouldCreateUser: nieuw || toestaanNieuw, ...(gegevens ? { data: gegevens } : {}) } }),
      );
      if (error) {
        const e = normaliseer(error);
        if (/signups not allowed|user not found/i.test(error.message || '')) e.code = 'geen_account';
        if (error.status === 429) e.code = 'te_veel';
        throw e;
      }
      return {};
    },
    async codeControleren(email, code) {
      const { data, error } = await probeer(() => db.auth.verifyOtp({ email, token: code, type: 'email' }));
      if (error) {
        const e = normaliseer(error);
        if (!e.netwerk) e.code = 'code_onjuist';
        throw e;
      }
      return { id: data.user.id, email: data.user.email };
    },
    async sessie() {
      const { data } = await db.auth.getSession();
      const u = data?.session?.user;
      return u ? { id: u.id, email: u.email } : null;
    },
    async uitloggen() {
      await db.auth.signOut().catch(() => {});
    },
    rpc,
    async controles() {
      return verwerk(
        await probeer(() =>
          db.from('controles').select('id,clienten_band,met_actie,gemist_jaar,risico_jaar,signalen,rekenversie,aangemaakt').order('aangemaakt', { ascending: false }).limit(50),
        ),
      );
    },
    uitnodigingsLink: (token) => `${location.origin}/pro/app/?uitnodiging=${token}`,
    // MFA (TOTP) voor /beheer/
    async aal() {
      const d = verwerk(await probeer(() => db.auth.mfa.getAuthenticatorAssuranceLevel()));
      return { huidig: d.currentLevel, volgend: d.nextLevel };
    },
    async inschrijven() {
      const lijst = verwerk(await probeer(() => db.auth.mfa.listFactors()));
      for (const f of lijst.all || []) if (f.status !== 'verified') await db.auth.mfa.unenroll({ factorId: f.id });
      const d = verwerk(await probeer(() => db.auth.mfa.enroll({ factorType: 'totp', friendlyName: `ToeslagBuddy beheer ${Date.now()}` })));
      return { factorId: d.id, qr: d.totp?.qr_code || null, geheim: d.totp?.secret || '' };
    },
    async factorId() {
      const lijst = verwerk(await probeer(() => db.auth.mfa.listFactors()));
      return lijst.totp?.[0]?.id ?? null;
    },
    async verifieren(factorId, code) {
      const { error } = await probeer(() => db.auth.mfa.challengeAndVerify({ factorId, code }));
      if (error) {
        const e = normaliseer(error);
        if (!e.netwerk) e.code = 'code_onjuist';
        throw e;
      }
    },
  };
}

// Foutcodes van de server in gewone taal
export const FOUTEN = {
  niet_ingelogd: 'Je sessie is verlopen. Log opnieuw in.',
  geen_account: 'We kennen dit e-mailadres niet. Start eerst een gratis proef.',
  code_onjuist: 'Deze code klopt niet of is verlopen. Vraag een nieuwe code aan.',
  te_veel: 'Te veel pogingen. Wacht een paar minuten en probeer het opnieuw.',
  geen_toegang: 'Dit mag je niet (meer). Is je proef verlopen of ben je geen lid meer?',
  geen_lid: 'Je bent geen lid (meer) van een organisatie.',
  geen_eigenaar: 'Alleen de eigenaar van de organisatie kan dit doen.',
  ongeldige_naam: 'Vul een naam in van maximaal 200 tekens.',
  ongeldig_kvk: 'Een KvK-nummer heeft 8 cijfers.',
  ongeldig_email: 'Controleer het e-mailadres.',
  ongeldig: 'De gegevens klopten niet. Probeer het opnieuw.',
  limiet: 'Je hebt het maximum voor vandaag bereikt. Probeer het morgen opnieuw.',
  max_leden: 'Tijdens de proef kan je team uit maximaal 5 personen bestaan.',
  al_lid: 'Dit account hoort al bij een organisatie. Een account kan maar bij één organisatie horen.',
  uitnodiging_ongeldig: 'Deze uitnodigingslink klopt niet. Vraag een nieuwe link aan.',
  uitnodiging_gebruikt: 'Deze uitnodigingslink is al gebruikt.',
  uitnodiging_verlopen: 'Deze uitnodigingslink is verlopen (na 7 dagen). Vraag een nieuwe link aan.',
  uitnodiging_ander_email: 'Deze uitnodiging is voor een ander e-mailadres. Log in met het adres waarop je bent uitgenodigd.',
  eerst_eigendom_overdragen: 'Je bent de eigenaar en er zijn nog andere leden. Maak eerst iemand anders eigenaar.',
  beheerder_geen_organisatie: 'Een beheerdersaccount krijgt geen eigen proef.',
  geen_beheerder: 'Dit account heeft geen beheerdersrechten, of de tweede stap (authenticator-app) ontbreekt.',
  kvk_verplicht: 'Voor een betaald abonnement is een KvK-nummer verplicht. De klant vult dat in bij Account.',
  al_actief: 'Deze organisatie heeft al een actief abonnement.',
  niet_gevonden: 'Deze organisatie bestaat niet (meer).',
};

export const foutTekst = (e) =>
  e?.netwerk ? 'De server is tijdelijk niet bereikbaar. Probeer het straks opnieuw.' : FOUTEN[e?.code] || 'Er ging iets mis. Probeer het opnieuw.';
