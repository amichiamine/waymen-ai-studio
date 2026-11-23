import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocalize, useI18n, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";
import { Download, Mail, Github, Linkedin, ShieldCheck } from "lucide-react";
import defaultAvatarSrc from "@/assets/waymen-logo.webp";

interface ProfileHeroProps {
  config: BlockConfig;
}

export function ProfileHeroBlock({ config }: ProfileHeroProps) {
  const L = useLocalize();
  const { t } = useI18n();
  const p = config.props || {};

  const name = typeof p.name === "string" ? p.name : "ArchiSys3.0";
  const role =
    (typeof p.role === "string" ? p.role : L(p.role as Localized<string> | undefined)) ||
    "Architecte Logiciel & Consultant R&D";
  const bio =
    (typeof p.bio === "string" ? p.bio : L(p.bio as Localized<string> | undefined)) ||
    "Expertise en architectures logicielles souveraines, cloud, web moderne et systèmes distribués à haute performance.";
  const availability =
    (typeof p.availability === "string"
      ? p.availability
      : L(p.availability as Localized<string> | undefined)) ||
    "Disponible pour missions d'architecture & R&D";
  const avatarUrl = typeof p.avatarUrl === "string" ? p.avatarUrl : defaultAvatarSrc;
  const showDownloadPdf = p.showDownloadPdf !== false;
  const githubUrl = typeof p.githubUrl === "string" ? p.githubUrl : undefined;
  const linkedinUrl = typeof p.linkedinUrl === "string" ? p.linkedinUrl : undefined;
  const email = typeof p.email === "string" ? p.email : undefined;

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/50 to-primary/5 p-8 md:p-12 shadow-sm backdrop-blur-sm">
        {/* Lueur d'ambiance cyan/primary */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 lg:gap-12">
          {/* Avatar / Badge Visuel */}
          <div className="relative shrink-0">
            <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md bg-muted/30 p-2 flex items-center justify-center">
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>

          {/* Informations & Bio */}
          <div className="flex-1 text-center md:text-start space-y-4">
            {availability && (
              <Badge
                variant="outline"
                className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-1 px-3 text-xs font-medium"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {availability}
              </Badge>
            )}

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
                {name}
              </h1>
              <p className="mt-1 text-lg sm:text-xl font-semibold text-primary">{role}</p>
            </div>

            <p className="text-muted-foreground leading-relaxed max-w-2xl text-base sm:text-lg">
              {bio}
            </p>

            {/* Actions & Liens */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {showDownloadPdf && (
                <Button onClick={handlePrintPdf} className="gap-2 font-semibold shadow-sm">
                  <Download className="h-4 w-4" />
                  <span>{t("common.downloadPdf") || "Télécharger CV (PDF)"}</span>
                </Button>
              )}

              {email && (
                <Button variant="outline" asChild className="gap-2">
                  <a href={`mailto:${email}`}>
                    <Mail className="h-4 w-4" />
                    <span>{email}</span>
                  </a>
                </Button>
              )}

              {githubUrl && (
                <Button variant="ghost" size="icon" asChild title="GitHub">
                  <a href={githubUrl} target="_blank" rel="noreferrer noopener">
                    <Github className="h-5 w-5" />
                  </a>
                </Button>
              )}

              {linkedinUrl && (
                <Button variant="ghost" size="icon" asChild title="LinkedIn">
                  <a href={linkedinUrl} target="_blank" rel="noreferrer noopener">
                    <Linkedin className="h-5 w-5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
