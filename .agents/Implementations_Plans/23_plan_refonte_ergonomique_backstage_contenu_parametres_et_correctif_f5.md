# PLAN D'IMPLÉMENTATION — PHASE 23

## Refonte Ergonomique Backstage (Contenu & Paramètres), Éditeur Visuel Builder, Aperçus Médias & Correctif F5

**Projet :** KA Tech (`amichiamine/ka-tech`)  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan  
**Statut :** En attente de validation par ArchiSys3.0

---

## 1. Contexte & Objectifs de la Phase 23

Suite au diagnostic approfondi validé par ArchiSys3.0, cette phase s'attaque à un bug serveur bloquant en production et à une refonte ergonomique majeure du Backstage Administrateur :

1. **Éradication Immédiate du Bug F5 Apache (`.htaccess`) :**  
   Empêcher la fuite du chemin absolu Linux (`/home/zzdwczcx/waymen.stacgate.com/about`) lors d'un rafraîchissement F5 sur les pages prérendues.
2. **Restructuration Ergonomique de « Contenu du site » en 4 Pôles Thématiques :**  
   Remplacer l'alignement confus de 16 onglets horizontaux par 4 grands pôles thématiques structurés (Vitrine d'Accueil, Pages Dédiées, Navigation & Global, Mobile & Flottant).
3. **Rapatriement et Unification des Éléments Visuels Égarés :**  
   Transférer le Ticker supérieur et les Marques défilantes depuis `Paramètres` vers `Contenu du site` avec des éditeurs visuels intégrés (fin des boutons d'enregistrement indépendants).
4. **Épuration Métier de « Paramètres » :**  
   Recentrer la vue sur le cœur de gestion du commerce (Identité, Coordonnées, Seuils de stock, Notifications email commerçant, Maintenance, Branding). Ajouter l'accès médiathèque pour le favicon.
5. **Éditeur Visuel pour le Configurateur PC :**  
   Éradiquer le champ JSON brut (`JsonEditorCard`) et doter le configurateur d'un vrai gestionnaire de composants et tarifs en DZD à la souris.
6. **Aperçus Intelligents des Visuels par Défaut dans `MediaPickerField` :**  
   Afficher l'image officielle du site en filigrane clair avec badge « Visuel par défaut » lorsque la base de données est vierge, pour supprimer les cadres vides trompeurs.

---

## 2. Découpage Chirurgical des Étapes

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 23 : ARCHITECTURE                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 1. SÉCURITÉ SERVEUR (.htaccess)  │ 2. ERGONOMIE BACKSTAGE              │
│ • Éradication saut d'URL F5      │ • Contenu : 4 Pôles Thématiques     │
│ • Suppression redirection disque │ • Paramètres : Recentrage Métier    │
│ • Routage transparent index.php  │ • Builder PC : Éditeur Visuel 100%  │
│                                  │ • Médias : Aperçu officiel par défaut│
└──────────────────────────────────┴─────────────────────────────────────┘
```

### Étape 23.A : Éradication Chirurgicale du Bug F5 dans `public/.htaccess`

1. **Suppression de la redirection relative défaillante :**  
   Dans [`public/.htaccess`](file:///c:/xampp/htdocs/ka-tech/public/.htaccess#L143-L146), la règle :
   ```apache
   RewriteCond %{REQUEST_FILENAME} -d
   RewriteCond %{REQUEST_FILENAME}/index.html -f
   RewriteRule ^(.+?)/$ $1 [R=301,L]
   ```
   provoque une redirection HTTP externe 301 où Apache préfixe `$1` avec le DocumentRoot complet du système de fichiers hôte (`/home/zzdwczcx/...`).
2. **Acheminement direct et propre :**  
   Supprimer cette redirection externe et servir directement `index.php` en interne (`[L]`) pour toutes les routes prérendues sans altérer l'URL du navigateur, garantissant un rafraîchissement F5 propre et sans fuite de chemin.

---

### Étape 23.B : Restructuration de « Contenu du site » en 4 Pôles Thématiques

Dans [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) :
Remplacer la barre plate des 16 onglets par une navigation à 2 niveaux claire et organisée :

- **Pôle 1 : 🏠 Vitrine d'Accueil**
  - Hero (Textes, bouton CTA, image personnalisée / par défaut).
  - Ventes flash (Compte à rebours, badges).
  - Catégories & Best-sellers (Titres & Puces d'usages).
  - Marques défilantes (Titre ET Éditeur visuel de marques unifié rapatrié ici !).
  - Pourquoi nous (Garanties & Engagements).
  - Teaser Builder & Avis clients.
- **Pôle 2 : 📄 Pages Dédiées**
  - Page « À propos » (En-tête, Histoire, Mission, Cartes de valeurs, CTA).
  - Page « Contact » (Surtitre, Titres, Intro narrative).
  - Page « Configurateur PC » (Titres d'en-tête & Éditeur visuel des étapes).
- **Pôle 3 : 🧭 Navigation & Global**
  - En-tête & Menu catégories.
  - Ticker supérieur défilant (Rapatrié ici avec son gestionnaire visuel).
  - Pied de page (Colonnes, Réseaux sociaux, Copyright).
- **Pôle 4 : 📱 Mobile & Éléments Flottants**
  - Bouton WhatsApp d'assistance flottant.
  - Barre de navigation mobile inférieure.

---

### Étape 23.C : Épuration Métier de « Paramètres »

Dans [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) :

1. **Suppression des doublons déplacés dans Contenu :**
   - Retirer `TickerMessagesVisualEditor`, `MarqueeBrandsVisualEditor`, `AboutValuesVisualEditor` et le `JsonEditorCard` du bas de page.
2. **Organisation limpide en cartes métier :**
   - **Boutique & Identité :** Nom du magasin, Logo (avec upload & médiathèque), Favicon (avec upload & médiathèque), Devise & Séparateur de milliers.
   - **Coordonnées :** Email, Téléphone, WhatsApp direct, Adresse physique, Horaires d'ouverture.
   - **Stock & Seuils :** Seuil stock faible, Seuil rupture de stock.
   - **Notifications :** Interrupteur des alertes email commerçant lors d'une nouvelle commande (`emailNotifications`).
   - **Mode Maintenance :** Interrupteur, Titre d'accroche, Message explicatif, Date estimée de retour, Bouton WhatsApp de contact.
   - **Charte Graphique :** Sélecteur de couleur primaire et palettes prédéfinies.
3. **Unicité de la Sauvegarde :**
   - Un seul bouton d'enregistrement global en bas de page (`saveSettings`), éliminant toute désynchronisation.

---

### Étape 23.D : Éditeur Visuel du Configurateur PC (`BuilderStepsVisualEditor`)

1. **Création d'un composant visuel dédié pour le configurateur :**
   - Remplacement du bloc JSON brut par une interface modulaire intuitive.
   - Affichage de chaque étape (Boîtier, Carte mère, Processeur, RAM, etc.) avec son icône.
   - Pour chaque étape, gestion visuelle de la liste des pièces :
     - Nom du composant.
     - Prix en DZD.
     - Bouton d'ajout d'une option et suppression en un clic.
2. **Câblage sur `useBuilderStepMutations` :**
   - Sauvegarde immédiate et validation stricte des données sans risque de syntax error JSON.

---

### Étape 23.E : Aperçus Intelligents des Visuels par Défaut dans `MediaPickerField`

Dans [`src/components/admin/MediaPickerField.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) :

