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

|   N° Phase   |    Date    | Intitulé de la Phase                                                                           | Plan Associé dans `.agents/Implementations_Plans/`                                                                                                                                    |        Statut         |
| :----------: | :--------: | :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------: |
| **Phase 01** | 20/10/2026 | Activation du Prérendu Playwright via Jonction Locale NTFS & Build de Production Complet       | 📄 [`01_activation_prerendu_playwright_jonction_locale.md`](Implementations_Plans/01_activation_prerendu_playwright_jonction_locale.md)                                               | 🟢 **Livré & Validé** |
| **Phase 02** | 20/10/2026 | Horodatage Dynamique du Package Zip de Déploiement & Sécurisation Git                          | 📄 [`02_horodatage_archive_deploiement_et_securisation_git.md`](Implementations_Plans/02_horodatage_archive_deploiement_et_securisation_git.md)                                       | 🟢 **Livré & Validé** |
| **Phase 03** | 20/10/2026 | Sécurisation Authentification & Endpoint Profil Utilisateur                                    | 📄 [`03_securisation_auth_et_endpoint_profil_utilisateur.md`](Implementations_Plans/03_securisation_auth_et_endpoint_profil_utilisateur.md)                                           | 🟢 **Livré & Validé** |
| **Phase 04** | 20/10/2026 | Assainissement Ergonomie Notifications & Récupération                                          | 📄 [`04_assainissement_ergonomie_notifications_et_recuperation.md`](Implementations_Plans/04_assainissement_ergonomie_notifications_et_recuperation.md)                               | 🟢 **Livré & Validé** |
| **Phase 05** | 20/10/2026 | Cohérence UI/UX Suivi des Commandes & Paramètres                                               | 📄 [`05_plan_coherence_ui_ux_suivi_commandes_et_parametres.md`](Implementations_Plans/05_plan_coherence_ui_ux_suivi_commandes_et_parametres.md)                                       | 🟢 **Livré & Validé** |
| **Phase 06** | 20/10/2026 | Découplage Settings/Content, Logo Dynamique & Scroll Restoration                               | 📄 [`06_plan_decouplage_settings_content_logo_dynamique_et_scroll_restoration.md`](Implementations_Plans/06_plan_decouplage_settings_content_logo_dynamique_et_scroll_restoration.md) | 🟢 **Livré & Validé** |
| **Phase 07** | 20/10/2026 | Bootstrapping White-Label Authentique & Éradication du FOUC (0 ms)                             | 📄 [`07_plan_bootstrapping_white_label_et_eradication_fouc.md`](Implementations_Plans/07_plan_bootstrapping_white_label_et_eradication_fouc.md)                                       | 🟢 **Livré & Validé** |
| **Phase 08** | 04/11/2026 | Fiabilisation Intégrale de la Persistance Serveur & Backstage (SQLite, Apache, API, Mutations) | 📄 [`08_plan_fiabilisation_persistance_serveur_sqlite_et_backstage.md`](Implementations_Plans/08_plan_fiabilisation_persistance_serveur_sqlite_et_backstage.md)                       | 🟢 **Livré & Validé** |
| **Phase 09** | 04/11/2026 | Résolution Définitive des Médias Téléversés (Uploads & Logo) et Accessibilité Radix UI         | 📄 [`09_plan_resolution_upload_medias_logo_et_accessibilite_radix.md`](Implementations_Plans/09_plan_resolution_upload_medias_logo_et_accessibilite_radix.md)                         | 🟢 **Livré & Validé** |

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

---

## [Phase 08] — Fiabilisation Intégrale de la Persistance Serveur & Backstage (SQLite, Apache, API, Mutations & Vitrine)

