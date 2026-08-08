/**
 * verifier-i18n — garde-fou contre la dérive des dictionnaires.
 *
 *   bun run verifier-i18n
 *
 * POURQUOI. Trois dictionnaires écrits par six mains divergent toujours : une
 * clé ajoutée en français et oubliée en arabe, une valeur vidée par une fusion,
 * une clé déclarée deux fois dans deux groupes dont l'un écrase l'autre en
 * silence. Rien de tout cela ne casse la compilation ; tout se voit en
 * production. Ce script rend ces fautes impossibles à committer : il est
 * BLOQUANT en CI et s'exécute avant tous les autres harnais (il est instantané
 * et n'a besoin ni de base de données, ni de serveur, ni de navigateur).
 *
 * CE QU'IL FAIT ÉCHOUER (sortie 1)
 *   1. jeux de clés différents entre fr / en / ar (dictionnaire visiteur, et
 *      chaque groupe de l'espace de noms admin) ;
 *   2. valeur vide ou réduite à des espaces ;
 *   3. clé déclarée deux fois — dans un même fichier, ou dans deux groupes
 *      différents (l'agrégateur en écraserait une sans le dire) ;
 *   4. clé d'un fichier de groupe hors de son préfixe `admin.<groupe>.`, ou ne
 *      respectant pas le nommage `admin.<groupe>.<page>.<cle>` en minuscules
 *      sans accent ;
 *   5. forme plurielle orpheline (`…_un` sans `…_autre`, ou l'inverse) ;
 *   6. variable d'interpolation inconnue du français (`{produit}` là où le
 *      français ne connaît que `{nom}`) ;
 *   7. fichier de groupe manquant.
 *
 * CE QU'IL SIGNALE SANS ÉCHOUER
 *   - valeur anglaise ou arabe strictement identique au français : parfois
 *     légitime (« Lenovo », « Blog », « KA Tech »), souvent une traduction
 *     oubliée. Échouer là-dessus rendrait le script inutilisable ; se taire
 *     laisserait passer des écrans entiers non traduits ;
 *   - variable présente en français et absente d'une traduction : légitime
 *     pour un singulier arabe (« منتج واحد » ne répète pas le nombre), suspect
 *     partout ailleurs.
 *
 * Convention de nommage complète : `src/lib/i18n/admin/index.ts`.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { ADMIN_GROUPS, ADMIN_LANGS, type AdminGroup, type AdminLang } from "../src/lib/i18n/admin";

type Dictionnaire = Record<string, string>;

/** Un dictionnaire à vérifier, identifié par son origine lisible. */
type Source = {
  /** Ensemble logique comparé entre langues : « visiteur », « admin/socle »… */
  ensemble: string;
  lang: AdminLang;
  /** Chemin relatif au dépôt, pour des messages actionnables. */
  chemin: string;
  dict: Dictionnaire;
};

const erreurs: string[] = [];
const avertissements: string[] = [];

const racine = fileURLToPath(new URL("..", import.meta.url));

function signaler(liste: string[], chemin: string, message: string): void {
  liste.push(`${chemin} — ${message}`);
}

/** Garde de type : un module de dictionnaire exporte bien `Record<string, string>`. */
function estDictionnaire(valeur: unknown): valeur is Dictionnaire {
  if (typeof valeur !== "object" || valeur === null) return false;
  return Object.values(valeur).every((v) => typeof v === "string");
}

async function charger(ensemble: string, lang: AdminLang, cheminRelatif: string): Promise<Source> {
  const absolu = new URL(`../${cheminRelatif}`, import.meta.url);
  const module: { default?: unknown } = await import(absolu.href);
  const dict = module.default;
  if (!estDictionnaire(dict)) {
    throw new Error(`${cheminRelatif} : l'export par défaut n'est pas un Record<string, string>.`);
  }
  return { ensemble, lang, chemin: cheminRelatif, dict };
}

/**
 * Doublons DANS un fichier. TypeScript refuse déjà deux clés identiques dans un
 * même littéral d'objet, mais cette vérification est indépendante du compilateur
 * (et instantanée) : elle protège aussi d'un futur découpage en plusieurs objets.
 */
