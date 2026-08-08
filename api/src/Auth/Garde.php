<?php

/**
 * Garde d'autorisation — le serveur impose la matrice de `docs/PERMISSIONS.md`.
 *
 * POURQUOI CE FICHIER EXISTE.
 * La phase 1 a implanté la matrice CÔTÉ CLIENT (`src/lib/admin-auth.tsx`), avec
 * trois niveaux : bouton masqué, handler qui vérifie, infobulle explicative.
 * C'est de l'ergonomie, pas de la sécurité. Un bouton désactivé se réactive
 * dans la console du navigateur ; `localStorage` se modifie à la main ; et rien
 * n'oblige un attaquant à passer par l'interface — `curl` suffit.
 *
 * La matrice reproduite ici est donc la SEULE qui protège quoi que ce soit.
 * Elle est volontairement identique, ligne pour ligne, à celle du document :
 * deux matrices qui divergent, c'est une faille en préparation.
 *
 *   | Clé                      | Rôle minimum |
 *   | ------------------------ | ------------ |
 *   | read                     | viewer       |
 *   | create                   | editor       |
 *   | update                   | editor       |
 *   | delete                   | admin        |
 *   | manageUsers              | owner        |
 *   | manageSettings           | admin        |
 *   | manageCriticalSettings   | owner        |
 *   | resetData                | owner        |
 *
 * Le « rôle simulé » du sélecteur de démonstration n'existe pas ici, et ne doit
 * jamais y entrer : côté serveur, le rôle est celui de la ligne `users`, point.
 *
 * 401 CONTRE 403 — la distinction n'est pas cosmétique.
 *   401 : « je ne sais pas qui tu es »  → le client redirige vers la connexion.
 *   403 : « je sais qui tu es, et non » → le client affiche un refus.
 * Confondre les deux fait boucler le frontend sur un écran de connexion pour un
 * utilisateur pourtant connecté.
 *
 * POSE SUR UNE ROUTE (dans `api/routes.php`, hors périmètre de cette vague) :
 *
 *     $routeur->get('/products',      [$produits, 'lister']);                        // public
 *     $routeur->post('/products',     Garde::protege('create', [$produits, 'creer']));
 *     $routeur->delete('/products/:id', Garde::protege('delete', [$produits, 'supprimer']));
 *     $routeur->get('/admin/users',   Garde::protege('read', [$utilisateurs, 'lister']));
 *     $routeur->post('/admin/users',  Garde::protege('manageUsers', [$utilisateurs, 'creer']));
 *     $routeur->get('/me/orders',     Garde::protegeConnecte([$commandes, 'mesCommandes']));
 *
 * `protege()` accepte indifféremment une clé de la matrice (`'delete'`) ou un
 * rôle plancher (`'admin'`) — les deux jeux de littéraux sont disjoints, comme
 * côté client. La clé est TOUJOURS préférable : elle survit à un changement de
 * seuil dans le document.
 */

declare(strict_types=1);

namespace KaTech\Auth;

use KaTech\ApiException;
use KaTech\Reponse;
use KaTech\Requete;

final class Garde
{
    /**
     * Hiérarchie des rôles. `customer` est DANS l'échelle, au rang 0 : un
     * client authentifié n'est pas un anonyme, mais il n'atteint aucun seuil du
     * back-office (le plus bas, `read`, exige `viewer`). C'est exactement la
     * règle n°4 des cas limites de docs/PERMISSIONS.md.
     */
    public const RANGS = [
        'customer' => 0,
        'viewer' => 1,
        'editor' => 2,
        'admin' => 3,
        'owner' => 4,
    ];

    /** Miroir serveur de PERMISSION_MATRIX (docs/PERMISSIONS.md §2). */
    public const MATRICE = [
        'read' => 'viewer',
        'create' => 'editor',
        'update' => 'editor',
        'delete' => 'admin',
        'manageUsers' => 'owner',
        'manageSettings' => 'admin',
        'manageCriticalSettings' => 'owner',
        'resetData' => 'owner',
    ];

    /** Libellés pour les messages de refus. */
    private const LIBELLES = [
        'customer' => 'Client',
        'viewer' => 'Lecteur',
        'editor' => 'Éditeur',
        'admin' => 'Administrateur',
        'owner' => 'Propriétaire',
    ];

    private function __construct()
    {
    }

    // ------------------------------------------------------------------
    // Pose sur une route
    // ------------------------------------------------------------------

    /**
     * Enveloppe un gestionnaire de route derrière une exigence.
     *
     * @param string $exigence Clé de la matrice ou rôle plancher.
     * @param callable(Requete):Reponse $handler
     * @return callable(Requete):Reponse
     */
    public static function protege(string $exigence, callable $handler): callable
    {
        return static function (Requete $r) use ($exigence, $handler): Reponse {
            self::exiger($exigence);

            return $handler($r);
        };
    }

    /**
     * Enveloppe un gestionnaire qui demande seulement d'être connecté, quel que
     * soit le rôle — typiquement `/me/orders`, où un `customer` a sa place.
     *
     * @param callable(Requete):Reponse $handler
     * @return callable(Requete):Reponse
     */
    public static function protegeConnecte(callable $handler): callable
    {
        return static function (Requete $r) use ($handler): Reponse {
            self::exigerConnexion();

            return $handler($r);
        };
    }

    // ------------------------------------------------------------------
    // Vérifications
    // ------------------------------------------------------------------

    /**
     * Exige une session valide. Lève 401 sinon.
     *
     * @return array{id:string,email:string,name:string,phone:?string,role:string}
     */
    public static function exigerConnexion(): array
    {
        $u = Session::utilisateur();
        if ($u === null) {
            throw ApiException::nonAuthentifie(
                'Authentification requise : connectez-vous pour accéder à cette ressource.'
            );
        }

        return $u;
    }

