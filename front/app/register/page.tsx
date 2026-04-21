"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { forwardRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { BrandLogo, Icon, type IconName } from "@/components/brand";
import { useBusinessName } from "@/components/business-provider";
import { cn } from "@/lib/utils";

const Schema = z.object({
  name: z.string().min(2, "Requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});
type Input = z.infer<typeof Schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const businessName = useBusinessName();
  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(Schema),
  });
  const regMut = useMutation({
    mutationFn: async (input: Input) => {
      const { data } = await api.post("/shop/register", input);
      return data as { token: string; user: import("@/lib/types").User };
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success("¡Cuenta creada!");
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
        <BrandLogo size={18} />
        <div className="max-w-[460px]">
          <h1 className="font-grotesk text-[44px] font-semibold leading-[1.05] tracking-[-1px]">
            Sumate a
            <br />
            <em className="text-[var(--color-accent)]" style={{ fontStyle: "italic" }}>
              {businessName}.
            </em>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-dim)]">
            Creá tu cuenta y empezá a disfrutar de envíos rápidos, novedades y beneficios.
          </p>
        </div>
        <div className="text-[11px] text-[var(--color-text-dim)]">
          © {new Date().getFullYear()} {businessName}
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[420px]">
          <div className="md:hidden">
            <BrandLogo size={18} />
          </div>
          <div className="mt-8 md:mt-0">
            <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-dim)]">
              Crear cuenta
            </div>
            <h2 className="mt-1.5 font-grotesk text-[28px] font-semibold tracking-[-0.5px]">
              Empezá ahora
            </h2>
          </div>
          <form
            onSubmit={handleSubmit((d) => regMut.mutate(d))}
            className="mt-6 flex flex-col gap-3.5"
          >
            <Field label="Nombre" icon="user" placeholder="Tu nombre" error={errors.name?.message} {...register("name")} />
            <Field label="Email" icon="mail" type="email" placeholder="tu@email.com" error={errors.email?.message} {...register("email")} />
            <Field label="Contraseña" icon="lock" type="password" placeholder="Mínimo 8 caracteres" error={errors.password?.message} {...register("password")} />
            <button
              type="submit"
              disabled={regMut.isPending}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {regMut.isPending ? "Creando cuenta…" : "Crear cuenta"}
              <Icon name="arrow" size={14} />
            </button>
          </form>
          <p className="mt-6 text-center text-[13px] text-[var(--color-text-dim)]">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold text-[var(--color-accent)]">
              Ingresá
            </Link>
          </p>

          <Link
            href="/"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-transparent text-[13px] font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <Icon name="back" size={13} /> Ir a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: IconName;
  error?: string;
};
const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, error, ...props },
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
      </div>
      {error && <div className="mt-1 text-[11px] text-[var(--color-danger)]">{error}</div>}
    </label>
  );
});
