"use client";
import { useEffect, useMemo, useState } from "react";
import { useAdminStore } from "@/stores/useAdminStore";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";
import { Icon } from "@/Components/ui/Icon";
import { Chip } from "@/Components/ui/Chip";
import { Card } from "@/Components/ui/Card";
import { QtyStepper } from "@/Components/ui/QtyStepper";
import { ProductImg } from "@/Components/ui/ProductImg";
import { showNotification } from "@mantine/notifications";
import type { AdminProduct } from "@/stores/useAdminStore";

type CartLine = { product: AdminProduct; qty: number };
type PaymentMethod = "EFECTIVO" | "TARJETA" | "QR" | "TRANSFERENCIA";

const PAY_METHODS: { value: PaymentMethod; label: string; icon: "cash" | "card" | "wallet" }[] = [
  { value: "EFECTIVO", label: "Efectivo", icon: "cash" },
  { value: "TARJETA", label: "Tarjeta", icon: "card" },
  { value: "QR", label: "QR", icon: "wallet" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: "wallet" },
];

export default function POSView() {
  const t = usePaletteTokens();
  const {
    products,
    categories,
    fetchProducts,
    fetchCategories,
    saveSale,
  } = useAdminStore();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>("EFECTIVO");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts({ limit: 100, isActive: true });
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return p.is_active && p.stock > 0;
    });
  }, [products, search, categoryId]);

  const addProduct = (p: AdminProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        if (existing.qty >= p.stock) {
          showNotification({ message: "Sin stock suficiente", color: "yellow" });
          return prev;
        }
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product.id !== id)
        : prev.map((l) => (l.product.id === id ? { ...l, qty } : l)),
    );
  };

  const total = cart.reduce((s, l) => s + l.product.price * l.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showNotification({ message: "Carrito vacío", color: "yellow" });
      return;
    }
    setSubmitting(true);
    try {
      await saveSale({
        payment_method: payment,
        source: "CAJA",
        product_ids: cart.flatMap((l) => Array(l.qty).fill(l.product.id)),
        items: cart.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
        payment_methods: [{ method: payment, amount: total }],
        skipStockDecrement: false,
      });
      setCart([]);
      fetchProducts({ limit: 100, isActive: true });
    } catch {
      /* notification handled by store */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: 20,
        padding: 20,
        minHeight: "calc(100vh - 60px)",
      }}
      className="pos-grid"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            background: t.bgInput,
            border: `1px solid ${t.border}`,
            borderRadius: 999,
            padding: "0 16px",
            height: 44,
          }}
        >
          <Icon name="search" size={16} color={t.textDim} />
          <input
            placeholder="Buscar producto por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              color: t.text,
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          <Chip active={!categoryId} onClick={() => setCategoryId("")}>
            Todos
          </Chip>
          {(categories || []).map((c) => (
            <Chip
              key={c.id}
              active={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
            >
              {c.title}
            </Chip>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((p) => (
            <Card
              key={p.id}
              padding={10}
              onClick={() => addProduct(p)}
              style={{ cursor: "pointer" }}
            >
              <ProductImg
                src={p.images?.[0]}
                label={p.title.slice(0, 14)}
                rounded={10}
              />
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginTop: 10,
                  color: t.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.title}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: t.accent,
                    fontFamily: "var(--font-grotesk), system-ui, sans-serif",
                  }}
                >
                  ${p.price.toLocaleString("es-AR")}
                </span>
                <span style={{ fontSize: 10, color: t.textDim }}>
                  Stock {p.stock}
                </span>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div style={{ color: t.textDim, padding: 40, textAlign: "center", gridColumn: "1/-1" }}>
              Sin productos para mostrar
            </div>
          )}
        </div>
      </div>

      <Card padding={20} style={{ position: "sticky", top: 20, height: "fit-content", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "var(--font-grotesk), system-ui, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 16,
            color: t.text,
          }}
        >
          Ticket actual
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {cart.length === 0 && (
            <div style={{ color: t.textDim, fontSize: 13, textAlign: "center", padding: 30 }}>
              Agregá productos haciendo click en la grilla
            </div>
          )}
          {cart.map((l) => (
            <div
              key={l.product.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 10,
                background: t.bgInput,
                borderRadius: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {l.product.title}
                </div>
                <div style={{ fontSize: 11, color: t.textDim }}>
                  ${l.product.price.toLocaleString("es-AR")} c/u
                </div>
              </div>
              <QtyStepper
                value={l.qty}
                onChange={(v) => updateQty(l.product.id, v)}
                max={l.product.stock}
                size="sm"
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.textDim, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>
            Método de pago
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
            {PAY_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPayment(m.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: payment === m.value ? t.accent : t.bgInput,
                  color: payment === m.value ? t.buttonText : t.text,
                  border: `1px solid ${payment === m.value ? t.accent : t.border}`,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  justifyContent: "center",
                }}
              >
                <Icon name={m.icon} size={14} color={payment === m.value ? t.buttonText : t.text} />
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: t.textDim }}>Total</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: "var(--font-grotesk), system-ui, sans-serif" }}>
              ${total.toLocaleString("es-AR")}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={submitting || cart.length === 0}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 999,
              background: t.accent,
              color: t.buttonText,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting || cart.length === 0 ? "not-allowed" : "pointer",
              opacity: submitting || cart.length === 0 ? 0.5 : 1,
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            {submitting ? "Procesando..." : "Cobrar"}
          </button>
        </div>
      </Card>

      <style jsx global>{`
        @media (max-width: 900px) {
          .pos-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
