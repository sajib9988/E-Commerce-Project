"use client";

import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItemInput = {
  productId: string;
  /** Required when a product is purchased through a size/color variant. */
  variantId?: string;
  /** Human-readable size/color label; never send this instead of variantId. */
  variantLabel?: string;
  name: string;
  imageUrl?: string | null;
  /** Display-only price snapshot. The backend must calculate the real order price. */
  unitPrice: number;
  quantity?: number;
};

export type CartItem = {
  /** Stable key for one product + variant combination. */
  id: string;
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
};

type CartStoreState = {
  items: CartItem[];
  hasHydrated: boolean;
};

type CartStoreActions = {
  addItem: (input: CartItemInput) => void;
  removeItem: (itemId: string) => void;
  setItemQuantity: (itemId: string, quantity: number) => void;
  increaseItem: (itemId: string) => void;
  decreaseItem: (itemId: string) => void;
  clearCart: () => void;
  setHasHydrated: (value: boolean) => void;
};

export type CartStore = CartStoreState & CartStoreActions;

const STORAGE_NAME = "ecommerce-cart";
const STORAGE_VERSION = 1;

function getCartItemId(productId: string, variantId?: string) {
  return variantId ? `${productId}::${variantId}` : productId;
}

/**
 * localStorage is user-controlled and may contain stale or malformed JSON.
 * Validate persisted records before they enter the live store.
 */
function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): CartItem[] => {
    if (typeof entry !== "object" || entry === null) return [];

    const item = entry as Partial<CartItem>;
    if (
      typeof item.productId !== "string" ||
      !item.productId ||
      typeof item.name !== "string" ||
      !Number.isFinite(item.unitPrice) ||
      Number(item.unitPrice) < 0 ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) < 1
    ) {
      return [];
    }

    const variantId =
      typeof item.variantId === "string" && item.variantId
        ? item.variantId
        : undefined;

    return [{
      id: getCartItemId(item.productId, variantId),
      productId: item.productId,
      ...(variantId ? { variantId } : {}),
      ...(typeof item.variantLabel === "string" && item.variantLabel ? { variantLabel: item.variantLabel } : {}),
      name: item.name,
      imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
    }];
  });
}

export function createCartStore() {
  return createStore<CartStore>()(
    persist(
      (set, get) => ({
        items: [],
        hasHydrated: false,

        addItem: (input) => {
          const productId = input.productId.trim();
          const name = input.name.trim();
          const quantity = input.quantity ?? 1;

          if (
            !productId ||
            !name ||
            !Number.isFinite(input.unitPrice) ||
            input.unitPrice < 0 ||
            !Number.isInteger(quantity) ||
            quantity < 1
          ) {
            return;
          }

          const variantId = input.variantId?.trim() || undefined;
          const id = getCartItemId(productId, variantId);

          set((state) => {
            const existing = state.items.find((item) => item.id === id);

            if (existing) {
              return {
                items: state.items.map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        name,
                        ...(input.variantLabel ? { variantLabel: input.variantLabel } : {}),
                        imageUrl: input.imageUrl ?? item.imageUrl,
                        unitPrice: input.unitPrice,
                        quantity: item.quantity + quantity,
                      }
                    : item,
                ),
              };
            }

            const newItem: CartItem = {
              id,
              productId,
              ...(variantId ? { variantId } : {}),
              ...(input.variantLabel ? { variantLabel: input.variantLabel } : {}),
              name,
              imageUrl: input.imageUrl ?? null,
              unitPrice: input.unitPrice,
              quantity,
            };

            return { items: [...state.items, newItem] };
          });
        },

        removeItem: (itemId) =>
          set((state) => ({
            items: state.items.filter((item) => item.id !== itemId),
          })),

        setItemQuantity: (itemId, quantity) => {
          if (!Number.isInteger(quantity)) return;

          if (quantity <= 0) {
            get().removeItem(itemId);
            return;
          }

          set((state) => ({
            items: state.items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item,
            ),
          }));
        },

        increaseItem: (itemId) => {
          const item = get().items.find((entry) => entry.id === itemId);
          if (item) get().setItemQuantity(itemId, item.quantity + 1);
        },

        decreaseItem: (itemId) => {
          const item = get().items.find((entry) => entry.id === itemId);
          if (item) get().setItemQuantity(itemId, item.quantity - 1);
        },

        clearCart: () => set({ items: [] }),

        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: STORAGE_NAME,
        version: STORAGE_VERSION,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ items: state.items }),
        merge: (persistedState, currentState) => {
          const persisted = persistedState as { items?: unknown } | undefined;

          return {
            ...currentState,
            items: sanitizeCartItems(persisted?.items),
          };
        },
        // Next.js SSR must render the same initial cart on server and client.
        // The provider rehydrates from localStorage after the client mounts.
        skipHydration: true,
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      },
    ),
  );
}

export type CartStoreApi = ReturnType<typeof createCartStore>;

export const selectCartItemCount = (state: CartStore) =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartSubtotal = (state: CartStore) =>
  state.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
