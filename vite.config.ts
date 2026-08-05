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
    rollupOptions: {
      output: {
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
