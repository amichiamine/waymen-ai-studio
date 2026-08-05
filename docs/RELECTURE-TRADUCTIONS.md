# Relecture des traductions — arabe et anglais

> Feuille destinée à un **relecteur arabophone**. Aucune connaissance du code
> n'est nécessaire : il suffit de corriger la colonne العربية et de renvoyer ce
> fichier, ou d'indiquer les corrections par numéro de clé.
>
> Contexte : boutique en ligne algérienne (informatique et téléphonie).
> Le site est trilingue FR / EN / AR, l'arabe s'affiche en RTL.

## Comment corriger

Les traductions vivent dans `src/lib/i18n/ar.ts`, une simple liste
`"clé": "traduction"`. Corriger la valeur suffit — **ne pas toucher aux clés**,
elles doivent rester identiques dans les trois fichiers `fr.ts`, `en.ts`, `ar.ts`.

## Priorité de relecture

Les lignes marquées ⚠️ sont celles sur lesquelles l'agent traducteur a exprimé
un doute : **terminologie matérielle** (socket, mémoire, alimentation) et
**registre** de l'écran de maintenance, qui est vu par tous les visiteurs.

## Clés ajoutées en phase 1

| Clé                   | Français                                                                                                             | English                                                                          | العربية                                                                 | À vérifier |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| `bp.page.title`       | Configurateur PC — KA Tech                                                                                           | PC Builder — KA Tech                                                             | مُجمِّع الحاسوب — KA Tech                                               | ⚠️         |
| `bp.page.desc`        | Construisez votre PC sur-mesure : choisissez les composants, vérifiez la compatibilité et obtenez un prix en direct. | Build your custom PC: pick components, check compatibility and get a live price. | اصنع حاسوبك المخصّص: اختر المكونات، تحقق من التوافق وشاهد السعر مباشرة. |            |
| `bp.addCart`          | Ajouter au panier                                                                                                    | Add to cart                                                                      | أضف إلى السلة                                                           |            |
| `bp.added`            | Configuration ajoutée au panier                                                                                      | Build added to cart                                                              | تمت إضافة التجميعة إلى السلة                                            |            |
| `bp.compat.title`     | Compatibilité                                                                                                        | Compatibility                                                                    | التوافق                                                                 | ⚠️         |
| `bp.compat.socket`    | Socket incompatible entre le processeur et la carte mère                                                             | Incompatible socket between the processor and the motherboard                    | المقبس غير متوافق بين المعالج واللوحة الأم                              | ⚠️         |
| `bp.compat.memory`    | Type de mémoire incompatible avec la carte mère                                                                      | Memory type incompatible with the motherboard                                    | نوع الذاكرة غير متوافق مع اللوحة الأم                                   | ⚠️         |
| `bp.compat.psu`       | Alimentation insuffisante pour les composants sélectionnés                                                           | Power supply insufficient for the selected components                            | مزود الطاقة غير كافٍ للمكونات المختارة                                  | ⚠️         |
| `bp.compat.blocked`   | Corrigez les incompatibilités avant de continuer                                                                     | Fix the incompatibilities before continuing                                      | صحّح حالات عدم التوافق قبل المتابعة                                     | ⚠️         |
| `bp.remaining`        | Budget restant                                                                                                       | Remaining budget                                                                 | الميزانية المتبقية                                                      |            |
| `bp.empty`            | Aucun composant sélectionné pour l'instant                                                                           | No components selected yet                                                       | لم يُختر أي مكوّن بعد                                                   |            |
| `auth.page.title`     | Connexion — KA Tech                                                                                                  | Sign in — KA Tech                                                                | تسجيل الدخول — KA Tech                                                  |            |
| `cart.page.desc`      | Consultez votre panier, ajustez les quantités et finalisez votre commande KA Tech.                                   | Review your cart, adjust quantities and complete your KA Tech order.             | راجع سلتك، عدّل الكميات وأتمم طلبك في KA Tech.                          |            |
| `favorites.page.desc` | Retrouvez tous les produits que vous avez mis en favoris sur KA Tech.                                                | Find all the products you have saved to your KA Tech wishlist.                   | اعثر على جميع المنتجات التي أضفتها إلى مفضلتك في KA Tech.               |            |
| `notfound.page.desc`  | La page que vous cherchez est introuvable — retournez à l'accueil KA Tech.                                           | The page you are looking for cannot be found — return to KA Tech home.           | الصفحة التي تبحث عنها غير موجودة — عد إلى الرئيسية.                     |            |
| `success.page.desc`   | Votre commande KA Tech a bien été confirmée. Merci pour votre achat !                                                | Your KA Tech order has been confirmed. Thank you for your purchase!              | تم تأكيد طلبك في KA Tech. شكرًا على شرائك!                              |            |
| `reset.page.title`    | Réinitialisation du mot de passe — KA Tech                                                                           | Reset password — KA Tech                                                         | إعادة تعيين كلمة المرور — KA Tech                                       |            |
| `reset.page.desc`     | Réinitialisez le mot de passe de votre compte KA Tech.                                                               | Reset the password for your KA Tech account.                                     | أعد تعيين كلمة مرور حسابك في KA Tech.                                   |            |
| `account.saveError`   | Erreur lors de la sauvegarde du profil                                                                               | Error while saving the profile                                                   | حدث خطأ أثناء حفظ الملف الشخصي                                          |            |
| `maintenance.title`   | Site en maintenance                                                                                                  | Site under maintenance                                                           | الموقع في صيانة                                                         | ⚠️         |
| `maintenance.message` | Nous revenons très vite.                                                                                             | We'll be back very soon.                                                         | سنعود قريبًا جدًا.                                                      | ⚠️         |
| `maintenance.admin`   | Espace administrateur                                                                                                | Admin area                                                                       | فضاء المسؤول                                                            | ⚠️         |

