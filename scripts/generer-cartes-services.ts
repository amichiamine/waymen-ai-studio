import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RACINE = process.cwd();

interface ServiceCardSpec {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  glowColor: string;
  brandSlug: string;
}

const SERVICES_SPECS: ServiceCardSpec[] = [
  {
    id: "chatgpt-plus",
    title: "ChatGPT Plus",
    subtitle: "OpenAI GPT-4o, Canvas & DALL·E 3",
    badge: "OPENAI OFFICIEL",
    accentColor: "#10a37f",
    glowColor: "#10a37f",
    brandSlug: "openai",
  },
  {
    id: "chatgpt-team",
    title: "ChatGPT Team",
    subtitle: "Espace Collaboratif & Limites Élevées",
    badge: "ENTREPRISE & TEAMS",
    accentColor: "#059669",
    glowColor: "#10b981",
    brandSlug: "openai",
  },
  {
    id: "claude-pro",
    title: "Claude Pro",
    subtitle: "Anthropic Claude 3.5 Sonnet & Artifacts",
    badge: "ANTHROPIC OFFICIEL",
    accentColor: "#d97706",
    glowColor: "#f59e0b",
    brandSlug: "anthropic",
  },
  {
    id: "gemini-advanced",
    title: "Google Gemini Advanced",
    subtitle: "Google One 2TB + Gemini 1.5 Pro & Ultra",
    badge: "GOOGLE ECOSYSTEM",
    accentColor: "#3b82f6",
    glowColor: "#60a5fa",
    brandSlug: "google",
  },
  {
    id: "midjourney-std",
    title: "Midjourney V6.1",
    subtitle: "Génération Graphique & Artistique Phare",
    badge: "FAST GPU HOURS",
    accentColor: "#0284c7",
    glowColor: "#38bdf8",
    brandSlug: "midjourney",
  },
  {
    id: "cursor-pro",
    title: "Cursor Pro",
    subtitle: "L'IDE IA Numéro 1 pour Développeurs",
    badge: "CLAUDE 3.5 + GPT-4O",
    accentColor: "#8b5cf6",
    glowColor: "#a855f7",
    brandSlug: "cursor",
  },
  {
    id: "github-copilot",
    title: "GitHub Copilot",
    subtitle: "Autocomplétion & Chat de Code IA",
    badge: "MICROSOFT & GITHUB",
    accentColor: "#6366f1",
    glowColor: "#818cf8",
    brandSlug: "microsoft",
  },
  {
    id: "perplexity-pro",
    title: "Perplexity Pro",
    subtitle: "Moteur de Recherche & Synthèse IA",
    badge: "PRO SEARCH UNLIMITED",
    accentColor: "#0d9488",
    glowColor: "#2dd4bf",
    brandSlug: "perplexity",
  },
  {
    id: "elevenlabs-audio",
    title: "ElevenLabs Creator",
    subtitle: "Clonage Vocal & Voix IA Hyper-Réalistes",
    badge: "AUDIO HD & MULTILINGUE",
    accentColor: "#e11d48",
    glowColor: "#fb7185",
    brandSlug: "elevenlabs",
  },
  {
    id: "runway-gen3",
    title: "Runway Gen-3 Alpha",
    subtitle: "Génération & Animation Vidéo par IA",
    badge: "STUDIO CINÉMATIQUE",
    accentColor: "#ec4899",
    glowColor: "#f472b6",
    brandSlug: "runway",
  },
  {
    id: "canva-pro",
    title: "Canva Pro Équipe",
    subtitle: "Design Graphique, Brand Kit & Outils IA",
    badge: "LICENCE COMPLÈTE",
    accentColor: "#06b6d4",
    glowColor: "#22d3ee",
    brandSlug: "canva",
  },
  {
    id: "notion-ai",
    title: "Notion AI",
    subtitle: "Espace de Travail & Rédaction Assistée",
    badge: "ORGANISATION & WIKI",
    accentColor: "#475569",
    glowColor: "#94a3b8",
    brandSlug: "notion",
  },
  {
    id: "formation-ia-zero",
    title: "Formation : IA de Zéro à Pro",
    subtitle: "Masterclass Complète pour Tous Profils",
    badge: "WAYMEN ACADEMY",
    accentColor: "#e6007a",
    glowColor: "#f43f5e",
    brandSlug: "waymen-academy",
  },
  {
    id: "formation-dev-ia",
    title: "Formation : Développer avec l'IA",
    subtitle: "Maîtriser Cursor, Copilot & V0 en Pratique",
    badge: "SPÉCIAL DÉVELOPPEURS",
    accentColor: "#8b5cf6",
    glowColor: "#a855f7",
    brandSlug: "cursor",
  },
  {
    id: "formation-creatif-ia",
    title: "Formation : Créatifs & Vidéo IA",
    subtitle: "Midjourney, Runway & ElevenLabs de A à Z",
    badge: "SPÉCIAL DESIGN & VIDÉO",
    accentColor: "#00a3ff",
    glowColor: "#38bdf8",
    brandSlug: "midjourney",
  },
  {
    id: "coaching-vip-ia",
    title: "Coaching Privé 1-on-1 IA",
    subtitle: "Accompagnement & Intégration sur Mesure",
    badge: "MENTORAT DÉDIÉ",
    accentColor: "#10b981",
    glowColor: "#34d399",
    brandSlug: "waymen-vip",
  },
  {
    id: "pack-ultimate-creator",
    title: "Pack Ultimate Creator",
    subtitle: "ChatGPT Plus + Midjourney + ElevenLabs",
    badge: "PACK ÉCONOMIQUE VIP",
    accentColor: "#e6007a",
    glowColor: "#00a3ff",
    brandSlug: "waymen-vip",
  },
  {
    id: "pack-fullstack-dev",
    title: "Pack Full-Stack AI Engineer",
    subtitle: "Claude Pro + Cursor Pro + GitHub Copilot",
    badge: "TRIO DÉVELOPPEUR ULTIME",
    accentColor: "#8b5cf6",
    glowColor: "#00a3ff",
    brandSlug: "cursor",
  },
];

