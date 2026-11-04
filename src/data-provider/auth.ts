/**
 * Ressource d'authentification du fournisseur de données.
 *
 * Rôle : **unique** endroit où l'on décide si l'authentification passe par le
 * réseau (`authApi`, mode http) ou par la table `admin-store.users` (mode mock).
 * `src/lib/auth.tsx` redevient ainsi un contexte React purement présentationnel :
 * il ne sait pas dans quel mode il tourne, conformément à l'intention de
 * `src/data-provider/mode.ts`.
 *
 * Pourquoi ici et pas dans `src/api/resources/auth.ts` : cette ressource-là est
 * volontairement http-seulement (elle lève une erreur explicite en mock). Le
 * chemin mock — la vérification contre `users`, la création de compte — vit donc
 * dans ce module, qui possède les deux branches.
 *
 * Contrairement aux autres ressources, ce module n'utilise pas `useResource` :
 * une session n'est pas une entité listable et son cycle de vie est porté par
 * le contexte React (`AuthProvider`), pas par le cache de ressources.
 */
import type { ApiError } from "@/api/client";
import { authApi } from "@/api/resources/auth";
import type { AuthSession, SignInInput, SignUpInput } from "@/api/types";
import {
  findUserByEmail,
  listUsersWithoutPassword,
  setUserPassword,
  touchUserLogin,
  upsertUser,
  useAdminState,
  verifyUserCredentials,
  type AdminUser,
} from "@/lib/admin-store";

import { toApiError } from "./errors";
import { isHttpData } from "./mode";

/** Préfixe de ressource — réservé pour une future invalidation de cache. */
export const AUTH_RESOURCE = "auth";

/**
 * Utilisateur authentifié. Forme **dérivée du contrat** (`AuthSession["user"]`)
 * plutôt que redéfinie : `{ id, email, name?, phone?, role }`. Toute évolution
 * du contrat se propage donc automatiquement ici.
 */
export type AuthUser = AuthSession["user"];

/** Résultat d'une tentative de connexion / inscription. */
export type AuthOutcome = { ok: true; user: AuthUser } | { ok: false; message: string };

/**
 * Issue de la sonde de session au démarrage (`authProvider.me()`).
 *
 * Le `source` est ce qui permet au contexte de rester ignorant du mode : il n'a
 * pas à savoir s'il tourne en mock ou en http, seulement si le serveur s'est
 * prononcé — et, dans ce cas, de le croire.
 */
export type SessionProbe = { source: "local" } | { source: "server"; user: AuthUser | null };

/** Motif d'échec d'une réinitialisation — traduit par la page appelante. */
export type ResetFailure = "no-account" | "update-failed";

/**
 * `message` est AJOUTÉ (optionnel) : la branche mock n'en produit pas et
 * continue de ne renvoyer qu'un `reason`, comme avant. La branche http, elle,
 * dispose d'un message précis (jeton expiré, trop de tentatives, service
 * injoignable) que `reason` seul ne peut pas porter — la page l'affiche en
 * priorité et retombe sur sa traduction quand il est absent.
 */
export type ResetOutcome = { ok: true } | { ok: false; reason: ResetFailure; message?: string };

export type ResetPasswordInput = {
  email: string;
  password: string;
  /** Jeton reçu par courriel. Requis en mode http, ignoré en mode mock. */
  token?: string;
};

export type UpdateProfileInput = { name: string; phone?: string };

/**
 * Projection `AdminUser` → `AuthUser`.
 *
 * `AdminUser` ne porte pas de champ `phone` : le téléphone n'existe que dans la
 * session (localStorage) et doit donc être fourni par l'appelant. C'est une
 * limite du store mock, pas du contrat — le backend de la phase 4 renverra le
 * téléphone dans `AuthSession.user`.
 */
function toAuthUser(u: AdminUser, phone?: string): AuthUser {
  return { id: u.id, email: u.email, name: u.name, phone, role: u.role };
}

