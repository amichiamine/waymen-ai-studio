import logoSrc from "@/assets/ka-tech-logo.webp";

export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <span className="inline-flex items-center justify-center align-middle dark:bg-white/95 dark:px-2 dark:py-1 dark:rounded-md dark:ring-1 dark:ring-white/10 dark:shadow-sm">
      <img
        src={logoSrc}
        alt="KA Tech — La tech entre vos mains"
        className={`${className} w-auto object-contain select-none`}
        draggable={false}
      />
    </span>
  );
}
