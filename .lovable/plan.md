# Lot 2 — Internationaliser les pages secondaires et les données mock

## Objectif

Compléter le travail commencé dans Lot 1 en rendant toutes les pages visiteur (hors admin) pleinement multilingues FR/EN/AR, et en fournissant les traductions pour les données mock produits/blog.

## Fichiers concernés

### Pages à internationaliser avec `t("...")`

- `src/pages/About.tsx`
- `src/pages/Contact.tsx`
- `src/pages/Blog.tsx`
- `src/pages/BlogArticle.tsx`
- `src/pages/Cart.tsx`
- `src/pages/Checkout.tsx`
- `src/pages/CheckoutSuccess.tsx`
- `src/pages/Favorites.tsx`
- `src/pages/Search.tsx`
- `src/pages/Account.tsx`
- `src/pages/Auth.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/NotFound.tsx`

### Données mock

- `src/data/products.ts` — champs `name`, `description`, `title`, `excerpt` en `Localized<string>` avec EN/AR.
- Fichiers blog mock équivalents.

### Fondations i18n

- `src/lib/i18n.tsx` — ajouter toutes les clés `t()` manquantes aux 3 dictionnaires FR/EN/AR.
- `src/lib/site-content.ts` — vérifier que les valeurs par défaut couvrent aussi les nouvelles pages.

### RTL

- Corriger l'alignement des formulaires (Auth, Checkout, Contact, Account).
- Remplacer `text-left`/`text-right` par `text-start`/`text-end` dans ces pages.
- Vérifier les icônes directionnelles (chevrons, flèches).

## Livrables

1. Toutes les pages secondaires basculent correctement en FR/EN/AR.
2. Les données mock produits/blog ont des traductions EN/AR (relues/corrigées par toi après).
3. Aucun texte FR en dur dans les pages visiteur.
4. Affichage RTL testé visuellement sur les pages formulaires.

## Dépendances

- Lot 1 déjà en place (`useLocalize`, `Localized<T>`, migration admin-store).
- Pas de backend requis (reste localStorage).

## Suite logique

Après validation du Lot 2, on passera au Lot 3 (éditeur admin multilingue avec 3 onglets FR/EN/AR) si tu le souhaites.
