<!-- Bloc géré par Lovable — ne pas supprimer -->
<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

---

# AGENTS.md — Orchestration multi-agents : guide universel

> **Fichier universel, applicable à tout projet.** Copie-le à la racine du
> dépôt sous le nom `AGENTS.md` : les agents de code le lisent automatiquement
> en début de session. Adapte uniquement les blocs `⟨à adapter⟩`.
>
> Ce guide est issu de mesures réelles sur un projet de grande envergure
> (~20 composants majeurs, ~60 agents, ~12 interruptions d'infrastructure).
> Chaque règle a été payée par un incident concret.

---

## 0. Contexte du projet

- **Dépôt / branche de travail** : `amichiamine/waymen-ai-studio` — `main`
- **Nature** : SPA e-commerce/vitrine 100 % client — React 19 + Vite 7 + TypeScript,
  Tailwind 4, shadcn/Radix, React Router 6, TanStack Query, Zod. Aucun backend :
  `bun run build` produit un `dist/` statique.
- **Commande de vérité** : `bun run lint && bunx tsc --noEmit && bun run build` — **jamais affaiblie**
- **Plan de référence** : `PLAN.md` (racine) — **source de vérité unique**, citable dans chaque consigne
- **Plan Lovable historique** : `.lovable/plan.md` (Lot 2, partiellement soldé — voir `PLAN.md` §7)
- **Contrat d'API** : `docs/API-CONTRACT.md` — contrat de la couche `src/api`
- **Catalogue de compétences** : `SKILLS.md` (racine du dépôt)
- **Gestionnaire de paquets** : `bun` (`bun.lock`, `bunfig.toml`) — ne pas introduire npm/yarn/pnpm
- **Formatage** : `prettier` + `eslint-plugin-prettier` — `bun run format` avant commit

### Repères d'arborescence

| Chemin            | Rôle                                                                |
| ----------------- | ------------------------------------------------------------------- |
| `src/pages/`      | Écrans routés (visiteur + `admin/`)                                 |
| `src/components/` | Composants partagés, `ui/` = primitives shadcn (ne pas réécrire)    |
| `src/api/`        | Couche d'accès aux données — respecter `docs/API-CONTRACT.md`       |
| `src/lib/`        | Fondations transverses : `i18n.tsx`, `site-content.ts`, utilitaires |
| `src/data/`       | Données mock (produits, blog)                                       |
| `src/hooks/`      | Hooks réutilisables                                                 |
| `scripts/`        | Outillage build (`generate-sitemap.ts`)                             |

### Conditions absolues — à recopier dans chaque consigne d'agent

1. **Conformité totale au contrat du projet** (`docs/API-CONTRACT.md`, conventions
   TypeScript strictes, primitives `src/components/ui`) — aucune dérogation.
2. **Les scripts de validation ne sont jamais affaiblis** — enrichissement additif
   uniquement (jamais de `// eslint-disable` de complaisance, jamais de `any`
   pour faire passer `tsc`).
3. **i18n FR/EN/AR** : toute chaîne visible passe par `t()` / `Localized<string>`,
   et l'alignement utilise `text-start`/`text-end` (jamais `left`/`right`) — RTL oblige.
4. **Projet connecté à Lovable** : ne jamais réécrire l'historique publié
   (pas de force-push, rebase ou amend sur du déjà poussé), garder `main` fonctionnelle.

---

## 1. Principe fondateur

> **Le modèle fort DÉCIDE. Le modèle rapide EXÉCUTE un pattern déjà décidé.
> Le modèle minimal INVENTORIE.**

Sur un projet d'envergure, 90 % du volume est de la _réplication_ :
appliquer 20 fois une structure, écrire 40 manifestes, produire 600 lignes
de données. Ce travail n'a pas besoin du meilleur raisonnement — il a besoin
d'un **exemplaire à copier** et de consignes sans ambiguïté.

**Corollaire stratégique** : investir le modèle fort _en amont_ (un pilote
exemplaire, un plan versioned dans le dépôt) est ce qui rend l'exécution
économe. L'inverse — lancer 20 agents forts sans pilote — coûte 10× plus
pour un résultat moins homogène.

---

## 2. Allocation des modèles

| Rôle                                      | Modèle                  | Justification                                                           |
| ----------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| **Orchestrateur** (session principale)    | **fort** — effort élevé | Architecture, arbitrages, consignes, diagnostic. Erreur ici × N agents. |
| **Diagnostic de cause racine**            | **fort**                | Suivre une chaîne d'appels, formuler une hypothèse falsifiable.         |
| **Conception d'un pilote**                | **fort**                | Copié N fois : qualité et défauts multipliés par N.                     |
| **Réplication d'un pattern établi** ⭐    | **intermédiaire**       | 5-10× moins cher, même qualité si un exemplaire est nommé.              |
| **Données structurées**                   | **intermédiaire**       | Doit lire les signatures réelles — le minimal invente.                  |
| **Inventaire / extraction / renommage**   | **minimal**             | Mécanique, format strict, aucun arbitrage.                              |
| **Rédaction décisionnelle** (plan, ADR)   | **fort**                | Engage des choix durables.                                              |
| **Rédaction informative** (note, rapport) | **intermédiaire**       |                                                                         |

### Règle de bascule en 3 phrases

- « **Fais comme X, pour Y** » → intermédiaire.
- « **Trouve pourquoi** » ou « **décide comment** » → fort.
- « **Liste / extrais / renomme** » → minimal.

### Signal qu'on s'est trompé de modèle

- L'agent intermédiaire _conçoit_ au lieu de copier → il manquait un pilote.
- L'agent fort produit du répétitif → gaspillage, le pilote existait.
- Le minimal invente des valeurs → tâche mal classifiée, passer en intermédiaire.

---

## 3. Protocole d'exécution — le plus rentable du document

Le vrai gouffre n'est **pas le modèle** : c'est le **travail perdu**. Un agent
interrompu sans commit coûte plein tarif et rend zéro.

### 3.1 Micro-tâches

Une tâche = **une unité livrable** (un composant, un module), jamais un
domaine entier. Cible : **5 à 10 minutes**. Une tâche courte finit avant
l'incident ; une tâche longue est un pari sur la stabilité de l'environnement.

### 3.2 Auto-commit par l'agent lui-même

Chaque consigne se termine **littéralement** par :

```bash
git add ⟨SES chemins uniquement⟩
git commit -m "⟨type(scope): résumé⟩" -m "Co-Authored-By: ⟨agent⟩"
git pull --rebase origin ⟨branche⟩ && git push origin ⟨branche⟩  # 3 essais max
```

Plusieurs agents "perdus" ont en réalité déjà poussé. Vérifier avant de
relancer à zéro.

### 3.3 Livrables numérotés avec seuil de commit

Écrire : **« committe dès que 1 + 2 sont faits, puis continue »**. Une
interruption ne coûte que les points 3-4.

### 3.4 Périmètres disjoints

Agents parallèles = dossiers strictement séparés. Chacun ne committe que
ses chemins. Le parallélisme devient sûr : conflits de rebase transitoires
au pire, jamais de perte.

### 3.5 Anti-doublon obligatoire

Chaque consigne commence par `git pull --rebase` + `git log --oneline -3`.
Si la tâche est déjà livrée → l'agent s'arrête et le signale. Sans cette
règle on repaye du travail fait.

### 3.6 Reprise, jamais redémarrage

Après interruption : `git status` d'abord. Travail sur disque = agent de
**reprise** (« complète et committe l'existant »). Un agent tué à 80 %
ne coûte alors que 20 %.

### 3.7 Parallélisme raisonnable

**4 à 6 agents** simultanés est l'optimum observé. Au-delà, les collisions
de rebase et les reprises annulent les gains.

### 3.8 Rapports courts

**4 à 5 lignes maximum** : hashes poussés, livrables, reste. Le contexte
de l'orchestrateur est une ressource — un rapport verbeux le consume inutilement.

---

## 4. Anatomie d'une consigne efficace

```
1. Synchronisation   git pull --rebase origin ⟨branche⟩
2. Anti-doublon      git log --oneline -3 → arrêt si déjà livré
3. Périmètre exact   chemins autorisés + "ne committe que tes chemins"
4. Exemplaire        "copie-adapte ⟨chemin/pilote⟩, ne réinvente rien"  ← clé
5. Livrables N°      avec seuil de commit ("committe dès que 1+2 faits")
6. Règles absolues   §6 recopié
7. Checks à passer   nommés un par un
8. Séquence git      écrite littéralement
9. Rapport           4-5 lignes max
```

### Anti-patterns coûteux

| Anti-pattern                                 | Conséquence                         |
| -------------------------------------------- | ----------------------------------- |
| Demander de « concevoir » à un modèle rapide | Réinvention, code hétérogène        |
| Omettre l'exemplaire                         | L'agent raisonne : coût ×5          |
| Laisser choisir le périmètre                 | Collisions, commits croisés         |
| Un seul commit en fin de tâche               | Tout ou rien face aux interruptions |
| Rapport détaillé                             | Contexte orchestrateur saturé       |
| Vague sans pilote validé                     | N variantes du même défaut          |

---

## 5. Méthode par phase

```
1. PLANIFIER   (fort)         → plan dans le dépôt, versioned, citable
2. PILOTER     (fort)         → un exemplaire irréprochable
3. RÉPLIQUER   (intermédiaire×4-6) → micro-tâches disjointes, auto-commit
4. VALIDER     (orchestrateur) → arbre propre + tous les checks
5. TESTER      (humain)       → ce que l'agent ne peut pas exécuter
6. CORRIGER    (adapté)       → fort si cause inconnue, rapide si évident
```

### Planifier — dans le dépôt, pas dans le chat

Le plan versionné (`PLAN.md`) survit aux redémarrages, est citable dans les
consignes et devient la source de vérité unique. Un plan resté dans la
conversation est perdu.

### Piloter — l'investissement décisif

Un seul exemplaire complet et conforme avant toute réplication. Le pilote
est la spécification exécutable : plus besoin de décrire, il suffit de
désigner. C'est ce qui autorise la bascule vers un modèle rapide.

### Valider — l'orchestrateur ne code pas, il vérifie

À froid, aucun agent en train de tourner. `git status` propre + batterie
complète de checks. Ne jamais conclure sur la foi des rapports d'agents :
vérifier soi-même. Plusieurs rapports « tout est livré » se sont révélés
partiellement faux.

### Tester — rôle irremplaçable de l'humain

L'environnement d'un agent ne peut pas tout exécuter (navigateur, build
complet, tests e2e, interactions réelles). **Certains bugs ne se voient que
chez l'utilisateur.** Jalons courts et testables > grande révélation finale.

---

## 6. Règles absolues et pièges ⟨à adapter⟩

À recopier **dans chaque consigne**. Chaque ligne vaut un incident.

### Règles de conformité

| Règle                 | Détail                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Contrats du projet    | Respect intégral, aucune dérogation                                    |
| Checks                | Jamais affaiblis ; enrichissement additif seulement                    |
| Additivité            | Types, schémas, permissions : on **ajoute**, jamais on ne casse        |
| Isolation             | Pas d'import direct entre composants — passer par l'interface publique |
| Souveraineté          | Une entité = un propriétaire ; les autres la référencent par ID        |
| Dégradation gracieuse | Source absente → repli visible, **jamais** d'erreur bloquante          |

### Pièges universels ⟨complétés par les pièges de ton projet⟩

| Piège                                            | Règle                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| Import non utilisé                               | Tout import ajouté doit être consommé → build cassé sinon          |
| Élargissement de périmètre "pendant qu'on y est" | Rester strictement dans les chemins assignés                       |
| Sonde de disponibilité en écriture               | Lecture seule pour tester la présence d'un service                 |
| Valeurs inventées                                | Lire les sources réelles avant d'écrire (IDs, signatures, schémas) |
| Duplication de logique                           | Les handlers appellent les méthodes existantes, jamais de copie    |
| Données non injectables                          | Si un champ est dans les types, il doit aussi être dans l'API      |

### Leçon transversale

Quand une fonctionnalité est ajoutée à un modèle de données, vérifier que
**toutes les portes d'entrée** l'exposent (API, bus, imports, seeds). Un
champ présent dans les types mais absent des APIs est invisible à la démo,
aux imports et à l'automatisation.

---

## 7. Diagnostiquer une panne

1. **Ne pas croire le symptôme.** « Non installé » peut signifier « non appelable ».
2. **Remonter la chaîne dans le code** maillon par maillon. Écrire l'hypothèse.
3. **Chercher la cause commune.** Plusieurs symptômes = une origine en amont.
4. **Demander la preuve terrain** quand l'environnement de l'agent est aveugle.
5. **Corriger au niveau le plus haut** possible : normalisation centrale > N correctifs.
6. **Généraliser** : vérifier que le défaut n'existe nulle part ailleurs.
7. **Instrumenter** : laisser un message d'erreur explicite là où régnait le silence.

### Rendre les échecs visibles

Une dégradation gracieuse silencieuse masque ses pannes. Accompagner toujours
la dégradation d'un **journal** (cause par entrée) et d'un **indicateur visible**
dans l'interface. Sans ça, un traitement qui ne fait rien reste inexpliqué.

---

## 8. Checklist de démarrage de session

```
[ ] Lire AGENTS.md + le plan du projet + SKILLS.md
[ ] git status → arbre propre ? Sinon : reprise du partiel EN PREMIER
[ ] git log --oneline -10 → où en est-on réellement ?
[ ] Identifier la micro-tâche suivante
[ ] Un pilote existe-t-il ?
      non → le construire avec le modèle fort avant tout
      oui → fan-out 4-6 agents intermédiaires, périmètres disjoints, auto-commit
[ ] Après la vague : validation à froid par l'orchestrateur
[ ] Jalon de test humain avant la phase suivante
```

---

## 9. Ordre de grandeur (calibrage budgétaire)

- Un agent d'implémentation d'un composant : **50 000 à 200 000 tokens**.
- Même travail en intermédiaire plutôt que fort : **~5-10× moins cher** si un pilote existe.
- Le vrai gouffre : travail perdu sans commit = plein tarif pour zéro rendu.
  **Le protocole §3 est financièrement plus décisif que le choix du modèle.**

---

_Guide universel — à enrichir après chaque incident. Chaque nouvelle règle
au §6 "Pièges" représente une leçon concrète._
