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

## 3. Recette de réplication

À appliquer telle quelle sur chaque page de `src/pages/admin/`.
Référence vivante : `src/pages/admin/Products.tsx`.

### 3.1 Import et hook

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

### 3.2 Les trois niveaux — les trois sont obligatoires

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

### 3.3 Correspondance action → clé

| Élément d'interface                              | Clé                      |
| ------------------------------------------------ | ------------------------ |
| Bouton « Nouveau… », duplication, import         | `create`                 |
| Icône crayon, bascule de statut, champ éditable  | `update`                 |
| Icône corbeille, « Vider », suppression en masse | `delete`                 |
| Écran `/admin/users` (mutations)                 | `manageUsers`            |
| Écran `/admin/settings`, livraison, paiements    | `manageSettings`         |
| Maintenance, données de démonstration            | `manageCriticalSettings` |
| Écran `/admin/reset`                             | `resetData`              |

### 3.4 Pièges à éviter

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

### 3.5 Vérification avant commit

```bash
bunx tsc --noEmit
bunx eslint <fichiers modifiés>
bunx prettier --check <fichiers modifiés>   # relancer après --write, non idempotent
```

Contrôle fonctionnel : avec le sélecteur en DEV, passer de `Propriétaire` à
`Lecteur` — toutes les actions doivent se désactiver avec une infobulle, et
aucune mutation ne doit passer.
