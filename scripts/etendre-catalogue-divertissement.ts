import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { Database } from "bun:sqlite";

const RACINE = process.cwd();
const PUBLIC_BRANDS = path.join(RACINE, "public/media/brands");
const ASSETS_BRANDS = path.join(RACINE, "src/assets/brands");
const PUBLIC_MEDIA = path.join(RACINE, "public/media");
const ASSETS_MEDIA = path.join(RACINE, "src/assets");

fs.mkdirSync(PUBLIC_BRANDS, { recursive: true });
fs.mkdirSync(ASSETS_BRANDS, { recursive: true });

// 1. Définition des SVG officiels propres (XML 100% valide, légers, zéro xlink manquant)
const SVGS: Record<string, string> = {
  cursor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#090d16"/>
  <path d="M50 18L78 34V66L50 82L22 66V34L50 18Z" stroke="#38bdf8" stroke-width="4" stroke-linejoin="round"/>
  <path d="M50 18V82" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  <path d="M50 50L78 34" stroke="#38bdf8" stroke-width="3"/>
  <path d="M50 50L22 34" stroke="#38bdf8" stroke-width="3"/>
  <circle cx="50" cy="50" r="5" fill="#f43f5e"/>
</svg>`,

  netflix: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#141414"/>
  <path d="M32 20H42V80H32V20Z" fill="#E50914"/>
  <path d="M58 20H68V80H58V20Z" fill="#E50914"/>
  <path d="M32 20L68 80H58L32 25V20Z" fill="#B81D24"/>
  <path d="M42 20L68 80H58L42 35V20Z" fill="#E50914"/>
</svg>`,

  spotify: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#121212"/>
  <circle cx="50" cy="50" r="32" fill="#1ED760"/>
  <path d="M35 43C45 39 58 40 66 45" stroke="#121212" stroke-width="5" stroke-linecap="round"/>
  <path d="M38 51C46 48 56 49 63 53" stroke="#121212" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M40 59C46 56 54 57 60 60" stroke="#121212" stroke-width="3.5" stroke-linecap="round"/>
</svg>`,

  youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#0f0f0f"/>
  <rect x="20" y="28" width="60" height="44" rx="14" fill="#FF0000"/>
  <path d="M45 40L62 50L45 60V40Z" fill="#FFFFFF"/>
</svg>`,

  disney: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#040714"/>
  <path d="M30 30C45 28 65 35 62 55C60 68 45 70 38 68V78H30V30ZM38 38V60C45 61 54 59 55 52C56 43 46 38 38 38Z" fill="#0063E5"/>
  <path d="M68 45V55H63V60H68V70H73V60H78V55H73V45H68Z" fill="#1CE783"/>
  <path d="M22 68C35 45 65 35 78 40" stroke="#0063E5" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`,

  apple: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#1c1c1e"/>
  <path d="M57.5 29C60.5 25 63 22 62 18C58 18.5 54 21.5 52 24.5C50 27 48.5 30.5 50 32C53.5 32 56 31 57.5 29ZM65.5 52C65.5 44 71.5 40.5 72 40C68 34.5 62 34 60 34C55 33.5 50 37 47.5 37C45 37 40.5 34 36.5 34C31 34 26 37.5 23 43C17.5 52.5 21.5 67 27 75C29.5 79 32.5 83 37 83C41 83 42.5 80.5 47 80.5C51.5 80.5 53 83 57 83C61.5 83 64.5 79 67 75C70.5 70 72 65 72 64.5C71.5 64 65.5 61.5 65.5 52Z" fill="#F5F5F7"/>
</svg>`,

  amazon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#131921"/>
  <path d="M30 40H40V60H30V40ZM60 40H70V60H60V40Z" fill="#FFFFFF"/>
  <path d="M25 68C40 78 60 78 75 66" stroke="#FF9900" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M72 63L78 67L74 73" fill="#FF9900"/>
</svg>`,

  playstation: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#001c3d"/>
  <path d="M48 24V68L60 64V36L48 24Z" fill="#00439C"/>
  <path d="M60 52C68 50 74 53 74 58C74 63 67 66 56 67L48 70V76L58 74C74 72 82 66 82 56C82 46 72 42 60 44V52Z" fill="#0070D1"/>
  <path d="M48 76L38 73C28 70 24 66 24 60C24 54 30 50 40 49L48 48V40L38 42C24 44 16 50 16 61C16 71 26 77 40 80L48 82V76Z" fill="#FFFFFF"/>
</svg>`,

  xbox: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#0e1711"/>
  <circle cx="50" cy="50" r="32" fill="#107C10"/>
  <path d="M32 30C38 38 46 52 50 58C54 52 62 38 68 30C60 24 40 24 32 30ZM24 40C28 48 38 62 45 72C36 73 26 64 24 54V40ZM76 40V54C74 64 64 73 55 72C62 62 72 48 76 40Z" fill="#0e1711"/>
</svg>`,

  steam: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#171a21"/>
  <circle cx="50" cy="50" r="32" fill="#1b2838"/>
  <circle cx="62" cy="40" r="10" stroke="#66c0f4" stroke-width="4.5" fill="none"/>
  <circle cx="40" cy="62" r="6" stroke="#66c0f4" stroke-width="4" fill="none"/>
  <path d="M60 46L44 59L32 55L48 41Z" fill="#66c0f4"/>
</svg>`,

  nintendo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#e60012"/>
  <rect x="18" y="28" width="64" height="44" rx="22" stroke="#FFFFFF" stroke-width="5" fill="none"/>
  <circle cx="38" cy="50" r="7" fill="#FFFFFF"/>
  <circle cx="62" cy="50" r="7" fill="#FFFFFF"/>
</svg>`,

  eaplay: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#ff4747"/>
  <path d="M26 34H74L64 48H36L34 52H62L52 66H26L36 52H26L26 34Z" fill="#FFFFFF"/>
</svg>`,

  googleplay: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#18181b"/>
  <path d="M26 22L58 50L26 78V22Z" fill="#4285F4"/>
  <path d="M68 41L58 50L26 22L68 41Z" fill="#EA4335"/>
  <path d="M26 78L58 50L68 59L26 78Z" fill="#34A853"/>
  <path d="M74 46L68 41L58 50L68 59L74 54C77 52 77 48 74 46Z" fill="#FBBC04"/>
</svg>`,

  razer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#000000"/>
  <path d="M50 20C40 30 35 45 50 55C65 45 60 30 50 20Z" fill="#00FF00"/>
  <path d="M30 45C22 55 30 70 45 68C40 60 38 52 30 45Z" fill="#00FF00"/>
  <path d="M70 45C78 55 70 70 55 68C60 60 62 52 70 45Z" fill="#00FF00"/>
  <circle cx="50" cy="40" r="3" fill="#000000"/>
</svg>`,
};

