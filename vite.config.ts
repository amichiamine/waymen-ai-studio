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
        // Strategie de decoupage : optimiser le CACHE, pas le volume.
        //
        // `manualChunks` deplace du code entre fichiers, il ne le rend pas
        // paresseux. Le shell de l'application importe React, le routeur et
        // Radix : le navigateur les telecharge de toute facon au premier
        // rendu, simplement en requetes parallelles. Le premier chargement
        // reste donc au meme poids (mesure : 171,8 -> 172,2 kB gzip).
        //
        // Le gain est ailleurs. Avant, la moindre modification de code metier
        // changeait l'empreinte des 608 kB du chunk unique et invalidait tout
        // le cache du navigateur. Desormais les dependances stables sont
        // isolees derriere leur propre hash : un deploiement qui ne touche que
        // `src/` laisse `vendor-react` (59 kB gzip), `vendor-radix` (37 kB) et
        // `vendor-router` (8 kB) intacts en cache, soit ~104 des 172 kB gzip
        // qui ne repartent plus sur le reseau.
        //
        // Regroupement par FAMILLE, pas par paquet : un chunk par dependance
        // donnerait 90 requetes, dont le surcout annulerait le benefice.
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

          // Primitives d'interface sans etat : Radix et son moteur de
          // positionnement Floating UI, plus leurs utilitaires directs.
          if (
            /[\\/]node_modules[\\/](@radix-ui|@floating-ui|aria-hidden|react-remove-scroll|react-remove-scroll-bar|react-style-singleton|use-callback-ref|use-sidecar|get-nonce|detect-node-es|tabbable)[\\/]/.test(
              id,
            )
          )
            return "vendor-radix";

          // Tout le reste (recharts, zod, lodash, d3...) est laisse a Rollup :
          // il les rattache deja au chunk paresseux qui les demande, et un
          // fourre-tout `vendor` les ramenerait dans le chemin critique.
          return undefined;
        },
      },
    },
  },
});
