/**
 * Harnais de conformité provider ↔ API PHP — vague 4.8.
 *
 * ## Le problème qu'il résout
 *
 * `src/data-provider/**` (24 ressources) et `api/**` (18 contrôleurs, 94
 * routes) ont été écrits contre le même contrat, par des agents différents,
 * sans jamais se parler. Chaque moitié a été testée de son côté. Personne
 * n'avait vérifié qu'elles s'accordent.
 *
 * Ce script appelle la VRAIE API PHP et vérifie, ressource par ressource, que
 * la réponse a la forme que le provider déballe : enveloppe (`{ items }`,
 * tableau nu, objet), nom des champs, types, champs multilingues arrivant en
 * objets `{ fr, en, ar }` et non en chaînes JSON, et absence de `snake_case`.
 *
 * Il sonde aussi les VERBES HTTP des mutations : le provider utilise `PATCH`
 * là où plusieurs routes attendent `POST` ou `PUT`. Un tel écart ne se voit
 * dans aucun test unitaire des deux côtés, et se traduit par un 405 en
 * production.
 *
 * ## Contrat de sortie
 *
 *   code 0  → toutes les ressources sont CONFORMES
 *   code 1  → au moins un écart bloquant/majeur, ou au moins une ressource
 *             NON TESTÉE
 *
 * « Non testée » n'est jamais compté comme « conforme » : un harnais qui ne
 * trouve rien parce qu'il n'a pas su appeler l'API est pire qu'inutile
 * (AGENTS.md §7). Les deux compteurs sont distincts dans le rapport.
 *
 * ## Usage
 *
 *   # 1. Base dédiée + serveur PHP
 *   DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/conf.sqlite APP_ENV=production \
 *     API_BASE_PATH=/ INSTALL_OWNER_EMAIL=admin@katech.dz \
 *     INSTALL_OWNER_PASSWORD='…' php api/install.php
 *   DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/conf.sqlite \
 *     php api/tools/importer-donnees-front.php
 *   DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/conf.sqlite APP_ENV=production \
 *     API_BASE_PATH=/ php -S 127.0.0.1:8160 -t api
 *
 *   # 2. Harnais
 *   API_URL=http://127.0.0.1:8160/v1 \
 *     API_EMAIL=admin@katech.dz API_PASSWORD='…' \
 *     bunx tsx scripts/conformite-api.ts
 *
 * ATTENTION : le harnais ÉCRIT dans la base (il crée un client, un coupon, une
 * commande, un avis, un abonné, un message, une notification, un mouvement de
 * stock et un média — sans quoi la moitié des ressources serait vide, donc non
 * testable). Ne jamais le lancer contre une base de production : il refuse de
 * démarrer si `API_URL` ne pointe pas sur une adresse de loopback, sauf
 * `CONFORMITE_AUTORISER_DISTANT=1`.
 *
 * Le téléversement du média d'amorçage écrit dans `UPLOAD_DIR`, dont le défaut
 * (`<dépôt>/public_html/uploads`) n'est pas ignoré par git. Lancer le serveur
 * PHP avec `UPLOAD_DIR=/tmp/katech-uploads` évite de salir le dépôt — voir
 * docs/CONFORMITE-API.md §5.4.
 */

import { env, exit, argv } from "node:process";

// =====================================================================
// 1. Configuration
// =====================================================================

const BASE_URL = (env.API_URL ?? "http://127.0.0.1:8160/v1").replace(/\/+$/, "");
const EMAIL = env.API_EMAIL ?? "admin@katech.dz";
const MOT_DE_PASSE = env.API_PASSWORD ?? "Mdp-Recette-2026!";
const VERBEUX = argv.includes("--verbeux");

/** Identifiant volontairement absent, pour sonder un verbe sans rien modifier. */
const ID_ABSENT = "zzz-conformite-inexistant";

// =====================================================================
// 2. Client HTTP minimal, avec bocal à cookies
// =====================================================================

/** Une session = un bocal à cookies. Deux sessions : propriétaire et client. */
type Session = { nom: string; cookie: string | null };

const creerSession = (nom: string): Session => ({ nom, cookie: null });

type Reponse = {
  statut: number;
  /** Corps déjà « débarrassé » de l'enveloppe `{ data }`, comme le fait `src/api/client.ts`. */
  corps: unknown;
  /** Corps d'erreur normalisé, quand le statut n'est pas 2xx. */
  erreur: { code: string; message: string } | null;
};

