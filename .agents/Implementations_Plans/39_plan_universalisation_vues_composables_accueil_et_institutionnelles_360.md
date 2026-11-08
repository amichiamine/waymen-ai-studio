# PLAN D'IMPLÉMENTATION — PHASE 39

## Universalisation des Vues Composables 360° : Intégration de l'Accueil, À Propos, Contact & Gestion Globale des Écrans

**Projet :** StacGate Platform (ka-tech)  
**Directeur & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Statut :** 📋 **En attente de validation formelle par ArchiSys3.0**

---

### 1. Contexte & Problématique

Dans l'état actuel de l'application :

- L'onglet **`[📄 Pages & Vues Composables]`** du Studio Visuel n'expose que deux pages créées à l'origine (`/cv` et `/projets`).
- Les vues primordiales du site — **Page d'Accueil (`/`)**, **À propos (`/about`)**, et **Contact (`/contact`)** — sont restées des composants React monolithiques à disposition figée.
- Bien qu'éditables textuellement dans les autres onglets du Studio, ces pages ne bénéficient pas de la flexibilité suprême du moteur de 24 blocs : impossibilité de changer l'ordre vertical des sections, d'insérer un bloc tiers (ex: timeline, compétences, bannière marque) entre deux sections de la boutique, ou de dupliquer des blocs.
- ArchiSys3.0 a validé l'**Option C (Convergence Graduelle 360°)** pour faire entrer la **Page d'Accueil** et les **Pages Institutionnelles** au rang de **Vues Composables Souveraines**, réordonnables et éditables bloc par bloc.

---

### 2. Objectifs d'Architecture & Garanties Zéro Régression

1. **Intégration de l'Accueil (`/`) comme Vue Composable Racine :**
   - La page d'accueil devient la vue maîtresse `page_home` (slug: `""` ou `"home"`).
   - Les blocs de l'accueil (Hero, FlashSale, Catégories, Produits Phares/Meilleures Ventes, Réassurance, Avis, CTA Contact) deviennent des blocs réordonnables avec les flèches `↑` / `↓`.
   - Si `Index.tsx` détecte la configuration composable, il restitue fidèlement l'ordre personnalisé des blocs ; en cas d'absence de configuration, il applique le repli élégant existant. ZÉRO régression.
2. **Intégration des Pages Institutionnelles Clés :**
   - `page_about` (`/about`) : composée des blocs natifs `company_history`, `values_cards`, `stats_counter`, `contact_cta`.
   - `page_contact` (`/contact`) : composée des blocs `contact_form`, `faq_accordion`, `brand_banner`.
3. **Synchronisation & Préservation des Données Existantes :**
   - Mise à jour de `seedCustomPages()` et renforcement de `mergeSiteContent()` dans [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) : si une boutique a déjà des pages créées, les pages système manquantes (`home`, `about`, `contact`) sont injectées sans écraser ni réinitialiser le travail existant.
