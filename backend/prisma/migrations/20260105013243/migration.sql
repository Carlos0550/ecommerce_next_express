/*
  Warnings:

  - You are about to drop the column `promoId` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the `Promos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_CategoriesToPromos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProductsToPromos` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email,tenantId]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `BusinessData` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,tenantId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `BusinessBankData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `BusinessData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Cart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ColorPalette` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `FAQ` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `OrderItems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Orders" DROP CONSTRAINT "Orders_promoId_fkey";

-- DropForeignKey
ALTER TABLE "Promos" DROP CONSTRAINT "Promos_createdById_fkey";

-- DropForeignKey
ALTER TABLE "_CategoriesToPromos" DROP CONSTRAINT "_CategoriesToPromos_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoriesToPromos" DROP CONSTRAINT "_CategoriesToPromos_B_fkey";

-- DropForeignKey
ALTER TABLE "_ProductsToPromos" DROP CONSTRAINT "_ProductsToPromos_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProductsToPromos" DROP CONSTRAINT "_ProductsToPromos_B_fkey";

-- DropIndex
DROP INDEX "Admin_email_key";

-- DropIndex
DROP INDEX "Orders_promoId_idx";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BusinessBankData" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BusinessData" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Categories" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ColorPalette" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FAQ" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrderItems" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "promoId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Promos";

-- DropTable
DROP TABLE "_CategoriesToPromos";

-- DropTable
DROP TABLE "_ProductsToPromos";

-- DropEnum
DROP TYPE "PromoType";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "primary_domain" TEXT,
    "custom_domains" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_is_active_idx" ON "Tenant"("is_active");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Admin_tenantId_idx" ON "Admin"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_tenantId_key" ON "Admin"("email", "tenantId");

-- CreateIndex
CREATE INDEX "BusinessBankData_tenantId_idx" ON "BusinessBankData"("tenantId");

-- CreateIndex
CREATE INDEX "BusinessBankData_businessId_idx" ON "BusinessBankData"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessData_tenantId_key" ON "BusinessData"("tenantId");

-- CreateIndex
CREATE INDEX "BusinessData_tenantId_idx" ON "BusinessData"("tenantId");

-- CreateIndex
CREATE INDEX "Cart_tenantId_idx" ON "Cart"("tenantId");

-- CreateIndex
CREATE INDEX "Categories_tenantId_idx" ON "Categories"("tenantId");

-- CreateIndex
CREATE INDEX "ColorPalette_tenantId_idx" ON "ColorPalette"("tenantId");

-- CreateIndex
CREATE INDEX "FAQ_tenantId_idx" ON "FAQ"("tenantId");

-- CreateIndex
CREATE INDEX "OrderItems_tenantId_idx" ON "OrderItems"("tenantId");

-- CreateIndex
CREATE INDEX "Orders_tenantId_idx" ON "Orders"("tenantId");

-- CreateIndex
CREATE INDEX "Products_tenantId_idx" ON "Products"("tenantId");

-- CreateIndex
CREATE INDEX "Sales_tenantId_idx" ON "Sales"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_tenantId_key" ON "User"("email", "tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessData" ADD CONSTRAINT "BusinessData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessBankData" ADD CONSTRAINT "BusinessBankData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColorPalette" ADD CONSTRAINT "ColorPalette_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
