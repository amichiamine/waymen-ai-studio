import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

/**
 * Port de développement.
 *
 * Historiquement figé à 8080 avec `strictPort: true`, ce qui faisait échouer le
 * démarrage dès que le port était occupé — cas fréquent sous XAMPP, dont Tomcat
 * écoute sur 8080, ou après une fenêtre de terminal fermée sans Ctrl+C.
 *
 * Désormais : port de départ configurable par la variable d'environnement
 * `PORT`, et `strictPort: false` pour que Vite balaie les ports suivants
 * (8081, 8082…) jusqu'à en trouver un libre. Vite affiche systématiquement
 * l'URL retenue au démarrage : le comportement reste explicite, il cesse
 * simplement d'être bloquant.
 */
const DEV_PORT = Number(process.env.PORT ?? 8080);

/**
 * Port du serveur PHP de l'API en developpement, configurable par `API_PORT`.
 *
 * Comme `PORT` ci-dessus, cette variable se lit dans l'environnement du shell
 * et NON dans un fichier `.env` : Vite n'injecte pas les fichiers `.env` dans
 * `process.env`. Voir README.md section « Developpement a deux serveurs ».
 */
const API_DEV_PORT = Number(process.env.API_PORT ?? 8160);

/**
 * Prefixe HTTP sous lequel le navigateur appelle l'API.
 *
 * Il DOIT correspondre a `VITE_API_BASE_URL` (defaut `/api/v1`, cf.
 * `src/api/config.ts`), sinon chaque appel part sur une URL non proxifiee et
 * Vite renvoie l'index HTML de la SPA : le client recoit du HTML la ou il
 * attend du JSON, et l'erreur est incomprehensible.
 *
 * On ne proxifie que le premier segment (`/api`) : la version (`/v1`) est
 * transmise telle quelle au PHP, qui sait la retirer lui-meme
 * (`Requete::retirerPrefixe`).
 */
const API_PREFIXE = "/api";

/**
 * Reecriture du chemin, miroir exact de ce que fait Apache en production.
 *
 * En production, `api/.htaccess` est monte SOUS `/api` : PHP voit
 * `SCRIPT_NAME=/api/index.php`, en deduit le prefixe `/api` et le retire.
 * En developpement, `php -S -t api` a pour racine le dossier `api/` lui-meme :
 * le prefixe `/api` n'existe pas cote serveur. C'est le proxy qui doit le
 * retirer, faute de quoi TOUTES les routes repondent 404.
 *
 *   navigateur      /api/v1/products
 *   proxy      ->       /v1/products     (ce qui suit)
 *   Requete    ->          /products     (retrait de la version)
 */
const reecrireCheminApi = (chemin: string): string =>
  chemin.replace(new RegExp(`^${API_PREFIXE}`), "") || "/";

// =========================================================================
// MODE DE DONNEES — point de decision UNIQUE, au build comme au dev.
//
// L'INCIDENT QUI A IMPOSE CE BLOC. `src/api/config.ts` lisait
// `VITE_API_MODE === "http" ? "http" : "mock"` : tout ce qui n'etait pas
// exactement `http` retombait sur `mock`, y compris `undefined`. Or Vite ne
// lit JAMAIS `.env.example` — seulement `.env`, `.env.local` et
// `.env.<mode>`. Un utilisateur qui suit la documentation, clone et lance
// `bun run build` SANS creer de `.env` obtenait donc un bundle ou le mode
// etait fige a `"mock"` :
//
//   const cl = {}, qt = cl, Io = qt.VITE_API_MODE === "http" ? "http" : "mock"
//
// `cl` est vide : aucune variable `VITE_*` n'existait au build. La boutique
// mise en ligne affichait 16 produits, 0 erreur de console, et n'emettait
// PAS UN SEUL appel vers `/api/`. Aucune erreur, aucun symptome, tout faux —
// exactement la « degradation silencieuse » que AGENTS.md §7 proscrit.
//
// CE QUE CE BLOC GARANTIT.
//   1. La valeur est TOUJOURS definie dans le bundle : on la reinjecte dans
//      `process.env`, que Vite reverse dans `import.meta.env`. Plus jamais
//      d'objet vide, donc plus jamais de repli implicite.
//   2. Le defaut est `http` — la valeur documentee du projet, et la seule qui
//      ait un sens en production. `mock` devient un choix, jamais un accident.
//   3. Chaque build ANNONCE son mode sur la sortie standard, et REFUSE de
//      produire un paquet de production muet.
// =========================================================================

