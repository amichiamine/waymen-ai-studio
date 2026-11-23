/**
 * Extracteur de données du frontend — OUTIL DE DÉVELOPPEMENT.
 *
 * Lit les données de démonstration définies dans les modules TypeScript du
 * frontend et les sérialise en JSON versionné dans api/tools/donnees-front.json.
 * Ce JSON est la source d'entrée de api/tools/importer-donnees-front.php.
 *
 * Voie retenue : extraction Node/bun → JSON → import PHP.
 * Justification : le frontend est en TypeScript avec des imports d'assets
 * relatifs (images webp) et une logique de seed centralisée. Exécuter ce script
 * produit un artefact versionnable et rejouable sans jamais dupliquer les
 * données dans deux fichiers sources.
 *
 * Usage :
 *   bun run scripts/extraire-donnees-front.ts
 *
 * POURQUOI `bun` ET NON `tsx` : ce script importe `@/data/products`, qui
 * importe des `.webp`. Node/tsx s'arrête sur `ERR_UNKNOWN_FILE_EXTENSION` ;
 * bun résout ces imports en CHEMIN DE FICHIER absolu, ce dont la publication
 * des médias ci-dessous a précisément besoin.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "fs";
import { writeFileSync } from "fs";
import { basename, resolve } from "path";

// Données produits
import { products } from "@/data/products";
import { WILAYAS } from "@/data/wilayas";

// Données admin-store
import { categoryMeta } from "@/data/products";

// Contenu de la vitrine
import { seedSiteContent } from "@/lib/site-content";

// -------------------------------------------------------------------
// Types — reproduits localement pour éviter des imports React
// -------------------------------------------------------------------
type Localized<T = string> = T | { fr: T; en?: T; ar?: T };

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
const now = new Date().toISOString();

/** Langue de référence pour les empreintes historiques. */
const LANG_REF = "fr";

/** Résout un Localized<string> en chaîne simple dans la langue de référence. */
function localiser(v: Localized<string> | undefined): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  return v[LANG_REF] ?? v.en ?? "";
}

// -------------------------------------------------------------------
// Publication des médias du catalogue
// -------------------------------------------------------------------
/**
 * LE DÉFAUT QUE CETTE SECTION SUPPRIME.
 *
 * Ce script fabriquait des chemins en dur : `/assets/${p.id}.webp`. Trois
 * erreurs superposées, et pas une seule visible :
 *
 *   1. `assets/` est le dossier des fichiers EMPREINTÉS par Vite. La vraie
 *      image s'appelle `p-rog-mdwkNFOE.webp` — jamais `rog-strix-g16.webp`.
 *      Une URL stockée en base ne peut PAS viser un fichier empreinté : elle
 *      serait fausse au build suivant, dont l'empreinte change.
 *   2. Le nom lui-même était inventé (`rog-strix-g16` est l'identifiant du
 *      produit, le fichier s'appelle `p-rog`).
 *   3. Le chemin était ABSOLU. Déposé dans `public_html/ma-boutique/`, le site
 *      réclamait `https://domaine.dz/assets/…` — hors du dossier livré.
 *
 * Résultat : 19 URL mortes depuis toujours, invisibles parce que le mode
 * `mock` importe les images comme des modules et fonctionne, lui.
 *
 * CE QUI EST FAIT À LA PLACE.
 *
 * `public/media/` : emplacement STABLE, hors de la chaîne d'empreinte de Vite,
 * copié tel quel dans `dist/` au build. Même nature que `uploads/` (médias
 * téléversés par l'administrateur), et pour la même raison : une URL persistée
 * en base doit survivre aux reconstructions.
 *
 * Les chemins émis sont RELATIFS (« media/p-rog.webp », sans barre initiale).
 * Le front les résout contre `CHEMIN_BASE` (`src/lib/media.ts`), déduit de la
 * balise `<base>` posée par `public/index.php`. La base n'a donc rien à savoir
 * de l'endroit où le site sera déposé.
 *
 * Le fichier source est l'image RÉELLEMENT importée par `src/data/products.ts` :
 * sous bun, `p.image` vaut le chemin absolu du `.webp`. Aucun nom n'est deviné,
 * et le mode `mock` continue d'importer exactement les mêmes fichiers depuis
 * `src/assets/` — il ne perd rien.
 *
 * POIDS DU DÉPÔT : les copies sont octet pour octet identiques aux sources.
 * Git étant adressé par contenu, elles partagent le même blob : le dépôt ne
 * grossit que d'une entrée d'arbre par fichier, pas d'une image.
 */
const DOSSIER_MEDIAS = resolve(import.meta.dir, "../public/media");
const PREFIXE_MEDIA = "media";

/** Chemins émis, pour le contrôle final et le repérage des orphelins. */
const mediasPublies = new Map<string, string>();

/**
 * Copie une image de `src/assets/` vers `public/media/` et renvoie le chemin
 * relatif à stocker en base.
 *
 * ÉCHEC VISIBLE : toute source absente arrête l'extraction. C'est le garde-fou
 * qui manquait — ni le typage, ni le lint, ni le build ne savent qu'une chaîne
 * est censée désigner un fichier. Ici, on le sait, donc on le vérifie.
 */
