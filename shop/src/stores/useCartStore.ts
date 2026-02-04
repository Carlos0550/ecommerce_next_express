import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  cartService,
  CartItem,
  SelectedOption,
  CheckoutData,
} from "@/services/cart.service";
import { useAuthStore } from "./useAuthStore";
export type OrderMethod = "EN_LOCAL" | "TRANSFERENCIA";
export type CheckoutFormValues = {
  pickup: boolean;
  name: string;
  email: string;
  phone: string;
  street: string;
  postal_code: string;
  city: string;
  province: string;
  selectedProvinceId: string;
  selectedLocalityId: string;
  orderMethod: OrderMethod;
  activeStep: number;
  checkoutOpen: boolean;
};
export const INITIAL_FORM_VALUES: CheckoutFormValues = {
  pickup: false,
  name: "",
  email: "",
  phone: "",
  street: "",
  postal_code: "",
  city: "",
  province: "",
  selectedProvinceId: "",
  selectedLocalityId: "",
  orderMethod: "EN_LOCAL",
  activeStep: 0,
  checkoutOpen: false,
};
function areOptionsEqual(
  a?: SelectedOption[] | null,
  b?: SelectedOption[] | null,
) {
  if (!a?.length && !b?.length) return true;
  if (!a || !b) return false;
  const sortedA = [...a].sort((x, y) => x.name.localeCompare(y.name));
  const sortedB = [...b].sort((x, y) => x.name.localeCompare(y.name));
  if (sortedA.length !== sortedB.length) return false;
  for (let i = 0; i < sortedA.length; i++) {
    const ax = sortedA[i];
    const bx = sortedB[i];
    if (ax.name !== bx.name || ax.value !== bx.value) return false;
  }
  return true;
}
interface CartState {
  items: CartItem[];
  total: number;
  isOpen: boolean;
  formValues: CheckoutFormValues;
  addItem: (product: CartItem) => Promise<void>;
  removeItem: (product_id: string) => Promise<void>;
  updateQuantity: (
    product_id: string,
    quantity: number,
    options?: SelectedOption[],
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  toggleCart: () => void;
  setFormValues: (
    values:
      | CheckoutFormValues
      | ((prev: CheckoutFormValues) => CheckoutFormValues),
  ) => void;
  checkout: (
    data: CheckoutData,
  ) => Promise<{ ok: boolean; order_id?: string; total?: number }>;
}
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      isOpen: false,
      formValues: INITIAL_FORM_VALUES,
      addItem: async (product) => {
        const { items } = get();
        const existingItem = items.find(
          (item) =>
            item.product_id === product.product_id &&
            areOptionsEqual(item.options, product.options),
        );
        const qtyToAdd = product.quantity > 0 ? product.quantity : 1;
        let newItems: CartItem[];
        if (existingItem) {
          newItems = items.map((item) =>
            item.product_id === product.product_id &&
            areOptionsEqual(item.options, product.options)
              ? { ...item, quantity: item.quantity + qtyToAdd }
              : item,
          );
        } else {
          newItems = [...items, { ...product, quantity: qtyToAdd }];
        }
        const newTotal = newItems.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0,
        );
        set({ items: newItems, total: newTotal });
        if (useAuthStore.getState().isAuthenticated) {
          try {
            await cartService.addItem(
              product.product_id,
              qtyToAdd,
              product.options,
            );
          } catch (error) {
            console.warn("Failed to sync add item", error);
          }
        }
      },
      removeItem: async (product_id) => {
        const { items } = get();
        const newItems = items.filter((item) => item.product_id !== product_id);
        const newTotal = newItems.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0,
        );
        set({ items: newItems, total: newTotal });
        if (useAuthStore.getState().isAuthenticated) {
          try {
            await cartService.removeItem(product_id);
          } catch (error) {
            console.warn("Failed to sync remove item", error);
          }
        }
      },
      updateQuantity: async (product_id, quantity, options) => {
        const { items } = get();
        if (quantity <= 0) {
          const newItems = items.filter(
            (item) =>
              !(
                item.product_id === product_id &&
                (options ? areOptionsEqual(item.options, options) : true)
              ),
          );
          const newTotal = newItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0,
          );
          set({ items: newItems, total: newTotal });
          if (useAuthStore.getState().isAuthenticated) {
            try {
              await cartService.removeItem(product_id); 
            } catch (error) {
              console.warn("Failed to sync remove item", error);
            }
          }
        } else {
          const newItems = items.map((item) =>
            item.product_id === product_id &&
            (options ? areOptionsEqual(item.options, options) : true)
              ? { ...item, quantity }
              : item,
          );
          const newTotal = newItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0,
          );
          set({ items: newItems, total: newTotal });
          if (useAuthStore.getState().isAuthenticated) {
            try {
              await cartService.updateItem(product_id, quantity, options);
            } catch (error) {
              console.warn("Failed to sync update item", error);
            }
          }
        }
      },
      clearCart: async () => {
        set({ items: [], total: 0 });
        if (useAuthStore.getState().isAuthenticated) {
          try {
            await cartService.clearCart();
          } catch (error) {
            console.warn("Failed to sync clear cart", error);
          }
        }
      },
      syncWithServer: async () => {
        if (!useAuthStore.getState().isAuthenticated) return;
        const { items } = get();
        try {
          if (items.length > 0) {
            await cartService.mergeCart(items);
          }
          const { data } = await cartService.getCart();
          const serverCart = data.cart;
          if (serverCart && Array.isArray(serverCart.items)) {
            const mappedItems: CartItem[] = serverCart.items.map(
              (it: {
                productId: string;
                quantity: number | string;
                price_has_changed?: boolean;
                selected_options?: SelectedOption[];
                product?: {
                  title?: string;
                  price?: number | string;
                  images?: string[];
                };
              }) => ({
                product_id: it.productId,
                product_name: it.product?.title || "",
                price: Number(it.product?.price) || 0,
                quantity: Number(it.quantity) || 1,
                image_url: Array.isArray(it.product?.images)
                  ? it.product?.images?.[0] || ""
                  : "",
                price_changed: !!it.price_has_changed,
                options: it.selected_options || [],
              }),
            );
            const subtotal = mappedItems.reduce(
              (acc, item) => acc + item.price * item.quantity,
              0,
            );
            set({ items: mappedItems, total: subtotal });
          }
        } catch (error) {
          console.warn("Failed to sync with server", error);
        }
      },
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setFormValues: (values) => {
        set((state) => ({
          formValues:
            typeof values === "function" ? values(state.formValues) : values,
        }));
      },
      checkout: async (data: CheckoutData) => {
        try {
          const res = await cartService.createOrder(data);
          if (res.data && res.data.ok) {
            await get().clearCart();
            set({ formValues: INITIAL_FORM_VALUES });
            return {
              ok: true,
              order_id: res.data.order_id,
              total: res.data.total,
            };
          }
          return { ok: false };
        } catch (error) {
          console.error("Checkout failed", error);
          return { ok: false };
        }
      },
    }),
    {
      name: "shop_cart",
      partialize: (state) => ({
        items: state.items,
        total: state.total,
        formValues: state.formValues,
      }),
    },
  ),
);
