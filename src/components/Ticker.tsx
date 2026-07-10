import { useAdminState } from "@/lib/admin-store";

export function Ticker() {
  const { tickerMessages } = useAdminState();
  if (tickerMessages.length === 0) return null;
  const items = tickerMessages.map((m) => m.text);
  const list = [...items, ...items];
  return (
    <div className="bg-announcement-bg text-announcement-fg overflow-hidden">
      <div className="flex animate-marquee-slow md:animate-marquee whitespace-nowrap h-9 items-center text-xs will-change-transform">
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
