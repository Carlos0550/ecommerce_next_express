-- Migración: paletas fijas en código. Eliminamos la tabla ColorPalette y
-- agregamos el selector `active_palette` a BusinessData.

ALTER TABLE "BusinessData"
    ADD COLUMN "active_palette" TEXT NOT NULL DEFAULT 'kuromi';

DROP TABLE IF EXISTS "ColorPalette";
