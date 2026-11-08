import { Star, Quote } from "lucide-react";
import { useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";

export function QuoteStarBlock({ config }: { config: BlockConfig }) {
  const L = useLocalize();
  const p = config.props || {};

  const quote = p.quote
    ? String(L(p.quote as Localized<string>) || "")
    : String(
        L({
          fr: "« L'architecture StacGate et le niveau de rigueur d'ArchiSys3.0 ont transformé notre infrastructure numérique avec une robustesse exemplaire. »",
          en: "“The StacGate architecture and ArchiSys3.0's level of rigor transformed our digital infrastructure with exemplary robustness.”",
          ar: "«لقد أحدثت بنية StacGate ومستوى الدقة الهندسية نقلة نوعية في بنيتنا الرقمية بصلابة استثنائية.»",
        }) || "",
      );

  const author = typeof p.author === "string" ? p.author : "Dr. Salim B.";
  const role = p.role
    ? String(L(p.role as Localized<string>) || "")
    : String(
        L({
          fr: "Directeur des Systèmes d'Information — Enterprise Partner",
          en: "Chief Information Officer — Enterprise Partner",
          ar: "مدير نظم المعلومات — شريك مؤسساتي",
        }) || "",
      );
  const rating = Number(p.rating) || 5;
  const avatarSrc = typeof p.avatarSrc === "string" ? p.avatarSrc : "";

  return (
    <section className="container-page py-12 md:py-16">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-b from-card/80 to-card/40 p-8 md:p-12 shadow-lg backdrop-blur-xs text-center">
        {/* Quote watermark */}
        <Quote className="absolute -top-4 -left-4 h-28 w-28 text-primary/10 rotate-12 pointer-events-none" />

        {/* Rating Stars */}
        <div className="flex items-center justify-center gap-1.5 mb-6 text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${
                i < rating
                  ? "fill-amber-500 text-amber-500"
                  : "fill-transparent text-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Quote text */}
        <p className="relative text-xl md:text-2xl font-medium italic text-foreground leading-relaxed max-w-3xl mx-auto mb-8">
          {quote}
        </p>

        {/* Author info */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={author}
              className="h-12 w-12 rounded-full object-cover border-2 border-primary/30"
              loading="lazy"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg border border-primary/20">
              {author.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-center sm:text-start">
            <h4 className="font-bold text-foreground text-base">{author}</h4>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
