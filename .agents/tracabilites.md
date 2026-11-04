# JOURNAL OFFICIEL DE TRAÇABILITÉ & DÉCISIONS D'ARCHITECTURE

**Projet Hôte :** KA Tech (ka-tech)  
**Racine Workspace :** `c:\xampp\htdocs\ka-tech`  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi

---

> [!NOTE]
> **CANEVAS DU JOURNAL OFFICIEL DE TRAÇABILITÉ :**  
> Ce registre est l'historique officiel absolu de toutes les décisions d'architecture et interventions techniques.
>
> - **Parité Stricte 1:1 :** Chaque Phase principale numérotée ci-dessous (`Phase 01`, `Phase 02`, ...) correspond **strictement et à 100% au Plan d'Implémentation portant le même numéro** dans `.agents/Implementations_Plans/`.
> - **Rattachement Obligatoire des Actions Sans Plan :** Toute passe corrective ou action intermédiaire doit être rattachée en sous-phase à la phase principale immédiatement antérieure.

---

## Registre des Phases d'Implémentation (Parité Stricte 1:1)

|   N° Phase   |    Date    | Intitulé de la Phase                                                                     | Plan Associé dans `.agents/Implementations_Plans/`                                                                                              |        Statut         |
| :----------: | :--------: | :--------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------: |
| **Phase 01** | 20/10/2026 | Activation du Prérendu Playwright via Jonction Locale NTFS & Build de Production Complet | 📄 [`01_activation_prerendu_playwright_jonction_locale.md`](Implementations_Plans/01_activation_prerendu_playwright_jonction_locale.md)         | 🟢 **Livré & Validé** |
| **Phase 02** | 20/10/2026 | Horodatage Dynamique du Package Zip de Déploiement & Sécurisation Git                    | 📄 [`02_horodatage_archive_deploiement_et_securisation_git.md`](Implementations_Plans/02_horodatage_archive_deploiement_et_securisation_git.md) | 🟢 **Livré & Validé** |

---

## Historique Détaillé des Décisions & Interventions

### Phase 01 : Activation du Prérendu Playwright via Jonction Locale NTFS & Build de Production Complet

