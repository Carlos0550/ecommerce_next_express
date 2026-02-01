import { useCallback, useEffect, useState, useRef } from "react";
import { showNotification } from "@mantine/notifications";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export type SelectedOption = { name: string; value: string };

export type CartItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url: string;
  price_changed: boolean;
  options?: SelectedOption[];
};

export type Cart = {
  items: CartItem[];
  total: number;
  promo_code?: string;
  discount?: number;
  promo_title?: string;
};

function areOptionsEqual(a?: SelectedOption[] | null, b?: SelectedOption[] | null) {
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

const INITIAL_FORM_VALUES: CheckoutFormValues = {
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

function useCart(baseUrl: string, token: string | null) {
  const [cart, setCart] = useState<Cart>({
    items: [],
    total: 0,
    promo_code: "",
    discount: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [formValues, setFormValues] = useState<CheckoutFormValues>(INITIAL_FORM_VALUES);

  const cartRef = useRef(cart);
  cartRef.current = cart;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shop_cart");
      if (raw) {
        const parsed = JSON.parse(raw);
        setCart({
          items: Array.isArray(parsed.items) ? parsed.items : [],
          total: Number(parsed.total) || 0,
          promo_code: parsed.promo_code || "",
          discount: Number(parsed.discount) || 0,
          promo_title: parsed.promo_title || "",
        });
      }
    } catch (e) {
      console.error("[Cart] Error loading from localStorage", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const addProductIntoCart = useCallback(
    async (product: CartItem) => {
      const currentCart = cartRef.current;
      let newCart: Cart;
      const existingItem = currentCart.items.find(
        (item) =>
          item.product_id === product.product_id && areOptionsEqual(item.options, product.options)
      );
      const qtyToAdd = product.quantity > 0 ? product.quantity : 1;

      if (existingItem) {
        const updatedItems = currentCart.items.map((item) =>
          item.product_id === product.product_id && areOptionsEqual(item.options, product.options)
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        );
        const newSubtotal = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const newTotal = currentCart.discount
          ? Math.max(0, newSubtotal - currentCart.discount)
          : newSubtotal;
        newCart = { ...currentCart, items: updatedItems, total: newTotal };
      } else {
        const newItems = [...currentCart.items, { ...product, quantity: qtyToAdd }];
        const newTotal = newItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        newCart = { ...currentCart, items: newItems, total: newTotal };
      }
      setCart(newCart);

      if (token) {
        try {
          await fetchWithTimeout(`${baseUrl}/cart/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              product_id: product.product_id,
              quantity: qtyToAdd,
              options: product.options,
            }),
            timeout: 5000,
          });
        } catch (e) {
          console.warn("[Cart] Error syncing add", e);
        }
      }
    },
    [token, baseUrl]
  );

  const removeProductFromCart = useCallback(
    async (product_id: string) => {
      const currentCart = cartRef.current;
      const newItems = currentCart.items.filter((item) => item.product_id !== product_id);
      const newSubtotal = newItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const newTotal = currentCart.discount
        ? Math.max(0, newSubtotal - currentCart.discount)
        : newSubtotal;

      setCart({ ...currentCart, items: newItems, total: newTotal });

      if (token) {
        try {
          await fetchWithTimeout(`${baseUrl}/cart/items/${product_id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });
        } catch (e) {
          console.warn("[Cart] Error syncing remove", e);
        }
      }
    },
    [token, baseUrl]
  );

  const validatePromoCode = useCallback(
    async (code: string, baseUrlParam: string) => {
      if (!code || code.trim().length === 0) {
        return { ok: false, error: "code_required" };
      }
      try {
        const currentCart = cartRef.current;
        const items = currentCart.items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
        }));
        const res = await fetchWithTimeout(`${baseUrlParam}/promos/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code.trim().toUpperCase(),
            items,
            total: currentCart.total,
          }),
          timeout: 5000,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          return { ok: false, error: json.error || "validation_failed" };
        }
        return { ok: true, ...json };
      } catch {
        return { ok: false, error: "network_error" };
      }
    },
    []
  );

  const applyPromoCode = useCallback(
    async (code: string, baseUrlParam: string) => {
      const result = await validatePromoCode(code, baseUrlParam);
      if (!result.ok) {
        return result;
      }
      const currentCart = cartRef.current;
      const subtotal = currentCart.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
      const discount = result.discount || 0;
      const newTotal = Math.max(0, subtotal - discount);
      setCart({
        ...currentCart,
        promo_code: code.trim().toUpperCase(),
        discount: discount,
        promo_title: result.promo?.title || "",
        total: newTotal,
      });
      return { ok: true, ...result };
    },
    [validatePromoCode]
  );

  const removePromoCode = useCallback(() => {
    const currentCart = cartRef.current;
    const originalTotal = currentCart.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    setCart({
      ...currentCart,
      promo_code: "",
      discount: 0,
      promo_title: "",
      total: originalTotal,
    });
  }, []);

  const clearCart = useCallback(async () => {
    const currentCart = cartRef.current;
    setCart({
      ...currentCart,
      items: [],
      total: 0,
      promo_code: "",
      discount: 0,
      promo_title: "",
    });

    if (token) {
      try {
        await fetchWithTimeout(`${baseUrl}/cart`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
      } catch (e) {
        console.warn("[Cart] Error syncing clear", e);
      }
    }
  }, [token, baseUrl]);

  const updateQuantity = useCallback(
    async (product_id: string, quantity: number, options?: SelectedOption[]) => {
      const currentCart = cartRef.current;

      if (quantity <= 0) {
        const items = currentCart.items.filter(
          (item) =>
            !(
              item.product_id === product_id &&
              (options ? areOptionsEqual(item.options, options) : true)
            )
        );
        const newSubtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const newTotal = currentCart.discount
          ? Math.max(0, newSubtotal - currentCart.discount)
          : newSubtotal;
        setCart({ ...currentCart, items, total: newTotal });

        if (token) {
          try {
            await fetchWithTimeout(`${baseUrl}/cart/items/${product_id}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ options }),
              timeout: 5000,
            });
          } catch (e) {
            console.warn("[Cart] Error syncing remove", e);
          }
        }
      } else {
        const items = currentCart.items.map((item) =>
          item.product_id === product_id &&
          (options ? areOptionsEqual(item.options, options) : true)
            ? { ...item, quantity }
            : item
        );
        const newSubtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const newTotal = currentCart.discount
          ? Math.max(0, newSubtotal - currentCart.discount)
          : newSubtotal;
        setCart({ ...currentCart, items, total: newTotal });

        if (token) {
          try {
            await fetchWithTimeout(`${baseUrl}/cart/items/${product_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ quantity, options }),
              timeout: 5000,
            });
          } catch (e) {
            console.warn("[Cart] Error syncing update", e);
          }
        }
      }
    },
    [token, baseUrl]
  );

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem("shop_cart", JSON.stringify(cart));
    } catch {
      console.warn("[Cart] Error saving to localStorage");
    }
  }, [cart, isInitialized]);

  const processOrder = useCallback(
    async (baseUrlParam: string, tokenParam: string | null) => {
      const currentCart = cartRef.current;
      const items = currentCart.items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        options: it.options,
      }));
      if (items.length === 0) {
        showNotification({
          title: "Carrito vacío",
          message: "No hay productos para procesar la orden.",
          color: "yellow",
          autoClose: 3000,
        });
        return { ok: false };
      }
      const payload = {
        items,
        payment_method: formValues.orderMethod,
        promo_code: currentCart.promo_code || undefined,
        customer: {
          name: formValues.name,
          email: formValues.email,
          phone: formValues.phone,
          street: formValues.street,
          postal_code: formValues.postal_code,
          city: formValues.city,
          province: formValues.province,
          pickup: formValues.pickup,
        },
      };
      try {
        const res = await fetchWithTimeout(`${baseUrlParam}/orders/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(tokenParam ? { Authorization: `Bearer ${tokenParam}` } : {}),
          },
          body: JSON.stringify(payload),
          timeout: 15000,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          showNotification({
            title: "Pago fallido",
            message: "No se pudo procesar la orden.",
            color: "red",
            autoClose: 3000,
          });
          return { ok: false };
        }
        try {
          localStorage.setItem(
            "shipping_info",
            JSON.stringify({
              name: formValues.name,
              email: formValues.email,
              phone: formValues.phone,
              street: formValues.street,
              postal_code: formValues.postal_code,
              city: formValues.city,
              province: formValues.province,
              pickup: formValues.pickup,
            })
          );
        } catch {
          console.warn("[Cart] Error saving shipping info");
        }
        await clearCart();
        setFormValues(INITIAL_FORM_VALUES);
        showNotification({
          title: "Pago confirmado",
          message: "Tu compra fue procesada correctamente.",
          color: "green",
          autoClose: 3000,
        });
        return { ok: true, order_id: json?.order_id, total: json?.total };
      } catch {
        showNotification({
          title: "Error de conexión",
          message: "No se pudo contactar al servidor.",
          color: "red",
          autoClose: 3000,
        });
        return { ok: false };
      }
    },
    [formValues, clearCart]
  );

  const syncWithServer = useCallback(
    async (baseUrlParam: string, tokenParam: string | null) => {
      if (!tokenParam) return;
      const currentCart = cartRef.current;
      const items = currentCart.items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        price: it.price,
        options: it.options,
      }));
      try {
        if (items.length > 0) {
          await fetchWithTimeout(`${baseUrlParam}/cart/merge`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenParam}` },
            body: JSON.stringify({ items }),
            timeout: 5000,
          });
        }
        const res = await fetchWithTimeout(`${baseUrlParam}/cart`, {
          headers: { Authorization: `Bearer ${tokenParam}` },
          timeout: 5000,
        });
        const json = await res.json().catch(() => null);
        const serverCart = json?.cart;
        if (serverCart && Array.isArray(serverCart.items)) {
          const mappedItems: CartItem[] = serverCart.items.map(
            (it: {
              productId: string;
              product?: { title?: string; price?: number; images?: string[] };
              quantity?: number;
              price_has_changed?: boolean;
              selected_options?: SelectedOption[];
            }) => ({
              product_id: it.productId,
              product_name: it.product?.title || "",
              price: Number(it.product?.price) || 0,
              quantity: Number(it.quantity) || 1,
              image_url: Array.isArray(it.product?.images) ? it.product?.images?.[0] || "" : "",
              price_changed: !!it.price_has_changed,
              options: it.selected_options || [],
            })
          );
          const subtotal = mappedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
          const total = currentCart.discount
            ? Math.max(0, subtotal - currentCart.discount)
            : subtotal;
          setCart({
            items: mappedItems,
            total,
            promo_code: currentCart.promo_code,
            discount: currentCart.discount,
            promo_title: currentCart.promo_title,
          });
        }
      } catch (e) {
        console.warn("[Cart] Error syncing with server", e);
      }
    },
    []
  );

  return {
    cart,
    formValues,
    setFormValues,
    addProductIntoCart,
    removeProductFromCart,
    clearCart,
    updateQuantity,
    syncWithServer,
    processOrder,
    validatePromoCode,
    applyPromoCode,
    removePromoCode,
  };
}

export default useCart;