async function appeler(
  session: Session,
  methode: string,
  chemin: string,
  corps?: unknown,
): Promise<Reponse> {
  const entetes: Record<string, string> = { Accept: "application/json" };
  if (corps !== undefined) entetes["Content-Type"] = "application/json";
  if (session.cookie) entetes.Cookie = session.cookie;

  let reponse: Response;
  try {
    reponse = await fetch(`${BASE_URL}${chemin}`, {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch (cause) {
    // Serveur injoignable : ce n'est PAS un écart de conformité, c'est un
    // harnais qui n'a pas pu travailler. On le fait remonter tel quel.
    throw new Error(
      `${methode} ${chemin} — serveur injoignable (${(cause as Error).message}). ` +
        `L'API PHP tourne-t-elle sur ${BASE_URL} ?`,
    );
  }

  // Le cookie de session est posé par `POST /auth/login`. On ne garde que la
  // paire nom=valeur : les attributs (HttpOnly, SameSite) ne se renvoient pas.
  const brut = reponse.headers.get("set-cookie");
  if (brut) {
    const paire = /katech_sid=([^;]+)/.exec(brut);
    if (paire) session.cookie = `katech_sid=${paire[1]}`;
  }

  const texte = await reponse.text();
  let charge: unknown = null;
  if (texte.trim() !== "") {
    try {
      charge = JSON.parse(texte);
    } catch {
      // Une réponse non-JSON est un écart en soi : le client frontend fait
      // `JSON.parse()` sans filet et lèverait une erreur réseau opaque.
      return {
        statut: reponse.status,
        corps: null,
        erreur: {
          code: "REPONSE_NON_JSON",
          message: `Corps non JSON (${texte.slice(0, 80)}…)`,
        },
      };
    }
  }

  if (!reponse.ok) {
    const enveloppe = estObjet(charge) ? charge.error : null;
    return {
      statut: reponse.status,
      corps: charge,
      erreur: {
        code: estObjet(enveloppe) ? String(enveloppe.code ?? "") : `http_${reponse.status}`,
        message: estObjet(enveloppe) ? String(enveloppe.message ?? "") : reponse.statusText,
      },
    };
  }

  // Miroir exact de `src/api/client.ts` : l'enveloppe `{ data }` est retirée.
  const utile = estObjet(charge) && "data" in charge ? charge.data : charge;

  return { statut: reponse.status, corps: utile, erreur: null };
}

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// =====================================================================
// 3. Vocabulaire de description des formes attendues
// =====================================================================

type TypeChamp =
  | "chaine"
  | "nombre"
  | "booleen"
  | "tableau"
  | "objet"
  /** Chaîne nue OU objet `{ fr, en?, ar? }` — c'est `Localized<string>`. */
  | "localise"
  | "iso8601";

type Champ = {
  nom: string;
  type: TypeChamp;
  /** `false` = optionnel côté frontend : son absence n'est pas un écart. */
  requis?: boolean;
  /** Union de littéraux TypeScript, quand elle existe. */
  valeurs?: readonly string[];
};

/** Comment le provider déballe la réponse. */
type Enveloppe =
  /** `{ items, total, page, perPage }` puis `.items` — le provider ne lit que `items`. */
  | "paginee"
  /** Tableau nu — le provider l'utilise directement. */
  | "tableau"
  /** Objet unique (singleton : réglages, contenu). */
  | "objet"
  /** Tableau de chaînes nues (`marqueeBrands`). */
  | "tableau-de-chaines";

type SondeVerbe = {
  methode: "PATCH" | "PUT" | "POST" | "DELETE";
  chemin: string;
  /** Ce que le provider appelle, en français, pour la consigne de correction. */
  libelle: string;
};

type Ressource = {
  /** Clé de `useAdminState()` dans le tableau de correspondance. */
  cle: string;
  /** Hook de lecture du provider. */
  hook: string;
  /** Chemin réellement appelé par `src/api/resources/*`. */
  chemin: string;
  enveloppe: Enveloppe;
  champs?: readonly Champ[];
  /** Champs qui ne doivent JAMAIS sortir de l'API (secrets). */
  interdits?: readonly string[];
  /** Extraction non standard (section de `/content`, par exemple). */
  extraire?: (corps: unknown) => unknown;
  /** Session à utiliser. Par défaut : propriétaire. */
  session?: "proprietaire" | "client";
  /**
   * `fromHttp` du provider lève une `ApiError` 501 : la ressource n'est pas
   * branchée. On sonde quand même l'API pour savoir sur quoi la brancher.
   */
  providerNonBranche?: string;
  /** `perPage` transmis par le provider ; absent = risque de troncature. */
  perPageEnvoye?: number;
  sondes?: readonly SondeVerbe[];
};

// =====================================================================
// 4. Validateur
// =====================================================================

type Gravite = "bloquant" | "majeur" | "mineur";

type Ecart = {
  ressource: string;
  hook: string;
  gravite: Gravite;
  code: string;
  /** Chemin du champ fautif, aussi précis que possible. */
  champ: string;
  attendu: string;
  recu: string;
};

const ecarts: Ecart[] = [];
const risques: string[] = [];
const nonTestees: { ressource: string; hook: string; raison: string }[] = [];
const conformes: string[] = [];

/**
 * Enregistre un écart, en dédupliquant sur (ressource, code, champ) une fois
 * l'indice d'enregistrement neutralisé (`items[0].read` et `items[2].read` sont
 * le MÊME défaut). Sans cette normalisation, le rapport grossirait à chaque
 * relance du harnais — la base accumule les enregistrements d'amorçage — et
 * deviendrait illisible là où il doit servir de liste de consignes.
 */
function signaler(
  r: Ressource,
  gravite: Gravite,
  code: string,
  e: Omit<Ecart, "ressource" | "hook" | "gravite" | "code">,
) {
  const champ = e.champ.replace(/\[\d+\]/g, "[*]");
  const dejaVu = ecarts.some(
    (autre) => autre.ressource === r.cle && autre.code === code && autre.champ === champ,
  );
  if (dejaVu) return;

  ecarts.push({ ressource: r.cle, hook: r.hook, gravite, code, ...e, champ });
}

/** Décrit une valeur reçue en une ligne lisible dans le rapport. */
function decrire(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "absent";
  if (Array.isArray(v)) return `tableau(${v.length})`;
  if (typeof v === "object")
    return `objet{${Object.keys(v as object)
      .slice(0, 6)
      .join(",")}}`;
  if (typeof v === "string") return `"${v.length > 40 ? `${v.slice(0, 40)}…` : v}"`;
  return String(v);
}

const EST_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

/** Une chaîne qui commence par `{"` est un objet multilingue non décodé. */
const ressembleAJson = (v: unknown): boolean => typeof v === "string" && /^\s*[{[]\s*"/.test(v);

function typeValide(type: TypeChamp, v: unknown): boolean {
  switch (type) {
    case "chaine":
      return typeof v === "string";
    case "nombre":
      return typeof v === "number" && Number.isFinite(v);
    case "booleen":
      return typeof v === "boolean";
    case "tableau":
      return Array.isArray(v);
    case "objet":
      return estObjet(v);
    case "localise":
      return typeof v === "string" || estObjet(v);
    case "iso8601":
      return typeof v === "string" && EST_ISO.test(v);
  }
}

/** Cherche récursivement une clé en `snake_case` : la base l'est, le front non. */
function cherchersnakeCase(v: unknown, chemin: string, trouve: string[], profondeur = 0): void {
  if (profondeur > 4) return;
  if (Array.isArray(v)) {
    if (v.length > 0) cherchersnakeCase(v[0], `${chemin}[0]`, trouve, profondeur + 1);
    return;
  }
  if (!estObjet(v)) return;
  for (const [cle, valeur] of Object.entries(v)) {
    // Les sections de `/content` sont légitimement en kebab-case (`home-reviews`).
    if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(cle)) trouve.push(`${chemin}.${cle}`);
    cherchersnakeCase(valeur, `${chemin}.${cle}`, trouve, profondeur + 1);
  }
}

/** Valide UN enregistrement contre la liste de champs attendue. */
function validerEnregistrement(r: Ressource, enregistrement: unknown, chemin: string): void {
  if (!estObjet(enregistrement)) {
    signaler(r, "bloquant", "FORME", {
      champ: chemin,
      attendu: "objet",
      recu: decrire(enregistrement),
    });
    return;
  }

  for (const champ of r.champs ?? []) {
    const valeur = enregistrement[champ.nom];
    const present = champ.nom in enregistrement && valeur !== null && valeur !== undefined;

    if (!present) {
      if (champ.requis !== false) {
        signaler(r, "bloquant", "CHAMP_MANQUANT", {
          champ: `${chemin}.${champ.nom}`,
          attendu: `${champ.type} (obligatoire côté frontend)`,
          recu: "absent",
        });
      }
      continue;
    }

    if (champ.type === "localise" && ressembleAJson(valeur)) {
      signaler(r, "majeur", "JSON_NON_DECODE", {
        champ: `${chemin}.${champ.nom}`,
        attendu: "objet { fr, en, ar } décodé",
        recu: decrire(valeur),
      });
      continue;
    }

    if (!typeValide(champ.type, valeur)) {
      signaler(r, "majeur", "TYPE", {
        champ: `${chemin}.${champ.nom}`,
        attendu: champ.type,
        recu: decrire(valeur),
      });
      continue;
    }

    if (champ.valeurs && typeof valeur === "string" && !champ.valeurs.includes(valeur)) {
      signaler(r, "majeur", "VALEUR_HORS_UNION", {
        champ: `${chemin}.${champ.nom}`,
        attendu: champ.valeurs.join(" | "),
        recu: decrire(valeur),
      });
    }
  }

  for (const interdit of r.interdits ?? []) {
    if (interdit in enregistrement) {
      signaler(r, "bloquant", "CHAMP_INTERDIT", {
        champ: `${chemin}.${interdit}`,
        attendu: "jamais renvoyé par l'API",
        recu: decrire(enregistrement[interdit]),
      });
    }
  }

  const snake: string[] = [];
  cherchersnakeCase(enregistrement, chemin, snake);
  for (const cle of snake) {
    signaler(r, "majeur", "SNAKE_CASE", {
      champ: cle,
      attendu: "camelCase (le frontend ne lit que du camelCase)",
      recu: "snake_case",
    });
  }
}

// =====================================================================
// 5. Les 27 ressources du tableau de correspondance de docs/DATA-PROVIDER.md
// =====================================================================

const STATUTS_COMMANDE = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
const ICONES_VALEUR = ["shield", "truck", "headphones", "award", "star", "heart"] as const;
const ICONES_ETAPE = ["case", "mb", "cpu", "ram", "ssd", "gpu", "psu", "cool"] as const;

const CHAMPS_PRODUIT: readonly Champ[] = [
  { nom: "id", type: "chaine" },
  { nom: "name", type: "localise" },
  { nom: "brand", type: "chaine" },
  { nom: "category", type: "chaine", valeurs: ["laptops", "desktops", "builds", "phones"] },
  { nom: "use", type: "tableau" },
  { nom: "specLine", type: "localise" },
  { nom: "specs", type: "objet" },
  { nom: "price", type: "nombre" },
  { nom: "oldPrice", type: "nombre", requis: false },
  { nom: "stock", type: "chaine", valeurs: ["in", "low", "out"] },
  { nom: "stockQty", type: "nombre", requis: false },
  { nom: "image", type: "chaine" },
  { nom: "bestSeller", type: "booleen", requis: false },
  { nom: "sale", type: "booleen", requis: false },
  { nom: "customBuild", type: "booleen", requis: false },
];

const CHAMPS_COMMANDE: readonly Champ[] = [
  { nom: "id", type: "chaine" },
  { nom: "customerId", type: "chaine" },
  { nom: "customerName", type: "chaine" },
  { nom: "customerEmail", type: "chaine", requis: false },
  { nom: "items", type: "tableau" },
  { nom: "subtotal", type: "nombre" },
  { nom: "discount", type: "nombre" },
  { nom: "couponCode", type: "chaine", requis: false },
  { nom: "shipping", type: "nombre" },
  { nom: "total", type: "nombre" },
  { nom: "status", type: "chaine", valeurs: STATUTS_COMMANDE },
  { nom: "statusHistory", type: "tableau" },
  { nom: "paymentMethod", type: "chaine" },
  { nom: "paymentLabel", type: "chaine", requis: false },
  { nom: "wilaya", type: "chaine" },
  { nom: "deliveryKind", type: "chaine", valeurs: ["home", "desk"] },
  { nom: "address", type: "chaine" },
  { nom: "phone", type: "chaine" },
  { nom: "createdAt", type: "iso8601" },
  { nom: "note", type: "chaine", requis: false },
];

const CHAMPS_AVIS: readonly Champ[] = [
  { nom: "id", type: "chaine" },
  { nom: "productId", type: "chaine" },
  { nom: "productName", type: "chaine" },
  { nom: "customerName", type: "chaine" },
  { nom: "rating", type: "nombre" },
  { nom: "title", type: "chaine" },
  { nom: "body", type: "chaine" },
  { nom: "status", type: "chaine", valeurs: ["pending", "approved", "rejected"] },
  { nom: "createdAt", type: "iso8601" },
];

/** Les 15 sections de `SiteContent` (src/lib/site-content.ts). */
const SECTIONS_CONTENU: readonly Champ[] = [
  "header",
  "footer",
  "hero",
  "categories",
  "useChips",
  "bestSellers",
  "featuredTabs",
  "flashSale",
  "brandsMarquee",
  "whyUs",
  "builderTeaser",
  "reviews",
  "contactCta",
  "floatingWhatsApp",
  "mobileBottomBar",
].map((nom) => ({ nom, type: "objet" as const }));

/** Les 22 champs de `SiteSettings`. */
const CHAMPS_REGLAGES: readonly Champ[] = [
  { nom: "storeName", type: "chaine" },
  { nom: "contactEmail", type: "chaine" },
  { nom: "contactPhone", type: "chaine" },
  { nom: "whatsapp", type: "chaine" },
  { nom: "address", type: "chaine" },
  { nom: "hours", type: "chaine" },
  { nom: "maintenance", type: "booleen" },
  { nom: "maintenanceMessage", type: "chaine" },
  { nom: "emailNotifications", type: "booleen" },
  { nom: "showPromoBanner", type: "booleen" },
  { nom: "promoBannerText", type: "chaine" },
  { nom: "promoBannerLabel", type: "chaine" },
  { nom: "promoBannerHref", type: "chaine" },
  { nom: "lowStockThreshold", type: "nombre" },
  { nom: "outOfStockThreshold", type: "nombre" },
  { nom: "currencySymbol", type: "chaine" },
  { nom: "currencyPosition", type: "chaine", valeurs: ["prefix", "suffix"] },
  { nom: "currencyThousandSeparator", type: "chaine" },
  { nom: "languageSelectorEnabled", type: "booleen" },
  { nom: "hideRatingWhenNoReviews", type: "booleen" },
];

const RESSOURCES: readonly Ressource[] = [
  {
    cle: ".products",
    hook: "useProductList()",
    chemin: "/products?perPage=100",
    enveloppe: "paginee",
    champs: CHAMPS_PRODUIT,
    perPageEnvoye: 100,
    sondes: [
      { methode: "PATCH", chemin: `/products/${ID_ABSENT}`, libelle: "update produit" },
      { methode: "PATCH", chemin: `/products/${ID_ABSENT}/stock`, libelle: "maj du stock" },
      { methode: "DELETE", chemin: `/products/${ID_ABSENT}`, libelle: "remove produit" },
    ],
  },
  {
    cle: ".categories",
    hook: "useCategoryList()",
    chemin: "/categories",
    enveloppe: "paginee",
    champs: [
      { nom: "slug", type: "chaine" },
      { nom: "label", type: "chaine" },
      { nom: "description", type: "chaine" },
      { nom: "cover", type: "chaine", requis: false },
    ],
    sondes: [
      { methode: "PATCH", chemin: `/categories/${ID_ABSENT}`, libelle: "update catégorie" },
      { methode: "DELETE", chemin: `/categories/${ID_ABSENT}`, libelle: "remove catégorie" },
    ],
  },
  {
    cle: ".brands",
    hook: "useBrandList()",
    chemin: "/brands",
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "name", type: "chaine" },
      { nom: "description", type: "chaine", requis: false },
      { nom: "country", type: "chaine", requis: false },
    ],
    sondes: [
      { methode: "PATCH", chemin: `/brands/${ID_ABSENT}`, libelle: "update marque" },
      { methode: "DELETE", chemin: `/brands/${ID_ABSENT}`, libelle: "remove marque" },
    ],
  },
  {
    cle: ".orders",
    hook: "useOrderList()",
    chemin: "/orders",
    enveloppe: "paginee",
    champs: CHAMPS_COMMANDE,
    sondes: [
      { methode: "PATCH", chemin: `/orders/${ID_ABSENT}/status`, libelle: "updateStatus" },
      { methode: "DELETE", chemin: `/orders/${ID_ABSENT}`, libelle: "remove commande" },
    ],
  },
  {
    cle: ".orders (client connecté)",
    hook: "useMyOrderList()",
    // Le provider appelle `GET /me/orders` SANS paramètre : la session doit
    // suffire à identifier le client.
    chemin: "/me/orders",
    enveloppe: "tableau",
    champs: CHAMPS_COMMANDE,
    session: "client",
  },
  {
    cle: ".customers",
    hook: "useCustomerList()",
    chemin: "/customers",
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "name", type: "chaine" },
      { nom: "email", type: "chaine" },
      { nom: "phone", type: "chaine" },
      { nom: "wilaya", type: "chaine" },
      { nom: "createdAt", type: "iso8601" },
      { nom: "ordersCount", type: "nombre" },
      { nom: "totalSpent", type: "nombre" },
    ],
    sondes: [
      { methode: "PATCH", chemin: `/customers/${ID_ABSENT}`, libelle: "upsert client" },
      { methode: "DELETE", chemin: `/customers/${ID_ABSENT}`, libelle: "remove client" },
    ],
  },
  {
    cle: ".coupons",
    hook: "useCouponList()",
    chemin: "/coupons",
    enveloppe: "paginee",
    champs: [
      { nom: "code", type: "chaine" },
      { nom: "type", type: "chaine", valeurs: ["percent", "fixed"] },
      { nom: "value", type: "nombre" },
      { nom: "minPurchase", type: "nombre" },
      { nom: "expiresAt", type: "iso8601" },
      { nom: "usageCount", type: "nombre" },
      { nom: "usageLimit", type: "nombre" },
      { nom: "active", type: "booleen" },
    ],
    sondes: [
      { methode: "PATCH", chemin: `/coupons/${ID_ABSENT}`, libelle: "update coupon" },
      { methode: "DELETE", chemin: `/coupons/${ID_ABSENT}`, libelle: "remove coupon" },
    ],
  },
  {
    cle: ".reviews",
    hook: "useReviewList()",
    chemin: "/reviews",
    // `reviewsApi.list()` déballe `.items` de l'enveloppe paginée (lot 1 corrigé).
    enveloppe: "paginee",
    champs: CHAMPS_AVIS,
    sondes: [
      { methode: "PATCH", chemin: `/reviews/${ID_ABSENT}/status`, libelle: "moderate avis" },
      { methode: "DELETE", chemin: `/reviews/${ID_ABSENT}`, libelle: "remove avis" },
    ],
  },
  {
    cle: ".reviews (d'un produit)",
    hook: "useProductReviewList()",
    chemin: "/products/rog-strix-g16/reviews",
    // `reviewsApi.byProduct()` déballe `.items` de l'enveloppe paginée (lot 1 corrigé).
    enveloppe: "paginee",
    champs: CHAMPS_AVIS,
  },
  {
    cle: ".users",
    hook: "useUserList()",
    chemin: "/admin/users",
    // `usersApi.list()` déballe `.items` de l'enveloppe paginée (lot 1 corrigé).
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "name", type: "chaine" },
      { nom: "email", type: "chaine" },
      { nom: "role", type: "chaine", valeurs: ["owner", "admin", "editor", "viewer"] },
      { nom: "active", type: "booleen" },
      { nom: "lastLogin", type: "iso8601", requis: false },
      { nom: "createdAt", type: "iso8601" },
    ],
    interdits: ["password", "passwordHash", "password_hash"],
    sondes: [
      { methode: "PATCH", chemin: `/admin/users/${ID_ABSENT}`, libelle: "update utilisateur" },
      { methode: "DELETE", chemin: `/admin/users/${ID_ABSENT}`, libelle: "remove utilisateur" },
    ],
  },
  {
    cle: ".blogPosts",
    hook: "useBlogPostList()",
    chemin: "/blog",
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "slug", type: "chaine" },
      { nom: "title", type: "localise" },
      { nom: "excerpt", type: "localise" },
      { nom: "content", type: "localise" },
      { nom: "cover", type: "chaine", requis: false },
      { nom: "author", type: "chaine" },
      { nom: "tags", type: "tableau" },
      { nom: "status", type: "chaine", valeurs: ["draft", "published"] },
      { nom: "createdAt", type: "iso8601" },
      { nom: "updatedAt", type: "iso8601" },
      { nom: "publishedAt", type: "iso8601", requis: false },
    ],
    sondes: [
      { methode: "PATCH", chemin: `/blog/${ID_ABSENT}`, libelle: "update article" },
      { methode: "DELETE", chemin: `/blog/${ID_ABSENT}`, libelle: "remove article" },
    ],
  },
  {
    cle: ".homeReviews",
    hook: "useHomeReviewList()",
    chemin: "/content/home-reviews",
    // Le backend retourne `{ data: { items: [...] } }` (section site_content).
    // Après déballage de `data`, on obtient `{ items: [...] }` : pas d'enveloppe
    // paginée complète — on extrait directement `items`.
    enveloppe: "tableau",
    extraire: (c) => (estObjet(c) && Array.isArray(c.items) ? c.items : undefined),
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "name", type: "chaine" },
      { nom: "city", type: "chaine" },
      { nom: "productId", type: "chaine" },
      { nom: "text", type: "chaine" },
      { nom: "rating", type: "nombre" },
      { nom: "gradient", type: "chaine" },
    ],
  },
  {
    cle: ".tickerMessages",
    hook: "useTickerMessageList()",
    chemin: "/content",
    enveloppe: "tableau",
    extraire: (c) => (estObjet(c) && estObjet(c.ticker) ? c.ticker.items : undefined),
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "text", type: "chaine" },
    ],
  },
  {
    cle: ".marqueeBrands",
    hook: "useMarqueeBrandList()",
    chemin: "/content",
    enveloppe: "tableau-de-chaines",
    extraire: (c) => (estObjet(c) && estObjet(c.marquee) ? c.marquee.brands : undefined),
  },
  {
    cle: ".aboutValues",
    hook: "useAboutValueList()",
    chemin: "/content",
    enveloppe: "tableau",
    extraire: (c) => (estObjet(c) && estObjet(c.about) ? c.about.values : undefined),
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "icon", type: "chaine", valeurs: ICONES_VALEUR },
      { nom: "title", type: "chaine" },
      { nom: "description", type: "chaine" },
    ],
  },
  {
    cle: ".builderSteps",
    hook: "useBuilderStepList()",
    chemin: "/content",
    enveloppe: "tableau",
    extraire: (c) => (estObjet(c) && estObjet(c.builder) ? c.builder.steps : undefined),
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "label", type: "chaine" },
      { nom: "icon", type: "chaine", valeurs: ICONES_ETAPE },
      { nom: "options", type: "tableau" },
    ],
  },
  {
    cle: ".shippingRates",
    hook: "useShippingRateList()",
    chemin: "/settings/shipping/rates",
    enveloppe: "tableau",
    champs: [
      { nom: "wilayaCode", type: "chaine" },
      { nom: "home", type: "nombre" },
      { nom: "desk", type: "nombre" },
    ],
    sondes: [
      // Le provider fait désormais `http.put(...)` — aligné sur la route (lot 1 corrigé).
      { methode: "PUT", chemin: "/settings/shipping/rates/16", libelle: "upsert tarif" },
      {
        methode: "DELETE",
        chemin: `/settings/shipping/rates/${ID_ABSENT}`,
        libelle: "remove tarif",
      },
    ],
  },
  {
    cle: ".paymentMethods",
    hook: "usePaymentMethodList()",
    chemin: "/settings/payments",
    enveloppe: "tableau",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "label", type: "chaine" },
      { nom: "instructions", type: "chaine" },
      { nom: "active", type: "booleen" },
    ],
    sondes: [
      // Le provider fait désormais `http.put(...)` — aligné sur la route (lot 1 corrigé).
      { methode: "PUT", chemin: `/settings/payments/${ID_ABSENT}`, libelle: "upsert mode" },
      { methode: "DELETE", chemin: `/settings/payments/${ID_ABSENT}`, libelle: "remove mode" },
    ],
  },
  {
    cle: ".stockMovements",
    hook: "useStockMovementList()",
    chemin: "/inventory/movements",
    // `inventoryApi.movements()` déballe `.items` de l'enveloppe paginée (lot 1 corrigé).
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "productId", type: "chaine" },
      { nom: "productName", type: "chaine" },
      { nom: "delta", type: "nombre" },
      { nom: "reason", type: "chaine" },
      { nom: "createdAt", type: "iso8601" },
    ],
    sondes: [
      // Le provider fait désormais `http.post(...)` — aligné sur la route (lot 1 corrigé).
      { methode: "POST", chemin: `/inventory/${ID_ABSENT}/adjust`, libelle: "adjust stock" },
    ],
  },
  {
    cle: ".mediaAssets",
    hook: "useMediaAssetList()",
    chemin: "/media",
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "name", type: "chaine" },
      { nom: "src", type: "chaine" },
      { nom: "mime", type: "chaine" },
      { nom: "size", type: "nombre" },
      { nom: "createdAt", type: "iso8601" },
      { nom: "tag", type: "chaine", requis: false },
    ],
    sondes: [
      { methode: "PATCH", chemin: `/media/${ID_ABSENT}`, libelle: "rename média" },
      { methode: "DELETE", chemin: `/media/${ID_ABSENT}`, libelle: "remove média" },
    ],
  },
  {
    cle: ".notifications",
    hook: "useNotificationList()",
    chemin: "/notifications",
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "title", type: "chaine" },
      { nom: "body", type: "chaine" },
      { nom: "level", type: "chaine", valeurs: ["info", "success", "warning", "error"] },
      { nom: "read", type: "booleen" },
      { nom: "createdAt", type: "iso8601" },
      { nom: "link", type: "chaine", requis: false },
    ],
  },
  {
    cle: ".auditLogs",
    hook: "useAuditLogList()",
    chemin: "/analytics/audit",
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "actor", type: "chaine" },
      { nom: "action", type: "chaine" },
      { nom: "entity", type: "chaine" },
      { nom: "detail", type: "chaine", requis: false },
      { nom: "createdAt", type: "iso8601" },
    ],
    providerNonBranche:
      "src/data-provider/audit-logs.ts — `fromHttp` lève une ApiError 501 " +
      "alors que `GET /analytics/audit` existe.",
  },
  {
    cle: ".messages",
    hook: "useContactMessageList()",
    chemin: "/messages",
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "name", type: "chaine" },
      { nom: "email", type: "chaine" },
      { nom: "phone", type: "chaine", requis: false },
      { nom: "subject", type: "chaine" },
      { nom: "message", type: "chaine" },
      { nom: "read", type: "booleen" },
      { nom: "createdAt", type: "iso8601" },
    ],
    sondes: [
      { methode: "PATCH", chemin: `/messages/${ID_ABSENT}`, libelle: "markRead message" },
      { methode: "DELETE", chemin: `/messages/${ID_ABSENT}`, libelle: "remove message" },
    ],
  },
  {
    cle: ".subscribers",
    hook: "useSubscriberList()",
    chemin: "/subscribers",
    enveloppe: "paginee",
    champs: [
      { nom: "id", type: "chaine" },
      { nom: "email", type: "chaine" },
      { nom: "source", type: "chaine", requis: false },
      { nom: "createdAt", type: "iso8601" },
    ],
    sondes: [{ methode: "DELETE", chemin: `/subscribers/${ID_ABSENT}`, libelle: "unsubscribe" }],
  },
  {
    cle: ".siteSettings",
    hook: "useSiteSettings()",
    chemin: "/settings/site",
    enveloppe: "objet",
    champs: CHAMPS_REGLAGES,
    sondes: [{ methode: "PATCH", chemin: "/settings/site", libelle: "update réglages" }],
  },
  {
    cle: ".shippingSettings",
    hook: "useShippingSettings()",
    chemin: "/settings/shipping",
    enveloppe: "objet",
    champs: [
      { nom: "freeShippingThreshold", type: "nombre" },
      { nom: "homeEnabled", type: "booleen" },
      { nom: "deskEnabled", type: "booleen" },
    ],
    sondes: [{ methode: "PATCH", chemin: "/settings/shipping", libelle: "update livraison" }],
  },
  {
    cle: ".siteContent",
    hook: "useSiteContent()",
    chemin: "/content",
    enveloppe: "objet",
    champs: SECTIONS_CONTENU,
    sondes: [{ methode: "PATCH", chemin: "/content", libelle: "update contenu" }],
  },
];

