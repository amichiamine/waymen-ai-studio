/**
 * Groupe « catalogue » — dictionnaire en (anglais).
 *
 * PROPRIÉTAIRE : l'agent de réplication chargé du groupe « catalogue ». Aucun autre
 * agent n'écrit dans ce fichier ; en échange, cet agent n'écrit dans aucun
 * autre — c'est ce qui permet à cinq agents de travailler en parallèle sans
 * conflit de fusion.
 *
 * Écrans couverts : ProductForm, ProductNew, ProductEdit, ProductDetail, Categories, CategoryForm, CategoryDetail, Brands, BrandForm, BrandDetail, Inventory, Media. (Products.tsx est la page pilote : ses clés vivent dans le groupe « socle », ne les recopiez pas.)
 *
 * Seul préfixe autorisé ici : `admin.catalogue.<page>.<cle>`.
 * Convention obligatoire (nommage, pluriels, RTL, qualité de l'arabe) :
 * `src/lib/i18n/admin/index.ts`. Vocabulaire partagé déjà traduit, à réutiliser
 * plutôt qu'à recopier : `admin.socle.commun.*`, `admin.socle.confirmation.*`,
 * `admin.socle.roles.*`.
 *
 * Les trois langues doivent porter EXACTEMENT les mêmes clés :
 * `bun run verifier-i18n` échoue sinon.
 */
const catalogueEn: Record<string, string> = {};

export default catalogueEn;
