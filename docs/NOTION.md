# NOTION.md — le miroir des commandes, et son contrat

> **Statut** : vague 4.7, livrable pilote (skills S1, S3, S13). Ce document est
> le **contrat** que les vagues suivantes appliquent : routes `/notion/*`,
> écran d'administration, réception du webhook. Ce qui est écrit ici a été
> éprouvé contre la doublure locale ; ce qui ne l'a pas été est signalé comme
> tel, nommément au §9.
>
> Contrats de référence, non renégociables : `docs/API-CONTRACT.md`,
> `docs/BACKEND.md`, `PLAN.md`.

---

## 1. La règle qui gouverne tout le reste

**Notion est un miroir, jamais la source de vérité.**

SQLite / MySQL / PostgreSQL restent maîtres du **stock**, des **prix** et des
**paiements**. Notion ne pilote que le **suivi** : statut, transporteur, numéro
de colis, note.

Conséquences pratiques, à opposer à toute demande future :

| Question                                                       | Réponse                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Notion est éteint, peut-on encore vendre ?                     | **Oui.** La commande est committée avant tout appel réseau.         |
| Le commerçant change un prix dans Notion, que se passe-t-il ?  | **Rien.** La valeur est écrasée à la synchronisation suivante.      |
| Le commerçant passe une commande en « Expédiée » dans Notion ? | **C'est pris en compte** : le webhook l'écrit dans `orders.status`. |
| Notion peut-il créer une commande ?                            | **Non.** Aucun sens entrant ne crée quoi que ce soit.               |
| Notion n'est pas configuré, que coûte ce module ?              | **Rien** : aucun appel, aucune erreur, aucune trace.                |

---

## 2. Faits d'API tenus pour acquis (relevés en août 2026)

Ils sont recopiés ici pour qu'aucun agent n'ait à les redécouvrir — ni à les
supposer.

- En-tête **obligatoire** sur chaque appel : `Notion-Version: 2026-03-11`.
- Depuis la version **2025-09-03**, une base est un **conteneur** qui abrite une
  ou plusieurs **data sources** :

  | Intention          | Appel                                                                                   |
  | ------------------ | --------------------------------------------------------------------------------------- |
  | Créer la base      | `POST /v1/databases` — parent `page_id`, colonnes dans `initial_data_source.properties` |
  | Créer une ligne    | `POST /v1/pages` — `parent: { type: "data_source_id", data_source_id: … }`              |
  | Modifier une ligne | `PATCH /v1/pages/{page_id}`                                                             |
  | Lire une ligne     | `GET /v1/pages/{page_id}`                                                               |
  | Interroger         | `POST /v1/data_sources/{id}/query`                                                      |

  `POST /v1/databases/{id}/query` est **dépréciée** : elle n'est appelée nulle
  part, et la doublure locale répond 400 si on l'appelle.

- **Débit** : 3 requêtes/seconde en moyenne par connexion, plus une limite par
  espace de travail. Dépassement → **429**, en-tête **`Retry-After`** en
  secondes, `additional_data.rate_limit_reason`. **529** = Notion saturé, à
  traiter exactement comme un 429.
- **Tailles** : 500 Ko par requête, 1000 éléments de bloc, 2000 caractères par
  bloc de texte riche, 100 options par liste de choix.
- **Aucune transaction, aucune écriture groupée.** Une ligne = un appel. C'est
  la raison d'être du miroir : on ne peut pas garantir l'atomicité côté Notion,
  donc on ne lui confie rien de critique.
- Propriétés **non inscriptibles** : `formula`, `rollup`, `unique_id`,
  `created_time`, `last_edited_time`, `created_by`, `last_edited_by`. Aucune
  n'est déclarée dans notre schéma.
- Jeton d'une **connexion interne** : préfixe `ntn_`, **sans expiration**. Il
  reste valable jusqu'à révocation manuelle — d'où le §5.

---

## 3. Ce qui est livré, et où

