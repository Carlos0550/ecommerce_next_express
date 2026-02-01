-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "phone" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "productData" JSONB NOT NULL DEFAULT '{}',
    "messageHistory" JSONB NOT NULL DEFAULT '[]',
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUserMessage" TIMESTAMP(3),
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "ProcessedMessage" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAlbumBuffer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAlbumBuffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppSession_adminId_idx" ON "WhatsAppSession"("adminId");

-- CreateIndex
CREATE INDEX "WhatsAppSession_lastActivity_idx" ON "WhatsAppSession"("lastActivity");

-- CreateIndex
CREATE INDEX "ProcessedMessage_created_at_idx" ON "ProcessedMessage"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAlbumBuffer_phone_albumId_key" ON "WhatsAppAlbumBuffer"("phone", "albumId");
