import type { NextFunction, Request, Response } from "express"
import type { UpdateCategoryStatusSchema } from "./services/product.zod"
export const saveProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { title, price, stock } = req.body
    try {
        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                ok: false,
                error: "El título es obligatorio."
            })
        }
        if (price === undefined || price === null || price === "") {
            return res.status(400).json({
                ok: false,
                error: "El precio es obligatorio."
            })
        }
        const parsedPrice = typeof price === "string" ? parseFloat(price) : Number(price)
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({
                ok: false,
                error: "El precio debe ser un número mayor o igual a 0."
            })
        }
        if (stock === undefined || stock === null || stock === "") {
            return res.status(400).json({
                ok: false,
                error: "El stock es obligatorio."
            })
        }
        const parsedStock = typeof stock === "string" ? parseInt(stock, 10) : Number(stock)
        if (!Number.isFinite(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
            return res.status(400).json({
                ok: false,
                error: "El stock debe ser un número entero mayor o igual a 0."
            })
        }
        next()
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor al validar la subida del producto, por favor intente nuevamente."
        })
    }
}
export const saveCategory = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const {
            title,
        } = req.body
        if(!title){
            return res.status(400).json({
                ok: false,
                error: "El título esta vacio, por favor coloque un titulo."
            })
        }
        next()
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor al validar esta solicitud, por favor intente nuevamente."
        })
    }
}
export const getAllProducts = async (req:Request, res: Response, next: NextFunction) => {
    try {
        const {
            page,
            limit,
            title,
            categoryId,
            isActive
        } = req.query
        if(!page || !limit){
            return res.status(400).json({
                ok: false,
                error: "Faltan parametros obligatorios: page, limit."
            })
        }
        if(title !== undefined && title === ""){
            return res.status(400).json({
                ok: false,
                error: "El parametro title no puede estar vacio."
            })
        }
        if(categoryId !== undefined && categoryId === ""){
            return res.status(400).json({
                ok: false,
                error: "El parametro categoryId no puede estar vacio."
            })
        }
        if(isActive !== undefined){
            const parsedBool = isActive === 'true' ? true : 
                            isActive === 'false' ? false : undefined;
            if(parsedBool === undefined){
                return res.status(400).json({
                    ok: false,
                    error: "El parametro isActive debe ser true o false."
                })
            }
        }
        next()
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor al validar esta solicitud, por favor intente nuevamente."
        })
    }
}
export const updateProductController = async (req: Request, res: Response, next: NextFunction) => {
    const { title, price, stock } = req.body;
    const { product_id } = req.params;
    try {
        if (!product_id) {
            return res.status(400).json({
                ok: false,
                error: "Faltan parametros obligatorios: product_id."
            })
        }
        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                ok: false,
                error: "El título es obligatorio."
            })
        }
        if (price === undefined || price === null || price === "") {
            return res.status(400).json({
                ok: false,
                error: "El precio es obligatorio."
            })
        }
        const parsedPrice = typeof price === "string" ? parseFloat(price) : Number(price)
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({
                ok: false,
                error: "El precio debe ser un número mayor o igual a 0."
            })
        }
        if (stock === undefined || stock === null || stock === "") {
            return res.status(400).json({
                ok: false,
                error: "El stock es obligatorio."
            })
        }
        const parsedStock = typeof stock === "string" ? parseInt(stock, 10) : Number(stock)
        if (!Number.isFinite(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
            return res.status(400).json({
                ok: false,
                error: "El stock debe ser un número entero mayor o igual a 0."
            })
        }
        next()
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor al validar la actualización del producto, por favor intente nuevamente."
        })
    }
}
export const changeCategoryStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            category_id,
            status,
        } = req.params as unknown as UpdateCategoryStatusSchema
        if(!category_id || !status){
            return res.status(400).json({
                ok: false,
                error: "Faltan parametros obligatorios: category_id, status."
            })
        }
        const statusNumber = parseInt(status);
        if(![1,2,3].includes(statusNumber) || isNaN(statusNumber)){
            return res.status(400).json({
                ok: false,
                error: "El parametro status debe ser activo(1), inactivo(2) o eliminado(3)."
            })
        }
        next()
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor al validar esta solicitud, por favor intente nuevamente."
        })
    }
}
export const changeProductStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { product_id, state } = req.params as { product_id?: string; state?: string };
        if (!product_id || !state) {
            return res.status(400).json({
                ok: false,
                error: "Faltan parametros obligatorios: product_id, state."
            })
        }
        const allowed = ["active","inactive","draft","out_stock","deleted"];
        if (!allowed.includes(state)) {
            return res.status(400).json({
                ok: false,
                error: "El estado es inválido. Debe ser active, inactive, draft, out_stock o deleted."
            })
        }
        next()
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor al validar esta solicitud, por favor intente nuevamente."
        })
    }
}
