# PLAN D'IMPLÉMENTATION — PHASE 60

## Harmonisation Universelle des Propriétés du Studio, Persistance Intégrale en Base de Données & Raccordement Fidèle des Composants Visuels

- **Date :** 23 Novembre 2026
- **Directeur de Projet & Architecte Décideur :** ArchiSys3.0
- **Tech Lead, Architecte & Consultant R&D :** AImi
- **Statut :** 🟢 **Validé par ArchiSys3.0 & En Cours de Livraison**
- **Dépôt Git Officiel :** `amichiamine/waymen-ai-studio` (Branche `main`)
- **Fichier Miroir :** 📄 [`.agents/Implementations_Plans/60_plan_harmonisation_persistance_props_studio_et_composants.md`](file:///c:/xampp/htdocs/waymen/.agents/Implementations_Plans/60_plan_harmonisation_persistance_props_studio_et_composants.md)

---

### 1. Contexte & Problématique Métier

Suite au diagnostic approfondi mené avec ArchiSys3.0, plusieurs composants majeurs administrés depuis le Studio Visuel (`/admin/pages`) et le Gestionnaire de Contenu (`/admin/content`, `/admin/settings`) présentent des ruptures dans la chaîne de persistance et de restitution :

1. **Bannière Hero (`hero_banner`) :**
   - Le Studio stocke des clés plates (`primaryCtaText`, `primaryCtaHref`, etc.), alors que le composant `Hero.tsx` attend un objet structuré `primaryCta: { label, href }`. Les boutons personnalisés dans le Studio sont donc ignorés à l'affichage.
   - Les indicateurs clés (KPIs) et le commutateur d'affichage de l'image ne sont pas exposés dans le Studio.
2. **Ventes Flash & Compte à Rebours (`flash_sale`) :**
   - Le compte à rebours se recalcule de manière relative à chaque chargement de page (`Date.now() + countdownHours`) au lieu d'être ancré sur une date de fin absolue et persistée (`endsAt`).
   - Le sous-titre (`subtitle`) et les boutons "Voir tout" (`viewAllLabel`, `viewAllHref`) ne sont ni éditables dans le Studio, ni affichés dans le composant.
3. **Bandes Défilantes (`ticker_bar` & `brands_marquee`) :**
   - Le paramètre de vitesse (`speed`) du bandeau textuel n'est pas appliqué dans le JSX de `Ticker.tsx` (classe CSS figée).
   - Les messages dans `ticker_bar` ne sont pas localisés en trois langues (FR/EN/AR).
4. **Bannières & Visuels (`brand_banner`, `full_width_banner`, `promo_banner`) :**
   - Dans `BrandBannerBlock.tsx`, `altText` est testé avec `typeof p.altText === "string"`, ce qui rejette les objets localisés `{ fr, en, ar }` produits par `LocalizedFieldEditor`.
   - Les chemins d'images de bannières ne passent pas par `resoudreUrlMedia()`.
   - Résidu hardcodé `KATECH15` dans le bandeau promo.

---

### 2. Architecture Technique Cible & Flux de Synchronisation

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     TOPOLOGIE CIBLE HARMONISÉE (PHASE 60)                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  [Studio Visuel /admin/pages]                 [Gestionnaire /admin/content]
              │                                              │
              ▼                                              ▼
   customPages[x].blocks[y].props                  site_content[section]
              │                                              │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │    Mappeur Hybride Bidirectionnel   │
                      │    (CommerceBlocks / Adaptateurs)    │
                      └──────────────┬───────────────┘
                                     │
                                     ▼
        ┌──────────────────────────────────────────────────────────┐
        │                 Composants de Rendu Fini                 │
        │                                                          │
        │  • Hero.tsx          : primaryCta, secondaryCta, kpis    │
        │  • FlashSale.tsx     : endsAt fixe (ISO) + countdown     │
        │                        + subtitle + viewAll              │
        │  • Ticker.tsx        : speedClass dynamique + i18n       │
        │  • BrandBanner.tsx   : altText Localized + resoudreMedia │
        │  • FullWidthBanner   : resoudreUrlMedia                  │
        └──────────────────────────────────────────────────────────┘
```

---

### 3. Plan d'Actions Chirurgical par Étape

#### Étape 1 : Normalisation du Contrat de Données & Mappeur du Bloc Hero (`hero_banner`)

- **Fichiers cibles :**
  - [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/CommerceBlocks.tsx)
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/waymen/src/components/admin/BlockPropsEditor.tsx)
  - [`src/components/blocks/registry.ts`](file:///c:/xampp/htdocs/waymen/src/components/blocks/registry.ts)
- **Actions :**
  1. Dans `CommerceBlocks.tsx` (`HeroBannerBlock`) : mapper intelligemment les props qu'elles soient plates (`primaryCtaText` / `primaryCtaHref`) ou structurées (`primaryCta: { label, href }`) vers l'objet attendu par `Hero.tsx`.
  2. Dans `BlockPropsEditor.tsx` : exposer l'édition complète des KPIs (chiffre + libellé trilingue) et du commutateur d'affichage de l'image pour le Hero.
  3. Dans `registry.ts` : mettre à jour les métadonnées par défaut pour inclure ces propriétés.

#### Étape 2 : Modernisation du Bloc Ventes Flash & Compte à Rebours (`flash_sale`)

- **Fichiers cibles :**
  - [`src/components/FlashSale.tsx`](file:///c:/xampp/htdocs/waymen/src/components/FlashSale.tsx)
  - [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/CommerceBlocks.tsx)
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/waymen/src/components/admin/BlockPropsEditor.tsx)
- **Actions :**
  1. Dans `FlashSale.tsx` : enrichir le calcul du compte à rebours :
     - Si une date absolue `endsAt` est fournie (ex: format ISO `2026-12-31T23:59:59Z`), le compte à rebours décompte exactement jusqu'à cette échéance fixe persistée en base (sans se réinitialiser au reload).
     - Si seule une durée `countdownHours` est présente, conserver le mode relatif par repli.
  2. Dans `FlashSale.tsx` : intégrer le rendu visuel du sous-titre (`subtitle`) trilingue sous le titre principal.
  3. Dans `BlockPropsEditor.tsx` :
     - Ajouter un sélecteur de date/heure de fin (`endsAt`) de type `datetime-local` ou date ISO.
     - Ajouter les champs d'édition pour le sous-titre (`subtitle`), le libellé du bouton "Voir tout" (`viewAllLabel`) et son lien (`viewAllHref`).

#### Étape 3 : Raccordement Réel de la Vitesse & Support Trilingue des Bandes Défilantes (`ticker_bar` & `brands_marquee`)

- **Fichiers cibles :**
  - [`src/components/Ticker.tsx`](file:///c:/xampp/htdocs/waymen/src/components/Ticker.tsx)
  - [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/CommerceBlocks.tsx)
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/waymen/src/components/admin/BlockPropsEditor.tsx)
- **Actions :**
  1. Dans `Ticker.tsx` : brancher la classe CSS dynamique en fonction de `override.speed` :
     - `slow` ➔ `animate-marquee-slow`
     - `normal` ➔ `animate-marquee`
     - `fast` ➔ `animate-marquee-fast`
  2. Dans `BlockPropsEditor.tsx` : permettre soit d'utiliser les messages de la base SQLite existante (`useTickerMessageList`), soit de définir des messages personnalisés avec support de localisation trilingue.

#### Étape 4 : Correction du Typage Localisé & Résolution Médias (`brand_banner`, `full_width_banner`, `promo_banner`)

- **Fichiers cibles :**
  - [`src/components/blocks/BrandBannerBlock.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/BrandBannerBlock.tsx)
  - [`src/components/blocks/FullWidthBannerBlock.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/FullWidthBannerBlock.tsx)
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/waymen/src/components/admin/BlockPropsEditor.tsx)
- **Actions :**
  1. Dans `BrandBannerBlock.tsx` : utiliser `useLocalize()` pour résoudre `altText`, qu'il soit une `string` simple ou un objet `Localized<string>`.
  2. Dans `BrandBannerBlock.tsx` et `FullWidthBannerBlock.tsx` : enrober `bannerSrc` avec `resoudreUrlMedia()` pour garantir le bon chargement des images téléversées dans la médiathèque.
  3. Dans `BlockPropsEditor.tsx` : nettoyer le code promo par défaut en `WAYMEN15` (au lieu de `KATECH15`).

#### Étape 5 : Pont d'Héritage Dynamique Studio $\leftrightarrow$ Contenu Global

- **Fichiers cibles :**
  - [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/CommerceBlocks.tsx)
- **Actions :**
  1. Dans chaque bloc de `CommerceBlocks.tsx`, implémenter une fusion en profondeur (`deepMerge` ou fallback gracieux) : si une propriété n'est pas spécifiquement modifiée dans le bloc Studio (`undefined`), elle hérite automatiquement de la valeur configurée dans `siteContent[section]`.
  2. Ainsi, toute modification effectuée dans `/admin/content` profite immédiatement aux blocs du Studio non surchargés, éliminant la sensation de « données non enregistrées ».

#### Étape 6 : Validation CI, Tests Runtime & Packaging

- **Actions :**
  1. Exécution du pipeline complet :
     ```powershell
     bun run verifier-i18n
     bunx tsc --noEmit
     bun run format
     bun run lint
     bun run build
     bun run paqueter:data
     ```
  2. Vérification sur le serveur de développement local et confirmation que les propriétés modifiées dans le Studio s'affichent instantanément à l'écran.
  3. Mise à jour du journal officiel de traçabilité [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/waymen/.agents/tracabilites.md).
  4. Commit et push vers `amichiamine/waymen-ai-studio`.

---

### 4. Matrice de Recette & Critères d'Acceptation

| Élément Testé                    | Comportement Avant                               | Comportement Attendu Après (Phase 60)                                  |
| :------------------------------- | :----------------------------------------------- | :--------------------------------------------------------------------- |
| **Boutons CTA Hero**             | Ignorés à l'affichage si modifiés dans le Studio | Les textes et liens CTA personnalisés s'affichent fidèlement           |
| **Compte à Rebours Flash**       | Recalculé à chaque rechargement de page          | Compte à rebours fixe jusqu'à la date exacte `endsAt` persistée en BD  |
| **Sous-titre Vente Flash**       | Invisible sur la vitrine                         | Rendu sous le titre avec typographie soignée et support trilingue      |
| **Vitesse du Ticker**            | Inerte (toujours même vitesse)                   | Vitesse lente, normale ou rapide appliquée dynamiquement au défilement |
| **Bannière Marque (`altText`)**  | Ignoré si renseigné dans le Studio               | Texte alternatif trilingue résolu et injecté dans la balise `<img>`    |
| **Images Médiathèque Bannières** | Chemins relatifs bruts risquant l'échec HTTP     | Résolus via `resoudreUrlMedia()` pour un affichage garanti 100%        |
| **Héritage Contenu Global**      | Conflit / écrasement silencieux                  | Héritage intelligent sans perte si une prop n'est pas surchargée       |

---

### 5. Clôture & Soumission à Validation

Ce plan directeur est soumis à la validation d'ArchiSys3.0.  
Dès votre approbation (clic sur **Proceed** ou accord explicite), les chantiers seront immédiatement engagés dans le respect strict des contrats d'ingénierie.
