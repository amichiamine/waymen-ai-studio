/**
 * DEVIS-I18N.JS — MOTEUR D'INTERNATIONALISATION TRILINGUE 360° EXHAUSTIF (FR / EN / AR RTL)
 * 100% Autonome • Zéro Dépendance • Traduction Intégrale de Tout le Contenu (Titres, Textes, Options, Détails)
 * Conçu pour la suite autonome StacGate / ArchiSys3.0
 */

(function () {
  "use strict";

  const STORAGE_KEY = "devis_lang";
  const DEFAULT_LANG = "fr";
  const SUPPORTED_LANGS = ["fr", "en", "ar"];

  // Dictionnaire Trilingue 100% Exhaustif
  const TRANSLATIONS = {
    // ==========================================
    // 1. ÉLÉMENTS TRANSVERSES & EN-TÊTES
    // ==========================================
    "brand.platform": {
      fr: "StacGate Platform",
      en: "StacGate Platform",
      ar: "منصة StacGate",
    },
    "brand.tagline": {
      fr: "Proposition d'ingénierie logicielle & architecture sur-mesure",
      en: "Software engineering proposal & custom architecture",
      ar: "عرض هندسة برمجية ومعمارية مخصصة",
    },
    "meta.object": {
      fr: "Objet du Devis",
      en: "Quotation Subject",
      ar: "موضوع العرض",
    },
    "meta.architecture": {
      fr: "Architecture",
      en: "Architecture",
      ar: "المعمارية البرمجية",
    },
    "meta.arch.digital": {
      fr: "React 19 / API REST PHP 8.2+ / Paiements Locaux",
      en: "React 19 / PHP 8.2+ REST API / Local Payments",
      ar: "تطبيق React 19 / واجهة PHP 8.2+ REST / دفع محلي",
    },
    "meta.arch.retail": {
      fr: "React 19 + TypeScript / Studio Visuel / API REST PHP",
      en: "React 19 + TypeScript / Visual Studio / PHP REST API",
      ar: "React 19 مع TypeScript / استوديو بصري / واجهة PHP REST",
    },
    "meta.arch.enterprise": {
      fr: "React 19 (TypeScript Strict) / API REST PHP 8.2+ / Multi-BDD",
      en: "React 19 (Strict TypeScript) / PHP 8.2+ REST API / Multi-DB",
      ar: "React 19 (TypeScript صارم) / واجهة PHP 8.2+ REST / قواعد متعددة",
    },
    "meta.arch.pro": {
      fr: "React 19 + TypeScript / Studio Visuel / API REST PHP",
      en: "React 19 + TypeScript / Visual Studio / PHP REST API",
      ar: "React 19 مع TypeScript / استوديو بصري / واجهة PHP REST",
    },
    "meta.ownership": {
      fr: "Propriété du Code",
      en: "Code Ownership",
      ar: "ملكية الكود",
    },
    "meta.validity": {
      fr: "Validité de l'Offre",
      en: "Offer Validity",
      ar: "صلاحية العرض",
    },
    "meta.validity.val": {
      fr: "30 jours à compter de l'émission",
      en: "30 days from issuance",
      ar: "30 يوماً من تاريخ الإصدار",
    },
    "meta.ownership.val": {
      fr: "Cession Intégrale 100% Propriétaire (Zéro abonnement)",
      en: "100% Full Ownership Transfer (Zero subscription)",
      ar: "تنازل كامل عن الملكية 100% (بدون اشتراكات)",
    },
    "meta.logistics": {
      fr: "Logistique Intégrée",
      en: "Integrated Logistics",
      ar: "اللوجستيات المدمجة",
    },
    "meta.sovereignty": {
      fr: "Souveraineté",
      en: "Sovereignty",
      ar: "السيادة والتحكم",
    },
    "meta.included": {
      fr: "Périmètre Inclus",
      en: "Included Scope",
      ar: "النطاق المشمول",
    },
    "meta.advantage": {
      fr: "Atout Majeur",
      en: "Key Advantage",
      ar: "الميزة الكبرى",
    },
    "meta.master_core": {
      fr: "Socle Maître",
      en: "Master Core",
      ar: "النواة البرمجية الأساسية",
    },
    "meta.composability": {
      fr: "Composabilité",
      en: "Composability",
      ar: "القابلية للتجميع والتركيب",
    },
    "meta.persistence": {
      fr: "Persistance",
      en: "Persistence",
      ar: "قواعد البيانات والتخزين",
    },
    "meta.cession_mode": {
      fr: "Mode de Cession",
      en: "Transfer Mode",
      ar: "طبيعة التنازل والملكية",
    },

    // Titres de sections
    "section.included": {
      fr: "1. Socle Métier Inclus de Base",
      en: "1. Base Business Foundation Included",
      ar: "1. الأساس التقني المشمول تلقائياً",
    },
    "section.custom": {
      fr: "2. Personnalisez votre Solution (Options à la Carte)",
      en: "2. Customize Your Solution (A La Carte Options)",
      ar: "2. خصص منصتك (خيارات وإضافات حسب الطلب)",
    },
    "section.recommended": {
      fr: "2. Modules Additionnels Recommandés pour Votre Boutique",
      en: "2. Additional Modules Recommended for Your Store",
      ar: "2. وحدات إضافية موصى بها لمتجرك",
    },
    "section.strategic": {
      fr: "2. Modules Stratégiques à Haute Valeur Ajoutée",
      en: "2. Strategic High-Value Enterprise Modules",
      ar: "2. وحدات استراتيجية متقدمة للمؤسسات",
    },
    "section.services": {
      fr: "2. Options de Valorisation & Monétisation",
      en: "2. Valorization & Monetization Options",
      ar: "2. خيارات التطوير وتحقيق العوائد",
    },
    "section.core_universal": {
      fr: "1. Socle d'Ingénierie Universel Inclus",
      en: "1. Universal Engineering Core Included",
      ar: "1. الأساس الهندسي الشامل المشمول",
    },
    "section.major_modules": {
      fr: "2. Modules Applicatifs Majeurs",
      en: "2. Major Application Modules",
      ar: "2. الوحدات البرمجية الرئيسية",
    },
    "section.builder_packs": {
      fr: "3. Packs de Blocs du Visual Page Builder",
      en: "3. Visual Page Builder Block Packs",
      ar: "3. باقات قوالب الاستوديو البصري",
    },

    // Panneau récapitulatif & boutons
    "summary.title": {
      fr: "Récapitulatif de l'Offre",
      en: "Quotation Summary",
      ar: "ملخص العرض والخيارات",
    },
    "summary.title_custom": {
      fr: "Votre Devis Composé",
      en: "Your Composed Quote",
      ar: "عرضك المخصص والمجمّع",
    },
    "summary.total_label": {
      fr: "Investissement Total Estimé",
      en: "Estimated Total Investment",
      ar: "إجمالي الاستثمار التقديري",
    },
    "btn.whatsapp": {
      fr: "Valider & Échanger sur WhatsApp",
      en: "Confirm & Chat on WhatsApp",
      ar: "تأكيد والتواصل عبر واتساب",
    },
    "btn.print": {
      fr: "Imprimer / Enregistrer en PDF",
      en: "Print / Save as PDF",
      ar: "طباعة / حفظ كملف PDF",
    },
    "btn.reset": {
      fr: "Réinitialiser les options",
      en: "Reset options",
      ar: "إعادة تعيين الخيارات",
    },
    "badge.recommended": {
      fr: "Recommandé",
      en: "Recommended",
      ar: "موصى به",
    },
    "badge.popular": {
      fr: "Fortement Recommandé",
      en: "Highly Recommended",
      ar: "مطلوب بشدة",
    },
    "badge.essential": {
      fr: "Essentiel Algérie",
      en: "Essential for Algeria",
      ar: "أساسي في الجزائر",
    },
    "badge.recommended_corp": {
      fr: "Recommandé Entreprise",
      en: "Recommended Enterprise",
      ar: "موصى به للمؤسسات",
    },

    // ==========================================
    // 2. GUIDE D'ORIENTATION (index.html)
    // ==========================================
    "portal.badge": {
      fr: "StacGate Platform • Écosystème Haute Performance",
      en: "StacGate Platform • High Performance Ecosystem",
      ar: "منصة StacGate • منظومة عالية الأداء",
    },
    "portal.hero_title": {
      fr: "Quel est le modèle de votre projet ?",
      en: "What is your project business model?",
      ar: "ما هو النموذج المناسب لمشروعك؟",
    },
    "portal.hero_desc": {
      fr: "Explorez nos architectures logicielles pré-calibrées par modèle d'affaires. Chaque proposition inclut son calculateur interactif pour composer exactement vos fonctionnalités selon vos besoins réels.",
      en: "Explore our software architectures pre-calibrated by business model. Each proposal includes its interactive calculator to customize your exact features according to real needs.",
      ar: "استكشف معمارياتنا البرمجية المصممة خصيصاً لتناسب نموذج عملك. يتضمن كل عرض حاسبة تفاعلية لتحديد وتخصيص الميزات التي تحتاجها بدقة.",
    },
    "portal.estimation": {
      fr: "Estimation",
      en: "Estimation",
      ar: "التقدير",
    },
    "portal.from": {
      fr: "dès",
      en: "from",
      ar: "ابتداءً من",
    },
    "portal.card1.title": {
      fr: "1. Produits Digitaux & Abonnements",
      en: "1. Digital Products & Subscriptions",
      ar: "1. المنتجات الرقمية والاشتراكات",
    },
    "portal.card1.desc": {
      fr: "Pour la vente en ligne de clés d'activation logicielle, crédits IA (ChatGPT, Claude), abonnements streaming, licences et recharges sans logistique physique.",
      en: "For online selling of software activation keys, AI credits (ChatGPT, Claude), streaming subscriptions, licenses and top-ups without physical shipping.",
      ar: "لبيع مفاتيح تفعيل البرامج، اشتراكات ورصيد الذكاء الاصطناعي (ChatGPT, Claude)، خدمات البث، التراخيص والشحن الفوري بدون شحن مادي.",
    },
    "portal.card1.f1": {
      fr: "Catalogue numérique dématérialisé",
      en: "Dematerialized digital catalog",
      ar: "كتالوج رقمي مخصص للمنتجات غير الملموسة",
    },
    "portal.card1.f2": {
      fr: "Commande rapide BaridiMob / CCP / WhatsApp",
      en: "Fast checkout via BaridiMob / CCP / WhatsApp",
      ar: "طلب سريع عبر بريدي موب / CCP / واتساب",
    },
    "portal.card1.f3": {
      fr: "Back-office de délivrance des accès et clés",
      en: "Back-office for access & key delivery",
      ar: "لوحة تحكم لتسليم الرموز وتأكيد الحسابات",
    },
    "portal.card1.f4": {
      fr: "Zéro frais de livraison, zéro commission",
      en: "Zero shipping fees, zero commission",
      ar: "صفر مصاريف توصيل، وبدون أي عمولات",
    },
    "portal.card1.btn": {
      fr: "Composer mon Devis Digital",
      en: "Compose My Digital Quote",
      ar: "تخصيص عرض المنتجات الرقمية",
    },
    "portal.card2.title": {
      fr: "2. Boutique Retail & 58 Wilayas",
      en: "2. Retail Store & 58 Wilayas",
      ar: "2. المتجر الإلكتروني والدفع عند الاستلام (58 ولاية)",
    },
    "portal.card2.desc": {
      fr: "Pour le commerce de détail : prêt-à-porter, cosmétiques, parfumerie, bijoux, artisanat ou commerces de proximité avec expédition sur toute l'Algérie.",
      en: "For retail businesses: fashion, clothing, cosmetics, perfumes, jewelry, crafts or local shops with nationwide delivery across Algeria.",
      ar: "لتجارة التجزئة: الملابس، مستحضرات التجميل، العطور، الحلي، الحرف اليدوية والمتاجر المحلية مع توصيل لكافة ولايات الجزائر.",
    },
    "portal.card2.f1": {
      fr: "Tunnel d'achat Cash-on-Delivery (COD)",
      en: "Cash-on-Delivery (COD) checkout funnel",
      ar: "مسار طلب فوري للدفع عند الاستلام (COD)",
    },
    "portal.card2.f2": {
      fr: "Module 58 Wilayas (frais domicile / relais)",
      en: "58 Wilayas module (home / desk pickup rates)",
      ar: "وحدة الـ 58 ولاية (توصيل للمنزل والمكتب)",
    },
    "portal.card2.f3": {
      fr: "Suivi de colis en direct sans compte",
      en: "Live order tracking without account",
      ar: "تتبع حالة الطلب مباشرة برقم الهاتف بدون حساب",
    },
    "portal.card2.f4": {
      fr: "Variantes produits (tailles, couleurs, stock)",
      en: "Product variants (sizes, colors, stock)",
      ar: "خيارات المنتجات المتعددة (مقاسات، ألوان، مخزون)",
    },
    "portal.card2.btn": {
      fr: "Composer ma Boutique Retail",
      en: "Compose My Retail Store",
      ar: "تخصيص عرض المتجر الإلكتروني",
    },
    "portal.card3.title": {
      fr: "3. Plateforme Entreprise & B2B",
      en: "3. Enterprise Platform & B2B",
      ar: "3. منصة المؤسسات والشركات B2B",
    },
    "portal.card3.desc": {
      fr: "Pour magasins informatique/tech, pièces de rechange, quincaillerie industrielle, distributeurs et grossistes avec gros volume et gestion des stocks.",
      en: "For tech/computer stores, auto spare parts, industrial hardware, wholesalers and distributors with high volume and stock management.",
      ar: "لمحلات الحواسيب والتكنولوجيا، قطع غيار السيارات، العتاد الصناعي، تجار الجملة والموزعين مع إدارة متقدمة للمخزون.",
    },
    "portal.card3.f1": {
      fr: "Dashboard KPI exécutif (CA, paniers, LTV)",
      en: "Executive KPI dashboard (Revenue, AOV, LTV)",
      ar: "لوحة تحكم تنفيذية ذكية (إيرادات، سلات، أرباح)",
    },
    "portal.card3.f2": {
      fr: "Stocks atomiques et alertes anti-rupture",
      en: "Atomic stocks & anti-shortage alerts",
      ar: "تحديث ذري للمخزون لمنع البيع الزائد وتنبيهات النفاذ",
    },
    "portal.card3.f3": {
      fr: "Module de facturation et fiches de colisage",
      en: "Invoicing & packing slips module",
      ar: "طباعة الفواتير وبطاقات الشحن بضغطة زر",
    },
    "portal.card3.f4": {
      fr: "Base de données sous votre contrôle total",
      en: "Database under your 100% full control",
      ar: "قاعدة بيانات سيادية تحت تحكمك وإدارتك الكاملة",
    },
    "portal.card3.btn": {
      fr: "Composer ma Solution Entreprise",
      en: "Compose My Enterprise Solution",
      ar: "تخصيص عرض الشركات والمؤسسات",
    },
    "portal.card4.title": {
      fr: "4. Présence Pro, Services & Formations",
      en: "4. Professional Presence, Services & Training",
      ar: "4. الواجهة المهنية، الخدمات والدورات",
    },
    "portal.card4.desc": {
      fr: "Pour consultants, formateurs, bureaux d'études, experts, architectes et cabinets de services souhaitant asseoir leur autorité et capter des clients.",
      en: "For consultants, trainers, design offices, experts, architects and service firms looking to establish authority and acquire clients.",
      ar: "للمستشارين، المدربين، مكاتب الدراسات، الخبراء، المعماريين وشركات الخدمات لبناء المصداقية وجذب الصفقات.",
    },
    "portal.card4.f1": {
      fr: "Portfolio de réalisations & études de cas",
      en: "Case studies & projects portfolio",
      ar: "معرض أعمال ودراسات حالة احترافية",
    },
    "portal.card4.f2": {
      fr: "Blog d'autorité Markdown & Vidéos R&D",
      en: "Markdown authority blog & R&D videos",
      ar: "مدونة متقدمة تدعم مقالات الماركداون وفيديوهات يوتيوب",
    },
    "portal.card4.f3": {
      fr: "Preuve sociale & Témoignages vérifiés",
      en: "Social proof & verified testimonials",
      ar: "شهادات عملاء موثقة وآراء لتعزيز الثقة",
    },
    "portal.card4.f4": {
      fr: "Formulaire de demande de devis sur-mesure",
      en: "Custom quote request form",
      ar: "نموذج ذكي لطلب عروض الأسعار والتواصل المباشر",
    },
    "portal.card4.btn": {
      fr: "Composer ma Présence Pro",
      en: "Compose My Pro Presence",
      ar: "تخصيص عرض الواجهة المهنية",
    },

    // Bannière Grand Compositeur (index.html)
    "portal.master_banner_badge": {
      fr: "Besoin d'une Architecture Mixte ou Hors-Norme ?",
      en: "Need a Hybrid or Tailored Architecture?",
      ar: "هل تحتاج إلى معمارية مخصصة أو هجينة؟",
    },
    "portal.master_banner_title": {
      fr: "Grand Compositeur Intégral StacGate",
      en: "StacGate Master Modular Configurator",
      ar: "المُجمّع الهندسي الشامل لمنظومة StacGate",
    },
    "portal.master_banner_desc": {
      fr: "Accédez à l'ensemble des 29 blocs modulaires du Studio Visuel et à tous les modules applicatifs (E-Commerce physique, Digital, Multilingue FR/EN/AR RTL, Prérendu SEO Playwright, Stocks atomiques). Composez votre plateforme pièce par pièce avec chiffrage en direct.",
      en: "Access all 29 Visual Studio modular blocks and every application module (Physical E-Commerce, Digital, Trilingual FR/EN/AR RTL, Playwright SEO Prerendering, Atomic Stocks). Assemble your platform piece by piece with live costing.",
      ar: "استفد من كافة قوالب الاستوديو البصري الـ 29 وجميع الوحدات البرمجية (المتجر الفعلي، المنتجات الرقمية، اللغات الثلاث مع دعم العربية RTL، محرك الأرشفة Playwright SEO والمخزون الذري). ركّب منظومتك قطعة بقطعة مع تسعير حي ومباشر.",
    },
    "portal.master_banner_btn": {
      fr: "Lancer le Grand Compositeur",
      en: "Launch Master Configurator",
      ar: "تشغيل المُجمّع الهندسي الشامل",
    },

    // Matrice Comparative du Portail (index.html)
    "portal.matrix_title": {
      fr: "Matrice Comparative des Équipements Inclus",
      en: "Included Equipment Comparative Matrix",
      ar: "مصفوفة المقارنة للميزات المشمولة",
    },
    "portal.matrix_desc": {
      fr: "Toutes nos solutions bénéficient de la même rigueur technique et de la cession intégrale du code source :",
      en: "All our solutions benefit from the same engineering rigor and full source code transfer:",
      ar: "تستفيد كافة حلولنا من نفس الدقة الهندسية العالية والتنازل الكامل عن الشفرة المصدرية:",
    },
    "portal.matrix.th_feature": {
      fr: "Capacité / Équipement",
      en: "Feature / Capability",
      ar: "الخاصية / التجهيز التقني",
    },
    "portal.matrix.th_digital": {
      fr: "Digital & Clés",
      en: "Digital & Keys",
      ar: "المنتجات الرقمية",
    },
    "portal.matrix.th_retail": {
      fr: "Boutique Retail",
      en: "Retail Store",
      ar: "متجر التجزئة",
    },
    "portal.matrix.th_enterprise": {
      fr: "Entreprise & B2B",
      en: "Enterprise & B2B",
      ar: "المؤسسات و B2B",
    },
    "portal.matrix.th_pro": {
      fr: "Présence Pro",
      en: "Pro Showcase",
      ar: "الواجهة المهنية",
    },

    // Ligne 1
    "portal.matrix.r1_label": {
      fr: "Technologie Front-End",
      en: "Front-End Technology",
      ar: "تقنية الواجهة الأمامية",
    },
    "portal.matrix.r1_val": {
      fr: "React 19 / TypeScript",
      en: "React 19 / TypeScript",
      ar: "React 19 / TypeScript",
    },

    // Ligne 2
    "portal.matrix.r2_label": {
      fr: "API & Base de Données",
      en: "API & Database",
      ar: "الواجهة البرمجية وقاعدة البيانات",
    },
    "portal.matrix.r2_v1": {
      fr: "PHP 8.2+ REST / SQLite",
      en: "PHP 8.2+ REST / SQLite",
      ar: "PHP 8.2+ REST / SQLite",
    },
    "portal.matrix.r2_v2": {
      fr: "PHP 8.2+ REST / Multi-BDD",
      en: "PHP 8.2+ REST / Multi-DB",
      ar: "PHP 8.2+ REST / قواعد متعددة",
    },

    // Ligne 3
    "portal.matrix.r3_label": {
      fr: "Mode de Livraison",
      en: "Delivery Mode",
      ar: "طريقة التسليم والتوصيل",
    },
    "portal.matrix.r3_v1": {
      fr: "Email / WhatsApp / Écran",
      en: "Email / WhatsApp / On-screen",
      ar: "البريد / واتساب / الشاشة مباشرة",
    },
    "portal.matrix.r3_v2": {
      fr: "Colis 58 Wilayas (COD)",
      en: "58 Wilayas Parcels (COD)",
      ar: "شحن طرود 58 ولاية (دفع عند الاستلام)",
    },
    "portal.matrix.r3_v3": {
      fr: "58 Wilayas + Gros & Devis",
      en: "58 Wilayas + Wholesale & Quotes",
      ar: "58 ولاية + طلبيات الجملة وعروض الأسعار",
    },
    "portal.matrix.r3_v4": {
      fr: "Prestation / En ligne",
      en: "Service / Online",
      ar: "تقديم خدمات / جلسات أونلاين",
    },

    // Ligne 4
    "portal.matrix.r4_label": {
      fr: "Suivi de Commande Direct",
      en: "Direct Order Tracking",
      ar: "تتبع الطلبيات المباشر",
    },
    "portal.matrix.r4_v1": {
      fr: "Option par token",
      en: "Optional token link",
      ar: "اختياري برابط خاص",
    },
    "portal.matrix.r4_v2": {
      fr: "Inclus sans compte",
      en: "Included guest tracking",
      ar: "مشمول بالهاتف بدون حساب",
    },
    "portal.matrix.r4_v3": {
      fr: "Inclus avec facturation",
      en: "Included with invoicing",
      ar: "مشمول مع إصدار الفواتير",
    },
    "portal.matrix.r4_v4": {
      fr: "Sur demande de devis",
      en: "Upon quote request",
      ar: "عبر طلبات عروض الأسعار",
    },

    // Ligne 5
    "portal.matrix.r5_label": {
      fr: "Gestion des Stocks",
      en: "Stock Management",
      ar: "إدارة المخزون",
    },
    "portal.matrix.r5_v1": {
      fr: "Quantités numériques",
      en: "Digital quantities",
      ar: "كميات وتراخيص رقمية",
    },
    "portal.matrix.r5_v2": {
      fr: "Stocks physiques & Variantes",
      en: "Physical stocks & Variants",
      ar: "مخزون فعلي ومتغيرات",
    },
    "portal.matrix.r5_v3": {
      fr: "Stocks atomiques + Alertes",
      en: "Atomic stocks + Alerts",
      ar: "مخزون ذري وتنبيهات النفاذ",
    },
    "portal.matrix.r5_v4": {
      fr: "Créneaux / Disponibilité",
      en: "Slots / Availability",
      ar: "مواعيد وجداول توافر",
    },

    // Ligne 6
    "portal.matrix.r6_label": {
      fr: "Moteur Multilingue (RTL)",
      en: "Multilingual Engine (RTL)",
      ar: "دعم اللغات والاتجاه العربي RTL",
    },
    "portal.matrix.r6_v1": {
      fr: "Option Arabe RTL",
      en: "Optional Arabic RTL",
      ar: "اختياري: العربية RTL",
    },
    "portal.matrix.r6_v2": {
      fr: "Inclus Trilingue 360°",
      en: "Included Trilingual 360°",
      ar: "مشمول: ثلاث لغات شاملة 360°",
    },

    // Ligne 7
    "portal.matrix.r7_label": {
      fr: "Studio Visuel Page Builder",
      en: "Visual Page Builder Studio",
      ar: "استوديو بناء الصفحات البصري",
    },
    "portal.matrix.r7_v1": {
      fr: "Option Bannières",
      en: "Optional Banners",
      ar: "اختياري: بانرات ترويجية",
    },
    "portal.matrix.r7_v2": {
      fr: "Option Carrousels",
      en: "Optional Carousels",
      ar: "اختياري: عوارض منتجات",
    },
    "portal.matrix.r7_v3": {
      fr: "Inclus (29 Blocs)",
      en: "Included (29 Blocks)",
      ar: "مشمول كاملاً (29 قالباً)",
    },
    "portal.matrix.r7_v4": {
      fr: "Option Pages d'offres",
      en: "Optional Offer pages",
      ar: "اختياري: صفحات عروض",
    },

    // Ligne 8
    "portal.matrix.r8_label": {
      fr: "Propriété du Code",
      en: "Code Ownership",
      ar: "ملكية الشفرة المصدرية",
    },
    "portal.matrix.r8_val": {
      fr: "100% Cession libre",
      en: "100% Full Ownership Transfer",
      ar: "تنازل حر وتام بنسبة 100%",
    },

    // ==========================================
    // 3. SOLUTION DIGITALE (solution-digitale.html)
    // ==========================================
    "digital.badge": {
      fr: "Offre Spécialisée : Produits Digitaux & Abonnements",
      en: "Specialized Offer: Digital Products & Subscriptions",
      ar: "عرض متخصص: المنتجات الرقمية والاشتراكات",
    },
    "digital.meta_obj": {
      fr: "Plateforme E-Commerce Dématérialisée (Clés, IA, Abonnements)",
      en: "Dematerialized E-Commerce Platform (Keys, AI, Subscriptions)",
      ar: "منصة تجارة إلكترونية رقمية (مفاتيح، ذكاء اصطناعي، اشتراكات)",
    },
    "digital.desc_inc": {
      fr: "Toutes les fondations techniques indispensables au commerce de produits dématérialisés sont prêtes et opérationnelles :",
      en: "All technical foundations required for dematerialized product commerce are fully operational:",
      ar: "كافة الركائز التقنية الضرورية لتجارة المنتجات الرقمية مجهزة وجاهزة للتشغيل الفوري:",
    },
    "digital.inc1.title": {
      fr: "Application React 19 / TypeScript",
      en: "React 19 / TypeScript Application",
      ar: "تطبيق ويب حديث React 19 / TypeScript",
    },
    "digital.inc1.desc": {
      fr: "Affichage instantané, expérience ultra-fluide sur mobile & PC.",
      en: "Instant display, ultra-smooth experience on mobile & desktop.",
      ar: "سرعة تحميل فورية وتجربة فائقة السلاسة على الهواتف والحواسيب.",
    },
    "digital.inc2.title": {
      fr: "Catalogue Dématérialisé Dédié",
      en: "Dedicated Digital Catalog",
      ar: "كتالوج مخصص للمنتجات غير المادية",
    },
    "digital.inc2.desc": {
      fr: "Fiches pour comptes IA, clés logicielles, licences et recharges sans frais de livraison inutiles.",
      en: "Product cards for AI accounts, software keys, licenses and top-ups with zero shipping friction.",
      ar: "بطاقات لعرض حسابات الذكاء الاصطناعي، البرامج، التراخيص والشحن بدون حقول توصيل غير لازمة.",
    },
    "digital.inc3.title": {
      fr: "Tunnel de Commande Express",
      en: "Express Checkout Funnel",
      ar: "مسار طلب سريع ومختصر",
    },
    "digital.inc3.desc": {
      fr: "Formulaire simplifié (Nom, Téléphone, Email/WhatsApp) adapté à la vente rapide en ligne.",
      en: "Simplified form (Name, Phone, Email/WhatsApp) tailored for instant online sales.",
      ar: "نموذج مبسط (الاسم، الهاتف، البريد أو الواتساب) مصمم للشراء الفوري السهل.",
    },
    "digital.inc4.title": {
      fr: "Paiement Local BaridiMob / CCP / Cash",
      en: "Local Payment BaridiMob / CCP / Cash",
      ar: "دفع محلي عبر بريدي موب / CCP",
    },
    "digital.inc4.desc": {
      fr: "Instructions de virement claires avec confirmation de paiement et traitement des reçus.",
      en: "Clear transfer instructions with payment confirmation and receipt processing.",
      ar: "تعليمات تحويل واضحة مع إمكانية إرفاق وصل التحويل وتأكيد الدفع.",
    },
    "digital.inc5.title": {
      fr: "Back-Office de Gestion des Commandes",
      en: "Order Management Back-Office",
      ar: "لوحة تحكم لإدارة الطلبات والتسليم",
    },
    "digital.inc5.desc": {
      fr: "Espace administrateur sécurisé pour délivrer les clés/comptes et valider les statuts.",
      en: "Secure admin portal to deliver keys/accounts and manage statuses.",
      ar: "بوابة تحكم آمنة لتسليم الرموز والحسابات وتحديث حالات الطلبات.",
    },
    "digital.inc6.title": {
      fr: "Architecture Sans Frais Récurrents",
      en: "Zero Recurring Fees Architecture",
      ar: "معمارية بدون اشتراكات متكررة",
    },
    "digital.inc6.desc": {
      fr: "Tourne sur un hébergement mutualisé standard, zéro dépendance SaaS payante en devises.",
      en: "Runs on standard shared hosting, zero paid SaaS currency dependencies.",
      ar: "تعمل على أي استضافة عادية، بدون أي تبعيات أو اشتراكات بالعملة الصعبة.",
    },
    "digital.desc_opt": {
      fr: "Cochez ou décochez les modules pour calibrer exactement la plateforme à votre activité :",
      en: "Check or uncheck modules to accurately tailor the platform to your business:",
      ar: "حدد أو ألغِ تفعيل الوحدات لضبط المنصة بدقة حسب متطلبات نشاطك:",
    },

    // Options Digital
    "digital.opt.rtl.title": {
      fr: "Pack Bilingue Français + Arabe Natif (RTL)",
      en: "Bilingual French + Native Arabic (RTL) Pack",
      ar: "الباقة الثنائية: الفرنسية + العربية (RTL)",
    },
    "digital.opt.rtl.desc": {
      fr: "Affichage bilingue complet avec inversion directionnelle parfaite de droite à gauche pour maximiser vos conversions auprès de la clientèle arabophone.",
      en: "Full bilingual display with perfect right-to-left directional flipping to maximize conversion with Arabic-speaking buyers.",
      ar: "عرض ثنائي اللغة كامل مع تغيير اتجاه الصفحة من اليمين إلى اليسار لزيادة المبيعات مع الجمهور الناطق بالعربية.",
    },
    "digital.opt.builder.title": {
      fr: "Studio Visuel & Bannières Promotionnelles",
      en: "Visual Studio & Promo Banners",
      ar: "الاستوديو البصري والبانرات الترويجية",
    },
    "digital.opt.builder.desc": {
      fr: "Éditeur visuel intégré pour modifier vos bannières, afficher des comptes à rebours de promotions temporaires et mettre en avant vos nouveautés en 1 clic.",
      en: "Integrated visual editor to edit banners, display promotional countdown timers and highlight new releases in 1 click.",
      ar: "محرر بصري مدمج لتعديل البانرات، إبراز التخفيضات مع عد تنازلي، وإظهار أحدث العروض بضغطة زر.",
    },
    "digital.opt.whatsapp.title": {
      fr: "Bouton Commande WhatsApp Directe",
      en: "Direct WhatsApp Order Button",
      ar: "زر الطلب المباشر عبر واتساب",
    },
    "digital.opt.whatsapp.desc": {
      fr: "Permet au client de finaliser et transmettre sa commande directement sur votre numéro WhatsApp avec message pré-rempli contenant les références de l'article.",
      en: "Allows customer to finalize and transmit orders directly to your WhatsApp number with pre-filled message containing product details.",
      ar: "يتيح للعميل إرسال طلبه مباشرة إلى رقم الواتساب الخاص بك برسالة تلقائية تحتوي على اسم وسعر المنتج.",
    },
    "digital.opt.tracking.title": {
      fr: "Suivi de Commande en Direct sans Compte",
      en: "Live Order Tracking Without Account",
      ar: "تتبع حالة الطلب مباشرة بدون حساب",
    },
    "digital.opt.tracking.desc": {
      fr: "Module public permettant aux acheteurs de consulter l'avancement de leur activation ou livraison de clé en saisissant simplement leur numéro de téléphone ou code commande.",
      en: "Public module allowing buyers to check key activation or delivery progress simply by entering their phone number or order code.",
      ar: "صفحة عامة تتيح للمشتري متابعة حالة التفعيل أو تسليم المفتاح بمجرد إدخال رقم هاتفه أو رمز الطلب.",
    },
    "digital.opt.blog.title": {
      fr: "Espace Blog & Tutoriels d'Activation",
      en: "Blog Section & Activation Tutorials",
      ar: "قسم المدونة وشروحات التفعيل",
    },
    "digital.opt.blog.desc": {
      fr: "Publiez des guides explicatifs, vidéos tutoriels et actualités sur vos services pour rassurer vos clients et améliorer votre visibilité sur Google.",
      en: "Publish how-to guides, video tutorials and service news to reassure customers and boost Google SEO visibility.",
      ar: "انشر مقالات تعليمية، شروحات فيديو وأحدث الأخبار التقنية لطمأنة زبائنك وتحسين تصدرك في محرك بحث جوجل.",
    },
    "digital.opt.volume.title": {
      fr: "Gestion Catalogue Étendu (+100 Références)",
      en: "Extended Catalog Management (100+ items)",
      ar: "إدارة الكتالوج الموسع (أكثر من 100 عنصر)",
    },
    "digital.opt.volume.desc": {
      fr: "Catégorisation avancée avec filtres multicritères pour organiser un large éventail d'abonnements et de logiciels.",
      en: "Advanced categorization with multi-criteria filters to organize a broad array of subscriptions and software.",
      ar: "تصنيف متقدم مع فلاتر فرز متعددة لتنظيم مجموعة كبيرة من الاشتراكات والبرمجيات بسهولة.",
    },

    // ==========================================
    // 4. BOUTIQUE COMMERCE RETAIL (boutique-commerce.html)
    // ==========================================
    "retail.badge": {
      fr: "Offre Spécialisée : Commerce de Détail, Mode & Retail",
      en: "Specialized Offer: Retail, Fashion & Consumer Goods",
      ar: "عرض متخصص: تجارة التجزئة، الأزياء والمتاجر",
    },
    "retail.meta_obj": {
      fr: "Boutique E-Commerce Clé-en-main (Cash-on-Delivery & 58 Wilayas)",
      en: "Turnkey E-Commerce Store (Cash-on-Delivery & 58 Wilayas)",
      ar: "متجر إلكتروني متكامل (دفع عند الاستلام و 58 ولاية)",
    },
    "retail.meta_log": {
      fr: "58 Wilayas d'Algérie avec distinction Domicile / Point Relais",
      en: "58 Algerian Wilayas with Home / Desk Pickup distinction",
      ar: "58 ولاية جزائرية مع تسعير للتوصيل إلى المنزل أو المكتب",
    },
    "retail.desc_inc": {
      fr: "Une boutique moderne, ultra-rapide et spécialement optimisée pour le marché algérien :",
      en: "A modern, ultra-fast store specifically optimized for the Algerian market:",
      ar: "متجر عصري، فائق السرعة ومصمم خصيصاً ليناسب خصوصيات السوق الجزائري:",
    },
    "retail.inc1.title": {
      fr: "Boutique React 19 Haute Vitesse",
      en: "High-Speed React 19 Storefront",
      ar: "واجهة متجر React 19 فائقة السرعة",
    },
    "retail.inc1.desc": {
      fr: "Navigation instantanée sans rechargement, optimisée à 100% pour smartphone et 4G.",
      en: "Instant navigation without page reload, 100% optimized for smartphone and 4G.",
      ar: "تصفح لحظي بدون إعادة تحميل الصفحة، متوافق 100% مع الهواتف وشبكات 4G.",
    },
    "retail.inc2.title": {
      fr: "Variantes Produits Multiples",
      en: "Multi-Variant Product System",
      ar: "خيارات المنتجات المتعددة",
    },
    "retail.inc2.desc": {
      fr: "Gestion intuitive des tailles, couleurs, volumes et déclinaisons avec galerie photos.",
      en: "Intuitive management of sizes, colors, volumes and options with dedicated image gallery.",
      ar: "إدارة مرنة للمقاسات، الألوان والأشكال مع معرض صور خاص بكل خيار.",
    },
    "retail.inc3.title": {
      fr: "Calculateur Logistique 58 Wilayas",
      en: "58 Wilayas Logistics Calculator",
      ar: "حاسبة تكلفة الشحن لـ 58 ولاية",
    },
    "retail.inc3.desc": {
      fr: "Sélection de la wilaya et commune avec affichage automatique des frais de port.",
      en: "Wilaya & municipality selection with instant shipping cost calculation.",
      ar: "اختيار الولاية والبلدية مع إظهار سعر الشحن التلقائي فوراً للزبون.",
    },
    "retail.inc4.title": {
      fr: "Paiement à la Livraison (COD)",
      en: "Cash on Delivery (COD) Checkout",
      ar: "الدفع عند الاستلام (COD)",
    },
    "retail.inc4.desc": {
      fr: "Tunnel d'achat en 2 étapes optimisé pour un taux maximal de confirmation de commandes.",
      en: "2-step streamlined checkout optimized for maximum order completion rates.",
      ar: "مسار شراء بسيط في خطوتين يضمن أعلى نسبة تأكيد للطلبات.",
    },
    "retail.inc5.title": {
      fr: "Suivi de Colis sans Compte Client",
      en: "Order Tracking Without Account",
      ar: "تتبع الشحنة برقم الهاتف بدون حساب",
    },
    "retail.inc5.desc": {
      fr: "Vos clients suivent l'acheminement de leur colis directement avec leur numéro de téléphone.",
      en: "Your customers track parcel dispatch directly using their phone number.",
      ar: "يتيح لزبائنك معرفة مسار طردهم بمجرد إدخال رقم الهاتف.",
    },
    "retail.inc6.title": {
      fr: "Panneau d'Administration des Commandes",
      en: "Orders Admin Panel",
      ar: "لوحة تحكم لإدارة وشحن الطلبيات",
    },
    "retail.inc6.desc": {
      fr: "Tableau de bord pour valider, expédier et imprimer les bons de livraison.",
      en: "Dashboard to approve, dispatch and print delivery slips.",
      ar: "لوحة متكاملة لتأكيد، إرسال وطباعة وصولات التوصيل للطلبات.",
    },
    "retail.desc_opt": {
      fr: "Ajustez vos fonctionnalités pour stimuler vos ventes et fidéliser vos clients :",
      en: "Fine-tune your features to boost sales and build customer loyalty:",
      ar: "اضبط الميزات الإضافية لرفع حجم مبيعاتك وكسب ولاء زبائنك:",
    },

    // Options Retail
    "retail.opt.rtl.title": {
      fr: "Pack Bilingue Français + Arabe RTL Natif",
      en: "Bilingual French + Native Arabic RTL Pack",
      ar: "الباقة الثنائية: الفرنسية + العربية (RTL)",
    },
    "retail.opt.rtl.desc": {
      fr: "Affichage bilingue avec bascule fluide et sens de lecture arabe de droite à gauche. Indispensable pour convertir les acheteurs sur les réseaux sociaux.",
      en: "Bilingual display with smooth switching and right-to-left layout. Essential to convert social media buyers.",
      ar: "واجهة ثنائية اللغة كاملة من اليمين إلى اليسار، ضرورية لمضاعفة مبيعاتك القادمة من فيسبوك وإنستغرام.",
    },
    "retail.opt.studio.title": {
      fr: "Studio Visuel & Bannières Promotionnelles",
      en: "Visual Studio & Promo Banners",
      ar: "الاستوديو البصري والبانرات الترويجية",
    },
    "retail.opt.studio.desc": {
      fr: "Gérez vous-même vos bannières saisonnières (Soldes, Aïd, Rentrée), carrousels de produits phares et sections promotionnelles sans faire appel à un développeur.",
      en: "Easily manage seasonal banners (Sales, Eid, Back-to-school), featured carousels and promotional sections without coding.",
      ar: "تحكم بنفسك في بانرات الأعياد والتخفيضات ومجموعات المنتجات المميزة بدون الحاجة لمطور برمجيات.",
    },
    "retail.opt.stock.title": {
      fr: "Gestion Atomique des Stocks & Alertes Rupture",
      en: "Atomic Stock Tracking & Shortage Alerts",
      ar: "إدارة المخزون الذكية وتنبيهات النفاذ",
    },
    "retail.opt.stock.desc": {
      fr: "Décompte automatique des unités à chaque commande avec protection anti-survente et notifications par email dès qu'un produit atteint le seuil d'alerte.",
      en: "Automatic unit deduction on each order with overselling protection and email notification upon reaching low stock threshold.",
      ar: "خصم آلي للكميات مع كل طلب لمنع البيع فوق المخزون وإرسال إشعار فور وصول أي منتج للحد الأدنى.",
    },
    "retail.opt.coupons.title": {
      fr: "Moteur de Codes Promo & Réductions Flash",
      en: "Coupon Code & Flash Discount Engine",
      ar: "نظام كوبونات الخصم والعروض الترويجية",
    },
    "retail.opt.coupons.desc": {
      fr: "Créez des codes promotionnels personnalisés (en pourcentage ou montant fixe) avec date limite et nombre maximum d'utilisations pour vos campagnes influenceurs.",
      en: "Create custom promotional codes (percentage or fixed amount) with expiration dates and usage limits for influencer campaigns.",
      ar: "أنشئ كوبونات تخفيض بنسبة مئوية أو مبلغ ثابت مع تحديد تاريخ الانتهاء وعدد الاستخدامات لحملاتك الإعلانية.",
    },
    "retail.opt.reviews.title": {
      fr: "Avis Clients Vérifiés & Modération Back-Office",
      en: "Verified Customer Reviews & Admin Moderation",
      ar: "تقييمات الزبائن الموثقة والمراجعة الإدارية",
    },
    "retail.opt.reviews.desc": {
      fr: "Collectez les témoignages et notations par étoiles de vos clients. Vous gardez la main totale sur la modération et l'approbation avant publication.",
      en: "Collect testimonials and star ratings from customers with total control over moderation and pre-publication approval.",
      ar: "اجمع تقييمات وآراء المشترين مع تحكم كامل في مراجعة وقبول أي تقييم قبل نشره على المتجر.",
    },
    "retail.opt.wishlist.title": {
      fr: "Liste d'Envies (Wishlist) & Partage Réseaux",
      en: "Wishlist & Social Media Sharing",
      ar: "قائمة الرغبات (المفضلة) والمشاركة",
    },
    "retail.opt.wishlist.desc": {
      fr: "Permet aux visiteurs de mémoriser leurs articles préférés d'un simple clic pour finaliser leur achat plus tard.",
      en: "Allows visitors to bookmark their favorite items with a single click to complete purchases later.",
      ar: "تتيح للزوار حفظ المنتجات التي تعجبهم للرجوع إليها وإتمام الشراء في وقت لاحق.",
    },

    // ==========================================
    // 5. PLATEFORME ENTREPRISE (plateforme-entreprise.html)
    // ==========================================
    "enterprise.badge": {
      fr: "Offre Entreprise : PME, Informatique, Pièces Auto & B2B",
      en: "Enterprise Offer: SMBs, Tech, Auto Parts & B2B",
      ar: "عرض الشركات والمؤسسات: الإعلام الآلي، قطع الغيار والجملة B2B",
    },
    "enterprise.meta_obj": {
      fr: "Plateforme E-Commerce & Gestion des Ventes Haute Performance",
      en: "High Performance E-Commerce & Sales Management Platform",
      ar: "منصة تجارة إلكترونية وإدارة مبيعات عالية الأداء للمؤسسات",
    },
    "enterprise.meta_sov": {
      fr: "Base de données sous votre contrôle total (SQLite / MySQL)",
      en: "Database under your 100% full control (SQLite / MySQL)",
      ar: "قاعدة بيانات سيادية تحت تصرفك الكامل (SQLite / MySQL)",
    },
    "enterprise.meta_inc": {
      fr: "Dashboard KPI + Gestion Stocks + 58 Wilayas + Facturation",
      en: "KPI Dashboard + Stock Control + 58 Wilayas + Invoicing",
      ar: "لوحة قيادة + إدارة مخزون + 58 ولاية + فوترة",
    },
    "enterprise.desc_inc": {
      fr: "Une architecture robuste calibrée pour soutenir des catalogues volumineux et des flux de vente réguliers :",
      en: "A robust architecture designed to support heavy catalogs and consistent sales volume:",
      ar: "بنية هندسية متينة مصممة لتحمل كتالوجات ضخمة وحركة بيع مستمرة بكفاءة عالية:",
    },
    "enterprise.inc1.title": {
      fr: "Architecture SPA React 19 / TypeScript",
      en: "React 19 / TypeScript SPA Architecture",
      ar: "معمارية برمجية React 19 / TypeScript",
    },
    "enterprise.inc1.desc": {
      fr: "Code typé de bout en bout, zéro erreur console, vélocité maximale sans latence.",
      en: "End-to-end strictly typed code, zero console errors, maximum speed without lag.",
      ar: "كود برمجي خاضع لمعايير الدقة الصارمة، سرعة قصوى بدون أي تأخير.",
    },
    "enterprise.inc2.title": {
      fr: "Dashboard Analytique de Direction",
      en: "Executive Analytical Dashboard",
      ar: "لوحة قيادة وتحليلات للمدراء",
    },
    "enterprise.inc2.desc": {
      fr: "Indicateurs en temps réel : Chiffre d'Affaires, volume de commandes, panier moyen, valeur client (LTV).",
      en: "Real-time KPIs: Revenue, order volume, average order value, customer lifetime value (LTV).",
      ar: "مؤشرات مباشرة: رقم الأعمال، عدد الطلبيات، متوسط السلة، وقيمة العميل مدى الحياة.",
    },
    "enterprise.inc3.title": {
      fr: "Gestion Atomique des Stocks & Inventaire",
      en: "Atomic Inventory & Stock Management",
      ar: "إدارة المخزون الذري والجرد",
    },
    "enterprise.inc3.desc": {
      fr: "Verrouillage transactionnel empêchant toute survente, seuils de réapprovisionnement et alertes automatiques.",
      en: "Transactional locking preventing any overselling, reorder thresholds and automated alerts.",
      ar: "قفل أمان يمنع بيع أي منتج غير متوفر، مع تحديد نقاط إعادة الطلب وتنبيهات النفاذ.",
    },
    "enterprise.inc4.title": {
      fr: "Gestion Logistique 58 Wilayas & Facturation",
      en: "58 Wilayas Logistics & Invoicing",
      ar: "اللوجستيات عبر 58 ولاية وإصدار الفواتير",
    },
    "enterprise.inc4.desc": {
      fr: "Tarifs paramétrables (domicile / point relais), édition des fiches de colisage et factures prêtes pour l'impression.",
      en: "Configurable shipping rates (home / desk pickup), packing slips and print-ready invoices.",
      ar: "تسعير مخصص لكل ولاية، إصدار وصولات الشحن وفواتير رسمية جاهزة للطباعة.",
    },
    "enterprise.inc5.title": {
      fr: "Sauvegardes BDD en 1 Clic",
      en: "1-Click Database Backups",
      ar: "نسخ احتياطي لقاعدة البيانات بضغطة زر",
    },
    "enterprise.inc5.desc": {
      fr: "Export et téléchargement immédiat des données complètes pour une sécurité opérationnelle absolue.",
      en: "Immediate export and download of full database for complete operational security.",
      ar: "تصدير وتحميل فوري لكافة البيانات لضمان الحماية والأمان المستمر.",
    },
    "enterprise.inc6.title": {
      fr: "Sécurité Haute Protection (Argon2id & CSP)",
      en: "High-Grade Security (Argon2id & CSP)",
      ar: "حماية أمنية متقدمة (Argon2id & CSP)",
    },
    "enterprise.inc6.desc": {
      fr: "Chiffrement moderne des mots de passe, sessions HttpOnly contre le vol de cookies et en-têtes CSP renforcés.",
      en: "Modern password hashing, HttpOnly sessions preventing cookie theft, and hardened CSP headers.",
      ar: "تشفير حديث لكلمات المرور، جلسات محمية ضد الاختراق وسياسات أمان صارمة.",
    },
    "enterprise.desc_opt": {
      fr: "Sélectionnez les extensions adaptées à votre positionnement et à votre organisation commerciale :",
      en: "Select extensions matched to your market positioning and commercial workflow:",
      ar: "اختر الإضافات المناسبة لمكانتكم التجارية وهيكلة أعمالكم:",
    },

    // Options Entreprise
    "enterprise.opt.trilingue.title": {
      fr: "Pack Trilingue 360° (Français / Anglais / Arabe RTL)",
      en: "Trilingual 360° Pack (French / English / Arabic RTL)",
      ar: "الباقة الثلاثية الشاملة (فرنسية / إنجليزية / عربية RTL)",
    },
    "enterprise.opt.trilingue.desc": {
      fr: "Parité parfaite sur les 3 langues avec gestion bidirectionnelle LTR/RTL sur l'intégralité du catalogue, des fiches techniques et des parcours d'achat.",
      en: "Full parity across all 3 languages with bidirectional LTR/RTL on catalog, specs and purchase flow.",
      ar: "تكافؤ كامل في اللغات الثلاث مع دعم الاتجاهين لكامل الكتالوج والبطاقات التقنية.",
    },
    "enterprise.opt.studio.title": {
      fr: "Grand Studio Visuel & Visual Page Builder (29 Blocs)",
      en: "Master Visual Studio & Page Builder (29 Blocks)",
      ar: "الاستوديو البصري الكبير لبناء الصفحات (29 قالباً)",
    },
    "enterprise.opt.studio.desc": {
      fr: "Accès au cockpit de conception visuelle complet : composez vos pages d'accueil, d'offres spéciales et de marque en glissant-déposant parmi 29 blocs préconçus avec inspecteur de style en direct.",
      en: "Full visual design cockpit access: build homepages, landing pages and campaigns dragging and dropping 29 blocks with live style inspector.",
      ar: "وصول كامل للوحة التصميم البصري: ركّب صفحات متجرك وعروضك الخاصة بالسحب والإفلات من بين 29 قالباً احترافياً.",
    },
    "enterprise.opt.b2b.title": {
      fr: "Module B2B Grossiste & Demandes de Devis Spéciales",
      en: "B2B Wholesale Module & Custom Quote Requests",
      ar: "وحدة البيع بالجملة B2B وطلبات عروض الأسعار",
    },
    "enterprise.opt.b2b.desc": {
      fr: "Permet de gérer des clients professionnels avec conditions tarifaires préférentielles, demandes de cotations par lots et fiches de commandes groupées.",
      en: "Manage professional corporate accounts with preferential pricing, bulk quotation requests and grouped wholesale purchase orders.",
      ar: "إدارة حسابات الشركات والزبائن التجاريين مع طلب عروض أسعار للكميات والطلبيات الكبيرة.",
    },
    "enterprise.opt.seo.title": {
      fr: "Moteur de Prérendu SEO Statique (Playwright)",
      en: "Static Playwright SEO Prerendering Engine",
      ar: "محرك الأرشفة الثابتة المتقدمة (Playwright SEO)",
    },
    "enterprise.opt.seo.desc": {
      fr: "Génération au build de pages HTML complètes hydratées pour chaque produit et catégorie. Garantit un score de vitesse optimal et une indexation prioritaire par Google.",
      en: "Generates fully hydrated HTML pages for each product and category at build time. Ensures top speed score and priority Google indexing.",
      ar: "توليد مسبق لصفحات HTML لكل منتج وفئة لضمان سرعة قصوى وأرشفة أولى في نتائج بحث جوجل.",
    },
    "enterprise.opt.blog.title": {
      fr: "Blog d'Entreprise Multimédia (Markdown & Vidéos)",
      en: "Corporate Multimedia Blog (Markdown & Videos)",
      ar: "مدونة مؤسساتية متعددة الوسائط (ماركداون وفيديو)",
    },
    "enterprise.opt.blog.desc": {
      fr: "Éditeur d'articles avec prise en charge du formatage Markdown enrichi et intégration fluide de vidéos de démonstration produit YouTube ou hébergées.",
      en: "Article editor with rich Markdown formatting and seamless embed of YouTube or hosted product video demos.",
      ar: "محرر مقالات احترافي مع دعم كامل لإدراج فيديوهات توضيحية للمنتجات من يوتيوب.",
    },
    "enterprise.opt.vip.title": {
      fr: "Page de Maintenance VIP & Accès Partenaires par Code",
      en: "VIP Maintenance Page & Private Passcode Access",
      ar: "صفحة صيانة وتشويق VIP مع دخول سري برمز",
    },
    "enterprise.opt.vip.desc": {
      fr: "Page d'attente soignée avec formulaire de capture d'emails et cadenas d'accès privé par code confidentiel pour faire prévisualiser le catalogue à vos distributeurs clés.",
      en: "Elegant coming-soon page with lead capture form and secret passcode gate to preview catalog to key distributor partners.",
      ar: "صفحة انتظار راقية لجمع البريد مع قفل أمني سري يتيح لشركائك معاينة المتجر قبل الإطلاق الرسمي.",
    },

    // ==========================================
    // 6. PRÉSENCE PROFESSIONNELLE (presence-professionnelle.html)
    // ==========================================
    "pro.badge": {
      fr: "Offre Services & Indépendants : Consultants, Formateurs & Cabinets",
      en: "Professional Services Offer: Consultants, Trainers & Agencies",
      ar: "عرض الخدمات والمهنيين: مستشارون، مدربون ومكاتب دراسات",
    },
    "pro.meta_obj": {
      fr: "Plateforme de Présence Digitale d'Autorité & Présentation d'Expertise",
      en: "Authority Digital Presence & Expertise Presentation Platform",
      ar: "منصة واجهة مهنية لبناء المصداقية وعرض الخبرات",
    },
    "pro.meta_adv": {
      fr: "Portfolio dynamique, Blog multimédia & Page Builder autonome",
      en: "Dynamic portfolio, multimedia blog & standalone Page Builder",
      ar: "معرض أعمال ديناميكي، مدونة وسائط واستوديو بناء الصفحات",
    },
    "pro.desc_inc": {
      fr: "Tout ce dont un professionnel a besoin pour imposer sa légitimité et capter des missions qualifiées :",
      en: "Everything a professional needs to establish legitimacy and attract qualified clients:",
      ar: "كل ما يحتاجه المحترف والخبير لترسيخ مكانته وجذب صفقات واستشارات عالية القيمة:",
    },
    "pro.inc1.title": {
      fr: "Application React 19 / TypeScript",
      en: "React 19 / TypeScript Application",
      ar: "تطبيق ويب React 19 / TypeScript حديث",
    },
    "pro.inc1.desc": {
      fr: "Design épuré et contemporain reflétant un positionnement premium et rigoureux.",
      en: "Sleek and contemporary design reflecting premium rigor and credibility.",
      ar: "تصميم أنيق وعصري يعكس مستوى عالياً من الاحترافية والجدية.",
    },
    "pro.inc2.title": {
      fr: "Vitrine de Réalisations & Projets",
      en: "Case Studies & Project Showcase",
      ar: "معرض الإنجازات والمشاريع",
    },
    "pro.inc2.desc": {
      fr: "Portfolio structuré avec étiquettes technologiques, visuels et études de cas détaillées.",
      en: "Structured portfolio with technology tags, visuals and detailed case studies.",
      ar: "معرض أعمال مصنف مع وسوم المهارات والتقنيات وشرح مفصل لكل إنجاز.",
    },
    "pro.inc3.title": {
      fr: "Blog d'Autorité & Vidéos R&D",
      en: "Authority Blog & R&D Videos",
      ar: "مدونة متخصصة وفيديوهات خبرة",
    },
    "pro.inc3.desc": {
      fr: "Publication d'articles formatés en Markdown riche avec intégration directe de vidéos explicatives.",
      en: "Publish rich Markdown formatted articles with direct embedding of explanatory videos.",
      ar: "نشر مقالات معرفية معمقة مع تضمين مقاطع فيديو توضيحية.",
    },
    "pro.inc4.title": {
      fr: "Preuve Sociale & Avis Clients",
      en: "Social Proof & Client Testimonials",
      ar: "شهادات العملاء والتقييمات الموثقة",
    },
    "pro.inc4.desc": {
      fr: "Section dédiée aux témoignages vérifiés et recommandations pour instaurer une confiance immédiate.",
      en: "Dedicated section for verified testimonials and endorsements building instant trust.",
      ar: "قسم خاص بآراء العملاء وتوصياتهم لتعزيز الثقة الفورية لدى الزوار.",
    },
    "pro.inc5.title": {
      fr: "Formulaire de Devis & Contact Sécurisé",
      en: "Secure Quote & Contact Form",
      ar: "نموذج طلب عروض الأسعار والتواصل",
    },
    "pro.inc5.desc": {
      fr: "Réception des demandes directes avec stockage en base de données et protection anti-spam.",
      en: "Direct inquiry reception with database persistence and anti-spam protection.",
      ar: "استقبال الطلبات وحفظها في قاعدة البيانات مع حماية تلقائية ضد السبام.",
    },
    "pro.inc6.title": {
      fr: "Back-Office Autonome de Gestion",
      en: "Standalone Management Back-Office",
      ar: "لوحة تحكم إدارية مستقلة",
    },
    "pro.inc6.desc": {
      fr: "Mettez à jour vous-même vos articles, projets et messages sans dépendre d'un tiers.",
      en: "Update your own articles, projects and messages without third-party reliance.",
      ar: "قم بتحديث مقالاتك، مشاريعك ورسائلك بنفسك بدون الحاجة لأي وسيط.",
    },
    "pro.desc_opt": {
      fr: "Sélectionnez les modules complémentaires pour élargir votre rayonnement et vendre vos prestations :",
      en: "Select optional modules to expand your reach and monetize your services:",
      ar: "اختر الوحدات التكميلية لتوسيع نطاق حضورك وبيع خدماتك واستشاراتك:",
    },

    // Options Pro
    "pro.opt.rtl.title": {
      fr: "Pack Bilingue Français + Arabe RTL Natif",
      en: "Bilingual French + Native Arabic RTL Pack",
      ar: "الباقة الثنائية: الفرنسية + العربية (RTL)",
    },
    "pro.opt.rtl.desc": {
      fr: "Présentation irréprochable de votre expertise dans les deux langues majeures avec inversion complète du sens de lecture pour les institutions et partenaires nationaux.",
      en: "Flawless presentation of your expertise in both key languages with full RTL layout for national partners.",
      ar: "عرض متكامل لخبراتك باللغتين مع اتجاه قراءة عربي سليم للشركاء والمؤسسات الوطنية.",
    },
    "pro.opt.ecommerce.title": {
      fr: "Module Vente de Packs de Conseil & Formations",
      en: "Consulting Packs & Training E-Commerce Module",
      ar: "وحدة حجز وبيع باقات الاستشارة والدورات",
    },
    "pro.opt.ecommerce.desc": {
      fr: "Transformez votre vitrine en plateforme de vente : permettez à vos clients d'acheter directement des sessions, packs d'accompagnement ou ateliers en ligne.",
      en: "Turn your showcase into a sales platform: allow clients to purchase sessions, coaching packs or workshops online.",
      ar: "حوّل موقعك إلى منصة مبيعات: اسمح لعملائك بحجز وشراء جلسات الاستشارة وورش العمل مباشرة.",
    },
    "pro.opt.timeline.title": {
      fr: "Matrice de Compétences & Frise de Parcours",
      en: "Skills Matrix & Career Timeline",
      ar: "مصفوفة المهارات والمسار المهني الزمني",
    },
    "pro.opt.timeline.desc": {
      fr: "Composants visuels pour structurer vos domaines d'intervention par niveau de maîtrise et exposer l'historique chronologique de vos diplômes et jalons d'entreprise.",
      en: "Visual blocks structuring intervention domains by skill level and displaying chronological career history and company milestones.",
      ar: "قوالب بصرية لتنظيم مجالات خبراتك وسرد المسار المهني والمحطات البارزة زمنياً.",
    },
    "pro.opt.studio.title": {
      fr: "Studio Visuel & Créateur de Pages d'Offres",
      en: "Visual Studio & Offer Page Builder",
      ar: "الاستوديو البصري لإنشاء صفحات الهبوط",
    },
    "pro.opt.studio.desc": {
      fr: "Créez facilement de nouvelles pages pour vos futures formations, événements ou prestations grâce aux 29 blocs pré-conçus réutilisables à l'infini.",
      en: "Easily build new landing pages for upcoming workshops, events or offers using 29 reusable pre-built blocks.",
      ar: "أنشئ صفحات خاصة لدوراتك القادمة أو عروضك الترويجية بالاستفادة من مكتبة الـ 29 قالباً.",
    },
    "pro.opt.seo.title": {
      fr: "Optimisation Référencement & Prérendu SEO Google",
      en: "Google SEO Prerendering & Optimization",
      ar: "محرك الأرشفة والظهور الأول في جوجل",
    },
    "pro.opt.seo.desc": {
      fr: "Génération des pages en HTML pré-rendu pour garantir que vos articles d'expertise et études de cas se hissent en première position des recherches sectorielles.",
      en: "Pre-rendered HTML generation ensuring your articles and case studies rank at the top of industry searches.",
      ar: "توليد صفحات جاهزة لمحركات البحث لتصدر نتائج جوجل في مجال تخصصك وخبرتك.",
    },

    // ==========================================
    // 7. CONFIGURATEUR SUR-MESURE (configurateur-sur-mesure.html)
    // ==========================================
    "custom.badge": {
      fr: "Configurateur Universel Tout-en-Un",
      en: "All-in-One Universal Configurator",
      ar: "المُجمّع الهندسي الشامل المتكامل",
    },
    "custom.meta_core_val": {
      fr: "React 19 / TypeScript Strict / API REST PHP 8.2+",
      en: "React 19 / Strict TypeScript / PHP 8.2+ REST API",
      ar: "React 19 / معايير TypeScript الصارمة / واجهة PHP 8.2+ REST",
    },
    "custom.meta_comp_val": {
      fr: "29 Blocs Atomiques & 53 Écrans Applicatifs",
      en: "29 Atomic Blocks & 53 Application Screens",
      ar: "29 قالباً برمجياً و 53 شاشة وواجهة تطبيقية",
    },
    "custom.meta_pers_val": {
      fr: "Multi-Pilote : SQLite Souverain / MySQL / Postgres",
      en: "Multi-Driver: Sovereign SQLite / MySQL / Postgres",
      ar: "تعدد محركات البيانات: SQLite سيادي / MySQL / Postgres",
    },
    "custom.desc_inc": {
      fr: "Chaque solution bénéficie de la fondation technique ultra-rapide et sécurisée :",
      en: "Every solution benefits from this ultra-fast and secure technical foundation:",
      ar: "تستفيد كل منظومة من هذه القاعدة التقنية فائقة السرعة والأمان:",
    },
    "custom.inc1.title": {
      fr: "Application Web SPA React 19",
      en: "React 19 Web SPA Application",
      ar: "تطبيق ويب SPA حديث React 19",
    },
    "custom.inc1.desc": {
      fr: "Performance 60 FPS, zéro rechargement.",
      en: "60 FPS fluid performance, zero reload.",
      ar: "أداء سلس 60 إطاراً في الثانية وبدون إعادة تحميل.",
    },
    "custom.inc2.title": {
      fr: "API REST PHP 8.2+ Natif",
      en: "Native PHP 8.2+ REST API",
      ar: "واجهة برمجية REST أصيلة PHP 8.2+",
    },
    "custom.inc2.desc": {
      fr: "Ultra-légère, zéro serveur Node.js en prod.",
      en: "Ultra-lightweight, zero Node.js server in prod.",
      ar: "خفيفة للغاية، وبدون أي حاجة لخادم Node.js في بيئة العمل.",
    },
    "custom.inc3.title": {
      fr: "Installateur Web 1-Clic",
      en: "1-Click Web Installer",
      ar: "مُثبّت إلكتروني تلقائي بضغطة واحدة",
    },
    "custom.inc3.desc": {
      fr: "Initialisation automatique (install.php).",
      en: "Automated database initialization (install.php).",
      ar: "تهيئة وإعداد قاعدة البيانات آلياً (install.php).",
    },
    "custom.inc4.title": {
      fr: "Sécurité Argon2id & CSP",
      en: "Argon2id & CSP Security",
      ar: "حماية مشددة Argon2id و CSP",
    },
    "custom.inc4.desc": {
      fr: "Protection maximale des données et sessions.",
      en: "Maximal protection for customer data and sessions.",
      ar: "حماية قصوى لبيانات الزبائن والجلسات الإدارية.",
    },
    "custom.desc_mod": {
      fr: "Cochez les briques fonctionnelles requises pour votre écosystème :",
      en: "Select the functional modules required for your ecosystem:",
      ar: "حدد الوحدات البرمجية والوظيفية اللازمة لمنظومتك:",
    },

    // 10 Modules Métiers Majeurs
    "custom.mod.ecommerce.title": {
      fr: "E-Commerce & 58 Wilayas",
      en: "E-Commerce & 58 Wilayas",
      ar: "المتجر الإلكتروني والشحن لـ 58 ولاية",
    },
    "custom.mod.ecommerce.desc": {
      fr: "Catalogue physique, panier, suivi sans compte et paiement à la livraison.",
      en: "Physical catalog, cart, guest tracking and cash on delivery.",
      ar: "كتالوج سلع ملموسة، سلة مشتريات، تتبع الشحنات بدون حساب ودفع عند الاستلام.",
    },
    "custom.mod.digital.title": {
      fr: "Produits Digitaux & Clés",
      en: "Digital Products & Keys",
      ar: "المنتجات الرقمية والتراخيص",
    },
    "custom.mod.digital.desc": {
      fr: "Vente de licences logicielles, crédits IA et abonnements en ligne.",
      en: "Sale of software licenses, AI credits and online subscriptions.",
      ar: "بيع مفاتيح البرامج، رصيد واشتراكات الذكاء الاصطناعي أونلاين.",
    },
    "custom.mod.stock.title": {
      fr: "Stocks Atomiques",
      en: "Atomic Inventory Control",
      ar: "إدارة المخزون الذرية",
    },
    "custom.mod.stock.desc": {
      fr: "Verrouillage anti-survente et alertes automatiques de réapprovisionnement.",
      en: "Anti-overselling lock and automated restock alerts.",
      ar: "قفل أمان يمنع البيع الزائد وإشعارات آلية لنقص الكميات.",
    },
    "custom.mod.dashboard.title": {
      fr: "Dashboard Analytique",
      en: "Analytical Dashboard",
      ar: "لوحة القيادة والمؤشرات التحليلية",
    },
    "custom.mod.dashboard.desc": {
      fr: "Graphiques Recharts : CA, panier moyen, volume commandes et LTV.",
      en: "Interactive charts: Revenue, average cart, order volume and LTV.",
      ar: "رسوم بيانية تفاعلية: رقم الأعمال، متوسط السلة وقيمة العملاء.",
    },
    "custom.mod.rtl.title": {
      fr: "Bilingue Arabe (RTL)",
      en: "Bilingual Arabic (RTL)",
      ar: "الباقة الثنائية بالعربية (RTL)",
    },
    "custom.mod.rtl.desc": {
      fr: "Inversion bidirectionnelle parfaite LTR / RTL sur tout le site.",
      en: "Seamless bidirectional LTR / RTL inversion across the entire site.",
      ar: "انعكاس بصري وهندسي كامل من اليمين لليسار لكافة عناصر الموقع.",
    },
    "custom.mod.trilingue.title": {
      fr: "Extension Anglais (EN)",
      en: "English Extension (EN)",
      ar: "إضافة اللغة الإنجليزية (EN)",
    },
    "custom.mod.trilingue.desc": {
      fr: "Ajout de la langue anglaise pour les clients et partenaires internationaux.",
      en: "English language pack for international clients and partners.",
      ar: "إضافة اللغة الإنجليزية للوصول إلى زبائن وشركاء عالميين.",
    },
    "custom.mod.blog.title": {
      fr: "Blog Markdown & Vidéos",
      en: "Markdown Blog & Videos",
      ar: "المدونة المعرفية ومقاطع الفيديو",
    },
    "custom.mod.blog.desc": {
      fr: "Publication d'articles formatés et intégration de vidéos YouTube.",
      en: "Rich formatted article publishing and YouTube video embeds.",
      ar: "نشر مقالات منسقة باحترافية وتضمين مباشر لفيديوهات يوتيوب.",
    },
    "custom.mod.coupons.title": {
      fr: "Coupons & Ventes Flash",
      en: "Coupons & Flash Sales",
      ar: "قسائم التخفيض والعروض المؤقتة",
    },
    "custom.mod.coupons.desc": {
      fr: "Codes de réduction, remises automatiques et comptes à rebours.",
      en: "Discount codes, automatic markdowns and countdown timers.",
      ar: "رموز ترويجية، تخفيضات آلية وعد تنازلي للعروض الحصرية.",
    },
    "custom.mod.seo.title": {
      fr: "SEO Statique Playwright",
      en: "Playwright Static SEO",
      ar: "محرك الأرشفة الثابتة Playwright",
    },
    "custom.mod.seo.desc": {
      fr: "Génération des pages pré-rendues pour un classement Google immédiat.",
      en: "Prerendered page generation for instant Google ranking.",
      ar: "توليد صفحات جاهزة لمحركات البحث لتصدر نتائج بحث جوجل.",
    },
    "custom.mod.vip.title": {
      fr: "Maintenance VIP & Code",
      en: "VIP Maintenance & Passcode",
      ar: "صفحة انتظار VIP ودخول سري",
    },
    "custom.mod.vip.desc": {
      fr: "Page d'attente soignée avec code secret pour prévisualisation clients.",
      en: "Polished teaser page with private code for early access.",
      ar: "صفحة ترقب جذابة مع رمز سري لإتاحة المعاينة للمقربين.",
    },

    // Packs de Blocs Page Builder
    "custom.desc_packs": {
      fr: "Activez le studio visuel et choisissez vos familles de blocs composables (29 blocs disponibles au total) :",
      en: "Activate visual studio and choose your composable block families (29 blocks in total):",
      ar: "فعّل الاستوديو البصري واختر مجموعات القوالب الجاهزة للتركيب (29 قالباً متاحاً إجمالاً):",
    },
    "custom.pack.builder.title": {
      fr: "Cockpit Page Builder & Live Canvas WYSIWYG",
      en: "Page Builder Cockpit & Live Canvas WYSIWYG",
      ar: "منصة الاستوديو البصري والتحرير الحي المباشر",
    },
    "custom.pack.builder.desc": {
      fr: "Éditeur visuel autonome permettant de concevoir, réorganiser et modifier les pages en direct avec prévisualisation Mobile / Tablette / PC.",
      en: "Standalone visual editor to design, reorder and edit pages live with Mobile / Tablet / Desktop preview.",
      ar: "محرر بصري مستقل لتصميم وإعادة ترتيب الصفحات مباشرة مع معاينة فورية للهواتف والشاشات.",
    },
    "custom.pack.identity.title": {
      fr: "Pack Blocs Identité & Portfolio (7 Blocs)",
      en: "Identity & Portfolio Blocks Pack (7 Blocks)",
      ar: "باقة قوالب الهوية ومعرض الأعمال (7 قوالب)",
    },
    "custom.pack.identity.desc": {
      fr: "Profil exécutif, Frise chronologique, Matrice de compétences, Vitrine de projets, Histoire d'entreprise, Valeurs et Zone Markdown libre.",
      en: "Executive profile, career timeline, skills matrix, project showcase, company story, core values and free Markdown area.",
      ar: "الملف التعريفي، المسار الزمني، مصفوفة المهارات، معرض المشاريع، قصة الشركة، القيم ومنطقة ماركداون حرة.",
    },
    "custom.pack.commerce.title": {
      fr: "Pack Blocs Commerce & Vitrine (9 Blocs)",
      en: "Commerce & Storefront Blocks Pack (9 Blocks)",
      ar: "باقة قوالب التجارة وعرض المنتجات (9 قوالب)",
    },
    "custom.pack.commerce.desc": {
      fr: "Héros interactif, Ventes flash avec compte à rebours, Cartes catégories, Filtres chips, Meilleures ventes, Onglets par univers, Défilement marques partenaires et Grille tarifaire.",
      en: "Interactive hero, flash sales with timer, category cards, chips filters, bestsellers, topic tabs, brand ticker and pricing table.",
      ar: "واجهة رئيسية تفاعلية، عروض بعد تنازلي، بطاقات الفئات، فلاتر سريعة، الأكثر مبيعاً، تبويبات، شريط الشركاء وجدول أسعار.",
    },
    "custom.pack.trust.title": {
      fr: "Pack Blocs Confiance & Interaction (8 Blocs)",
      en: "Trust & Engagement Blocks Pack (8 Blocks)",
      ar: "باقة قوالب الثقة والتفاعل (8 قوالب)",
    },
    "custom.pack.trust.desc": {
      fr: "Témoignages vérifiés, Citation star vedette, Articles de blog récents, Formulaire de contact/devis, Cartes coordonnées directes, FAQ accordéon, Ticker défilant et Bandeau promo.",
      en: "Verified testimonials, featured quote, recent blog articles, contact/quote form, contact cards, FAQ accordion, scrolling ticker and promo ribbon.",
      ar: "شهادات الزبائن، اقتباس مميز، آخر المقالات، نموذج التواصل، بطاقات الاتصال، أسئلة شائعة، شريط إخباري وبانر ترويجي.",
    },

    // ==========================================
    // 8. RÉASSURANCES, GARANTIES & PIEDS DE PAGE
    // ==========================================
    "guarantee.digital": {
      fr: "🔒 <strong>Souveraineté Totale :</strong> Vous êtes propriétaire exclusif du code source et de votre base de données. Zéro abonnement récurrent imposé, zéro dépendance plateforme tierce.",
      en: "🔒 <strong>Total Sovereignty:</strong> You own 100% of the source code and database. Zero recurring subscriptions, zero third-party platform lock-in.",
      ar: "🔒 <strong>السيادة والملكية الكاملة:</strong> أنت المالك الحصري للشفرة المصدرية وقاعدة البيانات، بدون أي اشتراكات دورية مفروضة وبدون تبعية لأي طرف ثالث.",
    },
    "guarantee.retail": {
      fr: "⚡ <strong>Rentabilité Immédiate :</strong> Zéro commission prélevée sur vos ventes. Le code source complet vous est cédé pour une autonomie totale.",
      en: "⚡ <strong>Immediate Profitability:</strong> Zero commission deducted from sales. Full source code delivered for complete autonomy.",
      ar: "⚡ <strong>عائد استثماري فوري:</strong> صفر عمولات على المبيعات، مع تسليم كامل الشفرة المصدرية لاستقلالية تامة.",
    },
    "guarantee.enterprise": {
      fr: "💎 <strong>Actif Numérique Souverain :</strong> Cession complète du code source et de l'architecture. Votre entreprise dispose d'une infrastructure propre, indépendante et valorisable.",
      en: "💎 <strong>Sovereign Digital Asset:</strong> Full ownership transfer of source code and architecture. Your company gains a clean, independent and valuable asset.",
      ar: "💎 <strong>أصل رقمي استراتيجي:</strong> تنازل كامل عن الشفرة المصدرية والمعمارية الهندسية، مما يمنح مؤسستك بنية تحتية مستقلة وذات قيمة عالية.",
    },
    "guarantee.services": {
      fr: "🎯 <strong>Indépendance & Propriété :</strong> Solution 100% autonome. Vous êtes libre de toute redevance mensuelle et maître absolu de vos publications.",
      en: "🎯 <strong>Independence & Ownership:</strong> 100% standalone solution. Free from monthly fees with total command over your content.",
      ar: "🎯 <strong>الاستقلالية والملكية:</strong> حل برمجي مستقل 100%، بدون أي رسوم شهرية مع تحكم تام في كافة منشوراتك.",
    },
    "guarantee.custom": {
      fr: "⭐ <strong>Architecture Découplée & Évolutive :</strong> Vous pouvez ajouter de nouvelles briques à tout moment sans réécrire l'existant.",
      en: "⭐ <strong>Decoupled & Scalable Architecture:</strong> You can add new modular blocks at any time without rewriting existing code.",
      ar: "⭐ <strong>معمارية معيارية قابلة للتوسع:</strong> يمكنك إضافة وحدات برمجية جديدة في أي وقت وبكل سلاسة.",
    },
    "footer.text": {
      fr: "StacGate Platform • Solutions Entreprise & Architectures Distribuées • Conçu et Validé par ArchiSys3.0",
      en: "StacGate Platform • Enterprise Solutions & Distributed Architectures • Designed & Approved by ArchiSys3.0",
      ar: "منصة StacGate • حلول المؤسسات والمعماريات الموزعة • تصميم واعتماد ArchiSys3.0",
    },
    "footer.sub": {
      fr: "Proposition commerciale d'ingénierie soumise à l'approbation du cahier des charges technique.",
      en: "Engineering commercial proposal subject to technical specifications approval.",
      ar: "عرض تجاري وهندسي خاضع للموافقة على دفتر الشروط والمواصفات التقنية.",
    },
  };

  // Récupérer la langue active
  function getCurrentLang() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGS.includes(stored)) {
        return stored;
      }
    } catch (e) {}
    return DEFAULT_LANG;
  }

  // Appliquer les traductions sur tout le DOM
  function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}

    // 1. Mise à jour <html>
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    // 2. Traduction des balises texte data-i18n
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (TRANSLATIONS[key] && TRANSLATIONS[key][lang]) {
        el.innerHTML = TRANSLATIONS[key][lang];
      }
    });

    // 3. Traduction des data-name sur les inputs de configuration
    const inputs = document.querySelectorAll("input[data-i18n-name]");
    inputs.forEach((input) => {
      const key = input.getAttribute("data-i18n-name");
      if (TRANSLATIONS[key] && TRANSLATIONS[key][lang]) {
        input.setAttribute("data-name", TRANSLATIONS[key][lang]);
      }
    });

    // 4. Mettre à jour l'état actif des boutons
    const buttons = document.querySelectorAll(".lang-btn");
    buttons.forEach((btn) => {
      if (btn.getAttribute("data-lang") === lang) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // 5. Émettre l'événement pour devis-calculator.js
    window.dispatchEvent(
      new CustomEvent("devis:langChanged", {
        detail: { lang, isRTL: lang === "ar" },
      }),
    );
  }

  // Injecter le sélecteur dans le header
  function injectLanguageSwitcher() {
    const headerTop =
      document.querySelector(".devis-header-top") || document.querySelector(".portal-hero");
    if (!headerTop) return;
    if (document.getElementById("devis-lang-switcher")) return;

    const switcher = document.createElement("div");
    switcher.id = "devis-lang-switcher";
    switcher.className = "lang-selector";
    switcher.innerHTML = `
      <button type="button" class="lang-btn" data-lang="fr">FR</button>
      <button type="button" class="lang-btn" data-lang="en">EN</button>
      <button type="button" class="lang-btn" data-lang="ar">العربية</button>
    `;

    if (headerTop.classList.contains("portal-hero")) {
      headerTop.insertBefore(switcher, headerTop.firstChild);
    } else {
      headerTop.appendChild(switcher);
    }

    switcher.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        setLanguage(this.getAttribute("data-lang"));
      });
    });
  }

  // API Publique
  window.DevisI18n = {
    getLang: getCurrentLang,
    setLang: setLanguage,
    t: function (key, fallback) {
      const lang = getCurrentLang();
      return (TRANSLATIONS[key] && TRANSLATIONS[key][lang]) || fallback || key;
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    injectLanguageSwitcher();
    setLanguage(getCurrentLang());
  });
})();
