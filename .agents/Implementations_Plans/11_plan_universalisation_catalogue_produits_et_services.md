# Plan d'Implémentation — Phase 11 : Universalisation du Catalogue (Tous Produits Physiques & Services Immatériels)

**Projet :** KA Tech (ka-tech)  
**Directeur & Validateur :** ArchiSys3.0  
**Tech Lead & Architecte R&D :** AImi  
**Mode :** 📋 Mode Plan

---

## 1. Contexte, Problématique & Objectifs

La plateforme KA Tech est à l'origine configurée et typée de façon rigide pour le matériel informatique et la téléphonie :

1. **Catégories fermées :** Le type `Category = "laptops" | "desktops" | "builds" | "phones"` et le tableau statique `VALID` dans `CategoryDetail.tsx` interdisent la création de nouvelles catégories depuis `/admin/categories`. Tout slug inconnu affiche _« Catégorie introuvable »_.
2. **Caractéristiques matérielles figées (Specs) :** Le type `SpecKey` et la grille `SpecsGrid` de `ProductForm.tsx` imposent des puces et composants PC (`cpu`, `ram`, `gpu`, `storage`, `screen`, `os`). Impossible pour un commerçant de vendre du prêt-à-porter (_Taille, Matière, Couleur_), de la cosmétique (_Contenance, Type de peau_), de l'outillage (_Puissance, Poids_) ou des prestations immatérielles (_Durée, Format, Délai_).
3. **Absence de distinction Produit vs Service :** Tous les articles sont traités comme des marchandises physiques avec livraison en wilaya, alors que les prestations de service (réparation, maintenance, consulting, formation) ne nécessitent aucun frais de port ni expédition physique.

### Objectifs Majeurs de la Phase 11 :

- **Universalité Métier Totale :** Capacité d'accueillir n'importe quel produit physique ou service dans n'importe quel secteur d'activité.
- **Catégories 100% Dynamiques :** Connecter la vitrine (`/category/:slug`, menus, filtres) aux catégories dynamiques issues de `useCategoryList()`.
- **Caractéristiques Libres Clé / Valeur :** Permettre l'ajout, la modification et la suppression de caractéristiques personnalisées en FR/EN/AR avec suggestions optionnelles par secteur.
- **Typologie Produit vs Prestation :** Introduire le champ `type: "physical" | "service"` et adapter les parcours vitrine (devis/contact WhatsApp pour les services vs panier/checkout pour les produits physiques).
- **Rétrocompatibilité Intégrale (Zéro Régression) :** Les 12 produits démo et catégories existants restent 100 % opérationnels sans altération.

---

## 2. Découpage Chirurgical des Étapes

```
                    ARCHITECTURE DU CATALOGUE UNIVERSEL
                    ═══════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────────┐
  │ 1. MODÈLE DE DONNÉES ÉLARGI (TypeScript & API)                         │
  │    Category = string (ouvert) | type = "physical" | "service"          │
  │    specs = Record<string, Localized<string>> (universel)                │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────┴────────────────────────────────────┐
  │ 2. ÉDITEUR PRODUIT UNIVERSEL (ProductForm.tsx)                         │
  │    Sélecteur catégories dynamiques issues de useCategoryList()          │
  │    Éditeur dynamique d'attributs clés/valeurs (add/edit/remove)        │
  │    Bascule Produit physique vs Prestation de service                    │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────┴────────────────────────────────────┐
  │ 3. VITRINE & FICHE DÉTAILLÉE UNIVERSELLE (Product.tsx & CategoryDetail) │
  │    Reconnaissance de tout slug de catégorie dynamique                  │
  │    Affichage propre des caractéristiques universelles                   │
  │    Bouton d'action adapté : "Ajouter au panier" vs "Demander un devis"  │
  └────────────────────────────────────────────────────────────────────────┘
```

---

### Étape 1 : Évolution du Modèle de Données & Schéma TypeScript

