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
    defaultProps: {
      badge: {
        fr: "Activations & Formations IA 2026",
        en: "Official AI Subscriptions & Academy 2026",
        ar: "اشتراكات الذكاء الاصطناعي والأكاديمية 2026",
      },
      title1: {
        fr: "L'Intelligence Artificielle,",
        en: "Artificial Intelligence,",
        ar: "الذكاء الاصطناعي،",
      },
      title2: {
        fr: "activée pour vous",
        en: "unlocked for you",
        ar: "بين يديك وفريقك",
      },
      subtitle: {
        fr: "Accédez aux meilleurs outils IA mondiaux (ChatGPT Plus, Claude Pro, Midjourney, Cursor...) avec activation officielle sous 15 minutes et formez-vous à leur maîtrise.",
        en: "Access the world's leading AI platforms (ChatGPT Plus, Claude Pro, Midjourney, Cursor...) with official activation within 15 minutes and master them.",
        ar: "احصل على أقوى منصات الذكاء الاصطناعي العالمية مع تفعيل رسمي فوري خلال 15 دقيقة ودورات تدريبية عملية متخصصة.",
      },
      primaryCtaText: {
        fr: "Découvrir les Abonnements",
        en: "Explore Subscriptions",
        ar: "استكشف الاشتراكات",
      },
      primaryCtaHref: "/category/llm-assistants",
      secondaryCtaText: {
        fr: "Formations & Tutos",
        en: "Courses & Tutorials",
        ar: "الدورات والشروحات",
      },
      secondaryCtaHref: "/category/formations-academy",
      imageSrc: "media/waymen-og-banner.webp",
    },
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
    defaultProps: {
      badge: {
        fr: "Vente Flash Limitée",
        en: "Limited Flash Sale",
        ar: "تخفيضات خاطفة محدودة",
      },
      title: {
        fr: "Offres Exceptionnelles",
        en: "Special Offers",
        ar: "عروض استثنائية",
      },
      subtitle: {
        fr: "Remises immédiates sur une sélection de machines prêtes à l'emploi.",
        en: "Instant discounts on selected ready-to-ship machines.",
        ar: "خصومات فورية على أجهزة مختارة جاهزة للتسليم.",
      },
      endsAt: "2026-12-31T23:59:59Z",
    },
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
    defaultProps: {
      max: 4,
      title: {
        fr: "Nos Catégories Phares",
        en: "Featured Categories",
        ar: "أبرز الفئات",
      },
      subtitle: {
        fr: "Explorez notre catalogue par famille d'équipements informatiques.",
        en: "Browse our catalog by computing hardware family.",
        ar: "تصفح الكتالوج حسب عائلات العتاد.",
      },
    },
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
      title: {
        fr: "Trouvez Votre Matériel par Usage",
        en: "Find Gear by Use",
        ar: "اختر عتادك حسب الاستخدام",
      },
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
    defaultProps: {
      title: {
        fr: "Meilleures Ventes & Nouveautés",
        en: "Best Sellers & New Arrivals",
        ar: "الأكثر مبيعاً والجديد",
      },
      subtitle: {
        fr: "Les configurations les plus plébiscitées par nos clients et professionnels.",
        en: "Top rated setups by our clients and tech professionals.",
        ar: "العتاد الأكثر طلباً من قبل عملائنا والمحترفين.",
      },
    },
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
    defaultProps: {
      title: {
        fr: "Sélection Recommandée",
        en: "Featured Selection",
        ar: "مختارات مميزة",
      },
      subtitle: {
        fr: "Nos experts sélectionnent les meilleurs composants du moment.",
        en: "Our experts select the finest current components.",
        ar: "خبراؤنا يختارون أفضل العتاد المتاح حالياً.",
      },
    },
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
      title: {
        fr: "Marques & Partenaires Officiels",
        en: "Official Partner Brands",
        ar: "العلامات التجارية الشريكة",
      },
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
    defaultProps: {
      title: {
        fr: "Pourquoi Choisir WaYmen AI Studio",
        en: "Why Choose WaYmen AI Studio",
        ar: "لماذا تختار وايمان ستوديو",
      },
      subtitle: {
        fr: "Quatre engagements majeurs pour vos activations numériques et formations IA.",
        en: "Four core commitments for your AI subscriptions and masterclasses.",
        ar: "أربعة التزامات أساسية لتفعيل اشتراكاتك وتدريبات الذكاء الاصطناعي.",
      },
    },
  },
  {
    type: "builder_teaser",
    family: "commerce",
    label: {
      fr: "Teaser Pack Bundles & Combos IA",
      en: "AI Bundles & Pack Builder Teaser",
      ar: "بانر تجميع باقات الذكاء الاصطناعي",
    },
    description: {
      fr: "Bannière interactive incitant à composer son pack d'outils et formations IA personnalisées.",
      en: "Interactive banner encouraging custom AI packs and bundle formations.",
      ar: "بانر تفاعلي لتجميع باقات وحزم الذكاء الاصطناعي المخصصة.",
    },
    icon: "Boxes",
    defaultProps: {
      badge: {
        fr: "Pack Builder IA Sur Mesure",
        en: "Custom AI Pack Builder",
        ar: "تجميع الباقات المخصصة",
      },
      title: {
        fr: "Composez Votre Pack IA Sur Mesure",
        en: "Build Your Custom AI Bundle",
        ar: "جمّع باقة أدواتك ودوراتك المفضلة",
      },
      description: {
        fr: "Combinez vos outils IA favoris (LLM, Vidéo, Code) avec des formations ciblées et bénéficiez de remises immédiates.",
        en: "Combine your favorite AI tools (LLM, Video, Code) with targeted training and enjoy exclusive bundle discounts.",
        ar: "اجمع بين منصاتك المفضلة (توليد، كود، تصميم) مع برامج تدريبية متخصصة واحصل على تخفيض فوري.",
      },
      ctaText: {
        fr: "Composer mon Pack",
        en: "Build my Pack",
        ar: "ابدأ بتجميع باقتك",
      },
      ctaHref: "/category/packs-bundles",
    },
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
          title: { fr: "WaYmen AI Studio", en: "WaYmen AI Studio", ar: "وايمان ستوديو" },
          description: {
            fr: "Plateforme souveraine modulaire combinant activations IA instantanées, catalogue d'abonnements et pôle Academy certifiant.",
            en: "Sovereign modular platform combining instant AI activations, subscription catalog and certified Academy hub.",
            ar: "منصة سيادية متطورة تجمع بين تفعيل اشتراكات الذكاء الاصطناعي والدورات التدريبية المعتمدة.",
          },
          category: "AI & Cloud Platforms",
          tags: ["React 19", "Vite", "TypeScript", "SQLite", "AI Automation"],
          demoUrl: "#",
          codeUrl: "#",
          image: "media/waymen-og-banner.webp",
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
    defaultProps: {
      historyTitle: {
        fr: "Notre Histoire & Philosophie",
        en: "Our Story & Philosophy",
        ar: "قصتنا وفلسفتنا",
      },
      historyBody: {
        fr: "Fondée avec la volonté de démocratiser l'intelligence artificielle la plus avancée, WaYmen AI Studio combine activations officielles garanties et accompagnement pédagogique d'élite.",
        en: "Founded to democratize cutting-edge artificial intelligence, WaYmen AI Studio combines guaranteed official activations with elite learning support.",
        ar: "تأسست بهدف تمكين الجميع من أحدث أدوات الذكاء الاصطناعي، تجمع وايمان بين التفعيل الرسمي المضمون والتدريب العملي المتقدم.",
      },
      missionTitle: {
        fr: "Notre Mission Métier",
        en: "Our Core Mission",
        ar: "مهمتنا المهنية",
      },
      missionBody: {
        fr: "Accompagner les créateurs, développeurs et entreprises dans la maîtrise opérationnelle des outils IA pour démultiplier leur productivité.",
        en: "Empower creators, developers and businesses to master AI tools and drastically boost their productivity.",
        ar: "مرافقة المبدعين والمطورين والشركات في اختيار أدوات عمل قوية ومستدامة.",
      },
    },
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
    defaultProps: {
      title: {
        fr: "Nos Valeurs Cardinales",
        en: "Our Core Values",
        ar: "قيمنا الأساسية",
      },
      subtitle: {
        fr: "Rigueur, transparence et passion de l'ingénierie au service de nos utilisateurs.",
        en: "Rigor, transparency and engineering passion for our users.",
        ar: "الدقة والشفافية وشغف الهندسة في خدمة مستخدمينا.",
      },
    },
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
      fr: "Bannière visuelle officielle affichant l'identité WaYmen AI Studio.",
      en: "Official visual banner displaying the WaYmen AI Studio identity.",
      ar: "بانر رسمي عالي الدقة يبرز هوية WaYmen AI Studio.",
    },
    icon: "Image",
    defaultProps: {
      title: {
        fr: "WaYmen AI Studio — Hub d'Excellence IA & Formations",
        en: "WaYmen AI Studio — AI Excellence Hub & Academy",
        ar: "وايمان ستوديو — مركز التميز في الذكاء الاصطناعي والتدريب",
      },
      subtitle: {
        fr: "Plateforme modulaire haute performance pour activations d'intelligence artificielle et apprentissage certifiant.",
        en: "High performance modular platform for AI activations and certified training.",
        ar: "منصة متطورة وعالية الأداء لتفعيل اشتراكات الذكاء الاصطناعي والتدريب المعتمد.",
      },
      bannerSrc: "media/waymen-og-banner.webp",
    },
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
    defaultProps: {
      title: {
        fr: "Avis Clients Certifiés",
        en: "Verified Customer Reviews",
        ar: "آراء العملاء الموثقة",
      },
      subtitle: {
        fr: "Découvrez les retours authentiques de notre communauté d'utilisateurs.",
        en: "Authentic feedback from our community.",
        ar: "تقييمات وتجارب حقيقية من مجتمع مستخدمينا.",
      },
    },
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
    defaultProps: {
      max: 3,
      title: {
        fr: "Derniers Articles & Guides",
        en: "Latest Articles & Guides",
        ar: "أحدث المقالات والأدلة",
      },
      subtitle: {
        fr: "Actualités technologiques, benchmarks et conseils de notre équipe.",
        en: "Tech news, benchmarks and advice from our team.",
        ar: "أخبار التكنولوجيا، اختبارات الأداء ونصائح فريقنا.",
      },
    },
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
    defaultProps: {
      title: {
        fr: "Envoyez-nous un Message",
        en: "Send Us a Message",
        ar: "أرسل لنا رسالة",
      },
      subtitle: {
        fr: "Nous vous répondrons dans les plus brefs délais sous 24h ouvrées.",
        en: "We will get back to you within 24 business hours.",
        ar: "سنجيبك خلال 24 ساعة عمل.",
      },
    },
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
    defaultProps: {
      badge: {
        fr: "Conseil & Accompagnement",
        en: "Advice & Support",
        ar: "استشارة ومرافقة",
      },
      title: {
        fr: "Besoin d'un Conseil Technique Spécifique ?",
        en: "Need Specific Technical Advice?",
        ar: "هل تحتاج إلى استشارة تقنية مخصصة؟",
      },
      subtitle: {
        fr: "Nos ingénieurs et spécialistes vous répondent immédiatement par WhatsApp ou messagerie.",
        en: "Our engineers and specialists reply directly via WhatsApp or message.",
        ar: "مهندسونا ومختصونا يجيبونك فوراً عبر واتساب أو الرسائل.",
      },
      buttonText: {
        fr: "Contacter un Expert",
        en: "Contact an Expert",
        ar: "تواصل مع خبير",
      },
      buttonHref: "/contact",
    },
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
    defaultProps: {
      title: {
        fr: "Canaux de Contact Direct",
        en: "Direct Contact Channels",
        ar: "قنوات الاتصال المباشر",
      },
      subtitle: {
        fr: "Joignez notre équipe par le canal qui vous convient le mieux.",
        en: "Reach our team through your preferred channel.",
        ar: "تواصل مع فريقنا عبر القناة الأنسب لك.",
      },
    },
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
    defaultProps: {
      title: {
        fr: "Foire Aux Questions (FAQ)",
        en: "Frequently Asked Questions",
        ar: "الأسئلة الشائعة (FAQ)",
      },
      subtitle: {
        fr: "Trouvez immédiatement les réponses aux interrogations les plus fréquentes.",
        en: "Get immediate answers to common questions.",
        ar: "إجابات فورية على أكثر الاستفسارات شيوعاً.",
      },
    },
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
    defaultProps: {
      text: {
        fr: "Livraison 58 Wilayas en Cash-on-Delivery • Garantie officielle 100% matérielle",
        en: "58 Wilayas Delivery with Cash-on-Delivery • 100% Official Hardware Warranty",
        ar: "توصيل لـ 58 ولاية مع الدفع عند الاستلام • ضمان رسمي 100% على العتاد",
      },
      speed: "normal",
    },
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
    defaultProps: {
      text: "Activation immédiate 7j/7 sous 15 minutes — Formations WaYmen Academy disponibles",
      label: "Explorer",
      href: "/category/llm-assistants",
    },
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
        fr: "« La réactivité de WaYmen AI Studio et l'excellence d'ArchiSys3.0 ont décuplé notre productivité grâce aux meilleurs outils d'IA. »",
        en: "“WaYmen AI Studio's responsiveness and ArchiSys3.0's excellence dramatically boosted our team productivity with leading AI tools.”",
        ar: "«لقد ساهمت سرعة تفعيل وايمان ستوديو ودقة إشراف ArchiSys3.0 في مضاعفة إنتاجية فريقنا بأفضل أدوات الذكاء الاصطناعي.»",
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
        fr: "Déployez la Puissance de l'IA avec WaYmen AI Studio",
        en: "Unleash the Power of AI with WaYmen AI Studio",
        ar: "أطلق العنان لقوة الذكاء الاصطناعي مع وايمان ستوديو",
      },
      subtitle: {
        fr: "Une plateforme souveraine d'activations certifiées et de formations pratiques conçue sous la validation d'ArchiSys3.0.",
        en: "A sovereign platform for certified activations and hands-on training validated by ArchiSys3.0.",
        ar: "منصة سيادية لتفعيل الاشتراكات والتدريب التطبيقي تحت إشراف وتصميم ArchiSys3.0.",
      },
      bannerSrc: "media/waymen-og-banner.webp",
      height: "normal",
      primaryCtaText: {
        fr: "Découvrir la Plateforme",
        en: "Discover Platform",
        ar: "استكشف المنصة",
      },
      primaryCtaLink: "/category/llm-assistants",
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
