import type { Localized } from "@/lib/i18n";

import chatgptPlus from "@/assets/service-chatgpt-plus.webp";
import chatgptTeam from "@/assets/service-chatgpt-team.webp";
import claudePro from "@/assets/service-claude-pro.webp";
import geminiAdv from "@/assets/service-gemini-advanced.webp";
import midjourney from "@/assets/service-midjourney-std.webp";
import cursorPro from "@/assets/service-cursor-pro.webp";
import githubCopilot from "@/assets/service-github-copilot.webp";
import perplexity from "@/assets/service-perplexity-pro.webp";
import elevenlabs from "@/assets/service-elevenlabs-audio.webp";
import runway from "@/assets/service-runway-gen3.webp";
import canvaPro from "@/assets/service-canva-pro.webp";
import notionAi from "@/assets/service-notion-ai.webp";
import formIaZero from "@/assets/service-formation-ia-zero.webp";
import formDevIa from "@/assets/service-formation-dev-ia.webp";
import formCreatif from "@/assets/service-formation-creatif-ia.webp";
import coachingVip from "@/assets/service-coaching-vip-ia.webp";
import packCreator from "@/assets/service-pack-ultimate-creator.webp";
import packDev from "@/assets/service-pack-fullstack-dev.webp";

// Services Streaming, Gaming & Cartes Cadeaux
import netflixPrem from "@/assets/service-netflix-premium.webp";
import spotifyPrem from "@/assets/service-spotify-premium.webp";
import youtubePrem from "@/assets/service-youtube-premium.webp";
import disneyPlus from "@/assets/service-disney-plus.webp";
import appleMusic from "@/assets/service-apple-music.webp";
import amazonPrime from "@/assets/service-amazon-prime.webp";
import psPlus from "@/assets/service-playstation-plus.webp";
import xboxGamePass from "@/assets/service-xbox-game-pass.webp";
import steamWallet from "@/assets/service-steam-wallet.webp";
import nintendoOnline from "@/assets/service-nintendo-online.webp";
import eaPlayPro from "@/assets/service-ea-play-pro.webp";
import cardApple from "@/assets/service-card-apple.webp";
import cardGooglePlay from "@/assets/service-card-googleplay.webp";
import cardPlaystation from "@/assets/service-card-playstation.webp";
import cardXbox from "@/assets/service-card-xbox.webp";
import cardRazer from "@/assets/service-card-razer-gold.webp";

// Rétrocompatibilité d'actifs légers
import rog from "@/assets/p-rog.webp";
import macbook from "@/assets/p-macbook.webp";
import buildMid from "@/assets/p-build-mid.webp";
import iphone from "@/assets/p-iphone.webp";

export type BuiltinCategory =
  | "llm-assistants"
  | "creative-media"
  | "code-engineering"
  | "productivity-cloud"
  | "formations-academy"
  | "packs-bundles"
  | "streaming-medias"
  | "gaming-consoles"
  | "cartes-cadeaux";

export type Category = BuiltinCategory | (string & {});
export type ProductType = "physical" | "service";
export type UseTag = "gaming" | "work" | "study" | "edit" | "home";
export type SpecKey =
  | "cpu"
  | "ram"
  | "storage"
  | "gpu"
  | "screen"
  | "os"
  | "battery"
  | "weight"
  | "form"
  | "motherboard"
  | "psu"
  | "camera"
  | "duration"
  | "delivery"
  | "support"
  | "accountType";

export type ProductRating = {
  average: number;
  count: number;
  rating?: number;
};

/** Vrai pour une configuration client, jamais catalogable. */
export const isCustomBuild = (p: Product): boolean => p.customBuild === true;

/**
 * Restreint une liste aux produits réellement vendus en boutique.
 * À appliquer sur toute surface publique qui *liste* des produits ; la
 * résolution par identifiant (fiche produit, panier, paiement) doit au
 * contraire continuer de voir la liste complète.
 */
export const catalogProducts = (list: Product[]): Product[] =>
  list.filter((p) => !isCustomBuild(p));

export type Product = {
  id: string;
  name: Localized<string>;
  brand: string;
  category: Category;
  use: UseTag[];
  specLine: Localized<string>;
  specs: Partial<Record<SpecKey | string, Localized<string>>>;
  price: number;
  oldPrice?: number;
  stock: "in" | "low" | "out";
  stockQty?: number;
  image: string;
  bestSeller?: boolean;
  sale?: boolean;
  productType?: ProductType;
  customBuild?: boolean;
  rating?: ProductRating;
};

/**
 * Catalogue Universel Prêt à l'Emploi — WaYmen AI Studio
 * Abonnements numériques officiels, licences SaaS, formations certifiées et coaching IA.
 */
