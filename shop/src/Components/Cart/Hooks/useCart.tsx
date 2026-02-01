"use client";

import { useCallback } from "react";
import { Products } from "@/Api/useProducts";
import { useAppContext } from "@/providers/AppContext";
import { showNotification } from "@mantine/notifications";
import type { SelectedOption } from "@/providers/useCart";

export function useCartActions() {
  const {
    cart: { addProductIntoCart },
    utils: { baseUrl },
  } = useAppContext();

  const validateProductStock = useCallback(
    async (product_id: string): Promise<Products | null> => {
      try {
        const res = await fetch(`${baseUrl}/products/public/${product_id}`, {
          next: { revalidate: 60 },
        });
        if (!res.ok) {
          showNotification({
            title: "Producto no encontrado",
            message: "Quizás el producto no exista o haya sido removido temporalmente.",
            autoClose: 3000,
            color: "yellow",
          });
          return null;
        }
        const json = await res.json().catch(() => null);
        const product: Products | null = (json?.data?.product ||
          json?.data ||
          json ||
          null) as Products | null;
        if (!product) {
          showNotification({
            title: "Error al obtener información del producto",
            message: "Quizás el producto no exista o haya sido removido temporalmente.",
            autoClose: 3000,
            color: "yellow",
          });
          return null;
        }
        if (product.stock <= 0) {
          showNotification({
            title: "Producto agotado",
            message: "El producto se encuentra agotado en stock.",
            autoClose: 3000,
            color: "yellow",
          });
          return null;
        }
        return product;
      } catch (err) {
        console.warn("[Cart] Error validating stock", err);
        showNotification({
          title: "Error de conexión",
          message: "No se pudo validar el stock del producto.",
          autoClose: 3000,
          color: "red",
        });
        return null;
      }
    },
    [baseUrl]
  );

  const addToCart = useCallback(
    async (product_id: string, options: SelectedOption[] = []) => {
      const productInfo = await validateProductStock(product_id);

      if (!productInfo) return;

      addProductIntoCart({
        product_id: productInfo.id,
        product_name: productInfo.title,
        price: productInfo.price,
        quantity: 1,
        image_url: productInfo.images[0] || "",
        price_changed: false,
        options,
      });

      showNotification({
        title: "Producto agregado",
        message: "El producto se ha agregado al carrito.",
        autoClose: 3000,
        color: "green",
      });
    },
    [validateProductStock, addProductIntoCart]
  );

  return { addToCart, validateProductStock };
}
