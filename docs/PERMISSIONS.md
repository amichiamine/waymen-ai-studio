# Permissions du back-office

> **Source de vérité du motif de permissions.** Toute page de `src/pages/admin/`
> doit s'y conformer. Le socle est `src/lib/admin-auth.tsx` ; la page de
> référence — celle qu'il faut copier-adapter — est
> `src/pages/admin/Products.tsx`.

---

## 1. D'où vient le rôle

Trois notions à ne jamais confondre :

| Notion            | Origine                                                                           | Fait autorité ?                       |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| **Rôle réel**     | Entrée de la table `users` correspondant à l'email authentifié (`useAdminRoles`)  | **Oui**                               |
| **Rôle simulé**   | Sélecteur « Rôle actif » de l'en-tête → localStorage `katech.admin.activeRole.v1` | Non — confort de démonstration        |
| **Rôle effectif** | Ce que l'interface applique (`useEffectiveRole`)                                  | Oui — c'est lui que `can()` interroge |

Règle de calcul du rôle effectif :

- **En production** : rôle effectif = rôle réel, point final. Le sélecteur est
  masqué et sa valeur ignorée.
- **En développement** (`import.meta.env.DEV`) : rôle effectif = le **plus
  faible** du rôle réel et du rôle simulé. La simulation peut donc uniquement
  **rétrograder** (tester l'écran d'un `viewer` depuis un compte `owner`),
  jamais élever.
- **Sans entrée `users`** : repli sur `viewer` (moindre privilège), et non sur
  le `"owner"` de repli de `getActiveRole()`.

> **Pourquoi cette gymnastique.** `canPerform(min)` de `admin-store.tsx` prend
> par défaut `getActiveRole()`, une clé localStorage librement modifiable qui
> vaut `"owner"` par défaut. L'appeler sans second argument produirait une
> sécurité purement décorative. `canPerform` reste la primitive de comparaison
> de rangs — on ne la modifie pas, on lui passe désormais le bon rôle.

---

## 2. Matrice des permissions

| Action                                    | Clé                      | Rôle minimum | viewer | editor | admin | owner |
| ----------------------------------------- | ------------------------ | ------------ | :----: | :----: | :---: | :---: |
| Lire (listes, fiches, tableaux, journaux) | `read`                   | `viewer`     |   ✅   |   ✅   |  ✅   |  ✅   |
| Créer du contenu                          | `create`                 | `editor`     |   ❌   |   ✅   |  ✅   |  ✅   |
| Modifier du contenu                       | `update`                 | `editor`     |   ❌   |   ✅   |  ✅   |  ✅   |
| Supprimer une entité                      | `delete`                 | `admin`      |   ❌   |   ❌   |  ✅   |  ✅   |
| Gérer les utilisateurs et leurs rôles     | `manageUsers`            | `owner`      |   ❌   |   ❌   |  ❌   |  ✅   |
| Modifier les réglages courants            | `manageSettings`         | `admin`      |   ❌   |   ❌   |  ✅   |  ✅   |
| Modifier les réglages critiques           | `manageCriticalSettings` | `owner`      |   ❌   |   ❌   |  ❌   |  ✅   |
| Réinitialiser les données                 | `resetData`              | `owner`      |   ❌   |   ❌   |  ❌   |  ✅   |

Périmètres :

- **Contenu** (`create` / `update`) : produits, catégories, marques, blog,
  médias, avis, coupons, contenu du site, stock, statuts de commande.
- **Réglages courants** (`manageSettings`) : boutique, livraison, paiements,
  notifications, coordonnées.
- **Réglages critiques** (`manageCriticalSettings`) : mode maintenance, données
  de démonstration, tout ce qui coupe le site public ou touche à la sécurité.

### Justification des cas limites

1. **La suppression est à `admin`, pas à `editor`.** Le magasin est local
   (`localStorage`) : il n'y a ni corbeille ni restauration. Une suppression est
   définitive, donc elle sort du travail éditorial courant. C'est le repère
   explicite du cadrage et la ligne la plus structurante de la matrice.
2. **Les réglages sont scindés en deux.** La barre latérale expose déjà
   `/admin/settings` à partir de `admin` : refuser toute écriture à un `admin`
   lui donnerait un écran mort. On garde donc les réglages courants à `admin` et
   on réserve à `owner` les seuls leviers dont l'effet dépasse le back-office
   (maintenance, données de démonstration).
