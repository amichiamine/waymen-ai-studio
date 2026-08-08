/**
 * Groupe « ventes » — dictionnaire ar (arabe).
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
 * Arabe standard moderne, vocabulaire de gestion e-commerce.
 * Formes plurielles `_autre` : formulées pour rester correctes de 2 à l'infini.
 *
 * Les trois langues doivent porter EXACTEMENT les mêmes clés :
 * `bun run verifier-i18n` échoue sinon.
 */
const ventesAr: Record<string, string> = {
  // ── حالات الطلب — مشتركة بين الطلبات والعملاء ──────────────────────────
  "admin.ventes.commun.statut_pending": "قيد الانتظار",
  "admin.ventes.commun.statut_processing": "قيد المعالجة",
  "admin.ventes.commun.statut_shipped": "تم الشحن",
  "admin.ventes.commun.statut_delivered": "تم التسليم",
  "admin.ventes.commun.statut_cancelled": "ملغى",

  // ── حالات التقييم ─────────────────────────────────────────────────────────
  "admin.ventes.commun.avis_pending": "قيد الانتظار",
  "admin.ventes.commun.avis_approved": "معتمد",
  "admin.ventes.commun.avis_rejected": "مرفوض",

  // ── الطلبات (قائمة الطلبات) ───────────────────────────────────────────────
  "admin.ventes.commandes.titre": "الطلبات",
  "admin.ventes.commandes.description_un": "طلب واحد مسجّل.",
  "admin.ventes.commandes.description_autre": "عدد الطلبات المسجّلة: {n}.",
  "admin.ventes.commandes.chargement": "جارٍ تحميل الطلبات…",
  "admin.ventes.commandes.recherche_placeholder": "بحث (رقم الطلب، العميل، الولاية)…",
  "admin.ventes.commandes.onglet_toutes": "الكل ({n})",
  "admin.ventes.commandes.onglet_pending": "قيد الانتظار ({n})",
  "admin.ventes.commandes.onglet_processing": "قيد المعالجة ({n})",
  "admin.ventes.commandes.onglet_shipped": "مشحونة ({n})",
  "admin.ventes.commandes.onglet_delivered": "مسلّمة ({n})",
  "admin.ventes.commandes.onglet_cancelled": "ملغاة ({n})",
  "admin.ventes.commandes.col_numero": "الرقم",
  "admin.ventes.commandes.col_client": "العميل",
  "admin.ventes.commandes.col_wilaya": "الولاية",
  "admin.ventes.commandes.col_date": "التاريخ",
  "admin.ventes.commandes.col_total": "الإجمالي",
  "admin.ventes.commandes.col_statut": "الحالة",
  "admin.ventes.commandes.voir_commande": "عرض الطلب",
  "admin.ventes.commandes.vide": "لا توجد طلبات.",

  // ── تفاصيل الطلب ──────────────────────────────────────────────────────────
  "admin.ventes.detail.titre": "الطلب {id}",
  "admin.ventes.detail.description": "تاريخ الطلب: {date}",
  "admin.ventes.detail.retour": "رجوع",
  "admin.ventes.detail.chargement": "جارٍ تحميل الطلب…",
  "admin.ventes.detail.introuvable": "الطلب غير موجود.",
  "admin.ventes.detail.section_articles": "المنتجات",
  "admin.ventes.detail.qte": "الكمية: {qty} × {prix}",
  "admin.ventes.detail.sous_total": "المجموع الجزئي",
  "admin.ventes.detail.remise": "الخصم {coupon}",
  "admin.ventes.detail.livraison": "التوصيل",
  "admin.ventes.detail.livraison_gratuite": "مجاني",
  "admin.ventes.detail.total": "الإجمالي",
  "admin.ventes.detail.section_suivi": "سجل الحالة",
  "admin.ventes.detail.note_client": "ملاحظة العميل",
  "admin.ventes.detail.section_changer_statut": "تغيير الحالة",
  "admin.ventes.detail.mise_a_jour_en_cours": "جارٍ التحديث…",
  "admin.ventes.detail.toast_statut_maj": "تم تحديث الحالة",
  "admin.ventes.detail.garde_changer_statut": "تغيير حالة الطلب",
  "admin.ventes.detail.section_client": "العميل",
  "admin.ventes.detail.voir_client": "عرض العميل",
  "admin.ventes.detail.section_livraison": "التوصيل والدفع",
  "admin.ventes.detail.adresse": "العنوان:",
  "admin.ventes.detail.wilaya": "الولاية:",
  "admin.ventes.detail.type_livraison": "النوع:",
  "admin.ventes.detail.livraison_domicile": "توصيل للمنزل",
  "admin.ventes.detail.livraison_bureau": "توصيل للمكتب",
  "admin.ventes.detail.telephone": "الهاتف:",
  "admin.ventes.detail.paiement": "الدفع:",

  // ── العملاء ───────────────────────────────────────────────────────────────
  "admin.ventes.clients.titre": "العملاء",
  "admin.ventes.clients.description_un": "عميل واحد مسجّل — الإحصائيات مستخرجة من الطلبات.",
  "admin.ventes.clients.description_autre":
    "عدد العملاء المسجّلين: {n} — الإحصائيات مستخرجة من الطلبات.",
  "admin.ventes.clients.nouveau": "عميل جديد",
  "admin.ventes.clients.chargement": "جارٍ تحميل العملاء…",
  "admin.ventes.clients.recherche_placeholder": "بحث (الاسم، البريد، الولاية، الهاتف)…",
  "admin.ventes.clients.col_nom": "الاسم",
  "admin.ventes.clients.col_email": "البريد الإلكتروني",
  "admin.ventes.clients.col_telephone": "الهاتف",
  "admin.ventes.clients.col_wilaya": "الولاية",
  "admin.ventes.clients.col_commandes": "الطلبات",
  "admin.ventes.clients.col_depense": "المنفق (LTV)",
  "admin.ventes.clients.col_derniere_commande": "آخر طلب",
  "admin.ventes.clients.details": "التفاصيل",
  "admin.ventes.clients.vide_recherche": "لا يوجد عميل مطابق للبحث.",
  "admin.ventes.clients.vide_aucun": "لا يوجد عملاء مسجّلون. أنشئ أول عميل باستخدام الزر أعلاه.",
  "admin.ventes.clients.historique_commandes": "سجل الطلبات",
  "admin.ventes.clients.aucune_commande": "لا توجد طلبات.",
  "admin.ventes.clients.ouvrir_commande": "فتح",
  "admin.ventes.clients.inscrit_le": "مسجّل بتاريخ {date}",
  "admin.ventes.clients.kpi_ltv": "LTV",
  "admin.ventes.clients.kpi_commandes": "الطلبات",
  "admin.ventes.clients.kpi_panier_moyen": "متوسط السلة",
  "admin.ventes.clients.kpi_derniere": "الأخير",
  // نموذج العميل
  "admin.ventes.clients.form_titre_nouveau": "عميل جديد",
  "admin.ventes.clients.form_titre_modifier": "تعديل العميل",
  "admin.ventes.clients.form_nom": "الاسم الكامل",
  "admin.ventes.clients.form_nom_placeholder": "الاسم الأول واللقب",
  "admin.ventes.clients.form_email": "البريد الإلكتروني",
  "admin.ventes.clients.form_email_placeholder": "client@example.dz",
  "admin.ventes.clients.form_telephone": "الهاتف",
  "admin.ventes.clients.form_telephone_placeholder": "0XXXXXXXXX",
  "admin.ventes.clients.form_wilaya": "الولاية",
  "admin.ventes.clients.form_wilaya_placeholder": "اختر ولاية…",
  "admin.ventes.clients.form_enregistrement": "جارٍ الحفظ…",
  // التحقق من الصحة
  "admin.ventes.clients.err_nom": "الاسم مطلوب (2 أحرف على الأقل)",
  "admin.ventes.clients.err_email": "البريد الإلكتروني غير صالح",
  "admin.ventes.clients.err_email_duplique": "عنوان البريد مستخدم من قِبل عميل آخر",
  "admin.ventes.clients.err_telephone": "الهاتف غير صالح (الصيغة: 0XXXXXXXXX)",
  "admin.ventes.clients.err_wilaya": "الولاية مطلوبة",
  // الحذف
  "admin.ventes.clients.supprimer_titre": "حذف هذا العميل؟",
  "admin.ventes.clients.supprimer_description":
    "سيُحذف العميل {nom} ({email}) نهائيًا. لا يمكن الرجوع عن هذا الإجراء.",
  "admin.ventes.clients.supprimer_bloque_un":
    "غير ممكن: العميل {nom} مرتبط بطلب نشط واحد. أغلق هذا الطلب أو ألغِه من /admin/orders قبل حذف هذا العميل.",
  "admin.ventes.clients.supprimer_bloque_autre":
    "غير ممكن: العميل {nom} مرتبط بعدد {n} من الطلبات النشطة. أغلق الطلبات أو ألغِها من /admin/orders قبل حذف هذا العميل.",
  "admin.ventes.clients.toast_cree": "تم إنشاء العميل «{nom}»",
  "admin.ventes.clients.toast_modifie": "تم تحديث «{nom}»",
  "admin.ventes.clients.toast_supprime": "تم حذف العميل «{nom}»",
  "admin.ventes.clients.garde_modifier": "تعديل العميل",
  "admin.ventes.clients.garde_creer": "إنشاء عميل",
  "admin.ventes.clients.garde_supprimer": "حذف العميل",

  // ── قسائم الخصم ──────────────────────────────────────────────────────────
  "admin.ventes.coupons.titre": "قسائم الخصم",
  "admin.ventes.coupons.description_un": "رمز ترويجي واحد (نشط ومؤرشف).",
  "admin.ventes.coupons.description_autre": "عدد الرموز الترويجية (نشطة ومؤرشفة): {n}.",
  "admin.ventes.coupons.nouveau": "قسيمة جديدة",
  "admin.ventes.coupons.chargement": "جارٍ تحميل القسائم…",
  "admin.ventes.coupons.col_code": "الرمز",
  "admin.ventes.coupons.col_remise": "الخصم",
  "admin.ventes.coupons.col_achat_min": "الحد الأدنى للشراء",
  "admin.ventes.coupons.col_usage": "الاستخدام",
  "admin.ventes.coupons.col_expire": "تاريخ الانتهاء",
  "admin.ventes.coupons.col_statut": "الحالة",
  "admin.ventes.coupons.statut_actif": "نشطة",
  "admin.ventes.coupons.statut_expire": "منتهية الصلاحية",
  "admin.ventes.coupons.statut_desactive": "معطّلة",
  "admin.ventes.coupons.vide": "لا توجد قسائم.",
  "admin.ventes.coupons.copie": "تم نسخ {code}",
  // نموذج القسيمة
  "admin.ventes.coupons.form_titre_nouveau": "قسيمة جديدة",
  "admin.ventes.coupons.form_titre_modifier": "تعديل القسيمة",
  "admin.ventes.coupons.form_code": "الرمز",
  "admin.ventes.coupons.form_code_placeholder": "BIENVENUE10",
  "admin.ventes.coupons.form_type": "النوع",
  "admin.ventes.coupons.form_type_percent": "نسبة مئوية",
  "admin.ventes.coupons.form_type_fixed": "مبلغ ثابت (دج)",
  "admin.ventes.coupons.form_valeur": "القيمة",
  "admin.ventes.coupons.form_achat_min": "الحد الأدنى للشراء (دج)",
  "admin.ventes.coupons.form_limite_usage": "حد الاستخدام",
  "admin.ventes.coupons.form_expiration": "تاريخ الانتهاء",
  "admin.ventes.coupons.form_actif": "نشطة",
  "admin.ventes.coupons.form_enregistrement": "جارٍ الحفظ…",
  "admin.ventes.coupons.form_creer": "إنشاء",
  // التحقق
  "admin.ventes.coupons.err_code_court": "الرمز قصير جدًا",
  "admin.ventes.coupons.err_code_format": "أحرف كبيرة وأرقام وعلامتا - _",
  "admin.ventes.coupons.err_date": "التاريخ مطلوب",
  // الحذف
  "admin.ventes.coupons.supprimer_confirm": "حذف القسيمة {code}؟",
  "admin.ventes.coupons.toast_cree": "تم إنشاء القسيمة",
  "admin.ventes.coupons.toast_modifie": "تم تعديل القسيمة",
  "admin.ventes.coupons.toast_supprime": "تم حذف القسيمة",
  "admin.ventes.coupons.garde_creer": "إنشاء قسيمة",
  "admin.ventes.coupons.garde_modifier": "تعديل القسيمة",
  "admin.ventes.coupons.garde_supprimer": "حذف القسيمة",

  // ── التقييمات ─────────────────────────────────────────────────────────────
  "admin.ventes.avis.titre": "التقييمات",
  "admin.ventes.avis.description":
    "{produits} تقييمات المنتجات · {accueil} تقييمات الصفحة الرئيسية.",
  "admin.ventes.avis.chargement": "جارٍ التحميل…",
  "admin.ventes.avis.onglet_produits": "تقييمات المنتجات ({n})",
  "admin.ventes.avis.onglet_accueil": "تقييمات الصفحة الرئيسية ({n})",
  "admin.ventes.avis.filtre_tous": "الكل ({n})",
  "admin.ventes.avis.filtre_pending": "قيد الانتظار ({n})",
  "admin.ventes.avis.filtre_approuves": "معتمدة ({n})",
  "admin.ventes.avis.filtre_rejetes": "مرفوضة ({n})",
  "admin.ventes.avis.meta": "بقلم {auteur} · على {produit} · {date}",
  "admin.ventes.avis.approuver": "اعتماد",
  "admin.ventes.avis.rejeter": "رفض",
  "admin.ventes.avis.toast_approuve": "تم الاعتماد",
  "admin.ventes.avis.toast_rejete": "تم الرفض",
  "admin.ventes.avis.toast_supprime": "تم الحذف",
  "admin.ventes.avis.toast_enregistre": "تم حفظ التقييم",
  "admin.ventes.avis.vide": "لا توجد تقييمات.",
  "admin.ventes.avis.supprimer_titre": "حذف «{label}»؟",
  "admin.ventes.avis.supprimer_description": "لا يمكن الرجوع عن هذا الإجراء.",
  "admin.ventes.avis.suppression_en_cours": "جارٍ الحذف…",
  "admin.ventes.avis.garde_supprimer": "حذف التقييم",
  "admin.ventes.avis.garde_approuver": "اعتماد التقييم",
  "admin.ventes.avis.garde_rejeter": "رفض التقييم",
  // تقييمات الصفحة الرئيسية
  "admin.ventes.avis.accueil_explication":
    "تُعرض هذه الشهادات في الصفحة الرئيسية ضمن قسم «آراء عملائنا».",
  "admin.ventes.avis.accueil_vide":
    "لا توجد تقييمات للصفحة الرئيسية. أضف تقييمات أو أعِد تعيين البيانات.",
  "admin.ventes.avis.accueil_nouveau": "تقييم جديد للصفحة الرئيسية",
  "admin.ventes.avis.accueil_produit": "المنتج: {nom}",
  "admin.ventes.avis.accueil_sans_nom": "بدون اسم",
  "admin.ventes.avis.accueil_produit_inconnu": "غير معروف",
  "admin.ventes.avis.accueil_form_titre_nouveau": "تقييم جديد",
  "admin.ventes.avis.accueil_form_titre_modifier": "تعديل التقييم",
  "admin.ventes.avis.accueil_form_nom": "الاسم",
  "admin.ventes.avis.accueil_form_ville": "المدينة",
  "admin.ventes.avis.accueil_form_texte": "النص",
  "admin.ventes.avis.accueil_form_produit": "المنتج",
  "admin.ventes.avis.accueil_form_note": "التقييم (1-5)",
  "admin.ventes.avis.accueil_form_gradient": "التدرج اللوني",
  "admin.ventes.avis.accueil_form_enregistrement": "جارٍ الحفظ…",
  "admin.ventes.avis.accueil_err_champs": "الاسم والنص مطلوبان",
  "admin.ventes.avis.accueil_editer": "تعديل",
  "admin.ventes.avis.accueil_garde_creer": "إنشاء تقييم للصفحة الرئيسية",
  "admin.ventes.avis.accueil_garde_modifier": "تعديل تقييم الصفحة الرئيسية",
};

export default ventesAr;
