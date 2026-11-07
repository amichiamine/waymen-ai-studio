# PLAN D'IMPLÉMENTATION 32 — Blindage Universel des Uploads Médias, Initialisation Installateur & Embarquement Package ZIP

**Projet Hôte :** StacGate Platform (ex KA Tech)  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan (`RequestFeedback: true`)  
**Statut :** 🟡 En attente de validation par ArchiSys3.0

---

## 1. Contexte & Problématique

Lors du déploiement de test sur un second hébergement cPanel (`https://ardpod.com`), deux anomalies ont été mises en évidence par l'analyse des journaux serveur :

1. **Crash HTTP 500 sur l'upload de médias (`media#upload`) :**
   ```log
   Error: Class "finfo" not found (/home/.../public_html/api/src/Controllers/ControleurMedias.php:159) — POST /api/v1/media
   ```
   L'extension PHP `ext-fileinfo` n'étant pas systématiquement activée sur tous les mutualisés ou serveurs PHP par défaut, l'appel direct `new \finfo(...)` a provoqué une exception fatale non rattrapée de type `\Error`, empêchant tout téléversement même après création manuelle du dossier `uploads/` en 755.
2. **Absence native du dossier `uploads/` et sécurisation :**
   Le dossier `uploads/` n'était ni embarqué dans le package ZIP produit par `scripts/paqueter.ts`, ni initialisé proactivement avec ses fichiers de protection par l'assistant d'installation `install.php`.
3. **Pollution continue du journal serveur `error_log` :**
   ```log
   [katech-api] Échec SQL : ALTER TABLE brands ADD COLUMN logo TEXT — SQLSTATE[HY000]: General error: 1 duplicate column name: logo
   ```
   L'appel à `ALTER TABLE brands ADD COLUMN logo TEXT` dans le constructeur de [`ControleurMarques.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMarques.php) déclenche la journalisation d'une erreur SQL dans `Db::run()` à chaque listing de marques, inondant inutilement le log d'erreurs Apache/cPanel.

---

## 2. Objectifs d'Architecture & Périmètre d'Intervention

La Phase 32 apporte une réponse définitive en appliquant le principe de la « double sécurité » (ceinture et bretelles) :

1. **Détection MIME multi-paliers ultra-résiliente (Zero-Dependency Fallback) :**
   Dans [`ControleurMedias.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMedias.php), l'inspection du type MIME réel ne dépendra plus exclusivement de `finfo` :
   - _Palier 1 :_ `class_exists(\finfo::class)` ➔ utilisation standard de `\finfo`.
   - _Palier 2 :_ `function_exists('mime_content_type')` ➔ fonction native PHP alternative.
   - _Palier 3 :_ `function_exists('getimagesize')` ➔ décodage métadonnées d'images natif.
   - _Palier 4 (Insubmersible) :_ Lecteur pur PHP de _magic bytes_ (signatures hexadécimales binaires : JPEG `\xFF\xD8\xFF`, PNG `\x89PNG\r\n\x1a\n`, GIF `GIF87a/89a`, WebP `RIFF....WEBP`, AVIF `ftypavif/ftypavis`, SVG `<svg`).
   - Même sur un serveur où aucune extension média n'est activée, l'upload reste opérationnel et ultra-sécurisé contre les injections de scripts.

2. **Embarquement systématique de `uploads/` dans le ZIP de distribution :**
   Dans [`scripts/paqueter.ts`](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter.ts), générer automatiquement dans `dist/uploads/` :
   - Un fichier `.htaccess` blindé :
     ```apache
     # StacGate Platform - Sécurisation stricte du dossier uploads
     <FilesMatch "\.(php|phtml|php3|php4|php5|php7|php8|phps|phar|cgi|pl|py|sh|asp|aspx|exe|js)$">
         Require all denied
     </FilesMatch>
     Options -Indexes -ExecCGI
     ```
   - Un fichier `index.html` neutre (anti-listing).
   - L'archive ZIP finale contiendra donc nativement le dossier `uploads/` prêt à l'emploi.

3. **Création & Initialisation proactive par `install.php` :**
   - Dans [`api/src/Installation/Installateur.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Installation/Installateur.php) et [`Assistant.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Installation/Assistant.php) :
     Lors du processus d'installation (CLI ou Web), initialiser le dossier `uploads/` (permissions `0775` / `0755`), injecter le `.htaccess` protecteur et `index.html` s'ils sont absents.
   - Dans [`Diagnostic.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Installation/Diagnostic.php) :
     Ajouter le diagnostic de l'extension `fileinfo` (avec indication du repli autonome si absente) et du dossier `uploads/` (présence et droits d'écriture).

4. **Assainissement silencieux de la migration `brands.logo` :**
   Dans [`ControleurMarques.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMarques.php), inspecter la présence de la colonne `logo` (via `PRAGMA table_info(brands)` ou exécution PDO silencieuse) avant de lancer l'instruction, évitant ainsi tout faux positif dans `error_log`.

---

## 3. Découpage Chirurgical des Étapes

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 32 : Blindage Uploads Médias, Packaging & Logs                  │
├─────────┬──────────────────────────────────────────────────────────────┤
│ Étape 1 │ ControleurMedias.php : Détection MIME 4 paliers (Magic Bytes)│
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 2 │ scripts/paqueter.ts : Génération dist/uploads/ (.htaccess)  │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 3 │ install.php / Installateur : Initialisation proactive uploads│
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 4 │ Diagnostic.php : Contrôle fileinfo & inscriptibilité uploads │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 5 │ ControleurMarques.php : Assainissement log ALTER TABLE       │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 6 │ Validation intégrale : lint, tsc, build, paqueter, tests     │
└─────────┴──────────────────────────────────────────────────────────────┘
```

---

## 4. Matrice de Recette & Vérification

| ID     | Test / Action                         | Résultat Attendu                                                                              |
| :----- | :------------------------------------ | :-------------------------------------------------------------------------------------------- |
| **T1** | Upload média sans `ext-fileinfo`      | Détection réussie via fallback magic-bytes, 0 crash 500, fichier stocké et lié.               |
| **T2** | Contenu de l'archive `dist/` & ZIP    | Dossier `uploads/` présent avec son `.htaccess` restrictif et son `index.html`.               |
| **T3** | Exécution de `install.php`            | Crée automatiquement `uploads/` avec permissions et sécurité si le dossier est manquant.      |
| **T4** | Écran 1 de l'Assistant d'installation | Contrôle visible de `fileinfo` et de l'inscriptibilité de `uploads/`.                         |
| **T5** | Requêtes sur `/api/v1/marques`        | Zéro entrée `duplicate column: logo` dans le journal d'erreurs serveur.                       |
| **T6** | Batterie de conformité projet         | `bun run lint && bunx tsc --noEmit && bun run build && npm run paqueter:data` passent à 100%. |

---

## 5. Appel à Validation

ArchiSys3.0, ce plan couvre l'ensemble des points soulevés sans laisser aucun angle mort. Cliquez sur **Proceed** ou donnez votre accord explicite pour engager l'implémentation de la Phase 32.
