# PLAN DIRECTEUR — PHASE 29

## Personnalisation du Dossier de Données et du Fichier SQLite dans l'Installateur Web (`install.php`)

**Projet :** KA Tech (Plateforme E-Commerce & Vitrine 100% Marque Blanche)  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan  
**Statut :** En attente de validation par ArchiSys3.0

---

## 1. Contexte & Enjeux d'Ingénierie

Dans la version actuelle de l'installateur web ([`api/install.php`](file:///c:/xampp/htdocs/ka-tech/api/install.php)), le stockage SQLite est entièrement automatisé mais totalement figé :

- Le dossier parent de données est immuablement nommé `katech-data`.
- Le fichier de base SQLite créé hors racine web est immuablement nommé `katech.sqlite`.

Pour parachever l'universalité Marque Blanche (White-Label) du projet et répondre aux besoins d'exploitants gérant plusieurs boutiques ou désireux d'aligner l'arborescence serveur sur leur propre marque (ex: `maboutique-data` et `shop.sqlite`), la Phase 29 rend ces deux paramètres modifiables dans l'écran 2 de l'assistant d'installation tout en verrouillant la sécurité par des contrôles anti-traversal rigoureux.

---

## 2. Découpage Chirurgical des Travaux

```
                ┌────────────────────────────────────────────────────────┐
                │          api/install.php (Écran 2 Formulaire)          │
                └───────────────────────────┬────────────────────────────┘
                                            │
        ┌───────────────────────────────────┴───────────────────────────────────┐
        ▼                                                                       ▼
┌──────────────────────────────────────┐               ┌──────────────────────────────────────┐
│        Sous-section SQLite           │               │       Moteurs Distants (MySQL/PG)    │
├──────────────────────────────────────┤               ├──────────────────────────────────────┤
│ • Champ : Nom du dossier de données  │               │ • Hôte, Port, Nom base, Utilisateur  │
│   (Défaut: "katech-data")            │               │ • Mot de passe, SSL                  │
│ • Champ : Nom du fichier SQLite      │               │                                      │
│   (Défaut: "katech.sqlite")          │               │                                      │
└──────────────────┬───────────────────┘               └──────────────────────────────────────┘
                   │
                   ▼ Validation & Assainissement
┌─────────────────────────────────────────────────────────────────────────────┐
│                    api/src/Installation/Emplacement.php                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ • validerNomDossier() : regex ^[a-zA-Z0-9_\-\.]+$, anti-traversal (../)    │
│ • validerNomFichier() : regex ^[a-zA-Z0-9_\-]+$, suffixe forcé .sqlite      │
│ • deduire($racineApi, $documentRoot, $nomDossier)                           │
│ • preparer() : création sous-dossier, .htaccess & backups                   │
└──────────────────┬──────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              api/.env généré                                │
│   DB_SQLITE_PATH=/home/user/<nom-dossier>/<nom-fichier>.sqlite              │
│   BACKUP_DIR=/home/user/<nom-dossier>/backups                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Étape 29.A — Paramétrage et Sécurisation dans `Emplacement.php`

- Fichier cible : [`api/src/Installation/Emplacement.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Installation/Emplacement.php)
- **Actions :**
  1. Ajouter deux méthodes statiques de validation et assainissement :
     - `validerNomDossier(string $nom): ?string` :
       - Rejette si vide ou si contient des slashs (`/`, `\`), `..`, ou caractères non alphanumériques (autorisés : lettres, chiffres, tirets, underscores).
       - Rejette les noms de racine web interdits (`public_html`, `htdocs`, `www`, `api`, `public`).
     - `validerNomFichierSqlite(string $nom): ?string` :
       - Rejette si vide ou contient des slashs (`/`, `\`), `..`.
       - Normalise et garantit l'extension `.sqlite`.
  2. Adapter `Emplacement::deduire(string $racineApi, ?string $documentRoot, string $nomDossier = self::NOM_DOSSIER): self` pour accepter le nom de dossier dynamique.
  3. Adapter `nomBaseSqlite(?string $nomPersonnalise = null): string` :
     - Si hors racine web et qu'un nom personnalisé valide est transmis, utiliser ce nom.
     - Si repli d'urgence sous la racine web, conserver la politique de sécurité à jeton aléatoire (`katech-<random>.sqlite` ou `<nom>-<random>.sqlite`) pour empêcher la prédictibilité.

---

### Étape 29.B — Interface Utilisateur & Contrôleur dans `Assistant.php`

- Fichier cible : [`api/src/Installation/Assistant.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Installation/Assistant.php)
- **Actions :**
  1. **Dans `ecranFormulaire()` (Écran 2) :**
     - Ajouter un bloc dédié aux réglages SQLite immédiatement sous l'option SQLite :
       - Champ `sqlite_folder` : "Dossier de stockage des données" (pré-rempli avec `katech-data`).
         Aide : _"Ce dossier sera créé au même niveau que `public_html` (en dehors de la racine web) pour protéger vos données contre tout téléchargement direct."_
       - Champ `sqlite_file` : "Nom du fichier de base de données" (pré-rempli avec `katech.sqlite`).
         Aide : _"Nom du fichier local (ex: `boutique.sqlite`, `donnees.sqlite`). L'extension `.sqlite` est requise."_
     - Dynamisme JS autonome (sans framework) : afficher ou masquer la section SQLite selon le bouton radio du moteur choisi (SQLite vs MySQL/PgSQL).
  2. **Dans `traiterFormulaire()` :**
     - Si `pilote === Db::PILOTE_SQLITE`, valider `sqlite_folder` et `sqlite_file` via les validateurs d'`Emplacement`.
     - En cas d'erreur de saisie, alimenter `$erreurs['sqlite_folder']` et `$erreurs['sqlite_file']` et réafficher l'écran 2 avec les messages explicites.
  3. **Dans `installer()` :**
     - Passer le dossier choisi à `Emplacement::deduire($this->racineApi, $docRoot, $dossierChoisi)`.
     - Calculer le chemin SQLite avec le fichier choisi `$emplacement->nomBaseSqlite($fichierChoisi)`.
     - Générer `DB_SQLITE_PATH` et `BACKUP_DIR` avec les chemins personnalisés effectifs.

