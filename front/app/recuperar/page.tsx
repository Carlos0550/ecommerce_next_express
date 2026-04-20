"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { CinnamonLogo, Icon } from "@/components/brand";
import { cn } from "@/lib/utils";

const Schema = z.object({ email: z.string().email("Email inválido") });
type Input = z.infer<typeof Schema>;

type Account = "customer" | "admin";

export default function RecuperarPage() {
  const [account, setAccount] = useState<Account>("customer");
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<Input>({
    resolver: zodResolver(Schema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (input: Input) => {
      const url =
        account === "admin"
          ? "/admin/password/reset"
          : "/shop/password/reset";
      const { data } = await api.post(url, { email: input.email });
      return data;
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Si el email existe, enviamos instrucciones.");
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "var(--hero-gradient)" }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex items-center justify-between">
          <CinnamonLogo size={18} />
          <Link
            href={account === "admin" ? "/admin/login" : "/login"}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-accent)]"
          >
            <Icon name="back" size={13} /> Volver
          </Link>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-sm">
          {!sent ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-dim)]">
                Recuperar acceso
              </div>
              <h1 className="mb-6 mt-1.5 font-grotesk text-[26px] font-semibold tracking-[-0.5px] text-[var(--color-text)]">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="mb-6 text-[13px] leading-relaxed text-[var(--color-text-dim)]">
                Ingresá tu email y te enviaremos una contraseña temporal para
                que puedas volver a entrar.
              </p>

              <div className="mb-5 inline-flex rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] p-1">
                {(
                  [
                    { id: "customer", label: "Soy cliente" },
                    { id: "admin", label: "Soy admin" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAccount(o.id)}
                    className={cn(
                      "rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition",
                      account === o.id
                        ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm"
                        : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleSubmit((d) => mutation.mutate(d))}
                className="flex flex-col gap-3.5"
              >
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                    Email
                  </div>
                  <div
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-xl border bg-[var(--color-bg-input)] px-3 transition focus-within:border-[var(--color-accent)]",
                      errors.email
                        ? "border-[var(--color-danger)]"
                        : "border-[var(--color-border)]"
                    )}
                  >
                    <Icon
                      name="mail"
                      size={14}
                      className="text-[var(--color-text-dim)]"
                    />
                    <input
                      {...register("email")}
                      type="email"
                      autoComplete="email"
                      placeholder="tu@email.com"
                      className="flex-1 bg-transparent text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                    />
                  </div>
                  {errors.email && (
                    <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                      {errors.email.message}
                    </div>
                  )}
                </label>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-button-text)] transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
                >
                  {mutation.isPending ? "Enviando…" : "Enviar instrucciones"}
                  <Icon name="arrow" size={14} />
                </button>
              </form>

              <p className="mt-5 text-center text-[12px] text-[var(--color-text-dim)]">
                ¿Recordaste tu contraseña?{" "}
                <Link
                  href={account === "admin" ? "/admin/login" : "/login"}
                  className="font-semibold text-[var(--color-accent)] hover:underline"
                >
                  Volver a ingresar
                </Link>
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)]">
                <Icon
                  name="mail"
                  size={22}
                  className="text-[var(--color-accent)]"
                />
              </div>
              <h2 className="font-grotesk text-[22px] font-semibold tracking-[-0.4px] text-[var(--color-text)]">
                Revisá tu casilla
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-dim)]">
                Si <strong>{getValues("email")}</strong> está registrado, vas a
                recibir una contraseña temporal en los próximos minutos. Revisá
                también el spam.
              </p>
              <Link
                href={account === "admin" ? "/admin/login" : "/login"}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
              >
                Volver a ingresar <Icon name="arrow" size={13} />
              </Link>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-[var(--color-text-dim)]">
          © 2026 Cinnamon Makeup &amp; Accesorios
        </p>
      </div>
    </div>
  );
}