function doublonsInternes(source: Source): void {
  const texte = readFileSync(new URL(`../${source.chemin}`, import.meta.url), "utf8");
  const vues = new Set<string>();
  // Une propriété de dictionnaire : début de ligne, clé entre guillemets, deux-points.
  const motif = /^\s*"([^"]+)"\s*:/gm;
  let trouve: RegExpExecArray | null = motif.exec(texte);
  while (trouve !== null) {
    const cle = trouve[1];
    if (vues.has(cle)) {
      signaler(erreurs, source.chemin, `clé « ${cle} » déclarée deux fois dans le même fichier.`);
    }
    vues.add(cle);
    trouve = motif.exec(texte);
  }
}

/** Valeurs vides — une chaîne d'interface vide est un trou à l'écran. */
function valeursVides(source: Source): void {
  for (const [cle, valeur] of Object.entries(source.dict)) {
    if (valeur.trim() === "") {
      signaler(erreurs, source.chemin, `clé « ${cle} » : valeur vide.`);
    }
  }
}

/** Nommage `admin.<groupe>.<page>.<cle>`, minuscules, sans accent. */
function nommage(source: Source, groupe: AdminGroup): void {
  const attendu = new RegExp(`^admin\\.${groupe}\\.[a-z0-9_]+\\.[a-z0-9_]+$`);
  for (const cle of Object.keys(source.dict)) {
    if (!cle.startsWith(`admin.${groupe}.`)) {
      signaler(
        erreurs,
        source.chemin,
        `clé « ${cle} » hors du préfixe « admin.${groupe}. » — un groupe n'écrit que ses propres clés.`,
      );
      continue;
    }
    if (!attendu.test(cle)) {
      signaler(
        erreurs,
        source.chemin,
        `clé « ${cle} » : nommage attendu « admin.${groupe}.<page>.<cle> » en minuscules sans accent.`,
      );
    }
  }
}

/** Parité des jeux de clés entre les trois langues d'un même ensemble. */
function parite(sources: Source[]): void {
  const reference = sources.find((s) => s.lang === "fr");
  if (!reference) return;
  for (const source of sources) {
    if (source.lang === "fr") continue;
    for (const cle of Object.keys(reference.dict)) {
      if (!(cle in source.dict)) {
        signaler(erreurs, source.chemin, `clé « ${cle} » présente en fr, absente ici.`);
      }
    }
    for (const cle of Object.keys(source.dict)) {
      if (!(cle in reference.dict)) {
        signaler(erreurs, source.chemin, `clé « ${cle} » absente du français — clé orpheline.`);
      }
    }
  }
}

/** Formes plurielles : `_un` et `_autre` vont toujours par paire. */
function pluriels(source: Source): void {
  for (const cle of Object.keys(source.dict)) {
    if (cle.endsWith("_un") && !(`${cle.slice(0, -3)}_autre` in source.dict)) {
      signaler(erreurs, source.chemin, `« ${cle} » sans sa forme « …_autre ».`);
    }
    if (cle.endsWith("_autre") && !(`${cle.slice(0, -6)}_un` in source.dict)) {
      signaler(erreurs, source.chemin, `« ${cle} » sans sa forme « …_un ».`);
    }
  }
}

function variables(valeur: string): Set<string> {
  return new Set(Array.from(valeur.matchAll(/\{(\w+)\}/g), (m) => m[1]));
}

/**
 * Interpolation et traductions recopiées, par rapport au français.
 * Une variable inconnue du français est une faute ; une variable omise est
 * signalée sans bloquer (un singulier arabe ne répète pas son nombre).
 */