function publierMedia(source: string, contexte: string): string {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error(`${contexte} : aucune image source. Rien ne sera stocké en base à l'aveugle.`);
  }

  // Sous bun, un import de .webp vaut le chemin absolu du fichier (POSIX /... ou Windows C:\...).
  const estAbsolu = source.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(source);
  if (!estAbsolu || !/\.(webp|png|jpe?g|avif|gif|svg)$/i.test(source)) {
    throw new Error(
      `${contexte} : « ${source} » n'est pas un chemin de fichier image absolu. ` +
        `Ce script doit être lancé avec bun (« bun run scripts/extraire-donnees-front.ts ») : ` +
        `lui seul résout les imports .webp en chemin de fichier.`,
    );
  }

  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(`${contexte} : le fichier « ${source} » n'existe pas.`);
  }

  const nom = basename(source);
  const destination = `${DOSSIER_MEDIAS}/${nom}`;

  // Deux produits qui pointeraient deux fichiers différents portant le même nom
  // s'écraseraient l'un l'autre en silence.
  const dejaVu = mediasPublies.get(nom);
  if (dejaVu !== undefined && dejaVu !== source) {
    throw new Error(
      `${contexte} : deux sources différentes portent le nom « ${nom} » ` +
        `(« ${dejaVu} » et « ${source} »).`,
    );
  }

  mkdirSync(DOSSIER_MEDIAS, { recursive: true });
  // Recopie seulement si le contenu diffère : l'horodatage du dépôt ne bouge
  // pas à chaque extraction, et `git status` reste lisible.
  if (!existsSync(destination) || !readFileSync(destination).equals(readFileSync(source))) {
    copyFileSync(source, destination);
  }
  mediasPublies.set(nom, source);

  return `${PREFIXE_MEDIA}/${nom}`;
}

/** Image d'un produit désigné par identifiant — échoue si le produit n'existe pas. */
function mediaDuProduit(id: string, contexte: string): string {
  const produit = products.find((p) => p.id === id);
  if (produit === undefined) {
    throw new Error(`${contexte} : aucun produit ne porte l'identifiant « ${id} ».`);
  }

  return publierMedia(produit.image, `${contexte} (produit ${id})`);
}

// -------------------------------------------------------------------
// Catégories (tirées de categoryMeta + libellés déjà en français)
// -------------------------------------------------------------------
const CAT_LABELS: Record<string, string> = {
  "llm-assistants": "Assistants & LLM",
  "creative-media": "Création & Médias",
  "code-engineering": "Code & Ingénierie",
  "productivity-cloud": "Productivité & Bureautique",
  "formations-academy": "Waymen Academy",
  "packs-bundles": "Packs & Bundles IA",
  "streaming-medias": "Streaming & Médias",
  "gaming-consoles": "Gaming & Consoles / PC",
  "cartes-cadeaux": "Cartes Cadeaux & Recharges",
};
const CAT_DESC: Record<string, string> = {
  "llm-assistants": "Abonnements et accès officiels aux meilleurs modèles de langage du marché.",
  "creative-media": "Génération d'images haute résolution, vidéo générative et synthèse vocale IA.",
  "code-engineering":
    "Assistants de programmation d'élite, complétion de code et agents d'ingénierie.",
  "productivity-cloud":
    "Workspace IA, bases de connaissances intelligentes et outils collaboratifs.",
  "formations-academy":
    "Formations concrètes, tutoriels pas-à-pas et coaching personnalisé tous niveaux.",
  "packs-bundles":
    "Formules groupées économiques combinant abonnements et formations clés-en-main.",
  "streaming-medias":
    "Abonnements officiels Netflix 4K, Spotify Premium, YouTube Premium et Disney+.",
  "gaming-consoles": "Cartes PlayStation Plus, Xbox Game Pass Ultimate et recharges Steam Wallet.",
  "cartes-cadeaux":
    "Cartes de recharge Apple, Google Play Store et Razer Gold à activation immédiate.",
};

const categories = (Object.keys(categoryMeta) as (keyof typeof categoryMeta)[]).map((slug, i) => {
  // La vignette de catégorie est l'image de son premier produit. Une catégorie
  // vide n'aurait pas de vignette : on le dit plutôt que de forger un nom.
  const premier = products.find((p) => p.category === slug);
  if (premier === undefined) {
    throw new Error(`Catégorie « ${slug} » : aucun produit, donc aucune vignette possible.`);
  }

  return {
    slug,
    label: CAT_LABELS[slug] ?? slug,
    description: CAT_DESC[slug] ?? "",
    cover: publierMedia(premier.image, `Vignette de la catégorie ${slug}`),
    position: i,
    created_at: now,
    updated_at: now,
  };
});

// -------------------------------------------------------------------
// Marques (déduites des produits)
// -------------------------------------------------------------------
const brandCountry: Record<string, string> = {
  OpenAI: "États-Unis",
  Anthropic: "États-Unis",
  Google: "États-Unis",
  Perplexity: "États-Unis",
  Midjourney: "États-Unis",
  Runway: "États-Unis",
  ElevenLabs: "États-Unis",
  Cursor: "États-Unis",
  Microsoft: "États-Unis",
  Canva: "Australie",
  Notion: "États-Unis",
  "WaYmen Academy": "Algérie / International",
  "WaYmen VIP": "Algérie / International",
  Netflix: "États-Unis",
  Spotify: "Suède",
  YouTube: "États-Unis",
  "Disney+": "États-Unis",
  "Sony PlayStation": "Japon",
  Xbox: "États-Unis",
  Steam: "États-Unis",
  Apple: "États-Unis",
  "Google Play": "États-Unis",
  Razer: "États-Unis / Singapour",
};

