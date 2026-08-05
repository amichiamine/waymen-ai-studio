# SKILLS.md — Catalogue de compétences réutilisables (universel)

> **Version générique, applicable à tout projet.** Chaque skill est une
> recette éprouvée : quand l'employer, quel modèle, les étapes, les pièges,
> la preuve de succès. Dans une consigne d'agent, écrire simplement
> « applique la skill S3 » plutôt que de tout réexpliquer.
>
> Ce catalogue couvre les patterns récurrents dans tout projet logiciel
> multi-composants orchestré par des agents IA. Ajoute tes skills
> projet-spécifiques dans un fichier compagnon `SKILLS-⟨projet⟩.md`.

**Index**

| # | Skill | Modèle | Usage |
|---|---|---|---|
| S1 | Créer un pilote exemplaire | fort | Avant toute réplication |
| S2 | Répliquer un pattern à N unités | intermédiaire | Phase d'expansion |
| S3 | Câbler une interopérabilité à dégradation gracieuse | fort → intermédiaire | Intégration inter-composants |
| S4 | Ajouter un moteur de calcul pur | intermédiaire | Logique métier dérivée |
| S5 | Produire un document ou export utilisateur | intermédiaire | PDF, CSV, impression |
| S6 | Exposer un composant sur un bus ou une API | intermédiaire | Rendre seedable et agrégeable |
| S7 | Produire un jeu de données de démonstration | intermédiaire | Jeu de données réaliste |
| S8 | Diagnostiquer une panne runtime | fort | Cause racine inconnue |
| S9 | Auditer la cohérence modèle ↔ API | intermédiaire | Après enrichissement de types |
| S10 | Refondre une interface plate en écran de gestion | intermédiaire | Ergonomie ERP |
| S11 | Enrichir sans casser (migration douce) | intermédiaire | Additivité rétro-compatible |
| S12 | Reprendre un travail interrompu | intermédiaire | Résilience aux crashes |
| S13 | Gérer une variable sensible (secret / credential) | fort | Sécurité |
| S14 | Produire la documentation technique | intermédiaire | Maintenabilité |

---

## S1 — Créer un pilote exemplaire
**Modèle : fort.** À construire *avant* toute réplication.

**Quand** : une structure va être répétée sur plus de 3 unités.

**Étapes**
1. Choisir l'unité la plus représentative (ni la plus simple, ni l'exception).
2. La construire **complètement** : structure, types, persistance, interface, validations, tests, conformité.
3. Passer **toute** la batterie de checks.
4. Commenter les **intentions** dans le code (les copies héritent des raisons).
5. Nommer explicitement ce pilote dans le plan du dépôt.

**Piège** : un pilote « presque bon » démultiplie N défauts. Mieux vaut une
heure de plus ici que N correctifs ensuite.

**Preuve** : checks verts + relecture ligne à ligne par l'orchestrateur.

---

## S2 — Répliquer un pattern à N unités
**Modèle : intermédiaire.** Skill la plus fréquente.

**Consigne type**
```
Copie-adapte ⟨chemin/pilote⟩ vers ⟨unité cible⟩. Ne réinvente rien.
Adapte : identifiants, libellés, entités propres à l'unité.
Ne touche à aucun autre dossier.
Livrables : 1) … 2) … 3) … — committe dès que 1+2 sont faits.
```

**Étapes** : synchroniser → anti-doublon → copier → adapter → checks → commit/push → rapport 4 lignes.

**Pièges**
- Copier sans adapter les identifiants (collisions silencieuses).
- Importer sans utiliser → build cassé.
- Élargir le périmètre « pendant qu'on y est » → collision avec d'autres agents.

**Preuve** : checks verts + hash poussé.

---

## S3 — Câbler une interopérabilité à dégradation gracieuse
**Modèle : fort** pour le pilote, **intermédiaire** pour la réplication.

**Quand** : un composant doit lire ou écrire des données d'un autre tout en
restant utilisable seul.

**Recette (3 briques à répliquer localement)**
1. `callFirst(candidats, args)` — essaie chaque cible en try/catch, retourne le premier succès.
2. `Picker` — sélecteur alimenté par la source ; si indisponible, **repli en saisie libre** avec message explicite.
3. `RefLabel` — résout un ID en libellé lisible ; **repli : l'ID brut**.

