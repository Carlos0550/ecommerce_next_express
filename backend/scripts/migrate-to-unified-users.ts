/**
 * SCRIPT DE MIGRACIÓN: Admin → User unificado
 *
 * Ejecutar ANTES de `npx prisma migrate deploy`.
 * Usa pg directamente para no depender del Prisma Client generado.
 *
 * Cómo ejecutar:
 *   cd backend
 *   npx ts-node-dev --transpile-only -r tsconfig-paths/register scripts/migrate-to-unified-users.ts
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

async function main() {
  console.log("🚀 Iniciando migración Admin → User unificado...\n");

  // ── 1. Leer todos los admins ──────────────────────────────────────────────
  const admins = await query<{
    id: number;
    email: string;
    password: string;
    name: string;
    is_active: boolean;
    profile_image: string | null;
    phone: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, email, password, name, is_active, profile_image, phone, created_at, updated_at
     FROM "Admin" ORDER BY id ASC`
  );

  console.log(`📋 Admins encontrados: ${admins.length}`);

  if (admins.length === 0) {
    console.log("✅ No hay admins que migrar.");
    await pool.end();
    return;
  }

  // ── 2. Migrar cada admin a User ───────────────────────────────────────────
  const idMapping = new Map<number, number>();

  for (const admin of admins) {
    const existing = await query<{ id: number }>(
      `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
      [admin.email]
    );

    if (existing[0]) {
      console.warn(
        `⚠️  Email "${admin.email}" ya existe en User (id=${existing[0].id}). ` +
          `Mapeando Admin id=${admin.id} → User id=${existing[0].id}.`
      );
      // Asegurar role=1 (admin) para que la migración Prisma lo convierta a ADMIN
      await query(`UPDATE "User" SET role = 1 WHERE id = $1`, [existing[0].id]);
      idMapping.set(admin.id, existing[0].id);
      continue;
    }

    const result = await query<{ id: number }>(
      `INSERT INTO "User" (
         email, password, name, is_active, profile_image, phone,
         role, created_at, updated_at,
         shipping_city, shipping_postal_code, shipping_province, shipping_street
       ) VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,NULL,NULL,NULL,NULL)
       RETURNING id`,
      [
        admin.email,
        admin.password,
        admin.name,
        admin.is_active,
        admin.profile_image,
        admin.phone,
        admin.created_at,
        admin.updated_at,
      ]
    );

    const newUserId = result[0].id;
    idMapping.set(admin.id, newUserId);
    console.log(`  ✅ Admin "${admin.email}" (id=${admin.id}) → User id=${newUserId}`);
  }

  // ── 3. Actualizar WhatsAppSession.adminId → nuevos User IDs ──────────────
  const sessions = await query<{ phone: string; adminId: number }>(
    `SELECT phone, "adminId" FROM "WhatsAppSession"`
  );

  console.log(`\n📱 Sesiones WhatsApp: ${sessions.length}`);

  for (const session of sessions) {
    const newUserId = idMapping.get(session.adminId);
    if (newUserId === undefined) {
      console.warn(`  ⚠️  Sesión ${session.phone}: adminId=${session.adminId} sin mapeo.`);
      continue;
    }
    await query(`UPDATE "WhatsAppSession" SET "adminId" = $1 WHERE phone = $2`, [
      newUserId,
      session.phone,
    ]);
    console.log(`  ✅ ${session.phone}: adminId ${session.adminId} → ${newUserId}`);
  }

  // ── 4. Resumen ────────────────────────────────────────────────────────────
  console.log("\n📊 Mapeo final:");
  for (const [oldId, newId] of idMapping.entries()) {
    console.log(`  Admin id=${oldId} → User id=${newId}`);
  }

  console.log("\n✅ Listo. Ahora ejecutá: npx prisma migrate deploy");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  pool.end();
  process.exit(1);
});
