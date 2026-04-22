"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import { SalesTableLegacy, type LegacySale } from "./_components/sales-table-legacy";
import { SalesModal } from "./_components/sales-modal";
import { SalesFormLegacy } from "./_components/sales-form-legacy";

export default function AdminVentasPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editSale, setEditSale] = useState<LegacySale | null>(null);

  const openNew = () => {
    setEditSale(null);
    setFormOpen(true);
  };

  const openEdit = (sale: LegacySale) => {
    setEditSale(sale);
    setFormOpen(true);
  };

  const close = () => {
    setFormOpen(false);
    setEditSale(null);
  };

  return (
    <AdminShell
      title="Ventas"
      subtitle="Resumen detallado de ingresos y gestión de pedidos"
      actions={
        <button
          onClick={openNew}
          className="hidden h-9 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3.5 text-[13px] font-semibold text-white hover:brightness-110 md:inline-flex"
        >
          <Icon name="plus" size={14} />
          Realizar Venta
        </button>
      }
    >
      <SalesTableLegacy onEdit={openEdit} />

      <button
        onClick={openNew}
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-lg hover:brightness-110 md:hidden"
        aria-label="Realizar venta"
      >
        <Icon name="plus" size={22} />
      </button>

      <SalesModal
        open={formOpen}
        onClose={close}
        title={editSale ? "Editar venta" : "Nueva venta"}
        size="wide"
      >
        {formOpen && (
          <SalesFormLegacy sale={editSale ?? undefined} onClose={close} />
        )}
      </SalesModal>
    </AdminShell>
  );
}
