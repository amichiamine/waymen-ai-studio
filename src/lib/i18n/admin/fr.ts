/**
 * AGRÉGATEUR — espace de noms « admin », langue « fr » (français).
 *
 * NE PAS MODIFIER. Ce fichier est écrit une fois pour toutes par l'agent pilote
 * et liste les six groupes de traduction du back-office. Les agents de
 * réplication remplissent UNIQUEMENT les fichiers de leur groupe
 * (`admin/<groupe>/fr.ts`) : leur contenu arrive ici automatiquement.
 *
 * Toucher à cet agrégateur, c'est provoquer un conflit de fusion avec les
 * quatre autres agents qui travaillent en parallèle — c'est précisément ce que
 * ce découpage évite.
 *
 * Convention de nommage, périmètre de chaque groupe, règles RTL et pluriels :
 * voir `src/lib/i18n/admin/index.ts`.
 *
 * L'ordre d'étalement est celui de `ADMIN_GROUPS`. Il ne doit JAMAIS servir à
 * écraser une clé d'un autre groupe : les doublons inter-groupes sont une
 * erreur, et `scripts/verifier-i18n.ts` les fait échouer.
 */
import socle from "./socle/fr";
import catalogue from "./catalogue/fr";
import ventes from "./ventes/fr";
import contenu from "./contenu/fr";
import reglages from "./reglages/fr";
import systeme from "./systeme/fr";

const adminFR: Record<string, string> = {
  ...socle,
  ...catalogue,
  ...ventes,
  ...contenu,
  ...reglages,
  ...systeme,
};

export default adminFR;
