// Instellingen van de site. Pas dit bestand aan voordat je live gaat.
// Lege waarden ('') betekenen: uitgeschakeld. Er wordt dan niets getoond of geladen.

export default {
  naam: 'ToeslagBuddy',
  // Je eigen domein bij TransIP, zonder slash aan het eind.
  url: 'https://www.toeslagbuddy.nl',
  contactEmail: 'info@toeslagbuddy.nl',
  // Waar de site draait: 'github-pages' of 'transip'. Staat in de privacyverklaring.
  hosting: 'github-pages',

  // Bedrijfsgegevens. Wettelijk verplicht op de site (art. 3:15d BW) en
  // gebruikt in de footer, de colofon, de privacyverklaring en de Pro-voorwaarden.
  // Een leeg KvK-nummer geeft een waarschuwing bij het bouwen.
  bedrijf: {
    naam: '', // naam zoals ingeschreven bij de KvK (bijv. je eenmanszaak)
    handelsnaam: 'ToeslagBuddy',
    vestigingsplaats: '', // bijv. 'Utrecht'
    adres: '', // optioneel: volledig vestigingsadres (straat, postcode, plaats); zie docs/compliance-checklist.md
    kvk: '', // KvK-nummer (8 cijfers)
    btwId: '', // btw-identificatienummer (NL…B..), NIET je omzetbelastingnummer
    // Doorgestuurd adres; NOOIT je privé-adres. Alleen info@, privacy@ en security@
    // op toeslagbuddy.nl mogen op de site staan (dat controleert een test).
    email: 'info@toeslagbuddy.nl',
  },

  // Statistieken zonder cookies (geen cookiebanner nodig).
  // Vul bijvoorbeeld je Plausible-domein in, of je GoatCounter-code.
  analytics: {
    plausibleDomain: '',
    goatcounterCode: '',
  },

  // Google AdSense. Laat leeg tot je account is goedgekeurd.
  // Let op: voor advertenties in de EU is een door Google gecertificeerde
  // toestemmingsmelding (CMP) verplicht. Zet in AdSense onder
  // 'Privacy en berichten' de Europese toestemmingsmelding aan.
  adsense: {
    client: '', // bijv. 'ca-pub-1234567890123456'
    slotInhoud: '', // advertentieblok halverwege de pagina
    slotOnder: '', // advertentieblok onder de uitleg
  },

  // Partnerlinks (affiliate). Aanmelden via bijv. Daisycon, TradeTracker of Awin.
  // Een blok wordt alleen getoond als de url is ingevuld.
  partners: {
    zorgverzekering: {
      url: '',
      titel: 'Bespaar op je zorgverzekering',
      tekst: 'Vergelijk alle zorgverzekeringen voor 2027. Overstappen kan tot 31 december.',
      knop: 'Vergelijk zorgverzekeringen',
    },
    energie: {
      url: '',
      titel: 'Vaste lasten omlaag',
      tekst: 'Huurders besparen vaak honderden euro’s per jaar door van energieleverancier te wisselen.',
      knop: 'Vergelijk energie',
    },
    internet: {
      url: '',
      titel: 'Goedkoper internet en tv',
      tekst: 'Check of je bij een andere aanbieder minder betaalt voor hetzelfde abonnement.',
      knop: 'Vergelijk internet',
    },
    belastinghulp: {
      url: '',
      titel: 'Hulp bij je aangifte',
      tekst: 'Laat je aangifte en toeslagen controleren, zodat je niet hoeft terug te betalen.',
      knop: 'Bekijk hulp bij aangifte',
    },
    kinderopvang: {
      url: '',
      titel: 'Kinderopvang vergelijken',
      tekst: 'Zoek opvang in de buurt en vergelijk uurprijzen met het maximum van de toeslag.',
      knop: 'Vergelijk kinderopvang',
    },
  },

  // Supabase (EU, Frankfurt): Pro-accounts, /beheer/ én de formulieren op de
  // site (contact, pilot, abonnement, wachtlijst). Formulieren schrijven naar de
  // tabel berichten; een Edge Function stuurt ze door naar je privé-adres, dat
  // alleen als geheim in Supabase staat. Zie docs/pro-accounts.md en docs/email.md.
  // Leeg = formulieren tonen "mail naar info@toeslagbuddy.nl" en Pro draait
  // alleen als demo (?demo=1). De 'anon key' is bedoeld om publiek te zijn; de
  // beveiliging zit in de databaseregels. Zet hier NOOIT de service_role key.
  pro: {
    supabaseUrl: '', // bijv. 'https://abcdefgh.supabase.co'
    supabaseAnonKey: '',
    proefDagen: 7,
    prijsPerMaand: 99, // minimumprijs per kantoor excl. btw (voor de MRR-schatting in /beheer/)
  },

  // Realistische AI-presentatoren (HeyGen). Kies per persona een stock-avatar
  // en een Nederlandse stem; zie docs/ai-video.md. Leeg = getekende persona.
  video: {
    avatars: {
      buddy: { avatarId: '', voiceId: '' },
      sanne: { avatarId: '', voiceId: '' },
      dani: { avatarId: '', voiceId: '' },
      mo: { avatarId: '', voiceId: '' },
      ilse: { avatarId: '', voiceId: '' },
      karin: { avatarId: '', voiceId: '' },
      henk: { avatarId: '', voiceId: '' },
    },
  },

  // Instagram. De posts worden gemaakt door social/render.js en dagelijks
  // geplaatst door .github/workflows/instagram.yml (zie docs/instagram.md).
  instagram: {
    account: '', // je Instagram-gebruikersnaam zonder @, bijv. 'toeslagbuddy'
    startDatum: '2026-10-05', // maandag waarop de kalender begint
    weken: 6, // 3 posts per week; na 6 weken nieuwe feiten/persona's toevoegen in social/
  },

  // Nieuwsbrief (bijv. MailerLite, Brevo of Laposta). Vul de form-action URL in.
  nieuwsbrief: {
    formAction: '',
    emailVeld: 'email',
  },
};
