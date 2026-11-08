# PLAN D'IMPLÉMENTATION — PHASE 39

## Universalisation des Vues Composables 360° : Intégration de l'Accueil, À Propos, Contact & Gestion Globale des Écrans

**Projet :** StacGate Platform (ka-tech)  
**Directeur & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Statut :** 📋 **Sous-Phase 39.1 en attente de validation formelle par ArchiSys3.0**

---

### 1. Contexte & Problématique

Dans l'état actuel de l'application :

- L'onglet **`[📄 Pages & Vues Composables]`** du Studio Visuel n'exposait à l'origine que deux pages créées (`/cv` et `/projets`).
- Les vues primordiales du site — **Page d'Accueil (`/`)**, **À propos (`/about`)**, et **Contact (`/contact`)** — sont restées des composants React monolithiques à disposition figée.
- ArchiSys3.0 a validé l'**Option C (Convergence Graduelle 360°)** pour faire entrer la **Page d'Accueil** et les **Pages Institutionnelles** au rang de **Vues Composables Souveraines**, réordonnables et éditables bloc par bloc.
- **Audit de Recette Critique :** L'audit d'intégrité a mis en lumière que la table SQLite `site_content` ne contenait pas encore la ligne physique `customPages`, et que le contrôleur PHP [`ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php) fusionnait récursivement les listes indexées au lieu de les remplacer atomiquement, ce qui corrompait les suppressions et réordonnancements de pages en base.

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
5. **Persistance Souveraine BD SQLite Directe :**
   - Remplacement atomique des listes indexées dans le contrôleur backend PHP.
   - Écriture physique de la section `customPages` dans la table SQLite `site_content`.
   - Inclusion dans `scripts/extraire-donnees-front.ts` pour que `install.php` initialise immédiatement les vues sur toute nouvelle boutique.

---

### 3. Matrice des Vues Intégrées au Studio Composable

| ID Vue         | Slug             | Titre FR               | Blocs Pré-assemblés par Défaut                                                                                                | Type de Vue                    |
| :------------- | :--------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| `page_home`    | `""` (ou `home`) | 🏠 Accueil             | `hero_banner`, `flash_sale`, `category_cards`, `use_chips`, `best_sellers`, `featured_tabs`, `brands_marquee`, `why_us`, etc. | **Système / Vitrine**          |
| `page_about`   | `about`          | 🏢 À propos & Histoire | `company_history`, `values_cards`, `stats_counter`, `contact_cta`                                                             | **Système / Institutionnelle** |
| `page_contact` | `contact`        | ✉️ Contact & Support   | `direct_contact_cards`, `contact_form`, `faq_accordion`                                                                       | **Système / Support**          |
| `page_cv`      | `cv`             | 👤 Profil & CV         | `profile_hero`, `timeline`, `skills_matrix`, `projects_grid`, `contact_form`                                                  | **Sur-mesure / Profil**        |
| `page_projets` | `projets`        | 🚀 Réalisations        | `projects_grid`, `contact_cta`                                                                                                | **Sur-mesure / Showcase**      |

---

### 4. Découpage des Étapes Chirurgicales

#### Étape 39.1 : Enrichissement du Référentiel des Vues (`site-content.ts`) — [LIVRÉ]

- Définition des pages maîtresses `page_home`, `page_about`, `page_contact` dans `seedCustomPages()` avec leurs blocs initiaux et leurs traductions trilingues (FR, EN, AR).
- Adaptation de `mergeSiteContent()` pour garantir que toute base existante reçoive les vues piliers sans écraser les pages existantes.

#### Étape 39.2 : Passerelle Composable sur la Page d'Accueil (`Index.tsx`) — [LIVRÉ]

- Détection dans `Index.tsx` de la présence de la vue composable `page_home`.
- Restitution des blocs selon l'ordre choisi via `renderBlock(block)`, avec repli gracieux legacy.

#### Étape 39.3 : Passerelle Composable sur les Pages Institutionnelles (`About.tsx` & `Contact.tsx`) — [LIVRÉ]

- Restitution dynamique des blocs composables sur `/about` et `/contact` avec repli gracieux.

#### Étape 39.4 : Raffinement Visuel & Sécurisation du Studio (`PagesManager.tsx`) — [LIVRÉ]

- Badges distinctifs (`Accueil Vitrine`, `Système`, `Sur-mesure`), verrouillage de suppression de l'accueil, prévisualisation directe.

---

### Sous-Phase 39.1 : Sécurisation Atomique de la Persistance Backend SQLite & Raccordement Extracteur Installateur

#### Étape 39.1.A : Remplacement Atomique des Listes dans `ControleurContenu.php`

- Dans [`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php#L110) :
  - Détecter si le payload d'une section entrante est une liste ordonnée indexée (`array_is_list($payloadEntrant)` ou `empty($payloadEntrant)`).
  - Si oui, substituer intégralement la valeur (`$fusionne = $payloadEntrant;`) plutôt que d'exécuter une fusion associative par index numérique.
  - Résout définitivement tout risque de corruption lors du réordonnancement ou de la suppression de pages.

#### Étape 39.1.B : Raccordement dans l'Extracteur de Données & Seed Installateur

- Dans [`scripts/extraire-donnees-front.ts`](file:///c:/xampp/htdocs/ka-tech/scripts/extraire-donnees-front.ts#L699) :
  - Ajouter `customPages: siteContentSeed.customPages` et `contact: siteContentSeed.contact` dans le dictionnaire `siteContent`.
  - Exécuter l'extraction (`bun run scripts/extraire-donnees-front.ts`) pour régénérer `api/tools/donnees-front.json`.

#### Étape 39.1.C : Injection Physique Directe en Base SQLite Active

- Exécuter la mise à jour directe dans la base de données active [`katech-data/dev-a97b6b98a368.sqlite`](file:///c:/xampp/htdocs/ka-tech/katech-data/dev-a97b6b98a368.sqlite) afin d'inscrire la ligne `section = 'customPages'` avec le JSON complet des 5 vues.
- Vérifier par requête SQL que la ligne est présente, bien formée et immédiatement retournée par `GET /content`.

#### Étape 39.1.D : Batterie Qualité CI & Archives Horodatées

- `bun run verifier-i18n` (100% cohérent).
- `bunx tsc --noEmit` & `bun run lint` (0 erreur).
- `bun run build ; bun run paqueter:data` (régénération des archives de production).
- Mise à jour du journal `tracabilites.md` et synchronisation Git.

---

### 5. Matrice de Recette & Validation

| Test                                    | Comportement Attendu                                                                                                       | Statut Visé |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :---------- |
| **Persistance BD Directe**              | La table SQLite `site_content` contient la ligne physique `customPages` avec ses 5 vues.                                   | 🟢 Validé   |
| **Sauvegarde Backstage (`PATCH`)**      | Modifier l'ordre des blocs ou supprimer une page via l'API remplace atomiquement la liste en base sans laisser de résidus. | 🟢 Validé   |
| **Déploiement Installateur**            | `api/tools/donnees-front.json` embarque `customPages` pour toute nouvelle installation propre.                             | 🟢 Validé   |
| **Ordonnancement Accueil**              | Déplacer le bloc "Avis" au-dessus des "Produits phares" modifie instantanément l'affichage sur `/`.                        | 🟢 Validé   |
| **Insertion de Bloc Tiers à l'Accueil** | Ajouter une timeline ou un accordéon FAQ sur la page d'accueil s'affiche parfaitement entre les sections e-commerce.       | 🟢 Validé   |
| **Sécurité Suppression**                | Impossible de supprimer accidentellement la vue Accueil.                                                                   | 🟢 Validé   |