| Fichier                              | Rôle                                                                  |
| ------------------------------------ | --------------------------------------------------------------------- |
| `api/src/Notion/ClientNotion.php`    | Client HTTP : version d'API, débit 3 req/s, `Retry-After`, erreurs.   |
| `api/src/Notion/ErreurNotion.php`    | Les 8 erreurs normalisées et leurs messages en clair.                 |
| `api/src/Notion/Coffre.php`          | Chiffrement AES-256-GCM du jeton au repos (S13).                      |
| `api/src/Notion/Configuration.php`   | Lecture/écriture de `settings` (scope `notion`).                      |
| `api/src/Notion/SchemaCommandes.php` | Le contrat commande ↔ page : colonnes, types, conversions, empreinte. |
| `api/src/Notion/Liens.php`           | Accès à la table `notion_links`.                                      |
| `api/src/Notion/MiroirCommandes.php` | Le consommateur d'outbox et le sens entrant.                          |
| `api/src/Notion/Webhook.php`         | Vérification HMAC-SHA256 et lecture du corps du webhook.              |
| `api/tools/faux-notion.php`          | La doublure locale (§8).                                              |
| `api/schema/schema.*.sql` §24        | La table `notion_links`, sur les trois pilotes.                       |

Un seul fichier existant a été modifié : `ControleurCommandes.php`, au **point
d'enregistrement de l'émetteur d'outbox** — et nulle part ailleurs.

### 3.1 Mettre à jour une installation déjà en service

`api/install.php` refuse de se rejouer (témoin `api/installed.lock`) : une
boutique installée avant la vague 4.7 n'a donc pas la table `notion_links`.
Deux gestes possibles, tous deux sans risque puisque le schéma n'emploie que
`CREATE TABLE IF NOT EXISTS` :

1. effacer `api/installed.lock` et réouvrir `api/install.php` — les 23 tables
   existantes sont laissées intactes, seule la 24ᵉ est créée ; **ou**
2. exécuter à la main le bloc §24 du fichier `api/schema/schema.<pilote>.sql`
   correspondant à `DB_DRIVER`.

Tant que la table est absente, le miroir n'est pas branché : la boutique
fonctionne, l'écran Notion doit le dire plutôt que planter.

---

## 4. La table Notion : colonnes, types, et pourquoi

Titre de la base : **« Commandes — KA Tech Hub »** (`SchemaCommandes::TITRE_BASE`).

| Colonne Notion    | Type Notion    | Source                              | Qui décide   |
| ----------------- | -------------- | ----------------------------------- | ------------ |
| `Commande`        | `title`        | `orders.id`                         | la base      |
| `Statut`          | **`select`**   | `orders.status`                     | **les deux** |
| `Client`          | `rich_text`    | `orders.customer_name`              | la base      |
| `Téléphone`       | `phone_number` | `orders.phone`                      | la base      |
| `Courriel`        | `email`        | `orders.customer_email`             | la base      |
| `Wilaya`          | `rich_text`    | `orders.wilaya`                     | la base      |
| `Livraison`       | `select`       | `orders.delivery_kind`              | la base      |
| `Adresse`         | `rich_text`    | `orders.address`                    | la base      |
| `Total (DA)`      | `number`       | `orders.total` (entier, DZD)        | la base      |
| `Paiement`        | `rich_text`    | `payment_label` ou `payment_method` | la base      |
| `Articles`        | `rich_text`    | `order_items` résumés               | la base      |
| `Transporteur`    | `rich_text`    | `notion_links.carrier`              | **Notion**   |
| `Numéro de colis` | `rich_text`    | `notion_links.tracking_number`      | **Notion**   |
| `Note de suivi`   | `rich_text`    | `orders.note`                       | **Notion**   |
| `Passée le`       | `date`         | `orders.created_at`                 | la base      |

### 4.1 Le statut : `select`, et pas le type `status`

Notion propose un type `status` avec ses groupes « À faire / En cours /
Terminé ». Il est **écarté**, pour une raison technique dirimante : **l'API ne
sait ni créer ni modifier une propriété de type `status`** — ses options et ses
groupes ne se définissent qu'à la main dans l'interface Notion.

Le retenir signifierait demander au commerçant de fabriquer lui-même la
colonne, d'y saisir exactement nos cinq libellés sans faute de frappe, avant
que le miroir puisse fonctionner. C'est exactement le genre d'étape manuelle
qui casse chez tout le monde, et dont l'échec est incompréhensible.

`select` est créable par l'API avec ses options, modifiable par l'API,
modifiable à la souris par le commerçant, et lisible dans le webhook. Il perd
le regroupement visuel ; le prix est faible et il est assumé. La limite de 100
options est hors de portée : nous en déclarons cinq.