/**
 * Rôle RÉEL de l'utilisateur connecté — l'autorité dont dépend tout le socle de
 * permissions de l'interface (`useAdminRoles` → `useEffectiveRole` →
 * `usePermissions`, plus la garde de route `/admin`).
 *
 * # Pourquoi ce hook existe
 *
 * `useAdminRoles` cherchait le rôle dans `useAdminState().users`, c'est-à-dire
 * dans le magasin MOCK du navigateur, **dans les deux modes**. En http, un
 * compte créé en base n'y figure évidemment pas : aucune correspondance, aucun
 * rôle, `isAdmin === false`. Sur une installation neuve, le propriétaire créé
 * par l'installateur était donc enfermé dehors de son propre back-office,
 * pendant que `GET /auth/me` lui répondait `role: "owner"`.
 *
 * Le défaut n'a pas été vu parce que tous les essais employaient
 * `admin@katech.dz`, adresse justement semée dans le jeu de démonstration : la
 * correspondance réussissait **par homonymie**, sur une coïncidence d'adresse,
 * jamais sur la session.
 *
 * # Pourquoi ici, et nulle part ailleurs
 *
 * `docs/DATA-PROVIDER.md` pose qu'aucun composant ni hook d'entité ne doit
 * savoir dans quel mode il tourne : un `isHttpData()` dans `admin-auth.tsx`
 * aurait corrigé le symptôme en violant la règle. Ce module est déjà **le seul**
 * endroit qui possède les deux branches de l'authentification et le seul
 * autorisé à connaître `admin-store`. Le choix de la source du rôle est
 * exactement de la même nature que le choix de la source de la session : il
 * appartient donc ici, une fois pour toutes.
 *
 * # Ce que chaque mode considère comme autorité, et pourquoi
 *
 * - **http** : la SESSION. Le serveur l'a signée (`ControleurAuth::session`),
 *   c'est la seule chose qui corresponde à ce que `Garde` appliquera côté API.
 *   Aligner l'interface dessus, c'est garantir qu'elle n'affiche pas des boutons
 *   qui finiront en 403, ni ne refuse une porte que le serveur ouvrirait.
 * - **mock** : le MAGASIN LOCAL, comme avant — il n'y a pas d'autre source, et
 *   c'est lui qui rend les démonstrations vivantes : changer un rôle dans
 *   `/admin/users` ou désactiver un compte prend effet sans se reconnecter,
 *   ce qu'une session figée ne saurait pas faire.
 *
 * Le serveur reste dans tous les cas la seule autorité RÉELLE ; ce hook ne règle
 * que la cohérence de l'interface.
 *
 * @param user Session courante, ou `null` si personne n'est connecté.
 * @returns Le rôle qui fait foi, ou `undefined` sans session ni correspondance.
 */
export function useRealRole(user: AuthUser | null): AuthUser["role"] | undefined {
  // Appelé inconditionnellement : un hook ne se saute jamais (docs §6). En http
  // la lecture du magasin est simplement ignorée.
  const { users } = useAdminState();

  if (!user) return undefined;
  if (isHttpData()) return user.role;

  const match = users.find((u) => u.email.toLowerCase() === user.email.toLowerCase() && u.active);
  return match?.role;
}

/**
 * Diagnostic de développement : emails des comptes actifs qui, faute de mot de
 * passe, ne peuvent pas se connecter en mode mock.
 *
 * Vit ici parce que ce module est le seul autorisé à connaître `admin-store`
 * (doctrine `docs/DATA-PROVIDER.md`) : l'interface consomme ce diagnostic sans
 * importer le magasin mock. Renvoie toujours un tableau vide en production et
 * en mode http — un état dégradé du magasin mock n'y a aucun sens.
 *
 * Destiné à `DataModeBadge` : un état dégradé ne doit jamais rester silencieux
 * (AGENTS.md §7). C'est l'absence de ce signal qui a laissé passer un repli
 * d'authentification accordant la connexion sans mot de passe.
 */
export function listPasswordlessAccounts(): string[] {
  if (!import.meta.env.DEV) return [];
  if (isHttpData()) return [];
  return listUsersWithoutPassword();
}

// =====================================================================
// Refus métier contre panne technique
// =====================================================================
//
// En mode http, `authApi` LÈVE une `ApiError` dès que la réponse n'est pas 2xx.
// Laissée passer, cette exception traversait `authProvider`, remontait jusqu'au
// composant, et personne ne l'attrapait : un mot de passe faux ne produisait
// AUCUN message — juste un `Uncaught (in promise) ApiError` dans la console.
// Le type `AuthOutcome` promettait pourtant `{ ok: false, message }` ; seule la
// branche mock le respectait. Les helpers ci-dessous existent pour que les DEUX
// branches aient le même contrat de sortie.
//
// La distinction refus / panne n'est pas cosmétique : afficher « Identifiants
// invalides. » alors que le serveur est éteint envoie l'utilisateur chercher une
// faute dans son mot de passe, là où rien de ce qu'il saisira ne peut aboutir.