1. Ajout de la propriété `defaultPreviewSrc?: string;` :
   - Si `value` est renseigné : affiche l'image personnalisée avec badge `Personnalisé`.
   - Si `value` est vide mais que `defaultPreviewSrc` est fourni : affiche l'image officielle par défaut du site avec un badge discret `Visuel par défaut du site`.
   - Si les deux sont vides : affiche le placeholder générique d'attente.
2. Déploiement des visuels par défaut dans le Hero (`hero-laptop.webp`), le teaser Builder (`builder-banner.webp`), le logo (`ka-tech-logo.webp`) et le favicon (`favicon.ico`).

---

### Étape 23.F : Recette, CI, Packaging & Traçabilité

1. Validation TypeScript : `bunx tsc --noEmit` (0 erreur).
2. Validation ESLint : `bun run lint` (0 erreur).
3. Validation i18n : `bun run verifier-i18n` (parité 100% FR/EN/AR).
4. Rebuild & Emballage : `bun run build; bun run paqueter:data` (sans suppression des zips antérieurs).
5. Journalisation : Mise à jour officielle de [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).
6. Commit git & synchronisation sur `main`.

---

## 3. Matrice de Recette & Critères d'Acceptation

| Test / Scénario                        | Résultat Attendu                                                                                  |
| :------------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Test F5 sur `/about` en production** | L'URL reste strictement `https://votre-domaine/about` sans aucun saut vers `/home/...`.           |
| **Navigation Admin Contenu**           | Les 16 sections sont groupées en 4 pôles clairs sans défilement horizontal infini.                |
| **Ticker & Marques dans Contenu**      | Le bandeau défilant et les marques partenaires sont modifiables directement dans Contenu du site. |
| **Paramètres épurés**                  | Plus de blocs orphelins en bas de page ; 1 seul bouton d'enregistrement global fonctionnel.       |
| **Configurateur PC visuel**            | Ajout et édition de composants PC à la souris avec prix en DZD sans taper de JSON.                |
| **Aperçu visuel par défaut**           | Même avec une BD réinitialisée, les cartes affichent le visuel officiel actif sur la vitrine.     |
| **Pipeline de Vérité**                 | `lint`, `tsc --noEmit` et `build` passent à 100% avec 0 erreur.                                   |
