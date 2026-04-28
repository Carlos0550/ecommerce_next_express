"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, storageUrl, unwrapError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { Icon, type IconName } from "@/components/brand";
import { RequireCustomer } from "@/components/shop/require-customer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { formatARS, cn } from "@/lib/utils";
import type { User, Order } from "@/lib/types";

export default function AccountPage() {
  return (
    <RequireCustomer>
      <AccountContent />
    </RequireCustomer>
  );
}

function AccountContent() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const storedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState<"address" | "settings" | null>(null);

  const meQ = useQuery({
    queryKey: ["shop", "me"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<{ user?: User } & User>("/profile/me");
      const u = (data?.user ?? data) as User;
      if (u) setUser(u);
      return u;
    },
  });

  const ordersQ = useQuery({
    queryKey: ["shop", "orders", "stats"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<{ orders?: Order[] }>(
        "/orders?page=1&limit=100"
      );
      return data?.orders ?? [];
    },
  });

  const user = meQ.data ?? storedUser;
  const orders = ordersQ.data ?? [];
  const totalSpent = orders.reduce((n, o) => n + Number(o.total ?? 0), 0);
  const activeOrders = orders.filter((o) =>
    ["PENDING", "PAID", "PROCESSING", "SHIPPED"].includes(o.status)
  ).length;
  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "·";

  const addressLine = [
    user?.shipping_street,
    user?.shipping_city,
    user?.shipping_postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const avatarUrl = user?.profile_image ? storageUrl(user.profile_image) : "";

  const rows: {
    icon: IconName;
    label: string;
    sub?: string;
    href?: string;
    onClick?: () => void;
  }[] = [
    {
      icon: "receipt",
      label: "Mis órdenes",
      sub: `${activeOrders} en curso`,
      href: "/orders",
    },
    {
      icon: "home",
      label: "Direcciones",
      sub: addressLine || "Sin direcciones",
      onClick: () => setOpen("address"),
    },
    {
      icon: "settings",
      label: "Configuración",
      sub: "Nombre, foto y teléfono",
      onClick: () => setOpen("settings"),
    },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-4 md:px-10 md:pt-8">
      <div className="flex items-center gap-4">
        <div
          className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 font-grotesk text-[22px] font-semibold md:h-20 md:w-20 md:text-[28px]"
          style={{
            borderColor: "var(--color-accent)",
            background: "var(--color-accent-soft)",
            color: "var(--color-accent)",
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div>
          <div className="font-grotesk text-[20px] font-semibold tracking-[-0.4px] md:text-[26px]">
            {user?.name ?? "—"}
          </div>
          <div className="text-[12px] text-[var(--color-text-dim)] md:text-[13px]">
            {user?.email ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5 md:grid-cols-4">
        <Stat label="Órdenes" value={String(orders.length)} />
        <Stat label="En curso" value={String(activeOrders)} />
        <Stat label="Total gastado" value={formatARS(totalSpent)} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {rows.map((r) => {
          const inner = (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-bg-input)]">
                <Icon name={r.icon} size={16} />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-medium">{r.label}</div>
                {r.sub && (
                  <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-dim)]">
                    {r.sub}
                  </div>
                )}
              </div>
              <Icon
                name="chevronRight"
                size={15}
                className="text-[var(--color-text-dim)]"
              />
            </>
          );
          const className =
            "flex items-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-left transition hover:border-[var(--color-border-strong)]";
          if (r.href) {
            return (
              <Link key={r.label} href={r.href} className={className}>
                {inner}
              </Link>
            );
          }
          return (
            <button
              key={r.label}
              type="button"
              onClick={r.onClick}
              className={className}
            >
              {inner}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/");
        }}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-[13px] font-semibold text-[var(--color-danger)] hover:bg-[var(--color-bg-input)]"
      >
        <Icon name="logout" size={14} /> Cerrar sesión
      </button>

      <AddressSheet
        open={open === "address"}
        onClose={() => setOpen(null)}
        user={user ?? null}
      />
      <SettingsSheet
        open={open === "settings"}
        onClose={() => setOpen(null)}
        user={user ?? null}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3.5 text-center md:p-4">
      <div className="font-grotesk text-[18px] font-semibold md:text-[22px]">
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.5px] text-[var(--color-text-dim)] md:text-[11px]">
        {label}
      </div>
    </div>
  );
}

const AddressSchema = z.object({
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_province: z.string().optional(),
});
type AddressInput = z.infer<typeof AddressSchema>;

