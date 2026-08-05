import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./auth";

// Store frontend-only : panier + favoris persistés en localStorage,
// sans backend. Les signatures async sont préservées pour rester
// compatibles avec les composants existants.

type CartItem = { product_id: string; quantity: number };

type StoreCtx = {
  favorites: Set<string>;
  cart: CartItem[];
  cartCount: number;
  toggleFavorite: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  addToCart: (productId: string, qty?: number) => Promise<void>;
  updateQty: (productId: string, qty: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

const Ctx = createContext<StoreCtx | null>(null);

const FAV_KEY = "ka-favorites";
const CART_KEY = "ka-cart";

function loadFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(FAV_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setFavorites(new Set(loadFavs()));
    setCart(loadCart());
  }, []);

  const persistFavs = useCallback((s: Set<string>) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FAV_KEY, JSON.stringify([...s]));
    }
  }, []);
  const persistCart = useCallback((c: CartItem[]) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_KEY, JSON.stringify(c));
    }
  }, []);

  const requireAuth = () => {
    if (!user) {
      toast.error("Veuillez vous connecter d'abord");
      return false;
    }
    return true;
  };

  const toggleFavorite = async (productId: string) => {
    if (!requireAuth()) return;
    setFavorites((prev) => {
      const n = new Set(prev);
      if (n.has(productId)) n.delete(productId);
      else n.add(productId);
      persistFavs(n);
      return n;
    });
  };

  const addToCart = async (productId: string, qty = 1) => {
    if (!requireAuth()) return;
    setCart((prev) => {
      const i = prev.findIndex((c) => c.product_id === productId);
      let next: CartItem[];
      if (i >= 0) {
        next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
      } else {
        next = [...prev, { product_id: productId, quantity: qty }];
      }
      persistCart(next);
      return next;
    });
  };

  const updateQty = async (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart((prev) => {
      const next = prev.map((c) => (c.product_id === productId ? { ...c, quantity: qty } : c));
      persistCart(next);
      return next;
    });
  };

  const removeFromCart = async (productId: string) => {
    setCart((prev) => {
      const next = prev.filter((c) => c.product_id !== productId);
      persistCart(next);
      return next;
    });
  };

  const clearCart = async () => {
    setCart([]);
    persistCart([]);
  };

  return (
    <Ctx.Provider
      value={{
        favorites,
        cart,
        cartCount: cart.reduce((a, c) => a + c.quantity, 0),
        toggleFavorite,
        isFavorite: (id) => favorites.has(id),
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be inside StoreProvider");
  return c;
};