const brandsMap = new Map<
  string,
  {
    id: string;
    name: string;
    description: string;
    country: string;
    logo?: string;
    created_at: string;
    updated_at: string;
  }
>();
for (const p of products) {
  if (!brandsMap.has(p.brand)) {
    const slug = p.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    brandsMap.set(p.brand, {
      id: slug,
      name: p.brand,
      description: `Écosystème officiel ${p.brand} activé par WaYmen AI Studio.`,
      country: brandCountry[p.brand] ?? "International",
      logo: `media/brands/${slug}.svg`,
      created_at: now,
      updated_at: now,
    });
  }
}
const brands = Array.from(brandsMap.values());

// -------------------------------------------------------------------
// Produits (12 produits avec champs Localized conservés)
// -------------------------------------------------------------------
function defaultQtyForLabel(stock: string): number {
  return stock === "in" ? 50 : stock === "low" ? 3 : 0;
}

const produitsExtraits = products.map((p) => ({
  id: p.id,
  name: p.name, // Localized<string> conservé — stocké en JSON
  brand: p.brand,
  category: p.category,
  use_tags: p.use,
  spec_line: p.specLine, // Localized<string> conservé
  specs: p.specs, // Partial<Record<SpecKey, Localized<string>>> conservé
  price: p.price,
  old_price: p.oldPrice ?? null,
  stock: p.stock,
  stock_qty: p.stockQty ?? defaultQtyForLabel(p.stock),
  image: publierMedia(p.image, `Image du produit ${p.id}`),
  best_seller: p.bestSeller ? 1 : 0,
  sale: p.sale ? 1 : 0,
  custom_build: p.customBuild ? 1 : 0,
  created_at: now,
  updated_at: now,
}));