// =====================================================================
// 6. Amorçage du jeu d'essai
// =====================================================================

/**
 * Plusieurs tables sont vides après `importer-donnees-front.php` : commandes,
 * clients, coupons, avis, messages, abonnés, notifications, mouvements de
 * stock, médias. Une ressource vide n'est pas conforme, elle est NON TESTÉE —
 * et une liste vide traverse n'importe quelle vérification de champs sans rien
 * révéler. On crée donc un enregistrement par ressource, via l'API elle-même.
 *
 * Chaque échec d'amorçage est journalisé : la ressource restera « non testée »
 * avec sa raison, jamais silencieusement « conforme ».
 */
const echecsAmorcage: string[] = [];

async function amorcer(
  libelle: string,
  session: Session,
  methode: string,
  chemin: string,
  corps: unknown,
): Promise<void> {
  const r = await appeler(session, methode, chemin, corps);
  if (r.erreur) {
    echecsAmorcage.push(
      `${libelle} : ${methode} ${chemin} → ${r.statut} ${r.erreur.code} ${r.erreur.message}`,
    );
  }
}

async function amorcerJeuDEssai(
  proprietaire: Session,
  client: Session,
  emailClient: string,
): Promise<void> {
  const suffixe = Date.now().toString(36);

  await amorcer("coupon", proprietaire, "POST", "/coupons", {
    code: `CONF${suffixe}`.toUpperCase().slice(0, 12),
    type: "percent",
    value: 10,
    minPurchase: 1000,
    expiresAt: "2030-01-01T00:00:00Z",
    usageLimit: 100,
    active: true,
  });

  // La fiche client est déjà créée par POST /auth/register (vague 4.3).
  // On s'assure qu'elle existe et on la complète (wilaya) via un upsert.
  // Si l'adresse est déjà en base (409), la fiche existe : on ignore silencieusement.
  {
    const r = await appeler(proprietaire, "POST", "/customers", {
      name: "Client de conformité",
      email: emailClient,
      phone: "0555000111",
      wilaya: "16",
    });
    if (r.erreur && r.statut !== 409) {
      echecsAmorcage.push(
        `client : POST /customers → ${r.statut} ${r.erreur.code} ${r.erreur.message}`,
      );
    }
  }

  await amorcer("abonné", proprietaire, "POST", "/subscribers", {
    email: `abo-${suffixe}@katech.dz`,
    source: "footer",
  });

  await amorcer("message de contact", proprietaire, "POST", "/messages", {
    name: "Visiteur de conformité",
    email: `visiteur-${suffixe}@katech.dz`,
    subject: "Conformité",
    message: "Message créé par scripts/conformite-api.ts pour tester la forme de la réponse.",
  });

  await amorcer("notification", proprietaire, "POST", "/notifications", {
    title: "Conformité",
    body: "Notification créée par le harnais de conformité.",
    level: "info",
  });

  // La commande a besoin d'un produit réel : on prend le premier du catalogue.
  const liste = await appeler(proprietaire, "GET", "/products?perPage=1");
  const items = estObjet(liste.corps) && Array.isArray(liste.corps.items) ? liste.corps.items : [];
  const premier = items[0];
  const produitId = estObjet(premier) && typeof premier.id === "string" ? premier.id : null;

  if (produitId === null) {
    echecsAmorcage.push(
      "commande + avis + mouvement de stock : aucun produit en base. " +
        "`api/tools/importer-donnees-front.php` a-t-il été exécuté ?",
    );
    return;
  }

  // Commande admin (liste /orders).
  await amorcer("commande admin", proprietaire, "POST", "/orders", {
    items: [{ productId: produitId, qty: 1 }],
    customer: {
      name: "Client de conformité",
      phone: "0555000111",
      email: emailClient,
    },
    shipping: {
      wilayaCode: "16",
      commune: "Alger",
      address: "1 rue de la recette",
      method: "home",
    },
    paymentMethodId: "cod",
  });

  // Commande en session client — même email que le compte inscrit.
  // Le contrôleur lie la commande à la fiche customer via le courriel de session
  // (ControleurCommandes::clientValide) : /me/orders retrouvera bien cet ordre.
  if (client.cookie !== null) {
    await amorcer("commande (session client)", client, "POST", "/orders", {
      items: [{ productId: produitId, qty: 1 }],
      customer: {
        name: "Client de conformité",
        phone: "0555000111",
        email: emailClient,
      },
      shipping: {
        wilayaCode: "16",
        commune: "Alger",
        address: "1 rue de la recette",
        method: "home",
      },
      paymentMethodId: "cod",
    });
  } else {
    echecsAmorcage.push(
      "commande (session client) : session client absente — /me/orders restera vide.",
    );
  }

  // Avis sur le produit — créé en session client (protegeConnecte sur la route).
  // L'avis doit ensuite être approuvé pour apparaître dans GET /products/:id/reviews.
  //
  // IMPORTANT : la ressource `.reviews (d'un produit)` du harnais teste
  // GET /products/rog-strix-g16/reviews — on crée donc l'avis sur ce produit
  // précisément, indépendamment de produitId (premier résultat du catalogue).
  const PRODUIT_AVIS = "rog-strix-g16";
  let avisId: string | null = null;
  const sessionAvis = client.cookie !== null ? client : proprietaire;
  const creerAvis = await appeler(sessionAvis, "POST", `/products/${PRODUIT_AVIS}/reviews`, {
    productName: "ROG Strix G16 — Avis de conformité",
    customerName: "Client de conformité",
    rating: 5,
    title: "Avis de conformité",
    body: "Avis créé par le harnais pour vérifier la forme renvoyée par l'API.",
  });
  if (creerAvis.erreur) {
    echecsAmorcage.push(
      `avis : POST /products/${PRODUIT_AVIS}/reviews → ` +
        `${creerAvis.statut} ${creerAvis.erreur.code} ${creerAvis.erreur.message}`,
    );
  } else {
    avisId =
      estObjet(creerAvis.corps) && typeof creerAvis.corps.id === "string"
        ? creerAvis.corps.id
        : null;
  }

  // Approbation de l'avis — nécessaire pour qu'il apparaisse dans
  // GET /products/:id/reviews (filtre status='approved' côté serveur).
  // GET /reviews (liste admin) renvoie tous les statuts.
  if (avisId !== null) {
    await amorcer("approbation avis", proprietaire, "PATCH", `/reviews/${avisId}/status`, {
      status: "approved",
    });
  } else {
    echecsAmorcage.push(
      "approbation avis : aucun identifiant d'avis récupéré — .reviews (d'un produit) " +
        "restera vide.",
    );
  }

  // Le mouvement de stock se crée par un ajustement. Le provider utilise
  // `PATCH` (cf. sonde), mais l'amorçage doit REUSSIR : on emploie donc le
  // verbe réellement déclaré côté serveur, `POST`.
  await amorcer("mouvement de stock", proprietaire, "POST", `/inventory/${produitId}/adjust`, {
    delta: 1,
    reason: "Amorçage du harnais de conformité",
  });

  await amorcerMedia(proprietaire);
}

