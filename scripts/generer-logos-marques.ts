import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const dirPublic = path.join(root, "public", "media", "brands");
const dirAssets = path.join(root, "src", "assets", "brands");

fs.mkdirSync(dirPublic, { recursive: true });
fs.mkdirSync(dirAssets, { recursive: true });

const BRAND_SVGS: Record<string, string> = {
  // 1. OpenAI
  openai: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#0d0d0d"/>
    <path d="M50 20c-3.2 0-6.1 1.6-7.8 4.1l-1.2 1.8v10.3c0 .8.4 1.5 1.1 1.9l8.9 5.1c.4.2.8.3 1.2.3 1.6 0 3-.8 3.8-2.2l6.5-11.2c2.4-4.2-.6-9.6-5.5-10.1h-7zm-14.7 9.8c-2.8 1.6-4.6 4.7-4.6 8.1v2.1l8.9 5.1c.7.4 1.5.4 2.2 0l8.9-5.1c.4-.2.7-.6.9-1.1.7-1.4.3-3.2-.8-4.2l-9.7-8.6c-1.8-1.6-4.3-1.6-5.8.3l-.8.9v2.5zm31.4 1.5c-1.8-2.7-5-4.1-8.2-3.6l-2.1.4v10.3c0 .8.4 1.5 1.1 1.9l8.9 5.1c.4.2.8.3 1.2.3 1.4 0 2.7-.8 3.5-2l6.5-11.2c1.7-2.9 1.4-6.6-.8-9.2-2.1-2.4-5.6-3.3-8.6-2l-1.5 1zm-36 21.8c-1.3 2.9-.8 6.4 1.4 8.8l1.6 1.4 8.9-5.1c.7-.4 1.1-1.1 1.1-1.9v-10.3c0-.4-.1-.8-.3-1.2-.7-1.4-2.1-2.2-3.8-2.2l-12.9.1c-4.8.1-8.3 4.8-6.9 9.4l.9 1.1zm41.6.4c0 .8-.4 1.5-1.1 1.9l-8.9 5.1c-.4.2-.8.3-1.2.3-1.6 0-3-.8-3.8-2.2l-6.5-11.2c-2.4-4.2.6-9.6 5.5-10.1h7c3.2 0 6.1 1.6 7.8 4.1l1.2 1.8v10.3zm-17.7 10.2c-1.4 0-2.7.8-3.5 2l-6.5 11.2c-1.7 2.9-1.4 6.6.8 9.2 2.1 2.4 5.6 3.3 8.6 2l1.5-1c1.8-1 3-2.9 3-5v-10.3c0-.8-.4-1.5-1.1-1.9l-8.9-5.1c-.4-.2-.8-.3-1.2-.3z" fill="#10a37f"/>
  </svg>`,

  // 2. Anthropic (Claude)
  anthropic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#1f1b18"/>
    <path d="M57.6 28h-15L23 72h13.8l3.1-7.8h19.8l3.1 7.8H77L57.6 28zm-14 26.2 6.5-16.5 6.5 16.5h-13z" fill="#d97757"/>
  </svg>`,

  // 3. Google Gemini
  google: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#0b0f19"/>
    <defs>
      <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4285F4"/>
        <stop offset="45%" stop-color="#9B72CB"/>
        <stop offset="80%" stop-color="#D96570"/>
        <stop offset="100%" stop-color="#F4B400"/>
      </linearGradient>
    </defs>
    <path d="M50 16c0 18.778-15.222 34-34 34 18.778 0 34 15.222 34 34 0-18.778 15.222-34 34-34-18.778 0-34-15.222-34-34z" fill="url(#geminiGrad)"/>
  </svg>`,

  // 4. Midjourney
  midjourney: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#0e1117"/>
    <path d="M22 66c10 4 20 5 28 5s18-1 28-5c-6 8-16 11-28 11s-22-3-28-11z" fill="#ffffff"/>
    <path d="M48 23c-2 8-5 24-18 36 12-4 22-12 28-24 5 12 15 20 27 24-13-12-16-28-18-36h-19z" fill="#ffffff" fill-opacity="0.9"/>
    <circle cx="50" cy="42" r="3" fill="#ffffff"/>
  </svg>`,

  // 5. Cursor
  cursor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#000000"/>
    <path d="M28 26l44 24-22 6-6 22-16-52z" fill="#ffffff"/>
    <path d="M50 56l14 16-5 4-14-16 5-4z" fill="#00d2ff"/>
  </svg>`,

  // 6. Microsoft & GitHub Copilot
  microsoft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#18181b"/>
    <rect x="26" y="26" width="22" height="22" fill="#F25022"/>
    <rect x="52" y="26" width="22" height="22" fill="#7FBA00"/>
    <rect x="26" y="52" width="22" height="22" fill="#00A4EF"/>
    <rect x="52" y="52" width="22" height="22" fill="#FFB900"/>
  </svg>`,

  // 7. Perplexity
  perplexity: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#0d1b1e"/>
    <path d="M50 20v60M25 35l50 30M25 65l50-30" stroke="#22d3ee" stroke-width="6" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="10" fill="#0d1b1e" stroke="#22d3ee" stroke-width="5"/>
  </svg>`,

  // 8. ElevenLabs
  elevenlabs: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#111111"/>
    <rect x="36" y="24" width="9" height="52" rx="4.5" fill="#ffffff"/>
    <rect x="55" y="24" width="9" height="52" rx="4.5" fill="#ffffff"/>
  </svg>`,

  // 9. Runway
  runway: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#0a0a0c"/>
    <path d="M30 26h24c9 0 16 7 16 16 0 7-4 13-11 15l13 17H57L46 58H42v16H30V26zm12 21h12c3.5 0 6-2.5 6-6s-2.5-6-6-6H42v12z" fill="#ffffff"/>
  </svg>`,

  // 10. Canva
  canva: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="canvaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00C4CC"/>
        <stop offset="100%" stop-color="#7D2AE8"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="20" fill="url(#canvaGrad)"/>
    <path d="M56 34c-12 0-21 9-21 21 0 11 8 18 19 18 8 0 14-4 17-9l-5-3c-2 4-6 6-12 6-8 0-12-5-12-12s5-15 14-15c5 0 9 2 11 5l5-4c-4-4-9-7-16-7z" fill="#ffffff"/>
  </svg>`,

  // 11. Notion
  notion: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#ffffff"/>
    <path d="M26 26l32-4 16 6v46l-32 4-16-6V26z" fill="#ffffff" stroke="#000000" stroke-width="4"/>
    <path d="M42 38v26l16-24v26" stroke="#000000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // 12. WaYmen Academy
  "waymen-academy": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#0f172a"/>
    <path d="M50 24L18 38l32 14 32-14-32-14z" fill="#00d2ff"/>
    <path d="M28 47v15c0 8 10 14 22 14s22-6 22-14V47l-22 10-22-10z" fill="#e6007a"/>
    <path d="M82 40v22" stroke="#00d2ff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="82" cy="64" r="3" fill="#00d2ff"/>
  </svg>`,

  // 13. WaYmen VIP
  "waymen-vip": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#1a1306"/>
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="50%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
    </defs>
    <path d="M22 68h56l-6-32-15 16-7-24-7 24-15-16-6 32z" fill="url(#goldGrad)"/>
    <circle cx="22" cy="34" r="3.5" fill="#fbbf24"/>
    <circle cx="36" cy="26" r="3.5" fill="#fbbf24"/>
    <circle cx="50" cy="20" r="4.5" fill="#fbbf24"/>
    <circle cx="64" cy="26" r="3.5" fill="#fbbf24"/>
    <circle cx="78" cy="34" r="3.5" fill="#fbbf24"/>
    <rect x="22" y="72" width="56" height="5" rx="2.5" fill="url(#goldGrad)"/>
  </svg>`,
};

for (const [id, svg] of Object.entries(BRAND_SVGS)) {
  const filePub = path.join(dirPublic, `${id}.svg`);
  const fileAss = path.join(dirAssets, `${id}.svg`);
  fs.writeFileSync(filePub, svg.trim(), "utf8");
  fs.writeFileSync(fileAss, svg.trim(), "utf8");
  console.log(`✓ Logo généré : ${id}.svg`);
}

console.log(
  "\n🎉 13/13 Logos officiels générés avec succès dans public/media/brands/ et src/assets/brands/ !",
);