// -------------------------------------------------------------------
// Articles de blog (5 articles, thématiques IA officielles WaYmen)
// -------------------------------------------------------------------
const BASE_BLOG_DATE = Date.now();
const blogBase = [
  {
    slug: "chatgpt-plus-vs-claude-pro-2026",
    title: {
      fr: "Quel assistant IA choisir en 2026 ? Comparatif ChatGPT Plus vs Claude 3.5 Sonnet",
      en: "Which AI assistant to choose in 2026? ChatGPT Plus vs Claude 3.5 Sonnet",
      ar: "أي مساعد ذكاء اصطناعي تختار في 2026؟ مقارنة ChatGPT Plus و Claude 3.5 Sonnet",
    },
    excerpt: {
      fr: "Capacités de raisonnement, artifacts de code, analyse de documents — quel modèle correspond à vos besoins réels ?",
      en: "Reasoning capabilities, code artifacts, document analysis — which model fits your actual needs?",
      ar: "قدرات الاستنتاج، نوافذ الأكواد، تحليل المستندات — أي نموذج يلبي احتياجاتك الفعلية؟",
    },
    content: {
      fr: "# ChatGPT Plus vs Claude 3.5 Sonnet en 2026\n\nLe choix entre les deux géants de l'IA dépend de vos cas d'usage quotidiens :\n\n1. **ChatGPT Plus (GPT-4o)** : Idéal pour la polyvalence, la recherche web en direct, la génération visuelle DALL·E 3 et le mode vocal avancé.\n2. **Claude 3.5 Sonnet (Anthropic)** : Le champion incontesté de l'écriture fluide, du code et de l'analyse logique approfondie avec les Artifacts.\n3. **Notre conseil WaYmen** : Les professionnels cumulent souvent les deux abonnements ou optent pour notre Pack Ultimate pour maximiser leur productivité.",
      en: "# ChatGPT Plus vs Claude 3.5 Sonnet in 2026\n\nThe choice between the two AI leaders depends on your daily workflows:\n\n1. **ChatGPT Plus (GPT-4o)**: Ideal for versatility, live web search, DALL·E 3 visual generation and advanced voice mode.\n2. **Claude 3.5 Sonnet (Anthropic)**: The undisputed champion of nuanced writing, code generation and deep reasoning with Artifacts.\n3. **WaYmen Tip**: Power users often combine both tools or choose our Ultimate Pack for peak productivity.",
      ar: "# مقارنة ChatGPT Plus و Claude 3.5 Sonnet في 2026\n\nيعتمد الاختيار بين عملاقي الذكاء الاصطناعي على طبيعة استخدامك اليومي:\n\n1. **ChatGPT Plus (GPT-4o)**: مثالي للتنوع، والبحث المباشر على الويب، وتوليد الصور عبر DALL·E 3، والتفاعل الصوتي المتقدم.\n2. **Claude 3.5 Sonnet**: الرائد المطلق في كتابة النصوص الاحترافية والبرمجة والتحليل الدقيق عبر ميزة Artifacts.\n3. **نصيحة وايمان**: يفضل المحترفون الجمع بين النموذجين أو اختيار الباقة الشاملة لمضاعفة إنتاجيتهم.",
    },
    tags: ["ia", "comparatif", "chatgpt", "claude"],
    author: "Équipe WaYmen AI Studio",
    daysAgo: 30,
  },
  {
    slug: "developper-avec-ia-cursor-copilot",
    title: {
      fr: "Développer 10x plus vite : Maîtriser Cursor Pro & GitHub Copilot",
      en: "Develop 10x faster: Mastering Cursor Pro & GitHub Copilot",
      ar: "البرمجة بسرعة 10 أضعاف: احتراف Cursor Pro و GitHub Copilot",
    },
    excerpt: {
      fr: "Autocomplétion intelligente, refactorisation complète et intégration continue avec les meilleurs IDE IA.",
      en: "Smart code completion, full refactoring and seamless integration with top AI code editors.",
      ar: "إكمال الكود الذكي، إعادة الهيكلة الشاملة والتكامل مع أفضل بيئات التطوير بالذكاء الاصطناعي.",
    },
    content: {
      fr: "# Révolutionner son workflow de dev avec Cursor & Copilot\n\nL'intelligence artificielle transforme le développement logiciel en pratique assistée d'élite :\n\n1. **Cursor Pro** : Un éditeur complet intégrant Claude 3.5 Sonnet directement dans votre codebase pour modifier plusieurs fichiers simultanément.\n2. **GitHub Copilot** : L'extension native indispensable pour autocompléter vos fonctions sans friction.\n3. **L'activation WaYmen** : Nous assurons la mise en service immédiate de votre licence professionnelle pour coder sans limites.",
      en: "# Revolutionize your dev workflow with Cursor & Copilot\n\nArtificial intelligence elevates modern software development to elite levels:\n\n1. **Cursor Pro**: A dedicated editor integrating Claude 3.5 Sonnet across your entire codebase for multi-file edits.\n2. **GitHub Copilot**: The essential native autocomplete extension for fast flow state.\n3. **WaYmen Activation**: We provide instant delivery for your pro licenses to code without limits.",
      ar: "# إحداث ثورة في مسار البرمجة مع Cursor و Copilot\n\nيعمل الذكاء الاصطناعي على الارتقاء بتطوير البرمجيات إلى أعلى مستويات السرعة والإنتاجية:\n\n1. **Cursor Pro**: محرر أكواد متطور يدمج نموذج Claude 3.5 مباشرة مع مشروعك لتعديل عدة ملفات في آن واحد.\n2. **GitHub Copilot**: المساعد البرمجي الفوري لكتابة وتوقع الأكواد بسلاسة فائقة.\n3. **تفعيل وايمان**: نوفر لك التفعيل الفوري للاشتراك لتبدأ عملك دون قيود.",
    },
    tags: ["developpement", "cursor", "copilot", "code"],
    author: "Équipe WaYmen AI Studio",
    daysAgo: 24,
  },
  {
    slug: "creation-visuelle-midjourney-runway",
    title: {
      fr: "Création graphique & vidéo IA : Guide Midjourney V6.1 & Runway Gen-3",
      en: "AI visual & video creation: Midjourney V6.1 & Runway Gen-3 guide",
      ar: "صناعة المحتوى المرئي والفيديو بالذكاء الاصطناعي: دليل Midjourney و Runway",
    },
    excerpt: {
      fr: "Des visuels photoréalistes aux animations cinématiques professionnelles pour designers et créateurs.",
      en: "From photorealistic visuals to cinematic video animations for designers and video creators.",
      ar: "من الصور الواقعية الفائقة إلى مقاطع الفيديو السينمائية للمصممين وصناع المحتوى.",
    },
    content: {
      fr: "# Le studio créatif propulsé par l'IA\n\nPour les designers, vidéastes et agences de communication, l'IA ouvre des perspectives illimitées :\n\n1. **Midjourney V6.1** : Le standard mondial pour la direction artistique, les maquettes et le rendu hyper-réaliste.\n2. **Runway Gen-3 Alpha** : La référence cinématographique pour générer des vidéos 4K dynamiques à partir de prompts textuels ou d'images fixes.\n3. **Support WaYmen** : Accès rapide aux licences Fast GPU et tutoriels dédiés dans notre Academy.",
      en: "# The creative studio powered by AI\n\nFor designers, filmmakers and marketing teams, generative tools offer endless creative leverage:\n\n1. **Midjourney V6.1**: The world standard for art direction, concept art and photorealistic renders.\n2. **Runway Gen-3 Alpha**: The cinematic benchmark for 4K video clips from prompts or still imagery.\n3. **WaYmen Support**: Fast GPU allocation and dedicated tutorials within our Academy.",
      ar: "# استوديو الإبداع المدعوم بالذكاء الاصطناعي\n\nللمصممين والمخرجين وفرق التسويق، تفتح هذه الأدوات آفاقاً إبداعية لا حدود لها:\n\n1. **Midjourney V6.1**: المعيار العالمي للإخراج الفني، التصاميم الإعلانية والصور الواقعية.\n2. **Runway Gen-3 Alpha**: المنصة الرائدة لتوليد لقطات سينمائية عالية الدقة من النصوص أو الصور.\n3. **دعم وايمان**: تفعيل اشتراكات ساعات الحوسبة السريعة Fast GPU وإرشادات تطبيقية بالأكاديمية.",
    },
    tags: ["design", "midjourney", "runway", "video"],
    author: "Équipe WaYmen AI Studio",
    daysAgo: 18,
  },
  {
    slug: "clonage-vocal-elevenlabs-secrets",
    title: {
      fr: "Clonage vocal et voix ultra-réalistes : Les secrets d'ElevenLabs",
      en: "Voice cloning and hyper-realistic audio: The secrets of ElevenLabs",
      ar: "استنساخ الصوت والتعليق الصوتي الواقعي: أسرار ElevenLabs للمبدعين",
    },
    excerpt: {
      fr: "Comment doubler, narrer et créer des voix personnalisées avec une expressivité bluffante.",
      en: "How to voiceover, narrate and build custom voices with remarkable human emotion.",
      ar: "كيفية دبلجة وسرد وإنشاء أصوات احترافية مخصصة بنبرة واقعية ومشاعر بشرية متطابقة.",
    },
    content: {
      fr: "# Voix d'élite et doublage multilingue avec ElevenLabs\n\nLa synthèse vocale a franchi un cap décisif grâce aux réseaux neuronaux d'ElevenLabs :\n\n1. **Voice Cloning** : Clonez votre propre voix ou créez des voix d'acteurs uniques pour vos podcasts, publicités et cours en ligne.\n2. **Support Multilingue** : Traduisez et doublez vos contenus en plus de 29 langues avec une fidélité émotionnelle totale.\n3. **Offre WaYmen** : Licences Creator avec quota étendu activées en 15 minutes.",
      en: "# Elite speech synthesis and dubbing with ElevenLabs\n\nNeural voice technology reached a whole new standard with ElevenLabs:\n\n1. **Voice Cloning**: Clone your own voice or design unique voice talents for podcasts, audiobooks and commercials.\n2. **Multilingual Dubbing**: Translate and dub voiceover into 29+ languages with complete emotional preservation.\n3. **WaYmen Offer**: Creator plan licenses with high credit quotas delivered in 15 minutes.",
      ar: "# الصوت الذكي والدبلجة متعددة اللغات مع ElevenLabs\n\nحققت تكنولوجيا الصوت العصبي طفرة غير مسبوقة بفضل نماذج ElevenLabs:\n\n1. **استنساخ الصوت**: أنشئ نبرة صوتك الخاصة أو أصوات شخصيات فريدة للبودكاست والإعلانات والكتب الصوتية.\n2. **الدبلجة الدولية**: ترجم ودبلج المحتوى إلى أكثر من 29 لغة مع الحفاظ الكامل على نبرة الصوت والمشاعر.\n3. **عروض وايمان**: باقات Creator مع رصيد وافر يتم تفعيلها خلال 15 دقيقة فقط.",
    },
    tags: ["audio", "elevenlabs", "voix", "podcast"],
    author: "Équipe WaYmen AI Studio",
    daysAgo: 12,
  },
  {
    slug: "formations-waymen-academy-entreprises",
    title: {
      fr: "WaYmen Academy : Monter en compétences sur l'IA appliquée",
      en: "WaYmen Academy: Upskilling with practical applied AI",
      ar: "أكاديمية وايمان: اكتساب مهارات وتطبيقات الذكاء الاصطناعي للمؤسسات",
    },
    excerpt: {
      fr: "Des masterclass pratiques et du mentorat 1-on-1 pour maîtriser les outils IA de zéro à expert.",
      en: "Hands-on masterclasses and 1-on-1 coaching to master AI tools from beginner to pro.",
      ar: "دورات تدريبية تطبيقية وإشراف فردي مخصص لاحتراف أدوات الذكاء الاصطناعي خطوة بخطوة.",
    },
    content: {
      fr: "# Pourquoi se former avec WaYmen Academy ?\n\nDisposer des meilleurs outils ne suffit pas : il faut savoir prompter, orchestrer et automatiser pour en tirer un vrai retour sur investissement :\n\n1. **Masterclass De Zéro à Pro** : Pour tous ceux qui souhaitent intégrer l'IA dans leur quotidien professionnel.\n2. **Parcours Développeurs & Créatifs** : Des ateliers poussés sur Cursor, Midjourney et ElevenLabs.\n3. **Coaching VIP 1-on-1** : Un accompagnement sur-mesure pour intégrer l'IA dans votre entreprise.",
      en: "# Why train with WaYmen Academy?\n\nHaving the tools is not enough: prompting, orchestration and automation make the real business difference:\n\n1. **Zero to Pro Masterclass**: For professionals integrating AI into their daily business operations.\n2. **Developer & Creative Tracks**: In-depth hands-on workflows with Cursor, Midjourney, and ElevenLabs.\n3. **1-on-1 VIP Coaching**: Customized onboarding to transform your team's throughput.",
      ar: "# لماذا تختار التدريب مع أكاديمية وايمان؟\n\nامتلاك أفضل الأدوات وحده لا يكفي، بل لابد من إتقان توجيه الأوامر وأتمتة مسارات العمل لتحقيق أعلى عائد إنتاجي:\n\n1. **دورة من الصفر إلى الاحتراف**: موجهة لكل المهنيين الراغبين في تسخير الذكاء الاصطناعي في عملهم.\n2. **مسارات المطورين والمصممين**: ورشات عمل تطبيقية مكثفة على Cursor و Midjourney و ElevenLabs.\n3. **التدريب الفردي الخاص VIP**: مرافقة شاملة ومخصصة لمساعدتك وفريقك على تحقيق أهدافكم.",
    },
    tags: ["formation", "academy", "coaching", "entreprise"],
    author: "Équipe WaYmen AI Studio",
    daysAgo: 6,
  },
];