/** Téléversement multipart d'un PNG minimal valide (magic bytes vérifiés côté API). */
async function amorcerMedia(session: Session): Promise<void> {
  const png = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0x60, 0x60, 0x60, 0x00,
    0x00, 0x00, 0x04, 0x00, 0x01, 0x5c, 0xcd, 0xff, 0x69, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const formulaire = new FormData();
  formulaire.append("file", new Blob([png], { type: "image/png" }), "conformite.png");

  const entetes: Record<string, string> = { Accept: "application/json" };
  if (session.cookie) entetes.Cookie = session.cookie;

  const reponse = await fetch(`${BASE_URL}/media`, {
    method: "POST",
    headers: entetes,
    body: formulaire,
  });

  if (!reponse.ok) {
    echecsAmorcage.push(`média : POST /media → ${reponse.status} ${await reponse.text()}`);
  }
}

// =====================================================================
// 7. Contrôle d'une ressource
// =====================================================================

async function controler(r: Ressource, sessions: Record<string, Session>): Promise<void> {
  const avant = ecarts.length;
  const session = sessions[r.session ?? "proprietaire"];

  if (r.providerNonBranche) {
    // Ce n'est pas une divergence de FORME mais de CÂBLAGE : la vue affichera
    // un bandeau d'erreur 501 dès la bascule, alors que l'API sait répondre.
    signaler(r, "bloquant", "PROVIDER_NON_BRANCHE", {
      champ: r.hook,
      attendu: `appel HTTP vers ${r.chemin}`,
      recu: "ApiError 501 not_implemented levée par le provider",
    });
  }

  const reponse = await appeler(session, "GET", r.chemin);

  if (reponse.erreur) {
    signaler(r, "bloquant", "APPEL_REFUSE", {
      champ: `GET ${r.chemin}`,
      attendu: "200 avec la donnée",
      recu: `${reponse.statut} ${reponse.erreur.code} — ${reponse.erreur.message}`,
    });
    nonTestees.push({
      ressource: r.cle,
      hook: r.hook,
      raison: `GET ${r.chemin} a répondu ${reponse.statut} ${reponse.erreur.code} : la forme des champs n'a pas pu être observée.`,
    });
    return;
  }

  // ---- Enveloppe -------------------------------------------------------
  const brut = r.extraire ? r.extraire(reponse.corps) : reponse.corps;
  let enregistrements: unknown[] = [];

  if (r.enveloppe === "objet") {
    if (!estObjet(brut)) {
      signaler(r, "bloquant", "ENVELOPPE", {
        champ: r.chemin,
        attendu: "objet unique",
        recu: decrire(brut),
      });
      nonTestees.push({ ressource: r.cle, hook: r.hook, raison: "enveloppe inattendue" });
      return;
    }
    enregistrements = [brut];
  } else if (r.enveloppe === "paginee") {
    if (!estObjet(brut) || !Array.isArray(brut.items)) {
      signaler(r, "bloquant", "ENVELOPPE", {
        champ: r.chemin,
        attendu: "{ items, total, page, perPage } — le provider lit `.items`",
        recu: decrire(brut),
      });
      nonTestees.push({ ressource: r.cle, hook: r.hook, raison: "enveloppe inattendue" });
      return;
    }
    for (const meta of ["total", "page", "perPage"] as const) {
      if (typeof brut[meta] !== "number") {
        signaler(r, "mineur", "PAGINATION", {
          champ: `${r.chemin}.${meta}`,
          attendu: "nombre (contrat : { items, total, page, perPage })",
          recu: decrire(brut[meta]),
        });
      }
    }
    enregistrements = brut.items;

    const total = typeof brut.total === "number" ? brut.total : 0;
    if (r.perPageEnvoye === undefined) {
      if (total > enregistrements.length) {
        signaler(r, "majeur", "TRONCATURE", {
          champ: `${r.chemin}.items`,
          attendu: `${total} enregistrements (le provider ne lit que \`.items\`)`,
          recu: `${enregistrements.length} — le provider ne transmet aucun perPage`,
        });
      } else {
        const plafond = typeof brut.perPage === "number" ? brut.perPage : 20;
        risques.push(
          `${r.hook} ne transmet aucun \`perPage\` : au-delà de ${plafond} ` +
            `enregistrements, la liste sera silencieusement tronquée (${r.chemin}).`,
        );
      }
    }
  } else {
    // "tableau" et "tableau-de-chaines"
    if (!Array.isArray(brut)) {
      signaler(r, "bloquant", "ENVELOPPE", {
        champ: r.chemin,
        attendu:
          r.enveloppe === "tableau-de-chaines"
            ? "tableau de chaînes nu"
            : "tableau nu (le provider l'utilise sans déballer `.items`)",
        recu: decrire(brut),
      });
      nonTestees.push({
        ressource: r.cle,
        hook: r.hook,
        raison: `enveloppe inattendue (${decrire(brut)}) : les champs n'ont pas pu être comparés`,
      });
      await sonderVerbes(r, session);
      return;
    }
    enregistrements = brut;
  }

  // ---- Champs ----------------------------------------------------------
  if (r.enveloppe === "tableau-de-chaines") {
    if (enregistrements.length === 0) {
      nonTestees.push({ ressource: r.cle, hook: r.hook, raison: "collection vide" });
    } else {
      const fautif = enregistrements.findIndex((v) => typeof v !== "string");
      if (fautif >= 0) {
        signaler(r, "majeur", "TYPE", {
          champ: `${r.chemin}[${fautif}]`,
          attendu: "chaîne (le provider attend `string[]`)",
          recu: decrire(enregistrements[fautif]),
        });
      }
    }
  } else if (enregistrements.length === 0) {
    nonTestees.push({
      ressource: r.cle,
      hook: r.hook,
      raison:
        "collection vide après amorçage : aucun enregistrement à comparer. " +
        "Le nom et le type des champs restent INCONNUS.",
    });
  } else {
    // Le premier enregistrement suffit à révéler la forme ; on en contrôle
    // trois pour attraper un champ optionnel absent du premier.
    enregistrements.slice(0, 3).forEach((enr, i) => {
      validerEnregistrement(r, enr, `${r.chemin}[${i}]`);
    });
  }

  await sonderVerbes(r, session);

  if (ecarts.length === avant && !nonTestees.some((n) => n.ressource === r.cle)) {
    conformes.push(r.cle);
  }
}

