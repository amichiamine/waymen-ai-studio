# ARCHITECTURE TECHNIQUE UNIFIÉE

**Projet Hôte :** `<Nom_Du_Projet>`  
**Directeur & Concepteur :** ArchiSys3.0  
**Tech Lead & Architecte R&D :** AImi  
**Date d'Initialisation :** `<Date>`  
**Dernière mise à jour :** `<Date_Mise_A_Jour>`  

---

> [!NOTE]
> **CANEVAS DIRECTEUR D'ARCHITECTURE TECHNIQUE (TEMPLATE OFFICIEL) :**  
> Ce document est la référence technique absolue décrivant la topologie logicielle, le découpage modulaire, la persistance et les flux de données.  
> - **Agnosticisme Total :** Aucune pile technique ou topologie n'est imposée par défaut. Ce document s'adapte à tout archétype (Monolithe, Microservices, CLI, SDK, API Headless, Mobile, Cloud, Embarqué, etc.).  
> - **Règle de Cristallisation Immédiate :** Chaque choix validé lors des sessions de travail avec **ArchiSys3.0** doit être consigné ici en temps réel.

---

## 1. Archétype & Topologie Globale du Système

*Spécifier ici l'archétype du système (ex: Monolithe modulaire, Microservices, Application Client Lourd, Outil CLI, Bibliothèque réutilisable, etc.) et modéliser la topologie globale :*

```text
 [Insérer ici le schéma textuel ASCII ou le diagramme Mermaid représentant l'architecture globale]
```

---

## 2. Piles Technologiques & Découpage Modulaire

### A. Composants & Langages Cibles
- **Langages & Runtimes :** `<Langages_Utilises>` *(ex: TypeScript, Python, Rust, Go, PHP, C++, etc.)*
- **Frameworks & Bibliothèques Clés :** `<Frameworks>` *(Validés expressément par ArchiSys3.0)*
- **Outils de Build, Compilation & Packaging :** `<Outils_Build>`

### B. Découpage Modulaire & Arborescence Source
```text
/
├── .agents/                 (Cadre Maître, règles, gouvernance, plans et traçabilité)
│   ├── Implementations_Plans/
│   ├── rules/
│   ├── skills/
│   └── tracabilites.md
├── <Dossier_Source>/        (Code source applicatif)
├── <Dossier_Tests>/         (Suites de tests automatisés et bancs d'essais)
└── <Fichiers_Config>        (Fichiers de configuration, manifeste, pipelines)
```

---

## 3. Modèle de Données & Stratégie de Persistance

*Décrire la stratégie de persistance ou spécifier s'il s'agit d'un système sans état (Stateless) :*
- **Nature du Stockage :** *(ex: Base relationnelle SQL, Documents NoSQL, Fichiers souverains plats, Cache mémoire, ou Stateless)*
- **Entités Majeures & Schéma Relationnel :** *(Description des structures clés et identifiants universels)*
- **Règles d'Intégrité & Transactions :** *(Contraintes d'unicité, cascades, audit trail)*

---

## 4. Flux de Traitement & Protocoles de Communication

- **Cycle Nominal d'Exécution :** *(Flux de données depuis le point d'entrée jusqu'à la sortie)*
- **Protocoles d'Échange :** *(ex: HTTP/REST, WebSocket, gRPC, IPC, CLI stdio/arguments)*
- **Gestion des Conflits & Reprise sur Incident :** *(Politique de retry, tolérance aux pannes)*

---

## 5. Sécurité, Confinement & Robustesse

- **Contrôle d'Accès & Permissions :** *(Règles d'authentification et isolation)*
- **Validation Stricte des Entrées :** *(Sanitisation et vérification des schémas)*
- **Gestion des Erreurs :** *(Zéro crash silencieux, restitution d'erreurs déterministes)*

---

## 6. Pipeline de Recette, Tests & Build

- **Commande de Validation / Tests :**  
  ```bash
  <Commande_Test>
  ```
- **Commande de Compilation / Build :**  
  ```bash
  <Commande_Build>
  ```
- **Critères de Succès de Non-Régression :**  
  Zéro erreur de compilation, linters au vert, exécution réussie des bancs d'essais.