Pour une **chaîne d'action** (A déclenche une écriture chez B) : états
`en-cours` / `erreur` visibles, message « B indisponible — réessayer »,
jamais d'exception remontée.

**Pièges**
- **Sonde en écriture** : tester la présence d'un service en l'appelant en écriture crée des données fantômes. Sondes en lecture seule uniquement.
- Identifiants devinés : les lire dans les sources réelles de la cible.
- Oublier de déclarer la permission correspondante.

**Preuve** : fonctionne seul (repli visible) ET avec sa source (résolution réelle). Tester les deux.

---

## S4 — Ajouter un moteur de calcul pur
**Modèle : intermédiaire.**

**Quand** : l'écran stocke mais ne calcule pas (totaux, taxes, cumuls, indicateurs).

**Étapes**
1. Créer un **module pur** `calc.ts` : fonctions sans effet de bord, entrées/sorties explicites, arrondis maîtrisés.
2. Y placer **toute** l'arithmétique — l'interface ne fait qu'afficher.
3. Tester les cas limites (zéro, remise totale, cumul négatif, division par zéro).
4. Afficher les valeurs dérivées **et leur détail** (l'utilisateur doit pouvoir vérifier).

**Pièges** : arrondis à chaque étape (erreur d'accumulation) ; recalcul depuis zéro à chaque rendu (coût) au lieu de mémorisation ; taxes sur un montant déjà remisé sans le signaler.

**Preuve** : tests unitaires verts + un cas de bout en bout vérifiable à la main.

---

## S5 — Produire un document ou export utilisateur
**Modèle : intermédiaire.**

**Quand** : une pièce doit sortir du système (facture, rapport, export, certificat).

**Recette**
1. Composant dédié avec zone d'impression + CSS `@media print` + bouton natif (`window.print()`).
2. **En-tête institutionnel** depuis le référentiel (raison sociale, logo, identifiants) — avec dégradation gracieuse si absent.
3. Corps : tableau des lignes, totaux, mentions obligatoires.
4. **Numérotation** : compteur persisté par type et par période, jamais un ID technique.
5. Export CSV : colonnes humainement lisibles, encodage UTF-8-BOM pour Excel.

**Pièges** : numérotation non persistée (doublons au rechargement) ; en-tête codé en dur ; styles d'écran qui débordent à l'impression.

**Preuve** : aperçu d'impression du navigateur lisible et complet ; re-chargement → même numéro.

---

## S6 — Exposer un composant sur un bus ou une API
**Modèle : intermédiaire.**

**Quand** : un composant stocke des données qu'aucun autre ne peut lire —
**cul-de-sac de données**.

**Symptôme d'alerte** : les données existent dans l'UI mais ne remontent pas
dans les tableaux de bord, rapports ou outils d'automatisation.

**Étapes**
1. Comprendre le mécanisme d'enregistrement du bus — **vérifier dans le code**, ne pas supposer.
2. Créer le manifeste d'API : au minimum `list` (lecture), `create` (écriture, **retourne l'objet créé avec son ID**), `delete`.
3. Les handlers appellent **les méthodes existantes** du composant : zéro duplication de logique.
4. Si le composant n'a pas d'entité propre : exposer une ability de synthèse en lecture uniquement.

**Bénéfice triple** : composant **seedable**, **agrégeable** (tableaux de bord, rapports) et **automatisable** (agents IA).

**Piège majeur** : n'exposer que les champs d'origine. Si le modèle a été enrichi depuis, l'API doit accepter **tous** les champs (voir S9).

**Preuve** : appeler `list` puis `create` depuis un autre contexte, voir les données dans l'UI du composant.

---

## S7 — Produire un jeu de données de démonstration
**Modèle : intermédiaire** (jamais minimal : il faut lire du code).

**Principes**
- **Pas de données factices dans le code.** Fichiers déclaratifs injectés par les APIs publiques (vraie logique métier, vraies validations) — réutilisable pour l'import de données réelles.
- **Réversibilité** : journaliser chaque entrée créée pour pouvoir tout retirer.
- **Idempotence** : rejouer le jeu ne double rien ; une entrée en échec est retentée.
- **Références symboliques** `$type:slug` résolues au fil de l'injection ; l'ordre porte les dépendances.

**Exigences**
1. **IDs et signatures lus dans le code** — deviner coûte deux fois.
2. **Couverture exhaustive** : inventaire chiffré par composant, aucun à zéro.
3. **Profondeur temporelle** : 12 mois d'historique pour que les graphes aient quelque chose à montrer.
4. **Scénarios complets** : un flux commercial abouti, un projet à mi-parcours, des anomalies, une série mensuelle.
5. **Fil rouge** : mêmes entités traversant plusieurs composants — l'interconnexion visible à l'œil nu.
6. **Réalisme local** : noms, devise, cadre légal du territoire visé.

**Pièges** : référentiel d'organisation oublié (documents sans en-tête) ; données trop peu nombreuses pour démontrer un calcul (CUMP exige plusieurs entrées à prix différents) ; états initiaux seulement faute d'APIs de transition.

**Preuve** : compter les entrées par composant, lister les zéros.

---

## S8 — Diagnostiquer une panne runtime
**Modèle : fort.** Livrable : **le diagnostic écrit avant le correctif.**

**Méthode**
1. Ne pas croire le symptôme — les messages mentent par euphémisme.
2. Remonter la chaîne dans les sources : appelant → couche d'isolation → service → handler.
3. Chercher la cause commune (plusieurs symptômes = une origine).
4. Demander une preuve terrain si l'environnement est aveugle.
5. Corriger au niveau le plus haut : une normalisation centrale vaut N correctifs.
6. Généraliser : vérifier que le défaut n'est pas ailleurs.
7. Instrumenter : laisser un message explicite là où régnait le silence.
8. Prouver : test unitaire reproduisant le scénario + le cas négatif.

**3 classes à soupçonner en premier**
- **Course au démarrage** : appel émis avant que la cible soit enregistrée → attente bornée + réessai.
- **Contrat implicite divergent** : le producteur déclare sous une clé, le consommateur en lit une autre → toute la fonctionnalité muette. Normaliser au point d'entrée.
- **Validation trop stricte** : une valeur bumpée « pour bien faire » fait rejeter le composant entier au chargement.

---

## S9 — Auditer la cohérence modèle ↔ API
**Modèle : intermédiaire.** Skill de rattrapage après enrichissement.

**Quand** : des champs ont été ajoutés aux types au fil des phases.

**Étapes**
1. Pour chaque composant, comparer les champs réels du modèle avec ce que chaque porte d'entrée (création, mise à jour, import, bus) accepte.
2. Élargir les points d'entrée en restant **strictement rétro-compatible** : champs nouveaux optionnels, appels existants inchangés.
3. Si une méthode interne n'accepte pas un champ, enchaîner sur la méthode de mise à jour existante — sans dupliquer.
4. Traiter par groupes de 3-4 composants, commit à chaque groupe.

**Pourquoi critique** : un champ non exposé = fonctionnalité indémontrable et non importable.

**Preuve** : injecter une entrée avec les nouveaux champs, les retrouver affichés et calculés.

---

## S10 — Refondre une interface plate en écran de gestion
**Modèle : intermédiaire.**

**Quand** : l'écran affiche « titre + sous-titre » et une barre de saisie.

**Kit (à répliquer)**
1. **En-tête riche** : titre, compteurs par statut, actions à droite.
2. **Vraie table** : colonnes réelles, tri par clic, badges de statut sémantiques, numérique à droite, totaux, filtres, recherche, export.
3. **Fiche détail** : au clic, panneau latéral avec tous les champs labellisés, références résolues, actions métier.
4. **Formulaire structuré** en panneau (champs labellisés, validations) — pas une barre de saisie en ligne.
5. **État vide utile** : expliquer et proposer une action.
6. **Adaptation au conteneur** : en largeur réduite, la table bascule en cartes.

**Pièges** : casser une chaîne d'action existante ; perdre des exports utilisés ; tout réécrire alors qu'un rhabillage suffit.

**Preuve** : actions existantes toujours fonctionnelles + checks verts.

---

## S11 — Enrichir sans casser (migration douce)
**Modèle : intermédiaire.**

**Règles**
- Nouveaux champs **optionnels**, valeurs par défaut calculées à la lecture.
- Migration de schéma **additive et idempotente** : ajout de colonne, création conditionnelle — jamais de suppression.
- Migration de données **à la volée** : transformer l'ancienne forme à l'hydratation.
- Permissions, déclarations, exports : **ajouter** sans réordonner.
- Les tests existants doivent passer **sans modification** — c'est le juge de la rétro-compatibilité.

**Preuve** : des données de l'ancienne version se chargent et s'affichent correctement après mise à jour.

---

## S12 — Reprendre un travail interrompu
**Modèle : intermédiaire.** Skill de survie.

**Étapes**
1. `git log --oneline -3` → le travail a-t-il déjà été poussé ? (Arrive plus souvent qu'on ne croit.)
2. `git status` + `git diff --stat` → que reste-t-il sur le disque ?
3. **Ne jamais `git reset` sans avoir lu.** Détruire 80 % de travail valide est une erreur classique.
4. Vérifier la cohérence de l'existant : imports utilisés, aucune référence non définie.
5. Compléter ce qui manque, puis **committer immédiatement**.
6. Seulement ensuite, continuer les livrables restants.

**Consigne type**
```
REPRISE : travail non committé dans ⟨chemins⟩.
Vérifie-le (git status, git diff --stat), complète-le, valide les checks,
committe et pousse IMMÉDIATEMENT avant de continuer.
```

---

## S13 — Gérer une variable sensible (secret / credential)
**Modèle : fort** pour la décision d'architecture, **intermédiaire** pour l'implémentation.

**Niveaux de sécurité (du plus risqué au plus sûr)**

| Niveau | Mécanisme | Usage |
|---|---|---|
| ❌ En dur dans le code | `const key = "sk-..."` | Jamais |
| ⚠️ `.env` committé | Git history contient le secret | Clés de dev révocables seulement |
| ✅ `.env.local` (gitignored) | Local uniquement | Dev local |
| ✅ Variable CI/CD | Dashboard Cloudflare / GitHub Actions secrets | Production |
| ✅ Stockage runtime chiffré | `proxy.storage` / keychain | Secret saisi par l'utilisateur à l'exécution |

**Règles**
- Préfixe `VITE_` obligatoire pour exposer une variable au navigateur (Vite remplace statiquement).
- Sans `VITE_`, la variable est **invisible au bundle** — utile pour les scripts serveur.
- Priorité de lecture : stockage runtime (saisi par l'utilisateur) > variable d'environnement build > défaut.
- Toujours documenter la variable dans `.env.example` (sans la valeur réelle).
- Révoquer toute clé exposée accidentellement dans git — même après suppression du commit.

**Preuve** : `grep -r "sk-\|secret\|password" src/` ne retourne rien de hardcodé.

---

## S14 — Produire la documentation technique
**Modèle : intermédiaire** (fort si décisionnelle).

**Règles**
- La documentation vit **dans le dépôt** (`docs/` ou à la racine) — elle est versioned et citable.
- Structure recommandée : Contexte → Décision → Conséquences (format ADR).
- Distinguer : *implémenté*, *optionnel non livré*, *roadmap*, *dette technique*.
- Les vérités normatives sont dans le **code** — la doc est la boussole, pas la bible.
- Mettre à jour à chaque incident : chaque nouvelle ligne au §Pièges représente une leçon payée.

---

## Comment ajouter une skill

```
## S⟨N⟩ — ⟨Nom de la skill⟩
**Modèle : ⟨fort / intermédiaire / minimal⟩.**

**Quand** : ⟨condition d'emploi⟩

**Étapes** : ⟨numérotées⟩

**Pièges** : ⟨payés cash — chaque ligne vaut un incident⟩

**Preuve** : ⟨comment savoir que c'est réussi⟩
```

Sans la section « Preuve », une skill n'est qu'une intention.

---

*Catalogue universel — à enrichir après chaque incident. Pas de doublons avec
`SKILLS-⟨projet⟩.md` qui porte les skills projet-spécifiques.*
