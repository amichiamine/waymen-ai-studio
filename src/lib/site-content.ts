import {
  Shield,
  Truck,
  Headphones,
  Award,
  Star,
  Heart,
  Users,
  Package,
  MapPin,
  Cpu,
  MemoryStick,
  HardDrive,
  Zap,
  MessageCircle,
  Flame,
  CreditCard,
  Monitor,
  Laptop,
  Smartphone,
  Wrench,
  Grid3x3,
  Home as HomeIcon,
  User,
  ShoppingCart,
  Boxes,
  Gift,
  Tag,
  Facebook,
  Instagram,
  Music2,
  Twitter,
  Youtube,
  Linkedin,
  Mail,
  Phone,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/data/products";
import type { Localized } from "@/lib/i18n";
import type { CustomPageDefinition, BlockConfig, BlockStyleConfig } from "@/types/pages";
import { getBlockMeta } from "@/components/blocks/registry";

export type IconName =
  | "shield"
  | "truck"
  | "headphones"
  | "award"
  | "star"
  | "heart"
  | "users"
  | "package"
  | "map-pin"
  | "cpu"
  | "memory"
  | "hard-drive"
  | "zap"
  | "message-circle"
  | "flame"
  | "credit-card"
  | "monitor"
  | "laptop"
  | "smartphone"
  | "wrench"
  | "grid"
  | "home"
  | "user"
  | "shopping-cart"
  | "boxes"
  | "gift"
  | "tag"
  | "facebook"
  | "instagram"
  | "music"
  | "twitter"
  | "youtube"
  | "linkedin"
  | "mail"
  | "phone";

export const ICONS: Record<IconName, LucideIcon> = {
  shield: Shield,
  truck: Truck,
  headphones: Headphones,
  award: Award,
  star: Star,
  heart: Heart,
  users: Users,
  package: Package,
  "map-pin": MapPin,
  cpu: Cpu,
  memory: MemoryStick,
  "hard-drive": HardDrive,
  zap: Zap,
  "message-circle": MessageCircle,
  flame: Flame,
  "credit-card": CreditCard,
  monitor: Monitor,
  laptop: Laptop,
  smartphone: Smartphone,
  wrench: Wrench,
  grid: Grid3x3,
  home: HomeIcon,
  user: User,
  "shopping-cart": ShoppingCart,
  boxes: Boxes,
  gift: Gift,
  tag: Tag,
  facebook: Facebook,
  instagram: Instagram,
  music: Music2,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  mail: Mail,
  phone: Phone,
};

export const ICON_NAMES: IconName[] = Object.keys(ICONS) as IconName[];

export function getIcon(name: IconName | string | undefined): LucideIcon {
  return (name && (ICONS as Record<string, LucideIcon>)[name]) || Star;
}

/** Shortcut: every user-visible string in this file is Localized<string>. */
type LS = Localized<string>;

export type Cta = { label: LS; href: string };

export type NavItem = { id: string; label: LS; href: string; icon?: IconName; accent?: boolean };
export type SocialLink = { id: string; icon: IconName; label: LS; href: string };
export type FooterLink = { id: string; label: LS; href: string };
export type FooterColumn = { id: string; title: LS; links: FooterLink[] };

export type SiteContent = {
  header: {
    showSearch: boolean;
    searchPlaceholder: LS;
    builderCta: Cta;
    primaryNav: NavItem[];
    categoryMenu: {
      label: LS;
      title: LS;
      browseLabel: LS;
      browseHref: string;
      items: NavItem[];
    };
  };
  footer: {
    tagline: LS;
    copyright: LS;
    madeIn: LS;
    socials: SocialLink[];
    columns: FooterColumn[];
  };
  hero: {
    enabled?: boolean;
    badge: LS;
    title1: LS;
    title2: LS;
    subtitle: LS;
    primaryCta: Cta;
    secondaryCta: Cta;
    kpis: { id: string; icon: IconName; value: LS; label: LS }[];
    showImage: boolean;
    imageSrc?: string;
  };
  categories: { enabled?: boolean; title: LS; subtitle: LS; browseLabel: LS };
  useChips: { enabled?: boolean; title: LS };
  bestSellers: { enabled?: boolean; title: LS; subtitle: LS };
  featuredTabs: {
    enabled?: boolean;
    title: LS;
    subtitle: LS;
    tabs: { id: string; categorySlug: Category; label: LS }[];
  };
  flashSale: {
    enabled?: boolean;
    badge: LS;
    title: LS;
    subtitle?: LS;
    viewAllLabel: LS;
    viewAllHref: string;
    countdownHours: number;
    endsAt?: string;
  };
  brandsMarquee: { enabled?: boolean; title: LS };
  whyUs: {
    enabled?: boolean;
    kicker: LS;
    title1: LS;
    title2: LS;
    subtitle: LS;
    items: { id: string; icon: IconName; title: LS; description: LS }[];
  };
  builderTeaser: {
    enabled?: boolean;
    badge: LS;
    title: LS;
    subtitle: LS;
    cta: Cta;
    bannerSrc?: string;
    items: { id: string; icon: IconName; title: LS; subtitle: LS }[];
  };
  reviews: { enabled?: boolean; title: LS; subtitle: LS };
  contactCta: {
    enabled?: boolean;
    badge?: LS;
    title: LS;
    subtitle: LS;
    whatsappLabel: LS;
    buttonText?: LS;
    buttonHref?: string;
  };
  floatingWhatsApp: { enabled: boolean; ariaLabel: LS };
  mobileBottomBar: {
    items: {
      id: string;
      icon: IconName;
      label: LS;
      href: string;
      requiresAuth?: boolean;
      primary?: boolean;
    }[];
  };
  about: {
    kicker: LS;
    title: LS;
    intro: LS;
    historyTitle: LS;
    historyBody: LS;
    missionTitle: LS;
    missionBody: LS;
    ctaTitle: LS;
    ctaSubtitle: LS;
    ctaBrowseLabel: LS;
    ctaContactLabel: LS;
    values: {
      id: string;
      icon: "shield" | "truck" | "headphones" | "award" | "star" | "heart";
      title: LS;
      description: LS;
    }[];
  };
  contact: {
    kicker: LS;
    title: LS;
    subtitle: LS;
    faqs: { id: string; question: LS; answer: LS }[];
  };
  customPages?: CustomPageDefinition[];
};

function hydrateBlock(block: BlockConfig): BlockConfig {
  const meta = getBlockMeta(block.type);
  const defaultProps = meta?.defaultProps ? JSON.parse(JSON.stringify(meta.defaultProps)) : {};
  const defaultStyle: BlockStyleConfig = { padding: "normal", bg: "transparent", align: "start" };
  return {
    ...block,
    props: { ...defaultProps, ...(block.props || {}) },
    style: { ...defaultStyle, ...(block.style || {}) },
  };
}

export function seedCustomPages(): CustomPageDefinition[] {
  const rawPages: CustomPageDefinition[] = [
    {
      id: "page_home",
      slug: "",
      title: {
        fr: "Page d'Accueil",
        en: "Home Page",
        ar: "الصفحة الرئيسية",
      },
      description: {
        fr: "Vitrine principale, catalogue et sections phares de la plateforme.",
        en: "Main storefront, catalog and featured platform sections.",
        ar: "الواجهة الرئيسية والكتالوج والأقسام المميزة للمنصة.",
      },
      blocks: [
        { id: "b_home_hero", type: "hero_banner", enabled: true },
        { id: "b_home_flash", type: "flash_sale", enabled: true },
        { id: "b_home_categories", type: "category_cards", enabled: true, props: { max: 6 } },
        { id: "b_home_use_chips", type: "use_chips", enabled: true },
        { id: "b_home_best_sellers", type: "best_sellers", enabled: true },
        { id: "b_home_featured", type: "featured_tabs", enabled: true },
        { id: "b_home_marquee", type: "brands_marquee", enabled: true },
        { id: "b_home_why_us", type: "why_us", enabled: true },
        { id: "b_home_builder", type: "builder_teaser", enabled: false },
        { id: "b_home_reviews", type: "reviews_grid", enabled: true },
        { id: "b_home_cta", type: "contact_cta", enabled: true },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 1,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "page_about",
      slug: "about",
      title: {
        fr: "À propos & Histoire",
        en: "About & Story",
        ar: "من نحن وقصتنا",
      },
      description: {
        fr: "Histoire de l'enseigne, valeurs fondatrices et vision d'excellence.",
        en: "Company history, core values and vision for excellence.",
        ar: "قصة العلامة التجارية، القيم الأساسية ورؤية التميز.",
      },
      blocks: [
        { id: "b_about_banner", type: "brand_banner", enabled: true },
        { id: "b_about_history", type: "company_history", enabled: true },
        { id: "b_about_values", type: "values_grid", enabled: true },
        { id: "b_about_cta", type: "contact_cta", enabled: true },
      ],
      isPublished: true,
      inNavbar: true,
      inFooter: true,
      navOrder: 2,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "page_contact",
      slug: "contact",
      title: {
        fr: "Contact & FAQ",
        en: "Contact & FAQ",
        ar: "اتصل بنا والأسئلة الشائعة",
      },
      description: {
        fr: "Coordonnées directes, formulaire de messagerie et réponses aux questions.",
        en: "Direct contact info, message form and answered questions.",
        ar: "بيانات التواصل المباشر، نموذج الرسائل والإجابات على الأسئلة.",
      },
      blocks: [
        { id: "b_contact_direct", type: "direct_contact_cards", enabled: true },
        { id: "b_contact_form", type: "contact_form", enabled: true },
        { id: "b_contact_faq", type: "faq_accordion", enabled: true },
      ],
      isPublished: true,
      inNavbar: true,
      inFooter: true,
      navOrder: 3,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "page_cv_default",
      slug: "cv",
      title: {
        fr: "Profil & CV",
        en: "Profile & Resume",
        ar: "الملف والسيرة الذاتية",
      },
      description: {
        fr: "Profil exécutif, parcours d'ingénierie, compétences et réalisations.",
        en: "Executive profile, engineering background, skills and achievements.",
        ar: "الملف التنفيذي، المسار الهندسي، المهارات والإنجازات.",
      },
      blocks: [
        {
          id: "b_cv_hero",
          type: "profile_hero",
          enabled: true,
          props: {
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
          },
        },
        {
          id: "b_cv_timeline",
          type: "timeline",
          enabled: true,
          props: {
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
                  fr: "Conception et direction d'architectures logicielles d'élite, moteurs composables et solutions souveraines.",
                  en: "Design and direction of elite software architectures, composable engines and sovereign solutions.",
                  ar: "تصميم وإدارة معماريات برمجية سيادية ومحركات قابلة للتجميع وحلول متقدمة.",
                },
                tags: ["Architecture", "React 19", "TypeScript", "Performance"],
              },
            ],
          },
        },
        {
          id: "b_cv_skills",
          type: "skills_matrix",
          enabled: true,
          props: {
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
                skills: [
                  "Clean Architecture",
                  "API Design",
                  "Haute Disponibilité",
                  "Sécurité & Audit",
                ],
              },
              {
                id: "cat-2",
                name: {
                  fr: "Développement & Web",
                  en: "Development & Web",
                  ar: "التطوير والويب",
                },
                skills: ["TypeScript", "React 19", "PHP / Node.js", "Tailwind CSS"],
              },
            ],
          },
        },
        {
          id: "b_cv_contact",
          type: "contact_form",
          enabled: true,
          props: {
            title: {
              fr: "Échanger sur une opportunité ou un projet",
              en: "Discuss an opportunity or project",
              ar: "تواصل لمناقشة مشروع أو فرصة",
            },
          },
        },
      ],
      isPublished: true,
      inNavbar: true,
      inFooter: true,
      navOrder: 4,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "page_projets_default",
      slug: "projets",
      title: {
        fr: "Réalisations",
        en: "Projects",
        ar: "المشاريع",
      },
      description: {
        fr: "Études de cas, prototypes et solutions technologiques.",
        en: "Case studies, prototypes and technological solutions.",
        ar: "دراسات حالة ونماذج أولية وحلول تكنولوجية.",
      },
      blocks: [
        {
          id: "b_proj_grid",
          type: "projects_grid",
          enabled: true,
          props: {
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
                id: "p-stacgate",
                title: {
                  fr: "StacGate Platform",
                  en: "StacGate Platform",
                  ar: "منصة StacGate",
                },
                description: {
                  fr: "Plateforme souveraine modulaire combinant e-commerce haute performance et vitrine de solutions.",
                  en: "Sovereign modular platform combining high-performance e-commerce and solutions showcase.",
                  ar: "منصة سيادية معيارية تجمع بين التجارة الإلكترونية عالية الأداء ومعرض الحلول.",
                },
                category: "Software Architecture",
                tags: ["React 19", "Vite", "TypeScript", "SQLite"],
                demoUrl: "#",
                codeUrl: "#",
                image: "media/waymen-og-banner.webp",
              },
            ],
          },
        },
        {
          id: "b_proj_brand",
          type: "brand_banner",
          enabled: true,
        },
        {
          id: "b_proj_cta",
          type: "contact_cta",
          enabled: true,
        },
      ],
      isPublished: true,
      inNavbar: true,
      inFooter: true,
      navOrder: 5,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    // 🚚 VUES INSTITUTIONNELLES & LÉGALES (PHASE 46)
    {
      id: "page_shipping_returns",
      slug: "livraison-retours",
      title: {
        fr: "Livraison 58 Wilayas & Retours",
        en: "58 Wilayas Delivery & Returns",
        ar: "التوصيل لـ 58 ولاية والإرجاع",
      },
      description: {
        fr: "Délais, modalités de livraison en Cash-on-Delivery et politique de retour sous 48h.",
        en: "Deadlines, Cash-on-Delivery shipping terms and 48h return policy.",
        ar: "مواعيد وشروط التوصيل مع الدفع عند الاستلام وسياسة الإرجاع خلال 48 ساعة.",
      },
      blocks: [
        { id: "b_ship_banner", type: "brand_banner", enabled: true },
        { id: "b_ship_values", type: "values_grid", enabled: true },
        { id: "b_ship_faq", type: "faq_accordion", enabled: true },
        { id: "b_ship_cta", type: "contact_cta", enabled: true },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: true,
      navOrder: 6,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "page_warranty",
      slug: "garantie",
      title: {
        fr: "Garantie & Service Après-Vente",
        en: "Warranty & After-Sales Service",
        ar: "الضمان وخدمة ما بعد البيع",
      },
      description: {
        fr: "Garantie matérielle officielle 100% authentique et support technique réactif.",
        en: "100% genuine official hardware warranty and responsive tech support.",
        ar: "ضمان عتاد رسمي أصلي 100% ودعم فني متميز.",
      },
      blocks: [
        { id: "b_war_banner", type: "brand_banner", enabled: true },
        { id: "b_war_features", type: "features_grid", enabled: true },
        { id: "b_war_faq", type: "faq_accordion", enabled: true },
        { id: "b_war_contact", type: "direct_contact_cards", enabled: true },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: true,
      navOrder: 7,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "page_terms_conditions",
      slug: "conditions-generales",
      title: {
        fr: "Conditions Générales de Vente",
        en: "Terms & Conditions",
        ar: "الشروط العامة للبيع",
      },
      description: {
        fr: "Règles applicables aux commandes, paiements, livraisons et garanties sur la plateforme.",
        en: "Rules applicable to orders, payments, deliveries and warranties on the platform.",
        ar: "القواعد المطبقة على الطلبات والدفع والتوصيل والضمانات على المنصة.",
      },
      blocks: [
        { id: "b_terms_content", type: "markdown_section", enabled: true },
        { id: "b_terms_faq", type: "faq_accordion", enabled: true },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: true,
      navOrder: 8,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "page_legal_notices",
      slug: "mentions-legales",
      title: {
        fr: "Mentions Légales",
        en: "Legal Notices",
        ar: "الإشعارات القانونية",
      },
      description: {
        fr: "Informations légales relatives à l'éditeur de la plateforme StacGate et hébergement.",
        en: "Legal information regarding StacGate platform publisher and hosting.",
        ar: "المعلومات القانونية الخاصة بالناشر واستضافة منصة StacGate.",
      },
      blocks: [
        { id: "b_legal_content", type: "markdown_section", enabled: true },
        { id: "b_legal_cta", type: "contact_cta", enabled: true },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: true,
      navOrder: 9,
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    // ⚙️ VUES SYSTÈMES & PARCOURS DE CONVERSION ENRÔLÉES DANS LE STUDIO (PHASE 46)
    {
      id: "system_track",
      slug: "track",
      title: {
        fr: "Suivi de Commande en Direct",
        en: "Live Order Tracking",
        ar: "تتبع الطلبات المباشر",
      },
      description: {
        fr: "Suivez l'état d'acheminement de votre colis dans les 58 Wilayas.",
        en: "Track your parcel delivery across all 58 Wilayas.",
        ar: "تتبع مسار شحنتك عبر 58 ولاية.",
      },
      blocks: [
        {
          id: "b_track_contact",
          type: "direct_contact_cards",
          enabled: true,
          style: { placement: "bottom" },
        },
        {
          id: "b_track_faq",
          type: "faq_accordion",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 10,
      isSystem: true,
      systemKey: "track",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_blog",
      slug: "blog",
      title: {
        fr: "Actualités & Blog Tech",
        en: "Tech News & Blog",
        ar: "الأخبار والمدونة التقنية",
      },
      description: {
        fr: "Guides d'achat, comparatifs matériels et actualités informatiques.",
        en: "Buying guides, hardware comparisons and tech news.",
        ar: "أدلة الشراء والمقارنات التقنية وآخر الأخبار.",
      },
      blocks: [
        {
          id: "b_blog_promo",
          type: "promo_banner",
          enabled: true,
          props: {
            text: "Découvrez nos guides d'achat et comparatifs matériel 2026",
            label: "Explorer",
            href: "/category/laptops",
          },
          style: { placement: "top" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 11,
      isSystem: true,
      systemKey: "blog",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_builder",
      slug: "builder",
      title: {
        fr: "Configurateur PC Sur Mesure",
        en: "Custom PC Builder",
        ar: "مجمّع الحواسيب المخصص",
      },
      description: {
        fr: "Assemblez votre station de travail ou machine gaming composant par composant.",
        en: "Build your workstation or gaming PC component by component.",
        ar: "جمّع حاسوبك المكتبي أو المخصص للألعاب خطوة بخطوة.",
      },
      blocks: [
        {
          id: "b_builder_why",
          type: "why_us",
          enabled: true,
          style: { placement: "bottom" },
        },
        {
          id: "b_builder_faq",
          type: "faq_accordion",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 12,
      isSystem: true,
      systemKey: "builder",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_cart",
      slug: "cart",
      title: {
        fr: "Panier d'Achats & Réassurance",
        en: "Shopping Cart & Trust",
        ar: "سلة المشتريات والثقة",
      },
      description: {
        fr: "Récapitulatif de vos articles, réassurance et cross-selling.",
        en: "Review your items, trust guarantees and cross-selling.",
        ar: "مراجعة المنتجات وضمانات الثقة والمقترحات.",
      },
      blocks: [
        {
          id: "b_cart_best_sellers",
          type: "best_sellers",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 13,
      isSystem: true,
      systemKey: "cart",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_checkout_success",
      slug: "checkout-success",
      title: {
        fr: "Confirmation de Commande & Remerciements",
        en: "Order Confirmation & Thanks",
        ar: "تأكيد الطلب والشكر",
      },
      description: {
        fr: "Votre commande est enregistrée avec succès avec suivi WhatsApp direct.",
        en: "Your order has been placed successfully with direct WhatsApp follow-up.",
        ar: "تم تسجيل طلبك بنجاح مع متابعة مباشرة عبر الواتساب.",
      },
      blocks: [
        {
          id: "b_success_contact",
          type: "contact_cta",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 14,
      isSystem: true,
      systemKey: "checkout_success",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_not_found",
      slug: "404",
      title: {
        fr: "Page Introuvable (404)",
        en: "Page Not Found (404)",
        ar: "الصفحة غير موجودة (404)",
      },
      description: {
        fr: "La page demandée n'existe pas ou a été déplacée.",
        en: "The requested page does not exist or has been moved.",
        ar: "الصفحة المطلوبة غير موجودة أو تم نقلها.",
      },
      blocks: [
        {
          id: "b_404_categories",
          type: "category_cards",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 15,
      isSystem: true,
      systemKey: "not_found",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    // 🌟 VUES SYSTÈMES CATALOGUE & CONVERSION PARACHEVÉES (PHASE 49)
    {
      id: "system_product",
      slug: "product/:id",
      title: {
        fr: "Fiche Produit Catalogue",
        en: "Product Detail",
        ar: "تفاصيل المنتج",
      },
      description: {
        fr: "Présentation détaillée du produit, caractéristiques techniques, avis et commande.",
        en: "Detailed product presentation, technical specifications, reviews and purchase.",
        ar: "عرض تفصيلي للمنتج، المواصفات التقنية، التقييمات والشراء.",
      },
      blocks: [
        {
          id: "b_prod_why",
          type: "why_us",
          enabled: true,
          style: { placement: "bottom" },
        },
        {
          id: "b_prod_faq",
          type: "faq_accordion",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 16,
      isSystem: true,
      systemKey: "product",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_category_index",
      slug: "category",
      title: {
        fr: "Hub des Catégories",
        en: "Categories Hub",
        ar: "دليل الفئات",
      },
      description: {
        fr: "Explorez l'ensemble des départements et univers technologiques.",
        en: "Explore all tech categories and departments.",
        ar: "استكشف كافة أقسام ومجالات التكنولوجيا.",
      },
      blocks: [
        {
          id: "b_cat_banner",
          type: "brand_banner",
          enabled: true,
          style: { placement: "top" },
        },
        {
          id: "b_cat_why",
          type: "why_us",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 17,
      isSystem: true,
      systemKey: "category",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_category_detail",
      slug: "category/:slug",
      title: {
        fr: "Listing Catégorie & Filtres",
        en: "Category Listing & Filters",
        ar: "قائمة الفئة والتصفية",
      },
      description: {
        fr: "Catalogue filtrable par marque, usage et tranche tarifaire.",
        en: "Filterable catalog by brand, use case and price range.",
        ar: "كتالوج قابل للتصفية حسب العلامة والاستخدام والسعر.",
      },
      blocks: [
        {
          id: "b_catdet_banner",
          type: "promo_banner",
          enabled: true,
          props: {
            text: "Livraison express 58 wilayas disponible sur tout le catalogue",
            label: "Voir conditions",
            href: "/livraison-retours",
          },
          style: { placement: "top" },
        },
        {
          id: "b_catdet_faq",
          type: "faq_accordion",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 18,
      isSystem: true,
      systemKey: "category_detail",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_search",
      slug: "search",
      title: {
        fr: "Recherche & Filtres Avancés",
        en: "Catalog Search & Filters",
        ar: "البحث والتصفية المتقدمة",
      },
      description: {
        fr: "Moteur de recherche multicritère en temps réel sur l'ensemble du catalogue.",
        en: "Real-time multi-criteria search engine across the whole catalog.",
        ar: "محرك بحث متعدد المعايير وفوري لكافة المنتجات.",
      },
      blocks: [
        {
          id: "b_search_why",
          type: "why_us",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 19,
      isSystem: true,
      systemKey: "search",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_checkout",
      slug: "checkout",
      title: {
        fr: "Tunnel de Caisse & Paiement",
        en: "Checkout & Payment",
        ar: "إتمام الطلب والدفع",
      },
      description: {
        fr: "Validation de commande, coordonnées de livraison et choix du mode de paiement.",
        en: "Order validation, delivery address and payment method selection.",
        ar: "تأكيد الطلب وعنوان التوصيل واختيار طريقة الدفع.",
      },
      blocks: [
        {
          id: "b_chk_cards",
          type: "direct_contact_cards",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 20,
      isSystem: true,
      systemKey: "checkout",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_account",
      slug: "account",
      title: {
        fr: "Espace Client & Commandes",
        en: "Customer Account & Orders",
        ar: "حساب العميل والطلبات",
      },
      description: {
        fr: "Gestion du profil, carnet d'adresses et historique des commandes.",
        en: "Profile management, address book and order history.",
        ar: "إدارة الملف الشخصي ودفتر العناوين وسجل الطلبات.",
      },
      blocks: [
        {
          id: "b_acc_faq",
          type: "faq_accordion",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 21,
      isSystem: true,
      systemKey: "account",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_favorites",
      slug: "favorites",
      title: {
        fr: "Coups de Cœur & Favoris",
        en: "Wishlist & Favorites",
        ar: "قائمة المفضلة",
      },
      description: {
        fr: "Vos articles sauvegardés pour consultation ou achat ultérieur.",
        en: "Your saved items for later review or purchase.",
        ar: "منتجاتك المفضلة المحفوظة للمراجعة أو الشراء لاحقاً.",
      },
      blocks: [
        {
          id: "b_fav_bestsellers",
          type: "best_sellers",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 22,
      isSystem: true,
      systemKey: "favorites",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_blog_article",
      slug: "blog/:slug",
      title: {
        fr: "Lecture Article de Blog",
        en: "Blog Article Reader",
        ar: "قراءة مقال المدونة",
      },
      description: {
        fr: "Contenu éditorial, analyses matérielles et guides d'experts.",
        en: "Editorial content, hardware analysis and expert guides.",
        ar: "محتوى تحريري وتحليلات للعتاد وأدلة الخبراء.",
      },
      blocks: [
        {
          id: "b_art_cta",
          type: "contact_cta",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 23,
      isSystem: true,
      systemKey: "blog_article",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
    {
      id: "system_auth",
      slug: "auth",
      title: {
        fr: "Portail Authentification",
        en: "Authentication Portal",
        ar: "بوابة تسجيل الدخول",
      },
      description: {
        fr: "Connexion sécurisée et création de compte client.",
        en: "Secure login and customer account creation.",
        ar: "تسجيل دخول آمن وإنشاء حساب عميل.",
      },
      blocks: [
        {
          id: "b_auth_why",
          type: "why_us",
          enabled: true,
          style: { placement: "bottom" },
        },
      ],
      isPublished: true,
      inNavbar: false,
      inFooter: false,
      navOrder: 24,
      isSystem: true,
      systemKey: "auth",
      createdAt: "2026-11-08T00:00:00.000Z",
      updatedAt: "2026-11-08T00:00:00.000Z",
    },
  ];
  return rawPages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map(hydrateBlock),
  }));
}

export function seedSiteContent(): SiteContent {
  return {
    header: {
      showSearch: true,
      searchPlaceholder: {
        fr: "Rechercher un produit, une marque…",
        en: "Search a product, a brand…",
        ar: "ابحث عن منتج أو علامة تجارية…",
      },
      builderCta: {
        label: {
          fr: "Packs & Formations IA",
          en: "AI Packs & Courses",
          ar: "باقات ودورات الذكاء الاصطناعي",
        },
        href: "/category/packs-metiers",
      },
      primaryNav: [
        { id: "hn_blog", label: { fr: "Blog", en: "Blog", ar: "المدونة" }, href: "/blog" },
        { id: "hn_about", label: { fr: "À propos", en: "About", ar: "من نحن" }, href: "/about" },
        {
          id: "hn_contact",
          label: { fr: "Contact", en: "Contact", ar: "اتصل بنا" },
          href: "/contact",
        },
      ],
      categoryMenu: {
        label: { fr: "Catégories", en: "Categories", ar: "الفئات" },
        title: { fr: "Nos catégories", en: "Our categories", ar: "فئاتنا" },
        browseLabel: {
          fr: "Voir toutes les catégories",
          en: "Browse all categories",
          ar: "عرض كل الفئات",
        },
        browseHref: "/category",
        items: [
          {
            id: "hc_1",
            label: { fr: "Ordinateurs portables", en: "Laptops", ar: "أجهزة الكمبيوتر المحمولة" },
            href: "/category/laptops",
            icon: "laptop",
          },
          {
            id: "hc_2",
            label: { fr: "Ordinateurs de bureau", en: "Desktops", ar: "أجهزة الكمبيوتر المكتبية" },
            href: "/category/desktops",
            icon: "monitor",
          },
          {
            id: "hc_3",
            label: { fr: "Configurations", en: "Builds", ar: "التجميعات" },
            href: "/category/builds",
            icon: "cpu",
          },
          {
            id: "hc_4",
            label: { fr: "Téléphones", en: "Phones", ar: "الهواتف" },
            href: "/category/phones",
            icon: "smartphone",
          },
          {
            id: "hc_5",
            label: { fr: "Offres", en: "Deals", ar: "العروض" },
            href: "/search",
            icon: "tag",
            accent: true,
          },
        ],
      },
    },
    footer: {
      tagline: {
        fr: "Boutique en ligne officielle — sélection de produits de qualité, service client dédié et livraison fiable dans toute l'Algérie.",
        en: "Official online store — curated quality products, dedicated customer service, and reliable delivery across Algeria.",
        ar: "المتجر الإلكتروني الرسمي — تشكيلة من المنتجات عالية الجودة، خدمة عملاء متميزة وتوصيل موثوق لجميع أنحاء الجزائر.",
      },
      copyright: {
        fr: "© 2026 {storeName} — Tous droits réservés",
        en: "© 2026 {storeName} — All rights reserved",
        ar: "© 2026 {storeName} — جميع الحقوق محفوظة",
      },
      madeIn: {
        fr: "Fait avec passion & ❤️ par ArchiSys3.0",
        en: "Made with passion & ❤️ by ArchiSys3.0",
        ar: "صُنع بشغف و ❤️ بواسطة ArchiSys3.0",
      },
      socials: [
        {
          id: "s_fb",
          icon: "facebook",
          label: { fr: "Facebook", en: "Facebook", ar: "فيسبوك" },
          href: "#",
        },
        {
          id: "s_ig",
          icon: "instagram",
          label: { fr: "Instagram", en: "Instagram", ar: "إنستغرام" },
          href: "#",
        },
        {
          id: "s_wa",
          icon: "message-circle",
          label: { fr: "WhatsApp", en: "WhatsApp", ar: "واتساب" },
          href: "#",
        },
        {
          id: "s_tt",
          icon: "music",
          label: { fr: "TikTok", en: "TikTok", ar: "تيك توك" },
          href: "#",
        },
      ],
      columns: [
        {
          id: "fc_quick",
          title: { fr: "Liens rapides", en: "Quick links", ar: "روابط سريعة" },
          links: [
            { id: "fl_1", label: { fr: "Accueil", en: "Home", ar: "الرئيسية" }, href: "/" },
            {
              id: "fl_2",
              label: {
                fr: "Packs Métiers IA",
                en: "AI Pro Packs",
                ar: "باقات المهن الذكية",
              },
              href: "/category/packs-metiers",
            },
            {
              id: "fl_3",
              label: {
                fr: "Formations Academy",
                en: "Academy Courses",
                ar: "دورات الأكاديمية",
              },
              href: "/category/formations-academy",
            },
          ],
        },
        {
          id: "fc_cats",
          title: { fr: "Catégories", en: "Categories", ar: "الفئات" },
          links: [
            {
              id: "fl_4",
              label: { fr: "Ordinateurs portables", en: "Laptops", ar: "أجهزة الكمبيوتر المحمولة" },
              href: "/category/laptops",
            },
            {
              id: "fl_5",
              label: {
                fr: "Ordinateurs de bureau",
                en: "Desktops",
                ar: "أجهزة الكمبيوتر المكتبية",
              },
              href: "/category/desktops",
            },
            {
              id: "fl_6",
              label: { fr: "Configurations", en: "Builds", ar: "التجميعات" },
              href: "/category/builds",
            },
            {
              id: "fl_7",
              label: { fr: "Téléphones", en: "Phones", ar: "الهواتف" },
              href: "/category/phones",
            },
          ],
        },
        {
          id: "fc_sup",
          title: { fr: "Support & Suivi", en: "Support & Tracking", ar: "الدعم والتتبع" },
          links: [
            {
              id: "fl_8",
              label: { fr: "Contactez-nous", en: "Contact us", ar: "اتصل بنا" },
              href: "/contact",
            },
            {
              id: "fl_track",
              label: { fr: "Suivi de commande", en: "Order tracking", ar: "تتبع الطلبات" },
              href: "/track",
            },
            {
              id: "fl_9",
              label: { fr: "Garantie & SAV", en: "Warranty & Support", ar: "الضمان والدعم" },
              href: "/garantie",
            },
            {
              id: "fl_10",
              label: {
                fr: "Livraison 58 Wilayas",
                en: "58 Wilayas Shipping",
                ar: "التوصيل لـ 58 ولاية",
              },
              href: "/livraison-retours",
            },
          ],
        },
        {
          id: "fc_legal",
          title: { fr: "Informations Légales", en: "Legal & Terms", ar: "المعلومات القانونية" },
          links: [
            {
              id: "fl_cgv",
              label: { fr: "Conditions Générales", en: "Terms & Conditions", ar: "الشروط العامة" },
              href: "/conditions-generales",
            },
            {
              id: "fl_mentions",
              label: { fr: "Mentions Légales", en: "Legal Notices", ar: "الإشعارات القانونية" },
              href: "/mentions-legales",
            },
            {
              id: "fl_about",
              label: { fr: "À propos & Histoire", en: "About & Story", ar: "من نحن وقصتنا" },
              href: "/about",
            },
          ],
        },
      ],
    },
    hero: {
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
      title2: { fr: "activée pour vous", en: "unlocked for you", ar: "بين يديك وفريقك" },
      subtitle: {
        fr: "Accédez aux meilleurs outils IA mondiaux (ChatGPT Plus, Claude Pro, Midjourney, Cursor...) avec activation officielle sous 15 minutes et formez-vous à leur maîtrise.",
        en: "Access the world's leading AI platforms (ChatGPT Plus, Claude Pro, Midjourney, Cursor...) with official activation within 15 minutes and master them.",
        ar: "احصل على أقوى منصات الذكاء الاصطناعي العالمية مع تفعيل رسمي فوري خلال 15 دقيقة ودورات تدريبية عملية متخصصة.",
      },
      primaryCta: {
        label: {
          fr: "Découvrir les Abonnements",
          en: "Explore Subscriptions",
          ar: "استكشف الاشتراكات",
        },
        href: "/category/llm-assistants",
      },
      secondaryCta: {
        label: { fr: "Formations & Tutos", en: "Courses & Tutorials", ar: "الدورات والشروحات" },
        href: "/category/formations-academy",
      },
      kpis: [
        {
          id: "kpi_1",
          icon: "users",
          value: "+12 000",
          label: {
            fr: "utilisateurs formés & activés",
            en: "active users & learners",
            ar: "مستخدم ومستفيد مفعل",
          },
        },
        {
          id: "kpi_2",
          icon: "zap",
          value: "< 15 min",
          label: { fr: "délai d'activation", en: "activation delay", ar: "تفعيل فوري" },
        },
        {
          id: "kpi_3",
          icon: "shield",
          value: { fr: "100% garanti", en: "100% guaranteed", ar: "100% رسمي ومضمون" },
          label: { fr: "comptes officiels", en: "official accounts", ar: "حسابات رسمية" },
        },
      ],
      showImage: true,
    },
    categories: {
      title: {
        fr: "Nos Pôles de Compétences & Outils",
        en: "Our AI Tools & Academy Pillars",
        ar: "أقسام المنصات والدورات",
      },
      subtitle: {
        fr: "Choisissez l'abonnement ou la formation adapté à vos besoins",
        en: "Choose the subscription or course tailored to your needs",
        ar: "اختر الاشتراك أو البرنامج التدريبي الأنسب لأهدافك",
      },
      browseLabel: { fr: "Parcourir", en: "Browse", ar: "تصفح" },
    },
    useChips: {
      title: { fr: "Achetez par usage", en: "Shop by use case", ar: "تسوق حسب الاستخدام" },
    },
    bestSellers: {
      title: {
        fr: "Top Abonnements & Formations",
        en: "Top Subscriptions & Courses",
        ar: "الاشتراكات والدورات الأكثر طلبًا",
      },
      subtitle: {
        fr: "Les outils et masterclass préférés de nos clients",
        en: "Our customers' favorite tools and masterclasses",
        ar: "المنصات والبرامج الأكثر تفضيلاً لدى عملائنا",
      },
    },
    featuredTabs: {
      title: {
        fr: "Sélection Phare WaYmen",
        en: "Featured WaYmen Selection",
        ar: "مختارات وايمان المميزة",
      },
      subtitle: {
        fr: "Découvrez les plateformes les plus puissantes du moment",
        en: "Discover the most powerful AI platforms available today",
        ar: "اكتشف أقوى أدوات وحزم الذكاء الاصطناعي المتاحة",
      },
      tabs: [
        {
          id: "t_1",
          categorySlug: "llm-assistants",
          label: { fr: "Assistants LLM", en: "LLM Assistants", ar: "مساعدو LLM" },
        },
        {
          id: "t_2",
          categorySlug: "creative-media",
          label: { fr: "Création Visuelle", en: "Creative Media", ar: "التوليد الفني" },
        },
        {
          id: "t_3",
          categorySlug: "code-engineering",
          label: { fr: "Code & Dev IA", en: "Code & Dev AI", ar: "برمجة الذكاء الاصطناعي" },
        },
        {
          id: "t_4",
          categorySlug: "formations-academy",
          label: { fr: "Formations IA", en: "AI Academy", ar: "دورات الأكاديمية" },
        },
      ],
    },
    flashSale: {
      badge: { fr: "Offres Flash de la Semaine", en: "Deals of the week", ar: "عروض الأسبوع" },
      title: {
        fr: "Tarifs Réduits sur Abonnements Annuels",
        en: "Discounted Rates on Annual Plans",
        ar: "تخفيضات استثنائية على الاشتراكات السنوية",
      },
      viewAllLabel: {
        fr: "Voir tous les abonnements",
        en: "View all subscriptions",
        ar: "عرض جميع الاشتراكات",
      },
      viewAllHref: "/category/llm-assistants",
      countdownHours: 71,
    },
    brandsMarquee: {
      title: {
        fr: "Partenaire des plus grands écosystèmes mondiaux de l'IA",
        en: "Partnering with the world's leading AI ecosystems",
        ar: "شريك لأقوى المنصات والشركات الرائدة عالميًا في الذكاء الاصطناعي",
      },
    },
    whyUs: {
      kicker: {
        fr: "Pourquoi choisir WaYmen AI Studio",
        en: "Why choose WaYmen AI Studio",
        ar: "لماذا تختار وايمان ستوديو",
      },
      title1: {
        fr: "Votre partenaire de confiance",
        en: "Your trusted partner",
        ar: "شريككم الموثوق",
      },
      title2: { fr: "pour l'ère de l'IA", en: "for the AI era", ar: "لعصر الذكاء الاصطناعي" },
      subtitle: {
        fr: "Nous garantissons des activations 100% officielles, un support continu et des formations pratiques.",
        en: "We guarantee 100% official activations, continuous support and hands-on training.",
        ar: "نضمن تفعيلات رسمية 100%، ودعمًا فنيًا مستمرًا، ودورات عملية ترتقي بمهاراتكم.",
      },
      items: [
        {
          id: "w_1",
          icon: "shield",
          title: {
            fr: "Activations Officielles",
            en: "Official Activations",
            ar: "تفعيل رسمي 100%",
          },
          description: {
            fr: "Comptes légitimes, sans risque de suspension, garantie intégrale",
            en: "Legitimate accounts, zero suspension risk, full warranty",
            ar: "حسابات رسمية ومضمونة بدون أي انقطاع طوال فترة الاشتراك",
          },
        },
        {
          id: "w_2",
          icon: "zap",
          title: {
            fr: "Activation < 15 Min",
            en: "Fast Delivery < 15 Min",
            ar: "تفعيل فوري خلال دقائق",
          },
          description: {
            fr: "Réception de vos accès et guides par Email et WhatsApp sans délai",
            en: "Instant delivery of your credentials and guides via Email & WhatsApp",
            ar: "استلام فوري لبيانات التفعيل والأدلة عبر الإيميل والواتساب",
          },
        },
        {
          id: "w_3",
          icon: "headphones",
          title: {
            fr: "Support & Tutos 7j/7",
            en: "7/7 Support & Guides",
            ar: "دعم فني وشروحات 7/7",
          },
          description: {
            fr: "Accompagnement personnalisé et assistance à l'utilisation de chaque outil",
            en: "Dedicated support and usage walkthroughs for every tool",
            ar: "متابعة مستمرة ومساعدة في تشغيل وتوظيف الأدوات بأعلى كفاءة",
          },
        },
        {
          id: "w_4",
          icon: "credit-card",
          title: {
            fr: "Paiement Local Sécurisé",
            en: "Secure Local Payment",
            ar: "دفع محلي آمن ومريح",
          },
          description: {
            fr: "Règlement facile en Dinar : BaridiMob, CCP, Carte Edahabia, Virement",
            en: "Easy payment in DZD: BaridiMob, CCP, Edahabia Card, Bank Transfer",
            ar: "طرق دفع سهلة وآمنة بالدينار: بريدي موب، CCP، بطاقة الذهبية، وتحويل",
          },
        },
      ],
    },
    builderTeaser: {
      badge: {
        fr: "Configurateur de Pack IA",
        en: "AI Pack Builder",
        ar: "أداة تخصيص باقات الذكاء الاصطناعي",
      },
      title: {
        fr: "Composez votre Pack IA Sur-Mesure",
        en: "Build your custom AI bundle",
        ar: "صمم باقة اشتراكاتك ودوراتك المخصصة",
      },
      subtitle: {
        fr: "Combinez vos outils d'IA préférés (LLM, Vidéo, Code) avec des formations ciblées et profitez d'une remise exclusive.",
        en: "Combine your favorite AI tools (LLM, Video, Code) with targeted training and enjoy exclusive bundle discounts.",
        ar: "اجمع بين منصاتك المفضلة (توليد، كود، تصميم) مع برامج تدريبية متخصصة واحصل على تخفيض فوري.",
      },
      cta: {
        label: { fr: "Composer mon Pack", en: "Build my Pack", ar: "ابدأ بتجميع باقتك" },
        href: "/category/packs-bundles",
      },
      items: [
        {
          id: "bt_1",
          icon: "cpu",
          title: { fr: "Assistants LLM", en: "LLM Assistants", ar: "نماذج LLM" },
          subtitle: "ChatGPT · Claude · Gemini",
        },
        {
          id: "bt_2",
          icon: "monitor",
          title: { fr: "Création Visuelle", en: "Visual Creation", ar: "التوليد البصري" },
          subtitle: "Midjourney · Runway · 11Labs",
        },
        {
          id: "bt_3",
          icon: "hard-drive",
          title: { fr: "Outils Dev & Code", en: "Code & Dev Tools", ar: "أدوات المطورين" },
          subtitle: "Cursor Pro · GitHub Copilot",
        },
        {
          id: "bt_4",
          icon: "award",
          title: { fr: "Waymen Academy", en: "Waymen Academy", ar: "أكاديمية وايمان" },
          subtitle: "Masterclass · Coaching",
        },
      ],
    },
    reviews: {
      title: { fr: "Avis de nos clients", en: "Customer reviews", ar: "آراء زبائننا" },
      subtitle: {
        fr: "Des milliers de clients nous font confiance",
        en: "Thousands of customers trust us",
        ar: "آلاف الزبائن يثقون بنا",
      },
    },
    contactCta: {
      title: {
        fr: "Une question ? Contactez-nous",
        en: "Got a question? Contact us",
        ar: "لديك سؤال؟ تواصل معنا",
      },
      subtitle: {
        fr: "Notre équipe est disponible du dimanche au jeudi, de 9h à 19h.",
        en: "Our team is available Sunday to Thursday, 9am to 7pm.",
        ar: "فريقنا متاح من الأحد إلى الخميس، من 9 صباحًا إلى 7 مساءً.",
      },
      whatsappLabel: {
        fr: "Écrivez-nous sur WhatsApp",
        en: "Message us on WhatsApp",
        ar: "راسلنا عبر واتساب",
      },
    },
    floatingWhatsApp: {
      enabled: true,
      ariaLabel: { fr: "WhatsApp", en: "WhatsApp", ar: "واتساب" },
    },
    mobileBottomBar: {
      items: [
        {
          id: "mb_1",
          icon: "home",
          label: { fr: "Accueil", en: "Home", ar: "الرئيسية" },
          href: "/",
        },
        {
          id: "mb_2",
          icon: "grid",
          label: { fr: "Catégories", en: "Categories", ar: "الفئات" },
          href: "/category",
        },
        {
          id: "mb_3",
          icon: "zap",
          label: { fr: "Packs IA", en: "AI Packs", ar: "باقات الذكاء" },
          href: "/category/packs-metiers",
          primary: true,
        },
        {
          id: "mb_4",
          icon: "shopping-cart",
          label: { fr: "Panier", en: "Cart", ar: "السلة" },
          href: "/cart",
          requiresAuth: true,
        },
        {
          id: "mb_5",
          icon: "user",
          label: { fr: "Compte", en: "Account", ar: "الحساب" },
          href: "/account",
          requiresAuth: true,
        },
      ],
    },
    about: {
      kicker: { fr: "À propos", en: "About", ar: "من نحن" },
      title: {
        fr: "{storeName} — L'Intelligence Artificielle à Votre Portée",
        en: "{storeName} — Artificial Intelligence within Your Reach",
        ar: "{storeName} — الذكاء الاصطناعي في متناول يدك",
      },
      intro: {
        fr: "Nous sommes le hub de référence spécialisé dans l'activation d'abonnements IA officiels (OpenAI, Anthropic, Midjourney, Cursor...), la fourniture de licences SaaS et les formations professionnelles d'élite. Notre mission : démocratiser l'IA générative et propulser les créatifs, développeurs et entreprises vers l'excellence.",
        en: "We are the leading hub specialized in official AI subscriptions (OpenAI, Anthropic, Midjourney, Cursor...), SaaS licensing and elite professional masterclasses. Our mission: democratize generative AI and empower creators, developers and businesses.",
        ar: "نحن المركز الرائد المتخصص في تفعيل اشتراكات الذكاء الاصطناعي الرسمية وحلول البرمجيات والدورات التدريبية الاحترافية. مهمتنا: تمكين المحترفين والمطورين وصناع المحتوى من أدوات المستقبل.",
      },
      historyTitle: { fr: "Notre histoire", en: "Our story", ar: "قصتنا" },
      historyBody: {
        fr: "{storeName} est née d'une vision pionnière : rendre accessibles les outils d'IA les plus performants du monde sans friction de paiement international, avec un accompagnement humain sur-mesure et un transfert de compétences continu via notre Academy.",
        en: "{storeName} was born from a pioneering vision: make the world's most powerful AI tools accessible without payment friction, with tailored human guidance and continuous learning via our Academy.",
        ar: "تأسست {storeName} برؤية رائدة: تسهيل الوصول إلى أقوى منصات الذكاء الاصطناعي العالمية بكل سهولة، مع توفير مرافقة استشارية ودورات تدريبية متخصصة عبر أكاديميتنا.",
      },
      missionTitle: { fr: "Notre mission", en: "Our mission", ar: "مهمتنا" },
      missionBody: {
        fr: "Activer vos accès officiels en moins de 15 minutes, garantir la pérennité de vos licences sans coupure, et former chaque apprenant à maîtriser concrètement les outils IA dans son métier.",
        en: "Activate your official access in under 15 minutes, guarantee seamless license continuity, and train every learner to master AI in their daily workflows.",
        ar: "تفعيل حساباتك الرسمية في أقل من 15 دقيقة، وضمان استمرارية اشتراكاتك، وتدريبك على توظيف الذكاء الاصطناعي عملياً في مجالك المهني.",
      },
      ctaTitle: {
        fr: "Prêt à propulser vos projets avec l'IA ?",
        en: "Ready to boost your projects with AI?",
        ar: "جاهز لتطوير أعمالك بالذكاء الاصطناعي؟",
      },
      ctaSubtitle: {
        fr: "Découvrez notre catalogue d'abonnements et rejoignez la Waymen Academy.",
        en: "Explore our subscription catalog and join Waymen Academy.",
        ar: "اكتشف كتالوج الاشتراكات وانضم إلى أكاديمية وايمان.",
      },
      ctaBrowseLabel: {
        fr: "Parcourir les abonnements",
        en: "Browse subscriptions",
        ar: "استكشف الاشتراكات",
      },
      ctaContactLabel: { fr: "Contactez-nous", en: "Contact us", ar: "اتصل بنا" },
      values: [
        {
          id: "val_1",
          icon: "shield",
          title: {
            fr: "Licences Officielles",
            en: "Official Licenses",
            ar: "تراخيص رسمية",
          },
          description: {
            fr: "Comptes et abonnements officiels garantis sans coupure ni risque de suspension.",
            en: "Official accounts and guaranteed continuous subscriptions without suspension.",
            ar: "حسابات رسمية وتراخيص أصلية مضمونة دون انقطاع.",
          },
        },
        {
          id: "val_2",
          icon: "award",
          title: {
            fr: "Activation Express",
            en: "Express Activation",
            ar: "تفعيل فوري",
          },
          description: {
            fr: "Livraison dématérialisée et configuration guidée en moins de 15 minutes 7j/7.",
            en: "Digital delivery and setup assistance in under 15 minutes, 7/7.",
            ar: "تسليم رقمي وتفعيل موجه خلال أقل من 15 دقيقة طيلة أيام الأسبوع.",
          },
        },
        {
          id: "val_3",
          icon: "headphones",
          title: {
            fr: "Support & Coaching",
            en: "Support & Coaching",
            ar: "دعم واستشارات",
          },
          description: {
            fr: "Assistance réactive sur WhatsApp et conseils personnalisés pour choisir le bon outil.",
            en: "Fast WhatsApp assistance and tailored advice to pick the right AI tool.",
            ar: "دعم سريع عبر واتساب واستشارات لتحديد الأدوات الأنسب لاحتياجاتك.",
          },
        },
        {
          id: "val_4",
          icon: "award",
          title: {
            fr: "Waymen Academy",
            en: "Waymen Academy",
            ar: "أكاديمية وايمان",
          },
          description: {
            fr: "Masterclass concrètes, tutoriels pas-à-pas et coaching pour tous niveaux.",
            en: "Hands-on masterclasses, step-by-step guides and coaching for all skill levels.",
            ar: "دورات تدريبية عملية وشروحات تطبيقية لجميع المستويات.",
          },
        },
      ],
    },
    contact: {
      kicker: { fr: "Contact & Support", en: "Contact & Support", ar: "الاتصال والدعم" },
      title: {
        fr: "Une question ? Écrivez-nous !",
        en: "Any question? Write to us!",
        ar: "هل لديك سؤال؟ راسلنا!",
      },
      subtitle: {
        fr: "Notre équipe vous répond sous 24h ouvrées. Retrouvez aussi les réponses aux questions les plus fréquentes.",
        en: "Our team responds within 24 business hours. You can also find answers to frequent questions below.",
        ar: "فريقنا يجيبكم خلال 24 ساعة عمل. كما يمكنكم الاطلاع على إجابات الأسئلة الشائعة أدناه.",
      },
      faqs: [
        {
          id: "faq_1",
          question: {
            fr: "Quels sont les délais et modalités de livraison ?",
            en: "What are the delivery times and methods?",
            ar: "ما هي آجال وطرق التوصيل؟",
          },
          answer: {
            fr: "Nous livrons sur l'ensemble des 58 wilayas d'Algérie en 24h à 72h ouvrées selon votre localisation, avec suivi en direct et paiement à la livraison.",
            en: "We deliver across all 58 wilayas in Algeria within 24h to 72h depending on your location, with tracking and cash on delivery.",
            ar: "نقوم بالتوصيل إلى جميع ولايات الجزائر الـ 58 خلال 24 إلى 72 ساعة عمل حسب موقعكم، مع تتبع مباشر والدفع عند الاستلام.",
          },
        },
        {
          id: "faq_2",
          question: {
            fr: "Les produits bénéficient-ils d'une garantie ?",
            en: "Do products come with a warranty?",
            ar: "هل المنتجات مشمولة بضمان؟",
          },
          answer: {
            fr: "Tous nos articles sont 100% authentiques et couverts par une garantie officielle revendeur agréé avec service après-vente dédié.",
            en: "All our products are 100% authentic and covered by an official authorized dealer warranty with dedicated after-sales support.",
            ar: "جميع منتجاتنا أصلية 100% ومغطاة بضمان رسمي من الموزع المعتمد مع خدمة ما بعد البيع.",
          },
        },
        {
          id: "faq_3",
          question: {
            fr: "Puis-je commander directement via WhatsApp ?",
            en: "Can I order directly via WhatsApp?",
            ar: "هل يمكنني الطلب مباشرة عبر واتساب؟",
          },
          answer: {
            fr: "Absolument ! Cliquez sur le bouton WhatsApp sur n'importe quelle fiche produit ou dans notre en-tête pour échanger directement avec un conseiller commercial.",
            en: "Absolutely! Click the WhatsApp button on any product page or in our header to chat directly with a sales advisor.",
            ar: "بالتأكيد! اضغط على زر واتساب في أي صفحة منتج أو في أعلى الموقع للتواصل مباشرة مع مستشار المبيعات.",
          },
        },
      ],
    },
    customPages: seedCustomPages(),
  };
}

/** Deep-merge a persisted siteContent with the current seed to keep new fields safe. */
export function mergeSiteContent(seed: SiteContent, partial?: Partial<SiteContent>): SiteContent {
  if (!partial) return seed;
  const out = { ...seed } as SiteContent;
  (Object.keys(seed) as (keyof SiteContent)[]).forEach((k) => {
    const s = seed[k] as unknown;
    const p = (partial as Record<string, unknown>)[k];
    if (
      p &&
      typeof p === "object" &&
      !Array.isArray(p) &&
      typeof s === "object" &&
      s &&
      !Array.isArray(s)
    ) {
      (out as Record<string, unknown>)[k] = { ...(s as object), ...(p as object) };
    } else if (p !== undefined) {
      if (k === "customPages" && Array.isArray(p) && Array.isArray(s)) {
        const persistedPages = p as CustomPageDefinition[];
        const seedPages = s as CustomPageDefinition[];
        // On préserve toutes les modifications de l'utilisateur, et on injecte les pages système manquantes
        const missingSeedPages = seedPages.filter(
          (sp) =>
            !persistedPages.some(
              (pp) =>
                pp.id === sp.id ||
                (sp.slug === "" && (pp.slug === "" || pp.slug === "home")) ||
                (sp.slug !== "" && pp.slug.toLowerCase() === sp.slug.toLowerCase()),
            ),
        );
        const homeInMissing = missingSeedPages.find((sp) => sp.id === "page_home");
        const otherMissing = missingSeedPages.filter((sp) => sp.id !== "page_home");
        const rawMerged = homeInMissing
          ? [homeInMissing, ...persistedPages, ...otherMissing]
          : [...persistedPages, ...missingSeedPages];

        // 🛡️ Réconciliation profonde par bloc : préserve les modifications utilisateur tout en hydratant les props & styles
        const merged = rawMerged.map((page) => {
          const matchingSeedPage = seedPages.find(
            (sp) =>
              sp.id === page.id ||
              (sp.slug === "" && (page.slug === "" || page.slug === "home")) ||
              (sp.slug !== "" && page.slug.toLowerCase() === sp.slug.toLowerCase()),
          );
          const blocks = (page.blocks || []).map((b) => {
            const seedBlock = matchingSeedPage?.blocks?.find(
              (sb) => sb.id === b.id || sb.type === b.type,
            );
            const defaultProps = seedBlock?.props || {};
            const defaultStyle: BlockStyleConfig = seedBlock?.style || {
              padding: "normal",
              bg: "transparent",
              align: "start",
            };
            return {
              ...b,
              props: { ...defaultProps, ...(b.props || {}) },
              style: { ...defaultStyle, ...(b.style || {}) },
            };
          });
          return {
            ...matchingSeedPage,
            ...page,
            blocks,
          };
        });

        (out as Record<string, unknown>)[k] = merged;
      } else if (typeof s === "object" && s && !Array.isArray(s) && Array.isArray(p)) {
        if (k === "about") {
          const values = p.length > 0 ? p : (s as { values?: unknown[] }).values;
          (out as Record<string, unknown>)[k] = { ...(s as object), values };
        } else {
          (out as Record<string, unknown>)[k] = s;
        }
      } else {
        (out as Record<string, unknown>)[k] = p;
      }
    }
  });
  return out;
}
