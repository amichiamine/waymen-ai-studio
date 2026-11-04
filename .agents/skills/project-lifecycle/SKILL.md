---
name: project-lifecycle
description: Procédures de cycle de vie projet : amorçage (bootstrap), intégration projet existant, tests, build et validation continue.
---

# Skill : Project Lifecycle & Quality Gates

## 1. Objectif

Ce skill détaille les procédures opératoires standard (SOP) pour intégrer et piloter n'importe quel projet d'ingénierie logicielle avec le framework `.agents/` sous l'autorité d'**ArchiSys3.0**.

---

## 2. Procédure d'Amorçage sur Projet Neuf (Greenfield Bootstrap)

Lorsque le framework `.agents/` est déployé sur un projet vierge :

1. **Instanciation depuis les Templates :**  
   Les fichiers modèles `*.template.md` sont les matrices canoniques prêtes à l'emploi. L'Agent IA vérifie et initialise les fichiers actifs du projet hôte :
   - `VISION_ET_PHILOSOPHIE.template.md` $\rightarrow$ `VISION_ET_PHILOSOPHIE.md`
   - `ARCHITECTURE_TECHNIQUE.template.md` $\rightarrow$ `ARCHITECTURE_TECHNIQUE.md`
   - `tracabilites.template.md` $\rightarrow$ `tracabilites.md`
   - `Implementations_Plans/00_template_plan_implementation.md` $\rightarrow$ Matrice étalon pour rédiger le premier plan `01_...md`.

2. **Cadrage de la Vision & Cristallisation Continue du Brainstorming :**  
   Proposer à **ArchiSys3.0** un échange structuré pour renseigner :
   - [`.agents/VISION_ET_PHILOSOPHIE.md`](file:///./VISION_ET_PHILOSOPHIE.md) (Ambition, Paradigmes, Piliers choisis, Lignes rouges).  
     _Règle d'or : Chaque point validé au cours du brainstorming est immédiatement consigné dans le document par l'Agent IA._

3. **Conception de l'Architecture Préliminaire (Agnosticisme Total) :**  
   Définir la topologie, la pile technique libre et la persistance dans :
   - [`.agents/ARCHITECTURE_TECHNIQUE.md`](file:///./ARCHITECTURE_TECHNIQUE.md).

4. **Sanctuaire des Règles d'Or :**  
   Présenter [`.agents/rules/GOLDEN_RULES.md`](file:///./rules/GOLDEN_RULES.md) à ArchiSys3.0 et enregistrer dans la Partie II les règles spécifiques au projet hôte.

5. **Amorçage de la Phase 01 :**  
   Rédiger le premier plan d'implémentation (avec artéfact et copie miroir) pour initialiser le socle technique du projet hôte.

---

## 3. Procédure d'Intégration sur Projet Existant (Brownfield Handover)

Lorsque le framework `.agents/` est introduit dans un projet déjà entamé :

1. **Audit d'Inventaire en Mode Read-Only :**
   - Analyser l'arborescence, les dépendances (ex: `package.json`, `composer.json`, `requirements.txt`, `go.mod`), et les points d'entrée du projet.
   - Identifier les suites de tests existantes et les scripts de build de production.

2. **Rétro-Ingénierie Documentaire :**
   - Renseigner [`.agents/ARCHITECTURE_TECHNIQUE.md`](file:///./ARCHITECTURE_TECHNIQUE.md) avec la cartographie constatée.
   - Soumettre ce diagnostic pour validation formelle par ArchiSys3.0.

3. **Ouverture du Journal de Traçabilité :**
   - Initialiser [`.agents/tracabilites.md`](file:///./tracabilites.md) avec une Phase 01 dédiée à la reprise en main, l'audit et la sécurisation du projet.

---

## 4. Procédure de Recette Continue & Quality Gate

Pour chaque phase en Mode Implémentation :

1. **Vérification Statique :**  
   Exécuter les linters ou vérificateurs de syntaxe du projet hôte.
2. **Exécution des Bancs d'Essais :**  
   Lancer les suites de tests unitaires et d'intégration automatisées.
3. **Build & Bundle :**  
   Déclencher la compilation ou la génération des livrables selon les scripts définis dans l'architecture technique.
4. **Validation de Non-Régression :**  
   Garantir l'absence d'erreurs runtime, d'avertissements critiques ou d'effets de bord non déclarés.

---

## 5. Gestion & Création des Skills Spécifiques Hôtes (Core vs Host Skills)

Le framework `.agents/` distingue rigoureusement deux catégories de compétences :

### A. Skills Universels Core (Permanents & Agnostiques)

- 📁 **`skills/agent-core/`** : Rôles, modes opératoires (Read-Only, Diag, Plan, Implémentation), charte visuelle, analyse Pro/Cont et rigueur d'ingénierie.
- 📁 **`skills/project-lifecycle/`** : Cycle de vie, bootstrap greenfield/brownfield, parité 1:1 et quality gates.

### B. Skills Hôtes Spécifiques (Propres au Projet en Cours)

Lorsque le projet hôte dispose d'un outillage technique particulier (ex: bundler complexe, conteneurs Docker, commandes de migration de base de données, pipeline CI/CD spécifique), AImi doit proposer à **ArchiSys3.0** la création d'un skill dédié :

- **Emplacement :** 📁 `.agents/skills/<stack>-<usage>/` (ex: `vite-react-build`, `django-migrations`, `docker-deploy`).
- **Contenu Obligatoire de `SKILL.md` :**

  ```markdown
  ---
  name: <nom-du-skill>
  description: <Description concise de la compétence pour l'Agent IA>
  ---

  # Skill : [Intitulé de la Procédure]

  ## 1. Contexte & Dépendances

  ## 2. Commandes & Scripts Opératoires

  ## 3. Critères de Validation & Recette
  ```

- **Règle d'Or :** Les skills hôtes ne doivent jamais altérer ou contredire les règles de gouvernance suprêmes de `AGENTS.md` et `agent-core`.