type ModeDonnees = "mock" | "http";

/**
 * Modes Vite pour lesquels `mock` reste le defaut :
 *
 *   « development » — le serveur de dev nu (`bun run dev:mock`, qui lance
 *     `vite` sans argument) ET le paquet de demonstration (`bun run
 *     build:dev`, `vite build --mode development`). Une seule regle couvre
 *     les deux, et c'est voulu : ce sont les deux entrees ou l'absence de
 *     serveur PHP est la situation NORMALE.
 *   « mock » — pour qui passe `--mode mock` a la main.
 *
 * `bun run dev` n'en depend pas : `scripts/dev.mjs` sonde l'API PHP et pose
 * lui-meme `VITE_API_MODE`, http ou mock, avec un message a l'appui.
 *
 * NE PAS transformer `dev:mock` en `vite --mode mock` pour « faire propre » :
 * `src/lib/admin-store.tsx` conditionne les identifiants semes de
 * developpement a `import.meta.env.MODE === "development"`. Changer le mode
 * Vite priverait `dev:mock` de ses comptes de test.
 *
 * Tout le reste — au premier chef `vite build`, mode « production » — vise un
 * serveur reel et prend donc `http`.
 */
const MODES_VITE_DEMONSTRATION = new Set(["development", "mock"]);

/** Echappatoire assumee : `KATECH_BUILD_MOCK=1 bun run build`. */
const AUTORISATION_BUILD_MOCK = "KATECH_BUILD_MOCK";

interface ChoixMode {
  readonly mode: ModeDonnees;
  /** Phrase affichee a l'ecran ET ecrite dans `dist/mode-donnees.json`. */
  readonly origine: string;
}

/**
 * Resout le mode de donnees. Ordre de priorite, du plus fort au plus faible :
 *
 *   1. `VITE_API_MODE` du SHELL (`process.env`) — c'est ce que pose
 *      `scripts/dev.mjs` selon que l'API PHP a repondu ou non ;
 *   2. `VITE_API_MODE` d'un fichier `.env` / `.env.local` / `.env.<mode>` ;
 *   3. le mode Vite : `mock` pour le dev et les demos, `http` sinon.
 *
 * Une valeur presente mais non reconnue est une ERREUR DURE. La tolerer
 * ramenerait le defaut d'origine : `VITE_API_MODE=HTTP` ou `=htp` aurait
 * silencieusement produit du `mock`.
 */
function resoudreModeDonnees(modeVite: string, envFichiers: Record<string, string>): ChoixMode {
  const depuisShell = process.env.VITE_API_MODE;
  const depuisFichier = envFichiers.VITE_API_MODE;
  const brut = (depuisShell ?? depuisFichier ?? "").trim();

  if (brut !== "") {
    const origine =
      depuisShell !== undefined && depuisShell.trim() !== ""
        ? "variable de shell VITE_API_MODE"
        : "VITE_API_MODE d'un fichier .env";

    if (brut !== "mock" && brut !== "http") {
      throw new Error(
        `[ka-tech] VITE_API_MODE vaut « ${brut} » (${origine}) : valeur inconnue.\n` +
          `          Les seules valeurs admises sont « http » et « mock », en minuscules.\n` +
          `          Le build s'arrete ici : auparavant, toute valeur mal orthographiee\n` +
          `          retombait EN SILENCE sur « mock » et produisait une boutique\n` +
          `          deconnectee de son API.`,
      );
    }

    return { mode: brut, origine };
  }

  if (MODES_VITE_DEMONSTRATION.has(modeVite)) {
    return { mode: "mock", origine: `mode Vite « ${modeVite} »` };
  }

  return { mode: "http", origine: "defaut du projet (aucun VITE_API_MODE)" };
}

