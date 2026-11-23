import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RACINE = process.cwd();
const SRC_LOGO_WAYMEN = path.join(RACINE, "waymen-002.jpg");
const SRC_SIGNATURE = path.join(RACINE, "Signature-ArchiSys30.png");

/**
 * Extrait l'emblème circulaire WY de waymen-002.jpg avec détourage alpha net et anti-crénelé.
 */
async function extraireEmblemeTransparent(sourcePath: string): Promise<Buffer> {
  const { data, info } = await sharp(sourcePath)
    .extract({ left: 98, top: 24, width: 356, height: 318 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const out = Buffer.alloc(w * h * 4);

  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);

    if (minVal >= 250) {
      out[i * 4 + 3] = 0; // Transparence totale
    } else if (minVal >= 230 && maxVal - minVal < 20) {
      const factor = (250 - minVal) / 20;
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = Math.round(factor * 255);
    } else {
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

/**
 * Extrait le logo complet (emblème + texte WaYmen AI Studio) avec détourage alpha propre.
 */
async function extraireLogoCompletTransparent(sourcePath: string): Promise<Buffer> {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const out = Buffer.alloc(w * h * 4);

  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);

    if (minVal >= 250) {
      out[i * 4 + 3] = 0;
    } else if (minVal >= 230 && maxVal - minVal < 20) {
      const factor = (250 - minVal) / 20;
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = Math.round(factor * 255);
    } else {
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  console.log("=== GÉNÉRATION DES ACTIFS 100% WAYMEN AI STUDIO PUR ===");

  if (!fs.existsSync(SRC_LOGO_WAYMEN)) {
    throw new Error(`Logo source WaYmen manquant : ${SRC_LOGO_WAYMEN}`);
  }

  console.log("[Extraction] Détourage haute précision de l'emblème et du logo WaYmen…");
  const emblemeBuf = await extraireEmblemeTransparent(SRC_LOGO_WAYMEN);
  const logoCompletBuf = await extraireLogoCompletTransparent(SRC_LOGO_WAYMEN);

  // 1. Génération des icônes Apple Touch & PWA WaYmen Pures
  console.log("[1/6] Génération des icônes PWA et mobiles WaYmen pures…");
  const iconSize = 512;
  const emblemeIconBuf = await sharp(emblemeBuf)
    .resize(340, 310, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
        <stop offset="0%" stop-color="#e6007a" stop-opacity="0.85" />
        <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.75" />
        <stop offset="100%" stop-color="#00a3ff" stop-opacity="0.85" />
      </linearGradient>
    </defs>
    <rect width="${iconSize}" height="${iconSize}" rx="112" fill="url(#iconBg)"/>
    <rect x="4" y="4" width="${iconSize - 8}" height="${iconSize - 8}" rx="108" fill="none" stroke="url(#iconBorder)" stroke-width="4"/>
  </svg>`;

  const masterIconBuf = await sharp(Buffer.from(svgIconBase))
    .composite([{ input: emblemeIconBuf, top: 101, left: 86 }])
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

  // 2. Génération de favicon.ico multi-tailles (16, 32, 48) depuis l'icône pure
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

  // 3. Génération de public/favicon.svg WaYmen épuré haute définition
  console.log("[3/6] Génération de public/favicon.svg WaYmen pur haute définition…");
  const logoFaviconBuf = await sharp(emblemeBuf)
    .resize(48, 44, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const logoFaviconB64 = logoFaviconBuf.toString("base64");

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="WaYmen AI Studio">
  <defs>
    <linearGradient id="favBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1d" />
      <stop offset="100%" stop-color="#05070b" />
    </linearGradient>
    <linearGradient id="favBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e6007a" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#00a3ff" stop-opacity="0.9" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#favBg)" stroke="url(#favBorder)" stroke-width="1.8"/>
  <image href="data:image/png;base64,${logoFaviconB64}" width="48" height="44" x="8" y="10" preserveAspectRatio="xMidYMid meet"/>
</svg>\n`;
  fs.writeFileSync(path.join(RACINE, "public/favicon.svg"), faviconSvg, "utf8");

  // 4. Génération des versions WebP légères du logo complet et de l'emblème
  console.log("[4/6] Génération des versions WebP légères du logo WaYmen…");
  await sharp(logoCompletBuf)
    .webp({ quality: 95 })
    .toFile(path.join(RACINE, "src/assets/waymen-logo.webp"));

  await sharp(logoCompletBuf)
    .webp({ quality: 95 })
    .toFile(path.join(RACINE, "public/media/waymen-logo.webp"));

  // Rétrocompatibilité stacgate-logo
  await sharp(logoCompletBuf)
    .webp({ quality: 95 })
    .toFile(path.join(RACINE, "src/assets/stacgate-logo.webp"));

  await sharp(logoCompletBuf)
    .webp({ quality: 95 })
    .toFile(path.join(RACINE, "public/media/stacgate-logo.webp"));

  // 5. Composition de la Bannière WaYmen AI Studio 1200 × 630 px (public/og-image.png & WebP)
  console.log("[5/6] Composition de la bannière WaYmen AI Studio prestige (1200 × 630)…");
  const bannerW = 1200;
  const bannerH = 630;

  const emblemeBannerBuf = await sharp(emblemeBuf)
    .resize(300, 270, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svgOverlay = `
  <svg width="${bannerW}" height="${bannerH}" viewBox="0 0 ${bannerW} ${bannerH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#080b11" />
        <stop offset="50%" stop-color="#0e1522" />
        <stop offset="100%" stop-color="#06080d" />
      </linearGradient>
      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#e6007a" stop-opacity="0.8" />
        <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#00a3ff" stop-opacity="0.8" />
      </linearGradient>
      <radialGradient id="leftGlow" cx="25%" cy="50%" r="45%">
        <stop offset="0%" stop-color="#e6007a" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#e6007a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="rightGlow" cx="75%" cy="50%" r="45%">
        <stop offset="0%" stop-color="#00a3ff" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#00a3ff" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="${bannerW}" height="${bannerH}" fill="url(#bgGrad)"/>
    <rect width="${bannerW}" height="${bannerH}" fill="url(#leftGlow)"/>
    <rect width="${bannerW}" height="${bannerH}" fill="url(#rightGlow)"/>

    <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="url(#glowGrad)" stroke-width="1.8" stroke-opacity="0.5"/>

    <g transform="translate(420, 210)">
      <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="#f8fafc" letter-spacing="1">WAYMEN AI STUDIO</text>
      <text x="0" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="21" font-weight="600" fill="#00a3ff">Services Numériques, Abonnements &amp; Formations IA</text>
      <text x="0" y="82" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="400" fill="#94a3b8">Intelligence Artificielle • Streaming • Gaming • Formations Spécialisées</text>

      <g transform="translate(0, 130)">
        <rect x="0" y="0" width="170" height="38" rx="19" fill="#e6007a" fill-opacity="0.18" stroke="#e6007a" stroke-opacity="0.45"/>
        <text x="85" y="24" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#f43f5e">ABONNEMENTS IA</text>

        <rect x="185" y="0" width="180" height="38" rx="19" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6" stroke-opacity="0.45"/>
        <text x="275" y="24" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#c084fc">STREAMING &amp; JEUX</text>

        <rect x="380" y="0" width="175" height="38" rx="19" fill="#00a3ff" fill-opacity="0.18" stroke="#00a3ff" stroke-opacity="0.45"/>
        <text x="467" y="24" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#38bdf8">ACTIVATION 15 MIN</text>

        <rect x="570" y="0" width="165" height="38" rx="19" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-opacity="0.45"/>
        <text x="652" y="24" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#34d399">LIVRAISON 58 WILAYAS</text>
      </g>
    </g>

    <text x="600" y="575" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#64748b">
      WaYmen AI Studio • Hub Officiel d'Abonnements, Services Digitaux &amp; Cartes Cadeaux • 2026
    </text>
  </svg>`;

  await sharp(Buffer.from(svgOverlay))
    .composite([{ input: emblemeBannerBuf, top: 180, left: 70 }])
    .png()
    .toFile(path.join(RACINE, "public/og-image.png"));

  await sharp(path.join(RACINE, "public/og-image.png"))
    .webp({ quality: 92 })
    .toFile(path.join(RACINE, "src/assets/stacgate-archisys-banner.webp"));

  await sharp(path.join(RACINE, "public/og-image.png"))
    .webp({ quality: 92 })
    .toFile(path.join(RACINE, "src/assets/waymen-og-banner.webp"));

  await sharp(path.join(RACINE, "public/og-image.png"))
    .webp({ quality: 92 })
    .toFile(path.join(RACINE, "public/media/waymen-og-banner.webp"));

  // 5 bis. Remplacement des anciens fichiers combinés par la bannière pure WaYmen
  console.log("[5b/6] Épuration des reliques combinées…");
  const bannierePureWebp = await sharp(path.join(RACINE, "public/og-image.png"))
    .webp({ quality: 92 })
    .toBuffer();
  fs.writeFileSync(
    path.join(RACINE, "src/assets/stacgate-archisys-combined.webp"),
    bannierePureWebp,
  );
  fs.writeFileSync(
    path.join(RACINE, "public/media/stacgate-archisys-combined.webp"),
    bannierePureWebp,
  );
  fs.writeFileSync(path.join(RACINE, "src/assets/waymen-archisys-combined.webp"), bannierePureWebp);
  fs.writeFileSync(
    path.join(RACINE, "public/media/waymen-archisys-combined.webp"),
    bannierePureWebp,
  );

  // 6. Composition du Badge Carré WaYmen Pur 800 × 800 px
  console.log("[6/6] Composition du badge carré officiel WaYmen pur (800 × 800)…");
  const badgeSize = 800;
  const emblemeBadgeBuf = await sharp(emblemeBuf)
    .resize(360, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svgBadge = `
  <svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 ${badgeSize} ${badgeSize}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0e17" />
        <stop offset="100%" stop-color="#05070b" />
      </linearGradient>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e6007a" />
        <stop offset="50%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#00a3ff" />
      </linearGradient>
    </defs>
    <rect width="${badgeSize}" height="${badgeSize}" fill="url(#bGrad)" rx="48"/>
    <rect x="16" y="16" width="768" height="768" fill="none" stroke="url(#ringGrad)" stroke-width="2" rx="40" stroke-opacity="0.5"/>

    <g text-anchor="middle" transform="translate(400, 520)">
      <text x="0" y="0" font-family="system-ui, sans-serif" font-size="38" font-weight="900" fill="#f8fafc" letter-spacing="1.5">WAYMEN AI STUDIO</text>
      <text x="0" y="38" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#00a3ff" letter-spacing="2">ABONNEMENTS IA &amp; FORMATIONS</text>
      <text x="0" y="68" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#e6007a" letter-spacing="1.5">STREAMING • GAMING • CARTES CADEAUX</text>
    </g>

    <text x="400" y="745" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#64748b" letter-spacing="1">
      SERVICES NUMÉRIQUES OFFICIELS • 2026
    </text>
  </svg>`;

  await sharp(Buffer.from(svgBadge))
    .composite([{ input: emblemeBadgeBuf, top: 120, left: 220 }])
    .webp({ quality: 92 })
    .toFile(path.join(RACINE, "public/media/stacgate-archisys-badge.webp"));

  console.log("✔ TOUS LES ACTIFS 100% WAYMEN ONT ÉTÉ GÉNÉRÉS AVEC SUCCÈS !");
}

main().catch((err) => {
  console.error("ÉCHEC DE GÉNÉRATION DES ACTIFS :", err);
  process.exit(1);
});
