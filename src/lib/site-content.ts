import {
  Shield, Truck, Headphones, Award, Star, Heart, Users, Package, MapPin,
  Cpu, MemoryStick, HardDrive, Zap, MessageCircle, Flame, CreditCard,
  Monitor, Laptop, Smartphone, Wrench, Grid3x3, Home as HomeIcon, User,
  ShoppingCart, Boxes, Gift, Tag,
  Facebook, Instagram, Music2, Twitter, Youtube, Linkedin, Mail, Phone,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/data/products";

export type IconName =
  | "shield" | "truck" | "headphones" | "award" | "star" | "heart"
  | "users" | "package" | "map-pin" | "cpu" | "memory" | "hard-drive"
  | "zap" | "message-circle" | "flame" | "credit-card" | "monitor"
  | "laptop" | "smartphone" | "wrench" | "grid" | "home" | "user"
  | "shopping-cart" | "boxes" | "gift" | "tag"
  | "facebook" | "instagram" | "music" | "twitter" | "youtube" | "linkedin" | "mail" | "phone";

export const ICONS: Record<IconName, LucideIcon> = {
  shield: Shield, truck: Truck, headphones: Headphones, award: Award,
  star: Star, heart: Heart, users: Users, package: Package, "map-pin": MapPin,
  cpu: Cpu, memory: MemoryStick, "hard-drive": HardDrive, zap: Zap,
  "message-circle": MessageCircle, flame: Flame, "credit-card": CreditCard,
  monitor: Monitor, laptop: Laptop, smartphone: Smartphone, wrench: Wrench,
  grid: Grid3x3, home: HomeIcon, user: User, "shopping-cart": ShoppingCart,
  boxes: Boxes, gift: Gift, tag: Tag,
  facebook: Facebook, instagram: Instagram, music: Music2, twitter: Twitter,
  youtube: Youtube, linkedin: Linkedin, mail: Mail, phone: Phone,
};

export const ICON_NAMES: IconName[] = Object.keys(ICONS) as IconName[];

export function getIcon(name: IconName | string | undefined): LucideIcon {
  return (name && (ICONS as Record<string, LucideIcon>)[name]) || Star;
}

export type Cta = { label: string; href: string };

export type NavItem = { id: string; label: string; href: string; icon?: IconName; accent?: boolean };
export type SocialLink = { id: string; icon: IconName; label: string; href: string };
export type FooterLink = { id: string; label: string; href: string };
export type FooterColumn = { id: string; title: string; links: FooterLink[] };

export type SiteContent = {
  header: {
    showSearch: boolean;
    searchPlaceholder: string;
    builderCta: Cta;
    primaryNav: NavItem[];
    categoryMenu: {
      label: string;
      title: string;
      browseLabel: string;
      browseHref: string;
      items: NavItem[];
    };
  };
  footer: {
    tagline: string;
    copyright: string;
    madeIn: string;
    socials: SocialLink[];
    columns: FooterColumn[];
  };
  hero: {
    badge: string;
    title1: string;
    title2: string;
    subtitle: string;
    primaryCta: Cta;
    secondaryCta: Cta;
    kpis: { id: string; icon: IconName; value: string; label: string }[];
    showImage: boolean;
  };
  categories: { title: string; subtitle: string; browseLabel: string };
  useChips: { title: string };
  bestSellers: { title: string; subtitle: string };
  featuredTabs: {
    title: string; subtitle: string;
    tabs: { id: string; categorySlug: Category; label: string }[];
  };
  flashSale: {
    badge: string; title: string;
    viewAllLabel: string; viewAllHref: string;
    countdownHours: number;
  };
  brandsMarquee: { title: string };
  whyUs: {
    kicker: string; title1: string; title2: string; subtitle: string;
    items: { id: string; icon: IconName; title: string; description: string }[];
  };
  builderTeaser: {
    badge: string; title: string; subtitle: string; cta: Cta;
    items: { id: string; icon: IconName; title: string; subtitle: string }[];
  };
  reviews: { title: string; subtitle: string };
  contactCta: { title: string; subtitle: string; whatsappLabel: string };
  floatingWhatsApp: { enabled: boolean; ariaLabel: string };
  mobileBottomBar: {
    items: {
      id: string; icon: IconName; label: string; href: string;
      requiresAuth?: boolean; primary?: boolean;
    }[];
  };
};

export function seedSiteContent(): SiteContent {
  return {
    hero: {
      badge: "Collection 2026 disponible",
      title1: "La puissance tech,",
      title2: "entre vos mains",
      subtitle:
        "Les derniers ordinateurs portables, de bureau et téléphones aux meilleurs prix, avec garantie officielle et support technique dédié.",
      primaryCta: { label: "Acheter maintenant", href: "/category/laptops" },
      secondaryCta: { label: "Offres du jour", href: "/category/laptops" },
      kpis: [
        { id: "kpi_1", icon: "users", value: "+5 000", label: "clients satisfaits" },
        { id: "kpi_2", icon: "package", value: "+1 200", label: "produits" },
        { id: "kpi_3", icon: "map-pin", value: "58 wilayas", label: "livraison" },
      ],
      showImage: true,
    },
    categories: {
      title: "Achetez par catégorie",
      subtitle: "Choisissez la catégorie qui vous convient",
      browseLabel: "Parcourir",
    },
    useChips: { title: "Achetez par usage" },
    bestSellers: { title: "Meilleures ventes", subtitle: "Les produits préférés de nos clients" },
    featuredTabs: {
      title: "Produits sélectionnés",
      subtitle: "Découvrez les nouveautés dans chaque catégorie",
      tabs: [
        { id: "t_1", categorySlug: "laptops", label: "Portables" },
        { id: "t_2", categorySlug: "desktops", label: "Bureau" },
        { id: "t_3", categorySlug: "builds", label: "Configs" },
        { id: "t_4", categorySlug: "phones", label: "Téléphones" },
      ],
    },
    flashSale: {
      badge: "Offres de la semaine",
      title: "Réductions à durée limitée",
      viewAllLabel: "Voir toutes les offres",
      viewAllHref: "/category/laptops",
      countdownHours: 71,
    },
    brandsMarquee: { title: "Nous travaillons avec les plus grandes marques" },
    whyUs: {
      kicker: "Pourquoi KA Tech",
      title1: "Parce que la tech mérite",
      title2: "un partenaire de confiance",
      subtitle: "Nous sélectionnons nos produits avec soin et nous engageons sur chaque achat.",
      items: [
        { id: "w_1", icon: "shield", title: "Garantie officielle", description: "Garantie revendeur agréé sur tous les produits" },
        { id: "w_2", icon: "truck", title: "Livraison rapide", description: "Livraison dans toutes les wilayas en 24-72 heures" },
        { id: "w_3", icon: "headphones", title: "Support technique", description: "Une équipe dédiée avant et après l'achat" },
        { id: "w_4", icon: "credit-card", title: "Paiement sécurisé", description: "Payez à la livraison ou via des moyens approuvés" },
      ],
    },
    builderTeaser: {
      badge: "Outil de configuration",
      title: "Concevez votre config idéale",
      subtitle: "Sélectionnez vos composants étape par étape, vérifiez la compatibilité et voyez le prix final en direct.",
      cta: { label: "Commencer la config", href: "/builder" },
      items: [
        { id: "bt_1", icon: "cpu", title: "Processeurs", subtitle: "Intel · AMD" },
        { id: "bt_2", icon: "memory", title: "Mémoire", subtitle: "DDR4 · DDR5" },
        { id: "bt_3", icon: "hard-drive", title: "Stockage", subtitle: "NVMe Gen4" },
        { id: "bt_4", icon: "zap", title: "Refroidissement", subtitle: "Air · Liquide" },
      ],
    },
    reviews: { title: "Avis de nos clients", subtitle: "Des milliers de clients nous font confiance" },
    contactCta: {
      title: "Une question ? Contactez-nous",
      subtitle: "Notre équipe est disponible du dimanche au jeudi, de 9h à 19h.",
      whatsappLabel: "Écrivez-nous sur WhatsApp",
    },
    floatingWhatsApp: { enabled: true, ariaLabel: "WhatsApp" },
    mobileBottomBar: {
      items: [
        { id: "mb_1", icon: "home", label: "Accueil", href: "/" },
        { id: "mb_2", icon: "grid", label: "Catégories", href: "/category" },
        { id: "mb_3", icon: "wrench", label: "Configurer", href: "/builder", primary: true },
        { id: "mb_4", icon: "shopping-cart", label: "Panier", href: "/cart", requiresAuth: true },
        { id: "mb_5", icon: "user", label: "Compte", href: "/account", requiresAuth: true },
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
    if (p && typeof p === "object" && !Array.isArray(p) && typeof s === "object" && s && !Array.isArray(s)) {
      (out as Record<string, unknown>)[k] = { ...(s as object), ...(p as object) };
    } else if (p !== undefined) {
      (out as Record<string, unknown>)[k] = p;
    }
  });
  return out;
}
