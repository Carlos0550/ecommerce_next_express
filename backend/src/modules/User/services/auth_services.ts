import { prisma } from "@/config/prisma";
import { comparePassword, hashPassword } from "@/config/bcrypt";
import { Request, Response } from "express";
import { signToken } from "@/config/jwt";
import { redis } from "@/config/redis";
import { sendEmail } from "@/config/resend";
import { welcomeKuromiHTML } from "@/templates/welcome_kuromi";
import { new_user_html } from "@/templates/new_user";
import BusinessServices from "@/modules/Business/business.services";
import PaletteServices from "@/modules/Palettes/services/palette.services";

class AuthServices {
    async loginAdmin(req: Request, res: Response) {
        const { email, password } = req.body;
        const rows: any[] = await prisma.$queryRaw`SELECT id, email, password, name, role, profile_image FROM "Admin" WHERE email = ${email} LIMIT 1`;
        const user = rows[0];

        if (!user) {
            return res.status(400).json({ ok: false, error: 'invalid_email', message: "El correo electrónico no está registrado" });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ ok: false, error: 'invalid_password', message: "La contraseña es incorrecta" });
        }

        const payload = {
            sub: user.id.toString(),
            email: user.email,
            name: user.name,
            role: 1,
            subjectType: 'admin',
        }
        const token = signToken(payload);

        await redis.set(`user:${token}`, JSON.stringify(payload), 'EX', 60 * 60 * 24);
        const user_without_password = {
            ...user,
            password: undefined,
        }

        return res.status(200).json({ ok: true, token, user: user_without_password });
    }

    async loginShop(req: Request, res: Response) {
        const { email, password } = req.body;
        const user = await prisma.user.findFirst({
            where: {
                email: email,
                role: 2,
            },
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                role: true,
                is_active: true,
                profile_image: true,
            }
        })

        if (!user) {
            return res.status(400).json({ ok: false, error: 'invalid_email', message: "El correo electrónico no está registrado" });
        }
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ ok: false, error: 'invalid_password', message: "La contraseña es incorrecta" });
        }

        const payload = {
            sub: user.id.toString(),
            email: user.email,
            name: user.name,
            profile_image: user.profile_image,
            role: 2,
            subjectType: 'user',
        }
        const token = signToken(payload);

        await redis.set(`user:${token}`, JSON.stringify(payload), 'EX', 60 * 60 * 24);
        const user_without_password = {
            ...user,
            password: undefined,
        }

        return res.status(200).json({ ok: true, token, user: user_without_password });
    }

    async registerShop(req: Request, res: Response) {
        try {
            const { email, password, name } = req.body;
            if (!email || !password || !name) {
                return res.status(400).json({ ok: false, error: 'missing_fields', message: "Todos los campos son obligatorios" });
            }

            const existingUser = await prisma.user.findFirst({
                where: { email, role: 2 },
                select: { id: true }
            });
            if (existingUser) {
                return res.status(400).json({ ok: false, error: 'email_already_registered', message: "El correo ya está registrado" });
            }

            const normalized_name = name.trim().toLowerCase();
            const hashed = await hashPassword(password);

            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashed,
                    name: normalized_name,
                    role: 2,
                    is_active: true,
                }
            });

            // Send welcome email
            const capitalized_name = normalized_name.replace(/\b\w/g, (match: string) => match.toUpperCase());
            try {
                const business = await BusinessServices.getBusiness();
                const businessName = business?.name || "Tienda online";
                const palette = await PaletteServices.getActiveFor("shop");
                const text_message = `
                    <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_main}};">
                    Desde hoy, estás listo/a para explorar todo nuestro catálogo de productos, 
                    desde maquillaje hasta accesorios, y descubrir tu estilo único.
                    </p>
                    <div style="text-align:center; margin:22px 0;">
                    </div>
                `;
                const html = new_user_html(capitalized_name, text_message, business as any, palette as any);
                await sendEmail({
                    to: user.email,
                    subject: `Bienvenido/a a ${businessName}`,
                    text: `Hola ${capitalized_name}, ¡bienvenido/a a ${businessName}!`,
                    html,
                });
            } catch (err) {
                console.error('resend_send_failed', err);
            }

            const payload = {
                sub: user.id.toString(),
                email: user.email,
                name: user.name,
                role: 2,
                subjectType: 'user',
            };
            const token = signToken(payload);
            await redis.set(`user:${token}`, JSON.stringify(payload), 'EX', 60 * 60 * 24);
            
            const user_without_password = { ...user, password: undefined };
            return res.status(200).json({ ok: true, token, user: user_without_password });

        } catch (err) {
            console.error('register_shop_failed', err);
            return res.status(500).json({ ok: false, error: 'register_failed', message: "Error al registrar usuario" });
        }
    }

    async resetPasswordShop(req: Request, res: Response) {
        try {
            const { email } = req.body as { email?: string };
            if (!email) return res.status(400).json({ ok: false, error: 'missing_email' });
            const user = await prisma.user.findFirst({ where: { email, role: 2 } });
            if (!user) return res.status(404).json({ ok: false, error: 'user_not_found' });
            const code = String(Math.floor(100000 + Math.random() * 900000));
            const hashed = await hashPassword(code);
            await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
            try {
                await sendEmail({ to: user.email, subject: 'Recuperación de contraseña', text: `Tu nueva contraseña temporal es: ${code}. Ingresa y cámbiala desde tu cuenta.` });
            } catch {}
            return res.status(200).json({ ok: true });
        } catch (err) {
            return res.status(500).json({ ok: false, error: 'reset_password_failed' });
        }
    }

    async changePasswordShop(req: Request, res: Response) {
        try {
            const { old_password, new_password } = req.body as { old_password?: string; new_password?: string };
            if (!old_password || !new_password) return res.status(400).json({ ok: false, error: 'missing_fields' });
            const userClaim = (req as any).user;
            const user = await prisma.user.findUnique({ where: { id: Number(userClaim.sub || userClaim.id) } });
            if (!user) return res.status(404).json({ ok: false, error: 'user_not_found' });
            const ok = await comparePassword(old_password, user.password);
            if (!ok) return res.status(401).json({ ok: false, error: 'invalid_old_password' });
            const hashed = await hashPassword(new_password);
            await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
            return res.status(200).json({ ok: true });
        } catch (err) {
            return res.status(500).json({ ok: false, error: 'change_password_failed' });
        }
    }

    
    async registerAdmin(req: Request, res: Response) {
        const { email, password, name } = req.body;
        const existingRows: any[] = await prisma.$queryRaw`SELECT id FROM "Admin" WHERE email = ${email} LIMIT 1`;
        const user_exists = existingRows[0];

        if (user_exists) {
            return res.status(400).json({ ok: false, error: 'email_already_registered' });
        }
        const normalized_name = name.trim().toLowerCase()
        const hashed = await hashPassword(password);
        await prisma.$executeRaw`INSERT INTO "Admin" (email, password, name, is_active, role, created_at, updated_at) VALUES (${email}, ${hashed}, ${normalized_name}, true, 1, NOW(), NOW())`;
        const createdRows: any[] = await prisma.$queryRaw`SELECT id, email, name, role, profile_image, created_at, updated_at FROM "Admin" WHERE email = ${email} LIMIT 1`;
        const user = createdRows[0];

        const capitalized_name = normalized_name.replace(/\b\w/g, (match: string) => match.toUpperCase());
        try {
            const business = await BusinessServices.getBusiness();
            const businessName = business?.name || "Tienda online";
            const palette = await PaletteServices.getActiveFor("shop");
            const html = welcomeKuromiHTML(capitalized_name, business as any, palette as any);
            const rs = await sendEmail({
                to: user.email,
                subject: `Bienvenido/a a ${businessName}`,
                text: `Hola ${capitalized_name}, ¡bienvenido/a a ${businessName}!`,
                html,
            });
            console.log('resend_send_result', rs);
        } catch (err) {
            console.error('resend_send_failed', err);
        }
        return res.status(200).json({ ok: true, user });
    }

    async newUser(req: Request, res: Response) {
        const { email, role_id, name, phone } = req.body;
        if (Number(role_id) === 1) {
            const rows: any[] = await prisma.$queryRaw`SELECT id FROM "Admin" WHERE email = ${email} LIMIT 1`;
            const exists = rows[0];
            if (exists) {
                return res.status(400).json({ ok: false, error: 'email_already_registered' });
            }
        } else {
            const exists = await prisma.user.findFirst({ where: { email, role: 2 } });
            if (exists) {
                return res.status(400).json({ ok: false, error: 'email_already_registered' });
            }
        }

        var secure_password = Math.random().toString(36).slice(-8);
        var hashedPassword = await hashPassword(secure_password);
        const normalized_name = name.trim().toLowerCase()
        let user: any;
        if (Number(role_id) === 1) {
            // Crear admin con phone si está disponible
            const phoneValue = phone ? String(phone).trim() : null;
            await prisma.$executeRaw`INSERT INTO "Admin" (email, password, name, phone, is_active, role, created_at, updated_at) VALUES (${email}, ${hashedPassword}, ${normalized_name}, ${phoneValue}, true, 1, NOW(), NOW())`;
            const created: any[] = await prisma.$queryRaw`SELECT id, email, name, role, phone, profile_image, created_at, updated_at FROM "Admin" WHERE email = ${email} LIMIT 1`;
            user = created[0];
        } else {
            user = await prisma.user.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    name: normalized_name,
                    role: 2,
                }
            })
        }
        let text_message = ''
        if (role_id == 2) {
            text_message = `
                <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_main}};">
                Desde hoy, estás listo/a para explorar todo nuestro catálogo de productos, 
                desde maquillaje hasta accesorios, y descubrir tu estilo único.
              </p>
            `
        } else {
            text_message = `
          <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:{{color_text_main}};">
                Fuiste invitado para administrar y gestionar todo nuestro catálogo de productos, ofertas, promociones, etc.
                Tu contraseña temporal es: ${secure_password}
              </p>
          `
        }
        const capitalized_name = normalized_name.replace(/\b\w/g, (match: string) => match.toUpperCase());
        try {
            const business = await BusinessServices.getBusiness();
            const businessName = business?.name || "Tienda online";
            const palette = await PaletteServices.getActiveFor("shop");
            const html = new_user_html(capitalized_name, text_message, business as any, palette as any);
            const rs = await sendEmail({
                to: user.email,
                subject: `Bienvenido/a a ${businessName}`,
                text: `Hola ${capitalized_name}, ¡bienvenido/a a ${businessName}!`,
                html,
            });
            console.log('resend_send_result', rs);
        } catch (err) {
            console.error('resend_send_failed', err);
        }
        return res.status(200).json({ ok: true, user })
    }

    async getUsers(req: Request, res: Response) {
        const { page, limit, search, type } = req.query as any

        const pageQ = Number(page) || 1
        const limitQ = Number(limit) || 10
        const searchQ = (search ? String(search) : '').toLowerCase()
        const typeQ = String(type || 'user').toLowerCase() === 'admin' ? 'admin' : 'user'

        if (typeQ === 'admin') {
            try {
                const pattern = `%${searchQ}%`
                let countRows: any[] = []
                let rows: any[] = []
                if (searchQ) {
                    countRows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "Admin" WHERE name ILIKE ${pattern} OR email ILIKE ${pattern}`
                    rows = await prisma.$queryRaw`SELECT id, name, email, role, phone, is_active FROM "Admin" WHERE name ILIKE ${pattern} OR email ILIKE ${pattern} ORDER BY created_at DESC LIMIT ${limitQ} OFFSET ${(pageQ - 1) * limitQ}`
                } else {
                    countRows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "Admin"`
                    rows = await prisma.$queryRaw`SELECT id, name, email, role, phone, is_active FROM "Admin" ORDER BY created_at DESC LIMIT ${limitQ} OFFSET ${(pageQ - 1) * limitQ}`
                }
                const count = Number(countRows?.[0]?.count || 0)
                const users = rows.map((r: any) => ({ id: String(r.id), name: r.name, email: r.email, role: 1, phone: r.phone || null, is_active: !!r.is_active }))
                const total_pages = Math.ceil(count / limitQ)
                const pagination = { total: count, page: pageQ, limit: limitQ, totalPages: total_pages, hasNextPage: pageQ < total_pages, hasPrevPage: pageQ > 1 }
                return res.status(200).json({ ok: true, users, pagination })
            } catch (err) {
                return res.status(500).json({ ok: false, error: 'internal_error' })
            }
        }

        const where: any = { role: 2 }
        if (searchQ) {
            where.OR = [
                { name: { contains: searchQ } },
                { email: { contains: searchQ } }
            ]
        }
        const [count, users] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                select: { id: true, name: true, email: true, role: true, is_active: true },
                where,
                skip: (pageQ - 1) * limitQ,
                take: limitQ,
                orderBy: { created_at: 'desc' }
            })
        ])
        const total_pages = Math.ceil(count / limitQ)
        const pagination = { total: count, page: pageQ, limit: limitQ, totalPages: total_pages, hasNextPage: pageQ < total_pages, hasPrevPage: pageQ > 1 }
        return res.status(200).json({ ok: true, users: users.map(u => ({ ...u, id: String(u.id) })), pagination })
    }

    async disableUser(req: Request, res: Response) {
        const { id } = req.params as any
        const type = String((req.query as any)?.type || 'user').toLowerCase()
        if (type === 'admin') {
            const exists: any[] = await prisma.$queryRaw`SELECT id FROM "Admin" WHERE id = ${Number(id)} LIMIT 1`
            if (!exists?.[0]) return res.status(404).json({ ok: false, error: 'user_not_found' })
            await prisma.$executeRaw`UPDATE "Admin" SET is_active = FALSE, updated_at = NOW() WHERE id = ${Number(id)}`
            return res.status(200).json({ ok: true })
        }
        const found = await prisma.user.findUnique({ where: { id: Number(id) } })
        if (!found) return res.status(404).json({ ok: false, error: 'user_not_found' })
        await prisma.user.update({ where: { id: Number(id) }, data: { is_active: false } })
        return res.status(200).json({ ok: true })
    }

    async enableUser(req: Request, res: Response) {
        const { id } = req.params as any
        const type = String((req.query as any)?.type || 'user').toLowerCase()
        if (type === 'admin') {
            const exists: any[] = await prisma.$queryRaw`SELECT id FROM "Admin" WHERE id = ${Number(id)} LIMIT 1`
            if (!exists?.[0]) return res.status(404).json({ ok: false, error: 'user_not_found' })
            await prisma.$executeRaw`UPDATE "Admin" SET is_active = TRUE, updated_at = NOW() WHERE id = ${Number(id)}`
            return res.status(200).json({ ok: true })
        }
        const found = await prisma.user.findUnique({ where: { id: Number(id) } })
        if (!found) return res.status(404).json({ ok: false, error: 'user_not_found' })
        await prisma.user.update({ where: { id: Number(id) }, data: { is_active: true } })
        return res.status(200).json({ ok: true })
    }

    async deleteUser(req: Request, res: Response) {
        const { id } = req.params as any
        const type = String((req.query as any)?.type || 'user').toLowerCase()
        if (type === 'admin') {
            const exists: any[] = await prisma.$queryRaw`SELECT id FROM "Admin" WHERE id = ${Number(id)} LIMIT 1`
            if (!exists?.[0]) return res.status(404).json({ ok: false, error: 'user_not_found' })
            await prisma.$executeRaw`DELETE FROM "Admin" WHERE id = ${Number(id)}`
            return res.status(200).json({ ok: true })
        }
        const found = await prisma.user.findUnique({ where: { id: Number(id) } })
        if (!found) return res.status(404).json({ ok: false, error: 'user_not_found' })
        await prisma.user.delete({ where: { id: Number(id) } })
        return res.status(200).json({ ok: true })
    }

    async resetPasswordAdmin(req: Request, res: Response) {
        try {
            const { email } = req.body as { email?: string };
            if (!email) return res.status(400).json({ ok: false, error: 'missing_email' });
            const rows: any[] = await prisma.$queryRaw`SELECT id, email FROM "Admin" WHERE email = ${email} LIMIT 1`;
            const admin = rows[0];
            if (!admin) return res.status(404).json({ ok: false, error: 'user_not_found' });
            const code = String(Math.floor(100000 + Math.random() * 900000));
            const hashed = await hashPassword(code);
            await prisma.$executeRaw`UPDATE "Admin" SET password = ${hashed}, updated_at = NOW() WHERE id = ${admin.id}`;
            try { await sendEmail({ to: admin.email, subject: 'Recuperación de contraseña', text: `Tu nueva contraseña temporal es: ${code}. Ingresa y cámbiala desde tu perfil.` }); } catch {}
            return res.status(200).json({ ok: true });
        } catch (err) {
            return res.status(500).json({ ok: false, error: 'reset_password_failed' });
        }
    }

    async changePasswordAdmin(req: Request, res: Response) {
        try {
            const { old_password, new_password } = req.body as { old_password?: string; new_password?: string };
            if (!old_password || !new_password) return res.status(400).json({ ok: false, error: 'missing_fields' });
            const claim = (req as any).user;
            const rows: any[] = await prisma.$queryRaw`SELECT id, password FROM "Admin" WHERE id = ${Number(claim.sub || claim.id)} LIMIT 1`;
            const admin = rows[0];
            if (!admin) return res.status(404).json({ ok: false, error: 'user_not_found' });
            const ok = await comparePassword(old_password, admin.password);
            if (!ok) return res.status(401).json({ ok: false, error: 'invalid_old_password' });
            const hashed = await hashPassword(new_password);
            await prisma.$executeRaw`UPDATE "Admin" SET password = ${hashed}, updated_at = NOW() WHERE id = ${admin.id}`;
            return res.status(200).json({ ok: true });
        } catch (err) {
            return res.status(500).json({ ok: false, error: 'change_password_failed' });
        }
    }
}

export default AuthServices;
