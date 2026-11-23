# Plan d'Implémentation Phase 58 — Thème Light d'Usine Universel & Purge Complète des Préférences Thème

- **Date :** 23/11/2026
- **Directeur de Projet & Architecte Décideur :** ArchiSys3.0
- **Tech Lead, Architecte & Consultant R&D :** AImi
- **Statut :** 📋 **En Attente de Validation Formelle**

---

## 1. Contexte & Problématique

Malgré l'inversion des tokens CSS en Phase 55, le site installé réapplique le thème sombre à l'initialisation pour deux raisons identifiées :

1. **Données d'Usine Serveur :** `scripts/extraire-donnees-front.ts` et `api/tools/donnees-front.json` spécifiaient encore `"defaultTheme": "dark"`. Lors de l'installation par `install.php`, la base SQLite receivait l'instruction formelle d'adopter le thème sombre par défaut.
2. **Clé Locale Navigateur :** Le choix de thème utilisateur est mémorisé sous la clé `ka-theme`. Cette clé n'était pas purgée lors d'un reset de session, réappliquant l'ancien choix sombre stocké.

---

## 2. Découpage en Sous-Phases & Actions Chirurgicales

### Sous-Phase 58.1 : Thème Light Natif dans les Données d'Usine & Re-génération JSON

- Modifier [`scripts/extraire-donnees-front.ts`](file:///c:/xampp/htdocs/waymen/scripts/extraire-donnees-front.ts) :  
  Passer `defaultTheme: "light"`.
- Exécuter l'extraction pour mettre à jour [`api/tools/donnees-front.json`](file:///c:/xampp/htdocs/waymen/api/tools/donnees-front.json).
- Ré-importer dans la base SQLite locale via [`api/tools/importer-donnees-front.php`](file:///c:/xampp/htdocs/waymen/api/tools/importer-donnees-front.php) pour sanctuariser `"defaultTheme": "light"` en base.

### Sous-Phase 58.2 : Purge Complète de la Préférence de Thème Utilisateur

- Mettre à jour `purgerCacheClientSiteSettings()` dans [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/waymen/src/data-provider/site-settings.ts) pour purger explicitement la clé `ka-theme`.
- Vérifier dans [`index.html`](file:///c:/xampp/htdocs/waymen/index.html) et [`src/lib/theme.tsx`](file:///c:/xampp/htdocs/waymen/src/lib/theme.tsx) la cohérence de l'évaluation initiale (0 ms).

### Sous-Phase 58.3 : Validation CI Intégrale & Génération des Paquets

- Exécuter la suite de validation :
  ```powershell
  bun run verifier-i18n
  bunx tsc --noEmit
  bun run format
  bun run lint
  bun run build
  bun run paqueter:data
  ```
- Mettre à jour le journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/waymen/.agents/tracabilites.md).

---

## 3. Matrice de Recette & Critères d'Acceptation

- [ ] `api/tools/donnees-front.json` contient `"defaultTheme": "light"`.
- [ ] La base SQLite locale a `defaultTheme = light` dans la table `settings`.
- [ ] Le bouton de purge du backstage supprime la clé `ka-theme`.
- [ ] CI 100% verte et nouvelles archives prêtes.
