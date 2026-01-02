-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "BusinessData" ADD COLUMN     "whatsapp_access_token" TEXT,
ADD COLUMN     "whatsapp_api_key" TEXT,
ADD COLUMN     "whatsapp_connected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_phone_number" TEXT,
ADD COLUMN     "whatsapp_session_id" INTEGER,
ADD COLUMN     "whatsapp_webhook_secret" TEXT;

-- CreateIndex
CREATE INDEX "Admin_phone_idx" ON "Admin"("phone");
