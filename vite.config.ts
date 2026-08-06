import { defineConfig } from "vite";
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

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
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
});
