import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./styles.css";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";

// react-query a été retiré car aucun composant ne l'utilise (toutes les données
// transitent par admin-store / localStorage). Il pourra être réintroduit
// délibérément en phase 2 du PLAN.md lors du branchement de la couche de
// données, si un cache de requêtes s'avère utile.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <StoreProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </StoreProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
);
