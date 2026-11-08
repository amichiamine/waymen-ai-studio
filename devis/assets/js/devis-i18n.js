/**
 * DEVIS-I18N.JS — MOTEUR D'INTERNATIONALISATION TRILINGUE 360° (FR / EN / AR RTL)
 * 100% Autonome • Zéro Dépendance • Bascule Instantanée LTR / RTL • Persistance LocalStorage
 * Conçu pour la suite autonome StacGate / ArchiSys3.0
 */

(function () {
  "use strict";

  const STORAGE_KEY = "devis_lang";
  const DEFAULT_LANG = "fr";
  const SUPPORTED_LANGS = ["fr", "en", "ar"];

  // Dictionnaire Trilingue Exhaustif
  const TRANSLATIONS = {
    // Éléments Transverses & En-têtes
    "brand.platform": {
      fr: "StacGate Platform",
      en: "StacGate Platform",
      ar: "منصة StacGate"
    },
    "brand.tagline": {
      fr: "Proposition d'ingénierie logicielle & architecture sur-mesure",
      en: "Software engineering proposal & custom architecture",
      ar: "عرض هندسة برمجية ومعمارية مخصصة"
    },
    "meta.object": {
      fr: "Objet du Devis",
      en: "Quotation Subject",
      ar: "موضوع العرض"
    },
    "meta.architecture": {
      fr: "Architecture",
      en: "Architecture",
      ar: "المعمارية البرمجية"
    },
    "meta.ownership": {
      fr: "Propriété du Code",
      en: "Code Ownership",
      ar: "ملكية الكود"
    },
    "meta.validity": {
      fr: "Validité de l'Offre",
      en: "Offer Validity",
      ar: "صلاحية العرض"
    },
    "meta.validity.val": {
      fr: "30 jours à compter de l'émission",
      en: "30 days from issuance",
      ar: "30 يوماً من تاريخ الإصدار"
    },
    "meta.ownership.val": {
      fr: "Cession Intégrale 100% Propriétaire (Zéro abonnement)",
      en: "100% Full Ownership Transfer (Zero subscription)",
      ar: "تنازل كامل عن الملكية 100% (بدون اشتراكات)"
    },
    "meta.logistics": {
      fr: "Logistique Intégrée",
      en: "Integrated Logistics",
      ar: "اللوجستيات المدمجة"
    },
    "meta.sovereignty": {
      fr: "Souveraineté",
      en: "Sovereignty",
      ar: "السيادة والتحكم"
    },
    "meta.included": {
      fr: "Périmètre Inclus",
      en: "Included Scope",
      ar: "النطاق المشمول"
    },
    "meta.advantage": {
      fr: "Atout Majeur",
      en: "Key Advantage",
      ar: "الميزة الكبرى"
    },

    // Sections & Titres
    "section.included": {
      fr: "1. Socle Métier Inclus de Base",
      en: "1. Base Business Foundation Included",
      ar: "1. الأساس التقني المشمول تلقائياً"
    },
    "section.custom": {
      fr: "2. Personnalisez votre Solution (Options à la Carte)",
      en: "2. Customize Your Solution (A La Carte Options)",
      ar: "2. خصص منصتك (خيارات وإضافات حسب الطلب)"
    },
    "section.recommended": {
      fr: "2. Modules Additionnels Recommandés pour Votre Boutique",
      en: "2. Additional Modules Recommended for Your Store",
      ar: "2. وحدات إضافية موصى بها لمتجرك"
    },
    "section.strategic": {
      fr: "2. Modules Stratégiques à Haute Valeur Ajoutée",
      en: "2. Strategic High-Value Enterprise Modules",
      ar: "2. وحدات استراتيجية متقدمة للمؤسسات"
    },
    "section.services": {
      fr: "2. Options de Valorisation & Monétisation",
      en: "2. Valorization & Monetization Options",
      ar: "2. خيارات التطوير وتحقيق العوائد"
    },

    // Panneau Sticky & Actions
    "summary.title": {
      fr: "Récapitulatif de l'Offre",
      en: "Quotation Summary",
      ar: "ملخص العرض والخيارات"
    },
    "summary.total_label": {
      fr: "Investissement Total Estimé",
      en: "Estimated Total Investment",
      ar: "إجمالي الاستثمار التقديري"
    },
    "btn.whatsapp": {
      fr: "Valider & Échanger sur WhatsApp",
      en: "Confirm & Chat on WhatsApp",
      ar: "تأكيد والتواصل عبر واتساب"
    },
    "btn.print": {
      fr: "Imprimer / Enregistrer en PDF",
      en: "Print / Save as PDF",
      ar: "طباعة / حفظ كملف PDF"
    },
    "btn.reset": {
      fr: "Réinitialiser les options",
      en: "Reset options",
      ar: "إعادة تعيين الخيارات"
    },
    "badge.recommended": {
      fr: "Recommandé",
      en: "Recommended",
      ar: "موصى به"
    },
    "badge.popular": {
      fr: "Fortement Recommandé",
      en: "Highly Recommended",
      ar: "مطلوب بشدة"
    },
    "badge.essential": {
      fr: "Essentiel Algérie",
      en: "Essential for Algeria",
      ar: "أساسي في الجزائر"
    },

    // Guide d'orientation (index.html)
    "portal.badge": {
      fr: "StacGate Platform • Écosystème Haute Performance",
      en: "StacGate Platform • High Performance Ecosystem",
      ar: "منصة StacGate • منظومة عالية الأداء"
    },
    "portal.hero_title": {
      fr: "Quel est le modèle de votre projet ?",
      en: "What is your project business model?",
      ar: "ما هو النموذج المناسب لمشروعك؟"
    },
    "portal.hero_desc": {
      fr: "Explorez nos architectures logicielles pré-calibrées par modèle d'affaires. Chaque proposition inclut son calculateur interactif pour composer exactement vos fonctionnalités selon vos besoins réels.",
      en: "Explore our software architectures pre-calibrated by business model. Each proposal includes its interactive calculator to customize your exact features according to real needs.",
      ar: "استكشف معمارياتنا البرمجية المصممة خصيصاً لتناسب نموذج عملك. يتضمن كل عرض حاسبة تفاعلية لتحديد وتخصيص الميزات التي تحتاجها بدقة."
    },
    "portal.start_calculator": {
      fr: "Composer mon Devis",
      en: "Compose My Quote",
      ar: "تخصيص العرض والبدء"
    },
    "portal.master_banner_badge": {
      fr: "Besoin d'une Architecture Mixte ou Hors-Norme ?",
      en: "Need a Custom or Enterprise Architecture?",
      ar: "هل تبحث عن معمارية برمجية مخصصة أو شاملة؟"
    },
    "portal.master_banner_title": {
      fr: "Grand Compositeur Intégral StacGate",
      en: "StacGate Master Visual Composer",
      ar: "المجمّع البرمجي الشامل StacGate"
    },
    "portal.master_banner_desc": {
      fr: "Accédez à l'ensemble des 29 blocs modulaires du Studio Visuel et à tous les modules applicatifs (E-Commerce physique, Digital, Multilingue FR/EN/AR RTL, Prérendu SEO Playwright, Stocks atomiques). Composez votre plateforme pièce par pièce avec chiffrage en direct.",
      en: "Access all 29 modular blocks of the Visual Studio and all application modules (Physical E-Commerce, Digital, Trilingual FR/EN/AR RTL, Playwright SEO Prerendering, Atomic Stocks). Build your platform piece by piece with live quotation.",
      ar: "استفد من مكتبة الـ 29 قالباً معيارياً في الاستوديو البصري وكافة الوحدات التطبيقية (تجارة إلكترونية، منتجات رقمية، متعدد اللغات مع دعم العربية RTL، أرشفة SEO، ومخزون ذكي). ركّب منصتك خطوة بخطوة مع حساب فوري للتكلفة."
    },
    "portal.master_banner_btn": {
      fr: "Lancer le Grand Compositeur",
      en: "Launch Master Composer",
      ar: "تشغيل المجمّع الشامل"
    },
    "portal.matrix_title": {
      fr: "Matrice Comparative des Équipements Inclus",
      en: "Comparative Equipment & Features Matrix",
      ar: "جدول المقارنة للميزات المشمولة"
    },
    "portal.matrix_desc": {
      fr: "Toutes nos solutions bénéficient de la même rigueur technique et de la cession intégrale du code source :",
      en: "All our solutions benefit from the exact same technical rigor and full source code ownership transfer:",
      ar: "تستفيد كافة حلولنا من نفس معايير الدقة الهندسية مع التنازل الكامل عن الشفرة المصدرية (كود 100% ملكك):"
    },

    // Garanties & Pieds de page
    "guarantee.digital": {
      fr: "🛡️ Garantie Sans Frais Cachés : Vous êtes propriétaire exclusif du code source livré. Zéro abonnement mensuel prélevé.",
      en: "🛡️ Zero Hidden Fees Guarantee: You exclusively own the delivered source code. Zero recurring monthly subscription.",
      ar: "🛡️ ضمان بدون رسوم خفية: تمتلك الشفرة المصدرية بالكامل بدون أي اشتراكات شهرية متكررة."
    },
    "guarantee.retail": {
      fr: "🚀 Performances & Pérennité : Zéro commission prélevée sur vos ventes. Vous êtes 100% propriétaire de votre boutique et de vos données clients.",
      en: "🚀 Performance & Longevity: Zero commission on your sales. You are 100% owner of your store and customer data.",
      ar: "🚀 أداء عالٍ واستدامة: صفر عمولة على مبيعاتك. أنت المالك الكامل والوحيد لمتجرك وبيانات زبائنك."
    },
    "guarantee.enterprise": {
      fr: "💎 Actif Numérique Souverain : Cession complète du code source et de l'architecture. Votre entreprise dispose d'une infrastructure propre, indépendante et valorisable.",
      en: "💎 Sovereign Digital Asset: Full source code and architecture transfer. Your enterprise owns a clean, independent and valuable asset.",
      ar: "💎 أصل رقمي سيادي: تنازل كامل عن الكود والمعمارية. تمتلك مؤسستك بنية برمجية مستقلة وقابلة للتطوير المستقبلي."
    },
    "guarantee.services": {
      fr: "🎯 Indépendance & Propriété : Solution 100% autonome. Vous êtes libre de toute redevance mensuelle et maître absolu de vos publications.",
      en: "🎯 Independence & Ownership: 100% standalone solution. Free of monthly fees and full master of your content.",
      ar: "🎯 استقلالية وملكية تامة: حل برمجي مستقل 100%. بدون أي رسوم شهرية مع تحكم مطلق في منشوراتك."
    },
    "footer.text": {
      fr: "StacGate Platform • Ingénierie Logicielle & Architectures Web Haute Performance",
      en: "StacGate Platform • Software Engineering & High Performance Web Architectures",
      ar: "منصة StacGate • هندسة برمجية ومعماريات ويب فائقة الأداء"
    },
    "footer.sub": {
      fr: "Conçu, Architecturé et Validé par ArchiSys3.0 • Zéro redevance mensuelle • Données 100% souveraines",
      en: "Designed, Architected and Validated by ArchiSys3.0 • Zero monthly fees • 100% Sovereign data",
      ar: "تصميم ومعمارية وتطوير معتمد من ArchiSys3.0 • بدون رسوم متكررة • بياناتك تحت سيادتك التامة"
    }
  };

  // Récupérer la langue actuelle
  function getCurrentLang() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGS.includes(stored)) {
        return stored;
      }
    } catch (e) {
      // Ignorer
    }
    return DEFAULT_LANG;
  }

  // Appliquer les traductions sur l'ensemble du DOM
  function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}

    // 1. Mettre à jour les attributs <html>
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === "ar") ? "rtl" : "ltr";

    // 2. Traduire les balises avec data-i18n
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (TRANSLATIONS[key] && TRANSLATIONS[key][lang]) {
        el.textContent = TRANSLATIONS[key][lang];
      }
    });

    // 3. Mettre à jour l'état actif des boutons du sélecteur
    const buttons = document.querySelectorAll(".lang-btn");
    buttons.forEach((btn) => {
      if (btn.getAttribute("data-lang") === lang) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // 4. Émettre un événement pour synchroniser le calculateur devis-calculator.js
    window.dispatchEvent(
      new CustomEvent("devis:langChanged", {
        detail: { lang, isRTL: lang === "ar" }
      })
    );
  }

  // Injecter le composant sélecteur de langue dans la page
  function injectLanguageSwitcher() {
    const headerTop = document.querySelector(".devis-header-top") || document.querySelector(".portal-hero");
    if (!headerTop) return;

    // Éviter double injection
    if (document.getElementById("devis-lang-switcher")) return;

    const switcher = document.createElement("div");
    switcher.id = "devis-lang-switcher";
    switcher.className = "lang-selector";
    switcher.innerHTML = `
      <button type="button" class="lang-btn" data-lang="fr">FR</button>
      <button type="button" class="lang-btn" data-lang="en">EN</button>
      <button type="button" class="lang-btn" data-lang="ar">العربية</button>
    `;

    // Insertion
    if (headerTop.classList.contains("portal-hero")) {
      headerTop.insertBefore(switcher, headerTop.firstChild);
    } else {
      headerTop.appendChild(switcher);
    }

    // Événements sur les boutons
    switcher.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const lang = this.getAttribute("data-lang");
        setLanguage(lang);
      });
    });
  }

  // Export global pour utilisation dans devis-calculator.js
  window.DevisI18n = {
    getLang: getCurrentLang,
    setLang: setLanguage,
    t: function (key, fallback) {
      const lang = getCurrentLang();
      return (TRANSLATIONS[key] && TRANSLATIONS[key][lang]) || fallback || key;
    }
  };

  // Initialisation au chargement du DOM
  document.addEventListener("DOMContentLoaded", function () {
    injectLanguageSwitcher();
    setLanguage(getCurrentLang());
  });

})();
