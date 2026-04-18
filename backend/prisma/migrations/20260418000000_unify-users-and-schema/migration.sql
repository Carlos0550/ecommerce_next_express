/*
  Fase 2 — Migración principal:
  - Merge tabla Admin → User (con enum UserRole)
  - Float → Decimal(12,2) en campos de dinero
  - PasswordResetToken nueva tabla
  - OrderStatus enum + campo en Orders
  - WhatsAppSession.adminId → userId con FK real
  - OrderItems.product onDelete: Restrict
  - Índices faltantes (buyer_email en Orders, status en Orders)
  - BusinessBankData onDelete: Cascade
  - WhatsAppSession FK a User

  ORDEN DE EJECUCIÓN:
  1. Ejecutar primero el script de migración de datos:
       npx ts-node-dev --transpile-only -r tsconfig-paths/register scripts/migrate-to-unified-users.ts
  2. Luego aplicar esta migración:
       npx prisma migrate deploy
*/

-- ─── Enum UserRole ────────────────────────────────────────────────────────────
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER');

-- Convertir User.role (Int) al nuevo enum.
-- Antes de esto, el script de migración habrá insertado admins con role=1.
ALTER TABLE "User" ADD COLUMN "role_new" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
UPDATE "User" SET "role_new" = CASE WHEN role = 1 THEN 'ADMIN'::"UserRole" ELSE 'CUSTOMER'::"UserRole" END;
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";

-- Eliminar índice viejo de role (era sobre columna Int)
DROP INDEX IF EXISTS "User_role_idx";
CREATE INDEX "User_role_idx" ON "User"("role");

-- ─── Eliminar tabla Admin ─────────────────────────────────────────────────────
-- El script de migración ya copió todos los admins a User. Ahora podemos borrar.
DROP TABLE IF EXISTS "Admin";

-- ─── PasswordResetToken ───────────────────────────────────────────────────────
CREATE TABLE "PasswordResetToken" (
    "id"        TEXT NOT NULL,
    "userId"    INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt"    TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── OrderStatus enum + columna en Orders ────────────────────────────────────
CREATE TYPE "OrderStatus" AS ENUM ('PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED');
ALTER TABLE "Orders" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';
CREATE INDEX "Orders_status_idx" ON "Orders"("status");
CREATE INDEX "Orders_buyer_email_idx" ON "Orders"("buyer_email");

-- ─── Float → Decimal(12,2) para campos de dinero ─────────────────────────────
ALTER TABLE "Products"
    ALTER COLUMN "price" TYPE NUMERIC(12,2) USING ROUND("price"::NUMERIC, 2);

ALTER TABLE "Sales"
    ALTER COLUMN "total" TYPE NUMERIC(12,2) USING ROUND("total"::NUMERIC, 2);

ALTER TABLE "Cart"
    ALTER COLUMN "total" TYPE NUMERIC(12,2) USING ROUND("total"::NUMERIC, 2);

ALTER TABLE "Orders"
    ALTER COLUMN "total" TYPE NUMERIC(12,2) USING ROUND("total"::NUMERIC, 2),
    ALTER COLUMN "subtotal" TYPE NUMERIC(12,2) USING ROUND(COALESCE("subtotal", 0)::NUMERIC, 2);

-- ─── OrderItems: onDelete Cascade → Restrict para product ───────────────────
ALTER TABLE "OrderItems" DROP CONSTRAINT IF EXISTS "OrderItems_productId_fkey";
ALTER TABLE "OrderItems"
    ADD CONSTRAINT "OrderItems_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── BusinessBankData: onDelete Cascade ──────────────────────────────────────
ALTER TABLE "BusinessBankData" DROP CONSTRAINT IF EXISTS "BusinessBankData_businessId_fkey";
ALTER TABLE "BusinessBankData"
    ADD CONSTRAINT "BusinessBankData_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "BusinessData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── WhatsAppSession: renombrar adminId → userId + FK a User ─────────────────
-- El script de migración ya actualizó los valores de adminId al nuevo User.id.
-- Renombramos la columna en lugar de drop+add para preservar los datos.
DROP INDEX IF EXISTS "WhatsAppSession_adminId_idx";
ALTER TABLE "WhatsAppSession" RENAME COLUMN "adminId" TO "userId";
CREATE INDEX "WhatsAppSession_userId_idx" ON "WhatsAppSession"("userId");
ALTER TABLE "WhatsAppSession"
    ADD CONSTRAINT "WhatsAppSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
