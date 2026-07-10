# i18n complet FR/EN/AR + audit RTL

## Constat

Deux problèmes distincts, mais liés :

1. **Le changement de langue ne change presque rien** : ~90 % des textes visibles (nav, hero, catégories, why us, footer, flash sale, contact, chips, tabs, produits mock, blog…) viennent de `siteContent` (magasin admin persisté). Ce store ne connaît que le français. La clé `t()` couvre seulement une petite partie du site.
2. **RTL incomplet** : `<html dir="rtl">` s'applique, mais beaucoup de classes Tailwind sont directionnelles en dur (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `space-x-*`) — elles ne se retournent pas en arabe.

## Plan d'action

### Partie A — Rendre tout le contenu multilingue

**Approche** : introduire un type `Localized<T> = T | { fr: T; en?: T; ar?: T }`, un helper `useLocalize()` qui renvoie la valeur dans la langue courante avec fallback FR, et migrer progressivement `siteContent` + tous les composants consommateurs.

Fichiers touchés :

- `src/lib/i18n.tsx` — ajouter `useLocalize()` + type `Localized<T>` + helper `localize(value, lang)`.
- `src/lib/site-content.ts` — typer chaque champ texte comme `Localized<string>` et fournir les traductions EN/AR pour les valeurs par défaut (nav, hero, catégories, why us, footer, chips, tabs, contact, flash, builder teaser, etc.).
- `src/lib/admin-store.tsx` — migration douce du localStorage : si un champ est encore un `string`, on le lit tel quel (fallback FR).
- Composants consommateurs (~15 fichiers) — remplacer `H.title` par `L(H.title)` via `const L = useLocalize()` :
  `Header.tsx`, `Footer.tsx`, `Hero.tsx`, `CategoryCards.tsx`, `UseChips.tsx`, `BestSellers.tsx`, `FeaturedTabs.tsx`, `BrandsMarquee.tsx`, `FlashSale.tsx`, `WhyUs.tsx`, `BuilderTeaser.tsx`, `Reviews.tsx`, `ContactCTA.tsx`, `MobileBottomBar.tsx`, `FloatingWhatsApp.tsx`, `Ticker.tsx`.
- Pages « statiques » (About, Contact, Blog, BlogArticle, Cart, Checkout, CheckoutSuccess, Favorites, Search, Account, Auth, ResetPassword, NotFound) — remplacer les strings FR en dur par des clés `t("…")` nouvellement ajoutées aux 3 dictionnaires.
- Données mock produits/blog (`src/data/*`) — passer les champs `name`, `description`, `title`, `excerpt` en `Localized<string>` avec traduction EN/AR.

**Admin (`src/pages/admin/Content.tsx`)** : pour chaque champ texte, afficher 3 onglets FR/EN/AR au lieu d'un seul champ. Migration transparente (un `string` legacy s'édite comme FR).

### Partie B — Audit et corrections RTL

- **Global CSS (`src/styles.css`)** : sous `[dir="rtl"]`, forcer le retournement des utilitaires directionnels qui ne le font pas nativement — `space-x-*` → `space-x-reverse`, ajuster les icônes `ArrowRight`/`ChevronRight` (les remplacer par leurs pendants « logiques »), retourner les marges/paddings horizontaux et positions `left/right` absolues, `text-left`/`text-right`.
- **Composants avec chevrons directionnels** (Header dropdown, ProductCard « voir plus », BuilderTeaser CTA, Footer, BlogArticle back link) : basculer sur `ChevronLeft` en RTL ou appliquer `rtl:rotate-180`.
- **Formulaires** (Auth, Checkout, Contact, Account, admin CRUD) : vérifier alignement labels/inputs, icônes de champ (Search dans Header), `padding-left/right` (`ps-*`/`pe-*`).
- **Tableaux admin** (Products, Orders, Users, Content) : `text-start`/`text-end` au lieu de `text-left/right`, revoir les colonnes actions.
- **Cartes produits & catégories** : badges positionnés absolument (top-right → top-start), icônes de flèche, overlays de prix.
- **Carrousels / marquee** : direction d'animation inchangée (défilement toujours d'une extrémité à l'autre), mais tester visuellement.
- **Test Playwright** : ouvrir chaque page principale en `dir="rtl"` et prendre des screenshots pour vérifier alignements et débordements.

## Détails techniques (pour ta gouverne, tu peux ignorer)

- Migration store : version-bump du localStorage (`admin-store.v2`) + fonction `migrate(v1 → v2)` qui enveloppe les strings en `{fr: value}`.
- `useLocalize()` mémoïsé et stable par référence.
- Fallback strict : si `ar` manque → `fr`. Jamais de clé brute affichée.
- RTL : préférer les propriétés logiques Tailwind v3.3+ (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`) plutôt qu'un override CSS global.

## Découpage proposé (en 3 lots pour rester lisible)

1. **Lot 1 — Fondations + Home** : `useLocalize`, migration `site-content.ts`, mise à jour Header/Footer/Hero/CategoryCards/UseChips/WhyUs/BuilderTeaser/FlashSale/Reviews/ContactCTA/FeaturedTabs/BrandsMarquee/Ticker/MobileBottomBar + RTL global de base.
2. **Lot 2 — Pages secondaires** : About, Contact, Blog, BlogArticle, Cart, Checkout, CheckoutSuccess, Favorites, Search, Account, Auth, NotFound + données mock produits/blog + RTL formulaires.
3. **Lot 3 — Admin** : éditeur multilingue dans `admin/Content.tsx` (onglets FR/EN/AR par champ), + RTL tableaux admin.

## Question avant de démarrer

Deux points à confirmer :

- **Traductions EN/AR des contenus mock** : ok si je produis les traductions moi-même (je t'invite à les relire/corriger après) ?
- **Lot 3 (admin multilingue)** : c'est le plus coûteux et il n'affecte que l'expérience de l'éditeur, pas du visiteur. Tu veux qu'on le fasse maintenant, ou plus tard une fois que le visitor-facing est solide ?
