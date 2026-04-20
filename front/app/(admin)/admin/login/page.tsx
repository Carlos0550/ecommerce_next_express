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
import { useAuthStore, isAdmin } from "@/stores/auth.store";
import type { AuthResponse } from "@/lib/types";
import { BrandLogo, Icon } from "@/components/brand";
import { useBusinessName } from "@/components/business-provider";
import { formatARS } from "@/lib/utils";

const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresá la contraseña"),
  remember: z.boolean().optional().default(true),
});
type LoginInput = z.infer<typeof LoginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const businessName = useBusinessName();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const remember = watch("remember");

  const mutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<AuthResponse>("/admin/login", {
        email: input.email,
        password: input.password,
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data?.ok || !data.token || !isAdmin(data.user)) {
        toast.error("Esta cuenta no tiene acceso al panel.");
        return;
      }
      setAuth(data.token, data.user);
      toast.success(`Hola, ${data.user.name.split(" ")[0] ?? ""}.`);
      router.replace("/admin");
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--color-bg)] text-[var(--color-text)] md:grid-cols-2">
      <aside
        className="hidden flex-col border-r border-[var(--color-border)] p-12 md:flex"
        style={{ background: "var(--hero-gradient)" }}
      >
        <BrandLogo size={18} />
        <div className="flex max-w-[480px] flex-1 flex-col justify-center">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[1.8px] text-[var(--color-accent)]">
            — Panel administrativo
          </div>
          <h1 className="font-grotesk text-[42px] font-semibold leading-[1.05] tracking-[-1px] text-[var(--color-text)]">
            Todo tu negocio,{" "}
            <em className="not-italic text-[var(--color-accent)] italic">
              en un solo lugar.
            </em>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-dim)]">
            Gestioná productos, órdenes, clientes y ventas de caja desde una
            interfaz diseñada para vos.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3.5">
            {[
              { label: "Ventas del mes", value: formatARS(3842100) },
              { label: "Órdenes activas", value: "12" },
              { label: "Productos activos", value: "120" },
              { label: "Clientes", value: "486" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 p-3.5 backdrop-blur-md"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                  {s.label}
                </div>
                <div className="mt-1 font-grotesk text-[20px] font-semibold text-[var(--color-text)]">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-[var(--color-text-dim)]">
          © {new Date().getFullYear()} {businessName}
        </div>
      </aside>

      <section className="flex items-center justify-center p-8 md:p-12">
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="w-full max-w-[420px]"
        >
          <div className="md:hidden mb-8">
            <BrandLogo size={18} />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-dim)]">
            Ingreso administradora
          </div>
          <h2 className="mb-7 mt-1.5 font-grotesk text-[28px] font-semibold tracking-[-0.5px] text-[var(--color-text)]">
            Bienvenida.
          </h2>

          <div className="flex flex-col gap-3.5">
            <Field
              label="Email"
              iconName="mail"
              error={errors.email?.message}
              inputProps={{
                type: "email",
                placeholder: "tucorreo@cinnamon.com.ar",
                autoComplete: "email",
                ...register("email"),
              }}
            />
            <Field
              label="Contraseña"
              iconName="lock"
              error={errors.password?.message}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-[var(--color-text-dim)] hover:text-[var(--color-accent)]"
                >
                  <Icon name="eye" size={14} />
                </button>
              }
              inputProps={{
                type: showPw ? "text" : "password",
                placeholder: "••••••••",
                autoComplete: "current-password",
                ...register("password"),
              }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-[var(--color-text-dim)]">
              <button
                type="button"
                onClick={() => setValue("remember", !remember)}
                className={
                  "flex h-4 w-4 items-center justify-center rounded " +
                  (remember
                    ? "bg-[var(--color-accent)]"
                    : "border border-[var(--color-border-strong)]")
                }
              >
                {remember && (
                  <Icon
                    name="check"
                    size={11}
                    className="text-[var(--color-button-text)]"
                  />
                )}
              </button>
              Recordar este dispositivo
            </label>
            <Link
              href="/recuperar"
              className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
            >
              Olvidé mi contraseña
            </Link>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-button-text)] transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {mutation.isPending ? "Ingresando…" : "Ingresar al panel"}
            <Icon name="arrow" size={14} />
          </button>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)] p-3.5">
            <Icon
              name="lock"
              size={14}
              className="mt-0.5 text-[var(--color-text-dim)]"
            />
            <p className="text-[11px] leading-relaxed text-[var(--color-text-dim)]">
              Acceso restringido. Todos los ingresos y movimientos quedan
              auditados. Si no sos administradora, volvé a la tienda.
            </p>
          </div>

          <div className="mt-6 text-center text-[12px] text-[var(--color-text-dim)]">
            ¿Sos cliente?{" "}
            <Link
              href="/"
              className="font-semibold text-[var(--color-accent)] hover:underline"
            >
              Ir a la tienda
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  iconName,
  error,
  trailing,
  inputProps,
}: {
  label: string;
  iconName: "mail" | "lock";
  error?: string;
  trailing?: React.ReactNode;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
        {label}
      </div>
      <div
        className={
          "flex h-11 items-center gap-2 rounded-xl border bg-[var(--color-bg-input)] px-3 transition focus-within:border-[var(--color-accent)] " +
          (error
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-border)]")
        }
      >
        <Icon
          name={iconName}
          size={14}
          className="text-[var(--color-text-dim)]"
        />
        <input
          {...inputProps}
          className="flex-1 bg-transparent text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
        />
        {trailing}
      </div>
      {error && (
        <div className="mt-1 text-[11px] text-[var(--color-danger)]">
          {error}
        </div>
      )}
    </label>
  );
}