function comparerAuFrancais(sources: Source[]): void {
  const reference = sources.find((s) => s.lang === "fr");
  if (!reference) return;
  for (const source of sources) {
    if (source.lang === "fr") continue;
    for (const [cle, valeur] of Object.entries(source.dict)) {
      const valeurFr = reference.dict[cle];
      if (valeurFr === undefined) continue;

      const varsFr = variables(valeurFr);
      for (const nom of variables(valeur)) {
        if (!varsFr.has(nom)) {
          signaler(
            erreurs,
            source.chemin,
            `clé « ${cle} » : variable « {${nom}} » inconnue du français.`,
          );
        }
      }
      for (const nom of varsFr) {
        if (!variables(valeur).has(nom)) {
          signaler(
            avertissements,
            source.chemin,
            `clé « ${cle} » : variable « {${nom}} » présente en français, absente ici.`,
          );
        }
      }

      if (valeur === valeurFr) {
        signaler(
          avertissements,
          source.chemin,
          `clé « ${cle} » : valeur identique au français (« ${valeurFr} ») — nom propre légitime, ou traduction oubliée ?`,
        );
      }
    }
  }
}

async function main(): Promise<void> {
  const ensembles = new Map<string, Source[]>();

  const ajouter = (source: Source): void => {
    const liste = ensembles.get(source.ensemble) ?? [];
    liste.push(source);
    ensembles.set(source.ensemble, liste);
  };

  // ── Dictionnaire visiteur ──────────────────────────────────────────────────
  // Il n'est pas soumis à la règle de nommage `admin.*` : son vocabulaire est
  // antérieur (`nav.home`, `search.page.titleQ`). Seules parité, valeurs vides
  // et doublons s'y appliquent.
  for (const lang of ADMIN_LANGS) {
    ajouter(await charger("visiteur", lang, `src/lib/i18n/${lang}.ts`));
  }

  // ── Espace de noms admin, groupe par groupe ────────────────────────────────
  // Chaque groupe est comparé à lui-même dans les trois langues : un agent qui
  // oublie l'arabe de SON groupe est signalé sur SON fichier, pas sur celui du
  // voisin.
  const proprietaireDeCle = new Map<string, string>();

  for (const groupe of ADMIN_GROUPS) {
    for (const lang of ADMIN_LANGS) {
      const chemin = `src/lib/i18n/admin/${groupe}/${lang}.ts`;
      if (!existsSync(new URL(`../${chemin}`, import.meta.url))) {
        erreurs.push(`${chemin} — fichier manquant : les six groupes ont trois langues chacun.`);
        continue;
      }
      const source = await charger(`admin/${groupe}`, lang, chemin);
      ajouter(source);
      nommage(source, groupe);

      // Doublons INTER-groupes, sur la langue de référence uniquement : la même
      // clé dans deux groupes serait écrasée en silence par l'agrégateur.
      if (lang === "fr") {
        for (const cle of Object.keys(source.dict)) {
          const deja = proprietaireDeCle.get(cle);
          if (deja !== undefined) {
            signaler(erreurs, chemin, `clé « ${cle} » déjà déclarée par ${deja}.`);
          } else {
            proprietaireDeCle.set(cle, `admin/${groupe}`);
          }
        }
      }
    }
  }

  for (const sources of ensembles.values()) {
    parite(sources);
    comparerAuFrancais(sources);
    for (const source of sources) {
      doublonsInternes(source);
      valeursVides(source);
      pluriels(source);
    }
  }

  // ── Rapport ────────────────────────────────────────────────────────────────
  const compte = Array.from(ensembles.entries())
    .map(([ensemble, sources]) => {
      const fr = sources.find((s) => s.lang === "fr");
      return `${ensemble} : ${fr ? Object.keys(fr.dict).length : 0} clés × ${sources.length} langues`;
    })
    .join("\n  ");

  console.log(`[verifier-i18n] ${racine}`);
  console.log(`  ${compte}`);

  if (avertissements.length > 0) {
    console.log(`\n⚠ ${avertissements.length} avertissement(s) — non bloquant :`);
    for (const message of avertissements) console.log(`  · ${message}`);
  }

  if (erreurs.length > 0) {
    console.error(`\n✖ ${erreurs.length} erreur(s) :`);
    for (const message of erreurs) console.error(`  · ${message}`);
    console.error(
      "\nLes trois langues doivent porter exactement les mêmes clés, non vides et déclarées une seule fois.",
    );
    console.error("Convention : src/lib/i18n/admin/index.ts");
    process.exit(1);
  }

  console.log("\n✔ Dictionnaires cohérents : parité fr/en/ar, aucune valeur vide, aucun doublon.");
}

await main();
