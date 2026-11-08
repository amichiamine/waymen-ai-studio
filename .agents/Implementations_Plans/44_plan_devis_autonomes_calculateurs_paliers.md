# PLAN D'IMPLÉMENTATION — PHASE 44

## Module Autonome de Devis Ciblés & Calculateurs Interactifs Sur-Mesure (`devis/`)

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Branche :** `main`  
**Statut :** 📋 **En attente de validation (Mode Plan)**  
**Dossier Cible :** `c:\xampp\htdocs\ka-tech\devis/` (100% autonome, détachable et déplaçable)

---

## 1. Contexte & Objectifs Stratégiques

Suite aux arbitrages financiers validés par ArchiSys3.0, l'objectif est de doter le projet d'une **suite d'outils commerciaux et de devis interactifs 100% autonomes**, logés dans un dossier isolé [`devis/`](file:///c:/xampp/htdocs/ka-tech/devis) à la racine du projet.

### Exigences Fondamentales Inviolables :
1. **Autonomie & Portabilité Totale (Zero Dependency) :**
   - Le dossier `devis/` doit être entièrement détachable et déplaçable (fonctionne sur n'importe quel serveur, clé USB, ou ordinateur en local sans Node.js, sans React, sans serveur PHP).
   - Styles CSS et scripts JS intégrés ou embarqués de manière autonome avec un design moderne (Tailwind CSS CDN ou CSS autonome épuré, animations fluides, mode sombre/clair, impression PDF soignée).
2. **Neutralité & Discrétion des Paliers (Zero Fuite Commerciale) :**
   - Aucune mention de "Palier 1", "Palier 2", "Palier 3" ou de hiérarchie tarifaire dans les pages destinées aux clients.
   - Chaque fichier HTML se présente comme une **proposition commerciale exclusive et sur-mesure** dédiée au domaine d'activité du client.
3. **Calculateur & Compositeur Dynamique Intégré dans Chaque Devis (Étalonné par Profil) :**
   - Chaque page inclut un configurateur interactif **contextualisé** : les options, modules et services proposés ont des **tarifs proportionnels à l'échelle budgétaire du client cible** :
     - Sur `solution-digitale.html` : les modules additionnels sont calibrés pour une micro-activité (options entre 5 000 et 15 000 DZD).
     - Sur `boutique-commerce.html` : options calibrées commerce de détail (entre 8 000 et 25 000 DZD).
     - Sur `plateforme-entreprise.html` : options calibrées PME/Grossiste avec exigences de volume et robustesse (entre 20 000 et 50 000 DZD).
     - Sur `presence-professionnelle.html` : options calibrées pour indépendants/cabinets de conseil (entre 10 000 et 30 000 DZD).
   - Recalcul instantané du prix en **Dinar Algérien (DZD)** et en **Millions de centimes**.
   - Génération instantanée d'un récapitulatif détaillé avec bouton d'impression propre (A4 / PDF) et bouton d'export / partage WhatsApp direct avec le détail composé.
4. **Fidélité Réelle 1:1 au Code de la Plateforme (Zéro Fictif) :**
   - L'ensemble des options et fonctionnalités du calculateur s'appuie strictement sur ce qui a été développé et vérifié dans le code source de [`ka-tech`](file:///c:/xampp/htdocs/ka-tech) :
     - 18 pages visiteur, 35 écrans admin.
     - 29 blocs atomiques du Studio Visuel composable (`registry.ts`).
     - Gestion logistique 58 Wilayas d'Algérie en Cash-on-Delivery (COD).
     - Triple base de données SQLite/MySQL/Postgres & Installateur web 1-clic.
     - Moteur trilingue FR / EN / AR avec bascule RTL native.

---

## 2. Inventaire Factuel des Fonctionnalités Réelles Embarquées

Les fonctionnalités proposées dans les calculateurs proviennent directement du code vérifié :

| Catégorie | Fonctionnalités Réellement Disponibles dans le Code Source |
| :--- | :--- |
| **Vitrine & E-Commerce** | Catalogue produits physiques & immatériels, Variantes (couleurs/tailles), Fiches produits riches, Panier dynamique, Tunnel de commande COD 58 Wilayas d'Algérie, Suivi de colis en direct sans compte, Wishlist/Favoris, Moteur de recherche et filtres de catégories. |
| **Studio Visuel (29 Blocs)** | Moteur de rendu dynamique JSON, 29 blocs composables atomiques (Héros, Ventes Flash, Onglets catégories, Défilement marques, Profil CV, Timeline parcours, Matrice compétences, Grille projets, Témoignages, FAQ accordéon, Formulaires contact, Grille tarifaire, etc.). |
| **Administration Backstage** | Dashboard KPI (CA, paniers, clients), Gestion des stocks atomiques anti-survente, Traitement des commandes et factures imprimables, Gestion des 58 wilayas et frais de port, Système de coupons promo, Modération des avis clients, Blog multimédia (Markdown + Vidéos YouTube). |
| **Technologie & Sécurité** | SPA React 19 + TypeScript strict (0 erreur), API REST PHP 8.2+ native (zéro dépendance Node en prod), Triple pilote BDD (SQLite fichier autonome, MySQL, PostgreSQL), Installateur web automatique (`install.php`), Sécurité Argon2id, Cookies HttpOnly, Prérendu SEO Playwright. |
| **Internationalisation** | Système trilingue natif Français / Anglais / Arabe, inversion directionnelle RTL complète et irréprochable. |

---

## 3. Architecture des Fichiers du Dossier `devis/`

```
devis/
├── index.html                   ← Hub / Tableau de bord confidentiel (pour ArchiSys3.0 : accès direct à toutes les offres)
├── solution-digitale.html       ← Devis & Compositeur : Produits Digitaux, Abonnements IA, Clés & Licences
├── boutique-commerce.html       ← Devis & Compositeur : Commerce de Détail, Mode, Beauté, Artisanat (COD 58 Wilayas)
├── plateforme-entreprise.html   ← Devis & Compositeur : PME, Magasins Tech, Pièces Auto, Grossistes & Distribution
├── presence-professionnelle.html← Devis & Compositeur : Indépendants, Consultants, Formateurs, Cabinets de Services
├── configurateur-sur-mesure.html← Grand Compositeur Intégral Tout-en-Un (29 blocs & tous modules à la carte)
├── assets/
│   ├── css/
│   │   └── devis-style.css      ← Styles épurés, responsive, design moderne et règles d'impression PDF
│   └── js/
│       └── devis-calculator.js  ← Moteur universel de calcul en temps réel (DZD & Centimes) et export devis
```

---

## 4. Découpage Chirurgical des Étapes d'Implémentation

### Étape 1 : Création du Socle Technique Autonome (`devis/assets/`)
- Conception de `devis/assets/css/devis-style.css` :
  - Palette moderne avec variables CSS (Thème sobre, typographie soignée, badges de statut, cartes d'options interactives).
  - Styles optimisés `@media print` pour un rendu de devis A4 / PDF irréprochable sans boutons inutiles.
- Conception de `devis/assets/js/devis-calculator.js` :
  - Moteur universel de calcul réactif : écoute les cases à cocher, boutons radio et sélecteurs de volume.
  - Calcul dynamique en Dinar Algérien (DZD) et conversion automatique en Millions de centimes.
  - Sauvegarde locale d'état (`localStorage`) pour préserver les sélections du client.
  - Moteur d'exportation : Générateur de lien WhatsApp pré-rempli avec le détail du devis et bouton d'impression directe.

### Étape 2 : Réalisation des 4 Devis Ciblés par Métier
- **`solution-digitale.html`** :  
  - Cible : Vendeurs de clés IA, licences, comptes streaming, recharges.
  - Base tarifaire : 60 000 – 80 000 DZD (ajustable de 45 000 à 110 000 DZD selon options).
  - Modules par défaut : Catalogue dématérialisé, formulaires rapides, livraison par email/WhatsApp, paiement BaridiMob/CCP.
- **`boutique-commerce.html`** :  
  - Cible : Boutiques de mode, cosmétiques, bijoux, commerces de proximité.
  - Base tarifaire : 80 000 – 120 000 DZD (ajustable de 70 000 à 160 000 DZD).
  - Modules par défaut : E-shop complet, Panier, Checkout Cash-on-Delivery, Sélecteur 58 Wilayas, Suivi colis en direct.
- **`plateforme-entreprise.html`** :  
  - Cible : Magasins informatique/tech, pièces de rechange, grossistes B2B, distribution.
  - Base tarifaire : 150 000 – 200 000 DZD (ajustable de 130 000 à 260 000 DZD).
  - Modules par défaut : Catalogue lourd, Stocks atomiques avec alertes, Dashboard KPI, Gestion promotions & coupons, Fiches d'expédition, Facturation.
- **`presence-professionnelle.html`** :  
  - Cible : Formateurs, consultants, bureaux d'études, entreprises de services.
  - Base tarifaire : 80 000 – 120 000 DZD (ajustable de 65 000 à 170 000 DZD).
  - Modules par défaut : Visual Page Builder, Blog multimédia (Markdown + Vidéos), Témoignages & Avis, Formulaires de devis/contact.

### Étape 3 : Réalisation du Grand Compositeur Intégral (`configurateur-sur-mesure.html`)
- Présentation de l'ensemble des 29 blocs du Studio Visuel classés par famille (Commerce, Identité/CV, Confiance/Social, Interaction).
- Sélection modulaire des briques fonctionnelles (Boutique, Multilingue FR/EN/AR RTL, Blog, 58 Wilayas, Admin 35 écrans, Multi-BDD).
- Estimation en direct pour les clients exigeants ou projets hors-normes.

### Étape 4 : Réalisation du Hub Confidentiel (`index.html`)
- Interface réservée à ArchiSys3.0 récapitulant les 5 propositions avec leurs liens directs, descriptions de cibles et arguments clés à présenter.

---

## 5. Matrice de Recette & Validation

| Test | Critère de Succès | Statut Attendu |
| :--- | :--- | :---: |
| **Portabilité 100%** | Ouverture directe via double-clic dans le navigateur (`file:///...`) sans serveur web requis. | 🟢 Conforme |
| **Calcul Dynamique** | Changement instantané des montants en DZD et en Millions de centimes lors de chaque coche/décoche. | 🟢 Conforme |
| **Impression PDF** | `Ctrl + P` produit une fiche de devis épurée, sans éléments interactifs polluants, format A4 pro. | 🟢 Conforme |
| **Zéro Fuite de Palier** | Absence totale des termes "palier", "tiers", "low-cost" ou de renvois croisés entre devis. | 🟢 Conforme |
| **Intégrité Métier** | Chaque option correspond à un module réellement opérationnel dans le code de `ka-tech`. | 🟢 Conforme |

---

## 6. Séquence Git & Livrables Prévus

```bash
git add devis/
git commit -m "feat(devis): suite autonome de devis et calculateurs interactifs" -m "Co-Authored-By: AImi <aimi@archisys.tech>"
```

