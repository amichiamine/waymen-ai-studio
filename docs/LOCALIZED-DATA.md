# Données localisées — recette de migration

> **Statut** : pilote de la vague 3.1 livré (`src/data/products.ts`,
> `src/components/ProductCard.tsx`, `src/pages/Product.tsx`).
> Ce document est la **recette à suivre** pour les fichiers consommateurs
> restants et pour la vague 3.2 (blog). Skills `S1` (pilote) et `S11`
> (enrichir sans casser).

---

## 1. Ce qui a changé, et pourquoi c'est sans risque

Les champs textuels du produit ne sont plus des `string` mais des
`Localized<string>` :

```ts
// src/data/products.ts
export type Product = {
  id: string; // technique — JAMAIS localisé
  name: Localized<string>;
  brand: string; // nom propre — identique dans les 3 langues
  specLine: Localized<string>;
  specs: Partial<Record<SpecKey, Localized<string>>>; // clés techniques, valeurs localisées
  // …
};
```

Le type est défini dans `src/lib/i18n.tsx` :

```ts
export type Localized<T = string> = T | { fr: T; en?: T; ar?: T };
```

**Le type nu fait partie de l'union.** Une chaîne simple reste donc une valeur
valide : les douze produits seed n'ont **pas** été modifiés, et une donnée
restée monolingue est traitée comme du français avec repli automatique dans les
autres langues. C'est la migration douce de la skill S11 — on élargit le type,
on ne casse aucune donnée.

**Corollaire pour ta migration** : en français, l'affichage doit rester
**strictement identique** à avant. C'est le juge de ton travail. Si un libellé
bouge en FR, tu as introduit une régression.

---

## 2. Les deux outils — ne pas les confondre

| Outil                    | Où l'utiliser                                              | Signature                                                         |
| ------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `useLocalize()` → `L(v)` | **Dans un composant React** (ou un autre hook)             | `<T>(v: Localized<T> \| undefined) => T \| undefined`             |
| `localize(v, lang)`      | **Hors composant** : recherche, tri, sitemap, export, JSON | `<T>(v: Localized<T> \| undefined, lang: Lang) => T \| undefined` |

Les deux sont exportés par `@/lib/i18n` et **existaient déjà** — rien à créer.
`L` est simplement `localize` avec la langue courante pré-appliquée, mémoïsé sur
`lang` (donc stable dans une dépendance de `useMemo` / `useEffect`).

Dans une fonction pure ou un `useMemo` qui a besoin de la langue, récupère-la
par `const { lang } = useI18n()` **dans le composant**, puis passe-la à
`localize` à l'intérieur du calcul.

---

## 3. Avant / après — à copier tel quel

### 3.1 Un site de rendu simple

```diff
-import { useI18n } from "@/lib/i18n";
+import { useI18n, useLocalize } from "@/lib/i18n";

 export function ProductCard({ p }: { p: Product }) {
   const { t } = useI18n();
+  const L = useLocalize();
-  const name = p.name;
+  // Localisation faite UNE SEULE FOIS par champ, en tête de composant :
+  // tout le rendu en dessous consomme des `string` garantis.
+  const name = L(p.name) ?? "";
+  const specLine = L(p.specLine) ?? "";
```

```diff
-        <p className="…">{p.specLine}</p>
+        <p className="…">{specLine}</p>
```

**Le motif clé** : une variable locale par champ, en haut du composant, puis
plus jamais `p.name` ni `p.specLine` dans le corps. C'est ce qui rend la
double-localisation impossible et les métadonnées sûres.

Le `?? ""` n'est pas cosmétique : `L` est générique et retourne
`string | undefined`. Sans lui, un attribut `alt`, un `content` de `<meta>` ou
une interpolation `` `${…}` `` peut recevoir `undefined` — et
`` `${undefined}` `` écrit littéralement `"undefined"` dans la page.

### 3.2 `specs` — clés techniques, valeurs localisées

Les **clés** (`cpu`, `ram`, `gpu`…) sont des identifiants `SpecKey` traduits par
le **dictionnaire** via `t(specKeyMap[k])`. Elles ne passent jamais par `L`.
Seules les **valeurs** sont localisées :

