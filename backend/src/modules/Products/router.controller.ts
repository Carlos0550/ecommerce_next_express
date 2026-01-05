import { NextFunction, Request, Response } from "express"
import { UpdateCategoryStatusSchema } from "./services/product.zod"

export const saveProduct = async (req: Request, res: Response, next: NextFunction) => {
    const {
        title,
        price,
        category_id,
        fillWithAI,
    } = req.body

    try {
        console.log("fillWithAI:", fillWithAI)
        if (fillWithAI === true || fillWithAI === 'true') {
            if (!category_id) {
                return res.status(400).json({
                    ok: false,
                    error: "La categoría es obligatoria para completar con IA."
                })
            }
            
            
            const productImages = req.files;
            if (!productImages || !Array.isArray(productImages) || productImages.length === 0) {
                return res.status(400).json({
                    ok: false,
                    error: "Se requieren imágenes para completar con IA."
                })
            }
        } else {
            
            if (!title || !price || !category_id) {
                return res.status(400).json({
                    ok: false,
                    error: "Uno o más campos obligatorios están vacios."
                })
            }
        }
        
        next()
    } catch (error) {
        console.log(error)
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
        console.log(error)
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

        if(title !== undefined && title == ""){
            return res.status(400).json({
                ok: false,
                error: "El parametro title no puede estar vacio."
            })
        }

        if(categoryId !== undefined && categoryId == ""){
            return res.status(400).json({
                ok: false,
                error: "El parametro categoryId no puede estar vacio."
            })
        }
    
        if(isActive !== undefined){
            var parsedBool = isActive === 'true' ? true : 
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
        console.log(error)
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor al validar esta solicitud, por favor intente nuevamente."
        })
    }
}

export const updateProductController = async (req: Request, res: Response, next: NextFunction) => {
    const {
        title,
        description,
        price,
        tags,
        category_id,
        existing_image_urls,
        deleted_image_urls,
    } = req.body;

    const {
        product_id,
    } = req.params;
    console.log(deleted_image_urls)
    try {
        if (!title || !price || !category_id){
            return res.status(400).json({
                ok: false,
                error: "Uno o más campos obligatorios están vacios."
            })
        }

        if(!product_id){
            return res.status(400).json({
                ok: false,
                error: "Faltan parametros obligatorios: product_id."
            })
        }

        if(!existing_image_urls){
            return res.status(400).json({
                ok: false,
                error: "Faltan parametros obligatorios: existingImageUrls."
            })
        }
        
        next()
    } catch (error) {
        console.log(error)
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

        const statusNumber = parseInt(status as string);
        if(![1,2,3].includes(statusNumber) || isNaN(statusNumber)){
            return res.status(400).json({
                ok: false,
                error: "El parametro status debe ser activo(1), inactivo(2) o eliminado(3)."
            })
        }

        next()
    } catch (error) {
        console.log(error)
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
        console.log(error)
        return res.status(500).json({
            ok: false,
            error: "Error interno del servidor al validar esta solicitud, por favor intente nuevamente."
        })
    }
}