const blogPosts = blogBase.map((b, i) => {
  const ts = new Date(BASE_BLOG_DATE - b.daysAgo * 86400000).toISOString();
  const idIllustration = products[i % products.length]?.id ?? products[0]?.id;
  return {
    id: `blog_${100 + i}`,
    slug: b.slug,
    title: b.title,
    excerpt: b.excerpt,
    content: b.content,
    cover: mediaDuProduit(idIllustration, `Illustration de l'article ${b.slug}`),
    author: b.author,
    tags: b.tags,
    status: "published",
    published_at: ts,
    created_at: ts,
    updated_at: ts,
  };
});

// -------------------------------------------------------------------
// Tarifs de livraison (58 wilayas + défaut)
// -------------------------------------------------------------------
const NORTH = new Set([
  "16",
  "09",
  "35",
  "42",
  "15",
  "06",
  "18",
  "21",
  "23",
  "25",
  "43",
  "36",
  "24",
  "31",
  "27",
  "22",
  "46",
  "13",
]);
const CENTRE_HP = new Set([
  "02",
  "10",
  "26",
  "44",
  "38",
  "14",
  "20",
  "29",
  "48",
  "05",
  "19",
  "34",
  "40",
  "41",
  "28",
  "03",
  "17",
]);

const shippingRates = [{ wilaya_code: "*", home: 800, desk: 400, updated_at: now }];
for (const w of WILAYAS) {
  let home = 1500,
    desk = 800;
  if (NORTH.has(w.code)) {
    home = 600;
    desk = 350;
  } else if (CENTRE_HP.has(w.code)) {
    home = 900;
    desk = 500;
  }
  shippingRates.push({ wilaya_code: w.code, home, desk, updated_at: now });
}

