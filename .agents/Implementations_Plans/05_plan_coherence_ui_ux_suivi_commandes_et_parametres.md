# Plan d'Implémentation — Phase 05 : Cohérence UI/UX, Suivi Commandes, Signification Client & Éradication du Hard-coding

**Projet Hôte :** ka-tech  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 20 octobre 2026  
**Statut :** 📋 En attente de validation

---

## 1. Contexte & Objectifs

La Phase 04 a assaini l'authentification, les notifications back-office et la réinitialisation d'urgence. Cependant, le diagnostic approfondi mené avec ArchiSys3.0 a mis en lumière des déconnexions critiques et des manques fonctionnels majeurs :

1. **Alertes consoles résiduelles :** de nombreux dialogues (`Inventory`, `Payments`, `Messages`, `Shipping`, etc.) déclenchent l'avertissement Radix UI `Missing Description for DialogContent`. Le champ mot de passe de migration dans `/admin/developpeur` génère une violation DOM car il n'est pas dans un `<form>`.
2. **Absence de signification et de suivi des commandes côté client :** lorsqu'un administrateur change le statut d'une commande (`pending` → `processing` → `shipped` → `delivered`), **aucun courriel n'est envoyé au client, aucun événement Outbox n'est émis, et le client n'a aucun moyen de le savoir**. De plus, les commandes passées en invité (Guest) ne disposent d'aucune page de suivi public, et la vue commandes dans `/account` n'est pas détaillée.
3. **Hard-coding massif des devises et paramètres :** les réglages de devise de la boutique (`currencySymbol`, `currencyPosition`, `currencyThousandSeparator`) dans `/admin/settings` sont totalement ignorés par le site, qui utilise `formatDZD` et `" DA"` en dur dans plus de 50 fichiers. Le toggle du sélecteur de langue (`languageSelectorEnabled`) est également ignoré dans l'en-tête.
4. **Verrouillage du cache React Query :** un `staleTime` de 5 minutes retarde la visibilité des modifications faites dans l'administration sur la vitrine.

---

## 2. Périmètre d'Intervention & Fichiers Cibles

### Backend API (PHP)

- [api/src/Controllers/ControleurCommandes.php](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurCommandes.php) :
  - Dans `changerStatut()` : émettre l'événement Outbox `order.status_updated` et déclencher la notification par courriel au client avec le nouveau statut et la note éventuelle.
  - Ajouter l'action publique `suivre(Requete $r)` pour la route `GET /orders/track?id=...&phone=...` (accès public sécurisé par ID + téléphone sans exiger de compte admin).
