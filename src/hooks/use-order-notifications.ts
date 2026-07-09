import { useCallback, useState } from "react";

// Version frontend-only : pas d'écoute Supabase realtime.
// L'API reste identique pour rester compatible avec les composants admin.

export type OrderNotification = {
  id: string;
  order_number: string;
  total: number;
  created_at: string;
  read: boolean;
};

export function useOrderNotifications() {
  const [items, setItems] = useState<OrderNotification[]>([]);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((p) => ({ ...p, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const unreadCount = items.reduce((acc, i) => acc + (i.read ? 0 : 1), 0);

  return { items, unreadCount, markAllRead, markRead, clear };
}
