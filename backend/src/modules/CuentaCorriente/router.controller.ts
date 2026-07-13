import type { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import CuentaCorrienteServices from "./services/cuenta-corriente.services";
import {
  ClienteCCCreateSchema,
  ClienteCCUpdateSchema,
  ClienteCCListQuerySchema,
  ClienteCCCiclosQuerySchema,
  DeudaBulkSchema,
  DeudaUpdateSchema,
  PagoCreateSchema,
  PagoUpdateSchema,
} from "./services/schemas/cuenta-corriente.zod";
import { errors } from "@/utils/errors";

const service = new CuentaCorrienteServices();

function getId(req: Request, key = "id"): string {
  const v = req.params[key];
  const idStr = typeof v === "string" ? v : v?.[0];
  if (!idStr) throw errors.missingFields([key]);
  return idStr;
}

// ---------- Clientes ----------

export const listClientes = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ClienteCCListQuerySchema.safeParse(req.query);
  if (!parsed.success) throw errors.invalidPayload(parsed.error.flatten());
  const result = await service.listClientes({
    page: parsed.data.page ?? 1,
    limit: parsed.data.limit ?? 20,
    search: parsed.data.search,
    estado: parsed.data.estado,
  });
  res.json(result);
});

export const getCliente = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getClienteById(getId(req));
  res.json(result);
});

export const createCliente = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ClienteCCCreateSchema.safeParse(req.body);
  if (!parsed.success) throw errors.invalidPayload(parsed.error.flatten());
  const result = await service.createCliente(parsed.data);
  res.status(201).json(result);
});

export const updateCliente = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ClienteCCUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw errors.invalidPayload(parsed.error.flatten());
  const result = await service.updateCliente(getId(req), parsed.data);
  res.json(result);
});

export const deleteCliente = asyncHandler(async (req: Request, res: Response) => {
  await service.softDeleteCliente(getId(req));
  res.json({ ok: true, message: "Cliente eliminado" });
});

export const listCiclos = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ClienteCCCiclosQuerySchema.safeParse(req.query);
  if (!parsed.success) throw errors.invalidPayload(parsed.error.flatten());
  const result = await service.listCiclos(getId(req), {
    from: parsed.data.from,
    to: parsed.data.to,
  });
  res.json(result);
});

// ---------- Deudas ----------

export const addDeudasBulk = asyncHandler(async (req: Request, res: Response) => {
  const parsed = DeudaBulkSchema.safeParse(req.body);
  if (!parsed.success) throw errors.invalidPayload(parsed.error.flatten());
  const clienteId = getId(req, "clienteId");
  const result = await service.addDeudasBulk(clienteId, parsed.data);
  res.status(201).json(result);
});

export const updateDeuda = asyncHandler(async (req: Request, res: Response) => {
  const parsed = DeudaUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw errors.invalidPayload(parsed.error.flatten());
  const result = await service.updateDeuda(getId(req), parsed.data);
  res.json(result);
});

export const deleteDeuda = asyncHandler(async (req: Request, res: Response) => {
  await service.softDeleteDeuda(getId(req));
  res.json({ ok: true, message: "Deuda eliminada" });
});

// ---------- Pagos ----------

export const addPago = asyncHandler(async (req: Request, res: Response) => {
  const parsed = PagoCreateSchema.safeParse(req.body);
  if (!parsed.success) throw errors.invalidPayload(parsed.error.flatten());
  const cicloId = getId(req, "cicloId");
  const result = await service.addPago(cicloId, parsed.data);
  res.status(201).json(result);
});

export const updatePago = asyncHandler(async (req: Request, res: Response) => {
  const parsed = PagoUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw errors.invalidPayload(parsed.error.flatten());
  const result = await service.updatePago(getId(req), parsed.data);
  res.json(result);
});

export const deletePago = asyncHandler(async (req: Request, res: Response) => {
  await service.softDeletePago(getId(req));
  res.json({ ok: true, message: "Pago eliminado" });
});
