import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "::",
    port: 8080,
    strictPort: true,
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
        // `vendor-radix-shell` (33,8 kB) et `vendor-router` (7,7 kB) intacts
        // en cache, soit ~100 des 188 kB gzip qui ne repartent plus.
        //
        // Regroupement par FAMILLE, pas par paquet : un chunk par dependance
        // donnerait 90 requetes, dont le surcout annulerait le benefice.
        //
        // MAIS un regroupement trop large a un cout reel, mesure en 0.3-D sur
        // le poids du chemin critique COMPLET (chunk d'entree + modulepreload
        // + CSS, et non le seul chunk d'entree) :
        //
        //   A. `vendor-radix` = tout `@radix-ui/*`      191,1 kB gzip
        //   B. aucun regroupement Radix                 190,9 kB gzip
        //   C. liste large des primitives du shell      188,5 kB gzip
        //   D. liste stricte des primitives du shell    188,3 kB gzip  <- retenu
        //
        // Lecture : regrouper TOUT Radix (A) tirait dans le chemin critique
        // ~2,8 kB gzip de primitives (accordion, tabs, switch, checkbox...)
        // que seules des pages paresseuses utilisent et que Rollup rattachait
        // sinon a leurs chunks. Ce n'est pas le doublement redoute — le shell
        // a bel et bien besoin de ~34 kB de Radix, pas de 18, via Header,
        // MobileBottomBar et AdminLayout/sidebar (select, dropdown-menu,
        // popover, tooltip, sheet=dialog, separator, Floating UI) — mais
        // c'est une regression nette. Ne rien regrouper (B) ne recupere rien :
        // Rollup remonte alors ces modules partages dans le chunk d'entree,
        // et on perd en plus les 34 kB de cache.
        //
        // Arbitrage volume / granularite : D reduit le volume ET conserve le
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
          // elles seules, plus le moteur de positionnement Floating UI dont
          // select/dropdown-menu/popover/tooltip dependent.
          //
          // La liste est volontairement stricte : toute primitive ajoutee ici
          // qui n'est pas utilisee par le shell entre dans le chemin critique
          // au lieu de suivre la page paresseuse qui l'importe. Les modules
          // internes partages (@radix-ui/react-primitive, react-context...)
          // sont laisses a Rollup, qui les place la ou ils servent.
          if (
            /[\\/]node_modules[\\/](@radix-ui[\\/]react-(select|dropdown-menu|menu|popover|tooltip|separator|dialog|slot)[^\\/]*|@floating-ui)[\\/]/.test(
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
