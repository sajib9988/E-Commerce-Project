"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";

import {
  createCartStore,
  type CartStore,
  type CartStoreApi,
} from "@/store/cart.store";

const CartStoreContext = createContext<CartStoreApi | null>(null);

export function CartStoreProvider({ children }: { children: ReactNode }) {
  // One store instance per provider tree; never share mutable store state
  // between separate Next.js server requests.
  const [store] = useState(() => createCartStore());

  useEffect(() => {
    void store.persist.rehydrate();
  }, [store]);

  return (
    <CartStoreContext.Provider value={store}>
      {children}
    </CartStoreContext.Provider>
  );
}

export function useCartStore<T>(selector: (state: CartStore) => T): T {
  const store = useContext(CartStoreContext);

  if (!store) {
    throw new Error("useCartStore must be used inside CartStoreProvider");
  }

  return useStore(store, selector);
}
