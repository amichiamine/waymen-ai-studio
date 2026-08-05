import { useEffect, useRef } from "react";

export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(opts: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}) {
  const { hasMore, loading, onLoadMore, rootMargin = "300px" } = opts;
  const ref = useRef<T | null>(null);
  const cbRef = useRef(onLoadMore);
  cbRef.current = onLoadMore;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || loading) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) cbRef.current();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, rootMargin]);

  return ref;
}
