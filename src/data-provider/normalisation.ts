/**
 * Remise en conformité des réponses de l'API — singletons ET listes paginées.
 *
 * =====================================================================
 * LE DÉFAUT QUE CE MODULE SUPPRIME
 * =====================================================================
 * `docs/API-CONTRACT.md` décrit `GET /content` comme un OBJET de sections.
 * Sur une base réellement vide, l'API répond `{"data":[]}` : en PHP, un
 * tableau associatif vide se sérialise en `[]`, pas en `{}`. Le producteur et
 * le consommateur divergent donc sur le TYPE dès que la table est vide — le
 * « contrat implicite divergent » de `SKILLS.md` S8.
 *
 * Le socle (`use-resource.ts`) ne substituait `fallback` que sur `undefined`.
 * `[]` n'étant pas `undefined`, il descendait intact jusqu'aux composants :
 * `siteContent.header` valait `undefined`, `Header.tsx` levait un `TypeError`
 * au rendu, et React démontait la racine. Le visiteur ne voyait plus que le
 * HTML prérendu au build — un catalogue figé, alors que la boutique était
 * vide. Un mensonge visuel, pire qu'une page vide (AGENTS.md §6).
 *
 * =====================================================================
 * LA LIGNE DE PARTAGE, ET POURQUOI ELLE EST LÀ
 * =====================================================================
 * Une boutique neuve dont le commerçant n'a rien saisi est un état NORMAL. Ce
 * module ne doit donc jamais transformer « vide » en « panne ». La règle
 * retenue tient en une phrase :
 *
 *   • MAUVAIS TYPE  (tableau, chaîne, `null` là où un objet est attendu)
 *     → défaut de contrat : repli sur les défauts ET journalisation.
 *   • BON TYPE MAIS VIDE (`{}`)
 *     → état légitime : fusion silencieuse avec les défauts, aucun bruit.
 *
 * Fusionner plutôt que remplacer traite au passage un cas que le repli seul
 * manquait : un objet PARTIEL — le commerçant n'a personnalisé qu'une
 * section — dont les sections absentes doivent retomber sur les défauts au
 * lieu de valoir `undefined`.
 */

import { logResourceNormalisation } from "./log";

/** Vrai pour un objet JSON exploitable comme singleton : ni `null`, ni tableau. */
export function estObjetSingleton(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

/** Nom lisible du type reçu, pour un journal qui désigne la cause sans ambiguïté. */
function nommerType(valeur: unknown): string {
  if (valeur === null) return "null";
  if (Array.isArray(valeur)) return `tableau (${valeur.length} entrée(s))`;
  return typeof valeur;
}

/**
 * Ramène le corps reçu du réseau à un singleton exploitable.
 *
 * @param cle       clé de ressource, telle qu'employée par le cache et le journal
 * @param defauts   valeurs par défaut complètes — référence stable au niveau module
 * @param brut      corps reçu, dont le type n'est PAS garanti malgré son typage
 * @param fusionner stratégie de fusion ; par défaut une fusion de surface
 */
export function normaliserSingleton<T extends object>(
  cle: string,
  defauts: T,
  brut: T,
  fusionner: (defauts: T, partiel: Partial<T>) => T = (d, p) => ({ ...d, ...p }),
): T {
  // Le passage par `unknown` est délibéré : `brut` est typé `T` par la
  // signature de `fromHttp`, mais c'est précisément ce typage que la réponse
  // serveur peut démentir à l'exécution. C'est la seule façon de vérifier sans
  // recourir à `any` (AGENTS.md §6, « checks jamais affaiblis »).
  const valeur: unknown = brut;

  if (!estObjetSingleton(valeur)) {
    logResourceNormalisation(
      cle,
      `réponse de type « ${nommerType(valeur)} » là où le contrat annonce un objet`,
    );
    return defauts;
  }

  // `{}` passe par ici sans un mot : la fusion rend exactement `defauts`, et
  // « rien n'a encore été configuré » n'est pas un incident.
  return fusionner(defauts, valeur as Partial<T>);
}

/**
 * Garantit qu'une ressource de LISTE est bien une liste.
 *
 * Pour les points d'entrée qui renvoient un tableau nu plutôt qu'un objet
 * paginé. Même défaut, même conséquence : un `undefined` ou un objet reçu là
 * où une liste est attendue, et le premier `.length` ou `.map()` du composant
 * appelant fait tomber la page.
 */
export function normaliserListe<T>(cle: string, brut: T[], defauts: readonly T[]): T[] {
  const valeur: unknown = brut;

  if (!Array.isArray(valeur)) {
    logResourceNormalisation(
      cle,
      `réponse de type « ${nommerType(valeur)} » là où le contrat annonce une liste`,
    );
    return defauts as T[];
  }

  return valeur as T[];
}

/**
 * Extrait `items` d'une réponse paginée en survivant à un corps hors contrat.
 *
 * MÊME CAUSE RACINE QUE `normaliserSingleton`, autre symptôme. `docs/API-
 * CONTRACT.md` annonce `{ items, total, page, perPage }` pour toute liste.
 * Mesuré sur une base vide, l'API répond `{"data":[]}` — le même
 * `json_encode()` d'un tableau associatif vide. `(await api.list()).items`
 * valait alors `undefined`, et le premier composant à écrire
 * `liste.length === 0` tombait : `Reviews.tsx` faisait sauter l'accueil
 * entier via l'ErrorBoundary, sur une boutique dont le seul tort était
 * de n'avoir aucun avis.
 *
 * Le repli est la liste vide — la MÊME référence stable que le `fallback` de
 * la ressource, pour ne pas invalider les mémos en aval.
 *
 * @param cle     clé de ressource, pour un journal qui désigne la coupable
 * @param reponse corps reçu, dont le type n'est pas garanti malgré son typage
 * @param defauts liste vide de repli, référence stable au niveau module
 */
export function extraireItems<T>(cle: string, reponse: { items: T[] }, defauts: readonly T[]): T[] {
  const valeur: unknown = reponse;

  // Défense en profondeur : si le corps reçu est directement une liste, on l'accepte
  // sans journaliser de warning de normalisation.
  if (Array.isArray(valeur)) {
    return valeur as T[];
  }

  if (!estObjetSingleton(valeur)) {
    logResourceNormalisation(
      cle,
      `réponse de type « ${nommerType(valeur)} » là où le contrat annonce ` +
        `un objet paginé { items, total, page, perPage }`,
    );
    return defauts as T[];
  }

  const items: unknown = valeur.items;
  if (!Array.isArray(items)) {
    logResourceNormalisation(
      cle,
      `champ « items » de type « ${nommerType(items)} » là où une liste est attendue`,
    );
    return defauts as T[];
  }

  return items as T[];
}
