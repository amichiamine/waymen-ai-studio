# PLAN D'IMPLÉMENTATION — PHASE 61

## Éradication Définitive des Derniers Angles Morts des Blocs Studio : Raccordement Universel de ContactCTA (Bouton d'Action + WhatsApp) & Émancipation Vitrine de BuilderTeaser

- **Date :** 23 Novembre 2026
- **Directeur de Projet & Architecte Décideur :** ArchiSys3.0
- **Tech Lead, Architecte & Consultant R&D :** AImi
- **Statut :** 🟢 **Validé par ArchiSys3.0 & En Cours de Livraison**
- **Dépôt Git Officiel :** `amichiamine/waymen-ai-studio` (Branche `main`)
- **Fichier Miroir :** 📄 [`.agents/Implementations_Plans/61_plan_eradication_derniers_angles_morts_blocs_studio.md`](file:///c:/xampp/htdocs/waymen/.agents/Implementations_Plans/61_plan_eradication_derniers_angles_morts_blocs_studio.md)

---

### 1. Contexte & Problématique Métier

L'audit d'intégrité 360° réalisé avec ArchiSys3.0 a mis en lumière deux angles morts résiduels sur les blocs du Studio :

1. **Bloc Appel à l'Action Contact (`contact_cta`) :**
   - Le registre du Studio (`registry.ts`) définit un badge d'accroche (`badge`), un texte de bouton d'action (`buttonText`) et un lien de destination (`buttonHref`, ex: `/contact`).
   - Le composant actuel `ContactCTA.tsx` ignore complètement ces trois propriétés : il n'affiche qu'un bouton WhatsApp (si le numéro WhatsApp est configuré dans les paramètres généraux).
   - L'inspecteur du Studio (`BlockPropsEditor.tsx`) n'expose pas ces champs à l'administrateur.
   - **Objectif :** Transformer `ContactCTA.tsx` en composant d'action universel capable d'afficher le badge d'accroche, le bouton d'action principal personnalisé (vers n'importe quelle page de la boutique), tout en conservant le bouton WhatsApp direct à ses côtés si le numéro est actif.

2. **Bloc Configurateur Pack / Studio (`builder_teaser`) :**
   - Le bloc est bridé par un verrou strict : si le configurateur matériel est désactivé (`siteSettings.builderEnabled === false`), le bloc est entièrement masqué même si l'administrateur l'a activé dans le Studio pour promouvoir les packs IA WaYmen.
   - **Objectif :** Émanciper le bloc pour qu'il s'affiche dès lors qu'il est activé dans le Studio avec ses propres textes, badges et bouton CTA (ex: vers `/category/packs-bundles`).

---

### 2. Architecture Technique Cible & Adaptations

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    RACCORDEMENT UNIFIÉ DES DERNIERS ANGLES MORTS                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  [Studio / Admin]
         │
         ├──► contact_cta : badge, title, subtitle, buttonText, buttonHref, whatsappLabel
         └──► builder_teaser : badge, title, description/subtitle, ctaText/cta, items
         │
         ▼
  [Mappeur CommerceBlocks.tsx]
         │
         ├──► ContactCtaBlock : transmet { badge, title, subtitle, buttonText, buttonHref }
         └──► BuilderTeaserBlock : émancipé du guard builderEnabled si configuré dans le Studio
         │
         ▼
  [Composants Rendu Fini]
         │
         ├──► ContactCTA.tsx :
         │      • Badge visuel d'accroche
         │      • Titre & Sous-titre trilingues
         │      • [ Bouton Principal CTA (ex: Contacter un Expert) ]
         │      • [ Bouton WhatsApp Direct (si configuré) ]
         │
         └──► BuilderTeaser.tsx :
                • Rendu autonome avec ses cartes et boutons fonctionnels
```

---

### 3. Plan d'Actions Chirurgical par Étape

#### Étape 1 : Raccordement Universel de `ContactCTA.tsx`

- **Fichiers cibles :**
  - [`src/components/ContactCTA.tsx`](file:///c:/xampp/htdocs/waymen/src/components/ContactCTA.tsx)
  - [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/CommerceBlocks.tsx)
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/waymen/src/components/admin/BlockPropsEditor.tsx)
  - [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/waymen/src/lib/site-content.ts)
- **Actions :**
  1. Dans `site-content.ts` : enrichir le type `SiteContent["contactCta"]` avec `badge?: LS; buttonText?: LS; buttonHref?: string;`.
  2. Dans `ContactCTA.tsx` :
     - Afficher le badge d'accroche (`c.badge`) si présent.
     - Afficher le bouton d'action principal (`c.buttonText` / `c.buttonHref`, par défaut `/contact`).
     - Afficher le bouton WhatsApp à côté si `siteSettings.whatsapp` est renseigné.
  3. Dans `CommerceBlocks.tsx` (`ContactCtaBlock`) : transmettre proprement ces propriétés depuis `config.props`.
  4. Dans `BlockPropsEditor.tsx` : ajouter les champs d'édition du badge, du texte du bouton et du lien de redirection.

#### Étape 2 : Émancipation & Souveraineté de `BuilderTeaser.tsx`

- **Fichiers cibles :**
  - [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/waymen/src/components/blocks/CommerceBlocks.tsx)
  - [`src/components/BuilderTeaser.tsx`](file:///c:/xampp/htdocs/waymen/src/components/BuilderTeaser.tsx)
- **Actions :**
  1. Dans `CommerceBlocks.tsx` (`BuilderTeaserBlock`) : ne masquer le bloc que si `siteContent.builderTeaser?.enabled === false && !config.props?.title`. Si le bloc est personnalisé dans le Studio, l'autoriser à s'afficher en vitrine indépendamment du flag legacy `builderEnabled`.
  2. Dans `BuilderTeaser.tsx` : sécuriser la compatibilité entre les props plates (`ctaText`, `ctaHref`) et structurées (`cta: { label, href }`).

#### Étape 3 : Validation CI, Build de Production & Packaging

- **Actions :**
  1. Exécution de la suite de vérité :
     ```powershell
     bun run verifier-i18n
     bunx tsc --noEmit
     bun run format
     bun run lint
     bun run build
     bun run paqueter:data
     ```
  2. Vérification que les packages `waymen-site-*.zip` et `waymen-data-*.zip` sont régénérés avec succès.

#### Étape 4 : Consignation & Déploiement GitHub

- **Actions :**
  1. Mise à jour officielle de [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/waymen/.agents/tracabilites.md) avec la Phase 61.
  2. Commit et push sur `amichiamine/waymen-ai-studio`.

---

### 4. Matrice de Recette & Critères d'Acceptation

| Test                             | Avant Phase 61                     | Après Phase 61                                           |
| :------------------------------- | :--------------------------------- | :------------------------------------------------------- |
| **Bouton d'action ContactCTA**   | Invisible (seul WhatsApp apparaît) | Bouton principal affiché et cliquable (ex: `/contact`)   |
| **Badge d'accroche ContactCTA**  | Invisible                          | Rendu au-dessus du titre principal                       |
| **Bouton WhatsApp ContactCTA**   | Unique option possible             | Présent en duo avec le bouton principal si configuré     |
| **BuilderTeaser dans le Studio** | Masqué si builderEnabled = false   | S'affiche fidèlement dès qu'il est activé dans le Studio |

---

### 5. Clôture & Soumission à Validation

Ce plan directeur de la Phase 61 est soumis à votre arbitrage formel.  
Dès votre approbation (clic sur **Proceed** ou accord écrit), nous scellerons définitivement ces deux briques.
