# PLAN D'IMPLÉMENTATION — PHASE 54

## Éradication Complète des Reliques Hardware, Téléchargement Web des Vrais Logos Officiels IA, Réactivation du Bandeau Défilant & Sanctuarisation Exclusive de la Signature ArchiSys3.0

**Date d'Initialisation :** 22 Novembre 2026  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Statut du Plan :** 🟢 **Livré, Testé & Conforme (Phase 54 Validée et Livrée avec Succès)**  
**Branche Git Cible :** `main`  
**Dépôt Hôte :** `c:\xampp\htdocs\waymen`

---

### 1. Contexte, Constat & Enjeux

Suite au diagnostic approfondi validé par ArchiSys3.0, 4 axes majeurs nécessitent une intervention chirurgicale et définitive pour achever la pureté de la plateforme **WaYmen AI Studio** :

1. **Éradication de la signature combinée hors du footer :** L'image combinée `waymen-archisys-combined.webp` / `stacgate-archisys-combined.webp` subsiste dans plusieurs bannières de blocs composables et en tant que fallback de bannières. Conformément à la règle absolue édictée par ArchiSys3.0, la signature doit être **exclusivement et uniquement présente dans le footer** (`Footer.tsx`).
2. **Éradication intégrale des reliques informatiques matérielles :** Le bouton d'en-tête _"Configurez votre PC"_, le bouton central mobile _"Configurer"_, le bloc d'accueil `builder_teaser` et la route `/builder` doivent être reconvertis ou neutralisés au profit de l'offre IA réelle (Packs Métiers & Formations).
3. **Réactivation et fluidité du bandeau défilant (`BrandsMarquee`) :** Le bandeau des marques ne s'affiche plus correctement sur l'accueil en raison d'une divergence stricte entre les chaînes de `marquee.brands` et les entrées de la table `brands`. Il doit être refactorisé pour consommer directement la liste dynamique des marques et leurs logos SVG officiels.
4. **Téléchargement Web et intégration des véritables logos officiels IA :** Remplacer les tracés géométriques simplifiés par les véritables logos vectoriels SVG officiels téléchargés depuis le web pour les 13 marques, et régénérer les cartes produits avec ces visuels authentiques haute définition.

---

### 2. Découpage Méthodique des Étapes du Chantier

```text
                                PHASE 54
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
[Étape 54.1]                 [Étape 54.2]                 [Étape 54.3]
Confinement Signature        Éradication Reliques         Téléchargement Web Vrais
Exclusive au Footer          Hardware & Reconversion     Logos Officiels SVG (13)
      │                            │                            │
      └────────────────────────────┼────────────────────────────┘
                                   │
      ┌────────────────────────────┴────────────────────────────┐
      ▼                                                         ▼
[Étape 54.4]                                              [Étape 54.5]
Réactivation BrandsMarquee                                SQLite, CI, Build
Dynamique sur BD brands                                   & Nouveaux Paquets
```

---

### 3. Détail Opérationnel par Étape

#### Étape 54.1 : Éradication des Images Combinées & Confinement de la Signature au Footer Seul

