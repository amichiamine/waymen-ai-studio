import fs from "fs";
import path from "path";

interface BrandSource {
  id: string;
  filename: string;
  url: string;
  isWikimedia?: boolean;
  colorBg?: string;
  fillColor?: string;
}

const BRANDS: BrandSource[] = [
  {
    id: "netflix",
    filename: "netflix.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/netflix.svg",
    colorBg: "#141414",
    fillColor: "#E50914",
  },
  {
    id: "spotify",
    filename: "spotify.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/spotify.svg",
    colorBg: "#121212",
    fillColor: "#1ED760",
  },
  {
    id: "youtube",
    filename: "youtube.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/youtube.svg",
    colorBg: "#0f0f0f",
    fillColor: "#FF0000",
  },
  {
    id: "apple",
    filename: "apple.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/apple.svg",
    colorBg: "#111111",
    fillColor: "#FFFFFF",
  },
  {
    id: "playstation",
    filename: "playstation.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/playstation.svg",
    colorBg: "#001a4d",
    fillColor: "#0070D1",
  },
  {
    id: "sony-playstation",
    filename: "sony-playstation.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/playstation.svg",
    colorBg: "#001a4d",
    fillColor: "#0070D1",
  },
  {
    id: "steam",
    filename: "steam.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/steam.svg",
    colorBg: "#171a21",
    fillColor: "#FFFFFF",
  },
  {
    id: "google-play",
    filename: "google-play.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/googleplay.svg",
    colorBg: "#1a1a1a",
    fillColor: "#00875A",
  },
  {
    id: "googleplay",
    filename: "googleplay.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/googleplay.svg",
    colorBg: "#1a1a1a",
    fillColor: "#00875A",
  },
  {
    id: "razer",
    filename: "razer.svg",
    url: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/razer.svg",
    colorBg: "#0a0a0a",
    fillColor: "#00FF00",
  },
  {
    id: "xbox",
    filename: "xbox.svg",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/xbox.svg",
    colorBg: "#0e2411",
    fillColor: "#107C10",
  },
  {
    id: "disney",
    filename: "disney.svg",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
    isWikimedia: true,
    colorBg: "#0b0e2b",
  },
  {
    id: "disney-",
    filename: "disney-.svg",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
    isWikimedia: true,
    colorBg: "#0b0e2b",
  },
];

async function main() {
  console.log("[logos] Démarrage du téléchargement des logos officiels...");
  const publicDir = path.resolve("public/media/brands");
  const srcDir = path.resolve("src/assets/brands");
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

  for (const item of BRANDS) {
    try {
      console.log(`[logos] Téléchargement de ${item.id} (${item.url})...`);
      const res = await fetch(item.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) {
        console.error(`[logos] Échec HTTP ${res.status} pour ${item.id}`);
        continue;
      }
      const rawSvg = await res.text();

      let finalSvg = rawSvg;

      // Si c'est Simple Icons, le SVG a une viewBox 0 0 24 24 et un <path d="..." />
      if (!item.isWikimedia) {
        const pathMatch = rawSvg.match(/<path[^>]*d="([^"]+)"[^>]*>/);
        if (pathMatch) {
          const pathD = pathMatch[1];
          // On emballe dans un conteneur uniforme 100x100 avec fond arrondi et centrage élégant
          finalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="22" fill="${item.colorBg || "#141414"}"/>
  <g transform="translate(20, 20) scale(2.5)">
    <path d="${pathD}" fill="${item.fillColor || "#FFFFFF"}"/>
  </g>
</svg>`;
        }
      } else {
        // Wikimedia SVG : nettoyage et vérification du viewBox
        if (!finalSvg.includes("viewBox")) {
          finalSvg = finalSvg.replace("<svg", '<svg viewBox="0 0 100 100"');
        }
      }

      fs.writeFileSync(path.join(publicDir, item.filename), finalSvg, "utf8");
      fs.writeFileSync(path.join(srcDir, item.filename), finalSvg, "utf8");
      console.log(`[logos] ✔ ${item.filename} enregistré avec succès.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[logos] Erreur lors du téléchargement de ${item.id}:`, msg);
    }
  }
  console.log("[logos] Téléchargements terminés.");
}

main().catch(console.error);