3. **`manageUsers` est à `owner` alors que la barre latérale ouvre
   `/admin/users` à `admin`.** C'est volontaire : un `admin` peut **consulter**
   l'annuaire (`read`), mais seul un `owner` peut créer un compte ou changer un
   rôle. Sans cela, un `admin` se promeut `owner` en deux clics et la hiérarchie
   ne veut plus rien dire. La page reste accessible, en lecture seule.
4. **`viewer` n'entre pas dans le back-office.** `useAdminRoles().isAdmin`
   exclut déjà `viewer` de `/admin` (`src/App.tsx`). Le niveau `viewer` sert
   donc surtout de plancher de repli et de cible de simulation en DEV.
5. **Additivité.** Un `owner` conserve exactement les capacités d'avant
   l'introduction du motif : aucune permission n'est retirée au sommet.

---

## 3. Règles de sécurité des routes API — décisions et justifications

### 3.1 `GET /orders/:id` — garde `protegeConnecte`, non `protege('read')`

**Contexte.** Avant la vague 4.10, cette route était gardée par `protege('read')`, qui exige le rang `viewer` (back-office). Un client authentifié voyait ses commandes dans `/me/orders` mais recevait `403` sur `/orders/<son-id>`. Conséquence concrète : `/checkout/success` était cassée pour tous les clients.

**Décision.** La garde est abaissée à `protegeConnecte` sur la route. La logique d'accès est descendue dans `ControleurCommandes::detail()` via `Garde::exigerAppartenanceOu('read', …)`.

**Conséquences.**

| Appelant                        | Code reçu | Raison                                                                                                 |
| ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| Anonyme                         | 401       | `protegeConnecte` rejette sans session                                                                 |
| Client — sa propre commande     | 200       | `commandeAppartientAuCompte()` retourne `true`                                                         |
| Client — commande d'autrui      | 403       | `commandeAppartientAuCompte()` retourne `false`, puis `exigerAppartenanceOu` applique le rang `viewer` |
| Viewer / Editor / Admin / Owner | 200       | Rang `viewer` atteint, comportement back-office inchangé                                               |

Vérifié sur les trois moteurs le 9 août 2026, via l'API SQLite au port 8330.

**Pourquoi `PATCH /orders/:id/status` et `DELETE /orders/:id` restent `protege('update')` et `protege('delete')`.** Modifier le statut d'une commande ou la supprimer sont des gestes de back-office, pas des gestes de client. Un client qui changerait lui-même son statut de `pending` à `delivered` contournerait le flux logistique. Ces deux routes conservent donc le garde-rangée élevé.

### 3.2 `POST /builds` — garde `protegeConnecte`

**Contexte.** La route existante `POST /products` est gardée par `protege('create')` (rang `editor`). Un client authentifié obtenait 403 en utilisant le configurateur.

**Décision.** Une route dédiée `POST /builds`, gardée par `protegeConnecte` (rang `customer` suffit). Le prix n'est jamais lu depuis la requête : il est recalculé côté serveur depuis `site_content.builder`. Un accès anonyme est refusé pour éviter de remplir la table `products` sans recours.

**Conséquences.** Un client authentifié peut matérialiser sa configuration. Un anonyme reçoit 401.

### 3.3 `POST /notion/webhook` — porte publique non authentifiée par session

**Contexte.** Notion appelle cette route depuis ses propres serveurs, sans cookie, sans session. Exiger une session PHP la rendrait inutilisable par Notion.

**Décision.** La route est publique au sens des gardes de session. La sécurité repose exclusivement sur la vérification de la signature `X-Notion-Signature` (HMAC-SHA256) dans `ControleurNotionWebhook::recevoir()`. C'est la seule porte d'écriture non authentifiée par session de toute l'API.

**Ce n'est pas un oubli.** C'est un choix documenté ici et dans `api/routes.php` (commentaire de bloc). Toute tentative future de « corriger » cette route en ajoutant une garde de session la casserait silencieusement — Notion recevrait 401 et cesserait de rejouer le webhook.

**Conséquences.** Un appel sans signature valide reçoit 401. Un appel avec une page inconnue de `notion_links` est ignoré sans erreur. Aucun secret en clair ne transite : le `webhookSecret` est chiffré en AES-256-GCM dans `settings` (voir `docs/NOTION.md §5`).

---

## 4. Recette de réplication

