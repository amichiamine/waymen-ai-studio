/**
 * Groupe « catalogue » — dictionnaire fr (français).
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
const catalogueFr: Record<string, string> = {
  // ── Statuts de stock — partagés par plusieurs pages ─────────────────────
  "admin.catalogue.commun.stock_in": "En stock",
  "admin.catalogue.commun.stock_low": "Stock faible",
  "admin.catalogue.commun.stock_out": "Rupture",

  // ── ProductForm — Nouveau / Modifier un produit ───────────────────────────
  "admin.catalogue.produit_form.titre_nouveau": "Nouveau produit",
  "admin.catalogue.produit_form.titre_modifier": "Modifier le produit",
  "admin.catalogue.produit_form.description_nouveau": "Créer une fiche produit.",
  "admin.catalogue.produit_form.description_modifier": "Identifiant : {id}",
  "admin.catalogue.produit_form.retour": "Retour",
  "admin.catalogue.produit_form.supprimer": "Supprimer",
  "admin.catalogue.produit_form.annuler": "Annuler",
  "admin.catalogue.produit_form.creer": "Créer",
  "admin.catalogue.produit_form.enregistrer": "Enregistrer",
  "admin.catalogue.produit_form.enregistrement": "Enregistrement…",
  "admin.catalogue.produit_form.suppression": "Suppression…",
  "admin.catalogue.produit_form.section_informations": "Informations",
  "admin.catalogue.produit_form.label_id": "ID (slug unique)",
  "admin.catalogue.produit_form.label_marque": "Marque",
  "admin.catalogue.produit_form.label_categorie": "Catégorie",
  "admin.catalogue.produit_form.label_type_article": "Type d'article",
  "admin.catalogue.produit_form.type_physique": "Produit physique (avec livraison)",
  "admin.catalogue.produit_form.type_service": "Prestation de service (sans livraison)",
  "admin.catalogue.produit_form.label_attributs_personnalises":
    "Attributs & caractéristiques personnalisés",
  "admin.catalogue.produit_form.btn_ajouter_attribut": "+ Ajouter une caractéristique",
  "admin.catalogue.produit_form.attribut_nom":
    "Nom de la caractéristique (ex: Taille, Couleur, Matière)",
  "admin.catalogue.produit_form.attribut_valeur": "Valeur",
  "admin.catalogue.produit_form.btn_supprimer_attribut": "Supprimer",
  "admin.catalogue.produit_form.label_nom": "Nom",
  "admin.catalogue.produit_form.label_nom_en": "Nom (EN)",
  "admin.catalogue.produit_form.label_nom_ar": "الاسم (AR)",
  "admin.catalogue.produit_form.label_specs": "Accroche & points clés (résumé)",
  "admin.catalogue.produit_form.label_specs_en": "Accroche & points clés (EN)",
  "admin.catalogue.produit_form.label_specs_ar": "النقاط البارزة والموجز (AR)",
  "admin.catalogue.produit_form.placeholder_specs_physique":
    "ex: 100% Coton bio · Coupe standard · Finition artisanale",
  "admin.catalogue.produit_form.placeholder_specs_service":
    "ex: Session 1h · Support inclus · Présentiel ou Visio",
  "admin.catalogue.produit_form.specs_it_titre":
    "Spécifications techniques informatiques (CPU, RAM, GPU, Écran, OS)",
  "admin.catalogue.produit_form.specs_it_aide":
    "Optionnel. Remplissez ces champs pour du matériel informatique ou électronique.",
  "admin.catalogue.produit_form.specs_it_replier": "Replier",
  "admin.catalogue.produit_form.specs_it_deplier": "Déplier",
  "admin.catalogue.produit_form.custom_specs_titre": "Caractéristiques & attributs libres",
  "admin.catalogue.produit_form.custom_specs_desc":
    "Ajoutez n'importe quel attribut propre à votre domaine : Taille, Couleur, Matière, Poids, Volume, Durée, etc.",
  "admin.catalogue.produit_form.traductions_facultatives":
    "Traductions facultatives. Un produit sans traduction reste valide.",
  "admin.catalogue.produit_form.section_prix_stock": "Prix & stock",
  "admin.catalogue.produit_form.label_prix": "Prix (DA)",
  "admin.catalogue.produit_form.label_ancien_prix": "Ancien prix (optionnel)",
  "admin.catalogue.produit_form.label_quantite": "Quantité (unités)",
  "admin.catalogue.produit_form.hint_quantite":
    "Le statut se recalcule selon les seuils définis dans /admin/settings.",
  "admin.catalogue.produit_form.label_etat_stock": "État du stock (surcharge)",
  "admin.catalogue.produit_form.label_bestseller": "Best-seller",
  "admin.catalogue.produit_form.label_promotion": "En promotion",
  "admin.catalogue.produit_form.section_image": "Image",
  "admin.catalogue.produit_form.label_depuis_mediatheque": "Depuis la médiathèque",
  "admin.catalogue.produit_form.placeholder_choisir_media": "Choisir un média…",
  "admin.catalogue.produit_form.label_url_image": "URL ou chemin",
  "admin.catalogue.produit_form.placeholder_url_image": "URL ou chemin de l'image",
  "admin.catalogue.produit_form.toast_cree": "Produit créé",
  "admin.catalogue.produit_form.toast_mis_a_jour": "Produit mis à jour",
  "admin.catalogue.produit_form.toast_champs_invalides":
    "Certains champs sont invalides — corrigez les erreurs en rouge.",
  "admin.catalogue.produit_form.toast_id_existant": "ID déjà utilisé",
  "admin.catalogue.produit_form.toast_categorie_inconnue": "Catégorie inconnue",
  "admin.catalogue.produit_form.erreur_id_existant": "Cet ID existe déjà",
  "admin.catalogue.produit_form.erreur_categorie_inconnue": "Catégorie inconnue",
  "admin.catalogue.produit_form.supprimer_titre": "Supprimer ce produit ?",
  "admin.catalogue.produit_form.supprimer_description":
    "Le produit « {nom} » sera supprimé du catalogue local. Cette action est irréversible.",
  "admin.catalogue.produit_form.creer_garde": "Créer le produit",
  "admin.catalogue.produit_form.modifier_garde": "Modifier le produit",
  "admin.catalogue.produit_form.supprimer_garde": "Supprimer le produit",

  // ── ProductDetail — Fiche produit ────────────────────────────────────────
  "admin.catalogue.produit_detail.titre_chargement": "Produit",
  "admin.catalogue.produit_detail.titre_introuvable": "Produit introuvable",
  "admin.catalogue.produit_detail.vide_introuvable": "Aucun produit avec l'identifiant « {id} »",
  "admin.catalogue.produit_detail.retour": "Retour",
  "admin.catalogue.produit_detail.fiche_publique": "Fiche publique",
  "admin.catalogue.produit_detail.modifier": "Modifier",
  "admin.catalogue.produit_detail.badge_bestseller": "Best-seller",
  "admin.catalogue.produit_detail.badge_promotion": "Promotion",
  "admin.catalogue.produit_detail.section_resume": "Résumé",
  "admin.catalogue.produit_detail.kpi_unites_vendues": "Unités vendues",
  "admin.catalogue.produit_detail.kpi_chiffre_affaires": "Chiffre d'affaires",
  "admin.catalogue.produit_detail.kpi_note_moyenne": "Note moyenne ({n})",
  "admin.catalogue.produit_detail.section_categorie": "Catégorie",
  "admin.catalogue.produit_detail.section_marque": "Marque",
  "admin.catalogue.produit_detail.commandes_recentes_un": "Commande récente ({n})",
  "admin.catalogue.produit_detail.commandes_recentes_autre": "Commandes récentes ({n})",
  "admin.catalogue.produit_detail.vide_commandes": "Aucune commande mock associée.",

  // ── Inventory — Gestion du stock ─────────────────────────────────────────
  "admin.catalogue.stock.titre": "Stock",
  "admin.catalogue.stock.description":
    "Ajustez les niveaux de stock, journalisez les mouvements et suivez les alertes.",
  "admin.catalogue.stock.kpi_total": "Total produits",
  "admin.catalogue.stock.kpi_en_stock": "En stock",
  "admin.catalogue.stock.kpi_faible": "Stock faible",
  "admin.catalogue.stock.kpi_rupture": "Rupture",
  "admin.catalogue.stock.onglet_produits": "Produits",
  "admin.catalogue.stock.onglet_mouvements_un": "Mouvement ({n})",
  "admin.catalogue.stock.onglet_mouvements_autre": "Mouvements ({n})",
  "admin.catalogue.stock.recherche_placeholder": "Rechercher un produit…",
  "admin.catalogue.stock.col_produit": "Produit",
  "admin.catalogue.stock.col_marque": "Marque",
  "admin.catalogue.stock.col_categorie": "Catégorie",
  "admin.catalogue.stock.col_qte": "Qté",
  "admin.catalogue.stock.col_statut": "Statut",
  "admin.catalogue.stock.col_action": "Action",
  "admin.catalogue.stock.btn_ajuster": "Ajuster",
  "admin.catalogue.stock.vide_aucun_produit": "Aucun produit.",
  "admin.catalogue.stock.col_date": "Date",
  "admin.catalogue.stock.col_delta": "Delta",
  "admin.catalogue.stock.col_raison": "Raison",
  "admin.catalogue.stock.vide_aucun_mouvement": "Aucun mouvement journalisé.",
  "admin.catalogue.stock.dialog_titre": "Ajuster le stock — {nom}",
  "admin.catalogue.stock.dialog_label_delta": "Mouvement (delta)",
  "admin.catalogue.stock.dialog_hint_delta":
    "Négatif = sortie (vente, casse), positif = entrée (réappro). Le delta est transmis directement au serveur pour garantir l'atomicité en phase 4.",
  "admin.catalogue.stock.dialog_label_raison": "Raison",
  "admin.catalogue.stock.dialog_placeholder_raison": "Réapprovisionnement, inventaire, casse…",
  "admin.catalogue.stock.dialog_seuils":
    "Seuils actuels : rupture ≤ {rupture}, faible ≤ {faible}. Le statut sera recalculé automatiquement.",
  "admin.catalogue.stock.dialog_annuler": "Annuler",
  "admin.catalogue.stock.dialog_enregistrer": "Enregistrer",
  "admin.catalogue.stock.dialog_enregistrement": "Enregistrement…",
  "admin.catalogue.stock.toast_mis_a_jour": "Stock mis à jour — {nom}",
  "admin.catalogue.stock.erreur_delta_zero": "Le delta doit être différent de 0",
  "admin.catalogue.stock.erreur_raison_requise": "Indiquez une raison",
  "admin.catalogue.stock.ajuster_garde": "Ajuster le stock",

  // ── Media — Médiathèque ───────────────────────────────────────────────────
  "admin.catalogue.media.titre": "Médiathèque",
  "admin.catalogue.media.description":
    "{televerse} images téléversées · {catalogue} images du catalogue · {taille} utilisés (limite pratique 5 Mo par fichier).",
  "admin.catalogue.media.btn_televerser": "Téléverser",
  "admin.catalogue.media.recherche_placeholder": "Rechercher (nom, tag)…",
  "admin.catalogue.media.quota_label": "Espace médiathèque : {utilise} / {total}",
  "admin.catalogue.media.quota_critique":
    "Quota atteint — téléversements bloqués. Supprimez des images ou attendez le stockage serveur (phase 4).",
  "admin.catalogue.media.quota_avertissement":
    "Quota bientôt atteint. Envisagez de supprimer des images inutilisées.",
  "admin.catalogue.media.vide_aucune_image":
    "Aucune image. Cliquez sur « Téléverser » pour ajouter des visuels.",
  "admin.catalogue.media.source_catalogue": "Catalogue",
  "admin.catalogue.media.copier_url": "Copier l'URL",
  "admin.catalogue.media.renommer": "Renommer",
  "admin.catalogue.media.supprimer": "Supprimer",
  "admin.catalogue.media.toast_url_copiee": "URL copiée",
  "admin.catalogue.media.toast_erreur_copie": "Impossible de copier",
  "admin.catalogue.media.toast_televerse": "{nom} : téléversé et sauvegardé.",
  "admin.catalogue.media.toast_supprime": "Supprimé",
  "admin.catalogue.media.toast_renomme": "Métadonnées mises à jour",
  "admin.catalogue.media.toast_erreur_format": "{nom} : format non supporté",
  "admin.catalogue.media.toast_erreur_taille": "{nom} : trop volumineux (>5 Mo)",
  "admin.catalogue.media.toast_quota_atteint":
    "Quota de la médiathèque atteint ({max} max). Supprimez des images existantes, ou attendez la phase 4 (stockage serveur).",
  "admin.catalogue.media.toast_quota_avertissement":
    "Attention : ce téléversement portera la médiathèque à {utilise} / {total}. Le stockage serveur (phase 4) lèvera cette limite.",
  "admin.catalogue.media.toast_erreur_sauvegarde":
    "{nom} : l'image n'a pas pu être sauvegardée ({erreur}). Supprimez des médias pour libérer de l'espace, ou attendez la phase 4.",
  "admin.catalogue.media.erreur_nom_requis": "Nom requis",
  "admin.catalogue.media.dialog_renommer_titre": "Renommer",
  "admin.catalogue.media.dialog_label_nom": "Nom",
  "admin.catalogue.media.dialog_label_tag": "Tag (optionnel)",
  "admin.catalogue.media.dialog_placeholder_tag": "ex: bannière, produit…",
  "admin.catalogue.media.dialog_annuler": "Annuler",
  "admin.catalogue.media.dialog_enregistrer": "Enregistrer",
  "admin.catalogue.media.dialog_enregistrement": "Enregistrement…",
  "admin.catalogue.media.preview_format": "Format : {valeur}",
  "admin.catalogue.media.preview_taille": "Taille : {valeur}",
  "admin.catalogue.media.preview_ajoute": "Ajouté : {valeur}",
  "admin.catalogue.media.btn_copier_url_data": "Copier l'URL / data",
  "admin.catalogue.media.televerser_garde": "Téléverser un média",
  "admin.catalogue.media.renommer_garde": "Renommer le média",
  "admin.catalogue.media.supprimer_garde": "Supprimer le média",

  // ── Categories — Liste des catégories ────────────────────────────────────
  "admin.catalogue.categories.titre": "Catégories",
  "admin.catalogue.categories.description_un": "{n} catégorie · {produits} produits rattachés.",
  "admin.catalogue.categories.description_autre": "{n} catégories · {produits} produits rattachés.",
  "admin.catalogue.categories.btn_nouvelle": "Nouvelle catégorie",
  "admin.catalogue.categories.pas_image": "Pas d'image",
  "admin.catalogue.categories.produits_un": "{n} produit",
  "admin.catalogue.categories.produits_autre": "{n} produits",
  "admin.catalogue.categories.details": "Détails",
  "admin.catalogue.categories.vide_aucune": "Aucune catégorie.",
  "admin.catalogue.categories.toast_supprimee": "Catégorie « {nom} » supprimée",
  "admin.catalogue.categories.supprimer_titre": "Supprimer « {nom} » ?",
  "admin.catalogue.categories.supprimer_impossible_un":
    "Impossible : {n} produit encore rattaché à cette catégorie. Réassignez-le à une autre catégorie depuis /admin/products, puis réessayez.",
  "admin.catalogue.categories.supprimer_impossible_autre":
    "Impossible : {n} produits encore rattachés à cette catégorie. Réassignez-les à une autre catégorie depuis /admin/products, puis réessayez.",
  "admin.catalogue.categories.supprimer_confirmation":
    "Cette action est irréversible. Les paramètres de la catégorie seront perdus.",
  "admin.catalogue.categories.supprimer_en_cours": "Suppression…",
  "admin.catalogue.categories.supprimer_garde": "Supprimer la catégorie",

  // ── CategoryDetail — Fiche catégorie ─────────────────────────────────────
  "admin.catalogue.categorie_detail.titre_chargement": "Catégorie",
  "admin.catalogue.categorie_detail.titre_introuvable": "Catégorie introuvable",
  "admin.catalogue.categorie_detail.vide_introuvable": "Aucune catégorie « {slug} »",
  "admin.catalogue.categorie_detail.retour": "Retour",
  "admin.catalogue.categorie_detail.modifier": "Modifier",
  "admin.catalogue.categorie_detail.pas_image": "Pas d'image",
  "admin.catalogue.categorie_detail.kpi_produits": "Produits",
  "admin.catalogue.categorie_detail.kpi_prix_moyen": "Prix moyen",
  "admin.catalogue.categorie_detail.marques_presentes_un": "Marque présente ({n})",
  "admin.catalogue.categorie_detail.marques_presentes_autre": "Marques présentes ({n})",
  "admin.catalogue.categorie_detail.produits_un": "Produit ({n})",
  "admin.catalogue.categorie_detail.produits_autre": "Produits ({n})",
  "admin.catalogue.categorie_detail.btn_nouveau_produit": "Nouveau produit",
  "admin.catalogue.categorie_detail.vide_produits": "Aucun produit dans cette catégorie.",

  // ── CategoryForm — Formulaire catégorie ──────────────────────────────────
  "admin.catalogue.categorie_form.titre_nouveau": "Nouvelle catégorie",
  "admin.catalogue.categorie_form.titre_modifier": "Modifier la catégorie",
  "admin.catalogue.categorie_form.retour": "Retour",
  "admin.catalogue.categorie_form.supprimer": "Supprimer",
  "admin.catalogue.categorie_form.annuler": "Annuler",
  "admin.catalogue.categorie_form.creer": "Créer",
  "admin.catalogue.categorie_form.enregistrer": "Enregistrer",
  "admin.catalogue.categorie_form.enregistrement": "Enregistrement…",
  "admin.catalogue.categorie_form.suppression": "Suppression…",
  "admin.catalogue.categorie_form.section_informations": "Informations",
  "admin.catalogue.categorie_form.label_slug": "Slug (URL)",
  "admin.catalogue.categorie_form.label_nom": "Nom affiché",
  "admin.catalogue.categorie_form.label_description": "Description",
  "admin.catalogue.categorie_form.compteur_description": "{n}/300",
  "admin.catalogue.categorie_form.label_image": "Image de couverture (URL, optionnel)",
  "admin.catalogue.categorie_form.toast_creee": "Catégorie créée",
  "admin.catalogue.categorie_form.toast_mise_a_jour": "Catégorie mise à jour",
  "admin.catalogue.categorie_form.toast_supprimee": "Catégorie supprimée",
  "admin.catalogue.categorie_form.toast_form_invalide": "Corrigez les erreurs du formulaire.",
  "admin.catalogue.categorie_form.toast_slug_existant": "Slug déjà utilisé",
  "admin.catalogue.categorie_form.erreur_slug_existant": "Ce slug existe déjà",
  "admin.catalogue.categorie_form.erreur_produits_utilises":
    "Impossible : {n} produit(s) utilisent cette catégorie.",
  "admin.catalogue.categorie_form.supprimer_titre": "Supprimer cette catégorie ?",
  "admin.catalogue.categorie_form.supprimer_impossible":
    "Impossible de supprimer : {n} produit(s) utilisent encore cette catégorie.",
  "admin.catalogue.categorie_form.supprimer_confirmation":
    "La catégorie « {nom} » sera supprimée définitivement.",
  "admin.catalogue.categorie_form.creer_garde": "Créer la catégorie",
  "admin.catalogue.categorie_form.modifier_garde": "Modifier la catégorie",
  "admin.catalogue.categorie_form.supprimer_garde": "Supprimer la catégorie",

  // ── Brands — Liste des marques ────────────────────────────────────────────
  "admin.catalogue.marques.titre": "Marques",
  "admin.catalogue.marques.description_un": "{n} marque référencée.",
  "admin.catalogue.marques.description_autre": "{n} marques référencées.",
  "admin.catalogue.marques.btn_nouvelle": "Nouvelle marque",
  "admin.catalogue.marques.produits_un": "{n} produit",
  "admin.catalogue.marques.produits_autre": "{n} produits",
  "admin.catalogue.marques.prix_moyen": "Prix moyen",

  // ── BrandDetail — Fiche marque ────────────────────────────────────────────
  "admin.catalogue.marque_detail.titre_chargement": "Marque",
  "admin.catalogue.marque_detail.titre_introuvable": "Marque introuvable",
  "admin.catalogue.marque_detail.vide_introuvable": "Aucune marque « {id} »",
  "admin.catalogue.marque_detail.retour": "Retour",
  "admin.catalogue.marque_detail.modifier": "Modifier",
  "admin.catalogue.marque_detail.origine_inconnue": "Origine inconnue",
  "admin.catalogue.marque_detail.kpi_produits": "Produits",
  "admin.catalogue.marque_detail.kpi_prix_moyen": "Prix moyen",
  "admin.catalogue.marque_detail.categories_couvertes_un": "Catégorie couverte ({n})",
  "admin.catalogue.marque_detail.categories_couvertes_autre": "Catégories couvertes ({n})",
  "admin.catalogue.marque_detail.produits_un": "Produit ({n})",
  "admin.catalogue.marque_detail.produits_autre": "Produits ({n})",
  "admin.catalogue.marque_detail.btn_nouveau_produit": "Nouveau produit",
  "admin.catalogue.marque_detail.vide_produits": "Aucun produit référencé pour cette marque.",

  // ── BrandForm — Formulaire marque ─────────────────────────────────────────
  "admin.catalogue.marque_form.titre_nouveau": "Nouvelle marque",
  "admin.catalogue.marque_form.titre_modifier": "Modifier la marque",
  "admin.catalogue.marque_form.retour": "Retour",
  "admin.catalogue.marque_form.supprimer": "Supprimer",
  "admin.catalogue.marque_form.annuler": "Annuler",
  "admin.catalogue.marque_form.creer": "Créer",
  "admin.catalogue.marque_form.enregistrer": "Enregistrer",
  "admin.catalogue.marque_form.enregistrement": "Enregistrement…",
  "admin.catalogue.marque_form.suppression": "Suppression…",
  "admin.catalogue.marque_form.section_informations": "Informations",
  "admin.catalogue.marque_form.label_slug": "Slug",
  "admin.catalogue.marque_form.label_nom": "Nom",
  "admin.catalogue.marque_form.label_pays": "Pays d'origine",
  "admin.catalogue.marque_form.label_description": "Description",
  "admin.catalogue.marque_form.compteur_description": "{n}/300",
  "admin.catalogue.marque_form.toast_creee": "Marque créée",
  "admin.catalogue.marque_form.toast_mise_a_jour": "Marque mise à jour",
  "admin.catalogue.marque_form.toast_supprimee": "Marque supprimée",
  "admin.catalogue.marque_form.toast_form_invalide": "Corrigez les erreurs du formulaire.",
  "admin.catalogue.marque_form.toast_slug_existant": "Slug déjà utilisé",
  "admin.catalogue.marque_form.toast_nom_existant": "Nom déjà utilisé",
  "admin.catalogue.marque_form.erreur_slug_existant": "Ce slug existe déjà",
  "admin.catalogue.marque_form.erreur_nom_existant": "Une marque avec ce nom existe déjà",
  "admin.catalogue.marque_form.erreur_produits_utilises":
    "Impossible : {n} produit(s) utilisent cette marque.",
  "admin.catalogue.marque_form.supprimer_titre": "Supprimer cette marque ?",
  "admin.catalogue.marque_form.supprimer_impossible":
    "Impossible de supprimer : {n} produit(s) utilisent encore cette marque.",
  "admin.catalogue.marque_form.supprimer_confirmation":
    "La marque « {nom} » sera supprimée définitivement.",
  "admin.catalogue.marque_form.creer_garde": "Créer la marque",
  "admin.catalogue.marque_form.modifier_garde": "Modifier la marque",
  "admin.catalogue.marque_form.supprimer_garde": "Supprimer la marque",
};

export default catalogueFr;