| Statut interne | Libellé Notion | Couleur |
| -------------- | -------------- | ------- |
| `pending`      | En attente     | yellow  |
| `processing`   | En préparation | blue    |
| `shipped`      | Expédiée       | purple  |
| `delivered`    | Livrée         | green   |
| `cancelled`    | Annulée        | red     |

Un libellé inventé à la main dans Notion **n'est pas reporté en base** : le
contrat d'API n'accepte que ces cinq valeurs. Le cas est journalisé, pas
silencieux.

### 4.2 Trois détails qui coûtent cher si on les oublie

1. **`email` et `phone_number` refusent la chaîne vide.** Notion répond
   `validation_error`. Il faut envoyer `null`. Sans ça, toute commande sans
   courriel fait échouer la synchronisation.
2. **Les articles tiennent dans UNE cellule.** Une base « Articles » liée
   coûterait un appel par ligne de commande, sans écriture groupée, à 3 req/s.
   Une commande de six articles coûterait sept appels au lieu d'un.
3. **`Passée le` est une vraie colonne `date` que nous alimentons**, pas un
   `created_time`. Ce dernier daterait la création de la _page_, pas celle de
   la _commande_ — deux dates différentes dès qu'un rattrapage a lieu.

---

## 5. Le secret (S13)

### 5.1 Le problème

Le jeton est saisi par le commerçant : il vit donc côté serveur, dans
`settings`. Or **`GET /maintenance/backup` produit une archive de toute la
base, téléchargeable depuis l'administration**. Un jeton en clair s'y
retrouverait — dans un fichier qui circule par courriel et finit sur une clé
USB. Et un jeton d'intégration interne Notion **n'expire pas** : la fuite
serait permanente.

### 5.2 La parade

- `settings.notion.token` contient une valeur **chiffrée en AES-256-GCM**,
  préfixée `ntnc1:`.
- La clé (`NOTION_CRYPTO_KEY`, 32 octets en base64) vit dans **`api/.env`** :
  un fichier que la sauvegarde ne contient pas et que `api/.htaccess` interdit
  de télécharger.
- Elle est **créée automatiquement** à la première mise en service. Si
  `api/.env` est absent ou non inscriptible, l'enregistrement est **refusé**
  avec un message qui dit quoi faire — on ne stocke jamais en clair « en
  attendant ».
- GCM plutôt que CBC parce qu'il **authentifie** : un octet modifié en base
  fait échouer le déchiffrement au lieu de rendre une valeur fausse.

### 5.3 Les règles que les agents suivants ne doivent pas relâcher

- Le jeton **n'est jamais renvoyé au navigateur**, pas même tronqué.
  `Configuration::etat()` ne contient aucun champ qui en dérive.
- Le jeton **n'apparaît jamais dans un journal** : `ClientNotion::expurger()`
  remplace toute séquence `ntn_…` avant écriture.
- Le jeton **n'apparaît jamais dans un message d'erreur**.
- `POST /notion/token` **teste avant d'enregistrer** (`GET /v1/users/me`).

### 5.4 Ce que ça ne protège pas, et il faut le dire

Un attaquant qui obtient un accès au **système de fichiers** lit `api/.env` et
la base : il a tout. Le coffre protège contre la fuite d'une **sauvegarde** et
contre la fuite de la **seule base** (dump SQL, phpMyAdmin, fichier SQLite mal
placé) — c'est-à-dire contre les fuites réellement observées en mutualisé.

### 5.5 Preuve exigée à chaque modification de ce module

```bash
php api/tools/sauvegarder.php --destination=/tmp/backups --sans-compression
grep -ao 'ntn_[A-Za-z0-9]*' /tmp/backups/katech-*.sqlite | wc -l   # doit valoir 0
grep -ao 'ntnc1:'           /tmp/backups/katech-*.sqlite | wc -l   # doit valoir 1
```

---

## 6. La table de liaison `notion_links`, et le piège de l'écho

```
order_id (PK) · page_id (UNIQUE) · data_source_id
pushed_hash · pushed_at        ← ce qu'on a ÉCRIT dans Notion
pulled_hash · pulled_at        ← ce qu'on a REÇU de Notion
carrier · tracking_number      ← suivi piloté par Notion
last_error · created_at · updated_at
```

**Pourquoi une table et pas une colonne dans `orders`** : loger l'identifiant
de page dans `orders` mêlerait un détail d'intégration au cœur transactionnel.
Ici, supprimer l'intégration = vider une table, rien d'autre. `carrier` et
`tracking_number` y vivent pour la même raison : `orders` ne doit pas changer
de forme quand Notion n'est pas configuré.

