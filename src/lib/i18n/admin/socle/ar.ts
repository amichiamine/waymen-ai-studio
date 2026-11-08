/**
 * Groupe « socle » — dictionnaire ar (arabe).
 *
 * PROPRIÉTAIRE : agent pilote. Arabe standard moderne, vocabulaire de gestion
 * e-commerce. Une valeur recopiée du français est un défaut, pas un repli :
 * `bun run verifier-i18n` l'avertit.
 *
 * Formes plurielles `_autre` : formulées pour rester correctes de 2 à l'infini
 * (le nombre reste en chiffres latins, usage algérien — voir NUMBER_LOCALE dans
 * `src/lib/i18n.tsx`).
 *
 * Convention complète : `src/lib/i18n/admin/index.ts`.
 */
const socleAr: Record<string, string> = {
  // ── المفردات المشتركة ─────────────────────────────────────────────────────
  "admin.socle.commun.chargement": "جارٍ التحميل…",
  "admin.socle.commun.aucune_donnee": "لا توجد بيانات حتى الآن",
  "admin.socle.commun.donnees_indisponibles": "البيانات غير متوفرة.",
  "admin.socle.commun.voir": "عرض",
  "admin.socle.commun.modifier": "تعديل",
  "admin.socle.commun.supprimer": "حذف",
  "admin.socle.commun.enregistrer": "حفظ",
  "admin.socle.commun.actions": "الإجراءات",
  "admin.socle.commun.rechercher": "بحث",

  "admin.socle.confirmation.confirmer": "تأكيد",
  "admin.socle.confirmation.annuler": "إلغاء",

  "admin.socle.roles.owner": "المالك",
  "admin.socle.roles.admin": "مدير",
  "admin.socle.roles.editor": "محرِّر",
  "admin.socle.roles.viewer": "مُشاهد",

  // ── الشريط الجانبي والتنقل ومسار التصفح ───────────────────────────────────
  "admin.socle.navigation.badge": "الإدارة",
  "admin.socle.navigation.ouvrir_menu": "فتح قائمة الإدارة",
  "admin.socle.navigation.fil_ariane": "مسار التصفح",
  "admin.socle.navigation.racine": "الإدارة",
  "admin.socle.navigation.accueil_admin": "الصفحة الرئيسية للإدارة",

  "admin.socle.navigation.section_apercu": "نظرة عامة",
  "admin.socle.navigation.section_catalogue": "الكتالوج",
  "admin.socle.navigation.section_ventes": "المبيعات",
  "admin.socle.navigation.section_relation": "علاقات العملاء",
  "admin.socle.navigation.section_contenu": "المحتوى",
  "admin.socle.navigation.section_systeme": "النظام",

  "admin.socle.navigation.lien_tableau": "لوحة التحكم",
  "admin.socle.navigation.lien_analytique": "التحليلات",
  "admin.socle.navigation.lien_rapports": "التقارير",
  "admin.socle.navigation.lien_produits": "المنتجات",
  "admin.socle.navigation.lien_categories": "الفئات",
  "admin.socle.navigation.lien_marques": "الماركات",
  "admin.socle.navigation.lien_stock": "المخزون",
  "admin.socle.navigation.lien_medias": "الوسائط",
  "admin.socle.navigation.lien_commandes": "الطلبات",
  "admin.socle.navigation.lien_clients": "العملاء",
  "admin.socle.navigation.lien_coupons": "قسائم الخصم",
  "admin.socle.navigation.lien_livraison": "التوصيل",
  "admin.socle.navigation.lien_paiements": "المدفوعات",
  "admin.socle.navigation.lien_messages": "رسائل التواصل",
  "admin.socle.navigation.lien_newsletter": "النشرة البريدية",
  "admin.socle.navigation.lien_pages": "الصفحات والقوائم",
  "admin.socle.navigation.lien_contenu": "محتوى الموقع",
  "admin.socle.navigation.lien_blog": "المدونة",
  "admin.socle.navigation.lien_avis": "التقييمات",
  "admin.socle.navigation.lien_utilisateurs": "المستخدمون والأدوار",
  "admin.socle.navigation.lien_notifications": "الإشعارات",
  "admin.socle.navigation.lien_audit": "سجل التدقيق",
  "admin.socle.navigation.lien_parametres": "الإعدادات",
  "admin.socle.navigation.lien_reinitialiser": "إعادة التعيين",
  "admin.socle.navigation.lien_developpeur": "المطوّر",

  // ── الترويسة: محاكاة الدور، الإشعارات، قائمة المستخدم ─────────────────────
  "admin.socle.entete.simuler_role": "محاكاة دور",
  "admin.socle.entete.role_reel": "(الفعلي: {role})",
  "admin.socle.entete.simuler_infobulle":
    "أداة تطوير: تسمح فقط بتخفيض دورك الخاص من أجل اختبار الواجهة.",

  "admin.socle.entete.notifications": "الإشعارات",
  "admin.socle.entete.tout_lu": "تحديد الكل كمقروء",
  "admin.socle.entete.aucune_notification": "لا توجد إشعارات.",
  "admin.socle.entete.marquer_lu": "تحديد كمقروء",
  "admin.socle.entete.toutes_notifications": "كل الإشعارات",
  "admin.socle.entete.non_lues_un": "إشعار واحد غير مقروء",
  "admin.socle.entete.non_lues_autre": "عدد الإشعارات غير المقروءة: {n}",

  "admin.socle.entete.menu_utilisateur": "قائمة المستخدم",
  "admin.socle.entete.compte": "الحساب",
  "admin.socle.entete.role": "الدور:",
  "admin.socle.entete.role_simule": "دور محاكى:",
  "admin.socle.entete.role_separateur_reel": "— الفعلي:",
  "admin.socle.entete.retour_boutique": "العودة إلى المتجر",
  "admin.socle.entete.deconnexion": "تسجيل الخروج",

  // ── لوحة التحكم ───────────────────────────────────────────────────────────
  "admin.socle.tableau.titre": "لوحة التحكم",
  "admin.socle.tableau.description": "نظرة عامة على المتجر (بيانات محلية).",
  "admin.socle.tableau.kpi_produits": "المنتجات",
  "admin.socle.tableau.kpi_categories": "الفئات",
  "admin.socle.tableau.kpi_marques": "الماركات",
  "admin.socle.tableau.kpi_valeur_catalogue": "قيمة الكتالوج",
  "admin.socle.tableau.kpi_chiffre_affaires": "رقم الأعمال",
  "admin.socle.tableau.kpi_commandes_attente": "الطلبات المعلّقة",
  "admin.socle.tableau.kpi_clients": "العملاء",
  "admin.socle.tableau.kpi_avis_moderer": "تقييمات في انتظار المراجعة",
  "admin.socle.tableau.kpi_coupons_actifs": "قسائم نشطة",
  "admin.socle.tableau.kpi_stock_faible": "مخزون منخفض",
  "admin.socle.tableau.kpi_en_stock": "متوفر في المخزون",
  "admin.socle.tableau.kpi_bestsellers": "الأكثر مبيعًا",
  "admin.socle.tableau.ca_30_jours": "رقم الأعمال — آخر 30 يومًا",
  "admin.socle.tableau.produits_par_categorie": "المنتجات حسب الفئة",
  "admin.socle.tableau.dernieres_commandes": "أحدث الطلبات",
  "admin.socle.tableau.aucune_commande": "لا توجد طلبات.",

  // ── المنتجات — الصفحة المرجعية ────────────────────────────────────────────
  "admin.socle.produits.titre": "المنتجات",
  "admin.socle.produits.description_un": "منتج واحد في الكتالوج المحلي.",
  "admin.socle.produits.description_autre": "عدد المنتجات في الكتالوج المحلي: {n}.",
  "admin.socle.produits.configs_un": "تجميعة عميل واحدة (غير معروضة في المتجر).",
  "admin.socle.produits.configs_autre": "عدد تجميعات العملاء (غير معروضة في المتجر): {n}.",
  "admin.socle.produits.nouveau": "منتج جديد",
  "admin.socle.produits.garde_supprimer": "حذف المنتج",
  "admin.socle.produits.recherche_placeholder": "البحث (الاسم، الماركة، المعرّف)…",
  "admin.socle.produits.toutes_categories": "كل الفئات",
  "admin.socle.produits.col_image": "الصورة",
  "admin.socle.produits.col_produit": "المنتج",
  "admin.socle.produits.col_marque": "الماركة",
  "admin.socle.produits.col_categorie": "الفئة",
  "admin.socle.produits.col_prix": "السعر",
  "admin.socle.produits.col_stock": "المخزون",
  "admin.socle.produits.stock_in": "متوفر",
  "admin.socle.produits.stock_low": "مخزون منخفض",
  "admin.socle.produits.stock_out": "غير متوفر",
  "admin.socle.produits.badge_config": "تجميعة عميل",
  "admin.socle.produits.voir_public": "عرض الصفحة العامة",
  "admin.socle.produits.vide_aucun_resultat": "لا يوجد منتج مطابق للمرشّحات.",
  "admin.socle.produits.supprimer_titre": "حذف هذا المنتج؟",
  "admin.socle.produits.supprimer_description":
    "سيُحذف المنتج «{nom}» من الكتالوج المحلي. لا يمكن الرجوع عن هذا الإجراء.",
  "admin.socle.produits.suppression_en_cours": "جارٍ الحذف…",
  "admin.socle.produits.toast_supprime": "تم حذف «{nom}»",
  "admin.socle.archisys.badge": "منصة StacGate • نواة معمارية رائدة",
  "admin.socle.archisys.desc":
    "تصميم وإدارة الهندسة المعمارية والبحث والتطوير معتمدة من طرف {auteur}",
  "admin.socle.archisys.noyau_valide": "نواة معتمدة",
  "admin.socle.archisys.alt": "ختم الهندسة المعمارية ArchiSys3.0",
};

export default socleAr;
