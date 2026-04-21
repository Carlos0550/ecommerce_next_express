-- Sales.tax Float -> Decimal(12,2). Safe on existing rows (all current tax
-- values fit easily into 12,2). No USING NULL risk: we cast float -> numeric.
ALTER TABLE "Sales"
  ALTER COLUMN "tax" TYPE numeric(12,2) USING "tax"::numeric(12,2);

-- Additive soft-delete column for Products and Categories.
-- Nullable, no default -> instant metadata-only change, safe on large tables.
ALTER TABLE "Products"   ADD COLUMN "deleted_at" timestamp(3) without time zone;
ALTER TABLE "Categories" ADD COLUMN "deleted_at" timestamp(3) without time zone;

-- Backfill: any Product/Category already marked as enum 'deleted' gets its
-- deleted_at set to NOW(). The enum value itself is NOT removed here; the
-- second deploy (after code no longer references it) will drop the enum value.
UPDATE "Products"
   SET "deleted_at" = NOW()
 WHERE "state" = 'deleted' AND "deleted_at" IS NULL;

UPDATE "Categories"
   SET "deleted_at" = NOW()
 WHERE "status" = 'deleted' AND "deleted_at" IS NULL;

-- Indexes on deleted_at. Use CONCURRENTLY in production to avoid table locks.
-- Prisma-managed migrations do not support CONCURRENTLY; DBA should run the
-- two CREATE INDEX statements manually in production, then mark this migration
-- as applied with `prisma migrate resolve --applied ...`. The non-concurrent
-- form below is safe in staging / smaller envs.
CREATE INDEX "Products_deleted_at_idx"   ON "Products"   ("deleted_at");
CREATE INDEX "Categories_deleted_at_idx" ON "Categories" ("deleted_at");