/**
 * Sonde les verbes de mutation avec un identifiant volontairement absent :
 * rien n'est modifié, mais un 405 révèle un verbe qui ne correspond pas à la
 * route, et un 404 « aucune route » révèle une route absente.
 */
async function sonderVerbes(r: Ressource, session: Session): Promise<void> {
  for (const sonde of r.sondes ?? []) {
    const reponse = await appeler(session, sonde.methode, sonde.chemin, {});

    if (reponse.statut === 405) {
      signaler(r, "bloquant", "VERBE", {
        champ: `${sonde.methode} ${sonde.chemin}`,
        attendu: `${sonde.methode} accepté (verbe utilisé par le provider — ${sonde.libelle})`,
        recu: "405 METHOD_NOT_ALLOWED : la route existe sous un autre verbe",
      });
      continue;
    }

    if (reponse.erreur && /aucune route/i.test(reponse.erreur.message)) {
      signaler(r, "bloquant", "ROUTE_ABSENTE", {
        champ: `${sonde.methode} ${sonde.chemin}`,
        attendu: `route déclarée dans api/routes.php (${sonde.libelle})`,
        recu: `${reponse.statut} ${reponse.erreur.code} — ${reponse.erreur.message}`,
      });
    }
  }
}

// =====================================================================
// 8. Rapport
// =====================================================================