/**
 * Annonce le mode retenu, et interdit un paquet de production muet.
 *
 * Le blocage ne vise PAS le seul defaut — celui-ci est desormais `http`. Il
 * vise le scenario reellement dangereux : un `.env.local` contenant
 * `VITE_API_MODE=mock`, laisse en place apres une session de developpement,
 * puis un `bun run build` dont personne ne relit la sortie. Deux portes
 * restent ouvertes, toutes deux explicites, et nommees dans le message.
 */
function annoncerEtControlerMode(commande: "build" | "serve", modeVite: string, choix: ChoixMode) {
  const enTete = `[ka-tech] mode de donnees : ${choix.mode} — ${choix.origine}`;

  if (choix.mode === "http") {
    console.log(`${enTete}\n[ka-tech] le frontend appellera l'API sous « <base>api/v1 ».`);
    return;
  }

  const demonstrationAssumee =
    MODES_VITE_DEMONSTRATION.has(modeVite) || process.env[AUTORISATION_BUILD_MOCK] === "1";

  if (commande === "serve") {
    console.log(
      `${enTete}\n` +
        `[ka-tech] donnees lues dans le localStorage, AUCUN appel a l'API.\n` +
        `[ka-tech] pour developper contre l'API PHP : bun run dev`,
    );
    return;
  }

  if (!demonstrationAssumee) {
    throw new Error(
      `${enTete}\n` +
        `[ka-tech] REFUS DE CONSTRUIRE — un paquet de PRODUCTION en mode « mock » est\n` +
        `          une boutique de demonstration muette : catalogue fige dans le\n` +
        `          localStorage, aucun appel a /api/, aucune erreur affichee. C'est\n` +
        `          indiscernable d'un vrai site, et c'est deja arrive en production.\n` +
        `\n` +
        `          Pour construire le site REEL : retirer VITE_API_MODE=mock de .env\n` +
        `          / .env.local (ou le remettre a « http »), puis « bun run build ».\n` +
        `          Pour construire une DEMONSTRATION assumee, au choix :\n` +
        `            bun run build:dev\n` +
        `            ${AUTORISATION_BUILD_MOCK}=1 bun run build`,
    );
  }

  console.warn(
    `${enTete}\n` +
      `[ka-tech] ############################################################\n` +
      `[ka-tech] #  PAQUET DE DEMONSTRATION — NE PAS DEPLOYER EN PRODUCTION  #\n` +
      `[ka-tech] ############################################################\n` +
      `[ka-tech] Ce paquet n'appellera JAMAIS l'API : les donnees viennent du\n` +
      `[ka-tech] localStorage du visiteur. Le back-office l'affiche en clair.`,
  );
}

/**
 * Depose `mode-donnees.json` a la racine de `dist/`.
 *
 * Pourquoi un fichier plutot qu'une recherche de chaine dans le bundle :
 * `scripts/paqueter.ts` doit pouvoir refuser d'archiver un `dist/` de
 * demonstration, y compris lance seul (`bun run paqueter`) sur un dossier
 * construit la veille. Chercher `"mock"` dans du JavaScript minifie donne des
 * faux positifs a la pelle — le mot apparait dans les messages d'erreur du
 * provider. Un temoin ecrit par le build est la seule source qui ne mente pas.
 */
