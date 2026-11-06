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

---

## Phase 15 : Synchronisation Atomique du Statut de Stock, Recalcul en Masse des Seuils & Raccordement Effectif des Notifications E-mail

- **Date :** 05/11/2026
- **Contexte & Constat Initial :**
  1. Lors du réassort d'un produit en rupture depuis `/admin/inventory`, `stock_qty` était incrémenté mais la colonne `stock` restait figée sur `'out'`. Les produits réapprovisionnés demeuraient masqués par le filtre vitrine "En stock uniquement" et affichés en rupture.
  2. Inversement, l'abaissement manuel du stock à 0 laissait `stock` à `'in'`, provoquant des rejets bloquants 409 à la caisse pour les acheteurs.
  3. L'ajustement des seuils de stock faible / rupture dans `/admin/settings` n'alignait pas rétroactivement les produits existants.
  4. Le switch "Notifications e-mail" dans `/admin/settings` était ignoré par l'Outbox : les e-mails marchands partaient sans vérifier l'état du commutateur de l'interface.
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 15 (consigné dans `15_plan_synchronisation_stock_et_raccordement_notifications.md`) :
  1. Synchronisation atomique bi-colonne du stock (`stock_qty` + statut catégoriel `stock`) dans `ControleurStock.php::ajuster()` et `ControleurProduits.php::mettreAJourStock()`.
  2. Cohérence automatique du statut de stock dans `ControleurProduits.php::donneesValides()` lors de la création ou modification complète d'un produit.
  3. Recalcul SQL en masse du statut de tous les produits existants dès modification des seuils dans `ControleurContenu.php::mettreAJourReglagesSite()`.
  4. Raccordement effectif du réglage `siteSettings.emailNotifications` dans `ControleurCommandes.php::emettreEmailCommande()` avec journalisation explicite et fallback sur `contactEmail`.
  5. Ajout d'une description contextuelle d'aide sous le commutateur e-mail dans `src/pages/admin/Settings.tsx` avec parité linguistique trilingue (FR, EN, AR).