// -------------------------------------------------------------------
// Modes de paiement
// -------------------------------------------------------------------
const paymentMethods = [
  {
    id: "cod",
    label: "Paiement à la livraison",
    instructions: "Réglez votre commande en espèces au livreur.",
    active: 1,
    position: 0,
    updated_at: now,
  },
  {
    id: "bank",
    label: "Virement bancaire",
    instructions:
      "Un RIB vous sera envoyé après validation. La commande est expédiée dès réception du virement.",
    active: 1,
    position: 1,
    updated_at: now,
  },
  {
    id: "card",
    label: "CIB / Edahabia",
    instructions:
      "Paiement en ligne sécurisé via la plateforme SATIM (redirection après validation).",
    active: 1,
    position: 2,
    updated_at: now,
  },
  {
    id: "store",
    label: "Paiement en boutique",
    instructions: "Retirez et réglez votre commande à notre point de vente d'Alger.",
    active: 0,
    position: 3,
    updated_at: now,
  },
];

// -------------------------------------------------------------------
// Pièces du configurateur (builder_steps → section site_content)
// -------------------------------------------------------------------
const builderSteps = [
  {
    id: "case",
    label: "Boîtier",
    icon: "case",
    options: [
      { id: "case-a", name: "NZXT H5 Flow", price: 14000 },
      { id: "case-b", name: "Lian Li Lancool 216", price: 18500 },
      { id: "case-c", name: "Corsair 4000D Airflow", price: 16000 },
    ],
  },
  {
    id: "mb",
    label: "Carte mère",
    icon: "mb",
    options: [
      { id: "mb-a", name: "MSI B650 Tomahawk", price: 28000 },
      { id: "mb-b", name: "ASUS X670E-Plus", price: 52000 },
      { id: "mb-c", name: "Gigabyte B760 Aorus", price: 24000 },
    ],
  },
  {
    id: "cpu",
    label: "Processeur",
    icon: "cpu",
    options: [
      { id: "cpu-a", name: "AMD Ryzen 5 7600", price: 32000 },
      { id: "cpu-b", name: "AMD Ryzen 7 7700X", price: 52000 },
      { id: "cpu-c", name: "Intel Core i7-14700K", price: 65000 },
    ],
  },
  {
    id: "ram",
    label: "Mémoire RAM",
    icon: "ram",
    options: [
      { id: "ram-a", name: "16GB DDR5 6000", price: 14000 },
      { id: "ram-b", name: "32GB DDR5 6000", price: 26000 },
      { id: "ram-c", name: "64GB DDR5 6000", price: 52000 },
    ],
  },
  {
    id: "ssd",
    label: "SSD",
    icon: "ssd",
    options: [
      { id: "ssd-a", name: "500GB NVMe Gen4", price: 9000 },
      { id: "ssd-b", name: "1TB NVMe Gen4", price: 16000 },
      { id: "ssd-c", name: "2TB NVMe Gen4", price: 32000 },
    ],
  },
  {
    id: "gpu",
    label: "Carte graphique",
    icon: "gpu",
    options: [
      { id: "gpu-a", name: "RTX 4060 8GB", price: 60000 },
      { id: "gpu-b", name: "RTX 4070 Super 12GB", price: 110000 },
      { id: "gpu-c", name: "RTX 4080 Super 16GB", price: 200000 },
    ],
  },
  {
    id: "psu",
    label: "Alimentation",
    icon: "psu",
    options: [
      { id: "psu-a", name: "650W 80+ Bronze", price: 9500 },
      { id: "psu-b", name: "750W 80+ Gold", price: 14500 },
      { id: "psu-c", name: "850W 80+ Gold", price: 19000 },
    ],
  },
  {
    id: "cool",
    label: "Refroidissement",
    icon: "cool",
    options: [
      { id: "cool-a", name: "DeepCool AK620", price: 9000 },
      { id: "cool-b", name: "Arctic LF II 280", price: 18000 },
      { id: "cool-c", name: "NZXT Kraken X73", price: 28000 },
    ],
  },
];

// -------------------------------------------------------------------
// Contenu du site — toutes les sections de SiteContent (src/lib/site-content.ts)
// -------------------------------------------------------------------

/**
 * Les avis de la section « home-reviews » vivent dans un contenu éditorial
 * à part (section dédiée « home-reviews » de site_content). On les conserve
 * dans le seed de la vitrine pour que /content/home-reviews soit alimenté.
 *
 * La seed complète est produite par seedSiteContent() ; on n'en extrait que
 * les données pures (sans les icônes React non sérialisables).
 */