function AddressSheet({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
}) {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(AddressSchema),
    defaultValues: {
      shipping_street: "",
      shipping_city: "",
      shipping_postal_code: "",
      shipping_province: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        shipping_street: user?.shipping_street ?? "",
        shipping_city: user?.shipping_city ?? "",
        shipping_postal_code: user?.shipping_postal_code ?? "",
        shipping_province: user?.shipping_province ?? "",
      });
    }
  }, [open, user, reset]);

  const mut = useMutation({
    mutationFn: async (values: AddressInput) => {
      const payload: Record<string, string> = {};
      for (const k of Object.keys(values) as (keyof AddressInput)[]) {
        const v = (values[k] ?? "").trim();
        if (v) payload[k] = v;
      }
      const { data } = await api.put<{ ok: boolean; user: User }>(
        "/profile/me",
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      if (data?.user) setUser(data.user);
      qc.invalidateQueries({ queryKey: ["shop", "me"] });
      toast.success("Dirección actualizada");
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[460px] overflow-y-auto bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <SheetHeader>
          <SheetTitle className="font-grotesk text-[20px]">
            Dirección de envío
          </SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit((d) => mut.mutate(d))}
          className="flex flex-1 flex-col gap-3.5 px-4"
        >
          <Field label="Calle y número" error={errors.shipping_street?.message}>
            <input
              {...register("shipping_street")}
              placeholder="Av. Siempre Viva 742"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ciudad" error={errors.shipping_city?.message}>
              <input
                {...register("shipping_city")}
                placeholder="Candelaria"
                className={inputCls}
              />
            </Field>
            <Field
              label="Código postal"
              error={errors.shipping_postal_code?.message}
            >
              <input
                {...register("shipping_postal_code")}
                placeholder="3392"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Provincia" error={errors.shipping_province?.message}>
            <input
              {...register("shipping_province")}
              placeholder="Misiones"
              className={inputCls}
            />
          </Field>
          <SheetFooter className="mt-4 flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex-1 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {mut.isPending ? "Guardando…" : "Guardar"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const SettingsSchema = z.object({
  name: z.string().min(1, "Requerido"),
  phone: z.string().optional(),
});
type SettingsInput = z.infer<typeof SettingsSchema>;

function SettingsSheet({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
}) {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: { name: "", phone: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ name: user?.name ?? "", phone: user?.phone ?? "" });
      setPreviewUrl(null);
    }
  }, [open, user, reset]);

  const updateMut = useMutation({
    mutationFn: async (values: SettingsInput) => {
      const payload: Record<string, string> = { name: values.name.trim() };
      const phone = (values.phone ?? "").trim();
      if (phone) payload.phone = phone;
      const { data } = await api.put<{ ok: boolean; user: User }>(
        "/profile/me",
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      if (data?.user) setUser(data.user);
      qc.invalidateQueries({ queryKey: ["shop", "me"] });
      toast.success("Datos actualizados");
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const avatarMut = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api.post<{ ok: boolean; user: User; url: string }>(
        "/profile/avatar",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: (data) => {
      if (data?.user) setUser(data.user);
      qc.invalidateQueries({ queryKey: ["shop", "me"] });
      toast.success("Foto actualizada");
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    avatarMut.mutate(file);
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "·";
  const currentAvatar = user?.profile_image
    ? storageUrl(user.profile_image)
    : "";
  const shownAvatar = previewUrl || currentAvatar;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[460px] overflow-y-auto bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <SheetHeader>
          <SheetTitle className="font-grotesk text-[20px]">
            Configuración
          </SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit((d) => updateMut.mutate(d))}
          className="flex flex-1 flex-col gap-3.5 px-4"
        >
          <div className="flex items-center gap-4">
            <div
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 font-grotesk text-[20px] font-semibold"
              style={{
                borderColor: "var(--color-accent)",
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
              }}
            >
              {shownAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownAvatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)] disabled:opacity-60"
              >
                <Icon name="upload" size={12} />
                {avatarMut.isPending ? "Subiendo…" : "Cambiar foto"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickAvatar}
                className="hidden"
              />
              <span className="text-[11px] text-[var(--color-text-dim)]">
                JPG o PNG, máx 2 MB
              </span>
            </div>
          </div>

          <Field label="Nombre" error={errors.name?.message}>
            <input
              {...register("name")}
              placeholder="Carlos Pelinski"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              value={user?.email ?? ""}
              disabled
              className={cn(inputCls, "opacity-70")}
            />
          </Field>
          <Field label="Teléfono" error={errors.phone?.message}>
            <input
              {...register("phone")}
              placeholder="+54 9 ..."
              className={inputCls}
            />
          </Field>

          <SheetFooter className="mt-4 flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMut.isPending}
              className="flex-1 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {updateMut.isPending ? "Guardando…" : "Guardar"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
        {label}
      </div>
      {children}
      {error && (
        <div className="mt-1 text-[11px] text-[var(--color-danger)]">
          {error}
        </div>
      )}
    </label>
  );
}
