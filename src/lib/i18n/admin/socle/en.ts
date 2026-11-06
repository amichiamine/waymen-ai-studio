/**
 * Groupe « socle » — dictionnaire en (anglais).
 *
 * PROPRIÉTAIRE : agent pilote. Mêmes clés, exactement, que `socle/fr.ts` :
 * `bun run verifier-i18n` échoue à la moindre divergence.
 * Convention complète : `src/lib/i18n/admin/index.ts`.
 */
const socleEn: Record<string, string> = {
  // ── Shared vocabulary ─────────────────────────────────────────────────────
  "admin.socle.commun.chargement": "Loading…",
  "admin.socle.commun.aucune_donnee": "No data yet",
  "admin.socle.commun.donnees_indisponibles": "Data unavailable.",
  "admin.socle.commun.voir": "View",
  "admin.socle.commun.modifier": "Edit",
  "admin.socle.commun.supprimer": "Delete",
  "admin.socle.commun.enregistrer": "Save",
  "admin.socle.commun.actions": "Actions",
  "admin.socle.commun.rechercher": "Search",

  "admin.socle.confirmation.confirmer": "Confirm",
  "admin.socle.confirmation.annuler": "Cancel",

  "admin.socle.roles.owner": "Owner",
  "admin.socle.roles.admin": "Administrator",
  "admin.socle.roles.editor": "Editor",
  "admin.socle.roles.viewer": "Viewer",

  // ── Sidebar, mobile navigation, breadcrumbs ───────────────────────────────
  "admin.socle.navigation.badge": "Admin",
  "admin.socle.navigation.ouvrir_menu": "Open the admin menu",
  "admin.socle.navigation.fil_ariane": "Breadcrumb",
  "admin.socle.navigation.racine": "Admin",
  "admin.socle.navigation.accueil_admin": "Admin home",

  "admin.socle.navigation.section_apercu": "Overview",
  "admin.socle.navigation.section_catalogue": "Catalogue",
  "admin.socle.navigation.section_ventes": "Sales",
  "admin.socle.navigation.section_relation": "Customer relations",
  "admin.socle.navigation.section_contenu": "Content",
  "admin.socle.navigation.section_systeme": "System",

  "admin.socle.navigation.lien_tableau": "Dashboard",
  "admin.socle.navigation.lien_analytique": "Analytics",
  "admin.socle.navigation.lien_rapports": "Reports",
  "admin.socle.navigation.lien_produits": "Products",
  "admin.socle.navigation.lien_categories": "Categories",
  "admin.socle.navigation.lien_marques": "Brands",
  "admin.socle.navigation.lien_stock": "Inventory",
  "admin.socle.navigation.lien_medias": "Media",
  "admin.socle.navigation.lien_commandes": "Orders",
  "admin.socle.navigation.lien_clients": "Customers",
  "admin.socle.navigation.lien_coupons": "Coupons",
  "admin.socle.navigation.lien_livraison": "Shipping",
  "admin.socle.navigation.lien_paiements": "Payments",
  "admin.socle.navigation.lien_messages": "Contact messages",
  "admin.socle.navigation.lien_newsletter": "Newsletter",
  "admin.socle.navigation.lien_contenu": "Site content",
  "admin.socle.navigation.lien_blog": "Blog",
  "admin.socle.navigation.lien_avis": "Reviews",
  "admin.socle.navigation.lien_utilisateurs": "Users and roles",
  "admin.socle.navigation.lien_notifications": "Notifications",
  "admin.socle.navigation.lien_audit": "Audit log",
  "admin.socle.navigation.lien_parametres": "Settings",
  "admin.socle.navigation.lien_reinitialiser": "Reset",
  "admin.socle.navigation.lien_developpeur": "Developer",

  // ── Header: role simulation, notifications, user menu ─────────────────────
  "admin.socle.entete.simuler_role": "Simulate a role",
  "admin.socle.entete.role_reel": "(actual: {role})",
  "admin.socle.entete.simuler_infobulle":
    "Development tool: it can only downgrade your own role in order to test the interface.",

  "admin.socle.entete.notifications": "Notifications",
  "admin.socle.entete.tout_lu": "Mark all read",
  "admin.socle.entete.aucune_notification": "No notifications.",
  "admin.socle.entete.marquer_lu": "Mark read",
  "admin.socle.entete.toutes_notifications": "All notifications",
  "admin.socle.entete.non_lues_un": "{n} unread notification",
  "admin.socle.entete.non_lues_autre": "{n} unread notifications",

  "admin.socle.entete.menu_utilisateur": "User menu",
  "admin.socle.entete.compte": "Account",
  "admin.socle.entete.role": "Role:",
  "admin.socle.entete.role_simule": "Simulated role:",
  "admin.socle.entete.role_separateur_reel": "— actual:",
  "admin.socle.entete.retour_boutique": "Back to the shop",
  "admin.socle.entete.deconnexion": "Sign out",

  // ── Dashboard ─────────────────────────────────────────────────────────────
  "admin.socle.tableau.titre": "Dashboard",
  "admin.socle.tableau.description": "Overview of the shop (local data).",
  "admin.socle.tableau.kpi_produits": "Products",
  "admin.socle.tableau.kpi_categories": "Categories",
  "admin.socle.tableau.kpi_marques": "Brands",
  "admin.socle.tableau.kpi_valeur_catalogue": "Catalogue value",
  "admin.socle.tableau.kpi_chiffre_affaires": "Revenue",
  "admin.socle.tableau.kpi_commandes_attente": "Pending orders",
  "admin.socle.tableau.kpi_clients": "Customers",
  "admin.socle.tableau.kpi_avis_moderer": "Reviews to moderate",
  "admin.socle.tableau.kpi_coupons_actifs": "Active coupons",
  "admin.socle.tableau.kpi_stock_faible": "Low stock",
  "admin.socle.tableau.kpi_en_stock": "In stock",
  "admin.socle.tableau.kpi_bestsellers": "Best sellers",
  "admin.socle.tableau.ca_30_jours": "Revenue — last 30 days",
  "admin.socle.tableau.produits_par_categorie": "Products by category",
  "admin.socle.tableau.dernieres_commandes": "Latest orders",
  "admin.socle.tableau.aucune_commande": "No orders.",

  // ── Products — reference page ─────────────────────────────────────────────
  "admin.socle.produits.titre": "Products",
  "admin.socle.produits.description_un": "{n} product in the local catalogue.",
  "admin.socle.produits.description_autre": "{n} products in the local catalogue.",
  "admin.socle.produits.configs_un": "{n} customer build (not sold in the shop).",
  "admin.socle.produits.configs_autre": "{n} customer builds (not sold in the shop).",
  "admin.socle.produits.nouveau": "New product",
  "admin.socle.produits.garde_supprimer": "Delete the product",
  "admin.socle.produits.recherche_placeholder": "Search (name, brand, identifier)…",
  "admin.socle.produits.toutes_categories": "All categories",
  "admin.socle.produits.col_image": "Image",
  "admin.socle.produits.col_produit": "Product",
  "admin.socle.produits.col_marque": "Brand",
  "admin.socle.produits.col_categorie": "Category",
  "admin.socle.produits.col_prix": "Price",
  "admin.socle.produits.col_stock": "Stock",
  "admin.socle.produits.stock_in": "In stock",
  "admin.socle.produits.stock_low": "Low stock",
  "admin.socle.produits.stock_out": "Out of stock",
  "admin.socle.produits.badge_config": "Customer build",
  "admin.socle.produits.voir_public": "View the public page",
  "admin.socle.produits.vide_aucun_resultat": "No product matches the filters.",
  "admin.socle.produits.supprimer_titre": "Delete this product?",
  "admin.socle.produits.supprimer_description":
    "The product “{nom}” will be removed from the local catalogue. This action cannot be undone.",
  "admin.socle.produits.suppression_en_cours": "Deleting…",
  "admin.socle.produits.toast_supprime": "“{nom}” deleted",
};

export default socleEn;
