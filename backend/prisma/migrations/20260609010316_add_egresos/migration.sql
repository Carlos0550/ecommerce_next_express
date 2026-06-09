-- CreateEnum
CREATE TYPE "EgresoCategoryStatus" AS ENUM ('deleted', 'active', 'inactive');

-- AlterTable
ALTER TABLE "PasswordResetToken" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "usedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EgresosCategories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" "EgresoCategoryStatus" NOT NULL DEFAULT 'active',
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "EgresosCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Egresos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "payment_method" "PaymentMethod" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "egreso_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "userId" INTEGER,

    CONSTRAINT "Egresos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EgresosCategories_status_is_active_idx" ON "EgresosCategories"("status", "is_active");

-- CreateIndex
CREATE INDEX "EgresosCategories_created_at_idx" ON "EgresosCategories"("created_at");

-- CreateIndex
CREATE INDEX "EgresosCategories_title_idx" ON "EgresosCategories"("title");

-- CreateIndex
CREATE INDEX "EgresosCategories_deleted_at_idx" ON "EgresosCategories"("deleted_at");

-- CreateIndex
CREATE INDEX "Egresos_created_at_idx" ON "Egresos"("created_at");

-- CreateIndex
CREATE INDEX "Egresos_egreso_date_idx" ON "Egresos"("egreso_date");

-- CreateIndex
CREATE INDEX "Egresos_categoryId_idx" ON "Egresos"("categoryId");

-- CreateIndex
CREATE INDEX "Egresos_userId_idx" ON "Egresos"("userId");

-- CreateIndex
CREATE INDEX "Egresos_deleted_at_idx" ON "Egresos"("deleted_at");

-- CreateIndex
CREATE INDEX "Egresos_payment_method_egreso_date_idx" ON "Egresos"("payment_method", "egreso_date");

-- AddForeignKey
ALTER TABLE "Egresos" ADD CONSTRAINT "Egresos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Egresos" ADD CONSTRAINT "Egresos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EgresosCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