- **Fichiers :** [`src/data/products.ts`](file:///c:/xampp/htdocs/ka-tech/src/data/products.ts) & [`src/api/types.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/types.ts)
  - Élargir `Category` :
    ```ts
    export type BuiltinCategory = "laptops" | "desktops" | "builds" | "phones";
    export type Category = BuiltinCategory | (string & {});
    ```
  - Élargir `specs` dans `Product` pour accepter des clés libres :
    ```ts
    specs: Partial<Record<SpecKey | string, Localized<string>>>;
    ```
  - Ajouter le champ discriminatoire de nature de l'article :
    ```ts
    productType?: "physical" | "service";
    ```
  - Créer le helper de repli robuste pour les métadonnées de catégories dynamiques :
    ```ts
    export function getCategoryMeta(slug: string, dynamicCategory?: AdminCategory);
    ```

---

### Étape 2 : Refonte du Formulaire d'Administration (`ProductForm.tsx`)

- **Fichier :** [`src/pages/admin/ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx)
  - **Schéma Zod :** remplacer `category: z.enum(...)` par `category: z.string().min(1, "Catégorie requise")`.
  - **Type d'article :** ajouter un sélecteur _Produit physique_ / _Prestation de service_ (`productType`).
  - **Catégorie dynamique :** alimenter le sélecteur `<Select>` directement à partir de `useCategoryList()`.
  - **Éditeur d'attributs personnalisés :**
    - Conserver les raccourcis informatiques en suggestions rapides si la catégorie est tech.
    - Offrir un module d'attributs libres : bouton _« Ajouter une caractéristique »_ permettant de définir le label et la valeur en FR/EN/AR.
    - Prise en charge des attributs standard de tout secteur : Taille, Couleur, Matière, Poids, Volume, Durée d'intervention, Garantie, etc.

---

### Étape 3 : Dynamisation des Catégories Vitrine (`CategoryDetail.tsx` & `CategoryCards.tsx`)

- **Fichiers :** [`src/pages/CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx), [`src/pages/Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx), [`src/components/CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx)
  - Dans `CategoryDetail.tsx` : remplacer le tableau figé `VALID = ["laptops", ...]` par la vérification contre `useCategoryList()`. Tout slug enregistré dans le backstage est désormais consultable sans erreur 404.
  - Résolution des titres et descriptions de catégories à partir des métadonnées dynamiques administrables.

---

### Étape 4 : Fiche Produit Vitrine Contextuelle (`Product.tsx`)

- **Fichier :** [`src/pages/Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx)
  - **Onglet Caractéristiques :** afficher l'ensemble des paires clé/valeur définies sur le produit. Si la clé est une `SpecKey` connue, utiliser la traduction existante ; sinon afficher le nom personnalisé de l'attribut.
  - **Parcours de Conversion :**
    - _Produit physique :_ bouton classique _« Ajouter au panier »_ et badge de stock.
    - _Prestation de service :_ bouton _« Demander un devis / Réserver »_ ouvrant un dialogue ou un lien direct WhatsApp pré-rempli avec l'intitulé de la prestation, sans frais de livraison.

---

### Étape 5 : Internationalisation, Qualification & Packaging

- Ajout des libellés nécessaires en français, anglais et arabe dans `src/lib/i18n/admin/catalogue/`.
- `bun run verifier-i18n` : validation de la parité trilingue.
- `bun run format && bunx tsc --noEmit && bun run lint && bun run build`.
- Génération du livrable de production zippé et mise à jour de `.agents/tracabilites.md`.

---

## 3. Matrice de Recette & Validation

| Identifiant   | Scénario de Test        | Action                                                                                     | Résultat Attendu                                                                     |
| :------------ | :---------------------- | :----------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **REC-11-01** | Catégorie Personnalisée | Créer une catégorie _« Électroménager »_ dans `/admin/categories` et y associer un produit | Page `/category/electromenager` accessible et affiche l'article sans erreur.         |
| **REC-11-02** | Caractéristiques Libres | Créer un produit avec _Capacité : 500L_ et _Classe énergétique : A+++_                     | Attributs rendus proprement dans l'onglet Caractéristiques de la fiche produit.      |
| **REC-11-03** | Article de type Service | Créer un article _« Nettoyage & Dépoussiérage »_ de type `service`                         | Affichage du bouton de réservation/devis sans notion de stock ni livraison physique. |
| **REC-11-04** | Rétrocompatibilité      | Consulter les laptops et smartphones préexistants du catalogue                             | Zéro régression : affichage inchangé de leurs spécifications.                        |
| **REC-11-05** | Pipeline Qualité        | `bun run lint && bunx tsc --noEmit && bun run build`                                       | 0 erreur TypeScript, 0 erreur ESLint, build Vite et packaging validés.               |
