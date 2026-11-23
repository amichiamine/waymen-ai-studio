import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RACINE = process.cwd();
const PUBLIC_BRANDS = path.join(RACINE, "public/media/brands");
const PUBLIC_MEDIA = path.join(RACINE, "public/media");
const ASSETS_MEDIA = path.join(RACINE, "src/assets");

interface ServiceCard {
  nom: string;
  titre: string;
  brandFile: string;
  couleur: string;
  tag: string;
  sousTitre: string;
}

const CARTES: ServiceCard[] = [
  {
    nom: "service-netflix-premium",
    titre: "Netflix Premium 4K",
    brandFile: "netflix.svg",
    couleur: "#E50914",
    tag: "4K HDR & AUDIO SPATIAL",
    sousTitre: "4 Écrans Simultanés • Profil Privé PIN",
  },
  {
    nom: "service-spotify-premium",
    titre: "Spotify Premium",
    brandFile: "spotify.svg",
    couleur: "#1ED760",
    tag: "MUSIQUE HAUTE FIDÉLITÉ",
    sousTitre: "Écoute Sans Pub • Téléchargement Hors-Ligne",
  },
  {
    nom: "service-youtube-premium",
    titre: "YouTube Premium & Music",
    brandFile: "youtube.svg",
    couleur: "#FF0000",
    tag: "ZERO PUBLICITÉ • BACKGROUND",
    sousTitre: "Accès Intégral YouTube Music Inclus",
  },
  {
    nom: "service-disney-plus",
    titre: "Disney+ Standard & 4K",
    brandFile: "disney.svg",
    couleur: "#0063E5",
    tag: "DISNEY • PIXAR • MARVEL • STAR WARS",
    sousTitre: "Streaming Illimité Haute Résolution",
  },
  {
    nom: "service-apple-music",
    titre: "Apple Music & Services",
    brandFile: "apple.svg",
    couleur: "#FA2D48",
    tag: "LOSSLESS AUDIO & SPATIAL",
    sousTitre: "Catalogue 100 Millions de Titres",
  },
  {
    nom: "service-playstation-plus",
    titre: "PlayStation Plus Essential",
    brandFile: "playstation.svg",
    couleur: "#0070D1",
    tag: "MULTI JOUEUR PS4 & PS5",
    sousTitre: "Jeux Mensuels Inclus • Sauvegarde Cloud",
  },
  {
    nom: "service-xbox-game-pass",
    titre: "Xbox Game Pass Ultimate",
    brandFile: "xbox.svg",
    couleur: "#107C10",
    tag: "XBOX CONSOLE • PC • CLOUD",
    sousTitre: "Accès Intégral Day One & EA Play",
  },
  {
    nom: "service-steam-wallet",
    titre: "Steam Wallet Card ($20)",
    brandFile: "steam.svg",
    couleur: "#66C0F4",
    tag: "RECHARGE OFFICIELLE INSTANTANÉE",
    sousTitre: "Valable sur Tous les Jeux & DLC Steam",
  },
  {
    nom: "service-card-apple",
    titre: "Carte Cadeau Apple ($15)",
    brandFile: "apple.svg",
    couleur: "#A2AAAD",
    tag: "APP STORE & ITUNES",
    sousTitre: "Code d'Activation Immédiat 100% Officiel",
  },
  {
    nom: "service-card-googleplay",
    titre: "Google Play Gift Card ($25)",
    brandFile: "google-play.svg",
    couleur: "#34A853",
    tag: "STORE GOOGLE ANDROID",
    sousTitre: "Jeux, Applications, Livres & Abonnements",
  },
  {
    nom: "service-card-razer-gold",
    titre: "Razer Gold Global ($20)",
    brandFile: "razer.svg",
    couleur: "#00FF00",
    tag: "CRÉDITS JEUX MULTI-PLATEFORMES",
    sousTitre: "Compatible 42 000+ Titres et Jeux",
  },
  {
    nom: "service-card-playstation",
    titre: "PlayStation Store ($20)",
    brandFile: "playstation.svg",
    couleur: "#00439C",
    tag: "PORTE-MONNAIE PLAYSTATION",
    sousTitre: "Crédit Solde Immédiat sur PSN",
  },
  {
    nom: "service-card-xbox",
    titre: "Xbox Gift Card ($20)",
    brandFile: "xbox.svg",
    couleur: "#107C10",
    tag: "CARTE CADEAU MICROSOFT",
    sousTitre: "Jeux, Add-ons & Consoles Microsoft",
  },
];

