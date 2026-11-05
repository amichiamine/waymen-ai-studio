# PLAN D'IMPLÉMENTATION — PHASE 08

## Fiabilisation Intégrale de la Persistance Serveur & Backstage (SQLite, Apache, API, Mutations & Vitrine)

**Date :** 4 novembre 2026  
**Auteur :** AImi (Tech Lead, Architecte & Consultant R&D)  
**Destinataire & Validateur :** ArchiSys3.0 (Directeur de Projet & Architecte en Chef)  
**Branche / Dépôt :** `main` — `amichiamine/ka-tech`  
**Statut :** 📋 SOUMIS POUR ARBITRAGE & VALIDATION (Mode Plan)

---

### 1. Vision & Objectifs Stratégiques

1. **Persistance Réelle & Inconditionnelle dans SQLite :**
   - Éradiquer définitivement l'erreur SQL `no such table: settings` et `no such table: site_content` constatée lors des requêtes servies par Apache sous XAMPP.
   - Garantir que toute opération d'enregistrement issue du Backstage (`/admin/settings`, `/admin/content`, `/admin/shipping`, etc.) s'écrit physiquement dans la base SQLite active et persistante [`katech-data/dev-a97b6b98a368.sqlite`](file:///c:/xampp/htdocs/ka-tech/katech-data/dev-a97b6b98a368.sqlite).
2. **Détection Déterministe du Moteur de Données ([`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php)) :**
   - Supprimer le fichier fantôme vide `api/var/katech.sqlite` (4 Ko, 0 table) qui détournait les connexions Apache vers une impasse.
   - Sécuriser `Db::depuisEnv()` pour qu'il privilégie la configuration explicite `api/.env`, puis valide la présence effective des tables métier dans la base trouvée avant de la sélectionner.
   - Créer un fichier de configuration locale unifié `api/.env` garantissant l'accès universel à la même base de données sous Apache, Vite et CLI.
3. **Correction de la Fusion des Données & Listes ([`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php)) :**
   - Refondre la fonction `fusionnerPayload()` pour traiter distinctement les objets associatifs (fusion récursive des champs et des langues `{ fr, en, ar }`) et les listes indicées (`items: [...]`, `brands: [...]`), en permettant le remplacement complet des listes lors d'ajouts, de suppressions ou de réordonnancements.
4. **Audit de Recette de Bout en Bout (Backstage ➔ SQLite ➔ Vitrine) :**
   - Tester unitaire et fonctionnellement chaque groupe de paramètres :
     - Nom du magasin, logo personnalisé, email, téléphone, WhatsApp, adresse, horaires d'ouverture.
     - Mode maintenance et message personnalisé.
     - Paramètres de devises (symbole, position, séparateurs).
     - Bandeau promotionnel (activation, texte, bouton, lien).
     - Sections éditoriales de la vitrine (Hero, WhyUs, UseChips, Footer, etc.).
   - S'assurer que chaque modification est visible immédiatement sur le site public sans cache bloquant ni rechargement forcé.
5. **Validation Rigoureuse de l'Arbre & Packaging :**
   - Vérifications strictes : `bun run format`, `bunx tsc --noEmit`, `bun run lint`, `bun run build`.
   - Production du nouveau livrable déployable horodaté (`katech-site-<timestamp>.zip`).

---

### 2. Découpage Chirurgical par Étapes

```
                          FLUX DE RÉSOLUTION PHASE 08
                          ═══════════════════════════

  [Étape 1] Assainissement SQLite & api/.env
    ├─ Suppression du fichier fantôme api/var/katech.sqlite (vide)
    ├─ Création de api/.env pointant vers katech-data/dev-*.sqlite
    └─ Blindage de api/src/Db.php avec vérification de tables réelles
            │
            ▼
  [Étape 2] Correction de fusion des tableaux (api/src/Controllers/ControleurContenu.php)
    ├─ Remplacement intégral pour les listes indicées (array_is_list)
    └─ Maintien de la fusion récursive pour les objets associatifs (i18n)
            │
            ▼
  [Étape 3] Audit & Câblage des Mutations Backstage
    ├─ Vérification de useSiteSettingsMutations (PATCH /settings/site)
    ├─ Vérification de useSiteContentMutations (PATCH /content)
    └─ Synchronisation réactive immédiate des caches locaux (writeCache & localStorage)
            │
            ▼
  [Étape 4] Contrôle de Rendu Réactif Vitrine
    ├─ Logo, coordonnées, horaires, WhatsApp, devises, bannières
    └─ Sections de contenu (Hero, WhyUs, UseChips, Footer)
            │
            ▼
  [Étape 5] Pipeline de Validation de Rigueur & Packaging
    ├─ Tests API HTTP réels sous Apache (200 OK en lecture et écriture)
    ├─ bun run format && bunx tsc --noEmit && bun run lint && bun run build
    └─ Horodatage d'archive et journal officiel tracabilites.md
```

#### Étape 1 : Assainissement du Stockage SQLite & Configuration Déterministe

- **Fichiers cibles :**
  - [`api/var/katech.sqlite`](file:///c:/xampp/htdocs/ka-tech/api/var/katech.sqlite) (à purger/supprimer).
  - [`api/.env`](file:///c:/xampp/htdocs/ka-tech/api/.env) (à créer pour l'environnement local).
  - [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php).
- **Actions techniques :**
  1. Supprimer le fichier résiduel `api/var/katech.sqlite` (4 Ko, 0 table) qui intercepte indûment les connexions Apache.
  2. Écrire le fichier de configuration locale `api/.env` avec :
     ```env
     DB_DRIVER=sqlite
     DB_SQLITE_PATH=C:/xampp/htdocs/ka-tech/katech-data/dev-a97b6b98a368.sqlite
     ```
  3. Mettre à jour la logique de sélection de SQLite dans [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) :
     - Si `DB_SQLITE_PATH` est fourni et pointe vers un fichier existant : le retenir.
     - Sinon, chercher dans `katech-data/dev-*.sqlite` le fichier le plus récent.
     - Vérifier par une sonde rapide que le fichier SQLite retenu contient bien les tables de base (`settings` et `products`). S'il s'agit d'un fichier vide corrompu, émettre un avertissement explicite plutôt que de provoquer des erreurs 500 en cascade.

#### Étape 2 : Correction de la Fusion des Tableaux & Listes dans l'API

- **Fichier cible :** [`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php)
- **Actions techniques :**
  1. Mettre à jour la méthode `fusionnerPayload(array $base, array $dessus)` :
     - Si `$dessus` est une liste indicée (`array_is_list($dessus)` ou tableau dont les clés sont des entiers séquentiels `0, 1, 2...`), **remplacer intégralement** `$base[$cle]` par `$valeurDessus`.
     - Si `$dessus` est un objet associatif (clé de type chaîne, ex: `{ "fr": "...", "en": "..." }`), conserver la fusion récursive clé par clé.
  2. Bénéfice immédiat :
     - Les listes comme les `tickerMessages`, les `marqueeBrands`, les `aboutValues`, les avis clients et les options de composants du builder peuvent être créées, modifiées, réordonnées ou supprimées depuis le Backstage sans conflit de clés résiduelles.

#### Étape 3 : Audit & Robustesse des Mutations Backstage

- **Fichiers cibles :**
  - [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx)
  - [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx)
  - [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts)
  - [`src/data-provider/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-content.ts)
- **Actions techniques :**
  1. Vérifier la conformité des flux d'enregistrement :
     - Dans `Settings.tsx` : `saveSettings()` envoie la totalité de `form` à `updateSettings(form)`.
     - S'assurer que le retour 200 de l'API met à jour instantanément `writeCache` et le `localStorage` pour alimenter le bootstrapping.
  2. Dans `Content.tsx` : `save()` envoie la section mise à jour sous forme `{ [sectionKey]: draft }`.
     - Vérifier que l'invalidation de cache et la mise à jour réactive propagent les nouvelles données sans nécessiter de rechargement de page (F5).
  3. Vérifier la gestion des erreurs réseau / API : en cas d'échec, afficher une notification Sonner explicite précisant la raison exacte.

#### Étape 4 : Contrôle de Réactivité sur la Vitrine

- **Fichiers cibles :**
  - [`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx)
  - [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx)
  - [`src/components/Hero.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Hero.tsx)
  - [`src/components/PromoBanner.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/PromoBanner.tsx)
  - [`src/components/FloatingWhatsApp.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/FloatingWhatsApp.tsx)
  - [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx)
- **Actions techniques :**
  1. Vérifier que la modification d'un champ dans le Backstage (ex: numéro WhatsApp, adresse, horaires, textes de sections, devises) est visible immédiatement sur la vitrine.
  2. Valider le comportement du bandeau promotionnel : affichage dès que `showPromoBanner: true` et masquage propre au clic sur le bouton de fermeture avec réinitialisation si le texte change.
  3. Valider que le logo téléversé dans `/admin/settings` s'affiche immédiatement dans l'en-tête et le pied de page avec gestion d'erreur robuste (`onError`).

#### Étape 5 : Batterie de Contrôles Qualité & Packaging de Déploiement

- **Actions techniques :**
  1. Script de test automatisé sous Apache : exécution de `GET` et `PATCH` sur `/settings/site` et `/content` avec validation de code HTTP 200 et persistance vérifiée dans SQLite.
  2. Lancement de la commande universelle de formatage : `bun run format`.
  3. Contrôle de typage strict : `bunx tsc --noEmit` (0 erreur).
  4. Contrôle de linter : `bun run lint` (0 erreur).
  5. Compilation et prérendu complets : `bun run build`.
  6. Génération du livrable horodaté `katech-site-<timestamp>.zip` et de son alias miroir `katech-site.zip`.
  7. Mise à jour officielle du [Journal de Traçabilité](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Section Phase 08).

---

### 3. Matrice de Recette & Critères d'Acceptation

| Test d'Acceptation                                     | Procédure de Test                                                                               | Résultat Attendu                                                                                        |
| :----------------------------------------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Test 1 : Accès API sous Apache sans erreur SQL**     | `GET http://localhost/ka-tech/api/v1/settings/site`                                             | Code HTTP 200, JSON retourné avec les réglages de la boutique. Zéro erreur `no such table`.             |
| **Test 2 : Persistance d'une modification de réglage** | Modifier le nom du magasin ou les horaires dans `/admin/settings` et enregistrer.               | Requête `PATCH` répond 200 OK. La modification est écrite dans `katech-data/dev-*.sqlite`.              |
| **Test 3 : Persistance d'une section de contenu**      | Modifier le titre ou le badge du Hero dans `/admin/content` et enregistrer.                     | Requête `PATCH /content` répond 200 OK. La section `hero` est mise à jour dans la table `site_content`. |
| **Test 4 : Suppression / Ajout dans une liste**        | Retirer ou ajouter un message dans le bandeau défilant (`ticker`) ou une marque dans `marquee`. | La liste est enregistrée avec le nombre exact d'éléments (aucun élément fantôme conservé).              |
| **Test 5 : Répercussion immédiate sur la Vitrine**     | Ouvrir la boutique vitrine dans le navigateur après enregistrement.                             | Les nouvelles données (coordonnées, horaires, textes de section) s'affichent immédiatement.             |
| **Test 6 : Zéro régression TypeScript, Lint & Build**  | Exécuter le pipeline `bun run lint && bunx tsc --noEmit && bun run build`.                      | 0 erreur, compilation et empaquetage d'archive réussis.                                                 |

---

### 4. Fichiers et Périmètres Modifiés

- 📄 [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) : détection et validation robuste de la base SQLite.
- 📄 [`api/.env`](file:///c:/xampp/htdocs/ka-tech/api/.env) : configuration locale explicite liant la base persistante.
- 📄 [`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php) : correction de la fusion de listes/tableaux.
- 📄 [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : audit et sécurisation des mutations de paramètres.
- 📄 [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : audit et sécurisation des mutations de contenus.
- 📄 [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) : inscription de la Phase 08.
