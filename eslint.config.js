import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // -------------------------------------------------------------------------
  // Garde-fou phase 2 : interdire l'import direct de `@/lib/admin-store`
  // depuis les couches pages et composants.
  //
  // Pourquoi : la phase 2 a migré 62 fichiers UI vers `@/data-provider`.
  // Sans cette règle, un développeur pressé réimporterait admin-store dans
  // une page et la bascule mock→http redeviendrait silencieusement fausse.
  //
  // Mécanisme d'exception : la règle est appliquée en deux passes.
  //   1. Bloc principal (ci-dessous) : couvre tous les fichiers pages/** et
  //      components/**. `allowTypeImports: true` exclut automatiquement les
  //      `import type { ... }` — les types du domaine restent dans admin-store
  //      et sont parfaitement légitimes à importer.
  //   2. Bloc d'exceptions (fichier par fichier) : pour les quelques fichiers
  //      qui importent encore des *valeurs* pour des raisons documentées, on
  //      désactive la règle sur le périmètre exact — pas sur la totalité des
  //      pages. Chaque exception est datée et porte la phase de suppression.
  //
  // Référence : docs/DATA-PROVIDER.md
  // -------------------------------------------------------------------------
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/admin-store",
              message:
                "Importer depuis @/data-provider à la place. " +
                "Les imports de valeurs depuis @/lib/admin-store sont réservés aux " +
                "fichiers dérogataires listés dans eslint.config.js. " +
                "Voir docs/DATA-PROVIDER.md pour la doctrine complète.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Exceptions explicites — valeurs admin-store encore nécessaires hors
  // data-provider. Chaque entrée documente la raison et la phase de retrait.
  // -------------------------------------------------------------------------

  {
    // AdminLayout : canPerform / setActiveRole = plomberie de permissions RBAC.
    // Ces fonctions gèrent le contexte de rôle actif ; elles n'ont pas
    // d'équivalent dans data-provider (elles ne transportent pas de données).
    // Suppression prévue en phase 4 lors de la refonte du système de rôles.
    files: ["src/components/admin/AdminLayout.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },

  {
    // Reset.tsx : resetData, clearData, exportState, importState, ARRAY_KEYS.
    // Opérations locales de réinitialisation du magasin mock ; elles n'ont pas
    // de sens côté API et disparaîtront avec le mock en phase 4.
    files: ["src/pages/admin/Reset.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },

  {
    // Audit.tsx : clearData — déclenche la purge du journal d'audit mock.
    // Même motif que Reset.tsx, suppression en phase 4.
    files: ["src/pages/admin/Audit.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },

  {
    // Settings.tsx : resetData — réinitialise les réglages mock.
    // Même motif que Reset.tsx, suppression en phase 4.
    files: ["src/pages/admin/Settings.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },

  {
    // Account.tsx / ResetPassword.tsx : findUserByEmail, upsertUser, setUserPassword.
    // Authentification mock — un agent parallèle supprime ces appels en ce moment
    // (branche chantier/phase-2-provider). Cette exception sera retirée dès que
    // ce travail est mergé (avant la fin de la phase 2).
    files: ["src/pages/Account.tsx", "src/pages/ResetPassword.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },

  {
    // Content.tsx : resetSiteContentSection — petit manque du provider.
    // À migrer vers data-provider en phase 3 (ticket : ajouter
    // resetSiteContentSection au provider de contenu).
    files: ["src/pages/admin/Content.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },

  {
    // Notifications.tsx : addNotification — petit manque du provider.
    // À migrer vers data-provider en phase 3 (ticket : exposer
    // addNotification via le provider de notifications).
    files: ["src/pages/admin/Notifications.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": "off" },
  },

  eslintPluginPrettier,
);