const ORDRE_GRAVITE: Record<Gravite, number> = { bloquant: 0, majeur: 1, mineur: 2 };

function imprimerRapport(): void {
  const lignes: string[] = [];
  const l = (t = "") => lignes.push(t);

  l("=".repeat(78));
  l("  CONFORMITE provider <-> API PHP  —  scripts/conformite-api.ts");
  l(`  API : ${BASE_URL}`);
  l("=".repeat(78));
  l();

  if (echecsAmorcage.length > 0) {
    l(`AMORÇAGE — ${echecsAmorcage.length} échec(s). Les ressources concernées`);
    l("resteront « non testées » : leur forme n'a pas pu être observée.");
    for (const e of echecsAmorcage) l(`  · ${e}`);
    l();
  }

  const parGravite = [...ecarts].sort(
    (a, b) => ORDRE_GRAVITE[a.gravite] - ORDRE_GRAVITE[b.gravite],
  );

  for (const gravite of ["bloquant", "majeur", "mineur"] as const) {
    const lot = parGravite.filter((e) => e.gravite === gravite);
    if (lot.length === 0) continue;
    l("-".repeat(78));
    l(`ÉCARTS ${gravite.toUpperCase()}S — ${lot.length}`);
    l("-".repeat(78));
    for (const e of lot) {
      l(`[${e.code}] ${e.ressource} → ${e.hook}`);
      l(`    champ    : ${e.champ}`);
      l(`    attendu  : ${e.attendu}`);
      l(`    reçu     : ${e.recu}`);
    }
    l();
  }

  if (conformes.length > 0) {
    l("-".repeat(78));
    l(`CONFORMES — ${conformes.length}`);
    l("-".repeat(78));
    l(`  ${conformes.join(", ")}`);
    l();
  }

  if (nonTestees.length > 0) {
    l("-".repeat(78));
    l(`NON TESTÉES — ${nonTestees.length} (à ne PAS confondre avec « conformes »)`);
    l("-".repeat(78));
    for (const n of nonTestees) l(`  · ${n.ressource} (${n.hook}) : ${n.raison}`);
    l();
  }

  if (risques.length > 0 && VERBEUX) {
    l("-".repeat(78));
    l(`RISQUES LATENTS — ${risques.length} (non bloquants, non observables ici)`);
    l("-".repeat(78));
    for (const r of risques) l(`  · ${r}`);
    l();
  } else if (risques.length > 0) {
    l(`RISQUES LATENTS : ${risques.length} (relancer avec --verbeux pour le détail)`);
    l();
  }

  const divergentes = new Set(ecarts.map((e) => e.ressource));
  const nonTesteesUniques = new Set(nonTestees.map((n) => n.ressource));

  l("=".repeat(78));
  l("  BILAN");
  l("=".repeat(78));
  l(`  ressources examinées    : ${RESSOURCES.length}`);
  l(`  CONFORMES               : ${conformes.length}`);
  l(`  DIVERGENTES             : ${divergentes.size}`);
  l(`  NON TESTÉES             : ${nonTesteesUniques.size}`);
  l(
    `  écarts : ${ecarts.filter((e) => e.gravite === "bloquant").length} bloquant(s), ` +
      `${ecarts.filter((e) => e.gravite === "majeur").length} majeur(s), ` +
      `${ecarts.filter((e) => e.gravite === "mineur").length} mineur(s)`,
  );
  l("=".repeat(78));

  console.log(lignes.join("\n"));
}