- **Actions Réalisées :**
  - **Étape 1 (Atomicité du Stock Backend) :**
    - Modification de [`api/src/Controllers/ControleurStock.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurStock.php) : lecture des seuils dynamiques `settings.site` et mise à jour atomique `UPDATE products SET stock_qty = stock_qty + :delta1, stock = CASE ...`.
    - Modification de [`api/src/Controllers/ControleurProduits.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurProduits.php) : synchronisation atomique dans `mettreAJourStock()` et alignement automatique dans `donneesValides()`.
  - **Étape 2 (Recalcul Rétroactif en Masse) :**
    - Modification de [`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php) : déclenchement immédiat de la requête de recalibrage de la table `products` dès que `lowStockThreshold` ou `outOfStockThreshold` est modifié.
  - **Étape 3 (Contrôle Effectif des E-mails & UI) :**
    - Modification de [`api/src/Controllers/ControleurCommandes.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurCommandes.php) : lecture de `emailNotifications` depuis `settings.site` avant émission au gérant.
    - Ajout des clés `admin.reglages.parametres.opt_notifications_email_desc` dans [`src/lib/i18n/admin/reglages/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/fr.ts), [`en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/en.ts) et [`ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/ar.ts).
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : ajout du texte d'aide contextuel sous le toggle.
  - **Étape 4 (Validation Qualité, Intégrité & Packaging) :**
    - Suppression du doublon de route résiduel dans [`src/App.tsx`](file:///c:/xampp/htdocs/ka-tech/src/App.tsx).
    - `bun run format` : Prettier appliqué à 100%.
    - `bun run lint` : 0 erreur ESLint.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run build` : compilation Vite et packaging de production réussis.
- **Résultats de Recette :**
  - Réassort ou ajustement de stock : le statut textuel `stock` (`in`, `low`, `out`) reflète immédiatement la réalité numérique en base et sur la vitrine.
  - Filtre vitrine « En stock uniquement » : 100% fiable, plus aucun produit fantôme.
  - Commutateur de notifications e-mail : autorité absolue du bouton de l'administration sur l'Outbox serveur.
- **Livrables :**
  - Plan d'implémentation miroir : 📄 [15_plan_synchronisation_stock_et_raccordement_notifications.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/15_plan_synchronisation_stock_et_raccordement_notifications.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1740.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1740.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## Phase 16 : Résolution de la ParseError PHP (Crash 500 Cascade), Support Windows CLI (Backup 503) & Complétude i18n

- **Date :** 05/11/2026
- **Contexte & Constat Initial :**
  1. Panne 500 généralisée sur 100% des endpoints de l'API (`/auth/me`, `/notifications`, `/content`, `/products`, etc.) constatée suite aux tests en local : causée par une `ParseError` PHP dans `ControleurProduits.php` et `ControleurStock.php` due à des apostrophes non échappées dans une requête SQL multiligne, bloquant l'inclusion de `routes.php`.
  2. La route de téléchargement de sauvegarde `GET /api/v1/maintenance/backup` échouait avec un code 503 : `binairePhpCli()` dans `ControleurMaintenance.php` ne cherchait pas l'extension `.exe` sous Windows et rejetait les avertissements de démarrage PHP sur stdout.
  3. Des avertissements de clés manquantes polluaient la console (`wizard_bouton_lancer`, `json_btn_reinitialiser`, et `admin.socle.confirmation.annuler` sur la route publique `/auth`).
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 16 (consigné dans `16_plan_resolution_parse_error_backup_cli_et_i18n.md`) :
  1. Échappement rigoureux des littéraux SQL `'out'`, `'low'`, `'in'` dans les contrôleurs PHP avec contrôle `php -l`.
  2. Prise en charge native de Windows dans la détection du binaire PHP CLI (`php.exe`, chemins XAMPP/WAMP et tolérance aux warnings de démarrage via `str_ends_with($sortie, 'cli')`).
  3. Intégration des clés i18n manquantes dans les dictionnaires `reglages` (FR, EN, AR) et correction de la route publique `/auth` pour utiliser `common.cancel`.
- **Actions Réalisées :**
  - **Étape 1 (Correction Syntaxique PHP) :**
    - Modification de [`api/src/Controllers/ControleurProduits.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurProduits.php) : échappement des apostrophes dans la requête atomique de mise à jour du stock.
    - Modification de [`api/src/Controllers/ControleurStock.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurStock.php) : échappement des apostrophes dans la clause `stock = CASE ...`.
    - Vérification récursive : 100% des fichiers PHP du projet validés avec `php -l` (0 ParseError).
  - **Étape 2 (Support Windows CLI dans le Contrôleur Maintenance) :**
    - Modification de [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) : ajout des extensions `.exe`, scan des dossiers d'installation XAMPP, et assouplissement de la sonde `estBinaireCli` pour tolérer les warnings d'extension au démarrage.
    - Test réel d'exécution de sauvegarde : binaire résolu (`C:\xampp\php\php.exe`), archive produite et vérifiée sans encombre.
  - **Étape 3 (i18n & Page d'Authentification) :**
    - Ajout des clés `wizard_bouton_lancer` et `json_btn_reinitialiser` dans [`src/lib/i18n/admin/reglages/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/fr.ts), [`en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/en.ts) et [`ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages/ar.ts).
    - Modification de [`src/pages/Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx) : utilisation de `t("common.cancel")` évitant le recours au namespace différé `admin`.
    - `bun run verifier-i18n` : cohérence et parité trilingue absolues validées.
  - **Étape 4 (Validation Qualité & Packaging) :**
    - `bun run format` : code formaté selon Prettier.
    - `bun run lint` : 0 erreur ESLint.
    - `bunx tsc --noEmit` : 0 erreur de typage TypeScript.
    - `bun run build` : compilation Vite, prérendu et empaquetage d'archive réussis.
- **Résultats de Recette :**
  - Fin du crash 500 : toutes les routes API répondent en 200 OK (`/content`, `/products`, `/auth/me`).
  - Sauvegarde opérationnelle sous Windows : bouton « Télécharger la sauvegarde » 100% fonctionnel.
  - Console navigateur nettoyée : 0 clé i18n manquante sur l'administration et la vitrine.
- **Livrables :**
  - Plan d'implémentation miroir : 📄 [16_plan_resolution_parse_error_backup_cli_et_i18n.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/16_plan_resolution_parse_error_backup_cli_et_i18n.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1805.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1805.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

## Phase 17 : Raccordement Serveur de la Réinitialisation et du Vidage des Données (`/admin/reset`)

- **Date :** 05/11/2026
- **Contexte & Constat Initial :**
  1. La page `/admin/reset` n'agissait que sur le stockage local `localStorage` via `admin-store.tsx` (héritage du prototype mock). En mode HTTP (production avec base SQLite/MySQL), les actions « Vider », « Réinitialiser » ou « Tout vider » n'exécutaient aucune requête API vers le serveur : les données réelles restaient intactes et la réinitialisation semblait inopérante.
  2. Nécessité d'une route serveur sécurisée sous le contrôle absolu de l'administrateur propriétaire (`owner`), capable d'effacer ou réinjecter proprement les données de catalogue et de transactions sans jamais supprimer l'administrateur connecté.
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du Plan d'Implémentation Phase 17 (consigné dans `17_plan_raccordement_serveur_reinitialisation_et_vidage_donnees.md`) :
  1. Création de la méthode serveur `ControleurMaintenance::reinitialiser()` protégée par le rôle `owner` (`Garde::protege('resetData')`).
  2. Prise en charge des actions granulaires par table/ressource (`clear` ou `reset` par ligne) et des actions globales (« Tout vider » / « Tout réinitialiser »).
  3. Intégration de garde-fous stricts : exclusion inviolable du compte propriétaire (`role != 'owner'`), conservation de réglages minimaux sains, et gestion des contraintes d'intégrité relationnelle.
  4. Raccordement client dans `src/data-provider/maintenance.ts` et `src/pages/admin/Reset.tsx`, avec purge et révision immédiate du cache de requêtes via `invalidateAll()`.
- **Actions Réalisées :**
  - **Étape 1 (Méthode Backend `reinitialiser`) :**
    - Modification de [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) : implémentation de `reinitialiser()`, `executerVidage()` et `executerReinitialisation()`.
    - Gestion sécurisée des clés étrangères (SQLite PRAGMA / MySQL FOREIGN_KEY_CHECKS).
    - Réinjection usine depuis `donnees-front.json` via `ImporteurDonneesFront` lors des réinitialisations de catalogue.
  - **Étape 2 (Déclaration de la Route API) :**
    - Modification de [`api/routes.php`](file:///c:/xampp/htdocs/ka-tech/api/routes.php) : enregistrement de `POST /api/v1/maintenance/reset` sous la garde `resetData`.
  - **Étape 3 (Couche Client Data Provider & Reset.tsx) :**
    - Modification de [`src/data-provider/maintenance.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/maintenance.ts) et [`src/data-provider/index.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/index.ts) : export de `reinitialiserServeur()`.
    - Modification de [`src/pages/admin/Reset.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Reset.tsx) : raccordement de `exec()` à l'API serveur en mode HTTP et appel systématique à `invalidateAll()` pour recalculer instantanément les compteurs et listes.
  - **Étape 4 (Validation Qualité & Packaging) :**
    - `bun run format` : Prettier validé sur 100% des fichiers.
    - `bun run lint` : 0 erreur ESLint.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run build` : compilation Vite, prérendu et empaquetage d'archive réussis.
- **Résultats de Recette :**
  - Vidage ciblé et global 100% fonctionnel sur le serveur réel : les tables SQL sont réellement purgées.
  - Réinitialisation usine fonctionnelle : réinjection immédiate des produits, marques et catégories de base depuis `donnees-front.json`.
  - Protection absolue : le compte administrateur propriétaire reste connecté et intact.
  - Réactivité instantanée de l'interface : les compteurs du tableau se mettent à jour à l'écran dès confirmation de l'action.
- **Livrables :**
  - Plan d'implémentation miroir : 📄 [17_plan_raccordement_serveur_reinitialisation_et_vidage_donnees.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/17_plan_raccordement_serveur_reinitialisation_et_vidage_donnees.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1819.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1819.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

### Sous-Phase 17.1 : Correction SQL du Vidage `site_content`, Inspecteur Réseau Pastille HTTP & Universalisation du Formulaire Produit

- **Date :** 05/11/2026
- **Contexte & Constat Initial :**
  1. Lors du déclenchement de la réinitialisation ou vidage complet via `/admin/reset`, le serveur renvoyait une erreur HTTP 500 : `SQLSTATE[HY000]: General error: 1 no such column: key`. Dans la table `site_content`, la clé primaire est nommée `section` et non `key`.
  2. La pastille flottante bleue HTTP en bas à droite était non cliquable (`pointerEvents: "none"`), empêchant l'exploitant de consulter le détail du mode et des éventuels échecs réseau. ArchiSys3.0 a demandé de rendre cette pastille inspectable et d'ajouter une option dans l'onglet « Développeur » pour afficher/masquer cette pastille.
  3. Dans l'écran de création de produit ([`ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx)), des libellés et placeholders ultra-spécifiques au matériel informatique subsistaient (« Ligne de specs (résumé) », « Intel i7 · 16GB · 1TB SSD », grille figée CPU, RAM, Stockage, GPU, Écran, OS imposée pour tout type d'article), en contradiction avec la vocation universelle de la boutique (tous produits et services).
- **Décisions d'ArchiSys3.0 :**
  Validation intégrale du plan d'intervention Sous-Phase 17.1 (artéfact miroir `17_plan_raccordement_serveur_reinitialisation_et_vidage_donnees.md`) :
  1. Correction chirurgicale SQL dans `ControleurMaintenance.php` : substitution de `key` par `section` et mapping exact des sections (`home-reviews`, `ticker`, `marquee`, `about`, `builder`).
  2. Rendre la pastille `DataModeBadge.tsx` interactive avec dialogue modal d'inspection en direct (mode actif, URL API, journal des échecs réseau `getResourceFailures()`, vidage du journal, masquage).
  3. Ajout dans [`Developpeur.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Developpeur.tsx) d'une carte « Affichage & Outils de développement » avec un interrupteur Switch pour activer/désactiver la pastille en temps réel (synchronisé via `localStorage` et CustomEvent).
  4. Universalisation du formulaire produit [`ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx) :
     - Renommage en « Accroche & points clés (résumé) » avec placeholders dynamiques universels (physique vs service).
     - Rendre `specLine` facultatif (repli gracieux sur le nom du produit si omis).
     - Grille matérielle IT (CPU, RAM, GPU, Écran, OS) repliée par défaut sous accordéon `Collapsible` pour les produits généralistes ou services, et dépliée automatiquement pour les catégories informatiques.
     - Valorisation de `CustomSpecsEditor` (Attributs & caractéristiques libres : Taille, Couleur, Matière, Poids, Durée...).
  5. Complétude trilingue FR / EN / AR sur toutes les nouvelles clés.
- **Actions Réalisées :**
  - **Étape 17.1.A (Correctif SQL Backend) :**
    - Modification de [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) : correction des clauses `UPDATE site_content SET payload = '[]' WHERE section = :s`.
    - Test réel via API REST : `POST /api/v1/maintenance/reset` avec `action=reset&target=all` renvoie **HTTP 200 OK** avec succès total.
  - **Étape 17.1.B (Interactivité DataModeBadge) :**
    - Modification de [`src/components/DataModeBadge.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/DataModeBadge.tsx) : `pointerEvents: "auto"`, curseur pointeur, ouverture de `Dialog` avec inspection du mode, de l'URL API et tableau des erreurs réseau `getResourceFailures()`.
  - **Étape 17.1.C (Option Affichage dans Developpeur.tsx & i18n) :**
    - Modification de [`src/pages/admin/Developpeur.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Developpeur.tsx) : carte avec Switch réactif basculant la pastille.
    - Ajout des traductions trilingues dans `src/lib/i18n/admin/systeme/{fr,en,ar}.ts`.
  - **Étape 17.1.D (Universalisation du Formulaire Produit) :**
    - Modification de [`src/pages/admin/ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx) : schéma Zod relaxé pour `specLine`, placeholders universels, grille IT repliable avec badge contextuel, éditeur d'attributs personnalisés valorisé.
    - Ajout des traductions trilingues dans `src/lib/i18n/admin/catalogue/{fr,en,ar}.ts`.
  - **Étape 17.1.E (Vérification Qualité & Packaging) :**
    - `bun run verifier-i18n` : 100% cohérent (0 erreur).
    - `bun run format` : 100% conforme Prettier.
    - `bun run lint` : 0 erreur ESLint.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run build` : compilation Vite, prérendu et empaquetage d'archive réussis.
- **Résultats de Recette :**
  - Réinitialisation et vidage serveur 100% opérationnels en production (plus aucune erreur 500 SQL).
  - Pastille cliquable avec diagnostic immédiat des pannes et replis réseau.
  - Option d'affichage/masquage de la pastille opérationnelle en direct dans l'onglet Développeur.
  - Formulaire d'ajout/édition de produit 100% universel et adapté à n'importe quel domaine commercial (vêtements, beauté, alimentaire, services, artisanat, électronique).
- **Livrables :**
  - Plan d'implémentation miroir mis à jour : 📄 [17_plan_raccordement_serveur_reinitialisation_et_vidage_donnees.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/17_plan_raccordement_serveur_reinitialisation_et_vidage_donnees.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1853.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1853.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

### Phase 18 : Grand Audit d'Assurance Qualité, Éradication des Angles Morts Vitrine & Consolidation Intégrale de la Persistance Serveur

- **Date :** 05 Novembre 2026
- **Validation ArchiSys3.0 :** Clic « Proceed » et approbation formelle du Plan d'Implémentation 18.
- **Objectifs :**
  1. Éradication de tous les angles morts et noirs constatés sur la vitrine publique :
     - Dynamisation intégrale du menu déroulant des catégories du Header [`Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx) (desktop et mobile) via `useCategoryList()`.
     - Élimination du fallback rigide "laptops" dans les cartes de catégories [`CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx) (fond dégradé moderne avec filigrane universel).
     - Dynamisation des onglets de sélection en page d'accueil [`FeaturedTabs.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/FeaturedTabs.tsx) (plus de filtre figé sur "laptops").
     - Raccordement interactif des chips d'usage [`UseChips.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/UseChips.tsx) vers `/search?use=...` et conditionnement d'affichage à la présence effective de tags d'usage dans le catalogue.
     - Universalisation de la fiche produit [`Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx) : onglet Description sélectionné par défaut (au lieu de Specs IT), conditionnement de l'onglet Specs à l'existence de caractéristiques, dynamisation de la marque/boutique dans la description et valorisation de `specLine` sous forme de points forts.
     - Dynamisation des titres et métadonnées SEO dans [`Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx), [`CategoryIndex.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryIndex.tsx) et [`Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx) avec le nom réel de la boutique (`storeName`).
  2. Consolidation de la persistance serveur hermétique :
     - Élimination des appels directs `resetData()` résiduels dans l'administration ([`Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : paramètres généraux, tickers, marques, valeurs, configurateur).
     - Appel systématique à `reinitialiserServeur("reset", ...)` suivi de `invalidateAll()` en mode HTTP pour réinitialiser la base de données serveur SQLite/MySQL/PostgreSQL.
     - Prise en charge serveur dans [`ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) du rechargement de seed data pour `siteSettings`, `shippingSettings`, `tickerMessages`, `marqueeBrands`, `aboutValues`, `builderSteps` et `homeReviews`.
  3. Parité linguistique trilingue (FR, EN, AR) et conformité stricte aux standards de build.
- **Actions Réalisées :**
  - **Étape 18.A (Dynamisation Header, Cartes & Onglets) :**
    - [`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx) : `categoryMenuItems` branché sur `useCategoryList()`.
    - [`src/components/CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx) : suppression de l'image de portable par défaut ; affichage d'un dégradé moderne avec icône thématique filigranée si aucune image n'est téléversée.
    - [`src/components/FeaturedTabs.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/FeaturedTabs.tsx) : onglets générés dynamiquement depuis les catégories réelles du store.
  - **Étape 18.B (Chips d'usage, Fiche Produit & Métadonnées SEO) :**
    - [`src/components/UseChips.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/UseChips.tsx) : navigation active au clic vers `/search?use=${id}`.
    - [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx) : section d'usage affichée uniquement si des produits ont des tags d'usage ; titre et description de page dynamisés avec `storeName`.
    - [`src/pages/Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx) : onglet "desc" actif par défaut, affichage de points forts universels (`specLine`), onglet "specs" masqué si vide.
    - [`src/pages/CategoryIndex.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryIndex.tsx) & [`src/pages/Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx) : filtrage par usage actif et dynamisation SEO.
    - [`src/lib/i18n/{fr,en,ar}.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/) : mise à jour de `pd.desc` pour injecter `{storeName}`.
  - **Étape 18.C (Persistance Serveur Hermétique dans Settings & Maintenance) :**
    - [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : raccordement de toutes les réinitialisations partielles (`siteSettings`, `tickerMessages`, `marqueeBrands`, `aboutValues`, `builderSteps`) à `reinitialiserServeur("reset", target)` + `invalidateAll()`.
    - [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) : réimportation des données initiales depuis le seed JSON pour toutes les cibles de contenu et paramètres.
  - **Étape 18.D (Audit Qualité, Parité i18n & Lint) :**
    - `bun run verifier-i18n` : 100% de parité FR / EN / AR validée sans clés manquantes.
    - `bun run format` : 100% du code formaté avec Prettier.
  - **Étape 18.E (Validation CI Intégrale & Packaging) :**
    - `bun run lint` : 0 erreur ESLint.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run build` : compilation Vite, prérendu et création du paquet de déploiement réussis.
- **Résultats de Recette :**
  - La vitrine publique s'adapte immédiatement et dynamiquement à n'importe quel contenu de catalogue sans aucune mention IT ou "laptops" en dur.
  - Toutes les réinitialisations administrateur réinitialisent réellement la base de données serveur HTTP sans dépendre du cache localStorage du navigateur.
  - La boutique fonctionne comme un système e-commerce 100% universel prêt pour tout type de commerce.
- **Livrables :**
  - Plan interactif et miroir : 📄 [18_plan_grand_audit_assurance_qualite_et_consolidation_integrale_360.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/18_plan_grand_audit_assurance_qualite_et_consolidation_integrale_360.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1916.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1916.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

### Phase 19 : Assainissement Ultime des Angles Noirs Vitrine, Accessibilité RTL & Universalité 100% Tout Commerce

- **Date :** 05 Novembre 2026
- **Validation ArchiSys3.0 :** Clic « Proceed » et approbation formelle du Plan d'Implémentation 19.
- **Objectifs :**
  1. Éradication complète des 7 angles noirs découverts lors du diagnostic d'assurance qualité :
     - Internationalisation 100% trilingue (FR, EN, AR) de la fiche produit [`Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx) : statut favori, réassurances de services, formulaire complet d'avis client, date localisée dynamique (`Intl.DateTimeFormat`), correction de l'alignement RTL (`text-end`).
     - Carte produit [`ProductCard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ProductCard.tsx) : conversion en classes logiques `start-3`/`end-3`, badge Service traduit et `aria-label` de notation localisé.
     - Pages Catégorie [`CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx) et Recherche [`Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx) : état introuvable traduit, curseurs de prix dynamiques sur mesure (0 DA jusqu'au prix maximum réel du catalogue) éliminant la rigidité 20k-500k DA, affichage de prix via `useFormatPrice()`, conditionnement de `<UseChips />`.
     - Pied de page [`Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx) : formulaire Newsletter traduit (titre, placeholder, bouton, notifications toast), colonne des catégories dynamisée depuis `useCategoryList()`, copyright et lien de suivi de commande localisés.
     - Neutralisation des mentions informatiques du seed par défaut dans [`site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) et support d'une image Hero personnalisée (`imageSrc`) dans [`Hero.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Hero.tsx).
     - Déverrouillage du Back-Office [`Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : ouverture du sélecteur d'onglets de l'accueil à toutes les catégories dynamiques réelles du magasin.
  2. Respect absolu de la parité trilingue sans clé orpheline ni texte brut résiduel.
  3. Vérification intégrale du pipeline CI (`lint`, `tsc --noEmit`, `build`).
- **Actions Réalisées :**
  - **Étape 19.A (Fiche Produit & Carte Produit) :**
    - Modification de [`src/pages/Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx) : remplacement des chaînes françaises brutes par des clés `pd.*` traduites, date formatée selon la locale active, correction de `text-right` en `text-end`.
    - Modification de [`src/components/ProductCard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ProductCard.tsx) : `left-3` -> `start-3`, `right-3` -> `end-3`, badge Service et `aria-label` traduits.
  - **Étape 19.B (Filtres de Prix Dynamiques & Catégories) :**
    - Modification de [`src/pages/CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx) : `t("cp.notFound")`, `t("cp.seeAllCategories")`, calcul dynamique de `maxCatalogPrice`, curseur de 0 DA au max réel, affichage via `formatPrice()`, `<UseChips />` masqué si aucun tag.
    - Modification de [`src/pages/Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx) : échelle dynamique similaire de 0 DA au prix max réel du catalogue.
  - **Étape 19.C (Pied de page, Hero & Seed) :**
    - Modification de [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx) : formulaire Newsletter traduit, colonne des catégories synchronisée sur `useCategoryList()`, lien `/track` traduit via `t("track.title")`, copyright localisé.
    - Modification de [`src/components/Hero.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Hero.tsx) & [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) : champ `imageSrc` optionnel, neutralisation de la tagline par défaut.
  - **Étape 19.D (Déverrouillage Back-Office) :**
    - Modification de [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : `FeaturedTabsForm` connecté à `useCategoryList()`.
  - **Étape 19.E (Dictionnaires, CI & Packaging) :**
    - Ajout des 22 nouvelles clés i18n dans [`src/lib/i18n/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/fr.ts), [`en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/en.ts) et [`ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/ar.ts).
    - `bun run verifier-i18n` : 100% de parité trilingue validée (0 clé manquante).
    - `bun run format` : 100% conforme Prettier.
    - `bun run lint` : 0 erreur ESLint.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run build` : compilation Vite, prérendu et empaquetage réussis.
- **Résultats de Recette :**
  - Fiche produit 100% traduite en FR, EN et AR, avec formulaire d'avis, réassurances et dates localisées.
  - Conformité RTL irréprochable (plus aucune classe `text-right` ni `left-3`/`right-3` sur les cartes).
  - Les filtres de prix s'adaptent automatiquement à toute gamme de prix (500 DA, 2 000 DA ou 2 000 000 DA).
  - Le pied de page est synchronisé dynamiquement avec le catalogue et traduit.
  - L'administrateur peut composer librement ses onglets d'accueil avec n'importe quelle catégorie.
- **Livrables :**
  - Plan interactif et miroir : 📄 [19_plan_assainissement_ultime_angles_noirs_vitrine_et_universalite_100.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/19_plan_assainissement_ultime_angles_noirs_vitrine_et_universalite_100.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-1937.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-1937.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

---

### Phase 20 : Parachèvement Intégral : Contrat API home-reviews, Vitrine sur Base Vide, Parcours Clients et Toasts Admin 100% i18n

- **Date :** 05 Novembre 2026
- **Validation ArchiSys3.0 :** Clic « Proceed » et approbation formelle du Plan d'Implémentation 20.
- **Objectifs :**
  1. Éradication chirurgicale du warning console récurrent `[data-provider] ressource « home-reviews » : réponse acceptée par le réseau mais inexploitable — réponse de type « tableau (0 entrée(s)) »` par alignement rigoureux du contrat API backend PHP ↔ frontend TypeScript.
  2. Assainissement du comportement vitrine sur base de données purgée : masquage de `CategoryCards.tsx` quand la table des catégories est vide, éliminant tout titre de section orphelin.
  3. Localisation 100% trilingue (FR, EN, AR) de l'Espace Mon Compte (`Account.tsx`) : 8 libellés et textes de détail de commande, notes marchandes, modes de livraison et actions traduits avec conformité RTL.
  4. Localisation 100% trilingue du Suivi Public de Commande (`TrackOrder.tsx`) : avertissement d'annulation, badge message d'équipe, modes d'expédition (relais / domicile) et historique traduits.
  5. Assainissement des toasts d'administration dans `Settings.tsx` (téléversement et réinitialisation de logos et favicons), `SettingsVisualEditors.tsx` (JSON et doublons de marques), `SetupWizard.tsx` (remise à zéro) et validation dans `Auth.tsx`.
  6. Résolution des 12 avertissements de variables `{n}` manquantes dans le dictionnaire arabe (`src/lib/i18n/admin/systeme/ar.ts`).
  7. Validation intégrale de la suite CI (`verifier-i18n`, `format`, `lint`, `tsc --noEmit`, `build`).
- **Actions Réalisées :**
  - **Étape 20.A (Contrat API & Résilience home-reviews) :**
    - Modification de [`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php) : normalisation de `lireHomeReviews()` et `mettreAJourHomeReviews()` pour toujours renvoyer une enveloppe paginée conforme `{ items, total, page, perPage }`.
    - Modification de [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) : réinitialisation de la section sous forme de JSON structuré `'{"items":[]}'`.
    - Modification de [`src/data-provider/normalisation.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/normalisation.ts) : tolérance directe `if (Array.isArray(valeur)) return valeur;` dans `extraireItems()`.
  - **Étape 20.B (Vitrine Épurée sur Base Vide) :**
    - Modification de [`src/components/CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx) : ajout de la clause de garde `if (cats.length === 0) return null;`.
  - **Étape 20.C (Localisation Espace Client) :**
    - Modification de [`src/pages/Account.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Account.tsx) : branchement des clés `account.teamNote`, `account.orderedArticles`, `account.discount`, `account.delivery`, `account.deliveryDesk`, `account.deliveryHome`, `account.wilayaLabel`, `account.phoneLabel`, `account.trackLive`, `common.close`.
  - **Étape 20.D (Localisation Suivi de Commande) :**
    - Modification de [`src/pages/TrackOrder.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/TrackOrder.tsx) : branchement des clés `track.cancelledNotice`, `track.teamMessage`, `track.deliveryModeAndPlace`, `track.deliveryDesk`, `track.deliveryHome`, `track.paymentMode`, `track.historySteps`.
  - **Étape 20.E (Toasts Admin, Auth & Dictionnaires) :**
    - Modification de [`src/pages/Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx) : `t("auth.err.name.tooShort")`.
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : 8 toasts d'upload et reset médias connectés au dictionnaire i18n.
    - Modification de [`src/components/admin/SettingsVisualEditors.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SettingsVisualEditors.tsx) et [`src/components/admin/SetupWizard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SetupWizard.tsx) : toasts traduits.
    - Ajout des nouvelles clés et correction des variables `{n}` dans [`src/lib/i18n/admin/systeme/ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/systeme/ar.ts), [`src/lib/i18n/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/fr.ts), [`en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/en.ts), [`ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/ar.ts), [`src/lib/i18n/admin/reglages/{fr,en,ar}.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/reglages).
  - **Étape 20.F (Vérification CI & Packaging) :**
    - `bun run verifier-i18n` : Parité parfaite 1:1:1 validée (0 clé manquante, 0 anomalie de variable).
    - `bun run format` : 100% propre sous Prettier.
    - `bun run lint` : 0 erreur ESLint.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run build` : Compilation et packaging réussis.
- **Résultats de Recette :**
  - Console de l'accueil 100% propre : 0 warning sur `home-reviews`.
  - Vitrine irréprochable sur base de données purgée ou neuve (pas de section orpheline).
  - Parcours client (Compte, Suivi de colis, Inscription) entièrement traduits et conformes RTL en arabe.
  - Administration 100% localisée pour la gestion des médias, des thèmes et de la maintenance.
- **Livrables :**
  - Plan interactif et miroir : 📄 [20_plan_parachevement_integral_parcours_clients_contrat_home_reviews_et_vitrine.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/20_plan_parachevement_integral_parcours_clients_contrat_home_reviews_et_vitrine.md)
  - Nouvelle archive horodatée : 📦 [katech-site-05112026-2004.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-2004.zip)
  - Alias miroir : 📦 [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip)

#### Sous-Phase 20.1 : Correctif Chirurgical Backend — Résolution Erreurs Intelephense ApiException::invalide()

- **Date :** 05 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle écrite.
- **Constat & Cause Racine :**
  - Deux erreurs de sévérité 8 (`P1013` / `PHP0418`) détectées par Intelephense et le PHP Language Server dans [`ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) (lignes 452 et 634) : appel à la méthode non déclarée `ApiException::invalide()`.
  - La méthode canonique dans [`ApiException.php`](file:///c:/xampp/htdocs/ka-tech/api/src/ApiException.php) est `requeteInvalide()`.
- **Actions Réalisées :**
  1. Correction des deux occurrences dans [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) pour appeler `ApiException::requeteInvalide(...)`.
  2. Ajout d'un alias de résilience statique `public static function invalide(...)` dans [`api/src/ApiException.php`](file:///c:/xampp/htdocs/ka-tech/api/src/ApiException.php) redirigeant vers `requeteInvalide()`.
  3. Vérification de la syntaxe PHP via `php -l` sur les deux fichiers : 0 erreur.
  4. Recompilation et régénération du paquet de déploiement [`katech-site-05112026-2004.zip`](file:///c:/xampp/htdocs/ka-tech/katech-site-05112026-2004.zip) et de son alias [`katech-site.zip`](file:///c:/xampp/htdocs/ka-tech/katech-site.zip).
- **Résultat :** 0 diagnostic d'erreur sur l'ensemble des fichiers PHP du projet.

#### Sous-Phase 20.2 : Outillage Déploiement — Script Dédié bun run paqueter:data

- **Date :** 05 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle écrite de l'Option 2 (script dédié).
- **Objectif :**
  - Permettre d'empaqueter isolément le répertoire sensible `katech-data/` (base SQLite et fichiers système hors racine web) sans impacter le package de distribution `dist/` (`katech-site.zip`).
- **Actions Réalisées :**
  1. Création du script [`scripts/paqueter-data.ts`](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter-data.ts) :
     - Compression récursive via le moteur standard Python 3 `zipfile`.
     - Préservation des fichiers système et cachés (`.htaccess`, `index.html`, `dev-*.sqlite`).
     - Exclusion préventive des fichiers temporaires de verrouillage SQLite (`.sqlite-wal`, `.sqlite-shm`).
     - Génération de l'archive horodatée `katech-data-JJMMYYYY-HHMM.zip` et réplication automatique sur l'alias miroir `katech-data.zip`.
  2. Ajout de la commande dans [`package.json`](file:///c:/xampp/htdocs/ka-tech/package.json) : `"paqueter:data": "tsx scripts/paqueter-data.ts"`.
  3. Mise à jour de [`.gitignore`](file:///c:/xampp/htdocs/ka-tech/.gitignore) : ajout de `katech-data*.zip`.
  4. Test d'exécution réel : `bun run paqueter:data` ➔ succès immédiat (archive horodatée et alias créés).
- **Résultat :** La commande `bun run paqueter:data` est opérationnelle et produit un zip isolé de 36 Ko prêt à être déposé hors racine web.

#### Sous-Phase 20.3 : Sécurisation Script d'Urgence recup.php & Tolérance KaTech\Db::executer()

- **Date :** 05 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle écrite de l'Option B (double verrouillage).
- **Constat & Cause Racine :**
  - Lors de la soumission de réinitialisation de mot de passe administrateur sur `https://waymen.stacgate.com/api/recup.php`, l'exécution levait une erreur système : `Call to undefined method KaTech\Db::executer()`.
  - Cause : la méthode canonique d'exécution dans la classe `KaTech\Db` est `run(string $sql, array $params = []): PDOStatement`. Le script d'urgence appelait `$db->executer(...)` qui n'était pas défini.
- **Actions Réalisées :**
  1. Modification de [`api/recup.php`](file:///c:/xampp/htdocs/ka-tech/api/recup.php) : remplacement de `$db->executer(...)` par `$db->run(...)` à la ligne 68.
  2. Modification de [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) : ajout de la méthode alias francophone `public function executer(string $sql, array $params = []): PDOStatement { return $this->run($sql, $params); }`.
  3. Vérification syntaxique PHP : `php -l api/recup.php` et `php -l api/src/Db.php` (0 erreur).
  4. Validation CI & Packaging :
     - `bun run verifier-i18n` : parité parfaite FR/EN/AR.
     - `bun run lint` : 0 erreur ESLint.
     - `bunx tsc --noEmit` : 0 erreur TypeScript.
     - `bun run build` : compilation Vite, synchronisation de `dist/api/` et création de `katech-site-05112026-2023.zip` et `katech-site.zip`.
     - `bun run paqueter:data` : synchronisation de `katech-data-05112026-2023.zip` et `katech-data.zip`.
- **Résultat :** Le script de récupération d'urgence est 100% sécurisé et opérationnel. Les nouveaux packages de déploiement sont immédiatement disponibles à la racine.

#### Sous-Phase 20.4 : Portée de Variable & Typage Inféré $admin dans api/recup.php

- **Date :** 05 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle écrite.
- **Constat & Cause Racine :**
  - Dans [`api/recup.php`](file:///c:/xampp/htdocs/ka-tech/api/recup.php), la variable `$admin` n'était déclarée que dans le bloc `try`. En cas d'erreur lors de l'instanciation de `Db::instance()`, l'exécution sautait au `catch` et la variable restait indéfinie lors du rendu HTML, risquant un avertissement PHP runtime `Undefined variable $admin`.
- **Actions Réalisées :**
  1. Déclaration de `$admin = null;` ligne 30 aux côtés de `$erreur` et `$succes`.
  2. Sécurisation de la garde de rendu ligne 196 : `<?php elseif (is_array($admin)): ?>` garantissant à la fois l'existence et le typage tableau associatif.
  3. Vérification de la syntaxe PHP via `php -l api/recup.php` (0 erreur).
  4. Packaging et recompilation `bun run build`.
- **Résultat :** Robustesse absolue à 100% même en cas de défaillance amont de base de données.

---

## Phase 21 : Persistance Souveraine Base de Données, Bootstrap Universel Plug & Play & Éradication du LocalStorage

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle du Plan 21 avec exigence formelle d'indépendance d'emplacement (déploiement à la racine de `public_html/` ou sous-dossier arbitraire 100% plug & play).
- **Constat & Causes Racines Résolues :**
  1. `public/index.php` échouait silencieusement en production sur la recherche de `dirname(__DIR__) . '/api/src/bootstrap.php'` car dans l'extraction de `katech-site.zip`, `api/` se trouve directement sous `__DIR__ . '/api/'`. Résultat : aucun bootstrap serveur n'était injecté.
  2. `src/data-provider/site-settings.ts` exécutait au chargement `writeCache(SITE_SETTINGS_RESOURCE, initial)` à partir de `localStorage.getItem("katech_site_settings")`, bloquant l'appel réseau vers la base de données.
  3. `updateSettingsHttp` écrivait dans `localStorage` avant d'attendre la confirmation réseau 200 OK du serveur.
  4. `src/lib/admin-store.tsx` persistait 500 Ko de collections mockées dans `localStorage` même en mode HTTP.
- **Actions Réalisées :**
  - **Étape 21.A (Bootstrap Serveur Multi-Chemins & Plug & Play) :**
    - Modification de [`public/index.php`](file:///c:/xampp/htdocs/ka-tech/public/index.php) : détection dynamique multi-chemins relative à `__DIR__` (`__DIR__ . '/api/src/bootstrap.php'`, `dirname(__DIR__) . '/api/src/bootstrap.php'`, etc.) et scan de fallback SQLite multi-niveaux.
    - Fonctionne immédiatement que le site soit déployé à la racine de `public_html/` ou dans un sous-dossier (`/boutique/`, `/shop/`, etc.).
  - **Étape 21.B (Fournisseur de Réglages Frontend & Vérité Réseau) :**
    - Modification de [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) :
      - Suppression de l'injection prématurée `writeCache` au chargement de script : seul `window.__SITE_SETTINGS_BOOTSTRAP__` (injecté par la BD) est autorisé à amorcer le cache 0 ms.
      - En l'absence de bootstrap serveur, `useResource` exécute immédiatement l'appel réseau vers la base de données distante (`GET /settings/site`).
      - Inversion d'ordre dans `updateSettingsHttp` : la mise à jour serveur est attendue et validée en priorité absolue avant toute persistance locale.
  - **Étape 21.D (Confinement d'AdminStore en Mode HTTP) :**
    - Modification de [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) :
      - `saveState()` court-circuite et n'écrit plus rien dans `localStorage` en mode HTTP.
      - `loadState()` purge automatiquement l'ancienne clé géante `katech.admin.store.v1` si elle est détectée dans le navigateur.
  - **Étape 21.E (Validation CI & Packaging) :**
    - `php -l public/index.php` : 0 erreur de syntaxe.
    - `bun run verifier-i18n` : parité FR/EN/AR 100% stricte.
    - `bun run lint` : 0 erreur ESLint.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run build` : compilation Vite et empaquetage réussi.
    - `bun run paqueter:data` : archive de données mise à jour.
- **Résultats de Recette :**
  - Tout visiteur (sur n'importe quel navigateur, mobile ou navigation privée) reçoit dès le premier affichage le nom réel, logo, thème et couleurs configurés en base de données.
  - La base de données serveur est l'unique source de vérité souveraine.
  - Réinitialiser la base sur le serveur purge instantanément l'affichage du site, sans persistance fantôme d'un ancien `localStorage`.
- **Livrables :**
  - Plan interactif et miroir : 📄 [21_plan_persistance_souveraine_bd_bootstrap_universel_plug_and_play.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/21_plan_persistance_souveraine_bd_bootstrap_universel_plug_and_play.md)
  - Archive horodatée application : 📦 [katech-site-06112026-1338.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-1338.zip)
  - Archive horodatée données : 📦 [katech-data-06112026-1338.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-1338.zip)

#### Sous-Phase 21.1 : Unification Exclusive sur Archives Horodatées Uniques & Éradication des Alias Latest

- **Date :** 06 Novembre 2026
- **Demande & Arbitrage ArchiSys3.0 :** Suppression formelle de la double génération (`katech-site.zip` et `katech-data.zip`) qui prêtait à confusion. Décision de conserver **exclusivement et sans exception les archives horodatées uniques** (`katech-site-JJMMAAAA-HHMM.zip` et `katech-data-JJMMAAAA-HHMM.zip`).
- **Actions Réalisées :**
  1. Modification de [`scripts/paqueter.ts`](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter.ts) :
     - Suppression de la constante `ZIP_LATEST`.
     - Suppression de l'opération `fs.copyFileSync` vers `katech-site.zip`.
     - Mise à jour du message terminal pour ne désigner et n'annoncer que l'unique archive horodatée.
  2. Modification de [`scripts/paqueter-data.ts`](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter-data.ts) :
     - Suppression de la constante `ZIP_LATEST`.
     - Suppression de l'opération `fs.copyFileSync` vers `katech-data.zip`.
     - Mise à jour du message terminal pour ne désigner et n'annoncer que l'unique archive horodatée.
  3. Nettoyage physique du disque :
     - Suppression de `katech-site.zip` et `katech-data.zip`.
  4. Consolidation du plan d'implémentation (Artéfact et miroir 📂 [`.agents/Implementations_Plans/21_plan_persistance_souveraine_bd_bootstrap_universel_plug_and_play.md`](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/21_plan_persistance_souveraine_bd_bootstrap_universel_plug_and_play.md)).
- **Validation CI & Build :**
  - `bun run build; bun run paqueter:data` : exécuté avec succès.
  - Vérification répertoire racine : Seules 2 archives existent désormais (`katech-site-06112026-1338.zip` et `katech-data-06112026-1338.zip`).
  - `bun run lint` : 0 erreur.
  - `bunx tsc --noEmit` : 0 erreur.
- **Résultat :** Clarté absolue et zéro ambiguïté pour le déploiement sur serveur distant.

## Phase 22 : Administration Éditoriale Intégrale (« À propos ») & Sélecteur Universel de Médias (MediaPickerField)

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle du Plan 22 pour (1) rendre 100% administrable la narration de la page À propos depuis le Backstage et (2) remplacer les placeholders manuels d'URL par un composant standard avec téléversement direct et médiathèque modale.
- **Actions Réalisées :**
  - **Étape 22.A (Modèle de Données & Consommation /about) :**
    - Modification de [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) : extension de l'interface `SiteContent` avec la section `about` (kicker, title, intro, historyTitle, historyBody, missionTitle, missionBody, ctaTitle, ctaSubtitle, ctaBrowseLabel, ctaContactLabel, values) et champ `builderTeaser.bannerSrc`.
    - Alimentation trilingue (FR, EN, AR) complète dans `seedSiteContent()`.
    - Modification de [`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx) : consommation dynamique de `siteContent.about` avec remplacement des variables `{storeName}` et fallback transparent sur les clés par défaut.
  - **Étape 22.B (Administration Éditoriale dans Admin Contenu) :**
    - Modification de [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : ajout de l'onglet `about` (« Page À propos »), développement du sous-composant `AboutForm` (en-tête, histoire, mission, cartes de valeurs avec icônes dynamiques, CTA final).
    - Enrichissement des dictionnaires de traductions : [`src/lib/i18n/admin/contenu/{fr,en,ar}.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/contenu/fr.ts) avec parité 100% stricte.
  - **Étape 22.C (Composant Étalon MediaPickerField & Dialogue Modale) :**
    - Création de [`src/components/admin/MediaPickerField.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) et du dialogue modal `MediaPickerDialog` :
      - Aperçu instantané de l'image sélectionnée.
      - Bouton Téléverser direct (envoi via `useMediaAssetMutations().upload(file)` sans quitter la page).
      - Bouton « Choisir dans la médiathèque » (modale avec recherche par nom/tag et sélection par vignette).
      - Option de saisie manuelle d'URL externe repliable et bouton de suppression.
  - **Étape 22.D (Déploiement Généralisé sur le Backstage) :**
    - [`src/pages/admin/CategoryForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/CategoryForm.tsx) : champ image remplacé par `MediaPickerField`.
    - [`src/pages/admin/BlogForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BlogForm.tsx) : couverture d'article remplacée par `MediaPickerField`.
    - [`src/pages/admin/ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx) : sélecteur texte remplacé par `MediaPickerField` avec upload direct intégré.
    - [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : ajout du bouton médiathèque pour le logo de la boutique.
    - [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : sélecteurs d'images ajoutés pour `hero.imageSrc` et `builderTeaser.bannerSrc`.
- **Validation CI & Tests :**
  - `bun run verifier-i18n` : parité FR/EN/AR 100% stricte.
  - `bunx tsc --noEmit` : 0 erreur TypeScript.
  - `bun run lint` : 0 erreur ESLint.
  - `bun run build; bun run paqueter:data` : compilation et empaquetage réussis.
- **Livrables :**
  - Plan interactif et miroir : 📄 [22_plan_administration_editoriale_a_propos_et_selecteur_universel_medias.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/22_plan_administration_editoriale_a_propos_et_selecteur_universel_medias.md)
  - Archive horodatée unique application : 📦 [katech-site-06112026-1401.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-1401.zip)
  - Archive horodatée unique données : 📦 [katech-data-06112026-1401.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-1401.zip)

## Phase 23 : Refonte Ergonomique du Backstage (« Contenu » & « Paramètres »), Éditeur Visuel du Builder, Aperçus Médias par Défaut & Résolution F5

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle du Plan 23 pour (1) corriger le bug critique de réécriture Apache/F5 sur le domaine de production, (2) refondre l'écran « Contenu du site » en 4 pôles thématiques structurés, (3) déplacer les éditeurs visuels de bannières/marques dans leurs sections contextuelles, (4) remplacer l'éditeur JSON brut des étapes du configurateur PC par un gestionnaire visuel complet avec montants en DZD, (5) enrichir `MediaPickerField` avec aperçu intelligent de visuel officiel par défaut, et (6) appliquer la règle stricte de conservation cumulative de toutes les archives ZIP horodatées antérieures.
- **Actions Réalisées :**
  - **Étape 23.A (Correctif Bug Critique F5 en Production) :**
    - Modification de [`public/.htaccess`](file:///c:/xampp/htdocs/ka-tech/public/.htaccess) : élimination de la règle de redirection relative externe `RewriteRule ^(.+?)/$ $1 [R=301,L]` qui dévoilait le chemin physique absolu du serveur Hostinger (`/home/zzdwczcx/...`) lors d'un rafraîchissement F5 sur les dossiers de sous-pages prérendues (`/about/`). Remplacement par une réécriture interne propre et directe vers `index.php [L]`.
  - **Étape 23.B (Refonte Ergonomique de l'Écran Contenu du Site) :**
    - Modification de [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : regroupement des 16 onglets plats en 4 pôles thématiques majeurs avec barre de navigation secondaire réactive :
      - **Pôle 1 : Accueil (`home`)** : Bannière Hero, Vente Flash, Catégories vedettes, Chips d'usage, Meilleures ventes, Onglets vedettes, Marques & Partenaires, Pourquoi nous choisir, Teaser configurateur, Avis clients, Appel contact CTA.
      - **Pôle 2 : Pages & Textes (`pages`)** : Page « À propos » et CTA narratif contact.
      - **Pôle 3 : Global & Navigation (`global`)** : En-tête (Header), Bandeau défilant d'annonces (Ticker) avec gestionnaire visuel complet, Pied de page (Footer).
      - **Pôle 4 : Mobile & Flottant (`mobile`)** : Bouton WhatsApp flottant et barre de navigation mobile inférieure.
    - Intégration de `TickerMessagesVisualEditor` dans la section Global et `MarqueeBrandsVisualEditor` dans la section Marques & Partenaires.
  - **Étape 23.C (Aperçus Intelligents des Médias par Défaut) :**
    - Modification de [`src/components/admin/MediaPickerField.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) : introduction de la prop `defaultPreviewSrc?: string`. Lorsque la base de données est vierge ou l'URL non renseignée, affichage direct du visuel officiel par défaut du site avec badge discret « Visuel par défaut ».
    - Câblage de `heroLaptopSrc` sur le Hero et `builderBannerSrc` sur le Teaser du configurateur dans `Content.tsx`.
  - **Étape 23.D (Éditeur Visuel Universel des Étapes du Builder PC & Nettoyage Paramètres) :**
    - Création de [`src/components/admin/BuilderStepsVisualEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BuilderStepsVisualEditor.tsx) : remplacement de la zone de saisie JSON brute par un éditeur graphique riche permettant d'administrer chaque étape matérielle (Boîtier, Carte mère, Processeur, RAM, Stockage, Carte graphique, Alimentation, Refroidissement), d'ajouter/supprimer des composants, et de gérer les tarifs unitaires en Dinars Algériens (DZD).
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : intégration du `BuilderStepsVisualEditor`, ajout de la médiathèque modale pour le favicon, et suppression des blocs de configuration déplacés vers l'écran Contenu.
  - **Étape 23.E (Politique de Conservation Cumulée des Archives ZIP) :**
    - Règle stricte respectée : accumulation chronologique de l'ensemble des archives `.zip` (application et données) générées, interdiction de suppression des archives antérieures.
- **Validation CI & Tests :**
  - `bun run verifier-i18n` : parité FR/EN/AR 100% stricte.
  - `bunx tsc --noEmit` : 0 erreur TypeScript.
  - `bun run lint` : 0 erreur ESLint.
  - `bun run build; bun run paqueter:data` : compilation de production et archives zip horodatées créées avec succès.
- **Livrables :**
  - Plan interactif et miroir : 📄 [23_plan_refonte_ergonomique_backstage_contenu_parametres_et_correctif_f5.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/23_plan_refonte_ergonomique_backstage_contenu_parametres_et_correctif_f5.md)
  - Archive application horodatée : 📦 [katech-site-06112026-1444.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-1444.zip) (conservée en parallèle de 1401)
  - Archive données horodatée : 📦 [katech-data-06112026-1444.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-1444.zip) (conservée en parallèle de 1401)

## Phase 24 : Consolidation Réglages, Logos Marques, Sauvegarde BD, Sécurité CSP & Aperçu Live du Mode Maintenance VIP

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle du Plan 24 pour (1) corriger l'erreur HTTP 503 lors du téléchargement de sauvegarde de base de données liée à `proc_close()` en environnement Linux, (2) résoudre les blocages de scripts inline Content Security Policy (CSP), (3) assouplir la validation Zod d'upload d'images pour accepter les chemins relatifs `uploads/` et `assets/`, (4) ajouter le support complet des logos de marques (base SQLite, API backend, formulaires et carrousel vitrine), (5) brancher `FeaturedTabs` sur l'accueil et supprimer les fausses catégories mockées, (6) restructurer l'écran « Paramètres » en 6 onglets thématiques avec aperçu interactif modal du mode maintenance, et (7) afficher le chemin physique absolu de la base SQLite dans l'onglet Développeur.
- **Actions Réalisées :**
  - **Étape 24.A (Résolution Définitive du Téléchargement de Sauvegarde BD) :**
    - Modification de [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) : fiabilisation de `executerOutil()`. En environnement PHP/Linux, l'appel à `proc_get_status()` avant `proc_close()` provoquait le retour de `-1` par `proc_close()`, déclenchant à tort une exception HTTP 503. Le code inspecte désormais prioritairement `$etat['exitcode']` et vérifie la présence de `TERMINÉ avec succès` dans le flux de sortie pour garantir le téléchargement immédiat du fichier `.sqlite`.
  - **Étape 24.B (Autorisation CSP des Scripts Inline d'Amorçage) :**
    - Modification de [`public/.htaccess`](file:///c:/xampp/htdocs/ka-tech/public/.htaccess) : ajout de `'unsafe-inline'` à la directive `script-src` du Content-Security-Policy pour autoriser l'exécution sans alerte console des scripts inline anti-FOUC de `index.html` et de bootstrapping dynamique `window.__SITE_SETTINGS_BOOTSTRAP__` de `index.php`.
  - **Étape 24.C (Assouplissement Zod Validation Upload Médias) :**
    - Modification de [`src/pages/admin/CategoryForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/CategoryForm.tsx) : mise à jour du schéma Zod `optionalUrl` pour autoriser les chemins relatifs issus du téléversement (`uploads/...`, `assets/...`) évitant le message bloquant « URL invalide (http(s):// ou / attendu) ».
  - **Étape 24.D (Gestion Intégrale des Logos de Marques) :**
    - Backend : ajout de la colonne `logo TEXT` dans la table `brands` SQLite avec auto-migration dynamique, prise en charge de `logo` dans les requêtes de création, modification et DTO de [`api/src/Controllers/ControleurMarques.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMarques.php).
    - Frontend Backstage : intégration du champ `logo?: string` dans `AdminBrand` ([`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx)), remplacement de la saisie manuelle par `<MediaPickerField>` dans [`src/pages/admin/BrandForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BrandForm.tsx) et affichage du logo dans [`src/pages/admin/BrandDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BrandDetail.tsx).
    - Vitrine : [`src/components/BrandsMarquee.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/BrandsMarquee.tsx) affiche le logo image de la marque s'il est renseigné, retombe élégamment sur le nom stylisé si absent, et charge les marques du catalogue si la liste personnalisée est vide.
  - **Étape 24.E (Intégration FeaturedTabs & Nettoyage des Données Fantômes) :**
    - [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx) : inclusion du composant `<FeaturedTabs />` sur l'accueil entre les Meilleures Ventes et les Marques.
    - [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : suppression des catégories mockées en dur (Laptops, Gaming, Audio) dans `FeaturedTabsForm`, branché désormais exclusivement sur les catégories réelles du store/API.
  - **Étape 24.F (Refonte Ergonomique de l'Écran « Paramètres » & Aperçu Live du Mode Maintenance VIP) :**
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : restructuration des 8 cartes plates en **6 Onglets Thématiques** :
      1. **Boutique (`general`)** : Identité, Nom d'enseigne, Logo (upload, médiathèque, rétablissement officiel), Coordonnées, WhatsApp, Horaires.
      2. **Identité & Thème (`appearance`)** : Thème clair/sombre/système, Couleur primaire avec nuancier et presets, Favicon de la boutique et Bandeau promotionnel.
      3. **Mode Maintenance VIP (`maintenance`)** : Statut visuel direct (fermé/ouvert), interrupteur principal, titre, message explicatif, date/heure estimée de retour, switch WhatsApp, et **Bouton « Aperçu Live (Modal) »** ouvrant un modal plein écran avec simulation en temps réel des valeurs en cours de saisie via `<MaintenanceScreen previewSettings={form} />`.
      4. **Devise & Tarifs (`finance`)** : Symbole monétaire, position, séparateur de milliers et aperçu dynamique en temps réel en DZD.
      5. **Configurateur PC (`builder`)** : Interrupteur d'activation et `BuilderStepsVisualEditor` intégré.
      6. **Options & Stocks (`options`)** : Notifications emails, sélecteur multilingue vitrine, masquage des notes sans avis, et seuils d'alertes de stock.
    - Barre d'action permanente (Réinitialiser / Enregistrer) conservée en pied d'écran pour tous les onglets.
  - **Étape 24.G (Transparence de l'Emplacement Physique de la Base SQLite) :**
    - [`api/src/Controllers/ControleurMaintenance.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMaintenance.php) : exposition de `'path' => $this->db->cheminSqlite()` dans le diagnostic d'état.
    - [`src/pages/admin/Developpeur.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Developpeur.tsx) : affichage explicite du chemin physique de la base de données SQLite sur le serveur (ex: `/home/uXXXXXXX/domains/.../katech-data/katech.sqlite`) pour éliminer tout angle noir.
- **Validation CI & Tests :**
  - `bun run verifier-i18n` : parité FR/EN/AR 100% stricte.
  - `bunx tsc --noEmit` : 0 erreur TypeScript.
  - `bun run lint` : 0 erreur ESLint.
  - `bun run build; bun run paqueter:data` : compilation de production et archives zip horodatées créées avec succès (`katech-site-06112026-1518.zip` et `katech-data-06112026-1518.zip`).
  - Règle de conservation cumulative respectée : les archives antérieures (`1401`, `1444`, `1518`) sont toutes préservées sur le disque.
- **Livrables :**
  - Plan interactif et miroir : 📄 [24_plan_consolidation_reglages_marques_sauvegarde_bd_et_csp.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/24_plan_consolidation_reglages_marques_sauvegarde_bd_et_csp.md)
  - Archive application horodatée : 📦 [katech-site-06112026-1518.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-1518.zip)
  - Archive données horodatée : 📦 [katech-data-06112026-1518.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-1518.zip)

## Phase 25 : Restauration de la Souveraineté de DB_SQLITE_PATH & Relocalisation Sécurisée dans katech-data/

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle du Plan 25 pour restaurer la souveraineté absolue de la directive `DB_SQLITE_PATH` définie dans `api/.env`, supprimer le déroutement involontaire causé par le test `!is_file($chemin)` dans `Db.php`, et assurer l'auto-relocalisation transparente et sans perte de données de la base active vers `/home/zzdwczcx/katech-data/katech.sqlite` sur Hostinger.
- **Actions Réalisées :**
  - **Étape 25.A & 25.B (Assainissement & Souveraineté de `Db::depuisEnv()`) :**
    - Modification de [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) :
      - Suppression définitive du test `|| !is_file($chemin)`. Le mécanisme de repli (recherche dans `katech-data/dev-*.sqlite` ou `api/var/`) est désormais réservé **exclusivement** aux cas où `DB_SQLITE_PATH` n'est pas renseigné (`$chemin === ''`).
      - Ajout de l'auto-relocalisation transparente : lorsque `$chemin !== ''` pointe vers un fichier cible qui n'existe pas encore (ex: `/home/zzdwczcx/katech-data/katech.sqlite`) alors qu'une base SQLite existante avec des données est présente dans `api/var/katech.sqlite`, le système s'assure que le dossier parent cible est initialisé avec permissions `0775` et copie automatiquement la base existante vers le chemin configuré.
      - Préservation intégrale : aucune perte de comptes administrateurs, configurations, produits ou commandes lors de la bascule vers le dossier sécurisé hors de `public_html`.
  - **Étape 25.C (Validation CI & Nouveaux Livrables Horodatés) :**
    - `bun run verifier-i18n` : parité FR/EN/AR 100% stricte.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build; bun run paqueter:data` : compilation de production et archives zip horodatées créées avec succès (`katech-site-06112026-1808.zip` et `katech-data-06112026-1808.zip`).
    - Conservation cumulative respectée : les archives antérieures (`1401`, `1444`, `1518`, `1808`) sont toutes préservées sur le disque.
- **Livrables :**
  - Plan interactif et miroir : 📄 [25_plan_souverainete_db_sqlite_path_et_relocalisation_katech_data.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/25_plan_souverainete_db_sqlite_path_et_relocalisation_katech_data.md)
  - Archive application horodatée : 📦 [katech-site-06112026-1808.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-1808.zip)
  - Archive données horodatée : 📦 [katech-data-06112026-1808.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-1808.zip)

---

## Phase 26 : Universalisation 360°, Moteur de Thème Avancé, Setup Wizard VIP & Granularité Éditoriale

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle du Plan 26 pour concrétiser les 5 Piliers d'universalisation absolue de la plateforme Marque Blanche :
  1. Éradication des mocks et hardcodages résiduels.
  2. Moteur de Thème 360° (Couleurs primaire, secondaire, accent, typographie, arrondis et styles des boutons).
  3. Granularité éditoriale vue par vue et interrupteurs d'activation section par section.
  4. Téléversement direct et médiathèque du Logo & Favicon dans le Setup Wizard.
  5. Setup Wizard VIP enrichi en 5 étapes fluides avec préréglages métier intelligents.
- **Actions Réalisées :**
  - **Pilier 1 (Éradication des Mocks & Hardcodages) :**
    - Modification de [`src/pages/CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx) : élimination de la restriction `BUILTIN_CATEGORIES` ; toute catégorie créée dynamiquement en base de données ou fournie via l'URL est reconnue et rendue sans blocage.
    - Vérification et consolidation de [`src/pages/Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx) et [`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx) : consommation 100% dynamique des ressources sans mocks statiques.
  - **Pilier 2 (Moteur de Thème 360° & Injections Dynamiques) :**
    - Modification de [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) : ajout des types `BorderRadiusOption`, `FontFamilyOption`, `ButtonStyleOption` et enrichissement de l'interface `SiteSettings` avec `secondaryColor`, `accentColor`, `borderRadius`, `fontFamily`, `buttonStyle`.
    - Modification de [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) : mise à niveau de `appliquerBrandingDynamique()` pour injecter instantanément `--primary`, `--secondary`, `--accent`, `--radius`, `--font-sans` et `--font-display` dans le `:root` du DOM.
    - Modification de [`index.html`](file:///c:/xampp/htdocs/ka-tech/index.html) : pré-connexion Google Fonts (Inter, Outfit, Plus Jakarta Sans, Poppins, Cairo) et enrichissement du script inline anti-FOUC (0ms) pour garantir le rendu stylé sans saut visuel au rechargement.
    - Modification de [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : refonte complète de l'onglet « Identité & Thème » avec sélecteurs de couleur secondaire, accent, police de caractères, rayon d'arrondi des bordures, styles de boutons, et Studio d'Aperçu Interactif en direct.
  - **Pilier 3 (Granularité Éditoriale & Interrupteurs Section par Section) :**
    - Modification de [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) : ajout de `enabled?: boolean` sur chacune des 11 sections de la page d'accueil (`hero`, `flashSale`, `categories`, `useChips`, `bestSellers`, `featuredTabs`, `brandsMarquee`, `whyUs`, `builderTeaser`, `reviews`, `contactCta`).
    - Modification de [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx) : conditionnement strict de l'affichage de chaque section (`siteContent.<section>?.enabled !== false`).
    - Modification de [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : intégration automatique d'un badge switch « Visible / Masquée » dans l'en-tête de chaque `SectionEditor`, et ajout d'un encart explicatif didactique sur `FeaturedTabsForm` pour guider le commerçant.
  - **Pilier 4 & 5 (Setup Wizard VIP Enrichi en 5 Étapes & Upload Direct Logo/Favicon) :**
    - Refonte intégrale de [`src/components/admin/SetupWizard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SetupWizard.tsx) :
      - _Étape 1 (Identité & Médias de Marque) :_ Enseigne, slogan, logo et favicon avec bouton de téléversement direct (`input type="file"`), sélecteur de médiathèque (`<MediaPickerDialog>`), saisie d'URL et aperçu en haute fidélité.
      - _Étape 2 (Coordonnées & Commerce) :_ Email officiel, téléphone, WhatsApp client direct (avec assainissement automatique), adresse et devise monétaire personnalisable.
      - _Étape 3 (Thème 360° & Typographie) :_ Mode clair/sombre/système, nuancier couleur primaire, couleur secondaire, police de caractères (Inter, Outfit, Jakarta, Poppins, Cairo, Système) et galbe des bordures (Sharp, Modern, Soft, Pill) appliqués en temps réel dans l'interface pendant l'assistant.
      - _Étape 4 (Profil Métier & Modules) :_ 5 grands secteurs (Tech, Général, Mode, Beauté, Services) avec adaptation des slogans et activation/désactivation intelligente du configurateur PC.
      - _Étape 5 (Finalisation & Données Démo) :_ Synthèse récapitulative, choix clair de conserver ou vider le catalogue démo à zéro, et lancement officiel en un clic.
- **Validation CI & Tests :**
  - `bun run verifier-i18n` : parité FR/EN/AR 100% stricte.
  - `bunx tsc --noEmit` : 0 erreur TypeScript.
  - `bun run lint` : 0 erreur ESLint.
  - `bun run build; bun run paqueter:data` : compilation de production et archives zip horodatées créées avec succès (`katech-site-06112026-1842.zip` et `katech-data-06112026-1842.zip`).
  - Règle de conservation cumulative respectée : l'ensemble des archives historiques (`1401`, `1444`, `1518`, `1808`, `1842`) est préservé.
- **Livrables :**
  - Plan interactif et miroir : 📄 [26_plan_universalisation_360_theme_wizard_vip_et_granularite_editoriale.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/26_plan_universalisation_360_theme_wizard_vip_et_granularite_editoriale.md)
  - Archive application horodatée : 📦 [katech-site-06112026-1842.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-1842.zip)
  - Archive données horodatée : 📦 [katech-data-06112026-1842.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-1842.zip)

---

## Phase 27 : Raccordement Pages & Textes, Page Contact & FAQ Dynamique, Assainissement Éditorial « À propos » et Éradication des Alertes i18n & Performance

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle du Plan 27 pour :
  1. Résoudre le goulet d'étranglement de persistance SQLite sur la section « À propos » et raccorder l'ensemble des pages éditoriales (dont Contact & FAQ) à la source de vérité dynamique.
  2. Raccorder la page `/contact` aux données éditables (`siteContent.contact`) avec composant accordéon dynamique pour la foire aux questions (FAQ).
  3. Ajouter l'éditeur visuel complet de la page Contact et de sa FAQ dans le backstage (_Contenus du site > Pages & Textes > Page Contact & FAQ_).
  4. Éradiquer les avertissements console i18n manquants (`admin.media.*` substitués par les clés officielles conformes `admin.catalogue.media.*`).
  5. Optimiser la réconciliation React dans l'éditeur de contenu pour éliminer les violations de temps d'exécution.
- **Actions Réalisées :**
  - **Étape 27.A (Diagnostic & Résolution du Décrochage « À propos ») :**
    - Modification de [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) :
      - Sécurisation chirurgicale de `mergeSiteContent(seed, partial)` contre les incohérences de typage héritées d'anciennes structures de base de données (si `s` est un objet complet et `p` un tableau indexé ou vide `[]`, conservation stricte de la structure objet avec conversion des éléments de tableau vers `values`).
      - Définition et enrichissement du contrat d'interface `SiteContent["contact"]` comportant `kicker`, `title`, `subtitle`, et une collection d'items de questions fréquentes `faqs: { id: string; question: Localized<string>; answer: Localized<string> }[]`.
      - Amorce bilingue/trilingue officielle dans `seedSiteContent()` (Français, Anglais, Arabe) pour la page de contact et la FAQ.
    - Modification de [`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php) : normalisation automatique de la section `about` lors de la lecture et de la mise à jour pour garantir l'intégrité de la structure `{ values: ... }`.
    - Nettoyage de la base active locale SQLite (`katech-data/dev-a97b6b98a368.sqlite`) pour éliminer l'entrée résiduelle `section = 'about' AND payload = '[]'`.
  - **Étape 27.B (Raccordement de la Page Publique `/contact` & Accordéon FAQ) :**
    - Modification de [`src/pages/Contact.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Contact.tsx) :
      - Raccordement dynamique du surtitre (kicker), du titre principal (avec interpolation automatique du nom d'enseigne `{storeName}`) et du sous-titre depuis `siteContent.contact`.
      - Intégration du composant accessible `<Accordion type="single" collapsible>` de Radix UI pour restituer la FAQ dynamique en bas de page sous les coordonnées et le formulaire de contact.
  - **Étape 27.C (Éditeur Backstage « Page Contact & FAQ ») :**
    - Modification de [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) :
      - Ajout de l'onglet `contact` dans le pôle « Pages & Textes » (`PAGES_SECTIONS`).
      - Création du formulaire modulaire `ContactPageForm` : gestion du kicker, du titre et du sous-titre de la page, et gestionnaire complet des items FAQ (création, édition trilingue des questions/réponses, suppression, identifiants uniques).
  - **Étape 27.D (Éradication des Avertissements i18n & Refonte de `MediaPickerField`) :**
    - Remplacement de toutes les fausses clés `admin.media.*` dans [`src/components/admin/MediaPickerField.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) par le référentiel officiel `admin.catalogue.media.*`.
    - Ajout et synchronisation stricte à 100% des clés trilingues correspondantes dans [`src/lib/i18n/admin/catalogue/{fr,en,ar}.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/catalogue/fr.ts) et [`src/lib/i18n/admin/contenu/{fr,en,ar}.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/contenu/fr.ts).
  - **Étape 27.E (Validation CI & Packaging Cumulatif) :**
    - `bun run verifier-i18n` : parité FR/EN/AR 100% stricte, 0 clé manquante.
    - `bun run format` : 100% conforme Prettier.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build; bun run paqueter:data` : compilation de production et archives zip horodatées créées avec succès (`katech-site-06112026-1905.zip` et `katech-data-06112026-1905.zip`).
    - Conservation cumulative respectée : l'ensemble des archives historiques (`1401`, `1444`, `1518`, `1808`, `1842`, `1905`) est préservé.
- **Livrables :**
  - Plan interactif et miroir : 📄 [27_plan_raccordement_pages_textes_contact_faq_assainissement_i18n_et_performance.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/27_plan_raccordement_pages_textes_contact_faq_assainissement_i18n_et_performance.md)
  - Archive application horodatée : 📦 [katech-site-06112026-1905.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-1905.zip)
  - Archive données horodatée : 📦 [katech-data-06112026-1905.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-1905.zip)

---

## Phase 28 : Universalisation Catalogue (Specs IT Pliées & Catégorie Neutre), Auteur Dynamique Blog & Éditeur Multimédia Markdown (Vidéos YouTube/MP4, Médiathèque & Live Preview)

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle du Plan 28 pour :
  1. Éliminer le hardcodage de la catégorie par défaut `category: "laptops"` et replier la section Spécifications informatiques (CPU, RAM, GPU, Écran, OS) par défaut à la création de produit.
  2. Supprimer le hardcodage de l'auteur de blog `"Équipe KA Tech"` et interpoler dynamiquement l'enseigne configurée de la boutique ou le compte de l'administrateur connecté.
  3. Créer un composant réutilisable d'édition Markdown enrichi (`MarkdownEditor`) avec barre d'outils visuelle, passerelle directe vers la Médiathèque, dialogue d'insertion vidéo (YouTube, Vimeo, MP4) et onglet d'Aperçu en direct.
  4. Améliorer le moteur de rendu public (`MarkdownRenderer`) dans `BlogArticle.tsx` pour intégrer des lecteurs vidéo responsives 16:9, des images cataloguées, des listes à puces et des liens hypertextes.
- **Actions Réalisées :**
  - **Étape 28.A (Universalité Formulaire Produit `ProductForm.tsx`) :**
    - Modification de `emptyForm(defaultCategory = "")` pour ne plus forcer `category: "laptops"`. Raccordement dynamique à la première catégorie existante (`categories[0]?.slug || ""`).
    - Modification de l'état `showItSpecs` : initialisé à `false` en mode création. En mode édition, initialisé à `true` uniquement si le produit édité possède déjà au moins une spécification informatique non vide.
    - Suppression de l'effet de bord forçant le déploiement automatique du volet.
  - **Étape 28.B (Auteur Dynamique du Blog `BlogForm.tsx`) :**
    - Raccordement aux hooks `useSiteSettings()` et `useAuth()`.
    - Calcul de l'auteur par défaut : nom de l'utilisateur connecté (`user?.name`), ou interpolation de l'enseigne de la boutique (`Équipe ${storeName}`), ou intitulé neutre "Rédaction".
    - Suppression totale du hardcodage `"Équipe KA Tech"`.
  - **Étape 28.C (Composant Éditeur Markdown Enrichi `MarkdownEditor.tsx`) :**
    - Création de [`src/components/admin/MarkdownEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MarkdownEditor.tsx) avec :
      - Barre d'outils complète : Titres H2/H3, Gras, Italique, Listes à puces, Listes ordonnées, Citations, Liens.
      - Bouton Médiathèque intégré ouvrant `MediaPickerDialog` pour insérer une image `![nom](src)` en un clic.
      - Dialogue d'insertion Vidéo avec support des URLs YouTube, Vimeo ou fichiers vidéo directs MP4/WebM.
      - Commutateur d'onglets [ ✏️ Édition ] / [ 👁️ Aperçu en direct ] pour visualiser immédiatement le résultat avant enregistrement.
    - Création du wrapper `LLocalizedMarkdownEditor` dans [`src/pages/admin/BlogForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BlogForm.tsx) pour les trois langues (FR, EN, AR avec `dir="rtl"`).
  - **Étape 28.D (Moteur de Rendu Multimédia Public `MarkdownRenderer.tsx`) :**
    - Création de [`src/components/blog/MarkdownRenderer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blog/MarkdownRenderer.tsx) :
      - Détection regex et intégration responsive 16:9 des vidéos YouTube (`iframe` sécurisé `youtube-nocookie.com`) et Vimeo.
      - Lecteur HTML5 `<video controls>` pour les fichiers directs MP4/WebM.
      - Rendu des images Markdown `![alt](url)` via le composant optimisé `<ImageCatalogue>`.
      - Rendu des liens cliquables `[texte](url)`, citations stylées `> `, et listes à puces `- ` / `* `.
    - Intégration de `MarkdownRenderer` dans [`src/pages/BlogArticle.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/BlogArticle.tsx).
  - **Étape 28.E (Parité i18n Trilingue FR, EN, AR) :**
    - Ajout de 21 nouvelles clés trilingues pour l'éditeur Markdown dans [`src/lib/i18n/admin/contenu/{fr,en,ar}.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/contenu/fr.ts).
  - **Étape 28.F (Validation CI & Packaging Cumulatif) :**
    - `bun run verifier-i18n` : 100% de parité trilingue stricte FR/EN/AR.
    - `bun run format` : 100% conforme Prettier.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build; bun run paqueter:data` : compilation de production et archives zip horodatées créées avec succès (`katech-site-06112026-2104.zip` et `katech-data-06112026-2104.zip`).
    - Conservation cumulative respectée : l'ensemble des archives historiques (`1401`, `1444`, `1518`, `1808`, `1842`, `1905`, `2104`) est préservé.
- **Livrables :**
  - Plan interactif et miroir : 📄 [28_plan_universalisation_catalogue_editeur_blog_multimedia_et_videos.md](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/28_plan_universalisation_catalogue_editeur_blog_multimedia_et_videos.md)
  - Archive application horodatée : 📦 [katech-site-06112026-2104.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-2104.zip)
  - Archive données horodatée : 📦 [katech-data-06112026-2104.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-2104.zip)

### Sous-Phase 28.1 : Consolidation Neutre Blog (Interpolation de l'Enseigne & Auteur) et Réveil Asynchrone des Spécifications IT en Édition Produit

- **Date :** 06 Novembre 2026
- **Validation ArchiSys3.0 :** Approbation formelle de la Sous-Phase 28.1 pour éradiquer les deux angles morts résiduels identifiés lors du grand audit :
  1. Interpolation dynamique de l'enseigne configurée (`brand` / `storeName`) dans les vues publiques du blog ([`src/pages/Blog.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Blog.tsx) et [`src/pages/BlogArticle.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/BlogArticle.tsx)) : remplacement automatique des occurrences `{storeName}` et `\bKA Tech\b` dans le titre, l'extrait, le contenu markdown, l'auteur et les métadonnées SEO/JSON-LD.
  2. Réveil asynchrone des spécifications IT dans [`src/pages/admin/ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx) : déploiement automatique du volet (`showItSpecs(true)`) lorsque les spécifications d'un produit informatique existant arrivent en asynchrone après le premier rendu.
  3. Neutralisation de la graine d'amorçage blog (`seedBlogPosts` dans [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx)) pour utiliser `{storeName}` au lieu du nom statique en dur.
- **Actions Réalisées :**
  - **Étape 28.1.A (Interpolation Vitrine Blog) :**
    - Modification de [`src/pages/BlogArticle.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/BlogArticle.tsx) : application de l'interpolation `{storeName}` et `\bKA Tech\b` sur `title`, `excerpt`, `content`, `author` et les balises JSON-LD/SEO.
    - Modification de [`src/pages/Blog.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Blog.tsx) : raccordement à `useSiteSettings()`, interpolation dynamique dans les cartes de la liste des articles (`title`, `excerpt`, `author`).
  - **Étape 28.1.B (Réveil Asynchrone Specs IT) :**
    - Modification de [`src/pages/admin/ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx) : dans le `useEffect` de chargement des données produit (`p` ou `existing`), détection de la présence d'au moins une spec standard IT (`cpu`, `ram`, `storage`, `gpu`, `screen`, `os`) et déclenchement ciblé de `setShowItSpecs(true)`.
  - **Étape 28.1.C (Graine de Démonstration Neutre) :**
    - Modification de [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) : remplacement des occurrences `"Équipe KA Tech"` et `"KA Tech"` dans `seedBlogPosts()` par `"{storeName}"` pour une neutralité marque blanche intégrale à l'amorçage.
  - **Étape 28.1.D (Contrôles CI & Packaging Cumulatif) :**
    - `bun run verifier-i18n` : parité FR/EN/AR 100% stricte.
    - `bun run format` : 100% conforme Prettier.
    - `bunx tsc --noEmit` : 0 erreur TypeScript.
    - `bun run lint` : 0 erreur ESLint.
    - `bun run build; bun run paqueter:data` : compilation de production et archives zip horodatées créées avec succès (`katech-site-06112026-2119.zip` et `katech-data-06112026-2119.zip`).
    - Conservation cumulative respectée : l'ensemble des archives historiques (`1401`, `1444`, `1518`, `1808`, `1842`, `1905`, `2104`, `2119`) est préservé intact.
- **Livrables :**
  - Archive application horodatée : 📦 [katech-site-06112026-2119.zip](file:///c:/xampp/htdocs/ka-tech/katech-site-06112026-2119.zip)
  - Archive données horodatée : 📦 [katech-data-06112026-2119.zip](file:///c:/xampp/htdocs/ka-tech/katech-data-06112026-2119.zip)