4. **Ergonomie Backstage Enrichie ([`PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)) :**
   - Badges visuels distinctifs dans la liste de gauche : `[Accueil]`, `[Institutionnelle]`, `[Sur-mesure]`.
   - Protection des routes maîtresses (impossibilité de supprimer accidentellement la page d'accueil).
   - Bouton de prévisualisation directe ouvrant la véritable route (`/`, `/about`, `/contact`, `/cv`, `/projets`, etc.) dans un nouvel onglet.
5. **Sanctuarisation Stricte :**
   - Zéro impact sur la base de données SQLite, les schémas SQL, les commandes, les clients, le panier, et le système d'authentification.
   - Parité linguistique trilingue intégrale (FR, EN, AR) sur toutes les nouvelles descriptions et libellés.

---

### 3. Matrice des Vues Intégrées au Studio Composable

| ID Vue         | Slug             | Titre FR               | Blocs Pré-assemblés par Défaut                                                                                            | Type de Vue                    |
| :------------- | :--------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------ | :----------------------------- |
| `page_home`    | `""` (ou `home`) | 🏠 Accueil             | `hero_banner`, `flash_sale`, `category_cards`, `products_grid`, `brands_marquee`, `why_us`, `reviews_grid`, `contact_cta` | **Système / Vitrine**          |
| `page_about`   | `about`          | 🏢 À propos & Histoire | `company_history`, `values_cards`, `stats_counter`, `contact_cta`                                                         | **Système / Institutionnelle** |
| `page_contact` | `contact`        | ✉️ Contact & Support   | `contact_form`, `faq_accordion`, `brand_banner`                                                                           | **Système / Support**          |
| `page_cv`      | `cv`             | 👤 Profil & CV         | `profile_hero`, `timeline`, `skills_matrix`, `projects_grid`, `contact_form`                                              | **Sur-mesure / Profil**        |
| `page_projets` | `projets`        | 🚀 Réalisations        | `projects_grid`, `contact_cta`                                                                                            | **Sur-mesure / Showcase**      |

---

### 4. Découpage des Étapes Chirurgicales

#### Étape 39.1 : Enrichissement du Référentiel des Vues (`site-content.ts`)

- Définition des pages maîtresses `page_home`, `page_about`, `page_contact` dans `seedCustomPages()` avec leurs blocs initiaux et leurs traductions trilingues (FR, EN, AR).
- Adaptation de `mergeSiteContent()` pour garantir que toute base existante reçoive les vues piliers sans écraser les pages existantes.

#### Étape 39.2 : Passerelle Composable sur la Page d'Accueil (`Index.tsx`)

- Détection dans `Index.tsx` de la présence de la vue composable `page_home` (ou `slug === "" || slug === "home"`).
- Si la page dispose de blocs configurés, `Index.tsx` s'appuie sur le moteur de blocs (`BlockRenderer`) pour restituer les sections dans l'ordre choisi par l'administrateur, tout en conservant le SEO et les métadonnées de la boutique.
- Si la page est en mode classique ou vide, maintien strict du layout historique par défaut (zéro rupture).

#### Étape 39.3 : Passerelle Composable sur les Pages Institutionnelles (`About.tsx` & `Contact.tsx`)

- Raccordement similaire dans `About.tsx` et `Contact.tsx` : si la vue `about` ou `contact` est administrée dans `customPages`, restitution dynamique de ses blocs avec repli élégant vers le composant legacy.

#### Étape 39.4 : Raffinement Visuel & Sécurisation du Studio (`PagesManager.tsx`)

- Ajout des badges de classification (`Système`, `Page d'Accueil`, `Personnalisée`).
- Sécurisation du bouton de suppression : désactivé pour la page d'accueil.
- Bouton de prévisualisation externe (`Voir la page en direct`).
- Harmonisation des libellés trilingues dans `src/lib/i18n/admin/`.

#### Étape 39.5 : Recette CI & Packaging

- Exécution de `bun run verifier-i18n` (parité 100%).
- `bunx tsc --noEmit` & `bun run lint` (0 erreur).
- `bun run build ; bun run paqueter:data` (nouvelles archives horodatées).
- Mise à jour du journal `tracabilites.md` et synchronisation Git.

---

### 5. Matrice de Recette & Validation

| Test                                      | Comportement Attendu                                                                                                         | Statut Visé |
| :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :---------- |
| **Chargement Studio**                     | Les 5 vues (Accueil, À propos, Contact, CV, Projets) apparaissent dans la liste de gauche.                                   | 🟢 Validé   |
| **Ordonnancement Accueil**                | Déplacer le bloc "Avis" au-dessus des "Produits phares" modifie instantanément l'affichage sur `/`.                          | 🟢 Validé   |
| **Insertion de Bloc Tiers sur l'Accueil** | Ajouter un bloc `timeline` ou `markdown_section` sur la page d'accueil s'affiche parfaitement entre les sections e-commerce. | 🟢 Validé   |
| **Page À propos & Contact**               | Les blocs de `/about` et `/contact` peuvent être personnalisés ou complétés par d'autres blocs.                              | 🟢 Validé   |
| **Sécurité Suppression**                  | Impossible de supprimer accidentellement la vue Accueil.                                                                     | 🟢 Validé   |
| **Persistance BD**                        | Sauvegarde immédiate dans `site_content` sous SQLite sans altérer les produits, commandes ou clients.                        | 🟢 Validé   |
