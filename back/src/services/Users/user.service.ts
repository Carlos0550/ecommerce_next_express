import { UserStatus } from "@prisma/client";
import { env } from "../../config/env";
import { decryptString, encryptString, hashString } from "../../config/security";
import { logger } from "../../config/logger";
import { prisma } from "../../db/prisma";
import { sendMail } from "../../mail/mailer";
import { generateSecureString } from "../../utils/security.utils";
import { renderTemplate } from "../../utils/template.utils";
import { publicRegisterUserSchema } from "./user.zod";
import { z } from "zod";

class UserService{
    async publicRegisterUser(userData: z.infer<typeof publicRegisterUserSchema>): Promise<ServiceResponse>{
        let createdUser: { id: string; email: string; name: string | null } | null = null;
        try {
            const secureString = generateSecureString()
            const securePassword = await hashString(secureString)

            createdUser = await prisma.user.create({
                data:{
                    name: userData.name,
                    email:userData.email,
                    phone: userData.phone ?? "",
                    password: securePassword,
                    isVerified: false,
                    status: UserStatus.PENDING
                },
                select: { id: true, email: true, name: true }
            })

            const tokenPayload = JSON.stringify({
                id: createdUser.id,
                email: createdUser.email
            });
            const token = encryptString(tokenPayload);
            const backendUrl = (env.BACKEND_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, "");
            const verifyUrl = `${backendUrl}/api/public/verify?token=${encodeURIComponent(token)}`;
            const html = await renderTemplate("welcome_user.html", {
                name: createdUser.name ?? "",
                email: createdUser.email,
                password: secureString,
                verifyUrl
            });

            await sendMail({
                to: createdUser.email,
                subject: "Bienvenido a Cinnamon",
                html
            });

            return {
                status: 200,
                message: "Usuario registrado correctamente, verifique su correo para activar su cuenta."
            }
        } catch (error) {
            const err = error as Error
            logger.error("Error catched en publicRegisterUser service: ",err.message)
            if (createdUser) {
                await prisma.user.delete({ where: { id: createdUser.id } }).catch((cleanupError) => {
                    logger.error("Error al limpiar usuario creado: ", (cleanupError as Error).message);
                });
            }
            return {
                status: 500,
                message: "Error al registrar el usuario, por favor intente nuevamente.",
                err: err.message
            }
        }
    }

    async verifyAccount(token: string): Promise<ServiceResponse>{
        try {
            let payloadRaw = "";
            try {
                payloadRaw = decryptString(token);
            } catch {
                return { status: 400, message: "Token de verificacion invalido." };
            }

            let payload: { id?: string; email?: string } = {};
            try {
                payload = JSON.parse(payloadRaw) as { id?: string; email?: string };
            } catch {
                return { status: 400, message: "Token de verificacion invalido." };
            }
            if (!payload.id || !payload.email) {
                return { status: 400, message: "Token de verificacion invalido." };
            }

            const user = await prisma.user.findUnique({ where: { id: payload.id } });
            if (!user || user.email !== payload.email) {
                return { status: 404, message: "Usuario no encontrado para este token." };
            }
            if (user.isVerified) {
                return { status: 409, message: "La cuenta ya fue verificada." };
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { isVerified: true, status: UserStatus.ACTIVE }
            });

            return { status: 200, message: "Cuenta verificada correctamente." };
        } catch (error) {
            const err = error as Error
            logger.error("Error catched en verifyAccount service: ", err.message)
            return { status: 500, message: "No se pudo verificar la cuenta.", err: err.message };
        }
    }
}

export const userService = new UserService();