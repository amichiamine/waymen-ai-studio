/**
 * Groupe « catalogue » — dictionnaire en (anglais).
 *
 * PROPRIÉTAIRE : l'agent de réplication chargé du groupe « catalogue ». Aucun autre
 * agent n'écrit dans ce fichier ; en échange, cet agent n'écrit dans aucun
 * autre — c'est ce qui permet à cinq agents de travailler en parallèle sans
 * conflit de fusion.
 *
 * Écrans couverts : ProductForm, ProductNew, ProductEdit, ProductDetail, Categories, CategoryForm, CategoryDetail, Brands, BrandForm, BrandDetail, Inventory, Media. (Products.tsx est la page pilote : ses clés vivent dans le groupe « socle », ne les recopiez pas.)
 *
 * Seul préfixe autorisé ici : `admin.catalogue.<page>.<cle>`.
 * Convention obligatoire (nommage, pluriels, RTL, qualité de l'arabe) :
 * `src/lib/i18n/admin/index.ts`. Vocabulaire partagé déjà traduit, à réutiliser
 * plutôt qu'à recopier : `admin.socle.commun.*`, `admin.socle.confirmation.*`,
 * `admin.socle.roles.*`.
 *
 * Les trois langues doivent porter EXACTEMENT les mêmes clés :
 * `bun run verifier-i18n` échoue sinon.
 */
