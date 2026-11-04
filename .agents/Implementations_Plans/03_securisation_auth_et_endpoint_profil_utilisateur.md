# PLAN D'IMPLÉMENTATION CONSOLIDÉ — PHASE 03

## Sécurisation Auth, Éradication des Stubs HTTP (`updateProfile` & `setPassword`), Transparence SQL & Intégrité des Mutations

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode d'Action :** Mode Plan  
**Statut :** En attente de validation finale d'ArchiSys3.0

---

## 1. Contexte & Problématique Métier

Suite aux tests terrain et retours d'ArchiSys3.0, quatre anomalies critiques interdépendantes ont été formellement diagnostiquées et validées :

1. **Fuite du mot de passe dans le DOM sur `/auth` :** Après déconnexion d'un compte (admin ou client), le mot de passe précédemment saisi persistait dans la propriété `value` de l'élément `<input type="password">` car le state React `password` n'était jamais réinitialisé à vide lors du succès ni au démontage du composant. De plus, l'absence d'attributs HTML standards (`autoComplete`, `name`, `id`) déclenchait un warning DOM Chromium.
2. **Échec de la sauvegarde du profil ("Erreur lors de la sauvegarde du profil") sur `/account` :** L'appel `updateProfile` échouait systématiquement en mode HTTP car [`src/data-provider/auth.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/auth.ts#L488) levait une exception `throw new Error(...)` résiduelle, faute de endpoint serveur dédié `PATCH /auth/profile` pour les utilisateurs connectés.
3. **Blocage du changement de mot de passe utilisateur par l'admin & création incomplète ("demi-travail") sur `/admin/users` :**
   - Lorsqu'un administrateur crée ou modifie un utilisateur avec un mot de passe, [`src/pages/admin/Users.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Users.tsx#L140) appelle d'abord `create()` ou `update()`, puis `setPassword(email, password)`.
   - Or, [`src/api/resources/users.ts:81`](file:///c:/xampp/htdocs/ka-tech/src/api/resources/users.ts#L81) jette l'exception bloquante :
     `[usersApi.setPassword] Non disponible en mode http avant la phase 4. Le changement de mot de passe côté serveur sera câblé via endpoints.auth.changePassword...`
   - **Conséquence directe :** L'utilisateur est créé en base avec le marqueur inactif `!!non-defini!!`, mais le mot de passe échoue. L'opération s'interrompt en affichant un toast d'erreur rouge, laissant un compte à moitié configuré et inutilisable ("demi-travail" constaté par ArchiSys3.0).
   - **Opportunité architecturale :** Le backend PHP dispose **déjà** de la route opérationnelle `PATCH /admin/users/:id/password` déclarée dans [`api/routes.php:143`](file:///c:/xampp/htdocs/ka-tech/api/routes.php#L143) et implémentée dans [`ControleurUtilisateurs::changerMotDePasse`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurUtilisateurs.php#L389). Il s'agit uniquement d'un défaut de câblage côté front-end.
4. **Masquage opaque des erreurs SQL dans [`Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) :**
   - Toute défaillance de requête SQL préparée est interceptée par un `catch (PDOException $e)` qui lève génériquement `500 DATABASE_ERROR : Erreur de base de données.`.
   - En environnement de test ou de développement, ce masquage prive le développeur et le directeur de projet de la cause racine réelle (ex: contrainte de clé unique, champ NOT NULL manquant, table SQLite verrouillée `SQLITE_BUSY`).

---

## 2. Objectifs Techniques du Chantier

1. **Assainissement et Sécurité du Formulaire `/auth` :**
   - Purger systématiquement le state `password` à la soumission réussie, lors de la bascule signin/signup, et au démontage du composant via un cleanup `useEffect`.
   - Qualifier l'ensemble des inputs avec leurs attributs sémantiques : `name`, `id`, `autoComplete="current-password"` (ou `"new-password"`), `autoComplete="username"`, `autoComplete="name"`.
2. **Backend PHP — Route de Mise à Jour du Profil Personnel (`PATCH /auth/profile`) :**
   - Déclarer la route `PATCH /auth/profile` dans [`api/routes.php`](file:///c:/xampp/htdocs/ka-tech/api/routes.php), protégée par session active (`Garde::protegeConnecte(...)`).
   - Implémenter la méthode `mettreAJourProfil(Requete $r)` dans [`api/src/Controllers/ControleurAuth.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurAuth.php) :
     - Validation des champs (`name` obligatoire, `phone` optionnel normalisé).
     - Mise à jour atomique de `users` pour l'utilisateur connecté (`Session::id()`).
     - Mise à jour conjointe de `customers` pour garantir la synchronisation CRM.
     - Rafraîchissement de la session PHP via `Session::actualiser()`.
     - Réponse standard `200 { data: AuthSession }`.
3. **Frontend — Câblage de `updateProfile` (Profil Personnel) :**
   - Déclarer le endpoint `profile: () => '/auth/profile'` dans [`src/api/endpoints.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/endpoints.ts).
   - Ajouter `updateProfile(input)` dans [`src/api/resources/auth.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/resources/auth.ts).
   - Remplacer le `throw new Error(...)` dans [`src/data-provider/auth.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/auth.ts) par l'appel à `authApi.updateProfile()`.
4. **Frontend & Endpoints — Câblage de `usersApi.setPassword` (Mots de Passe Admin) :**
   - Déclarer le endpoint `setPassword: (id: string) => `/admin/users/${id}/password`` dans [`src/api/endpoints.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/endpoints.ts) sous `endpoints.users`.
   - Mettre à jour [`src/api/resources/users.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/resources/users.ts) :
     - Méthode `setPassword(target: { id?: string; email: string }, password: string)` (ou résolution automatique de l'ID via la liste des utilisateurs si seul l'e-mail est passé).
     - En mode HTTP : appel effectif à `http.patch<void>(endpoints.users.setPassword(userId), { password })`.
     - En mode Mock : délégation inchangée à `setUserPassword(email, password)`.
   - Ajuster [`src/pages/admin/Users.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Users.tsx) pour passer l'ID de l'utilisateur créé ou modifié directement à `setPassword`.
5. **Backend PHP — Transparence SQL en Mode Développement dans [`Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) :**
   - Dans le `catch (PDOException $e)` de `Db::run()`, vérifier si l'application s'exécute en mode non-production ou avec `APP_DEBUG=true` (ou `SMTP_SIMULATE=1` / serveur local).
   - Si mode dev : inclure la cause technique réelle dans le message (`"Erreur de base de données : " . $e->getMessage()`).
   - Si production : conserver le message générique strict pour éviter toute fuite de schéma vers l'extérieur.
6. **Validation Globale & Non-Régression :**
   - Vérifier la chaîne complète `bun run lint && bunx tsc --noEmit && bun run build`.
   - Tester en direct la mise à jour de profil et la création d'utilisateur admin avec mot de passe.

---

## 3. Découpage Opérationnel par Étapes Chirurgicales

### Étape 1 : Assainissement et Sécurisation de `src/pages/Auth.tsx`

- Purge de sécurité :
  - `setPassword("")` immédiat dès que l'authentification réussit (dans le bloc `try` juste après `signIn`/`signUp`).
  - Ajout d'un cleanup `useEffect(() => () => setPassword(""), [])` au démontage de la page.
  - Réinitialisation de `password` lors du clic sur le basculeur de mode (`setMode`).
- Ajout des attributs HTML requis par les standards du navigateur :
  - Champ Email : `id="auth-email" name="email" autoComplete="username"`
  - Champ Password : `id="auth-password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}`
  - Champ Nom : `id="auth-name" name="name" autoComplete="name"`

### Étape 2 : Implémentation Backend de `PATCH /auth/profile`

- Dans [`api/src/Controllers/ControleurAuth.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurAuth.php) :
  - Méthode `public function mettreAJourProfil(Requete $r): Reponse`.
  - Contrôle d'authentification (`Session::id()`).
  - Validation du nom (`trim`) et normalisation du téléphone.
  - Exécution SQL transactionnelle :
    ```sql
    UPDATE users SET name = :name, phone = :phone, updated_at = :now WHERE id = :id;
    UPDATE customers SET name = :name, phone = :phone, updated_at = :now WHERE email = :email;
    ```
  - Actualisation de la session active : `Session::actualiser(['name' => $nom, 'phone' => $phone]);`.
  - Retour du DTO de session actualisé `Reponse::ok($this->sessionDto($ligneActualisee));`.
- Dans [`api/routes.php`](file:///c:/xampp/htdocs/ka-tech/api/routes.php) :
  - `$routeur->patch('/auth/profile', Garde::protegeConnecte([$auth, 'mettreAJourProfil']));`

### Étape 3 : Câblage Frontend du Profil Client

- Dans [`src/api/endpoints.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/endpoints.ts) :
  - `profile: () => '/auth/profile',` sous la section `auth`.
- Dans [`src/api/resources/auth.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/resources/auth.ts) :
  - `updateProfile: (input: { name: string; phone?: string }) => http.patch<AuthSession>(E.auth.profile(), input)`
- Dans [`src/data-provider/auth.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/auth.ts) :
  - Remplacer l'exception de `updateProfile` par l'appel à `authApi.updateProfile({ name: input.name, phone: input.phone })`.
  - Rafraîchir l'état de session utilisateur avec le retour.

### Étape 4 : Câblage Complet du Mot de Passe Admin (`usersApi.setPassword`)

- Dans [`src/api/endpoints.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/endpoints.ts) :
  - Ajouter `setPassword: (id: string) => `/admin/users/${id}/password``sous`users`.
- Dans [`src/api/resources/users.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/resources/users.ts) :
  - Adapter `setPassword(emailOrId: string, password: string, explicitId?: string)` :
    - En mode HTTP : si `explicitId` est fourni, l'utiliser ; sinon rechercher l'ID utilisateur correspondant à l'email (via `getAdminSnapshot().users` ou appel liste), puis exécuter :
      `await http.patch<void>(E.users.setPassword(userId), { password });`
    - En mode Mock : exécuter `setUserPassword(email, password)`.
- Dans [`src/data-provider/users.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/users.ts) :
  - Exposer `setPassword: (email: string, password: string, id?: string) => Promise<void>`.
- Dans [`src/pages/admin/Users.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Users.tsx) :
  - Lors de la création : récupérer l'ID généré (`payload.id`) et appeler `await setPassword(p.data.email, p.data.password, payload.id)`.
  - Lors de la modification : appeler `await setPassword(p.data.email, p.data.password, v.id)`.
  - Résultat : 0 interruption, 0 demi-travail, le mot de passe est enregistré et actif immédiatement.

### Étape 5 : Transparence des Exceptions SQL dans `Db.php`

- Dans [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php#L363) :
  - Détecter le contexte d'exécution : `Env::get('APP_ENV') !== 'production' || Env::get('APP_DEBUG') === 'true' || Env::get('SMTP_SIMULATE') === '1'`.
  - En mode dev/local : `throw new ApiException(500, 'DATABASE_ERROR', 'Erreur SQL : ' . $e->getMessage(), [], $e);`.
  - En mode prod : conserver `'Erreur de base de données.'` pour sécurité absolue.

### Étape 6 : Recette, Build & Traçabilité

- Validation de la compilation : `bunx tsc --noEmit && bun run build`.
- Vérification du package zip horodaté généré.
- Consignation chronologique dans [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).

---

## 4. Matrice de Recette & Critères d'Acceptance

| Point de Contrôle              | Condition de Succès                                                  | Méthode de Vérification                                          |
| :----------------------------- | :------------------------------------------------------------------- | :--------------------------------------------------------------- |
| **Fuite Password DOM**         | Le champ password est purgé à la déconnexion et au démontage         | Inspection de `input[type="password"]` sur `/auth`               |
| **Warning DOM Chromium**       | Aucun warning `Input elements should have autocomplete attributes`   | Console DevTools 100% propre                                     |
| **Sauvegarde Profil**          | La sauvegarde réussit et affiche "Modifications enregistrées"        | Test sur `/account` avec compte client                           |
| **Persistance Profil BDD**     | `users.name` et `users.phone` sont persistés                         | Requête SQLite directe sur la table `users`                      |
| **Création Utilisateur Admin** | L'utilisateur ET son mot de passe sont enregistrés sans demi-travail | Création d'un admin test sur `/admin/users` + connexion réussie  |
| **Transparence SQL Dev**       | En cas d'erreur SQL en dev, le message précis de PDO est visible     | Test d'une requête volontairement altérée en environnement local |
| **Contrôle Qualité Build**     | 0 erreur TypeScript, 0 erreur de build                               | Exécution de `bun run build`                                     |
