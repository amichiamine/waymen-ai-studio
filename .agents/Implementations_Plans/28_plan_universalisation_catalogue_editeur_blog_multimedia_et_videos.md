# Plan d'Implémentation — Phase 28 : Universalisation Catalogue, Auteur Dynamique Blog & Éditeur Multimédia Markdown (Vidéos, Médiathèque & Aperçu)

> **Projet :** KA Tech (Plateforme E-Commerce Marque Blanche Universelle)  
> **Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
> **Tech Lead, Architecte & Consultant R&D :** AImi  
> **Mode :** 📋 Plan d'Implémentation  
> **Référence Fichier Miroir :** `.agents/Implementations_Plans/28_plan_universalisation_catalogue_editeur_blog_multimedia_et_videos.md`

---

## 1. Contexte & Objectifs de la Phase 28

Faisant suite au diagnostic validé par **ArchiSys3.0**, la Phase 28 apporte la solution définitive à trois verrous fondamentaux d'universalité et d'expérience utilisateur :

1. **Universalité du Formulaire Produit (`ProductForm.tsx`) :**
   - Éliminer le hardcodage de la catégorie par défaut `category: "laptops"`. Utiliser dynamiquement la première catégorie disponible du catalogue ou une sélection neutre.
   - Replier par défaut la section « Spécifications informatiques » (CPU, RAM, GPU, Écran, OS) à la création d'un produit. Ne la déplier que si l'utilisateur le demande explicitement ou si le produit édité possède déjà des spécifications IT renseignées.
   - Valoriser les spécifications dynamiques universelles (`CustomSpecsEditor`) adaptées à tout secteur d'activité (mode, beauté, ameublement, services, etc.).
2. **Dynamisation de l'Auteur dans le Blog (`BlogForm.tsx`) :**
   - Supprimer le hardcodage statique `"Équipe KA Tech"`.
   - Calculer automatiquement l'auteur par défaut : nom de l'utilisateur connecté (`user?.name`), ou interpolation de l'enseigne de la boutique (`Équipe ${storeName}`), ou intitulé neutre.
3. **Éditeur Markdown Enrichi & Support Vidéos Multimédia :**
   - Créer un composant réutilisable [`MarkdownEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MarkdownEditor.tsx) comprenant :
     - Barre d'outils visuelle ergonomique : Titres H2/H3, Gras, Italique, Citation, Listes à puces et numérotées, Liens.
     - **Bouton d'insertion d'images depuis la Médiathèque** : dialogue modal avec `MediaPickerDialog` pour insérer des visuels en un clic sans copier-coller d'URL manuelle.
     - **Bouton d'insertion Vidéo** : dialogue intuitif acceptant une URL YouTube, Vimeo ou un fichier vidéo direct MP4/WebM.
     - **Bascule en Onglets [ ✏️ Édition ] / [ 👁️ Aperçu en direct ]** : pour prévisualiser instantanément le rendu exact avant enregistrement.
   - Mettre à niveau le moteur de rendu public dans [`BlogArticle.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/BlogArticle.tsx) pour restituer nativement :
     - Les lecteurs vidéo responsives 16:9 pour YouTube (`iframe` responsive) et Vimeo.
     - Les balises `<video controls>` pour les fichiers directs MP4/WebM.
     - Les images Markdown `![alt](url)` via le composant optimisé `<ImageCatalogue>`.
     - Les listes à puces `- ` / `* `, citations `> `, et liens hypertextes cliquables `[texte](url)`.

---

## 2. Découpage Chirurgical des Étapes

### Étape 28.A — Universalisation du Formulaire Produit (`ProductForm.tsx`)

- Modifier `emptyForm()` : initialiser `category` à la première catégorie existante ou chaîne vide au lieu de `"laptops"`.
- Modifier l'état `showItSpecs` : initialiser à `false` lors de la création d'un nouveau produit.
- En mode édition (`mode === "edit"`), détecter si le produit possède au moins une spécification IT (`p.specs.cpu`, `ram`, `gpu`, `storage`, `screen`, `os`) non vide pour décider de l'ouverture initiale.
- Supprimer l'effet de bord automatique `useEffect` qui forçait l'ouverture du volet dès que la catégorie appartenait à `IT_HARDWARE_CATEGORIES`.

### Étape 28.B — Auteur Dynamique du Blog (`BlogForm.tsx`)

- Raccorder `BlogForm.tsx` aux hooks `useSiteSettings()` et `useAdminAuth()`.
- Calculer l'auteur par défaut au chargement :
  ```ts
  const defaultAuthor =
    user?.name?.trim() || (s.storeName?.trim() ? `Équipe ${s.storeName.trim()}` : "Rédaction");
  ```
- Remplacer le littéral `"Équipe KA Tech"` par `defaultAuthor`.

### Étape 28.C — Composant `MarkdownEditor` avec Barre d'Outils, Médiathèque & Aperçu