```diff
 {Object.entries(p.specs).map(([k, v]) => (
   <div key={k} className="…">
     <dt className="…">{t(specKeyMap[k as SpecKey])}</dt>
-    <dd className="… text-right">{v}</dd>
+    <dd className="… text-end">{L(v)}</dd>
   </div>
 ))}
```

Ici `L(v)` en ligne est acceptable : la valeur n'est utilisée qu'une fois, dans
du JSX, où `undefined` ne rend rien. Profite du passage pour corriger
`text-right` → `text-end` (identique en FR, correct en RTL).

### 3.3 JSON-LD et métadonnées — le point le plus dangereux

`JSON.stringify` sérialise un `Localized` non résolu en
`{"fr":"…","en":"…"}`. Google invalide alors la fiche produit entière.
`name`, `description` et `brand.name` **doivent** être des chaînes :

```diff
 const jsonLd = {
   "@type": "Product",
-  name: p.name,
+  name, // variable déjà localisée — jamais `p.name`
   brand: { "@type": "Brand", name: p.brand },
-  description: p.specLine,
+  description: specLine,
 };
```

Idem pour `<title>`, `<meta name="description">`, `og:title`, `og:description`
et `document.title`. Aucun de ces emplacements ne tolère un objet.

### 3.4 Hors composant (`localize`)

```ts
const { lang } = useI18n();
const rows = useMemo(
  () => products.map((p) => [p.id, localize(p.name, lang) ?? "", p.price]),
  [products, lang],
);
```

Pour un export CSV, un sitemap ou un script de build où aucune langue n'est
« courante », passe `"fr"` explicitement : c'est la langue de référence et le
repli garanti.

---

## 4. Décision tranchée — recherche et tri

> **Chercher dans toutes les langues, afficher et trier dans la langue active.**

### La règle

1. **Filtrage textuel** : le terme est confronté aux **trois** variantes de
   chaque champ localisé. Un produit sort si _n'importe quelle_ langue
   correspond.
2. **Affichage** : toujours la langue active (via `L`), jamais la variante qui a
   provoqué la correspondance.
3. **Tri alphabétique** : sur la valeur **affichée**, avec
   `localeCompare` et la locale courante.

### Pourquoi

Un client algérien tape indifféremment en français, en arabe ou en anglais,
souvent dans la même session — « laptop » puis « ordinateur portable ». Une
recherche restreinte à la langue de l'interface produirait un « aucun résultat »
alors que le produit est en stock : c'est une vente perdue pour un motif que le
client ne peut ni comprendre ni contourner. Les marques et références
techniques (`RTX 4070`, `Ryzen`) ne sont d'ailleurs jamais traduites, ce qui
rend le mélange des langues structurellement normal dans ce catalogue.

Le tri, lui, obéit à la logique inverse : l'utilisateur classe **ce qu'il voit**.
Trier sur la variante française une liste affichée en arabe donnerait un ordre
sans rapport visible avec l'écran — un bug perçu, même si l'ordre est déterministe.

### Implémentation de référence

Un utilitaire local suffit ; ne pas dupliquer la logique dans chaque écran :

```ts
import type { Localized } from "@/lib/i18n";

/** Toutes les variantes d'un champ localisé, en minuscules — base de recherche. */
const haystack = (v: Localized<string> | undefined): string =>
  (typeof v === "object" && v !== null ? [v.fr, v.en, v.ar] : [v])
    .filter((s): s is string => typeof s === "string")
    .join(" ")
    .toLowerCase();
```

Migration du filtre existant de `src/pages/Search.tsx` :

```diff
   return (
-    p.name.toLowerCase().includes(term) ||
+    haystack(p.name).includes(term) ||
     p.brand.toLowerCase().includes(term) ||
     p.category.includes(term) ||
-    p.specLine.toLowerCase().includes(term)
+    haystack(p.specLine).includes(term)
   );
```

Et pour un tri alphabétique (aucun n'existe aujourd'hui sur le catalogue
vitrine ; les tables admin en ont) :

```ts
const collator = new Intl.Collator(lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR");
r = [...r].sort((a, b) =>
  collator.compare(localize(a.name, lang) ?? "", localize(b.name, lang) ?? ""),
);
```

