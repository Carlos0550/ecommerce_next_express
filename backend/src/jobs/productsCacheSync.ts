import cron from 'node-cron';
import { prisma } from '@/config/prisma';
import { redis } from '@/config/redis';

export function initProductsCacheSyncJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const products = await prisma.products.findMany({ include: { category: true } });
      await redis.set('products:all', JSON.stringify(products));
      for (const p of products) {
        await redis.set(`product:${p.id}`, JSON.stringify(p));
      }
    } catch (e) {
      
    }
  });
}

