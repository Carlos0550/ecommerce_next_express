/*
  Warnings:

  - The `plan` column on the `Tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "tenantPlan" AS ENUM ('FREE', 'PREMIUM');

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "plan",
ADD COLUMN     "plan" "tenantPlan" NOT NULL DEFAULT 'FREE';
