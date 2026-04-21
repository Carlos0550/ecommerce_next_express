import type { Request, Response } from "express";
import SalesServices from "./services/sales.services";
import type { SaleRequest } from "./services/schemas/sales.schemas";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import { prisma } from "@/config/prisma";
import { createSignedUrl } from "@/config/minio";
import { asyncHandler } from "@/utils/asyncHandler";
import { BadRequestError, NotFoundError, AppError } from "@/utils/errors";

export const saveSale = asyncHandler(async (req: Request, res: Response) => {
    const request = req.body as SaleRequest;
    const hasProducts = Array.isArray(request.product_ids) && request.product_ids.length > 0;
    const hasManual = !!request.loadedManually && Array.isArray(request.manualProducts) && request.manualProducts.length > 0;
    if (!request.payment_method || !request.source || (!hasProducts && !hasManual)) {
        throw new BadRequestError("Faltan datos obligatorios para guardar la venta.", { code: "missing_sale_fields" });
    }
    const response = await SalesServices.saveSale(request);
    if (response === true || typeof response === "string") {
        res.status(200).json({
            success: true,
            message: "Venta guardada exitosamente.",
            saleId: typeof response === "string" ? response : undefined,
        });
        return;
    }
    throw new BadRequestError(
        (response as { message?: string } | null)?.message ?? "Error al guardar la venta.",
        { code: "sale_save_failed" },
    );
});

export const getSales = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const per_page = Number(req.query.per_page ?? req.query.limit) || 10;
    const start_date = (req.query.start_date as string | undefined) ?? undefined;
    const end_date = (req.query.end_date as string | undefined) ?? undefined;
    const pendingQuery = req.query.pending;
    const pending = (typeof pendingQuery === "string" ? pendingQuery : "").trim().toLowerCase() === "true";
    const response = await SalesServices.getSales({ page, per_page, start_date, end_date, pending });
    if (!Array.isArray(response?.sales)) {
        throw new BadRequestError("Error al obtener las ventas.", { code: "sales_fetch_failed" });
    }
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
    const response = await SalesServices.getSalesAnalytics({ start_date, end_date });
    const r = response as { success?: boolean; message?: string } | null;
    if (r?.success === false) {
        throw new BadRequestError(r.message ?? "analytics_error", { code: "analytics_error" });
    }
    res.status(200).json({ success: true, analytics: response });
});

const processSaleHandler = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params?.id ?? "");
    if (!id) throw new BadRequestError("missing_id");
    const rs = await SalesServices.markProcessed(id);
    const r = rs as { success?: boolean; message?: string };
    if (!r?.success) throw new BadRequestError(r?.message ?? "process_failed");
    res.status(200).json({ success: true });
});
export const processSale = [requireAuth, requireRole(["ADMIN"]), processSaleHandler];

const declineSaleHandler = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params?.id ?? "");
    const rawReason = (req.body as { reason?: unknown })?.reason;
    const reason = typeof rawReason === "string" ? rawReason.trim() : "";
    if (!id) throw new BadRequestError("missing_id");
    if (!reason) throw new BadRequestError("missing_reason");
    const rs = await SalesServices.decline(id, reason);
    const r = rs as { success?: boolean; message?: string };
    if (!r?.success) throw new BadRequestError(r?.message ?? "decline_failed");
    res.status(200).json({ success: true });
});
export const declineSale = [requireAuth, requireRole(["ADMIN"]), declineSaleHandler];

const getSaleReceiptHandler = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params?.id ?? "");
    if (!id) throw new BadRequestError("missing_id");
    const order = await prisma.orders.findFirst({ where: { saleId: id } });
    if (!order?.transfer_receipt_path) throw new NotFoundError("receipt_not_found");
    const signed = await createSignedUrl("comprobantes", order.transfer_receipt_path, 3600);
    if (!signed.url) throw new AppError("signed_url_failed", { status: 500, code: "signed_url_failed" });
    res.status(200).json({ success: true, url: signed.url });
});
export const getSaleReceipt = [requireAuth, requireRole(["ADMIN"]), getSaleReceiptHandler];

const updateSaleHandler = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params?.id ?? "");
    const request = req.body as SaleRequest;
    if (!id) throw new BadRequestError("missing_id");
    const sale = await prisma.sales.findUnique({ where: { id } });
    if (!sale) throw new NotFoundError("sale_not_found");
    if (String(sale.source) === "WEB") throw new BadRequestError("edit_not_allowed_for_web");
    const hasProducts = Array.isArray(request.product_ids) && request.product_ids.length > 0;
    const hasManual = !!request.loadedManually && Array.isArray(request.manualProducts) && request.manualProducts.length > 0;
    if (!request.payment_method || (!hasProducts && !hasManual)) {
        throw new BadRequestError("invalid_request");
    }
    const rs = await SalesServices.updateSale(id, request);
    const r = rs as { success?: boolean; message?: string; sale?: unknown };
    if (!r?.success) throw new BadRequestError(r?.message ?? "update_failed");
    res.status(200).json({ success: true, sale: r.sale });
});
export const updateSale = [requireAuth, requireRole(["ADMIN"]), updateSaleHandler];

const deleteSaleHandler = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params?.id ?? "");
    if (!id) throw new BadRequestError("missing_id");
    const rs = await SalesServices.deleteSale(id);
    const r = rs as { success?: boolean; message?: string };
    if (!r?.success) throw new BadRequestError(r?.message ?? "delete_failed");
    res.status(200).json({ success: true });
});
export const deleteSale = [requireAuth, requireRole(["ADMIN"]), deleteSaleHandler];
