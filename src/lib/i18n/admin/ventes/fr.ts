/**
 * Groupe « ventes » — dictionnaire fr (français).
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
const ventesFr: Record<string, string> = {
  // ── Statuts de commande — libellés partagés commandes / clients ──────────
  // Les valeurs techniques (pending, processing…) ne changent JAMAIS.
  // Seul l'affichage est traduit.
  "admin.ventes.commun.statut_pending": "En attente",
  "admin.ventes.commun.statut_processing": "En traitement",
  "admin.ventes.commun.statut_shipped": "Expédiée",
  "admin.ventes.commun.statut_delivered": "Livrée",
  "admin.ventes.commun.statut_cancelled": "Annulée",

  // ── Statuts d'avis ───────────────────────────────────────────────────────
  "admin.ventes.commun.avis_pending": "En attente",
  "admin.ventes.commun.avis_approved": "Approuvé",
  "admin.ventes.commun.avis_rejected": "Rejeté",

  // ── Orders (liste des commandes) ─────────────────────────────────────────
  "admin.ventes.commandes.titre": "Commandes",
  "admin.ventes.commandes.description_un": "{n} commande enregistrée.",
  "admin.ventes.commandes.description_autre": "{n} commandes enregistrées.",
  "admin.ventes.commandes.chargement": "Chargement des commandes…",
  "admin.ventes.commandes.recherche_placeholder": "Rechercher (n°, client, wilaya)…",
  "admin.ventes.commandes.onglet_toutes": "Toutes ({n})",
  "admin.ventes.commandes.onglet_pending": "En attente ({n})",
  "admin.ventes.commandes.onglet_processing": "En traitement ({n})",
  "admin.ventes.commandes.onglet_shipped": "Expédiées ({n})",
  "admin.ventes.commandes.onglet_delivered": "Livrées ({n})",
  "admin.ventes.commandes.onglet_cancelled": "Annulées ({n})",
  "admin.ventes.commandes.col_numero": "N°",
  "admin.ventes.commandes.col_client": "Client",
  "admin.ventes.commandes.col_wilaya": "Wilaya",
  "admin.ventes.commandes.col_date": "Date",
  "admin.ventes.commandes.col_total": "Total",
  "admin.ventes.commandes.col_statut": "Statut",
  "admin.ventes.commandes.voir_commande": "Voir la commande",
  "admin.ventes.commandes.vide": "Aucune commande.",

  // ── OrderDetail (fiche commande) ─────────────────────────────────────────
  "admin.ventes.detail.titre": "Commande {id}",
  "admin.ventes.detail.description": "Passée le {date}",
  "admin.ventes.detail.retour": "Retour",
  "admin.ventes.detail.chargement": "Chargement de la commande…",
  "admin.ventes.detail.introuvable": "Commande introuvable.",
  "admin.ventes.detail.section_articles": "Articles",
  "admin.ventes.detail.qte": "Qté : {qty} × {prix}",
  "admin.ventes.detail.sous_total": "Sous-total",
  "admin.ventes.detail.remise": "Remise {coupon}",
  "admin.ventes.detail.livraison": "Livraison",
  "admin.ventes.detail.livraison_gratuite": "Gratuite",
  "admin.ventes.detail.total": "Total",
  "admin.ventes.detail.section_suivi": "Suivi du statut",
  "admin.ventes.detail.note_client": "Note client",
  "admin.ventes.detail.section_changer_statut": "Changer le statut",
  "admin.ventes.detail.mise_a_jour_en_cours": "Mise à jour en cours…",
  "admin.ventes.detail.toast_statut_maj": "Statut mis à jour",
  "admin.ventes.detail.garde_changer_statut": "Changer le statut de la commande",
  "admin.ventes.detail.section_client": "Client",
  "admin.ventes.detail.voir_client": "Voir le client",
  "admin.ventes.detail.section_livraison": "Livraison & paiement",
  "admin.ventes.detail.adresse": "Adresse :",
  "admin.ventes.detail.wilaya": "Wilaya :",
  "admin.ventes.detail.type_livraison": "Type :",
  "admin.ventes.detail.livraison_domicile": "Domicile",
  "admin.ventes.detail.livraison_bureau": "Bureau",
  "admin.ventes.detail.telephone": "Téléphone :",
  "admin.ventes.detail.paiement": "Paiement :",

  // ── Customers (liste des clients) ────────────────────────────────────────
  "admin.ventes.clients.titre": "Clients",
  "admin.ventes.clients.description_un":
    "{n} client enregistré — statistiques dérivées des commandes.",
  "admin.ventes.clients.description_autre":
    "{n} clients enregistrés — statistiques dérivées des commandes.",
  "admin.ventes.clients.nouveau": "Nouveau client",
  "admin.ventes.clients.chargement": "Chargement des clients…",
  "admin.ventes.clients.recherche_placeholder": "Rechercher (nom, email, wilaya, tél)…",
  "admin.ventes.clients.col_nom": "Nom",
  "admin.ventes.clients.col_email": "Email",
  "admin.ventes.clients.col_telephone": "Téléphone",
  "admin.ventes.clients.col_wilaya": "Wilaya",
  "admin.ventes.clients.col_commandes": "Commandes",
  "admin.ventes.clients.col_depense": "Dépensé (LTV)",
  "admin.ventes.clients.col_derniere_commande": "Dernière commande",
  "admin.ventes.clients.details": "Détails",
  "admin.ventes.clients.vide_recherche": "Aucun client ne correspond à la recherche.",
  "admin.ventes.clients.vide_aucun":
    "Aucun client enregistré. Créez le premier client avec le bouton ci-dessus.",
  "admin.ventes.clients.historique_commandes": "Historique des commandes",
  "admin.ventes.clients.aucune_commande": "Aucune commande.",
  "admin.ventes.clients.ouvrir_commande": "Ouvrir",
  "admin.ventes.clients.inscrit_le": "Inscrit le {date}",
  "admin.ventes.clients.kpi_ltv": "LTV",
  "admin.ventes.clients.kpi_commandes": "Commandes",
  "admin.ventes.clients.kpi_panier_moyen": "Panier moyen",
  "admin.ventes.clients.kpi_derniere": "Dernière",
  // Formulaire client
  "admin.ventes.clients.form_titre_nouveau": "Nouveau client",
  "admin.ventes.clients.form_titre_modifier": "Modifier le client",
  "admin.ventes.clients.form_nom": "Nom complet",
  "admin.ventes.clients.form_nom_placeholder": "Prénom Nom",
  "admin.ventes.clients.form_email": "Email",
  "admin.ventes.clients.form_email_placeholder": "client@example.dz",
  "admin.ventes.clients.form_telephone": "Téléphone",
  "admin.ventes.clients.form_telephone_placeholder": "0XXXXXXXXX",
  "admin.ventes.clients.form_wilaya": "Wilaya",
  "admin.ventes.clients.form_wilaya_placeholder": "Sélectionner une wilaya…",
  "admin.ventes.clients.form_enregistrement": "Enregistrement…",
  // Validation (messages d'erreur Zod)
  "admin.ventes.clients.err_nom": "Nom requis (2 caractères min.)",
  "admin.ventes.clients.err_email": "Email invalide",
  "admin.ventes.clients.err_email_duplique": "Adresse email déjà utilisée par un autre client",
  "admin.ventes.clients.err_telephone": "Téléphone invalide (format : 0XXXXXXXXX)",
  "admin.ventes.clients.err_wilaya": "Wilaya requise",
  // Suppression
  "admin.ventes.clients.supprimer_titre": "Supprimer ce client ?",
  "admin.ventes.clients.supprimer_description":
    "Le client {nom} ({email}) sera supprimé définitivement. Cette action est irréversible.",
  "admin.ventes.clients.supprimer_bloque_un":
    "Impossible : le client {nom} est rattaché à {n} commande active. Clôturez ou annulez cette commande depuis /admin/orders avant de supprimer ce client.",
  "admin.ventes.clients.supprimer_bloque_autre":
    "Impossible : le client {nom} est rattaché à {n} commandes actives. Clôturez ou annulez ces commandes depuis /admin/orders avant de supprimer ce client.",
  "admin.ventes.clients.toast_cree": "Client « {nom} » créé",
  "admin.ventes.clients.toast_modifie": "« {nom} » mis à jour",
  "admin.ventes.clients.toast_supprime": "Client « {nom} » supprimé",
  "admin.ventes.clients.garde_modifier": "Modifier le client",
  "admin.ventes.clients.garde_creer": "Créer le client",
  "admin.ventes.clients.garde_supprimer": "Supprimer le client",

  // ── Coupons ───────────────────────────────────────────────────────────────
  "admin.ventes.coupons.titre": "Coupons",
  "admin.ventes.coupons.description_un": "{n} code promo actif et archivé.",
  "admin.ventes.coupons.description_autre": "{n} codes promo actifs et archivés.",
  "admin.ventes.coupons.nouveau": "Nouveau coupon",
  "admin.ventes.coupons.chargement": "Chargement des coupons…",
  "admin.ventes.coupons.col_code": "Code",
  "admin.ventes.coupons.col_remise": "Remise",
  "admin.ventes.coupons.col_achat_min": "Achat min.",
  "admin.ventes.coupons.col_usage": "Usage",
  "admin.ventes.coupons.col_expire": "Expire",
  "admin.ventes.coupons.col_statut": "Statut",
  "admin.ventes.coupons.statut_actif": "Actif",
  "admin.ventes.coupons.statut_expire": "Expiré",
  "admin.ventes.coupons.statut_desactive": "Désactivé",
  "admin.ventes.coupons.vide": "Aucun coupon.",
  "admin.ventes.coupons.copie": "{code} copié",
  // Formulaire coupon
  "admin.ventes.coupons.form_titre_nouveau": "Nouveau coupon",
  "admin.ventes.coupons.form_titre_modifier": "Modifier le coupon",
  "admin.ventes.coupons.form_code": "Code",
  "admin.ventes.coupons.form_code_placeholder": "BIENVENUE10",
  "admin.ventes.coupons.form_type": "Type",
  "admin.ventes.coupons.form_type_percent": "Pourcentage",
  "admin.ventes.coupons.form_type_fixed": "Montant fixe (DA)",
  "admin.ventes.coupons.form_valeur": "Valeur",
  "admin.ventes.coupons.form_achat_min": "Achat min. (DA)",
  "admin.ventes.coupons.form_limite_usage": "Limite d'usage",
  "admin.ventes.coupons.form_expiration": "Date d'expiration",
  "admin.ventes.coupons.form_actif": "Actif",
  "admin.ventes.coupons.form_enregistrement": "Enregistrement…",
  "admin.ventes.coupons.form_creer": "Créer",
  // Validation
  "admin.ventes.coupons.err_code_court": "Code trop court",
  "admin.ventes.coupons.err_code_format": "Lettres majuscules, chiffres, - _",
  "admin.ventes.coupons.err_date": "Date requise",
  // Suppression
  "admin.ventes.coupons.supprimer_confirm": "Supprimer le coupon {code} ?",
  "admin.ventes.coupons.toast_cree": "Coupon créé",
  "admin.ventes.coupons.toast_modifie": "Coupon modifié",
  "admin.ventes.coupons.toast_supprime": "Coupon supprimé",
  "admin.ventes.coupons.garde_creer": "Créer le coupon",
  "admin.ventes.coupons.garde_modifier": "Modifier le coupon",
  "admin.ventes.coupons.garde_supprimer": "Supprimer le coupon",

  // ── Reviews (avis) ────────────────────────────────────────────────────────
  "admin.ventes.avis.titre": "Avis",
  "admin.ventes.avis.description": "{produits} avis produits · {accueil} avis d'accueil.",
  "admin.ventes.avis.chargement": "Chargement…",
  "admin.ventes.avis.onglet_produits": "Avis produits ({n})",
  "admin.ventes.avis.onglet_accueil": "Avis d'accueil ({n})",
  "admin.ventes.avis.filtre_tous": "Tous ({n})",
  "admin.ventes.avis.filtre_pending": "En attente ({n})",
  "admin.ventes.avis.filtre_approuves": "Approuvés ({n})",
  "admin.ventes.avis.filtre_rejetes": "Rejetés ({n})",
  "admin.ventes.avis.meta": "Par {auteur} · sur {produit} · {date}",
  "admin.ventes.avis.approuver": "Approuver",
  "admin.ventes.avis.rejeter": "Rejeter",
  "admin.ventes.avis.toast_approuve": "Approuvé",
  "admin.ventes.avis.toast_rejete": "Rejeté",
  "admin.ventes.avis.toast_supprime": "Supprimé",
  "admin.ventes.avis.toast_enregistre": "Avis enregistré",
  "admin.ventes.avis.vide": "Aucun avis.",
  "admin.ventes.avis.supprimer_titre": "Supprimer « {label} » ?",
  "admin.ventes.avis.supprimer_description": "Cette action est irréversible.",
  "admin.ventes.avis.suppression_en_cours": "Suppression…",
  "admin.ventes.avis.garde_supprimer": "Supprimer l'avis",
  "admin.ventes.avis.garde_approuver": "Approuver l'avis",
  "admin.ventes.avis.garde_rejeter": "Rejeter l'avis",
  // Avis d'accueil
  "admin.ventes.avis.accueil_explication":
    "Ces témoignages sont affichés en page d'accueil, section « Avis de nos clients ».",
  "admin.ventes.avis.accueil_vide":
    "Aucun avis d'accueil. Ajoutez-en ou réinitialisez les données.",
  "admin.ventes.avis.accueil_nouveau": "Nouvel avis d'accueil",
  "admin.ventes.avis.accueil_produit": "Produit : {nom}",
  "admin.ventes.avis.accueil_sans_nom": "Sans nom",
  "admin.ventes.avis.accueil_produit_inconnu": "inconnu",
  "admin.ventes.avis.accueil_form_titre_nouveau": "Nouvel avis",
  "admin.ventes.avis.accueil_form_titre_modifier": "Modifier l'avis",
  "admin.ventes.avis.accueil_form_nom": "Nom",
  "admin.ventes.avis.accueil_form_ville": "Ville",
  "admin.ventes.avis.accueil_form_texte": "Texte",
  "admin.ventes.avis.accueil_form_produit": "Produit",
  "admin.ventes.avis.accueil_form_note": "Note (1-5)",
  "admin.ventes.avis.accueil_form_gradient": "Gradient",
  "admin.ventes.avis.accueil_form_enregistrement": "Enregistrement…",
  "admin.ventes.avis.accueil_err_champs": "Nom et texte requis",
  "admin.ventes.avis.accueil_editer": "Éditer",
  "admin.ventes.avis.accueil_garde_creer": "Créer l'avis d'accueil",
  "admin.ventes.avis.accueil_garde_modifier": "Modifier l'avis d'accueil",
};

export default ventesFr;