export const products: Product[] = [
  // ── 1. Assistants LLM & IA Conversationnelle ──────────────────────────────
  {
    id: "chatgpt-plus-1m",
    name: "ChatGPT Plus (1 Mois)",
    brand: "OpenAI",
    category: "llm-assistants",
    use: ["work", "study", "edit"],
    specLine: {
      fr: "GPT-4o illimité · DALL·E 3 · Canvas · Navigation Web",
      en: "Unlimited GPT-4o · DALL·E 3 · Canvas · Web Browsing",
      ar: "شات جي بي تي بلس · وصول كامل لـ GPT-4o وتوليد الصور والبحث",
    },
    specs: {
      duration: { fr: "1 Mois (30 Jours)", en: "1 Month (30 Days)", ar: "شهر واحد (30 يوم)" },
      delivery: {
        fr: "Instantané sous 15 min",
        en: "Instant within 15 min",
        ar: "فوري خلال 15 دقيقة",
      },
      accountType: {
        fr: "Compte personnel officiel",
        en: "Official personal account",
        ar: "حساب شخصي رسمي",
      },
      support: {
        fr: "Garantie intégrale 30 jours",
        en: "Full 30-day warranty",
        ar: "ضمان كامل لمدة 30 يوم",
      },
    },
    price: 3500,
    oldPrice: 4200,
    stock: "in",
    stockQty: 48,
    image: chatgptPlus,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 4.9, count: 184 },
  },
  {
    id: "chatgpt-plus-3m",
    name: "ChatGPT Plus (3 Mois - Pack Trimestriel)",
    brand: "OpenAI",
    category: "llm-assistants",
    use: ["work", "study"],
    specLine: {
      fr: "Pack 3 Mois · GPT-4o · DALL·E 3 · Voix Avancée",
      en: "3-Month Pack · GPT-4o · DALL·E 3 · Advanced Voice",
      ar: "باقة 3 أشهر · اشتراك مستمر مع توفير ممتاز",
    },
    specs: {
      duration: { fr: "3 Mois (90 Jours)", en: "3 Months (90 Days)", ar: "3 أشهر (90 يوم)" },
      delivery: {
        fr: "Activation directe par email",
        en: "Direct email activation",
        ar: "تفعيل مباشر عبر البريد",
      },
      accountType: {
        fr: "Compte dédié garanti",
        en: "Guaranteed dedicated account",
        ar: "حساب مخصص ومضمون",
      },
      support: { fr: "Support WhatsApp 7j/7", en: "7/7 WhatsApp support", ar: "دعم واتساب 7/7" },
    },
    price: 9800,
    oldPrice: 11500,
    stock: "in",
    stockQty: 25,
    image: chatgptPlus,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 96 },
  },
  {
    id: "chatgpt-plus-1y",
    name: "ChatGPT Plus (1 An - Formule Annuelle VIP)",
    brand: "OpenAI",
    category: "llm-assistants",
    use: ["work", "edit"],
    specLine: {
      fr: "Abonnement Annuel 365 Jours · Tarif Privilège VIP",
      en: "365-Day Annual Subscription · VIP Special Rate",
      ar: "اشتراك سنوي 365 يوم · السعر الأفضل مع راحة بال تامة",
    },
    specs: {
      duration: { fr: "12 Mois (1 An)", en: "12 Months (1 Year)", ar: "12 شهرًا (سنة كاملة)" },
      delivery: {
        fr: "Sous 30 min avec guide VIP",
        en: "Within 30 min with VIP guide",
        ar: "خلال 30 دقيقة مع دليل التفعيل",
      },
      accountType: {
        fr: "Personnel renouvelable",
        en: "Renewable personal",
        ar: "شخصي قابل للتجديد",
      },
      support: {
        fr: "Garantie 365 jours continue",
        en: "Continuous 365-day warranty",
        ar: "ضمان مستمر طوال السنة",
      },
    },
    price: 36000,
    oldPrice: 42000,
    stock: "in",
    stockQty: 15,
    image: chatgptPlus,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 64 },
  },
  {
    id: "chatgpt-team",
    name: "ChatGPT Team (Espace d'Équipe Collaboratif)",
    brand: "OpenAI",
    category: "llm-assistants",
    use: ["work"],
    specLine: {
      fr: "Workspace Dédié · Quotas 2x Plus Élevés · Console Admin",
      en: "Dedicated Workspace · 2x Higher Limits · Admin Console",
      ar: "مساحة عمل مخصصة للفرق والشركات مع حدود استخدام مضاعفة",
    },
    specs: {
      duration: { fr: "1 Mois renouvelable", en: "1 Month renewable", ar: "شهر واحد قابل للتجديد" },
      delivery: {
        fr: "Invitation espace entreprise",
        en: "Company workspace invitation",
        ar: "دعوة رسمية لمساحة العمل",
      },
      accountType: {
        fr: "Multi-utilisateurs pro",
        en: "Multi-user pro",
        ar: "متعدد المستخدمين للشركات",
      },
      support: {
        fr: "Assistance déploiement équipe",
        en: "Team setup assistance",
        ar: "مساعدة في تهيئة الفريق",
      },
    },
    price: 5500,
    stock: "in",
    stockQty: 20,
    image: chatgptTeam,
    productType: "service",
    rating: { average: 4.8, count: 42 },
  },
  {
    id: "claude-pro-1m",
    name: "Claude Pro (1 Mois)",
    brand: "Anthropic",
    category: "llm-assistants",
    use: ["work", "study", "edit"],
    specLine: {
      fr: "Claude 3.5 Sonnet & Opus · Artifacts · Capacité 200k tokens",
      en: "Claude 3.5 Sonnet & Opus · Artifacts · 200k Token Context",
      ar: "كلود برو من أنثروبيك · أقوى نموذج في البرمجة والتحليل المعقد",
    },
    specs: {
      duration: { fr: "1 Mois (30 Jours)", en: "1 Month (30 Days)", ar: "شهر واحد (30 يوم)" },
      delivery: {
        fr: "Activation express < 15 min",
        en: "Express activation < 15 min",
        ar: "تفعيل فوري في أقل من 15 دقيقة",
      },
      accountType: {
        fr: "Compte Anthropic officiel",
        en: "Official Anthropic account",
        ar: "حساب أنثروبيك رسمي",
      },
      support: { fr: "Garantie complète 30j", en: "Full 30d warranty", ar: "ضمان 30 يومًا" },
    },
    price: 3600,
    oldPrice: 4200,
    stock: "in",
    stockQty: 35,
    image: claudePro,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 147 },
  },
  {
    id: "claude-pro-1y",
    name: "Claude Pro (1 An - Formule Annuelle)",
    brand: "Anthropic",
    category: "llm-assistants",
    use: ["work", "edit"],
    specLine: {
      fr: "Année Complète · Claude 3.5 Sonnet illimité · Support Prioritaire",
      en: "Full Year · Unlimited Claude 3.5 Sonnet · Priority Support",
      ar: "اشتراك سنوي كامل لأفضل نموذج ذكاء اصطناعي للمطورين والمحللين",
    },
    specs: {
      duration: { fr: "12 Mois", en: "12 Months", ar: "12 شهرًا" },
      delivery: { fr: "Activation sous 30 min", en: "Within 30 min", ar: "خلال 30 دقيقة" },
      accountType: {
        fr: "Compte personnel garanti",
        en: "Guaranteed personal",
        ar: "حساب شخصي مضمون",
      },
      support: { fr: "Garantie totale 1 an", en: "Full 1-year warranty", ar: "ضمان كامل لمدة عام" },
    },
    price: 38000,
    oldPrice: 44000,
    stock: "in",
    stockQty: 10,
    image: claudePro,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 53 },
  },
  {
    id: "google-gemini-advanced",
    name: "Google Gemini Advanced + Google One 2TB",
    brand: "Google",
    category: "llm-assistants",
    use: ["work", "study", "home"],
    specLine: {
      fr: "Gemini 1.5 Pro · 2TB Cloud Drive · Intégration Docs & Gmail",
      en: "Gemini 1.5 Pro · 2TB Cloud Storage · Docs & Gmail Integration",
      ar: "جوجل جيمني أدفانسد مع سعة 2 تيرابايت وتكامل في مستندات وجيميل",
    },
    specs: {
      duration: { fr: "1 Mois", en: "1 Month", ar: "شهر واحد" },
      delivery: {
        fr: "Activation sur votre Gmail",
        en: "Activation on your Gmail",
        ar: "تفعيل رسمي على بريدك جيميل",
      },
      accountType: {
        fr: "Google One Famille / Personnel",
        en: "Google One Family / Personal",
        ar: "جوجل ون رسمي",
      },
      support: {
        fr: "Garantie Google officielle",
        en: "Official Google warranty",
        ar: "ضمان جوجل الرسمي",
      },
    },
    price: 3400,
    stock: "in",
    stockQty: 40,
    image: geminiAdv,
    productType: "service",
    rating: { average: 4.8, count: 88 },
  },
  {
    id: "perplexity-pro-1m",
    name: "Perplexity Pro (Recherche & Synthèse IA)",
    brand: "Perplexity",
    category: "llm-assistants",
    use: ["study", "work"],
    specLine: {
      fr: "Recherches Pro illimitées · Modèles Claude 3.5 & GPT-4o inclus",
      en: "Unlimited Pro Searches · Claude 3.5 & GPT-4o models included",
      ar: "محرك البحث الفائق بالذكاء الاصطناعي مع وصول لجميع النماذج الكبرى",
    },
    specs: {
      duration: { fr: "1 Mois", en: "1 Month", ar: "شهر واحد" },
      delivery: {
        fr: "Envoi accès sous 15 min",
        en: "Access sent in 15 min",
        ar: "إرسال البيانات خلال 15 دقيقة",
      },
      accountType: { fr: "Compte Pro dédié", en: "Dedicated Pro account", ar: "حساب برو مخصص" },
      support: { fr: "Garantie 30 jours", en: "30-day warranty", ar: "ضمان 30 يوم" },
    },
    price: 3200,
    stock: "in",
    stockQty: 30,
    image: perplexity,
    bestSeller: true,
    productType: "service",
    rating: { average: 4.9, count: 71 },
  },

  // ── 2. Création Visuelle, Vidéo & Voix IA ─────────────────────────────────
  {
    id: "midjourney-std-1m",
    name: "Midjourney V6.1 Plan Standard",
    brand: "Midjourney",
    category: "creative-media",
    use: ["edit", "work"],
    specLine: {
      fr: "15h Fast GPU · Générations Relax illimitées · Droits commerciaux",
      en: "15h Fast GPU · Unlimited Relax Hours · Commercial Rights",
      ar: "ميدجورني القياسي لتوليد الصور والتصاميم الفنية بجودة سينمائية خيالية",
    },
    specs: {
      duration: { fr: "1 Mois (30 Jours)", en: "1 Month (30 Days)", ar: "شهر واحد (30 يوم)" },
      delivery: {
        fr: "Compte Discord / Web officiel",
        en: "Official Discord / Web account",
        ar: "حساب ديسكورد / ويب رسمي",
      },
      accountType: {
        fr: "Privé avec droits commerciaux",
        en: "Private with commercial rights",
        ar: "خاص بحقوق استخدام تجاري",
      },
      support: {
        fr: "Garantie Midjourney intégrale",
        en: "Full Midjourney warranty",
        ar: "ضمان كامل للمدة",
      },
    },
    price: 5200,
    oldPrice: 5900,
    stock: "in",
    stockQty: 25,
    image: midjourney,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 215 },
  },
  {
    id: "midjourney-pro-1m",
    name: "Midjourney Plan Pro (30h Fast + Stealth Mode)",
    brand: "Midjourney",
    category: "creative-media",
    use: ["edit", "work"],
    specLine: {
      fr: "30h Fast GPU · Mode Furtif Privé · 12 tâches simultanées",
      en: "30h Fast GPU · Stealth Mode (Private) · 12 concurrent jobs",
      ar: "الخطة الاحترافية للمصممين والوكالات مع ميزة إخفاء الصور وحفظ الخصوصية",
    },
    specs: {
      duration: { fr: "1 Mois", en: "1 Month", ar: "شهر واحد" },
      delivery: {
        fr: "Sous 20 min par WhatsApp/Mail",
        en: "In 20 min via WhatsApp/Mail",
        ar: "خلال 20 دقيقة عبر الواتساب/الإيميل",
      },
      accountType: {
        fr: "Compte Pro Indépendant",
        en: "Independent Pro account",
        ar: "حساب برو مستقل",
      },
      support: { fr: "Support prioritaire 7j/7", en: "7/7 Priority support", ar: "دعم مخصص 7/7" },
    },
    price: 9900,
    stock: "in",
    stockQty: 12,
    image: midjourney,
    productType: "service",
    rating: { average: 4.9, count: 62 },
  },
  {
    id: "runway-gen3-alpha",
    name: "Runway Gen-3 Alpha (Studio Vidéo IA)",
    brand: "Runway",
    category: "creative-media",
    use: ["edit", "work"],
    specLine: {
      fr: "Génération Vidéo 4K Ultra-Réaliste · Text-to-Video & Motion Brush",
      en: "Ultra-Realistic 4K Video Generation · Text-to-Video & Motion Brush",
      ar: "استوديو رانوي الرائد في توليد المقاطع والمشاهد السينمائية بالذكاء الاصطناعي",
    },
    specs: {
      duration: {
        fr: "1 Mois (Crédits Standard)",
        en: "1 Month (Standard Credits)",
        ar: "شهر واحد (رصيد قياسي)",
      },
      delivery: { fr: "Activation immédiate", en: "Immediate activation", ar: "تفعيل مباشر" },
      accountType: {
        fr: "Compte Créateur dédié",
        en: "Dedicated Creator account",
        ar: "حساب صانع محتوى مخصص",
      },
      support: {
        fr: "Garantie et tutoriel inclus",
        en: "Warranty & tutorial included",
        ar: "ضمان وشرح استخدام مرفق",
      },
    },
    price: 4800,
    stock: "in",
    stockQty: 18,
    image: runway,
    productType: "service",
    rating: { average: 4.8, count: 54 },
  },
  {
    id: "elevenlabs-creator",
    name: "ElevenLabs Creator (Voix IA & Clonage Vocal)",
    brand: "ElevenLabs",
    category: "creative-media",
    use: ["edit", "work"],
    specLine: {
      fr: "100 000 caractères/mois · Clonage vocal instantané · Voix arabes & multilingues",
      en: "100k chars/mo · Instant voice cloning · Arabic & multilingual voices",
      ar: "أقوى تقنية لتوليد الصوت البشري والدبلجة واستنساخ الأصوات بدقة مذهلة",
    },
    specs: {
      duration: { fr: "1 Mois", en: "1 Month", ar: "شهر واحد" },
      delivery: { fr: "Sous 15 min", en: "Within 15 min", ar: "خلال 15 دقيقة" },
      accountType: {
        fr: "Licence Commerciale incluse",
        en: "Commercial license included",
        ar: "مرخص للاستخدام التجاري",
      },
      support: { fr: "Garantie 30 jours", en: "30-day warranty", ar: "ضمان 30 يوم" },
    },
    price: 4200,
    stock: "in",
    stockQty: 22,
    image: elevenlabs,
    bestSeller: true,
    productType: "service",
    rating: { average: 5.0, count: 98 },
  },

  // ── 3. Code & Ingénierie Développeur IA ────────────────────────────────────
  {
    id: "cursor-pro-1m",
    name: "Cursor Pro (1 Mois - IDE IA Développeur)",
    brand: "Cursor",
    category: "code-engineering",
    use: ["work"],
    specLine: {
      fr: "500 requêtes Claude 3.5 rapides/mois · Composer multi-fichiers illimité",
      en: "500 fast Claude 3.5 queries/mo · Unlimited multi-file Composer",
      ar: "محرر الأكواد الأقوى عالميًا المدمج بالذكاء الاصطناعي لكتابة وتصحيح البرمجيات",
    },
    specs: {
      duration: { fr: "1 Mois (30 Jours)", en: "1 Month (30 Days)", ar: "شهر واحد (30 يوم)" },
      delivery: {
        fr: "Activation directe < 15 min",
        en: "Direct activation < 15 min",
        ar: "تفعيل فوري خلال دقائق",
      },
      accountType: {
        fr: "Compte Pro Développeur",
        en: "Pro Developer account",
        ar: "حساب مطور برو رسمي",
      },
      support: {
        fr: "Support technique développeur",
        en: "Developer tech support",
        ar: "دعم فني خاص بالمطورين",
      },
    },
    price: 3500,
    oldPrice: 4200,
    stock: "in",
    stockQty: 45,
    image: cursorPro,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 230 },
  },
  {
    id: "cursor-pro-1y",
    name: "Cursor Pro (1 An - Formule Annuelle Développeur)",
    brand: "Cursor",
    category: "code-engineering",
    use: ["work"],
    specLine: {
      fr: "Abonnement Annuel Développeur · Quotas rapides continus sur 12 mois",
      en: "Annual Developer Subscription · Continuous fast quotas for 12 months",
      ar: "الاشتراك السنوي الأمثل للمبرمجين مع توفير كبير واستقرار في العمل",
    },
    specs: {
      duration: { fr: "12 Mois", en: "12 Months", ar: "12 شهرًا" },
      delivery: {
        fr: "Sous 30 min avec pack de prompts",
        en: "In 30 min with prompt pack",
        ar: "خلال 30 دقيقة مع حزمة توجيهات برمجية",
      },
      accountType: { fr: "Personnel dédié", en: "Dedicated personal", ar: "شخصي مخصص" },
      support: { fr: "Garantie 365 jours", en: "365-day warranty", ar: "ضمان كامل للسنة" },
    },
    price: 36000,
    oldPrice: 44000,
    stock: "in",
    stockQty: 15,
    image: cursorPro,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 77 },
  },
  {
    id: "github-copilot-indiv",
    name: "GitHub Copilot Individuel (1 An)",
    brand: "Microsoft",
    category: "code-engineering",
    use: ["work"],
    specLine: {
      fr: "Autocomplétion intelligente dans VS Code, JetBrains & Copilot Chat",
      en: "Smart code completions in VS Code, JetBrains & Copilot Chat",
      ar: "مساعد جيت هاب الرسمي للبرمجة مع تكامل كامل في VS Code وبيئات العمل",
    },
    specs: {
      duration: { fr: "12 Mois (1 An)", en: "12 Months (1 Year)", ar: "سنة كاملة (12 شهر)" },
      delivery: {
        fr: "Activation sur votre compte GitHub",
        en: "Activation on your GitHub account",
        ar: "تفعيل على حسابك في GitHub",
      },
      accountType: {
        fr: "GitHub Student/Pro officiel",
        en: "Official GitHub Pro/Student",
        ar: "رسمي ومفعل بحسابك",
      },
      support: { fr: "Garantie annuelle", en: "Annual warranty", ar: "ضمان سنوي كامل" },
    },
    price: 18000,
    stock: "in",
    stockQty: 20,
    image: githubCopilot,
    productType: "service",
    rating: { average: 4.8, count: 85 },
  },

  // ── 4. Productivité & Suites Bureautiques IA ──────────────────────────────
  {
    id: "canva-pro-team",
    name: "Canva Pro Équipe (Accès Annuel 12 Mois)",
    brand: "Canva",
    category: "productivity-cloud",
    use: ["work", "study", "edit"],
    specLine: {
      fr: "100+ Millions d'éléments premium · Détourage en 1 clic · Outils IA Magic Studio",
      en: "100M+ premium assets · 1-click BG remover · Magic Studio AI tools",
      ar: "كانفا برو السنوي الرسمي مع وصول غير محدود لجميع القوالب وأدوات الذكاء الاصطناعي",
    },
    specs: {
      duration: { fr: "12 Mois (1 An)", en: "12 Months (1 Year)", ar: "12 شهرًا (سنة كاملة)" },
      delivery: {
        fr: "Invitation sur votre email Canva",
        en: "Invitation to your Canva email",
        ar: "دعوة رسمية على إيميلك في كانفا",
      },
      accountType: {
        fr: "Espace Équipe Premium",
        en: "Premium Team Space",
        ar: "مساحة فريق متميزة مع حفظ تصاميمك الخاصة",
      },
      support: { fr: "Garantie 365 jours", en: "365-day warranty", ar: "ضمان 365 يوم" },
    },
    price: 2900,
    oldPrice: 4500,
    stock: "in",
    stockQty: 80,
    image: canvaPro,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 320 },
  },
  {
    id: "notion-ai-unlimited",
    name: "Notion AI Illimité & Workspace Pro",
    brand: "Notion",
    category: "productivity-cloud",
    use: ["work", "study"],
    specLine: {
      fr: "Génération de texte illimitée · Synthèse de notes · Q&A sur vos documents",
      en: "Unlimited text generation · Note summarization · Q&A on your docs",
      ar: "مساعد نوشن للذكاء الاصطناعي لتنظيم المشاريع وصياغة المحتوى وإدارة المعرفة",
    },
    specs: {
      duration: { fr: "1 Mois renouvelable", en: "1 Month renewable", ar: "شهر واحد قابل للتجديد" },
      delivery: { fr: "Activation sous 15 min", en: "In 15 min", ar: "خلال 15 دقيقة" },
      accountType: { fr: "Personnel / Équipe", en: "Personal / Team", ar: "شخصي / فريق" },
      support: {
        fr: "Support et templates offerts",
        en: "Support & free templates",
        ar: "دعم مع قوالب مجانية",
      },
    },
    price: 2800,
    stock: "in",
    stockQty: 25,
    image: notionAi,
    productType: "service",
    rating: { average: 4.8, count: 64 },
  },

  // ── 5. Formations, Tutoriels & Coaching IA (Waymen Academy) ────────────────
  {
    id: "formation-ia-zero-expert",
    name: {
      fr: "Masterclass Complète : Maîtriser l'IA de Zéro à Expert",
      en: "Complete Masterclass: Master AI from Zero to Expert",
      ar: "الدورة الشاملة: احتراف الذكاء الاصطناعي من الصفر إلى الاحتراف",
    },
    brand: "WaYmen Academy",
    category: "formations-academy",
    use: ["study", "work", "home"],
    specLine: {
      fr: "18h de formation vidéo HD · Prompt Engineering avancé · Accès à vie + Certificat",
      en: "18h HD video training · Advanced Prompt Engineering · Lifetime access + Certificate",
      ar: "18 ساعة فيديو تطبيقي · هندسة الأوامر المتقدمة · وصول دائم مدى الحياة مع شهادة",
    },
    specs: {
      duration: {
        fr: "Accès illimité à vie",
        en: "Unlimited lifetime access",
        ar: "وصول غير محدود مدى الحياة",
      },
      delivery: {
        fr: "Accès plateforme privée sous 10 min",
        en: "Private platform in 10 min",
        ar: "رابط الدخول لمنصة التدريب خلال 10 دقائق",
      },
      accountType: {
        fr: "Espace membre individuel",
        en: "Individual member space",
        ar: "حساب عضوية شخصي",
      },
      support: {
        fr: "Groupe privé d'entraide Discord/Telegram",
        en: "Private Discord/Telegram community",
        ar: "مجتمع خاص للمتابعة والإجابة على الأسئلة",
      },
    },
    price: 12000,
    oldPrice: 18000,
    stock: "in",
    stockQty: 50,
    image: formIaZero,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 189 },
  },
  {
    id: "formation-dev-cursor",
    name: {
      fr: "Formation Développeur : Coder 10x plus vite avec Cursor & Copilot",
      en: "Developer Training: Code 10x Faster with Cursor & Copilot",
      ar: "دورة المبرمجين: مضاعفة الإنتاجية 10 أضعاف مع كورسور وكوبايلوت",
    },
    brand: "WaYmen Academy",
    category: "formations-academy",
    use: ["work"],
    specLine: {
      fr: "Ateliers réels Full-Stack · Refactoring IA · Tests automatisés · Workflow pro",
      en: "Hands-on Full-Stack labs · AI Refactoring · Automated tests · Pro workflow",
      ar: "تطبيقات عملية لبناء مشاريع حقيقية وهيكلة الكود وفحصه بالذكاء الاصطناعي",
    },
    specs: {
      duration: {
        fr: "10h de contenu + projets sources",
        en: "10h content + source projects",
        ar: "10 ساعات مع مستودعات الأكواد الجاهزة",
      },
      delivery: {
        fr: "Espace de formation en ligne",
        en: "Online learning space",
        ar: "وصول رقمي فوري",
      },
      accountType: {
        fr: "Accès développeur à vie",
        en: "Lifetime dev access",
        ar: "وصول مطور دائم",
      },
      support: {
        fr: "Code reviews et sessions live",
        en: "Code reviews and live sessions",
        ar: "مراجعة أكواد وجلسات تفاعلية",
      },
    },
    price: 15000,
    oldPrice: 22000,
    stock: "in",
    stockQty: 30,
    image: formDevIa,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 142 },
  },
  {
    id: "formation-creatifs-video",
    name: {
      fr: "Formation Créatifs : Création Visuelle, Vidéo & Spots Publicitaires IA",
      en: "Creative Training: Visual Design, Video & Commercial Ads with AI",
      ar: "دورة صناع المحتوى: التصميم والمونتاج والإعلانات التجارية بالذكاء الاصطناعي",
    },
    brand: "WaYmen Academy",
    category: "formations-academy",
    use: ["edit", "work"],
    specLine: {
      fr: "Midjourney avancé · Runway Gen-3 · ElevenLabs · Montage & Exports 4K",
      en: "Advanced Midjourney · Runway Gen-3 · ElevenLabs · 4K Video Exports",
      ar: "صناعة المشاهد الإعلانية، تحريك الصور، توليد التعليق الصوتي والمؤثرات",
    },
    specs: {
      duration: {
        fr: "12h d'ateliers pratiques",
        en: "12h practical labs",
        ar: "12 ساعة تطبيق عملي",
      },
      delivery: { fr: "Immédiat par email", en: "Immediate via email", ar: "إرسال البيانات فورًا" },
      accountType: {
        fr: "Licence apprenant à vie",
        en: "Lifetime learner license",
        ar: "ترخيص متدرب مدى الحياة",
      },
      support: {
        fr: "Banque de prompts offerte",
        en: "Free prompt library included",
        ar: "مكتبة أوامر جاهزة كهدية",
      },
    },
    price: 14000,
    oldPrice: 20000,
    stock: "in",
    stockQty: 35,
    image: formCreatif,
    sale: true,
    productType: "service",
    rating: { average: 4.9, count: 118 },
  },
  {
    id: "coaching-vip-entreprise",
    name: {
      fr: "Coaching Privé 1-to-1 : Intégration IA pour Dirigeants & Équipes",
      en: "Private 1-on-1 Coaching: AI Integration for Leaders & Teams",
      ar: "تدريب استشاري خاص 1-على-1: دمج الذكاء الاصطناعي للشركات والمدراء",
    },
    brand: "WaYmen Academy",
    category: "formations-academy",
    use: ["work"],
    specLine: {
      fr: "4 Sessions de 1h30 en direct · Audit de vos processus · Automatisation sur-mesure",
      en: "4 Live 1h30 sessions · Workflow audit · Custom automation",
      ar: "4 جلسات خاصة مباشرة مدتها 6 ساعات · تحليل عملك وتطبيق حلول أتمتة مخصصة",
    },
    specs: {
      duration: {
        fr: "Programme 1 Mois (4 Sessions)",
        en: "1 Month program (4 sessions)",
        ar: "برنامج شهر واحد (4 جلسات زووم/ميت)",
      },
      delivery: {
        fr: "Prise de rendez-vous sous 24h",
        en: "Appointment within 24h",
        ar: "تحديد المواعيد خلال 24 ساعة",
      },
      accountType: {
        fr: "Accompagnement VIP dédié",
        en: "Dedicated VIP coaching",
        ar: "مرافقة شخصية واستشارية",
      },
      support: {
        fr: "Ligne WhatsApp directe avec l'expert",
        en: "Direct WhatsApp hotline with expert",
        ar: "تواصل مباشر مع الخبير طوال الشهر",
      },
    },
    price: 35000,
    stock: "low",
    stockQty: 5,
    image: coachingVip,
    productType: "service",
    rating: { average: 5.0, count: 28 },
  },

  // ── 6. Packs Multi-Plateformes & Offres VIP Combinées ─────────────────────
  {
    id: "pack-ultimate-creator",
    name: "Pack Ultimate AI Creator (ChatGPT Plus + Midjourney + ElevenLabs)",
    brand: "WaYmen VIP",
    category: "packs-bundles",
    use: ["edit", "work"],
    specLine: {
      fr: "Trio Créatif Absolu · Rédaction, Image & Voix · Économisez 1 400 DA",
      en: "Ultimate Creative Trio · Text, Image & Voice · Save 1 400 DA",
      ar: "الباقة الإبداعية الثلاثية الشاملة لكتابة وتصميم وهندسة المحتوى الصوتي",
    },
    specs: {
      duration: {
        fr: "1 Mois sur les 3 outils",
        en: "1 Month on all 3 tools",
        ar: "شهر كامل على المنصات الثلاث",
      },
      delivery: {
        fr: "Activation globale sous 20 min",
        en: "Global activation in 20 min",
        ar: "تفعيل شامل في 20 دقيقة",
      },
      accountType: {
        fr: "Accès officiels garantis",
        en: "Guaranteed official access",
        ar: "اشتراكات رسمية مضمونة",
      },
      support: {
        fr: "Support VIP unifié",
        en: "Unified VIP support",
        ar: "دعم فني موحد لجميع الأدوات",
      },
    },
    price: 11500,
    oldPrice: 12900,
    stock: "in",
    stockQty: 20,
    image: packCreator,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 165 },
  },
  {
    id: "pack-fullstack-engineer",
    name: "Pack Full-Stack AI Engineer (Claude Pro + Cursor Pro + Copilot)",
    brand: "WaYmen VIP",
    category: "packs-bundles",
    use: ["work"],
    specLine: {
      fr: "La Boîte à Outils Développeur Ultime · Raisonnement, IDE & Complétion",
      en: "Ultimate Developer Toolset · Reasoning, IDE & Completions",
      ar: "باقة مهندسي البرمجيات المتكاملة: كلود برو + كورسور برو + جيت هاب كوبايلوت",
    },
    specs: {
      duration: { fr: "1 Mois combiné", en: "1 Month combined", ar: "شهر مجمع للمطورين" },
      delivery: {
        fr: "Activation express sous 15 min",
        en: "Express activation in 15 min",
        ar: "تفعيل سريع في 15 دقيقة",
      },
      accountType: {
        fr: "Développeur Pro certifié",
        en: "Certified Dev Pro",
        ar: "تراخيص مطور احترافية",
      },
      support: {
        fr: "Garantie continue 30j",
        en: "Continuous 30d warranty",
        ar: "ضمان مستمر لكافة الخدمات",
      },
    },
    price: 8900,
    oldPrice: 10500,
    stock: "in",
    stockQty: 18,
    image: packDev,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 194 },
  },

  // --- STREAMING & MÉDIAS ---
  {
    id: "netflix-premium-4k",
    name: {
      fr: "Abonnement Netflix Premium 4K UHD",
      en: "Netflix Premium 4K UHD Subscription",
      ar: "اشتراك نتفليكس بريميوم 4K UHD",
    },
    brand: "Netflix",
    category: "streaming-medias",
    use: ["home", "work"],
    specLine: {
      fr: "Accès complet 4K HDR avec son spatial, 4 écrans simultanés, profil privé avec code PIN. Activation sous 15 minutes.",
      en: "Full 4K HDR access with spatial audio, 4 simultaneous screens, private profile with PIN. Activated within 15 minutes.",
      ar: "وصول كامل بدقة 4K HDR مع صوت مكاني، 4 شاشات متزامنة، ملف شخصي برقم سري خاص. تفعيل خلال 15 دقيقة.",
    },
    specs: {
      duration: { fr: "1 Mois renouvelable", en: "1 Month renewable", ar: "شهر قابل للتجديد" },
      delivery: { fr: "Sous 15 minutes", en: "Within 15 minutes", ar: "خلال 15 دقيقة" },
      accountType: {
        fr: "Profil Privé PIN 4K UHD",
        en: "Private PIN Profile 4K",
        ar: "ملف خاص برمز سري 4K",
      },
      support: { fr: "Garantie 30 jours", en: "30-day warranty", ar: "ضمان 30 يوماً" },
    },
    price: 1400,
    oldPrice: 1700,
    stock: "in",
    stockQty: 30,
    image: netflixPrem,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 4.9, count: 142 },
  },
  {
    id: "spotify-premium-1m",
    name: {
      fr: "Spotify Premium Individuel",
      en: "Spotify Premium Individual",
      ar: "سبوتيفاي بريميوم فردي",
    },
    brand: "Spotify",
    category: "streaming-medias",
    use: ["work", "study", "home"],
    specLine: {
      fr: "Musique illimitée sans publicité, écoute hors ligne en très haute qualité sonore, zapping illimité sur tous vos appareils.",
      en: "Unlimited ad-free music, offline listening in high quality, unlimited skips across all devices.",
      ar: "موسيقى غير محدودة بدون إعلانات، استماع بدون إنترنت بجودة عالية جداً، وتخطي غير محدود على جميع أجهزتك.",
    },
    specs: {
      duration: { fr: "1 Mois", en: "1 Month", ar: "شهر واحد" },
      delivery: { fr: "Sous 15 minutes", en: "Within 15 minutes", ar: "خلال 15 دقيقة" },
      accountType: {
        fr: "Activation sur votre compte personnel",
        en: "Personal account upgrade",
        ar: "تفعيل على حسابك الشخصي",
      },
      support: { fr: "Garantie 30 jours", en: "30-day warranty", ar: "ضمان 30 يوماً" },
    },
    price: 950,
    oldPrice: 1200,
    stock: "in",
    stockQty: 25,
    image: spotifyPrem,
    bestSeller: true,
    sale: false,
    productType: "service",
    rating: { average: 4.8, count: 98 },
  },
  {
    id: "youtube-premium-1m",
    name: {
      fr: "YouTube Premium + YouTube Music",
      en: "YouTube Premium + YouTube Music",
      ar: "يوتيوب بريميوم + يوتيوب ميوزك",
    },
    brand: "YouTube",
    category: "streaming-medias",
    use: ["home", "work", "study"],
    specLine: {
      fr: "Zéro publicité sur YouTube, lecture en arrière-plan écran éteint, téléchargements hors ligne et accès complet YouTube Music.",
      en: "Zero ads on YouTube, background play with screen off, offline downloads and full YouTube Music access.",
      ar: "بدون إعلانات على يوتيوب، تشغيل في الخلفية مع قفل الشاشة، تنزيلات للمشاهدة بدون إنترنت ووصول كامل لتطبيق يوتيوب ميوزك.",
    },
    specs: {
      duration: { fr: "1 Mois", en: "1 Month", ar: "شهر واحد" },
      delivery: { fr: "Sous 15 minutes", en: "Within 15 minutes", ar: "خلال 15 دقيقة" },
      accountType: {
        fr: "Invitation Famille Officielle",
        en: "Official Family Invite",
        ar: "دعوة عائلية رسمية",
      },
      support: { fr: "Garantie 30 jours", en: "30-day warranty", ar: "ضمان 30 يوماً" },
    },
    price: 1200,
    oldPrice: 1500,
    stock: "in",
    stockQty: 40,
    image: youtubePrem,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 4.9, count: 115 },
  },
  {
    id: "disney-plus-1m",
    name: {
      fr: "Disney+ Standard & Premium",
      en: "Disney+ Standard & Premium",
      ar: "ديزني بلس ستاندرد وبريميوم",
    },
    brand: "Disney+",
    category: "streaming-medias",
    use: ["home"],
    specLine: {
      fr: "Tous les univers Disney, Pixar, Marvel, Star Wars, National Geographic et Star en streaming illimité haute définition.",
      en: "All Disney, Pixar, Marvel, Star Wars, National Geographic and Star worlds in unlimited high-definition streaming.",
      ar: "عوالم ديزني، بيكسار، مارفل، حرب النجوم، ناشيونال جيوغرافيك وستار في بث غير محدود بدقة عالية.",
    },
    specs: {
      duration: { fr: "1 Mois", en: "1 Month", ar: "شهر واحد" },
      delivery: { fr: "Sous 15 minutes", en: "Within 15 minutes", ar: "خلال 15 دقيقة" },
      accountType: {
        fr: "Profil Dédié avec PIN",
        en: "Dedicated PIN Profile",
        ar: "ملف مخصص برمز PIN",
      },
      support: { fr: "Garantie 30 jours", en: "30-day warranty", ar: "ضمان 30 يوماً" },
    },
    price: 1500,
    oldPrice: 1800,
    stock: "in",
    stockQty: 20,
    image: disneyPlus,
    bestSeller: false,
    sale: false,
    productType: "service",
    rating: { average: 4.8, count: 64 },
  },

  // --- GAMING & CONSOLES / PC ---
  {
    id: "ps-plus-essential-1m",
    name: {
      fr: "PlayStation Plus Essential / Extra",
      en: "PlayStation Plus Essential / Extra",
      ar: "بلايستيشن بلس إسنشل / إكسترا",
    },
    brand: "Sony PlayStation",
    category: "gaming-consoles",
    use: ["gaming", "home"],
    specLine: {
      fr: "Multijoueur en ligne PS4/PS5, jeux mensuels offerts, réductions exclusives PlayStation Store et catalogue de jeux Extra.",
      en: "Online multiplayer on PS4/PS5, free monthly games, exclusive PlayStation Store discounts and Extra game catalog.",
      ar: "ألعاب جماعية أونلاين على PS4/PS5، ألعاب شهرية مجانية، خصومات حصرية على متجر بلايستيشن وكتالوج ألعاب إكسترا.",
    },
    specs: {
      duration: { fr: "1 Mois / 12 Mois", en: "1 Month / 12 Months", ar: "شهر / 12 شهراً" },
      delivery: { fr: "Sous 15 minutes", en: "Within 15 minutes", ar: "خلال 15 دقيقة" },
      accountType: {
        fr: "Compte PSN Principal",
        en: "Primary PSN Account",
        ar: "حساب بلايستيشن رئيسي",
      },
      support: { fr: "Garantie complète", en: "Full warranty", ar: "ضمان كامل" },
    },
    price: 2500,
    oldPrice: 3200,
    stock: "in",
    stockQty: 15,
    image: psPlus,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 4.9, count: 87 },
  },
  {
    id: "xbox-game-pass-ultimate",
    name: {
      fr: "Xbox Game Pass Ultimate (PC & Console)",
      en: "Xbox Game Pass Ultimate (PC & Console)",
      ar: "إكس بوكس غيم باس ألتيميت (كمبيوتر ومنصات)",
    },
    brand: "Xbox",
    category: "gaming-consoles",
    use: ["gaming", "work"],
    specLine: {
      fr: "Accès à plus de 400 jeux de premier plan sur PC, Xbox et Cloud Gaming, incluant EA Play et les sorties Day One.",
      en: "Access to 400+ premier games on PC, Xbox & Cloud Gaming, including EA Play and Day One releases.",
      ar: "وصول إلى أكثر من 400 لعبة رائدة على الكمبيوتر وإكس بوكس وسحابة اللعب، بما في ذلك EA Play وإصدارات اليوم الأول.",
    },
    specs: {
      duration: { fr: "1 Mois", en: "1 Month", ar: "شهر واحد" },
      delivery: { fr: "Sous 15 minutes", en: "Within 15 minutes", ar: "خلال 15 دقيقة" },
      accountType: {
        fr: "Code d'activation officiel",
        en: "Official activation code",
        ar: "كود تفعيل رسمي",
      },
      support: { fr: "Garantie 30 jours", en: "30-day warranty", ar: "ضمان 30 يوماً" },
    },
    price: 2900,
    oldPrice: 3500,
    stock: "in",
    stockQty: 22,
    image: xboxGamePass,
    bestSeller: true,
    sale: false,
    productType: "service",
    rating: { average: 4.9, count: 134 },
  },
  {
    id: "steam-wallet-20usd",
    name: {
      fr: "Carte Steam Wallet 20$ USD (Recharge)",
      en: "Steam Wallet Card $20 USD (Top-up)",
      ar: "بطاقة ستيم 20 دولار (شحن المحفظة)",
    },
    brand: "Steam",
    category: "gaming-consoles",
    use: ["gaming"],
    specLine: {
      fr: "Code numérique officiel pour créditer instantanément votre compte Steam. Valable pour tous les jeux, DLC et contenus du store.",
      en: "Official digital code to top up your Steam wallet instantly. Valid for all games, DLCs and community market items.",
      ar: "كود رقمي رسمي لشحن محفظة ستيم الخاصة بك فوراً. صالح لجميع الألعاب والإضافات ومحتويات المتجر.",
    },
    specs: {
      duration: {
        fr: "Crédit permanent sans expiration",
        en: "Permanent balance, no expiry",
        ar: "رصيد دائم بدون انتهاء",
      },
      delivery: {
        fr: "Instantané sous 5 minutes",
        en: "Instant within 5 minutes",
        ar: "فوري خلال 5 دقائق",
      },
      accountType: {
        fr: "Code numérique Global / US",
        en: "Digital Global / US code",
        ar: "كود رقمي عالمي / أمريكي",
      },
      support: {
        fr: "Garantie activation 100%",
        en: "100% activation guarantee",
        ar: "ضمان تفعيل 100%",
      },
    },
    price: 4700,
    oldPrice: 5200,
    stock: "in",
    stockQty: 50,
    image: steamWallet,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 5.0, count: 210 },
  },

  // --- CARTES CADEAUX & RECHARGES ---
  {
    id: "apple-gift-card-15",
    name: {
      fr: "Apple Gift Card 15$ (App Store & iTunes)",
      en: "Apple Gift Card $15 (App Store & iTunes)",
      ar: "بطاقة آبل 15 دولار (آب ستور وآيتونز)",
    },
    brand: "Apple",
    category: "cartes-cadeaux",
    use: ["work", "study", "home"],
    specLine: {
      fr: "Rechargez votre solde Apple pour vos applications, abonnements iCloud+, Apple Arcade, livres et contenus multimédias.",
      en: "Top up your Apple account for apps, iCloud+ storage, Apple Arcade, books and media purchases.",
      ar: "اشحن رصيد حسابك على آبل لتطبيقاتك، اشتراكات iCloud+، آبل آركيد والمحتويات الرقمية.",
    },
    specs: {
      duration: { fr: "Sans expiration", en: "No expiry", ar: "بدون تاريخ انتهاء" },
      delivery: {
        fr: "Sous 5 à 15 minutes",
        en: "Within 5-15 minutes",
        ar: "خلال 5 إلى 15 دقيقة",
      },
      accountType: {
        fr: "Code officiel US Store",
        en: "Official US Store code",
        ar: "كود رسمي للمتجر الأمريكي",
      },
      support: {
        fr: "Assistance activation",
        en: "Activation assistance",
        ar: "دعم التفعيل الفوري",
      },
    },
    price: 3600,
    oldPrice: 4000,
    stock: "in",
    stockQty: 35,
    image: cardApple,
    bestSeller: false,
    sale: false,
    productType: "service",
    rating: { average: 4.9, count: 76 },
  },
  {
    id: "google-play-card-25",
    name: {
      fr: "Google Play Gift Card 25$ USD",
      en: "Google Play Gift Card $25 USD",
      ar: "بطاقة غوغل بلاي 25 دولار",
    },
    brand: "Google Play",
    category: "cartes-cadeaux",
    use: ["gaming", "home"],
    specLine: {
      fr: "Code de recharge Google Play Store US pour acheter des jeux, diamants Free Fire, pièces TikTok et applications Android.",
      en: "Google Play Store US top-up code to buy games, in-game currencies and Android premium apps.",
      ar: "كود شحن متجر غوغل بلاي الأمريكي لشراء الألعاب والعملات الرقمية للألعاب وتطبيقات أندرويد.",
    },
    specs: {
      duration: { fr: "Solde permanent", en: "Permanent balance", ar: "رصيد دائم" },
      delivery: { fr: "Sous 10 minutes", en: "Within 10 minutes", ar: "خلال 10 دقائق" },
      accountType: {
        fr: "Code US Play Store",
        en: "US Play Store Code",
        ar: "كود متجر غوغل بلاي أمريكي",
      },
      support: { fr: "Garantie 100%", en: "100% guarantee", ar: "ضمان 100%" },
    },
    price: 5800,
    oldPrice: 6300,
    stock: "in",
    stockQty: 28,
    image: cardGooglePlay,
    bestSeller: true,
    sale: true,
    productType: "service",
    rating: { average: 4.8, count: 92 },
  },
  {
    id: "razer-gold-20",
    name: {
      fr: "Razer Gold PIN 20$ USD",
      en: "Razer Gold PIN $20 USD",
      ar: "بطاقة رايزر غولد 20 دولار",
    },
    brand: "Razer",
    category: "cartes-cadeaux",
    use: ["gaming"],
    specLine: {
      fr: "Crédits virtuels universels pour plus de 42 000 jeux et contenus numériques mondiaux (PUBG Mobile, Roblox, Genshin Impact).",
      en: "Universal virtual credits for over 42,000 games and entertainment titles worldwide.",
      ar: "رصيد افتراضي عالمي لأكثر من 42,000 لعبة ومحتوى ترفيهي رقمي حول العالم.",
    },
    specs: {
      duration: { fr: "Crédits sans expiration", en: "No expiry credits", ar: "رصيد بدون انتهاء" },
      delivery: { fr: "Sous 5 minutes", en: "Within 5 minutes", ar: "خلال 5 دقائق" },
      accountType: { fr: "PIN Global Razer", en: "Global Razer PIN", ar: "كود رايزر عالمي" },
      support: { fr: "Garantie activation", en: "Activation guarantee", ar: "ضمان التفعيل الفوري" },
    },
    price: 4700,
    oldPrice: 5100,
    stock: "in",
    stockQty: 40,
    image: cardRazer,
    bestSeller: false,
    sale: false,
    productType: "service",
    rating: { average: 4.9, count: 58 },
  },
];