    /**
     * Exige une session ET un rang suffisant.
     *
     * 401 si personne n'est connecté, 403 si le rôle est insuffisant. Le
     * message de refus nomme le rôle attendu : côté back-office, l'utilisateur
     * doit pouvoir demander la bonne chose à son administrateur.
     *
     * @param string $exigence Clé de la matrice ou rôle plancher.
     * @return array{id:string,email:string,name:string,phone:?string,role:string}
     */
    public static function exiger(string $exigence): array
    {
        $utilisateur = self::exigerConnexion();
        $minimum = self::roleMinimal($exigence);

        if (self::rang($utilisateur['role']) < self::rang($minimum)) {
            throw ApiException::interdit(sprintf(
                'Action réservée au rôle %s ou supérieur. Votre rôle : %s.',
                self::libelle($minimum),
                self::libelle($utilisateur['role']),
            ));
        }

        return $utilisateur;
    }

    /**
     * Exige que l'appelant soit le propriétaire de la ressource, OU qu'il
     * dispose du rang correspondant à l'exigence.
     *
     * Sert les routes « les miennes ou toutes » : un `customer` consulte sa
     * propre fiche, un `admin` consulte celle de n'importe qui.
     *
     * @return array{id:string,email:string,name:string,phone:?string,role:string}
     */
    public static function exigerSoiMemeOu(string $exigence, string $idProprietaire): array
    {
        $utilisateur = self::exigerConnexion();

        if ($utilisateur['id'] === $idProprietaire) {
            return $utilisateur;
        }

        return self::exiger($exigence);
    }

    /**
     * Variante d'`exigerSoiMemeOu()` pour les ressources dont l'appartenance ne
     * se lit PAS sur un simple `users.id`.
     *
     * Cas visé : une commande. `orders.customer_id` désigne une fiche
     * `customers`, pas un compte `users` — le rattachement passe par une règle
     * métier qui vit dans le contrôleur (`fichesClientDuCompte()`). La Garde n'a
     * pas à la connaître : elle reçoit un prédicat, l'interroge, et arbitre.
     *
     * Ordre des opérations, volontaire et non négociable :
     *   1. session obligatoire → 401 pour un anonyme ;
     *   2. prédicat d'appartenance → accès accordé s'il rend `true` ;
     *   3. sinon `exiger()` → 403 avec EXACTEMENT le message d'avant.
     *
     * Le point 3 est ce qui évite un oracle d'existence : un appelant ni
     * propriétaire ni gradé reçoit 403 sans qu'on lui ait dit si la ressource
     * existe. Le prédicat doit donc rendre `false` — jamais lever — pour une
     * ressource absente.
     *
     * Le prédicat ne reçoit que l'utilisateur de SESSION : aucune identité ne
     * peut entrer par un paramètre de requête.
     *
     * @param string $exigence Clé de la matrice ou rôle plancher (le repli back-office).
     * @param callable(array{id:string,email:string,name:string,phone:?string,role:string}):bool $appartient
     * @return array{id:string,email:string,name:string,phone:?string,role:string}
     */
    public static function exigerAppartenanceOu(string $exigence, callable $appartient): array
    {
        $utilisateur = self::exigerConnexion();

        if ($appartient($utilisateur) === true) {
            return $utilisateur;
        }

        return self::exiger($exigence);
    }

    // ------------------------------------------------------------------
    // Interrogation sans levée d'exception
    // ------------------------------------------------------------------

    /**
     * Utilisateur courant, ou `null`. Ne lève jamais.
     *
     * @return array{id:string,email:string,name:string,phone:?string,role:string}|null
     */
    public static function utilisateur(): ?array
    {
        return Session::utilisateur();
    }

    /** Équivalent serveur de `can()` : vrai si l'exigence est satisfaite. */
    public static function peut(string $exigence): bool
    {
        $u = Session::utilisateur();
        if ($u === null) {
            return false;
        }

        return self::rang($u['role']) >= self::rang(self::roleMinimal($exigence));
    }

    /** Vrai si l'utilisateur courant atteint au moins ce rôle. */
    public static function estAuMoins(string $role): bool
    {
        $u = Session::utilisateur();

        return $u !== null && self::rang($u['role']) >= self::rang($role);
    }

    // ------------------------------------------------------------------
    // Résolution
    // ------------------------------------------------------------------

    /**
     * Traduit une exigence en rôle plancher.
     *
     * Une exigence inconnue est une FAUTE DE PROGRAMMATION, pas une entrée
     * utilisateur : elle ne doit jamais se résoudre en « tout le monde passe ».
     * On lève une 500 explicite — la route est cassée, elle doit le dire.
     */
    public static function roleMinimal(string $exigence): string
    {
        if (isset(self::MATRICE[$exigence])) {
            return self::MATRICE[$exigence];
        }

        if (isset(self::RANGS[$exigence])) {
            return $exigence;
        }

        throw new ApiException(
            500,
            'INTERNAL_ERROR',
            "Exigence d'autorisation inconnue : « {$exigence} ». "
            . 'Valeurs acceptées : ' . implode(', ', array_keys(self::MATRICE))
            . ' (clés de la matrice) ou ' . implode(', ', array_keys(self::RANGS)) . ' (rôles).'
        );
    }

    /**
     * Rang numérique d'un rôle.
     *
     * Un rôle inconnu en base (colonne corrompue, valeur écrite à la main)
     * retombe sur le rang le plus bas : moindre privilège, comme le repli
     * `viewer` du client. Jamais l'inverse.
     */
    public static function rang(string $role): int
    {
        return self::RANGS[$role] ?? -1;
    }

    public static function libelle(string $role): string
    {
        return self::LIBELLES[$role] ?? $role;
    }
}
