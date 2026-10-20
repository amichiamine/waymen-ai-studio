# PLAN D'IMPLÉMENTATION [XX] : [TITRE_EXPLICITE_DU_CHANTIER]

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Projet Hôte :** `<Nom_Du_Projet>`  
**Workspace :** `<Workspace_Root>`  
**Statut :** `En attente de validation` *(puis `🟢 Terminé & Livré` après recette)*  

---

> [!NOTE]
> **CANEVAS DIRECTEUR TYPE POUR L'AGENT IA :**  
> Ce document est la matrice étalon pour formaliser tout plan d'implémentation.  
> 1. Nommer le fichier miroir selon la convention ordonnée : `[XX]_[nom_descriptif].md` (ex: `01_initialisation_socle.md`).  
> 2. Publier simultanément l'artéfact interactif du système (`ArtifactMetadata` avec `RequestFeedback: true`).  
> 3. Attendre la validation formelle d'ArchiSys3.0 avant d'engager le code.

---

## 1. Objectifs & Périmètre du Chantier

*Définir ici la finalité technique et fonctionnelle précise de l'intervention :*
- **Contexte & Justification :** Quelle problématique ou évolution motivent ce chantier ?
- **Périmètre d'Impact :** Quels modules, composants, bases ou fichiers sont concernés ?
- **Non-Régression & Sécurité :** Quelles garanties doivent être préservées ?

---

## 2. Découpage Chronologique des Phases

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Phase [XX] : [Intitulé de la Phase]                                        │
 │  ├── Étape 1 : [Description de l'action chirurgicale]                       │
 │  ├── Étape 2 : [Description de l'action chirurgicale]                       │
 │  └── Étape 3 : [Description de l'action chirurgicale]                       │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │
 ┌──────────────────────────────────────▼──────────────────────────────────────┐
 │  Recette & Contrôle de Santé                                                │
 │  └── Exécution des tests, linters et validations de non-régression          │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### Étape 1 : [Titre de l'Étape]
- Actions chirurgicales précises à mener.
- Fichiers cibles à créer ou éditer.

### Étape 2 : [Titre de l'Étape]
- Actions chirurgicales précises à mener.

---

## 3. Consolidation des Sous-Phases (Option A)

*En cas d'arbitrage intermédiaire ou d'ajustement demandé par ArchiSys3.0 au cours des travaux, enrichir directement cette section (ex: Sous-Phase [XX].1) en **rééditant directement l'artéfact interactif du plan originel (`RequestFeedback: true`) et son fichier miroir associé** pour validation. Il est formellement interdit de créer un second artéfact interactif disjoint. Zéro création de nouveau numéro de phase principale sans plan dédié.*

---

## 4. Matrice de Recette & Critères de Succès

| Critère de Validation | Méthode de Contrôle | Résultat Attendu |
| :--- | :--- | :--- |
| **Non-régression fonctionnelle** | Exécution des tests ou vérification manuelle | Zéro erreur runtime ni régression |
| **Conformité architecturale** | Revue de code selon les directives | Respect strict des choix d'ArchiSys3.0 |
| **Tenue de la traçabilité** | Mise à jour de `tracabilites.md` | Phase enregistrée avec parité 1:1 |
