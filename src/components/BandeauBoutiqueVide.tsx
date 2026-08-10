/**
 * BandeauBoutiqueVide — dire au COMMERÇANT que sa base est vide.
 *
 * =====================================================================
 * L'INCIDENT QUI A RENDU CE COMPOSANT NÉCESSAIRE
 * =====================================================================
 * Une boutique déployée servait une page d'accueil pleine de produits alors
 * que `GET /api/v1/products` renvoyait `{"items":[],"total":0}`. Ces produits
 * n'étaient pas des données : c'était le HTML prérendu au build
 * (`scripts/prerendu.ts`), figé dans `dist/index.html`, resté à l'écran parce
 * que l'application tombait avant de pouvoir le remplacer. Le commerçant
 * croyait donc sa boutique remplie. Il aurait ajouté un produit sans le voir
 * apparaître, et un client aurait commandé un article inexistant.
 *
 * Le mensonge lui-même est corrigé en amont (`src/data-provider/
 * normalisation.ts`) : l'application ne tombe plus, et l'accueil affiche
 * désormais l'état réel — vide. Mais « vide et silencieux » reste ambigu :
 * rien ne distingue « la base est vide » de « le site est cassé ».
 *
 * =====================================================================
 * L'ÉQUILIBRE RETENU, ET POURQUOI
 * =====================================================================
 * `AGENTS.md` §6 exige un repli VISIBLE. Deux publics, deux besoins opposés :
 *
 *  • Le VISITEUR de passage ne doit pas voir un message d'exploitation. Une
 *    boutique neuve dont le commerçant n'a rien saisi est un état NORMAL, pas
 *    une panne : la défigurer d'un bandeau rouge serait transformer le normal
 *    en incident, précisément ce que la consigne interdit. Il ne voit donc
 *    rien — juste une vitrine sobre, sans sections vides (voir `BestSellers`
 *    et `FlashSale`).
 *
 *  • L'ADMINISTRATEUR, lui, doit comprendre en une phrase. Le bandeau ne
 *    s'affiche que pour une session dont le RÔLE SERVEUR est `owner`, `admin`
 *    ou `editor` — le rôle porté par la session authentifiée, jamais le
 *    sélecteur de démonstration de l'en-tête (voir `src/lib/admin-auth.tsx`,
 *    « socle de permissions »).
 *
 * Il ne s'affiche pas non plus tant que la lecture est en cours, ni quand la
 * ressource est en erreur : « vide » et « injoignable » sont deux états
 * différents, et le second est déjà journalisé par le fournisseur.
 */
import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";

import { isHttpData, useCategoryList, useProductList } from "@/data-provider";
import { useAuth } from "@/lib/auth";

export function BandeauBoutiqueVide() {
  const { user } = useAuth();
  const produits = useProductList();
  const categories = useCategoryList();

  // Le rôle vient de la session serveur (`AuthSession.user.role`), seule
  // autorité fiable en mode http.
  const role = user?.role;
  const estExploitant = role === "owner" || role === "admin" || role === "editor";

  // En mock, le catalogue de démonstration est toujours là : le bandeau n'a
  // aucun sens et n'apparaît pas. `bun run dev:mock` reste inchangé.
  if (!isHttpData() || !estExploitant) return null;

  // « En cours de lecture » et « injoignable » ne sont pas « vide ».
  if (produits.loading || produits.error !== null) return null;
  if (produits.data.length > 0) return null;

  const sansCategorie = !categories.loading && categories.error === null && !categories.data.length;

  return (
    <div
      role="status"
      className="border-b border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
    >
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
        <PackageOpen className="size-4 shrink-0" aria-hidden />
        <span className="font-semibold">Votre catalogue est vide.</span>
        <span className="text-amber-800/90 dark:text-amber-100/80">
          La boutique fonctionne, mais aucun produit n&apos;est enregistré en base
          {sansCategorie ? ", et aucune catégorie non plus" : ""}. Vos visiteurs ne voient donc
          aucun article à la vente.
        </span>
        <Link
          to="/admin/products"
          className="font-semibold underline underline-offset-4 hover:no-underline"
        >
          Ajouter un produit
        </Link>
      </div>
    </div>
  );
}
