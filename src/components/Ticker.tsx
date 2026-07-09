import { useI18n, type TKey } from "@/lib/i18n";

const KEYS: TKey[] = ["tick.1", "tick.2", "tick.3", "tick.4", "tick.5"];

export function Ticker() {
  const { t } = useI18n();
  const items = KEYS.map((k) => t(k));
  const list = [...items, ...items];
  return (
    <div className="bg-announcement-bg text-announcement-fg overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap h-9 items-center text-xs">
        {list.map((tx, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6 shrink-0 text-white/90">
            <span>{tx}</span>
            <span className="size-1 rounded-full bg-primary-glow" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}
