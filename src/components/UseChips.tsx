import { Gamepad2, Briefcase, GraduationCap, Film, Home } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";

const uses: { id: string; key: TKey; Icon: typeof Gamepad2 }[] = [
  { id: "gaming", key: "use.gaming", Icon: Gamepad2 },
  { id: "work", key: "use.work", Icon: Briefcase },
  { id: "study", key: "use.study", Icon: GraduationCap },
  { id: "edit", key: "use.edit", Icon: Film },
  { id: "home", key: "use.home", Icon: Home },
];

export function UseChips({
  value,
  onChange,
}: {
  value?: string | null;
  onChange?: (v: string | null) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {uses.map((u) => {
        const active = value === u.id;
        return (
          <button
            key={u.id}
            onClick={() => onChange?.(active ? null : u.id)}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm transition-all ${active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
          >
            <u.Icon className="size-4" />
            {t(u.key)}
          </button>
        );
      })}
    </div>
  );
}