---

### Étape 29.C — Préservation des Contrats CLI & Harnais CI

- Fichier cible : [`api/install.php`](file:///c:/xampp/htdocs/ka-tech/api/install.php)
- **Garantie :** En mode CLI (`php api/install.php`), conserver les valeurs par défaut historiques (`katech-data` et `katech.sqlite`) en l'absence de variables d'environnement spécifiques. Zéro régression sur `scripts/conformite-api.ts` et les tests automatisés.

---

### Étape 29.D — Validation Qualité CI & Livrables Horodatés

- Exécuter la suite complète :
  1. `bun run verifier-i18n` (100% de parité trilingue).
  2. `bun run format` (conformité Prettier).
  3. `bunx tsc --noEmit` (0 erreur TypeScript).
  4. `bun run lint` (0 erreur ESLint).
  5. `bun run build; bun run paqueter:data` (nouvelles archives horodatées, conservation intégrale de l'historique cumulatif).
- Mettre à jour [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) avec l'entrée officielle Phase 29.
- Commit et push sur `origin/main`.

---

## 3. Matrice de Recette & Vérification

| Test                                   | Comportement Attendu                                                                                                                                               |
| :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Affichage Formulaire Installateur**  | À l'étape 2 d'`install.php`, les champs "Dossier de données" (`katech-data`) et "Nom du fichier BD" (`katech.sqlite`) s'affichent clairement sous l'option SQLite. |
| **Bascule Radio Dynamique**            | Clic sur "MySQL" ➔ le bloc SQLite se masque et les champs d'identifiants distants s'affichent. Clic sur "SQLite" ➔ le bloc SQLite réapparaît.                      |
| **Validation Anti-Traversal**          | Saisie de `../dossier` ou `public_html` dans le nom de dossier ➔ refus net avec message d'erreur explicite sans altérer le serveur.                                |
| **Validation Nom Fichier**             | Saisie de `base.txt` ou `base/sql` ➔ correction/refus avec message demandant un identifiant valide avec extension `.sqlite`.                                       |
| **Installation Personnalisée Réussie** | Saisie de `boutique-data` et `store.sqlite` ➔ l'installateur crée `/home/user/boutique-data/store.sqlite` et génère `api/.env` correspondant avec succès.          |
| **Mode CLI Inchangé**                  | `php api/install.php` en console s'exécute avec les défauts éprouvés sans casser les scripts de conformité.                                                        |
| **CI & Parité Complète**               | 0 erreur `verifier-i18n`, 0 erreur TypeScript, 0 erreur ESLint, build de production réussi.                                                                        |
