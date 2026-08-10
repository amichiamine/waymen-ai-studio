/**
 * Écrit `public/sitemap.xml` — étape `predev` et `prebuild`.
 *
 * Ce fichier reste l'UNIQUE endroit où les routes publiques sont énumérées :
 * `scripts/prerendu.ts` le lit pour savoir quelles pages prérendre, et
 * `public/sitemap.php` le lit pour le servir. Ajouter une route ici la fait
 * apparaître partout ; l'ajouter ailleurs crée une seconde liste.
 *
 * LE DOMAINE ÉCRIT ICI N'EST QU'UN REPLI. Le protocole des sitemaps
 * (sitemaps.org) exige des URL absolues dans `<loc>` : contrairement au reste
 * du livrable, on ne peut pas les rendre relatives, et un fichier écrit au
 * build ne peut porter que le domaine du build. C'est pourquoi
 * `public/sitemap.php` sert ce fichier en remplaçant son origine par celle de
 * la requête (`public/origine.php`) : le MÊME paquet déposé sur deux domaines
 * annonce les bonnes URL sur chacun, sans reconstruction.
 *
 * `SITE_URL` reste donc DISPONIBLE pour qui veut délibérément figer un domaine
 * au build, mais n'est plus NÉCESSAIRE. Sa valeur par défaut doit rester
 * LITTÉRALEMENT `KATECH_ORIGINE_REPLI` de `public/origine.php` : c'est cette
 * chaîne exacte que la réécriture recherche. Les changer séparément ne casse
 * rien — ça rend simplement la réécriture inopérante, en silence.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

// Repli, remplacé à l'exécution par public/sitemap.php — voir l'en-tête.
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
