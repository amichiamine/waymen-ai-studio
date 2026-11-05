/**
 * Groupe « systeme » — dictionnaire fr (français).
 *
 * PROPRIÉTAIRE : l'agent de réplication chargé du groupe « systeme ». Aucun autre
 * agent n'écrit dans ce fichier ; en échange, cet agent n'écrit dans aucun
 * autre — c'est ce qui permet à cinq agents de travailler en parallèle sans
 * conflit de fusion.
 *
 * Écrans couverts : Reports, Subscribers, Audit, Analytics, Messages,
 *                   Notifications, Reset, Developpeur.
 *
 * Seul préfixe autorisé ici : `admin.systeme.<page>.<cle>`.
 * Convention obligatoire (nommage, pluriels, RTL, qualité de l'arabe) :
 * `src/lib/i18n/admin/index.ts`. Vocabulaire partagé déjà traduit, à réutiliser
 * plutôt qu'à recopier : `admin.socle.commun.*`, `admin.socle.confirmation.*`,
 * `admin.socle.roles.*`.
 *
 * Les trois langues doivent porter EXACTEMENT les mêmes clés :
 * `bun run verifier-i18n` échoue sinon.
 */
const systemeFr: Record<string, string> = {
  // ── Reports ───────────────────────────────────────────────────────────────
  "admin.systeme.rapports.titre": "Rapports",
  "admin.systeme.rapports.description":
    "Exports CSV des données de la boutique (compatibles Excel / Google Sheets).",
  "admin.systeme.rapports.exporter_csv": "Exporter CSV",
  "admin.systeme.rapports.note_encodage":
    "Les fichiers sont générés côté navigateur à partir de vos données locales. Ouvrez-les directement dans Excel, LibreOffice ou Google Sheets — l'encodage UTF-8 avec BOM préserve les accents.",
  "admin.systeme.rapports.export_chargement": "Données en cours de chargement",
  "admin.systeme.rapports.export_indisponible": "Données indisponibles",
  "admin.systeme.rapports.toast_telecharge": "{nom} téléchargé",
  "admin.systeme.rapports.toast_chargement": "Export impossible : données en cours de chargement",
  "admin.systeme.rapports.toast_erreur": "Export impossible : {message}",
  "admin.systeme.rapports.ventes_titre": "Ventes",
  "admin.systeme.rapports.ventes_desc": "{count} commandes · {revenue}",
  "admin.systeme.rapports.clients_titre": "Clients",
  "admin.systeme.rapports.clients_desc_un": "{n} client enregistré",
  "admin.systeme.rapports.clients_desc_autre": "{n} clients enregistrés",
  "admin.systeme.rapports.stock_titre": "Stock",
  "admin.systeme.rapports.stock_desc_un": "{n} produit au catalogue",
  "admin.systeme.rapports.stock_desc_autre": "{n} produits au catalogue",
  "admin.systeme.rapports.mouvements_titre": "Mouvements de stock",
  "admin.systeme.rapports.mouvements_desc_un": "{n} mouvement journalisé",
  "admin.systeme.rapports.mouvements_desc_autre": "{n} mouvements journalisés",
  "admin.systeme.rapports.coupons_titre": "Coupons",
  "admin.systeme.rapports.coupons_desc_un": "{n} code promotionnel",
  "admin.systeme.rapports.coupons_desc_autre": "{n} codes promotionnels",
  "admin.systeme.rapports.avis_titre": "Avis",
  "admin.systeme.rapports.avis_desc_un": "{n} avis client",
  "admin.systeme.rapports.avis_desc_autre": "{n} avis clients",

  // ── Subscribers ───────────────────────────────────────────────────────────
  "admin.systeme.newsletter.titre": "Inscrits newsletter",
  "admin.systeme.newsletter.description_un": "{n} inscription collectée via le site.",
  "admin.systeme.newsletter.description_autre": "{n} inscriptions collectées via le site.",
  "admin.systeme.newsletter.exporter_csv": "Exporter en CSV",
  "admin.systeme.newsletter.col_email": "Email",
  "admin.systeme.newsletter.col_source": "Source",
  "admin.systeme.newsletter.col_inscrit_le": "Inscrit le",
  "admin.systeme.newsletter.chargement": "Chargement des inscrits…",
  "admin.systeme.newsletter.toast_export": "Export CSV téléchargé",
  "admin.systeme.newsletter.toast_desinscrit": "Désinscrit",
  "admin.systeme.newsletter.vide": "Aucun inscrit pour le moment.",
  "admin.systeme.newsletter.retirer_titre": "Retirer {email} ?",
  "admin.systeme.newsletter.retirer_description":
    "L'adresse sera supprimée définitivement de la liste.",
  "admin.systeme.newsletter.aria_supprimer": "Supprimer",

  // ── Audit ─────────────────────────────────────────────────────────────────
  "admin.systeme.audit.titre": "Journal d'audit",
  "admin.systeme.audit.description_un": "{n} événement journalisé (500 max, roulement).",
  "admin.systeme.audit.description_autre": "{n} événements journalisés (500 max, roulement).",
  "admin.systeme.audit.placeholder_recherche": "Rechercher (action, entité, acteur)…",
  "admin.systeme.audit.filtre_tous": "Tous",
  "admin.systeme.audit.col_date": "Date",
  "admin.systeme.audit.col_acteur": "Acteur",
  "admin.systeme.audit.col_action": "Action",
  "admin.systeme.audit.col_entite": "Entité",
  "admin.systeme.audit.col_detail": "Détail",
  "admin.systeme.audit.btn_csv": "CSV",
  "admin.systeme.audit.btn_vider": "Vider",
  "admin.systeme.audit.toast_exporte": "Journal exporté",
  "admin.systeme.audit.toast_vide": "Journal vidé",
  "admin.systeme.audit.vide_titre":
    "Aucun événement journalisé pour le moment. Les mutations importantes (commandes, stock, médias) apparaîtront ici automatiquement.",
  "admin.systeme.audit.vide_filtre": "Aucun résultat pour ces filtres.",

  // ── Analytics ─────────────────────────────────────────────────────────────
  "admin.systeme.analytique.titre": "Analytique",
  "admin.systeme.analytique.description":
    "Tendances de ventes calculées sur les commandes enregistrées (données locales).",
  "admin.systeme.analytique.kpi_chiffre_affaires": "Chiffre d'affaires",
  "admin.systeme.analytique.kpi_commandes": "Commandes",
  "admin.systeme.analytique.kpi_panier_moyen": "Panier moyen",
  "admin.systeme.analytique.kpi_taux_livraison": "Taux de livraison",
  "admin.systeme.analytique.kpi_clients": "Clients",
  "admin.systeme.analytique.periode_7j": "7 derniers jours",
  "admin.systeme.analytique.periode_30j": "30 derniers jours",
  "admin.systeme.analytique.periode_90j": "90 derniers jours",
  "admin.systeme.analytique.graphe_ca_par_jour": "Chiffre d'affaires par jour",
  "admin.systeme.analytique.graphe_commandes_par_jour": "Commandes par jour",
  "admin.systeme.analytique.graphe_ca_par_categorie": "Répartition CA par catégorie",
  "admin.systeme.analytique.graphe_traitement": "Traitement des commandes",
  "admin.systeme.analytique.graphe_traitement_note":
    "Étapes réellement enregistrées sur les commandes. Les étapes amont (visiteurs, paniers) ne sont pas affichées : aucune mesure d'audience n'est en place sur le site.",
  "admin.systeme.analytique.graphe_top8": "Top 8 des produits vendus",
  "admin.systeme.analytique.donnees_indisponibles": "Données indisponibles",
  "admin.systeme.analytique.aucune_vente": "Aucune vente enregistrée",
  "admin.systeme.analytique.aucune_vente_texte": "Aucune vente.",
  "admin.systeme.analytique.entonnoir_vide_titre": "Aucune commande à suivre",
  "admin.systeme.analytique.entonnoir_vide_desc":
    "Ce suivi se construit à partir des changements de statut des commandes. Il se remplira dès la première commande enregistrée, puis à chaque passage en préparation, expédition et livraison.",
  "admin.systeme.analytique.entonnoir_voir_commandes": "Ouvrir les commandes",
  "admin.systeme.analytique.entonnoir_annulees_un":
    "Dont {n} commande annulée, hors parcours de livraison.",
  "admin.systeme.analytique.entonnoir_annulees_autre":
    "Dont {n} commandes annulées, hors parcours de livraison.",
  "admin.systeme.analytique.entonnoir_recues": "Commandes reçues",
  "admin.systeme.analytique.entonnoir_preparation": "En préparation",
  "admin.systeme.analytique.entonnoir_expediees": "Expédiées",
  "admin.systeme.analytique.entonnoir_livrees": "Livrées",
  "admin.systeme.analytique.erreur_commandes": "Commandes : {message}",
  "admin.systeme.analytique.erreur_produits_categories": "Produits / catégories : {message}",
  "admin.systeme.analytique.erreur_clients": "Clients : {message}",

  // ── Messages ──────────────────────────────────────────────────────────────
  "admin.systeme.messages.titre": "Messages de contact",
  "admin.systeme.messages.description_un": "{n} message reçu · {unread} non lu.",
  "admin.systeme.messages.description_autre": "{n} messages reçus · {unread} non lus.",
  "admin.systeme.messages.col_statut": "Statut",
  "admin.systeme.messages.col_expediteur": "Expéditeur",
  "admin.systeme.messages.col_sujet": "Sujet",
  "admin.systeme.messages.col_recu_le": "Reçu le",
  "admin.systeme.messages.badge_lu": "Lu",
  "admin.systeme.messages.badge_nouveau": "Nouveau",
  "admin.systeme.messages.btn_voir": "Voir",
  "admin.systeme.messages.btn_marquer_lu": "Marquer lu",
  "admin.systeme.messages.btn_supprimer": "Supprimer",
  "admin.systeme.messages.aria_supprimer": "Supprimer",
  "admin.systeme.messages.btn_repondre_email": "Répondre par e-mail",
  "admin.systeme.messages.btn_whatsapp": "WhatsApp",
  "admin.systeme.messages.toast_marque_lu": "Marqué comme lu",
  "admin.systeme.messages.toast_supprime": "Supprimé",
  "admin.systeme.messages.toast_supprime_dialogue": "Message supprimé",
  "admin.systeme.messages.confirm_supprimer": "Supprimer ce message ?",
  "admin.systeme.messages.chargement": "Chargement des messages…",
  "admin.systeme.messages.vide": "Aucun message.",
  "admin.systeme.messages.detail_de": "De",
  "admin.systeme.messages.detail_recu_le": "Reçu le",

  // ── Notifications ─────────────────────────────────────────────────────────
  "admin.systeme.notifications.titre": "Notifications",
  "admin.systeme.notifications.description_un":
    "{n} notification · {unread} non lue. Générées automatiquement lors des événements clés (commandes, stock).",
  "admin.systeme.notifications.description_autre":
    "{n} notifications · {unread} non lues. Générées automatiquement lors des événements clés (commandes, stock).",
  "admin.systeme.notifications.btn_tout_marquer_lu": "Tout marquer lu",
  "admin.systeme.notifications.btn_nouvelle": "Nouvelle",
  "admin.systeme.notifications.filtre_toutes": "Toutes",
  "admin.systeme.notifications.filtre_non_lues_un": "Non lues ({n})",
  "admin.systeme.notifications.filtre_non_lues_autre": "Non lues ({n})",
  "admin.systeme.notifications.filtre_info": "Info",
  "admin.systeme.notifications.filtre_succes": "Succès",
  "admin.systeme.notifications.filtre_alertes": "Alertes",
  "admin.systeme.notifications.filtre_erreurs": "Erreurs",
  "admin.systeme.notifications.badge_nouveau": "Nouveau",
  "admin.systeme.notifications.btn_marquer_lu": "Marquer lu",
  "admin.systeme.notifications.btn_supprimer": "Supprimer",
  "admin.systeme.notifications.aria_supprimer": "Supprimer",
  "admin.systeme.notifications.vide": "Aucune notification.",
  "admin.systeme.notifications.toast_tout_lu": "Toutes marquées comme lues",
  "admin.systeme.notifications.toast_supprimee": "Supprimée",
  "admin.systeme.notifications.toast_creee": "Notification créée",
  "admin.systeme.notifications.toast_titre_requis": "Titre requis",
  "admin.systeme.notifications.dialog_titre": "Nouvelle notification",
  "admin.systeme.notifications.champ_titre": "Titre",
  "admin.systeme.notifications.champ_corps": "Corps",
  "admin.systeme.notifications.champ_niveau": "Niveau",
  "admin.systeme.notifications.champ_lien": "Lien (optionnel)",
  "admin.systeme.notifications.champ_lien_placeholder": "/admin/orders/…",
  "admin.systeme.notifications.btn_annuler": "Annuler",
  "admin.systeme.notifications.btn_creer": "Créer",
  "admin.systeme.notifications.level_info": "Info",
  "admin.systeme.notifications.level_success": "Succès",
  "admin.systeme.notifications.level_warning": "Alerte",
  "admin.systeme.notifications.level_error": "Erreur",

  // ── Reset ─────────────────────────────────────────────────────────────────
  "admin.systeme.reset.titre": "Réinitialisation des données",
  "admin.systeme.reset.description":
    "Restaurer, vider, exporter ou importer les données locales de la boutique.",
  "admin.systeme.reset.alerte_titre": "Attention",
  "admin.systeme.reset.alerte_description":
    "Ces actions modifient uniquement les données locales (localStorage) de ce navigateur.",
  "admin.systeme.reset.section_sauvegarde": "Sauvegarde & restauration",
  "admin.systeme.reset.btn_exporter_json": "Exporter en JSON",
  "admin.systeme.reset.btn_importer_json": "Importer un JSON…",
  "admin.systeme.reset.section_global": "Actions globales",
  "admin.systeme.reset.btn_reinitialiser_tout": "Réinitialiser toute la boutique",
  "admin.systeme.reset.btn_vider_tout": "Tout vider",
  "admin.systeme.reset.section_par_type": "Par type de données",
  "admin.systeme.reset.btn_reinitialiser": "Réinitialiser",
  "admin.systeme.reset.btn_vider": "Vider",
  "admin.systeme.reset.objet_unique": "objet unique",
  "admin.systeme.reset.enregistrement_un": "{n} enregistrement",
  "admin.systeme.reset.enregistrement_autre": "{n} enregistrements",
  "admin.systeme.reset.toast_reinitialise": "{label} réinitialisé",
  "admin.systeme.reset.toast_reinitialises": "{label} réinitialisées",
  "admin.systeme.reset.toast_vide": "{label} vidé",
  "admin.systeme.reset.toast_tout_vide": "Toutes les données ont été vidées",
  "admin.systeme.reset.toast_export_ok": "Export téléchargé",
  "admin.systeme.reset.toast_export_echec": "Échec de l'export",
  "admin.systeme.reset.toast_import_ok": "Import réussi ({total} enregistrements depuis {fichier})",
  "admin.systeme.reset.toast_import_echec": "Import échoué : {message}",
  "admin.systeme.reset.toast_action_echec": "Action échouée : {message}",
  "admin.systeme.reset.toast_fichier_trop_grand": "Fichier trop volumineux (>5 Mo)",
  "admin.systeme.reset.toast_lecture_echec": "Impossible de lire le fichier",
  "admin.systeme.reset.dialog_reinitialiser_titre": "Réinitialiser {label} ?",
  "admin.systeme.reset.dialog_vider_titre": "Vider {label} ?",
  "admin.systeme.reset.dialog_vider_tout_titre": "Vider TOUTES les données ?",
  "admin.systeme.reset.dialog_importer_titre": "Importer « {fichier} » ?",
  "admin.systeme.reset.dialog_import_desc":
    "Cela remplacera toutes les données locales par le contenu du fichier.",
  "admin.systeme.reset.dialog_destructive_desc":
    "Cette action est irréversible sur les données locales du navigateur.",
  "admin.systeme.reset.dialog_confirmer_import": "Importer",
  "admin.systeme.reset.dialog_confirmer": "Confirmer",
  "admin.systeme.reset.acces_restreint_titre": "Accès restreint",
  "admin.systeme.reset.acces_restreint_desc":
    "La réinitialisation des données est réservée au Propriétaire.",
  "admin.systeme.reset.row_products": "Produits",
  "admin.systeme.reset.row_products_desc": "Catalogue local des produits.",
  "admin.systeme.reset.row_categories": "Catégories",
  "admin.systeme.reset.row_categories_desc": "Rubriques du catalogue.",
  "admin.systeme.reset.row_brands": "Marques",
  "admin.systeme.reset.row_brands_desc": "Marques référencées.",
  "admin.systeme.reset.row_orders": "Commandes",
  "admin.systeme.reset.row_orders_desc": "Commandes clients.",
  "admin.systeme.reset.row_customers": "Clients",
  "admin.systeme.reset.row_customers_desc": "Base clients.",
  "admin.systeme.reset.row_coupons": "Coupons",
  "admin.systeme.reset.row_coupons_desc": "Codes promo.",
  "admin.systeme.reset.row_reviews": "Avis produits",
  "admin.systeme.reset.row_reviews_desc": "Avis clients à modérer.",
  "admin.systeme.reset.row_users": "Utilisateurs admin",
  "admin.systeme.reset.row_users_desc": "Membres de l'équipe.",
  "admin.systeme.reset.row_blog_posts": "Articles de blog",
  "admin.systeme.reset.row_blog_posts_desc": "Publications du blog.",
  "admin.systeme.reset.row_home_reviews": "Avis d'accueil",
  "admin.systeme.reset.row_home_reviews_desc": "Témoignages en page d'accueil.",
  "admin.systeme.reset.row_ticker_messages": "Bandeau défilant",
  "admin.systeme.reset.row_ticker_messages_desc": "Messages du ruban en haut de page.",
  "admin.systeme.reset.row_marquee_brands": "Marques défilantes",
  "admin.systeme.reset.row_marquee_brands_desc": "Logos textuels du carrousel de marques.",
  "admin.systeme.reset.row_about_values": "Valeurs (À propos)",
  "admin.systeme.reset.row_about_values_desc": "Cartes d'engagements de la page À propos.",
  "admin.systeme.reset.row_builder_steps": "Étapes du configurateur",
  "admin.systeme.reset.row_builder_steps_desc": "Composants et options du builder PC.",
  "admin.systeme.reset.row_shipping_rates": "Tarifs de livraison",
  "admin.systeme.reset.row_shipping_rates_desc": "Tarifs par wilaya (domicile / bureau).",
  "admin.systeme.reset.row_payment_methods": "Moyens de paiement",
  "admin.systeme.reset.row_payment_methods_desc": "Modes de paiement proposés au checkout.",
  "admin.systeme.reset.row_stock_movements": "Mouvements de stock",
  "admin.systeme.reset.row_stock_movements_desc": "Journal des ajustements de stock.",
  "admin.systeme.reset.row_media_assets": "Médiathèque",
  "admin.systeme.reset.row_media_assets_desc": "Images téléversées disponibles pour le contenu.",
  "admin.systeme.reset.row_notifications": "Notifications",
  "admin.systeme.reset.row_notifications_desc": "Notifications internes de l'admin.",
  "admin.systeme.reset.row_audit_logs": "Journal d'audit",
  "admin.systeme.reset.row_audit_logs_desc": "Actions effectuées dans l'admin.",
  "admin.systeme.reset.row_messages": "Messages de contact",
  "admin.systeme.reset.row_messages_desc": "Messages reçus via /contact.",
  "admin.systeme.reset.row_subscribers": "Inscrits newsletter",
  "admin.systeme.reset.row_subscribers_desc": "E-mails collectés via le pied de page.",
  "admin.systeme.reset.row_site_settings": "Paramètres du site",
  "admin.systeme.reset.row_site_settings_desc": "Nom, contact, WhatsApp, adresse, horaires.",
  "admin.systeme.reset.row_shipping_settings": "Réglages livraison",
  "admin.systeme.reset.row_shipping_settings_desc":
    "Franco de port, activation des modes de livraison.",

  // ── Developpeur ───────────────────────────────────────────────────────────
  "admin.systeme.developpeur.titre": "Développeur",
  "admin.systeme.developpeur.description":
    "Diagnostic de base, sauvegarde et migration. Réservé au Propriétaire.",
  "admin.systeme.developpeur.acces_restreint_titre": "Accès restreint",
  "admin.systeme.developpeur.acces_restreint_desc": "Cette page est réservée au Propriétaire.",

  // Section 1 — État de la base
  "admin.systeme.developpeur.etat_titre": "État de la base",
  "admin.systeme.developpeur.etat_rafraichir_aria": "Rafraîchir l'état de la base",
  "admin.systeme.developpeur.etat_rafraichir": "Rafraîchir",
  "admin.systeme.developpeur.etat_pilote": "Pilote",
  "admin.systeme.developpeur.etat_base": "Base",
  "admin.systeme.developpeur.etat_taille": "Taille",
  "admin.systeme.developpeur.etat_outbox": "Événements en attente",
  "admin.systeme.developpeur.etat_outbox_zero": "Aucun",
  "admin.systeme.developpeur.etat_derniere_sauvegarde": "Dernière sauvegarde :",
  "admin.systeme.developpeur.etat_aucune_sauvegarde": "Aucune sauvegarde connue",
  "admin.systeme.developpeur.etat_chargement_tables": "Chargement des tables…",
  "admin.systeme.developpeur.etat_aucune_table": "Aucune table disponible.",
  "admin.systeme.developpeur.etat_col_table": "Table",
  "admin.systeme.developpeur.etat_col_lignes": "Lignes",

  // Section 2 — Sauvegarde
  "admin.systeme.developpeur.sauvegarde_titre": "Sauvegarde",
  "admin.systeme.developpeur.sauvegarde_description":
    "Télécharge un dump de la base. Le fichier est livré directement par le serveur et transite via votre session — aucun tiers ne le reçoit.",
  "admin.systeme.developpeur.sauvegarde_btn": "Télécharger la sauvegarde",
  "admin.systeme.developpeur.sauvegarde_en_cours": "Téléchargement en cours…",
  "admin.systeme.developpeur.sauvegarde_toast_ok": "Sauvegarde téléchargée",
  "admin.systeme.developpeur.sauvegarde_toast_echec": "Sauvegarde échouée : {message}",

  // Section 3 — Migration
  "admin.systeme.developpeur.migration_titre": "Migration vers un autre moteur",
  "admin.systeme.developpeur.migration_alerte_titre": "Simulation obligatoire",
  "admin.systeme.developpeur.migration_alerte_desc":
    "Cliquez d'abord sur Simuler pour vérifier la compatibilité sans toucher à vos données. Le bouton Exécuter n'est disponible qu'après une simulation réussie.",
  "admin.systeme.developpeur.migration_legend": "Connexion à la base cible",
  "admin.systeme.developpeur.migration_label_cible": "Moteur cible",
  "admin.systeme.developpeur.migration_label_utilisateur": "Utilisateur de la base cible",
  "admin.systeme.developpeur.migration_label_dsn": "DSN de connexion",
  "admin.systeme.developpeur.migration_dsn_exemple":
    "Exemple MySQL : mysql://hôte:3306/base_cible — PostgreSQL : postgresql://hôte:5432/base_cible",
  "admin.systeme.developpeur.migration_label_mdp": "Mot de passe",
  "admin.systeme.developpeur.migration_mdp_note":
    "Transmis uniquement au serveur dans le corps de la requête. Jamais stocké localement.",
  "admin.systeme.developpeur.migration_aria_afficher_mdp": "Afficher le mot de passe",
  "admin.systeme.developpeur.migration_aria_masquer_mdp": "Masquer le mot de passe",
  "admin.systeme.developpeur.migration_btn_simuler": "Simuler",
  "admin.systeme.developpeur.migration_simulation_cours": "Simulation en cours…",
  "admin.systeme.developpeur.migration_btn_executer": "Exécuter",
  "admin.systeme.developpeur.migration_execution_cours": "Migration en cours…",
  "admin.systeme.developpeur.migration_tooltip_simuler_dabord":
    "Effectuez d'abord une simulation réussie",
  "admin.systeme.developpeur.migration_toast_form_incomplet":
    "Renseignez le DSN, l'utilisateur et le mot de passe.",
  "admin.systeme.developpeur.migration_toast_simu_ok":
    "Simulation réussie — consultez le rapport avant d'exécuter.",
  "admin.systeme.developpeur.migration_toast_simu_echec": "Simulation échouée : {message}",
  "admin.systeme.developpeur.migration_toast_exec_ok": "Migration exécutée avec succès.",
  "admin.systeme.developpeur.migration_toast_exec_echec": "Migration échouée : {message}",

  // Dialogue de confirmation (sauvegarde / migration)
  "admin.systeme.developpeur.dialog_sauvegarde_titre": "Télécharger la sauvegarde ?",
  "admin.systeme.developpeur.dialog_sauvegarde_desc":
    "Le fichier sera téléchargé directement dans votre navigateur.",
  "admin.systeme.developpeur.dialog_migration_titre": "Exécuter la migration ?",
  "admin.systeme.developpeur.dialog_migration_desc_intro":
    "Cette opération transfère toutes les données vers la base cible. Elle est irréversible.",
  "admin.systeme.developpeur.dialog_migration_desc_cible": "Cible : {cible} — {dsn}",
  "admin.systeme.developpeur.dialog_migration_desc_confirmer":
    "La simulation a été effectuée. Confirmez pour écrire les données.",
  "admin.systeme.developpeur.dialog_btn_telecharger": "Télécharger",
  "admin.systeme.developpeur.dialog_btn_executer": "Exécuter la migration",

  // Rapport de migration
  "admin.systeme.developpeur.rapport_simulation": "Rapport de simulation",
  "admin.systeme.developpeur.rapport_migration": "Rapport de migration",
  "admin.systeme.developpeur.rapport_badge_simulation": "Simulation",
  "admin.systeme.developpeur.rapport_badge_execution": "Exécution réelle",
  "admin.systeme.developpeur.rapport_col_table": "Table",
  "admin.systeme.developpeur.rapport_col_lues": "Lues",
  "admin.systeme.developpeur.rapport_col_ecrites": "Écrites",
  "admin.systeme.developpeur.rapport_col_anomalies": "Anomalies",
  "admin.systeme.developpeur.rapport_lignes_lues": "Lignes lues",
  "admin.systeme.developpeur.rapport_lignes_ecrites": "Lignes écrites",
  "admin.systeme.developpeur.rapport_anomalies": "Anomalies",
  "admin.systeme.developpeur.rapport_details_note":
    "Cliquez sur une ligne en anomalie pour voir l'explication détaillée.",
  "admin.systeme.developpeur.rapport_details_indisponibles":
    "Détails non disponibles — mettez à jour le serveur pour obtenir l'explication complète.",
  "admin.systeme.developpeur.rapport_aria_details": "Détails anomalies — {nom}",

  // Bandeau de décision
  "admin.systeme.developpeur.decision_bloquee_titre": "Migration déconseillée",
  "admin.systeme.developpeur.decision_bloquee_desc_un":
    "{n} erreur bloquante détectée. Des données pourraient être perdues ou corrompues. Corrigez les problèmes avant d'exécuter.",
  "admin.systeme.developpeur.decision_bloquee_desc_autre":
    "{n} erreurs bloquantes détectées. Des données pourraient être perdues ou corrompues. Corrigez les problèmes avant d'exécuter.",
  "admin.systeme.developpeur.decision_precaution_titre": "Migration possible avec précautions",
  "admin.systeme.developpeur.decision_precaution_desc_un":
    "{n} avertissement signalé. Aucune perte de données confirmée, mais vérifiez les détails avant de conclure.",
  "admin.systeme.developpeur.decision_precaution_desc_autre":
    "{n} avertissements signalés. Aucune perte de données confirmée, mais vérifiez les détails avant de conclure.",
  "admin.systeme.developpeur.decision_ok_titre": "Migration sans anomalie",
  "admin.systeme.developpeur.decision_ok_desc":
    "Toutes les tables ont été traitées sans erreur. Vous pouvez exécuter la migration.",

  // Badges de gravité
  "admin.systeme.developpeur.gravite_erreur": "Erreur",
  "admin.systeme.developpeur.gravite_avertissement": "Avertissement",

  // Section 4 — Import du catalogue
  "admin.systeme.developpeur.import_catalogue_titre": "Import du catalogue de démonstration",
  "admin.systeme.developpeur.import_catalogue_description":
    "Remplit la boutique avec les produits, catégories et marques du catalogue de démonstration. Utilisez ce bouton si votre boutique est vide après l'installation, ou pour réinitialiser le catalogue.",
  "admin.systeme.developpeur.import_catalogue_alerte_titre":
    "Attention : remplacement du catalogue",
  "admin.systeme.developpeur.import_catalogue_alerte_desc":
    "Cette action remplace les produits, catégories et marques existants par ceux du catalogue de démonstration. Les commandes, clients et autres données ne sont pas touchés.",
  "admin.systeme.developpeur.import_catalogue_btn": "Importer le catalogue",
  "admin.systeme.developpeur.import_catalogue_en_cours": "Import en cours…",
  "admin.systeme.developpeur.import_catalogue_dialog_titre": "Importer le catalogue ?",
  "admin.systeme.developpeur.import_catalogue_dialog_desc":
    "Cette action va remplacer le catalogue actuel par les données de démonstration. Les commandes et clients ne seront pas modifiés.",
  "admin.systeme.developpeur.import_catalogue_dialog_btn": "Importer",
  "admin.systeme.developpeur.import_catalogue_toast_ok":
    "{produits} produit(s), {categories} catégorie(s), {marques} marque(s) importés.",
  "admin.systeme.developpeur.import_catalogue_toast_echec": "Import échoué : {message}",

  // Section 5 — Affichage & Outils de développement
  "admin.systeme.developpeur.affichage_titre": "Affichage & Outils de développement",
  "admin.systeme.developpeur.affichage_badge_label":
    "Afficher la pastille de mode de données (HTTP/Mock)",
  "admin.systeme.developpeur.affichage_badge_desc":
    "Pastille flottante indiquant le mode d'accès aux données (http ou mock), l'URL d'API et les éventuels replis réseau. Cliquer sur la pastille ouvre l'inspecteur d'environnement.",
};

export default systemeFr;