const siteContentSeed = seedSiteContent();

// section « home-reviews » : liste éditoriale d'avis (maintenue séparément)
const homeReviewsSection = {
  items: [
    {
      id: "hrev_1",
      name: "Amine Bensalah",
      city: "Alger",
      productId: "chatgpt-plus-mensuel",
      text: "Activation de ChatGPT Plus reçue en 8 minutes chrono ! Compte officiel et service client irréprochable.",
      rating: 5,
      gradient: "linear-gradient(135deg,#3b82f6,#1e40af)",
    },
    {
      id: "hrev_2",
      name: "Yasmine A.",
      city: "Oran",
      productId: "claude-pro-mensuel",
      text: "Claude 3.5 Sonnet activé sans accroc, indispensable pour mes rédactions et mes analyses de données.",
      rating: 5,
      gradient: "linear-gradient(135deg,#a855f7,#6d28d9)",
    },
    {
      id: "hrev_3",
      name: "Karim Haddad",
      city: "Constantine",
      productId: "pack-fullstack-dev",
      text: "Le pack Fullstack (Cursor Pro + Claude Pro + GitHub Copilot) a transformé ma productivité de dev.",
      rating: 5,
      gradient: "linear-gradient(135deg,#10b981,#047857)",
    },
  ],
};

// section « ticker » : messages du bandeau défilant
const tickerSection = {
  items: [
    { id: "tick_1", text: "⚡ Activation garantie en moins de 15 minutes 7j/7" },
    { id: "tick_2", text: "🔐 Comptes 100% officiels & licences garanties sans coupure" },
    { id: "tick_3", text: "🎓 Waymen Academy : formations pratiques & tutoriels IA" },
    { id: "tick_4", text: "💳 Paiement local sécurisé (Edahabia, CIB, Baridimob & Cash)" },
    { id: "tick_5", text: "🎁 Pack Bundles : jusqu'à -30% sur vos outils combinés" },
  ],
};

// section « marquee » : marques du bandeau défilant
const marqueeSection = {
  brands: [
    "OpenAI",
    "Anthropic",
    "Google",
    "Midjourney",
    "Cursor",
    "Microsoft",
    "Perplexity",
    "ElevenLabs",
    "Runway",
    "Canva",
    "Notion",
    "WaYmen Academy",
    "WaYmen VIP",
  ],
};

// section « about » : valeurs de la page À propos
const aboutSection = {
  values: [
    {
      id: "val_1",
      icon: "shield",
      title: "Licences Officielles Garanties",
      description:
        "Toutes nos activations proviennent directement des éditeurs officiels avec garantie de continuité.",
    },
    {
      id: "val_2",
      icon: "zap",
      title: "Activation Express 7j/7",
      description:
        "Livraison dématérialisée et configuration guidée en moins de 15 minutes après commande.",
    },
    {
      id: "val_3",
      icon: "headphones",
      title: "Support Dédié & Conseil R&D",
      description:
        "Notre équipe d'experts IA vous oriente vers les outils les plus adaptés à vos cas d'usage réels.",
    },
    {
      id: "val_4",
      icon: "award",
      title: "Waymen Academy",
      description:
        "Transfert de compétences, masterclass et tutoriels opérationnels animés par des praticiens.",
    },
  ],
};

// section « builder » : étapes du configurateur PC
const builderSection = { steps: builderSteps };

/**
 * siteContent : toutes les sections de SiteContent + les sections éditoriales.
 *
 * Les 15 sections de SiteContent sont extraites directement de seedSiteContent().
 * Les Localized<string> sont conservés tels quels (objets {fr,en,ar}) — jamais aplatis.
 * Les 5 sections éditoriales sont conservées pour la compatibilité de l'import.
 */
const siteContent = {
  // 15 sections de SiteContent (src/lib/site-content.ts → type SiteContent)
  header: siteContentSeed.header,
  footer: siteContentSeed.footer,
  hero: siteContentSeed.hero,
  categories: siteContentSeed.categories,
  useChips: siteContentSeed.useChips,
  bestSellers: siteContentSeed.bestSellers,
  featuredTabs: siteContentSeed.featuredTabs,
  flashSale: siteContentSeed.flashSale,
  brandsMarquee: siteContentSeed.brandsMarquee,
  whyUs: siteContentSeed.whyUs,
  builderTeaser: siteContentSeed.builderTeaser,
  reviews: siteContentSeed.reviews,
  contactCta: siteContentSeed.contactCta,
  floatingWhatsApp: siteContentSeed.floatingWhatsApp,
  mobileBottomBar: siteContentSeed.mobileBottomBar,
  customPages: siteContentSeed.customPages,
  contact: siteContentSeed.contact,
  // 5 sections éditoriales (listes gérées séparément par l'admin)
  "home-reviews": homeReviewsSection,
  ticker: tickerSection,
  marquee: marqueeSection,
  about: aboutSection,
  builder: builderSection,
};

