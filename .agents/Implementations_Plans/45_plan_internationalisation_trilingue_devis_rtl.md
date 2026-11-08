# PLAN D'IMPLÉMENTATION — PHASE 45 (CONSOLIDÉ)

## Internationalisation 360° Trilingue (FR / EN / AR RTL) du Dossier Autonome `devis/` & Résolution Définitive de l'Affichage des Montants

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Branche :** `main`  
**Statut :** 📋 **En attente de validation par ArchiSys3.0 (Mode Plan)**  
**Périmètre :** `c:\xampp\htdocs\ka-tech\devis/` (Moteur i18n Vanilla JS, Styles RTL, Isolation BiDi & Calculateurs)

---

## 1. Contexte & Historique des Passes

1. **Passe Initiale (Livrable Phase 45) :** Mise en place du moteur Vanilla JS `devis-i18n.js`, injection du sélecteur `[ FR | EN | العربية ]`, bascule `dir="rtl"` et synchronisation de base.
2. **Sous-Phase 45.1 (Complétude Exhaustive à 100%) :** Extension du dictionnaire à 276 clés uniques, couverture intégrale de chaque titre, description, puce, option et cellule de tableau sur les 6 fichiers HTML du dossier `devis/`.
3. **Sous-Phase 45.2 (En Cours de Planification) :** Correction chirurgicale de la casse visuelle des montants en arabe constatée par ArchiSys3.0.

---

## 2. Diagnostic Technique & Cause Racine de la Casse des Montants en Arabe

### Cause Racine N°1 : Double inversion Flexbox artificielle
Dans [`devis/assets/css/devis-style.css`](file:///c:/xampp/htdocs/ka-tech/devis/assets/css/devis-style.css) :
```css
html[dir="rtl"] .devis-header-top,
html[dir="rtl"] .option-header,
html[dir="rtl"] .summary-row,
html[dir="rtl"] .pricing-pill,
html[dir="rtl"] .option-card {
  flex-direction: row-reverse; /* ❌ DOUBLE INVERSION */
}
```
Sous `html[dir="rtl"]`, le moteur Flexbox standard inverse **déjà nativement** son axe de droite à gauche. L'ajout de `row-reverse` a causé une inversion redondante qui renvoie les cases à cocher à gauche et inverse les positions relatives des libellés et des prix.

### Cause Racine N°2 : Conflit de l'algorithme Unicode BiDi (Bi-directional)
En arabe, les phrases se lisent de droite à gauche, mais **les nombres et les montants s'écrivent et se lisent toujours de gauche à droite (LTR)**.  
Sans isolation directionnelle stricte (`unicode-bidi: isolate;` et `<bdi dir="ltr">`), les chaînes mixtes (`+ 25 000 DZD`, `18,5 مليون سنتيم`) subissent des permutations anarchiques des caractères `+`, `,` et de la devise `DZD`.

---

## 3. Découpage Chirurgical des Actions de la Sous-Phase 45.2

### Action 1 : Purge des `row-reverse` Superflus dans `devis-style.css`
- **Fichier :** 📄 [`devis/assets/css/devis-style.css`](file:///c:/xampp/htdocs/ka-tech/devis/assets/css/devis-style.css)
- **Modifications :**
  - Supprimer les déclarations `flex-direction: row-reverse` sur :
    - `.devis-header-top`
    - `.option-header`
    - `.summary-row`
    - `.pricing-pill`
    - `.option-card`
    - `.included-item`
    - `.feature-points li`
    - `.btn`
  - Laisser le comportement natif Flexbox W3C opérer sous `dir="rtl"` : le point de départ (`start`) est naturellement à droite, la case à cocher est à droite, le texte se déroule vers la gauche, et les prix se calent proprement à l'extrémité gauche.

### Action 2 : Verrouillage CSS de l'Isolation LTR sur les Montants & Prix
- **Fichier :** 📄 [`devis/assets/css/devis-style.css`](file:///c:/xampp/htdocs/ka-tech/devis/assets/css/devis-style.css)
- **Modifications :**
  - Appliquer les règles d'isolation bidirectionnelle sur tous les sélecteurs de montants :
    ```css
    .price,
    .option-price,
    .amount,
    .total-amount-dzd,
    .total-amount-centimes {
      direction: ltr;
      unicode-bidi: isolate;
      display: inline-block;
      text-align: left;
    }
    ```
  - En mode RTL, ces éléments conservent leur intégrité géométrique sans que le signe `+` ou la devise `DZD` ne soit déplacé à la fin.

### Action 3 : Sécurisation du Formateur des Centimes dans `devis-calculator.js`
- **Fichier :** 📄 [`devis/assets/js/devis-calculator.js`](file:///c:/xampp/htdocs/ka-tech/devis/assets/js/devis-calculator.js)
- **Modifications :**
  - Dans la fonction `formatCentimes(amountDZD)` :
    - Encapsuler la valeur numérique formatée dans une balise `<bdi dir="ltr">${formatted}</bdi>` pour l'arabe :
      ```javascript
      if (lang === "ar") {
        return `<bdi dir="ltr">${formatted}</bdi> مليون سنتيم`;
      }
      ```
    - Utiliser `totalCentimesEl.innerHTML` au lieu de `textContent` pour rendre la balise d'isolation valide.
  - Dans l'affichage des lignes récapitulatives dynamiques :
    - Encapsuler le prix avec un tag d'isolation `<span class="price" dir="ltr">+ ${formatDZD(opt.price)}</span>`.

---

## 4. Matrice de Recette & Critères d'Acceptation

| Élément | Comportement Attendu en Arabe (RTL) | Validation |
| :--- | :--- | :---: |
| **Cases à cocher (`.option-card`)** | Case à cocher située à l'extrême droite, libellé au centre, prix à gauche. | 🟢 Conforme |
| **Prix unitaire (`.option-price`)** | Affichage strict LTR : `+25 000 DZD` (signe `+` à gauche, chiffres ordonnés). | 🟢 Conforme |
| **Récapitulatif (`.summary-row`)** | Nom de l'option aligné à droite, montant aligné à gauche en LTR. | 🟢 Conforme |
| **Total DZD (`.total-amount-dzd`)** | Chiffre en gros caractères LTR : `185 000 DZD`. | 🟢 Conforme |
| **Total Centimes (`.total-amount-centimes`)** | Chiffre décimal stable : `18,5 مليون سنتيم` sans permutation de la virgule. | 🟢 Conforme |
| **Boutons & Actions** | Icône et libellé orientés harmonieusement sans chevauchement. | 🟢 Conforme |

---

## 5. Séquence de Déploiement & Commit

```bash
git add devis/assets/css/devis-style.css devis/assets/js/devis-calculator.js .agents/
git commit -m "fix(devis): retablissement flexbox natif et isolation bidi LTR des montants en arabe" -m "Co-Authored-By: AImi <aimi@antigravity.ai>"
git pull --rebase origin main && git push origin main
```