- **Contexte & Enjeux :**  
  Lors du build de production (`bun run build`), le script de prérendu statique [scripts/prerendu.ts](file:///c:/xampp/htdocs/ka-tech/scripts/prerendu.ts) avait sauté la génération SEO en raison de l'absence du binaire exact `chromium_headless_shell-1234` attendu par `playwright@1.62.1`, alors que la machine disposait déjà des révisions `1208`, `1217` et `1223`.
- **Décisions d'ArchiSys3.0 :**  
  Arbitrage formel pour la **Solution 2 (Zéro-téléchargement)** : création d'une jonction NTFS locale liant la révision `1234` vers la révision `1223` existante, couplée au démarrage de l'API locale pour alimenter le prérendu et régénérer le paquet de production.
- **Actions Réalisées :**
  - **Étape 1 :** Création des jonctions de répertoire NTFS dans `%LOCALAPPDATA%\ms-playwright` :
    - `chromium_headless_shell-1234` $\leftrightarrow$ `chromium_headless_shell-1223`
    - `chromium-1234` $\leftrightarrow$ `chromium-1223`
  - **Étape 2 :** Lancement de l'API locale de développement PHP sur le port 8160 (`bun run dev:api`) assurant la disponibilité des routes sous `http://127.0.0.1:8160`.
  - **Étape 3 :** Exécution du build et du prérendu hydraté avec variable d'environnement `PRERENDU_API_URL=http://127.0.0.1:8160`.
  - **Étape 4 :** Surveillance de l'exécution : Playwright a démarré avec succès sans aucune erreur de binaire manquant et a traité les 27 routes du sitemap en observant 311 requêtes API réelles.
  - **Étape 5 :** Génération et scellement du livrable de production `katech-site.zip`.
- **Résultats de Recette :**
  - Jonction NTFS opérationnelle : `chrome-headless-shell.exe` reconnu et lancé sans erreur.
  - Prérendu validé : **10 pages maîtresses** (Accueil, About, Contact, Blog, Categories, Builder, Laptops, Desktops, Builds, Phones) générées avec du contenu HTML complet (ex: 3 156 caractères sur l'accueil).
  - Garde-fou d'intégrité SEO respecté : les 17 fiches sans données en base locale sont retombées gracieusement sur le repli SPA dynamique d'`index.php` sans polluer le livrable par des erreurs 404/Introuvable.
  - Bundle client : intègre le correctif regex d'email pour l'authentification `a@a.a`.
- **Livrables :**
  - Archive déployable : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip) (256 fichiers, 1,50 Mo).
  - Dossier statique de build : 📂 [`dist/`](file:///c:/xampp/htdocs/ka-tech/dist).

---

### Phase 02 : Horodatage Dynamique du Package Zip de Déploiement & Sécurisation Git

- **Contexte & Enjeux :**  
  ArchiSys3.0 a requis que le livrable compressé produit au build soit orodaté au format `katech-site-JJMMYYYY-HHMM.zip` pour permettre l'archivage historique des builds successifs.  
  L'audit R&D a identifié la nécessité impérative d'élargir `.gitignore` à `katech-site*.zip` afin d'éviter toute pollution du dépôt Git par ces archives volumineuses, tout en conservant une copie miroir `katech-site.zip` pour préserver 100% de la rétro-compatibilité avec les documentations.
- **Décisions d'ArchiSys3.0 :**  
  Validation de l'Option A (Double production : fichier horodaté spécifique + alias `katech-site.zip` synchrone) et sécurisation du `.gitignore`.
- **Actions Réalisées :**
  - **Étape 1 :** Mise à jour de [.gitignore](file:///c:/xampp/htdocs/ka-tech/.gitignore) : remplacement de `katech-site.zip` par la règle universelle `katech-site*.zip`.
  - **Étape 2 :** Adaptation de [scripts/paqueter.ts](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter.ts) :
    - Implémentation de la fonction `obtenirNomArchiveHorodatee()` générant la chaîne `katech-site-JJMMYYYY-HHMM.zip`.
    - Création du zip horodaté via Python 3 (garantie de préservation des fichiers cachés dont `.htaccess`).
    - Réplication synchrone immédiate vers `katech-site.zip` via `fs.copyFileSync()`.
    - Mise à jour des messages terminaux affichant les deux chemins de livrables.
  - **Étape 3 :** Exécution du banc de test de build complet : `bun run build`.
- **Résultats de Recette :**
  - Génération validée : `katech-site-20102026-1315.zip` (1 566 942 octets) et `katech-site.zip` (1 566 942 octets) créés et strictement identiques.
  - Règle Git vérifiée : `git status` confirme qu'aucun fichier zip n'est proposé dans les fichiers non suivis.
  - TypeScript `bunx tsc --noEmit` : 0 erreur.
- **Livrables :**
  - Archive horodatée : 📦 [katech-site-20102026-1315.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-20102026-1315.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

### Phase 03 : Sécurisation Auth, Éradication des Stubs HTTP (`updateProfile` & `setPassword`), Transparence SQL & Intégrité des Mutations

- **Contexte & Enjeux :**  
  ArchiSys3.0 a diagnostiqué la persistance du mot de passe dans l'attribut `value` du champ password sur `/auth` après déconnexion, ainsi qu'un warning DOM Chromium sur les attributs `autocomplete`.  
  Par ailleurs, les tests sur `/account` remontaient un échec récurrent lors de la sauvegarde du profil ("Erreur lors de la sauvegarde du profil"), et l'administration des utilisateurs sur `/admin/users` provoquait une erreur bloquante `[usersApi.setPassword] Non disponible en mode http avant la phase 4` causant un "demi-travail" (création partielle de l'utilisateur avec mot de passe inactif). Enfin, les erreurs SQL PDO étaient masquées derrière un générique 500 opaque.
- **Décisions d'ArchiSys3.0 :**  
  Validation de l'Option A et approbation de l'artéfact consolidé de la Phase 03 :
  1. Purge complète du mot de passe dans le state React et qualification sémantique des formulaires.
  2. Implémentation du endpoint `PATCH /auth/profile` pour les utilisateurs connectés.
  3. Câblage complet de `usersApi.setPassword` vers la route existante `PATCH /admin/users/:id/password` avec transmission de l'ID utilisateur direct.
  4. Levée du masquage des exceptions SQL PDO dans `Db.php` en mode développement/local.
- **Actions Réalisées :**
  - **Étape 1 :** Sécurisation de [`src/pages/Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx) : purge de `password` au succès, bascule de mode et démontage via cleanup `useEffect` ; ajout des attributs `autoComplete`, `id`, `name`.
  - **Étape 2 :** Création de la méthode `mettreAJourProfil` dans [`api/src/Controllers/ControleurAuth.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurAuth.php) et déclaration de `PATCH /auth/profile` protégée par `Garde::protegeConnecte` dans [`api/routes.php`](file:///c:/xampp/htdocs/ka-tech/api/routes.php).
  - **Étape 3 :** Câblage du profil client dans [`src/api/endpoints.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/endpoints.ts), [`src/api/resources/auth.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/resources/auth.ts) et [`src/data-provider/auth.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/auth.ts).
  - **Étape 4 :** Câblage de `setPassword` dans [`src/api/endpoints.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/endpoints.ts), [`src/api/resources/users.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/resources/users.ts), [`src/data-provider/users.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/users.ts) et transmission de l'ID dans [`src/pages/admin/Users.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Users.tsx).
  - **Étape 5 :** Transparence des erreurs SQL en mode non-production dans [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php).
  - **Étape 6 :** Contrôle qualité `bunx tsc --noEmit` (0 erreur) et `bun run build` (build réussi).
- **Résultats de Recette :**
  - Fuite mot de passe : éradiquée, champ vidé dès la déconnexion et au démontage.
  - Warning DOM : éliminé sur `/auth`.
  - Stubs HTTP : `auth.updateProfile` et `users.setPassword` sont 100% opérationnels en mode HTTP.
  - Intégrité admin : la création et la modification d'utilisateurs avec mot de passe s'exécutent de bout en bout sans interruption ni "demi-travail".
  - Build & packaging : nouveau livrable `katech-site-20102026-1404.zip` généré avec succès.
- **Livrables :**
  - Plan validé : 📄 [03_securisation_auth_et_endpoint_profil_utilisateur.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/03_securisation_auth_et_endpoint_profil_utilisateur.md)
  - Nouvelle archive horodatée : 📦 [katech-site-20102026-1404.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-20102026-1404.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## [Phase 04] — Assainissement Console, Harmonisation Politique Mot de Passe (10 car.), Validation Réactive, Récupération sans SMTP & Câblage des Notifications Métier

- **Date :** 20 octobre 2026
- **Responsables :** ArchiSys3.0 (Directeur & Décideur) | AImi (Tech Lead & Consultant R&D)
- **Constats & Problématiques :**
  1. Pollution console : warnings React Router v7 (`v7_startTransition`, `v7_relativeSplatPath`), Radix UI `DialogDescription` WCAG manquant, et violation DOM Chromium (champ mot de passe en dehors d'une balise `<form>` dans `Users.tsx`).
  2. Incohérence mot de passe : le backend PHP et les schémas centraux imposent 10 caractères minimum, mais l'interface et les traductions (FR/EN/AR) mentionnaient 6 caractères ou affichaient `••••••`, provoquant des erreurs 422 inattendues.
  3. Formulaires passifs : les données invalides étaient acceptées à la saisie sans avertissement réactif immédiat.
  4. Récupération d'accès trompeuse : le bouton de mot de passe oublié affichait un toast de succès d'e-mail envoyé alors qu'aucun serveur SMTP n'est en service.
  5. Notifications muettes : les événements métier (commandes, messages CRM, ruptures) n'émettaient aucune notification dans la table `notifications` ni dans la cloche du panneau d'administration.
- **Décisions d'ArchiSys3.0 :**
  Validation du Plan d'Implémentation Phase 04 :
  1. Assainissement console (flags v7 Router, wrapping `<form>` et `DialogDescription` WCAG).
  2. Harmonisation universelle sur 10 caractères minimum (Zod, vérifications, i18n FR/EN/AR).
  3. Validation réactive en direct et verrouillage du bouton de soumission si les critères ne sont pas remplis.
  4. Modale d'assistance directe pour les clients et création de l'outil CLI d'urgence `reinitialiser-pass.php` pour l'administrateur système.
  5. Câblage centralisé d'émission des notifications in-app via `NotificationService`.
- **Actions Réalisées :**
  - **Étape 1 (Console & DOM) :**
    - Ajout des future flags React Router v7 dans [`src/main.tsx`](file:///c:/xampp/htdocs/ka-tech/src/main.tsx) (`v7_startTransition: true`, `v7_relativeSplatPath: true`).
    - Enveloppement du formulaire dans une balise `<form onSubmit={...}>` avec attributs conformes (`autoComplete="new-password"`, `id`, `name`) et intégration de `<DialogDescription className="text-xs text-muted-foreground">` dans [`src/pages/admin/Users.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Users.tsx).
  - **Étape 2 (Politique 10 car.) :**
    - Mise à jour des dictionnaires de langue [`src/lib/i18n/admin/reglages/{fr,en,ar}.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/fr.ts) pour remplacer les mentions 6 caractères par « 10 caractères minimum » et le placeholder par `••••••••••`.
    - Alignement de la validation impérative et des messages d'erreur dans [`src/pages/admin/Users.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Users.tsx) sur 10 caractères minimum.
  - **Étape 3 (Validation Réactive) :**
    - Dans [`src/pages/Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx) : calculs réactifs mémoïsés (`isEmailValid`, `isPasswordValid`, `isNameValid`, `isFormValid`), feedback visuel en direct (compteur sous le champ mot de passe) et désactivation du bouton tant que le formulaire n'est pas conforme.
  - **Étape 4 (Récupération sans SMTP) :**
    - Remplacement du faux toast SMTP par une boîte de dialogue d'assistance contextuelle dans [`src/pages/Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx) avec lien direct vers le support (`/contact`).
    - Création du script CLI sécurisé [`api/tools/reinitialiser-pass.php`](file:///c:/xampp/htdocs/ka-tech/api/tools/reinitialiser-pass.php) avec hachage Argon2id/Bcrypt et journalisation d'audit.
    - Correction de la détection de session en mode CLI dans [`api/src/Journal.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Journal.php).
  - **Étape 5 (Notifications In-App) :**
    - Création du service centralisé [`api/src/Services/NotificationService.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Services/NotificationService.php).
    - Câblage dans [`api/src/Controllers/ControleurCommandes.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurCommandes.php) lors de la création d'une commande et des ruptures de stock.
    - Câblage dans [`api/src/Controllers/ControleurCrm.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurCrm.php) lors de la réception d'un message de contact.
  - **Étape 6 (Build & Validation) :**
    - `bunx tsc --noEmit` : 0 erreur de typage.
    - `bun run build` : prérendu validé, génération de l'archive horodatée.
- **Résultats de Recette :**
  - Console browser : disparition des warnings React Router v7, Radix DialogDescription et DOM password.
  - Saisie mot de passe : refus immédiat et indication visuelle en direct si < 10 caractères.
  - Formulaire Auth : impossible de soumettre des identifiants non conformes.
  - Récupération : procédure claire et script CLI testé avec succès.
  - Notifications : insertion automatique en base et affichage dans la cloche du back-office.
- **Livrables :**
  - Plan validé : 📄 [04_assainissement_ergonomie_notifications_et_recuperation.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/04_assainissement_ergonomie_notifications_et_recuperation.md)
  - Nouvelle archive horodatée : 📦 [katech-site-20102026-1438.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-20102026-1438.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## [Phase 05] — Cohérence UI/UX, Suivi Public des Commandes, Notifications Client par Statut, Dynamisation Monétaire & Invalidations Temps Réel

- **Date :** 20 octobre 2026
- **Responsables :** ArchiSys3.0 (Directeur & Décideur) | AImi (Tech Lead & Consultant R&D)
- **Constats & Problématiques :**
  1. Warnings résiduels en console : warning Radix UI `DialogContent` requérant une description explicite sur plusieurs modales du projet, et violation DOM Chromium sur `/admin/developpeur` (boutons et champs mot de passe orphelins hors formulaire).
  2. Rupture d'information client sur les commandes : lors des changements de statut d'une commande par l'administrateur (`en attente` -> `en traitement` -> `expédiée` -> `livrée`), le client n'était ni notifié par courriel ni tenu informé.
  3. Absence de suivi public de commande : aucune page de suivi public pour les clients sans compte ou souhaitant vérifier l'acheminement de leur colis avec leur identifiant de commande et téléphone.
  4. Consultation limitée sur `/account` : impossibilité pour un client connecté de visualiser le détail complet d'une commande passée (articles, adresse, statut, note éventuelle de l'équipe).
  5. Hardcoding monétaire : la devise `" DA"` était codée en dur dans plusieurs composants via `formatDZD`, ignorant les réglages dynamiques (`symbol`, `position`, `thousandSeparator`) définis dans l'administration.
  6. Déphasage du commutateur linguistique : `languageSelectorEnabled` dans les paramètres du site n'était pas respecté dans `ThemeLanguageToggles.tsx`.
- **Décisions d'ArchiSys3.0 :**
  Validation du Plan d'Implémentation Phase 05 :
  1. Éradication structurelle des warnings Radix `DialogContent` via `aria-describedby` optionnel dans `src/components/ui/dialog.tsx` et encapsulation de `/admin/developpeur` dans un `<form>`.
  2. Automatisation des courriels trilingues (FR/AR/EN) et événements Outbox lors de la mise à jour des statuts de commande.
  3. Création de l'endpoint public `GET /orders/track?id=...&phone=...` et de la page dédiée `/track` (`/suivi`) avec stepper visuel animé.
  4. Modale interactive détaillée pour chaque commande dans l'espace client `/account`.
  5. Refonte du formatage de prix : hook universel `useFormatPrice` réactif aux réglages du magasin et synchronisation continue du cache de devise.
  6. Conditionnement du commutateur de langue à `siteSettings.languageSelectorEnabled`.
  7. Invalidation proactive des caches lors de l'enregistrement dans `/admin/settings` et `/admin/content`.
- **Actions Réalisées :**
  - **Étape 1 (Assainissement Dialog & DOM) :**
    - Modification de [`src/components/ui/dialog.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ui/dialog.tsx) pour passer explicitement `aria-describedby={ariaDescribedBy}` à `DialogPrimitive.Content`, résolvant la totalité des avertissements WCAG de Radix UI.
    - Enveloppement des actions sensibles de [`src/pages/admin/Developpeur.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Developpeur.tsx) dans un conteneur `<form onSubmit={(e) => e.preventDefault()}>`.
  - **Étape 2 (Courriels de Statut & Outbox) :**
    - Création du modèle de courriel trilingue [`api/src/Modeles/StatutCommandeCourriel.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Modeles/StatutCommandeCourriel.php) (titres, messages d'état, récapitulatif des articles, lien direct vers le suivi).
    - Mise à jour de [`api/src/Controllers/ControleurCommandes.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurCommandes.php) dans `changerStatut()` : dépôt de l'événement Outbox `order.status_updated` et émission différée du courriel via `emettreEmailStatutCommande()`.
  - **Étape 3 (Suivi Public & Modale Client) :**
    - Création du point d'accès `GET /orders/track` dans [`api/src/Controllers/ControleurCommandes.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurCommandes.php) et déclaration dans [`api/routes.php`](file:///c:/xampp/htdocs/ka-tech/api/routes.php).
    - Câblage dans [`src/api/endpoints.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/endpoints.ts), [`src/api/resources/orders.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/resources/orders.ts) et [`src/data-provider/orders.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/orders.ts).
    - Création de la page fluide de suivi [`src/pages/TrackOrder.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/TrackOrder.tsx) avec stepper visuel 4 étapes, badge d'état, récapitulatif d'articles, adresses et lien direct depuis le pied de page [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx).
    - Enregistrement des routes `/track` et `/suivi` dans [`src/App.tsx`](file:///c:/xampp/htdocs/ka-tech/src/App.tsx).
    - Intégration de la modale de détail de commande dans [`src/pages/Account.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Account.tsx) avec ouverture au clic sur les cartes de commande.
  - **Étape 4 (Dynamisation Monétaire & Réglages) :**
    - Création de [`src/lib/format-price.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/format-price.ts) exposant `formatPriceRaw` et le hook réactif `useFormatPrice()`.
    - Synchronisation continue des paramètres de devise dans [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) via `useEffect` sur la ressource `site-settings`.
    - Aperçu en direct dans [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) reflétant instantanément le symbole, la position et les séparateurs choisis.
    - Masquage automatique du sélecteur de langue dans [`src/components/ThemeLanguageToggles.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ThemeLanguageToggles.tsx) si `languageSelectorEnabled` est désactivé.
  - **Étape 5 (Validation de Rigueur) :**
    - `bunx tsc --noEmit` : 0 erreur de typage.
    - `bun run lint` : 0 erreur.
    - `bun run format` : 100% des fichiers conformes Prettier.
    - `bun run build` : prérendu validé et packaging réussi.
- **Résultats de Recette :**
  - Console browser : 0 warning Radix Dialog et 0 violation DOM password.
  - Suivi des commandes : accessible publiquement via `/track?id=...&phone=...` et visualisable en détail par les clients authentifiés sur `/account`.
  - Notifications client : outbox `order.status_updated` et notification courriel déclenchées à chaque changement de statut.
  - Monnaie : dynamique et synchronisée en temps réel avec les réglages du back-office.
  - Build & packaging : nouveau livrable `katech-site-20102026-1517.zip` généré avec succès.
- **Livrables :**
  - Plan validé : 📄 [05_plan_coherence_ui_ux_suivi_commandes_et_parametres.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/05_plan_coherence_ui_ux_suivi_commandes_et_parametres.md)
  - Nouvelle archive horodatée : 📦 [katech-site-20102026-1517.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-20102026-1517.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## [Phase 06] — Découplage Settings / Contenus, Logo Personnalisable UI/UX, Vitrine Réactive aux Coordonnées & Restauration du Scroll

- **Date :** 20 octobre 2026
- **Responsables :** ArchiSys3.0 (Directeur & Décideur) | AImi (Tech Lead & Consultant R&D)
- **Constats & Problématiques :**
  1. Scroll bloqué en bas de page : lors de la navigation entre les pages (clic depuis le footer ou header), la position de défilement était conservée par React Router 6, laissant la nouvelle page affichée tout en bas.
  2. Logo figé et non administrable : le logo officiel était importé sous forme d'image statique sans possibilité pour l'administrateur de téléverser son propre logo depuis le back-office.
  3. Données de paramètres ignorées dans la vitrine : le nom de la boutique (`storeName`), les coordonnées physiques (`address`), le téléphone (`contactPhone`), l'email (`contactEmail`), et les horaires (`hours`) configurés dans l'administration n'étaient répercutés ni dans le Header, ni dans le Footer, ni dans la page À Propos, avec des textes rigides "KA Tech" en dur dans les traductions.
  4. Chevauchement ergonomique entre Réglages (`/admin/settings`) et Contenus du site (`/admin/content`).
- **Décisions d'ArchiSys3.0 :**
  Validation du Plan d'Implémentation Phase 06 :
  1. Restauration universelle du défilement au sommet de l'écran lors des navigations SPA (`ScrollToTop`).
  2. Dynamisation du logo dans `SiteSettings` avec sélecteur, téléversement de fichier image, prévisualisation en direct et bouton de rétablissement du logo d'origine.
  3. Câblage complet des coordonnées réelles et de l'identité du magasin dans le Footer, le Header, Contact et À Propos.
  4. Harmonisation des frontières : identité et exploitation dans Réglages, éditorial et blocs dans Contenus.
- **Actions Réalisées :**
  - **Étape 1 (Restauration Universelle du Scroll) :**
    - Création du composant [`src/components/ScrollToTop.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ScrollToTop.tsx) écoutant `pathname` et `hash` via `useLocation()` et appelant `window.scrollTo({ top: 0, left: 0, behavior: "instant" })`.
    - Montage de `<ScrollToTop />` à la racine de l'arbre applicatif dans [`src/App.tsx`](file:///c:/xampp/htdocs/ka-tech/src/App.tsx).
  - **Étape 2 (Logo Dynamique & Personnalisable) :**
    - Extension du schéma et type `SiteSettings` avec `logoUrl?: string` dans [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) et [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts).
    - Refonte complète de [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Logo.tsx) : consommation réactive de `useSiteSettings()`, affichage prioritaire du logo personnalisé avec repli automatique vers `ka-tech-logo.webp` en cas d'erreur de chargement (`onError`), et texte `alt` synchronisé sur `storeName`.
    - Intégration de la section Logo dans la carte Boutique de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : téléversement direct via `useMediaAssetMutations`, champ URL, prévisualisation live et bouton de réinitialisation.
  - **Étape 3 (Câblage Coordonnées & Identité Vitrine) :**
    - **Footer ([`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx)) :** Consommation de `useSiteSettings()`, intégration d'un bloc structuré de coordonnées (adresse avec `MapPin`, téléphone cliquable `tel:...`, lien direct WhatsApp, email cliquable `mailto:...`, horaires d'ouverture avec `Clock`), et copyright dynamique avec l'année en cours et `storeName`.
    - **Header ([`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx)) :** Synchronisation du logo et de son texte alternatif sur le nom de boutique configuré.
    - **Contact ([`src/pages/Contact.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Contact.tsx)) :** Injection du `storeName` dynamique dans le titre h1 et les métadonnées SEO Helmet, et ajout des liens réseaux sociaux issus de `siteContent.footer.socials` dans la colonne latérale.
    - **À Propos ([`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx)) :** Consommation de `useSiteSettings()` et remplacement dynamique de "KA Tech" par le `storeName` dans le titre, l'introduction, l'histoire et la mission.
  - **Étape 4 (Validation Qualité & Packaging) :**
    - `bun run format` : 100% des fichiers conformes Prettier.
    - `bunx tsc --noEmit` : 0 erreur de typage.
    - `bun run lint` : 0 erreur.
    - `bun run build` : prérendu validé et empaquetage réussi.
- **Résultats de Recette :**
  - Navigation : tout changement de page remonte instantanément la fenêtre au sommet (`top: 0`).
  - Logo magasin : personnalisable par simple téléversement dans l'admin, répercuté immédiatement sur tout le site avec repli sécurisé.
  - Coordonnées : fidèlement affichées dans le footer et sur la page de contact avec liens d'appel direct et WhatsApp.
  - Identité : "WaYmen AI Studio" (ou tout autre nom configuré) se propage sur l'ensemble de la vitrine sans aucun texte résiduel en dur.
  - Build & packaging : nouveau livrable `katech-site-20102026-1537.zip` généré avec succès.
- **Livrables :**
  - Plan validé : 📄 [06_plan_decouplage_settings_content_logo_dynamique_et_scroll_restoration.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/06_plan_decouplage_settings_content_logo_dynamique_et_scroll_restoration.md)
  - Nouvelle archive horodatée : 📦 [katech-site-20102026-1537.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-20102026-1537.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## [Phase 07] — Bootstrapping White-Label Authentique & Éradication du FOUC (0 ms)

- **Date :** 20 octobre 2026
- **Responsables :** ArchiSys3.0 (Directeur & Décideur) | AImi (Tech Lead & Consultant R&D)
- **Constats & Problématiques :**
  1. Clignotement de marque (FOUC) : au rafraîchissement d'une page ou lors d'une première visite, le nom par défaut "KA Tech" apparaissait brièvement à l'écran et dans l'onglet avant d'être remplacé 80 ms plus tard par "WaYmen AI Studio" suite à l'arrivée asynchrone de `GET /settings/site`.
  2. Cause racine : absence de données de réglages au Tick 0 ms dans le cache mémoire JS vierge au rechargement de page, provoquant un repli immédiat sur `DEFAULT_SITE_SETTINGS.storeName = "KA Tech"`.
  3. Exigence architecturale absolue d'ArchiSys3.0 : l'application doit devenir une **solution Marque Blanche (White-Label) 100% universelle**, initialisable et personnalisable pour n'importe quel client via son backstore/installateur. Il est formellement proscrit de coder en dur "WaYmen AI Studio" statiquement dans les sources.
  4. Titres et balises statiques résiduels : des titres de pages (`Index.tsx`, `Product.tsx`, `CategoryDetail.tsx`, `BlogArticle.tsx`, `index.html`) contenaient encore "KA Tech" en dur.
- **Décisions d'ArchiSys3.0 :**
  Validation du Plan d'Implémentation Phase 07 :
  1. Bootstrapping serveur synchrone dans `public/index.php` injectant `window.__SITE_SETTINGS_BOOTSTRAP__` depuis la base de données active et adaptant le `<title>` initial dans le flux HTML servi.
  2. Lecture et persistance synchrone locale au Tick 0 ms via `getInitialSiteSettings()` dans `site-settings.ts` avec alimentation immédiate du cache mémoire de `useResource`.
  3. Injection dynamique automatique de `{storeName}` dans l'ensemble des appels `t()` du moteur i18n (`src/lib/i18n.tsx`) et substitution globale sans flash.
  4. Remplacement de tous les titres de pages codés en dur par une déduction réactive du nom de magasin actif.
  5. Insertion d'un micro-script synchrone bloquant dans `<head>` de `index.html` pour caler le titre de l'onglet à 0 ms avant tout affichage graphique.
- **Actions Réalisées :**
  - **Étape 1 (Moteur i18n & Injection White-Label Universelle) :**
    - Implémentation de `getGlobalStoreName()` dans [`src/lib/i18n.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n.tsx) interrogeant immédiatement `window.__SITE_SETTINGS_BOOTSTRAP__` puis `localStorage.getItem("katech_site_settings_name")`.
    - Enrichissement de `t(k, vars)` pour injecter systématiquement `{ storeName }` dans les variables d'interpolation et substituer dynamiquement toute occurrence résiduelle de marque par l'enseigne configurée.
  - **Étape 2 (Socle Data-Provider Synchrone & Persistance Locale) :**
    - Création de `getInitialSiteSettings()` dans [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) fusionnant au Tick 0 ms les réglages du bootstrap serveur ou du cache `localStorage`.
    - Alimentation anticipée du cache mémoire de `useResource` via `writeCache(SITE_SETTINGS_RESOURCE, initial)` dès l'évaluation du module.
    - Synchronisation continue dans `useSiteSettings()` : mise à jour immédiate du `localStorage` dès réception de données fraîches ou lors des mutations (`updateSettingsHttp` et `updateSettingsMock`).
  - **Étape 3 (Dynamisation des Titres & Éradication du Titre FOUC) :**
    - Modification de [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx) : titre dynamique dérivé de `useSiteSettings().data.storeName`.
    - Modification de [`src/pages/Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx) : remplacement de `— KA Tech` par la marque dynamique dans `document.title` et dans le `<Helmet>` de `ProductView`.
    - Modification de [`src/pages/CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx) : titre et description Helmet dynamiques selon la marque configurée.
    - Modification de [`src/pages/BlogArticle.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/BlogArticle.tsx) : titre d'article dynamique adapté à l'enseigne active.
    - Ajout d'un micro-script synchrone dans `<head>` de [`index.html`](file:///c:/xampp/htdocs/ka-tech/index.html) garantissant le titre d'onglet exact à 0 ms.
  - **Étape 4 (Bootstrapping Serveur PHP) :**
    - Enrichissement de [`public/index.php`](file:///c:/xampp/htdocs/ka-tech/public/index.php) : détection de la base active (production ou dev SQLite), injection de `<script>window.__SITE_SETTINGS_BOOTSTRAP__ = ...</script>` dans le `<head>` et réécriture instantanée de la balise `<title>` dans le document HTML avant émission réseau.
    - Enrichissement additif de [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) pour résoudre automatiquement la base SQLite dans `katech-data/` en environnement local.
  - **Étape 5 (Vérification et Packaging de Rigueur) :**
    - `bun run format` : 100% des fichiers conformes Prettier.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build` : prérendu validé et packaging réussi.
- **Résultats de Recette :**
  - FOUC éradiqué : 0 ms de flash, l'enseigne "WaYmen AI Studio" (ou toute autre enseigne configurée) s'affiche immédiatement dès le premier paint et dans l'onglet du navigateur sans le moindre sursaut.
  - Architecture White-Label authentique : zéro nom en dur dans le code source, configuration dynamique complète pilotée depuis le backstore et la base de données.
  - Double couverture : fonctionne immédiatement côté serveur via `public/index.php` et côté client via le cache persistant synchrone.
  - Build & packaging : nouveau livrable `katech-site-20102026-1557.zip` prêt au déploiement.
- **Livrables :**
  - Plan validé : 📄 [07_plan_bootstrapping_white_label_et_eradication_fouc.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/07_plan_bootstrapping_white_label_et_eradication_fouc.md)
  - Nouvelle archive horodatée : 📦 [katech-site-20102026-1557.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-20102026-1557.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

