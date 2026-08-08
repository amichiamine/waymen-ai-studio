/**
 * Groupe « contenu » — dictionnaire en (anglais).
 *
 * PROPRIÉTAIRE : l'agent de réplication chargé du groupe « contenu ». Aucun autre
 * agent n'écrit dans ce fichier ; en échange, cet agent n'écrit dans aucun
 * autre — c'est ce qui permet à cinq agents de travailler en parallèle sans
 * conflit de fusion.
 *
 * Écrans couverts : Content, BlogList, BlogNew, BlogEdit, BlogForm, Reviews, Messages, Subscribers. Attention aux trois « text-right » volontaires de Content.tsx — voir §7 de la convention.
 *
 * Seul préfixe autorisé ici : `admin.contenu.<page>.<cle>`.
 * Convention obligatoire (nommage, pluriels, RTL, qualité de l'arabe) :
 * `src/lib/i18n/admin/index.ts`. Vocabulaire partagé déjà traduit, à réutiliser
 * plutôt qu'à recopier : `admin.socle.commun.*`, `admin.socle.confirmation.*`,
 * `admin.socle.roles.*`.
 *
 * Les trois langues doivent porter EXACTEMENT les mêmes clés :
 * `bun run verifier-i18n` échoue sinon.
 */
const contenuEn: Record<string, string> = {};

export default contenuEn;
