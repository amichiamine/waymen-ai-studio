/**
 * scripts/convert-to-webp.ts
 *
 * Convertit toutes les images JPEG/PNG de src/assets/ en WebP (qualité 82).
 * Les originaux sont conservés dans src/assets/originals/ comme repli.
 * Usage : bunx tsx scripts/convert-to-webp.ts
 */

import sharp from "sharp";
import { readdirSync, mkdirSync, renameSync, statSync } from "fs";
import { join, extname, basename } from "path";

const ASSETS_DIR = new URL("../src/assets", import.meta.url).pathname;
const ORIGINALS_DIR = join(ASSETS_DIR, "originals");
const QUALITY = 82;

const EXTS = new Set([".jpg", ".jpeg", ".png"]);

mkdirSync(ORIGINALS_DIR, { recursive: true });

const files = readdirSync(ASSETS_DIR).filter((f) => {
  const ext = extname(f).toLowerCase();
  return EXTS.has(ext);
});

if (files.length === 0) {
  console.log("Aucune image JPEG/PNG à convertir dans src/assets/.");
  process.exit(0);
}

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const src = join(ASSETS_DIR, file);
  const name = basename(file, extname(file));
  const dest = join(ASSETS_DIR, `${name}.webp`);
  const backup = join(ORIGINALS_DIR, file);

  const sizeBefore = statSync(src).size;
  totalBefore += sizeBefore;

  await sharp(src).webp({ quality: QUALITY }).toFile(dest);

  const sizeAfter = statSync(dest).size;
  totalAfter += sizeAfter;

  const saving = (((sizeBefore - sizeAfter) / sizeBefore) * 100).toFixed(1);
  console.log(
    `  ${file} → ${name}.webp  ${Math.round(sizeBefore / 1024)} Ko → ${Math.round(sizeAfter / 1024)} Ko  (−${saving}%)`,
  );

  // Déplace l'original dans originals/
  renameSync(src, backup);
}

const savedKo = Math.round((totalBefore - totalAfter) / 1024);
const savedPct = (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1);
console.log(
  `\nTotal : ${Math.round(totalBefore / 1024)} Ko → ${Math.round(totalAfter / 1024)} Ko  (gain ${savedKo} Ko, −${savedPct}%)`,
);
