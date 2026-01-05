import { Request, Response } from "express";
import SalesServices from "./services/sales.services";
import { SaleRequest, SalesSummaryRequest } from "./services/schemas/sales.schemas";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import { prisma } from "@/config/prisma";
import { createSignedUrl } from "@/config/minio";

export const saveSale = async (req: Request, res: Response) => {
    try {
        const request = req.body as SaleRequest;
        const hasProducts = Array.isArray(request.product_ids) && request.product_ids.length > 0;
        const hasManual = !!request.loadedManually && Array.isArray(request.manualProducts) && request.manualProducts.length > 0;
        if(!request.payment_method || !request.source || (!hasProducts && !hasManual)){
            return res.status(400).json({
                success: false,
                message: "Faltan datos obligatorios para guardar la venta."
            })
        }
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        if (!tenantId) return res.status(400).json({ success: false, message: "tenant_required" });

        const response = await SalesServices.saveSale(request, tenantId);
        if(response === true || typeof response === 'string'){
            res.status(200).json({
                success: true,
                message: "Venta guardada exitosamente.",
                saleId: typeof response === 'string' ? response : undefined
            })
        } else {
            res.status(400).json({
                success: false,
                err: response.message,
                message: "Error al guardar la venta, por favor intente nuevamente."
            })
        }
    } catch (error: any) {
        console.log(error.message);
        res.status(500).json({
            success: false,
            err: error.message,
            message: "Error interno del servidor al guardar la venta, por favor intente nuevamente."
        })
    }
}

export const getSales = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const per_page = Number((req.query.per_page || req.query.limit)) || 10;
        const start_date = (req.query.start_date as string | undefined) || undefined;
        const end_date = (req.query.end_date as string | undefined) || undefined;
        const pending = String(req.query.pending || '').trim().toLowerCase() === 'true';
        (global as any).__pendingFilter = pending;
        const response = await SalesServices.getSales({ page, per_page, start_date, end_date });

        if (Array.isArray(response?.sales)) {
            res.set('Cache-Control', 'no-store');
            res.status(200).json({
                success: true,
                sales: response.sales,
                pagination: response.pagination,
                totalSalesByDate: response.totalSalesByDate || 0
            })
        } else {
            res.status(400).json({
                success: false,
                err: response,
                message: "Error al obtener las ventas, por favor intente nuevamente."
            })
        }
    } catch (error: any) {
        console.log(error.message);
        res.status(500).json({
            success: false,
            err: error.message,
            message: "Error interno del servidor al obtener las ventas, por favor intente nuevamente."
        })
    }
}

export const getSalesAnalytics = async (req: Request, res: Response) => {
    try {
        const start_date = (req.query.start_date as string | undefined) || undefined;
        const end_date = (req.query.end_date as string | undefined) || undefined;
        const response = await SalesServices.getSalesAnalytics({ start_date, end_date });

        if ((response as any)?.success === false) {
            return res.status(400).json({
                success: false,
                err: (response as any).message || 'analytics_error',
                message: "Error al obtener las analíticas de ventas, por favor intente nuevamente."
            })
        }

        res.status(200).json({
            success: true,
            analytics: response
        })
    } catch (error: any) {
        console.log(error.message);
        res.status(500).json({
            success: false,
            err: error.message,
            message: "Error interno del servidor al obtener las analíticas de ventas, por favor intente nuevamente."
        })
    }
}

export const processSale = [requireAuth, requireRole([1]), async (req: Request, res: Response) => {
    try {
        const id = String((req.params as any)?.id || '');
        if (!id) return res.status(400).json({ success: false, message: 'missing_id' });
        const rs = await SalesServices.markProcessed(id);
        if ((rs as any)?.success) return res.status(200).json({ success: true });
        return res.status(400).json({ success: false, err: (rs as any)?.message || 'process_failed' });
    } catch (error: any) {
        console.log(error.message);
        res.status(500).json({ success: false, err: error.message, message: 'internal_error' });
    }
}]

export const declineSale = [requireAuth, requireRole([1]), async (req: Request, res: Response) => {
    try {
        const id = String((req.params as any)?.id || '');
        const reason = String((req.body as any)?.reason || '').trim();
        if (!id) return res.status(400).json({ success: false, message: 'missing_id' });
        if (!reason) return res.status(400).json({ success: false, message: 'missing_reason' });
        const rs = await SalesServices.decline(id, reason);
        if ((rs as any)?.success) return res.status(200).json({ success: true });
        return res.status(400).json({ success: false, err: (rs as any)?.message || 'decline_failed' });
    } catch (error: any) {
        console.log(error.message);
        res.status(500).json({ success: false, err: error.message, message: 'internal_error' });
    }
}]

export const getSaleReceipt = [requireAuth, requireRole([1]), async (req: Request, res: Response) => {
    try {
        const id = String((req.params as any)?.id || '');
        if (!id) return res.status(400).json({ success: false, message: 'missing_id' });
        const order = await prisma.orders.findFirst({ where: { saleId: id } });
        if (!order?.transfer_receipt_path) return res.status(404).json({ success: false, message: 'receipt_not_found' });
        const signed = await createSignedUrl('comprobantes', order.transfer_receipt_path, 3600);
        if (!signed.url) return res.status(500).json({ success: false, message: 'signed_url_failed' });
        return res.status(200).json({ success: true, url: signed.url });
    } catch (error: any) {
        console.log(error.message);
        res.status(500).json({ success: false, err: error.message, message: 'internal_error' });
    }
}]

export const updateSale = [requireAuth, requireRole([1]), async (req: Request, res: Response) => {
    try {
        const id = String((req.params as any)?.id || '');
        const request = req.body as SaleRequest;
        if (!id) return res.status(400).json({ success: false, message: 'missing_id' });
        const sale = await prisma.sales.findUnique({ where: { id } });
        if (!sale) return res.status(404).json({ success: false, message: 'sale_not_found' });
        if (String(sale.source) === 'WEB') return res.status(400).json({ success: false, message: 'edit_not_allowed_for_web' });
        const hasProducts = Array.isArray(request.product_ids) && request.product_ids.length > 0;
        const hasManual = !!request.loadedManually && Array.isArray(request.manualProducts) && request.manualProducts.length > 0;
        if (!request.payment_method || (!hasProducts && !hasManual)) {
            return res.status(400).json({ success: false, message: 'invalid_request' });
        }
        const rs = await SalesServices.updateSale(id, request);
        if ((rs as any)?.success) return res.status(200).json({ success: true, sale: (rs as any).sale });
        return res.status(400).json({ success: false, err: (rs as any)?.message || 'update_failed' });
    } catch (error: any) {
        console.log(error.message);
        res.status(500).json({ success: false, err: error.message, message: 'internal_error' });
    }
}]

export const deleteSale = [requireAuth, requireRole([1]), async (req: Request, res: Response) => {
    try {
        const id = String((req.params as any)?.id || '');
        if (!id) return res.status(400).json({ success: false, message: 'missing_id' });
        const rs = await SalesServices.deleteSale(id);
        if ((rs as any)?.success) return res.status(200).json({ success: true });
        return res.status(400).json({ success: false, err: (rs as any)?.message || 'delete_failed' });
    } catch (error: any) {
        console.log(error.message);
        res.status(500).json({ success: false, err: error.message, message: 'internal_error' });
    }
}]


