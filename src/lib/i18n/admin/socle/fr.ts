/**
 * Groupe « socle » — dictionnaire fr (français).
 *
 * PROPRIÉTAIRE : agent pilote. Ce groupe couvre le cadre du back-office
 * (AdminLayout, AdminShell, ConfirmDialog), le tableau de bord (Dashboard) et
 * la page exemplaire Products.tsx.
 *
 * Il porte en plus le vocabulaire PARTAGÉ par tous les écrans :
 *   - `admin.socle.commun.*`       actions et états récurrents
 *   - `admin.socle.confirmation.*` boutons de ConfirmDialog
 *   - `admin.socle.roles.*`        libellés des quatre rôles
 *   - `admin.socle.navigation.*`   barre latérale et fil d'Ariane
 * Les agents de réplication RÉUTILISENT ces clés au lieu d'en recréer des
 * variantes dans leur groupe : « Supprimer » ne doit pas exister six fois.
 *
 * Convention complète : `src/lib/i18n/admin/index.ts`.
 */
const socleFr: Record<string, string> = {
  // ── Vocabulaire partagé ───────────────────────────────────────────────────
  "admin.socle.commun.chargement": "Chargement…",
  "admin.socle.commun.aucune_donnee": "Aucune donnée pour le moment",
  "admin.socle.commun.donnees_indisponibles": "Données indisponibles.",
  "admin.socle.commun.voir": "Voir",
  "admin.socle.commun.modifier": "Modifier",
  "admin.socle.commun.supprimer": "Supprimer",
  "admin.socle.commun.enregistrer": "Enregistrer",
  "admin.socle.commun.actions": "Actions",
  "admin.socle.commun.rechercher": "Rechercher",

  "admin.socle.confirmation.confirmer": "Confirmer",
  "admin.socle.confirmation.annuler": "Annuler",

  // Libellés des rôles. Les identifiants (`owner`, `admin`…) sont techniques :
  // ils ne se traduisent pas, seul leur libellé le fait.
  "admin.socle.roles.owner": "Propriétaire",
  "admin.socle.roles.admin": "Administrateur",
  "admin.socle.roles.editor": "Éditeur",
  "admin.socle.roles.viewer": "Lecteur",

  // ── Barre latérale, navigation mobile, fil d'Ariane ───────────────────────
  "admin.socle.navigation.badge": "Admin",
  "admin.socle.navigation.ouvrir_menu": "Ouvrir le menu admin",
  "admin.socle.navigation.fil_ariane": "Fil d'Ariane",
  "admin.socle.navigation.racine": "Admin",
  "admin.socle.navigation.accueil_admin": "Accueil de l'administration",

  "admin.socle.navigation.section_apercu": "Vue d'ensemble",
  "admin.socle.navigation.section_catalogue": "Catalogue",
  "admin.socle.navigation.section_ventes": "Ventes",
  "admin.socle.navigation.section_relation": "Relation client",
  "admin.socle.navigation.section_contenu": "Contenu",
  "admin.socle.navigation.section_systeme": "Système",

  "admin.socle.navigation.lien_tableau": "Tableau de bord",
  "admin.socle.navigation.lien_analytique": "Analytique",
  "admin.socle.navigation.lien_rapports": "Rapports",
  "admin.socle.navigation.lien_produits": "Produits",
  "admin.socle.navigation.lien_categories": "Catégories",
  "admin.socle.navigation.lien_marques": "Marques",
  "admin.socle.navigation.lien_stock": "Stock",
  "admin.socle.navigation.lien_medias": "Médias",
  "admin.socle.navigation.lien_commandes": "Commandes",
  "admin.socle.navigation.lien_clients": "Clients",
  "admin.socle.navigation.lien_coupons": "Coupons",
  "admin.socle.navigation.lien_livraison": "Livraison",
  "admin.socle.navigation.lien_paiements": "Paiements",
  "admin.socle.navigation.lien_messages": "Messages de contact",
  "admin.socle.navigation.lien_newsletter": "Newsletter",
  "admin.socle.navigation.lien_contenu": "Contenu du site",
  "admin.socle.navigation.lien_blog": "Blog",
  "admin.socle.navigation.lien_avis": "Avis",
  "admin.socle.navigation.lien_utilisateurs": "Utilisateurs et rôles",
  "admin.socle.navigation.lien_notifications": "Notifications",
  "admin.socle.navigation.lien_audit": "Journal d'audit",
  "admin.socle.navigation.lien_parametres": "Paramètres",
  "admin.socle.navigation.lien_reinitialiser": "Réinitialiser",
  "admin.socle.navigation.lien_developpeur": "Développeur",

  // ── En-tête : simulation de rôle, notifications, menu utilisateur ─────────
  "admin.socle.entete.simuler_role": "Simuler un rôle",
  "admin.socle.entete.role_reel": "(réel : {role})",
  "admin.socle.entete.simuler_infobulle":
    "Outil de développement : permet uniquement de rétrograder son propre rôle pour tester l'interface.",

  "admin.socle.entete.notifications": "Notifications",
  "admin.socle.entete.tout_lu": "Tout lu",
  "admin.socle.entete.aucune_notification": "Aucune notification.",
  "admin.socle.entete.marquer_lu": "Marquer lu",
  "admin.socle.entete.toutes_notifications": "Toutes les notifications",
  "admin.socle.entete.non_lues_un": "{n} notification non lue",
  "admin.socle.entete.non_lues_autre": "{n} notifications non lues",

  "admin.socle.entete.menu_utilisateur": "Menu utilisateur",
  "admin.socle.entete.compte": "Compte",
  "admin.socle.entete.role": "Rôle :",
  "admin.socle.entete.role_simule": "Rôle simulé :",
  "admin.socle.entete.role_separateur_reel": "— réel :",
  "admin.socle.entete.retour_boutique": "Retour à la boutique",
  "admin.socle.entete.deconnexion": "Se déconnecter",

  // ── Tableau de bord ───────────────────────────────────────────────────────
  "admin.socle.tableau.titre": "Tableau de bord",
  "admin.socle.tableau.description": "Vue d'ensemble de la boutique (données locales).",
  "admin.socle.tableau.kpi_produits": "Produits",
  "admin.socle.tableau.kpi_categories": "Catégories",
  "admin.socle.tableau.kpi_marques": "Marques",
  "admin.socle.tableau.kpi_valeur_catalogue": "Valeur catalogue",
  "admin.socle.tableau.kpi_chiffre_affaires": "Chiffre d'affaires",
  "admin.socle.tableau.kpi_commandes_attente": "Commandes en attente",
  "admin.socle.tableau.kpi_clients": "Clients",
  "admin.socle.tableau.kpi_avis_moderer": "Avis à modérer",
  "admin.socle.tableau.kpi_coupons_actifs": "Coupons actifs",
  "admin.socle.tableau.kpi_stock_faible": "Stock faible",
  "admin.socle.tableau.kpi_en_stock": "En stock",
  "admin.socle.tableau.kpi_bestsellers": "Meilleures ventes",
  "admin.socle.tableau.ca_30_jours": "Chiffre d'affaires — 30 derniers jours",
  "admin.socle.tableau.produits_par_categorie": "Produits par catégorie",
  "admin.socle.tableau.dernieres_commandes": "Dernières commandes",
  "admin.socle.tableau.aucune_commande": "Aucune commande.",

  // ── Produits — PAGE EXEMPLAIRE ────────────────────────────────────────────
  "admin.socle.produits.titre": "Produits",
  // Pluriel : les deux suffixes sont obligatoires dans les trois langues.
  // Appel correspondant dans Products.tsx : t("…description", { n: total }).
  "admin.socle.produits.description_un": "{n} produit dans le catalogue local.",
  "admin.socle.produits.description_autre": "{n} produits dans le catalogue local.",
  "admin.socle.produits.configs_un": "{n} configuration client (hors boutique).",
  "admin.socle.produits.configs_autre": "{n} configurations client (hors boutique).",
  "admin.socle.produits.nouveau": "Nouveau produit",
  "admin.socle.produits.garde_supprimer": "Supprimer le produit",
  "admin.socle.produits.recherche_placeholder": "Rechercher (nom, marque, identifiant)…",
  "admin.socle.produits.toutes_categories": "Toutes catégories",
  "admin.socle.produits.col_image": "Image",
  "admin.socle.produits.col_produit": "Produit",
  "admin.socle.produits.col_marque": "Marque",
  "admin.socle.produits.col_categorie": "Catégorie",
  "admin.socle.produits.col_prix": "Prix",
  "admin.socle.produits.col_stock": "Stock",
  // Libellés des états de stock. Les valeurs `in` / `low` / `out` restent des
  // identifiants techniques côté données : seul l'affichage est traduit.
  "admin.socle.produits.stock_in": "En stock",
  "admin.socle.produits.stock_low": "Stock faible",
  "admin.socle.produits.stock_out": "Rupture",
  "admin.socle.produits.badge_config": "Config. client",
  "admin.socle.produits.voir_public": "Voir la fiche publique",
  "admin.socle.produits.vide_aucun_resultat": "Aucun produit ne correspond aux filtres.",
  "admin.socle.produits.supprimer_titre": "Supprimer ce produit ?",
  "admin.socle.produits.supprimer_description":
    "Le produit « {nom} » sera supprimé du catalogue local. Cette action est irréversible.",
  "admin.socle.produits.suppression_en_cours": "Suppression…",
  "admin.socle.produits.toast_supprime": "« {nom} » supprimé",
  "admin.socle.archisys.badge": "StacGate Platform • Socle Architectural Élite",
  "admin.socle.archisys.desc": "Conception et Direction d'Architecture R&D validées par {auteur}",
  "admin.socle.archisys.noyau_valide": "Noyau Validé",
  "admin.socle.archisys.alt": "Sceau d'Architecture ArchiSys3.0",
};

export default socleFr;