async function main() {
  console.log("=== GÉNÉRATION DES VISUELS DE SERVICES & FORMATIONS AVEC VRAIS LOGOS OFFICIELS ===");
  const cardW = 640;
  const cardH = 480;

  for (const s of SERVICES_SPECS) {
    const safeTitle = s.title.replace(/&/g, "&amp;");
    const safeSubtitle = s.subtitle.replace(/&/g, "&amp;");
    const safeBadge = s.badge.replace(/&/g, "&amp;");

    // Lecture du SVG officiel de la marque
    const brandSvgPath = path.join(RACINE, "public", "media", "brands", `${s.brandSlug}.svg`);
    let brandInner = "";
    if (fs.existsSync(brandSvgPath)) {
      const raw = fs.readFileSync(brandSvgPath, "utf-8");
      // Retrait de la balise <svg ...> et </svg>
      brandInner = raw
        .replace(/<svg[^>]*>/, "")
        .replace(/<\/svg>/, "")
        .trim();
    }

    const svgCard = `
    <svg width="${cardW}" height="${cardH}" viewBox="0 0 ${cardW} ${cardH}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0f1d" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#05070c" />
        </linearGradient>
        <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${s.accentColor}" stop-opacity="0.8" />
          <stop offset="100%" stop-color="${s.glowColor}" stop-opacity="0.3" />
        </linearGradient>
        <radialGradient id="centerGlow" cx="50%" cy="38%" r="45%">
          <stop offset="0%" stop-color="${s.glowColor}" stop-opacity="0.25" />
          <stop offset="100%" stop-color="${s.glowColor}" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Fond avec lueur ambiante -->
      <rect width="${cardW}" height="${cardH}" fill="url(#bgGrad)" />
      <rect width="${cardW}" height="${cardH}" fill="url(#centerGlow)" />

      <!-- Bordure lumineuse externe -->
      <rect x="12" y="12" width="${cardW - 24}" height="${cardH - 24}" rx="28" fill="none" stroke="url(#borderGrad)" stroke-width="2" />

      <!-- Badge supérieur -->
      <g transform="translate(40, 42)">
        <rect width="190" height="30" rx="15" fill="${s.accentColor}" fill-opacity="0.18" stroke="${s.accentColor}" stroke-opacity="0.5" />
        <text x="95" y="20" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="${s.accentColor}" letter-spacing="1.5">${safeBadge}</text>
      </g>

      <!-- Logo officiel de marque central -->
      <g transform="translate(270, 135)">
        <rect x="-4" y="-4" width="108" height="108" rx="24" fill="none" stroke="${s.accentColor}" stroke-width="2" stroke-opacity="0.4" />
        ${brandInner}
      </g>

      <!-- Typographie Titre & Sous-titre -->
      <g transform="translate(320, 340)" text-anchor="middle">
        <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" letter-spacing="0.5">${safeTitle}</text>
        <text x="0" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="500" fill="#94a3b8">${safeSubtitle}</text>
      </g>

      <!-- Ligne décorative basse -->
      <g transform="translate(320, 425)" text-anchor="middle">
        <line x1="-120" y1="0" x2="120" y2="0" stroke="#334155" stroke-width="1.5" stroke-opacity="0.5" />
        <circle cx="0" cy="0" r="4" fill="${s.accentColor}" />
      </g>
    </svg>`;

    const destAsset = path.join(RACINE, `src/assets/service-${s.id}.webp`);
    const destPublic = path.join(RACINE, `public/media/service-${s.id}.webp`);

    await sharp(Buffer.from(svgCard)).webp({ quality: 92 }).toFile(destAsset);
    await sharp(Buffer.from(svgCard)).webp({ quality: 92 }).toFile(destPublic);
  }

  console.log(
    `✔ ${SERVICES_SPECS.length} VISUELS DE SERVICES ET FORMATIONS RÉGÉNÉRÉS AVEC VRAIS LOGOS OFFICIELS !`,
  );
}

main().catch((err) => {
  console.error("Échec de génération :", err);
  process.exit(1);
});
