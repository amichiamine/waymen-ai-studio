import { useState, useEffect } from "react";
import defaultLogoSrc from "@/assets/stacgate-archisys-combined.webp";
import { useSiteSettings } from "@/data-provider";
import { resoudreUrlMedia } from "./media-url";

export function Logo({ className = "h-9" }: { className?: string }) {
  const { data: s } = useSiteSettings();
  const [loadError, setLoadError] = useState(false);

  // Réinitialise l'erreur si l'URL configurée change
  useEffect(() => {
    setLoadError(false);
  }, [s.logoUrl]);

  const customSrc = s.logoUrl && s.logoUrl.trim() !== "" ? resoudreUrlMedia(s.logoUrl) : "";
  const hasCustomLogo = Boolean(customSrc && !loadError);
  const logoSrc = hasCustomLogo ? customSrc : defaultLogoSrc;
  const storeName = s.storeName && s.storeName.trim() !== "" ? s.storeName : "StacGate Platform";
  const altText = `${storeName} — Plateforme E-Commerce, Conçue et Validée par ArchiSys3.0`;

  return (
    <span className="inline-flex items-center justify-center align-middle transition-opacity hover:opacity-95">
      <img
        src={logoSrc}
        alt={altText}
        className={`${className} w-auto max-w-[260px] md:max-w-[320px] object-contain select-none`}
        draggable={false}
        onError={() => setLoadError(true)}
      />
    </span>
  );
}
