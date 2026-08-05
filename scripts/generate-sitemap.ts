// Runs before `vite dev` and `vite build` — writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";

// Get site URL from environment, with fallback to katech.dz domain
const BASE_URL = (process.env.SITE_URL || "https://katech.dz").replace(/\/$/, "");

type Entry = { path: string; changefreq?: string; priority?: string };

const staticPaths: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/category", changefreq: "weekly", priority: "0.8" },
  { path: "/category/laptops", changefreq: "weekly", priority: "0.8" },
  { path: "/category/desktops", changefreq: "weekly", priority: "0.8" },
  { path: "/category/builds", changefreq: "weekly", priority: "0.8" },
  { path: "/category/phones", changefreq: "weekly", priority: "0.8" },
  { path: "/builder", changefreq: "monthly", priority: "0.7" },
];

// Products
const productIds = [
  "rog-strix-g16",
  "hp-pavilion-15",
  "thinkpad-x1-carbon",
  "macbook-air-m3",
  "dell-optiplex-5000",
  "hp-omen-45l",
  "build-mid-gaming",
  "build-pro-editing",
  "galaxy-s25-ultra",
  "iphone-16-pro-max",
  "xiaomi-14t-pro",
  "redmi-note-13-pro",
];
const productPaths: Entry[] = productIds.map((id) => ({
  path: `/product/${id}`,
  changefreq: "weekly",
  priority: "0.7",
}));

const blogSlugs = [
  "guide-achat-laptop-2026",
  "gaming-pc-vs-console",
  "smartphone-photo-2026",
  "monter-son-pc-configurateur",
  "livraison-58-wilayas",
];
const blogPaths: Entry[] = blogSlugs.map((s) => ({
  path: `/blog/${s}`,
  changefreq: "monthly",
  priority: "0.6",
}));

const entries = [...staticPaths, ...productPaths, ...blogPaths];

const urls = entries
  .map(
    (e) =>
      `  <url>\n    <loc>${BASE_URL}${e.path}</loc>${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `\n    <priority>${e.priority}</priority>` : ""}\n  </url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} entries)`);
