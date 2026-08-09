# Manuel d'utilisation de KA Tech

> Ce manuel s'adresse aux personnes qui **font tourner la boutique** : le
> propriétaire, son équipe, et toute personne qui doit comprendre ce que vit un
> client sur le site. Il ne demande aucune connaissance technique.
>
> Chaque écran, chaque libellé et chaque enchaînement décrits ici ont été
> vérifiés dans l'application. Ce qui n'a pas pu être vérifié n'est pas écrit.
> Ce qui ne fonctionne pas est signalé au chapitre 11.

**Ce manuel ne traite pas** de la mise en ligne du site, du choix de la base de
données ni de l'exploitation technique du serveur. Trois autres documents s'en
chargent :

| Question                                                     | Document              |
| ------------------------------------------------------------ | --------------------- |
| Comment mettre le site en ligne chez un hébergeur ?          | `docs/DEPLOIEMENT.md` |
| Comment fonctionne le serveur, comment le dépanner ?         | `docs/BACKEND.md`     |
| Comment déménager les données vers une autre base ?          | `docs/MIGRATION.md`   |
| Quel rôle a le droit de faire quoi, et pourquoi ce découpage | `docs/PERMISSIONS.md` |

---

## Sommaire

1. [Avant de commencer](#1-avant-de-commencer)
2. [Ce que vit le client](#2-ce-que-vit-le-client)
3. [Traiter une commande](#3-traiter-une-commande)
4. [Tenir le stock](#4-tenir-le-stock)
5. [Tenir le catalogue](#5-tenir-le-catalogue)
6. [Animer la boutique](#6-animer-la-boutique)
7. [Piloter : chiffres et exports](#7-piloter--chiffres-et-exports)
8. [L'équipe et les droits](#8-léquipe-et-les-droits)
9. [Les gestes réservés au propriétaire](#9-les-gestes-réservés-au-propriétaire)
10. [Ce qui se fait tout seul](#10-ce-qui-se-fait-tout-seul)
11. [Anomalies connues et solutions de contournement](#11-anomalies-connues-et-solutions-de-contournement)
12. [Vocabulaire](#12-vocabulaire)

---

## 1. Avant de commencer

### 1.1 Les deux faces du site

KA Tech se compose de deux parties.

- **La boutique**, visible par tout le monde à l'adresse du site. Catalogue,
  fiches produits, configurateur, panier, blog, contact.
- **L'administration**, accessible à l'adresse du site suivie de `/admin`.
  Elle regroupe 34 écrans et n'est ouverte qu'aux membres de l'équipe.

L'administration parle **trois langues** : français, anglais, arabe. La langue
active est celle que vous avez choisie sur la boutique. En arabe, la mise en
page de l'administration se retourne elle aussi et se lit de droite à gauche.

Pour changer de langue : cliquer sur l'icône drapeau dans l'en-tête de la
boutique et choisir **Français**, **English** ou **العربية**. Le changement est
immédiat, dans la boutique comme dans l'administration. Le choix est mémorisé
dans le navigateur : la prochaine session s'ouvre dans la même langue.

### 1.2 Se connecter

1. Ouvrir l'adresse du site suivie de `/auth`.
2. Saisir l'adresse électronique et le mot de passe du compte.
3. Valider avec **Se connecter**.

Après la connexion, l'écran **Mon compte** s'affiche. Un membre de l'équipe
rejoint ensuite l'administration en ouvrant l'adresse du site suivie de
`/admin`.

Si les identifiants sont refusés, un message d'erreur s'affiche et la page de
connexion reste affichée. C'est le comportement normal : aucune redirection
n'a lieu tant que la connexion n'a pas réussi.

### 1.3 Les cinq rôles, en une page

Le site connaît cinq rôles. Ils sont hiérarchiques : chaque rôle possède tous
les droits du rôle précédent, plus les siens.

| Rôle               | À qui il est destiné                         | Ce qu'il ajoute par rapport au précédent                                         |
| ------------------ | -------------------------------------------- | -------------------------------------------------------------------------------- |
| **Client**         | L'acheteur                                   | Achète, suit ses commandes. N'entre jamais dans l'administration.                |
| **Lecteur**        | Un observateur, un comptable, un stagiaire   | Consulte les listes et les fiches. Ne modifie rien.                              |
| **Éditeur**        | Le travail quotidien du catalogue et du blog | Crée et modifie : produits, catégories, marques, stock, avis, coupons, articles. |
| **Administrateur** | Le responsable de la boutique                | **Supprime**, et règle la livraison, les paiements et les paramètres courants.   |
| **Propriétaire**   | Le commerçant                                | Gère l'équipe et les rôles, la sauvegarde, la migration, la réinitialisation.    |

Deux points à retenir dès maintenant.

- **Supprimer n'est pas modifier.** La suppression est réservée à
  l'administrateur, parce qu'il n'existe aucune corbeille : ce qui est supprimé
  est perdu.
- **Le refus vient du serveur, pas de l'écran.** Quand une action est
  interdite, le bouton correspondant est désactivé — mais même en contournant
  l'écran, le serveur refuse. Le message est explicite, par exemple :
  « Action réservée au rôle Administrateur ou supérieur. Votre rôle : Éditeur. »
  Un membre de l'équipe qui voit ce message sait exactement quoi demander.

Le détail complet, avec la justification de chaque seuil, est au
chapitre 8 et dans `docs/PERMISSIONS.md`.

### 1.4 Se repérer dans l'administration

Le menu de l'administration est découpé en six sections. Ce découpage est le
même pour tout le monde, mais **les entrées interdites au rôle en cours ne
s'affichent pas**. Un lecteur voit un menu plus court qu'un propriétaire ; ce
n'est pas une panne.

| Section         | Entrées du menu                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Vue d'ensemble  | Tableau de bord · Analytique · Rapports                                                           |
| Catalogue       | Produits · Catégories · Marques · Stock · Médias                                                  |
| Ventes          | Commandes · Clients · Coupons · Livraison · Paiements                                             |
| Relation client | Messages de contact · Newsletter                                                                  |
| Contenu         | Contenu du site · Blog · Avis                                                                     |
| Système         | Utilisateurs & rôles · Notifications · Journal d'audit · Paramètres · Réinitialiser · Développeur |

Un **fil d'Ariane** en haut de chaque écran rappelle le chemin parcouru et
permet de revenir en arrière.

### 1.5 Le sélecteur « Simuler un rôle »

Sur certaines installations, un sélecteur **Simuler un rôle** apparaît en haut
de l'administration. C'est un **outil de mise au point**, pas une fonction de
gestion :

- il ne permet que de **descendre** — un propriétaire peut regarder l'écran
  d'un lecteur, jamais l'inverse ;
- il n'affecte que l'affichage de son propre navigateur ;
- le serveur, lui, continue d'appliquer le rôle réel ;
- **il n'existe pas sur le site mis en ligne.** Si vous ne le voyez pas, tout
  va bien.

---

## 2. Ce que vit le client

Ce chapitre est court, mais il est le plus utile au téléphone : pour aider un
client, il faut voir son écran.

### 2.1 Trois langues, un seul catalogue

Un sélecteur de langue est présent dans l'en-tête du site : **français**,
**anglais**, **arabe**. Le choix est mémorisé dans le navigateur du client. En
arabe, toute la mise en page se retourne et se lit de droite à gauche.

À la première visite, la langue est déduite de celle du navigateur du client.
Un client dont le navigateur est en anglais verra donc le site en anglais, même
en Algérie. Il lui suffit de changer de langue dans l'en-tête.

Les textes de l'interface sont traduits dans les trois langues. Les **noms de
catégories et de marques** ne le sont pas : ils s'affichent tels qu'ils ont été
saisis dans l'administration, dans toutes les langues (voir chapitre 11).

### 2.2 Trouver un produit

Le client dispose de quatre chemins :

1. **La recherche**, dans l'en-tête.
2. **Le menu Catégories** : Ordinateurs portables, Ordinateurs de bureau,
   Configurations PC, Smartphones.
3. **La page d'accueil** : offres de la semaine, meilleures ventes, sélection
   par usage (Gaming, Travail, Études, Montage, Maison).
4. **Le blog**, qui renvoie vers les fiches produits.

Dans une catégorie, le client filtre par **prix maximum**, par **marque** et
par **usage**, puis trie par Populaire, Nouveau, Prix croissant ou Prix
décroissant. Le nombre de résultats est affiché.

### 2.3 La fiche produit

La fiche affiche la marque, le nom, la ligne de caractéristiques résumée, le
prix — barré et remplacé si une promotion est active — et l'état du stock :

| Ce que voit le client            | Ce que cela veut dire          |
| -------------------------------- | ------------------------------ |
| **En stock**                     | Disponible                     |
| **Dernières pièces disponibles** | Stock faible                   |
| **Rupture**                      | Indisponible, achat impossible |

Quatre onglets détaillent le produit : **Caractéristiques**, **Description**,
**Avis**, **Livraison & garantie**. Deux boutons : **Ajouter au panier** et
**Ajouter aux favoris**.

Un client ne peut déposer un avis que s'il est connecté, et cet avis
n'apparaît pas immédiatement : il attend votre modération (chapitre 6).

### 2.4 Le configurateur

Le bouton **Configurez votre PC** de l'en-tête ouvre un assistant en huit
étapes : Boîtier, Carte mère, Processeur, Mémoire RAM, SSD, Carte graphique,
Alimentation, Refroidissement. Le client choisit un composant par étape ; un
récapitulatif affiche l'avancement, la liste des choix et le **Total** qui se
met à jour à chaque clic. Tant que les huit étapes ne sont pas remplies, le
message **Complétez votre sélection** liste ce qui manque.

**Le configurateur fonctionne comme un panier ordinaire.** Un client connecté
qui a rempli les huit étapes clique sur **Ajouter au panier** : sa configuration
est enregistrée, puis elle suit exactement le même chemin qu'un produit du
catalogue — panier, commande, confirmation, paiement. Le bouton est désactivé
pour un visiteur non connecté.

**Le prix est calculé par le serveur, pas par le navigateur.** Le client voit
un total indicatif à l'écran, mais c'est le serveur qui calcule la somme à
partir de ses propres fiches de composants, au moment de l'ajout au panier.
Personne ne peut modifier le prix depuis son navigateur.

**Ce que vous verrez dans les commandes.** Une configuration commandée
apparaît dans **Commandes** comme n'importe quelle commande : un numéro
`KA…`, un client, un total, un statut. Dans la liste des articles, la ligne
porte le nom de la configuration (par exemple « Configuration Gaming
Mid-Range ») et son prix serveur. Les configurations **ne figurent pas dans
le catalogue public** : elles n'apparaissent pas dans la liste Produits ni
sur la boutique, mais elles s'affichent normalement dans les commandes.

La liste des composants proposés se modifie dans
Paramètres › **Étapes du configurateur PC**.

### 2.5 Le panier et la commande

**Un compte est obligatoire.** Le panier, les favoris et la commande sont
réservés aux clients connectés : un visiteur qui clique sur le panier arrive
sur l'écran de connexion, avec le message « Pour accéder au panier, aux
favoris et finaliser votre achat. » C'est une information importante pour le
support : un client qui « n'arrive pas à commander » n'a souvent pas encore
créé son compte. La création de compte demande trois informations : nom
complet, adresse électronique, mot de passe (six caractères au minimum).

Dans **Mon panier**, le client ajuste les quantités, saisit un **Code promo**
et le valide avec **Appliquer**. Le récapitulatif affiche le **Sous-total**, la
**Livraison** (mention « Calculée à l'étape suivante ») et le **Total**. Le
bouton **Passer commande** conduit à l'écran suivant.

L'écran **Finaliser ma commande** comporte cinq blocs :

1. **Coordonnées** — Nom complet, Téléphone, **Wilaya** (les 58 wilayas, du
   « 01 — Adrar » au « 58 — El Meniaa »), Adresse. Si le client a déjà
   enregistré des adresses, il peut en choisir une au lieu de tout ressaisir.
2. **Livraison** — **Livraison à domicile** ou **Retrait au bureau Yalidine**.
   Le prix de chaque option s'affiche dès que la wilaya est choisie. Tant
   qu'aucune wilaya n'est choisie, la mention « Choisir wilaya » remplace le
   prix.
3. **Paiement** — les modes que vous avez activés. Par défaut : **Paiement à la
   livraison**, **Virement bancaire**, **CIB / Edahabia**.
4. **Notes (optionnel)** — instructions pour le livreur.
5. **Récapitulatif** — lignes, sous-total, livraison, total.

Si le montant dépasse le seuil de franco de port que vous avez réglé, la
mention **🎁 Livraison offerte appliquée** apparaît et la livraison passe à
**Offerte**.

Le bouton **Confirmer la commande** enregistre la commande. Le client arrive
sur une page de remerciement : « Merci pour votre commande ! Votre demande a
bien été enregistrée. Notre équipe vous contactera très prochainement. » Deux
boutons lui sont proposés : **Mes commandes** et **Retour à l'accueil**.

> À la date de ce manuel, le numéro de commande ne s'affiche pas sur cette page
> de remerciement. Le client le retrouve dans **Mon compte › Commandes**. Voir
> le chapitre 11.

### 2.6 Le compte client

**Mon compte** comporte trois onglets.

- **Profil** — nom complet, téléphone, bouton **Enregistrer**, bouton
  **Se déconnecter**.
- **Adresses** — bouton **Nouvelle adresse**, avec libellé (« Domicile »,
  « Bureau »…), nom, téléphone, wilaya, adresse, et la possibilité de définir
  une adresse par défaut. Ces adresses accélèrent les commandes suivantes.
- **Commandes** — la liste des commandes du client, avec le numéro, la date, le
  nombre d'articles, le montant et le **statut** : En attente, En traitement,
  Expédiée, Livrée, Annulée. C'est ici que le client suit sa commande, et c'est
  la même information que celle que vous voyez dans l'administration.

---

## 3. Traiter une commande

C'est le geste le plus fréquent de la journée. Il se fait entièrement depuis
**Commandes**.

### 3.1 Voir ce qui est arrivé

L'écran **Commandes** liste toutes les commandes, la plus récente en premier,
avec des onglets qui servent de file de travail :

**Toutes** · **En attente** · **En traitement** · **Expédiées** · **Livrées** ·
**Annulées** — chaque onglet affiche son nombre entre parenthèses.

Le tableau donne, pour chaque commande : **N°**, **Client**, **Wilaya**,
**Date**, **Total**, **Statut**.

Le numéro de commande commence toujours par `KA`, par exemple `KA657497`. C'est
ce numéro que le client cite au téléphone.

Le **Tableau de bord** affiche également l'indicateur **Commandes en attente**
et la liste des dernières commandes reçues : c'est le meilleur point de départ
en début de journée.

### 3.2 Ouvrir une commande

Un clic sur la ligne ouvre le détail. L'écran **Commande KA…** rassemble :

- **Articles** — chaque ligne avec sa quantité et son prix unitaire, puis
  **Sous-total**, **Livraison**, **Total** ;
- **Suivi du statut** — l'historique horodaté, du plus ancien au plus récent,
  et le sélecteur **Changer le statut** ;
- **Client** — nom, adresse électronique, et un lien **Voir le client** vers sa
  fiche ;
- **Livraison & paiement** — Adresse, Wilaya, Type (Domicile ou Bureau),
  Téléphone, mode de paiement choisi.

### 3.3 Faire avancer la commande

Le sélecteur **Changer le statut** propose cinq valeurs :

| Statut            | Ce qu'il signifie dans la boutique                                |
| ----------------- | ----------------------------------------------------------------- |
| **En attente**    | Reçue, pas encore prise en charge. C'est l'état initial.          |
| **En traitement** | Prise en charge : article réservé, client rappelé, colis préparé. |
| **Expédiée**      | Remise au transporteur.                                           |
| **Livrée**        | Reçue et réglée par le client.                                    |
| **Annulée**       | Abandonnée.                                                       |

Le changement est immédiat. Un message **Statut mis à jour** le confirme, et
une nouvelle ligne horodatée s'ajoute au **Suivi du statut**. Le client voit ce
même statut dans son compte.

L'historique n'est **jamais réécrit** : il ne fait que s'allonger. Revenir en
arrière est possible, mais la trace des deux passages reste visible. C'est
voulu — l'historique doit dire ce qui s'est réellement passé.

Modifier un statut demande le rôle **Éditeur** au minimum.

### 3.4 Ce que le changement de statut ne fait pas

Trois points qui évitent des erreurs coûteuses.

1. **Passer une commande à « Annulée » ne remet pas les articles en stock.**
   Le stock a été décompté au moment de la commande ; il faut le recréditer à
   la main dans **Stock** (chapitre 4), avec une raison écrite. Cette exigence
   est délibérée : une remise en stock invisible fausserait l'inventaire sans
   que personne ne puisse dire d'où vient l'écart.
2. **Supprimer une commande ne remet pas non plus les articles en stock**, et
   la commande disparaît des chiffres d'affaires. La suppression est réservée
   à l'administrateur.
3. **Aucun message n'est envoyé au client lors d'un changement de statut.**
   Seule la confirmation de commande part automatiquement (chapitre 10).
   Prévenir un client d'une expédition se fait par téléphone, par message ou
   par courriel, à votre initiative.

> **Irréversible.** La suppression d'une commande est définitive : ni corbeille,
> ni annulation. Avant de supprimer, demandez-vous si le statut **Annulée** ne
> suffirait pas — il conserve la trace, ce que la suppression détruit.

### 3.5 La fiche client

**Clients** liste les personnes qui ont commandé, avec : Nom, Email, Téléphone,
Wilaya, **Commandes**, **Dépensé (LTV)** et **Dernière commande**. Ces chiffres
sont calculés à partir des commandes ; ils ne se saisissent pas. Le bouton
**Détails** ouvre la fiche complète. Un bouton **Nouveau client** permet de
créer une fiche à la main, par exemple pour une vente prise au téléphone.

---

## 4. Tenir le stock

### 4.1 « Il me reste combien de ThinkPad ? »

Ouvrir **Stock**. L'onglet **Produits** affiche un tableau : **Produit**,
**Marque**, **Catégorie**, **Qté**, **Statut**, **Action**. La colonne **Qté**
est le nombre d'unités réellement disponibles.

Quatre compteurs figurent en haut de l'écran : **Total produits**, **En
stock**, **Stock faible**, **Rupture**. Ils donnent l'état général en un coup
d'œil.

Les seuils qui décident du statut sont réglables dans **Paramètres** :
**Seuil « stock faible » (≤)** et **Seuil « rupture » (≤)**. Par défaut, un
produit passe en « Stock faible » à 5 unités ou moins.

### 4.2 Corriger une quantité

1. Ouvrir **Stock**, onglet **Produits**.
2. Sur la ligne du produit, choisir **Ajuster**.
3. La fenêtre **Ajuster le stock — _nom du produit_** s'ouvre.
4. Renseigner **Mouvement (delta)** : un nombre **positif** pour une entrée
   (réapprovisionnement), un nombre **négatif** pour une sortie (vente hors
   site, casse, perte).
5. Renseigner la **Raison** — par exemple « Réapprovisionnement fournisseur »,
   « Inventaire du 30 juin », « Casse ». Ce texte est conservé pour toujours.
6. **Enregistrer**.

Le message **Stock mis à jour — _nom du produit_** confirme l'opération.

On saisit donc **la variation, jamais la nouvelle quantité**. Pour passer de 2
à 10 unités, on saisit `+8`. C'est ce qui permet à deux personnes de travailler
en même temps sans s'écraser l'une l'autre.

Le serveur refuse tout mouvement qui rendrait le stock négatif : le message
indique alors que l'opération est annulée, et rien n'est écrit.

> **À savoir.** Après un ajustement, la colonne **Qté** de la page peut encore
> afficher l'ancienne valeur. Rechargez la page pour voir la valeur réelle. Ne
> refaites pas l'ajustement : il serait compté deux fois. Voir le chapitre 11.

### 4.3 Savoir ce qui s'est passé

L'onglet **Mouvements** liste tous les mouvements, du plus récent au plus
ancien : **Date**, **Produit**, **Delta**, **Raison**. Les ventes y figurent
automatiquement, avec pour raison le numéro de la commande — par exemple
« Commande KA657497 ». Une différence d'inventaire se retrouve donc toujours,
ligne par ligne.

Cette liste ne se modifie pas et ne s'efface pas. Une erreur se corrige par un
**mouvement inverse** portant une raison explicite (« Correction du mouvement
du 6 août »), jamais par une réécriture.

### 4.4 Les alertes

Le **Tableau de bord** affiche les indicateurs **Stock faible** et **En
stock**. Le tableau de **Stock** affiche le statut sur chaque ligne. Prenez
l'habitude de vérifier l'onglet **Produits** filtré sur les statuts « Stock
faible » avant de lancer une campagne ou une promotion.

---

## 5. Tenir le catalogue

### 5.1 Ajouter un produit

1. Ouvrir **Produits**, puis **Nouveau produit**.
2. Bloc **Informations** :
   - **ID (slug unique)** — l'identifiant qui apparaîtra dans l'adresse de la
     fiche. En minuscules, sans accent ni espace, par exemple
     `lenovo-thinkpad-x1`. **Choisissez-le bien : le changer plus tard casse
     les liens déjà partagés.**
   - **Marque** et **Catégorie** — à choisir parmi celles qui existent déjà. Si
     la bonne n'y est pas, créez-la d'abord (sections 5.3 et 5.4).
   - **Nom** et **Ligne de specs (résumé)** — avec trois onglets **FR**,
     **EN**, **AR**. Renseignez au moins le français ; les langues laissées
     vides retombent sur le français.
   - **CPU**, **RAM**, **Stockage**, **GPU**, **Écran**, **OS** — les
     caractéristiques affichées dans l'onglet « Caractéristiques » de la fiche.
3. Bloc **Prix & stock** :
   - **Prix (DA)** — le prix de vente.
   - **Ancien prix (optionnel)** — s'il est renseigné et supérieur au prix, la
     boutique affiche le prix barré et le pourcentage de remise.
   - **Quantité (unités)** — le stock de départ.
   - **État du stock (surcharge)** — En stock, Stock faible ou Rupture. À
     n'utiliser que pour forcer un affichage particulier.
   - **Best-seller** et **En promotion** — deux cases qui décident de la
     présence du produit dans les blocs correspondants de la page d'accueil.
4. Bloc **Image** : choisir **Depuis la médiathèque**, ou saisir une **URL ou
   chemin**.
5. **Créer**.

### 5.2 Corriger un prix

1. Ouvrir **Produits**.
2. Ouvrir la fiche à modifier (écran **Modifier le produit**).
3. Dans **Prix & stock**, corriger **Prix (DA)**.
4. **Enregistrer**.

Le message **Produit mis à jour** confirme l'opération et la liste réapparaît.
**Le nouveau prix est visible immédiatement sur la boutique** : il n'y a ni
délai, ni publication à déclencher. Vérifiez donc le montant avant
d'enregistrer.

Pour lancer une promotion, on ne baisse pas le prix : on **recopie l'ancien
prix dans « Ancien prix (optionnel) »** et on met le prix promotionnel dans
« Prix (DA) ». La boutique affiche alors le prix barré et la remise.

### 5.3 Ajouter une catégorie

**Catégories** › **Nouvelle catégorie**. Quatre champs :

- **Slug (URL)** — l'identifiant dans l'adresse, par exemple `tablettes`.
- **Nom affiché** — le nom vu par les clients.
- **Description** — 300 caractères au maximum.
- **Image de couverture (URL, optionnel)**.

La liste des catégories indique pour chacune le nombre de produits rattachés.
Le bouton **Détails** ouvre la fiche.

> Le nom et la description d'une catégorie ne se saisissent que dans **une
> seule langue** : ils s'afficheront tels quels sur les versions anglaise et
> arabe du site. Voir le chapitre 11.

### 5.4 Ajouter une marque

**Marques** › **Nouvelle marque** : **Slug**, **Nom**, **Pays d'origine**,
**Description**. La liste affiche pour chaque marque le nombre de produits et
le prix moyen — un repère utile pour situer une marque dans la gamme.

### 5.5 Les images

**Médias** est la bibliothèque d'images. L'écran indique combien d'images ont
été téléversées, combien proviennent du catalogue, l'espace occupé et l'espace
disponible. Le bouton **Téléverser** ajoute une image ; la limite pratique est
de **5 Mo par fichier**.

Les images ajoutées ici sont ensuite proposées dans le champ **Depuis la
médiathèque** des fiches produits.

> **Irréversible.** Supprimer une image de la médiathèque ne prévient pas les
> fiches qui l'utilisent : elles perdront leur illustration. Vérifiez avant de
> supprimer.

---

## 6. Animer la boutique

### 6.1 Créer un code promotionnel

1. **Coupons** › **Nouveau coupon**.
2. Renseigner :
   - **Code** — ce que le client saisira dans le panier. Court et lisible.
   - **Type** — Pourcentage ou montant fixe.
   - **Valeur** — le pourcentage ou le montant.
   - **Achat min. (DA)** — en dessous de ce montant, le code est refusé.
   - **Limite d'usage** — nombre total d'utilisations autorisées.
   - **Date d'expiration**.
   - **Actif** — un coupon inactif est refusé sans être supprimé.
3. **Créer**.

La liste affiche **Code**, **Remise**, **Achat min.**, **Usage** (par exemple
`0/100`), **Expire** et **Statut**. Suivre la colonne **Usage** permet de
mesurer l'effet d'une campagne.

Pour arrêter une opération, **désactivez** le coupon plutôt que de le
supprimer : la trace des remises déjà accordées reste ainsi lisible.

### 6.2 Régler les frais de livraison par wilaya

**Livraison** rassemble trois réglages.

- **Franco de port** — le champ **Livraison offerte à partir de (DA)**. Au delà
  de ce montant, la livraison est offerte et le client voit la mention
  « 🎁 Livraison offerte appliquée ». **Mettre 0 pour désactiver la livraison
  offerte.**
- Deux interrupteurs : **Livraison à domicile** et **Retrait bureau**. Ils
  décident des options proposées au client au moment de commander.
- **Le tableau des tarifs** — une ligne par wilaya, avec **Code**, **Wilaya**,
  **Domicile**, **Bureau**.

La première ligne du tableau, **défaut — Par défaut (toutes)**, s'applique à
toute wilaya qui n'a pas de ligne propre. C'est le filet de sécurité : même une
wilaya oubliée a un tarif.

Pour modifier un tarif, ouvrir la ligne de la wilaya concernée et corriger les
deux montants. Le bouton **Ajouter un tarif** crée une ligne pour une wilaya
qui n'en a pas encore.

Ces réglages demandent le rôle **Administrateur**.

### 6.3 Les modes de paiement

**Paiements** liste les modes proposés au client, chacun avec son identifiant
technique et son texte d'explication : **Paiement à la livraison** (`cod`),
**Virement bancaire** (`bank`), **CIB / Edahabia** (`card`), **Paiement en
boutique** (`store`). Chaque mode s'active ou se désactive. Le bouton
**Nouveau moyen** en ajoute un.

Le texte saisi ici est **lu par le client** au moment de payer : c'est là qu'on
explique, par exemple, qu'un RIB sera envoyé après validation. Écrivez-le comme
vous le diriez au téléphone.

Ces réglages demandent le rôle **Administrateur**.

### 6.4 Modérer un avis

**Avis** comporte deux onglets.

- **Avis produits** — les avis déposés par les clients. Quatre filtres :
  **Tous**, **En attente**, **Approuvés**, **Rejetés**. Un avis en attente
  n'est **pas** visible sur la boutique. Chaque avis affiche son auteur, le
  produit concerné, la date et le texte, avec les actions **Approuver**,
  **Rejeter** et **Supprimer** selon son état.
- **Avis d'accueil** — les témoignages affichés sur la page d'accueil. Ceux-ci
  sont rédigés par vous, pas par les clients.

Rejeter conserve l'avis sans le publier ; supprimer l'efface définitivement.
Préférez **Rejeter** : vous gardez la trace si le client vous rappelle.

La modération demande le rôle **Éditeur** ; la suppression, le rôle
**Administrateur**.

### 6.5 Publier un article

1. **Blog** › **Nouvel article**.
2. Bloc **Contenu** — **Titre**, **Extrait** et **Corps (Markdown)**, chacun
   avec les onglets **FR**, **EN**, **AR**.
3. Bloc **Publication** — **Slug** (l'adresse de l'article), **Auteur**,
   **Étiquettes (séparées par des virgules)**, et l'**Image de couverture**.
   Une mention rappelle le **Statut actuel** de l'article.
4. Deux boutons : **Enregistrer en brouillon** ou **Publier**.

Un brouillon n'est pas visible sur le site. La liste des articles affiche pour
chacun son statut, son adresse, son auteur et sa date de dernière
modification, avec les actions **Voir**, **Éditer** et **Supprimer**.

Le corps de l'article s'écrit en **Markdown** : `## Titre` pour un
sous-titre, `**mot**` pour du gras, `- ` en début de ligne pour une puce.

### 6.6 Répondre à un message

**Messages de contact** liste les messages envoyés depuis le formulaire de
contact du site : **Statut**, **Expéditeur**, **Sujet**, **Reçu le**,
**Actions**. Le nombre de messages non lus est rappelé en tête d'écran, et les
messages non lus portent la mention **Nouveau**.

Un clic ouvre le message complet : nom, adresse électronique, téléphone s'il a
été laissé, date et texte. Trois actions :

- **Répondre par e-mail** — ouvre **votre** logiciel de messagerie avec
  l'adresse et l'objet déjà remplis. **La réponse part de votre boîte, pas du
  site : elle n'est pas conservée dans l'administration.** Pour garder une
  trace, conservez le message envoyé dans votre messagerie.
- **WhatsApp** — ouvre une conversation, si un numéro WhatsApp est renseigné
  dans Paramètres et si le client a laissé son téléphone.
- **Supprimer** — définitif, réservé à l'administrateur.

L'action **Marquer lu** vide le compteur de messages non lus.

### 6.7 La newsletter

**Newsletter** liste les adresses collectées par le site : **Email**,
**Source** (par exemple `footer`), **Inscrit le**. Le bouton **Exporter en
CSV** produit un fichier utilisable dans un outil d'envoi.

Le site **n'envoie pas** de lettre d'information : il collecte les adresses.
L'envoi se fait avec l'outil de votre choix, à partir de cet export.

### 6.8 Les textes du site

**Contenu du site** permet de modifier chaque bloc de la page d'accueil et des
pages fixes, section par section : En-tête, Pied de page, Hero, Ventes flash,
Catégories, Par usage, Meilleures ventes, Sélection à onglets, Marques,
Pourquoi nous, Builder teaser, Avis (titres), Contact CTA, WhatsApp flottant,
Barre mobile.

Chaque texte visible se saisit dans les trois langues (**FR**, **EN**, **AR**).
Chaque section possède ses boutons **Enregistrer** et **Réinitialiser**.

---

## 7. Piloter : chiffres et exports

### 7.1 Le tableau de bord — l'état du jour

**Tableau de bord** répond à la question « où en est-on aujourd'hui ? » :
Produits, Catégories, Marques, **Valeur catalogue**, **Chiffre d'affaires**,
**Commandes en attente**, Clients, **Avis à modérer**, **Coupons actifs**,
**Stock faible**, En stock, Best-sellers. S'y ajoutent une courbe du chiffre
d'affaires sur 30 jours, la répartition des produits par catégorie, et les
dernières commandes reçues.

Trois de ces chiffres sont des **listes de tâches** : Commandes en attente,
Avis à modérer, Stock faible. S'ils ne redescendent pas, du travail attend.

### 7.2 Analytique — les tendances

**Analytique** répond à la question « comment ça évolue ? » :

- **Chiffre d'affaires**, **Commandes**, **Panier moyen**, **Taux de
  livraison**, **Clients** ;
- le chiffre d'affaires par jour et le nombre de commandes par jour sur
  **30 derniers jours** ;
- la **Répartition du chiffre d'affaires par catégorie** — quelle famille de
  produits fait vivre la boutique ;
- **Traitement des commandes** — combien de commandes reçues, en préparation,
  expédiées, livrées, en nombre et en pourcentage ;
- **Top 8 des produits vendus**.

Deux indicateurs à lire avec attention.

- Le **panier moyen** dit combien rapporte une commande. Il monte quand on
  vend des accessoires avec la machine ; il baisse quand on ne vend que des
  promotions.
- Le **taux de livraison** est la part des commandes réellement arrivées à
  « Livrée ». C'est la mesure la plus honnête de la santé de la boutique en
  paiement à la livraison : un taux qui baisse signale des refus à la
  réception, donc de l'argent immobilisé en transport.

L'écran précise lui-même une limite : **les étapes en amont — visiteurs,
paniers abandonnés — ne sont pas affichées, parce qu'aucune mesure d'audience
n'est en place sur le site.** L'entonnoir commence donc à la commande reçue,
pas à la visite. Pour connaître le nombre de visiteurs, il faudrait ajouter un
outil de mesure d'audience ; c'est une décision à prendre, pas un réglage.

### 7.3 Rapports — sortir les données

**Rapports** propose six exports au format CSV, chacun avec son bouton
**Exporter CSV** :

| Export                  | Ce qu'il contient                          |
| ----------------------- | ------------------------------------------ |
| **Ventes**              | Les commandes et leur montant              |
| **Clients**             | La base clients                            |
| **Stock**               | Les produits du catalogue et leur quantité |
| **Mouvements de stock** | Toutes les entrées et sorties journalisées |
| **Coupons**             | Les codes promotionnels et leur usage      |
| **Avis**                | Les avis clients                           |

Les fichiers s'ouvrent directement dans Excel, LibreOffice ou Google Sheets ;
l'encodage retenu préserve les accents. Ce sont ces fichiers qu'on transmet au
comptable, et l'export **Mouvements de stock** est la pièce justificative d'un
inventaire.

L'accès à **Rapports** demande le rôle **Éditeur**.

### 7.4 Notifications

**Notifications** rassemble les messages internes de l'administration, avec des
filtres **Toutes**, **Non lues**, **Info**, **Succès**, **Alertes**,
**Erreurs**, et les actions **Tout marquer lu**, **Marquer lu**, **Supprimer**.
Une cloche dans l'en-tête indique le nombre de notifications non lues.

### 7.5 Journal d'audit

**Journal d'audit** est l'historique de toutes les actions importantes
effectuées sur le site. Il répond à la question : _qui a fait quoi, et quand ?_

C'est lui qu'on consulte le jour où un prix a changé sans qu'on sache pourquoi,
où un produit a disparu, ou quand on veut vérifier qu'aucune action suspecte
n'a eu lieu sur un compte.

L'écran **Journal d'audit** (menu Système) affiche un tableau avec cinq
colonnes : **Date**, **Acteur** (l'adresse e-mail de la personne ou la mention
« invité »), **Action** (ce qui a été fait), **Entité** (sur quel type
d'objet), **Détail** (les identifiants ou valeurs concernés). Un champ
**Rechercher** filtre par action, entité ou acteur. Des boutons de filtre
permettent de restreindre l'affichage à une catégorie (commandes, stock,
produits, etc.).

Le journal consigne aujourd'hui les actions suivantes : création de commande,
création et modération d'avis, ajustement de stock, création de client, création
de coupon, téléversement de média, réception de message de contact, changement
de mot de passe, modification de réglages, mise à jour du contenu, création de
notification, inscription à la newsletter, changement de statut de commande,
création d'utilisateur, et les événements liés à la synchronisation Notion.

Le bouton **CSV** exporte la liste filtrée dans un fichier. Le bouton **Vider**
efface le journal local (action réservée à l'administrateur) ; le journal se
remplit de nouveau au fil des actions suivantes.

**Comment savoir que l'écran fonctionne.** Le sous-titre de la page indique
le nombre d'événements enregistrés, par exemple « 42 événements journalisés
(500 max, roulement) ». Un journal actif grossit à chaque action de l'équipe.

---

## 8. L'équipe et les droits

### 8.1 Créer un compte pour un collaborateur

Cette opération est réservée au **propriétaire**.

1. **Utilisateurs & rôles** › **Inviter**.
2. La fenêtre **Inviter un membre** demande : **Nom**, **Email**, **Rôle**,
   l'interrupteur **Actif**, et un **Mot de passe** (six caractères au
   minimum).
3. **Enregistrer**.

Le compte apparaît dans la liste, avec **Nom**, **Email**, **Rôle**,
**Dernière connexion** et **Statut**.

> **Attention.** À la date de ce manuel, le mot de passe saisi dans cette
> fenêtre **n'est pas enregistré** : le compte est créé mais son titulaire ne
> peut pas se connecter. Voir le chapitre 11, qui indique le contournement.

Un compte **Inactif** conserve son historique mais ne peut plus se connecter.
C'est ce qu'il faut faire pour un départ : **désactiver**, pas supprimer — la
suppression fait perdre le lien entre les actions passées et leur auteur.

### 8.2 Choisir le bon rôle

Posez-vous une seule question : **quelle est la pire chose que cette personne
puisse faire par erreur ?**

| Situation                                                        | Rôle à donner      |
| ---------------------------------------------------------------- | ------------------ |
| Un comptable, un associé qui veut suivre les chiffres            | **Lecteur**        |
| Un vendeur qui saisit les produits, traite les commandes, publie | **Éditeur**        |
| Le responsable de la boutique, qui règle prix et livraison       | **Administrateur** |
| Le commerçant lui-même                                           | **Propriétaire**   |

Donnez toujours le rôle **le plus bas qui permet de travailler**. Il est facile
d'élever un rôle ; il est impossible de rattraper une suppression.

Deux règles complètent le tableau.

- **Un administrateur voit l'annuaire de l'équipe, mais ne peut ni créer un
  compte ni changer un rôle.** Sans cela, un administrateur se promouvrait
  propriétaire en deux clics et la hiérarchie ne voudrait plus rien dire.
- **Le compte propriétaire ne peut pas être supprimé.** L'administration
  refuse l'opération.

### 8.3 Ce que chaque rôle peut faire, action par action

| Action                                              | Lecteur | Éditeur | Administrateur | Propriétaire |
| --------------------------------------------------- | :-----: | :-----: | :------------: | :----------: |
| Consulter les listes, fiches, tableaux, historiques |   oui   |   oui   |      oui       |     oui      |
| Créer un produit, une catégorie, un article         |   non   |   oui   |      oui       |     oui      |
| Modifier un contenu, un prix, un stock, un statut   |   non   |   oui   |      oui       |     oui      |
| Supprimer quoi que ce soit                          |   non   |   non   |      oui       |     oui      |
| Régler la livraison, les paiements, les paramètres  |   non   |   non   |      oui       |     oui      |
| Créer un compte, changer un rôle                    |   non   |   non   |      non       |     oui      |
| Mode maintenance et réglages critiques              |   non   |   non   |      non       |     oui      |
| Sauvegarde, migration, réinitialisation             |   non   |   non   |      non       |     oui      |

Ces règles sont appliquées **par le serveur**. Le tableau ci-dessus a été
vérifié en tentant réellement chaque action avec un compte Éditeur : la
modification d'un prix est acceptée, la suppression d'un produit, la création
d'un compte, la modification d'un tarif de livraison et le téléchargement d'une
sauvegarde sont refusés, chacun avec un message nommant le rôle requis.

### 8.4 Comprendre un refus

Quand une action est interdite :

- le bouton correspondant est **désactivé**, et une infobulle explique
  pourquoi — par exemple « action réservée au rôle Administrateur ou
  supérieur. » ;
- certaines entrées du menu **n'apparaissent pas** ;
- si l'action est tout de même tentée, le serveur répond par un refus explicite
  qui nomme le rôle requis **et** le rôle en cours.

Ce n'est jamais une panne. La bonne réaction est de demander au propriétaire,
soit l'élévation du rôle, soit que l'action soit faite par la bonne personne.

---

## 9. Les gestes réservés au propriétaire

Ces écrans ne s'affichent que pour le compte propriétaire. Les actions qu'ils
contiennent touchent l'ensemble des données de la boutique. **Lisez le
chapitre entier avant d'utiliser le premier bouton.**

### 9.1 L'écran Développeur

Malgré son nom, cet écran s'adresse au propriétaire. Il porte le
sous-titre : « Diagnostic de base, sauvegarde et migration. Réservé au
Propriétaire. » Il comporte trois blocs.

#### État de la base — sans risque

Le bloc **État de la base** affiche le **Pilote** (le moteur de base de données
utilisé), le nom de la **Base**, sa **Taille**, le nombre d'**Événements en
attente**, la date de la **Dernière sauvegarde**, et un tableau **Table /
Lignes** qui donne le nombre d'enregistrements de chaque table. Le bouton
**Rafraîchir** recharge ces informations.

Ce bloc **ne modifie rien**. C'est la première chose à consulter quand quelque
chose semble anormal : le nombre de lignes de la table des commandes ou des
produits confirme immédiatement si les données sont là.

#### Sauvegarde — sans risque, et à faire régulièrement

Le bloc **Sauvegarde** explique : « Télécharge un dump de la base. Le fichier
est livré directement par le serveur et transite via votre session — aucun
tiers ne le reçoit. »

1. Choisir **Télécharger la sauvegarde**.
2. Une confirmation s'affiche : **Télécharger la sauvegarde ?** — « Le fichier
   sera téléchargé directement dans votre navigateur. »
3. Confirmer avec **Télécharger**.

Le fichier arrive dans le dossier de téléchargement du navigateur, sous un nom
horodaté. Il contient **toute la boutique** : produits, commandes, clients,
réglages.

Cette action est **sans danger** — elle ne fait que lire. Prenez l'habitude de
la lancer :

- avant toute modification importante du catalogue ou des réglages ;
- avant toute migration ;
- une fois par semaine, en régime normal.

**Conservez les fichiers ailleurs que sur l'ordinateur de travail.** Une
sauvegarde stockée sur la machine qui tombe en panne ne sert à rien.

> Le fichier téléchargé porte l'extension `.sql` alors que son contenu est une
> base au format SQLite. Ne le renommez pas et ne l'ouvrez pas dans un éditeur
> de texte : transmettez-le tel quel à la personne qui restaure. Voir le
> chapitre 11.

#### Migration — irréversible

Le bloc **Migration vers un autre moteur** sert à déménager les données vers
une autre base — MySQL ou PostgreSQL. Il s'utilise **une fois**, au moment d'un
changement d'hébergement.

L'écran impose une **Simulation obligatoire** : « Cliquez d'abord sur Simuler
pour vérifier la compatibilité sans toucher à vos données. Le bouton Exécuter
n'est disponible qu'après une simulation réussie. »

Les informations demandées sont : **Moteur cible**, **Utilisateur de la base
cible**, **DSN de connexion** et **Mot de passe**. Elles vous sont fournies par
l'hébergeur ; le mot de passe n'est jamais conservé sur votre poste.

1. Renseigner les quatre champs.
2. **Simuler**. Un **Rapport de simulation** s'affiche : lignes lues, lignes
   écrites, anomalies, et le détail table par table.
3. **Lire ce rapport avant d'aller plus loin.** Une simulation qui annonce
   « 0 ligne lue » ou « aucune table commune entre la source et la cible »
   signifie que la base d'arrivée n'est pas prête. **Exécuter dans cet état ne
   copierait rien** — n'allez pas plus loin, et reportez-vous à
   `docs/MIGRATION.md`.
4. Si et seulement si le rapport annonce des lignes lues et zéro anomalie,
   **Exécuter**. Une confirmation rappelle que l'opération transfère toutes les
   données et qu'elle est **irréversible**.

> **Irréversible.** La migration écrit dans la base d'arrivée. Faites une
> sauvegarde juste avant, et gardez-la jusqu'à ce que la nouvelle installation
> ait tourné plusieurs jours sans problème.

### 9.2 L'écran Réinitialiser

**Réinitialiser** porte le sous-titre « Restaurer, vider, exporter ou importer
les données locales de la boutique » et affiche un avertissement en tête
d'écran :

> **Attention** — Ces actions modifient uniquement les données locales
> (localStorage) de ce navigateur.

**Lisez cette phrase deux fois : elle décide de tout.** Sur un site relié à un
serveur, cet écran **n'efface pas la base de données** : il n'agit que sur la
copie de travail du navigateur utilisé. Le nombre d'enregistrements affiché en
regard de chaque type de données provient, lui, du serveur. Autrement dit :
appuyer sur **Vider** peut ne rien changer du tout à ce que voient vos clients.

Cet écran propose :

- **Exporter en JSON** et **Importer un JSON…** — sauvegarde et restauration de
  la copie locale ;
- **Réinitialiser toute la boutique** et **Tout vider** — actions globales ;
- pour chaque type de données (Produits, Catégories, Marques, Commandes,
  Clients, Coupons, Avis produits, Utilisateurs admin, Articles de blog…), les
  boutons **Réinitialiser** et **Vider**.

**Recommandation.** Pour effacer réellement des données de la boutique en
ligne, n'utilisez pas cet écran : supprimez les éléments un par un depuis leur
propre écran, ou faites appel à la personne qui administre le serveur. Et
n'utilisez jamais cet écran sans avoir téléchargé une sauvegarde depuis
**Développeur** au préalable.

> **Irréversible.** **Réinitialiser toute la boutique** et **Tout vider**
> n'ont pas d'annulation. Une confirmation est demandée : lisez-la.

### 9.3 La synchronisation Notion (facultatif)

**Notion** permet de suivre les commandes de la boutique dans un tableau
collaboratif, de renseigner le transporteur et le numéro de colis directement
depuis Notion, et de piloter les statuts depuis n'importe quel appareil ou
n'importe quel membre de l'équipe.

**C'est entièrement facultatif.** La boutique continue de vendre normalement
si Notion est en panne ou non configuré. Aucune commande n'est perdue : les
commandes passées pendant une interruption de Notion sont synchronisées dès que
la connexion est rétablie.

La marche à suivre pour connecter Notion et l'explication complète du
fonctionnement sont dans `docs/NOTION.md`. L'écran de configuration est
accessible depuis **Système › Notion** dans l'administration.

### 9.4 Les réglages critiques

Dans **Paramètres**, deux réglages dépassent le cadre de l'administration et
sont réservés au propriétaire.

- **Mode maintenance** — « Bloque l'accès public au site. L'admin et /auth
  restent accessibles. » Un **Message affiché** accompagne la coupure. À
  utiliser pour une intervention, jamais par confort : le site est invisible
  pour tous les clients pendant ce temps. **Pensez à le désactiver.**
- Les **données de démonstration**, quand elles sont présentes.

Les autres réglages de cet écran — Boutique (nom, adresse électronique de
contact, téléphone, WhatsApp, adresse, horaires), Options (notifications,
sélecteur de langue, seuils de stock), Bandeau promotionnel, Devise & format
des prix, Bandeau défilant, Marques défilantes, Valeurs de la page À propos,
Étapes du configurateur — sont accessibles à l'**administrateur**.

Le bloc **Devise & format des prix** mérite une attention particulière : il
change l'affichage de **tous** les prix du site. Un aperçu est proposé sous les
champs — vérifiez-le avant d'enregistrer.

---

## 10. Ce qui se fait tout seul

Ce chapitre évite les appels inutiles au support. Voici ce que le site fait
sans qu'on le lui demande — et ce qu'il ne fait pas.

### 10.1 Ce qui est automatique

| Événement                                                       | Ce qui se produit, sans aucune intervention                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Un client confirme sa commande — y compris une configuration PC | La commande est enregistrée avec le statut **En attente** et reçoit son numéro `KA…`.                |
| Un client confirme sa commande                                  | **Le courriel de confirmation part immédiatement**, à la fin de la commande.                         |
| Un client confirme sa commande                                  | Le **stock est décompté** et un mouvement est écrit, avec pour raison le numéro de la commande.      |
| Un client confirme sa commande                                  | Une **facture** est enregistrée en même temps que la commande, dans la base.                         |
| Un client confirme sa commande                                  | La fiche client est créée ou mise à jour (nombre de commandes, total dépensé).                       |
| Une quantité franchit un seuil                                  | Le statut **Stock faible** ou **Rupture** est recalculé et les compteurs du tableau de bord suivent. |
| Un prix est modifié                                             | Le nouveau prix est visible sur la boutique **immédiatement**.                                       |

**Le point le plus important de ce manuel** : le courriel de confirmation de
commande **part à la fin de la commande, tout seul**. Il n'y a **aucune tâche
planifiée à créer**, aucun bouton « envoyer les courriels », aucune file à
vider à la main. Une personne qui ignore cela cherchera un réglage qui n'existe
pas, puis conclura que le système est en panne. Il ne l'est pas.

Le bloc **État de la base** de l'écran Développeur affiche un compteur
**Événements en attente** : en fonctionnement normal, il indique « Aucun ».
S'il reste durablement à un nombre supérieur à zéro, c'est le signe que les
courriels ne partent pas — c'est alors un sujet pour `docs/BACKEND.md`.

### 10.2 Ce qui n'est pas automatique

| Ce qu'on croit automatique                            | La réalité                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Prévenir le client d'une expédition                   | Non. Le statut change, mais aucun message ne part. Téléphonez ou écrivez.       |
| Remettre le stock après une annulation                | Non. À faire à la main dans **Stock**, avec une raison écrite.                  |
| Remettre le stock après la suppression d'une commande | Non, même raison.                                                               |
| Répondre à un message de contact                      | Non. Le bouton ouvre **votre** messagerie ; la réponse n'est pas conservée ici. |
| Envoyer la lettre d'information                       | Non. Le site collecte les adresses ; l'envoi se fait avec un outil extérieur.   |
| Traduire les noms de catégories et de marques         | Non. Ils s'affichent dans la langue de saisie, sur les trois versions du site.  |
| Publier un avis client                                | Non. Un avis attend votre modération.                                           |
| Sauvegarder la base                                   | Non. La sauvegarde se déclenche à la main depuis **Développeur**.               |

---

## 11. Anomalies connues et solutions de contournement

Ces observations ont été faites dans l'application à la date de rédaction de ce
manuel. Elles sont listées ici pour que personne ne perde de temps à chercher
une manipulation qui n'existe pas. Chacune a été signalée à l'équipe technique.

| Ce que vous constatez                                                                                                   | Ce qu'il faut faire                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Le numéro de commande n'apparaît pas** sur la page de remerciement du client.                                         | Le client le retrouve dans **Mon compte › Commandes**. Vous, dans **Commandes**. La commande est bien enregistrée.                                 |
| **« Mot de passe oublié ? »** affiche un message rassurant, mais **aucun courriel n'est envoyé**.                       | Ne dites pas au client d'attendre un courriel. Réinitialisez son mot de passe autrement, ou faites-lui créer un nouveau compte.                    |
| **Un membre invité ne peut pas se connecter** : le mot de passe saisi dans « Inviter un membre » n'est pas enregistré.  | Le compte existe bien. Demandez à la personne qui administre le serveur de poser le mot de passe. C'est aujourd'hui le seul chemin qui fonctionne. |
| Après un ajustement de stock, **la colonne Qté affiche encore l'ancienne valeur**.                                      | Rechargez la page. **Ne refaites pas l'ajustement** : il serait compté deux fois. L'onglet **Mouvements** dit la vérité.                           |
| Après un ajustement de stock, **la pastille de statut ne suit pas la quantité** (« Stock faible » à 10 unités).         | Corrigez-la sur la fiche du produit, champ **État du stock (surcharge)**. La quantité, elle, est juste.                                            |
| L'écran **Réinitialiser** annonce des nombres d'enregistrements, mais **ses boutons n'agissent que sur ce navigateur**. | Ne comptez pas sur cet écran pour effacer des données en ligne. Voir la section 9.2.                                                               |
| Sur l'écran **Développeur**, **« Dernière sauvegarde » indique toujours « Aucune sauvegarde connue »**.                 | Vérifiez la présence du fichier dans votre dossier de téléchargement : c'est lui qui fait foi.                                                     |
| Le fichier de sauvegarde porte l'extension **`.sql`** alors que son contenu est une base **SQLite**.                    | Ne le renommez pas, ne l'ouvrez pas dans un éditeur de texte, transmettez-le tel quel.                                                             |
| Une simulation de migration annonce **« Migration sans anomalie »** avec **0 ligne lue**.                               | **N'exécutez pas.** La base d'arrivée n'est pas prête. Voir `docs/MIGRATION.md`.                                                                   |
| Sur la page d'accueil, un témoignage affiche **`[object Object]`** à la place d'un nom de produit.                      | Rien à faire de votre côté ; le témoignage se modifie dans **Avis › Avis d'accueil** si le texte gêne.                                             |
| Les **noms de catégories et de marques** restent en français sur les versions anglaise et arabe.                        | Comportement attendu aujourd'hui : ces champs ne se saisissent que dans une langue.                                                                |
| Le configurateur affiche un message d'erreur au clic sur **Ajouter au panier**.                                         | Le client doit être connecté. Si le message est « session expirée », il doit se reconnecter, puis refaire les étapes. Sa configuration est perdue. |

---

## 12. Vocabulaire

Les mots ci-dessous sont employés dans le même sens dans tout ce manuel et dans
toute l'administration.

| Mot                    | Sens dans KA Tech                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Boutique**           | La partie du site visible par les clients.                                                        |
| **Administration**     | La partie réservée à l'équipe, à l'adresse `/admin`.                                              |
| **Fiche produit**      | La page d'un produit, côté boutique comme côté administration.                                    |
| **Slug**               | L'identifiant court qui apparaît dans l'adresse d'une page. En minuscules, sans accent ni espace. |
| **Statut**             | Selon le contexte : l'avancement d'une commande, ou la disponibilité d'un produit.                |
| **Mouvement de stock** | Une entrée ou une sortie enregistrée, avec sa date, sa quantité et sa raison.                     |
| **Delta**              | La variation d'une quantité : `+8` ajoute huit unités, `-2` en retire deux.                       |
| **Franco de port**     | Le montant d'achat à partir duquel la livraison est offerte.                                      |
| **Wilaya**             | La division administrative algérienne. Le site en connaît 58, numérotées de 01 à 58.              |
| **Modération**         | La validation d'un avis client avant sa publication.                                              |
| **Sauvegarde**         | Le fichier contenant toute la boutique, téléchargé depuis l'écran Développeur.                    |
| **Migration**          | Le transfert des données vers une autre base. Opération unique et irréversible.                   |
| **Rôle**               | Le niveau de droits d'un compte : Client, Lecteur, Éditeur, Administrateur, Propriétaire.         |

---

_Manuel rédigé le 6 août 2026, complété le 9 août 2026 après vérification des
quatre fonctionnalités ajoutées : configurateur PC de bout en bout, journal
d'audit (42 événements enregistrés, 18 types d'action distincts), sélecteur
de langue de l'administration (français, anglais, arabe), écran Notion
(`/admin/notion`). L'entrée « Journal d'audit vide » du chapitre 11, vraie le
6 août, a été retirée : le journal est désormais actif._
