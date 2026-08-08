/**
 * Configurateur PC — matérialisation d'une configuration en `Product`.
 *
 * POURQUOI CETTE RESSOURCE EXISTE.
 * `Builder.tsx` appelait `productsApi.create()` (`POST /products`), route gardée
 * par la permission `create` — rôle `editor` minimum. En session client, le
 * serveur répondait donc 403 « Action réservée au rôle Éditeur ou supérieur »,
 * et le bouton « Ajouter au panier » ne faisait rien. La route dédiée
 * `POST /builds` est ouverte à tout utilisateur CONNECTÉ, précisément parce
 * qu'elle n'accepte pas de prix : elle le recalcule.
 *
 * LE CLIENT N'ENVOIE QUE LES IDENTIFIANTS DES PIÈCES.
 * Pas de prix, pas de nom, pas d'identifiant de produit. Le serveur relit les
 * étapes du configurateur dans son propre référentiel et somme les options
 * retenues. C'est la garantie que le prix payé est celui de la boutique, même
 * si la page a été manipulée dans la console du navigateur.
 */

import { isHttpMode } from "../config";
import { ApiError, http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, upsertProduct } from "@/lib/admin-store";
import type { BuilderPart, BuilderStep } from "@/lib/admin-store";
import type { Product } from "../types";

/** Pièces retenues : `{ "<idEtape>": "<idPiece>" }` — le corps de `POST /builds`. */
export type BuildPicks = Record<string, string>;

/**
 * Étape → clé de `specs`. Miroir de `SPEC_PAR_ICONE` de
 * `api/src/Controllers/ControleurBuilds.php`. `cool` n'a volontairement pas de
 * `SpecKey` : le refroidissement n'apparaît que dans `specLine`.
 */
const SPEC_KEY_BY_ICON: Partial<Record<BuilderStep["icon"], keyof Product["specs"]>> = {
  case: "form",
  mb: "motherboard",
  cpu: "cpu",
  ram: "ram",
  ssd: "storage",
  gpu: "gpu",
  psu: "psu",
};

/** Libellé de la catégorie dans les trois langues — miroir de la clé `nav.builds`. */
const CATEGORY_LABEL = { fr: "Configurations", en: "Builds", ar: "التجميعات" } as const;

/**
 * Compose la configuration EN LOCAL, pour le seul mode mock (aucun serveur).
 *
 * Duplication assumée et signalée : en mode http, c'est
 * `ControleurBuilds::creer()` qui compose, et lui seul fait foi. Les deux
 * implémentations doivent rester alignées ; toute divergence se verrait comme
 * un prix ou un libellé différent entre les deux modes. C'est le prix du
 * fonctionnement hors ligne du dépôt, comme pour toutes les ressources de ce
 * dossier.
 */
function buildLocally(picks: BuildPicks): Product {
  const snapshot = getAdminSnapshot();
  const steps = snapshot.builderSteps;

  if (steps.length === 0) {
    throw new ApiError(
      503,
      "CONFIGURATEUR_INDISPONIBLE",
      "Le configurateur n'est paramétré avec aucune étape.",
    );
  }

  // Validation dans l'ordre des étapes, exactement comme le serveur : les
  // messages d'erreur et l'ordre du résumé doivent être identiques.
  const fields: Record<string, string[]> = {};
  const chosen: { step: BuilderStep; part: BuilderPart }[] = [];
  let price = 0;

  for (const step of steps) {
    const partId = picks[step.id];
    if (!partId) {
      fields[step.id] = [`Étape obligatoire : « ${step.label} ».`];
      continue;
    }
    const part = step.options.find((o) => o.id === partId);
    if (!part) {
      fields[step.id] = [`Pièce inconnue « ${partId} » pour l'étape « ${step.label} ».`];
      continue;
    }
    chosen.push({ step, part });
    price += part.price;
  }

  for (const key of Object.keys(picks)) {
    if (!steps.some((s) => s.id === key)) fields[key] = ["Étape inconnue du configurateur."];
  }

  if (Object.keys(fields).length > 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Configuration invalide.", fields);
  }

  const nameByIcon = (icon: BuilderStep["icon"]): string =>
    chosen.find((c) => c.step.icon === icon)?.part.name ?? "";
  const headline = [nameByIcon("cpu"), nameByIcon("gpu")].filter((v) => v !== "");
  const suffix = headline.length === 0 ? "" : ` — ${headline.join(" · ")}`;

  const specs: Product["specs"] = {};
  for (const { step, part } of chosen) {
    const key = SPEC_KEY_BY_ICON[step.icon];
    if (key) specs[key] = part.name;
  }

  // Visuel emprunté à un assemblage du CATALOGUE : une configuration client
  // n'est pas une source d'illustration valable.
  const cover =
    snapshot.products.find(
      (p) => p.category === "builds" && p.customBuild !== true && p.image !== "",
    )?.image ?? "";

  const product: Product = {
    id: `build-${chosen.map((c) => c.part.id).join("-")}`,
    name: {
      fr: CATEGORY_LABEL.fr + suffix,
      en: CATEGORY_LABEL.en + suffix,
      ar: CATEGORY_LABEL.ar + suffix,
    },
    brand: snapshot.siteSettings.storeName,
    category: "builds",
    use: [],
    specLine: chosen.map((c) => c.part.name).join(" · "),
    specs,
    price,
    stock: "in",
    image: cover,
    // Ligne privée : résoluble par identifiant (panier, paiement, fiche
    // produit) mais écartée de toutes les surfaces publiques de listing.
    customBuild: true,
  };

  upsertProduct(product);

  return product;
}

export const buildsApi = {
  /**
   * Matérialise une configuration et retourne le `Product` créé.
   *
   * En http, le prix du retour est celui **recalculé par le serveur** : c'est
   * lui qu'il faut afficher, jamais le total calculé dans la page.
   */
  async create(picks: BuildPicks): Promise<Product> {
    if (isHttpMode()) return http.post<Product>(E.builds.create(), { picks });
    return buildLocally(picks);
  },
};
