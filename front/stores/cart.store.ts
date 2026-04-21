"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/types";

export interface LocalCartItem {
  product_id: number;
  quantity: number;
  // snapshot mínimo para render offline
  title: string;
  price: number;
  image?: string;
  stock?: number;
}

interface CartState {
  items: LocalCartItem[];
  add: (p: Product, qty?: number) => void;
  setQty: (product_id: number, qty: number) => void;
  remove: (product_id: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

const capToStock = (qty: number, stock?: number) =>
  typeof stock === "number" ? Math.min(qty, Math.max(0, stock)) : qty;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (p, qty = 1) => {
        const items = [...get().items];
        const idx = items.findIndex((i) => i.product_id === p.id);
        const price = Number(p.price) || 0;
        const stock = typeof p.stock === "number" ? p.stock : undefined;
        if (idx >= 0) {
          const nextQty = capToStock(items[idx].quantity + qty, stock);
          items[idx] = { ...items[idx], quantity: nextQty, stock };
        } else {
          items.push({
            product_id: p.id,
            quantity: capToStock(qty, stock),
            title: p.title,
            price,
            image: p.images?.[0]?.url,
            stock,
          });
        }
        set({ items: items.filter((i) => i.quantity > 0) });
      },
      setQty: (id, qty) => {
        const items = get()
          .items.map((i) =>
            i.product_id === id
              ? { ...i, quantity: capToStock(Math.max(1, qty), i.stock) }
              : i,
          )
          .filter((i) => i.quantity > 0);
        set({ items });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.product_id !== id) }),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.price * i.quantity, 0),
    }),
    { name: "cinnamon-cart" }
  )
);
