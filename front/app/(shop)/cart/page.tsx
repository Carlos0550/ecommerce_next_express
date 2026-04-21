"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart.store";
import { ProductImg, Icon } from "@/components/brand";
import { formatARS } from "@/lib/utils";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const shipping = subtotal > 20000 || subtotal === 0 ? 0 : 1200;
  const total = subtotal + shipping;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-32 pt-4 md:px-10 md:pt-8">
      <h1 className="mb-4 font-grotesk text-[24px] font-semibold tracking-[-0.5px] md:text-[28px]">
        Mi carrito <span className="font-medium text-[var(--color-text-dim)]">({items.length})</span>
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
            <Icon name="cart" size={24} className="text-[var(--color-accent)]" />
          </div>
          <div className="font-grotesk text-[18px] font-semibold">
            Tu carrito está vacío
          </div>
          <p className="text-[13px] text-[var(--color-text-dim)]">
            Sumá productos desde el catálogo.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
          >
            Ver productos
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-2.5">
            {items.map((item, idx) => (
              <div
                key={item.product_id}
                className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
              >
                <div className="h-20 w-20 shrink-0 md:h-24 md:w-24">
                  <ProductImg
                    label={item.title}
                    image={item.image}
                    tone={idx % 2 ? "pink" : "accent"}
                    rounded={12}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{item.title}</div>
                  <div className="mt-1 text-[12px] text-[var(--color-text-dim)]">
                    {formatARS(item.price)} c/u
                  </div>
                  {typeof item.stock === "number" && (
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      Stock: {item.stock}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-grotesk text-[15px] font-semibold">
                      {formatARS(item.price * item.quantity)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(item.product_id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-input)] disabled:opacity-40"
                      >
                        <Icon name="minus" size={12} />
                      </button>
                      <span className="min-w-[20px] text-center font-grotesk text-[13px] font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof item.stock === "number" && item.quantity >= item.stock) {
                            toast.error(`Máximo disponible: ${item.stock}`);
                            return;
                          }
                          setQty(item.product_id, item.quantity + 1);
                        }}
                        disabled={
                          typeof item.stock === "number" && item.quantity >= item.stock
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)] disabled:opacity-40"
                      >
                        <Icon name="plus" size={12} />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.product_id)}
                  className="self-start p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                  aria-label="Quitar"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
              Resumen
            </div>
            <Row label="Subtotal" value={formatARS(subtotal)} />
            <Row
              label="Envío"
              value={shipping === 0 ? "Gratis" : formatARS(shipping)}
            />
            <div className="my-3 h-px bg-[var(--color-border)]" />
            <Row label="Total" value={formatARS(total)} strong />
            <Link
              href="/checkout"
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
            >
              Finalizar compra
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span
        className={
          strong
            ? "text-[14px] font-semibold text-[var(--color-text)]"
            : "text-[13px] text-[var(--color-text-dim)]"
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? "font-grotesk text-[18px] font-semibold"
            : "font-grotesk text-[14px] font-semibold"
        }
      >
        {value}
      </span>
    </div>
  );
}
