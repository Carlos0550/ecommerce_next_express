import path from "path";
import fs from "fs/promises";
import cron from "node-cron";
import dayjs from "@/config/dayjs";
import { prisma } from "@/config/prisma";
import { deleteImage } from "@/config/minio";
import { logger } from "@/utils/logger";

const MINIO_BUCKET = process.env.MINIO_BUCKET || "images";
const PURGE_INTERVAL_DAYS = 30;
const LAST_RUN_FILE = path.resolve(
  process.cwd(),
  "logs/.product-purge-lastrun",
);
const INTERVAL_MS = PURGE_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

function extractMinioPath(url: string): string | null {
  if (typeof url !== "string" || url.length === 0) return null;
  if (url.startsWith("/")) return url.replace(/^\/+/, "");
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf(MINIO_BUCKET);
    if (idx >= 0 && idx < parts.length - 1) {
      return parts.slice(idx + 1).join("/");
    }
    if (parts.length > 0) return parts.join("/");
    return null;
  } catch {
    return null;
  }
}

async function readLastRun(): Promise<number> {
  try {
    const txt = await fs.readFile(LAST_RUN_FILE, "utf8");
    const ts = parseInt(txt.trim(), 10);
    return Number.isFinite(ts) ? ts : 0;
  } catch {
    return 0;
  }
}

async function writeLastRun(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(LAST_RUN_FILE), { recursive: true });
    await fs.writeFile(LAST_RUN_FILE, String(Date.now()), "utf8");
  } catch (err) {
    logger.warn("purge_write_lastrun_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

async function purgeDeletedProducts(): Promise<{
  found: number;
  deleted: number;
  skipped: number;
  imageErrors: number;
}> {
  const cutoff = dayjs().subtract(PURGE_INTERVAL_DAYS, "day").toDate();
  const products = await prisma.products.findMany({
    where: {
      state: "deleted",
      deleted_at: { lte: cutoff, not: null },
    },
    select: { id: true, title: true, images: true },
  });

  let deleted = 0;
  let skipped = 0;
  let imageErrors = 0;

  for (const p of products) {
    const imgs: string[] = Array.isArray(p.images)
      ? (p.images as unknown[]).filter(
          (u): u is string => typeof u === "string" && u.length > 0,
        )
      : [];
    for (const url of imgs) {
      const imgPath = extractMinioPath(url);
      if (!imgPath) continue;
      try {
        const r = await deleteImage(imgPath);
        if (!r.success) imageErrors++;
      } catch (err) {
        imageErrors++;
        logger.warn("purge_image_delete_failed", {
          productId: p.id,
          imgPath,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    try {
      const refs = await prisma.orderItems.count({
        where: { productId: p.id },
      });
      if (refs > 0) {
        skipped++;
        logger.warn("purge_product_skipped_has_orders", {
          productId: p.id,
          title: p.title,
          orderItems: refs,
        });
        continue;
      }
      await prisma.products.delete({ where: { id: p.id } });
      deleted++;
    } catch (err) {
      skipped++;
      logger.error("purge_product_delete_failed", {
        productId: p.id,
        title: p.title,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { found: products.length, deleted, skipped, imageErrors };
}

async function runIfDue(): Promise<void> {
  const last = await readLastRun();
  if (Date.now() - last < INTERVAL_MS) return;
  const start = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const result = await purgeDeletedProducts();
  await writeLastRun();
  logger.info(
    `[product-purge][${start}] found=${result.found} deleted=${result.deleted} skipped=${result.skipped} imageErrors=${result.imageErrors}`,
  );
}

export function initPurgeDeletedProductsJob(): void {
  void runIfDue().catch((err) =>
    logger.error("purge_startup_failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );
  cron.schedule(
    "30 3 * * *",
    async () => {
      try {
        await runIfDue();
      } catch (err) {
        logger.error("purge_tick_failed", {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: process.env.APP_TZ || "America/Argentina/Buenos_Aires" },
  );
}
