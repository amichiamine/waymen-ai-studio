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
    badge: LS;
    title1: LS;
    title2: LS;
    subtitle: LS;
    primaryCta: Cta;
    secondaryCta: Cta;
    kpis: { id: string; icon: IconName; value: LS; label: LS }[];
    showImage: boolean;
  };
  categories: { title: LS; subtitle: LS; browseLabel: LS };
  useChips: { title: LS };
  bestSellers: { title: LS; subtitle: LS };
  featuredTabs: {
    title: LS;
    subtitle: LS;
    tabs: { id: string; categorySlug: Category; label: LS }[];
  };
  flashSale: {
    badge: LS;
    title: LS;
    viewAllLabel: LS;
    viewAllHref: string;
    countdownHours: number;
  };
  brandsMarquee: { title: LS };
  whyUs: {
    kicker: LS;
    title1: LS;
    title2: LS;
    subtitle: LS;
    items: { id: string; icon: IconName; title: LS; description: LS }[];
  };
  builderTeaser: {
    badge: LS;
    title: LS;
    subtitle: LS;
    cta: Cta;
    items: { id: string; icon: IconName; title: LS; subtitle: LS }[];
  };
  reviews: { title: LS; subtitle: LS };
  contactCta: { title: LS; subtitle: LS; whatsappLabel: LS };
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
};

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
        label: { fr: "Configurez votre PC", en: "Build your PC", ar: "جمّع حاسوبك" },
        href: "/builder",
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
        fr: "Boutique en ligne spécialisée dans la vente d'ordinateurs, de téléphones et d'accessoires — livraison dans toute l'Algérie avec garantie officielle.",
        en: "Online store specialized in computers, phones and accessories — delivery across Algeria with official warranty.",
        ar: "متجر إلكتروني متخصص في بيع الحواسيب والهواتف والملحقات — توصيل لكل أنحاء الجزائر مع ضمان رسمي.",
      },
      copyright: {
        fr: "© 2026 {storeName} — Tous droits réservés",
        en: "© 2026 {storeName} — All rights reserved",
        ar: "© 2026 {storeName} — جميع الحقوق محفوظة",
      },
      madeIn: {
        fr: "Fait avec passion en Algérie",
        en: "Made with passion in Algeria",
        ar: "صُنع بشغف في الجزائر",
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
              label: { fr: "Configurez votre PC", en: "Build your PC", ar: "جمّع حاسوبك" },
              href: "/builder",
            },
            {
              id: "fl_3",
              label: { fr: "Offres", en: "Deals", ar: "العروض" },
              href: "/category/laptops",
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
          title: { fr: "Support", en: "Support", ar: "الدعم" },
          links: [
            {
              id: "fl_8",
              label: { fr: "Contactez-nous", en: "Contact us", ar: "اتصل بنا" },
              href: "/contact",
            },
            { id: "fl_9", label: { fr: "Garantie", en: "Warranty", ar: "الضمان" }, href: "/about" },
            {
              id: "fl_10",
              label: { fr: "Livraison", en: "Shipping", ar: "التوصيل" },
              href: "/about",
            },
            { id: "fl_11", label: { fr: "FAQ", en: "FAQ", ar: "الأسئلة الشائعة" }, href: "/about" },
          ],
        },
      ],
    },
    hero: {
      badge: {
        fr: "Collection 2026 disponible",
        en: "2026 collection available",
        ar: "مجموعة 2026 متوفرة",
      },
      title1: { fr: "La puissance tech,", en: "Tech power,", ar: "قوة التكنولوجيا،" },
      title2: { fr: "entre vos mains", en: "in your hands", ar: "بين يديك" },
      subtitle: {
        fr: "Les derniers ordinateurs portables, de bureau et téléphones aux meilleurs prix, avec garantie officielle et support technique dédié.",
        en: "The latest laptops, desktops and phones at the best prices, with official warranty and dedicated tech support.",
        ar: "أحدث أجهزة الكمبيوتر المحمولة والمكتبية والهواتف بأفضل الأسعار، مع ضمان رسمي ودعم تقني مخصص.",
      },
      primaryCta: {
        label: { fr: "Acheter maintenant", en: "Shop now", ar: "تسوق الآن" },
        href: "/category/laptops",
      },
      secondaryCta: {
        label: { fr: "Offres du jour", en: "Today's deals", ar: "عروض اليوم" },
        href: "/category/laptops",
      },
      kpis: [
        {
          id: "kpi_1",
          icon: "users",
          value: "+5 000",
          label: { fr: "clients satisfaits", en: "happy customers", ar: "زبون راضٍ" },
        },
        {
          id: "kpi_2",
          icon: "package",
          value: "+1 200",
          label: { fr: "produits", en: "products", ar: "منتجات" },
        },
        {
          id: "kpi_3",
          icon: "map-pin",
          value: { fr: "58 wilayas", en: "58 wilayas", ar: "58 ولاية" },
          label: { fr: "livraison", en: "delivery", ar: "التوصيل" },
        },
      ],
      showImage: true,
    },
    categories: {
      title: { fr: "Achetez par catégorie", en: "Shop by category", ar: "تسوق حسب الفئة" },
      subtitle: {
        fr: "Choisissez la catégorie qui vous convient",
        en: "Pick the category that suits you",
        ar: "اختر الفئة التي تناسبك",
      },
      browseLabel: { fr: "Parcourir", en: "Browse", ar: "تصفح" },
    },
    useChips: {
      title: { fr: "Achetez par usage", en: "Shop by use case", ar: "تسوق حسب الاستخدام" },
    },
    bestSellers: {
      title: { fr: "Meilleures ventes", en: "Best sellers", ar: "الأكثر مبيعًا" },
      subtitle: {
        fr: "Les produits préférés de nos clients",
        en: "Our customers' favorite products",
        ar: "المنتجات المفضلة لدى زبائننا",
      },
    },
    featuredTabs: {
      title: { fr: "Produits sélectionnés", en: "Featured products", ar: "منتجات مختارة" },
      subtitle: {
        fr: "Découvrez les nouveautés dans chaque catégorie",
        en: "Discover what's new in every category",
        ar: "اكتشف الجديد في كل فئة",
      },
      tabs: [
        {
          id: "t_1",
          categorySlug: "laptops",
          label: { fr: "Portables", en: "Laptops", ar: "محمولة" },
        },
        {
          id: "t_2",
          categorySlug: "desktops",
          label: { fr: "Bureau", en: "Desktops", ar: "مكتبية" },
        },
        {
          id: "t_3",
          categorySlug: "builds",
          label: { fr: "Configs", en: "Builds", ar: "تجميعات" },
        },
        {
          id: "t_4",
          categorySlug: "phones",
          label: { fr: "Téléphones", en: "Phones", ar: "هواتف" },
        },
      ],
    },
    flashSale: {
      badge: { fr: "Offres de la semaine", en: "Deals of the week", ar: "عروض الأسبوع" },
      title: {
        fr: "Réductions à durée limitée",
        en: "Limited-time discounts",
        ar: "تخفيضات لفترة محدودة",
      },
      viewAllLabel: { fr: "Voir toutes les offres", en: "See all deals", ar: "عرض كل العروض" },
      viewAllHref: "/category/laptops",
      countdownHours: 71,
    },
    brandsMarquee: {
      title: {
        fr: "Nous travaillons avec les plus grandes marques",
        en: "We work with the biggest brands",
        ar: "نتعامل مع أكبر العلامات التجارية",
      },
    },
    whyUs: {
      kicker: { fr: "Pourquoi nous choisir", en: "Why choose us", ar: "لماذا تختارنا" },
      title1: {
        fr: "Parce que vos projets méritent",
        en: "Because your projects deserve",
        ar: "لأن مشاريعكم تستحق",
      },
      title2: { fr: "un partenaire de confiance", en: "a trusted partner", ar: "شريكًا موثوقًا" },
      subtitle: {
        fr: "Nous sélectionnons nos produits avec soin et nous engageons sur chaque achat.",
        en: "We carefully select our products and stand behind every purchase.",
        ar: "نختار منتجاتنا بعناية ونلتزم بكل عملية شراء.",
      },
      items: [
        {
          id: "w_1",
          icon: "shield",
          title: { fr: "Garantie officielle", en: "Official warranty", ar: "ضمان رسمي" },
          description: {
            fr: "Garantie revendeur agréé sur tous les produits",
            en: "Authorized reseller warranty on all products",
            ar: "ضمان الموزع المعتمد على جميع المنتجات",
          },
        },
        {
          id: "w_2",
          icon: "truck",
          title: { fr: "Livraison rapide", en: "Fast delivery", ar: "توصيل سريع" },
          description: {
            fr: "Livraison dans toutes les wilayas en 24-72 heures",
            en: "Delivery to all wilayas in 24-72 hours",
            ar: "توصيل لجميع الولايات في 24-72 ساعة",
          },
        },
        {
          id: "w_3",
          icon: "headphones",
          title: { fr: "Support technique", en: "Tech support", ar: "دعم تقني" },
          description: {
            fr: "Une équipe dédiée avant et après l'achat",
            en: "A dedicated team before and after purchase",
            ar: "فريق مخصص قبل وبعد الشراء",
          },
        },
        {
          id: "w_4",
          icon: "credit-card",
          title: { fr: "Paiement sécurisé", en: "Secure payment", ar: "دفع آمن" },
          description: {
            fr: "Payez à la livraison ou via des moyens approuvés",
            en: "Pay on delivery or via approved methods",
            ar: "ادفع عند الاستلام أو بوسائل معتمدة",
          },
        },
      ],
    },
    builderTeaser: {
      badge: { fr: "Outil de configuration", en: "Config tool", ar: "أداة التجميع" },
      title: {
        fr: "Concevez votre config idéale",
        en: "Design your ideal build",
        ar: "صمم تجميعتك المثالية",
      },
      subtitle: {
        fr: "Sélectionnez vos composants étape par étape, vérifiez la compatibilité et voyez le prix final en direct.",
        en: "Pick components step by step, check compatibility and see the final price live.",
        ar: "اختر مكوناتك خطوة بخطوة، تحقق من التوافق وشاهد السعر النهائي مباشرة.",
      },
      cta: {
        label: { fr: "Commencer la config", en: "Start building", ar: "ابدأ التجميع" },
        href: "/builder",
      },
      items: [
        {
          id: "bt_1",
          icon: "cpu",
          title: { fr: "Processeurs", en: "Processors", ar: "المعالجات" },
          subtitle: "Intel · AMD",
        },
        {
          id: "bt_2",
          icon: "memory",
          title: { fr: "Mémoire", en: "Memory", ar: "الذاكرة" },
          subtitle: "DDR4 · DDR5",
        },
        {
          id: "bt_3",
          icon: "hard-drive",
          title: { fr: "Stockage", en: "Storage", ar: "التخزين" },
          subtitle: "NVMe Gen4",
        },
        {
          id: "bt_4",
          icon: "zap",
          title: { fr: "Refroidissement", en: "Cooling", ar: "التبريد" },
          subtitle: { fr: "Air · Liquide", en: "Air · Liquid", ar: "هواء · سائل" },
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
          icon: "wrench",
          label: { fr: "Configurer", en: "Build", ar: "تجميع" },
          href: "/builder",
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
      (out as Record<string, unknown>)[k] = p;
    }
  });
  return out;
}
