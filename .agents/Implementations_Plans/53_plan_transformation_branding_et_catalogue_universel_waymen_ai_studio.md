# PLAN D'IMPLÉMENTATION — PHASE 53

## Transformation Branding 360°, Déclinaison Visuelle Logo & Catalogue Universel WaYmen AI Studio (Abonnements, Licences & Formations IA)

**Date d'Initialisation :** 22 Novembre 2026  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Statut du Plan :** 🟢 **Livré, Testé & Conforme (Sous-Phase 53.3 Validée et Livrée avec Succès)**  
**Branche Git Cible :** `main`  
**Dépôt Hôte :** `c:\xampp\htdocs\waymen`

---

### 1. Contexte, Enjeux & Vision Métier

L'application passe d'une boutique démonstrative de matériel informatique à une plateforme souveraine de référence pour la marque **WaYmen AI Studio** (_Waymen_).

Cette transformation stratégique couvre deux piliers majeurs :

1. **Pôle Abonnements & Licences Numériques :** Activation d'abonnements officiels (mensuels, trimestriels, annuels) sur les écosystèmes IA majeurs du marché : OpenAI, Anthropic, Google, Midjourney, Cursor, GitHub Copilot, Perplexity, ElevenLabs, Canva Pro, Notion AI, Microsoft 365 Copilot, etc.
2. **Pôle Formations & Coaching IA (Waymen Academy) :** Tutoriels, masterclass et formations spécialisées pour la maîtrise pratique des outils IA par domaine d'expertise et profil d'utilisateur (débutants, professionnels, développeurs, marketeurs, créatifs multimédia, entreprises).
3. **Identité Visuelle & Déclinaisons 360° du Logo :** Traitement haute définition du logo source officiel 📄 [`waymen-002.jpg`](file:///c:/xampp/htdocs/waymen/waymen-002.jpg) (détourage transparent, adaptation WebP, icônes PWA, favicons multi-résolutions).
4. **Catalogue Prêt à l'Emploi & Trilingue :** Injection d'un jeu de données riche de plus de 23 offres réelles avec parité stricte FR/EN/AR, livraison dématérialisée par email/WhatsApp, et synchronisation directe en base de données SQLite locale.

---

### 2. Découpage Chirurgical des Étapes Antérieures Réalisées

```text
                                 PHASE 53
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
    [Étape 53.1]              [Étape 53.2]              [Étape 53.3]
 Traitement Logo         Génération 18 Cartes      Catalogue Universel
 & Actifs Multiformats      Services WebP          23 Offres & Formations
   (100% FAIT)               (100% FAIT)               (100% FAIT)
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
    [Étape 53.4]                                        [Étape 53.5]
Composants Vitrine, Logo & SEO                     Persistance SQLite & donnees-front
   (100% FAIT)                                         (100% FAIT)
                                    │
                                    ▼
                              [Étape 53.6]
                        Contrôles CI, Build & Paquets
                               (100% FAIT)
```

---

### 3. Sous-Phase 53.1 : Purge Intégrale des Données Matérielles, Assainissement des Blocs Composables Studio & Éradication des Angles Noirs Informatiques

> [!NOTE]
> La Sous-Phase 53.1 a permis de restructurer le frontend, d'assainir le registre des blocs `registry.ts`, de réécrire la section `about` et de débrider `CategoryCards.tsx`.

---

### 4. Matrice de Recette Réalisée de la Sous-Phase 53.1

| Point de Contrôle             | Résultat Obtenu                                                                              |
| :---------------------------- | :------------------------------------------------------------------------------------------- |
| **Composant CategoryCards**   | Débridé à 6 catégories avec icônes sémantiques IA (`Bot`, `Palette`, `Code2`, etc.).         |
| **Registre des Blocs Studio** | 100% des defaultProps réécrites pour WaYmen AI Studio (0 mention de boîtier PC ou matériel). |
| **Section À Propos**          | Réécrite pour WaYmen AI Studio, typage d'icône conforme (`award`).                           |
| **Pipeline CI**               | `tsc`, `lint`, `verifier-i18n` et `build` passent à 100% avec exit code 0.                   |

---

### 5. Sous-Phase 53.2 : Découplage Souverain du Projet Waymen, Purge Physique de la Base Locale SQLite & Éradication des Dépendances Croisées Ka-Tech

> [!NOTE]
> La Sous-Phase 53.2 a consacré l'indépendance hermétique absolue de `waymen` vis-à-vis de `ka-tech`, réaligné `api/.env`, purgé physiquement la base SQLite locale active et synchronisé l'API de dev (port 8160) avec le frontend Vite (port 8080).

---

### 6. Matrice de Recette Réalisée de la Sous-Phase 53.2

| Point de Contrôle                          | Résultat Obtenu                                                                                                                                                                            |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Souveraineté des Chemins**               | [`api/.env`](file:///c:/xampp/htdocs/waymen/api/.env) pointe à 100% sur `C:/xampp/htdocs/waymen/katech-data/` et `waymen/uploads`. 0 référence à `ka-tech`.                                |
| **Base SQLite Locale de Waymen**           | `C:/xampp/htdocs/waymen/katech-data/dev-a97b6b98a368.sqlite` contient exactement 6 catégories IA, 13 marques IA, 23 produits/services IA et 22 sections de contenu. 0 PC portable ni tour. |
| **Bouton d'Accueil (Stabilité 0 ms / 3s)** | Le bouton principal affiche _« Découvrir les Abonnements »_ et **ne bascule plus jamais** en _« Acheter maintenant »_.                                                                     |
| **Navigation Clic Bouton Principal**       | Le clic sur _« Découvrir les Abonnements »_ ouvre `/category/llm-assistants` et affiche immédiatement les 8 abonnements OpenAI, Claude, Gemini, Perplexity.                                |
| **Indépendance du Projet**                 | Le projet `waymen` fonctionne de manière 100% autonome.                                                                                                                                    |

---

### 7. Sous-Phase 53.3 : Raffinement Visuel Studio (Vrais Logos Officiels des Marques IA), Épurement 100% Waymen du Logo Principal & Sanctuarisation Discrète de la Signature ArchiSys3.0 dans le Footer

> [!IMPORTANT]
> **Consignes & Arbitrages d'ArchiSys3.0 :**
>
> 1. **Logo Principal & Identité :** Le logo du site (Header, Navigation Mobile, Backstage Admin) doit être **exclusivement le logo officiel de WaYmen AI Studio** (l'emblème WY avec typographie épurée sur fond transparent). **Aucune co-signature ni mention externe ne doit y figurer.**
> 2. **Sanctuarisation de la Signature ArchiSys3.0 :** La signature officielle ArchiSys3.0 (`Signature-ArchiSys30.png`) doit être visible **UNIQUEMENT et EXCLUSIVEMENT dans le pied de page (`Footer`)**, accompagnée de la mention :  
>    _« Fait avec passion & ❤️ par ArchiSys3.0 »_.
>    Le logo de signature doit être **discret, élégant et non imposant** (taille subtile, intégration harmonieuse).
> 3. **Page À Propos :** Retrait du bloc/sceau central présent au milieu de `About.tsx` (lignes 196-220).
> 4. **Logos Officiels des Marques IA :** Remplacer les compositions synthétiques par les **véritables logos officiels vectoriels SVG des 13 éditeurs** (OpenAI, Claude, Google Gemini, Midjourney, Cursor, Copilot, ElevenLabs, Perplexity, Runway, Canva, Notion, Waymen Academy, Waymen VIP), les enregistrer dans la base SQLite (`brands.logo`) et magnifier les 18 cartes produits.

```text
                           SOUS-PHASE 53.3
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      ▼                           ▼                           ▼
[Sous-Étape 53.3.1]         [Sous-Étape 53.3.2]         [Sous-Étape 53.3.3]
Épurement Logo Principal    Signature ArchiSys3.0       Logos Officiels SVG
100% WaYmen (Header/Admin)  Sanctuarisée au Footer      13 Marques IA + BD
      │                           │                           │
      └───────────────────────────┼───────────────────────────┘
                                  │
      ┌───────────────────────────┴───────────────────────────┐
      ▼                                                       ▼
[Sous-Étape 53.3.4]                                     [Sous-Étape 53.3.5]
Régénération Studio Cartes                              Batterie CI, Build
Produits 18 Visuels WebP                                & Nouveaux Paquets
```

---

#### Sous-Étape 53.3.1 : Épurement 100% WaYmen du Logo Principal & Nettoyage Central

- **Objectif :** Garantir que le logo du site est purement et exclusivement WaYmen AI Studio.
- **Actions Techniques :**
  1. Dans [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/waymen/src/components/Logo.tsx) :
     - Importer et utiliser par défaut [`src/assets/waymen-logo.webp`](file:///c:/xampp/htdocs/waymen/src/assets/waymen-logo.webp) (l'emblème officiel WY détouré avec texte blanc net).
     - Remplacer l'attribut `alt` par `"WaYmen AI Studio"`.
  2. Dans [`src/pages/About.tsx`](file:///c:/xampp/htdocs/waymen/src/pages/About.tsx) :
     - Supprimer la section centrale « Sceau d'Architecture R&D » (lignes 196-220).
     - Nettoyer les mentions historiques de repli textuel (`StacGate Platform`).

---

#### Sous-Étape 53.3.2 : Sanctuarisation Discrète de la Signature ArchiSys3.0 dans le Footer

- **Objectif :** Intégrer élégamment la signature d'ArchiSys3.0 dans le footer, conformément aux consignes exactes.
- **Actions Techniques :**
  1. Dans [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/waymen/src/lib/site-content.ts) (section `footer.madeIn`) :
     - FR : `"Fait avec passion & ❤️ par ArchiSys3.0"`
     - EN : `"Made with passion & ❤️ by ArchiSys3.0"`
     - AR : `"صُنع بشغف و ❤️ بواسطة ArchiSys3.0"`
  2. Dans [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/waymen/src/components/Footer.tsx) :
     - Importer [`Signature-ArchiSys30.png`](file:///c:/xampp/htdocs/waymen/Signature-ArchiSys30.png).
     - Intégrer l'image de signature dans la barre inférieure du footer aux côtés du texte `madeIn`.
     - Appliquer un calibrage CSS discret et raffiné : `h-5 lg:h-6 object-contain opacity-80 hover:opacity-100 transition-opacity drop-shadow-sm` pour un rendu non imposant.

---

#### Sous-Étape 53.3.3 : Intégration des Vrais Logos Vectoriels SVG pour les 13 Marques IA

- **Objectif :** Disposer des vrais emblèmes graphiques officiels pour les plateformes IA.
- **Actions Techniques :**
  1. Créer un jeu d'icônes SVG vectorielles officielles pour les 13 marques sous `public/media/brands/` et `src/assets/brands/` :
     - `openai.svg` (fleur géométrique officielle)
     - `anthropic.svg` (symbole Claude officiel)
     - `google.svg` (étoile Gemini quadri-chromique)
     - `midjourney.svg` (voilier officiel)
     - `cursor.svg` (cube isométrique officiel)
     - `microsoft.svg` & `github.svg` (octocat / Copilot officiel)
     - `perplexity.svg` (astérisque infini officiel)
     - `elevenlabs.svg` (barres audio officielles)
     - `runway.svg` (R stylisé officiel)
     - `canva.svg` (mot-symbole Canva officiel)
     - `notion.svg` (N cubique officiel)
     - `waymen-academy.svg` (emblème académie officiel)
     - `waymen-vip.svg` (badge VIP or officiel)
  2. Mettre à jour la colonne `logo` de la table `brands` dans la base SQLite locale [`C:/xampp/htdocs/waymen/katech-data/dev-a97b6b98a368.sqlite`](file:///c:/xampp/htdocs/waymen/katech-data) et dans [`api/tools/donnees-front.json`](file:///c:/xampp/htdocs/waymen/api/tools/donnees-front.json).

---

#### Sous-Étape 53.3.4 : Régénération Studio Haute Fidélité des 18 Cartes Produits

- **Objectif :** Remplacer les visuels par des compositions studio haute définition intégrant les vrais logos officiels.
- **Actions Techniques :**
  1. Mettre à niveau le script [`scripts/generer-cartes-services.ts`](file:///c:/xampp/htdocs/waymen/scripts/generer-cartes-services.ts) pour intégrer les SVG officiels directement dans les compositions Sharp (1200x800).
  2. Régénérer les 18 fichiers `.webp` dans `src/assets/` et `public/media/` :
     - Cartes ChatGPT (Plus, Team, Annuel)
     - Cartes Claude (Pro, Annuel)
     - Cartes Gemini, Perplexity, Midjourney, Cursor, Copilot, Canva, Notion, ElevenLabs, Runway.
     - Cartes Formations WaYmen Academy et Packs VIP.

---

#### Sous-Étape 53.3.5 : Contrôles Qualité CI Inviolables & Packaging

- **Objectif :** Valider l'intégrité globale du projet.
- **Checks Obligatoires :**
  1. `bun run verifier-i18n` : Vérification parité trilingue stricte FR / EN / AR.
  2. `bunx tsc --noEmit` : 0 erreur TypeScript.
  3. `bun run format` : 100% conforme Prettier.
  4. `bun run lint` : 0 erreur ESLint.
  5. `bun run build` : Compilation Vite réussie avec bundle de production et prérendu.
  6. `bun run paqueter:data` : Nouvelle archive horodatée `katech-data` contenant la base SQLite avec logos de marques.

---

### 8. Matrice de Recette & Critères d'Acceptation de la Sous-Phase 53.3

| Point de Contrôle                   | Résultat Attendu                                                                                                                                     |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logo Principal (Header & Admin)** | Affiche **exclusivement le logo WaYmen AI Studio** (`waymen-logo.webp`), 0 co-signature.                                                             |
| **Signature ArchiSys3.0**           | Visible **uniquement dans le Footer**, avec le libellé _« Fait avec passion & ❤️ par ArchiSys3.0 »_ et le logo de signature discret (hauteur ~24px). |
| **Page À Propos**                   | 0 sceau central ArchiSys3.0, 0 texte résiduel StacGate. Présentation pure de WaYmen AI Studio.                                                       |
| **Logos Marques Officiels**         | Les 13 marques disposent de véritables logos vectoriels SVG dans `brands.logo` et s'affichent dans le carrousel `BrandsMarquee`.                     |
| **Cartes Produits Haute Fidélité**  | Les 18 visuels de services intègrent les vrais logos officiels (OpenAI, Claude, Gemini, etc.) en haute résolution.                                   |
| **Pipeline CI**                     | `tsc`, `lint`, `verifier-i18n` et `build` passent avec succès à 100%.                                                                                |
