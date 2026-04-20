"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import { useBusinessName } from "@/components/business-provider";

type Config = {
  whatsapp_enabled?: boolean;
  whatsapp_allowed_remitents?: string;
};

type SessionStatus = {
  status?: string;
  connected?: boolean;
  phone_number?: string;
  name?: string;
};

type QRResponse = {
  qr?: string;
  qrcode?: string;
  status?: string;
};

export default function AdminWhatsAppPage() {
  const qc = useQueryClient();
  const businessName = useBusinessName();
  const [enabled, setEnabled] = useState(false);
  const [allowed, setAllowed] = useState("");
  const [sessionName, setSessionName] = useState("session");
  const [sessionPhone, setSessionPhone] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState(`Hola desde ${businessName} 👋`);

  const configQ = useQuery({
    queryKey: ["wa", "config"],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; data: Config }>("/whatsapp/config");
      return data.data;
    },
  });

  const statusQ = useQuery({
    queryKey: ["wa", "status"],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; data: SessionStatus }>(
        "/whatsapp/session/status"
      );
      return data.data;
    },
    refetchInterval: 5000,
  });

  const qrQ = useQuery({
    queryKey: ["wa", "qr"],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; data: QRResponse }>(
        "/whatsapp/session/qrcode"
      );
      return data.data;
    },
    enabled: !statusQ.data?.connected,
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (configQ.data) {
      setEnabled(!!configQ.data.whatsapp_enabled);
      setAllowed(configQ.data.whatsapp_allowed_remitents ?? "");
    }
  }, [configQ.data]);

  const saveConfigMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.put("/whatsapp/config", {
        whatsapp_enabled: enabled,
        whatsapp_allowed_remitents: allowed,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      qc.invalidateQueries({ queryKey: ["wa", "config"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/whatsapp/session/create", {
        name: sessionName,
        phone_number: sessionPhone,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Sesión iniciada. Escaneá el QR.");
      qc.invalidateQueries({ queryKey: ["wa", "status"] });
      qc.invalidateQueries({ queryKey: ["wa", "qr"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const disconnectMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete("/whatsapp/session/disconnect");
      return data;
    },
    onSuccess: () => {
      toast.success("Sesión desconectada");
      qc.invalidateQueries({ queryKey: ["wa"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const testMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/whatsapp/test", {
        to: testTo,
        message: testMsg,
      });
      return data;
    },
    onSuccess: () => toast.success("Mensaje enviado"),
    onError: (err) => toast.error(unwrapError(err)),
  });

  const status = statusQ.data;
  const connected = !!status?.connected || status?.status === "connected";
  const qrRaw = qrQ.data?.qr ?? qrQ.data?.qrcode ?? "";
  const qrSrc = qrRaw
    ? qrRaw.startsWith("data:")
      ? qrRaw
      : `data:image/png;base64,${qrRaw}`
    : "";

  return (
    <AdminShell
      title="WhatsApp"
      subtitle="Sesión, mensajes y reglas"
    >
      <div className="grid gap-3.5 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                Sesión
              </div>
              <div className="mt-1 font-grotesk text-[18px] font-semibold text-[var(--color-text)]">
                {connected ? "Conectada" : "Sin conectar"}
              </div>
              {status?.phone_number && (
                <div className="mt-0.5 text-[12px] text-[var(--color-text-dim)]">
                  {status.phone_number} · {status.name ?? "—"}
                </div>
              )}
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                connected
                  ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
                  : "bg-[color-mix(in_srgb,var(--color-warn)_18%,transparent)] text-[var(--color-warn)]"
              )}
            >
              {connected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          {!connected && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                    Nombre sesión
                  </div>
                  <input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                    Número (+549…)
                  </div>
                  <input
                    value={sessionPhone}
                    onChange={(e) => setSessionPhone(e.target.value)}
                    placeholder="+5491112345678"
                    className={inputCls + " font-mono"}
                  />
                </label>
              </div>
              <button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !sessionPhone}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
              >
                <Icon name="qr" size={14} />
                {createMut.isPending ? "Creando sesión…" : "Generar QR"}
              </button>

              {qrSrc && (
                <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-input)] p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt="Escanear con WhatsApp"
                    className="h-56 w-56 rounded-md bg-white p-2"
                  />
                  <div className="mt-2 text-[11px] text-[var(--color-text-dim)]">
                    Escaneá con WhatsApp &gt; Dispositivos vinculados.
                  </div>
                </div>
              )}
            </>
          )}

          {connected && (
            <button
              onClick={() => {
                if (confirm("Desconectar sesión de WhatsApp?"))
                  disconnectMut.mutate();
              }}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 text-[13px] font-semibold text-[var(--color-danger)] hover:bg-[var(--color-bg-input)]"
            >
              <Icon name="close" size={14} />
              Desconectar
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Configuración
          </div>
          <label className="mt-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium text-[var(--color-text)]">
                Integración activa
              </div>
              <div className="text-[11px] text-[var(--color-text-dim)]">
                Recibir y responder mensajes automáticamente.
              </div>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
          </label>
          <label className="mt-4 block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Remitentes permitidos (coma)
            </div>
            <input
              value={allowed}
              onChange={(e) => setAllowed(e.target.value)}
              placeholder="+549…,+549…"
              className={inputCls + " font-mono"}
            />
          </label>
          <button
            onClick={() => saveConfigMut.mutate()}
            disabled={saveConfigMut.isPending}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            <Icon name="check" size={14} />
            {saveConfigMut.isPending ? "Guardando…" : "Guardar configuración"}
          </button>
        </div>
      </div>

      <div className="mt-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
          Mensaje de prueba
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Destino
            </div>
            <input
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="+549..."
              className={inputCls + " font-mono"}
            />
          </label>
          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Mensaje
            </div>
            <input
              value={testMsg}
              onChange={(e) => setTestMsg(e.target.value)}
              className={inputCls}
            />
          </label>
          <button
            onClick={() => testMut.mutate()}
            disabled={testMut.isPending || !connected || !testTo}
            className="self-end inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            <Icon name="arrow" size={14} />
            {testMut.isPending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
