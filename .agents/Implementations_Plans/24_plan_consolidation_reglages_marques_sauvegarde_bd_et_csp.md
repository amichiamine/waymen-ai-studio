# PLAN D'IMPLÉMENTATION — PHASE 24

**Projet :** KA Tech (WayMen)  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Planification Interactive (Attente de validation formelle)

---

## 1. Contexte & Constats Factuels

Suite à l'audit approfondi de la version déployée, sept dysfonctionnements et opportunités ergonomiques majeures ont été formellement identifiés et validés :

1. **Bug critique de téléchargement de la sauvegarde BD (`/maintenance/backup`) :**  
   L'outil `sauvegarder.php` s'exécute avec plein succès en 0.01 s et génère le fichier SQLite intègre (348 Ko). Cependant, l'appel à `proc_get_status()` dans la boucle de lecture PHP consomme le code de sortie ; l'appel subséquent `proc_close()` retourne alors `-1` sur Linux/PHP, amenant le contrôleur à lever une fausse exception HTTP 503 (`BACKUP_ERROR`).
2. **Emplacement de la base SQLite sur le serveur Hostinger :**  
   L'installateur place par défaut la base hors de la racine web sous le chemin déduit `DB_SQLITE_PATH` (indiqué dans `api/.env`). Le dossier `katech-data` créé manuellement est resté vide parce que l'assistant a généré un fichier nommé `katech.sqlite` ou configuré un chemin alternatif. L'admin doit afficher et clarifier cet emplacement exact.
3. **Violations CSP (`Content-Security-Policy`) :**  
   La directive `script-src 'self'` dans `public/.htaccess` bloque l'exécution du script inline d'anti-FOUC (`index.html`) et du bootstrap PHP (`window.__SITE_SETTINGS_BOOTSTRAP__`), générant des erreurs en console rouge.
4. **Erreur d'upload « URL invalide (http(s):// ou / attendu) » :**  
   Le backend retourne des chemins relatifs portables (`uploads/xxxx.webp`), mais le validateur Zod de `CategoryForm.tsx` n'autorisait que `/` ou `http`.
5. **Absence de logos pour les Marques :**  
   L'entité `Brand` ne disposait d'aucun champ logo ni sélecteur d'image dans `BrandForm.tsx`, limitant l'administration à du simple texte.
6. **Composant orphelin « Sélection à onglets » (`featuredTabs`) :**  
   Configurable dans le Backstage mais jamais rendu sur la page d'accueil (`Index.tsx`), avec un repli de fausses catégories en dur dans le formulaire.
7. **Refonte ergonomique de « Paramètres » (`Settings.tsx`) & Mode Maintenance VIP :**  
   Transformation des 8 cartes empilées en 6 onglets thématiques fluides, avec support multilingue FR/EN/AR et Live Preview du mode maintenance.

---

## 2. Matrice des Interventions Chirurgicales

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PLAN D'ACTION CHIRURGICAL — PHASE 24                                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 24.A │ Backend Maintenance ➔ Correction exitcode proc_get_status & stream download     │
│ 24.B │ Sécurité & Serveur  ➔ Autorisation script-src 'unsafe-inline' dans .htaccess   │
│ 24.C │ Formulaires Médias  ➔ Validateur Zod universel pour chemins relatifs uploads/   │
│ 24.D │ Gestion des Marques ➔ Champ logo, MediaPickerField, DTO API & carrousel vitrine │
│ 24.E │ Accueil & Vitrine   ➔ Raccordement FeaturedTabs + repli propre sans mock en dur │
│ 24.F │ Backstage Paramètres➔ Structuration en 6 Onglets Thématiques & Maintenance VIP   │
│ 24.G │ Clarté Données      ➔ Exposition transparente du chemin DB_SQLITE_PATH          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Détail des Étapes de Réalisation

### Étape 24.A : Correctif Bug Sauvegarde BD (`ControleurMaintenance.php`)

- **Fichier :** [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php)
- **Action :**  
  Dans `executerOutil()`, mémoriser le code de sortie réel via `$dernierEtat['exitcode']` issu de `proc_get_status()`. Ne pas se fier au retour de `proc_close()` qui renvoie `-1` lorsque le processus est déjà clôturé.
  Vérifier que lorsque le code vaut `0` ou que le fichier existe et est intègre, `envoyerFichier()` déclenche le téléchargement HTTP binaire immédiat avec les bons en-têtes `Content-Disposition: attachment`.

### Étape 24.B : Résolution des Blocages CSP (`.htaccess`)

