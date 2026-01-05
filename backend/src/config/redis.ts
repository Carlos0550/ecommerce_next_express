import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});


redis.on('error', (err) => {
  console.error('❌ Error de Redis:', err.message);
});

redis.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Redis conectado');
  }
});

redis.on('ready', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Redis listo');
  }
});

redis.on('reconnecting', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔄 Redis reconectando...');
  }
});

redis.on('close', () => {
  console.warn('⚠️  Conexión de Redis cerrada');
});

export async function pingRedis(): Promise<string> {
  try {
    const pong = await redis.ping();
    return pong;
  } catch (err) {
    throw err as Error;
  }
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
}