function temoinModeDonnees(choix: ChoixMode): Plugin {
  return {
    name: "katech-temoin-mode-donnees",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "mode-donnees.json",
        source: `${JSON.stringify(
          {
            modeDonnees: choix.mode,
            origine: choix.origine,
            construitLe: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}

export default defineConfig(({ command, mode: modeVite }) => {
  const envFichiers = loadEnv(modeVite, process.cwd(), "VITE_");
  const choix = resoudreModeDonnees(modeVite, envFichiers);

  annoncerEtControlerMode(command, modeVite, choix);

  // Reinjection dans `process.env` : Vite fusionne les variables `VITE_*` du
  // processus avec celles des fichiers `.env` pour composer
  // `import.meta.env`. C'est le mecanisme qu'utilise deja `scripts/dev.mjs`.
  // Sans cette ligne, `import.meta.env` resterait vide de `VITE_API_MODE` et
  // `src/api/config.ts` ne verrait rien — le defaut redeviendrait implicite.
  process.env.VITE_API_MODE = choix.mode;

  return {
    // ---------------------------------------------------------------------
    // Base des URL produites par le build — clé de la portabilité du dossier.
    //
    // Avec la valeur par defaut ("/"), `dist/index.html` reference
    // `src="/assets/index-XXXX.js"` : depose dans `public_html/ma-boutique/`,
    // le site reclame `https://domaine.dz/assets/...` et tout echoue en 404.
    // Le dossier n'etait donc renommable et deplacable qu'au prix d'un rebuild.
    //
    // CE QUE "./" CHANGE EXACTEMENT :
    //   - index.html : `./assets/...`, `./favicon.ico` (Vite reecrit aussi les
    //     fichiers de public/ references en absolu) ;
    //   - assets references depuis le JS : `new URL("img-XXXX.webp",
    //     import.meta.url)` — resolus contre l'URL du chunk, donc justes ;
    //   - imports differes : `import("./Page-XXXX.js", import.meta.url)` — idem ;
    //   - `url()` des CSS : relatifs au fichier CSS emis.
    //
    // CE QUE "./" NE CHANGE PAS, ET QU'IL FAUT TRAITER AILLEURS :
    //   1. les URL relatives d'index.html sont resolues contre l'URL du
    //      DOCUMENT. Sur un rafraichissement de route profonde, le repli SPA
    //      sert le document a l'URL `/ma-boutique/product/xyz` : `./assets/x.js`
    //      y deviendrait `/ma-boutique/product/assets/x.js`, qui n'existe pas.
    //      C'est `public/index.php` qui corrige ce point, en inserant une
    //      balise `<base>` calculee cote serveur. Ce fichier explique en detail
    //      pourquoi aucune regle de reecriture ne peut s'y substituer — la
    //      variante par redirection fait evaluer DEUX FOIS le chunk d'entree.
    //   2. `import.meta.env.BASE_URL` vaut litteralement "./" dans le bundle :
    //      il ne renseigne PAS le chemin de depot. Le routeur et l'API le
    //      lisent dans la balise `<base>` (voir `src/api/config.ts`).
    //   3. rien de ce qui est ecrit a la main dans `index.html`, ni le contenu
    //      des fichiers de `public/` (manifeste, sitemap), qui sont copies tels
    //      quels : leurs chemins doivent etre relatifs a la source.
    //
    // En developpement Vite ignore cette valeur et sert depuis "/", ce qui rend
    // `import.meta.env.BASE_URL` egal a "/" : la distinction absolu/relatif est
    // exactement ce sur quoi `src/api/config.ts` s'appuie pour choisir sa
    // methode de deduction.
    base: "./",
    plugins: [react(), tsconfigPaths(), tailwindcss(), temoinModeDonnees(choix)],
    server: {
      host: "::",
      port: DEV_PORT,
      strictPort: false,

      // -----------------------------------------------------------------------
      // Proxy de developpement vers l'API PHP — DEVELOPPEMENT UNIQUEMENT.
      //
      // `server.proxy` n'est lu que par `vite dev`. Il n'entre dans aucun
      // artefact de `vite build`, et `preview` n'en herite pas (il possede sa
      // propre cle `preview.proxy`, laissee vide a dessein). En production, le
      // frontend et l'API sont servis par le MEME domaine : aucun proxy n'a de
      // raison d'exister, et `api/.htaccess` fait le routage.
      //
      // POURQUOI CE PROXY EST INDISPENSABLE : sans lui, le front (:8080) et
      // l'API (:8160) sont deux origines distinctes. Le cookie de session
      // `katech_sid` est `httpOnly` + `SameSite=Lax` ; il ne serait ni pose ni
      // renvoye sur une requete inter-origine, et TOUTE route authentifiee
      // repondrait 401. Le proxy ramene l'API sur l'origine du front : le
      // cookie redevient un cookie de premiere partie, exactement comme en
      // production.
      // -----------------------------------------------------------------------
      proxy: {
        [API_PREFIXE]: {
          target: `http://127.0.0.1:${API_DEV_PORT}`,
          changeOrigin: false,
          secure: false,
          // Aucun `Domain` n'est pose par PHP : le cookie est deja lie a l'hote.
          // On neutralise malgre tout tout `Domain` eventuel, sinon un cookie
          // annonce pour `127.0.0.1` serait rejete par un navigateur qui parle a
          // `localhost` — deux noms pour la meme machine, deux hotes pour lui.
          cookieDomainRewrite: "",
          rewrite: reecrireCheminApi,
        },
      },
    },
    preview: {
      host: "::",
      port: Number(process.env.PREVIEW_PORT ?? DEV_PORT),
      strictPort: false,
    },
    build: {
      outDir: "dist",

      // Valeur par defaut de Vite, rendue EXPLICITE parce que deux autres
      // fichiers en dependent et casseraient en silence si elle changeait :
      //   - `public/.htaccess` renvoie 404 sur un `assets/` absent, a toute
      //     profondeur, plutot que de laisser le repli SPA repondre du HTML ;
      //   - docs/DEPLOIEMENT.md decrit l'arborescence a televerser.
      // Toute modification ici doit etre repercutee la-bas.
      assetsDir: "assets",

      sourcemap: false,
      // Plafond d'alerte abaisse de 500 a 450 kB (taille brute, avant gzip).
      // Ce n'est PAS un contournement : apres decoupage, le plus gros chunk est
      // recharts a 384 kB et plus rien ne depasse 500 kB, l'avertissement par
      // defaut ne se declenchait donc plus. Le laisser a 500 aurait rendu la
      // garde muette ; a 450 elle redevient un detecteur de regression utile,
      // avec 66 kB de marge au-dessus de recharts.
      chunkSizeWarningLimit: 450,
      rollupOptions: {
        output: {
          // Strategie de decoupage : optimiser le CACHE sans alourdir le
          // premier chargement.
          //
          // `manualChunks` deplace du code entre fichiers, il ne le rend pas
          // paresseux. Le shell importe React, le routeur et une partie de
          // Radix : le navigateur les telecharge de toute facon au premier
          // rendu, simplement en requetes parallelles.
          //
          // Le gain principal est le cache. Avant, la moindre modification de
          // code metier changeait l'empreinte des 608 kB du chunk unique et
          // invalidait tout le cache du navigateur. Desormais les dependances
          // stables sont isolees derriere leur propre hash : un deploiement qui
          // ne touche que `src/` laisse `vendor-react` (59,0 kB gzip),
          // `vendor-radix-shell` (27,7 kB) et `vendor-router` (7,7 kB) intacts
          // en cache, soit ~94 des 178 kB gzip qui ne repartent plus.
          //
          // Regroupement par FAMILLE, pas par paquet : un chunk par dependance
          // donnerait 90 requetes, dont le surcout annulerait le benefice.
          //
          // Le perimetre de `vendor-radix-shell` a ete recalibre en 0.3-F. La
          // liste de 0.3-D avait ete calibree quand `AdminLayout` et sa barre
          // laterale etaient encore en import statique ; depuis que le chrome du
          // back-office est en `React.lazy`, la cloture des imports STATIQUES de
          // `src/App.tsx` (Header, Footer, Ticker, FloatingWhatsApp,
          // MobileBottomBar, PromoBanner, MaintenanceScreen, PageTransition,
          // Toaster, ErrorBoundary, Button, NotFound) n'atteint plus que trois
          // paquets Radix :
          //
          //   @radix-ui/react-dialog        <- ui/sheet, via Header (menu mobile)
          //   @radix-ui/react-dropdown-menu <- ui/dropdown-menu, via Header
          //   @radix-ui/react-slot          <- ui/button
          //
          // `select`, `popover`, `tooltip` et `separator` ne sont plus atteints
          // que par des pages paresseuses : les maintenir dans la liste les
          // clouait dans le chemin critique au lieu de les laisser suivre le
          // chunk admin.
          //
          // Mesures 0.3-F sur le chemin critique COMPLET (chunk d'entree +
          // modulepreload + CSS, et non le recapitulatif de Vite) :
          //
          //   R1. liste 0.3-D, perimee                    184,3 kB gzip
          //   R2. liste recalibree sur le shell reel      178,3 kB gzip  <- retenu
          //   R3. aucun regroupement Radix                179,6 kB gzip
          //   R4. R2 sans la clause `@floating-ui`        178,3 kB gzip
          //   R5. R2 + les internes Radix partages        178,5 kB gzip
          //
          // Lecture : la seule correction du perimetre rend 6,0 kB gzip (le
          // chunk passe de 33,7 a 27,7 kB) sans deplacer une ligne de `src/`.
          // Ne rien regrouper (R3) reste moins bon : Rollup remonte alors ces
          // modules partages dans le chunk d'entree, ce qui coute 1,3 kB de plus
          // ET fait perdre les 27,7 kB de cache. Elargir aux internes partages
          // (R5) recoute 0,2 kB pour un gain de cache marginal.
          //
          // R4 produit un build octet pour octet identique a R2 : Rollup place
          // deja Floating UI dans ce chunk, puisque `react-dropdown-menu` y est
          // son unique importateur cote shell. La clause est conservee pour
          // rendre l'intention explicite et figer ce placement.
          //
          // Arbitrage volume / granularite : R2 reduit le volume ET conserve le
          // cache sur le coeur React, il n'y a donc pas de conflit ici. Si un
          // tel conflit apparaissait, la regle du chantier tranche en faveur du
          // volume au premier chargement.
          //
          // Les paquets non nommes ici sont volontairement laisses a Rollup.
          // C'est le point critique : un fourre-tout `vendor` attraperait
          // recharts, lodash et d3, tous statiquement importes par le chunk
          // commun, et les ramenerait dans le chemin critique — ce qui
          // annulerait la mise en paresse de recharts acquise en phase 0.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            // Coeur React : doit rester d'un seul tenant. Separer `react` de
            // `react-dom` casserait l'ordre d'initialisation du runtime.
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id))
              return "vendor-react";

            // Routage : le trio bouge ensemble, a chaque montee de react-router.
            if (
              /[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run[\\/](router|history))[\\/]/.test(
                id,
              )
            )
              return "vendor-router";

            // Primitives Radix reellement atteignables depuis le shell, et
            // elles seules : `dialog` (ui/sheet), `dropdown-menu` — avec
            // `react-menu` dont il n'est qu'une facade — et `slot` (ui/button),
            // plus le moteur de positionnement Floating UI dont `react-menu`
            // depend via `react-popper`.
            //
            // La liste est volontairement stricte : toute primitive ajoutee ici
            // qui n'est pas utilisee par le shell entre dans le chemin critique
            // au lieu de suivre la page paresseuse qui l'importe. C'est
            // exactement ce qui s'etait produit avec `select`, `popover`,
            // `tooltip` et `separator` apres la mise en paresseux du chrome
            // admin. A REVALIDER a chaque fois qu'un composant entre ou sort des
            // imports statiques de `src/App.tsx`.
            //
            // Les modules internes partages (@radix-ui/react-primitive,
            // react-context...) sont laisses a Rollup, qui les place la ou ils
            // servent : les forcer ici s'est mesure plus couteux (variante R5).
            if (
              /[\\/]node_modules[\\/](@radix-ui[\\/]react-(dropdown-menu|menu|dialog|slot)[^\\/]*|@floating-ui)[\\/]/.test(
                id,
              )
            )
              return "vendor-radix-shell";

            // Tout le reste (recharts, zod, lodash, d3...) est laisse a Rollup :
            // il les rattache deja au chunk paresseux qui les demande, et un
            // fourre-tout `vendor` les ramenerait dans le chemin critique.
            return undefined;
          },
        },
      },
    },
  };
});