const catalogueEn: Record<string, string> = {
  // ── Stock statuses — shared by multiple pages ─────────────────────────────
  "admin.catalogue.commun.stock_in": "In stock",
  "admin.catalogue.commun.stock_low": "Low stock",
  "admin.catalogue.commun.stock_out": "Out of stock",

  // ── ProductForm — New / Edit product ─────────────────────────────────────
  "admin.catalogue.produit_form.titre_nouveau": "New product",
  "admin.catalogue.produit_form.titre_modifier": "Edit product",
  "admin.catalogue.produit_form.description_nouveau": "Create a product page.",
  "admin.catalogue.produit_form.description_modifier": "Identifier: {id}",
  "admin.catalogue.produit_form.retour": "Back",
  "admin.catalogue.produit_form.supprimer": "Delete",
  "admin.catalogue.produit_form.annuler": "Cancel",
  "admin.catalogue.produit_form.creer": "Create",
  "admin.catalogue.produit_form.enregistrer": "Save",
  "admin.catalogue.produit_form.enregistrement": "Saving…",
  "admin.catalogue.produit_form.suppression": "Deleting…",
  "admin.catalogue.produit_form.section_informations": "Information",
  "admin.catalogue.produit_form.label_id": "ID (unique slug)",
  "admin.catalogue.produit_form.label_marque": "Brand",
  "admin.catalogue.produit_form.label_categorie": "Category",
  "admin.catalogue.produit_form.label_type_article": "Item type",
  "admin.catalogue.produit_form.type_physique": "Physical product (with shipping)",
  "admin.catalogue.produit_form.type_service": "Service / Digital (no shipping)",
  "admin.catalogue.produit_form.label_attributs_personnalises":
    "Custom attributes & specifications",
  "admin.catalogue.produit_form.btn_ajouter_attribut": "+ Add custom specification",
  "admin.catalogue.produit_form.attribut_nom": "Specification name (e.g. Size, Color, Material)",
  "admin.catalogue.produit_form.attribut_valeur": "Value",
  "admin.catalogue.produit_form.btn_supprimer_attribut": "Delete",
  "admin.catalogue.produit_form.label_nom": "Name",
  "admin.catalogue.produit_form.label_nom_en": "Name (EN)",
  "admin.catalogue.produit_form.label_nom_ar": "الاسم (AR)",
  "admin.catalogue.produit_form.label_specs": "Tagline & key highlights (summary)",
  "admin.catalogue.produit_form.label_specs_en": "Tagline & key highlights (EN)",
  "admin.catalogue.produit_form.label_specs_ar": "النقاط البارزة والموجز (AR)",
  "admin.catalogue.produit_form.placeholder_specs_physique":
    "e.g. 100% Organic cotton · Regular fit · Handcrafted",
  "admin.catalogue.produit_form.placeholder_specs_service":
    "e.g. 1h Session · Support included · In-person or Remote",
  "admin.catalogue.produit_form.specs_it_titre":
    "Technical computing specifications (CPU, RAM, GPU, Screen, OS)",
  "admin.catalogue.produit_form.specs_it_aide":
    "Optional. Useful for computer hardware or consumer electronics.",
  "admin.catalogue.produit_form.specs_it_replier": "Collapse",
  "admin.catalogue.produit_form.specs_it_deplier": "Expand",
  "admin.catalogue.produit_form.custom_specs_titre": "Custom specifications & attributes",
  "admin.catalogue.produit_form.custom_specs_desc":
    "Add any custom attribute tailored to your business: Size, Color, Material, Weight, Volume, Duration, etc.",
  "admin.catalogue.produit_form.traductions_facultatives":
    "Optional translations. A product without a translation remains valid.",
  "admin.catalogue.produit_form.section_prix_stock": "Price & stock",
  "admin.catalogue.produit_form.label_prix": "Price (DA)",
  "admin.catalogue.produit_form.label_ancien_prix": "Old price (optional)",
  "admin.catalogue.produit_form.label_quantite": "Quantity (units)",
  "admin.catalogue.produit_form.hint_quantite":
    "Status is recalculated based on thresholds defined in /admin/settings.",
  "admin.catalogue.produit_form.label_etat_stock": "Stock status (override)",
  "admin.catalogue.produit_form.label_bestseller": "Best seller",
  "admin.catalogue.produit_form.label_promotion": "On sale",
  "admin.catalogue.produit_form.section_image": "Image",
  "admin.catalogue.produit_form.label_depuis_mediatheque": "From media library",
  "admin.catalogue.produit_form.placeholder_choisir_media": "Choose a media…",
  "admin.catalogue.produit_form.label_url_image": "URL or path",
  "admin.catalogue.produit_form.placeholder_url_image": "Image URL or path",
  "admin.catalogue.produit_form.toast_cree": "Product created",
  "admin.catalogue.produit_form.toast_mis_a_jour": "Product updated",
  "admin.catalogue.produit_form.toast_champs_invalides":
    "Some fields are invalid — fix the errors highlighted in red.",
  "admin.catalogue.produit_form.toast_id_existant": "ID already used",
  "admin.catalogue.produit_form.toast_categorie_inconnue": "Unknown category",
  "admin.catalogue.produit_form.erreur_id_existant": "This ID already exists",
  "admin.catalogue.produit_form.erreur_categorie_inconnue": "Unknown category",
  "admin.catalogue.produit_form.supprimer_titre": "Delete this product?",
  "admin.catalogue.produit_form.supprimer_description":
    'The product "{nom}" will be removed from the local catalogue. This action cannot be undone.',
  "admin.catalogue.produit_form.creer_garde": "Create product",
  "admin.catalogue.produit_form.modifier_garde": "Edit product",
  "admin.catalogue.produit_form.supprimer_garde": "Delete product",

  // ── ProductDetail — Product page ──────────────────────────────────────────
  "admin.catalogue.produit_detail.titre_chargement": "Product",
  "admin.catalogue.produit_detail.titre_introuvable": "Product not found",
  "admin.catalogue.produit_detail.vide_introuvable": 'No product with identifier "{id}"',
  "admin.catalogue.produit_detail.retour": "Back",
  "admin.catalogue.produit_detail.fiche_publique": "Public page",
  "admin.catalogue.produit_detail.modifier": "Edit",
  "admin.catalogue.produit_detail.badge_bestseller": "Best seller",
  "admin.catalogue.produit_detail.badge_promotion": "Sale",
  "admin.catalogue.produit_detail.section_resume": "Summary",
  "admin.catalogue.produit_detail.kpi_unites_vendues": "Units sold",
  "admin.catalogue.produit_detail.kpi_chiffre_affaires": "Revenue",
  "admin.catalogue.produit_detail.kpi_note_moyenne": "Average rating ({n})",
  "admin.catalogue.produit_detail.section_categorie": "Category",
  "admin.catalogue.produit_detail.section_marque": "Brand",
  "admin.catalogue.produit_detail.commandes_recentes_un": "Recent order ({n})",
  "admin.catalogue.produit_detail.commandes_recentes_autre": "Recent orders ({n})",
  "admin.catalogue.produit_detail.vide_commandes": "No associated mock orders.",

  // ── Inventory — Stock management ──────────────────────────────────────────
  "admin.catalogue.stock.titre": "Inventory",
  "admin.catalogue.stock.description": "Adjust stock levels, log movements and track alerts.",
  "admin.catalogue.stock.kpi_total": "Total products",
  "admin.catalogue.stock.kpi_en_stock": "In stock",
  "admin.catalogue.stock.kpi_faible": "Low stock",
  "admin.catalogue.stock.kpi_rupture": "Out of stock",
  "admin.catalogue.stock.onglet_produits": "Products",
  "admin.catalogue.stock.onglet_mouvements_un": "Movement ({n})",
  "admin.catalogue.stock.onglet_mouvements_autre": "Movements ({n})",
  "admin.catalogue.stock.recherche_placeholder": "Search a product…",
  "admin.catalogue.stock.col_produit": "Product",
  "admin.catalogue.stock.col_marque": "Brand",
  "admin.catalogue.stock.col_categorie": "Category",
  "admin.catalogue.stock.col_qte": "Qty",
  "admin.catalogue.stock.col_statut": "Status",
  "admin.catalogue.stock.col_action": "Action",
  "admin.catalogue.stock.btn_ajuster": "Adjust",
  "admin.catalogue.stock.vide_aucun_produit": "No products.",
  "admin.catalogue.stock.col_date": "Date",
  "admin.catalogue.stock.col_delta": "Delta",
  "admin.catalogue.stock.col_raison": "Reason",
  "admin.catalogue.stock.vide_aucun_mouvement": "No logged movements.",
  "admin.catalogue.stock.dialog_titre": "Adjust stock — {nom}",
  "admin.catalogue.stock.dialog_label_delta": "Movement (delta)",
  "admin.catalogue.stock.dialog_hint_delta":
    "Negative = outflow (sale, damage), positive = inflow (restock). The delta is sent directly to the server to guarantee atomicity in phase 4.",
  "admin.catalogue.stock.dialog_label_raison": "Reason",
  "admin.catalogue.stock.dialog_placeholder_raison": "Restock, inventory, damage…",
  "admin.catalogue.stock.dialog_seuils":
    "Current thresholds: out of stock ≤ {rupture}, low ≤ {faible}. Status will be recalculated automatically.",
  "admin.catalogue.stock.dialog_annuler": "Cancel",
  "admin.catalogue.stock.dialog_enregistrer": "Save",
  "admin.catalogue.stock.dialog_enregistrement": "Saving…",
  "admin.catalogue.stock.toast_mis_a_jour": "Stock updated — {nom}",
  "admin.catalogue.stock.erreur_delta_zero": "Delta must be non-zero",
  "admin.catalogue.stock.erreur_raison_requise": "Please provide a reason",
  "admin.catalogue.stock.ajuster_garde": "Adjust stock",

  // ── Media — Media library ─────────────────────────────────────────────────
  "admin.catalogue.media.titre": "Media library",
  "admin.catalogue.media.description":
    "{televerse} uploaded images · {catalogue} catalogue images · {taille} used (practical limit 5 MB per file).",
  "admin.catalogue.media.btn_televerser": "Upload",
  "admin.catalogue.media.recherche_placeholder": "Search (name, tag)…",
  "admin.catalogue.media.quota_label": "Media library space: {utilise} / {total}",
  "admin.catalogue.media.quota_critique":
    "Quota reached — uploads blocked. Delete images or wait for server storage (phase 4).",
  "admin.catalogue.media.quota_avertissement":
    "Quota almost reached. Consider deleting unused images.",
  "admin.catalogue.media.vide_aucune_image": 'No images. Click "Upload" to add visuals.',
  "admin.catalogue.media.source_catalogue": "Catalogue",
  "admin.catalogue.media.copier_url": "Copy URL",
  "admin.catalogue.media.renommer": "Rename",
  "admin.catalogue.media.supprimer": "Delete",
  "admin.catalogue.media.toast_url_copiee": "URL copied",
  "admin.catalogue.media.toast_erreur_copie": "Unable to copy",
  "admin.catalogue.media.toast_televerse": "{nom}: uploaded and saved.",
  "admin.catalogue.media.toast_supprime": "Deleted",
  "admin.catalogue.media.toast_renomme": "Metadata updated",
  "admin.catalogue.media.toast_erreur_format": "{nom}: unsupported format",
  "admin.catalogue.media.toast_erreur_taille": "{nom}: too large (>5 MB)",
  "admin.catalogue.media.toast_quota_atteint":
    "Media library quota reached ({max} max). Delete existing images, or wait for phase 4 (server storage).",
  "admin.catalogue.media.toast_quota_avertissement":
    "Warning: this upload will bring the media library to {utilise} / {total}. Server storage (phase 4) will remove this limit.",
  "admin.catalogue.media.toast_erreur_sauvegarde":
    "{nom}: the image could not be saved ({erreur}). Delete media to free up space, or wait for phase 4.",
  "admin.catalogue.media.erreur_nom_requis": "Name required",
  "admin.catalogue.media.dialog_renommer_titre": "Rename",
  "admin.catalogue.media.dialog_label_nom": "Name",
  "admin.catalogue.media.dialog_label_tag": "Tag (optional)",
  "admin.catalogue.media.dialog_placeholder_tag": "e.g. banner, product…",
  "admin.catalogue.media.dialog_annuler": "Cancel",
  "admin.catalogue.media.dialog_enregistrer": "Save",
  "admin.catalogue.media.dialog_enregistrement": "Saving…",
  "admin.catalogue.media.preview_format": "Format: {valeur}",
  "admin.catalogue.media.preview_taille": "Size: {valeur}",
  "admin.catalogue.media.preview_ajoute": "Added: {valeur}",
  "admin.catalogue.media.btn_copier_url_data": "Copy URL / data",
  "admin.catalogue.media.televerser_garde": "Upload a media",
  "admin.catalogue.media.renommer_garde": "Rename media",
  "admin.catalogue.media.supprimer_garde": "Delete media",

  // ── Categories — Category list ────────────────────────────────────────────
  "admin.catalogue.categories.titre": "Categories",
  "admin.catalogue.categories.description_un": "{n} category · {produits} linked products.",
  "admin.catalogue.categories.description_autre": "{n} categories · {produits} linked products.",
  "admin.catalogue.categories.btn_nouvelle": "New category",
  "admin.catalogue.categories.pas_image": "No image",
  "admin.catalogue.categories.produits_un": "{n} product",
  "admin.catalogue.categories.produits_autre": "{n} products",
  "admin.catalogue.categories.details": "Details",
  "admin.catalogue.categories.vide_aucune": "No categories.",
  "admin.catalogue.categories.toast_supprimee": 'Category "{nom}" deleted',
  "admin.catalogue.categories.supprimer_titre": 'Delete "{nom}"?',
  "admin.catalogue.categories.supprimer_impossible_un":
    "Cannot delete: {n} product is still linked to this category. Reassign it from /admin/products, then try again.",
  "admin.catalogue.categories.supprimer_impossible_autre":
    "Cannot delete: {n} products are still linked to this category. Reassign them from /admin/products, then try again.",
  "admin.catalogue.categories.supprimer_confirmation":
    "This action cannot be undone. The category settings will be lost.",
  "admin.catalogue.categories.supprimer_en_cours": "Deleting…",
  "admin.catalogue.categories.supprimer_garde": "Delete category",

  // ── CategoryDetail — Category page ───────────────────────────────────────
  "admin.catalogue.categorie_detail.titre_chargement": "Category",
  "admin.catalogue.categorie_detail.titre_introuvable": "Category not found",
  "admin.catalogue.categorie_detail.vide_introuvable": 'No category "{slug}"',
  "admin.catalogue.categorie_detail.retour": "Back",
  "admin.catalogue.categorie_detail.modifier": "Edit",
  "admin.catalogue.categorie_detail.pas_image": "No image",
  "admin.catalogue.categorie_detail.kpi_produits": "Products",
  "admin.catalogue.categorie_detail.kpi_prix_moyen": "Average price",
  "admin.catalogue.categorie_detail.marques_presentes_un": "Present brand ({n})",
  "admin.catalogue.categorie_detail.marques_presentes_autre": "Present brands ({n})",
  "admin.catalogue.categorie_detail.produits_un": "Product ({n})",
  "admin.catalogue.categorie_detail.produits_autre": "Products ({n})",
  "admin.catalogue.categorie_detail.btn_nouveau_produit": "New product",
  "admin.catalogue.categorie_detail.vide_produits": "No products in this category.",

  // ── CategoryForm — Category form ──────────────────────────────────────────
  "admin.catalogue.categorie_form.titre_nouveau": "New category",
  "admin.catalogue.categorie_form.titre_modifier": "Edit category",
  "admin.catalogue.categorie_form.retour": "Back",
  "admin.catalogue.categorie_form.supprimer": "Delete",
  "admin.catalogue.categorie_form.annuler": "Cancel",
  "admin.catalogue.categorie_form.creer": "Create",
  "admin.catalogue.categorie_form.enregistrer": "Save",
  "admin.catalogue.categorie_form.enregistrement": "Saving…",
  "admin.catalogue.categorie_form.suppression": "Deleting…",
  "admin.catalogue.categorie_form.section_informations": "Information",
  "admin.catalogue.categorie_form.label_slug": "Slug (URL)",
  "admin.catalogue.categorie_form.label_nom": "Display name",
  "admin.catalogue.categorie_form.label_description": "Description",
  "admin.catalogue.categorie_form.compteur_description": "{n}/300",
  "admin.catalogue.categorie_form.label_image": "Cover image (URL, optional)",
  "admin.catalogue.categorie_form.toast_creee": "Category created",
  "admin.catalogue.categorie_form.toast_mise_a_jour": "Category updated",
  "admin.catalogue.categorie_form.toast_supprimee": "Category deleted",
  "admin.catalogue.categorie_form.toast_form_invalide": "Fix the form errors.",
  "admin.catalogue.categorie_form.toast_slug_existant": "Slug already used",
  "admin.catalogue.categorie_form.erreur_slug_existant": "This slug already exists",
  "admin.catalogue.categorie_form.erreur_produits_utilises":
    "Cannot delete: {n} product(s) are using this category.",
  "admin.catalogue.categorie_form.supprimer_titre": "Delete this category?",
  "admin.catalogue.categorie_form.supprimer_impossible":
    "Cannot delete: {n} product(s) are still using this category.",
  "admin.catalogue.categorie_form.supprimer_confirmation":
    'The category "{nom}" will be permanently deleted.',
  "admin.catalogue.categorie_form.creer_garde": "Create category",
  "admin.catalogue.categorie_form.modifier_garde": "Edit category",
  "admin.catalogue.categorie_form.supprimer_garde": "Delete category",

  // ── Brands — Brand list ───────────────────────────────────────────────────
  "admin.catalogue.marques.titre": "Brands",
  "admin.catalogue.marques.description_un": "{n} brand listed.",
  "admin.catalogue.marques.description_autre": "{n} brands listed.",
  "admin.catalogue.marques.btn_nouvelle": "New brand",
  "admin.catalogue.marques.produits_un": "{n} product",
  "admin.catalogue.marques.produits_autre": "{n} products",
  "admin.catalogue.marques.prix_moyen": "Average price",

  // ── BrandDetail — Brand page ──────────────────────────────────────────────
  "admin.catalogue.marque_detail.titre_chargement": "Brand",
  "admin.catalogue.marque_detail.titre_introuvable": "Brand not found",
  "admin.catalogue.marque_detail.vide_introuvable": 'No brand "{id}"',
  "admin.catalogue.marque_detail.retour": "Back",
  "admin.catalogue.marque_detail.modifier": "Edit",
  "admin.catalogue.marque_detail.origine_inconnue": "Unknown origin",
  "admin.catalogue.marque_detail.kpi_produits": "Products",
  "admin.catalogue.marque_detail.kpi_prix_moyen": "Average price",
  "admin.catalogue.marque_detail.categories_couvertes_un": "Covered category ({n})",
  "admin.catalogue.marque_detail.categories_couvertes_autre": "Covered categories ({n})",
  "admin.catalogue.marque_detail.produits_un": "Product ({n})",
  "admin.catalogue.marque_detail.produits_autre": "Products ({n})",
  "admin.catalogue.marque_detail.btn_nouveau_produit": "New product",
  "admin.catalogue.marque_detail.vide_produits": "No products listed for this brand.",

  // ── BrandForm — Brand form ────────────────────────────────────────────────
  "admin.catalogue.marque_form.titre_nouveau": "New brand",
  "admin.catalogue.marque_form.titre_modifier": "Edit brand",
  "admin.catalogue.marque_form.retour": "Back",
  "admin.catalogue.marque_form.supprimer": "Delete",
  "admin.catalogue.marque_form.annuler": "Cancel",
  "admin.catalogue.marque_form.creer": "Create",
  "admin.catalogue.marque_form.enregistrer": "Save",
  "admin.catalogue.marque_form.enregistrement": "Saving…",
  "admin.catalogue.marque_form.suppression": "Deleting…",
  "admin.catalogue.marque_form.section_informations": "Information",
  "admin.catalogue.marque_form.label_slug": "Slug",
  "admin.catalogue.marque_form.label_nom": "Name",
  "admin.catalogue.marque_form.label_pays": "Country of origin",
  "admin.catalogue.marque_form.label_description": "Description",
  "admin.catalogue.marque_form.compteur_description": "{n}/300",
  "admin.catalogue.marque_form.toast_creee": "Brand created",
  "admin.catalogue.marque_form.toast_mise_a_jour": "Brand updated",
  "admin.catalogue.marque_form.toast_supprimee": "Brand deleted",
  "admin.catalogue.marque_form.toast_form_invalide": "Fix the form errors.",
  "admin.catalogue.marque_form.toast_slug_existant": "Slug already used",
  "admin.catalogue.marque_form.toast_nom_existant": "Name already used",
  "admin.catalogue.marque_form.erreur_slug_existant": "This slug already exists",
  "admin.catalogue.marque_form.erreur_nom_existant": "A brand with this name already exists",
  "admin.catalogue.marque_form.erreur_produits_utilises":
    "Cannot delete: {n} product(s) are using this brand.",
  "admin.catalogue.marque_form.supprimer_titre": "Delete this brand?",
  "admin.catalogue.marque_form.supprimer_impossible":
    "Cannot delete: {n} product(s) are still using this brand.",
  "admin.catalogue.marque_form.supprimer_confirmation":
    'The brand "{nom}" will be permanently deleted.',
  "admin.catalogue.marque_form.creer_garde": "Create brand",
  "admin.catalogue.marque_form.modifier_garde": "Edit brand",
  "admin.catalogue.marque_form.supprimer_garde": "Delete brand",
};

export default catalogueEn;
