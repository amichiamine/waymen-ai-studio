/**
 * Registre des métadonnées des 24 Blocs Universels de StacGate Platform.
 * Chaque bloc appartient à une famille et fournit son étiquette, icône et props par défaut.
 */
import type { BlockMeta } from "@/types/pages";

export const BLOCK_REGISTRY: BlockMeta[] = [
  // 🛍️ Famille Commerce & Vitrine
  {
    type: "hero_banner",
    family: "commerce",
    label: { fr: "Bannière Hero Principale", en: "Main Hero Banner", ar: "بانر رئيسي (Hero)" },
    description: {
      fr: "Bannière d'accroche avec grand titre, slogan, image et boutons CTA.",
      en: "Catchy hero banner with large title, subtitle, image and CTA buttons.",
      ar: "بانر جذاب مع عنوان كبير وشعار وصورة وأزرار دعوة لاتخاذ إجراء.",
    },
    icon: "Monitor",
  },
  {
    type: "flash_sale",
    family: "commerce",
    label: { fr: "Ventes Flash & Promos", en: "Flash Sales & Promos", ar: "تخفيضات خاطفة وعروض" },
    description: {
      fr: "Section promotionnelle avec compte à rebours et remises.",
      en: "Promotional section with countdown and discounts.",
      ar: "قسم ترويجي مع عد تنازلي وتخفيضات.",
    },
    icon: "Flame",
  },
  {
    type: "category_cards",
    family: "commerce",
    label: { fr: "Cartes de Catégories", en: "Category Cards", ar: "بطاقات الفئات" },
    description: {
      fr: "Grille de catégories avec visuels de couverture et accès direct.",
      en: "Category grid with cover images and direct links.",
      ar: "شبكة الفئات مع صور الغلاف وروابط مباشرة.",
    },
    icon: "Grid",
  },
  {
    type: "use_chips",
    family: "commerce",
    label: { fr: "Filtres d'Usage (Chips)", en: "Use Filters (Chips)", ar: "فلاتر حسب الاستخدام" },
    description: {
      fr: "Puces de filtrage rapide (Gaming, R&D, Bureautique, Création...).",
      en: "Quick filter chips (Gaming, R&D, Office, Creative...).",
      ar: "شريحات تصفية سريعة (ألعاب، بحث وتطوير، أعمال...).",
    },
    icon: "Cpu",
    defaultProps: {
      title: "",
    },
  },
  {
    type: "best_sellers",
    family: "commerce",
    label: { fr: "Meilleures Ventes", en: "Best Sellers", ar: "الأكثر مبيعاً" },
    description: {
      fr: "Carrousel des produits et solutions les plus populaires.",
      en: "Carousel of the most popular products and solutions.",
      ar: "شريط عرض لأكثر المنتجات والحلول طلباً.",
    },
    icon: "Award",
  },
  {
    type: "featured_tabs",
    family: "commerce",
    label: { fr: "Onglets par Univers", en: "Featured Tabs by World", ar: "تبويبات حسب الأقسام" },
    description: {
      fr: "Navigation par onglets affichant les produits par catégorie.",
      en: "Tabbed browsing showing products by category.",
      ar: "تصفح حسب التبويبات لعرض المنتجات حسب الفئة.",
    },
    icon: "Layers",
  },
  {
    type: "brands_marquee",
    family: "commerce",
    label: {
      fr: "Défilement Marques / Partenaires",
      en: "Brands / Partners Marquee",
      ar: "شريط العلامات والشركاء",
    },
    description: {
      fr: "Bandeau défilant fluide des logos de partenaires et marques.",
      en: "Smooth scrolling marquee of partner and brand logos.",
      ar: "شريط متحرك سلس لشعارات الشركاء والعلامات التجارية.",
    },
    icon: "Boxes",
    defaultProps: {
      title: "",
      speed: "fast",
    },
  },
  {
    type: "why_us",
    family: "commerce",
    label: { fr: "Pourquoi Nous Choisir", en: "Why Choose Us", ar: "لماذا تختارنا" },
    description: {
      fr: "Grille d'engagements forts (Garantie, Livraison, Support, Qualité).",
      en: "Key commitments grid (Warranty, Delivery, Support, Quality).",
      ar: "شبكة الالتزامات والضمانات (توصيل، ضمان، دعم، جودة).",
    },
    icon: "ShieldCheck",
  },
  {
    type: "builder_teaser",
    family: "commerce",
    label: {
      fr: "Teaser Configurateur sur Mesure",
      en: "Custom Builder Teaser",
      ar: "بانر مجمّع الحواسيب",
    },
    description: {
      fr: "Bannière interactive incitant à concevoir une solution personnalisée.",
      en: "Interactive banner encouraging custom configurations.",
      ar: "بانر تفاعلي لتجميع الحواسيب والحلول المخصصة.",
    },
    icon: "Wrench",
  },

  // 👤 Famille Identité, Projets & CV
  {
    type: "profile_hero",
    family: "identity",
    label: {
      fr: "Profil Exécutif / CV Hero",
      en: "Executive Profile / CV Hero",
      ar: "الملف التعريفي / السيرة الذاتية",
    },
    description: {
      fr: "Présentation personnelle ou d'équipe (Avatar, Titre pro, Bio, Disponibilité, CV PDF).",
      en: "Personal or team presentation (Avatar, Title, Bio, Availability, CV PDF).",
      ar: "عرض شخصي أو للفريق (صورة، مسمى مهني، نبذة، حالة التوفر، سيرة ذاتية PDF).",
    },
    icon: "User",
    defaultProps: {
      name: "ArchiSys3.0",
      role: {
        fr: "Architecte Logiciel & Consultant R&D",
        en: "Software Architect & R&D Consultant",
        ar: "مهندس معماري برمجيات ومستشار بحث وتطوير",
      },
      bio: {
        fr: "Expertise en architectures logicielles souveraines, cloud, web moderne et systèmes distribués à haute performance.",
        en: "Expertise in sovereign software architectures, cloud, modern web and high-performance distributed systems.",
        ar: "خبرة في المعماريات البرمجية السيادية، السحابية، الويب الحديث والأنظمة الموزعة عالية الأداء.",
      },
      availability: {
        fr: "Disponible pour missions d'architecture & R&D",
        en: "Available for Architecture & R&D missions",
        ar: "متاح لمشاريع المعمارية البرمجية والبحث والتطوير",
      },
      showDownloadPdf: true,
      githubUrl: "",
      linkedinUrl: "",
      email: "",
    },
  },
  {
    type: "timeline",
    family: "identity",
    label: {
      fr: "Frise Chronologique / Parcours",
      en: "Timeline / Career Journey",
      ar: "المسار الزمني / الخبرات",
    },
    description: {
      fr: "Chronologie élégante des expériences, postes, jalons R&D ou étapes d'entreprise.",
      en: "Elegant timeline of experiences, milestones, R&D stages or history.",
      ar: "مسار زمني أنيق للخبرات المهنية والمحطات البارزة في البحث والتطوير.",
    },
    icon: "Clock",
    defaultProps: {
      title: {
        fr: "Parcours Professionnel & Jalons",
        en: "Career & Milestones",
        ar: "المسار المهني والمحطات",
      },
      subtitle: {
        fr: "Historique des réalisations et projets d'ingénierie.",
        en: "History of engineering achievements and projects.",
        ar: "سجل الإنجازات والمشاريع الهندسية.",
      },
      items: [
        {
          id: "exp-1",
          period: "2024 — Présent",
          role: {
            fr: "Architecte & Directeur Technique R&D",
            en: "Lead Architect & R&D Director",
            ar: "مهندس معماري ومدير تقني للبحث والتطوير",
          },
          company: "StacGate Systems",
          description: {
            fr: "Conception et direction d'architectures d'élite, moteurs composables et solutions souveraines.",
            en: "Design and direction of elite architectures, composable engines and sovereign solutions.",
            ar: "تصميم وإدارة معماريات برمجية سيادية ومحركات قابلة للتجميع وحلول متقدمة.",
          },
          tags: ["Architecture", "React 19", "TypeScript", "Performance"],
        },
      ],
    },
  },
  {
    type: "skills_matrix",
    family: "identity",
    label: { fr: "Matrice de Compétences", en: "Skills Matrix", ar: "مصفوفة المهارات" },
    description: {
      fr: "Présentation visuelle des compétences clés, technologies et niveaux d'expertise.",
      en: "Visual skills, technologies and proficiency matrix.",
      ar: "عرض بصري للمهارات الأساسية والتقنيات ومستويات الإتقان.",
    },
    icon: "CheckCircle",
    defaultProps: {
      title: {
        fr: "Compétences Clés & Technologies",
        en: "Core Skills & Technologies",
        ar: "المهارات الأساسية والتقنيات",
      },
      subtitle: {
        fr: "Savoir-faire éprouvé sur les stacks et architectures modernes.",
        en: "Proven expertise across modern stacks and architectures.",
        ar: "خبرة عملية مثبتة في أحدث أطر العمل والمعماريات.",
      },
      categories: [
        {
          id: "cat-1",
          name: {
            fr: "Architecture & Systèmes",
            en: "Architecture & Systems",
            ar: "المعمارية والأنظمة",
          },
          skills: ["Clean Architecture", "API Design", "Haute Disponibilité", "Sécurité & Audit"],
        },
        {
          id: "cat-2",
          name: { fr: "Développement & Web", en: "Development & Web", ar: "التطوير والويب" },
          skills: ["TypeScript", "React / Next", "PHP / Node.js", "Tailwind CSS"],
        },
      ],
    },
  },
  {
    type: "projects_grid",
    family: "identity",
    label: {
      fr: "Vitrine de Projets / Portfolio",
      en: "Projects Showcase / Portfolio",
      ar: "معرض المشاريع والأعمال",
    },
    description: {
      fr: "Grille de réalisations, prototypes ou produits avec badges et liens démo/code.",
      en: "Grid of case studies, prototypes or products with badges and demo links.",
      ar: "شبكة من دراسات الحالة والنماذج الأولية مع وسوم وروابط للمعاينة.",
    },
    icon: "FolderGit2",
    defaultProps: {
      title: {
        fr: "Réalisations & Projets Phares",
        en: "Featured Projects & Case Studies",
        ar: "أبرز المشاريع والإنجازات",
      },
      subtitle: {
        fr: "Sélection de travaux d'ingénierie, prototypes et architectures en production.",
        en: "Selection of engineering works, prototypes and production architectures.",
        ar: "مجموعة مختارة من الأعمال الهندسية والنماذج والمعماريات قيد التشغيل.",
      },
      items: [
        {
          id: "proj-1",
          title: { fr: "StacGate Platform", en: "StacGate Platform", ar: "منصة StacGate" },
          description: {
            fr: "Plateforme souveraine modulaire combinant e-commerce haute performance et vitrine de solutions.",
            en: "Sovereign modular platform combining high-performance e-commerce and solutions showcase.",
            ar: "منصة سيادية معيارية تجمع بين التجارة الإلكترونية عالية الأداء ومعرض الحلول.",
          },
          category: "Software Architecture",
          tags: ["React 19", "Vite", "TypeScript", "SQLite"],
          demoUrl: "#",
          codeUrl: "#",
          image: "/media/stacgate-archisys-combined.webp",
        },
      ],
    },
  },
  {
    type: "company_history",
    family: "identity",
    label: { fr: "Histoire & Mission", en: "History & Mission", ar: "التاريخ والرسالة" },
    description: {
      fr: "Section descriptive à 2 colonnes présentant l'origine et la mission.",
      en: "Two-column storytelling section presenting origins and mission.",
      ar: "قسم سردي من عمودين يعرض النشأة والرسالة المؤسسية.",
    },
    icon: "BookOpen",
  },
  {
    type: "values_grid",
    family: "identity",
    label: { fr: "Valeurs Fondamentales", en: "Core Values Grid", ar: "القيم والمبادئ الأساسية" },
    description: {
      fr: "Grille des valeurs fondamentales avec icônes personnalisables.",
      en: "Core values grid with customizable icons.",
      ar: "شبكة القيم الأساسية مع أيقونات قابلة للتخصيص.",
    },
    icon: "Star",
  },
  {
    type: "brand_banner",
    family: "identity",
    label: {
      fr: "Bannière Officielle de Marque",
      en: "Official Brand Banner",
      ar: "بانر العلامة الرسمية",
    },
    description: {
      fr: "Bannière visuelle de prestige affichant l'alliance StacGate × ArchiSys3.0.",
      en: "Prestigious visual banner displaying the StacGate × ArchiSys3.0 alliance.",
      ar: "بانر رسمي عالي الدقة يبرز شراكة StacGate و ArchiSys3.0.",
    },
    icon: "Image",
  },
  {
    type: "markdown_section",
    family: "identity",
    label: {
      fr: "Zone Libre Markdown & Médias",
      en: "Free Markdown & Media Area",
      ar: "مساحة محتوى حر (Markdown)",
    },
    description: {
      fr: "Contenu textuel riche libre avec titres, listes, images et lecteurs vidéo YouTube/Vimeo.",
      en: "Rich text area with headings, lists, images and YouTube/Vimeo players.",
      ar: "مساحة محتوى غنية تدعم التنسيقات والقوائم والصور ومشغلات فيديو يوتيوب وفيميو.",
    },
    icon: "FileText",
    defaultProps: {
      content: {
        fr: "### Titre de la Section\n\nRédigez ici votre contenu au format Markdown.\n\n- Point clé 1\n- Point clé 2\n- Point clé 3\n\nVous pouvez intégrer des images ou des vidéos en toute liberté.",
        en: "### Section Title\n\nWrite your Markdown content here.\n\n- Key point 1\n- Key point 2\n- Key point 3\n\nYou can embed images and videos freely.",
        ar: "### عنوان القسم\n\nاكتب محتواك هنا بتنسيق ماركداون.\n\n- نقطة أساسية 1\n- نقطة أساسية 2\n- نقطة أساسية 3\n\nيمكنك إضافة صور وفيديوهات بكل حرية.",
      },
    },
  },

  // 🤝 Famille Confiance & Preuve Sociale
  {
    type: "reviews_grid",
    family: "social",
    label: {
      fr: "Témoignages & Avis Clients",
      en: "Reviews & Testimonials",
      ar: "الآراء والشهادات",
    },
    description: {
      fr: "Grille d'avis vérifiés, étoiles de satisfaction et retours d'expérience.",
      en: "Verified reviews grid with star ratings and feedback.",
      ar: "شبكة التقييمات والشهادات الحقيقية مع النجوم والآراء.",
    },
    icon: "Star",
  },
  {
    type: "latest_blog_posts",
    family: "social",
    label: {
      fr: "Articles Récents de Blog / R&D",
      en: "Latest Blog / R&D Articles",
      ar: "أحدث مقالات المدونة والبحث",
    },
    description: {
      fr: "Sélection des derniers articles publiés avec vignettes, résumés et auteurs.",
      en: "Selection of latest published posts with thumbnails, excerpts and authors.",
      ar: "عرض لأحدث المقالات المنشورة مع الصور والنصوص المختصرة والكتّاب.",
    },
    icon: "Newspaper",
  },

  // 💬 Famille Interaction & Contact
  {
    type: "contact_form",
    family: "interaction",
    label: {
      fr: "Formulaire de Contact / Devis",
      en: "Contact / Quote Form",
      ar: "نموذج التواصل وطلب العروض",
    },
    description: {
      fr: "Formulaire complet (Nom, Email, Téléphone, Sujet, Message) relié à l'API messages.",
      en: "Complete form (Name, Email, Phone, Subject, Message) connected to messages API.",
      ar: "نموذج متكامل (اسم، بريد، هاتف، موضوع، رسالة) متصل بقاعدة الرسائل مباشرة.",
    },
    icon: "Mail",
  },
  {
    type: "contact_cta",
    family: "interaction",
    label: {
      fr: "Bandeau d'Appel à l'Action (CTA)",
      en: "Call to Action Banner (CTA)",
      ar: "بانر الحث على التواصل",
    },
    description: {
      fr: "Bandeau d'action direct avec bouton d'échange ou WhatsApp.",
      en: "Direct action banner with contact button or WhatsApp.",
      ar: "بانر تفاعلي مباشر مع زر للمحادثة أو التواصل عبر واتساب.",
    },
    icon: "PhoneCall",
  },
  {
    type: "direct_contact_cards",
    family: "interaction",
    label: {
      fr: "Cartes de Coordonnées Directes",
      en: "Direct Contact Cards",
      ar: "بطاقات التواصل المباشر",
    },
    description: {
      fr: "Cartes interactives Téléphone, WhatsApp, Email, Horaires et Localisation.",
      en: "Interactive Phone, WhatsApp, Email, Hours and Location cards.",
      ar: "بطاقات تفاعلية للهاتف، واتساب، البريد، أوقات العمل والموقع.",
    },
    icon: "Phone",
  },
  {
    type: "faq_accordion",
    family: "interaction",
    label: { fr: "Foire Aux Questions (FAQ)", en: "FAQ Accordion", ar: "الأسئلة الشائعة (FAQ)" },
    description: {
      fr: "Accordéon interactif dépliable répondant aux questions fréquentes.",
      en: "Collapsible interactive accordion answering common questions.",
      ar: "قوائم منسدلة تفاعلية للإجابة على الأسئلة الشائعة والمتكررة.",
    },
    icon: "HelpCircle",
  },
  {
    type: "ticker_bar",
    family: "interaction",
    label: { fr: "Bandeau Défilant (Ticker)", en: "Animated Ticker Bar", ar: "شريط إخباري متحرك" },
    description: {
      fr: "Bandeau d'annonces ou d'alertes défilant de manière fluide en continu.",
      en: "Smooth continuous announcement or alert ticker.",
      ar: "شريط متحرك مستمر للإعلانات والتنبيهات المباشرة.",
    },
    icon: "Zap",
  },
  {
    type: "promo_banner",
    family: "interaction",
    label: { fr: "Bandeau Promo Supérieur", en: "Top Promo Banner", ar: "بانر العروض العلوي" },
    description: {
      fr: "Barre promotionnelle supérieure avec message d'action ou code coupon.",
      en: "Top promotional banner with action message or coupon code.",
      ar: "شريط ترويجي علوي مع رسالة تحفيزية أو كود خصم.",
    },
    icon: "Tag",
  },
  // 🌟 Nouveaux Blocs Majuscules Phase 41
  {
    type: "features_grid",
    family: "identity",
    label: {
      fr: "Grille de Fonctionnalités & Services",
      en: "Features & Services Grid",
      ar: "شبكة الميزات والخدمات",
    },
    description: {
      fr: "Grille moderne de 2, 3 ou 4 colonnes d'atouts avec icônes, titres et descriptions.",
      en: "Modern 2, 3 or 4-column grid of features with icons, titles and descriptions.",
      ar: "شبكة عصرية من 2، 3 أو 4 أعمدة لعرض الميزات مع أيقونات وعناوين وشروحات.",
    },
    icon: "Sparkles",
    defaultProps: {
      title: {
        fr: "Nos Atouts & Piliers Technologiques",
        en: "Our Key Strengths & Tech Pillars",
        ar: "أبرز مميزاتنا وركائزنا التقنية",
      },
      subtitle: {
        fr: "Une architecture optimisée garantissant performance, souveraineté et évolutivité.",
        en: "An optimized architecture guaranteeing performance, sovereignty and scalability.",
        ar: "بنية محسّنة تضمن الأداء العالي، السيادة البرمجية والقابلية للتطوير.",
      },
      columns: 3,
      items: [
        {
          id: "f1",
          icon: "rocket",
          title: {
            fr: "Haute Performance & Vélocité",
            en: "High Performance & Speed",
            ar: "أداء عالٍ وسرعة فائقة",
          },
          description: {
            fr: "Une architecture optimisée garantissant des temps de réponse instantanés.",
            en: "Optimized architecture ensuring instantaneous response times.",
            ar: "بنية برمجية محسّنة تضمن سرعة استجابة فورية.",
          },
        },
        {
          id: "f2",
          icon: "shield",
          title: {
            fr: "Sécurité & Souveraineté",
            en: "Security & Sovereignty",
            ar: "أمان وسيادة تقنية",
          },
          description: {
            fr: "Isolation stricte, chiffrement avancé et hébergement sous votre contrôle total.",
            en: "Strict isolation, advanced encryption and hosting under your total control.",
            ar: "عزل محكم، تشفير متقدم واستضافة تحت سيطرتك الكاملة.",
          },
        },
        {
          id: "f3",
          icon: "cpu",
          title: {
            fr: "Technologies de Pointe",
            en: "Cutting-Edge Technologies",
            ar: "تقنيات متقدمة وحديثة",
          },
          description: {
            fr: "Composants modernes, scalables et interopérables sans compromis technique.",
            en: "Modern, scalable and interoperable components without technical compromise.",
            ar: "مكونات عصرية، قابلة للتطوير ومتكاملة بدون أي تنازل تقني.",
          },
        },
      ],
    },
  },
  {
    type: "pricing_table",
    family: "commerce",
    label: {
      fr: "Grille Tarifaire & Plans d'Offres",
      en: "Pricing Table & Plans",
      ar: "جدول الأسعار وباقات العروض",
    },
    description: {
      fr: "Tableau comparatif des offres avec tarifs, badge populaire, liste d'avantages et boutons d'action.",
      en: "Comparative offer table with prices, popular badge, feature checklist and action buttons.",
      ar: "جدول مقارنة الباقات مع الأسعار، شارة الأكثر طلباً، قائمة الميزات وأزرار الطلب.",
    },
    icon: "CreditCard",
    defaultProps: {
      title: {
        fr: "Nos Offres & Solutions",
        en: "Our Pricing & Solutions",
        ar: "باقاتنا وعروضنا التقنية",
      },
      subtitle: {
        fr: "Des formules claires et transparentes adaptées à la taille et aux ambitions de votre projet.",
        en: "Clear and transparent plans adapted to your project size and ambitions.",
        ar: "صيغ واضحة وشفافة مصممة خصيصاً لتناسب حجم وتطلعات مشروعكم.",
      },
      plans: [
        {
          id: "p1",
          name: { fr: "Essentiel", en: "Starter", ar: "الأساسي" },
          price: "49 000 DZD",
          period: { fr: "/ projet", en: "/ project", ar: "/ مشروع" },
          popular: false,
          features: [
            {
              fr: "Architecture socle optimisée",
              en: "Optimized core architecture",
              ar: "بنية أساسية محسّنة",
            },
            {
              fr: "Interface responsive Mobile/Desktop",
              en: "Responsive Mobile/Desktop UI",
              ar: "واجهة متجاوبة للهاتف والحاسوب",
            },
            {
              fr: "Documentation technique standard",
              en: "Standard technical docs",
              ar: "توثيق تقني قياسي",
            },
            {
              fr: "Support garanti 30 jours",
              en: "30-day guaranteed support",
              ar: "دعم فني مضمون 30 يوماً",
            },
          ],
          ctaText: { fr: "Démarrer", en: "Get Started", ar: "ابدأ الآن" },
          ctaLink: "/contact",
        },
        {
          id: "p2",
          name: { fr: "Professionnel", en: "Professional", ar: "المحترف" },
          price: "129 000 DZD",
          period: { fr: "/ projet", en: "/ project", ar: "/ مشروع" },
          badge: { fr: "Le Plus Recommandé", en: "Most Popular", ar: "الأكثر طلباً" },
          popular: true,
          features: [
            {
              fr: "Tout de l'offre Essentiel",
              en: "Everything in Starter",
              ar: "كل ميزات العرض الأساسي",
            },
            {
              fr: "Personnalisation avancée & Blocs 360°",
              en: "Advanced customization & 360° blocks",
              ar: "تخصيص متقدم وقوالب 360°",
            },
            {
              fr: "Multi-devises & Multi-langues",
              en: "Multi-currency & Multi-language",
              ar: "متعدد العملات واللغات",
            },
            {
              fr: "Support prioritaire & Accompagnement",
              en: "Priority support & assistance",
              ar: "دعم ذو أولوية ومرافقة مخصصة",
            },
          ],
          ctaText: { fr: "Commander cette Offre", en: "Order This Plan", ar: "طلب هذا العرض" },
          ctaLink: "/contact",
        },
        {
          id: "p3",
          name: { fr: "Sur Mesure R&D", en: "Custom Enterprise", ar: "مخصص للمؤسسات" },
          price: "Sur Devis",
          period: { fr: "/ architecture", en: "/ architecture", ar: "/ هندسة معمارية" },
          popular: false,
          features: [
            {
              fr: "Cahier des charges sur mesure",
              en: "Custom technical specifications",
              ar: "دفتر شروط مخصص بالكامل",
            },
            {
              fr: "Audit d'architecture & Intégrations API",
              en: "Architecture audit & API integrations",
              ar: "تدقيق معماري وربط برمجي كامل",
            },
            {
              fr: "Déploiement haute disponibilité",
              en: "High-availability deployment",
              ar: "نشر على بنية عالية الجاهزية",
            },
            {
              fr: "SLA & Maintenance R&D dédiée",
              en: "Dedicated R&D SLA & Maintenance",
              ar: "اتفاقية مستوى خدمة وصيانة متقدمة",
            },
          ],
          ctaText: { fr: "Demander une Étude", en: "Request a Study", ar: "طلب دراسة مخصصة" },
          ctaLink: "/contact",
        },
      ],
    },
  },
  {
    type: "quote_star",
    family: "social",
    label: {
      fr: "Témoignage Vedette & Citation Star",
      en: "Featured VIP Quote & Review",
      ar: "شهادة مميزة واقتباس بارز",
    },
    description: {
      fr: "Témoignage percutant en pleine largeur avec citation marquante, notation étoiles et profil auteur.",
      en: "Impactful full-width testimonial with quote, star rating and author profile.",
      ar: "شهادة عميل مميزة مع اقتباس بارز، تقييم بالنجوم وملف تعريفي بالكاتب.",
    },
    icon: "Quote",
    defaultProps: {
      quote: {
        fr: "« L'architecture StacGate et le niveau de rigueur d'ArchiSys3.0 ont transformé notre infrastructure numérique avec une robustesse exemplaire. »",
        en: "“The StacGate architecture and ArchiSys3.0's level of rigor transformed our digital infrastructure with exemplary robustness.”",
        ar: "«لقد أحدثت بنية StacGate ومستوى الدقة الهندسية نقلة نوعية في بنيتنا الرقمية بصلابة استثنائية.»",
      },
      author: "Dr. Salim B.",
      role: {
        fr: "Directeur des Systèmes d'Information — Enterprise Partner",
        en: "Chief Information Officer — Enterprise Partner",
        ar: "مدير نظم المعلومات — شريك مؤسساتي",
      },
      rating: 5,
      avatarSrc: "",
    },
  },
  {
    type: "full_width_banner",
    family: "commerce",
    label: {
      fr: "Grande Bannière Visuelle d'Impact",
      en: "Full-Width Impact Banner",
      ar: "بانر بصري عريض فائق التأثير",
    },
    description: {
      fr: "Hero secondaire grand format avec image d'arrière-plan, dégradé protecteur et double CTA.",
      en: "Secondary large-format hero with background image, gradient overlay and dual CTAs.",
      ar: "بانر رئيسي عريض مع صورة خلفية وتدرج متباين وأزرار عمل مزدوجة.",
    },
    icon: "Maximize",
    defaultProps: {
      title: {
        fr: "Construisez votre Écosystème Haute Performance avec StacGate",
        en: "Build Your High Performance Ecosystem with StacGate",
        ar: "ابنِ بنيتك الرقمية عالية الأداء مع StacGate",
      },
      subtitle: {
        fr: "Une solution technologique souveraine, composable et modulaire conçue pour l'excellence et la longévité.",
        en: "A sovereign, composable and modular technological solution designed for excellence and longevity.",
        ar: "حل برمجي سيادي وتكاملي مصمم لتحقيق أعلى معايير الجودة والاستدامة.",
      },
      bannerSrc: "/media/stacgate-archisys-combined.webp",
      height: "normal",
      primaryCtaText: {
        fr: "Découvrir la Plateforme",
        en: "Discover Platform",
        ar: "استكشف المنصة",
      },
      primaryCtaLink: "/catalogue",
      secondaryCtaText: {
        fr: "Nous Contacter",
        en: "Contact Us",
        ar: "تواصل معنا",
      },
      secondaryCtaLink: "/contact",
    },
  },
  {
    type: "visual_spacer",
    family: "interaction",
    label: {
      fr: "Espaceur & Séparateur Visuel",
      en: "Visual Spacer & Divider",
      ar: "فاصل ومسافة بصرية",
    },
    description: {
      fr: "Espaceur vertical réglable (20px à 160px) avec ligne de séparation discrète ou stylisée.",
      en: "Adjustable vertical spacer (20px to 160px) with subtle or stylized divider line.",
      ar: "فاصل رأسي قابل للتعديل (20 إلى 160 بكسل) مع خط فاصل أنيق اختياري.",
    },
    icon: "Minus",
    defaultProps: {
      height: 48,
      showDivider: false,
      dividerStyle: "subtle",
    },
  },
];

export function getBlockMeta(type: string): BlockMeta | undefined {
  return BLOCK_REGISTRY.find((b) => b.type === type);
}
