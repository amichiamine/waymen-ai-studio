import { MessageCircle } from "lucide-react";
import { useAdminState } from "@/lib/admin-store";

export function FloatingWhatsApp() {
  const { siteSettings } = useAdminState();
  if (!siteSettings.whatsapp) return null;
  return (
    <a
      href={`https://wa.me/${siteSettings.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-20 md:bottom-6 left-6 z-50 inline-flex items-center justify-center size-14 rounded-full bg-success text-background shadow-lg shadow-success/30 hover:scale-110 transition-transform animate-pulse-glow"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