**Le piège de l'écho.** Sans précaution, la boucle est infinie :

```
commerçant change le statut dans Notion
   → webhook → écriture en base
   → l'écriture déclenche une poussée vers Notion
   → Notion émet un webhook
   → … et le quota de 3 req/s part en fumée sur une boucle stérile.
```

**La coupure** : avant toute écriture sortante, on calcule l'empreinte SHA-256
des propriétés qu'on s'apprête à envoyer. Si elle est égale à `pushed_hash`
(rien n'a bougé depuis la dernière poussée) **ou** à `pulled_hash` (c'est
exactement le changement que Notion vient de nous annoncer), **aucun appel
n'est émis**. Vérifié : une resynchronisation immédiate après un webhook
produit zéro connexion réseau.

---

## 7. Le contrat d'API — à implémenter par un AUTRE agent

**Aucune de ces routes n'est livrée par la vague 4.7.** Elles sont spécifiées
ici, et `ClientNotion` / `Configuration` / `MiroirCommandes` exposent déjà tout
ce dont elles ont besoin.

Toutes sont réservées au rang **`owner`**, **sauf le webhook**.

| Route                      | Corps                            | Rend                                                                                                                                 | Brique à appeler                                                                                                                                            |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /notion/status`       | —                                | `{ configure, relie, actif, espace, baseTitre, baseUrl, databaseId, dataSourceId, derniereVerification, derniereErreur, enAttente }` | `Configuration::etat($miroir->nombreEnAttente())`                                                                                                           |
| `POST /notion/token`       | `{ token }`                      | l'état ci-dessus. **JAMAIS le jeton.**                                                                                               | `ClientNotion::verifierToken()` **puis** `Configuration::enregistrerToken()`                                                                                |
| `GET /notion/pages`        | —                                | `[{ id, titre, url }]`                                                                                                               | `ClientNotion::listerPages()`                                                                                                                               |
| `POST /notion/base`        | `{ pageId }` ou `{ databaseId }` | l'état                                                                                                                               | `ClientNotion::creerBase(pageId, SchemaCommandes::TITRE_BASE, SchemaCommandes::proprietes())` ou `rattacherBase()`, puis `Configuration::enregistrerBase()` |
| `PATCH /notion/parametres` | `{ actif }`                      | l'état                                                                                                                               | `Configuration::definirActif()`                                                                                                                             |
| `POST /notion/renvoyer`    | —                                | `{ traitees, echecs, reste, messages }`                                                                                              | `MiroirCommandes::renvoyer()`                                                                                                                               |
| `POST /notion/webhook`     | corps Notion                     | 200 systématiquement (voir ci-dessous)                                                                                               | `Webhook::*` puis `MiroirCommandes::appliquerPageEntrante()`                                                                                                |

### 7.1 Le webhook : route **publique, non authentifiée**

Notion appelle depuis ses propres serveurs : il n'a ni session ni cookie.
Exiger `owner` rendrait le webhook inutilisable. Ce qui remplace
l'authentification, c'est la **signature HMAC-SHA256** dans l'en-tête
`X-Notion-Signature`.

Trois pièges, tous classiques :

1. **Signer le corps BRUT.** Le HMAC porte sur les octets reçus. Décoder puis
   ré-encoder le JSON change l'ordre des clés : la signature ne correspondra
   plus jamais. Lire `file_get_contents('php://input')` et passer cette chaîne
   telle quelle à `Webhook::signatureValide()`.
2. **Comparer en temps constant.** `hash_equals()`, jamais `===`. C'est fait
   dans `Webhook`, il suffit de ne pas le contourner.
3. **Répondre 200 même quand on ignore l'événement.** Une page hors périmètre,
   un statut inconnu, une commande supprimée : tous rendent 200. Un 4xx ferait
   rejouer l'événement par Notion indéfiniment.

**Poignée de main initiale** : à la création de l'abonnement, Notion envoie une
fois `{"verification_token": "…"}`, sans signature. La route doit
l'enregistrer (`Configuration::enregistrerSecretWebhook()`), répondre 200, et
l'afficher au commerçant pour qu'il le recopie dans Notion. Sans cette étape,
aucune signature ne sera jamais valide.
`Webhook::jetonDeVerification()` détecte ce corps.

### 7.2 Erreurs normalisées

Toutes les briques lèvent `ErreurNotion`, dont `getMessage()` est **déjà
rédigé pour un commerçant non technique** : les routes le renvoient tel quel,
sans le reformuler et sans y ajouter de code HTTP.

| `codeNotion`               | Cause                                   | Temporaire ? |
| -------------------------- | --------------------------------------- | ------------ |
| `NOTION_NON_CONFIGURE`     | Aucun jeton enregistré                  | non          |
| `NOTION_TOKEN_INVALIDE`    | 401 — jeton refusé ou révoqué           | non          |
| `NOTION_NON_PARTAGE`       | 403 — connexion non invitée sur la page | non          |
| `NOTION_INTROUVABLE`       | 404 — supprimé **ou** non partagé       | non          |
| `NOTION_DEBIT_DEPASSE`     | 429 / 529                               | **oui**      |
| `NOTION_INJOIGNABLE`       | réseau, délai, 5xx                      | **oui**      |
| `NOTION_REFUSE`            | 400/409/422 — colonne renommée…         | non          |
| `NOTION_REPONSE_ILLISIBLE` | réponse non JSON (proxy, portail)       | non          |

`ErreurNotion::estTemporaire()` distingue « réessayer va marcher » de
« quelqu'un doit agir ». Un message qui ment coûte plus cher que pas de
message (AGENTS.md §7) : c'est pourquoi le 404 nomme **les deux** causes
possibles — Notion répond `object_not_found` aussi bien pour une page
supprimée que pour une page non partagée, et rien ne permet de les distinguer.

---

## 8. Le faux Notion — `api/tools/faux-notion.php`

### 8.1 Ce que c'est, et ce que ce n'est pas

**C'est une doublure.** Elle rejoue les endpoints du §2 avec les codes
d'erreur et les en-têtes documentés. Elle **ne prouve pas** que la vraie API
Notion répondra pareil : elle ne connaît ni les subtilités de validation de
Notion, ni son quota par espace de travail, ni ses évolutions futures.

Elle prouve une chose, et c'est déjà beaucoup : que **notre code** se comporte
correctement face aux réponses que Notion dit produire, y compris face à un 429
et à une panne. **La preuve finale appartient à l'utilisateur**, avec son vrai
jeton, dans l'écran Notion que construira un autre agent.

### 8.2 Emploi

```bash
# 1. la doublure
php -S 127.0.0.1:8261 api/tools/faux-notion.php &

