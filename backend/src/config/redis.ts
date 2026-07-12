import Redis from "ioredis";
import { logger } from "@/utils/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let client: Redis | null = null;
let connecting: Promise<Redis> | null = null;

export function getRedis(): Promise<Redis> {
  if (client) return Promise.resolve(client);
  if (connecting) return connecting;
  connecting = new Promise<Redis>((resolve, reject) => {
    const conn = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    conn.on("error", (err) => {
      logger.warn("redis_error", { msg: err.message });
    });
    conn
      .connect()
      .then(() => {
        client = conn;
        logger.info("redis_connected", { url: REDIS_URL });
        resolve(conn);
      })
      .catch((err) => {
        connecting = null;
        logger.warn("redis_connect_failed", { msg: err.message });
        reject(err);
      });
  });
  return connecting;
}

export async function tryGetRedis(): Promise<Redis | null> {
  try {
    return await getRedis();
  } catch {
    return null;
  }
}
