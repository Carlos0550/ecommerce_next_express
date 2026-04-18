import { prisma } from "@/config/prisma";
import { comparePassword, hashPassword } from "@/config/bcrypt";
import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { signToken } from "@/config/jwt";
import { sendEmail } from "@/config/resend";
import { welcomeKuromiHTML } from "@/templates/welcome_kuromi";
import { new_user_html } from "@/templates/new_user";
import BusinessServices from "@/modules/Business/business.services";
import { getActivePalette } from "@/utils/getActivePalette";

class AuthServices {
  async loginAdmin(req: Request, res: Response) {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({
      where: { email, role: "ADMIN" },
      select: { id: true, email: true, password: true, name: true, role: true, profile_image: true, is_active: true },
    });
    const invalidResponse = () =>
      res.status(401).json({ ok: false, error: "invalid_credentials", message: "Credenciales inválidas" });
    if (!user) return invalidResponse();
    if (!user.is_active) return invalidResponse();
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) return invalidResponse();
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      role: 1,
      subjectType: "admin",
    };
    const token = signToken(payload);
    const { password: _pw, ...user_without_password } = user;
    return res.status(200).json({ ok: true, token, user: user_without_password });
  }

  async loginShop(req: Request, res: Response) {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({
      where: { email, role: "CUSTOMER" },
      select: { id: true, email: true, password: true, name: true, role: true, is_active: true, profile_image: true },
    });
    const invalidResponse = () =>
      res.status(401).json({ ok: false, error: "invalid_credentials", message: "Credenciales inválidas" });
    if (!user) return invalidResponse();
    if (!user.is_active) return invalidResponse();
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) return invalidResponse();
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      profile_image: user.profile_image,
      role: 2,
      subjectType: "user",
    };
    const token = signToken(payload);
    const { password: _pw, ...user_without_password } = user;
    return res.status(200).json({ ok: true, token, user: user_without_password });
  }

  async registerShop(req: Request, res: Response) {
    try {
      const { email, name, asAdmin } = req.body;
      if (!email || !name) {
        return res.status(400).json({ ok: false, error: "missing_fields", message: "Todos los campos son obligatorios" });
      }
      if (asAdmin) {
        return res.status(403).json({ ok: false, error: "admin_registration_disabled", message: "El registro de administradores no está habilitado." });
      }
      const secure_password = randomBytes(12).toString("base64url");
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ ok: false, error: "email_already_registered", message: "El correo ya está registrado" });
      }
      const normalized_name = name.trim().toLowerCase();
      const hashed = await hashPassword(secure_password);
      const user = await prisma.user.create({
        data: { email, password: hashed, name: normalized_name, role: "CUSTOMER", is_active: true },
      });
      const capitalized_name = normalized_name.replace(/\b\w/g, (m: string) => m.toUpperCase());
      try {
        const business = await BusinessServices.getBusiness();
        const businessName = business?.name || "Tienda online";
        const palette = await getActivePalette();
        const text_message = `
          <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_main}};">
          Desde hoy, estás listo/a para explorar todo nuestro catálogo de productos,
          desde maquillaje hasta accesorios, y descubrir tu estilo único.
          </p>`;
        const text_message_pass = `
          <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_muted}};">
          Tu contraseña de acceso es: <strong>${secure_password}</strong>
          </p>`;
        const html = welcomeKuromiHTML(
          capitalized_name,
          text_message + text_message_pass,
          business as any,
          palette as any,
        );
        await sendEmail({
          to: user.email,
          subject: `Bienvenido/a a ${businessName}`,
          text: `Hola ${capitalized_name}, tu contraseña es: ${secure_password}`,
          html,
        });
      } catch (err) {
        console.error("register_shop_email_failed", err);
      }
      const payload = {
        sub: user.id.toString(),
        email: user.email,
        name: user.name,
        role: 2,
        subjectType: "user",
      };
      const token = signToken(payload);
      return res.status(200).json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "register_failed" });
    }
  }

  async resetPasswordShop(req: Request, res: Response) {
    try {
      const { email } = req.body as { email?: string };
      if (!email) return res.status(400).json({ ok: false, error: "missing_email" });
      const user = await prisma.user.findFirst({ where: { email, role: "CUSTOMER" } });
      if (!user) return res.status(200).json({ ok: true });
      const code = randomBytes(3).toString("hex").toUpperCase();
      const hashed = await hashPassword(code);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      try {
        await sendEmail({
          to: user.email,
          subject: "Recuperación de contraseña",
          text: `Tu nueva contraseña temporal es: ${code}. Ingresa y cámbiala desde tu cuenta.`,
        });
      } catch {}
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ ok: false, error: "reset_password_failed" });
    }
  }

  async changePasswordShop(req: Request, res: Response) {
    try {
      const { old_password, new_password } = req.body as { old_password?: string; new_password?: string };
      if (!old_password || !new_password)
        return res.status(400).json({ ok: false, error: "missing_fields" });
      const userClaim = (req as any).user;
      const user = await prisma.user.findUnique({ where: { id: Number(userClaim.sub || userClaim.id) } });
      if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });
      const ok = await comparePassword(old_password, user.password);
      if (!ok) return res.status(401).json({ ok: false, error: "invalid_old_password" });
      const hashed = await hashPassword(new_password);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ ok: false, error: "change_password_failed" });
    }
  }

  async registerAdmin(req: Request, res: Response) {
    const { email, name } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ ok: false, error: "email_already_registered" });
    }
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
      const html = welcomeKuromiHTML(capitalized_name, text_message, business as any, palette as any);
      await sendEmail({
        to: user.email,
        subject: `Bienvenido/a a ${businessName}`,
        text: `Hola ${capitalized_name}, tu contraseña es: ${secure_password}`,
        html,
      });
    } catch (err) {
      console.error("register_admin_email_failed", err);
    }
    const { password: _pw, ...userOut } = user;
    return res.status(200).json({ ok: true, user: userOut });
  }

  async newUser(req: Request, res: Response) {
    const { email, role_id, name, phone } = req.body;
    const role: "ADMIN" | "CUSTOMER" = Number(role_id) === 1 ? "ADMIN" : "CUSTOMER";
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ ok: false, error: "email_already_registered" });
    }
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
    const text_message = role === "CUSTOMER"
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
      const html = new_user_html(capitalized_name, text_message, business as any, palette as any);
      await sendEmail({
        to: user.email,
        subject: `Bienvenido/a a ${businessName}`,
        text: `Hola ${capitalized_name}, bienvenido/a a ${businessName}`,
        html,
      });
    } catch (err) {
      console.error("new_user_email_failed", err);
    }
    const { password: _pw, ...userOut } = user;
    return res.status(200).json({ ok: true, user: userOut });
  }

  async getUsers(req: Request, res: Response) {
    const { page, limit, search, type } = req.query as any;
    const pageQ = Math.max(1, Number(page) || 1);
    const limitQ = Math.min(100, Math.max(1, Number(limit) || 10));
    const searchQ = (search ? String(search) : "").trim();
    const isAdmin = String(type || "user").toLowerCase() === "admin";
    const role: "ADMIN" | "CUSTOMER" = isAdmin ? "ADMIN" : "CUSTOMER";
    const where: any = { role };
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
    return res.status(200).json({
      ok: true,
      users: users.map((u) => ({ ...u, id: String(u.id) })),
      pagination: { total: count, page: pageQ, limit: limitQ, totalPages: total_pages, hasNextPage: pageQ < total_pages, hasPrevPage: pageQ > 1 },
    });
  }

  async disableUser(req: Request, res: Response) {
    const { id } = req.params as any;
    const found = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!found) return res.status(404).json({ ok: false, error: "user_not_found" });
    await prisma.user.update({ where: { id: Number(id) }, data: { is_active: false } });
    return res.status(200).json({ ok: true });
  }

  async enableUser(req: Request, res: Response) {
    const { id } = req.params as any;
    const found = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!found) return res.status(404).json({ ok: false, error: "user_not_found" });
    await prisma.user.update({ where: { id: Number(id) }, data: { is_active: true } });
    return res.status(200).json({ ok: true });
  }

  async deleteUser(req: Request, res: Response) {
    const { id } = req.params as any;
    const found = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!found) return res.status(404).json({ ok: false, error: "user_not_found" });
    await prisma.user.delete({ where: { id: Number(id) } });
    return res.status(200).json({ ok: true });
  }

  async resetPasswordAdmin(req: Request, res: Response) {
    try {
      const { email } = req.body as { email?: string };
      if (!email) return res.status(400).json({ ok: false, error: "missing_email" });
      const admin = await prisma.user.findFirst({ where: { email, role: "ADMIN" } });
      if (!admin) return res.status(200).json({ ok: true });
      const code = randomBytes(3).toString("hex").toUpperCase();
      const hashed = await hashPassword(code);
      await prisma.user.update({ where: { id: admin.id }, data: { password: hashed } });
      try {
        await sendEmail({
          to: admin.email,
          subject: "Recuperación de contraseña",
          text: `Tu nueva contraseña temporal es: ${code}. Ingresa y cámbiala desde tu perfil.`,
        });
      } catch {}
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ ok: false, error: "reset_password_failed" });
    }
  }

  async changePasswordAdmin(req: Request, res: Response) {
    try {
      const { old_password, new_password } = req.body as { old_password?: string; new_password?: string };
      if (!old_password || !new_password)
        return res.status(400).json({ ok: false, error: "missing_fields" });
      const claim = (req as any).user;
      const user = await prisma.user.findUnique({ where: { id: Number(claim.sub || claim.id) } });
      if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });
      const ok = await comparePassword(old_password, user.password);
      if (!ok) return res.status(401).json({ ok: false, error: "invalid_old_password" });
      const hashed = await hashPassword(new_password);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ ok: false, error: "change_password_failed" });
    }
  }
}

export default AuthServices;
