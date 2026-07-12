"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { AdminShell } from "@/components/admin/admin-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { IdentidadSection } from "./_sections/identidad-section";
import { AparienciaSection } from "./_sections/apariencia-section";
import { PagosSection } from "./_sections/pagos-section";
import { FaqSection } from "./_sections/faq-section";
import { WhatsappSection } from "./_sections/whatsapp-section";
import { DEFAULT_BANNER } from "@/components/admin/banner-editor";
import type { Business } from "@/lib/types";

export default function AdminBusinessPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("identidad");
  const [saving, setSaving] = useState(false);

  const businessQ = useQuery({
    queryKey: ["business"],
    queryFn: async () => {
      try {
        const { data } = await api.get<Business>("/business");
        return data;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) return null;
        throw err;
      }
    },
  });

  const [form, setForm] = useState<Business | null>(null);
  const [initial, setInitial] = useState<Business | null>(null);

  useEffect(() => {
    if (businessQ.data) {
      const normalized: Business = {
        ...businessQ.data,
        bankData: businessQ.data.bankData ?? [],
        banner_config: businessQ.data.banner_config ?? DEFAULT_BANNER,
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server state to local form
      setForm(normalized);
      setInitial(normalized);
    }
  }, [businessQ.data]);

  const patch = (p: Partial<Business>) => {
    setForm((prev) => (prev ? { ...prev, ...p } : prev));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("no_form");
      const payload = { ...form, bankData: form.bankData ?? [] };
      if (form.id) {
        const { data } = await api.put(`/business/${form.id}`, {
          ...payload,
          id: form.id,
        });
        return data;
      }
      const { data } = await api.post(`/business`, payload);
      return data as Business;
    },
    onSuccess: (data: Business) => {
      toast.success("Datos guardados");
      setInitial(data);
      qc.invalidateQueries({ queryKey: ["business"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
    onSettled: () => setSaving(false),
  });

  const dirtyFlags = {
    identidad: isDirty(form, initial, IDENTIDAD_KEYS),
    apariencia: isDirty(form, initial, APARIENCIA_KEYS),
    pagos: isDirty(form, initial, PAGOS_KEYS),
  };

  return (
    <AdminShell
      title="Negocio"
      subtitle="Datos públicos, imágenes, paleta, pagos, WhatsApp y FAQ"
    >
      {businessQ.isLoading || !form || !initial ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
          Cargando…
        </div>
      ) : (
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="gap-4"
        >
          <TabsList
            variant="line"
            className="w-full justify-start gap-1 border-b border-[var(--color-border)] bg-transparent p-0"
          >
            <DirtyTab value="identidad" label="Identidad" dirty={dirtyFlags.identidad} />
            <DirtyTab value="apariencia" label="Apariencia" dirty={dirtyFlags.apariencia} />
            <DirtyTab value="pagos" label="Pagos" dirty={dirtyFlags.pagos} />
            <DirtyTab value="whatsapp" label="WhatsApp" dirty={false} />
            <DirtyTab value="faq" label="FAQ" dirty={false} />
          </TabsList>

          <TabsContent value="identidad" className="mt-4 outline-none">
            <IdentidadSection
              data={form}
              initial={initial}
              onChange={patch}
              onSaved={() => saveMut.mutate()}
              saving={saving}
              setSaving={setSaving}
            />
          </TabsContent>

          <TabsContent value="apariencia" className="mt-4 outline-none">
            <AparienciaSection
              data={form}
              initial={initial}
              onChange={patch}
              onSaved={() => saveMut.mutate()}
              saving={saving}
              setSaving={setSaving}
            />
          </TabsContent>

          <TabsContent value="pagos" className="mt-4 outline-none">
            <PagosSection
              data={form}
              initial={initial}
              onChange={patch}
              onSaved={() => saveMut.mutate()}
              saving={saving}
              setSaving={setSaving}
            />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-4 outline-none">
            <WhatsappSection />
          </TabsContent>

          <TabsContent value="faq" className="mt-4 outline-none">
            <FaqSection />
          </TabsContent>
        </Tabs>
      )}
    </AdminShell>
  );
}

const IDENTIDAD_KEYS: (keyof Business)[] = [
  "name",
  "type",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "description",
  "business_image",
  "favicon",
  "hero_image",
];

const APARIENCIA_KEYS: (keyof Business)[] = ["banner_config"];

const PAGOS_KEYS: (keyof Business)[] = ["bankData"];

function isDirty(
  data: Business | null,
  initial: Business | null,
  keys: (keyof Business)[],
): boolean {
  if (!data || !initial) return false;
  return keys.some((k) => !deepEqual(data[k], initial[k]));
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function DirtyTab({
  value,
  label,
  dirty,
}: {
  value: string;
  label: string;
  dirty: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-3 text-[13px] font-medium text-[var(--color-text-dim)] hover:text-[var(--color-text)] data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-text)] data-[state=active]:shadow-none"
      )}
    >
      <span>{label}</span>
      {dirty && (
        <span
          className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
          aria-label="Cambios sin guardar"
        />
      )}
    </TabsTrigger>
  );
}