# Plan 20 — Parachèvement Intégral : Contrat API home-reviews, Vitrine sur Base Vide, Parcours Clients et Toasts Admin 100% i18n

**Projet :** KA Tech (`amichiamine/ka-tech`)  
**Branche :** `main`  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Plan d'Implémentation (`mode plan`)  
**Date :** 5 Novembre 2026

---

## 1. Contexte & Problématique

Suite aux réussites des Phases 18 et 19 sur la vitrine principale, deux questions majeures ont émergé lors de l'audit en lecture seule :

1. **Warning Console Récurrent sur `home-reviews` :**
   ```
   log.ts:86 [data-provider] ressource « home-reviews » : réponse acceptée par le réseau mais inexploitable — réponse de type « tableau (0 entrée(s)) » là où le contrat annonce un objet paginé { items, total, page, perPage }.
   ```
   _Cause :_ Asymétrie de contrat entre le contrôleur backend PHP `ControleurContenu::lireHomeReviews` (qui renvoie `{"data":[]}`) et le composant de normalisation frontend `extraireItems` (qui attend `{ items: [...] }`). De plus, `ControleurMaintenance.php` purgeait la section sous forme de chaîne `'[]'`.
2. **Contenus résiduels et sections orphelines sur base de données purgée :**
   _Cause :_ `CategoryCards.tsx` n'avait pas de condition de garde `if (cats.length === 0) return null;` et affichait son titre au-dessus d'une grille vide. De plus, le parachute de secours (`FALLBACK_SITE_CONTENT`) injecte légitimement les textes éditoriaux par défaut de la boutique pour éviter l'écran blanc.
3. **Angles noirs multilingues résiduels :**
   Présence de chaînes codées en dur en français dans l'Espace Mon Compte (`Account.tsx`), le Suivi Public de Commande (`TrackOrder.tsx`), l'inscription (`Auth.tsx`), et les retours d'upload médias dans l'administration (`Settings.tsx`, `SettingsVisualEditors.tsx`).

---

## 2. Objectifs & Résultats Attendus

- [x] **0 warning console** au rechargement de l'accueil, y compris en base purgée.
- [x] **Contrat `home-reviews` blindé** côté backend PHP (`{ items, total, page, perPage }`) et côté frontend (`extraireItems` tolérant directement `Array.isArray`).
- [x] **Vitrine épurée et intelligente sur base vide** : `CategoryCards.tsx` s'efface silencieusement quand il n'y a aucune catégorie, sans laisser de titre orphelin.
- [x] **100% de couverture i18n sur les parcours clients** :
  - `Account.tsx` (modale de commande, récapitulatif, boutons, adresses).
  - `TrackOrder.tsx` (étapes de transport, mode de livraison, annulation, message marchand).
  - `Auth.tsx` (règle de validation du nom complet).
- [x] **Toasts d'administration 100% localisés** : upload médias logo/favicon et retours JSON.
- [x] **Parité 1:1:1 stricte vérifiée** par `bun run verifier-i18n` sur FR, EN, AR.
- [x] **CI inviolable au vert** : `bun run lint && bunx tsc --noEmit && bun run build`.

---

## 3. Découpage Chirurgical des Étapes

### Étape 20.A : Résolution Contrat API & Résilience `home-reviews`

1. **Backend PHP (`api/src/Controllers/ControleurContenu.php`) :**
   - Dans `lireHomeReviews()`, normaliser la réponse pour toujours encapsuler la liste dans un objet paginé conforme :
     ```php
     $items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : (is_array($payload) && array_is_list($payload) ? $payload : []);
     return Reponse::ok([
         'items'   => $items,
         'total'   => count($items),
         'page'    => 1,
         'perPage' => max(1, count($items)),
     ]);
     ```
2. **Backend PHP (`api/src/Controllers/ControleurMaintenance.php`) :**
   - Ajuster la réinitialisation de `home-reviews` pour écrire `'{"items":[]}'` plutôt que `'[]'`.
3. **Frontend (`src/data-provider/normalisation.ts`) :**
   - Dans `extraireItems()`, ajouter une tolérance directe : si `Array.isArray(valeur)`, retourner directement `valeur as T[]` sans déclencher de log d'avertissement.

### Étape 20.B : Vitrine Épurée sur Base Vide

1. **Composant `src/components/CategoryCards.tsx` :**
   - Ajouter la clause de garde `if (cats.length === 0) return null;` avant le rendu de la section, garantissant qu'aucun titre orphelin n'est affiché quand aucune catégorie n'est enregistrée en base.
2. **Composant `src/components/BuilderTeaser.tsx` :**
   - Vérifier si des produits sont présents avant de proposer le configurateur si le mode universel est actif.

### Étape 20.C : Localisation Intégrale Espace Client (`Account.tsx`)

