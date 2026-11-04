import { useState, useEffect } from "react";
import defaultLogoSrc from "@/assets/ka-tech-logo.webp";
import { useSiteSettings } from "@/data-provider";

export function Logo({ className = "h-9" }: { className?: string }) {
  const { data: s } = useSiteSettings();
  const [loadError, setLoadError] = useState(false);

  // Réinitialise l'erreur si l'URL configurée change
  useEffect(() => {
    setLoadError(false);
  }, [s.logoUrl]);

  const hasCustomLogo = Boolean(s.logoUrl && s.logoUrl.trim() !== "" && !loadError);
  const logoSrc = hasCustomLogo ? s.logoUrl! : defaultLogoSrc;
  const storeName = s.storeName && s.storeName.trim() !== "" ? s.storeName : "KA Tech";
  const altText = `${storeName} — La tech entre vos mains`;

  return (
    <span className="inline-flex items-center justify-center align-middle dark:bg-white/95 dark:px-2 dark:py-1 dark:rounded-md dark:ring-1 dark:ring-white/10 dark:shadow-sm">
      <img
        src={logoSrc}
        alt={altText}
        className={`${className} w-auto object-contain select-none`}
        draggable={false}
        onError={() => setLoadError(true)}
      />
    </span>
  );
}