# 2. l'API, pointée dessus
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/f1.sqlite APP_ENV=production \
  API_BASE_PATH=/ UPLOAD_DIR=/tmp/up-n1 SMTP_SIMULATE=1 \
  NOTION_API_BASE=http://127.0.0.1:8261 \
  php -S 127.0.0.1:8260 -t api api/index.php &
```

N'importe quel jeton de la forme `ntn_…` est accepté. La doublure sème une
page racine « Boutique KA Tech » : c'est sur elle que `POST /notion/base` crée
le tableau, comme sur une vraie page partagée.

### 8.3 Modes de panne

| Variable                       | Effet                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `FAUX_NOTION_MODE=429`         | 429 + `Retry-After`, puis normal après `FAUX_NOTION_429_FOIS` refus (défaut 1) |
| `FAUX_NOTION_MODE=529`         | idem avec 529 (Notion saturé)                                                  |
| `FAUX_NOTION_MODE=injoignable` | 502 avec une page HTML, comme une passerelle d'hébergeur en vrac               |
| `FAUX_NOTION_RETRY_AFTER=3`    | valeur de `Retry-After`, en secondes (défaut 2)                                |
| `FAUX_NOTION_ETAT=/tmp/x.json` | fichier d'état (défaut `/tmp/faux-notion.json`)                                |

Pour une **vraie** injoignabilité (connexion TCP refusée, le cas d'un Notion
éteint), arrêter le processus : c'est plus fidèle que toute simulation.

### 8.4 Ce qu'elle refuse, exprès

`Notion-Version` absente → 400 · `Authorization` mal formée → 401 · corps

> 500 Ko → 400 · texte riche > 2000 caractères → 400 · propriété non
> inscriptible → 400 · `POST /v1/pages` sans parent `data_source_id` → 400 ·
> `POST /v1/databases/{id}/query` (déprécié) → 400 · colonne inconnue → 400.

---

## 9. Ce que la vague 4.7 n'a PAS fait

À l'attention des vagues suivantes, pour éviter de le redécouvrir.

- **Les routes `/notion/*` n'existent pas.** `api/routes.php` n'a pas été
  touché — c'était hors périmètre. Le §7 en est le cahier des charges.
- **Aucun écran d'administration.**
- **Un changement de statut fait dans le back-office n'est pas poussé
  automatiquement**, parce qu'aucun contrôleur n'émet d'événement d'outbox à
  cette occasion (le seul sujet existant est `order.created`). Deux voies pour
  la vague suivante, au choix :
  1. déposer un `order.updated` dans la transaction de mise à jour du statut,
     et l'ajouter à `MiroirCommandes::TOPIC_COMMANDE` ; **ou**
  2. laisser `POST /notion/renvoyer` faire le rattrapage — il compare les
     empreintes et ne pousse que ce qui a réellement changé.
- **`api/tools/vider-outbox.php` ne connaît pas le miroir.** Ce filet de
  secours manuel possède son propre dispatch, dupliqué de
  `ControleurCommandes`. Le miroir n'y a pas été ajouté pour ne pas aggraver
  cette duplication depuis un fichier hors périmètre. Conséquence concrète :
  un événement Notion en échec est rejoué par la commande suivante ou par
  `POST /notion/renvoyer`, pas par cet outil.
- **Le limiteur de débit est par processus.** PHP n'a pas de mémoire partagée
  en mutualisé : deux requêtes HTTP simultanées peuvent émettre à 3 req/s
  chacune. Trois garde-fous rendent le dépassement improbable et inoffensif :
  le miroir n'émet que par lots bornés (5 événements), un dépassement réel
  produit un 429 qui est honoré, et l'outbox reprend l'événement plus tard. Un
  verrou par fichier a été écarté : en mutualisé, le dossier temporaire est
  parfois partagé entre comptes.
- **Aucune purge de `notion_links`.** Supprimer une commande laisse un lien
  orphelin. Sans conséquence fonctionnelle ; à traiter le jour où une route de
  suppression de commande existera.
- **Le webhook n'a été éprouvé que contre la doublure**, en appelant
  `MiroirCommandes::appliquerPageEntrante()` directement. La vérification de
  signature n'a pas été confrontée à une vraie signature Notion.

---

## 10. Preuves exécutées sur ce livrable

| #   | Preuve                                                | Résultat                                                                                                                                               |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a   | `notion_links` créée, parité des 3 schémas            | `PARITÉ OK — 24 tables, 196 colonnes, 27 index` ; installée en sqlite, mysql, pgsql                                                                    |
| b   | Commande passée par l'API → ligne dans le faux Notion | `KA655043` → page `954160e7-…`, 15 colonnes remplies                                                                                                   |
| c   | Faux Notion éteint → vente possible quand même        | `POST /orders` → **201**, événement `pending`, `outboxPending = 1` sur `GET /maintenance/status` ; après rallumage, `renvoyer()` → 5 traitées, 0 échec |
| d   | 429 avec `Retry-After: 3`                             | 2 connexions espacées de **exactement 3 s**, appel abouti, 1 seul refus                                                                                |
| e   | Notion non configuré                                  | **201**, 0 appel réseau, 0 ligne de journal, 0 lien, outbox vidée                                                                                      |
| f   | Sauvegarde téléchargée depuis l'administration        | 0 occurrence de `ntn_`, 1 occurrence de `ntnc1:` (le jeton chiffré)                                                                                    |
| g   | `preuve-concurrence.php`                              | voir §11                                                                                                                                               |

---

## 11. Vérifications à passer avant tout commit sur ce module

```bash
php -l api/src/Notion/*.php
php -l api/tools/faux-notion.php
php api/tools/verifier-parite-schema.php        # doit rester VERT
php api/tools/preuve-concurrence.php            # la transaction ne doit pas s'allonger
```

Le miroir n'ajoute **aucun appel réseau à l'intérieur d'une transaction** :
le consommateur ne tourne qu'après le `commit()`, dans la fonction de fin de
script de l'outbox, et le sens entrant lit Notion **avant** d'ouvrir sa
transaction. Toute modification qui déplacerait un appel réseau dans un
`Db::transaction()` est un défaut, pas une optimisation.