for (const [id, svg] of Object.entries(SVGS)) {
  fs.writeFileSync(path.join(PUBLIC_BRANDS, `${id}.svg`), svg, "utf8");
  fs.writeFileSync(path.join(ASSETS_BRANDS, `${id}.svg`), svg, "utf8");
  console.log(`✔ SVG généré : ${id}.svg`);
}

// 2. Génération des cartes de produits WebP pour chaque nouveau service
async function genererCarteService(nom: string, titre: string, couleur: string, tag: string) {
  const w = 640;
  const h = 480;
  const safeTitre = titre.replace(/&/g, "&amp;");
  const safeTag = tag.replace(/&/g, "&amp;");
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0f1d" />
        <stop offset="100%" stop-color="#060911" />
      </linearGradient>
      <radialGradient id="gSpot" cx="50%" cy="35%" r="50%">
        <stop offset="0%" stop-color="${couleur}" stop-opacity="0.32" />
        <stop offset="100%" stop-color="${couleur}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#gBg)" />
    <rect width="${w}" height="${h}" fill="url(#gSpot)" />
    <rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="24" fill="none" stroke="${couleur}" stroke-width="2" stroke-opacity="0.4" />
    
    <g transform="translate(60, 260)">
      <rect x="0" y="-30" width="160" height="32" rx="16" fill="${couleur}" fill-opacity="0.2" stroke="${couleur}" stroke-opacity="0.5"/>
      <text x="80" y="-10" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#f8fafc" letter-spacing="1.5">${safeTag}</text>
      
      <text x="0" y="35" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="0.5">${safeTitre}</text>
      <text x="0" y="70" font-family="system-ui, sans-serif" font-size="16" font-weight="500" fill="#94a3b8">Activation Immédiate • Garantie 100% • Support 7j/7</text>
    </g>
    
    <circle cx="${w / 2}" cy="130" r="54" fill="#0d1424" stroke="${couleur}" stroke-width="2" stroke-opacity="0.6"/>
  </svg>`;

  const buf = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
  fs.writeFileSync(path.join(PUBLIC_MEDIA, `${nom}.webp`), buf);
  fs.writeFileSync(path.join(ASSETS_MEDIA, `${nom}.webp`), buf);
}

const NOUVEAUX_SERVICES = [
  {
    nom: "service-netflix-premium",
    titre: "Netflix 4K UHD",
    couleur: "#E50914",
    tag: "STREAMING 4K",
  },
  {
    nom: "service-spotify-premium",
    titre: "Spotify Premium",
    couleur: "#1ED760",
    tag: "MUSIQUE ILLIMITÉE",
  },
  {
    nom: "service-youtube-premium",
    titre: "YouTube Premium",
    couleur: "#FF0000",
    tag: "SANS PUBLICITÉ",
  },
  {
    nom: "service-disney-plus",
    titre: "Disney+ Standard",
    couleur: "#0063E5",
    tag: "FILMS & SÉRIES",
  },
  { nom: "service-apple-music", titre: "Apple Music", couleur: "#FA2D48", tag: "AUDIO LOSSLESS" },
  {
    nom: "service-amazon-prime",
    titre: "Prime Video",
    couleur: "#00A8E1",
    tag: "VIDÉO À LA DEMANDE",
  },
  {
    nom: "service-playstation-plus",
    titre: "PlayStation Plus",
    couleur: "#0070D1",
    tag: "CONSOLE GAMING",
  },
  {
    nom: "service-xbox-game-pass",
    titre: "Xbox Game Pass",
    couleur: "#107C10",
    tag: "PC & XBOX CLOUD",
  },
  {
    nom: "service-steam-wallet",
    titre: "Steam Wallet",
    couleur: "#66C0F4",
    tag: "RECHARGE INSTANT",
  },
  {
    nom: "service-nintendo-online",
    titre: "Nintendo Online",
    couleur: "#E60012",
    tag: "SWITCH MULTI",
  },
  { nom: "service-ea-play-pro", titre: "EA Play Pro", couleur: "#FF4747", tag: "CATALOGUE EA" },
  {
    nom: "service-card-apple",
    titre: "Apple Gift Card",
    couleur: "#A2AAAD",
    tag: "APP STORE / ITUNES",
  },
  {
    nom: "service-card-googleplay",
    titre: "Google Play Card",
    couleur: "#34A853",
    tag: "JEUX & APPS",
  },
  {
    nom: "service-card-playstation",
    titre: "PS Store Card",
    couleur: "#00439C",
    tag: "PORTE-MONNAIE PSN",
  },
  { nom: "service-card-xbox", titre: "Xbox Gift Card", couleur: "#107C10", tag: "MICROSOFT STORE" },
  {
    nom: "service-card-razer-gold",
    titre: "Razer Gold PIN",
    couleur: "#00FF00",
    tag: "CREDITS GAMING",
  },
];

for (const s of NOUVEAUX_SERVICES) {
  await genererCarteService(s.nom, s.titre, s.couleur, s.tag);
  console.log(`✔ Carte service générée : ${s.nom}.webp`);
}

// 3. Injection dans la base de données SQLite active
console.log("=== SYNCHRONISATION SQLITE ===");
const sqliteGlob = new Bun.Glob("katech-data/*.sqlite");
const sqliteFile = sqliteGlob.scanSync().next().value;
if (sqliteFile) {
  const db = new Database(sqliteFile);

  // Insertion des marques
  const insertBrand = db.prepare("INSERT OR REPLACE INTO brands (id, name, logo) VALUES (?, ?, ?)");
  const brandsData = [
    ["netflix", "Netflix", "media/brands/netflix.svg"],
    ["spotify", "Spotify", "media/brands/spotify.svg"],
    ["youtube", "YouTube", "media/brands/youtube.svg"],
    ["disney", "Disney+", "media/brands/disney.svg"],
    ["apple", "Apple", "media/brands/apple.svg"],
    ["amazon", "Amazon", "media/brands/amazon.svg"],
    ["playstation", "Sony PlayStation", "media/brands/playstation.svg"],
    ["xbox", "Xbox", "media/brands/xbox.svg"],
    ["steam", "Steam", "media/brands/steam.svg"],
    ["nintendo", "Nintendo", "media/brands/nintendo.svg"],
    ["eaplay", "EA Play", "media/brands/eaplay.svg"],
    ["googleplay", "Google Play", "media/brands/googleplay.svg"],
    ["razer", "Razer", "media/brands/razer.svg"],
    ["cursor", "Cursor", "media/brands/cursor.svg"],
  ];
  for (const [id, name, logo] of brandsData) {
    insertBrand.run(id, name, logo);
  }
  console.log(`✔ ${brandsData.length} marques enregistrées en base SQLite`);

  // Insertion des catégories
  const insertCategory = db.prepare(
    "INSERT OR REPLACE INTO categories (id, name, description, icon) VALUES (?, ?, ?, ?)",
  );
  const categoriesData = [
    [
      "streaming-medias",
      JSON.stringify({
        fr: "Streaming & Médias",
        en: "Streaming & Media",
        ar: "البث المباشر والوسائط",
      }),
      JSON.stringify({
        fr: "Abonnements officiels Netflix 4K, Spotify Premium, YouTube Premium, Disney+ et Apple Music.",
        en: "Official Netflix 4K, Spotify Premium, YouTube Premium, Disney+ & Apple Music subscriptions.",
        ar: "اشتراكات رسمية في نتفليكس 4K، سبوتيفاي بريميوم، يوتيوب بريميوم، ديزني+ وآبل ميوزك.",
      }),
      "Tv",
    ],
    [
      "gaming-consoles",
      JSON.stringify({
        fr: "Gaming & Consoles / PC",
        en: "Gaming & Consoles / PC",
        ar: "الألعاب والمنصات / الكمبيوتر",
      }),
      JSON.stringify({
        fr: "Activations PlayStation Plus, Xbox Game Pass Ultimate, Steam Wallet et Nintendo Switch Online.",
        en: "PlayStation Plus, Xbox Game Pass Ultimate, Steam Wallet & Nintendo Switch Online activations.",
        ar: "تفعيلات بلايستيشن بلس، إكس بوكس غيم باس، شحن ستيم ونينتندو سويتش أونلاين.",
      }),
      "Gamepad2",
    ],
    [
      "cartes-cadeaux",
      JSON.stringify({
        fr: "Cartes Cadeaux & Recharges",
        en: "Gift Cards & Top-ups",
        ar: "بطاقات الهدايا والشحن",
      }),
      JSON.stringify({
        fr: "Recharges Apple Gift Card, Google Play, PlayStation Store, Xbox Card et Razer Gold.",
        en: "Apple Gift Card, Google Play, PlayStation Store, Xbox Card & Razer Gold top-ups.",
        ar: "بطاقات شحن آبل، غوغل بلاي، متجر بلايستيشن، إكس بوكس ورايزر غولد.",
      }),
      "CreditCard",
    ],
  ];
  for (const [id, name, desc, icon] of categoriesData) {
    insertCategory.run(id, name, desc, icon);
  }
  console.log("✔ 3 nouvelles catégories enregistrées en base SQLite");

  // Insertion des nouveaux produits
  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products (
      id, name, description, price, category_id, brand_id, images, in_stock, rating, reviews_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const nouveauxProduits = [
    // STREAMING
    [
      "netflix-premium-4k",
      JSON.stringify({
        fr: "Abonnement Netflix Premium 4K UHD",
        en: "Netflix Premium 4K UHD Subscription",
        ar: "اشتراك نتفليكس بريميوم 4K UHD",
      }),
      JSON.stringify({
        fr: "Accès complet 4K HDR avec son spatial, 4 écrans simultanés, profil privé avec code PIN. Activation sous 15 minutes.",
        en: "Full 4K HDR access with spatial audio, 4 simultaneous screens, private profile with PIN. Activated within 15 minutes.",
        ar: "وصول كامل بدقة 4K HDR مع صوت مكاني، 4 شاشات متزامنة، ملف شخصي برقم سري خاص. تفعيل خلال 15 دقيقة.",
      }),
      1400,
      "streaming-medias",
      "netflix",
      JSON.stringify(["media/service-netflix-premium.webp"]),
      1,
      4.9,
      142,
    ],
    [
      "spotify-premium-1m",
      JSON.stringify({
        fr: "Spotify Premium Individuel & Famille",
        en: "Spotify Premium Individual & Family",
        ar: "سبوتيفاي بريميوم فردي وعائلي",
      }),
      JSON.stringify({
        fr: "Musique illimitée sans publicité, écoute hors ligne en très haute qualité sonore, zapping illimité sur tous vos appareils.",
        en: "Unlimited ad-free music, offline listening in high quality, unlimited skips across all devices.",
        ar: "موسيقى غير محدودة بدون إعلانات، استماع بدون إنترنت بجودة عالية جداً، وتخطي غير محدود على جميع أجهزتك.",
      }),
      950,
      "streaming-medias",
      "spotify",
      JSON.stringify(["media/service-spotify-premium.webp"]),
      1,
      4.8,
      98,
    ],
    [
      "youtube-premium-1m",
      JSON.stringify({
        fr: "YouTube Premium + YouTube Music",
        en: "YouTube Premium + YouTube Music",
        ar: "يوتيوب بريميوم + يوتيوب ميوزك",
      }),
      JSON.stringify({
        fr: "Zéro publicité sur YouTube, lecture en arrière-plan écran éteint, téléchargements hors ligne et accès complet YouTube Music.",
        en: "Zero ads on YouTube, background play with screen off, offline downloads and full YouTube Music access.",
        ar: "بدون إعلانات على يوتيوب، تشغيل في الخلفية مع قفل الشاشة، تنزيلات للمشاهدة بدون إنترنت ووصول كامل لتطبيق يوتيوب ميوزك.",
      }),
      1200,
      "streaming-medias",
      "youtube",
      JSON.stringify(["media/service-youtube-premium.webp"]),
      1,
      4.9,
      115,
    ],
    [
      "disney-plus-1m",
      JSON.stringify({
        fr: "Disney+ Standard & Premium",
        en: "Disney+ Standard & Premium",
        ar: "ديزني بلس ستاندرد وبريميوم",
      }),
      JSON.stringify({
        fr: "Tous les univers Disney, Pixar, Marvel, Star Wars, National Geographic et Star en streaming illimité haute définition.",
        en: "All Disney, Pixar, Marvel, Star Wars, National Geographic and Star worlds in unlimited high-definition streaming.",
        ar: "عوالم ديزني، بيكسار، مارفل، حرب النجوم، ناشيونال جيوغرافيك وستار في بث غير محدود بدقة عالية.",
      }),
      1500,
      "streaming-medias",
      "disney",
      JSON.stringify(["media/service-disney-plus.webp"]),
      1,
      4.8,
      64,
    ],

    // GAMING
    [
      "ps-plus-essential-1m",
      JSON.stringify({
        fr: "PlayStation Plus Essential / Extra",
        en: "PlayStation Plus Essential / Extra",
        ar: "بلايستيشن بلس إسنشل / إكسترا",
      }),
      JSON.stringify({
        fr: "Multijoueur en ligne PS4/PS5, jeux mensuels offerts, réductions exclusives PlayStation Store et catalogue de jeux Extra.",
        en: "Online multiplayer on PS4/PS5, free monthly games, exclusive PlayStation Store discounts and Extra game catalog.",
        ar: "ألعاب جماعية أونلاين على PS4/PS5، ألعاب شهرية مجانية، خصومات حصرية على متجر بلايستيشن وكتالوج ألعاب إكسترا.",
      }),
      2500,
      "gaming-consoles",
      "playstation",
      JSON.stringify(["media/service-playstation-plus.webp"]),
      1,
      4.9,
      87,
    ],
    [
      "xbox-game-pass-ultimate",
      JSON.stringify({
        fr: "Xbox Game Pass Ultimate (PC & Console)",
        en: "Xbox Game Pass Ultimate (PC & Console)",
        ar: "إكس بوكس غيم باس ألتيميت (كمبيوتر ومنصات)",
      }),
      JSON.stringify({
        fr: "Accès à plus de 400 jeux de premier plan sur PC, Xbox et Cloud Gaming, incluant EA Play et les sorties Day One.",
        en: "Access to 400+ premier games on PC, Xbox & Cloud Gaming, including EA Play and Day One releases.",
        ar: "وصول إلى أكثر من 400 لعبة رائدة على الكمبيوتر وإكس بوكس وسحابة اللعب، بما في ذلك EA Play وإصدارات اليوم الأول.",
      }),
      2900,
      "gaming-consoles",
      "xbox",
      JSON.stringify(["media/service-xbox-game-pass.webp"]),
      1,
      4.9,
      134,
    ],
    [
      "steam-wallet-20usd",
      JSON.stringify({
        fr: "Carte Steam Wallet 20$ USD (Recharge)",
        en: "Steam Wallet Card $20 USD (Top-up)",
        ar: "بطاقة ستيم 20 دولار (شحن المحفظة)",
      }),
      JSON.stringify({
        fr: "Code numérique officiel pour créditer instantanément votre compte Steam. Valable pour tous les jeux, DLC et contenus du store.",
        en: "Official digital code to top up your Steam wallet instantly. Valid for all games, DLCs and community market items.",
        ar: "كود رقمي رسمي لشحن محفظة ستيم الخاصة بك فوراً. صالح لجميع الألعاب والإضافات ومحتويات المتجر.",
      }),
      4700,
      "gaming-consoles",
      "steam",
      JSON.stringify(["media/service-steam-wallet.webp"]),
      1,
      5.0,
      210,
    ],

    // CARTES CADEAUX
    [
      "apple-gift-card-15",
      JSON.stringify({
        fr: "Apple Gift Card 15$ (App Store & iTunes)",
        en: "Apple Gift Card $15 (App Store & iTunes)",
        ar: "بطاقة آبل 15 دولار (آب ستور وآيتونز)",
      }),
      JSON.stringify({
        fr: "Rechargez votre solde Apple pour vos applications, abonnements iCloud+, Apple Arcade, livres et contenus multimédias.",
        en: "Top up your Apple account for apps, iCloud+ storage, Apple Arcade, books and media purchases.",
        ar: "اشحن رصيد حسابك على آبل لتطبيقاتك، اشتراكات iCloud+، آبل آركيد والمحتويات الرقمية.",
      }),
      3600,
      "cartes-cadeaux",
      "apple",
      JSON.stringify(["media/service-card-apple.webp"]),
      1,
      4.9,
      76,
    ],
    [
      "google-play-card-25",
      JSON.stringify({
        fr: "Google Play Gift Card 25$ USD",
        en: "Google Play Gift Card $25 USD",
        ar: "بطاقة غوغل بلاي 25 دولار",
      }),
      JSON.stringify({
        fr: "Code de recharge Google Play Store US pour acheter des jeux, diamants Free Fire, pièces TikTok et applications Android.",
        en: "Google Play Store US top-up code to buy games, in-game currencies and Android premium apps.",
        ar: "كود شحن متجر غوغل بلاي الأمريكي لشراء الألعاب والعملات الرقمية للألعاب وتطبيقات أندرويد.",
      }),
      5800,
      "cartes-cadeaux",
      "googleplay",
      JSON.stringify(["media/service-card-googleplay.webp"]),
      1,
      4.8,
      92,
    ],
    [
      "razer-gold-20",
      JSON.stringify({
        fr: "Razer Gold PIN 20$ USD",
        en: "Razer Gold PIN $20 USD",
        ar: "بطاقة رايزر غولد 20 دولار",
      }),
      JSON.stringify({
        fr: "Crédits virtuels universels pour plus de 42 000 jeux et contenus numériques mondiaux (PUBG Mobile, Roblox, Genshin Impact).",
        en: "Universal virtual credits for over 42,000 games and entertainment titles worldwide.",
        ar: "رصيد افتراضي عالمي لأكثر من 42,000 لعبة ومحتوى ترفيهي رقمي حول العالم.",
      }),
      4700,
      "cartes-cadeaux",
      "razer",
      JSON.stringify(["media/service-card-razer-gold.webp"]),
      1,
      4.9,
      58,
    ],
  ];

  for (const p of nouveauxProduits) {
    insertProduct.run(...p);
  }
  console.log(
    `✔ ${nouveauxProduits.length} nouveaux produits de streaming, gaming et cartes cadeaux insérés dans SQLite !`,
  );
}
