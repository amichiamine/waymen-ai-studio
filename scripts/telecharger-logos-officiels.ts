import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dirPublic = path.join(root, "public", "media", "brands");
const dirAssets = path.join(root, "src", "assets", "brands");

fs.mkdirSync(dirPublic, { recursive: true });
fs.mkdirSync(dirAssets, { recursive: true });

interface BrandDownloadSpec {
  slug: string;
  url: string;
  viewBox?: string;
  fill?: string;
  bg?: string;
}

const SOURCES: BrandDownloadSpec[] = [
  {
    slug: "openai",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/openai.svg",
    fill: "#10a37f",
    bg: "#0d0d0d",
  },
  {
    slug: "anthropic",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/anthropic.svg",
    fill: "#d97757",
    bg: "#1a1614",
  },
  {
    slug: "google",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/googlegemini.svg",
    fill: "#4285F4",
    bg: "#0b0f19",
  },
  {
    slug: "copilot",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/githubcopilot.svg",
    fill: "#6366f1",
    bg: "#18181b",
  },
  {
    slug: "perplexity",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/perplexity.svg",
    fill: "#22d3ee",
    bg: "#0d1b1e",
  },
  {
    slug: "elevenlabs",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/elevenlabs.svg",
    fill: "#f43f5e",
    bg: "#111111",
  },
  {
    slug: "canva",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/canva.svg",
    fill: "#00c4cc",
    bg: "#081a24",
  },
  {
    slug: "notion",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/notion.svg",
    fill: "#ffffff",
    bg: "#000000",
  },
  {
    slug: "midjourney",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/24/Midjourney_Emblem.svg",
    fill: "#ffffff",
    bg: "#0c1017",
  },
  {
    slug: "runway",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/35/Runway_Black_Logo_SVG.svg",
    fill: "#ec4899",
    bg: "#0e0e11",
  },
  {
    slug: "microsoft",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg",
  },
  {
    slug: "cursor",
    url: "https://www.cursor.com/assets/images/logo.svg",
  },
];

async function main() {
  console.log("=== TÉLÉCHARGEMENT WEB DES VRAIS LOGOS OFFICIELS DES MARQUES IA ===");
  const headers = {
    "User-Agent": "WaYmenStudio/1.0 (https://waymen.ai; contact@waymen.ai)",
  };

  for (const s of SOURCES) {
    try {
      console.log(`Téléchargement de ${s.slug} depuis ${s.url} ...`);
      const res = await fetch(s.url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      let svg = await res.text();

      // Nettoyage et normalisation
      // Si c'est un simple-icon avec path unique sans viewBox unifié ou fond
      if (s.fill && s.bg && svg.includes('viewBox="0 0 24 24"')) {
        // Encapsulation dans un cadre moderne 100x100
        const pathMatch = svg.match(/<path\s+d="([^"]+)"/);
        if (pathMatch) {
          const d = pathMatch[1];
          svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="${s.bg}"/>
  <g transform="translate(18, 18) scale(2.666)">
    <path d="${d}" fill="${s.fill}"/>
  </g>
</svg>`;
        }
      } else if (s.slug === "midjourney" && s.bg) {
        // Nettoyage de l'emblème Midjourney sur fond sombre
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="${s.bg}"/>
  <g transform="translate(15, 15) scale(0.7)">
    ${svg
      .replace(/<\?xml[^>]*>/, "")
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>/, "")}
  </g>
</svg>`;
      } else if (s.slug === "runway" && s.bg) {
        // Logo Runway officiel
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="${s.bg}"/>
  <g transform="translate(15, 15) scale(0.7)">
    ${svg
      .replace(/<\?xml[^>]*>/, "")
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>/, "")}
  </g>
</svg>`;
      } else if (s.slug === "cursor") {
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#000000"/>
  <g transform="translate(15, 15) scale(0.7)">
    ${svg
      .replace(/<\?xml[^>]*>/, "")
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>/, "")}
  </g>
</svg>`;
      } else if (s.slug === "microsoft") {
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#18181b"/>
  <g transform="translate(16, 16) scale(0.68)">
    ${svg
      .replace(/<\?xml[^>]*>/, "")
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>/, "")}
  </g>
</svg>`;
      }

      fs.writeFileSync(path.join(dirPublic, `${s.slug}.svg`), svg, "utf-8");
      fs.writeFileSync(path.join(dirAssets, `${s.slug}.svg`), svg, "utf-8");
      console.log(`✓ ${s.slug}.svg téléchargé et enregistré avec succès.`);
    } catch (err) {
      console.error(`✗ Erreur téléchargement ${s.slug} :`, err);
    }
  }

  // WaYmen Academy et WaYmen VIP (logos studio officiels)
  const academySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#0f172a"/>
  <path d="M50 22L16 38l34 16 34-16-34-16z" fill="#00d2ff"/>
  <path d="M26 48v16c0 9 11 16 24 16s24-7 24-16V48l-24 11-24-11z" fill="#e6007a"/>
  <path d="M84 40v24" stroke="#00d2ff" stroke-width="3" stroke-linecap="round"/>
  <circle cx="84" cy="66" r="3" fill="#00d2ff"/>
</svg>`;
  fs.writeFileSync(path.join(dirPublic, "waymen-academy.svg"), academySvg, "utf-8");
  fs.writeFileSync(path.join(dirAssets, "waymen-academy.svg"), academySvg, "utf-8");

  const vipSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="#18140a"/>
  <defs>
    <linearGradient id="goldGradVip" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <path d="M22 36l14 34h28l14-34-18 10-10-22-10 22-18-10z" fill="url(#goldGradVip)"/>
  <circle cx="50" cy="74" r="4" fill="#fbbf24"/>
</svg>`;
  fs.writeFileSync(path.join(dirPublic, "waymen-vip.svg"), vipSvg, "utf-8");
  fs.writeFileSync(path.join(dirAssets, "waymen-vip.svg"), vipSvg, "utf-8");
  console.log("✓ waymen-academy.svg et waymen-vip.svg générés.");

  console.log("🎉 Tous les 13 logos officiels sont en place !");
}

main().catch(console.error);
