/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TRADUCTION DU BACK-OFFICE — CONVENTION UNIQUE                           ║
 * ║  Lisez ce fichier EN ENTIER avant d'écrire une seule clé.                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Ce fichier est le contrat entre les agents qui traduisent les 39 écrans du
 * back-office. Il n'est pas indicatif : un écart se voit à l'écran (clé brute,
 * phrase découpée, mise en page RTL cassée) ou en CI (`bun run verifier-i18n`).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 1. POURQUOI UN ESPACE DE NOMS SÉPARÉ
 * ───────────────────────────────────────────────────────────────────────────
 * `src/lib/i18n/fr.ts` est importé STATIQUEMENT par `src/lib/i18n.tsx` (c'est
 * la langue par défaut). Tout ce qu'on y ajoute est téléchargé par CHAQUE
 * visiteur de la boutique. Les ~800 chaînes du back-office n'ont rien à y
 * faire : la phase 0 s'est battue pour ramener le premier chargement à 179 ko
 * gzip. Elles vivent donc ici, dans un espace de noms `admin` chargé à la
 * demande — un chunk par langue — déclenché par `AdminShell` à l'entrée dans
 * `/admin` (voir `useNamespace` dans `src/lib/i18n.tsx`).
 *
 * Conséquence pour vous : RIEN à comprendre ni à câbler. Depuis une page admin,
 * `t("admin.…")` est la SEULE API. N'importez jamais un dictionnaire dans une
 * page, n'appelez jamais `useNamespace` ailleurs que dans `AdminShell`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 2. NOMMAGE DES CLÉS
 * ───────────────────────────────────────────────────────────────────────────
 *   admin.<groupe>.<page>.<cle>
 *
 * - tout en minuscules, SANS accent, mots séparés par `_` dans `<cle>`
 *   ✔ admin.catalogue.marques.col_nom      ✘ admin.Catalogue.marques.colonneNom
 *   ✔ admin.ventes.commandes.statut_paye   ✘ admin.ventes.commandes.statut.payé
 * - `<groupe>` est l'un des six ci-dessous, jamais autre chose.
 * - `<page>` identifie l'écran, en français sans accent (`marques`, `commandes`,
 *   `parametres`…). Plusieurs fichiers d'un même écran (liste + formulaire +
 *   fiche) partagent la même `<page>` quand ils partagent leur vocabulaire.
 * - `<cle>` décrit le RÔLE de la chaîne, pas son contenu :
 *   ✔ col_prix, vide_aucun_resultat, toast_supprime, aria_fermer
 *   ✘ prix_en_dinars, message1, texte_rouge
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 3. LES SIX GROUPES ET LEURS FICHIERS
 * ───────────────────────────────────────────────────────────────────────────
 * Chaque groupe possède TROIS fichiers, et trois seulement :
 *     src/lib/i18n/admin/<groupe>/fr.ts
 *     src/lib/i18n/admin/<groupe>/en.ts
 *     src/lib/i18n/admin/<groupe>/ar.ts
 *
 *   socle      — cadre et pilote : AdminLayout, AdminShell, ConfirmDialog,
 *                Dashboard, Products (page exemplaire). DÉJÀ TRADUIT.
 *                Contient aussi le vocabulaire PARTAGÉ (`admin.socle.commun.*`,
 *                `admin.socle.confirmation.*`, `admin.socle.roles.*`) que tous
 *                les groupes réutilisent au lieu de le recopier.
 *   catalogue  — Products* (hors Products.tsx), Categories*, Brands*,
 *                Inventory, Media
 *   ventes     — Orders, OrderDetail, Customers, Coupons, Shipping, Payments
 *   contenu    — Content, Blog*, Reviews, Messages, Subscribers
 *   reglages   — Settings, Users, Notifications, Analytics, Reports
 *   systeme    — Audit, Reset, Developpeur
 *
 * RÈGLE ANTI-COLLISION, non négociable : vous ne modifiez QUE les trois
 * fichiers de VOTRE groupe. Vous ne touchez JAMAIS :
 *   - les agrégateurs `admin/fr.ts`, `admin/en.ts`, `admin/ar.ts`
 *   - ce fichier `admin/index.ts`
 *   - les fichiers d'un autre groupe
 *   - `src/lib/i18n/{fr,en,ar}.ts` (dictionnaire visiteur : intouchable)
 * Les agrégateurs listent déjà les six groupes : votre fichier est branché
 * avant même que vous l'ouvriez. Aucune importation à ajouter nulle part.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 4. CE QUI PASSE PAR `t()` — TOUT CE QUI EST VISIBLE OU LU
 * ───────────────────────────────────────────────────────────────────────────
 * Sans exception : titres, descriptions, boutons, LIBELLÉS DE COLONNES,
 * `placeholder`, `title`, `aria-label`, `alt` porteur de sens, états vides,
 * messages de `toast` (succès ET erreur), textes de confirmation, libellés de
 * statut, options de `Select`, légendes de graphiques, unités affichées.
 *
 * CE QUI NE SE TRADUIT PAS — et ne doit surtout pas entrer dans un
 * dictionnaire :
 *   - identifiants techniques et slugs (`in`, `low`, `out`, `pending`,
 *     `laptops`) : on traduit leur LIBELLÉ, jamais la valeur elle-même ;
 *   - noms de marques et de produits (KA Tech, Lenovo, Intel…) ;
 *   - codes et noms de wilaya (référentiel administratif algérien) ;
 *   - clés d'API, en-têtes HTTP, noms de champs JSON, requêtes SQL ;
 *   - adresses e-mail, URL, numéros de version, identifiants de commande.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 5. UNE CLÉ = UNE PHRASE COMPLÈTE
 * ───────────────────────────────────────────────────────────────────────────
 * Interdit de découper une phrase autour d'un élément JSX ou d'une valeur :
 *   ✘ <>Le produit « <strong>{nom}</strong> » sera supprimé.</>
 *   ✔ t("admin.socle.produits.supprimer_description", { nom })
 * Raison : l'ordre des mots change d'une langue à l'autre, et en arabe
 * l'inversion du sens de lecture rend un assemblage de fragments illisible.
 * Les valeurs variables passent par `{nom}` / `{n}` / `{total}`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 6. NOMBRES ET PLURIELS
 * ───────────────────────────────────────────────────────────────────────────
 * `t("cle", { n: 3 })` interpole `{n}` — formaté avec `Intl.NumberFormat`
 * (`fr-DZ` / `en-DZ` / `ar-DZ` : chiffres latins, usage algérien) — et cherche
 * D'ABORD une variante suffixée :
 *     cle_un      → fr : 0 et 1   |  en/ar : 1
 *     cle_autre   → fr : 2 et +   |  en/ar : 0, 2 et +
 * Déclarez les DEUX suffixes, dans les TROIS langues, ou aucun.
 * En arabe, formulez `_autre` pour qu'il reste correct de 2 à l'infini
 * (« {n} منتج » plutôt qu'un accord spécifique à 3–10) : le back-office affiche
 * des compteurs, pas de la prose.
 * Exemple vivant à copier : `admin.socle.produits.description_un/_autre` et
 * son appel dans `src/pages/admin/Products.tsx`.
 * Les montants en dinars continuent de passer par `formatDZD` (inchangé).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 7. RTL (ARABE)
 * ───────────────────────────────────────────────────────────────────────────
 * L'alignement et les marges passent par les propriétés LOGIQUES :
 *   text-start / text-end · ms-* / me-* · ps-* / pe-* · start-* / end-*
 * JAMAIS `text-left`, `text-right`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`,
 * `right-*` pour un élément dont la position dépend du sens de lecture.
 * `dir="rtl"` est déjà posé sur `<html>` par le provider : rien à faire de plus.
 *
 * PIÈGE MESURÉ SUR LE PILOTE : `src/components/ui/table.tsx` code un
 * `text-left` EN DUR dans `TableHead`. En arabe, les en-têtes de colonnes
 * restent donc alignés à gauche dans un tableau qui se lit à droite. Le
 * composant partagé est hors du périmètre i18n : passez `text-start`
 * explicitement sur chaque `TableHead` (tailwind-merge remplace alors
 * `text-left`), comme le fait `src/pages/admin/Products.tsx`. Même vigilance
 * pour tout composant `ui/` qui porterait une classe directionnelle en dur.
 *
 * EXCEPTION À NE PAS « CORRIGER » : `src/pages/admin/Content.tsx` contient
 * trois `text-right` conditionnés à l'arabe (`lang === "ar" && "text-right"`).
 * Ils sont VOLONTAIRES : ces champs éditent du contenu arabe affiché côté
 * visiteur, l'alignement y suit la langue du CONTENU, pas celle de l'interface.
 * Agent du groupe `contenu` : traduisez les libellés, laissez ces trois classes
 * exactement où elles sont.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 8. QUALITÉ DE L'ARABE ET DE L'ANGLAIS
 * ───────────────────────────────────────────────────────────────────────────
 * Une valeur `ar` identique au français est un DÉFAUT, pas un repli :
 * `verifier-i18n` l'AVERTIT (sans échouer, car « Lenovo » ou « KA Tech » sont
 * légitimement identiques). Toute valeur arabe doit être du vrai arabe
 * standard moderne, vocabulaire de gestion e-commerce. Idem pour l'anglais :
 * pas de français recopié.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 9. AVANT DE COMMITTER
 * ───────────────────────────────────────────────────────────────────────────
 *   bun run verifier-i18n     # parité des 3 langues, clés vides, doublons
 *   bun run lint && bunx tsc --noEmit && bun run build
 * Le vérificateur est bloquant en CI et s'exécute avant tous les autres
 * harnais (il est instantané).
 *
 * Limite connue, hors périmètre i18n : les messages de refus de permission
 * (`denialMessage` dans `src/lib/admin-auth.tsx`) et `ADMIN_ROLE_LABEL` restent
 * en français. Ne modifiez pas ce fichier ; passez simplement à `guard()` un
 * libellé d'action déjà traduit, et utilisez `admin.socle.roles.*` pour
 * afficher un rôle.
 */

/** Les six groupes de traduction du back-office, dans l'ordre d'agrégation. */
export const ADMIN_GROUPS = [
  "socle",
  "catalogue",
  "ventes",
  "contenu",
  "reglages",
  "systeme",
] as const;

export type AdminGroup = (typeof ADMIN_GROUPS)[number];

/** Langues couvertes par l'espace de noms admin — les trois, sans exception. */
export const ADMIN_LANGS = ["fr", "en", "ar"] as const;

export type AdminLang = (typeof ADMIN_LANGS)[number];
