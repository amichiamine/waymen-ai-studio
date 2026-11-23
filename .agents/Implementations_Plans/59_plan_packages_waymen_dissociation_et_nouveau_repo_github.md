# Plan d'Implémentation Phase 59 — Packages waymen-\*.zip, Dissociation de katech & Déploiement sur Nouveau Dépôt GitHub

- **Date :** 23/11/2026
- **Directeur de Projet & Architecte Décideur :** ArchiSys3.0
- **Tech Lead, Architecte & Consultant R&D :** AImi
- **Statut :** 📋 **En Attente de Validation Formelle**

---

## 1. Contexte & Problématique

Le projet `waymen` a achevé sa métamorphose d'identité, de catalogue (Abonnements IA, Streaming, Gaming, Cartes Cadeaux) et de souveraineté technique (Phases 53 à 58).
Deux derniers ajustements structurels de publication sont requis :

1. **Nommage des Archives Clé-en-Main :** Les paquets d'installation générés portaient encore le préfixe `katech-` (`katech-site-*.zip` et `katech-data-*.zip`). Ils doivent être renommés officiellement en **`waymen-site-*.zip`** et **`waymen-data-*.zip`**.
2. **Souveraineté du Code Source sur GitHub :**
   - Le repo local actuel pointe toujours sur l'ancien dépôt `amichiamine/ka-tech`.
   - Il faut **dissocier ce dossier de l'ancien dépôt `ka-tech`** pour ne jamais perturber ce dernier.
   - Créer un **nouveau dépôt distant sur GitHub** sous le compte `amichiamine` (nommé `waymen-ai-studio`).
   - Engager un commit officiel propre couvrant l'ensemble des transformations et pousser (`git push`) vers ce nouveau dépôt souverain.

---

## 2. Découpage en Sous-Phases & Actions Chirurgicales

### Sous-Phase 59.1 : Renommage Officiel des Packages (`waymen-site-*.zip` & `waymen-data-*.zip`)

- Modifier [`scripts/paqueter.ts`](file:///c:/xampp/htdocs/waymen/scripts/paqueter.ts) :
  Remplacer `katech-site-` par `waymen-site-`.
- Modifier [`scripts/paqueter-data.ts`](file:///c:/xampp/htdocs/waymen/scripts/paqueter-data.ts) :
  Remplacer `katech-data-` par `waymen-data-`.
- Mettre à jour les documentations et références associées.

### Sous-Phase 59.2 : Nettoyage Pré-Commit & Validation CI Intégrale

- Archiver ou exclure les fichiers temporaires de scratch (`.agents/scratch/*.png`, etc.) du suivi git si nécessaire.
- Exécuter la suite complète de validation :
  ```powershell
  bun run verifier-i18n
  bunx tsc --noEmit
  bun run format
  bun run lint
  bun run build
  bun run paqueter:data
  ```
- Vérifier la génération des nouveaux paquets : `waymen-site-*.zip` et `waymen-data-*.zip`.

### Sous-Phase 59.3 : Dissociation Git, Création du Nouveau Dépôt GitHub & Push

- Créer le nouveau dépôt GitHub public sous `amichiamine` :
  ```bash
  gh repo create amichiamine/waymen-ai-studio --public --description "WaYmen AI Studio — Plateforme Universelle d'Abonnements Numériques, Activations IA & Formations d'Élite" --source=. --remote=origin --push
  ```
  _(ou dissociation manuelle `git remote remove origin`, création via `gh repo create` et push initial `git push -u origin main`)_.
- Vérification du bon aiguillage vers `https://github.com/amichiamine/waymen-ai-studio.git`.

### Sous-Phase 59.4 : Traçabilité Finale

- Consigner l'ensemble des opérations dans le journal officiel [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/waymen/.agents/tracabilites.md).

---

## 3. Matrice de Recette & Critères d'Acceptation

- [ ] Les nouveaux paquets générés s'appellent `waymen-site-*.zip` et `waymen-data-*.zip`.
- [ ] L'ancien repo `ka-tech` est totalement préservé sans aucun commit ni push parasite.
- [ ] Le nouveau repo `https://github.com/amichiamine/waymen-ai-studio` est créé et alimenté par l'historique complet et l'état final.
- [ ] `git remote -v` pointe exclusivement sur `waymen-ai-studio`.
