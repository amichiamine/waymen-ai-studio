# PLAN D'IMPLÉMENTATION — PHASE 02

## Horodatage Dynamique du Package Zip de Déploiement & Sécurisation Git

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode d'Action :** Mode Plan  
**Statut :** 🟢 Livré & Validé

---

## 1. Contexte & Problématique

Actuellement, l'outil d'assemblage du package de déploiement [scripts/paqueter.ts](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter.ts) génère un fichier à nom statique unique : `katech-site.zip`.  
ArchiSys3.0 a demandé que l'archive générée soit automatiquement horodatée avec la date et l'heure au format :  
`katech-site-JJMMYYYY-HHMM.zip` _(ex. : `katech-site-20102026-1310.zip`)_ afin de permettre l'historisation des livrables sans écrasement mutuel.

En outre, l'audit Tech Lead a relevé que [.gitignore](file:///c:/xampp/htdocs/ka-tech/.gitignore#L73) ne filtre que le nom strict `katech-site.zip`, ce qui exposerait les archives horodatées à un commit accidentel dans le dépôt Git.  
L'Option A validée par ArchiSys3.0 retient une double production : génération du livrable horodaté ET mise à jour de l'alias `katech-site.zip` pour préserver 100% de la rétro-compatibilité avec les documentations existantes.

---

## 2. Objectifs Techniques

1. **Sécurisation Git :** Modifier [.gitignore](file:///c:/xampp/htdocs/ka-tech/.gitignore) pour filtrer le motif global `katech-site*.zip`.
2. **Génération Dynamique du Nom Horodaté :** Implémenter dans [scripts/paqueter.ts](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter.ts) une fonction déterministe formatant la date et l'heure locale : `katech-site-JJMMYYYY-HHMM.zip`.
3. **Double Livraison Synchrone :** Produire l'archive horodatée et créer une copie synchrone sous `katech-site.zip`.
4. **Mise à Jour des Logs Console :** Adapter les messages terminaux de `scripts/paqueter.ts` pour afficher le nom horodaté exact et le chemin d'accès.
5. **Recette & Traçabilité :** Exécuter un test réel, vérifier `git status` (zéro pollution de zip), et consigner dans [tracabilites.md](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).

---

## 3. Découpage Opérationnel par Étapes

### Étape 1 : Mise à jour de `.gitignore`

- Modifier la ligne 73 de [.gitignore](file:///c:/xampp/htdocs/ka-tech/.gitignore) :
  ```diff
  -# Paquet de deploiement produit par scripts/paqueter.ts.
  -# Artefact binaire, regenerable a la demande, ne doit pas polluer le depot.
  -katech-site.zip
  +katech-site*.zip
  ```

### Étape 2 : Adaptation de `scripts/paqueter.ts`

- Ajouter une fonction d'horodatage :
  ```typescript
  function obtenirNomArchiveHorodatee(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const jj = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const aaaa = d.getFullYear();
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `katech-site-${jj}${mm}${aaaa}-${hh}${min}.zip`;
  }
  ```
- Remplacer la constante figée `ZIP_OUT` par le calcul dynamique du chemin horodaté :
  `const ZIP_HORODATE = path.join(ROOT, obtenirNomArchiveHorodatee());`
  `const ZIP_LATEST = path.join(ROOT, "katech-site.zip");`
- Après la création réussie de `ZIP_HORODATE` via Python 3, copier vers `ZIP_LATEST` (`fs.copyFileSync(ZIP_HORODATE, ZIP_LATEST)`).
- Adapter les messages de logs finaux pour indiquer les deux chemins disponibles.

### Étape 3 : Banc de Test & Validation d'Exécution

- Exécuter la commande :
  ```bash
  bun run paqueter
  ```
- Vérifier la présence physique des deux fichiers sur le disque :
  - `katech-site-20102026-HHMM.zip`
  - `katech-site.zip`
- Vérifier `git status` pour attester qu'aucun fichier zip n'apparaît en `untracked`.

### Étape 4 : Traçabilité & Clôture

- Mettre à jour [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) avec l'enregistrement de la Phase 02.
- Restitution du rapport de livraison à ArchiSys3.0.

---

## 4. Matrice de Recette & Critères de Succès

| Point de Contrôle       | Condition de Succès                                | Méthode de Vérification                                         |
| :---------------------- | :------------------------------------------------- | :-------------------------------------------------------------- |
| **Sécurisation Git**    | Aucun zip n'est proposé au commit                  | `git status` reste propre sur les fichiers zip                  |
| **Format du Nom**       | Conforme au format `katech-site-JJMMYYYY-HHMM.zip` | Regex `/^katech-site-\d{8}-\d{4}\.zip$/` validée                |
| **Parité des Archives** | Les deux archives ont la même taille et contenu    | Taille en octets identique entre `ZIP_HORODATE` et `ZIP_LATEST` |
| **Code de Sortie**      | `bun run paqueter` sort en code 0                  | Code de sortie 0 confirmé dans la console                       |
