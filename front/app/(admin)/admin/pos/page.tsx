"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, storageUrl, unwrapError } from "@/lib/api";
import { cn, formatARS } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import { useBusiness } from "@/components/business-provider";
import type { Business, Category, Product } from "@/lib/types";

type ProductsResp = {
  ok: boolean;
  data: {
    products: Product[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
};

type CartLine = {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string | null;
  manual?: boolean;
};

type ParsedLine =
  | { idx: number; empty: true }
  | { idx: number; line: string; error: string }
  | { idx: number; line: string; quantity: number; title: string; price: number };

function parseManualLines(text: string): ParsedLine[] {
  return text.split("\n").map((raw, idx) => {
    const line = raw.trim();
    if (!line) return { idx, empty: true };
    const tokens = line.split(/\s+/);
    if (tokens.length < 3) {
      return { idx, line, error: "Formato: CANTIDAD NOMBRE PRECIO" };
    }
    const qtyStr = tokens[0];
    const priceRaw = tokens[tokens.length - 1];
    const titleParts = tokens.slice(1, -1);
    const qty = Number.parseInt(qtyStr, 10);
    if (!/^\d+$/.test(qtyStr) || qty <= 0) {
      return { idx, line, error: "Cantidad inválida" };
    }
    const priceNorm = priceRaw.replace(/\./g, "").replace(",", ".");
    const price = Number(priceNorm);
    if (!Number.isFinite(price) || price <= 0) {
      return { idx, line, error: "Precio inválido" };
    }
    const title = titleParts.join(" ").trim();
    if (!title) return { idx, line, error: "Falta el nombre" };
    return { idx, line, quantity: qty, title, price };
  });
}

const PAYMENT_METHODS = [
  { value: "EFECTIVO", label: "Efectivo", icon: "cash" },
  { value: "TARJETA", label: "Tarjeta", icon: "card" },
  { value: "QR", label: "QR / MP", icon: "qr" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: "arrow" },
] as const;

type Method = (typeof PAYMENT_METHODS)[number]["value"];

function firstImage(p: Product): string | null {
  const raw = (p.images as unknown as Array<string | { url?: string }> | undefined)?.[0];
  if (!raw) return null;
  return typeof raw === "string" ? raw : (raw.url ?? null);
}

export default function AdminPosPage() {
  const router = useRouter();
  const ssrBusiness = useBusiness();
  const businessQ = useQuery<Business | null>({
    queryKey: ["business"],
    queryFn: async () => {
      const { data } = await api.get<Business>("/business");
      return data;
    },
    staleTime: 30_000,
  });
  const salesMode =
    businessQ.data?.admin_layout_config?.sales ??
    ssrBusiness?.admin_layout_config?.sales ??
    "modern";
  useEffect(() => {
    if (salesMode === "legacy") router.replace("/admin/ventas");
  }, [salesMode, router]);
  if (salesMode === "legacy") return null;
  return <AdminPosPageInner />;
}

function AdminPosPageInner() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<Method>("EFECTIVO");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");

  const parsedManual = useMemo(() => parseManualLines(manualText), [manualText]);
  const validManualLines = parsedManual.filter(
    (p): p is Extract<ParsedLine, { quantity: number }> => "quantity" in p
  );
  const invalidManualLines = parsedManual.filter(
    (p): p is Extract<ParsedLine, { error: string }> => "error" in p
  );
  const manualHasContent = parsedManual.some((p) => !("empty" in p));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playBeep = (freq: number, duration = 0.08) => {
    if (typeof window === "undefined") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const playSuccess = () => {
    if (typeof window === "undefined") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const notes = [
        { f: 784, t: 0 },
        { f: 1047, t: 0.12 },
        { f: 1568, t: 0.24 },
      ];
      notes.forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.18, now + t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.4);
      });
    } catch {}
  };

  const playCrumple = () => {
    if (typeof window === "undefined") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const duration = 0.45;
      const buffer = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate * duration),
        ctx.sampleRate
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / data.length;
        const crackle = Math.random() < 0.25 ? (Math.random() * 2 - 1) : 0;
        const hiss = (Math.random() * 2 - 1) * 0.3;
        data[i] = (crackle + hiss) * Math.pow(1 - t, 2);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2400;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + duration);
    } catch {}
  };

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get<{
        ok: boolean;
        data?: Category[];
        categories?: Category[];
      }>("/products/categories");
      return data.data ?? data.categories ?? [];
    },
  });

  const productsQ = useQuery({
    queryKey: ["products", "pos", { categoryId }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (categoryId) params.set("categoryId", categoryId);
      const { data } = await api.get<ProductsResp>(
        `/products?${params.toString()}`
      );
      return data.data.products;
    },
  });

  const categories = categoriesQ.data ?? [];
  const products = productsQ.data ?? [];

  const filtered = useMemo(() => {
    const base = products.filter(
      (p) => p.state === "active" && Number(p.stock ?? 0) > 0
    );
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        String(p.sku ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const total = useMemo(
    () => cart.reduce((acc, l) => acc + l.price * l.quantity, 0),
    [cart]
  );
  const itemCount = useMemo(
    () => cart.reduce((acc, l) => acc + l.quantity, 0),
    [cart]
  );

  const addToCart = (p: Product) => {
    const id = String(p.id);
    const price = Number(p.price) || 0;
    playBeep(880);
    setCart((cur) => {
      const i = cur.findIndex((l) => l.product_id === id);
      if (i >= 0) {
        const copy = [...cur];
        const stock = Number(p.stock ?? 0);
        if (stock > 0 && copy[i].quantity + 1 > stock) {
          toast.error(`Sin stock: ${p.title}`);
          return cur;
        }
        copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
        return copy;
      }
      return [
        ...cur,
        {
          product_id: id,
          title: p.title,
          price,
          quantity: 1,
          image: firstImage(p),
        },
      ];
    });
  };

  const changeQty = (id: string, delta: number) => {
    playBeep(delta > 0 ? 880 : 520);
    setCart((cur) =>
      cur
        .map((l) =>
          l.product_id === id
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (id: string) => {
    playBeep(360, 0.12);
    setCart((cur) => cur.filter((l) => l.product_id !== id));
  };

  const clearCart = () => {
    playCrumple();
    setCart([]);
  };

  const addManualToCart = () => {
    if (validManualLines.length === 0) return;
    playBeep(880);
    const stamp = Date.now();
    const lines: CartLine[] = validManualLines.map((p, i) => ({
      product_id: `manual:${stamp}:${i}`,
      title: p.title,
      price: p.price,
      quantity: p.quantity,
      manual: true,
    }));
    setCart((cur) => [...cur, ...lines]);
    setManualText("");
    setManualOpen(false);
    toast.success(
      `${lines.length} ${lines.length === 1 ? "producto agregado" : "productos agregados"}`
    );
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const realLines = cart.filter((l) => !l.manual);
      const manualLines = cart.filter((l) => l.manual);
      const items = realLines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
      }));
      const product_ids: string[] = [];
      realLines.forEach((l) => {
        for (let i = 0; i < l.quantity; i++) product_ids.push(l.product_id);
      });
      const manualProducts = manualLines.map((l) => ({
        quantity: l.quantity,
        title: l.title,
        price: l.price,
      }));
      const payload = {
        payment_method: method,
        source: "CAJA" as const,
        product_ids,
        items,
        user_sale: user?.id ? { user_id: String(user.id) } : undefined,
        ...(manualProducts.length > 0
          ? { loadedManually: true, manualProducts }
          : {}),
      };
      const { data } = await api.post("/sales/save", payload);
      return data;
    },
    onSuccess: () => {
      toast.success("Venta registrada");
      playSuccess();
      setCart([]);
      setSheetOpen(false);
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const ticket = (
    <>
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Ticket
          </div>
          <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
            {itemCount} {itemCount === 1 ? "producto" : "productos"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] text-[var(--color-danger)] hover:underline"
            >
              Vaciar
            </button>
          )}
          <button
            onClick={() => setSheetOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] lg:hidden"
            aria-label="Cerrar"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {cart.length === 0 && (
          <div className="flex h-40 items-center justify-center text-center text-[12px] text-[var(--color-text-dim)]">
            Tocá un producto para agregarlo al ticket.
          </div>
        )}
        {cart.map((l) => (
          <div
            key={l.product_id}
            className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] p-2"
          >
            <div className="relative h-11 w-11 overflow-hidden rounded-md bg-[var(--color-bg-card)]">
              {l.image ? (
                <Image
                  src={storageUrl(l.image)}
                  alt={l.title}
                  fill
                  sizes="44px"
                  quality={90}
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--color-text-dim)]">
                  <Icon name="image" size={14} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-[var(--color-text)]">
                {l.title}
              </div>
              <div className="text-[11px] text-[var(--color-text-dim)]">
                {formatARS(l.price)} c/u
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => changeQty(l.product_id, -1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-card)]"
              >
                −
              </button>
              <div className="w-6 text-center font-mono text-[12px] text-[var(--color-text)]">
                {l.quantity}
              </div>
              <button
                onClick={() => changeQty(l.product_id, +1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-card)]"
              >
                +
              </button>
              <button
                onClick={() => removeLine(l.product_id)}
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-danger)] hover:bg-[var(--color-bg-card)]"
                title="Quitar"
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
          Método de pago
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-[10px] border px-2 py-2 text-[12px] font-semibold transition",
                method === m.value
                  ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              )}
            >
              <Icon name={m.icon} size={13} />
              {m.label}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-baseline justify-between">
          <div className="text-[12px] text-[var(--color-text-dim)]">Total</div>
          <div className="font-grotesk text-[22px] font-bold text-[var(--color-text)]">
            {formatARS(total)}
          </div>
        </div>

        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || cart.length === 0}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
        >
          <Icon name="check" size={15} />
          {saveMut.isPending ? "Procesando…" : "Cobrar venta"}
        </button>
      </div>
    </>
  );

  return (
    <AdminShell title="POS" subtitle="Ventas presenciales en caja">
      <div className="grid grid-cols-1 gap-3.5 lg:h-[calc(100vh-130px)] lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-h-0 min-w-0 flex-col gap-3 pb-24 lg:pb-0">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU…"
                className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] pl-9 pr-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
              />
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]">
                <Icon name="search" size={14} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-[12px] font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <Icon name="plus" size={13} />
              <span className="hidden sm:inline">Carga manual</span>
              <span className="sm:hidden">Manual</span>
            </button>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
            <button
              onClick={() => setCategoryId(null)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold transition",
                categoryId === null
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-button-text)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)]"
              )}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(String(c.id))}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold transition",
                  categoryId === String(c.id)
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-button-text)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)]"
                )}
              >
                {c.title}
              </button>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {productsQ.isLoading && (
              <div className="col-span-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
                Cargando productos…
              </div>
            )}
            {!productsQ.isLoading && filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
                Sin resultados.
              </div>
            )}
            {filtered.map((p) => {
              const img = firstImage(p);
              const stock = Number(p.stock ?? 0);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={stock <= 0}
                  className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-left transition hover:border-[var(--color-accent)] disabled:opacity-50"
                >
                  <div className="relative aspect-square bg-[var(--color-bg-input)]">
                    {img ? (
                      <Image
                        src={storageUrl(img)}
                        alt={p.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 280px"
                        quality={90}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--color-text-dim)]">
                        <Icon name="image" size={16} />
                      </div>
                    )}
                    <span
                      className={cn(
                        "absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-semibold",
                        stock > 0
                          ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
                          : "bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] text-[var(--color-danger)]"
                      )}
                    >
                      {stock > 0 ? stock : "0"}
                    </span>
                  </div>
                  <div className="p-1.5">
                    <div className="truncate text-[11px] font-medium leading-tight text-[var(--color-text)]">
                      {p.title}
                    </div>
                    <div className="mt-0.5 font-grotesk text-[12px] font-semibold text-[var(--color-accent)]">
                      {formatARS(Number(p.price))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="hidden min-h-0 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] lg:flex lg:h-full">
          {ticket}
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 p-3 backdrop-blur-md lg:hidden">
        <div className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
          Tocá aquí para concretar la venta
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          disabled={cart.length === 0}
          className="flex h-12 w-full items-center justify-between rounded-xl bg-[var(--color-accent)] px-4 text-[var(--color-button-text)] disabled:opacity-50"
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <Icon name="cart" size={15} />
            {itemCount} {itemCount === 1 ? "producto" : "productos"}
          </span>
          <span className="font-grotesk text-[16px] font-bold">
            {formatARS(total)}
          </span>
        </button>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-bg-card)]">
            {ticket}
          </div>
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setManualOpen(false)}
          />
          <div className="relative flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] sm:max-w-[520px] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                  Carga manual
                </div>
                <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
                  Agregar productos sin stock
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                aria-label="Cerrar"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-2 text-[12px] text-[var(--color-text-dim)]">
                Una línea por producto con el formato:
                <span className="ml-1 font-mono text-[var(--color-text)]">
                  CANTIDAD NOMBRE PRECIO
                </span>
              </p>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={6}
                placeholder={"2 Labial rojo premium 3500\n1 Base líquida 4200"}
                className="w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] p-3 font-mono text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
              />

              {manualHasContent && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {parsedManual.map((p) => {
                    if ("empty" in p) return null;
                    const isOk = "quantity" in p;
                    return (
                      <div
                        key={p.idx}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px]",
                          isOk
                            ? "border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-text)]"
                            : "border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] text-[var(--color-text)]"
                        )}
                      >
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold",
                            isOk
                              ? "text-[var(--color-success)]"
                              : "text-[var(--color-danger)]"
                          )}
                        >
                          L{p.idx + 1}
                        </span>
                        {isOk ? (
                          <>
                            <span className="font-mono text-[11px] text-[var(--color-text-dim)]">
                              {p.quantity}×
                            </span>
                            <span className="flex-1 truncate">{p.title}</span>
                            <span className="font-grotesk font-semibold">
                              {formatARS(p.price)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 truncate text-[var(--color-text-dim)]">
                              {p.line}
                            </span>
                            <span className="text-[var(--color-danger)]">
                              {p.error}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] p-3">
              <div className="text-[11px] text-[var(--color-text-dim)]">
                {validManualLines.length}{" "}
                {validManualLines.length === 1 ? "válida" : "válidas"}
                {invalidManualLines.length > 0 && (
                  <span className="ml-1 text-[var(--color-danger)]">
                    · {invalidManualLines.length} con error
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManualOpen(false)}
                  className="h-10 rounded-[10px] border border-[var(--color-border)] px-3 text-[12px] font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={addManualToCart}
                  disabled={
                    validManualLines.length === 0 ||
                    invalidManualLines.length > 0
                  }
                  className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-50"
                >
                  <Icon name="check" size={13} />
                  Agregar al ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