1. **Clés i18n à créer dans `src/lib/i18n/fr.ts`, `en.ts`, `ar.ts` :**
   - `account.teamNote` : `"Note de l'équipe :"` / `"Team note:"` / `"ملاحظة الفريق:"`
   - `account.orderedArticles` : `"Articles commandés ({count})"` / `"Ordered items ({count})"` / `"المنتجات المطلوبة ({count})"`
   - `account.discount` : `"Remise"` / `"Discount"` / `"خصم"`
   - `account.delivery` : `"Livraison :"` / `"Delivery:"` / `"التوصيل:"`
   - `account.deliveryDesk` : `"Au bureau / Relais"` / `"Office / Relay point"` / `"المكتب / نقطة استلام"`
   - `account.deliveryHome` : `"À domicile"` / `"Home delivery"` / `"إلى المنزل"`
   - `account.wilayaLabel` : `"Wilaya"` / `"Wilaya"` / `"ولاية"`
   - `account.phoneLabel` : `"Téléphone :"` / `"Phone:"` / `"الهاتف:"`
   - `account.trackLive` : `"Suivre l'acheminement en direct"` / `"Track shipment live"` / `"تتبع الشحنة مباشرة"`
   - `common.close` : `"Fermer"` / `"Close"` / `"إغلاق"`
2. **Raccordement dans [`src/pages/Account.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Account.tsx) :**
   - Remplacement de l'ensemble des 8 chaînes en dur par les appels `t()`.

### Étape 20.D : Localisation Intégrale Suivi Public (`TrackOrder.tsx`)

1. **Clés i18n à créer dans `src/lib/i18n/fr.ts`, `en.ts`, `ar.ts` :**
   - `track.cancelledNotice` : `"Cette commande a été annulée. Contactez notre support si vous avez des questions."` / `"This order has been cancelled. Please contact support if you have any questions."` / `"تم إلغاء هذا الطلب. يرجى الاتصال بالدعم إذا كانت لديك أي أسئلة."`
   - `track.teamMessage` : `"Message de l'équipe"` / `"Team message"` / `"رسالة الفريق"`
   - `track.deliveryModeAndPlace` : `"Mode & Lieu de livraison"` / `"Delivery method & location"` / `"طريقة ومكان التوصيل"`
   - `track.deliveryDesk` : `"Livraison au bureau / Point relais"` / `"Office / Relay point delivery"` / `"توصيل إلى المكتب / نقطة استلام"`
   - `track.deliveryHome` : `"Livraison à domicile"` / `"Home delivery"` / `"توصيل إلى المنزل"`
   - `track.paymentMode` : `"Mode de paiement"` / `"Payment method"` / `"طريقة الدفع"`
   - `track.historySteps` : `"Historique des étapes"` / `"Status history"` / `"سجل المراحل"`
2. **Raccordement dans [`src/pages/TrackOrder.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/TrackOrder.tsx) :**
   - Remplacement des 7 chaînes en dur par `t()`.

### Étape 20.E : Assainissement Toasts Admin, Auth & Dictionnaire Arabe

1. **Validation Inscription (`src/pages/Auth.tsx`) :**
   - Créer `auth.err.name.tooShort` (`"2 caractères minimum"` / `"2 characters minimum"` / `"حرفان على الأقل"`) et l'injecter ligne 169.
2. **Toasts Upload Médias (`src/pages/admin/Settings.tsx`) :**
   - Créer les clés i18n dans `src/lib/i18n/admin/reglages/{fr,en,ar}.ts` :
     - `admin.reglages.parametres.toast_format_image_invalide`
     - `admin.reglages.parametres.toast_logo_succes`
     - `admin.reglages.parametres.toast_logo_echec`
     - `admin.reglages.parametres.toast_format_favicon_invalide`
     - `admin.reglages.parametres.toast_favicon_succes`
     - `admin.reglages.parametres.toast_favicon_echec`
     - `admin.reglages.parametres.toast_logo_defaut_retabli`
     - `admin.reglages.parametres.toast_favicon_defaut_retabli`
   - Raccorder `Settings.tsx`.
3. **Toasts Visual Editors & Wizard :**
   - Brancher `SettingsVisualEditors.tsx` et `SetupWizard.tsx` sur `t()`.
4. **Correction Variables Arabe (`src/lib/i18n/admin/systeme/ar.ts`) :**
   - Réintégrer la variable `{n}` dans les 10 clés de rapport système signalées par le linter.

### Étape 20.F : Vérification, Build & Traçabilité

1. `bun run verifier-i18n` : Vérification stricte de la parité à 100%.
2. `bun run format` : Formatage Prettier intégral.
3. `bun run lint && bunx tsc --noEmit && bun run build` : Compilation TypeScript & Vite irréprochable.
4. Packaging distribution statique zip.
5. Mise à jour de `tracabilites.md` et commit git versionné.

---

## 4. Matrice de Recette & Validation

| Test / Scénario                                    | Résultat Attendu                                                                                                     |
| :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Rechargement Accueil (Console)**                 | 0 warning `[data-provider] ressource « home-reviews »`.                                                              |
| **Accueil avec Base Purgée**                       | Pas de titre orphelin « Explorez nos univers » si 0 catégorie. Bandeau commerçant visible si admin connecté.         |
| **Espace Client (`/account`) en Anglais et Arabe** | Détail de commande, badges, adresses et notes 100% traduits dans la langue choisie. Alignement RTL parfait en arabe. |
| **Suivi de Colis (`/track`)**                      | Toutes les étapes, modes de livraison et avertissements traduits en FR, EN, AR.                                      |
| **Inscription (`/auth`)**                          | Message d'erreur de nom traduit en EN et AR.                                                                         |
| **Téléversement Logo / Favicon en Admin**          | Toasts de succès et d'erreur traduits via le dictionnaire de réglages.                                               |
| **Vérification CI Globale**                        | `verifier-i18n` = 0 clé manquante, `tsc --noEmit` = 0 erreur, `build` = succès.                                      |
