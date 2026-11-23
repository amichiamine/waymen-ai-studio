# Plan d'Implémentation Phase 56 — Téléchargement des Vrais Logos Officiels SVG du Web, Visuels HD Produits & Assainissement Console DEV

- **Date :** 23/11/2026
- **Directeur de Projet & Architecte Décideur :** ArchiSys3.0
- **Tech Lead, Architecte & Consultant R&D :** AImi
- **Statut :** 📋 **En Attente de Validation Formelle**

---

## 1. Contexte & Problématique

Lors de la recette de la Phase 55, plusieurs points d'amélioration visuelle et d'ergonomie technique ont été soulevés :

1. **Fidélité des Logos des Marques :** Les logos de Netflix, Spotify, YouTube, Disney+, PlayStation, Xbox, Steam, Apple, Google Play et Razer ne doivent pas être des reproductions schématiques mais les **vrais tracés vectoriels SVG officiels téléchargés directement depuis le Web** (Simple Icons / Wikimedia Commons).
2. **Qualité et Rendu des Images Produits :** Les nouveaux produits de streaming, gaming et cartes cadeaux nécessitent des visuels haute définition conformes aux standards graphiques des services IA déjà en vitrine.
3. **Assainissement Console :** Traiter les avertissements résiduels et s'assurer qu'aucune erreur 404 ni avertissement silencieux ne subsiste en console de développement.

---

## 2. Découpage en Sous-Phases & Actions Chirurgicales

### Sous-Phase 56.1 : Téléchargement Direct & Intégration des Vrais Logos Vectoriels Officiels du Web

- Écriture et exécution d'un script Node.js dédié (`scripts/telecharger-vrais-logos-web.ts`) qui va télécharger directement via HTTPS les vrais fichiers `.svg` originaux officiels :
  - **Netflix** : Simple Icons (`netflix.svg`)
  - **Spotify** : Simple Icons (`spotify.svg`)
  - **YouTube** : Simple Icons (`youtube.svg`)
  - **Apple** : Simple Icons (`apple.svg`)
  - **PlayStation** : Simple Icons (`playstation.svg`)
  - **Steam** : Simple Icons (`steam.svg`)
  - **Google Play** : Simple Icons (`googleplay.svg`)
  - **Razer** : Simple Icons (`razer.svg`)
  - **Xbox** : Simple Icons CDN v11 (`xbox.svg`)
  - **Disney+** : Wikimedia Commons officiel (`Disney+_logo.svg`)
- Normalisation des conteneurs SVG (viewBox carrée centrée, fond sombre/transparent harmonieux avec la vitrine, suppression des métadonnées superflues).
- Déploiement simultané dans `public/media/brands/` et `src/assets/brands/`.

### Sous-Phase 56.2 : Création de Visuels HD pour les Nouveaux Produits

- Génération par Sharp de cartes produits haute fidélité (640x480) incorporant le vrai logo officiel centré, un gradient de marque authentique et le titre du produit pour :
  - `service-netflix-premium.webp`
  - `service-spotify-premium.webp`
  - `service-youtube-premium.webp`
  - `service-disney-plus.webp`
  - `service-apple-music.webp`
  - `service-amazon-prime.webp`
  - `service-playstation-plus.webp`
  - `service-xbox-game-pass.webp`
  - `service-steam-wallet.webp`
  - `service-nintendo-online.webp`
  - `service-ea-play-pro.webp`
  - `service-card-apple.webp`
  - `service-card-googleplay.webp`
  - `service-card-playstation.webp`
  - `service-card-xbox.webp`
  - `service-card-razer-gold.webp`
- Mise à disposition dans `public/media/` et `src/assets/`.

### Sous-Phase 56.3 : Assainissement Console & Résorption des Requêtes 404

- Vérification au runtime de tous les liens médias et logos.
- Ajustement des composants pour garantir une console navigateur totalement propre.

### Sous-Phase 56.4 : Validation CI Intégrale & Packaging

- Exécution de la suite complète :
  ```powershell
  bun run verifier-i18n
  bunx tsc --noEmit
  bun run format
  bun run lint
  bun run build
  bun run paqueter:data
  ```
- Mise à jour du journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/waymen/.agents/tracabilites.md).

---

## 3. Matrice de Recette & Critères d'Acceptation

- [ ] Tous les logos de marques dans le bandeau défilant et fiches produits sont les **vrais SVG officiels du web**.
- [ ] Les 10 nouveaux produits affichent des visuels HD nets et reconnaissables.
- [ ] Zéro erreur 404 en console lors de la navigation.
- [ ] Pipeline CI 100% vert (`tsc`, `lint`, `format`, `i18n`, `build`).