/**
 * Statuts qui expriment un REFUS MÉTIER : le serveur a compris la demande et la
 * rejette pour un motif que l'utilisateur peut comprendre, voire corriger.
 * Liste calquée sur les fabriques réellement utilisées par `ControleurAuth`
 * (`api/src/ApiException.php`) :
 *
 *   400 BAD_REQUEST · 401 UNAUTHORIZED · 403 FORBIDDEN
 *   409 CONFLICT    · 422 VALIDATION_ERROR · 429 TOO_MANY_REQUESTS
 *
 * Tout le reste est une PANNE, y compris les cas qu'on pourrait croire
 * « métier » :
 *   - 404 / 405 : la route n'existe pas sous ce verbe → API mal déployée ou
 *     `VITE_API_URL` erroné, pas un refus ;
 *   - 408 : le délai a expiré côté client (`apiRequest`), personne n'a répondu ;
 *   - 0   : `network_error` (serveur injoignable) ou `provider_error` ;
 *   - 5xx : dont 503 DATABASE_UNAVAILABLE.
 */
const STATUTS_DE_REFUS: ReadonlySet<number> = new Set([400, 401, 403, 409, 422, 429]);

/**
 * Message d'une panne. Il doit rester DIFFÉRENT de tout message de refus :
 * c'est précisément ce qui empêche de mentir à l'utilisateur.
 */
const MESSAGE_PANNE =
  "Service d'authentification injoignable. Ce n'est pas un refus de vos identifiants : " +
  "réessayez dans un instant.";

type NatureEchec = "refus" | "panne";

type EchecHttp = { nature: NatureEchec; message: string; erreur: ApiError };

/** Détail de validation (`ApiError.fields`) rendu lisible — un 422 exploitable. */
function detailChamps(fields: ApiError["fields"]): string {
  if (!fields) return "";
  const lignes = Object.entries(fields)
    .map(([champ, messages]) => `${champ} : ${messages.join(", ")}`)
    .filter((ligne) => ligne.trim() !== "");

  return lignes.length > 0 ? ` (${lignes.join(" ; ")})` : "";
}

/**
 * Classe un échec http en refus métier ou en panne technique, et JOURNALISE la
 * cause dans le second cas — le message rendu à l'utilisateur étant générique,
 * la console est la seule trace de la cause réelle. Jamais d'échec silencieux
 * (AGENTS.md §7).
 *
 * @param operation Nom de la méthode, pour un journal localisable.
 * @param repli     Message affiché si le serveur n'a rien fourni d'exploitable
 *                  (corps avalé par un proxy, 401 sans JSON).
 */
function classerEchec(operation: string, cause: unknown, repli: string): EchecHttp {
  const erreur = toApiError(cause);

  if (!STATUTS_DE_REFUS.has(erreur.status)) {
    console.error(
      `[authProvider.${operation}] panne technique — status ${erreur.status}, code ${erreur.code} : ` +
        `${erreur.message}. Aucun refus n'a été prononcé par le serveur.`,
      erreur,
    );

    return { nature: "panne", message: MESSAGE_PANNE, erreur };
  }

  const message = erreur.message.trim() !== "" ? erreur.message : repli;

  return { nature: "refus", message: `${message}${detailChamps(erreur.fields)}`, erreur };
}

