"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { useCartStore } from "@/stores/cart.store";
import { CinnamonLogo, Icon } from "@/components/brand";
import { cn } from "@/lib/utils";

const Schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Requerido"),
});
type Input = z.infer<typeof Schema>;

export default function ShopLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(Schema),
  });

  const loginMut = useMutation({
    mutationFn: async (input: Input) => {
      const { data } = await api.post("/shop/login", input);
      return data as { token: string; user: import("@/lib/types").User };
    },
    onSuccess: async (data) => {
      setAuth(data.token, data.user);
      if (cartItems.length > 0) {
        try {
          await api.post("/cart/merge", {
            items: cartItems.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
            })),
          });
          clearCart();
        } catch { /* non-fatal */ }
      }
      toast.success(`¡Hola ${data.user.name}!`);
      router.push("/account");
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <div
      className="grid min-h-screen grid-cols-1 md:grid-cols-2"
      style={{ background: "var(--color-bg)" }}
    >
      <div
        className="hidden flex-col justify-between p-12 md:flex"
        style={{ background: "var(--hero-gradient)" }}
      >
        <CinnamonLogo size={18} />
        <div className="max-w-[460px]">
          <h1 className="font-grotesk text-[44px] font-semibold leading-[1.05] tracking-[-1px]">
            Bienvenida
            <br />
            <em className="text-[var(--color-accent)]" style={{ fontStyle: "italic" }}>
              de vuelta.
            </em>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-dim)]">
            Ingresá para seguir con tus compras, revisar tus órdenes y guardar tus favoritos.
          </p>
        </div>
        <div className="text-[11px] text-[var(--color-text-dim)]">
          © {new Date().getFullYear()} Cinnamon
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[420px]">
          <div className="md:hidden">
            <CinnamonLogo size={18} />
          </div>
          <div className="mt-8 md:mt-0">
            <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-dim)]">
              Ingresar
            </div>
            <h2 className="mt-1.5 font-grotesk text-[28px] font-semibold tracking-[-0.5px]">
              Hola de nuevo
            </h2>
          </div>

          <form
            onSubmit={handleSubmit((d) => loginMut.mutate(d))}
            className="mt-6 flex flex-col gap-3.5"
          >
            <Field
              label="Email"
              icon="mail"
              type="email"
              placeholder="tu@email.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Field
              label="Contraseña"
              icon="lock"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              error={errors.password?.message}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="text-[11px] font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-accent)]"
                >
                  {showPw ? "Ocultar" : "Ver"}
                </button>
              }
              {...register("password")}
            />
            <div className="flex justify-end">
              <Link
                href="/recuperar"
                className="text-[12px] font-semibold text-[var(--color-accent)]"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loginMut.isPending}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {loginMut.isPending ? "Ingresando…" : "Ingresar"}
              <Icon name="arrow" size={14} />
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-[var(--color-text-dim)]">
            ¿Todavía no tenés cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold text-[var(--color-accent)]"
            >
              Registrate
            </Link>
          </p>

          <Link
            href="/"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-transparent text-[13px] font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <Icon name="back" size={13} /> Ir a la tienda
          </Link>

          <Link
            href="/admin/login"
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-transparent text-[13px] font-semibold text-[var(--color-text-dim)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Ir al panel administrativo
          </Link>
        </div>
      </div>
    </div>
  );
}

import { forwardRef } from "react";
import type { IconName } from "@/components/brand";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: IconName;
  error?: string;
  suffix?: React.ReactNode;
};
const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, error, suffix, ...props },
  ref
) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--color-text-dim)]">
        {label}
      </div>
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-xl border bg-[var(--color-bg-input)] px-3 transition focus-within:border-[var(--color-accent)]",
          error ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"
        )}
      >
        {icon && <Icon name={icon} size={14} className="text-[var(--color-text-dim)]" />}
        <input
          ref={ref}
          {...props}
          className="flex-1 bg-transparent text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
        />
        {suffix}
      </div>
      {error && <div className="mt-1 text-[11px] text-[var(--color-danger)]">{error}</div>}
    </label>
  );
});