- **Objectif :** Supprimer toute occurrence visuelle de la signature combinée dans le corps des pages et les bannières.
- **Actions Techniques :**
  1. Dans [`src/components/blocks/BrandBannerBlock.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/BrandBannerBlock.tsx) : basculer l'image par défaut sur [`public/media/waymen-og-banner.webp`](file:///c:/xampp/htdocs/waymen/public/media/waymen-og-banner.webp).
  2. Dans [`src/components/blocks/FullWidthBannerBlock.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/FullWidthBannerBlock.tsx) : remplacer le fallback par `waymen-og-banner.webp`.
  3. Dans [`src/components/blocks/ProfileHeroBlock.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/ProfileHeroBlock.tsx) et [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/waymen/src/components/admin/BlockPropsEditor.tsx) : retirer les imports de signatures combinées.
  4. Dans [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/waymen/src/lib/site-content.ts) et [`src/components/blocks/registry.ts`](file:///c:/xampp/htdocs/waymen/src/components/blocks/registry.ts) : purger toutes les chaînes pointant vers `media/stacgate-archisys-combined.webp` ou `media/waymen-archisys-combined.webp`.
  5. Sanctuariser l'unique présence de la signature dans [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/waymen/src/components/Footer.tsx).

---

#### Étape 54.2 : Éradication Totale des Reliques Hardware & Reconversion en Métier IA

- **Objectif :** Transformer les boutons et liens vers le configurateur PC en accélérateurs de conversion WaYmen AI Studio.
- **Actions Techniques :**
  1. Dans [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/waymen/src/lib/site-content.ts) :
     - `header.builderCta` :
       - `label` : `{ fr: "Packs & Formations IA", en: "AI Packs & Courses", ar: "باقات ودورات الذكاء الاصطناعي" }`
       - `href` : `"/category/packs-metiers"`
     - `mobileBottomBar` (bouton central `mb_3`) :
       - `label` : `{ fr: "Packs IA", en: "AI Packs", ar: "باقات الذكاء" }`
       - `icon` : `"sparkles"`
       - `href` : `"/category/packs-metiers"`
  2. Désactiver le configurateur matériel par défaut :
     - Dans [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/waymen/src/data-provider/site-settings.ts) : `builderEnabled: false`.
  3. Dans les blocs de la page d'accueil (`page_home` dans `site_content`) :
     - Reconvertir ou masquer le bloc `b_home_builder` (`builder_teaser`) au profit d'un bloc vitrine packs ou d'une bannière studio.

---

#### Étape 54.3 : Téléchargement Web des Vrais Logos Officiels Vectoriels SVG (13 Marques)

- **Objectif :** Récupérer directement depuis les dépôts officiels du web les logos vectoriels authentiques et haute résolution pour les 13 marques IA.
- **Actions Techniques :**
  1. Élaborer un script [`scripts/telecharger-logos-officiels.ts`](file:///c:/xampp/htdocs/waymen/scripts/telecharger-logos-officiels.ts) téléchargeant les SVG officiels purs :
     - **OpenAI :** Emblème officiel haute précision.
     - **Anthropic Claude :** Symbole officiel officiel.
     - **Google Gemini :** Étoile quadri-chromique officielle Google.
     - **Midjourney :** Voilier officiel haute fidélité.
     - **Cursor :** Cube isométrique officiel développeur.
     - **Microsoft / Copilot :** Grille quadri-couleur officielle et emblème Copilot.
     - **Perplexity :** Logo astérisque officiel.
     - **ElevenLabs :** Logo officiel des barres audio.
     - **Runway :** Emblème cinématique officiel.
     - **Canva :** Logo typographique et emblème officiel.
     - **Notion :** N cubique officiel.
     - **WaYmen Academy :** Emblème officiel de formation.
     - **WaYmen VIP :** Insigne prestige officiel.
  2. Enregistrer ces fichiers dans [`public/media/brands/`](file:///c:/xampp/htdocs/waymen/public/media/brands) et [`src/assets/brands/`](file:///c:/xampp/htdocs/waymen/src/assets/brands).
  3. Mettre à niveau [`scripts/generer-cartes-services.ts`](file:///c:/xampp/htdocs/waymen/scripts/generer-cartes-services.ts) pour intégrer ces véritables logos officiels dans les 18 visuels produits WebP.

---

#### Étape 54.4 : Réactivation Dynamique & Fluidification du Bandeau Défilant (`BrandsMarquee`)

- **Objectif :** Rétablir le défilement fluide et ininterrompu des marques officielles sur l'accueil.
- **Actions Techniques :**
  1. Modifier [`src/components/BrandsMarquee.tsx`](file:///c:/xampp/htdocs/waymen/src/components/BrandsMarquee.tsx) :
     - Alimenter directement le carrousel à partir de la liste dynamique des marques renvoyée par `useBrandList()`.
     - Afficher systématiquement le logo SVG officiel haute définition et le nom de la marque.
  2. Mettre à jour `site_content.marquee.brands` pour aligner les noms avec la table `brands`.

---

#### Étape 54.5 : Re-synchronisation SQLite Locale, Extraction des Données & Pipeline CI

- **Objectif :** Garantir la cohérence 1:1 entre les fichiers sources, la base de données locale active et les paquets livrables.
- **Actions Techniques :**
  1. Exécuter `bun run scripts/extraire-donnees-front.ts` pour générer `donnees-front.json`.
  2. Ré-importer dans la base locale via `php .agents/scratch/purger_et_reimporter_waymen.php`.
  3. Exécuter la batterie CI complète :
     - `bun run verifier-i18n` (parité trilingue FR/EN/AR)
     - `bunx tsc --noEmit` (0 erreur TypeScript)
     - `bun run format` (conforme Prettier)
     - `bun run lint` (0 erreur ESLint)
     - `bun run build` (compilation et prérendu)
     - `bun run paqueter:data` (archive horodatée SQLite)
  4. Mettre à jour le journal de bord [`tracabilites.md`](file:///c:/xampp/htdocs/waymen/.agents/tracabilites.md) avec l'entrée de la Phase 54.

---

### 4. Matrice de Recette & Critères d'Acceptation de la Phase 54

| Point de Contrôle                      | Résultat Attendu & Obtenu                                                                                     |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Sanctuarisation Signature**          | Signature ArchiSys3.0 présente **exclusivement** dans le Footer. 0 bannière combinée dans le corps des pages. |
| **Éradication Reliques PC**            | 0 bouton _"Configurez votre PC"_, 0 bouton _"Configurer"_, CTA reconvertis vers les Packs & Formations IA.    |
| **Bandeau Défilant (`BrandsMarquee`)** | Défilement fluide sur la page d'accueil avec les 13 vrais logos officiels de marques.                         |
| **Qualité des Logos Officiels**        | Logos vectoriels authentiques téléchargés depuis le web et visuels de cartes de services premium.             |
| **Pipeline CI**                        | `tsc`, `lint`, `verifier-i18n` et `build` passent à 100% avec code de retour 0.                               |

---

### 5. Sous-Phase 54.1 : Assainissement Radical du Logo en Base SQLite & Refonte Éditoriale du Blog (100% LIVRÉE)

> [!NOTE]
> La Sous-Phase 54.1 a éliminé la cause racine de la persistance de l'image combinée (présente dans `settings.logoUrl` en base SQLite locale) en la réalignant sur `media/waymen-logo.webp`, a blindé `Logo.tsx` d'un garde-fou strict, a automatisé la purge du cache `localStorage` au chargement de `index.html`, et a réécrit intégralement les 5 articles de blog sur les thématiques d'IA et de productivité WaYmen AI Studio.
