import { useState, useEffect, useCallback } from "react";
import { useConfigStore } from "@/stores/useConfigStore";
import type { CheckoutFormValues} from "@/stores/useCartStore";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { locationService } from "@/services/location.service";
import { cartService } from "@/services/cart.service";
export default function useCart(onClose: () => void) {
  const {
    items,
    total,
    clearCart,
    updateQuantity,
    formValues,
    setFormValues,
    checkout,
  } = useCartStore();
  const { session } = useAuthStore();
  const cart = { items, total };
  const shippingInfoCompleted = (() => {
    if (!formValues.pickup) {
      return Boolean(formValues.name &&
        formValues.email &&
        formValues.phone &&
        formValues.street &&
        formValues.postal_code &&
        formValues.city &&
        formValues.province &&
        formValues.selectedProvinceId &&
        formValues.selectedLocalityId);
    }
    return Boolean(formValues.name && formValues.email && formValues.phone);
  })();
  const [provinces, setProvinces] = useState<{ id: string; nombre: string }[]>(
    [],
  );
  const [localities, setLocalities] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const businessData = useConfigStore((state) => state.bankInfo);
  const isLoadingBankInfo = false;
  const bankInfoError = null;
  const initShipping = useCallback(() => {
    let raw = "{}";
    try {
      raw = localStorage.getItem("shipping_info") || "{}";
    } catch {
      console.warn("[Cart] Error reading shipping_info from localStorage");
    }
    const s = JSON.parse(raw);
    const prev = useCartStore.getState().formValues;
    let nextValues: CheckoutFormValues = {
      ...prev,
      pickup: Boolean(s.pickup),
      name: s.name || "",
      email: s.email || "",
      phone: s.phone || "",
      street: s.street || "",
      postal_code: s.postal_code || "",
      city: s.city || "",
      province: s.province || "",
      selectedProvinceId: "",
      selectedLocalityId: "",
      orderMethod: s.pickup ? "EN_LOCAL" : "TRANSFERENCIA",
      activeStep: 0,
      checkoutOpen: true,
    };
    if (session) {
      const u = session;
      if (!s.name || !s.email) {
        nextValues = {
          ...nextValues,
          name: nextValues.name || u.name || "",
          email: nextValues.email || u.email || "",
        };
      }
    }
    setFormValues(nextValues);
  }, [session, setFormValues]);
  useEffect(() => {
    let isMounted = true;
    const fetchBankInfo = useConfigStore.getState().fetchBankInfo;
    fetchBankInfo();
    (async () => {
      try {
        const list = await locationService.getProvinces();
        if (isMounted) {
          setProvinces(list);
        }
      } catch (err) {
        console.warn("[Cart] Error fetching provinces", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);
  const handleProvinceChange = useCallback(
    async (provId: string) => {
      setFormValues((prev) => ({
        ...prev,
        selectedProvinceId: provId,
        province: provinces.find((x) => x.id === provId)?.nombre || "",
        selectedLocalityId: "",
        city: "",
      }));
      setLocalities([]);
      try {
        const list = await locationService.getLocalities(provId);
        setLocalities(list);
      } catch (err) {
        console.warn("[Cart] Error fetching localities", err);
      }
    },
    [provinces, setFormValues],
  );
  const handleLocalityChange = useCallback(
    (locId: string) => {
      const l = localities.find((x) => x.id === locId);
      setFormValues((prev) => ({
        ...prev,
        selectedLocalityId: locId,
        city: l?.nombre || "",
      }));
    },
    [localities, setFormValues],
  );
  const submitOrder = useCallback(async () => {
    setProcessingOrder(true);
    try {
      const payload = {
        items: items,
        payment_method: formValues.orderMethod,
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
      const rs = await checkout(payload);
      if (rs.ok) {
        if (
          formValues.orderMethod === "TRANSFERENCIA" &&
          receiptFile &&
          rs.order_id
        ) {
          try {
            const up = await cartService.uploadReceipt(
              rs.order_id,
              receiptFile,
            );
            if (!up || (up.status !== 200 && up.status !== 201)) {
            }
          } catch (err) {
            console.warn("[Cart] Error uploading receipt", err);
            alert("La orden fue creada, pero el comprobante no se pudo subir.");
          }
        }
        onClose();
      }
    } catch (err) {
      console.warn("[Cart] Error creating order", err);
    } finally {
      setProcessingOrder(false);
    }
  }, [checkout, items, formValues, receiptFile, onClose]);
  return {
    cart,
    clearCart,
    updateQuantity,
    formValues,
    setFormValues,
    shippingInfoCompleted,
    initShipping,
    provinces,
    localities,
    handleProvinceChange,
    handleLocalityChange,
    submitOrder,
    processingOrder,
    receiptFile,
    setReceiptFile,
    businessData,
    isLoadingBankInfo,
    bankInfoError,
  };
}