Total: 22 clés

## Points d'attention signalés

1. **`bp.compat.socket` / `memory` / `psu`** — vocabulaire technique du montage
   PC. Le registre attendu est celui d'un vendeur informatique algérien, pas
   d'une traduction littérale : vérifier que « المقبس » (socket) et
   « اللوحة الأم » (carte mère) sont bien les termes usuels du marché local.
2. **`bp.page.title`** — « مُجمِّع الحاسوب » pour « Configurateur PC ». Le terme
   est correct mais peut-être trop littéraire ; un équivalent plus commercial
   serait peut-être préférable.
3. **`maintenance.*`** — cet écran remplace tout le site quand le mode
   maintenance est actif. Il est vu par tous les visiteurs : le ton doit être
   soigné.
4. **Noms propres** — « KA Tech » reste en caractères latins dans les trois
   langues, y compris au milieu d'une phrase arabe. À confirmer : c'est un choix
   courant pour une marque, mais le rendu RTL mérite une vérification visuelle.

## Le reste du dictionnaire

Ce tableau ne couvre que les **22 clés ajoutées en phase 1**. Les 384 autres
clés viennent des lots précédents et n'ont jamais été relues par un locuteur.
Si le relecteur a le temps, `src/lib/i18n/ar.ts` mérite une passe complète —
c'est un fichier de 406 lignes lisibles.

---

# Deuxième lot — données produits et articles (phase 3)

Les **données** sont désormais multilingues, en plus de l'interface. Deux
fichiers à relire, tous deux directement éditables :

| Contenu   | Fichier                                               | Volume                     |
| --------- | ----------------------------------------------------- | -------------------------- |
| Catalogue | `src/data/products.ts`                                | 4 champs traduits sur ~100 |
| Articles  | `src/lib/admin-store.tsx`, fonction `seedBlogPosts()` | 5 articles × 3 champs      |

## Pourquoi si peu de champs traduits côté produits

C'est délibéré, et c'est le bon choix. **Seul le langage naturel est traduit ;
les références ne le sont pas.** « ASUS ROG Strix G16 », « Intel Core
i9-13980HX », « 32GB DDR5 » s'écrivent à l'identique dans les trois langues —
en fabriquer trois copies serait du bruit sans valeur, et une source d'erreurs
à la maintenance.

Ont donc reçu une traduction : les deux configurations dont le nom contient des
mots descriptifs (« Configuration Gaming Mid-Range », « Configuration Montage
Pro ») et les deux autonomies rédigées en prose (« Jusqu'à 18 heures »).

## Points signalés par les agents traducteurs

1. **`مونتاج`** (pour « Montage ») — emprunt du français, courant en Algérie.
   Un relecteur pourrait préférer `تحرير` ou `إنتاج`. À trancher selon l'usage
   de ta clientèle.
2. **`تجميعة ألعاب متوسطة المستوى`** et **`تجميعة مونتاج احترافية`** —
   terminologie de l'assemblage PC, registre à valider.
3. **`حتى 18 ساعة`**, **`حتى 33 ساعة تشغيل فيديو`** — idiomatiques, mais le
   registre commercial mérite confirmation.
4. **Divergence de contenu à arbitrer** — dans l'article
   `livraison-58-wilayas`, la version **arabe est plus riche que la française**
   et l'anglaise : l'agent y a ajouté des noms de wilayas
   (الجزائر، وهران، قسنطينة، عنابة، سطيف، تيزي وزو، البليدة، باتنة) absents des
   deux autres versions. Ce n'est pas une erreur de traduction mais un écart
   éditorial : soit tu enrichis les versions FR et EN de la même façon, soit tu
   alignes l'arabe. À toi de décider — un lecteur arabophone lira simplement un
   article un peu plus détaillé.

## Éditer sans passer par le code

Depuis la phase 3, l'administration permet de saisir les trois langues
directement, sans toucher aux fichiers :

- **`/admin/products`** → fiche produit : onglets **FR / EN / AR** sur le nom,
  la ligne de caractéristiques et les spécifications.
- **`/admin/blog`** → article : onglets **FR / EN / AR** sur le titre, le
  chapô et le corps, avec saisie en RTL sur l'onglet arabe.
- **`/admin/content`** → les 15 sections du site vitrine.

Un **point ambré** sur un onglet signale une traduction manquante. Seul le
français est obligatoire : un produit ou un article sans traduction reste
parfaitement valide, l'affichage se replie sur le français.
