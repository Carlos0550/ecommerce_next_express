import { UserStatus } from "@prisma/client";
import { env } from "../../config/env";
import { createSessionToken, decryptString, encryptString, hashString, verifyHash } from "../../config/security";
import { logger } from "../../config/logger";
import { prisma } from "../../db/prisma";
import { sendMail } from "../../mail/mailer";
import { generateSecureString } from "../../utils/security.utils";
import { renderTemplate } from "../../utils/template.utils";
import { loginSchema, publicRegisterUserSchema, updateUserSchema } from "./user.zod";
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
            const business = await prisma.businessData.findFirst();
            const businessLogoBlock = business?.logo
                ? `<div style="margin:12px 0;"><img src="${business.logo}" alt="${business.name}" style="max-width:100%; height:auto; border-radius:6px;" /></div>`
                : "";
            const businessBannerBlock = business?.banner
                ? `<div style="margin:12px 0;"><img src="${business.banner}" alt="${business.name}" style="max-width:100%; height:auto; border-radius:6px;" /></div>`
                : "";
            const templateName = business ? "welcome_user_business.html" : "welcome_user.html";
            const html = await renderTemplate(templateName, {
                name: createdUser.name ?? "",
                email: createdUser.email,
                password: secureString,
                verifyUrl,
                businessName: business?.name ?? "",
                businessDescription: business?.description ?? "",
                businessAddress: business?.address ?? "",
                businessPhone: business?.phone ?? "",
                businessEmail: business?.email ?? "",
                businessWebsite: business?.website ?? "",
                businessLogoBlock,
                businessBannerBlock
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

    async login(data: z.infer<typeof loginSchema>): Promise<ServiceResponse>{
        try {
            const user = await prisma.user.findUnique({ where: { email: data.email } });
            if(!user){
                return { status: 404, message: "Usuario no encontrado." };
            }
            const isPasswordValid = await verifyHash(data.password, user.password);
            if(!isPasswordValid){
                return { status: 401, message: "Contraseña incorrecta." };
            }
            if(user.status !== UserStatus.ACTIVE){
                return { status: 403, message: "Cuenta no activa." };
            }
            if(!user.isVerified){
                return { status: 403, message: "Cuenta no verificada." };
            }
            const token = await createSessionToken({ id: user.id, email: user.email, role: user.role });
            return { status: 200, message: "Login exitoso.", data: { token } };
        } catch (error) {
            const err = error as Error
            logger.error("Error catched en login service: ", err.message)
            return { status: 500, message: "Error al iniciar sesion, por favor intente nuevamente.", err: err.message };
        }
    }

    async getMe(userId: string): Promise<ServiceResponse>{
        try {
            const user = await prisma.user.findUnique({
                where:{
                    id: userId
                },
                select:{
                    name: true,
                    email: true,
                    phone: true,
                    avatar: true,
                    role: true
                }
            })

            if(!user){
                return { status: 404, message: "Usuario no encontrado." };
            }

            return { status: 200, message: "Usuario encontrado.", data: user };
        } catch (error) {
            const err = error as Error
            logger.error("Error catched en getMe service: ", err.message)
            return { status: 500, message: "Error al obtener el usuario.", err: err.message };
        }
    }

    async updateMe(userId: string, data: z.infer<typeof updateUserSchema>): Promise<ServiceResponse>{
        try {
            if (!data.name && !data.email && !data.phone) {
                return { status: 400, message: "No hay datos para actualizar." };
            }
            const user = await prisma.user.update({
                where: { id: userId },
                data: {
                    ...(data.name ? { name: data.name } : {}),
                    ...(data.email ? { email: data.email } : {}),
                    ...(data.phone !== undefined ? { phone: data.phone } : {})
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    avatar: true
                }
            });

            return { status: 200, message: "Usuario actualizado.", data: user };
        } catch (error) {
            const err = error as Error
            logger.error("Error catched en updateMe service: ", err.message)
            return { status: 500, message: "Error al actualizar el usuario.", err: err.message };
        }
    }

    async updateAvatar(userId: string, avatarUrl: string): Promise<ServiceResponse>{
        try {
            const user = await prisma.user.update({
                where: { id: userId },
                data: { avatar: avatarUrl },
                select: {
                    id: true,
                    avatar: true
                }
            });

            return { status: 200, message: "Avatar actualizado.", data: user };
        } catch (error) {
            const err = error as Error
            logger.error("Error catched en updateAvatar service: ", err.message)
            return { status: 500, message: "Error al actualizar el avatar.", err: err.message };
        }
    }
}

export const userService = new UserService();