- Créer [`src/components/admin/MarkdownEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MarkdownEditor.tsx) :
  - Support multilingue (LTR et RTL pour l'arabe).
  - Barre d'actions rapides insérant la syntaxe Markdown à la position du curseur :
    - `H2` (`## Titre`), `H3` (`### Sous-titre`)
    - **B** (`**texte**`), _I_ (`*texte*`)
    - `Quote` (`> Citation`)
    - `List` (`- Élément`), `Ordered List` (`1. Premier`)
    - `Link` (`[Libellé](url)`)
    - `Image` : ouverture directe du sélecteur de médiathèque existant (`MediaPickerDialog`) et insertion de `![nom](src)`.
    - `Video` : popover/dialogue de saisie d'URL vidéo (YouTube, Vimeo, MP4) insérant le lien vidéo sur sa propre ligne.
  - Onglets supérieurs `Tabs` :
    - Mode Édition (Textarea avec coloration sobre, raccourcis et mise en page aérée).
    - Mode Aperçu en direct (Live Preview) utilisant le composant partagé de rendu Markdown.
- Remplacer les champs textarea simples de `BlogForm.tsx` par `<MarkdownEditor />` pour le français, l'anglais et l'arabe.

### Étape 28.D — Moteur de Rendu Multimédia Enrichi (`BlogArticle.tsx` & Preview)

- Créer un composant réutilisable de rendu [`src/components/blog/MarkdownRenderer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blog/MarkdownRenderer.tsx) :
  - Détection regex des URLs YouTube (`youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`) ➔ intégration d'un lecteur `iframe` responsive 16:9 (`aspect-video rounded-xl shadow-sm`).
  - Détection regex des URLs Vimeo (`vimeo.com/ID`) ➔ intégration d'un lecteur `iframe` Vimeo responsive.
  - Détection regex des fichiers vidéo directs (`.mp4`, `.webm`) ➔ lecteur HTML5 natif `<video controls>`.
  - Détection des images Markdown `![alt](url)` ➔ rendu avec `<ImageCatalogue>`.
  - Détection des liens `[label](url)` ➔ rendu `<a href="..." target="_blank" rel="noreferrer" className="text-primary underline">`.
  - Détection des listes non ordonnées (`- `, `* `) et ordonnées (`1. `).
  - Détection des citations (`> `) avec bordure latérale d'accentuation.
- Consommer `MarkdownRenderer` dans [`src/pages/BlogArticle.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/BlogArticle.tsx) et dans l'onglet Aperçu de `MarkdownEditor.tsx`.

### Étape 28.E — Dictionnaire i18n Trilingue (FR, EN, AR)

- Ajouter les clés de la barre d'outils Markdown dans [`src/lib/i18n/admin/contenu/{fr,en,ar}.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/contenu/fr.ts) :
  - Boutons : Titre 2, Titre 3, Gras, Italique, Liste, Numérotation, Citation, Lien, Image, Vidéo, Aperçu, Édition.
  - Modales : Insérer une vidéo, URL de la vidéo (YouTube, Vimeo, MP4), Insérer.

### Étape 28.F — Validation Qualité CI & Livrables Horodatés

- Exécuter la suite complète :
  1. `bun run verifier-i18n` (100% parité trilingue stricte).
  2. `bun run format` (conformité Prettier).
  3. `bunx tsc --noEmit` (0 erreur TypeScript).
  4. `bun run lint` (0 erreur ESLint).
  5. `bun run build; bun run paqueter:data` (nouvelle archive horodatée, conservation des versions cumulatives).
- Mettre à jour [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) avec l'entrée Phase 28.
- Commit et push sur `origin/main`.

---

## 3. Matrice de Recette & Vérification

| Test                           | Comportement Attendu                                                                                                                                     |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Création Produit Neutre**    | Clic sur « Nouveau produit » ➔ la catégorie initiale n'est plus "laptops" forcée, et la section Spécifications informatiques est **repliée** par défaut. |
| **Création Produit Métier**    | L'utilisateur peut ajouter directement des spécifications personnalisées (ex: Taille, Poids, Tissu, Contenance) sans être encombré par CPU/RAM/GPU.      |
| **Auteur Blog Dynamique**      | Création d'un article ➔ le champ Auteur affiche le nom de l'admin connecté ou `Équipe [Nom du magasin]` au lieu de `Équipe KA Tech`.                     |
| **Barre d'outils Markdown**    | Clic sur [Gras], [Titre], [Lien], [Image] ➔ insertion instantanée à la position du curseur.                                                              |
| **Médiathèque dans l'Éditeur** | Clic sur [Image] ➔ ouvre la médiathèque complète, sélectionne une photo et insère `![nom](src)` automatiquement.                                         |
| **Insertion & Rendu Vidéo**    | Saisie d'une URL YouTube ➔ affichage d'un player vidéo 16:9 fluide dans l'Aperçu et sur la page de l'article `/blog/:slug`.                              |
| **CI & Parité i18n**           | 0 erreur `verifier-i18n`, 0 erreur TypeScript, 0 erreur ESLint, build vert.                                                                              |
