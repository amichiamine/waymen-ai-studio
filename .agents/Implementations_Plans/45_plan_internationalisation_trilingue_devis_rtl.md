# PLAN D'IMPLÉMENTATION — PHASE 45

## Internationalisation 360° Trilingue (FR / EN / AR RTL) du Dossier Autonome `devis/`

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Branche :** `main`  
**Statut :** 📋 **En attente de validation (Mode Plan)**  
**Périmètre :** `c:\xampp\htdocs\ka-tech\devis/` (Moteur i18n Vanilla JS, Styles RTL & 6 Fichiers HTML)

---

## 1. Contexte & Objectifs Stratégiques

L'objectif est d'étendre la maturité de la suite commerciale autonome [`devis/`](file:///c:/xampp/htdocs/ka-tech/devis) en lui conférant une **capacité trilingue intégrale et instantanée (Français, Anglais, Arabe avec support RTL natif)**, selon l'Option A validée par ArchiSys3.0.

### Exigences Fondamentales Inviolables :
1. **Autonomie & Zéro Dépendance :**
   - Le moteur i18n doit être écrit en pur JavaScript Vanilla moderne (`devis/assets/js/devis-i18n.js`).
   - Aucune bibliothèque externe (pas de React, pas d'i18next lourd, pas de serveur Node).
2. **Fluidité Instantanée (0 ms) & Persistance :**
   - Bascule de langue à la volée sur la page active sans rechargement de page.
   - Mémorisation de la langue choisie dans `localStorage` (`devis_lang`).
   - Inversion directionnelle native automatique : `dir="rtl"` et `lang="ar"` en Arabe, `dir="ltr"` en Français et Anglais.
3. **Synchronisation avec le Calculateur Dynamique :**
   - Le moteur `devis-calculator.js` doit être synchronisé avec la langue active :
     - Les montants en lettres / centimes sont traduits (ex : *« 8,5 Millions de centimes »* $\leftrightarrow$ *« 8.5 Million centimes »* $\leftrightarrow$ *« 8.5 مليون سنتيم »*).
     - Le message WhatsApp généré automatiquement est intégralement rédigé dans la langue sélectionnée.
4. **Impression PDF A4 Localisée :**
   - L'impression via `Ctrl + P` ou via le bouton dédié produit un devis propre dans la langue active avec mise en page RTL soignée en Arabe.

---

## 2. Architecture Technique de l'Option A

```
devis/
├── assets/
│   ├── css/
│   │   └── devis-style.css      ← Ajout des règles RTL, propriétés logiques & style du sélecteur de langue
│   └── js/
│       ├── devis-i18n.js        ← NOUVEAU : Dictionnaire trilingue (FR/EN/AR) + Moteur de traduction DOM
│       └── devis-calculator.js  ← Enrichi : Support de la langue active pour le récapitulatif & WhatsApp
└── [6 fichiers HTML]            ← Intégration du composant sélecteur [ FR | EN | العربية ] + attributs data-i18n
```

---

## 3. Découpage Chirurgical des Étapes d'Implémentation

### Étape 1 : Conception du Dictionnaire & Moteur `devis-i18n.js`
- Création de [`devis/assets/js/devis-i18n.js`](file:///c:/xampp/htdocs/ka-tech/devis/assets/js/devis-i18n.js) comprenant :
  - Dictionnaire structuré couvrant l'ensemble du vocabulaire des 6 pages :
    - Éléments transverses (en-têtes, boutons, mentions légales, récapitulatifs).
    - Métadonnées des devis (titres, badges, descriptions).
    - Libellés des options et modules additionnels.
    - Libellés des 29 blocs du Grand Compositeur.
  - Fonction `applyTranslations(lang)` :
    - Balayage des éléments comportant l'attribut `data-i18n="cle"`.
    - Mise à jour du texte (`textContent` ou `innerHTML` selon le besoin).
    - Mise à jour des attributs `dir` et `lang` sur `<html>`.
  - Émission d'un événement personnalisé `devis:langChanged` pour notifier le calculateur.

### Étape 2 : Adaptation CSS & Support RTL dans `devis-style.css`
- Modification de [`devis/assets/css/devis-style.css`](file:///c:/xampp/htdocs/ka-tech/devis/assets/css/devis-style.css) :
  - Style du sélecteur de langue discret : conteneur pilule moderne avec boutons `FR | EN | العربية` et état actif.
  - Support de la direction RTL :
    - Inversion des marges et paddings directionnels (usage de `margin-inline-start/end`).
    - Inversion de l'alignement des textes (`text-align: start`).
    - Ajustement des cartes d'options et des cases à cocher en mode RTL.
    - Prise en charge de l'impression PDF A4 en mode RTL.

### Étape 3 : Synchronisation du Calculateur `devis-calculator.js`
- Mise à jour de [`devis/assets/js/devis-calculator.js`](file:///c:/xampp/htdocs/ka-tech/devis/assets/js/devis-calculator.js) :
  - Écoute de l'événement `devis:langChanged`.
  - Formatage localisé des centimes en Français, Anglais et Arabe.
  - Génération du message WhatsApp dans la langue active.

### Étape 4 : Injection du Sélecteur et des Attributs dans les 6 Fichiers HTML
- Intégration dans :
  1. [`devis/index.html`](file:///c:/xampp/htdocs/ka-tech/devis/index.html) (Guide d'Orientation Client)
  2. [`devis/solution-digitale.html`](file:///c:/xampp/htdocs/ka-tech/devis/solution-digitale.html)
  3. [`devis/boutique-commerce.html`](file:///c:/xampp/htdocs/ka-tech/devis/boutique-commerce.html)
  4. [`devis/plateforme-entreprise.html`](file:///c:/xampp/htdocs/ka-tech/devis/plateforme-entreprise.html)
  5. [`devis/presence-professionnelle.html`](file:///c:/xampp/htdocs/ka-tech/devis/presence-professionnelle.html)
  6. [`devis/configurateur-sur-mesure.html`](file:///c:/xampp/htdocs/ka-tech/devis/configurateur-sur-mesure.html)

---

## 4. Matrice de Recette & Validation

| Test | Critère de Succès | Statut Attendu |
| :--- | :--- | :---: |
| **Bascule Instantanée** | Clic sur `العربية` ou `EN` traduit l'ensemble de la page sans recharger (0 ms). | 🟢 Conforme |
| **Sens de Lecture RTL** | En Arabe, `dir="rtl"` inverse les colonnes, boutons et cartes sans décalage visuel. | 🟢 Conforme |
| **Persistance Langue** | Rechargement de la page (`F5`) ou navigation entre devis conserve la langue choisie. | 🟢 Conforme |
| **Calculateur & Centimes** | Les libellés du panneau sticky et l'estimation en centimes s'affichent dans la langue active. | 🟢 Conforme |
| **WhatsApp Localisé** | Le clic sur WhatsApp ouvre un message rédigé dans la langue sélectionnée. | 🟢 Conforme |
| **Impression PDF A4** | `Ctrl + P` génère un devis propre dans la langue active, y compris en Arabe RTL. | 🟢 Conforme |

---

## 5. Séquence Git & Livrables Prévus

```bash
git add devis/
git commit -m "feat(devis): internationalisation trilingue 360 (FR/EN/AR RTL) du dossier devis" -m "Co-Authored-By: AImi <aimi@archisys.tech>"
```

