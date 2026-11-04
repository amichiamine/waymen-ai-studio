import { useCallback } from "react";
import { useSiteSettings } from "@/data-provider";
import type { SiteSettings } from "@/api/types";

/**
 * Formate un montant numérique selon les réglages effectifs du site.
 *
 * @param amount Montant numérique
 * @param settings Réglages du site facultatifs (utilise les valeurs par défaut sinon)
 */
export function formatPriceRaw(amount: number, settings?: Partial<SiteSettings> | null): string {
  const symbol = settings?.currencySymbol || "DA";
  const position = settings?.currencyPosition || "suffix";
  const rawSeparator = settings?.currencyThousandSeparator;
  const separator = rawSeparator !== undefined ? rawSeparator : " ";

  // Formatage des milliers avec le séparateur configuré
  const parts = Math.round(amount).toString().split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const formattedNumber = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;

  // LTR isolate pour préserver l'ordre des chiffres même en contexte RTL
  if (position === "prefix") {
    return `\u2066${symbol} ${formattedNumber}\u2069`;
  }
  return `\u2066${formattedNumber} ${symbol}\u2069`;
}

/**
 * Hook réactif fournissant la fonction de formatage des prix connectée
 * en temps réel aux réglages de la boutique (settings.site).
 */
export function useFormatPrice() {
  const { data: settings } = useSiteSettings();

  return useCallback((amount: number) => formatPriceRaw(amount, settings), [settings]);
}
