# PLAN D'IMPLÉMENTATION — PHASE 07

## Architecture de Bootstrapping White-Label (Marque Blanche) & Éradication Définitive du FOUC (Flash de Contenu)

**Date :** 20 octobre 2026  
**Auteur :** AImi (Tech Lead, Architecte & Consultant R&D)  
**Destinataire & Validateur :** ArchiSys3.0 (Directeur de Projet & Architecte en Chef)  
**Branche / Dépôt :** `main` — `amichiamine/ka-tech`  
**Statut :** 📋 SOUMIS POUR ARBITRAGE & VALIDATION (Mode Plan)

---

### 1. Vision & Objectifs Stratégiques

1. **Socle 100% White-Label (Marque Blanche) :**
   - Bannir définitivement tout nom de marque commerciale hardcodé dans le code source de l'application (HTML statique, dictionnaires linguistiques i18n, graines de démonstration).
   - Rendre le système intrinsèquement agnostique à la marque pour permettre son initialisation et sa personnalisation complète pour n'importe quel exploitant depuis son backstore ou son assistant d'installation.
2. **Éradication Totale du FOUC (Flash of Unloaded/Default Content) :**
   - Supprimer le saut visuel de ~80 ms où l'écran affichait l'ancien nom de secours avant le retour de la requête asynchrone.
   - Fournir l'état initial des réglages dès la microseconde 0 (`Tick 0ms`) au runtime React via un mécanisme d'injection synchrone au service du HTML (`Server-Side Bootstrapping`) et un cache local persistant (`localStorage`).
3. **Interpolation Universelle des Libellés Métier :**
   - Doter le moteur de traduction d'un support d'interpolation de `{storeName}` afin que tous les titres d'onglets, descriptions SEO, en-têtes et textes légaux reflètent immédiatement et sans exception le nom de la boutique configurée.

---

### 2. Découpage Chirurgical par Étapes

#### Étape 1 : Neutralisation White-Label des Dictionnaires i18n

- Mettre à jour [`src/lib/i18n/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/fr.ts), [`en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/en.ts), [`ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/ar.ts) :
  - Remplacer les chaînes contenant "KA Tech" en dur par des libellés neutres ou des templates avec variable `{storeName}` :
    - `app.title: "{storeName} — La puissance tech entre vos mains"`
    - `contact.title: "Contactez l'équipe {storeName}"`
    - `about.title: "À propos de {storeName}"`
    - `footer.rights: "Tous droits réservés."`
- Vérifier que la fonction `t(key, vars)` interpole correctement `{storeName}`.

#### Étape 2 : Mécanisme de Bootstrapping Synchrone (Serveur PHP ➔ HTML)

- Dans le script serveur qui distribue l'application (`index.php` à la racine ou dans le point de distribution Apache/PHP) :
  - Interroger la table `settings` (`scope = 'site'`) pour extraire les réglages réels enregistrés (`storeName`, `logoUrl`, etc.).
  - Remplacer dans le flux HTML avant envoi les balises `<title>`, `<meta property="og:site_name">` par le nom réel du magasin.
  - Injecter dans le `<head>` une balise script synchrone :
    ```html
    <script id="__BOOTSTRAP_SETTINGS__">
      window.__SITE_SETTINGS_BOOTSTRAP__ = { ... };
    </script>
    ```
  - Résultat : le navigateur reçoit un document HTML qui porte DÉJÀ la bonne identité avant même le premier octet de JavaScript exécuté.

#### Étape 3 : Amorçage Synchrone dans le Front-end React

- Dans [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) :
  - Définir une fonction de lecture synchrone immédiate `getInitialSiteSettings()` :
    1. Si `window.__SITE_SETTINGS_BOOTSTRAP__` est défini, l'utiliser en priorité absolue.
    2. Sinon, si `localStorage.getItem("katech_site_settings")` existe, l'utiliser.
    3. Sinon, repli sur un objet neutre White-Label (`storeName: "Boutique Officielle"`).
  - Alimenter `DEFAULT_SITE_SETTINGS` avec cette valeur synchrone.
  - Dès le premier rendu (0 ms), React démarre avec la valeur réelle. Zéro latence perçue, zéro flash.
- Dans [`src/data-provider/cache.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/cache.ts) :
  - Persister automatiquement les écritures de `site-settings` dans `localStorage` pour les rechargements en mode SPA pur.

#### Étape 4 : Nettoyage White-Label de `index.html` & `seedSiteContent`

- Dans [`index.html`](file:///c:/xampp/htdocs/ka-tech/index.html) :
  - Remplacer les métadonnées de secours par des balises prêtes pour le White-Label.
- Dans [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) :
  - Nettoyer les mentions spécifiques de marque dans les textes d'accroche par défaut du Hero, WhyUs, et BuilderTeaser pour les rendre génériques et élégantes ("Votre spécialiste hardware & gaming...").

#### Étape 5 : Batterie de Contrôles Qualité & Packaging

- Exécution de `bun run lint` (0 erreur).
- Exécution de `bunx tsc --noEmit` (0 erreur).
- Exécution de `bun run format` (100% conforme).
- Exécution de `bun run build` et création du livrable horodaté (`katech-site-<timestamp>.zip`).
- Mise à jour du journal officiel de traçabilité [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).

---

### 3. Matrice de Recette & Critères d'Acceptation

| Test d'Acceptation                             | Condition de Succès                                                                                                                                     |
| :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Test 1 : Zéro Flash au Rechargement (FOUC)** | À l'ouverture ou au rechargement (F5), l'écran affiche instantanément "WaYmen AI Studio" sans jamais faire apparaître "KA Tech" pendant 1 milliseconde. |
| **Test 2 : Titre de l'Onglet Navigateur**      | L'onglet du navigateur affiche immédiatement le nom de la boutique configurée dès le premier rendu HTML.                                                |
| **Test 3 : White-Label Intégral**              | Le code source de l'application ne contient aucune marque commerciale imposée en dur ; le nom et le logo sont 100% dérivés de la configuration.         |
| **Test 4 : Dynamisme Préservé**                | Modifier le nom ou le logo dans `/admin/settings` met à jour instantanément la boutique et le cache persistant.                                         |
| **Test 5 : Zéro Régression Technique**         | Lint, TypeScript et build de production 100% verts.                                                                                                     |