// -------------------------------------------------------------------
// Réglages du site (settings.scope = 'site' et 'shipping')
// -------------------------------------------------------------------
const siteSettings = {
  storeName: "WaYmen AI Studio",
  contactEmail: "contact@waymen-ai.com",
  contactPhone: "+213 555 99 88 77",
  whatsapp: "213555998877",
  address: "Alger, Algérie — Hub Numérique & Activation IA",
  hours: "7j/7, 8h – 23h (Support & Activations en continu)",
  maintenance: false,
  maintenanceMessage: "WaYmen AI Studio est en cours de mise à jour. Nous revenons très vite !",
  emailNotifications: true,
  showPromoBanner: true,
  promoBannerText:
    "Activation instantanée en moins de 15 min & Formations certifiées — Waymen AI Studio.",
  promoBannerLabel: "Découvrir",
  promoBannerHref: "/category/llm-assistants",
  lowStockThreshold: 5,
  outOfStockThreshold: 0,
  currencySymbol: "DA",
  currencyPosition: "suffix",
  currencyThousandSeparator: " ",
  languageSelectorEnabled: true,
  hideRatingWhenNoReviews: true,
  primaryColor: "#e6007a",
  secondaryColor: "#00a3ff",
  accentColor: "#8b5cf6",
  logoUrl: "media/waymen-logo.webp",
  faviconUrl: "favicon.ico",
  defaultTheme: "light",
  borderRadius: "modern",
  fontFamily: "jakarta",
};

const shippingSettings = {
  freeShippingThreshold: 150000,
  homeEnabled: true,
  deskEnabled: true,
};

// -------------------------------------------------------------------
// Assemblage final
// -------------------------------------------------------------------
const payload = {
  generatedAt: now,
  categories,
  brands,
  products: produitsExtraits,
  blogPosts,
  shippingRates,
  paymentMethods,
  siteContent,
  siteSettings,
  shippingSettings,
};

// -------------------------------------------------------------------
// Contrôle final — aucun chemin d'image émis sans fichier derrière
// -------------------------------------------------------------------
/**
 * Deuxième filet, POSÉ SUR LE RÉSULTAT et non sur la fabrication.
 *
 * `publierMedia()` garantit les chemins qui passent par lui ; ce contrôle-ci
 * relit le JSON produit et exige que CHAQUE valeur ressemblant à un média
 * désigne un fichier réellement présent sous `public/`. Un futur champ ajouté
 * sans passer par le helper serait attrapé ici, avant d'atteindre la base.
 *
 * C'est exactement le contrôle qui manquait : 19 chemins morts ont traversé le
 * typage, le lint, le build et des mois de développement.
 */
const DOSSIER_PUBLIC = resolve(import.meta.dir, "../public");
const EXTENSIONS_IMAGE = /\.(webp|png|jpe?g|avif|gif|svg)$/i;

function verifierCheminsMedias(valeur: unknown, chemin: string, anomalies: string[]): void {
  if (typeof valeur === "string") {
    if (!EXTENSIONS_IMAGE.test(valeur)) return;
    // Une URL externe (https://…) est le choix assumé d'un exploitant : hors
    // de portée d'une vérification sur disque, on la laisse passer.
    if (/^[a-z][a-z0-9+.-]*:/i.test(valeur)) return;

    if (valeur.startsWith("/")) {
      anomalies.push(
        `${chemin} : « ${valeur} » est un chemin ABSOLU. Il sortirait du dossier ` +
          `de déploiement en sous-dossier. Utiliser publierMedia().`,
      );

      return;
    }

    if (!existsSync(`${DOSSIER_PUBLIC}/${valeur}`)) {
      anomalies.push(`${chemin} : « ${valeur} » ne correspond à aucun fichier de public/.`);
    }

    return;
  }

  if (Array.isArray(valeur)) {
    valeur.forEach((v, i) => verifierCheminsMedias(v, `${chemin}[${i}]`, anomalies));

    return;
  }

  if (valeur !== null && typeof valeur === "object") {
    for (const [cle, v] of Object.entries(valeur)) {
      verifierCheminsMedias(v, `${chemin}.${cle}`, anomalies);
    }
  }
}

const anomaliesMedias: string[] = [];
verifierCheminsMedias(payload, "payload", anomaliesMedias);
if (anomaliesMedias.length > 0) {
  console.error(
    `\n${anomaliesMedias.length} chemin(s) d'image invalide(s) — extraction ABANDONNÉE :`,
  );
  for (const a of anomaliesMedias) console.error(`  - ${a}`);
  process.exit(1);
}

// Fichiers de public/media/ que plus aucune donnée ne réclame : ils seraient
// livrés pour rien. Simple avertissement — la suppression reste une décision
// humaine, le fichier peut être référencé depuis la base d'un site en service.
if (existsSync(DOSSIER_MEDIAS)) {
  const orphelins = readdirSync(DOSSIER_MEDIAS).filter((f) => !mediasPublies.has(f));
  if (orphelins.length > 0) {
    console.warn(`  ⚠ public/media/ contient ${orphelins.length} fichier(s) non référencé(s) :`);
    for (const o of orphelins) console.warn(`    - ${o}`);
  }
}

const dest = resolve(import.meta.dir, "../api/tools/donnees-front.json");
writeFileSync(dest, JSON.stringify(payload, null, 2), "utf8");

console.log(`Extraction terminée → ${dest}`);
console.log(`  catégories  : ${categories.length}`);
console.log(`  marques     : ${brands.length}`);
console.log(`  produits    : ${produitsExtraits.length}`);
console.log(`  articles    : ${blogPosts.length}`);
console.log(`  tarifs liv. : ${shippingRates.length}`);
console.log(`  paiements   : ${paymentMethods.length}`);
console.log(`  site_content: ${Object.keys(siteContent).length} sections`);
console.log(`  médias      : ${mediasPublies.size} fichier(s) publiés dans public/media/`);
