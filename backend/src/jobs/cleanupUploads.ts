import path from 'path';
import fs from 'fs/promises';
import cron from 'node-cron';
import dayjs from '@/config/dayjs';
import { logger } from '@/utils/logger';
function resolveUploadsDir(): string {
  const dirEnv = process.env.UPLOADS_DIR || 'uploads';
  return path.resolve(process.cwd(), dirEnv);
}
async function emptyDirectory(dir: string): Promise<{ deleted: number; errors: number }>{
  try {
    const exists = await fs.stat(dir).then(() => true).catch(() => false);
    if (!exists) return { deleted: 0, errors: 0 };
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let deleted = 0;
    let errors = 0;
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === '.gitkeep') continue;
      try {
        if (entry.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.rm(fullPath, { force: true });
        }
        deleted++;
      } catch (err) {
        console.error('cleanup_uploads_error', { path: fullPath, err });
        errors++;
      }
    }
    return { deleted, errors };
  } catch (err) {
    console.error('cleanup_uploads_unexpected', err);
    return { deleted: 0, errors: 1 };
  }
}
export function initUploadsCleanupJob() {
  const uploadsDir = resolveUploadsDir();
  void emptyDirectory(uploadsDir).then(({ deleted, errors }) => {
    logger.info(`[uploads-cleanup][startup] dir=${uploadsDir} deleted=${deleted} errors=${errors}`);
  });
  cron.schedule('0 3 * * *', async () => {
    const start = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const { deleted, errors } = await emptyDirectory(uploadsDir);
    logger.info(`[uploads-cleanup][${start}] dir=${uploadsDir} deleted=${deleted} errors=${errors}`);
  }, {
    timezone: process.env.APP_TZ || 'America/Argentina/Buenos_Aires',
  });
}
