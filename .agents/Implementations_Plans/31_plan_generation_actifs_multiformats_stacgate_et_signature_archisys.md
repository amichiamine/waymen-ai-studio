# PLAN D'IMPLÉMENTATION — PHASE 31

## Génération des Actifs Multiformats (StacGate Platform), Image Hybride Officielle (ArchiSys3.0) & Préservation Absolue des Téléversements Tiers

**Date :** 06 Novembre 2026  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan (`mode plan`)  
**Statut :** En attente de validation formelle par ArchiSys3.0 (Bouton "Proceed")

---

### 1. Objectifs & Cadre Stratégique

L'objectif de la **Phase 31** est de concrétiser le remplacement de l'ancienne identité visuelle résiduelle dans tous ses formats (ICO, SVG, PNG, WebP) à partir de vos deux actifs officiels :

1. `logo-StacGate.png` (1024 × 1024 px, RGBA avec canal alpha).
2. `Signature-ArchiSys30.png` (1254 × 1254 px, RGB haute définition).

> [!IMPORTANT]
> **VERROU ARCHITECTURAL ABSOLU : PRÉSERVATION DES TÉLÉVERSEMENTS TIERS**  
> Conformément à l'exigence explicite d'ArchiSys3.0, tous les actifs générés constituent **strictement les valeurs par défaut et replis du socle natif**.  
> Le système de personnalisation dynamique de la boutique (téléversement d'un nouveau logo ou favicon depuis l'administration Backstage `Settings.tsx` ou via `install.php`) **conserve sa priorité absolue et continue d'écraser instantanément le logo ou favicon par défaut dès qu'une URL personnalisée (`s.logoUrl` ou `s.faviconUrl`) est renseignée**.

---

### 2. Matrice Technique des Actifs à Générer & Remplacer

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE DE GÉNÉRATION D'ACTIFS                                 │
├──────────────────────────┬──────────────┬──────────────┬───────────────────────────────┤
│ Destination              │ Dimensions   │ Format       │ Description & Usage           │
├──────────────────────────┼──────────────┼──────────────┼───────────────────────────────┤
│ public/favicon.ico       │ 16, 32, 48   │ ICO binaire  │ Favicon onglet navigateur     │
│ public/favicon.svg       │ Vectoriel    │ SVG moderne  │ Favicon vectoriel haute rés.  │
│ public/apple-touch-icon  │ 180 × 180    │ PNG          │ Icône d'accueil iOS Safari    │
│ public/icone-192.png     │ 192 × 192    │ PNG          │ PWA standard & Android        │
│ public/icone-512.png     │ 512 × 512    │ PNG          │ PWA Splash screen             │
│ src/assets/stacgate-logo │ 1024 × 1024  │ WebP (~35 Ko)│ Repli par défaut de Logo.tsx  │
│ public/media/stacgate... │ 1024 × 1024  │ PNG & WebP   │ Actif dans sélecteur médias   │
│ public/og-image.png      │ 1200 × 630   │ PNG (Hybride)│ Prévisualisation WhatsApp/OG  │
│ public/media/stacgate-   │ 800 × 800    │ WebP(Hybride)│ Badge Sceau officiel ArchiSys │
│   archisys-badge.webp    │              │              │ pour articles & médias        │
│ src/assets/stacgate-     │ 1200 × 630   │ WebP(Hybride)│ Bannière Page À Propos        │
│   archisys-banner.webp   │              │              │ et Dashboard Backstage        │
└──────────────────────────┴──────────────┴──────────────────────────────────────────────┘
```

---

### 3. Plan d'Action Découpé en Étapes Chirurgicales

#### Étape 31.A : Pipeline Automatisé de Génération Multiformats (`scripts/generer-actifs-marque.ts`)

1. Développement d'un script d'ingénierie graphique sous `sharp` :
   - Traitement de `logo-StacGate.png` pour générer les PNG redimensionnés aux résolutions exactes avec interpolation Lanczos3 :
     - `public/apple-touch-icon.png` (180 × 180).
     - `public/icone-192.png` (192 × 192).
     - `public/icone-512.png` (512 × 512).
   - Génération du `public/favicon.ico` multi-résolutions (16, 32, 48 px).
   - Génération de `public/favicon.svg` intégrant le symbole vectoriel épuré de StacGate Platform.
   - Compression WebP haute performance : `src/assets/stacgate-logo.webp` (passage de 1.68 Mo à ~35 Ko pour un chargement immédiat à 0 ms).
   - Archivage/suppression propre des anciens fichiers `ka-tech-logo.webp` et `ka-tech-monogramme.svg`.

#### Étape 31.B : Composition Mathématique de l'Image Hybride (`StacGate Platform × ArchiSys3.0`)

1. **Composition de la Bannière Horizontale 1200 × 630 px (Bannière Fondateur & OG Image) :**
   - Fond sombre élégant assorti au thème nocturne (`#0a0d12` / `#0f141c`).
   - Placement du logo StacGate sur la gauche avec typographie moderne _"STACGATE PLATFORM — Plateforme E-Commerce Universelle"_.
   - Intégration soignée de la signature officielle `Signature-ArchiSys30.png` sur la droite, surmontée du sceau _"Conception & Direction d'Architecture R&D — ArchiSys3.0"_.
   - Export vers `public/og-image.png` (OpenGraph/WhatsApp) et `src/assets/stacgate-archisys-banner.webp`.