- **Date :** 04 novembre 2026
- **Responsables :** ArchiSys3.0 (Directeur & Décideur) | AImi (Tech Lead & Consultant R&D)
- **Constats & Problématiques :**
  1. Les personnalisations opérées depuis le backstage (/admin/settings et /admin/content) n'étaient pas persistées de manière effective sur le serveur Apache/XAMPP ni dans la base SQLite active, et certaines sections semblaient cassées ou non répercutées sur la vitrine.
  2. Diagnostic de cause racine (3 maillons identifiés) :
     - **Maillon 1 (Résolution DB SQLite Apache) :** Présence d'un fichier SQLite vide factice `api/var/katech.sqlite` (4 Ko, 0 table). En l'absence de fichier `api/.env`, `api/src/Db.php` vérifiait `is_file($varPath)` avant de chercher la base peuplée dans `katech-data/`. Apache se connectait donc à cette base vide, provoquant l'échec immédiat des requêtes `GET /settings/site`, `GET /content` et des `PATCH` avec `DATABASE_ERROR: no such table: settings / site_content`.
     - **Maillon 2 (Absence de fichier de configuration environnement local) :** Le dossier `api/` ne disposait pas de son fichier `.env` définissant explicitement le chemin absolu vers la base active du workspace.
     - **Maillon 3 (Écrasement/Fusion défectueuse des listes dans l'API) :** La fonction `fusionnerPayload()` dans `api/src/Controllers/ControleurContenu.php` fusionnait récursivement tous les tableaux comme des dictionnaires associatifs (`$valeurOrigine[$cle] = ...`), provoquant une corruption des tableaux séquentiels indexés numériquement (ex: `items: [...]`, `brands: [...]`) lors des mises à jour partiels.
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 08 :
  1. Assainissement physique du répertoire `api/var/` et éradication de la base factice vide.
  2. Création du fichier de configuration `api/.env` liant la base SQLite réelle et sécurisation dans `.gitignore`.
  3. Renforcement de la résolution dynamique SQLite dans `api/src/Db.php` pour prioriser en toutes circonstances les bases peuplées de `katech-data/` avant tout repli.
  4. Réparation de `fusionnerPayload()` dans `api/src/Controllers/ControleurContenu.php` pour opérer un remplacement intégral des listes séquentielles (`array_is_list()`).
  5. Validation par tests réels HTTP de bout en bout (authentification de session, mutations `PATCH /settings/site` et `PATCH /content`, contrôle direct sur disque SQLite et vitrine).
  6. Pipeline de conformité globale (`format`, `tsc`, `lint`, `build`) et génération de l'archive horodatée.
- **Actions Réalisées :**
  - **Étape 1 (Assainissement SQLite & api/.env) :**
    - Suppression physique de la base vide factice `api/var/katech.sqlite`.
    - Création de [`api/.env`](file:///c:/xampp/htdocs/ka-tech/api/.env) configurant `DB_DRIVER=sqlite`, `DB_SQLITE_PATH=C:/xampp/htdocs/ka-tech/katech-data/dev-a97b6b98a368.sqlite`, `APP_ENV=development`.
    - Mise à jour de [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) : priorisation systématique des bases existantes et peuplées dans `katech-data/dev-*.sqlite` avant tout repli sur `api/var/`.
    - Validation HTTP immédiate via Apache : `GET /api/v1/settings/site` et `GET /api/v1/content` répondent 200 OK avec l'ensemble des données peuplées (25 tables SQLite actives).
  - **Étape 2 (Correction de la Fusion des Listes dans l'API) :**
    - Modification de `fusionnerPayload()` dans [`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php) : détection des listes séquentielles via `array_is_list()` (avec polyfill pour compatibilité universelle) et remplacement complet au lieu d'une fusion numérique par index.
  - **Étape 3 (Banc d'Essai HTTP & Persistance Réelle SQLite de Bout en Bout) :**
    - Authentification en session d'administration (`POST /api/v1/auth/login`) sous `patron@boutique-test.dz`.
    - Exécution d'un `PATCH /api/v1/settings/site` via Apache modifiant `address` et `contactPhone`. Vérification physique directe dans la base SQLite `katech-data/dev-a97b6b98a368.sqlite` : mise à jour instantanée et intègre sur disque.
    - Exécution d'un `PATCH /api/v1/content` avec une liste d'annonces `ticker.items` modifiée. Vérification physique dans la table `site_content` de SQLite : remplacement propre de la liste sans duplication ni orphelins.
  - **Étape 4 (Revue de Réactivité Vitrine & Invalidation Cache) :**
    - Vérification du mécanisme d'invalidation dans [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts), [`src/data-provider/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-content.ts) et [`src/data-provider/use-resource.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/use-resource.ts) : `runMutation()` déclenche `invalidateResource()` qui recharge instantanément toutes les vues clientes abonnées (`useSiteSettings`, `useSiteContent`) et maintient le cache local `localStorage` synchrone au Tick 0 ms.
  - **Étape 5 (Validation Qualité & Packaging de Production) :**
    - `bun run format` : 100% des fichiers conformes Prettier.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build` : prérendu statique validé et empaquetage réussi.
- **Résultats de Recette :**
  - Persistance serveur 100% opérationnelle : toute modification enregistrée dans l'interface d'administration sous `/admin/settings` ou `/admin/content` est immédiatement persistée dans la base SQLite locale sous Apache.
  - Aucune régression sur les listes : les ajouts, retraits ou réordonnancements de bannières, ticker ou logos marques sont fidèlement enregistrés sans corruption d'index.
  - Propagation instantanée sur la vitrine : le rechargement réactif du frontend reflète fidèlement et sans délai les personnalisations du commerçant.
  - Sécurité et packaging : `api/.env` reste strictement exclu des archives déployables, paquet horodaté `katech-site-04112026-2039.zip` généré et prêt pour mise en production.
- **Livrables :**
  - Plan validé : 📄 [08_plan_fiabilisation_persistance_serveur_sqlite_et_backstage.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/08_plan_fiabilisation_persistance_serveur_sqlite_et_backstage.md)
  - Nouvelle archive horodatée : 📦 [katech-site-04112026-2039.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-04112026-2039.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## [Phase 09] — Résolution Définitive des Médias Téléversés (Uploads & Logo) et Accessibilité Radix UI

- **Date :** 04 novembre 2026
- **Responsables :** ArchiSys3.0 (Directeur & Décideur) | AImi (Tech Lead & Consultant R&D)
- **Constats & Problématiques :**
  1. Échec d'affichage du logo personnalisé : au téléversement depuis `/admin/settings`, un toast de succès apparaissait mais l'aperçu affichait une image brisée dans l'admin et la vitrine conservait le logo par défaut.
  2. Causes racines constatées sur le code réel :
     - **Destination erronée dans l'API :** `ControleurMedias.php` (lignes 174 et 308) écrivait par défaut dans `dirname(__DIR__, 3) . '/public_html/uploads'`. En local sous XAMPP, cela ciblait `ka-tech/public_html/uploads/` au lieu de `ka-tech/uploads/`, renvoyant une erreur HTTP 404 lors des requêtes émises par le navigateur.
     - **Absence de résolution d'URL :** `Logo.tsx` et `Settings.tsx` n'invoquaient pas `resoudreUrlMedia()`, provoquant des requêtes relatives `./uploads/...` vers des chemins inexistants (`/admin/uploads/...`).
     - **Repli automatique vitrine :** `Logo.tsx` réagissait au 404 via son gestionnaire `onError`, basculant en repli sur `defaultLogoSrc` (`ka-tech-logo.webp`).
     - **Persistance immédiate :** `Settings.tsx` n'auto-sauvegardait pas les réglages dès l'upload, attendant la validation manuelle en bas de page.
     - **Relais Vite dev :** le serveur de développement Vite ne servait pas `/uploads` hors de `public/`.
  3. Avertissement console Radix UI : `sheet.tsx:63 Warning: Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}` émis par `AdminLayout.tsx` (`AdminMobileNav`).
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 09 :
  1. Réparation du chemin d'écriture des uploads dans `ControleurMedias.php` et configuration explicite de `UPLOAD_DIR` dans `api/.env`.
  2. Création et migration des fichiers du dossier `uploads/` à la racine du projet, avec exclusion stricte dans `.gitignore`.
  3. Création du middleware Vite `servirUploadsDev()` pour servir instantanément les médias téléversés en mode dev.
  4. Câblage de `resoudreUrlMedia()` dans `Logo.tsx` et dans l'aperçu de `Settings.tsx`, avec auto-persistance immédiate du logo téléversé dans `siteSettings`.
  5. Ajout d'une `<SheetDescription className="sr-only">` accessible dans `AdminLayout.tsx`.
  6. Pipeline de qualification et packaging horodaté de rigueur.
- **Actions Réalisées :**
  - **Étape 1 (API PHP & Gestion du Dossier Uploads) :**
    - Modification de [`api/src/Controllers/ControleurMedias.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMedias.php) : remplacement de `dirname(__DIR__, 3) . '/public_html/uploads'` par `dirname(__DIR__, 3) . '/uploads'` aux lignes 174 et 308.
    - Ajout de `UPLOAD_DIR=C:/xampp/htdocs/ka-tech/uploads` et `UPLOAD_BASE_URL=uploads` dans [`api/.env`](file:///c:/xampp/htdocs/ka-tech/api/.env).
    - Création du dossier racine `uploads/` et déplacement de l'ensemble des médias existants depuis `public_html/uploads/`.
    - Ajout de `uploads/` dans [`.gitignore`](file:///c:/xampp/htdocs/ka-tech/.gitignore) pour interdire tout commit de médias d'exécution.
  - **Étape 2 (Middleware Vite Dev pour Uploads) :**
    - Intégration de `servirUploadsDev()` dans [`vite.config.ts`](file:///c:/xampp/htdocs/ka-tech/vite.config.ts) : distribution fluide des médias `/uploads/*` avec Content-Type image adapté (`jpeg`, `png`, `webp`, `svg`, `avif`, `gif`).
  - **Étape 3 (Câblage Frontend du Logo & Persistance Immédiate) :**
    - Modification de [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Logo.tsx) : importation et appel de `resoudreUrlMedia(s.logoUrl)` garantissant une URL correcte quelle que soit la profondeur de route.
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : aperçu direct avec `resoudreUrlMedia()`, auto-sauvegarde immédiate dans `siteSettings` via `await updateSettings({ ...form, logoUrl: asset.src })` dès la fin du téléversement, et réinitialisation instantanée sur le bouton de rétablissement du logo par défaut.
  - **Étape 4 (Éradication de l'Avertissement Radix UI Sheet) :**
    - Ajout de `SheetDescription` dans [`src/components/admin/AdminLayout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminLayout.tsx) au sein de `AdminMobileNav` (`className="sr-only"`), éradiquant totalement le warning de console.
  - **Étape 5 (Validation Qualité & Packaging de Production) :**
    - `bun run format` : 100% des fichiers conformes Prettier.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build` : prérendu validé et empaquetage réussi.
- **Résultats de Recette :**
  - Téléversement et affichage du logo : immédiatement visible dans l'aperçu de l'administration et propagé instantanément sur l'ensemble de la vitrine sans icône cassée ni repli forcé.
  - Sauvegarde transparente : le commerçant téléverse son logo et celui-ci est actif et persisté sans manipulation superflue.
  - Console propre : 0 avertissement Radix UI Sheet/Dialog.
  - Packaging de production : livrable horodaté `katech-site-04112026-2118.zip` opérationnel et prêt pour déploiement.
- **Livrables :**
  - Plan validé : 📄 [09_plan_resolution_upload_medias_logo_et_accessibilite_radix.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/09_plan_resolution_upload_medias_logo_et_accessibilite_radix.md)
  - Nouvelle archive horodatée : 📦 [katech-site-04112026-2118.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-04112026-2118.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## Phase 10 : Branding 360°, Thème Dynamique (Dark/Light/System) & Modularité Métier (White-Label)

- **Date :** 04/11/2026
- **Contexte & Constat Initial :**
  1. Impossibilité jusqu'alors de régler le thème d'affichage par défaut (sombre/clair/système) depuis le panneau d'administration. L'application forçait `dark` en dur dans `index.html` et `theme.tsx`.
  2. Nécessité d'universaliser la personnalisation visuelle White-Label de la plateforme pour tout client sans recompilation ni modification de code source (choix de couleur primaire dynamique, favicon personnalisé).
  3. Nécessité de modulariser les briques informatiques spécialisées : le configurateur de PC sur mesure (`Builder`) doit pouvoir être activé ou désactivé simplement depuis le backstage pour adapter le site à un commerce généraliste ou de services.
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 10 (consigné dans `10_plan_branding_360_theme_dynamique_et_modularite.md`) :
  1. Extension du schéma `SiteSettings` avec les 4 attributs clés : `defaultTheme`, `primaryColor`, `faviconUrl`, `builderEnabled`.
  2. Bootstrapping synchrone à 0 ms dans `public/index.php` et `index.html` (zéro FOUC, propagation instantanée du thème, de la couleur et du favicon avant même le montage React).
  3. Dynamisation de `ThemeProvider` et injection réactive des variables CSS (`--primary`, `--ring`, `--primary-glow`).
  4. Enrichissement du backstage (`/admin/settings`) avec une carte dédiée **Identité Visuelle & Thème (Branding 360°)** (sélecteur de thème, palette de couleurs prédéfinies + pipette hexadécimale, téléversement de favicon avec prévisualisation 32×32 et rétablissement du favicon officiel).
  5. Ajout d'un commutateur pour le configurateur PC (`builderEnabled`) et conditionnement visuel propre dans `Header`, `Index` et `Builder` (avec écran de repli gracieux).
  6. Maintien strict du dictionnaire i18n trilingue (FR, EN, AR) vérifié via `bun run verifier-i18n` et packaging de production.
- **Actions Réalisées :**
  - **Étape 1 (Extension du Modèle de Données `SiteSettings`) :**
    - Modification de [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) : ajout des champs typés `defaultTheme`, `primaryColor`, `faviconUrl`, `builderEnabled` et mise à jour de `seedSiteSettings()` et `emptySiteSettings()`.
    - Modification de [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) : mise à jour de `DEFAULT_SITE_SETTINGS`, création de la fonction réactive `appliquerBrandingDynamique()`, et synchronisation continue du style et du favicon.
    - Synchronisation des déclarations globales `Window.__SITE_SETTINGS_BOOTSTRAP__` dans `site-settings.ts` et [`src/lib/i18n.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n.tsx).
  - **Étape 2 (Bootstrapping Synchrone du Thème & Favicon à 0 ms) :**
    - Modification de [`public/index.php`](file:///c:/xampp/htdocs/ka-tech/public/index.php) : réécriture à la volée de la classe HTML (`light` vs `dark`), injection de `<style id="katech-primary-color">` et substitution du lien `<link rel="icon">` dès la réponse HTTP.
    - Modification de [`index.html`](file:///c:/xampp/htdocs/ka-tech/index.html) : exécution dans la micro-balise `<script>` du `<head>` de la détection combinée `window.__SITE_SETTINGS_BOOTSTRAP__` + `localStorage` garantissant zéro clignotement en mode Vite dev comme en production.
  - **Étape 3 (Dynamisation du `ThemeProvider`) :**
    - Modification de [`src/lib/theme.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/theme.tsx) : prise en compte de `getInitialSiteSettings().defaultTheme` comme repli par défaut lorsque l'utilisateur n'a pas sélectionné manuellement de préférence dans son navigateur.
  - **Étape 4 (Interface d'Administration Backstage) :**
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) :
      - Création de la carte **Identité Visuelle & Thème** avec sélecteur de mode d'affichage (`dark`, `light`, `system`).
      - Intégration du sélecteur de couleur primaire avec pipette native, champ hexadécimal et 6 nuances préréglées (Bleu Tech, Émeraude, Violet Royal, Rouge Sport, Orange Solaire, Anthracite).
      - Module de téléversement et gestion du Favicon du site avec prévisualisation en direct et bouton de rétablissement du favicon officiel par défaut.
      - Ajout de l'interrupteur d'activation / désactivation du configurateur PC sur mesure (`builderEnabled`).
  - **Étape 5 (Conditionnement Visuel des Briques Métier) :**
    - Modification de [`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx) : masque le bouton d'accès au configurateur PC si `builderEnabled === false`.
    - Modification de [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx) : masque la section vitrine `<BuilderTeaser />` si `builderEnabled === false`.
    - Modification de [`src/pages/Builder.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Builder.tsx) : affichage d'un écran gracieux avec bouton de retour à l'accueil si un utilisateur navigue directement sur `/builder` lorsque le module est désactivé.
  - **Étape 6 (i18n Trilingue, Validation Qualité & Packaging) :**
    - Ajout des 16 clés de traduction en parité parfaite dans [`src/lib/i18n/admin/reglages/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/fr.ts), [`en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/en.ts) et [`ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/ar.ts).
    - `bun run verifier-i18n` : 100% cohérent (parité fr/en/ar absolue).
    - `bun run format` : Prettier validé sur l'ensemble du projet.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build` : compilation Vite, prérendu et empaquetage d'archive réussis.
- **Résultats de Recette :**
  - Changement de thème : bascule dynamique et instantanée entre sombre, clair et automatique, persistée en base et appliquée dès 0 ms.
  - Couleur primaire personnalisable : application réactive immédiate sur les boutons, badges, anneaux de focus et ombres lumineuses sur l'ensemble de la vitrine.
  - Favicon dynamique : téléversement fonctionnel et application instantanée dans l'onglet du navigateur.
  - Configurateur désactivable : dissimulation propre du CTA de l'en-tête, du teaser de la page d'accueil et neutralisation gracieuse de la page dédiée.
- **Livrables :**
  - Plan d'implémentation miroir : 📄 [10_plan_branding_360_theme_dynamique_et_modularite.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/10_plan_branding_360_theme_dynamique_et_modularite.md)
  - Nouvelle archive horodatée : 📦 [katech-site-04112026-2205.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-04112026-2205.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## Phase 11 : Universalisation du Catalogue (Tous Produits Physiques & Services Immatériels)

- **Date :** 05/11/2026
- **Contexte & Constat Initial :**
  1. Le catalogue était structurellement restreint au matériel informatique et à la téléphonie (`Category = "laptops" | "desktops" | "builds" | "phones"` et spécifications figées sur CPU/RAM/Stockage/GPU).
  2. Impossibilité d'ajouter des catégories libres, des caractéristiques arbitraires (mode, cosmétique, outillage, formation, etc.) ou des prestations de services immatériels / dématérialisés.
  3. Les pages publiques (`CategoryDetail.tsx`, `CategoryCards.tsx`, `Search.tsx`, `Product.tsx`) contenaient des filtres et vérifications en dur interdisant l'affichage de toute catégorie créée dynamiquement en backstage.
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 11 (consigné dans `11_plan_universalisation_catalogue_produits_et_services.md`) :
  1. Élargissement universel du modèle typé de données (`ProductType = "physical" | "service"`, `Category` ouverte à toute chaîne avec auto-complétion des 4 historiques, `specs` ouverte aux paires clé/valeur libres).
  2. Enrichissement du formulaire d'édition produit backstage ([`ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx)) avec sélecteur de type d'article (produit physique vs prestation de service), avis informatif sur la livraison, et éditeur dynamique de caractéristiques personnalisées multilingues (FR, EN, AR).
  3. Désenclavement des pages vitrine publiques ([`CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx), [`CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx), [`Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx), [`Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx), [`ProductCard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ProductCard.tsx)) pour accueillir sans régression et avec mise en page adaptative toutes les catégories et types de produits.
  4. Maintien strict du dictionnaire i18n trilingue (FR, EN, AR) vérifié via `bun run verifier-i18n` et packaging de production.
- **Actions Réalisées :**
  - **Étape 1 (Modèle de Données Universel & i18n) :**
    - Modification de [`src/data/products.ts`](file:///c:/xampp/htdocs/ka-tech/src/data/products.ts) : définition de `ProductType = "physical" | "service"`, libération du type `Category = BuiltinCategory | (string & {})`, typage étendu des `specs`, et création de l'utilitaire `getCategoryMeta(slug, dynamicCategory)`.
    - Ajout des 8 clés de traduction en parité absolue dans [`src/lib/i18n/admin/catalogue/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/catalogue/fr.ts), [`en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/catalogue/en.ts) et [`ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/catalogue/ar.ts).
  - **Étape 2 (Formulaire Backstage `ProductForm.tsx`) :**
    - Suppression de la contrainte d'énumération stricte sur la catégorie.
    - Ajout du champ `productType` avec bascule Produit physique / Prestation de service et mention d'information contextuelle dans la section prix & stock.
    - Création du sous-composant `CustomSpecsEditor` permettant d'ajouter, éditer et supprimer dynamiquement des attributs personnalisés localisés par onglet linguistique.
  - **Étape 3 (Adaptation des Pages Vitrine Publiques) :**
    - Modification de [`src/pages/CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx) : suppression du tableau figé `VALID`, connexion à `useCategoryList()`, et extraction dynamique des libellés et descriptions via `getCategoryMeta()`.
    - Modification de [`src/components/CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx) : levée de la restriction des 4 catégories figées, affichage dynamique des catégories créées avec icônes et couvertures adaptatives.
    - Modification de [`src/pages/Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx) : facettes de catégories dynamisées depuis le fournisseur de données.
    - Modification de [`src/pages/Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx) :
      - Résolution sécurisée du fil d'Ariane et des métadonnées JSON-LD pour toute catégorie dynamique.
      - Affichage d'un badge "Prestation de service" si applicable.
      - Retrait automatique de l'onglet de livraison physique (`ship`) pour les services et adaptation des cartes de garanties & conseils.
      - Itération dynamique sur les `specs` combinant clés historiques traduites et attributs libres personnalisés.
    - Modification de [`src/components/ProductCard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ProductCard.tsx) : ajout d'un badge visuel "Service" sur les cartes de la vitrine.
  - **Étape 4 (Validation Qualité & Packaging de Production) :**
    - `bun run verifier-i18n` : 100% de conformité et zéro anomalie de parité.
    - `bun run format` : Prettier validé sur l'ensemble du projet.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build` : compilation Vite, prérendu et empaquetage d'archive réussis.
- **Résultats de Recette :**
  - Universalité complète : le magasin peut vendre du prêt-à-porter, de l'alimentation, des services de consultation, réparation ou formation avec attributs sur mesure (Taille, Couleur, Durée, Diplôme, etc.).
  - Rétrocompatibilité totale : les 12 produits informatiques de démonstration et leurs spécifications restent 100% fonctionnels et fidèles.
  - Vitrine réactive : chaque catégorie personnalisée dispose de son URL `/category/:slug` opérationnelle avec filtres et méta-données SEO.
- **Livrables :**
  - Plan d'implémentation miroir : 📄 [11_plan_universalisation_catalogue_produits_et_services.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/11_plan_universalisation_catalogue_produits_et_services.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1300.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1300.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## Phase 12 : Dé-spécialisation Éditoriale Complète & Assistant d'Initialisation (Setup Wizard)

- **Date :** 05/11/2026
- **Contexte & Constat Initial :**
  1. Il subsistait des reliquats de mentions informatiques statiques dans certaines sections de la vitrine (ex: kicker "Pourquoi KA Tech", mention d'ordinateurs dans le pied de page, lien direct vers le configurateur PC dans le footer même si le module est désactivé).
  2. Nécessité d'offrir une expérience de démarrage clé-en-main pour tout nouveau commerçant ou client grâce à un **Assistant de Configuration Guidé (Setup Wizard)** lors du premier lancement de l'administration ou déclenchable à tout moment.
  3. Nécessité de pouvoir purger en 1 clic les 12 produits démo tech existants afin de démarrer immédiatement sur un catalogue vierge.
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 12 (consigné dans `12_plan_editorial_universel_et_setup_wizard_onboarding.md`) :
  1. Dé-spécialisation et interpolation dynamique de `{storeName}` dans les composants de réassurance vitrine ([`WhyUs.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/WhyUs.tsx), [`Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx)).
  2. Masquage automatique du lien configurateur PC dans le footer si `builderEnabled === false`.
  3. Ajout de l'indicateur d'initialisation `onboardingCompleted` dans `SiteSettings` (conservé à `true` pour les boutiques existantes et `false` pour les nouvelles instances).
  4. Création du composant complet [`SetupWizard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SetupWizard.tsx) articulé en 4 étapes fluides (Identité & Marque, Coordonnées, Profil Métier en 5 presets, Gestion du Catalogue Démo).
  5. Intégration du Setup Wizard dans [`AdminShell.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminShell.tsx) avec ouverture automatique au premier lancement et écouteur d'événement global `"open-setup-wizard"`.
  6. Ajout d'une carte bannière dédiée dans [`Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) avec le bouton « Relancer l'assistant ».
  7. Validation intégrale du pipeline qualité, packaging horodaté et traçabilité.
- **Actions Réalisées :**
  - **Étape 1 (Dé-spécialisation des Textes & Slogans) :**
    - Modification de [`src/components/WhyUs.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/WhyUs.tsx) : interpolation automatique de `{storeName}` et de l'enseigne dans le kicker, les titres et descriptions des cartes de réassurance.
    - Modification de [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx) : conditionnement du lien configurateur PC à `builderEnabled !== false`.
  - **Étape 2 (Modèle d'Onboarding & Indicateur `onboardingCompleted`) :**
    - Modification de [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) : ajout de `onboardingCompleted?: boolean` dans `SiteSettings`, `seedSiteSettings()` et `emptySiteSettings()`.
    - Modification de [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) : mise à jour de `DEFAULT_SITE_SETTINGS`.
  - **Étape 3 (Composant Setup Wizard d'Onboarding) :**
    - Création de [`src/components/admin/SetupWizard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SetupWizard.tsx) : dialogue modal Radix accessible avec barre de progression en 4 étapes :
      - _Étape 1 :_ Nom de la boutique, slogan, logo, favicon, thème sombre/clair/système et palette de couleur d'accentuation en direct.
      - _Étape 2 :_ Email officiel, téléphone, WhatsApp, adresse et devise monétaire.
      - _Étape 3 :_ 5 Profils métier préréglés (High-Tech, Bazar/Général, Mode, Beauté, Services) avec adaptation automatique de la couleur, du slogan et du configurateur.
      - _Étape 4 :_ Récapitulatif et option de purge du catalogue démo.
    - Modification de [`src/components/admin/AdminShell.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminShell.tsx) : montage du Setup Wizard, ouverture conditionnelle au premier accès et écoute du signal `"open-setup-wizard"`.
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : insertion de la carte bannière d'accès direct au Setup Wizard.
  - **Étape 4 (Validation Qualité & Packaging de Production) :**
    - `bun run verifier-i18n` : 100% cohérent.
    - `bun run format` : 100% conforme Prettier.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build` : compilation Vite, prérendu et empaquetage d'archive réussis.
- **Résultats de Recette :**
  - Expérience d'installation guidée : un commerçant peut configurer l'ensemble de sa boutique, son identité et son catalogue en moins de 3 minutes.
  - Profils métier instantanés : bascule automatique des couleurs, slogans et activation/désactivation du configurateur PC.
  - Zéro résidu technique : les textes de la vitrine s'adaptent harmonieusement sans faire référence forcée à l'informatique.
  - Sauvegarde et persistance immédiates : application en direct des styles et persistance en base sans rechargement.
- **Livrables :**
  - Plan d'implémentation miroir : 📄 [12_plan_editorial_universel_et_setup_wizard_onboarding.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/12_plan_editorial_universel_et_setup_wizard_onboarding.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1315.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1315.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)


---

## Phase 13 : Unification du Setup Wizard (Installation & Onboarding), Résolution du Mode Maintenance & Contrôleurs Visuels Backstore

- **Date :** 05/11/2026
- **Contexte & Constat Initial :**
  1. Le Mode Maintenance activé en base restait inopérant pour les visiteurs publics dans `App.tsx` en raison de la persistance de l'appel au store mock `useAdminState()` au lieu du fournisseur officiel `useSiteSettings()`.
  2. Les zones d'édition dans `/admin/settings` (messages du bandeau défilant, marques du carrousel, valeurs de la page À propos) s'éditaient sous forme de JSON brut dans des `<textarea>`, avec un risque permanent de crash de syntaxe pour un commerçant non-technicien.
  3. L'Assistant de Configuration (Setup Wizard) n'était pas relié de façon fluide dès la fin de l'installation serveur (`api/install.php`) et manquait d'un raccourci d'accès direct et permanent dans le menu latéral gauche du backstage.
  4. Le sélecteur de langue était masqué par défaut (`languageSelectorEnabled: false`), privant les nouveaux visiteurs du toggle trilingue.
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 13 (consigné dans `13_plan_unification_wizard_maintenance_et_editeurs_visuels.md`) :
  1. Résolution définitive de `src/App.tsx` : substitution totale des deux derniers appels résiduels à `useAdminState()` par `useSiteSettings()`. Le Mode Maintenance s'applique désormais instantanément (0 ms) à tout visiteur public non-admin avec écran de repli gracieux et personnalisé.
  2. Remplacement des zones pure JSON de `/admin/settings` par des contrôleurs visuels interactifs et modulaires :
     - `MarqueeBrandsVisualEditor` : gestionnaire de marques en pastilles visuelles (chips) avec ajout rapide et suppression en 1 clic.
     - `TickerMessagesVisualEditor` : gestionnaire d'annonces défilantes avec prévisualisation et édition directe sans syntaxe JSON.
     - `AboutValuesVisualEditor` : éditeur de cartes d'engagements avec sélecteur d'icônes, titre et description.
     - Conservation d'un bouton de bascule « Vue Visuelle / Mode JSON brut » pour les développeurs.
  3. Unification du Wizard avec l'installation :
     - Ajout des boutons de redirection directe vers `/admin` dans les écrans de fin d'installation et de statut d'installation serveur (`api/src/Installation/Assistant.php`).
     - Ajout d'un bouton d'accès direct et permanent au Setup Wizard au bas de la barre latérale du Backstore (`AdminSidebar` dans `AdminLayout.tsx`).
  4. Activation par défaut du sélecteur trilingue (`languageSelectorEnabled: true`).
- **Actions Réalisées :**
  - **Étape 1 (Garde de Maintenance & Résolution App.tsx) :**
    - Modification de [`src/App.tsx`](file:///c:/xampp/htdocs/ka-tech/src/App.tsx) : bascule sur `useSiteSettings()`. L'écran `MaintenanceScreen` bloque désormais fidèlement l'accès public lorsque `maintenance === true`, tout en préservant les accès admin et auth.
    - Modification de [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) et [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) : activation par défaut de `languageSelectorEnabled: true`.
  - **Étape 2 (Composants Contrôleurs Visuels Backstage) :**
    - Création de [`src/components/admin/SettingsVisualEditors.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SettingsVisualEditors.tsx) : implémentation de `MarqueeBrandsVisualEditor`, `TickerMessagesVisualEditor` et `AboutValuesVisualEditor` avec double mode visuel/JSON.
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : intégration des trois nouveaux contrôleurs visuels en remplacement des éditeurs JSON bruts.
  - **Étape 3 (Passerelle Installateur & Raccourci Sidebar) :**
    - Modification de [`src/components/admin/AdminLayout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminLayout.tsx) : insertion d'un bouton d'action permanent au bas de la navigation latérale déclenchant l'ouverture immédiate du Setup Wizard via signal custom event.
    - Modification de [`api/src/Installation/Assistant.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Installation/Assistant.php) : ajout de boutons de transition directe vers `/admin` à l'issue de l'installation et de la suppression du script d'installation.
  - **Étape 4 (Validation Qualité & Packaging de Production) :**
    - `bun run verifier-i18n` : 100% cohérent.
    - `bun run format` : 100% conforme Prettier.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build` : compilation Vite, prérendu et packaging réussis.
- **Résultats de Recette :**
  - Mode Maintenance : 100 % opérationnel, activable depuis l'admin et appliqué immédiatement pour les visiteurs.
  - Éradication du JSON imposé : le marchand peut configurer ses marques et ses textes sans aucun risque de syntaxe invalide.
  - Expérience d'onboarding complète : liaison fluide entre l'installation serveur et la configuration graphique et sectorielle en backstore.
- **Livrables :**
  - Plan d'implémentation miroir : 📄 [13_plan_unification_wizard_maintenance_et_editeurs_visuels.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/13_plan_unification_wizard_maintenance_et_editeurs_visuels.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1353.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1353.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)


---

## Phase 14 : Page de Maintenance Enrichie (VIP / Teasing), Déblocage de la Redirection Admin & Déclencheur Universel du Wizard

- **Date :** 05/11/2026
- **Contexte & Constat Initial :**
  1. Le clic sur « Espace administrateur » depuis l'écran de maintenance provoquait une boucle de redirection infinie : le lien pointait vers `/auth`, qui redirigeait ensuite par défaut vers `/account` (route publique interceptée par la maintenance).
  2. La page de maintenance manquait de richesse éditoriale et de fonctionnalités commerciales (titre custom, date de réouverture estimée, contact WhatsApp direct pour ne perdre aucun client).
  3. Le Setup Wizard n'était pas invocable directement par une URL explicite (nécessité de supporter `/admin?wizard=1` ou `/admin/wizard`), et le flag `onboardingCompleted` nécessitait d'être initialisé formellement à `false` sur les installations vierges.
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 14 (consigné dans `14_plan_page_maintenance_enrichie_et_wizard_universel.md`) :
  1. Éradication de la boucle de redirection :
     - Pointage direct de `MaintenanceGate.tsx` vers `/admin` avec état `state: { from: { pathname: "/admin" } }`.
     - Mise à jour d'`Auth.tsx` : tout utilisateur possédant un rôle d'administration (`owner`, `admin`, `editor`) est automatiquement redirigé vers `/admin` par défaut et non plus vers `/account`.
  2. Enrichissement VIP de la page de maintenance :
     - Extension du schéma `SiteSettings` avec `maintenanceTitle`, `maintenanceEstimatedReturn`, `maintenanceShowWhatsApp`.
     - Enrichissement du formulaire d'édition de la carte Maintenance dans `src/pages/admin/Settings.tsx` avec les nouveaux contrôleurs visuels.
     - Refonte esthétique de `src/components/MaintenanceGate.tsx` avec halo d'arrière-plan, badge d'estimation de réouverture, bouton vert direct WhatsApp et coordonnées claires.
  3. Déclencheur d'URL universel du Wizard :
     - Prise en charge dans `AdminShell.tsx` des paramètres d'URL `?wizard=1` et `?setup=1`.
     - Ajout de la route dédiée `/admin/wizard` redirigeant immédiatement vers `/admin/settings?wizard=1`.
     - Déploiement du script d'urgence autonome [`api/recup.php`](file:///c:/xampp/htdocs/ka-tech/api/recup.php) pour réinitialisation immédiate du mot de passe admin via navigateur avec auto-suppression.
     - Initialisation de `onboardingCompleted: false` dans `api/tools/donnees-front.json` pour les nouvelles boutiques.
- **Actions Réalisées :**
  - **Étape 1 (Déblocage de l'Accès Admin) :**
    - Modification de [`src/components/MaintenanceGate.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/MaintenanceGate.tsx) : lien pointant vers `/admin`.
    - Modification de [`src/pages/Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx) : redirection conditionnelle basée sur les privilèges du compte vers `/admin`.
  - **Étape 2 (Vitrine de Maintenance Personnalisée) :**
    - Modification de [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) et [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) : intégration des attributs de maintenance enrichis.
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : ajout des contrôles d'accroche, de date estimée et du commutateur WhatsApp.
    - Refonte complète de [`src/components/MaintenanceGate.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/MaintenanceGate.tsx).
  - **Étape 3 (Déclencheur URL & Script Récupération) :**
    - Création de [`api/recup.php`](file:///c:/xampp/htdocs/ka-tech/api/recup.php) : interface autonome de réinitialisation sécurisée avec hachage Argon2/Bcrypt et bouton d'auto-suppression.
    - Modification de [`src/components/admin/AdminShell.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminShell.tsx) et [`src/App.tsx`](file:///c:/xampp/htdocs/ka-tech/src/App.tsx) : écouteur query string et route `/admin/wizard`.
    - Mise à jour de [`api/tools/donnees-front.json`](file:///c:/xampp/htdocs/ka-tech/api/tools/donnees-front.json) (`onboardingCompleted: false`).
  - **Étape 4 (Validation Qualité & Packaging) :**
    - `bun run verifier-i18n` : 100% cohérent.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build` : prérendu et empaquetage d'archive réussis.
- **Résultats de Recette :**
  - Boucle de redirection rompue : un clic sur « Espace administrateur » depuis la maintenance amène directement sur `/admin` en toute transparence.
  - Page de maintenance attrayante et orientée conversion (bouton WhatsApp opérationnel).
  - Wizard accessible par URL à tout instant (`/admin/wizard` ou `?wizard=1`).
- **Livrables :**
  - Plan d'implémentation miroir : 📄 [14_plan_page_maintenance_enrichie_et_wizard_universel.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/14_plan_page_maintenance_enrichie_et_wizard_universel.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1424.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1424.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)