// --- Formateur de devises ---
export type CurrencyConfig = {
  symbol: string;
  position: "prefix" | "suffix";
  thousandSeparator: " " | "," | "." | "'" | "";
};

const _currency: CurrencyConfig = {
  symbol: "DA",
  position: "suffix",
  thousandSeparator: " ",
};

export function setCurrencyConfig(cfg: Partial<CurrencyConfig>) {
  Object.assign(_currency, cfg);
}

export function getCurrencyConfig(): CurrencyConfig {
  return { ..._currency };
}

export const formatDZD = (n: number) => {
  const abs = Math.round(Math.abs(n));
  const raw = String(abs);
  const sep = _currency.thousandSeparator;
  const grouped = sep ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : raw;
  const signed = (n < 0 ? "-" : "") + grouped;
  const body =
    _currency.position === "prefix"
      ? `${_currency.symbol} ${signed}`
      : `${signed} ${_currency.symbol}`;
  return `⁦${body}⁩`;
};

export const categoryMeta: Record<
  BuiltinCategory,
  {
    slug: BuiltinCategory;
    labelKey: string;
    descKey: string;
  }
> = {
  "llm-assistants": {
    slug: "llm-assistants",
    labelKey: "nav.llm-assistants",
    descKey: "cat.llm-assistants.desc",
  },
  "creative-media": {
    slug: "creative-media",
    labelKey: "nav.creative-media",
    descKey: "cat.creative-media.desc",
  },
  "code-engineering": {
    slug: "code-engineering",
    labelKey: "nav.code-engineering",
    descKey: "cat.code-engineering.desc",
  },
  "productivity-cloud": {
    slug: "productivity-cloud",
    labelKey: "nav.productivity-cloud",
    descKey: "cat.productivity-cloud.desc",
  },
  "formations-academy": {
    slug: "formations-academy",
    labelKey: "nav.formations-academy",
    descKey: "cat.formations-academy.desc",
  },
  "packs-bundles": {
    slug: "packs-bundles",
    labelKey: "nav.packs-bundles",
    descKey: "cat.packs-bundles.desc",
  },
  "streaming-medias": {
    slug: "streaming-medias",
    labelKey: "nav.streaming-medias",
    descKey: "cat.streaming-medias.desc",
  },
  "gaming-consoles": {
    slug: "gaming-consoles",
    labelKey: "nav.gaming-consoles",
    descKey: "cat.gaming-consoles.desc",
  },
  "cartes-cadeaux": {
    slug: "cartes-cadeaux",
    labelKey: "nav.cartes-cadeaux",
    descKey: "cat.cartes-cadeaux.desc",
  },
};

export type CategoryMetaInfo = {
  slug: string;
  labelKey?: string;
  labelText?: Localized<string>;
  descKey?: string;
  descText?: Localized<string>;
};

export function getCategoryMeta(
  slug: string,
  dynamicCategory?: { slug: string; label: Localized<string>; description?: Localized<string> },
): CategoryMetaInfo {
  if (slug in categoryMeta) {
    const b = categoryMeta[slug as BuiltinCategory];
    return {
      slug: b.slug,
      labelKey: b.labelKey,
      descKey: b.descKey,
      labelText: dynamicCategory?.label,
      descText: dynamicCategory?.description,
    };
  }
  return {
    slug,
    labelText: dynamicCategory?.label ?? slug,
    descText: dynamicCategory?.description ?? "",
  };
}