export const authProvider = {
  async signIn(input: SignInInput): Promise<AuthOutcome> {
    if (isHttpData()) {
      try {
        const session = await authApi.signIn(input);
        return { ok: true, user: session.user };
      } catch (cause) {
        // Refus (401 identifiants, 429 trop de tentatives) comme panne
        // ressortent en `{ ok: false }` — jamais en exception non attrapée —
        // avec deux messages distincts.
        const echec = classerEchec("signIn", cause, "Identifiants invalides.");
        return { ok: false, message: echec.message };
      }
    }

    // Un mot de passe faux est refusé en développement comme en production,
    // sans exception : `verifyUserCredentials` est le seul juge.
    //
    // Il existait ici un repli conditionné à `import.meta.env.DEV` qui accordait
    // la connexion lorsque le compte trouvé n'avait aucun mot de passe (comptes
    // semés sans `VITE_DEV_SEED_CREDENTIALS`). Il a été supprimé : il
    // transformait silencieusement une erreur de configuration en absence totale
    // d'authentification, à l'endroit exact où l'on croit tester
    // l'authentification. Ne jamais le réintroduire, sous aucune garde.
    //
    // La bonne intention d'origine — des comptes de démonstration utilisables
    // sans configuration — est désormais tenue en amont : `admin-store` sème un
    // mot de passe de développement par défaut (`DEV_DEFAULT_SEED_PASSWORD`)
    // quand la variable est absente, et la vérification a réellement lieu.
    const found = verifyUserCredentials(input.email, input.password);
    if (!found) return { ok: false, message: "Identifiants invalides." };

    touchUserLogin(found.email);
    return { ok: true, user: toAuthUser(found) };
  },

  async signUp(input: SignUpInput): Promise<AuthOutcome> {
    if (isHttpData()) {
      try {
        const session = await authApi.signUp(input);
        return { ok: true, user: session.user };
      } catch (cause) {
        const echec = classerEchec("signUp", cause, "Création du compte refusée.");
        return { ok: false, message: echec.message };
      }
    }

    const existing = findUserByEmail(input.email);
    if (existing) return { ok: false, message: "Un compte existe déjà avec cet email." };

    const created: AdminUser = {
      id: `usr_${Date.now()}`,
      name: input.name || input.email.split("@")[0],
      email: input.email.trim(),
      role: "viewer",
      active: true,
      password: input.password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    upsertUser(created);
    return { ok: true, user: toAuthUser(created, input.phone) };
  },

  /**
   * Déconnexion.
   *
   * `POST /auth/logout` est idempotent (204 même sans session) : un échec ici ne
   * peut donc être qu'une panne. Elle est JOURNALISÉE mais pas propagée, parce
   * que l'appelant (`AuthProvider.signOut`) efface la session locale APRÈS cet
   * appel : une exception le laisserait croire l'utilisateur encore connecté
   * alors qu'il a demandé le contraire. Le cookie serveur, lui, expirera.
   */
  async signOut(): Promise<void> {
    // En mock, la déconnexion se résume à effacer la session locale — c'est le
    // contexte qui s'en charge.
    if (!isHttpData()) return;
    try {
      await authApi.signOut();
    } catch (cause) {
      // `classerEchec` journalise déjà les pannes ; un refus sur une route
      // idempotente serait anormal et mérite sa propre trace.
      const echec = classerEchec("signOut", cause, "Déconnexion serveur refusée.");
      if (echec.nature === "refus") {
        console.warn(`[authProvider.signOut] refus inattendu du serveur : ${echec.message}`);
      }
    }
  },

  /**
   * Sonde la session courante au démarrage de l'application.
   *
   * Trois issues, et c'est le point de tout ce code :
   *
   *  - `{ source: "local" }` — mode mock : le serveur n'a rien à dire, le
   *    localStorage reste la source de vérité (comportement inchangé).
   *  - `{ source: "server", user }` — mode http, le serveur a répondu. `user` à
   *    `null` signifie « aucune session », pas « je ne sais pas » : le contexte
   *    doit alors effacer la session locale.
   *  - exception — vraie panne (réseau, 500) : le contexte conserve la session
   *    locale plutôt que de déconnecter sur un aléa.
   *
   * `GET /auth/me` répond désormais **200 avec `user: null`** à un visiteur sans
   * session : « qui suis-je ? » est une question, pas une ressource protégée, et
   * « personne » est une réponse valide. Un 401 y était compté comme une erreur
   * par le navigateur, par la console et par le compteur d'échecs du badge de
   * mode, pour un état parfaitement normal (`ControleurAuth::session`).
   *
   * Le repli sur 401 est CONSERVÉ : une API déployée avant ce correctif répond
   * encore 401, et l'application ne doit pas régresser contre elle.
   *
   * ATTENTION à ne pas généraliser : seul le 401 de CETTE sonde est anodin. Un
   * 401 sur une route censée être publique est un vrai défaut, et le socle
   * (`useResource` → `logResourceFailure`) doit continuer de le crier. Les vraies
   * routes protégées gardent leur 401.
   *
   * Une PANNE reste propagée (contrairement à `signIn`) : c'est le seul moyen de
   * dire au contexte « je ne sais pas », pour qu'il conserve la session locale
   * au lieu de déconnecter sur un aléa réseau. Un 429 ou un 403 ne signifient
   * pas « personne » et ne sont donc pas traduits en `user: null`.
   */
  async me(): Promise<SessionProbe> {
    if (!isHttpData()) return { source: "local" };
    try {
      const session = await authApi.me();
      // `user` absent ou nul = « personne », pas « je ne sais pas ».
      return { source: "server", user: session?.user ?? null };
    } catch (cause) {
      const erreur = toApiError(cause);
      if (erreur.status === 401) return { source: "server", user: null };
      classerEchec("me", cause, "Session refusée par le serveur.");
      throw erreur;
    }
  },

  /**
   * Demande d'envoi d'un lien de réinitialisation. Sans effet en mock : le
   * parcours mock saisit directement le nouveau mot de passe.
   *
   * `POST /auth/forgot-password` répond TOUJOURS 204 — délibérément, pour ne pas
   * révéler si l'adresse est inscrite. Le seul échec possible est donc une panne,
   * ou un 429 du limiteur ; ni l'un ni l'autre ne doit être révélé à
   * l'utilisateur, sous peine de reconstituer l'oracle que l'API refuse d'être.
   * L'échec est JOURNALISÉ (jamais silencieux) et non propagé : le type de retour
   * n'a aucun canal de message, et une exception non attrapée ici reproduirait
   * exactement le défaut corrigé sur `signIn`.
   */
  async forgotPassword(email: string): Promise<void> {
    if (!isHttpData()) return;
    try {
      await authApi.forgotPassword(email);
    } catch (cause) {
      const echec = classerEchec("forgotPassword", cause, "Demande refusée.");
      if (echec.nature === "refus") {
        console.warn(`[authProvider.forgotPassword] refus du serveur : ${echec.message}`);
      }
    }
  },

  async resetPassword(input: ResetPasswordInput): Promise<ResetOutcome> {
    if (isHttpData()) {
      if (!input.token) {
        // Échec visible plutôt que silencieux (AGENTS.md §7) : en http, un
        // changement de mot de passe non authentifié exige le jeton reçu par
        // courriel. Accepter la requête sans jeton reviendrait à laisser
        // n'importe qui réinitialiser le mot de passe d'autrui.
        //
        // Rendu en refus plutôt qu'en exception : l'utilisateur arrivé sans
        // `?token=` doit LIRE pourquoi son formulaire n'aboutit pas, et le
        // développeur garde sa trace en console.
        console.error(
          "[authProvider.resetPassword] Jeton absent : en mode http, la réinitialisation " +
            "exige le jeton reçu par courriel (paramètre ?token= du lien).",
        );

        return {
          ok: false,
          reason: "update-failed",
          message:
            "Lien de réinitialisation incomplet : ouvrez le lien reçu par courriel, " +
            "ou demandez-en un nouveau.",
        };
      }
      try {
        await authApi.resetPassword(input.token, input.password);
        return { ok: true };
      } catch (cause) {
        // Refus (jeton expiré → 422, trop de tentatives → 429) et panne
        // ressortent tous deux en `{ ok: false }`, avec des messages distincts.
        const echec = classerEchec("resetPassword", cause, "Réinitialisation impossible.");
        return { ok: false, reason: "update-failed", message: echec.message };
      }
    }

    if (!findUserByEmail(input.email)) return { ok: false, reason: "no-account" };
    return setUserPassword(input.email, input.password)
      ? { ok: true }
      : { ok: false, reason: "update-failed" };
  },

  /**
   * Changement de mot de passe d'un utilisateur déjà connecté.
   *
   * Le retour est un booléen : `false` signifie « le serveur a refusé » (mot de
   * passe actuel faux, nouveau mot de passe invalide, trop de tentatives) — le
   * même sens qu'en mock. Une PANNE ne peut PAS être rendue par `false` sans
   * mentir (« votre mot de passe actuel est faux » alors que le serveur est
   * éteint) : elle est journalisée puis propagée, à charge de l'appelant de
   * l'afficher comme telle. `src/pages/Account.tsx` entoure déjà ses appels au
   * contexte d'un `try/catch` qui affiche un échec.
   */
  async changePassword(email: string, currentPassword: string, password: string): Promise<boolean> {
    if (isHttpData()) {
      try {
        await authApi.changePassword(currentPassword, password);
        return true;
      } catch (cause) {
        const echec = classerEchec("changePassword", cause, "Changement de mot de passe refusé.");
        if (echec.nature === "refus") {
          console.warn(`[authProvider.changePassword] refus du serveur : ${echec.message}`);
          return false;
        }
        throw echec.erreur;
      }
    }
    if (!verifyUserCredentials(email, currentPassword)) return false;
    return setUserPassword(email, password);
  },

  /**
   * Mise à jour du profil de l'utilisateur connecté.
   *
   * En mock, seul le nom est persistable : `AdminUser` n'a pas de champ `phone`.
   * Le téléphone reste porté par la session (localStorage), comme aujourd'hui.
   */
  async updateProfile(current: AuthUser, input: UpdateProfileInput): Promise<AuthUser> {
    if (isHttpData()) {
      const session = await authApi.updateProfile({
        name: input.name,
        phone: input.phone,
      });
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? input.name,
        role: session.user.role,
        phone: session.user.phone ?? input.phone,
      };
    }

    const existing = findUserByEmail(current.email);
    if (!existing) return { ...current, name: input.name, phone: input.phone };
    const updated: AdminUser = { ...existing, name: input.name };
    upsertUser(updated);
    return toAuthUser(updated, input.phone);
  },
};
