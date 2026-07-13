import type { Request, Response } from "express";
import SalesServices from "./services/sales.services";
import type { SaleRequest } from "./services/schemas/sales.schemas";
import { prisma } from "@/config/prisma";
import { createSignedUrl } from "@/config/minio";
import { asyncHandler } from "@/utils/asyncHandler";
import { BadRequestError, NotFoundError, errors } from "@/utils/errors";

export const saveSale = asyncHandler(async (req: Request, res: Response) => {
  const request = req.body as SaleRequest;
  const hasProducts = Array.isArray(request.product_ids) && request.product_ids.length > 0;
  const hasManual = !!request.loadedManually && Array.isArray(request.manualProducts) && request.manualProducts.length > 0;
  if (!request.payment_method || !request.source || (!hasProducts && !hasManual)) {
    throw errors.missingFields(["payment_method", "source", "products"]);
  }
  const saleId = await SalesServices.saveSale(request);
  res.status(200).json({
    success: true,
    message: "Venta guardada exitosamente.",
    saleId: typeof saleId === "string" ? saleId : undefined,
  });
});

export const getSales = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const per_page = Number(req.query.per_page ?? req.query.limit) || 10;
  const start_date = (req.query.start_date as string | undefined) ?? undefined;
  const end_date = (req.query.end_date as string | undefined) ?? undefined;
  const pendingQuery = req.query.pending;
  const pending = (typeof pendingQuery === "string" ? pendingQuery : "").trim().toLowerCase() === "true";
  const response = await SalesServices.getSales({ page, per_page, start_date, end_date, pending });
  res.set("Cache-Control", "no-store");
  res.status(200).json({
    success: true,
    sales: response.sales,
    pagination: response.pagination,
    totalSalesByDate: response.totalSalesByDate || 0,
  });
});

export const getSalesAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const start_date = (req.query.start_date as string | undefined) ?? undefined;
  const end_date = (req.query.end_date as string | undefined) ?? undefined;
  const analytics = await SalesServices.getSalesAnalytics({ start_date, end_date });
  res.status(200).json({ success: true, analytics });
});

export const getSaleReceipt = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params?.id ?? "");
  if (!id) throw errors.missingFields(["id"]);
  const order = await prisma.orders.findFirst({ where: { saleId: id } });
  if (!order?.transfer_receipt_path) throw errors.receiptNotFound();
  const signed = await createSignedUrl("comprobantes", order.transfer_receipt_path, 3600);
  if (!signed.url) throw errors.signedUrlFailed();
  res.status(200).json({ success: true, url: signed.url });
});

void BadRequestError;
void NotFoundError;

export const updateSale = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params?.id ?? "");
  const request = req.body as SaleRequest;
  if (!id) throw errors.missingFields(["id"]);
  const sale = await prisma.sales.findUnique({ where: { id } });
  if (!sale) throw new NotFoundError("Venta no encontrada", "sale_not_found");
  if (String(sale.source) === "WEB")
    throw new BadRequestError(
      "No se puede editar una venta del canal web",
      undefined,
      "edit_not_allowed_for_web",
    );
  const hasProducts = Array.isArray(request.product_ids) && request.product_ids.length > 0;
  const hasManual = !!request.loadedManually && Array.isArray(request.manualProducts) && request.manualProducts.length > 0;
  if (!request.payment_method || (!hasProducts && !hasManual)) {
    throw errors.invalidPayload();
  }
  const updated = await SalesServices.updateSale(id, request);
  res.status(200).json({ success: true, sale: updated });
});

export const deleteSale = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params?.id ?? "");
  if (!id) throw errors.missingFields(["id"]);
  await SalesServices.deleteSale(id);
  res.status(200).json({ success: true });
});