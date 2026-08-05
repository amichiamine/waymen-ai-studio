import { MessageCircle } from "lucide-react";
import { useSiteSettings, useSiteContent } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";

export function FloatingWhatsApp() {
  // loading inerte en mode mock. En http, on n'affiche rien le temps du
  // premier aller-retour : un bouton fantôme qui ne pointe nulle part serait
  // pire que son absence.
  const { data: siteSettings, loading: loadingSettings } = useSiteSettings();
  const { data: siteContent, loading: loadingContent } = useSiteContent();
  const L = useLocalize();

  if (loadingSettings || loadingContent) return null;
  if (!siteContent.floatingWhatsApp.enabled || !siteSettings.whatsapp) return null;

  return (
    <a
      href={`https://wa.me/${siteSettings.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={L(siteContent.floatingWhatsApp.ariaLabel) ?? "WhatsApp"}
      className="fixed bottom-20 md:bottom-6 start-6 z-50 inline-flex items-center justify-center size-14 rounded-full bg-success text-background shadow-lg shadow-success/30 hover:scale-110 transition-transform animate-pulse-glow"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
