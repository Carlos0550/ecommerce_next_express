import { prisma } from "@/config/prisma";
import { comparePassword, hashPassword } from "@/config/bcrypt";
import { randomBytes } from "crypto";
import type { Request, Response } from "express";
import { signToken } from "@/config/jwt";
import { sendEmail } from "@/config/resend";
import { welcomeKuromiHTML } from "@/templates/welcome_kuromi";
import { new_user_html } from "@/templates/new_user";
import BusinessServices from "@/modules/Business/business.services";
import { getActivePalette } from "@/utils/getActivePalette";
import { logger } from "@/utils/logger";
import {
  errors,
} from "@/utils/errors";

class AuthServices {
  async loginAdmin(req: Request, _res: Response) {
    const { email, password } = req.body as { email?: string; password?: string };
    const user = await prisma.user.findFirst({
      where: { email, role: "ADMIN" },
      select: { id: true, email: true, password: true, name: true, role: true, profile_image: true, is_active: true },
    });
    if (!user) throw errors.invalidCredentials();
    if (!user.is_active) throw errors.invalidCredentials();
    const isPasswordValid = await comparePassword(password ?? "", user.password);
    if (!isPasswordValid) throw errors.invalidCredentials();
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      role: "ADMIN",
      subjectType: "admin",
    };
    const token = signToken(payload);
    const { password: _pw, ...user_without_password } = user;
    return {
      ok: true as const,
      token,
      user: user_without_password,
    };
  }

  async loginShop(req: Request, _res: Response) {
    const { email, password } = req.body as { email?: string; password?: string };
    const user = await prisma.user.findFirst({
      where: { email, role: "CUSTOMER" },
      select: { id: true, email: true, password: true, name: true, role: true, is_active: true, profile_image: true },
    });
    if (!user) throw errors.invalidCredentials();
    if (!user.is_active) throw errors.invalidCredentials();
    const isPasswordValid = await comparePassword(password ?? "", user.password);
    if (!isPasswordValid) throw errors.invalidCredentials();
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      profile_image: user.profile_image,
      role: "CUSTOMER",
      subjectType: "user",
    };
    const token = signToken(payload);
    const { password: _pw, ...user_without_password } = user;
    return {
      ok: true as const,
      token,
      user: user_without_password,
    };
  }

  async registerShop(req: Request, _res: Response) {
    const { email, name, password, asAdmin } = req.body as {
      email?: string;
      name?: string;
      password?: string;
      asAdmin?: boolean;
    };
    if (!email || !name || !password) throw errors.missingFields(["email", "name", "password"]);
    if (asAdmin) throw errors.adminRegistrationDisabled();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw errors.emailTaken();
    const normalized_name = name.trim().toLowerCase();
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: normalized_name, role: "CUSTOMER", is_active: true },
    });
    const capitalized_name = normalized_name.replace(/\b\w/g, (m: string) => m.toUpperCase());
    try {
      const business = await BusinessServices.getBusiness();
      const businessName = business?.name || "Tienda online";
      const palette = await getActivePalette();
      const text_message_pass = `
        <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_muted}};">
        Tu contraseña de acceso es: <strong>${password}</strong>
        </p>`;
      const html = welcomeKuromiHTML(
        capitalized_name,
        text_message_pass,
        business,
        palette as any,
      );
      await sendEmail({
        to: user.email,
        subject: `Bienvenido/a a ${businessName}`,
        text: `Hola ${capitalized_name}, tu contraseña es: ${password}`,
        html,
      });
    } catch (err) {
      logger.warn("register_shop_email_failed", {
        userId: user.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      role: "CUSTOMER",
      subjectType: "user",
    };
    const token = signToken(payload);
    return {
      ok: true as const,
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async resetPasswordShop(req: Request, _res: Response) {
    const { email } = req.body as { email?: string };
    if (!email) throw errors.missingFields(["email"]);
    const user = await prisma.user.findFirst({ where: { email, role: "CUSTOMER" } });
    if (!user) return { ok: true as const };
    const code = randomBytes(3).toString("hex").toUpperCase();
    const hashed = await hashPassword(code);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    try {
      await sendEmail({
        to: user.email,
        subject: "Recuperación de contraseña",
        text: `Tu nueva contraseña temporal es: ${code}. Ingresa y cámbiala desde tu cuenta.`,
      });
    } catch (err) {
      logger.warn("reset_password_shop_email_failed", {
        userId: user.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    return { ok: true as const };
  }

  async changePasswordShop(req: Request, _res: Response) {
    const { old_password, new_password } = req.body as {
      old_password?: string;
      new_password?: string;
    };
    if (!old_password || !new_password)
      throw errors.missingFields(["old_password", "new_password"]);
    const userClaim = (req as any).user;
    const user = await prisma.user.findUnique({
      where: { id: Number(userClaim.sub || userClaim.id) },
    });
    if (!user) throw errors.userNotFound();
    const ok = await comparePassword(old_password, user.password);
    if (!ok) throw errors.invalidOldPassword();
    const hashed = await hashPassword(new_password);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return { ok: true as const };
  }

  async registerAdmin(req: Request, _res: Response) {
    const { email, name } = req.body as { email?: string; name?: string };
    if (!email || !name) throw errors.missingFields(["email", "name"]);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw errors.emailTaken();
    const normalized_name = name.trim().toLowerCase();
    const secure_password = randomBytes(12).toString("base64url");
    const hashed = await hashPassword(secure_password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: normalized_name, role: "ADMIN", is_active: true },
    });
    const capitalized_name = normalized_name.replace(/\b\w/g, (m: string) => m.toUpperCase());
    try {
      const business = await BusinessServices.getBusiness();
      const businessName = business?.name || "Tienda online";
      const palette = await getActivePalette();
      const text_message = `
        <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_muted}};">
          Tu contraseña de acceso es: <strong>${secure_password}</strong>
        </p>`;
      const html = welcomeKuromiHTML(capitalized_name, text_message, business, palette as any);
      await sendEmail({
        to: user.email,
        subject: `Bienvenido/a a ${businessName}`,
        text: `Hola ${capitalized_name}, tu contraseña es: ${secure_password}`,
        html,
      });
    } catch (err) {
      logger.warn("register_admin_email_failed", {
        userId: user.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    const { password: _pw, ...userOut } = user;
    return { ok: true as const, user: userOut };
  }

  async newUser(req: Request, _res: Response) {
    const { email, role_id, name, phone } = req.body as {
      email?: string;
      role_id?: number;
      name?: string;
      phone?: string;
    };
    if (!email || !name || !role_id) throw errors.missingFields(["email", "name", "role_id"]);
    const role: "ADMIN" | "CUSTOMER" = Number(role_id) === 1 ? "ADMIN" : "CUSTOMER";
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw errors.emailTaken();
    const secure_password = randomBytes(12).toString("base64url");
    const hashedPassword = await hashPassword(secure_password);
    const normalized_name = name.trim().toLowerCase();
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: normalized_name,
        role,
        phone: phone ? String(phone).trim() : undefined,
        is_active: true,
      },
    });
    const text_message =
      role === "CUSTOMER"
        ? `<p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_main}};">
            Desde hoy, estás listo/a para explorar todo nuestro catálogo de productos.
           </p>`
        : `<p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_main}};">
            Fuiste invitado para administrar y gestionar todo nuestro catálogo.
            Tu contraseña temporal es: ${secure_password}
           </p>`;
    const capitalized_name = normalized_name.replace(/\b\w/g, (m: string) => m.toUpperCase());
    try {
      const business = await BusinessServices.getBusiness();
      const businessName = business?.name || "Tienda online";
      const palette = await getActivePalette();
      const html = new_user_html(capitalized_name, text_message, business, palette as any);
      await sendEmail({
        to: user.email,
        subject: `Bienvenido/a a ${businessName}`,
        text: `Hola ${capitalized_name}, bienvenido/a a ${businessName}`,
        html,
      });
    } catch (err) {
      logger.warn("new_user_email_failed", {
        userId: user.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    const { password: _pw, ...userOut } = user;
    return { ok: true as const, user: userOut };
  }

  async getUsers(req: Request, _res: Response) {
    const { page, limit, search, type } = req.query as Record<string, string | undefined>;
    const pageQ = Math.max(1, Number(page) || 1);
    const limitQ = Math.min(100, Math.max(1, Number(limit) || 10));
    const searchQ = (search ? String(search) : "").trim();
    const isAdmin = String(type || "user").toLowerCase() === "admin";
    const role: "ADMIN" | "CUSTOMER" = isAdmin ? "ADMIN" : "CUSTOMER";
    const where: Record<string, unknown> = { role };
    if (searchQ) {
      where.OR = [
        { name: { contains: searchQ, mode: "insensitive" } },
        { email: { contains: searchQ, mode: "insensitive" } },
      ];
    }
    const [count, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, phone: true, is_active: true },
        where,
        skip: (pageQ - 1) * limitQ,
        take: limitQ,
        orderBy: { created_at: "desc" },
      }),
    ]);
    const total_pages = Math.ceil(count / limitQ) || 1;
    return {
      ok: true as const,
      users: users.map((u) => ({ ...u, id: String(u.id) })),
      pagination: {
        total: count,
        page: pageQ,
        limit: limitQ,
        totalPages: total_pages,
        hasNextPage: pageQ < total_pages,
        hasPrevPage: pageQ > 1,
      },
    };
  }

  async disableUser(req: Request, _res: Response) {
    const { id } = req.params as { id: string };
    const found = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!found) throw errors.userNotFound();
    await prisma.user.update({ where: { id: Number(id) }, data: { is_active: false } });
    return { ok: true as const };
  }

  async enableUser(req: Request, _res: Response) {
    const { id } = req.params as { id: string };
    const found = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!found) throw errors.userNotFound();
    await prisma.user.update({ where: { id: Number(id) }, data: { is_active: true } });
    return { ok: true as const };
  }

  async deleteUser(req: Request, _res: Response) {
    const { id } = req.params as { id: string };
    const found = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!found) throw errors.userNotFound();
    await prisma.user.delete({ where: { id: Number(id) } });
    return { ok: true as const };
  }

  async resetPasswordAdmin(req: Request, _res: Response) {
    const { email } = req.body as { email?: string };
    if (!email) throw errors.missingFields(["email"]);
    const admin = await prisma.user.findFirst({ where: { email, role: "ADMIN" } });
    if (!admin) return { ok: true as const };
    const code = randomBytes(3).toString("hex").toUpperCase();
    const hashed = await hashPassword(code);
    await prisma.user.update({ where: { id: admin.id }, data: { password: hashed } });
    try {
      await sendEmail({
        to: admin.email,
        subject: "Recuperación de contraseña",
        text: `Tu nueva contraseña temporal es: ${code}. Ingresa y cámbiala desde tu perfil.`,
      });
    } catch (err) {
      logger.warn("reset_password_admin_email_failed", {
        userId: admin.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
    return { ok: true as const };
  }

  async changePasswordAdmin(req: Request, _res: Response) {
    const { old_password, new_password } = req.body as {
      old_password?: string;
      new_password?: string;
    };
    if (!old_password || !new_password)
      throw errors.missingFields(["old_password", "new_password"]);
    const claim = (req as any).user;
    const user = await prisma.user.findUnique({
      where: { id: Number(claim.sub || claim.id) },
    });
    if (!user) throw errors.userNotFound();
    const ok = await comparePassword(old_password, user.password);
    if (!ok) throw errors.invalidOldPassword();
    const hashed = await hashPassword(new_password);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return { ok: true as const };
  }
}

export default AuthServices;
export { AuthServices };