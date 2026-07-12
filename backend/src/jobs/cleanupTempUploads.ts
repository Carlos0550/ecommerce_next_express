import fs from "fs/promises";
import path from "path";
import cron from "node-cron";
import dayjs from "@/config/dayjs";
import { logger } from "@/utils/logger";
import { TEMP_UPLOADS_DIR } from "@/modules/Products/services/draft.service";

const MAX_AGE_HOURS = 24;

async function cleanupTempUploads(): Promise<{ deleted: number; errors: number }> {
  try {
    const exists = await fs
      .stat(TEMP_UPLOADS_DIR)
      .then(() => true)
      .catch(() => false);
    if (!exists) return { deleted: 0, errors: 0 };
    const entries = await fs.readdir(TEMP_UPLOADS_DIR, { withFileTypes: true });
    const cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;
    let deleted = 0;
    let errors = 0;
    for (const entry of entries) {
      if (entry.name === ".gitkeep") continue;
      const fullPath = path.join(TEMP_UPLOADS_DIR, entry.name);
      try {
        const stat = await fs.stat(fullPath);
        if (!stat.isFile()) continue;
        if (stat.mtimeMs > cutoff) continue;
        await fs.rm(fullPath, { force: true });
        deleted++;
      } catch (err) {
        logger.warn("cleanup_temp_uploads_error", {
          path: fullPath,
          err: err instanceof Error ? err.message : String(err),
        });
        errors++;
      }
    }
    return { deleted, errors };
  } catch (err) {
    logger.warn("cleanup_temp_uploads_unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { deleted: 0, errors: 1 };
  }
}

export async function ensureTempUploadsDir(): Promise<void> {
  await fs.mkdir(TEMP_UPLOADS_DIR, { recursive: true }).catch(() => undefined);
}

export function initTempUploadsCleanupJob(): void {
  void ensureTempUploadsDir().then(async () => {
    const start0 = await cleanupTempUploads();
    logger.info(
      `[temp-uploads-cleanup][startup] dir=${TEMP_UPLOADS_DIR} deleted=${start0.deleted} errors=${start0.errors}`,
    );
  });
  cron.schedule(
    "0 4 * * *",
    async () => {
      const start = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const { deleted, errors } = await cleanupTempUploads();
      logger.info(
        `[temp-uploads-cleanup][${start}] dir=${TEMP_UPLOADS_DIR} deleted=${deleted} errors=${errors}`,
      );
    },
    { timezone: process.env.APP_TZ || "America/Argentina/Buenos_Aires" },
  );
}
