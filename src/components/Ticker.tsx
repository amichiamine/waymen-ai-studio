import { useTickerMessageList } from "@/data-provider";

interface TickerProps {
  override?: {
    messages?: string[];
    speed?: "normal" | "slow" | "fast";
  };
}

export function Ticker({ override }: TickerProps = {}) {
  // loading est inerte en mode mock (false dès le premier rendu).
  // En http, si les messages ne sont pas encore chargés on rend null —
  // absence de bandeau défilant vaut mieux que contenu fantôme.
  const { data: tickerMessages, loading } = useTickerMessageList();

  const customMessages =
    override?.messages && override.messages.length > 0
      ? override.messages
      : tickerMessages.map((m) => m.text);

  if (!override?.messages && (loading || tickerMessages.length === 0)) return null;
  if (customMessages.length === 0) return null;

  const items = customMessages;
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
