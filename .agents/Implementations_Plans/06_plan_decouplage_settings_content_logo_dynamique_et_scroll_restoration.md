# PLAN D'IMPLÉMENTATION — PHASE 06

## Découplage Settings / Contenus, Logo Personnalisable UI/UX, Vitrine Réactive aux Coordonnées & Restauration du Scroll

**Date :** 20 octobre 2026  
**Auteur :** AImi (Tech Lead, Architecte & Consultant R&D)  
**Destinataire & Validateur :** ArchiSys3.0 (Directeur de Projet & Architecte en Chef)  
**Branche / Dépôt :** `main` — `amichiamine/ka-tech`  
**Statut :** 📋 SOUMIS POUR ARBITRAGE & VALIDATION (Mode Plan)

---

### 1. Objectifs & Enjeux

1. **Restauration Universelle du Scroll (`ScrollToTop`) :**
   - Assurer que tout clic sur un lien du Header, du Footer, de la barre mobile ou de la navigation SPA replace instantanément le défilement au sommet de la page (`top: 0`), sans conserver la position basse de la page précédente.
2. **Logo Dynamique & Personnalisable depuis l'UI/UX :**
   - Étendre le schéma et les types de `SiteSettings` pour intégrer un champ `logoUrl?: string`.
   - Fournir dans `/admin/settings` (Carte Boutique) un sélecteur/téléverseur de logo avec prévisualisation en direct, intégration avec la médiathèque (`/admin/media`), ou saisie d'URL d'image.
   - Adapter [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Logo.tsx) pour afficher le logo personnalisé en priorité, avec repli gracieux sur le logo par défaut (`ka-tech-logo.webp`), et un texte alternatif `alt` synchronisé sur `siteSettings.storeName`.
3. **Câblage Intégral des Coordonnées & Identité dans la Vitrine :**
   - **Footer :** Intégrer un bloc "Coordonnées & Horaires" affichant en temps réel l'adresse, le téléphone (cliquable `tel:`), WhatsApp (cliquable `https://wa.me/...`), l'email de contact (cliquable `mailto:`), et les horaires d'ouverture. Dynamiser le copyright (`© {année} {storeName}`).
   - **Header :** Synchroniser l'identité et le `alt` du logo avec `siteSettings.storeName`.
   - **Page Contact :** Remplacer les chaînes rigides en dur par le nom dynamique du magasin (`storeName`), et afficher les liens des réseaux sociaux de `siteContent.footer.socials`.
   - **Page À Propos :** Remplacer les mentions rigides de la marque par le nom dynamique de la boutique (`storeName`).
4. **Découplage Propre Settings vs Contenus du Site :**
   - Sanctuariser `/admin/settings` pour les réglages d'identité et de fonctionnement du magasin (Nom, Logo, Coordonnées, Horaires, Devise, Langues, Maintenance, Stocks).
   - Sanctuariser `/admin/content` pour l'éditorial et les blocs visuels (Header, Footer, Hero, Bannières, Marques, Valeurs, Témoignages).

---

### 2. Découpage Chirurgical par Étapes

#### Étape 1 : Restauration Universelle du Scroll

- Créer [`src/components/ScrollToTop.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ScrollToTop.tsx) qui écoute les changements de `pathname` et `hash` via `useLocation()` et appelle `window.scrollTo({ top: 0, left: 0, behavior: "instant" })`.
- Insérer `<ScrollToTop />` à la racine du routeur dans [`src/App.tsx`](file:///c:/xampp/htdocs/ka-tech/src/App.tsx).

#### Étape 2 : Support du Logo Dynamique

- Mettre à jour les types TypeScript dans [`src/api/types.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/types.ts) et [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) pour inclure `logoUrl?: string`.
- Mettre à jour [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Logo.tsx) pour consommer `useSiteSettings()` :
  - Si `siteSettings.logoUrl` est défini, l'afficher via `ImageCatalogue` ou `img`.
  - Sinon, afficher le logo historique `ka-tech-logo.webp`.
  - Attribut `alt` dynamique : `{siteSettings.storeName || "KA Tech"}`.
- Dans [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx), ajouter le champ de configuration du logo dans la carte Boutique :
  - Aperçu visuel en direct du logo configuré (mode clair et foncé).
  - Bouton de téléversement direct d'image (via `useMediaAssetMutations`) et champ de saisie d'URL directe.
  - Bouton de réinitialisation au logo par défaut.

#### Étape 3 : Câblage des Coordonnées et Identité dans la Vitrine

- **Dans [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx) :**
  - Consommer `useSiteSettings()`.
  - Ajouter sous la description de la boutique une section claire affichant :
    - Adresse physique si renseignée avec icône `MapPin`.
    - Téléphone cliquable (`tel:...`) avec icône `Phone`.
    - Email cliquable (`mailto:...`) avec icône `Mail`.
    - Horaires d'ouverture avec icône `Clock`.
  - Remplacer le copyright statique par `© {new Date().getFullYear()} {siteSettings.storeName || "KA Tech"}. {t("footer.rights")}`.
- **Dans [`src/pages/Contact.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Contact.tsx) :**
  - Mettre à jour le titre dynamique : utiliser `siteSettings.storeName` au lieu d'une chaîne statique.
  - Ajouter un bloc "Réseaux sociaux" dans la colonne latérale reprenant `siteContent.footer.socials` pour une synergie parfaite.
- **Dans [`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx) :**
  - Consommer `useSiteSettings()` et injecter `siteSettings.storeName` dans le titre et les corps de texte au lieu du nom en dur.

#### Étape 4 : Découplage Settings / Contenus du Site

- Clarifier la carte "Boutique" dans `/admin/settings` (Identité, Logo, Coordonnées).
- Conserver la rétrocompatibilité totale avec l'API existante (`GET/PATCH /settings/site`).

#### Étape 5 : Batterie de Contrôles Qualité & Empaquetage

- Exécution de `bun run lint`.
- Exécution de `bunx tsc --noEmit` (0 erreur).
- Exécution de `bun run format`.
- Exécution de `bun run build` avec génération de l'archive horodatée (`katech-site-<timestamp>.zip`).
- Mise à jour du journal officiel de traçabilité [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).

---

### 3. Matrice de Recette & Critères d'Acceptation

| Test d'Acceptation                 | Condition de Succès                                                                                                                                                    |
| :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Test 1 : Scroll Restoration**    | Un clic sur un lien du Footer remonte immédiatement la fenêtre tout en haut (`scrollY === 0`).                                                                         |
| **Test 2 : Personnalisation Logo** | Téléverser ou saisir une URL de logo dans `/admin/settings` met à jour instantanément le logo dans le Header, le Footer et la page d'administration sans rechargement. |
| **Test 3 : Repli Logo**            | Si aucun logo n'est renseigné, le logo par défaut `ka-tech-logo.webp` s'affiche proprement.                                                                            |
| **Test 4 : Coordonnées Footer**    | L'adresse, l'email, le téléphone et les horaires configurés dans `/admin/settings` apparaissent clairement dans le Footer.                                             |
| **Test 5 : Nom Boutique Vitrine**  | Modifier `storeName` dans `/admin/settings` (ex: "WaYmen AI Studio") se répercute sur le Header, le Footer, Contact et À Propos.                                       |
| **Test 6 : Zéro Régression**       | Build de production et vérification TypeScript à 100% vert.                                                                                                            |
