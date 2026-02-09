import { Request, Response } from "express";
import { publicRegisterUserSchema } from "../services/Users/user.zod";
import z from "zod";
import { normalizeText, toE164Argentina } from "../utils/normalization.utils";
import { userService } from "../services/Users/user.service";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { renderTemplate } from "../utils/template.utils";

class UserController{
    async publicRegisterUser(req: Request, res: Response): Promise<Response>{
        try {
            const parsed = publicRegisterUserSchema.safeParse(req.body);
            if (!parsed.success) {
                logger.error("Error catched en publicRegisterUser controller: ", parsed.error.flatten().fieldErrors)
                return res.status(400).json({
                message: "Datos invalidos.",
                err: parsed.error.flatten().fieldErrors
            })
            }

            const {
                name,
                email,
                phone
            } = parsed.data

            req.body = {
                name: normalizeText(name),
                email: email.toLowerCase(),
                phone: phone ? toE164Argentina(normalizeText(phone)) : null
            }

            const user = await userService.publicRegisterUser(req.body);

            return res.status(user.status).json({
                message: user.message,
                err: user.err
            })
        } catch (error) {
            const err = error as Error
            logger.error("Error catched en publicRegisterUser controller: ", err.message)
            return res.status(500).json({ message: "Error interno del servidor, por favor intente nuevamente." });
        }
    }

    async verifyAccount(req: Request, res: Response): Promise<Response> {
        try {
            const token = typeof req.query.token === "string" ? req.query.token : "";
            if (!token) {
                const html = await renderTemplate("verify_failed.html", {
                    message: "El token de verificacion es requerido."
                });
                return res.status(400).type("html").send(html);
            }

            const result = await userService.verifyAccount(token);
            if (result.status === 200) {
                res.redirect(env.FRONTEND_URL);
                return res;
            }

            const html = await renderTemplate("verify_failed.html", {
                message: result.message
            });
            return res.status(result.status).type("html").send(html);
        } catch (error) {
            const err = error as Error
            logger.error("Error catched en verifyAccount controller: ", err.message)
            return res.status(500).type("html").send("Error interno del servidor.");
        }
    }
}

export const userController = new UserController();