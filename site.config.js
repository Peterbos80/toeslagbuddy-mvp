// Instellingen van de site. Pas dit bestand aan voordat je live gaat.
// Lege waarden ('') betekenen: uitgeschakeld. Er wordt dan niets getoond of geladen.

export default {
  naam: 'ToeslagBuddy',
  // Je eigen domein bij TransIP, zonder slash aan het eind.
  url: 'https://www.toeslagbuddy.nl',
  contactEmail: 'info@toeslagbuddy.nl',

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

  // Formulieren (contact, Pro-aanmelding, zzp-wachtlijst) sturen berichten
  // naar jouw eigen e-mail via Web3Forms. Je e-mailadres staat NIET op de site:
  // je koppelt het bij web3forms.com aan een toegangscode (access key) en
  // alleen die code staat hier. Leeg = formulieren tonen een melding.
  formulieren: {
    endpoint: 'https://api.web3forms.com/submit',
    accessKey: '',
  },

  // ToeslagBuddy Pro: inloggen en proefabonnement via Supabase (zie docs/pro-accounts.md).
  // De 'anon key' is bedoeld om publiek te zijn; beveiliging zit in de database-regels.
  pro: {
    supabaseUrl: '', // bijv. 'https://abcdefgh.supabase.co'
    supabaseAnonKey: '',
    proefDagen: 7,
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
