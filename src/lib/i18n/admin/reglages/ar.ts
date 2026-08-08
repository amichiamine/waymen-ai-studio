/**
 * Groupe « reglages » — dictionnaire ar (arabe).
 *
 * PROPRIÉTAIRE : l'agent de réplication chargé du groupe « reglages ». Aucun autre
 * agent n'écrit dans ce fichier ; en échange, cet agent n'écrit dans aucun
 * autre — c'est ce qui permet à cinq agents de travailler en parallèle sans
 * conflit de fusion.
 *
 * Écrans couverts : Settings, Users, Notifications, Analytics, Reports.
 *
 * Seul préfixe autorisé ici : `admin.reglages.<page>.<cle>`.
 * Convention obligatoire (nommage, pluriels, RTL, qualité de l'arabe) :
 * `src/lib/i18n/admin/index.ts`. Vocabulaire partagé déjà traduit, à réutiliser
 * plutôt qu'à recopier : `admin.socle.commun.*`, `admin.socle.confirmation.*`,
 * `admin.socle.roles.*`.
 *
 * Les trois langues doivent porter EXACTEMENT les mêmes clés :
 * `bun run verifier-i18n` échoue sinon.
 */
const reglagesAr: Record<string, string> = {};

export default reglagesAr;
