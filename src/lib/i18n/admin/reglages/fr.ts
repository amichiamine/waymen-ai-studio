/**
 * Groupe « reglages » — dictionnaire fr (français).
 *
 * PROPRIÉTAIRE : l'agent de réplication chargé du groupe « reglages ». Aucun autre
 * agent n'écrit dans ce fichier ; en échange, cet agent n'écrit dans aucun
 * autre — c'est ce qui permet à cinq agents de travailler en parallèle sans
 * conflit de fusion.
 *
 * Écrans couverts : Settings, Users, Shipping, Payments.
 *
 * Seul préfixe autorisé ici : `admin.reglages.<page>.<cle>`.
 * Convention obligatoire (nommage, pluriels, RTL, qualité de l'arabe) :
 * `src/lib/i18n/admin/index.ts`. Vocabulaire partagé déjà traduit, à réutiliser
 * plutôt qu'à recopier : `admin.socle.commun.*`, `admin.socle.confirmation.*`,
 * `admin.socle.roles.*`.
 *
 * Les trois langues doivent porter EXACTEMENT les mêmes clés :
 * `bun run verifier-i18n` échoue sinon.
 */
const reglagesFr: Record<string, string> = {
  // ── Paiements ──────────────────────────────────────────────────────────────
  "admin.reglages.paiements.titre": "Paiements",
  "admin.reglages.paiements.description": "Modes de paiement proposés au checkout.",
  "admin.reglages.paiements.nouveau_moyen": "Nouveau moyen",
  "admin.reglages.paiements.chargement": "Chargement des modes de paiement…",
  "admin.reglages.paiements.vide_aucun": "Aucun moyen de paiement.",
  "admin.reglages.paiements.badge_actif": "Actif",
  "admin.reglages.paiements.badge_inactif": "Inactif",
  "admin.reglages.paiements.label_actif": "Actif",
  "admin.reglages.paiements.dialog_nouveau_titre": "Nouveau moyen de paiement",
  "admin.reglages.paiements.dialog_modifier_titre": "Modifier le moyen de paiement",
  "admin.reglages.paiements.champ_libelle": "Libellé",
  "admin.reglages.paiements.champ_libelle_placeholder": "Paiement à la livraison",
  "admin.reglages.paiements.champ_id": "Identifiant (ID)",
  "admin.reglages.paiements.champ_instructions": "Instructions (affichées au client)",
  "admin.reglages.paiements.btn_creer": "Créer",
  "admin.reglages.paiements.btn_enregistrement": "Enregistrement…",
  "admin.reglages.paiements.toast_ajoute": "Moyen de paiement ajouté",
  "admin.reglages.paiements.toast_mis_a_jour": "Moyen de paiement mis à jour",
  "admin.reglages.paiements.toast_supprime": "Supprimé",
  "admin.reglages.paiements.toast_libelle_requis": "Libellé requis",
  "admin.reglages.paiements.toast_id_existe": "Un moyen de paiement avec cet ID existe déjà",
  "admin.reglages.paiements.confirm_supprimer": "Supprimer ce moyen de paiement ?",
  "admin.reglages.paiements.garde_ajouter": "Ajouter un moyen de paiement",
  "admin.reglages.paiements.garde_modifier": "Modifier le moyen de paiement",
  "admin.reglages.paiements.garde_supprimer": "Supprimer le moyen de paiement",
  "admin.reglages.paiements.garde_toggle": "Activer / désactiver le moyen de paiement",

  // ── Utilisateurs ───────────────────────────────────────────────────────────
  "admin.reglages.utilisateurs.titre": "Utilisateurs & rôles",
  "admin.reglages.utilisateurs.description_un": "{n} membre de l'équipe.",
  "admin.reglages.utilisateurs.description_autre": "{n} membres de l'équipe.",
  "admin.reglages.utilisateurs.inviter": "Inviter",
  "admin.reglages.utilisateurs.chargement": "Chargement…",
  "admin.reglages.utilisateurs.vide_aucun": "Aucun utilisateur.",
  "admin.reglages.utilisateurs.col_nom": "Nom",
  "admin.reglages.utilisateurs.col_email": "Email",
  "admin.reglages.utilisateurs.col_role": "Rôle",
  "admin.reglages.utilisateurs.col_derniere_connexion": "Dernière connexion",
  "admin.reglages.utilisateurs.col_statut": "Statut",
  "admin.reglages.utilisateurs.badge_actif": "Actif",
  "admin.reglages.utilisateurs.badge_desactive": "Désactivé",
  "admin.reglages.utilisateurs.dialog_inviter_titre": "Inviter un membre",
  "admin.reglages.utilisateurs.dialog_modifier_titre": "Modifier l'utilisateur",
  "admin.reglages.utilisateurs.champ_nom": "Nom",
  "admin.reglages.utilisateurs.champ_email": "Email",
  "admin.reglages.utilisateurs.champ_role": "Rôle",
  "admin.reglages.utilisateurs.champ_actif": "Actif",
  "admin.reglages.utilisateurs.champ_mdp": "Mot de passe",
  "admin.reglages.utilisateurs.champ_mdp_modifier":
    "Nouveau mot de passe (laisser vide pour conserver)",
  "admin.reglages.utilisateurs.champ_mdp_placeholder": "10 caractères minimum",
  "admin.reglages.utilisateurs.champ_mdp_placeholder_modifier": "••••••••••",
  "admin.reglages.utilisateurs.toast_invite": "Utilisateur invité",
  "admin.reglages.utilisateurs.toast_mis_a_jour": "Utilisateur mis à jour",
  "admin.reglages.utilisateurs.toast_supprime": "Utilisateur supprimé",
  "admin.reglages.utilisateurs.toast_impossible_supprimer_owner":
    "Impossible de supprimer le propriétaire.",
  "admin.reglages.utilisateurs.confirm_supprimer": "Supprimer {nom} ?",
  "admin.reglages.utilisateurs.validation_email_utilise": "Email déjà utilisé",
  "admin.reglages.utilisateurs.validation_mdp_requis":
    "Mot de passe (10 caractères min.) requis pour un nouveau compte",
  "admin.reglages.utilisateurs.validation_mdp_court": "10 caractères minimum",
  "admin.reglages.utilisateurs.garde_enregistrer": "Enregistrer l'utilisateur",
  "admin.reglages.utilisateurs.garde_supprimer": "Supprimer l'utilisateur",

  // ── Livraison ──────────────────────────────────────────────────────────────
  "admin.reglages.livraison.titre": "Livraison",
  "admin.reglages.livraison.description": "Tarifs par wilaya et règles de livraison.",
  "admin.reglages.livraison.ajouter_tarif": "Ajouter un tarif",
  "admin.reglages.livraison.chargement_reglages": "Chargement des réglages de livraison…",
  "admin.reglages.livraison.chargement_tarifs": "Chargement des tarifs…",
  "admin.reglages.livraison.carte_franco_titre": "Franco de port",
  "admin.reglages.livraison.carte_franco_label": "Livraison offerte à partir de (DA)",
  "admin.reglages.livraison.carte_franco_aide": "Mettre 0 pour désactiver la livraison offerte.",
  "admin.reglages.livraison.carte_domicile_titre": "Livraison à domicile",
  "admin.reglages.livraison.carte_domicile_label": "Activée",
  "admin.reglages.livraison.carte_bureau_titre": "Retrait bureau",
  "admin.reglages.livraison.carte_bureau_label": "Activé",
  "admin.reglages.livraison.recherche_placeholder": "Rechercher une wilaya…",
  "admin.reglages.livraison.col_code": "Code",
  "admin.reglages.livraison.col_wilaya": "Wilaya",
  "admin.reglages.livraison.col_domicile": "Domicile",
  "admin.reglages.livraison.col_bureau": "Bureau",
  "admin.reglages.livraison.badge_defaut": "défaut",
  "admin.reglages.livraison.vide_aucun": "Aucun tarif.",
  "admin.reglages.livraison.dialog_nouveau_titre": "Nouveau tarif",
  "admin.reglages.livraison.dialog_modifier_titre": "Modifier le tarif",
  "admin.reglages.livraison.champ_wilaya": "Wilaya",
  "admin.reglages.livraison.champ_wilaya_placeholder": "Choisir une wilaya",
  "admin.reglages.livraison.champ_domicile": "Domicile (DA)",
  "admin.reglages.livraison.champ_bureau": "Bureau (DA)",
  "admin.reglages.livraison.btn_creer": "Créer",
  "admin.reglages.livraison.btn_enregistrement": "Enregistrement…",
  "admin.reglages.livraison.wilaya_defaut_label": "Par défaut (toutes)",
  "admin.reglages.livraison.toast_tarif_ajoute": "Tarif ajouté",
  "admin.reglages.livraison.toast_tarif_mis_a_jour": "Tarif mis à jour",
  "admin.reglages.livraison.toast_tarif_supprime": "Tarif supprimé",
  "admin.reglages.livraison.toast_wilaya_requise": "Choisissez une wilaya",
  "admin.reglages.livraison.toast_regle_existe": "Une règle existe déjà pour cette wilaya",
  "admin.reglages.livraison.toast_tarifs_invalides": "Tarifs invalides",
  "admin.reglages.livraison.toast_defaut_non_supprimable":
    "Le tarif par défaut ne peut pas être supprimé",
  "admin.reglages.livraison.confirm_supprimer": "Supprimer le tarif pour {wilaya} ?",
  "admin.reglages.livraison.aria_modifier": "Modifier",
  "admin.reglages.livraison.aria_supprimer": "Supprimer",
  "admin.reglages.livraison.garde_ajouter": "Ajouter un tarif",
  "admin.reglages.livraison.garde_modifier": "Modifier le tarif",
  "admin.reglages.livraison.garde_supprimer": "Supprimer le tarif",
  "admin.reglages.livraison.garde_franco": "Modifier le franco de port",
  "admin.reglages.livraison.garde_domicile": "Activer / désactiver la livraison à domicile",
  "admin.reglages.livraison.garde_bureau": "Activer / désactiver le retrait bureau",

  // ── Paramètres ─────────────────────────────────────────────────────────────
  "admin.reglages.parametres.titre": "Paramètres",
  "admin.reglages.parametres.description":
    "Configuration générale de la boutique et contenu du site.",
  "admin.reglages.parametres.chargement": "Chargement…",
  "admin.reglages.parametres.carte_boutique_titre": "Boutique",
  "admin.reglages.parametres.champ_nom": "Nom",
  "admin.reglages.parametres.champ_email_contact": "E-mail de contact",
  "admin.reglages.parametres.champ_telephone": "Téléphone",
  "admin.reglages.parametres.champ_whatsapp": "WhatsApp (chiffres seulement)",
  "admin.reglages.parametres.champ_whatsapp_aide": "Utilisé pour les liens wa.me sur tout le site.",
  "admin.reglages.parametres.champ_adresse": "Adresse",
  "admin.reglages.parametres.champ_adresse_placeholder": "Adresse du siège",
  "admin.reglages.parametres.champ_horaires": "Horaires",
  "admin.reglages.parametres.champ_horaires_placeholder": "Dim → Jeu, 9h – 19h",
  "admin.reglages.parametres.carte_options_titre": "Options",
  "admin.reglages.parametres.carte_theme_titre": "Identité visuelle & thème",
  "admin.reglages.parametres.theme_defaut": "Thème d'affichage par défaut",
  "admin.reglages.parametres.theme_defaut_aide":
    "Thème appliqué immédiatement aux nouveaux visiteurs avant toute préférence personnelle.",
  "admin.reglages.parametres.theme_sombre": "Mode sombre (Recommandé)",
  "admin.reglages.parametres.theme_clair": "Mode clair",
  "admin.reglages.parametres.theme_systeme": "Automatique (selon le système)",
  "admin.reglages.parametres.couleur_primaire": "Couleur d'accentuation principale",
  "admin.reglages.parametres.couleur_primaire_aide":
    "Personnalise les boutons, badges, lueurs et contours sur tout le site.",
  "admin.reglages.parametres.couleur_reinitialiser": "Couleur par défaut",
  "admin.reglages.parametres.favicon_titre": "Favicon du site",
  "admin.reglages.parametres.favicon_aide":
    "Icône affichée dans l'onglet du navigateur (.ico, .png, .svg).",
  "admin.reglages.parametres.favicon_officiel": "Favicon officiel par défaut",
  "admin.reglages.parametres.favicon_personnalise": "Favicon personnalisé",
  "admin.reglages.parametres.favicon_reinitialiser": "Rétablir le favicon officiel par défaut",
  "admin.reglages.parametres.carte_modules_titre": "Activation des modules",
  "admin.reglages.parametres.opt_configurateur": "Activer le configurateur PC sur mesure",
  "admin.reglages.parametres.opt_configurateur_aide":
    "Désactivez ce module pour une boutique généraliste ou de services.",
  "admin.reglages.parametres.opt_notifications_email": "Notifications e-mail",
  "admin.reglages.parametres.opt_selecteur_langue": "Sélecteur de langue (FR / AR / EN)",
  "admin.reglages.parametres.opt_masquer_note": "Masquer la note produit sans avis",
  "admin.reglages.parametres.seuil_stock_faible": "Seuil « stock faible » (≤)",
  "admin.reglages.parametres.seuil_rupture": "Seuil « rupture » (≤)",
  "admin.reglages.parametres.seuils_aide":
    "Les statuts « en stock / faible / rupture » sont recalculés sur toute la vitrine à l'enregistrement.",
  "admin.reglages.parametres.carte_maintenance_titre": "Mode maintenance",
  "admin.reglages.parametres.maintenance_activer": "Activer le mode maintenance",
  "admin.reglages.parametres.maintenance_aide":
    "Bloque l'accès public au site. L'admin et /auth restent accessibles.",
  "admin.reglages.parametres.maintenance_message": "Message affiché",
  "admin.reglages.parametres.carte_bandeau_titre": "Bandeau promotionnel",
  "admin.reglages.parametres.bandeau_afficher": "Afficher le bandeau promo",
  "admin.reglages.parametres.bandeau_message": "Message du bandeau",
  "admin.reglages.parametres.bandeau_libelle_bouton": "Libellé du bouton",
  "admin.reglages.parametres.bandeau_lien_bouton": "Lien du bouton",
  "admin.reglages.parametres.bandeau_aide":
    "Le bandeau réapparaît automatiquement dès qu'on modifie son texte, son libellé ou son lien.",
  "admin.reglages.parametres.carte_devise_titre": "Devise & format des prix",
  "admin.reglages.parametres.devise_symbole": "Symbole",
  "admin.reglages.parametres.devise_position": "Position",
  "admin.reglages.parametres.devise_position_suffixe": "Suffixe (12 000 DA)",
  "admin.reglages.parametres.devise_position_prefixe": "Préfixe (DA 12 000)",
  "admin.reglages.parametres.devise_separateur": "Séparateur de milliers",
  "admin.reglages.parametres.devise_sep_espace": "Espace (12 000)",
  "admin.reglages.parametres.devise_sep_virgule": "Virgule (12,000)",
  "admin.reglages.parametres.devise_sep_point": "Point (12.000)",
  "admin.reglages.parametres.devise_sep_apostrophe": "Apostrophe (12'000)",
  "admin.reglages.parametres.devise_sep_aucun": "Aucun (12000)",
  "admin.reglages.parametres.devise_apercu": "Aperçu :",
  "admin.reglages.parametres.devise_apercu_aide":
    "Enregistrez pour appliquer les changements à tout le site.",
  "admin.reglages.parametres.btn_reinitialiser": "Réinitialiser",
  "admin.reglages.parametres.btn_enregistrer": "Enregistrer",
  "admin.reglages.parametres.btn_enregistrement": "Enregistrement…",
  "admin.reglages.parametres.toast_enregistre": "Paramètres enregistrés",
  "admin.reglages.parametres.toast_reinitialise": "Paramètres réinitialisés",
  "admin.reglages.parametres.toast_email_invalide": "E-mail invalide",
  "admin.reglages.parametres.toast_whatsapp_invalide":
    "WhatsApp : chiffres uniquement (avec l'indicatif pays, ex. 213555000000)",
  "admin.reglages.parametres.garde_enregistrer": "Enregistrer les paramètres",
  "admin.reglages.parametres.garde_reinitialiser": "Réinitialiser les paramètres",
  // Éditeurs JSON
  "admin.reglages.parametres.json_tickers_titre": "Bandeau défilant (messages)",
  "admin.reglages.parametres.json_tickers_description":
    "Liste des messages du ruban en haut de page.",
  "admin.reglages.parametres.json_marques_titre": "Marques défilantes (carrousel)",
  "admin.reglages.parametres.json_marques_description":
    "Liste de noms de marques affichés en défilement horizontal.",
  "admin.reglages.parametres.json_valeurs_titre": "Valeurs — page À propos",
  "admin.reglages.parametres.json_valeurs_description":
    "4 cartes affichées sur /about. icon ∈ shield | truck | headphones | award | star | heart.",
  "admin.reglages.parametres.json_builder_titre": "Étapes du configurateur PC",
  "admin.reglages.parametres.json_builder_description":
    "Composants du builder. icon ∈ case | mb | cpu | ram | ssd | gpu | psu | cool.",
  "admin.reglages.parametres.json_json_invalide": "JSON invalide",
  "admin.reglages.parametres.json_structure_invalide": "Structure invalide",
  "admin.reglages.parametres.json_btn_sauvegarder": "Sauvegarder",
  "admin.reglages.parametres.json_enregistrement": "Enregistrement…",
  "admin.reglages.parametres.json_toast_sauvegarde": "{titre} — sauvegardé",
  "admin.reglages.parametres.json_toast_reinitialise": "{titre} — réinitialisé",
  "admin.reglages.parametres.json_garde_sauvegarder": "Sauvegarder {titre}",
  "admin.reglages.parametres.json_garde_reinitialiser": "Réinitialiser {titre}",

  // ── Notion ─────────────────────────────────────────────────────────────────
  // Tableau de bord permanent
  "admin.reglages.notion.titre": "Notion",
  "admin.reglages.notion.description":
    "Synchronisez vos commandes vers un tableau Notion, pour les suivre et les piloter depuis n'importe quel appareil.",
  "admin.reglages.notion.tableau_bord_titre": "État de la synchronisation",
  "admin.reglages.notion.badge_actif": "Actif",
  "admin.reglages.notion.badge_inactif": "Inactif",
  "admin.reglages.notion.badge_non_configure": "Non configuré",
  "admin.reglages.notion.badge_non_relie": "Token enregistré",
  "admin.reglages.notion.btn_activer": "Activer",
  "admin.reglages.notion.btn_desactiver": "Désactiver",
  "admin.reglages.notion.btn_renvoyer": "Renvoyer",
  "admin.reglages.notion.btn_renvoyer_cours": "Envoi en cours…",
  "admin.reglages.notion.btn_rafraichir": "Rafraîchir",
  "admin.reglages.notion.label_espace": "Espace de travail",
  "admin.reglages.notion.label_base": "Base des commandes",
  "admin.reglages.notion.label_en_attente": "En attente",
  "admin.reglages.notion.label_derniere_verif": "Dernière vérification",
  "admin.reglages.notion.label_derniere_erreur": "Dernière erreur",
  "admin.reglages.notion.lien_ouvrir_notion": "Ouvrir dans Notion",
  "admin.reglages.notion.toast_actif": "Synchronisation Notion activée",
  "admin.reglages.notion.toast_inactif": "Synchronisation Notion désactivée",
  "admin.reglages.notion.toast_renvoyer_ok": "{traitees} commande(s) renvoyée(s)",
  "admin.reglages.notion.toast_renvoyer_echec": "Renvoi échoué : {message}",
  "admin.reglages.notion.toast_renvoyer_reste": "Lot envoyé — des commandes restent en attente.",
  // Bannière accès restreint
  "admin.reglages.notion.acces_restreint_titre": "Accès réservé au propriétaire",
  "admin.reglages.notion.acces_restreint_desc":
    "La configuration de Notion nécessite le rang propriétaire.",
  // Description intro (non configuré)
  "admin.reglages.notion.intro_titre": "Connectez Notion à votre boutique",
  "admin.reglages.notion.intro_desc":
    "Notion vous permet de suivre vos commandes dans un tableau collaboratif, d'y ajouter le transporteur et le numéro de colis, et de piloter les statuts directement depuis votre espace Notion.",
  // Étape 1 — Token
  "admin.reglages.notion.etape1_titre": "Étape 1 — Connexion",
  "admin.reglages.notion.etape1_desc":
    "Créez une connexion interne sur notion.so/my-integrations, copiez le jeton (commence par « ntn_ ») et collez-le ici.",
  "admin.reglages.notion.champ_token_label": "Jeton de connexion Notion",
  "admin.reglages.notion.champ_token_placeholder": "ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "admin.reglages.notion.champ_token_aide":
    "Le jeton est transmis directement au serveur, chiffré, et ne sera jamais réaffiché.",
  "admin.reglages.notion.btn_tester": "Tester et enregistrer",
  "admin.reglages.notion.btn_tester_cours": "Vérification…",
  "admin.reglages.notion.btn_remplacer": "Remplacer la connexion",
  "admin.reglages.notion.connexion_enregistree": "Connexion enregistrée",
  "admin.reglages.notion.connexion_espace": "Connecté à l'espace « {espace} »",
  "admin.reglages.notion.connexion_verifiee_le": "Vérifié le {date}",
  "admin.reglages.notion.token_requis": "Collez le jeton avant de tester.",
  "admin.reglages.notion.toast_token_ok": "Jeton vérifié et enregistré",
  "admin.reglages.notion.toast_token_echec": "{message}",
  // Étape 2 — Pages
  "admin.reglages.notion.etape2_titre": "Étape 2 — Choisir une page",
  "admin.reglages.notion.etape2_desc":
    "Sélectionnez la page Notion sous laquelle créer le tableau des commandes.",
  "admin.reglages.notion.pages_chargement": "Chargement des pages…",
  "admin.reglages.notion.pages_vide_titre": "Aucune page accessible",
  "admin.reglages.notion.pages_vide_marche_suivre":
    "Votre connexion est active, mais aucune page ne lui a encore été partagée. Pour y remédier :",
  "admin.reglages.notion.pages_vide_etape1":
    "Ouvrez la page Notion sous laquelle vous souhaitez créer le tableau.",
  "admin.reglages.notion.pages_vide_etape2":
    "Cliquez sur « ••• » (menu en haut à droite de la page).",
  "admin.reglages.notion.pages_vide_etape3":
    "Choisissez « Connexions », puis ajoutez votre connexion KA Tech Hub.",
  "admin.reglages.notion.pages_vide_etape4": "Revenez ici et cliquez sur « Rafraîchir la liste ».",
  "admin.reglages.notion.btn_rafraichir_pages": "Rafraîchir la liste",
  "admin.reglages.notion.btn_rafraichir_pages_cours": "Actualisation…",
  "admin.reglages.notion.page_selectionnee": "Page choisie",
  "admin.reglages.notion.page_choisir_placeholder": "Choisir une page…",
  "admin.reglages.notion.toast_pages_echec": "Impossible de charger les pages : {message}",
  // Étape 3 — Base
  "admin.reglages.notion.etape3_titre": "Étape 3 — Créer la base",
  "admin.reglages.notion.etape3_desc":
    "Le tableau « Commandes — KA Tech Hub » sera créé dans Notion avec toutes les colonnes nécessaires.",
  "admin.reglages.notion.btn_creer_base": "Créer la base des commandes",
  "admin.reglages.notion.btn_creer_base_cours": "Création…",
  "admin.reglages.notion.base_existante_titre": "Base déjà rattachée",
  "admin.reglages.notion.base_existante_desc": "Nom : {nom}",
  "admin.reglages.notion.rattacher_existante_titre": "Rattacher une base existante",
  "admin.reglages.notion.rattacher_existante_desc":
    "Vous avez déjà un tableau Notion et souhaitez le réutiliser ? Collez son identifiant (databaseId).",
  "admin.reglages.notion.champ_database_id_label": "Identifiant de la base (databaseId)",
  "admin.reglages.notion.champ_database_id_placeholder": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "admin.reglages.notion.btn_rattacher": "Rattacher",
  "admin.reglages.notion.btn_rattacher_cours": "Vérification…",
  "admin.reglages.notion.avertissement_colonnes": "{message}",
  "admin.reglages.notion.toast_base_ok": "Base des commandes créée",
  "admin.reglages.notion.toast_base_echec": "Impossible de créer la base : {message}",
  "admin.reglages.notion.toast_rattachement_ok": "Base rattachée",
  "admin.reglages.notion.toast_rattachement_echec": "Impossible de rattacher la base : {message}",
  // Étape 4 — Webhook
  "admin.reglages.notion.etape4_titre": "Étape 4 — Synchronisation en retour (optionnel)",
  "admin.reglages.notion.etape4_desc":
    "Pour que les changements faits dans Notion (statut, transporteur, numéro de colis) redescendent automatiquement sur la boutique, vous devez configurer un webhook. Copiez l'adresse ci-dessous et collez-la dans le portail Notion sous « Mes connexions → Webhooks ».",
  "admin.reglages.notion.webhook_url_label": "Adresse du webhook",
  "admin.reglages.notion.btn_copier_webhook": "Copier",
  "admin.reglages.notion.btn_copier_webhook_ok": "Copié !",
  "admin.reglages.notion.webhook_verification_titre": "Jeton de vérification",
  "admin.reglages.notion.webhook_verification_desc":
    "Notion vous demande de saisir ce code dans le portail pour confirmer l'abonnement.",
  "admin.reglages.notion.webhook_verification_absent":
    "Le jeton de vérification sera affiché ici dès que Notion aura envoyé sa poignée de main initiale.",
  "admin.reglages.notion.btn_copier_verification": "Copier",
  "admin.reglages.notion.btn_afficher_verification": "Afficher",
  "admin.reglages.notion.btn_masquer_verification": "Masquer",
  "admin.reglages.notion.webhook_verification_avertissement":
    "Ce code est un secret à usage unique. Ne le partagez pas et ne le recopiez que dans le portail Notion.",
  // Erreur backend
  "admin.reglages.notion.erreur_backend_titre": "Service temporairement indisponible",
  "admin.reglages.notion.erreur_backend_desc":
    "Le serveur ne répond pas. Vérifiez votre connexion et actualisez la page.",
  "admin.reglages.notion.btn_reessayer": "Réessayer",
};

export default reglagesFr;
