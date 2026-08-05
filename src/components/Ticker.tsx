import { useAdminState } from "@/lib/admin-store";

export function Ticker() {
  const { tickerMessages } = useAdminState();
  if (tickerMessages.length === 0) return null;
  const items = tickerMessages.map((m) => m.text);
  return (
    <div className="bg-announcement-bg text-announcement-fg marquee-viewport">
      <div className="marquee-track animate-marquee h-9 text-xs" aria-hidden="true">
        {[0, 1].map((group) => (
          <div key={group} className="marquee-group">
            {items.map((tx, i) => (
              <span
                key={`${group}-${i}`}
                className="inline-flex shrink-0 items-center gap-2 px-6 text-announcement-fg/90"
              >
                <span>{tx}</span>
                <span className="size-1 rounded-full bg-primary-glow" aria-hidden />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
