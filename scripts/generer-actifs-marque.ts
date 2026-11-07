import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RACINE = process.cwd();
const SRC_LOGO = path.join(RACINE, "logo-StacGate.png");
const SRC_SIGNATURE = path.join(RACINE, "Signature-ArchiSys30.png");

async function main() {
  console.log("=== GÉNÉRATION DES ACTIFS MULTIFORMATS STACGATE & ARCHISYS ===");

  if (!fs.existsSync(SRC_LOGO)) {
    throw new Error(`Logo source manquant : ${SRC_LOGO}`);
  }
  if (!fs.existsSync(SRC_SIGNATURE)) {
    throw new Error(`Signature source manquante : ${SRC_SIGNATURE}`);
  }

  // 1. Génération des icônes Apple Touch & PWA Hybrides (StacGate Platform × ArchiSys3.0)
  console.log("[1/6] Génération des icônes PWA et mobiles hybrides (StacGate × ArchiSys3.0)…");
  const iconSize = 512;
  const logoIconBuf = await sharp(SRC_LOGO)
    .resize(290, 290, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const roundedCornersSig = Buffer.from(
    '<svg><rect x="0" y="0" width="310" height="92" rx="16" ry="16"/></svg>',
  );
  const sigIconBuf = await sharp(SRC_SIGNATURE)
    .resize(310, 92, { fit: "cover" })
    .composite([{ input: roundedCornersSig, blend: "dest-in" }])
    .png()
    .toBuffer();

  const svgIconBase = `
  <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0f1d" />
        <stop offset="100%" stop-color="#05070b" />
      </linearGradient>
      <linearGradient id="iconBorder" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.6" />
        <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.7" />
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.6" />
      </linearGradient>
    </defs>
    <rect width="${iconSize}" height="${iconSize}" rx="108" fill="url(#iconBg)"/>
    <rect x="4" y="4" width="${iconSize - 8}" height="${iconSize - 8}" rx="104" fill="none" stroke="url(#iconBorder)" stroke-width="4"/>
    <rect x="96" y="365" width="320" height="102" rx="20" fill="#080c14" stroke="#38bdf8" stroke-width="2" stroke-opacity="0.5"/>
  </svg>`;

  const masterIconBuf = await sharp(Buffer.from(svgIconBase))
    .composite([
      { input: logoIconBuf, top: 48, left: 111 },
      { input: sigIconBuf, top: 370, left: 101 },
    ])
    .png()
    .toBuffer();

  await sharp(masterIconBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(RACINE, "public/icone-512.png"));

  await sharp(masterIconBuf)
    .resize(192, 192)
    .png()
    .toFile(path.join(RACINE, "public/icone-192.png"));

  await sharp(masterIconBuf)
    .resize(180, 180)
    .png()
    .toFile(path.join(RACINE, "public/apple-touch-icon.png"));

  // 2. Génération de favicon.ico multi-tailles (16, 32, 48) depuis l'icône hybride
  console.log("[2/6] Génération de public/favicon.ico multi-tailles (16, 32, 48)…");
  const icoSizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    icoSizes.map((s) => sharp(masterIconBuf).resize(s, s, { fit: "contain" }).png().toBuffer()),
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type 1 = icône
  header.writeUInt16LE(icoSizes.length, 4); // nb d'images

  let offset = 6 + icoSizes.length * 16;
  const dirEntries: Buffer[] = [];
  for (let i = 0; i < icoSizes.length; i++) {
    const s = icoSizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s === 256 ? 0 : s, 0);
    entry.writeUInt8(s === 256 ? 0 : s, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // réservé
    entry.writeUInt16LE(1, 4); // plans de couleur
    entry.writeUInt16LE(32, 6); // bits par pixel
    entry.writeUInt32LE(buf.length, 8); // taille données
    entry.writeUInt32LE(offset, 12); // offset dans le fichier
    dirEntries.push(entry);
    offset += buf.length;
  }
  const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
  fs.writeFileSync(path.join(RACINE, "public/favicon.ico"), icoBuffer);

  // 3. Génération de public/favicon.svg hybride haute définition
  console.log("[3/6] Génération de public/favicon.svg hybride haute définition…");
  const logoFaviconBuf = await sharp(SRC_LOGO)
    .resize(44, 44, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const sigFaviconBuf = await sharp(SRC_SIGNATURE)
    .resize(28, 14, { fit: "cover" })
    .png()
    .toBuffer();
  const logoFaviconB64 = logoFaviconBuf.toString("base64");
  const sigFaviconB64 = sigFaviconBuf.toString("base64");

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="StacGate Platform × ArchiSys3.0">
  <defs>
    <linearGradient id="favBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1d" />
      <stop offset="100%" stop-color="#05070b" />
    </linearGradient>
    <linearGradient id="favBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#favBg)" stroke="url(#favBorder)" stroke-width="1.5"/>
  <image href="data:image/png;base64,${logoFaviconB64}" width="42" height="42" x="11" y="4" preserveAspectRatio="xMidYMid meet"/>
  <rect x="14" y="46" width="36" height="14" rx="4" fill="#080c14" stroke="#38bdf8" stroke-width="1"/>
  <image href="data:image/png;base64,${sigFaviconB64}" width="32" height="12" x="16" y="47" preserveAspectRatio="xMidYMid meet"/>
</svg>\n`;
  fs.writeFileSync(path.join(RACINE, "public/favicon.svg"), faviconSvg, "utf8");

  // 4. Génération des versions WebP légères pour le front & médiathèque
  console.log("[4/6] Génération des versions WebP légères du logo…");
  await sharp(SRC_LOGO)
    .webp({ quality: 90 })
    .toFile(path.join(RACINE, "src/assets/stacgate-logo.webp"));

  await sharp(SRC_LOGO)
    .webp({ quality: 90 })
    .toFile(path.join(RACINE, "public/media/stacgate-logo.webp"));

  // 5. Composition de la Bannière Hybride 1200 × 630 px (public/og-image.png & WebP)
  console.log("[5/6] Composition de l'image hybride StacGate × ArchiSys3.0 (1200 × 630)…");
  const bannerW = 1200;
  const bannerH = 630;

  // Préparation du logo StacGate redimensionné (hauteur ~230px)
  const logoBannerBuf = await sharp(SRC_LOGO)
    .resize(230, 230, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Préparation de la signature ArchiSys3.0 avec coins adoucis et bordure subtile
  const sigBannerBuf = await sharp(SRC_SIGNATURE)
    .resize(240, 240, { fit: "contain" })
    .png()
    .toBuffer();

  // Fond SVG textuel et décoratif haute définition
  const svgOverlay = `
  <svg width="${bannerW}" height="${bannerH}" viewBox="0 0 ${bannerW} ${bannerH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#080b11" />
        <stop offset="50%" stop-color="#0e1522" />
        <stop offset="100%" stop-color="#06080d" />
      </linearGradient>
      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8" />
        <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8" />
      </linearGradient>
      <radialGradient id="leftGlow" cx="20%" cy="30%" r="40%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="rightGlow" cx="80%" cy="50%" r="40%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Fond & lueurs ambiantes -->
    <rect width="${bannerW}" height="${bannerH}" fill="url(#bgGrad)"/>
    <rect width="${bannerW}" height="${bannerH}" fill="url(#leftGlow)"/>
    <rect width="${bannerW}" height="${bannerH}" fill="url(#rightGlow)"/>

    <!-- Cadre extérieur haute couture -->
    <rect x="20" y="20" width="1160" height="590" rx="24" fill="none" stroke="url(#glowGrad)" stroke-width="1.5" stroke-opacity="0.35"/>

    <!-- Séparateur vertical central élégant -->
    <line x1="720" y1="90" x2="720" y2="520" stroke="#334155" stroke-width="1.5" stroke-dasharray="6,6" stroke-opacity="0.6"/>

    <!-- Typographie Côté Gauche (Plateforme) -->
    <g transform="translate(340, 235)">
      <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" fill="#f8fafc" letter-spacing="1">STACGATE PLATFORM</text>
      <text x="0" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="600" fill="#94a3b8">Plateforme E-Commerce, Vitrines tous produits</text>
      <text x="0" y="74" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="400" fill="#64748b">Vente en ligne, gestion unifiée, multi-commerces &amp; universelle</text>

      <!-- Badges de spécifications techniques -->
      <g transform="translate(0, 115)">
        <rect x="0" y="0" width="110" height="30" rx="15" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6" stroke-opacity="0.3"/>
        <text x="55" y="19" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#60a5fa">REACT 19</text>

        <rect x="122" y="0" width="125" height="30" rx="15" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-opacity="0.3"/>
        <text x="184" y="19" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#c084fc">WHITE-LABEL</text>

        <rect x="259" y="0" width="105" height="30" rx="15" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.3"/>
        <text x="311" y="19" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#34d399">SQLITE BD</text>
      </g>
    </g>

    <!-- Typographie Côté Droit (Architecture & Signature ArchiSys3.0) -->
    <g transform="translate(950, 145)" text-anchor="middle">
      <rect x="-190" y="-30" width="380" height="32" rx="16" fill="#1e293b" fill-opacity="0.8" stroke="#475569" stroke-opacity="0.4"/>
      <text x="0" y="-9" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="#38bdf8" letter-spacing="1.5">CONCEPTION &amp; ARCHITECTURE R&amp;D</text>

      <text x="0" y="325" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="#f1f5f9" letter-spacing="0.5">ArchiSys3.0</text>
      <text x="0" y="352" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#94a3b8">Architecte Décideur, Directeur &amp; Concepteur</text>
    </g>

    <!-- Pied de bannière discret -->
    <text x="600" y="585" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#475569">
      Socle Technologique Universel • Conçu &amp; Validé pour Tout Déploiement • © 2026
    </text>
  </svg>`;

  // Assemblage Sharp de la bannière
  await sharp(Buffer.from(svgOverlay))
    .composite([
      { input: logoBannerBuf, top: 195, left: 75 },
      { input: sigBannerBuf, top: 190, left: 830 },
    ])
    .png()
    .toFile(path.join(RACINE, "public/og-image.png"));

  await sharp(path.join(RACINE, "public/og-image.png"))
    .webp({ quality: 92 })
    .toFile(path.join(RACINE, "src/assets/stacgate-archisys-banner.webp"));

  // 5 bis. Composition du Logo Combiné Horizontal Officiel pour Header & Footer (760 × 160)
  console.log("[5b/6] Composition du logo horizontal unifié StacGate × ArchiSys3.0 (760 × 160)…");
  const combW = 760;
  const combH = 160;
  const logoCombBuf = await sharp(SRC_LOGO)
    .resize(130, 130, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const roundedCorners = Buffer.from(
    '<svg><rect x="0" y="0" width="130" height="130" rx="16" ry="16"/></svg>',
  );
  const sigCombBuf = await sharp(SRC_SIGNATURE)
    .resize(130, 130, { fit: "cover" })
    .composite([{ input: roundedCorners, blend: "dest-in" }])
    .png()
    .toBuffer();

  const svgCombOverlay = `
  <svg width="${combW}" height="${combH}" viewBox="0 0 ${combW} ${combH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="capsuleBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#080c14" />
        <stop offset="100%" stop-color="#05070b" />
      </linearGradient>
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.4" />
        <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.4" />
      </linearGradient>
      <linearGradient id="divGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.1" />
        <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.1" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="${combW - 4}" height="${combH - 4}" rx="24" fill="url(#capsuleBg)" stroke="url(#borderGrad)" stroke-width="1.5"/>
    <g transform="translate(160, 72)">
      <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" letter-spacing="1.2">STACGATE</text>
      <text x="0" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#38bdf8" letter-spacing="2.8">PLATFORM</text>
    </g>
    <line x1="355" y1="28" x2="355" y2="132" stroke="url(#divGrad)" stroke-width="2" stroke-linecap="round"/>
    <g transform="translate(380, 58)">
      <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="1.8">CONÇU &amp; VALIDÉ PAR</text>
      <text x="0" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900" fill="#38bdf8" letter-spacing="0.5">ArchiSys3.0</text>
      <text x="0" y="47" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="600" fill="#64748b" letter-spacing="1.2">DIRECTION TECHNIQUE &amp; R&amp;D</text>
    </g>
  </svg>`;

  const combComposite = sharp(Buffer.from(svgCombOverlay)).composite([
    { input: logoCombBuf, top: 15, left: 16 },
    { input: sigCombBuf, top: 15, left: 614 },
  ]);

  // 1. Format WebP haute qualité
  await combComposite
    .clone()
    .webp({ quality: 95 })
    .toFile(path.join(RACINE, "src/assets/stacgate-archisys-combined.webp"));
  await combComposite
    .clone()
    .webp({ quality: 95 })
    .toFile(path.join(RACINE, "public/media/stacgate-archisys-combined.webp"));

  // 2. Format PNG 32-bit transparent haute fidélité
  await combComposite
    .clone()
    .png()
    .toFile(path.join(RACINE, "src/assets/stacgate-archisys-combined.png"));
  await combComposite
    .clone()
    .png()
    .toFile(path.join(RACINE, "public/media/stacgate-archisys-combined.png"));

  // 3. Format SVG vectoriel autonome haute définition (avec images intégrées en base64)
  const logoCombB64 = logoCombBuf.toString("base64");
  const sigCombB64 = sigCombBuf.toString("base64");
  const svgStandalone = `<svg width="${combW}" height="${combH}" viewBox="0 0 ${combW} ${combH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="StacGate Platform × ArchiSys3.0">
  <defs>
    <linearGradient id="capsuleBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14" />
      <stop offset="100%" stop-color="#05070b" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.4" />
      <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.4" />
    </linearGradient>
    <linearGradient id="divGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.1" />
      <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.1" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="${combW - 4}" height="${combH - 4}" rx="24" fill="url(#capsuleBg)" stroke="url(#borderGrad)" stroke-width="1.5"/>
  <image href="data:image/png;base64,${logoCombB64}" x="16" y="15" width="130" height="130" preserveAspectRatio="xMidYMid meet"/>
  <g transform="translate(160, 72)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" letter-spacing="1.2">STACGATE</text>
    <text x="0" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#38bdf8" letter-spacing="2.8">PLATFORM</text>
  </g>
  <line x1="355" y1="28" x2="355" y2="132" stroke="url(#divGrad)" stroke-width="2" stroke-linecap="round"/>
  <g transform="translate(380, 58)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="1.8">CONÇU &amp; VALIDÉ PAR</text>
    <text x="0" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900" fill="#38bdf8" letter-spacing="0.5">ArchiSys3.0</text>
    <text x="0" y="47" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="600" fill="#64748b" letter-spacing="1.2">DIRECTION TECHNIQUE &amp; R&amp;D</text>
  </g>
  <image href="data:image/png;base64,${sigCombB64}" x="614" y="15" width="130" height="130" preserveAspectRatio="xMidYMid meet"/>
</svg>\n`;

  fs.writeFileSync(
    path.join(RACINE, "src/assets/stacgate-archisys-combined.svg"),
    svgStandalone,
    "utf8",
  );
  fs.writeFileSync(
    path.join(RACINE, "public/media/stacgate-archisys-combined.svg"),
    svgStandalone,
    "utf8",
  );

  // 6. Composition du Badge Carré Hybride 800 × 800 px (public/media/stacgate-archisys-badge.webp)
  console.log("[6/6] Composition du badge carré officiel (800 × 800)…");
  const badgeSize = 800;
  const logoBadgeBuf = await sharp(SRC_LOGO)
    .resize(250, 250, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const sigBadgeBuf = await sharp(SRC_SIGNATURE)
    .resize(250, 250, { fit: "contain" })
    .png()
    .toBuffer();

  const svgBadge = `
  <svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 ${badgeSize} ${badgeSize}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0e17" />
        <stop offset="100%" stop-color="#05070a" />
      </linearGradient>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
    </defs>
    <rect width="${badgeSize}" height="${badgeSize}" fill="url(#bGrad)" rx="48"/>
    <rect x="16" y="16" width="768" height="768" fill="none" stroke="url(#ringGrad)" stroke-width="2" rx="40" stroke-opacity="0.4"/>

    <g text-anchor="middle" transform="translate(400, 375)">
      <text x="0" y="0" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" letter-spacing="1.5">STACGATE PLATFORM</text>
      <text x="0" y="30" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#38bdf8" letter-spacing="2">CONÇU &amp; VALIDÉ PAR ARCHISYS3.0</text>
      <line x1="-120" y1="48" x2="120" y2="48" stroke="#334155" stroke-width="1.5"/>
    </g>

    <text x="400" y="745" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#64748b" letter-spacing="1">
      SCEAU OFFICIEL D'ARCHITECTURE R&amp;D
    </text>
  </svg>`;

  await sharp(Buffer.from(svgBadge))
    .composite([
      { input: logoBadgeBuf, top: 80, left: 275 },
      { input: sigBadgeBuf, top: 460, left: 275 },
    ])
    .webp({ quality: 92 })
    .toFile(path.join(RACINE, "public/media/stacgate-archisys-badge.webp"));

  console.log("✔ TOUS LES ACTIFS ONT ÉTÉ GÉNÉRÉS AVEC SUCCÈS !");
}

main().catch((err) => {
  console.error("ÉCHEC DE GÉNÉRATION DES ACTIFS :", err);
  process.exit(1);
});
