/**
 * Groupe « ventes » — dictionnaire en (anglais).
 *
 * PROPRIÉTAIRE : l'agent de réplication chargé du groupe « ventes ». Aucun autre
 * agent n'écrit dans ce fichier ; en échange, cet agent n'écrit dans aucun
 * autre — c'est ce qui permet à cinq agents de travailler en parallèle sans
 * conflit de fusion.
 *
 * Écrans couverts : Orders, OrderDetail, Customers, Coupons, Shipping, Payments.
 *
 * Seul préfixe autorisé ici : `admin.ventes.<page>.<cle>`.
 * Convention obligatoire (nommage, pluriels, RTL, qualité de l'arabe) :
 * `src/lib/i18n/admin/index.ts`. Vocabulaire partagé déjà traduit, à réutiliser
 * plutôt qu'à recopier : `admin.socle.commun.*`, `admin.socle.confirmation.*`,
 * `admin.socle.roles.*`.
 *
 * Les trois langues doivent porter EXACTEMENT les mêmes clés :
 * `bun run verifier-i18n` échoue sinon.
 */
const ventesEn: Record<string, string> = {
  // ── Order statuses — shared labels for orders / customers ────────────────
  "admin.ventes.commun.statut_pending": "Pending",
  "admin.ventes.commun.statut_processing": "Processing",
  "admin.ventes.commun.statut_shipped": "Shipped",
  "admin.ventes.commun.statut_delivered": "Delivered",
  "admin.ventes.commun.statut_cancelled": "Cancelled",

  // ── Review statuses ───────────────────────────────────────────────────────
  "admin.ventes.commun.avis_pending": "Pending",
  "admin.ventes.commun.avis_approved": "Approved",
  "admin.ventes.commun.avis_rejected": "Rejected",

  // ── Orders (order list) ───────────────────────────────────────────────────
  "admin.ventes.commandes.titre": "Orders",
  "admin.ventes.commandes.description_un": "{n} order recorded.",
  "admin.ventes.commandes.description_autre": "{n} orders recorded.",
  "admin.ventes.commandes.chargement": "Loading orders…",
  "admin.ventes.commandes.recherche_placeholder": "Search (no., customer, province)…",
  "admin.ventes.commandes.onglet_toutes": "All ({n})",
  "admin.ventes.commandes.onglet_pending": "Pending ({n})",
  "admin.ventes.commandes.onglet_processing": "Processing ({n})",
  "admin.ventes.commandes.onglet_shipped": "Shipped ({n})",
  "admin.ventes.commandes.onglet_delivered": "Delivered ({n})",
  "admin.ventes.commandes.onglet_cancelled": "Cancelled ({n})",
  "admin.ventes.commandes.col_numero": "No.",
  "admin.ventes.commandes.col_client": "Customer",
  "admin.ventes.commandes.col_wilaya": "Province",
  "admin.ventes.commandes.col_date": "Date",
  "admin.ventes.commandes.col_total": "Total",
  "admin.ventes.commandes.col_statut": "Status",
  "admin.ventes.commandes.voir_commande": "View order",
  "admin.ventes.commandes.vide": "No orders.",

  // ── OrderDetail ───────────────────────────────────────────────────────────
  "admin.ventes.detail.titre": "Order {id}",
  "admin.ventes.detail.description": "Placed on {date}",
  "admin.ventes.detail.retour": "Back",
  "admin.ventes.detail.chargement": "Loading order…",
  "admin.ventes.detail.introuvable": "Order not found.",
  "admin.ventes.detail.section_articles": "Items",
  "admin.ventes.detail.qte": "Qty: {qty} × {prix}",
  "admin.ventes.detail.sous_total": "Subtotal",
  "admin.ventes.detail.remise": "Discount {coupon}",
  "admin.ventes.detail.livraison": "Shipping",
  "admin.ventes.detail.livraison_gratuite": "Free",
  "admin.ventes.detail.total": "Total",
  "admin.ventes.detail.section_suivi": "Status history",
  "admin.ventes.detail.note_client": "Customer note",
  "admin.ventes.detail.section_changer_statut": "Change status",
  "admin.ventes.detail.mise_a_jour_en_cours": "Updating…",
  "admin.ventes.detail.toast_statut_maj": "Status updated",
  "admin.ventes.detail.garde_changer_statut": "Change order status",
  "admin.ventes.detail.section_client": "Customer",
  "admin.ventes.detail.voir_client": "View customer",
  "admin.ventes.detail.section_livraison": "Shipping & payment",
  "admin.ventes.detail.adresse": "Address:",
  "admin.ventes.detail.wilaya": "Province:",
  "admin.ventes.detail.type_livraison": "Type:",
  "admin.ventes.detail.livraison_domicile": "Home delivery",
  "admin.ventes.detail.livraison_bureau": "Office delivery",
  "admin.ventes.detail.telephone": "Phone:",
  "admin.ventes.detail.paiement": "Payment:",

  // ── Customers ─────────────────────────────────────────────────────────────
  "admin.ventes.clients.titre": "Customers",
  "admin.ventes.clients.description_un":
    "{n} customer registered — statistics derived from orders.",
  "admin.ventes.clients.description_autre":
    "{n} customers registered — statistics derived from orders.",
  "admin.ventes.clients.nouveau": "New customer",
  "admin.ventes.clients.chargement": "Loading customers…",
  "admin.ventes.clients.recherche_placeholder": "Search (name, email, province, phone)…",
  "admin.ventes.clients.col_nom": "Name",
  "admin.ventes.clients.col_email": "Email",
  "admin.ventes.clients.col_telephone": "Phone",
  "admin.ventes.clients.col_wilaya": "Province",
  "admin.ventes.clients.col_commandes": "Orders",
  "admin.ventes.clients.col_depense": "Spent (LTV)",
  "admin.ventes.clients.col_derniere_commande": "Last order",
  "admin.ventes.clients.details": "Details",
  "admin.ventes.clients.vide_recherche": "No customer matches the search.",
  "admin.ventes.clients.vide_aucun":
    "No customers registered. Create the first customer using the button above.",
  "admin.ventes.clients.historique_commandes": "Order history",
  "admin.ventes.clients.aucune_commande": "No orders.",
  "admin.ventes.clients.ouvrir_commande": "Open",
  "admin.ventes.clients.inscrit_le": "Registered on {date}",
  "admin.ventes.clients.kpi_ltv": "LTV",
  "admin.ventes.clients.kpi_commandes": "Orders",
  "admin.ventes.clients.kpi_panier_moyen": "Avg. basket",
  "admin.ventes.clients.kpi_derniere": "Last",
  // Customer form
  "admin.ventes.clients.form_titre_nouveau": "New customer",
  "admin.ventes.clients.form_titre_modifier": "Edit customer",
  "admin.ventes.clients.form_nom": "Full name",
  "admin.ventes.clients.form_nom_placeholder": "First Last",
  "admin.ventes.clients.form_email": "Email",
  "admin.ventes.clients.form_email_placeholder": "customer@example.dz",
  "admin.ventes.clients.form_telephone": "Phone",
  "admin.ventes.clients.form_telephone_placeholder": "0XXXXXXXXX",
  "admin.ventes.clients.form_wilaya": "Province",
  "admin.ventes.clients.form_wilaya_placeholder": "Select a province…",
  "admin.ventes.clients.form_enregistrement": "Saving…",
  // Validation
  "admin.ventes.clients.err_nom": "Name required (2 characters min.)",
  "admin.ventes.clients.err_email": "Invalid email",
  "admin.ventes.clients.err_email_duplique": "Email address already used by another customer",
  "admin.ventes.clients.err_telephone": "Invalid phone (format: 0XXXXXXXXX)",
  "admin.ventes.clients.err_wilaya": "Province required",
  // Deletion
  "admin.ventes.clients.supprimer_titre": "Delete this customer?",
  "admin.ventes.clients.supprimer_description":
    "Customer {nom} ({email}) will be permanently deleted. This action cannot be undone.",
  "admin.ventes.clients.supprimer_bloque_un":
    "Cannot delete: customer {nom} is linked to {n} active order. Close or cancel this order from /admin/orders before deleting this customer.",
  "admin.ventes.clients.supprimer_bloque_autre":
    "Cannot delete: customer {nom} is linked to {n} active orders. Close or cancel those orders from /admin/orders before deleting this customer.",
  "admin.ventes.clients.toast_cree": "“{nom}” created",
  "admin.ventes.clients.toast_modifie": "“{nom}” updated",
  "admin.ventes.clients.toast_supprime": "Customer “{nom}” deleted",
  "admin.ventes.clients.garde_modifier": "Edit customer",
  "admin.ventes.clients.garde_creer": "Create customer",
  "admin.ventes.clients.garde_supprimer": "Delete customer",

  // ── Coupons ───────────────────────────────────────────────────────────────
  "admin.ventes.coupons.titre": "Coupons",
  "admin.ventes.coupons.description_un": "{n} promo code (active and archived).",
  "admin.ventes.coupons.description_autre": "{n} promo codes (active and archived).",
  "admin.ventes.coupons.nouveau": "New coupon",
  "admin.ventes.coupons.chargement": "Loading coupons…",
  "admin.ventes.coupons.col_code": "Code",
  "admin.ventes.coupons.col_remise": "Discount",
  "admin.ventes.coupons.col_achat_min": "Min. purchase",
  "admin.ventes.coupons.col_usage": "Usage",
  "admin.ventes.coupons.col_expire": "Expires",
  "admin.ventes.coupons.col_statut": "Status",
  "admin.ventes.coupons.statut_actif": "Active",
  "admin.ventes.coupons.statut_expire": "Expired",
  "admin.ventes.coupons.statut_desactive": "Disabled",
  "admin.ventes.coupons.vide": "No coupons.",
  "admin.ventes.coupons.copie": "{code} copied",
  // Coupon form
  "admin.ventes.coupons.form_titre_nouveau": "New coupon",
  "admin.ventes.coupons.form_titre_modifier": "Edit coupon",
  "admin.ventes.coupons.form_code": "Code",
  "admin.ventes.coupons.form_code_placeholder": "WELCOME10",
  "admin.ventes.coupons.form_type": "Type",
  "admin.ventes.coupons.form_type_percent": "Percentage",
  "admin.ventes.coupons.form_type_fixed": "Fixed amount (DA)",
  "admin.ventes.coupons.form_valeur": "Value",
  "admin.ventes.coupons.form_achat_min": "Min. purchase (DA)",
  "admin.ventes.coupons.form_limite_usage": "Usage limit",
  "admin.ventes.coupons.form_expiration": "Expiry date",
  "admin.ventes.coupons.form_actif": "Active",
  "admin.ventes.coupons.form_enregistrement": "Saving…",
  "admin.ventes.coupons.form_creer": "Create",
  // Validation
  "admin.ventes.coupons.err_code_court": "Code too short",
  "admin.ventes.coupons.err_code_format": "Uppercase letters, digits, - _",
  "admin.ventes.coupons.err_date": "Date required",
  // Deletion
  "admin.ventes.coupons.supprimer_confirm": "Delete coupon {code}?",
  "admin.ventes.coupons.toast_cree": "Coupon created",
  "admin.ventes.coupons.toast_modifie": "Coupon updated",
  "admin.ventes.coupons.toast_supprime": "Coupon deleted",
  "admin.ventes.coupons.garde_creer": "Create coupon",
  "admin.ventes.coupons.garde_modifier": "Edit coupon",
  "admin.ventes.coupons.garde_supprimer": "Delete coupon",

  // ── Reviews ───────────────────────────────────────────────────────────────
  "admin.ventes.avis.titre": "Reviews",
  "admin.ventes.avis.description": "{produits} product reviews · {accueil} homepage reviews.",
  "admin.ventes.avis.chargement": "Loading…",
  "admin.ventes.avis.onglet_produits": "Product reviews ({n})",
  "admin.ventes.avis.onglet_accueil": "Homepage reviews ({n})",
  "admin.ventes.avis.filtre_tous": "All ({n})",
  "admin.ventes.avis.filtre_pending": "Pending ({n})",
  "admin.ventes.avis.filtre_approuves": "Approved ({n})",
  "admin.ventes.avis.filtre_rejetes": "Rejected ({n})",
  "admin.ventes.avis.meta": "By {auteur} · on {produit} · {date}",
  "admin.ventes.avis.approuver": "Approve",
  "admin.ventes.avis.rejeter": "Reject",
  "admin.ventes.avis.toast_approuve": "Approved",
  "admin.ventes.avis.toast_rejete": "Rejected",
  "admin.ventes.avis.toast_supprime": "Deleted",
  "admin.ventes.avis.toast_enregistre": "Review saved",
  "admin.ventes.avis.vide": "No reviews.",
  "admin.ventes.avis.supprimer_titre": "Delete “{label}”?",
  "admin.ventes.avis.supprimer_description": "This action cannot be undone.",
  "admin.ventes.avis.suppression_en_cours": "Deleting…",
  "admin.ventes.avis.garde_supprimer": "Delete review",
  "admin.ventes.avis.garde_approuver": "Approve review",
  "admin.ventes.avis.garde_rejeter": "Reject review",
  // Homepage reviews
  "admin.ventes.avis.accueil_explication":
    'These testimonials are shown on the homepage, in the "Customer reviews" section.',
  "admin.ventes.avis.accueil_vide": "No homepage reviews. Add some or reset the data.",
  "admin.ventes.avis.accueil_nouveau": "New homepage review",
  "admin.ventes.avis.accueil_produit": "Product: {nom}",
  "admin.ventes.avis.accueil_sans_nom": "No name",
  "admin.ventes.avis.accueil_produit_inconnu": "unknown",
  "admin.ventes.avis.accueil_form_titre_nouveau": "New review",
  "admin.ventes.avis.accueil_form_titre_modifier": "Edit review",
  "admin.ventes.avis.accueil_form_nom": "Name",
  "admin.ventes.avis.accueil_form_ville": "City",
  "admin.ventes.avis.accueil_form_texte": "Text",
  "admin.ventes.avis.accueil_form_produit": "Product",
  "admin.ventes.avis.accueil_form_note": "Rating (1-5)",
  "admin.ventes.avis.accueil_form_gradient": "Gradient",
  "admin.ventes.avis.accueil_form_enregistrement": "Saving…",
  "admin.ventes.avis.accueil_err_champs": "Name and text required",
  "admin.ventes.avis.accueil_editer": "Edit",
  "admin.ventes.avis.accueil_garde_creer": "Create homepage review",
  "admin.ventes.avis.accueil_garde_modifier": "Edit homepage review",
};

export default ventesEn;
