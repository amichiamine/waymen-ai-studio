/**
 * Groupe « systeme » — dictionnaire en (anglais).
 *
 * PROPRIÉTAIRE : l'agent de réplication chargé du groupe « systeme ».
 * Mêmes clés, exactement, que `systeme/fr.ts` :
 * `bun run verifier-i18n` échoue à la moindre divergence.
 * Convention complète : `src/lib/i18n/admin/index.ts`.
 */
const systemeEn: Record<string, string> = {
  // ── Reports ───────────────────────────────────────────────────────────────
  "admin.systeme.rapports.titre": "Reports",
  "admin.systeme.rapports.description":
    "CSV exports of shop data (compatible with Excel / Google Sheets).",
  "admin.systeme.rapports.exporter_csv": "Export CSV",
  "admin.systeme.rapports.note_encodage":
    "Files are generated in the browser from your local data. Open them directly in Excel, LibreOffice or Google Sheets — UTF-8 with BOM encoding preserves special characters.",
  "admin.systeme.rapports.export_chargement": "Data loading",
  "admin.systeme.rapports.export_indisponible": "Data unavailable",
  "admin.systeme.rapports.toast_telecharge": "{nom} downloaded",
  "admin.systeme.rapports.toast_chargement": "Export failed: data is still loading",
  "admin.systeme.rapports.toast_erreur": "Export failed: {message}",
  "admin.systeme.rapports.ventes_titre": "Sales",
  "admin.systeme.rapports.ventes_desc": "{count} orders · {revenue}",
  "admin.systeme.rapports.clients_titre": "Customers",
  "admin.systeme.rapports.clients_desc_un": "{n} registered customer",
  "admin.systeme.rapports.clients_desc_autre": "{n} registered customers",
  "admin.systeme.rapports.stock_titre": "Inventory",
  "admin.systeme.rapports.stock_desc_un": "{n} product in the catalogue",
  "admin.systeme.rapports.stock_desc_autre": "{n} products in the catalogue",
  "admin.systeme.rapports.mouvements_titre": "Stock movements",
  "admin.systeme.rapports.mouvements_desc_un": "{n} movement logged",
  "admin.systeme.rapports.mouvements_desc_autre": "{n} movements logged",
  "admin.systeme.rapports.coupons_titre": "Coupons",
  "admin.systeme.rapports.coupons_desc_un": "{n} promotional code",
  "admin.systeme.rapports.coupons_desc_autre": "{n} promotional codes",
  "admin.systeme.rapports.avis_titre": "Reviews",
  "admin.systeme.rapports.avis_desc_un": "{n} customer review",
  "admin.systeme.rapports.avis_desc_autre": "{n} customer reviews",

  // ── Subscribers ───────────────────────────────────────────────────────────
  "admin.systeme.newsletter.titre": "Newsletter subscribers",
  "admin.systeme.newsletter.description_un": "{n} subscription collected via the site.",
  "admin.systeme.newsletter.description_autre": "{n} subscriptions collected via the site.",
  "admin.systeme.newsletter.exporter_csv": "Export to CSV",
  "admin.systeme.newsletter.col_email": "Email",
  "admin.systeme.newsletter.col_source": "Source",
  "admin.systeme.newsletter.col_inscrit_le": "Subscribed on",
  "admin.systeme.newsletter.chargement": "Loading subscribers…",
  "admin.systeme.newsletter.toast_export": "CSV export downloaded",
  "admin.systeme.newsletter.toast_desinscrit": "Unsubscribed",
  "admin.systeme.newsletter.vide": "No subscribers yet.",
  "admin.systeme.newsletter.retirer_titre": "Remove {email}?",
  "admin.systeme.newsletter.retirer_description":
    "The address will be permanently removed from the list.",
  "admin.systeme.newsletter.aria_supprimer": "Delete",

  // ── Audit ─────────────────────────────────────────────────────────────────
  "admin.systeme.audit.titre": "Audit log",
  "admin.systeme.audit.description_un": "{n} event logged (max 500, rolling).",
  "admin.systeme.audit.description_autre": "{n} events logged (max 500, rolling).",
  "admin.systeme.audit.placeholder_recherche": "Search (action, entity, actor)…",
  "admin.systeme.audit.filtre_tous": "All",
  "admin.systeme.audit.col_date": "Date",
  "admin.systeme.audit.col_acteur": "Actor",
  "admin.systeme.audit.col_action": "Action",
  "admin.systeme.audit.col_entite": "Entity",
  "admin.systeme.audit.col_detail": "Detail",
  "admin.systeme.audit.btn_csv": "CSV",
  "admin.systeme.audit.btn_vider": "Clear",
  "admin.systeme.audit.toast_exporte": "Log exported",
  "admin.systeme.audit.toast_vide": "Log cleared",
  "admin.systeme.audit.vide_titre":
    "No events logged yet. Major mutations (orders, stock, media) will appear here automatically.",
  "admin.systeme.audit.vide_filtre": "No results for these filters.",

  // ── Analytics ─────────────────────────────────────────────────────────────
  "admin.systeme.analytique.titre": "Analytics",
  "admin.systeme.analytique.description":
    "Sales trends calculated from recorded orders (local data).",
  "admin.systeme.analytique.kpi_chiffre_affaires": "Revenue",
  "admin.systeme.analytique.kpi_commandes": "Orders",
  "admin.systeme.analytique.kpi_panier_moyen": "Average order",
  "admin.systeme.analytique.kpi_taux_livraison": "Delivery rate",
  "admin.systeme.analytique.kpi_clients": "Customers",
  "admin.systeme.analytique.periode_7j": "Last 7 days",
  "admin.systeme.analytique.periode_30j": "Last 30 days",
  "admin.systeme.analytique.periode_90j": "Last 90 days",
  "admin.systeme.analytique.graphe_ca_par_jour": "Revenue per day",
  "admin.systeme.analytique.graphe_commandes_par_jour": "Orders per day",
  "admin.systeme.analytique.graphe_ca_par_categorie": "Revenue breakdown by category",
  "admin.systeme.analytique.graphe_traitement": "Order fulfilment",
  "admin.systeme.analytique.graphe_traitement_note":
    "Steps actually recorded on orders. Upstream steps (visitors, carts) are not shown: no audience analytics are in place on the site.",
  "admin.systeme.analytique.graphe_top8": "Top 8 products sold",
  "admin.systeme.analytique.donnees_indisponibles": "Data unavailable",
  "admin.systeme.analytique.aucune_vente": "No sales recorded",
  "admin.systeme.analytique.aucune_vente_texte": "No sales.",
  "admin.systeme.analytique.entonnoir_vide_titre": "No orders to track",
  "admin.systeme.analytique.entonnoir_vide_desc":
    "This tracking is built from order status changes. It will fill in from the first recorded order, then each time an order moves to preparation, shipping and delivery.",
  "admin.systeme.analytique.entonnoir_voir_commandes": "Open orders",
  "admin.systeme.analytique.entonnoir_annulees_un":
    "Including {n} cancelled order, outside the delivery path.",
  "admin.systeme.analytique.entonnoir_annulees_autre":
    "Including {n} cancelled orders, outside the delivery path.",
  "admin.systeme.analytique.entonnoir_recues": "Orders received",
  "admin.systeme.analytique.entonnoir_preparation": "In preparation",
  "admin.systeme.analytique.entonnoir_expediees": "Shipped",
  "admin.systeme.analytique.entonnoir_livrees": "Delivered",
  "admin.systeme.analytique.erreur_commandes": "Orders: {message}",
  "admin.systeme.analytique.erreur_produits_categories": "Products / categories: {message}",
  "admin.systeme.analytique.erreur_clients": "Customers: {message}",

  // ── Messages ──────────────────────────────────────────────────────────────
  "admin.systeme.messages.titre": "Contact messages",
  "admin.systeme.messages.description_un": "{n} message received · {unread} unread.",
  "admin.systeme.messages.description_autre": "{n} messages received · {unread} unread.",
  "admin.systeme.messages.col_statut": "Status",
  "admin.systeme.messages.col_expediteur": "Sender",
  "admin.systeme.messages.col_sujet": "Subject",
  "admin.systeme.messages.col_recu_le": "Received on",
  "admin.systeme.messages.badge_lu": "Read",
  "admin.systeme.messages.badge_nouveau": "New",
  "admin.systeme.messages.btn_voir": "View",
  "admin.systeme.messages.btn_marquer_lu": "Mark read",
  "admin.systeme.messages.btn_supprimer": "Delete",
  "admin.systeme.messages.aria_supprimer": "Delete",
  "admin.systeme.messages.btn_repondre_email": "Reply by email",
  "admin.systeme.messages.btn_whatsapp": "WhatsApp",
  "admin.systeme.messages.toast_marque_lu": "Marked as read",
  "admin.systeme.messages.toast_supprime": "Deleted",
  "admin.systeme.messages.toast_supprime_dialogue": "Message deleted",
  "admin.systeme.messages.confirm_supprimer": "Delete this message?",
  "admin.systeme.messages.chargement": "Loading messages…",
  "admin.systeme.messages.vide": "No messages.",
  "admin.systeme.messages.detail_de": "From",
  "admin.systeme.messages.detail_recu_le": "Received on",

  // ── Notifications ─────────────────────────────────────────────────────────
  "admin.systeme.notifications.titre": "Notifications",
  "admin.systeme.notifications.description_un":
    "{n} notification · {unread} unread. Generated automatically for key events (orders, stock).",
  "admin.systeme.notifications.description_autre":
    "{n} notifications · {unread} unread. Generated automatically for key events (orders, stock).",
  "admin.systeme.notifications.btn_tout_marquer_lu": "Mark all as read",
  "admin.systeme.notifications.btn_nouvelle": "New",
  "admin.systeme.notifications.filtre_toutes": "All",
  "admin.systeme.notifications.filtre_non_lues_un": "Unread ({n})",
  "admin.systeme.notifications.filtre_non_lues_autre": "Unread ({n})",
  "admin.systeme.notifications.filtre_info": "Info",
  "admin.systeme.notifications.filtre_succes": "Success",
  "admin.systeme.notifications.filtre_alertes": "Warnings",
  "admin.systeme.notifications.filtre_erreurs": "Errors",
  "admin.systeme.notifications.badge_nouveau": "New",
  "admin.systeme.notifications.btn_marquer_lu": "Mark read",
  "admin.systeme.notifications.btn_supprimer": "Delete",
  "admin.systeme.notifications.aria_supprimer": "Delete",
  "admin.systeme.notifications.vide": "No notifications.",
  "admin.systeme.notifications.toast_tout_lu": "All marked as read",
  "admin.systeme.notifications.toast_supprimee": "Deleted",
  "admin.systeme.notifications.toast_creee": "Notification created",
  "admin.systeme.notifications.toast_titre_requis": "Title required",
  "admin.systeme.notifications.dialog_titre": "New notification",
  "admin.systeme.notifications.champ_titre": "Title",
  "admin.systeme.notifications.champ_corps": "Body",
  "admin.systeme.notifications.champ_niveau": "Level",
  "admin.systeme.notifications.champ_lien": "Link (optional)",
  "admin.systeme.notifications.champ_lien_placeholder": "/admin/orders/…",
  "admin.systeme.notifications.btn_annuler": "Cancel",
  "admin.systeme.notifications.btn_creer": "Create",
  "admin.systeme.notifications.level_info": "Info",
  "admin.systeme.notifications.level_success": "Success",
  "admin.systeme.notifications.level_warning": "Warning",
  "admin.systeme.notifications.level_error": "Error",

  // ── Reset ─────────────────────────────────────────────────────────────────
  "admin.systeme.reset.titre": "Data reset",
  "admin.systeme.reset.description": "Restore, clear, export or import local shop data.",
  "admin.systeme.reset.alerte_titre": "Warning",
  "admin.systeme.reset.alerte_description":
    "These actions only modify local data (localStorage) in this browser.",
  "admin.systeme.reset.section_sauvegarde": "Backup & restore",
  "admin.systeme.reset.btn_exporter_json": "Export to JSON",
  "admin.systeme.reset.btn_importer_json": "Import a JSON…",
  "admin.systeme.reset.section_global": "Global actions",
  "admin.systeme.reset.btn_reinitialiser_tout": "Reset the entire shop",
  "admin.systeme.reset.btn_vider_tout": "Clear all",
  "admin.systeme.reset.section_par_type": "By data type",
  "admin.systeme.reset.btn_reinitialiser": "Reset",
  "admin.systeme.reset.btn_vider": "Clear",
  "admin.systeme.reset.objet_unique": "single object",
  "admin.systeme.reset.enregistrement_un": "{n} record",
  "admin.systeme.reset.enregistrement_autre": "{n} records",
  "admin.systeme.reset.toast_reinitialise": "{label} reset",
  "admin.systeme.reset.toast_reinitialises": "{label} reset",
  "admin.systeme.reset.toast_vide": "{label} cleared",
  "admin.systeme.reset.toast_tout_vide": "All data has been cleared",
  "admin.systeme.reset.toast_export_ok": "Export downloaded",
  "admin.systeme.reset.toast_export_echec": "Export failed",
  "admin.systeme.reset.toast_import_ok": "Import succeeded ({total} records from {fichier})",
  "admin.systeme.reset.toast_import_echec": "Import failed: {message}",
  "admin.systeme.reset.toast_action_echec": "Action failed: {message}",
  "admin.systeme.reset.toast_fichier_trop_grand": "File too large (>5 MB)",
  "admin.systeme.reset.toast_lecture_echec": "Unable to read the file",
  "admin.systeme.reset.dialog_reinitialiser_titre": "Reset {label}?",
  "admin.systeme.reset.dialog_vider_titre": "Clear {label}?",
  "admin.systeme.reset.dialog_vider_tout_titre": "Clear ALL data?",
  "admin.systeme.reset.dialog_importer_titre": 'Import "{fichier}"?',
  "admin.systeme.reset.dialog_import_desc":
    "This will replace all local data with the file's content.",
  "admin.systeme.reset.dialog_destructive_desc":
    "This action is irreversible on the browser's local data.",
  "admin.systeme.reset.dialog_confirmer_import": "Import",
  "admin.systeme.reset.dialog_confirmer": "Confirm",
  "admin.systeme.reset.acces_restreint_titre": "Restricted access",
  "admin.systeme.reset.acces_restreint_desc": "Data reset is reserved for the Owner.",
  "admin.systeme.reset.row_products": "Products",
  "admin.systeme.reset.row_products_desc": "Local product catalogue.",
  "admin.systeme.reset.row_categories": "Categories",
  "admin.systeme.reset.row_categories_desc": "Catalogue sections.",
  "admin.systeme.reset.row_brands": "Brands",
  "admin.systeme.reset.row_brands_desc": "Referenced brands.",
  "admin.systeme.reset.row_orders": "Orders",
  "admin.systeme.reset.row_orders_desc": "Customer orders.",
  "admin.systeme.reset.row_customers": "Customers",
  "admin.systeme.reset.row_customers_desc": "Customer database.",
  "admin.systeme.reset.row_coupons": "Coupons",
  "admin.systeme.reset.row_coupons_desc": "Promo codes.",
  "admin.systeme.reset.row_reviews": "Product reviews",
  "admin.systeme.reset.row_reviews_desc": "Customer reviews to moderate.",
  "admin.systeme.reset.row_users": "Admin users",
  "admin.systeme.reset.row_users_desc": "Team members.",
  "admin.systeme.reset.row_blog_posts": "Blog posts",
  "admin.systeme.reset.row_blog_posts_desc": "Blog publications.",
  "admin.systeme.reset.row_home_reviews": "Home reviews",
  "admin.systeme.reset.row_home_reviews_desc": "Testimonials on the home page.",
  "admin.systeme.reset.row_ticker_messages": "Ticker banner",
  "admin.systeme.reset.row_ticker_messages_desc": "Messages in the top-of-page ribbon.",
  "admin.systeme.reset.row_marquee_brands": "Scrolling brands",
  "admin.systeme.reset.row_marquee_brands_desc": "Text logos in the brand carousel.",
  "admin.systeme.reset.row_about_values": "Values (About)",
  "admin.systeme.reset.row_about_values_desc": "Commitment cards on the About page.",
  "admin.systeme.reset.row_builder_steps": "Configurator steps",
  "admin.systeme.reset.row_builder_steps_desc": "Components and options of the PC builder.",
  "admin.systeme.reset.row_shipping_rates": "Shipping rates",
  "admin.systeme.reset.row_shipping_rates_desc": "Rates by province (home / office).",
  "admin.systeme.reset.row_payment_methods": "Payment methods",
  "admin.systeme.reset.row_payment_methods_desc": "Payment modes offered at checkout.",
  "admin.systeme.reset.row_stock_movements": "Stock movements",
  "admin.systeme.reset.row_stock_movements_desc": "Stock adjustment log.",
  "admin.systeme.reset.row_media_assets": "Media library",
  "admin.systeme.reset.row_media_assets_desc": "Uploaded images available for content.",
  "admin.systeme.reset.row_notifications": "Notifications",
  "admin.systeme.reset.row_notifications_desc": "Internal admin notifications.",
  "admin.systeme.reset.row_audit_logs": "Audit log",
  "admin.systeme.reset.row_audit_logs_desc": "Actions performed in the admin.",
  "admin.systeme.reset.row_messages": "Contact messages",
  "admin.systeme.reset.row_messages_desc": "Messages received via /contact.",
  "admin.systeme.reset.row_subscribers": "Newsletter subscribers",
  "admin.systeme.reset.row_subscribers_desc": "Emails collected via the footer.",
  "admin.systeme.reset.row_site_settings": "Site settings",
  "admin.systeme.reset.row_site_settings_desc": "Name, contact, WhatsApp, address, hours.",
  "admin.systeme.reset.row_shipping_settings": "Shipping settings",
  "admin.systeme.reset.row_shipping_settings_desc":
    "Free shipping threshold, delivery mode activation.",

  // ── Developpeur ───────────────────────────────────────────────────────────
  "admin.systeme.developpeur.titre": "Developer",
  "admin.systeme.developpeur.description":
    "Database diagnostics, backup and migration. Reserved for the Owner.",
  "admin.systeme.developpeur.acces_restreint_titre": "Restricted access",
  "admin.systeme.developpeur.acces_restreint_desc": "This page is reserved for the Owner.",

  // Section 1 — Database state
  "admin.systeme.developpeur.etat_titre": "Database state",
  "admin.systeme.developpeur.etat_rafraichir_aria": "Refresh database state",
  "admin.systeme.developpeur.etat_rafraichir": "Refresh",
  "admin.systeme.developpeur.etat_pilote": "Driver",
  "admin.systeme.developpeur.etat_base": "Database",
  "admin.systeme.developpeur.etat_taille": "Size",
  "admin.systeme.developpeur.etat_outbox": "Pending events",
  "admin.systeme.developpeur.etat_outbox_zero": "None",
  "admin.systeme.developpeur.etat_derniere_sauvegarde": "Last backup:",
  "admin.systeme.developpeur.etat_aucune_sauvegarde": "No backup on record",
  "admin.systeme.developpeur.etat_chargement_tables": "Loading tables…",
  "admin.systeme.developpeur.etat_aucune_table": "No tables available.",
  "admin.systeme.developpeur.etat_col_table": "Table",
  "admin.systeme.developpeur.etat_col_lignes": "Rows",

  // Section 2 — Backup
  "admin.systeme.developpeur.sauvegarde_titre": "Backup",
  "admin.systeme.developpeur.sauvegarde_description":
    "Downloads a database dump. The file is served directly by the server and goes through your session — no third party receives it.",
  "admin.systeme.developpeur.sauvegarde_btn": "Download backup",
  "admin.systeme.developpeur.sauvegarde_en_cours": "Downloading…",
  "admin.systeme.developpeur.sauvegarde_toast_ok": "Backup downloaded",
  "admin.systeme.developpeur.sauvegarde_toast_echec": "Backup failed: {message}",

  // Section 3 — Migration
  "admin.systeme.developpeur.migration_titre": "Migration to another engine",
  "admin.systeme.developpeur.migration_alerte_titre": "Simulation required",
  "admin.systeme.developpeur.migration_alerte_desc":
    "Click Simulate first to check compatibility without touching your data. The Execute button is only available after a successful simulation.",
  "admin.systeme.developpeur.migration_legend": "Target database connection",
  "admin.systeme.developpeur.migration_label_cible": "Target engine",
  "admin.systeme.developpeur.migration_label_utilisateur": "Target database user",
  "admin.systeme.developpeur.migration_label_dsn": "Connection DSN",
  "admin.systeme.developpeur.migration_dsn_exemple":
    "MySQL example: mysql://host:3306/target_db — PostgreSQL: postgresql://host:5432/target_db",
  "admin.systeme.developpeur.migration_label_mdp": "Password",
  "admin.systeme.developpeur.migration_mdp_note":
    "Sent only to the server in the request body. Never stored locally.",
  "admin.systeme.developpeur.migration_aria_afficher_mdp": "Show password",
  "admin.systeme.developpeur.migration_aria_masquer_mdp": "Hide password",
  "admin.systeme.developpeur.migration_btn_simuler": "Simulate",
  "admin.systeme.developpeur.migration_simulation_cours": "Simulating…",
  "admin.systeme.developpeur.migration_btn_executer": "Execute",
  "admin.systeme.developpeur.migration_execution_cours": "Migrating…",
  "admin.systeme.developpeur.migration_tooltip_simuler_dabord": "Run a successful simulation first",
  "admin.systeme.developpeur.migration_toast_form_incomplet":
    "Please fill in the DSN, username and password.",
  "admin.systeme.developpeur.migration_toast_simu_ok":
    "Simulation succeeded — review the report before executing.",
  "admin.systeme.developpeur.migration_toast_simu_echec": "Simulation failed: {message}",
  "admin.systeme.developpeur.migration_toast_exec_ok": "Migration executed successfully.",
  "admin.systeme.developpeur.migration_toast_exec_echec": "Migration failed: {message}",

  // Confirmation dialog (backup / migration)
  "admin.systeme.developpeur.dialog_sauvegarde_titre": "Download backup?",
  "admin.systeme.developpeur.dialog_sauvegarde_desc":
    "The file will be downloaded directly to your browser.",
  "admin.systeme.developpeur.dialog_migration_titre": "Execute migration?",
  "admin.systeme.developpeur.dialog_migration_desc_intro":
    "This operation transfers all data to the target database. It is irreversible.",
  "admin.systeme.developpeur.dialog_migration_desc_cible": "Target: {cible} — {dsn}",
  "admin.systeme.developpeur.dialog_migration_desc_confirmer":
    "The simulation has been completed. Confirm to write the data.",
  "admin.systeme.developpeur.dialog_btn_telecharger": "Download",
  "admin.systeme.developpeur.dialog_btn_executer": "Execute migration",

  // Migration report
  "admin.systeme.developpeur.rapport_simulation": "Simulation report",
  "admin.systeme.developpeur.rapport_migration": "Migration report",
  "admin.systeme.developpeur.rapport_badge_simulation": "Simulation",
  "admin.systeme.developpeur.rapport_badge_execution": "Live execution",
  "admin.systeme.developpeur.rapport_col_table": "Table",
  "admin.systeme.developpeur.rapport_col_lues": "Read",
  "admin.systeme.developpeur.rapport_col_ecrites": "Written",
  "admin.systeme.developpeur.rapport_col_anomalies": "Anomalies",
  "admin.systeme.developpeur.rapport_lignes_lues": "Rows read",
  "admin.systeme.developpeur.rapport_lignes_ecrites": "Rows written",
  "admin.systeme.developpeur.rapport_anomalies": "Anomalies",
  "admin.systeme.developpeur.rapport_details_note":
    "Click on a row with anomalies to see the detailed explanation.",
  "admin.systeme.developpeur.rapport_details_indisponibles":
    "Details not available — update the server to get the full explanation.",
  "admin.systeme.developpeur.rapport_aria_details": "Anomaly details — {nom}",

  // Decision banner
  "admin.systeme.developpeur.decision_bloquee_titre": "Migration not recommended",
  "admin.systeme.developpeur.decision_bloquee_desc_un":
    "{n} blocking error detected. Data could be lost or corrupted. Fix the issues before executing.",
  "admin.systeme.developpeur.decision_bloquee_desc_autre":
    "{n} blocking errors detected. Data could be lost or corrupted. Fix the issues before executing.",
  "admin.systeme.developpeur.decision_precaution_titre": "Migration possible with caution",
  "admin.systeme.developpeur.decision_precaution_desc_un":
    "{n} warning flagged. No confirmed data loss, but review the details before proceeding.",
  "admin.systeme.developpeur.decision_precaution_desc_autre":
    "{n} warnings flagged. No confirmed data loss, but review the details before proceeding.",
  "admin.systeme.developpeur.decision_ok_titre": "Migration with no anomalies",
  "admin.systeme.developpeur.decision_ok_desc":
    "All tables were processed without error. You can execute the migration.",

  // Severity badges
  "admin.systeme.developpeur.gravite_erreur": "Error",
  "admin.systeme.developpeur.gravite_avertissement": "Warning",

  // Section 4 — Catalogue import
  "admin.systeme.developpeur.import_catalogue_titre": "Demo catalogue import",
  "admin.systeme.developpeur.import_catalogue_description":
    "Fills the shop with the products, categories and brands from the demo catalogue. Use this button if your shop is empty after installation, or to reset the catalogue.",
  "admin.systeme.developpeur.import_catalogue_alerte_titre": "Warning: catalogue replacement",
  "admin.systeme.developpeur.import_catalogue_alerte_desc":
    "This action replaces existing products, categories and brands with those from the demo catalogue. Orders, customers and other data are not affected.",
  "admin.systeme.developpeur.import_catalogue_btn": "Import catalogue",
  "admin.systeme.developpeur.import_catalogue_en_cours": "Importing…",
  "admin.systeme.developpeur.import_catalogue_dialog_titre": "Import catalogue?",
  "admin.systeme.developpeur.import_catalogue_dialog_desc":
    "This action will replace the current catalogue with the demo data. Orders and customers will not be modified.",
  "admin.systeme.developpeur.import_catalogue_dialog_btn": "Import",
  "admin.systeme.developpeur.import_catalogue_toast_ok":
    "{produits} product(s), {categories} category/ies, {marques} brand(s) imported.",
  "admin.systeme.developpeur.import_catalogue_toast_echec": "Import failed: {message}",

  // Section 5 — Display & Developer Tools
  "admin.systeme.developpeur.affichage_titre": "Display & Developer Tools",
  "admin.systeme.developpeur.affichage_badge_label": "Show data mode badge (HTTP/Mock)",
  "admin.systeme.developpeur.affichage_badge_desc":
    "Floating badge displaying data access mode (http or mock), API URL, and potential network fallbacks. Clicking the badge opens the environment inspector.",
};

export default systemeEn;