À appliquer telle quelle sur chaque page de `src/pages/admin/`.
Référence vivante : `src/pages/admin/Products.tsx`.

À appliquer telle quelle sur chaque page de `src/pages/admin/`.
Référence vivante : `src/pages/admin/Products.tsx`.

### 4.1 Import et hook

```tsx
import { usePermissions } from "@/lib/admin-auth";

export default function AdminXxx() {
  const { can, guard, denyReason } = usePermissions();
  // …
}
```

`can(x)` accepte soit une clé de la matrice (`can("delete")` — à privilégier),
soit directement un rôle plancher (`can("admin")`) quand l'action n'entre dans
aucune catégorie. Les deux jeux de littéraux sont disjoints, donc sans ambiguïté.

### 4.2 Les trois niveaux — les trois sont obligatoires

**Niveau 1 — affichage.** Désactiver (de préférence) ou masquer les actions
interdites.

```tsx
<AdminPageShell
  title="Xxx"
  actions={
    can("create") ? (
      <Link to="/admin/xxx/new">
        <Button>
          <Plus className="me-2 h-4 w-4" /> Nouvel élément
        </Button>
      </Link>
    ) : (
      // Le <span> porte l'infobulle : un bouton `disabled` a
      // `pointer-events-none`, il n'affiche donc jamais son propre `title`.
      <span title={denyReason("create")} className="inline-flex">
        <Button disabled>
          <Plus className="me-2 h-4 w-4" /> Nouvel élément
        </Button>
      </span>
    )
  }
>
```

**Niveau 2 — action.** Le handler vérifie lui-même, avant toute mutation. Le
masquage visuel n'est pas une protection : la route directe, un raccourci
clavier ou une simulation qui change en cours de route le contournent.

```tsx
function confirmDelete() {
  if (!toDelete) return;
  if (!guard("delete", "Supprimer l'élément")) return; // toast.error explicite
  deleteXxx(toDelete.id);
  toast.success(`« ${toDelete.name} » supprimé`);
}
```

Le second argument de `guard` est facultatif : il préfixe le message
(`« Supprimer l'élément » : action réservée au rôle Administrateur ou supérieur.`).

**Niveau 3 — ergonomie.** Un bouton désactivé explique toujours pourquoi.

```tsx
<span title={denyReason("delete") ?? "Supprimer"} className="inline-flex">
  <Button variant="ghost" size="icon" disabled={!can("delete")} onClick={…}>
    <Trash2 className="h-4 w-4 text-destructive" />
  </Button>
</span>
```

### 4.3 Correspondance action → clé

| Élément d'interface                              | Clé                      |
| ------------------------------------------------ | ------------------------ |
| Bouton « Nouveau… », duplication, import         | `create`                 |
| Icône crayon, bascule de statut, champ éditable  | `update`                 |
| Icône corbeille, « Vider », suppression en masse | `delete`                 |
| Écran `/admin/users` (mutations)                 | `manageUsers`            |
| Écran `/admin/settings`, livraison, paiements    | `manageSettings`         |
| Maintenance, données de démonstration            | `manageCriticalSettings` |
| Écran `/admin/reset`                             | `resetData`              |

### 4.4 Pièges à éviter

- **Ne jamais appeler `canPerform()` sans second argument** dans une page :
  c'est le sélecteur de démonstration qui répondrait. Passer par
  `usePermissions()`, toujours.
- **Ne pas inventer de seuil local.** Un besoin non couvert = une entrée à
  ajouter à `PERMISSION_MATRIX`, pas un `role === "admin"` dans un composant.
- **Ne pas supprimer une fonctionnalité existante** : pour un `owner`, l'écran
  doit se comporter exactement comme avant.
- **Ne pas mettre `title` sur un bouton `disabled`** (voir §3.2) : envelopper
  dans un `<span title=…>`.
- **Chaînes en français**, l'admin n'est pas internationalisé (choix assumé) ;
  alignement en `text-start` / `text-end`, jamais `left` / `right`.

### 4.5 Vérification avant commit

```bash
bunx tsc --noEmit
bunx eslint <fichiers modifiés>
bunx prettier --check <fichiers modifiés>   # relancer après --write, non idempotent
```

Contrôle fonctionnel : avec le sélecteur en DEV, passer de `Propriétaire` à
`Lecteur` — toutes les actions doivent se désactiver avec une infobulle, et
aucune mutation ne doit passer.