- [api/src/Courriel.php](file:///c:/xampp/htdocs/ka-tech/api/src/Courriel.php) :
  - Ajouter le template et la méthode d'envoi de mise à jour de statut commande (`envoyerMiseAJourStatutCommande(...)`).
- [api/public/index.php](file:///c:/xampp/htdocs/ka-tech/api/public/index.php) :
  - Déclarer la route publique `GET /orders/track`.

### Frontend (React / TypeScript)

- [src/components/ui/dialog.tsx](file:///c:/xampp/htdocs/ka-tech/src/components/ui/dialog.tsx) :
  - Passer `aria-describedby={props["aria-describedby"] ?? undefined}` pour désactiver automatiquement l'avertissement Radix UI sur toutes les modales sans description textuelle.
- [src/pages/admin/Developpeur.tsx](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Developpeur.tsx) :
  - Envelopper le formulaire de mot de passe de migration dans un `<form onSubmit={...}>`.
- [src/lib/format-price.ts](file:///c:/xampp/htdocs/ka-tech/src/lib/format-price.ts) _(Nouveau)_ :
  - Créer l'utilitaire universel réactif `useFormatPrice()` et fonction helper branchés sur `siteSettings` (`currencySymbol`, `currencyPosition`, `currencyThousandSeparator`).
- [src/data/products.ts](file:///c:/xampp/htdocs/ka-tech/src/data/products.ts) :
  - Adapter `formatDZD` pour qu'il consomme la devise configurée ou serve de repli propre sans rupture de signature.
- [src/components/ThemeLanguageToggles.tsx](file:///c:/xampp/htdocs/ka-tech/src/components/ThemeLanguageToggles.tsx) :
  - Conditionner le rendu du `LanguageToggle` à `siteSettings.languageSelectorEnabled`.
- [src/pages/TrackOrder.tsx](file:///c:/xampp/htdocs/ka-tech/src/pages/TrackOrder.tsx) _(Nouveau)_ :
  - Page publique `/track` (ou `/suivi`) permettant à tout client (invité ou connecté) de saisir son N° de commande et son numéro de téléphone pour voir l'avancement en temps réel avec timeline visuelle.
- [src/pages/Account.tsx](file:///c:/xampp/htdocs/ka-tech/src/pages/Account.tsx) :
  - Rendre les cartes de commande cliquables avec ouverture d'une modale de détail complet (lignes d'articles, prix, mode de livraison, adresse, note et chronologie d'avancement).
- [src/components/Footer.tsx](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx) :
  - Ajouter le lien vers la page de suivi de commande dans le pied de page.
- [src/App.tsx](file:///c:/xampp/htdocs/ka-tech/src/App.tsx) :
  - Déclarer la route `/track` et `/suivi`.
- [src/data-provider/use-resource.ts](file:///c:/xampp/htdocs/ka-tech/src/data-provider/use-resource.ts) :
  - Invalider immédiatement le cache lors des mutations de `site-settings` et `site-content`.

---

## 3. Déroulement Chronologique des Étapes

### Étape 1 : Assainissement Universel des Alertes Console & Violations DOM

1. Modifier [src/components/ui/dialog.tsx](file:///c:/xampp/htdocs/ka-tech/src/components/ui/dialog.tsx) :
   - Dans `DialogContent`, passer explicitement `aria-describedby={props["aria-describedby"] ?? undefined}` à `DialogPrimitive.Content`.
2. Modifier [src/pages/admin/Developpeur.tsx](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Developpeur.tsx) :
   - Envelopper la zone de mot de passe de migration dans un `<form onSubmit={(e) => { e.preventDefault(); lancerMigration(); }}>`.

### Étape 2 : Signification Client & Suivi des Commandes Backend

1. Dans [api/src/Courriel.php](file:///c:/xampp/htdocs/ka-tech/api/src/Courriel.php) :
   - Implémenter le gabarit d'e-mail multilingue informant le client de la mise à jour de sa commande : nouveau statut, libellé traduit, note du marchand, récapitulatif et lien direct de suivi.
2. Dans [api/src/Controllers/ControleurCommandes.php](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurCommandes.php) :
   - Mettre à jour `changerStatut()` :
     - Déposer un événement outbox `order.status_updated` avec les données client et nouveau statut.
     - Déclencher l'envoi de l'e-mail de notification via la fonction de fermeture (`register_shutdown_function`) afin de garantir zéro latence pour l'admin.
   - Ajouter la méthode `suivre(Requete $r)` :
     - Reçoit `id` et `phone` (ou `email`).
     - Vérifie la correspondance stricte et renvoie les données publiques de la commande (statut, timeline, articles sans données sensibles).
3. Dans [api/public/index.php](file:///c:/xampp/htdocs/ka-tech/api/public/index.php) :
   - Enregistrer la route `GET /orders/track`.

### Étape 3 : Interface de Suivi & Vue Détaillée de Commande Client

1. Créer [src/pages/TrackOrder.tsx](file:///c:/xampp/htdocs/ka-tech/src/pages/TrackOrder.tsx) :
   - Formulaire de recherche (N° de commande + Téléphone).
   - Visualisation de la progression sous forme de stepper visuel (Validée → En préparation → Expédiée → Livrée).
   - Affichage des notes de suivi et de la date estimée.
2. Déclarer la route dans [src/App.tsx](file:///c:/xampp/htdocs/ka-tech/src/App.tsx) (`/track` et `/suivi`) et ajouter le lien dans [Footer.tsx](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx).
3. Améliorer [src/pages/Account.tsx](file:///c:/xampp/htdocs/ka-tech/src/pages/Account.tsx) :
   - Rendre chaque commande cliquable avec dialogue affichant l'intégralité des détails de la commande et son historique d'avancement.

### Étape 4 : Fin du Hard-coding Devise, Prix & Sélecteur de Langue

1. Créer [src/lib/format-price.ts](file:///c:/xampp/htdocs/ka-tech/src/lib/format-price.ts) :
   - Fournir `useFormatPrice()` qui utilise `siteSettings` pour formater tout montant selon les choix de l'admin (symbole, préfixe/suffixe, séparateur).
2. Adapter [src/data/products.ts](file:///c:/xampp/htdocs/ka-tech/src/data/products.ts) :
   - Conserver `formatDZD` comme passerelle propre vers le formateur par défaut ou dynamique.
3. Modifier [src/components/ThemeLanguageToggles.tsx](file:///c:/xampp/htdocs/ka-tech/src/components/ThemeLanguageToggles.tsx) :
   - Masquer `LanguageToggle` si `siteSettings.languageSelectorEnabled` est explicitement à `false`.
4. Invalidation de cache React Query :
   - Dans `site-settings.ts` et `site-content.ts`, invalider immédiatement les caches pour rafraîchissement temps réel de la vitrine lors de toute sauvegarde.

---

## 4. Matrice de Recette & Vérifications

| N°     | Vérification                            | Méthode de validation                                                           | Résultat attendu                                    |
| :----- | :-------------------------------------- | :------------------------------------------------------------------------------ | :-------------------------------------------------- |
| **T1** | Disparition des alertes `DialogContent` | Navigation console sur `/admin/inventory`, `/admin/payments`, `/admin/messages` | 0 warning Radix UI                                  |
| **T2** | Disparition violation DOM Password      | Navigation sur `/admin/developpeur`                                             | 0 violation DOM password                            |
| **T3** | Notification client changement statut   | Admin change le statut d'une commande de `pending` à `shipped`                  | E-mail de notification émis + événement outbox      |
| **T4** | Page de suivi public `/track`           | Saisie d'un ID commande et téléphone valide                                     | Stepper d'avancement visible avec dates et articles |
| **T5** | Détail commande client `/account`       | Clic sur une commande dans l'espace client                                      | Modale détaillée affichant la commande complète     |
| **T6** | Réglage devise effectif                 | Modification du symbole en "DZD" ou "DA" dans `/admin/settings`                 | Pris en compte sur les prix et le panier            |
| **T7** | Toggle langue fonctionnel               | Décocher "Activer le sélecteur de langue"                                       | Sélecteur masqué dans l'en-tête                     |
| **T8** | Intégrité Build & TypeScript            | `bun run lint && bunx tsc --noEmit && bun run build`                            | 0 erreur, compilation propre                        |

---

## 5. Traçabilité & Parité

- Fichier miroir : 📄 [`.agents/Implementations_Plans/05_plan_coherence_ui_ux_suivi_commandes_et_parametres.md`](file:///c:/xampp/htdocs/ka-tech/.agents/Implementations_Plans/05_plan_coherence_ui_ux_suivi_commandes_et_parametres.md)
- Journal officiel : [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (création de la section Phase 05)
