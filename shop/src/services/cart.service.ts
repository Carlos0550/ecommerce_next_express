import { api } from "@/config/api";
export interface SelectedOption {
  name: string;
  value: string;
}
export interface CartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url: string;
  price_changed: boolean;
  options?: SelectedOption[];
}
export interface CheckoutData {
  items: CartItem[];
  payment_method: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    street: string;
    postal_code: string;
    city: string;
    province: string;
    pickup: boolean;
  };
}
export const cartService = {
  addItem: async (
    product_id: string,
    quantity: number,
    options?: SelectedOption[],
  ) => {
    return api.post("/cart/items", { product_id, quantity, options });
  },
  removeItem: async (product_id: string) => {
    return api.delete(`/cart/items/${product_id}`);
  },
  updateItem: async (
    product_id: string,
    quantity: number,
    options?: SelectedOption[],
  ) => {
    return api.patch(`/cart/items/${product_id}`, { quantity, options });
  },
  clearCart: async () => {
    return api.delete("/cart");
  },
  mergeCart: async (items: CartItem[]) => {
    return api.post("/cart/merge", { items });
  },
  getCart: async () => {
    return api.get("/cart");
  },
  createOrder: async (data: CheckoutData) => {
    return api.post("/orders/create", data);
  },
  uploadReceipt: async (orderId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/orders/${orderId}/receipt`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
