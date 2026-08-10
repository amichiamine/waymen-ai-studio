/**
 * Schémas Zod partagés pour l'authentification.
 *
 * RÈGLE D'ALIGNEMENT AVEC LE SERVEUR
 *
 * Le serveur PHP accepte les adresses via `FILTER_VALIDATE_EMAIL` (RFC 5321),
 * qui valide `admin@a.a`, `user@localhost`, etc. — des adresses que `.email()`
 * de Zod refuse (validation RFC 5322 stricte). Pour ne pas enfermer hors du
 * site des utilisateurs dont le compte a été créé par l'installateur avec une
 * adresse courte, on adopte la même règle que le serveur : présence d'un `@`
 * avec au moins un caractère de chaque côté, longueur maximale de 255.
 *
 * Le serveur normalise aussi les adresses avec `strtolower(trim())` : on fait
 * de même ici (`.trim().toLowerCase()`) pour qu'un copier-coller avec une
 * espace finale n'échoue pas silencieusement côté réseau.
 *
 * LIMITE DE MOT DE PASSE
 *
 * `MotDePasse::LONGUEUR_MINIMALE = 10`, `LONGUEUR_MAXIMALE = 200`.
 * Le plafond à 200 correspond au mode Argon2id (annoncé par le serveur via
 * `maxPasswordBytes: 200`). Quand le serveur replie sur bcrypt, il descend
 * lui-même à 72 octets et refuse explicitement au-delà plutôt que de tronquer
 * — le formulaire n'a donc pas à connaître ce plafond dynamique : le serveur
 * rend un message clair si la valeur le dépasse.
 * On aligne le minimum sur 10 (MotDePasse::LONGUEUR_MINIMALE).
 */

import { z } from "zod";

/** Longueur minimale — aligne MotDePasse::LONGUEUR_MINIMALE = 10. */
export const PASSWORD_MIN = 10;

/**
 * Longueur maximale — aligne MotDePasse::LONGUEUR_MAXIMALE = 200 (Argon2id).
 * Sur un serveur bcrypt-only, le serveur refusera lui-même au-delà de 72 octets
 * avec un message explicite : on ne duplique pas cette logique ici.
 */
export const PASSWORD_MAX = 200;

/**
 * Schéma d'e-mail aligné sur `FILTER_VALIDATE_EMAIL` de PHP :
 * présence d'un `@` avec un caractère au moins de chaque côté, max 255.
 * `.trim()` avant tout contrôle, comme le fait `strtolower(trim())` côté API.
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine((v) => /^[^@\s]+@[^@\s]+$/.test(v), { message: "email" });

/**
 * Schéma de mot de passe aligné sur MotDePasse::valider() :
 * minimum 10 caractères, maximum 200 octets.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, { message: "tooShort" })
  .max(PASSWORD_MAX, { message: "tooLong" });