// =====================================================================
// 9. Point d'entrée
// =====================================================================

async function principal(): Promise<number> {
  const hote = new URL(BASE_URL).hostname;
  const localhost = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(hote);
  if (!localhost && env.CONFORMITE_AUTORISER_DISTANT !== "1") {
    console.error(
      `REFUS : ${BASE_URL} n'est pas une adresse de loopback. Ce harnais ÉCRIT dans la base ` +
        `(amorçage du jeu d'essai). Pour l'exécuter malgré tout : CONFORMITE_AUTORISER_DISTANT=1.`,
    );
    return 2;
  }

  const proprietaire = creerSession("proprietaire");
  const client = creerSession("client");

  // ---- Connexion : sans elle, rien n'est testable -----------------------
  const connexion = await appeler(proprietaire, "POST", "/auth/login", {
    email: EMAIL,
    password: MOT_DE_PASSE,
  });

  if (connexion.erreur || proprietaire.cookie === null) {
    console.error(
      "ÉCHEC DE CONNEXION — aucune ressource n'a pu être testée. Ce n'est PAS un succès.\n" +
        `  POST /auth/login → ${connexion.statut} ` +
        `${connexion.erreur?.code ?? ""} ${connexion.erreur?.message ?? ""}\n` +
        `  compte utilisé : ${EMAIL} (API_EMAIL / API_PASSWORD)\n` +
        `  cookie de session reçu : ${proprietaire.cookie === null ? "AUCUN" : "oui"}`,
    );
    return 2;
  }

  // ---- Session client, pour /me/orders ----------------------------------
  // L'email du client est partagé entre l'inscription et l'amorçage : c'est
  // sur cet email que /me/orders retrouvera les commandes (la correspondance
  // compte ↔ fiche client se fait par email dans ControleurCommandes).
  const suffixeClient = Date.now().toString(36);
  const emailClientSession = `client-conf-${suffixeClient}@katech.dz`;
  const inscription = await appeler(client, "POST", "/auth/register", {
    email: emailClientSession,
    password: "Mdp-Recette-2026!",
    name: "Client de conformité",
    phone: "0555222333",
  });
  if (inscription.erreur || client.cookie === null) {
    echecsAmorcage.push(
      `session client : POST /auth/register → ${inscription.statut} ` +
        `${inscription.erreur?.code ?? ""} ${inscription.erreur?.message ?? ""}`,
    );
  }

  await amorcerJeuDEssai(proprietaire, client, emailClientSession);

  for (const ressource of RESSOURCES) {
    await controler(ressource, { proprietaire, client });
  }

  imprimerRapport();

  const bloquantsOuMajeurs = ecarts.filter((e) => e.gravite !== "mineur").length;
  const nonTesteesUniques = new Set(nonTestees.map((n) => n.ressource)).size;

  if (bloquantsOuMajeurs > 0 || nonTesteesUniques > 0) {
    console.error(
      `\nÉCHEC : ${bloquantsOuMajeurs} écart(s) bloquant(s)/majeur(s) et ` +
        `${nonTesteesUniques} ressource(s) non testée(s). La bascule VITE_API_MODE=http ` +
        `n'est pas sûre en l'état — voir docs/CONFORMITE-API.md.`,
    );
    return 1;
  }

  console.log("\nSUCCÈS : les 27 ressources concordent avec l'API.");
  return 0;
}

principal().then(
  (code) => exit(code),
  (cause: unknown) => {
    // Un harnais qui plante ne doit JAMAIS ressembler à un harnais qui passe.
    console.error(`\nHARNAIS INTERROMPU — aucun verdict de conformité :\n  ${String(cause)}`);
    exit(2);
  },
);