**Attention aux dépendances** : dès que `lang` entre dans un `useMemo`, il doit
figurer dans son tableau de dépendances. Les oublier régresserait le correctif
de la phase 0.

---

## 5. Pièges — chacun a coûté un incident ailleurs

| Piège                                      | Règle                                                                                                                                                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useLocalize()` hors composant             | Interdit : c'est un hook. Dans un `.ts` non-React, un gestionnaire d'événement global ou un script, utiliser `localize(v, lang)`.                                                                                             |
| Double localisation                        | `L(L(p.name))` : le second appel reçoit déjà une `string` et la renvoie telle quelle — silencieux aujourd'hui, faux dès qu'un champ change de forme. Une variable locale par champ, en tête de composant, supprime le risque. |
| Comparaison d'identifiants                 | `id`, `category`, `use`, `stock`, `brand` ne sont **pas** localisés. Ne jamais les passer par `L` : `x.id === id` doit rester une égalité de chaînes stricte, sinon la fiche produit et le panier cassent.                    |
| `Localized` dans du JSON / du texte brut   | JSON-LD, CSV, `document.title`, `toast(description)`, `alt`, `aria-label` : résoudre **avant**, avec `?? ""`.                                                                                                                 |
| `{p.name}` oublié dans du JSX              | React lève « Objects are not valid as a React child » à l'exécution, pas à la compilation, si le champ devient un objet. `tsc` t'en avertit maintenant : suis sa liste, ne cherche pas à la main.                             |
| `text-right` / `ml-` / `pl-`               | Toujours `text-end` / `me-` / `ps-`. Un écran localisé en arabe est un écran RTL.                                                                                                                                             |
| `any` ou `@ts-ignore` pour faire taire tsc | Interdiction absolue (`AGENTS.md` §6). Si le type résiste, c'est le rendu qui est à corriger.                                                                                                                                 |

---

## 6. Méthode de travail — laisse TypeScript énumérer

`bunx tsc --noEmit` liste **exactement** les sites à migrer : chaque endroit qui
rend, interpole ou compare un champ devenu `Localized` produit une erreur. C'est
la liste de tâches, et le compteur de progression.

```
bunx tsc --noEmit 2>&1 | grep -o "^src/[^(]*" | sort | uniq -c | sort -rn
```

Au terme de la vague 3.1, **37 erreurs subsistent sur 14 fichiers** — c'est
normal et voulu : ce sont les consommateurs que les vagues suivantes migrent.

| Fichier                              | Erreurs |
| ------------------------------------ | ------- |
| `src/pages/admin/ProductForm.tsx`    | 9       |
| `src/pages/admin/Products.tsx`       | 4       |
| `src/pages/admin/ProductDetail.tsx`  | 4       |
| `src/pages/admin/Inventory.tsx`      | 3       |
| `src/pages/Cart.tsx`                 | 3       |
| `src/lib/admin-store.tsx`            | 3       |
| `src/pages/admin/CategoryDetail.tsx` | 2       |
| `src/pages/admin/BrandDetail.tsx`    | 2       |
| `src/pages/Search.tsx`               | 2       |
| `src/pages/admin/Reviews.tsx`        | 1       |
| `src/pages/admin/Reports.tsx`        | 1       |
| `src/pages/Checkout.tsx`             | 1       |
| `src/pages/Builder.tsx`              | 1       |
| `src/data-provider/orders.ts`        | 1       |

Les écrans **admin** méritent une remarque : ils éditent la donnée, ils ne
l'affichent pas seulement. Leurs formulaires devront à terme exposer les trois
langues en onglets (vague 3.2, pilote `admin/Content.tsx`). En attendant, un
champ édité doit rester lisible **et** ré-enregistrable sans perdre les
variantes déjà saisies — ne jamais écrire `name: valeurDuChamp` en écrasant un
objet `Localized` par une chaîne.

---

## 7. Preuve de succès

- `bunx tsc --noEmit` : aucune erreur dans **tes** fichiers.
- `bunx eslint <tes fichiers>` : vert, sans aucune directive de désactivation.
- `bunx prettier --check <tes fichiers>` : vert (prettier n'est pas idempotent —
  après `--write`, relancer `--check` jusqu'au vert).
- **Le juge final** : en français, l'écran est pixel pour pixel identique à
  avant la migration.
