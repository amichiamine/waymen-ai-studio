/**
 * Groupe « catalogue » — dictionnaire ar (arabe).
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
const catalogueAr: Record<string, string> = {
  // ── حالات المخزون — مشتركة بين عدة صفحات ─────────────────────────────────
  "admin.catalogue.commun.stock_in": "متوفر",
  "admin.catalogue.commun.stock_low": "مخزون منخفض",
  "admin.catalogue.commun.stock_out": "نفذ المخزون",

  // ── ProductForm — منتج جديد / تعديل منتج ─────────────────────────────────
  "admin.catalogue.produit_form.titre_nouveau": "منتج جديد",
  "admin.catalogue.produit_form.titre_modifier": "تعديل المنتج",
  "admin.catalogue.produit_form.description_nouveau": "إنشاء بطاقة منتج.",
  "admin.catalogue.produit_form.description_modifier": "المعرّف: {id}",
  "admin.catalogue.produit_form.retour": "رجوع",
  "admin.catalogue.produit_form.supprimer": "حذف",
  "admin.catalogue.produit_form.annuler": "إلغاء",
  "admin.catalogue.produit_form.creer": "إنشاء",
  "admin.catalogue.produit_form.enregistrer": "حفظ",
  "admin.catalogue.produit_form.enregistrement": "جارٍ الحفظ…",
  "admin.catalogue.produit_form.suppression": "جارٍ الحذف…",
  "admin.catalogue.produit_form.section_informations": "المعلومات",
  "admin.catalogue.produit_form.label_id": "المعرّف (slug فريد)",
  "admin.catalogue.produit_form.label_marque": "العلامة التجارية",
  "admin.catalogue.produit_form.label_categorie": "الفئة",
  "admin.catalogue.produit_form.label_type_article": "نوع العنصر",
  "admin.catalogue.produit_form.type_physique": "منتج مادي (مع توصيل)",
  "admin.catalogue.produit_form.type_service": "خدمة / غير ملموس (بدون شحن)",
  "admin.catalogue.produit_form.label_attributs_personnalises": "خصائص ومواصفات مخصصة",
  "admin.catalogue.produit_form.btn_ajouter_attribut": "+ إضافة خاصية مخصصة",
  "admin.catalogue.produit_form.attribut_nom": "اسم الخاصية (مثال: المقاس، اللون، المادة)",
  "admin.catalogue.produit_form.attribut_valeur": "القيمة",
  "admin.catalogue.produit_form.btn_supprimer_attribut": "حذف",
  "admin.catalogue.produit_form.label_nom": "الاسم",
  "admin.catalogue.produit_form.label_nom_en": "الاسم (EN)",
  "admin.catalogue.produit_form.label_nom_ar": "الاسم (AR)",
  "admin.catalogue.produit_form.label_specs": "النقاط البارزة والموجز",
  "admin.catalogue.produit_form.label_specs_en": "النقاط البارزة والموجز (EN)",
  "admin.catalogue.produit_form.label_specs_ar": "النقاط البارزة والموجز (AR)",
  "admin.catalogue.produit_form.placeholder_specs_physique":
    "مثال: قطن عضوي 100% · قصة قياسية · صناعة حرفية",
  "admin.catalogue.produit_form.placeholder_specs_service":
    "مثال: جلسة لمدة ساعة · دعم فني مشمول · حضوري أو عن بعد",
  "admin.catalogue.produit_form.specs_it_titre":
    "المواصفات التقنية الحاسوبية (المعالج، الذاكرة، الشاشة، نظام التشغيل)",
  "admin.catalogue.produit_form.specs_it_aide": "اختياري. مفيد لعتاد الحاسوب والإلكترونيات.",
  "admin.catalogue.produit_form.specs_it_replier": "طي",
  "admin.catalogue.produit_form.specs_it_deplier": "توسيع",
  "admin.catalogue.produit_form.custom_specs_titre": "المواصفات والخصائص المخصصة",
  "admin.catalogue.produit_form.custom_specs_desc":
    "أضف أي خاصية مناسبة لنشاطك: المقاس، اللون، الخامة، الوزن، الحجم، المدة، إلخ.",
  "admin.catalogue.produit_form.traductions_facultatives":
    "الترجمات اختيارية. يظل المنتج صالحًا بدون ترجمة.",
  "admin.catalogue.produit_form.section_prix_stock": "السعر والمخزون",
  "admin.catalogue.produit_form.label_prix": "السعر (دج)",
  "admin.catalogue.produit_form.label_ancien_prix": "السعر القديم (اختياري)",
  "admin.catalogue.produit_form.label_quantite": "الكمية (وحدات)",
  "admin.catalogue.produit_form.hint_quantite":
    "يُعاد حساب الحالة تلقائيًا وفق العتبات المحددة في /admin/settings.",
  "admin.catalogue.produit_form.label_etat_stock": "حالة المخزون (تجاوز)",
  "admin.catalogue.produit_form.label_bestseller": "الأكثر مبيعًا",
  "admin.catalogue.produit_form.label_promotion": "في تخفيض",
  "admin.catalogue.produit_form.section_image": "الصورة",
  "admin.catalogue.produit_form.label_depuis_mediatheque": "من مكتبة الوسائط",
  "admin.catalogue.produit_form.placeholder_choisir_media": "اختر وسيطًا…",
  "admin.catalogue.produit_form.label_url_image": "رابط أو مسار",
  "admin.catalogue.produit_form.placeholder_url_image": "رابط أو مسار الصورة",
  "admin.catalogue.produit_form.toast_cree": "تم إنشاء المنتج",
  "admin.catalogue.produit_form.toast_mis_a_jour": "تم تحديث المنتج",
  "admin.catalogue.produit_form.toast_champs_invalides":
    "بعض الحقول غير صحيحة — صحّح الأخطاء المُحدَّدة باللون الأحمر.",
  "admin.catalogue.produit_form.toast_id_existant": "المعرّف مستخدم بالفعل",
  "admin.catalogue.produit_form.toast_categorie_inconnue": "فئة غير معروفة",
  "admin.catalogue.produit_form.erreur_id_existant": "هذا المعرّف موجود بالفعل",
  "admin.catalogue.produit_form.erreur_categorie_inconnue": "فئة غير معروفة",
  "admin.catalogue.produit_form.supprimer_titre": "حذف هذا المنتج؟",
  "admin.catalogue.produit_form.supprimer_description":
    "سيُحذف المنتج « {nom} » من الكتالوج المحلي. هذا الإجراء لا يمكن التراجع عنه.",
  "admin.catalogue.produit_form.creer_garde": "إنشاء المنتج",
  "admin.catalogue.produit_form.modifier_garde": "تعديل المنتج",
  "admin.catalogue.produit_form.supprimer_garde": "حذف المنتج",

  // ── ProductDetail — بطاقة المنتج ──────────────────────────────────────────
  "admin.catalogue.produit_detail.titre_chargement": "المنتج",
  "admin.catalogue.produit_detail.titre_introuvable": "المنتج غير موجود",
  "admin.catalogue.produit_detail.vide_introuvable": "لا يوجد منتج بالمعرّف « {id} »",
  "admin.catalogue.produit_detail.retour": "رجوع",
  "admin.catalogue.produit_detail.fiche_publique": "الصفحة العامة",
  "admin.catalogue.produit_detail.modifier": "تعديل",
  "admin.catalogue.produit_detail.badge_bestseller": "الأكثر مبيعًا",
  "admin.catalogue.produit_detail.badge_promotion": "تخفيض",
  "admin.catalogue.produit_detail.section_resume": "ملخص",
  "admin.catalogue.produit_detail.kpi_unites_vendues": "الوحدات المباعة",
  "admin.catalogue.produit_detail.kpi_chiffre_affaires": "رقم الأعمال",
  "admin.catalogue.produit_detail.kpi_note_moyenne": "متوسط التقييم ({n})",
  "admin.catalogue.produit_detail.section_categorie": "الفئة",
  "admin.catalogue.produit_detail.section_marque": "العلامة التجارية",
  "admin.catalogue.produit_detail.commandes_recentes_un": "طلب حديث ({n})",
  "admin.catalogue.produit_detail.commandes_recentes_autre": "طلبات حديثة ({n})",
  "admin.catalogue.produit_detail.vide_commandes": "لا توجد طلبات تجريبية مرتبطة.",

  // ── Inventory — إدارة المخزون ──────────────────────────────────────────────
  "admin.catalogue.stock.titre": "المخزون",
  "admin.catalogue.stock.description": "اضبط مستويات المخزون وسجّل الحركات وتابع التنبيهات.",
  "admin.catalogue.stock.kpi_total": "إجمالي المنتجات",
  "admin.catalogue.stock.kpi_en_stock": "متوفر",
  "admin.catalogue.stock.kpi_faible": "مخزون منخفض",
  "admin.catalogue.stock.kpi_rupture": "نفذ المخزون",
  "admin.catalogue.stock.onglet_produits": "المنتجات",
  "admin.catalogue.stock.onglet_mouvements_un": "حركة ({n})",
  "admin.catalogue.stock.onglet_mouvements_autre": "حركات ({n})",
  "admin.catalogue.stock.recherche_placeholder": "البحث عن منتج…",
  "admin.catalogue.stock.col_produit": "المنتج",
  "admin.catalogue.stock.col_marque": "العلامة التجارية",
  "admin.catalogue.stock.col_categorie": "الفئة",
  "admin.catalogue.stock.col_qte": "الكمية",
  "admin.catalogue.stock.col_statut": "الحالة",
  "admin.catalogue.stock.col_action": "الإجراء",
  "admin.catalogue.stock.btn_ajuster": "ضبط",
  "admin.catalogue.stock.vide_aucun_produit": "لا توجد منتجات.",
  "admin.catalogue.stock.col_date": "التاريخ",
  "admin.catalogue.stock.col_delta": "الفارق",
  "admin.catalogue.stock.col_raison": "السبب",
  "admin.catalogue.stock.vide_aucun_mouvement": "لا توجد حركات مسجّلة.",
  "admin.catalogue.stock.dialog_titre": "ضبط المخزون — {nom}",
  "admin.catalogue.stock.dialog_label_delta": "الحركة (الفارق)",
  "admin.catalogue.stock.dialog_hint_delta":
    "سالب = خروج (بيع، تلف)، موجب = دخول (تموين). يُرسل الفارق مباشرةً إلى الخادم لضمان التزامن في المرحلة 4.",
  "admin.catalogue.stock.dialog_label_raison": "السبب",
  "admin.catalogue.stock.dialog_placeholder_raison": "تموين، جرد، تلف…",
  "admin.catalogue.stock.dialog_seuils":
    "العتبات الحالية: نفاد المخزون ≤ {rupture}، منخفض ≤ {faible}. ستُعاد حساب الحالة تلقائيًا.",
  "admin.catalogue.stock.dialog_annuler": "إلغاء",
  "admin.catalogue.stock.dialog_enregistrer": "حفظ",
  "admin.catalogue.stock.dialog_enregistrement": "جارٍ الحفظ…",
  "admin.catalogue.stock.toast_mis_a_jour": "تم تحديث المخزون — {nom}",
  "admin.catalogue.stock.erreur_delta_zero": "يجب أن يكون الفارق مختلفًا عن 0",
  "admin.catalogue.stock.erreur_raison_requise": "يُرجى تحديد سبب",
  "admin.catalogue.stock.ajuster_garde": "ضبط المخزون",

  // ── Media — مكتبة الوسائط ──────────────────────────────────────────────────
  "admin.catalogue.media.titre": "مكتبة الوسائط",
  "admin.catalogue.media.description":
    "{televerse} صورة مرفوعة · {catalogue} صورة من الكتالوج · {taille} مستخدمة (الحد العملي 5 ميغابايت لكل ملف).",
  "admin.catalogue.media.btn_televerser": "رفع",
  "admin.catalogue.media.recherche_placeholder": "بحث (الاسم، الوسم)…",
  "admin.catalogue.media.quota_label": "مساحة مكتبة الوسائط: {utilise} / {total}",
  "admin.catalogue.media.quota_critique":
    "تم بلوغ الحصة — الرفع محظور. احذف بعض الصور أو انتظر التخزين على الخادم (المرحلة 4).",
  "admin.catalogue.media.quota_avertissement":
    "الحصة على وشك النفاد. فكّر في حذف الصور غير المستخدمة.",
  "admin.catalogue.media.vide_aucune_image": "لا توجد صور. انقر على « رفع » لإضافة مرئيات.",
  "admin.catalogue.media.source_catalogue": "الكتالوج",
  "admin.catalogue.media.copier_url": "نسخ الرابط",
  "admin.catalogue.media.renommer": "إعادة تسمية",
  "admin.catalogue.media.supprimer": "حذف",
  "admin.catalogue.media.toast_url_copiee": "تم نسخ الرابط",
  "admin.catalogue.media.toast_erreur_copie": "تعذّر النسخ",
  "admin.catalogue.media.toast_televerse": "{nom}: تم الرفع والحفظ.",
  "admin.catalogue.media.toast_supprime": "تم الحذف",
  "admin.catalogue.media.toast_renomme": "تم تحديث البيانات الوصفية",
  "admin.catalogue.media.toast_erreur_format": "{nom}: صيغة غير مدعومة",
  "admin.catalogue.media.toast_erreur_taille": "{nom}: الحجم كبير جدًا (>5 ميغابايت)",
  "admin.catalogue.media.toast_quota_atteint":
    "تم بلوغ حصة مكتبة الوسائط ({max} الحد الأقصى). احذف الصور الموجودة، أو انتظر المرحلة 4 (التخزين على الخادم).",
  "admin.catalogue.media.toast_quota_avertissement":
    "تنبيه: سيرفع هذا الملف مكتبة الوسائط إلى {utilise} / {total}. سيرفع التخزين على الخادم (المرحلة 4) هذا الحد.",
  "admin.catalogue.media.toast_erreur_sauvegarde":
    "{nom}: تعذّر حفظ الصورة ({erreur}). احذف بعض الوسائط لتحرير مساحة، أو انتظر المرحلة 4.",
  "admin.catalogue.media.erreur_nom_requis": "الاسم مطلوب",
  "admin.catalogue.media.dialog_renommer_titre": "إعادة تسمية",
  "admin.catalogue.media.dialog_label_nom": "الاسم",
  "admin.catalogue.media.dialog_label_tag": "الوسم (اختياري)",
  "admin.catalogue.media.dialog_placeholder_tag": "مثال: لافتة، منتج…",
  "admin.catalogue.media.dialog_annuler": "إلغاء",
  "admin.catalogue.media.dialog_enregistrer": "حفظ",
  "admin.catalogue.media.dialog_enregistrement": "جارٍ الحفظ…",
  "admin.catalogue.media.preview_format": "الصيغة: {valeur}",
  "admin.catalogue.media.preview_taille": "الحجم: {valeur}",
  "admin.catalogue.media.preview_ajoute": "أُضيف: {valeur}",
  "admin.catalogue.media.btn_copier_url_data": "نسخ الرابط / البيانات",
  "admin.catalogue.media.televerser_garde": "رفع وسيط",
  "admin.catalogue.media.renommer_garde": "إعادة تسمية الوسيط",
  "admin.catalogue.media.supprimer_garde": "حذف الوسيط",

  // ── Categories — قائمة الفئات ──────────────────────────────────────────────
  "admin.catalogue.categories.titre": "الفئات",
  "admin.catalogue.categories.description_un": "{n} فئة · {produits} منتج مرتبط.",
  "admin.catalogue.categories.description_autre": "{n} فئات · {produits} منتج مرتبط.",
  "admin.catalogue.categories.btn_nouvelle": "فئة جديدة",
  "admin.catalogue.categories.pas_image": "لا توجد صورة",
  "admin.catalogue.categories.produits_un": "{n} منتج",
  "admin.catalogue.categories.produits_autre": "{n} منتجات",
  "admin.catalogue.categories.details": "التفاصيل",
  "admin.catalogue.categories.vide_aucune": "لا توجد فئات.",
  "admin.catalogue.categories.toast_supprimee": "تم حذف الفئة « {nom} »",
  "admin.catalogue.categories.supprimer_titre": "حذف « {nom} »؟",
  "admin.catalogue.categories.supprimer_impossible_un":
    "مستحيل: {n} منتج لا يزال مرتبطًا بهذه الفئة. أعد تعيينه من /admin/products، ثم أعد المحاولة.",
  "admin.catalogue.categories.supprimer_impossible_autre":
    "مستحيل: {n} منتجات لا تزال مرتبطة بهذه الفئة. أعد تعيينها من /admin/products، ثم أعد المحاولة.",
  "admin.catalogue.categories.supprimer_confirmation":
    "هذا الإجراء لا يمكن التراجع عنه. ستُفقد إعدادات الفئة.",
  "admin.catalogue.categories.supprimer_en_cours": "جارٍ الحذف…",
  "admin.catalogue.categories.supprimer_garde": "حذف الفئة",

  // ── CategoryDetail — بطاقة الفئة ──────────────────────────────────────────
  "admin.catalogue.categorie_detail.titre_chargement": "الفئة",
  "admin.catalogue.categorie_detail.titre_introuvable": "الفئة غير موجودة",
  "admin.catalogue.categorie_detail.vide_introuvable": "لا توجد فئة « {slug} »",
  "admin.catalogue.categorie_detail.retour": "رجوع",
  "admin.catalogue.categorie_detail.modifier": "تعديل",
  "admin.catalogue.categorie_detail.pas_image": "لا توجد صورة",
  "admin.catalogue.categorie_detail.kpi_produits": "المنتجات",
  "admin.catalogue.categorie_detail.kpi_prix_moyen": "متوسط السعر",
  "admin.catalogue.categorie_detail.marques_presentes_un": "علامة تجارية حاضرة ({n})",
  "admin.catalogue.categorie_detail.marques_presentes_autre": "علامات تجارية حاضرة ({n})",
  "admin.catalogue.categorie_detail.produits_un": "منتج ({n})",
  "admin.catalogue.categorie_detail.produits_autre": "منتجات ({n})",
  "admin.catalogue.categorie_detail.btn_nouveau_produit": "منتج جديد",
  "admin.catalogue.categorie_detail.vide_produits": "لا توجد منتجات في هذه الفئة.",

  // ── CategoryForm — نموذج الفئة ────────────────────────────────────────────
  "admin.catalogue.categorie_form.titre_nouveau": "فئة جديدة",
  "admin.catalogue.categorie_form.titre_modifier": "تعديل الفئة",
  "admin.catalogue.categorie_form.retour": "رجوع",
  "admin.catalogue.categorie_form.supprimer": "حذف",
  "admin.catalogue.categorie_form.annuler": "إلغاء",
  "admin.catalogue.categorie_form.creer": "إنشاء",
  "admin.catalogue.categorie_form.enregistrer": "حفظ",
  "admin.catalogue.categorie_form.enregistrement": "جارٍ الحفظ…",
  "admin.catalogue.categorie_form.suppression": "جارٍ الحذف…",
  "admin.catalogue.categorie_form.section_informations": "المعلومات",
  "admin.catalogue.categorie_form.label_slug": "المسار (Slug)",
  "admin.catalogue.categorie_form.label_nom": "الاسم المعروض",
  "admin.catalogue.categorie_form.label_description": "الوصف",
  "admin.catalogue.categorie_form.compteur_description": "{n}/300",
  "admin.catalogue.categorie_form.label_image": "صورة الغلاف (رابط، اختياري)",
  "admin.catalogue.categorie_form.toast_creee": "تم إنشاء الفئة",
  "admin.catalogue.categorie_form.toast_mise_a_jour": "تم تحديث الفئة",
  "admin.catalogue.categorie_form.toast_supprimee": "تم حذف الفئة",
  "admin.catalogue.categorie_form.toast_form_invalide": "صحّح أخطاء النموذج.",
  "admin.catalogue.categorie_form.toast_slug_existant": "المسار مستخدم بالفعل",
  "admin.catalogue.categorie_form.erreur_slug_existant": "هذا المسار موجود بالفعل",
  "admin.catalogue.categorie_form.erreur_produits_utilises":
    "مستحيل: {n} منتج(ات) يستخدم هذه الفئة.",
  "admin.catalogue.categorie_form.supprimer_titre": "حذف هذه الفئة؟",
  "admin.catalogue.categorie_form.supprimer_impossible":
    "يتعذّر الحذف: {n} منتج(ات) لا يزال يستخدم هذه الفئة.",
  "admin.catalogue.categorie_form.supprimer_confirmation": "ستُحذف الفئة « {nom} » نهائيًا.",
  "admin.catalogue.categorie_form.creer_garde": "إنشاء الفئة",
  "admin.catalogue.categorie_form.modifier_garde": "تعديل الفئة",
  "admin.catalogue.categorie_form.supprimer_garde": "حذف الفئة",

  // ── Brands — قائمة العلامات التجارية ──────────────────────────────────────
  "admin.catalogue.marques.titre": "العلامات التجارية",
  "admin.catalogue.marques.description_un": "{n} علامة تجارية مسجّلة.",
  "admin.catalogue.marques.description_autre": "{n} علامات تجارية مسجّلة.",
  "admin.catalogue.marques.btn_nouvelle": "علامة تجارية جديدة",
  "admin.catalogue.marques.produits_un": "{n} منتج",
  "admin.catalogue.marques.produits_autre": "{n} منتجات",
  "admin.catalogue.marques.prix_moyen": "متوسط السعر",

  // ── BrandDetail — بطاقة العلامة التجارية ──────────────────────────────────
  "admin.catalogue.marque_detail.titre_chargement": "العلامة التجارية",
  "admin.catalogue.marque_detail.titre_introuvable": "العلامة التجارية غير موجودة",
  "admin.catalogue.marque_detail.vide_introuvable": "لا توجد علامة تجارية « {id} »",
  "admin.catalogue.marque_detail.retour": "رجوع",
  "admin.catalogue.marque_detail.modifier": "تعديل",
  "admin.catalogue.marque_detail.origine_inconnue": "أصل غير معروف",
  "admin.catalogue.marque_detail.kpi_produits": "المنتجات",
  "admin.catalogue.marque_detail.kpi_prix_moyen": "متوسط السعر",
  "admin.catalogue.marque_detail.categories_couvertes_un": "فئة مشمولة ({n})",
  "admin.catalogue.marque_detail.categories_couvertes_autre": "فئات مشمولة ({n})",
  "admin.catalogue.marque_detail.produits_un": "منتج ({n})",
  "admin.catalogue.marque_detail.produits_autre": "منتجات ({n})",
  "admin.catalogue.marque_detail.btn_nouveau_produit": "منتج جديد",
  "admin.catalogue.marque_detail.vide_produits": "لا توجد منتجات مسجّلة لهذه العلامة التجارية.",

  // ── BrandForm — نموذج العلامة التجارية ────────────────────────────────────
  "admin.catalogue.marque_form.titre_nouveau": "علامة تجارية جديدة",
  "admin.catalogue.marque_form.titre_modifier": "تعديل العلامة التجارية",
  "admin.catalogue.marque_form.retour": "رجوع",
  "admin.catalogue.marque_form.supprimer": "حذف",
  "admin.catalogue.marque_form.annuler": "إلغاء",
  "admin.catalogue.marque_form.creer": "إنشاء",
  "admin.catalogue.marque_form.enregistrer": "حفظ",
  "admin.catalogue.marque_form.enregistrement": "جارٍ الحفظ…",
  "admin.catalogue.marque_form.suppression": "جارٍ الحذف…",
  "admin.catalogue.marque_form.section_informations": "المعلومات",
  "admin.catalogue.marque_form.label_slug": "المسار (Slug)",
  "admin.catalogue.marque_form.label_nom": "الاسم",
  "admin.catalogue.marque_form.label_pays": "بلد المنشأ",
  "admin.catalogue.marque_form.label_description": "الوصف",
  "admin.catalogue.marque_form.compteur_description": "{n}/300",
  "admin.catalogue.marque_form.toast_creee": "تم إنشاء العلامة التجارية",
  "admin.catalogue.marque_form.toast_mise_a_jour": "تم تحديث العلامة التجارية",
  "admin.catalogue.marque_form.toast_supprimee": "تم حذف العلامة التجارية",
  "admin.catalogue.marque_form.toast_form_invalide": "صحّح أخطاء النموذج.",
  "admin.catalogue.marque_form.toast_slug_existant": "المسار مستخدم بالفعل",
  "admin.catalogue.marque_form.toast_nom_existant": "الاسم مستخدم بالفعل",
  "admin.catalogue.marque_form.erreur_slug_existant": "هذا المسار موجود بالفعل",
  "admin.catalogue.marque_form.erreur_nom_existant": "توجد علامة تجارية بهذا الاسم بالفعل",
  "admin.catalogue.marque_form.erreur_produits_utilises":
    "مستحيل: {n} منتج(ات) يستخدم هذه العلامة التجارية.",
  "admin.catalogue.marque_form.supprimer_titre": "حذف هذه العلامة التجارية؟",
  "admin.catalogue.marque_form.supprimer_impossible":
    "يتعذّر الحذف: {n} منتج(ات) لا يزال يستخدم هذه العلامة التجارية.",
  "admin.catalogue.marque_form.supprimer_confirmation":
    "ستُحذف العلامة التجارية « {nom} » نهائيًا.",
  "admin.catalogue.marque_form.creer_garde": "إنشاء العلامة التجارية",
  "admin.catalogue.marque_form.modifier_garde": "تعديل العلامة التجارية",
  "admin.catalogue.marque_form.supprimer_garde": "حذف العلامة التجارية",
};

export default catalogueAr;
