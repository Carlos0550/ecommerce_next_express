/*
  Warnings:

  - You are about to drop the column `discount` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the column `promoId` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the column `promo_code` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the `Promos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_CategoriesToPromos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProductsToPromos` table. If the table is not empty, all the data it contains will be lost.

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
DROP INDEX "Orders_promoId_idx";

-- DropIndex
DROP INDEX "Orders_promo_code_idx";

-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "discount",
DROP COLUMN "promoId",
DROP COLUMN "promo_code";

-- DropTable
DROP TABLE "Promos";

-- DropTable
DROP TABLE "_CategoriesToPromos";

-- DropTable
DROP TABLE "_ProductsToPromos";

-- DropEnum
DROP TYPE "PromoType";