2. **Composition du Badge Officiel Carré 800 × 800 px :**
   - Agencement centré équilibré : Logo StacGate en haut, mention de certification centrale, Signature ArchiSys3.0 en bas.
   - Export vers `public/media/stacgate-archisys-badge.webp`.

#### Étape 31.C : Intégration dans les Écrans avec Priorité aux Téléversements Tiers

1. **Dans [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Logo.tsx) :**
   - Remplacement de l'import de repli par `defaultLogoSrc` issu de `@/assets/stacgate-logo.webp`.
   - Maintien intangible de la condition :
     ```tsx
     const customSrc = s.logoUrl && s.logoUrl.trim() !== "" ? resoudreUrlMedia(s.logoUrl) : "";
     const hasCustomLogo = Boolean(customSrc && !loadError);
     const logoSrc = hasCustomLogo ? customSrc : defaultLogoSrc;
     ```
     _(Garantit à 100% qu'un téléversement tiers passe toujours en priorité sur le logo par défaut)._
2. **Dans [`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx) :**
   - Intégration de la bannière hybride ou du sceau dans le volet d'architecture et de direction de projet, attestant de la conception par ArchiSys3.0.
3. **Dans [`src/pages/admin/Dashboard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Dashboard.tsx) :**
   - Ajout d'une discrète carte d'honneur d'architecture dans le Backstage attestant du socle validé par ArchiSys3.0.
4. **Dans [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) :**
   - Raccordement du preview par défaut au nouveau logo WebP léger sans toucher aux fonctionnalités d'upload et de réinitialisation.

#### Étape 31.D : Batterie de Tests CI & Packaging Cumulatif

1. `bun run verifier-i18n` (100% de parité trilingue FR/EN/AR).
2. `bun run format` (conformité Prettier).
3. `bun run lint` (0 erreur ESLint).
4. `bunx tsc --noEmit` (0 erreur TypeScript).
5. `bun run build; bun run paqueter:data` (nouvelles archives `katech-site-*.zip` et `katech-data-*.zip`, conservation de l'historique complet).
6. Journalisation dans [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) et synchronisation Git.

---

### 4. Matrice de Recette & Vérification

- [ ] L'ensemble des icônes (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icone-192.png`, `icone-512.png`) affiche fidèlement le logo StacGate.
- [ ] L'image `public/og-image.png` affiche la composition haute résolution unissant StacGate Platform et la signature ArchiSys3.0.
- [ ] Le téléversement d'un logo tiers dans _Réglages > Identité visuelle_ écrase immédiatement le logo StacGate sur l'ensemble de la vitrine.
- [ ] Le téléversement d'un favicon tiers écrase immédiatement le favicon par défaut dans l'onglet du navigateur.
- [ ] Le poids du logo par défaut passe de 1.68 Mo à ~35 Ko (gain de performance de ~98%).
- [ ] Zéro erreur de compilation TypeScript, ESLint ou i18n.
