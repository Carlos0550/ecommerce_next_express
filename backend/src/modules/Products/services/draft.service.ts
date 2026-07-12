import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { tryGetRedis } from "@/config/redis";
import { logger } from "@/utils/logger";

export const TEMP_UPLOADS_DIR = "/tmp/uploads";
export const DRAFT_TTL_SECONDS = 30 * 60;

export interface ProductDraft {
  tempId: string;
  userId: string;
  title: string;
  description?: string;
  price: string | number;
  stock: string | number;
  category_id?: string;
  sku?: string;
  imagePath: string;
  imageMime: string;
  createdAt: number;
  existingImageUrls?: string;
  deletedImageUrls?: string;
}

export const draftKey = (tempId: string) => `product:draft:${tempId}`;
export const userDraftsKey = (userId: string) => `product:drafts:user:${userId}`;

export async function ensureTempDir(): Promise<void> {
  if (!fs.existsSync(TEMP_UPLOADS_DIR)) {
    await fs.promises.mkdir(TEMP_UPLOADS_DIR, { recursive: true });
  }
}

export async function persistTempFile(
  srcPath: string,
  originalName: string,
  _mime: string,
): Promise<{ tempId: string; destPath: string }> {
  await ensureTempDir();
  const tempId = randomUUID();
  const ext = path.extname(originalName) || ".bin";
  const safeExt = /^\.[a-zA-Z0-9]{1,6}$/.test(ext) ? ext : ".bin";
  const destPath = path.join(TEMP_UPLOADS_DIR, `${tempId}${safeExt}`);
  await fs.promises.rename(srcPath, destPath).catch(async (err) => {
    if (err.code === "EXDEV") {
      await fs.promises.copyFile(srcPath, destPath);
      await fs.promises.unlink(srcPath).catch(() => undefined);
    } else {
      throw err;
    }
  });
  return { tempId, destPath };
}

export async function saveDraft(
  draft: ProductDraft,
  ttlSeconds = DRAFT_TTL_SECONDS,
): Promise<boolean> {
  const redis = await tryGetRedis();
  if (!redis) return false;
  const key = draftKey(draft.tempId);
  const userKey = userDraftsKey(draft.userId);
  const payload = JSON.stringify(draft);
  try {
    await redis.set(key, payload, "EX", ttlSeconds);
    await redis.zadd(userKey, draft.createdAt, draft.tempId);
    await redis.expire(userKey, ttlSeconds + 3600);
    return true;
  } catch (err) {
    logger.warn("draft_save_failed", {
      tempId: draft.tempId,
      msg: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function getDraft(
  tempId: string,
): Promise<ProductDraft | null> {
  const redis = await tryGetRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(draftKey(tempId));
    if (!raw) return null;
    return JSON.parse(raw) as ProductDraft;
  } catch (err) {
    logger.warn("draft_get_failed", {
      tempId,
      msg: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function listUserDrafts(
  userId: string,
): Promise<ProductDraft[]> {
  const redis = await tryGetRedis();
  if (!redis) return [];
  try {
    const ids = await redis.zrange(userDraftsKey(userId), 0, -1, "REV");
    if (!ids.length) return [];
    const validIds = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (!validIds.length) return [];
    const keys = validIds.map((id) => draftKey(id));
    const raws = await redis.mget(...keys);
    const drafts: ProductDraft[] = [];
    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i];
      const id = validIds[i];
      if (!raw || !id) continue;
      try {
        drafts.push(JSON.parse(raw) as ProductDraft);
      } catch {
        await redis.zrem(userDraftsKey(userId), id).catch(() => undefined);
      }
    }
    return drafts;
  } catch (err) {
    logger.warn("draft_list_failed", {
      userId,
      msg: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export async function deleteDraft(
  tempId: string,
  userId?: string,
): Promise<void> {
  const redis = await tryGetRedis();
  if (!redis) return;
  try {
    const existing = await redis.get(draftKey(tempId));
    await redis.del(draftKey(tempId));
    if (userId) await redis.zrem(userDraftsKey(userId), tempId);
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as ProductDraft;
        if (parsed.imagePath && parsed.imagePath.startsWith(TEMP_UPLOADS_DIR)) {
          await deleteTempFile(parsed.imagePath);
        }
      } catch {
        // ignore parse errors; draft removal already succeeded
      }
    }
  } catch (err) {
    logger.warn("draft_delete_failed", {
      tempId,
      msg: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function deleteTempFile(filePath: string): Promise<void> {
  await fs.promises.unlink(filePath).catch(() => undefined);
}

export async function readTempFile(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.promises.readFile(filePath);
  } catch {
    return null;
  }
}
