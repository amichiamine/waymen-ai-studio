# PLAN D'IMPLÉMENTATION — PHASE 17

## Raccordement Serveur du Vidage/Reset (`/admin/reset`), Pastille Interactive & Formulaire Produit Universel

**Projet :** KA Tech Hub  
**Date :** 05/11/2026  
**Auteur :** AImi (Tech Lead, Architecte & Consultant R&D)  
**Destinataire :** ArchiSys3.0 (Directeur de Projet & Architecte Décideur)  
**Statut :** Soumis à validation (Consolidé avec Sous-Phase 17.1)

---

### 1. Objectifs & Enjeux

1. **Raccordement Serveur Effectif de `/admin/reset` :**  
   Permettre à la page backstage `/admin/reset` d'agir réellement sur la base de données SQL serveur (SQLite/MySQL/PostgreSQL) en mode HTTP, au lieu de se cantonner au store local `localStorage` (`admin-store.tsx`).
2. **Correction du Bug SQL `site_content` (Éradication du 500 `no such column: key`) :**  
   Remplacer le ciblage de la colonne inexistante `key` par `section` dans `ControleurMaintenance.php::executerVidage()` et aligner le mapping des sections réelles (`home-reviews`, `ticker`, `marquee`, `about`, `builder`).
3. **Pastille HTTP Interactive & Commutateur Développeur :**
   - Rendre la pastille `DataModeBadge` en bas à droite interactive (curseur pointeur, clic ouvrant une fenêtre d'inspection détaillée du mode réseau, de l'URL de base et des erreurs).
   - Ajouter dans l'écran Développeur (`/admin/developer`) un commutateur (Switch) permettant d'afficher ou masquer cette pastille à volonté avec persistance locale (`katech_show_data_badge`).
4. **Universalisation Complète du Formulaire Produit (`ProductForm.tsx`) :**
   - Remplacer le libellé « Ligne de specs » par « Accroche & points clés (résumé) » avec placeholders universels adaptés (ex: vêtements, cosmétiques, services, tech).
   - Reclasser la grille matérielle informatique (`CPU`, `RAM`, `Stockage`, `GPU`, `Écran`, `OS`) dans un bloc accordéon contextuel replié/déroulable (« Spécifications informatiques avancées »), visible prioritairement sur le matériel tech (`laptops`, `desktops`, `builds`, `phones`).
   - Mettre en avant l'éditeur de caractéristiques libres multilingues (Attribut / Valeur) pour tous les autres types de produits physiques et prestations de services.

---

### 2. Étapes Chirurgicales d'Implémentation

#### Sous-Phase 17.1

##### Étape 17.1.A : Correction SQL dans `ControleurMaintenance.php`

- **Fichier :** `api/src/Controllers/ControleurMaintenance.php`
- **Actions :**
  - Dans `executerVidage()` :
    - Remplacer `UPDATE site_content SET payload = '[]' WHERE key = :k` par `WHERE section = :section`.
    - Aligner le mapping :
      - `homeReviews` ➔ `home-reviews`
      - `tickerMessages` ➔ `ticker`
      - `marqueeBrands` ➔ `marquee`
      - `aboutValues` ➔ `about`
      - `builderSteps` ➔ `builder`
      - Pour le cas `all` : `UPDATE site_content SET payload = '[]' WHERE section IN ('home-reviews', 'ticker', 'marquee', 'about', 'builder')`.

##### Étape 17.1.B : Pastille HTTP Interactive (`DataModeBadge.tsx`)

- **Fichier :** `src/components/DataModeBadge.tsx`
- **Actions :**
  - Remplacer `pointerEvents: "none"` par une gestion cliquable avec `cursor: pointer`.
  - Conditionner le rendu à la préférence `katech_show_data_badge` (active par défaut en développement, masquable).
  - Au clic : ouverture d'une boîte de dialogue modale (`Dialog`) affichant :
    - Mode de données (`http` ou `mock`).
    - URL de base API (`http://localhost:8080/api/v1`).
    - État d'accessibilité du serveur.
    - Journal des anomalies / échecs de requêtes récentes (`getResourceFailures()`) avec code d'erreur HTTP et URL.

##### Étape 17.1.C : Commutateur Afficher / Masquer dans l'Onglet Développeur

- **Fichiers :**
  - `src/pages/admin/Developpeur.tsx`
  - `src/lib/i18n/admin/systeme/fr.ts`, `en.ts`, `ar.ts`
- **Actions :**
  - Ajouter une carte « Affichage & Environnement » dans `Developpeur.tsx` avec un `Switch` :
    « Afficher la pastille de mode de données (HTTP/Mock) ».
  - Synchroniser avec `localStorage.getItem('katech_show_data_badge')` et déclencher un événement `window.dispatchEvent(new CustomEvent('katech-toggle-data-badge'))`.
  - Ajouter les clés de traduction trilingues dans `systeme/{fr,en,ar}.ts`.

##### Étape 17.1.D : Universalisation du Formulaire Produit (`ProductForm.tsx`)

- **Fichiers :**
  - `src/pages/admin/ProductForm.tsx`
  - `src/lib/i18n/admin/catalogue/fr.ts`, `en.ts`, `ar.ts`
- **Actions :**
  - Remplacer l'intitulé « Ligne de specs (résumé) » par « Accroche & points clés (résumé) » avec placeholder dynamique selon le type de produit.
  - Rendre la validation de ce résumé souple (optionnel si non renseigné ou court).
  - Encadrer `SpecsGrid` dans un composant dépliant (`Collapsible` / Accordéon) intitulé « Spécifications informatiques avancées (CPU, RAM, GPU...) » :
    - Déplié par défaut si la catégorie est `laptops`, `desktops`, `builds` ou `phones`.
    - Replié par défaut pour toute autre catégorie (mode, maison, services, etc.) afin de ne pas encombrer l'écran.
  - Positionner l'éditeur de caractéristiques personnalisées `CustomSpecsEditor` en tête de liste pour tous les produits et services.

---

### 3. Matrice de Recette & Validation

| Test / Scénario               | Procédure                                                                     | Critère de Succès                                                                   |
| :---------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Vidage `all` sans erreur**  | Clic sur "Tout vider" dans `/admin/reset`                                     | Requête POST `/maintenance/reset` répond en 200 OK, 0 erreur SQL, tables vidées     |
| **Inspection Pastille HTTP**  | Clic sur la pastille bleue `http` en bas à droite                             | Ouverture de la modale avec mode actif, URL API et historique des erreurs           |
| **Bascule dans Développeur**  | Désactivation du switch dans `/admin/developer`                               | Disparition instantanée de la pastille                                              |
| **Création Produit Non-Tech** | Ouvrir `/admin/products/new`, choisir catégorie non informatique              | Grille CPU/RAM repliée, champ d'accroche universel, ajout libre de caractéristiques |
| **Création Produit Tech**     | Ouvrir `/admin/products/new`, choisir `laptops`                               | Grille CPU/RAM directement accessible                                               |
| **Vérification CI & Build**   | `bun run verifier-i18n && bun run lint && bunx tsc --noEmit && bun run build` | 0 erreur, compilation et packaging réussis                                          |

---

### 4. Traçabilité & Packaging

- Mise à jour du journal `.agents/tracabilites.md` sous la section **Sous-Phase 17.1**.
- Re-packaging de la nouvelle archive `katech-site.zip`.