async function generer() {
  console.log("[visuels] Génération des cartes de produits HD avec vrais logos...");
  const w = 640;
  const h = 480;

  for (const c of CARTES) {
    const brandSvgPath = path.join(PUBLIC_BRANDS, c.brandFile);
    let logoBuf: Buffer;

    if (fs.existsSync(brandSvgPath)) {
      logoBuf = await sharp(brandSvgPath).resize(110, 110, { fit: "contain" }).png().toBuffer();
    } else {
      console.warn(`[visuels] Logo introuvable pour ${c.brandFile}`);
      continue;
    }

    const safeTitre = c.titre.replace(/&/g, "&amp;");
    const safeTag = c.tag.replace(/&/g, "&amp;");
    const safeSousTitre = c.sousTitre.replace(/&/g, "&amp;");

    const fondSvg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0e1322" />
          <stop offset="100%" stop-color="#05070d" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="32%" r="48%">
          <stop offset="0%" stop-color="${c.couleur}" stop-opacity="0.38" />
          <stop offset="100%" stop-color="${c.couleur}" stop-opacity="0" />
        </radialGradient>
      </defs>
      
      <!-- Fond et halo lumineux -->
      <rect width="${w}" height="${h}" fill="url(#bgGrad)" />
      <rect width="${w}" height="${h}" fill="url(#glow)" />
      
      <!-- Bordure premium -->
      <rect x="18" y="18" width="${w - 36}" height="${h - 36}" rx="28" fill="none" stroke="${c.couleur}" stroke-width="2" stroke-opacity="0.45" />

      <!-- Emplacement du logo (cercle de mise en valeur) -->
      <circle cx="${w / 2}" cy="140" r="66" fill="#0b0e1b" stroke="${c.couleur}" stroke-width="2.5" stroke-opacity="0.8" />
      
      <!-- Bloc descriptif inférieur -->
      <g transform="translate(60, 275)">
        <rect x="0" y="-30" width="220" height="30" rx="15" fill="${c.couleur}" fill-opacity="0.22" stroke="${c.couleur}" stroke-opacity="0.6"/>
        <text x="110" y="-10" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#f8fafc" letter-spacing="1.5">${safeTag}</text>
        
        <text x="0" y="32" font-family="system-ui, sans-serif" font-size="30" font-weight="900" fill="#ffffff" letter-spacing="0.3">${safeTitre}</text>
        <text x="0" y="65" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#94a3b8">${safeSousTitre}</text>
        <text x="0" y="94" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#64748b">Activation Instantanée 15 min • Garantie 100% Officielle</text>
      </g>
    </svg>`;

    const fondBuf = await sharp(Buffer.from(fondSvg)).png().toBuffer();

    // Composition : superposition du vrai logo officiel sur le cercle
    const finalWebp = await sharp(fondBuf)
      .composite([
        {
          input: logoBuf,
          left: Math.round(w / 2 - 55),
          top: 85,
        },
      ])
      .webp({ quality: 92 })
      .toBuffer();

    fs.writeFileSync(path.join(PUBLIC_MEDIA, `${c.nom}.webp`), finalWebp);
    fs.writeFileSync(path.join(ASSETS_MEDIA, `${c.nom}.webp`), finalWebp);
    console.log(`[visuels] ✔ ${c.nom}.webp généré en HD.`);
  }
  console.log("[visuels] Fin de génération des cartes.");
}

generer().catch(console.error);