- **Fichier :** [`public/.htaccess`](file:///c:/xampp/htdocs/ka-tech/public/.htaccess)
- **Action :**  
  Mettre à jour la directive `Header always set Content-Security-Policy` :
  Remplacer `script-src 'self';` par `script-src 'self' 'unsafe-inline';`.  
  Cela autorise le script de démarrage anti-FOUC et l'injection instantanée des réglages PHP `window.__SITE_SETTINGS_BOOTSTRAP__` sans aucune erreur en console.

### Étape 24.C : Déverrouillage Universel des Uploads de Médias (`CategoryForm.tsx` & co)

- **Fichiers :** [`src/pages/admin/CategoryForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/CategoryForm.tsx) et formulaire(s) concerné(s)
- **Action :**  
  Adapter le validateur `optionalUrl` pour autoriser :
  - Les URLs absolues (`http://`, `https://`)
  - Les chemins absolus (`/`)
  - Les chaînes base64 (`data:`)
  - **Les chemins relatifs d'uploads :** (`uploads/`, `assets/`, ou regex d'extension image `^[\w./-]+\.(png|jpe?g|webp|svg|gif|avif)$`).

### Étape 24.D : Logos et Visuels des Marques (Modèle, API, Formulaire & Vitrine)

- **Fichiers :**
  - [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) : ajout de `logo?: string` à `AdminBrand`.
  - [`api/src/Controllers/ControleurMarques.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMarques.php) : support du champ `logo` en lecture, création et mise à jour (PATCH), avec migration transparente SQLite (`ALTER TABLE brands ADD COLUMN logo TEXT`).
  - [`src/pages/admin/BrandForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BrandForm.tsx) : intégration du composant `<MediaPickerField label="Logo de la marque" value={v.logo} onChange={...} />`.
  - [`src/pages/admin/BrandDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BrandDetail.tsx) : affichage du logo dans la fiche détail.
  - [`src/components/BrandsMarquee.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/BrandsMarquee.tsx) : repli élégant si `marqueeBrands` est vide, et affichage des logos ou des noms textuels.

### Étape 24.E : Raccordement de `FeaturedTabs` & Élimination des Mock Fallbacks

- **Fichiers :**
  - [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx) : insertion conditionnelle de `<FeaturedTabs />` sur l'accueil.
  - [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : suppression du tableau en dur `[{ slug: "laptops" }, ...]`. Si aucune catégorie n'est en base, afficher un message invitant à créer des catégories au lieu d'afficher de fausses catégories fictives.

### Étape 24.F : Refonte Ergonomique de l'Écran « Paramètres » (`Settings.tsx`)

- **Fichier :** [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx)
- **Action :**  
  Restructuration de l'écran en **6 Pôles Thématiques Déterministes** avec onglets intuitifs :
  1. 🏪 **Boutique & Général** : Nom du magasin, email de contact, téléphone, adresse, horaires d'ouverture, logo officiel et favicon.
  2. 🎨 **Apparence & Thème** : Thème par défaut (clair/sombre/système), palette de couleurs primaires personnalisables, badge de mode de données.
  3. 🚧 **Mode Maintenance VIP** :
     - Interrupteur on/off avec badge d'état.
     - Titre et message d'accroche éditables en multilingue **FR, EN, AR** avec `LInput` et `LTextarea`.
     - Date/heure estimée de retour.
     - Bouton d'assistance WhatsApp.
     - **Bouton « Aperçu de la page de maintenance » (Live Preview Modal)** permettant à l'administrateur de tester le rendu direct sans couper l'accès aux clients.
  4. 💰 **Devise & Tarification** : Symbole monétaire, position, séparateurs, seuils d'alerte de stock bas et rupture.
  5. ⚙️ **Configurateur PC** : Gestionnaire graphique interactif `BuilderStepsVisualEditor` avec montants en DZD.
  6. 🔗 **Intégrations & Notion** : Configuration du token Notion et de la base de synchronisation externe.

### Étape 24.G : Transparence & Documentation de l'Emplacement BD Hostinger

- **Fichiers :** [`src/pages/admin/Developpeur.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Developpeur.tsx) et documentation
- **Action :**  
  Afficher explicitement la variable `DB_SQLITE_PATH` et le chemin réel sur le disque dans le panneau d'état système pour que le maître d'ouvrage sache immédiatement dans quel dossier retrouver son fichier SQLite.

---

## 4. Matrice de Recette & Critères d'Acceptation

| Test                          | Procédure de Vérification                                 | Résultat Attendu                                                               |
| :---------------------------- | :-------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **T1 : Sauvegarde BD**        | Clic sur « Sauvegarder la base » dans `/admin/developer`. | Le navigateur télécharge immédiatement le fichier `.sqlite` sans erreur 503.   |
| **T2 : Upload Catégorie**     | Téléversement d'une image dans `/admin/categories/new`.   | L'image est enregistrée et prévisualisée sans message « URL invalide ».        |
| **T3 : Logo Marque**          | Création/Édition d'une marque dans `/admin/brands`.       | Champ Logo opérationnel via `MediaPickerField` avec aperçu direct.             |
| **T4 : CSP Console**          | Ouverture de l'accueil et du Backstage avec DevTools F12. | 0 blocage CSP rouge sur les scripts inline.                                    |
| **T5 : Ergonomie Paramètres** | Navigation dans `/admin/settings`.                        | 6 onglets thématiques clairs, plus aucun défilement infini de cartes.          |
| **T6 : Maintenance Preview**  | Clic sur « Aperçu Live » dans l'onglet Maintenance.       | Modal affichant fidèlement la vitrine de maintenance avec les textes traduits. |
| **T7 : Pipeline de Vérité**   | `bun run lint && bunx tsc --noEmit && bun run build`.     | 0 avertissement bloquant, 0 erreur TypeScript, build parfait.                  |

---

## 5. Arbitrage & Validation

Ce plan est prêt pour validation. Cliquez sur **« Proceed »** ou confirmez par accord écrit pour engager la réalisation chirurgicale de la Phase 24.
