"use client";

import { forwardRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { Icon } from "@/components/brand";
import { formatARS, cn } from "@/lib/utils";

const Schema = z.object({
  name: z.string().min(2, "Requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  street: z.string().min(3, "Requerido"),
  city: z.string().min(2, "Requerido"),
  postal_code: z.string().min(3, "Requerido"),
});
type Input = z.infer<typeof Schema>;

const PAYMENTS = [
  { k: "TRANSFERENCIA", label: "Transferencia", icon: "wallet" as const, sub: "CBU al confirmar" },
  { k: "EFECTIVO", label: "Efectivo", icon: "cash" as const, sub: "Paga al retirar" },
  { k: "MERCADOPAGO", label: "Mercado Pago", icon: "receipt" as const, sub: "Hasta 12 cuotas" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const [method, setMethod] = useState(PAYMENTS[0].k);

  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const shipping = subtotal > 20000 ? 0 : 1200;
  const total = subtotal + shipping;

  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      street: user?.address ?? "",
      city: "",
      postal_code: "",
    },
  });

  const createMut = useMutation({
    mutationFn: async (customer: Input) => {
      const { data } = await api.post("/orders/create", {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: method,
        customer,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("¡Orden creada!");
      clear();
      router.push("/orders");
    },
    onError: (err) => {
      const msg = unwrapError(err);
      toast.error(msg === "rate_limit_exceeded" ? "Demasiados pedidos. Intentá más tarde." : msg);
    },
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[600px] px-4 pt-16 text-center">
        <p className="text-[14px] text-[var(--color-text-dim)]">
          Tu carrito está vacío.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-[var(--color-button-text)]"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((d) => createMut.mutate(d))}
      className="mx-auto max-w-[1280px] px-4 pb-32 pt-4 md:px-10 md:pt-8"
    >
      <Link
        href="/cart"
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-dim)]"
      >
        <Icon name="back" size={13} /> Volver al carrito
      </Link>
      <h1 className="mb-5 font-grotesk text-[24px] font-semibold tracking-[-0.5px] md:text-[28px]">
        Checkout
      </h1>

      <div className="grid gap-5 md:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Card title="1 · Dirección de envío">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Nombre completo" error={errors.name?.message} {...register("name")} />
              <Field label="Teléfono" {...register("phone")} />
              <div className="md:col-span-2">
                <Field label="Dirección" error={errors.street?.message} {...register("street")} />
              </div>
              <Field label="Ciudad" error={errors.city?.message} {...register("city")} />
              <Field label="Código postal" error={errors.postal_code?.message} {...register("postal_code")} />
              <div className="md:col-span-2">
                <Field label="Email" type="email" error={errors.email?.message} {...register("email")} />
              </div>
            </div>
          </Card>

          <Card title="2 · Método de pago">
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {PAYMENTS.map((m) => (
                <button
                  key={m.k}
                  type="button"
                  onClick={() => setMethod(m.k)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition md:flex-col md:items-center md:text-center",
                    method === m.k
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-bg-input)]">
                    <Icon
                      name={m.icon}
                      size={16}
                      className={
                        method === m.k ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
                      }
                    />
                  </div>
                  <div className="md:mt-1">
                    <div className="text-[13px] font-medium">{m.label}</div>
                    <div className="text-[11px] text-[var(--color-text-dim)]">{m.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <aside className="h-fit rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Tu orden
          </div>
          <div className="flex flex-col gap-2">
            {items.map((i) => (
              <div
                key={i.product_id}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="truncate pr-2">
                  {i.quantity}× {i.title}
                </span>
                <span className="font-grotesk font-semibold">
                  {formatARS(i.price * i.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="my-3 h-px bg-[var(--color-border)]" />
          <div className="flex items-center justify-between text-[13px] text-[var(--color-text-dim)]">
            <span>Envío</span>
            <span>{shipping === 0 ? "Gratis" : formatARS(shipping)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[14px] font-semibold">Total</span>
            <span className="font-grotesk text-[20px] font-semibold">
              {formatARS(total)}
            </span>
          </div>
          <button
            type="submit"
            disabled={createMut.isPending}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {createMut.isPending ? "Procesando…" : `Pagar ${formatARS(total)}`}
          </button>
        </aside>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
        {title}
      </div>
      {children}
    </section>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, ...props },
  ref
) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--color-text-dim)]">
        {label}
      </div>
      <input
        ref={ref}
        {...props}
        className={cn(
          "h-11 w-full rounded-xl border bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)]",
          error ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"
        )}
      />
      {error && (
        <div className="mt-1 text-[11px] text-[var(--color-danger)]">{error}</div>
      )}
    </label>
  );
});
