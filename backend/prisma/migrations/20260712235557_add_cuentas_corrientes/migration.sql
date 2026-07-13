-- CreateEnum
CREATE TYPE "CicloEstado" AS ENUM ('ABIERTO', 'CERRADO');

-- AlterTable
ALTER TABLE "BusinessData" ADD COLUMN     "cc_vencimiento_dias" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "ClienteCC" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClienteCC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaCorriente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuentaCorriente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ciclo" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "estado" "CicloEstado" NOT NULL DEFAULT 'ABIERTO',
    "fecha_apertura" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ciclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeudaCC" (
    "id" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "titulo" TEXT NOT NULL,
    "precio_unit" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "fecha" DATE NOT NULL,
    "notas" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DeudaCC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoCC" (
    "id" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "fecha" DATE NOT NULL,
    "notas" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PagoCC_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClienteCC_telefono_idx" ON "ClienteCC"("telefono");

-- CreateIndex
CREATE INDEX "ClienteCC_is_active_deleted_at_idx" ON "ClienteCC"("is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "ClienteCC_created_at_idx" ON "ClienteCC"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ClienteCC_nombre_telefono_key" ON "ClienteCC"("nombre", "telefono");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaCorriente_clienteId_key" ON "CuentaCorriente"("clienteId");

-- CreateIndex
CREATE INDEX "CuentaCorriente_clienteId_idx" ON "CuentaCorriente"("clienteId");

-- CreateIndex
CREATE INDEX "Ciclo_cuentaId_estado_idx" ON "Ciclo"("cuentaId", "estado");

-- CreateIndex
CREATE INDEX "Ciclo_fecha_apertura_idx" ON "Ciclo"("fecha_apertura");

-- CreateIndex
CREATE INDEX "DeudaCC_cicloId_idx" ON "DeudaCC"("cicloId");

-- CreateIndex
CREATE INDEX "DeudaCC_fecha_idx" ON "DeudaCC"("fecha");

-- CreateIndex
CREATE INDEX "DeudaCC_deleted_at_idx" ON "DeudaCC"("deleted_at");

-- CreateIndex
CREATE INDEX "PagoCC_cicloId_idx" ON "PagoCC"("cicloId");

-- CreateIndex
CREATE INDEX "PagoCC_fecha_idx" ON "PagoCC"("fecha");

-- CreateIndex
CREATE INDEX "PagoCC_payment_method_fecha_idx" ON "PagoCC"("payment_method", "fecha");

-- CreateIndex
CREATE INDEX "PagoCC_deleted_at_idx" ON "PagoCC"("deleted_at");

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "ClienteCC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ciclo" ADD CONSTRAINT "Ciclo_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "CuentaCorriente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeudaCC" ADD CONSTRAINT "DeudaCC_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCC" ADD CONSTRAINT "PagoCC_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
