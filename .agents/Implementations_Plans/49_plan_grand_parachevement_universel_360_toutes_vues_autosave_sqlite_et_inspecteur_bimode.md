# PLAN D'IMPLÉMENTATION PHASE 49

## Grand Parachèvement Universel 360° : Universalisation des 8 Vues Publiques Restantes, Fiche Produit Composable, Auto-Save Débouncé SQLite & Inspecteur Bi-Mode

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan (`mode plan`)  
**Statut :** Soumis à validation formelle d'ArchiSys3.0 avant implémentation

---

### 1. Contexte & Diagnostic des Angles Morts

Suite à la livraison réussie de la Phase 48, l'audit exhaustif du routeur maître [`src/App.tsx`](file:///c:/xampp/htdocs/ka-tech/src/App.tsx) et du backend SQLite a identifié les manques résiduels pour atteindre une **complétude 100% absolue** de la plateforme :

1. **8 Vues Publiques encore orphelines du Studio :**
   - `/product/:id` ([`Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx)) : La fiche produit unitaire (l'écran le plus crucial pour la conversion commerciale).
   - `/category` ([`CategoryIndex.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryIndex.tsx)) & `/category/:slug` ([`CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx)) : Le hub et les listings de catégories.
   - `/search` ([`Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx)) : La vue de recherche catalogue avec filtres à facettes.
   - `/checkout` ([`Checkout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Checkout.tsx)) : Le tunnel de finalisation de commande et saisie des adresses.
   - `/account` ([`Account.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Account.tsx)) : L'espace client (commandes, profil, adresses).
   - `/favorites` ([`Favorites.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Favorites.tsx)) : La liste des coups de cœur.
   - `/blog/:slug` ([`BlogArticle.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/BlogArticle.tsx)) : La vue détaillée d'un article de blog.
   - `/auth` ([`Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx)) : Le portail de connexion / création de compte.
2. **Risque de Perte de Données en Cas d'Oubli de Clic :**
   - Actuellement, les modifications dans le Studio restent en mémoire locale tant que l'administrateur ne clique pas manuellement sur « Enregistrer en BD ». Un rafraîchissement accidentel (`F5`) entraîne la perte des modifications non persistées.
3. **Inspecteur Monolithique :**
   - L'inspecteur de droite ne traite que les propriétés du bloc sélectionné. Les réglages de la vue elle-même (mise en page, masquage Header/Footer, arrière-plan de page, balises SEO) nécessitent d'ouvrir une modale séparée.

---

### 2. Objectifs & Résultats Attendus

- **100% des Vues Publiques Administrables (24 Vues Clés) :** Chaque page visible du site devient un canevas personnalisable dans le Studio où l'on peut ajouter des bannières, avis, réassurances, FAQ et composants au-dessus (`top`) ou au-dessous (`bottom`) du cœur applicatif natif.
- **Exécution Réelle des Vues Connectées dans le Canvas :** Aucune carte factice ; le Live Canvas monte les vrais composants connectés aux données réelles de la boutique avec la prop `suppressCustomBlocks={true}`.
- **Auto-Save SQLite Débouncé (1500ms) & Protection `beforeunload` :** Sauvegarde transparente et automatique en base SQLite locale dès qu'une modification est apportée, avec badge d'état temps réel (`🔵 Enregistrement...`, `🟢 Synchronisé SQLite`, `🟡 Non enregistré`) et alerte de fermeture d'onglet si une synchronisation est en attente.
- **Inspecteur Bi-Mode [ Bloc ] / [ Paramètres Vue ] :** Bascule instantanée en un clic au sommet du volet droit entre l'édition chirurgicale du bloc sélectionné et les réglages globaux de la vue (titre, fond, SEO, visibilité Header/Footer).

---

### 3. Découpage Chirurgical des Étapes

#### 🔹 Étape 49.1 : Définition par Défaut des 8 Vues Systèmes dans `PagesManager.tsx`

- Enrichir le catalogue des vues prédéfinies avec :
  1. `system_product` (slug: `product`, titre: `Fiche Produit Catalogue`)
  2. `system_category_index` (slug: `category`, titre: `Hub des Catégories`)
  3. `system_category_detail` (slug: `category/:slug`, titre: `Catalogue par Catégorie`)
  4. `system_search` (slug: `search`, titre: `Recherche & Filtres Avancés`)
  5. `system_checkout` (slug: `checkout`, titre: `Tunnel de Caisse & Paiement`)
  6. `system_account` (slug: `account`, titre: `Espace Client Personnel`)
  7. `system_favorites` (slug: `favorites`, titre: `Coups de Cœur & Favoris`)
  8. `system_blog_article` (slug: `blog/:slug`, titre: `Lecture Article de Blog`)
  9. `system_auth` (slug: `auth`, titre: `Portail d'Authentification Client`)
- Structurer le sélecteur de vue avec 3 groupes clairs :
  - 🏛️ _Vitrine & Institutionnel (Accueil, À propos, Contact, Légales)_
  - ⚙️ _Vues Systèmes & Parcours Clients (Produit, Catégories, Caisse, Panier, Suivi, Compte, Blog, etc.)_
  - 📄 _Vues Personnalisées Créées par l'Administrateur_

#### 🔹 Étape 49.2 : Équipement des 8 Pages en `suppressCustomBlocks` & Rendu `topBlocks`/`bottomBlocks`

- Dans [`Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx), [`CategoryIndex.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryIndex.tsx), [`CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx), [`Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx), [`Checkout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Checkout.tsx), [`Account.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Account.tsx), [`Favorites.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Favorites.tsx), [`BlogArticle.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/BlogArticle.tsx), [`Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx) :
  - Accepter `{ suppressCustomBlocks = false }`.
  - Résoudre la configuration de page correspondante depuis `siteContent.customPages`.
  - Si `!suppressCustomBlocks`, rendre `topBlocks.map(renderBlock)` avant le corps et `bottomBlocks.map(renderBlock)` après.
  - Appliquer la classe d'arrière-plan `pageBgClass`.

#### 🔹 Étape 49.3 : Intégration des Vraies Vues dans `StudioLiveCanvas.tsx`

- Importer les composants réels dans `StudioLiveCanvas.tsx`.
- Dans `SystemViewNativePreview({ page })`, connecter chaque clé système à son composant authentique avec `suppressCustomBlocks={true}` :
  - `product` : Fiche produit interactive (avec fallback produit démo si aucun ID dans l'URL).
  - `category` & `category_detail` : Listing de catégories et grille de produits filtrée.
  - `search` : Interface de recherche en direct avec facettes.
  - `checkout` : Écran de caisse avec formulaire de wilayas et modes de règlement.
  - `account` : Vue de gestion du profil et des commandes.
  - `favorites` : Grille interactive des coups de cœur.
  - `blog_article` : Mise en page de lecture d'article.
  - `auth` : Formulaire d'accès et d'inscription.

#### 🔹 Étape 49.4 : Auto-Save Débouncé SQLite (1500ms) & Garde `beforeunload`

- Dans [`PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) :
  - Implémenter un hook de debounce de 1500ms : toute modification apportée aux blocs ou aux paramètres de vue déclenche automatiquement un appel à `updateSiteContent({ customPages: pages })`.
  - Badge d'état dynamique :
    - `🔵 Sauvegarde en cours...` pendant l'aller-retour API.
    - `🟢 Synchronisé SQLite (katech-data)` dès la confirmation reçue.
    - `🟡 Modifications non enregistrées` pendant le délai de temporisation (debounce).
  - Maintenir le bouton « Enregistrer en BD » pour déclencher une persistance immédiate sans attendre la fin du timer.
  - Attacher l'événement `window.onbeforeunload` prévenant l'utilisateur en cas de fermeture intempestive tant qu'une sauvegarde est en attente.

#### 🔹 Étape 49.5 : Inspecteur Bi-Mode [ Bloc ] / [ Paramètres Vue ]

- Au sommet de la colonne droite de l'inspecteur dans `PagesManager.tsx` :
  - Ajouter un sélecteur à 2 onglets :
    - **[ Bloc actif ]** : Affiche `BlockPropsEditor` (propriétés fines, médias, textes trilingues, styles atomiques).
    - **[ Paramètres Vue ]** : Affiche directement les réglages de la page sélectionnée (Titre de la vue, Slug, Arrière-plan de page, Masquage Header / Footer / Ticker / WhatsApp flottant, Balises SEO et statut de publication), synchronisés en direct avec l'état `pages` et la base SQLite locale.

#### 🔹 Étape 49.6 : Contrôles Qualité CI & Déploiement

- Exécuter la chaîne de vérification inviolable :
  - `bun run verifier-i18n` (0 erreur).
  - `bunx tsc --noEmit` (0 erreur).
  - `bun run format` (conforme Prettier).
  - `bun run lint` (0 erreur).
  - `bun run build` (build de production Vite).
  - `bun run paqueter:data` (nouvelle archive SQLite).
- Mise à jour du Journal Officiel [`tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).
- Commit git atomique et push sur `origin/main`.

---

### 4. Matrice de Recette & Validation

| Test / Vérification                        | Comportement Attendu                                                                                                                                    |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sélecteur de Vues du Studio**            | Liste exhaustive des 24 vues organisées en 3 groupes (Vitrine, Systèmes, Custom).                                                                       |
| **Canvas Fiche Produit (`/product`)**      | Rendu de la vraie fiche produit connectée, avec possibilité d'ajouter des blocs personnalisés en haut et en bas.                                        |
| **Canvas Caisse, Recherche, Compte, etc.** | Rendu authentique des pages respectives sans récursion ni doublon de blocs.                                                                             |
| **Auto-Save Débouncé SQLite**              | Toute frappe ou déplacement de bloc déclenche l'enregistrement automatique après 1500ms ; le badge passe au vert `🟢 Synchronisé SQLite (katech-data)`. |
| **Inspecteur Bi-Mode**                     | Bascule fluide en un clic entre l'édition du bloc sélectionné et les réglages généraux de la vue.                                                       |
| **Quality Gates**                          | `verifier-i18n`, `tsc`, `lint`, `build` et `paqueter:data` passent à 100% avec code de retour 0.                                                        |

---

### 5. Soumission à Arbitrage

Ce plan est soumis à votre validation. Dès votre accord explicite (clic sur « Proceed » ou validation écrite), le chantier sera engagé dans le respect strict des règles de gouvernance.
