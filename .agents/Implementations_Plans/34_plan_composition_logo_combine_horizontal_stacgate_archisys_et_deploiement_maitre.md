# PLAN D'IMPLÉMENTATION — PHASE 34

## Composition du Logo Combiné Horizontal Officiel (StacGate Platform × Signature ArchiSys3.0) & Déploiement dans le Composant Maître Logo

**Date :** 07 Novembre 2026  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan (`mode plan`)  
**Statut :** En attente de validation formelle par ArchiSys3.0 (Bouton "Proceed")

---

### 1. Objectifs & Cadre Stratégique

L'objectif de la **Phase 34** est de répondre directement à la demande explicite d'ArchiSys3.0 : disposer d'un **fichier image unique regroupant le logo StacGate et la signature ArchiSys3.0**, directement visible sur toute l'application (Header Navbar, Footer, Mobile, Backstage, Écrans d'authentification).

> [!IMPORTANT]
> **VERROU ARCHITECTURAL INVIOLABLE (RÈGLE DES VALEURS PAR DÉFAUT & DU WHITE-LABEL) :**
>
> 1. Le nouveau logo combiné devient la **valeur par défaut absolue (`defaultLogoSrc`)** du socle logiciel.
> 2. Tout téléversement de logo personnalisé par un commerçant depuis l'administration (`Settings.tsx`) ou via `install.php` (`s.logoUrl`) **continue de primer à 100% sur le logo par défaut**.

---

### 2. Spécifications Graphiques de l'Actif Combiné

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               COMPOSITION GRAPHIQUE HORIZONTALE (920 × 220 px)                         │
├──────────────────────────────┬──────────────┬──────────────────────────────────────────┤
│ Côté Gauche (StacGate)       │ Séparateur   │ Côté Droit (Signature ArchiSys3.0)       │
├──────────────────────────────┼──────────────┼──────────────────────────────────────────┤
│ • Symbole StacGate haute rés │ • Liseré fin │ • Signature officielle ArchiSys3.0       │
│ • Typographie "STACGATE"     │   vertical   │ • Sceau "CONCEPTION & ARCHITECTURE R&D"  │
│ • Sous-titre "PLATFORM"      │   gradient   │ • Mention "ArchiSys3.0 • Direction R&D"  │
└──────────────────────────────┴──────────────┴──────────────────────────────────────────┘
```

- **Format cible :** WebP haute densité avec canal alpha (fond transparent).
- **Emplacements physiques générés :**
  - `src/assets/stacgate-archisys-combined.webp` (consommé par le bundle front).
  - `public/media/stacgate-archisys-combined.webp` (accessible dans la médiathèque admin).
  - `public/media/stacgate-archisys-combined.png` (variante PNG non compressée).

---

### 3. Découpage Chirurgical en 4 Étapes

#### Étape 34.A : Pipeline Graphique Sharp (`scripts/generer-actifs-marque.ts`)

1. Enrichir le script d'ingénierie graphique avec une étape 5 bis dédiée :
   - Redimensionnement et cadrage du logo StacGate et de la signature ArchiSys3.0.
   - Tracé SVG haute définition composé d'un fond transparent, du symbole, de la typographie et de la signature avec liseré contrasté compatible à la fois avec le mode sombre et le mode clair.
   - Rendu et export automatisé vers `src/assets/stacgate-archisys-combined.webp` (< 35 Ko).

#### Étape 34.B : Branchement dans le Composant Maître (`src/components/Logo.tsx`)

1. Mettre à jour l'import par défaut :
   ```tsx
   import defaultLogoSrc from "@/assets/stacgate-archisys-combined.webp";
   ```
2. Nettoyer le conteneur du logo dans `Logo.tsx` pour éliminer tout fond blanc rigide (`dark:bg-white/95`) afin de laisser respirer la transparence naturelle du logo combiné sur les deux thèmes.
3. Conserver intacte la détection du logo personnalisé :
   ```tsx
   const customSrc = s.logoUrl && s.logoUrl.trim() !== "" ? resoudreUrlMedia(s.logoUrl) : "";
   const hasCustomLogo = Boolean(customSrc && !loadError);
   const logoSrc = hasCustomLogo ? customSrc : defaultLogoSrc;
   ```

#### Étape 34.C : Ajustements Ergonomiques Vitrine & Backstage

1. Vérifier le rendu dans :
   - La barre de navigation principale ([`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx)).
   - Le pied de page ([`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx)).
   - La barre latérale et l'en-tête admin ([`src/components/admin/AdminLayout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminLayout.tsx)).
   - Les réglages d'identité visuelle ([`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx)).
   - L'assistant d'onboarding ([`src/components/admin/SetupWizard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SetupWizard.tsx)).

#### Étape 34.D : Batterie de Contrôles Qualité CI & Livrables de Déploiement

1. `bun run verifier-i18n` (100% parité trilingue FR/EN/AR).
2. `bun run format` (conformité Prettier).
3. `bun run lint` (0 erreur ESLint).
4. `bunx tsc --noEmit` (0 erreur TypeScript).
5. `bun run build; bun run paqueter:data` (compilation complète et génération des archives zip horodatées).
6. Mise à jour de [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) et synchronisation Git (`git push origin main`).

---

### 4. Matrice de Recette & Critères de Succès

| Critère de Validation       | Comportement Attendu                                                                                        |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **Navbar Header**           | Le logo en haut à gauche affiche la combinaison officielle StacGate + Signature ArchiSys3.0.                |
| **Footer**                  | Le pied de page affiche la combinaison officielle StacGate + Signature ArchiSys3.0.                         |
| **Surcharge Personnalisée** | Si un utilisateur téléverse un logo dans l'admin, ce logo personnalisé remplace le logo combiné par défaut. |
| **Thèmes Clair / Sombre**   | La transparence du logo combiné s'adapte sans bavure ni contraste brisé sur fond noir comme sur fond clair. |
| **Poids & Performance**     | Fichier WebP ultra-léger (< 40 Ko), chargement instantané à 0 ms.                                           |
| **Zero Régression CI**      | Compilation, typage et linting 100% au vert.                                                                |
